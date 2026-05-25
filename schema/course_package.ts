/**
 * CoursePackage — the contract between the author pipeline (Managed Agents)
 * and the learner runtime (Next.js desktop-OS sim).
 *
 * Any JSON the author agent produces MUST validate against this schema.
 * The runtime refuses to load a package that doesn't.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

export const Source = z.enum(["doc", "inferred"]);
export type Source = z.infer<typeof Source>;

const NonEmpty = z.string().min(1);

// ─────────────────────────────────────────────────────────────────────────────
// World (Phase 1 output)
// ─────────────────────────────────────────────────────────────────────────────

export const GlossaryEntry = z.object({
  term: NonEmpty,
  definition: NonEmpty,
  whyItMatters: NonEmpty,
  source: Source,
});

export const System = z.object({
  name: NonEmpty,
  vendor: z.string().optional(),
  roleInBusiness: NonEmpty,
  typicalIntegrations: z.array(z.string()),
  knownQuirks: z.array(z.string()),
  source: Source,
});

export const Regulation = z.object({
  name: NonEmpty,
  summary: NonEmpty,
  source: Source,
});

export const World = z.object({
  client: z.object({
    name: NonEmpty,
    size: NonEmpty,
    businessModel: NonEmpty,
    keyNumbers: z.record(z.string(), z.union([z.string(), z.number()])),
    source: Source,
  }),
  industry: z.object({
    primary: NonEmpty,
    subVertical: NonEmpty,
  }),
  glossary: z.array(GlossaryEntry).min(8),
  systems: z.array(System).min(1),
  regulations: z.array(Regulation),
  clientProfile: NonEmpty, // 2-paragraph in-world description, shown to learners
});
export type World = z.infer<typeof World>;

// ─────────────────────────────────────────────────────────────────────────────
// Personas (Phase 3 output)
// ─────────────────────────────────────────────────────────────────────────────

export const KnowledgeNugget = z.object({
  key: NonEmpty,
  value: NonEmpty,
  disclosureHint: NonEmpty,
  importance: z.enum(["critical", "useful", "flavor"]),
});

export const Persona = z.object({
  id: NonEmpty,
  name: NonEmpty,
  role: NonEmpty,
  reportsTo: z.string().optional(),
  linkedTasks: z.array(z.string()).min(1),
  backstory: NonEmpty,
  systemPrompt: NonEmpty,
  privateKnowledge: z.array(KnowledgeNugget).min(1),
  openingLine: NonEmpty,
});
export type Persona = z.infer<typeof Persona>;

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures (Phase 4 output)
// ─────────────────────────────────────────────────────────────────────────────

export const WikiPage = z.object({
  slug: NonEmpty,
  title: NonEmpty,
  body: NonEmpty, // markdown
  linkedTasks: z.array(z.string()),
});

export const Dataset = z.object({
  name: NonEmpty,
  description: NonEmpty,
  schema: z.record(z.string(), z.string()),
  rows: z.array(z.record(z.string(), z.unknown())),
  linkedTasks: z.array(z.string()),
});

export const InWorldDocument = z.object({
  slug: NonEmpty,
  title: NonEmpty,
  docType: z.enum([
    "compliance-memo",
    "architecture-narrative",
    "regulatory-filing",
    "postmortem",
    "other",
  ]),
  body: NonEmpty,
  linkedTasks: z.array(z.string()),
});

export const Email = z.object({
  slug: NonEmpty,
  from: NonEmpty,
  to: z.array(NonEmpty).min(1),
  subject: NonEmpty,
  sentAt: NonEmpty, // ISO 8601
  body: NonEmpty,
  linkedTasks: z.array(z.string()),
});

export const NotebookOutput = z.object({
  type: z.enum(["stdout", "stderr", "result", "image", "table", "error"]),
  content: NonEmpty,
  mimeType: z.string().optional(),
});

export const NotebookCell = z.object({
  id: NonEmpty,
  type: z.enum(["code", "markdown"]),
  source: NonEmpty,
  language: z.string().optional(),
  outputs: z.array(NotebookOutput).default([]),
  executionCount: z.number().int().optional(),
});

export const Notebook = z.object({
  slug: NonEmpty,
  title: NonEmpty,
  description: z.string().optional(),
  kernel: z.string().default("python3"),
  runtime: z.enum(["simulated", "pyodide"]).default("simulated"),
  cells: z.array(NotebookCell).min(1),
  linkedTasks: z.array(z.string()),
});
export type Notebook = z.infer<typeof Notebook>;
export type NotebookCell = z.infer<typeof NotebookCell>;
export type NotebookOutput = z.infer<typeof NotebookOutput>;

export const Fixtures = z.object({
  wikiPages: z.array(WikiPage),
  datasets: z.array(Dataset),
  documents: z.array(InWorldDocument),
  emails: z.array(Email),
  notebooks: z.array(Notebook).default([]),
});
export type Fixtures = z.infer<typeof Fixtures>;

// ─────────────────────────────────────────────────────────────────────────────
// Tasks, rubrics, modules (Phase 2 + 5 output)
// ─────────────────────────────────────────────────────────────────────────────

export const Primitive = z.enum([
  "ChatWithPersona",
  "ReadDocument",
  "QueryDataset",
  "ExploreSystem",
  "BuildArtifact",
  "UploadDeliverable",
  "LLMJudge",
  "PresentAndDefend",
  "ObserveEvent",
]);
export type Primitive = z.infer<typeof Primitive>;

export const MockFeedbackState = z.object({
  id: NonEmpty,
  round: z.number().int().min(1),
  score: z.number().int().min(0).max(100).optional(),
  matchCriteria: z.object({
    minInsightsLength: z.number().int().optional(),
    maxInsightsLength: z.number().int().optional(),
    minNotebookCells: z.number().int().optional(),
    maxNotebookCells: z.number().int().optional(),
    requireKeywordsAny: z.array(z.string()).optional(),
    requireKeywordsAll: z.array(z.string()).optional(),
    rejectKeywordsAny: z.array(z.string()).optional(),
  }),
  feedback: NonEmpty,
  fromPersonaId: NonEmpty,
});
export type MockFeedbackState = z.infer<typeof MockFeedbackState>;

export const Deliverable = z.object({
  type: z.enum(["diagram", "document", "code", "matrix", "presentation"]),
  format: z.enum(["pdf", "png", "md", "zip", "other"]),
  acceptanceSummary: NonEmpty,
  judgeMode: z.enum(["single", "iterative"]).default("single"),
  mockFeedback: z.array(MockFeedbackState).default([]),
  completionScoreThreshold: z.number().int().min(0).max(100).default(80),
});

export const MeetingParticipant = z.object({
  name: NonEmpty,
  role: NonEmpty,
  personaId: z.string().optional(), // links back to a Persona, if any
});

export const MeetingSegment = z.object({
  speakerName: NonEmpty, // must match a MeetingParticipant.name for active-speaker highlighting
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().positive(),
  text: NonEmpty,
});

export const MeetingRecording = z.object({
  title: NonEmpty, // e.g. "Kickoff Call — Meridian × FDE Team"
  recordedAt: NonEmpty, // ISO 8601
  durationSeconds: z.number().int().positive(),
  audioUrl: z.string().optional(), // path under runtime/public, e.g. "/audio/kickoff.mp3"
  participants: z.array(MeetingParticipant).min(1),
  summary: NonEmpty, // 1-2 sentence preview, shown before expanding
  transcript: NonEmpty, // markdown — speaker-tagged transcript (fallback when no segments)
  segments: z.array(MeetingSegment).optional(), // timed segments for active-speaker + captions
});
export type MeetingRecording = z.infer<typeof MeetingRecording>;
export type MeetingParticipant = z.infer<typeof MeetingParticipant>;
export type MeetingSegment = z.infer<typeof MeetingSegment>;

export const HardCriterion = z.object({
  id: NonEmpty,
  description: NonEmpty,
  verificationMethod: NonEmpty,
});

export const QualitativeCriterion = z.object({
  id: NonEmpty,
  description: NonEmpty,
  scoringGuide: z.object({
    one: NonEmpty,
    three: NonEmpty,
    five: NonEmpty,
  }),
});

export const Rubric = z.object({
  hardCriteria: z.array(HardCriterion).min(4),
  qualitativeCriteria: z.array(QualitativeCriterion),
  passCondition: NonEmpty,
  judgePromptTemplate: NonEmpty,
});

export const Task = z.object({
  id: NonEmpty,
  moduleIdx: z.number().int().nonnegative(),
  taskIdx: z.number().int().nonnegative(),
  title: NonEmpty,
  brief: NonEmpty, // markdown, learner voice
  deliverable: Deliverable,
  durationMinutes: z.number().int().positive(),
  type: z.enum(["individual", "pair", "team"]),
  availablePrimitives: z.array(Primitive).min(1),
  requiredWorldKnowledge: z.array(z.string()),
  linkedPersonaIds: z.array(z.string()),
  rubric: Rubric,
  notes: z.string().optional(),
  meetingRecording: MeetingRecording.optional(),
});
export type Task = z.infer<typeof Task>;

export const Module = z.object({
  idx: z.number().int().nonnegative(),
  title: NonEmpty,
  objective: NonEmpty,
  tasks: z.array(Task).min(1),
});

// ─────────────────────────────────────────────────────────────────────────────
// Top-level package
// ─────────────────────────────────────────────────────────────────────────────

export const CoursePackage = z.object({
  meta: z.object({
    client: NonEmpty,
    industry: NonEmpty,
    role: NonEmpty,
    sourceDocHash: NonEmpty,
    version: NonEmpty,
    generatedAt: NonEmpty, // ISO 8601
    scope: NonEmpty, // e.g. "M1.T1" or "full"
  }),
  world: World,
  personas: z.array(Persona).min(1),
  fixtures: Fixtures,
  modules: z.array(Module).min(1),
});
export type CoursePackage = z.infer<typeof CoursePackage>;
