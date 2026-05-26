import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

interface RubricTier {
  scoreMin: number;
  scoreMax: number;
  label: string;
  exampleFeedback: string;
}

interface NotebookCellPayload {
  type: "code" | "markdown";
  source: string;
}

interface JudgeNotebookRequest {
  notebookCells: NotebookCellPayload[];
  persona: {
    name: string;
    systemPrompt: string;
  };
  rubricTiers: RubricTier[];
  caseContext?: string;
  worldContext?: string;
  completionThreshold?: number;
}

interface JudgeNotebookResponse {
  score: number;
  feedback: string;
}

const JUDGE_MODEL = "claude-sonnet-4-6";
const JUDGE_TIMEOUT_MS = 12_000;

export async function POST(request: NextRequest) {
  let body: JudgeNotebookRequest;
  try {
    body = (await request.json()) as JudgeNotebookRequest;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { notebookCells, persona, rubricTiers, caseContext, worldContext, completionThreshold = 80 } = body;

  if (!persona?.name || !persona.systemPrompt) {
    return NextResponse.json({ error: "persona.name and persona.systemPrompt are required" }, { status: 400 });
  }
  if (!Array.isArray(rubricTiers) || rubricTiers.length === 0) {
    return NextResponse.json({ error: "rubricTiers must be a non-empty array" }, { status: 400 });
  }
  if (!Array.isArray(notebookCells)) {
    return NextResponse.json({ error: "notebookCells must be an array" }, { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(persona, rubricTiers, completionThreshold, caseContext, worldContext);
  const userMessage = buildUserMessage(notebookCells);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), JUDGE_TIMEOUT_MS);

  try {
    const response = await client.messages.create(
      {
        model: JUDGE_MODEL,
        max_tokens: 1024,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      },
      { signal: controller.signal },
    );
    clearTimeout(timeoutId);

    const responseText = response.content[0]?.type === "text" ? response.content[0].text : "";
    const parsed = extractJson(responseText);

    if (!parsed) {
      return NextResponse.json({ error: "judge returned non-JSON output", raw: responseText.slice(0, 500) }, { status: 502 });
    }

    const score = clampScore(parsed.score);
    const feedback = typeof parsed.feedback === "string" ? parsed.feedback.trim() : "";

    if (score === null || !feedback) {
      return NextResponse.json({ error: "judge returned malformed JSON", raw: parsed }, { status: 502 });
    }

    const result: JudgeNotebookResponse = { score, feedback };
    return NextResponse.json(result);
  } catch (err) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : "judge call failed";
    console.error("judge-notebook error:", message);
    const isAbort = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { error: isAbort ? "judge timed out" : message },
      { status: isAbort ? 504 : 500 },
    );
  }
}

function buildSystemPrompt(
  persona: { name: string; systemPrompt: string },
  rubricTiers: RubricTier[],
  threshold: number,
  caseContext?: string,
  worldContext?: string,
): string {
  const tiersBlock = rubricTiers
    .map(
      (t) =>
        `- ${t.scoreMin}-${t.scoreMax} (${t.label}): example voice — "${t.exampleFeedback.replace(/"/g, '\\"')}"`,
    )
    .join("\n");

  return [
    `You are ${persona.name}.`,
    "",
    persona.systemPrompt,
    "",
    "Your job right now: review a junior analyst's notebook work-in-progress and give them feedback in your voice.",
    "",
    caseContext ? `CASE CONTEXT:\n${caseContext}\n` : "",
    worldContext ? `WORLD CONTEXT:\n${worldContext}\n` : "",
    "SCORING RUBRIC — pick a score 0-100. Match the analyst's work to a tier:",
    tiersBlock,
    "",
    `COMPLETION: if you score the work at ${threshold} or above, congratulate them, include an emoji, and explicitly say you're locking it in. If below ${threshold}, point at gaps.`,
    "",
    "VOICE & GUARDRAILS:",
    "- 1-3 short Slack messages per reply. No paragraphs. No em dashes.",
    "- Do NOT do the analysis for them. Don't write code. Don't say 'here's what you should plot'. Point at gaps; don't fill them.",
    "- Don't invent numbers, facts, or company details not given to you.",
    "- Acknowledge what they did well + what's missing.",
    "- The example voice for each tier is the style you must mimic. Do not copy it verbatim — write a fresh response that lands at the right score and sounds like that example.",
    "",
    "OUTPUT FORMAT:",
    "Respond with ONLY a single valid JSON object, no prose before or after, no markdown fences:",
    `{ "score": <integer 0-100>, "feedback": "<your message>" }`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildUserMessage(cells: NotebookCellPayload[]): string {
  if (cells.length === 0) {
    return "The analyst's notebook is empty — no cells at all.";
  }
  const blocks = cells
    .map((cell, idx) => `--- cell ${idx + 1} (${cell.type}) ---\n${cell.source.trim() || "(empty)"}`)
    .join("\n\n");
  return `Here is the analyst's current notebook (${cells.length} cells):\n\n${blocks}`;
}

function extractJson(text: string): { score?: unknown; feedback?: unknown } | null {
  // Try direct parse first
  try {
    return JSON.parse(text.trim());
  } catch {
    /* fall through */
  }
  // Strip markdown fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      /* fall through */
    }
  }
  // Find first { ... } block
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch {
      /* fall through */
    }
  }
  return null;
}

function clampScore(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return null;
  const i = Math.round(n);
  if (i < 0 || i > 100) return null;
  return i;
}
