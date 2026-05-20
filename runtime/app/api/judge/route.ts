import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

const MEDIA_TYPE_MAP: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
};

interface JudgeRequestBody {
  judgePromptTemplate: string;
  hardCriteria: Array<{
    id: string;
    description: string;
    verificationMethod: string;
  }>;
  qualitativeCriteria: Array<{
    id: string;
    description: string;
    scoringGuide: { one: string; three: string; five: string };
  }>;
  passCondition: string;
  deliverableDescription: string;
  fileContent: string;
  fileType: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as JudgeRequestBody;
    const {
      judgePromptTemplate,
      hardCriteria,
      qualitativeCriteria,
      passCondition,
      deliverableDescription,
      fileContent,
      fileType,
    } = body;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Build system prompt — the template may be self-contained (no placeholders)
    // or may have {{placeholder}} markers. Handle both.
    let systemPrompt = judgePromptTemplate;
    if (systemPrompt.includes("{{deliverableDescription}}")) {
      systemPrompt = systemPrompt
        .replace("{{deliverableDescription}}", deliverableDescription)
        .replace("{{hardCriteria}}", JSON.stringify(hardCriteria, null, 2))
        .replace("{{qualitativeCriteria}}", JSON.stringify(qualitativeCriteria, null, 2))
        .replace("{{passCondition}}", passCondition);
    }
    // If no placeholders, the template already has everything baked in — use as-is.

    // Strip the "data:...;base64," prefix
    const base64Data = fileContent.includes(",")
      ? fileContent.split(",")[1]
      : fileContent;

    const mediaType =
      MEDIA_TYPE_MAP[fileType] ||
      (IMAGE_EXTENSIONS.has(fileType) ? `image/${fileType}` : "application/octet-stream");

    const isImage = IMAGE_EXTENSIONS.has(fileType);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userContent: any[] = [];

    if (isImage) {
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64Data },
      });
    } else {
      userContent.push({
        type: "document",
        source: { type: "base64", media_type: mediaType, data: base64Data },
      });
    }

    userContent.push({
      type: "text",
      text: "Please evaluate this deliverable against the rubric. Return your evaluation as JSON.",
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON from the response (may be wrapped in ```json...```)
    let raw: Record<string, unknown>;
    try {
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
      raw = JSON.parse(jsonString);
    } catch {
      return NextResponse.json({
        passed: false,
        criteriaResults: [],
        overallFeedback: "Failed to parse judge response. Raw output: " + responseText.substring(0, 500),
      });
    }

    // Normalize the response into the shape the frontend expects.
    // The judge may return different formats depending on the template:
    //
    // Format A (mock template): { passed, criteriaResults[], overallFeedback }
    // Format B (real template): { hardCriteria: { HC-1: {...} }, qualitativeCriteria: { QC-1: {...} }, overallPass, summary }
    //
    // We normalize both into Format A.

    const criteriaResults: Array<{
      criterionId: string;
      description: string;
      passed: boolean;
      score?: number;
      feedback: string;
    }> = [];

    // Check if it's Format B (real template output)
    if (raw.hardCriteria && typeof raw.hardCriteria === "object" && !Array.isArray(raw.hardCriteria)) {
      // Format B — normalize hard criteria
      const hcObj = raw.hardCriteria as Record<string, { pass?: boolean; passed?: boolean; rationale?: string; evidence?: string }>;
      for (const [id, result] of Object.entries(hcObj)) {
        const matchingCriterion = hardCriteria.find(c => c.id === id);
        criteriaResults.push({
          criterionId: id,
          description: matchingCriterion?.description ?? id,
          passed: result.pass ?? result.passed ?? false,
          feedback: result.rationale ?? result.evidence ?? "",
        });
      }

      // Normalize qualitative criteria
      const qcObj = (raw.qualitativeCriteria ?? raw.qualitative_criteria) as Record<string, { score?: number; rationale?: string }> | undefined;
      if (qcObj && typeof qcObj === "object") {
        for (const [id, result] of Object.entries(qcObj)) {
          const matchingCriterion = qualitativeCriteria.find(c => c.id === id);
          criteriaResults.push({
            criterionId: id,
            description: matchingCriterion?.description ?? id,
            passed: (result.score ?? 0) >= 3,
            score: result.score,
            feedback: result.rationale ?? "",
          });
        }
      }

      const passed = raw.overallPass === true || raw.overall_pass === true || raw.passed === true;
      const overallFeedback = (raw.summary ?? raw.overallFeedback ?? raw.overall_feedback ?? "No summary provided.") as string;

      return NextResponse.json({ passed, criteriaResults, overallFeedback });
    }

    // Format A or unknown — pass through with normalization
    if (Array.isArray(raw.criteriaResults)) {
      return NextResponse.json({
        passed: raw.passed ?? false,
        criteriaResults: raw.criteriaResults,
        overallFeedback: raw.overallFeedback ?? raw.summary ?? "No feedback provided.",
      });
    }

    // Fallback: just pass through whatever we got with safe defaults
    return NextResponse.json({
      passed: raw.passed ?? raw.overallPass ?? false,
      criteriaResults: criteriaResults,
      overallFeedback: raw.overallFeedback ?? raw.summary ?? raw.feedback ?? JSON.stringify(raw).substring(0, 500),
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Judge API error:", message);
    return NextResponse.json({
      passed: false,
      criteriaResults: [],
      overallFeedback: `Error during grading: ${message}`,
    }, { status: 500 });
  }
}
