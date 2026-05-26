// Re-export domain types from the schema package
// tsconfig paths: "@schema/*" → "../schema/*"
export type {
  CoursePackage,
  World,
  Persona,
  Fixtures,
  Task,
  Primitive,
  WikiPage,
  Dataset,
  InWorldDocument,
  Email,
  Rubric,
  HardCriterion,
  QualitativeCriterion,
  KnowledgeNugget,
  Deliverable,
  Module,
  Source,
  MeetingRecording,
  MeetingParticipant,
  MeetingSegment,
  Notebook,
  NotebookCell,
  NotebookOutput,
  MockFeedbackState,
} from "@schema/course_package";

// ── UI-layer types ──────────────────────────────────────────────────

export type AppId = "briefing" | "wiki" | "chat" | "sheets" | "bigquery" | "terminal" | "notebook";

export interface AppRegistryEntry {
  id: AppId;
  label: string;
  icon: string; // emoji fallback (used if iconImage is missing or fails to load)
  iconImage?: string; // path under /public, e.g. "/icons/briefing.svg"
  description: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  personaId: string;
  content: string;
  timestamp: number;
  meta?: {
    /**
     * "submission" — user-side attachment card representing a notebook
     *   submitted via Submit for Review. Rendered as a card, not a bubble.
     * "review" — assistant-side feedback from the AI judge. Rendered with
     *   a score chip alongside the message body.
     */
    kind?: "submission" | "review";
    round?: number;
    score?: number;
    notebookTitle?: string;
    cellCount?: number;
    codeCellCount?: number;
    markdownCellCount?: number;
  };
}

export interface JudgeCriterionResult {
  criterionId: string;
  description: string;
  passed: boolean;
  score?: number; // 1-5 for qualitative
  feedback: string;
}

export interface JudgeResult {
  passed: boolean;
  criteriaResults: JudgeCriterionResult[];
  overallFeedback: string;
  timestamp: number;
}

export interface SessionTimerState {
  startedAt: number;
  durationMinutes: number;
  isExpired: boolean;
}
