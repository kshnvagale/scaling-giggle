#!/usr/bin/env node
/**
 * Submit a deliverable for grading.
 * Usage: node submit.js /work/deliverable.md
 *
 * Calls Claude as the LLM Judge with the task's rubric.
 * Prints pass/fail with per-criterion results.
 */
const fs = require("fs");

// Read API key from file if env var not set
if (!process.env.ANTHROPIC_API_KEY && fs.existsSync("/work/api-key.txt")) {
  process.env.ANTHROPIC_API_KEY = fs.readFileSync("/work/api-key.txt", "utf-8").trim();
}

const JUDGE_MODEL = "claude-sonnet-4-6"; // judge always uses Sonnet for consistency

async function main() {
  const deliverablePath = process.argv[2];

  if (!deliverablePath) {
    console.error("Usage: node submit.js <path-to-deliverable.md>");
    process.exit(1);
  }

  if (!fs.existsSync(deliverablePath)) {
    console.error(`File not found: ${deliverablePath}`);
    process.exit(1);
  }

  const deliverable = fs.readFileSync(deliverablePath, "utf-8");
  const pkg = JSON.parse(fs.readFileSync("/work/course-package.json", "utf-8"));
  const task = pkg.modules[0].tasks[0];
  const rubric = task.rubric;

  console.log("=== SUBMITTING DELIVERABLE FOR GRADING ===");
  console.log(`File: ${deliverablePath} (${deliverable.length} chars)`);
  console.log("Waiting for judge...\n");

  // Build judge system prompt
  const systemPrompt = rubric.judgePromptTemplate;

  // Build user message with the deliverable
  const userMessage = `Here is the learner's submitted deliverable (in markdown format, since the original is a diagram they described in text):\n\n---\n\n${deliverable}\n\n---\n\nPlease evaluate this deliverable against all criteria in the rubric.`;

  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const responseText = response.content[0].type === "text" ? response.content[0].text : "";

  // Parse JSON from response
  let result;
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    result = JSON.parse(jsonString);
  } catch {
    console.error("=== JUDGE RESPONSE (raw — failed to parse JSON) ===");
    console.error(responseText);

    const log = {
      ts: new Date().toISOString(),
      action: "submit",
      deliverable_chars: deliverable.length,
      parse_error: true,
      raw_response: responseText.substring(0, 2000),
    };
    fs.appendFileSync("/work/solver-log.jsonl", JSON.stringify(log) + "\n");
    process.exit(1);
  }

  // Print results
  const passed = result.overallPass ?? result.passed ?? false;
  console.log(`=== RESULT: ${passed ? "PASS ✅" : "FAIL ❌"} ===\n`);

  // Hard criteria
  if (result.hardCriteria && typeof result.hardCriteria === "object") {
    console.log("HARD CRITERIA:");
    for (const [id, r] of Object.entries(result.hardCriteria)) {
      const res = r;
      console.log(`  ${res.pass ? "✅" : "❌"} ${id}: ${res.rationale || res.evidence || ""}`);
    }
    console.log("");
  }

  // Qualitative criteria
  if (result.qualitativeCriteria && typeof result.qualitativeCriteria === "object") {
    console.log("QUALITATIVE CRITERIA:");
    for (const [id, r] of Object.entries(result.qualitativeCriteria)) {
      const res = r;
      console.log(`  [${res.score}/5] ${id}: ${res.rationale || ""}`);
    }
    console.log("");
  }

  if (result.qualitativeAverage != null) {
    console.log(`Qualitative average: ${result.qualitativeAverage}`);
  }

  if (result.summary) {
    console.log(`\nSummary: ${result.summary}`);
  }

  // Log
  const log = {
    ts: new Date().toISOString(),
    action: "submit",
    deliverable_chars: deliverable.length,
    passed,
    hard_criteria: result.hardCriteria,
    qualitative_criteria: result.qualitativeCriteria,
    qualitative_average: result.qualitativeAverage,
    summary: result.summary,
  };
  fs.appendFileSync("/work/solver-log.jsonl", JSON.stringify(log) + "\n");

  if (!passed) {
    console.log("\n--- RETRY: Revise /work/deliverable.md and resubmit. ---");
  }
}

main().catch(err => {
  console.error("Submit failed:", err.message);
  process.exit(1);
});
