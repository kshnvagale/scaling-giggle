import type { MockFeedbackState } from "@/lib/types";

export interface MockJudgeInput {
  insightsText: string;
  notebookCellCount: number;
  notebookSourceConcat: string;     // already lowercased by caller
}

export function mockJudge(
  input: MockJudgeInput,
  states: MockFeedbackState[],
): MockFeedbackState | null {
  if (states.length === 0) return null;
  for (const state of states) {
    if (matchesCriteria(state.matchCriteria, input)) return state;
  }
  // Last state in array is the catch-all "polished" by convention
  return states[states.length - 1];
}

function matchesCriteria(
  criteria: MockFeedbackState["matchCriteria"],
  input: MockJudgeInput,
): boolean {
  const insightsLower = input.insightsText.toLowerCase();
  const sourceLower = input.notebookSourceConcat;

  if (criteria.minInsightsLength !== undefined && input.insightsText.length < criteria.minInsightsLength) return false;
  if (criteria.maxInsightsLength !== undefined && input.insightsText.length > criteria.maxInsightsLength) return false;
  if (criteria.minNotebookCells !== undefined && input.notebookCellCount < criteria.minNotebookCells) return false;
  if (criteria.maxNotebookCells !== undefined && input.notebookCellCount > criteria.maxNotebookCells) return false;

  if (criteria.requireKeywordsAny && criteria.requireKeywordsAny.length > 0) {
    if (!criteria.requireKeywordsAny.some(kw => insightsLower.includes(kw.toLowerCase()) || sourceLower.includes(kw.toLowerCase()))) return false;
  }
  if (criteria.requireKeywordsAll && criteria.requireKeywordsAll.length > 0) {
    if (!criteria.requireKeywordsAll.every(kw => insightsLower.includes(kw.toLowerCase()) || sourceLower.includes(kw.toLowerCase()))) return false;
  }
  if (criteria.rejectKeywordsAny && criteria.rejectKeywordsAny.length > 0) {
    if (criteria.rejectKeywordsAny.some(kw => insightsLower.includes(kw.toLowerCase()) || sourceLower.includes(kw.toLowerCase()))) return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────
// Self-test — run with:  npx tsx runtime/lib/mock-judge.ts
// ─────────────────────────────────────────────────────────────────
if (typeof process !== "undefined" && process.argv[1]?.endsWith("mock-judge.ts")) {
  const states: MockFeedbackState[] = [
    {
      id: "empty",
      round: 1,
      matchCriteria: { maxInsightsLength: 49 },
      feedback: "empty draft",
      fromPersonaId: "priya",
    },
    {
      id: "no-intl",
      round: 2,
      matchCriteria: { minInsightsLength: 50, rejectKeywordsAny: ["international", "apac", "latam"] },
      feedback: "missing international angle",
      fromPersonaId: "priya",
    },
    {
      id: "no-recs",
      round: 3,
      matchCriteria: {
        minInsightsLength: 50,
        requireKeywordsAny: ["international", "apac", "latam"],
        rejectKeywordsAny: ["recommend", "should", "propose"],
      },
      feedback: "no recommendations",
      fromPersonaId: "priya",
    },
    {
      id: "polished",
      round: 4,
      matchCriteria: {},
      feedback: "ship it",
      fromPersonaId: "priya",
    },
  ];

  const cases: Array<[MockJudgeInput, string]> = [
    [{ insightsText: "tiny", notebookCellCount: 1, notebookSourceConcat: "" }, "empty"],
    [{ insightsText: "x".repeat(200) + " analysis of genres", notebookCellCount: 5, notebookSourceConcat: "" }, "no-intl"],
    [{ insightsText: "x".repeat(200) + " international growth observed", notebookCellCount: 5, notebookSourceConcat: "" }, "no-recs"],
    [{ insightsText: "x".repeat(200) + " international growth, we should ship 3 new shows", notebookCellCount: 5, notebookSourceConcat: "" }, "polished"],
  ];

  let failed = 0;
  for (const [input, expectedId] of cases) {
    const got = mockJudge(input, states);
    if (got?.id !== expectedId) {
      console.error(`FAIL: expected ${expectedId}, got ${got?.id}`);
      failed++;
    } else {
      console.log(`ok: ${expectedId}`);
    }
  }
  if (failed > 0) process.exit(1);
}
