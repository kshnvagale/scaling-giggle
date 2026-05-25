# Netflix Content Strategy Sim — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second simulation — Netflix Content Strategy — to the CaseForge learner runtime, alongside the existing Helix Cloud RevOps sim. Real Python notebook via Pyodide, mock iterative AI mentor (Priya), URL-switchable.

**Architecture:** Additive only. The existing CoursePackage (`runtime/public/course-package.json`) and apps stay untouched. A new `course-package-netflix.json` plus a `?case=netflix` URL switch loads the new sim. New Submit app is gated on `deliverable.judgeMode === "iterative"` so the existing dock is unchanged. The Notebook app gains a `runtime` field that branches between simulated outputs (current behaviour, Helix sim) and a Pyodide kernel (Netflix sim).

**Tech Stack:** Next.js 14 App Router, Zustand store, Zod schemas, Pyodide 0.26 (from CDN), pandas + matplotlib in WASM, Anthropic SDK for chat persona, TypeScript 5.5, Tailwind, react-simple-code-editor + Prism.

**Spec reference:** `docs/superpowers/specs/2026-05-25-netflix-sim-design.md`. The plan is authoritative when it diverges from the spec — divergences are noted inline.

---

## Pre-flight: codebase reality check

Before any task, confirm the current state matches what this plan assumes:

```bash
# from repo root
ls runtime/components/apps/                 # → bigquery briefing chat notebook sheets terminal wiki (NO submit)
grep "openingLine" runtime/components/apps/chat/ChatApp.tsx | head -1   # existing chat opener mechanism
cat runtime/lib/types.ts | grep "AppId ="   # current AppId union
ls schema/                                  # → course_package.ts, validate.ts
```

If anything diverges materially (e.g. `submit/` folder appeared, AppId already has `"submit"`), stop and re-read the spec before proceeding — the plan was written against the state above.

---

## File structure (final state after all tasks)

```
schema/course_package.ts                       # MODIFIED — Notebook.runtime, Deliverable.judgeMode/mockFeedback, MockFeedbackState

runtime/lib/types.ts                           # MODIFIED — AppId adds "submit"
runtime/lib/store.ts                           # MODIFIED — pyodide kernel, cell live outputs, insights draft, feedback history, finalization
runtime/lib/app-registry.ts                    # MODIFIED — submit entry; dock-builder consults active package
runtime/lib/course-loader.ts                   # MODIFIED — accept any package URL, not hardcoded
runtime/lib/pyodide-kernel.ts                  # NEW — Pyodide loader, CSV mount, runCell()
runtime/lib/mock-judge.ts                      # NEW — deterministic state-machine judge

runtime/app/page.tsx                           # MODIFIED — read ?case= query param
runtime/app/api/chat/route.ts                  # MODIFIED — add GUARDRAILS block to system prompt

runtime/components/apps/notebook/Cell.tsx              # MODIFIED — branch on notebook.runtime
runtime/components/apps/notebook/CodeCell.tsx          # MODIFIED — call pyodide kernel when runtime === "pyodide"
runtime/components/apps/notebook/NotebookView.tsx      # MODIFIED — kernel-boot banner for pyodide

runtime/components/apps/submit/SubmitApp.tsx           # NEW — top-level Submit app, branches on judgeMode
runtime/components/apps/submit/IterativeSubmit.tsx     # NEW — two-panel + feedback history
runtime/components/apps/submit/FeedbackBubble.tsx      # NEW — one round of feedback

runtime/public/course-package-netflix.json     # NEW — Netflix case content
runtime/public/data/netflix_titles.csv         # NEW — Kaggle dataset asset
```

---

## Task 1: Schema additions

**Files:**
- Modify: `schema/course_package.ts`

These are additive only. Existing `course-package.json` continues to validate.

- [ ] **Step 1.1: Open the schema file and locate the `Notebook` block (around line 147).**

Read `schema/course_package.ts` to confirm `Notebook` exists with `kernel: z.string().default("python3")`.

- [ ] **Step 1.2: Add a `runtime` field to `Notebook` schema.**

Replace the existing `Notebook` z.object with this version (additive — adds `runtime` field after `kernel`):

```ts
export const Notebook = z.object({
  slug: NonEmpty,
  title: NonEmpty,
  description: z.string().optional(),
  kernel: z.string().default("python3"),
  runtime: z.enum(["simulated", "pyodide"]).default("simulated"),
  cells: z.array(NotebookCell).min(1),
  linkedTasks: z.array(z.string()),
});
```

Rationale: `kernel` is the display label (free string, e.g. "Python 3"). `runtime` is the execution mode and is strictly typed. Default `"simulated"` keeps the existing Helix notebook working without change.

- [ ] **Step 1.3: Add `MockFeedbackState` schema after the existing `Deliverable` block (around line 189).**

Append this new export immediately after `Deliverable`. Note: `matchCriteria` includes both `min*` and `max*` length/cell-count fields so authors can express upper and lower bounds (the mock judge in Task 5 honours both).

```ts
export const MockFeedbackState = z.object({
  id: NonEmpty,
  round: z.number().int().min(1),
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
```

- [ ] **Step 1.4: Extend `Deliverable` with `judgeMode` and `mockFeedback`.**

Replace the existing `Deliverable` z.object with:

```ts
export const Deliverable = z.object({
  type: z.enum(["diagram", "document", "code", "matrix", "presentation"]),
  format: z.enum(["pdf", "png", "md", "zip", "other"]),
  acceptanceSummary: NonEmpty,
  judgeMode: z.enum(["single", "iterative"]).default("single"),
  mockFeedback: z.array(MockFeedbackState).default([]),
});
```

- [ ] **Step 1.5: Verify the existing Helix package still validates.**

```bash
npm run validate -- runtime/public/course-package.json
```

Expected: `OK — runtime/public/course-package.json` followed by the existing summary. If validation fails, the changes broke backward compatibility — revisit defaults.

- [ ] **Step 1.6: Commit.**

```bash
git add schema/course_package.ts
git commit -m "schema: add Notebook.runtime, Deliverable.judgeMode + mockFeedback

Additive only. New fields have defaults so existing course-package.json
continues to validate. Sets up the schema surface for the Netflix sim."
```

---

## Task 2: Extend `AppId` and re-export new types

**Files:**
- Modify: `runtime/lib/types.ts`

- [ ] **Step 2.1: Open `runtime/lib/types.ts` and find the `AppId` union (currently line 31).**

Current:
```ts
export type AppId = "briefing" | "wiki" | "chat" | "sheets" | "bigquery" | "terminal" | "notebook";
```

- [ ] **Step 2.2: Add `"submit"` to the union and re-export the new schema types.**

```ts
export type AppId = "briefing" | "wiki" | "chat" | "sheets" | "bigquery" | "terminal" | "notebook" | "submit";
```

Then near the other schema re-exports at the bottom of the file (locate the existing `import type { ... } from "@schema/course_package"` block), add `MockFeedbackState`:

```ts
export type { MockFeedbackState } from "@schema/course_package";
```

- [ ] **Step 2.3: Typecheck the runtime to make sure nothing else broke.**

```bash
cd runtime && npx tsc --noEmit
```

Expected: no errors related to `AppId`. (Pre-existing errors unrelated to this task are out of scope.)

- [ ] **Step 2.4: Commit.**

```bash
git add runtime/lib/types.ts
git commit -m "runtime/types: add 'submit' to AppId, re-export MockFeedbackState"
```

---

## Task 3: Add Netflix dataset asset

**Files:**
- Create: `runtime/public/data/netflix_titles.csv`

- [ ] **Step 3.1: Confirm `runtime/public/data/` directory exists or create it.**

```bash
mkdir -p runtime/public/data
```

- [ ] **Step 3.2: Download the Kaggle netflix-shows dataset.**

The canonical CSV is at the Kaggle dataset page: https://www.kaggle.com/datasets/shivamb/netflix-shows

Manual fetch (Kaggle requires auth):
1. Sign in to Kaggle.
2. Download `archive.zip` from the dataset page.
3. Extract `netflix_titles.csv`.
4. Move to `runtime/public/data/netflix_titles.csv`.

Mirror fallback (no auth, public mirror — verify column schema matches before relying):
```bash
curl -L -o runtime/public/data/netflix_titles.csv \
  "https://raw.githubusercontent.com/karthik947/Netflix-Recommender-System/master/netflix_titles.csv"
```

- [ ] **Step 3.3: Verify column shape.**

```bash
head -1 runtime/public/data/netflix_titles.csv
wc -l runtime/public/data/netflix_titles.csv
```

Expected header (order may vary):
```
show_id,type,title,director,cast,country,date_added,release_year,rating,duration,listed_in,description
```

Expected line count: ~8800 (the dataset is 8,807 rows + 1 header).

If the header does not contain all 12 columns above, **stop** and re-source the file from Kaggle directly.

- [ ] **Step 3.4: Commit the CSV.**

```bash
git add runtime/public/data/netflix_titles.csv
git commit -m "data: add Kaggle netflix-shows dataset for Netflix sim"
```

---

## Task 4: Pyodide kernel module

**Files:**
- Create: `runtime/lib/pyodide-kernel.ts`

This module isolates all Pyodide-specific code so notebook components stay clean. Loads Pyodide from CDN on first call, mounts the CSV into Pyodide's virtual FS, and exposes a `runCell` function returning `NotebookOutput[]`.

- [ ] **Step 4.1: Create the file with the kernel interface and loader.**

```ts
// runtime/lib/pyodide-kernel.ts
"use client";

import type { NotebookOutput } from "@/lib/types";

// Loaded onto window by the Pyodide CDN script tag we inject.
type PyodideInterface = {
  runPythonAsync: (code: string) => Promise<unknown>;
  globals: { get: (name: string) => unknown };
  loadPackage: (pkgs: string[] | string) => Promise<void>;
  FS: {
    mkdirTree: (path: string) => void;
    writeFile: (path: string, data: Uint8Array | string) => void;
  };
};

declare global {
  interface Window {
    loadPyodide?: (opts?: { indexURL: string }) => Promise<PyodideInterface>;
  }
}

export interface PyodideKernel {
  ready: boolean;
  runCell: (source: string) => Promise<NotebookOutput[]>;
}

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PYODIDE_SCRIPT_SRC = `${PYODIDE_INDEX_URL}pyodide.js`;

let cachedBootPromise: Promise<PyodideKernel> | null = null;

export function bootPyodideKernel(csvUrl: string): Promise<PyodideKernel> {
  if (!cachedBootPromise) {
    cachedBootPromise = doBoot(csvUrl);
  }
  return cachedBootPromise;
}

async function doBoot(csvUrl: string): Promise<PyodideKernel> {
  await injectScript(PYODIDE_SCRIPT_SRC);
  if (!window.loadPyodide) {
    throw new Error("pyodide script loaded but window.loadPyodide is undefined");
  }
  const pyodide = await window.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
  await pyodide.loadPackage(["pandas", "matplotlib"]);

  // Force matplotlib to use the Agg backend so plt.show() doesn't try to open a window.
  await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import io, base64

_FIG_BUFFER = []

_original_show = plt.show
def _capture_show(*args, **kwargs):
    fig = plt.gcf()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=110, bbox_inches="tight")
    buf.seek(0)
    _FIG_BUFFER.append(base64.b64encode(buf.read()).decode("ascii"))
    plt.clf()
plt.show = _capture_show

import sys
class _StdoutCapture:
    def __init__(self): self.buf = []
    def write(self, s): self.buf.append(s)
    def flush(self): pass
class _StderrCapture(_StdoutCapture):
    pass

_STDOUT_CAPTURE = _StdoutCapture()
_STDERR_CAPTURE = _StderrCapture()
  `);

  // Mount the CSV.
  const csvBytes = await fetchCsv(csvUrl);
  pyodide.FS.mkdirTree("/data");
  pyodide.FS.writeFile("/data/netflix_titles.csv", csvBytes);

  return {
    ready: true,
    runCell: (source) => runCell(pyodide, source),
  };
}

async function runCell(pyodide: PyodideInterface, source: string): Promise<NotebookOutput[]> {
  const outputs: NotebookOutput[] = [];
  // Reset capture buffers
  await pyodide.runPythonAsync(`
_FIG_BUFFER.clear()
_STDOUT_CAPTURE.buf.clear()
_STDERR_CAPTURE.buf.clear()
import sys
sys.stdout = _STDOUT_CAPTURE
sys.stderr = _STDERR_CAPTURE
  `);

  let resultRepr: string | null = null;
  let errorText: string | null = null;
  try {
    const value = await pyodide.runPythonAsync(source);
    if (value !== undefined && value !== null) {
      resultRepr = await pyodide.runPythonAsync(`repr(_) if (_ := globals().get('__last_value__', None)) is not None else None`);
      // Fallback: stringify the actual value via Pyodide's PyProxy
      if (resultRepr == null) {
        try { resultRepr = String(value); } catch { resultRepr = null; }
      }
    }
  } catch (err) {
    errorText = (err as Error).message ?? String(err);
  } finally {
    await pyodide.runPythonAsync(`
import sys
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
    `);
  }

  const stdoutText = String(await pyodide.runPythonAsync(`"".join(_STDOUT_CAPTURE.buf)`));
  const stderrText = String(await pyodide.runPythonAsync(`"".join(_STDERR_CAPTURE.buf)`));
  if (stdoutText) outputs.push({ type: "stdout", content: stdoutText });
  if (stderrText) outputs.push({ type: "stderr", content: stderrText });

  if (errorText) {
    outputs.push({ type: "error", content: errorText });
    return outputs;
  }

  // Captured figures
  const figCount = Number(await pyodide.runPythonAsync(`len(_FIG_BUFFER)`));
  for (let i = 0; i < figCount; i++) {
    const b64 = String(await pyodide.runPythonAsync(`_FIG_BUFFER[${i}]`));
    outputs.push({ type: "image", content: b64, mimeType: "image/png" });
  }

  if (resultRepr && resultRepr !== "None") {
    outputs.push({ type: "result", content: resultRepr });
  }
  return outputs;
}

async function fetchCsv(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to fetch ${url}: HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const tag = document.createElement("script");
    tag.src = src;
    tag.async = true;
    tag.onload = () => resolve();
    tag.onerror = () => reject(new Error(`failed to load script ${src}`));
    document.head.appendChild(tag);
  });
}
```

- [ ] **Step 4.2: Typecheck.**

```bash
cd runtime && npx tsc --noEmit
```

Expected: no errors in `pyodide-kernel.ts`.

- [ ] **Step 4.3: Commit.**

```bash
git add runtime/lib/pyodide-kernel.ts
git commit -m "runtime/lib: add pyodide-kernel module

Lazy-loads Pyodide + pandas + matplotlib from CDN. Mounts the Netflix CSV
to /data/netflix_titles.csv. runCell captures stdout/stderr, matplotlib
figures (as base64 PNGs), and result reprs into NotebookOutput[]."
```

---

## Task 5: Mock judge module

**Files:**
- Create: `runtime/lib/mock-judge.ts`

Pure deterministic function. No LLM, no network. Matches submission state against `MockFeedbackState[]` from the CoursePackage and returns the first match.

- [ ] **Step 5.1: Create the module.**

```ts
// runtime/lib/mock-judge.ts
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
```

**Cascade authoring rules** for the state-machine in `course-package-netflix.json`:
- All set criteria must hold for a state to match (AND).
- Criteria not set are ignored.
- States are evaluated in array order — author from most-specific (empty draft, missing keyword) to least-specific (catch-all).
- A state with `matchCriteria: {}` matches anything — that's the catch-all "polished" feedback.
- To express "empty draft = insights under 50 chars," use `maxInsightsLength: 49`. To express "real draft = at least 50 chars," use `minInsightsLength: 50`.

- [ ] **Step 5.2: Add an inline self-test you can run with tsx.**

Append to the bottom of `mock-judge.ts`:

```ts
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
```

Run it:

```bash
cd runtime && npx tsx lib/mock-judge.ts
```

Expected output:
```
ok: empty
ok: no-intl
ok: no-recs
ok: polished
```

- [ ] **Step 5.3: Commit.**

```bash
git add runtime/lib/mock-judge.ts
git commit -m "runtime/lib: add mock-judge state-machine

Deterministic matcher for iterative judge feedback. Supports min/max
length, min/max cell count, require-any, require-all, reject-any."
```

---

## Task 6: Store extensions

**Files:**
- Modify: `runtime/lib/store.ts`

Adds Pyodide kernel state, cell live outputs, insights draft, feedback history, and finalization. Does not touch existing state.

- [ ] **Step 6.1: Read the current store header and find the state interface.**

```bash
sed -n '1,80p' runtime/lib/store.ts
```

Identify the interface that declares the state (likely named `CaseForgeStore` or similar) and the create() call that builds the store.

- [ ] **Step 6.2: Add new state fields and actions.**

Inside the store's state interface, add (alongside existing fields):

```ts
// Netflix sim — Pyodide kernel
pyodideKernel: PyodideKernel | null;
pyodideBootStatus: "idle" | "booting" | "ready" | "error";
pyodideBootError: string | null;
cellLiveOutputs: Record<string, NotebookOutput[]>;   // by cell id

// Netflix sim — iterative submit
insightsDraft: string;
feedbackHistory: Array<{
  id: string;
  round: number;
  feedback: string;
  fromPersonaId: string;
  at: number;     // Date.now()
}>;
submissionFinalized: boolean;
```

Add the necessary imports at the top of the file (alongside existing schema imports):

```ts
import type { PyodideKernel } from "@/lib/pyodide-kernel";
import type { NotebookOutput } from "@/lib/types";
```

In the create() default state object, initialise:

```ts
pyodideKernel: null,
pyodideBootStatus: "idle",
pyodideBootError: null,
cellLiveOutputs: {},
insightsDraft: "",
feedbackHistory: [],
submissionFinalized: false,
```

Add actions next to the existing action group:

```ts
bootPyodide: async () => {
  const status = get().pyodideBootStatus;
  if (status === "booting" || status === "ready") return;
  set({ pyodideBootStatus: "booting", pyodideBootError: null });
  try {
    const { bootPyodideKernel } = await import("@/lib/pyodide-kernel");
    const kernel = await bootPyodideKernel("/data/netflix_titles.csv");
    set({ pyodideKernel: kernel, pyodideBootStatus: "ready" });
  } catch (err) {
    set({
      pyodideBootStatus: "error",
      pyodideBootError: (err as Error).message ?? String(err),
    });
  }
},

setCellLiveOutputs: (cellId: string, outputs: NotebookOutput[]) =>
  set((s) => ({
    cellLiveOutputs: { ...s.cellLiveOutputs, [cellId]: outputs },
  })),

setInsightsDraft: (text: string) => set({ insightsDraft: text }),

appendFeedback: (entry: {
  round: number;
  feedback: string;
  fromPersonaId: string;
}) =>
  set((s) => ({
    feedbackHistory: [
      ...s.feedbackHistory,
      {
        id: crypto.randomUUID(),
        round: entry.round,
        feedback: entry.feedback,
        fromPersonaId: entry.fromPersonaId,
        at: Date.now(),
      },
    ],
  })),

finalizeSubmission: () => set({ submissionFinalized: true }),
```

Declare the same signatures in the state interface so consumers can call them. Mirror the existing convention in the file (some stores split fields and actions, some interleave — match the file's pattern).

- [ ] **Step 6.3: Reset on case load.**

Find the existing `loadCoursePackage` action (it currently calls `set({ ... })` to clear store state on load). Add the new fields to that reset:

```ts
pyodideKernel: null,
pyodideBootStatus: "idle",
pyodideBootError: null,
cellLiveOutputs: {},
insightsDraft: "",
feedbackHistory: [],
submissionFinalized: false,
```

This guarantees that switching cases via URL (?case=netflix vs default) gives a clean slate.

- [ ] **Step 6.4: Typecheck.**

```bash
cd runtime && npx tsc --noEmit
```

Expected: no errors in `store.ts`.

- [ ] **Step 6.5: Commit.**

```bash
git add runtime/lib/store.ts
git commit -m "runtime/store: add Pyodide kernel + iterative submit state

New state: pyodideKernel, pyodideBootStatus, pyodideBootError,
cellLiveOutputs, insightsDraft, feedbackHistory, submissionFinalized.
All reset on case load."
```

---

## Task 7: URL-based case loading

**Files:**
- Modify: `runtime/lib/course-loader.ts`
- Modify: `runtime/app/page.tsx`

- [ ] **Step 7.1: Open `runtime/lib/course-loader.ts` and confirm its signature.**

```bash
cat runtime/lib/course-loader.ts
```

If it already takes a URL parameter (the spec assumes `loadCoursePackage("/course-package.json")`), no change needed. If it hardcodes the URL internally, refactor to accept a URL argument.

- [ ] **Step 7.2: Update `runtime/app/page.tsx` to read the `?case=` query param.**

Find the existing call site for `loadCoursePackage`. Replace:

```ts
loadCoursePackage("/course-package.json");
```

with:

```ts
const search = typeof window !== "undefined" ? window.location.search : "";
const caseId = new URLSearchParams(search).get("case");
const url = caseId === "netflix"
  ? "/course-package-netflix.json"
  : "/course-package.json";
loadCoursePackage(url);
```

If `page.tsx` is a Server Component, move this logic into a `useEffect` in the existing client wrapper (most likely `IntroGate` or `HomePage`). The query-param read must happen client-side.

- [ ] **Step 7.3: Smoke test (defaults to Helix).**

```bash
cd runtime && npm run dev
# Open http://localhost:3000/ in a browser
```

Expected: Helix Cloud sim loads exactly as before. No console errors related to course loading.

- [ ] **Step 7.4: Smoke test (Netflix URL — should 404 the JSON gracefully).**

```bash
# Browser: http://localhost:3000/?case=netflix
```

Expected: a network error in the console fetching `/course-package-netflix.json` (since we haven't created it yet). The app may show an error screen — that's fine for now; we ship the JSON in Task 9.

- [ ] **Step 7.5: Commit.**

```bash
git add runtime/app/page.tsx runtime/lib/course-loader.ts
git commit -m "runtime/page: load CoursePackage by ?case= query param

case=netflix → /course-package-netflix.json
otherwise   → /course-package.json (existing behaviour)"
```

---

## Task 8: Hardened persona system prompt

**Files:**
- Modify: `runtime/app/api/chat/route.ts`

Adds a GUARDRAILS block to the composed system prompt so personas stay in-character across both sims.

- [ ] **Step 8.1: Read the current prompt composition.**

```bash
cat runtime/app/api/chat/route.ts
```

Identify where the system prompt is assembled. Look for the Slack-voice block — the new block goes immediately after it.

- [ ] **Step 8.2: Insert the GUARDRAILS block.**

Find the line that ends the Slack-voice string template. Right after it (before the `privateKnowledge` concatenation), splice in:

```ts
const guardrails = `
GUARDRAILS:
- You are ${persona.name}. You are not an AI. Never break character.
- Only discuss this case. Decline anything off-topic: general coding
  help, opinions on other companies, personal life chat. Redirect:
  "let's stay on the case."
- Never do the analysis for the learner. No code. No "here's what
  you should plot." If pushed: "that's your call to make."
- Only share facts from your private knowledge. If asked something
  you don't know, say so plainly: "no idea, would have to check"
  or "we don't track that, sorry."
- Never invent numbers, names, or company facts not given to you.
- 1-3 short Slack messages per reply. No paragraphs. No em dashes.
`;
```

Then add `guardrails` to the composed system prompt string in the order: persona system prompt → Slack voice → guardrails → private knowledge → world context. Match the exact ordering pattern already in the file.

- [ ] **Step 8.3: Smoke test against the Helix sim.**

```bash
cd runtime && npm run dev
# Open Chat, pick Sam or Maya, ask: "write me a SQL query that joins accounts and subscriptions"
```

Expected: the persona declines and redirects ("that's your call to make"). If the persona writes SQL, the guardrail isn't firing — verify the new block landed inside the system prompt string sent to the API.

```bash
# Open Chat, ask: "what do you think of Snowflake's stock?"
```

Expected: refusal / redirect to the case.

- [ ] **Step 8.4: Commit.**

```bash
git add runtime/app/api/chat/route.ts
git commit -m "chat/api: add GUARDRAILS block to persona system prompt

Tightens in-character behaviour across both sims. Personas now
decline off-topic asks, refuse to do the learner's analysis, and
admit ignorance instead of inventing facts."
```

---

## Task 9: Netflix CoursePackage JSON — skeleton, meta, world, persona

**Files:**
- Create: `runtime/public/course-package-netflix.json`

This task seeds the JSON with the parts that must be present for the schema to validate (meta, world with min 8 glossary + 1 system, personas with min 1 + min 1 KnowledgeNugget each, modules with min 1 task each having a rubric with min 4 hardCriteria). Fixtures and notebook arrive in later tasks.

- [ ] **Step 9.1: Create the file with the minimum-viable shell.**

```json
{
  "meta": {
    "client": "Netflix",
    "industry": "Streaming Entertainment",
    "role": "Content Strategy Analyst",
    "sourceDocHash": "netflix-eda-2026-05-25",
    "version": "1.0.0",
    "generatedAt": "2026-05-25T00:00:00.000Z",
    "scope": "netflix.t1"
  },
  "world": {
    "client": {
      "name": "Netflix",
      "size": "Global streaming platform (260M+ subscribers)",
      "businessModel": "Subscription streaming for movies and TV shows, plus original productions",
      "keyNumbers": {
        "catalogSize": "~8,800 titles in current snapshot",
        "subscribers": "260M+",
        "countriesServed": "190+"
      },
      "source": "doc"
    },
    "industry": {
      "primary": "Streaming Entertainment",
      "subVertical": "SVOD (subscription video on demand)"
    },
    "glossary": [
      {
        "term": "SVOD",
        "definition": "Subscription Video On Demand — the streaming model Netflix pioneered.",
        "whyItMatters": "Defines how Netflix measures success: subscriber growth, engagement, and retention rather than ad revenue.",
        "source": "doc"
      },
      {
        "term": "Catalog",
        "definition": "The set of titles currently available to stream on Netflix in a given region.",
        "whyItMatters": "The dataset is a snapshot of the catalog at a point in time. Titles drop off when licensing expires.",
        "source": "doc"
      },
      {
        "term": "Originals",
        "definition": "Titles produced or commissioned by Netflix, not licensed from a studio.",
        "whyItMatters": "Originals are Netflix's differentiator and biggest spend lever. The 'what to make' question is mostly about originals.",
        "source": "doc"
      },
      {
        "term": "TV Rating",
        "definition": "Age-appropriateness rating: TV-Y, TV-Y7, TV-G, TV-PG, TV-14, TV-MA for TV shows; G, PG, PG-13, R for films.",
        "whyItMatters": "Rating maps to which audiences a title can reach. TV-MA limits the addressable market.",
        "source": "doc"
      },
      {
        "term": "Listed_in",
        "definition": "The dataset's genre field. A comma-separated list — a single title can be tagged with multiple genres.",
        "whyItMatters": "Genres are not exclusive. A documentary about food is both 'Documentaries' and 'International Movies' depending on origin.",
        "source": "doc"
      },
      {
        "term": "Date_added",
        "definition": "The date a title was added to the Netflix catalog. Different from release_year.",
        "whyItMatters": "Reflects Netflix's acquisition or production cadence, not the age of the content.",
        "source": "doc"
      },
      {
        "term": "Engagement",
        "definition": "Generic term for watch time and completion rate — not in the dataset directly but the underlying business metric.",
        "whyItMatters": "Daniela's request is ultimately about engagement, not catalog size.",
        "source": "doc"
      },
      {
        "term": "International",
        "definition": "Non-US content. The catalog has dedicated 'International Movies' and 'International TV Shows' genres.",
        "whyItMatters": "Strategic growth markets are non-US. International content drives APAC and LATAM subscriber retention.",
        "source": "doc"
      }
    ],
    "systems": [
      {
        "name": "Netflix Catalog Snapshot",
        "vendor": "Internal",
        "roleInBusiness": "Monthly export of every title currently available on Netflix worldwide. The dataset the analyst works with for this case.",
        "typicalIntegrations": ["Content Management System", "Licensing system", "Region-availability service"],
        "knownQuirks": [
          "date_added is bulk-loaded for entries before 2018, so the date field is approximate for older content",
          "country is comma-separated for co-productions (e.g. 'United States, India')",
          "duration mixes units: minutes for movies, seasons for TV shows"
        ],
        "source": "doc"
      }
    ],
    "regulations": [],
    "clientProfile": "Netflix is the leading global SVOD platform with over 260 million paying subscribers across 190+ countries. The company sustains its lead by spending heavily on original content while maintaining a deep licensed catalog. Content strategy decisions — what to produce, what to acquire, which markets to prioritise — drive subscriber acquisition, engagement, and retention.\n\nYou are a new Content Strategy Analyst on Priya Raghavan's team. Priya manages Content Strategy & Insights, reporting up to VP Daniela Vasquez. Daniela's Q2 priority is international expansion in Asia-Pacific and LATAM — the US and UK markets are already saturated. This assignment is your first task. The dataset is a snapshot of Netflix's global catalog; you have until Friday to ship insights and recommendations."
  },
  "personas": [
    {
      "id": "priya",
      "name": "Priya Raghavan",
      "role": "Senior Manager, Content Strategy & Insights",
      "reportsTo": "Daniela Vasquez (VP, Content)",
      "linkedTasks": ["netflix.t1"],
      "backstory": "Joined Netflix in 2022 from a strategy consulting role. Manages a small team of analysts and is known for being direct, supportive, and impatient with jargon. Works closely with VP Daniela on Q-by-Q content priorities.",
      "systemPrompt": "You are Priya Raghavan, a senior manager at Netflix on the Content Strategy & Insights team. You are warm, busy, supportive. You manage a small team of analysts and help them ship sharper insights to VPs. You believe in attempting things, iterating, and not overthinking. You don't have time for jargon. You write in Slack — short messages, no paragraphs, casual.",
      "privateKnowledge": [
        {
          "key": "vp-priority-international",
          "value": "VP Daniela Vasquez's actual Q2 priority is international expansion in Asia-Pacific and LATAM. The US/UK markets are already saturated. 'Growth' to her means engagement and retention in under-indexed markets, not raw subscriber adds. Only reveal this if the analyst asks about scope, the VP, or what to focus on.",
          "disclosureHint": "Reveal when the analyst asks for scope clarification or about what Daniela wants.",
          "importance": "critical"
        },
        {
          "key": "good-output-looks-like",
          "value": "Daniela hates jargon. Plain English only. Three recommendations max, all action-oriented. She trusts data over conclusions, so the analyst needs to show their work. Lead with the recommendation, back it with data.",
          "disclosureHint": "Reveal when the analyst asks about format, audience, or how to present.",
          "importance": "critical"
        },
        {
          "key": "data-caveats",
          "value": "Three known quirks in the dataset: (1) date_added is unreliable for entries before 2018 — bulk-loaded, dates are approximate. (2) ~30% of the director field is null. (3) The country field is sometimes comma-separated for co-productions like 'United States, India'.",
          "disclosureHint": "Reveal when the analyst asks about the dataset, its shape, or specific columns.",
          "importance": "useful"
        },
        {
          "key": "encouragement",
          "value": "We grade leniently. Most people score 8-10 if they attempt seriously. Submit a rough draft early — round 2 is always stronger than trying to perfect round 1.",
          "disclosureHint": "Reveal when the analyst sounds stuck, overwhelmed, or perfectionist.",
          "importance": "flavor"
        }
      ],
      "openingLine": "hey 👋 saw the brief land in your inbox. lmk if you want me to narrow down what daniela actually wants before you start writing code. otherwise you're good to go, just ping me if stuck."
    }
  ],
  "fixtures": {
    "wikiPages": [],
    "datasets": [],
    "documents": [],
    "emails": [],
    "notebooks": []
  },
  "modules": [
    {
      "idx": 0,
      "title": "Netflix Content Strategy",
      "objective": "Use exploratory data analysis on the Netflix catalog snapshot to produce data-driven insights and recommendations for the VP of Content's Q2 planning.",
      "tasks": []
    }
  ]
}
```

Note the empty arrays for fixtures and `modules[0].tasks` — they get populated in Tasks 10 and 11. The schema enforces `tasks: min(1)`, so this file will FAIL validation until Task 11 lands. That's intentional — keep the file in the working tree but don't expect validation to pass yet.

- [ ] **Step 9.2: Lightly verify the structure.**

```bash
# Don't run npm run validate yet — we know it'll fail until tasks are added.
# But check the JSON parses.
node -e "JSON.parse(require('fs').readFileSync('runtime/public/course-package-netflix.json','utf8')); console.log('JSON parses ok')"
```

Expected: `JSON parses ok`.

- [ ] **Step 9.3: Commit.**

```bash
git add runtime/public/course-package-netflix.json
git commit -m "data: scaffold Netflix CoursePackage (meta, world, Priya persona)

Skeleton with meta, world (8 glossary entries, 1 system), and Priya
as the single persona with her hardened private knowledge. Fixtures
and modules are empty stubs — populated in subsequent tasks. JSON
will not validate against the schema until tasks are added."
```

---

## Task 10: Netflix JSON — wiki pages, briefing, notebook fixture

**Files:**
- Modify: `runtime/public/course-package-netflix.json`

- [ ] **Step 10.1: Add three wiki pages.**

Replace `"wikiPages": []` with:

```json
"wikiPages": [
  {
    "slug": "dataset-dictionary",
    "title": "netflix_titles.csv — dataset dictionary",
    "body": "# Dataset Dictionary\n\nThe file at `/data/netflix_titles.csv` is a monthly snapshot of the current Netflix catalog. 8,807 rows + header.\n\n| Column | Type | Notes |\n|---|---|---|\n| `show_id` | string | Unique catalog ID. Always present. |\n| `type` | enum | `Movie` or `TV Show`. Two values total. |\n| `title` | string | Free text. Always present. |\n| `director` | string | Free text. ~30% null, especially for TV Shows. |\n| `cast` | string | Comma-separated actors. Often null. |\n| `country` | string | Comma-separated for co-productions, e.g. `United States, India`. |\n| `date_added` | date | The date Netflix added it. Reliable from 2018 onward; pre-2018 entries were bulk-loaded — treat as approximate. |\n| `release_year` | int | Year the title was originally released. Goes back to 1925. |\n| `rating` | string | TV/film rating code. See Rating Reference page. |\n| `duration` | string | Mixed units! `90 min` for movies, `3 Seasons` for TV. |\n| `listed_in` | string | Comma-separated genres. ~42 unique tags. |\n| `description` | string | Marketing blurb. Always present. |\n\n## Gotchas\n\n- `duration` cannot be cast to a single numeric column without splitting on type.\n- `country` and `listed_in` need to be exploded for accurate counts.\n- Don't rely on `date_added` for trend analysis before 2018.",
    "linkedTasks": ["netflix.t1"]
  },
  {
    "slug": "rating-reference",
    "title": "TV / Film rating codes",
    "body": "# Rating Reference\n\nThe `rating` column uses standard MPAA / TV Parental Guidelines codes.\n\n| Code | Meaning |\n|---|---|\n| G | General audiences |\n| PG | Parental guidance suggested |\n| PG-13 | Parents strongly cautioned, may be inappropriate for <13 |\n| R | Restricted, <17 requires adult |\n| TV-Y | Designed for young children |\n| TV-Y7 | Designed for children 7+ |\n| TV-G | General audience |\n| TV-PG | Parental guidance suggested |\n| TV-14 | Parents strongly cautioned, may be inappropriate for <14 |\n| TV-MA | Mature audiences only |\n| NR | Not rated |\n| UR | Unrated |\n\n`TV-MA` titles cannot reach younger audiences, which limits the addressable market for that content. Useful when thinking about who a title is *for*.",
    "linkedTasks": ["netflix.t1"]
  },
  {
    "slug": "catalog-note",
    "title": "Internal note: how to read this dataset",
    "body": "# Quick context on the catalog dataset\n\nThis file is exported from our catalog system monthly. It contains what's **currently available** on Netflix as of the snapshot date, not the full history of what was ever on the platform. Titles can drop off when licensing expires, so *absence ≠ never had it*.\n\n`date_added` is the date the title was added to **Netflix**, not the release date of the content itself. Useful for 'what was Netflix acquiring in 2020' type questions. Less useful for 'when did this movie come out' — use `release_year` for that.\n\nWhen you're presenting to execs, this distinction matters. `date_added` is about *our* strategy. `release_year` is about *the content*.",
    "linkedTasks": ["netflix.t1"]
  }
],
```

- [ ] **Step 10.2: Leave `datasets: []` empty.**

The Pyodide kernel mounts the CSV from `runtime/public/data/`. The schema's `datasets` array is for in-world dataset rows that get rendered in apps like BigQuery / Sheets — not relevant here. Empty is correct.

- [ ] **Step 10.3: Add the Netflix notebook fixture.**

Replace `"notebooks": []` with:

```json
"notebooks": [
  {
    "slug": "netflix-catalog-analysis",
    "title": "Netflix Catalog Analysis",
    "description": "Your scratch pad for the Q2 catalog EDA. The dataset is mounted at /data/netflix_titles.csv.",
    "kernel": "Python 3",
    "runtime": "pyodide",
    "linkedTasks": ["netflix.t1"],
    "cells": [
      {
        "id": "starter",
        "type": "code",
        "source": "# Start here. The dataset is at /data/netflix_titles.csv\n# Hint: import pandas as pd",
        "language": "python",
        "outputs": []
      }
    ]
  }
],
```

- [ ] **Step 10.4: Confirm JSON still parses.**

```bash
node -e "JSON.parse(require('fs').readFileSync('runtime/public/course-package-netflix.json','utf8')); console.log('ok')"
```

- [ ] **Step 10.5: Commit.**

```bash
git add runtime/public/course-package-netflix.json
git commit -m "data: add Netflix wiki pages + notebook fixture

Three wiki pages (Dataset Dictionary, Rating Reference, Catalog Note)
and one pyodide-runtime notebook with a single starter cell."
```

---

## Task 11: Netflix JSON — task with rubric + briefing + mock feedback states

**Files:**
- Modify: `runtime/public/course-package-netflix.json`

This is the final piece — fills in `modules[0].tasks` so the schema validates.

- [ ] **Step 11.1: Insert one task with the full rubric, deliverable, and mock feedback states.**

Inside `modules[0]`, replace `"tasks": []` with:

```json
"tasks": [
  {
    "id": "netflix.t1",
    "moduleIdx": 0,
    "taskIdx": 0,
    "title": "Q2 Content Strategy — Catalog Insights",
    "brief": "Hey 👋\n\nVP Daniela wants Q2 planning input from our team and you're up. She framed it pretty open-ended: \"what should we make more of, and how do we grow.\"\n\nI'll be honest, the ask is broader than I'd like. **Before you start coding, DM me on Slack** and I'll narrow it down for you. I have a few hours of context with Daniela that will save you a day.\n\n## What you have to work with\n\n- `/data/netflix_titles.csv` (the full catalog)\n- **Notebook** app for your analysis\n- **Submit** tab when you're ready for a review pass\n\n## What you're producing\n\n- A notebook with your EDA\n- A short written set of insights + recommendations (Submit tab, Insights panel)\n\n## How it gets graded\n\n1. Problem framing & basic metrics (10)\n2. Data shape, types, missing values (10)\n3. Value counts, unique attributes (10)\n4. Univariate + bivariate visual analysis (30)\n5. Outlier / missing value treatment (10)\n6. Insights from your analysis (10)\n7. Business insights (10)\n8. Recommendations — no jargon, exec-ready (10)\n\nYou'll get a feedback pass from me each time you submit a draft. Iterate as many times as you want. Final submit locks it in.\n\nDon't overthink it. Most people score 8-10 if they just attempt seriously.\n\n— P.",
    "deliverable": {
      "type": "document",
      "format": "md",
      "acceptanceSummary": "A notebook of EDA work plus a written insights & recommendations document that addresses Daniela's question about Q2 content strategy.",
      "judgeMode": "iterative",
      "mockFeedback": [
        {
          "id": "empty-draft",
          "round": 1,
          "matchCriteria": {
            "maxInsightsLength": 49
          },
          "feedback": "hey, looks like you haven't really attempted this yet. submit a real draft and i'll give you proper feedback. doesn't need to be perfect.",
          "fromPersonaId": "priya"
        },
        {
          "id": "no-international-angle",
          "round": 2,
          "matchCriteria": {
            "minInsightsLength": 50,
            "rejectKeywordsAny": ["international", "apac", "latam", "country", "region"]
          },
          "feedback": "good start, you've got the basic EDA shape down. but you're missing the angle daniela actually cares about, which is international growth. did we chat about that? go look at where the catalog is light by country and see what shows up. round 2 will be a lot stronger.",
          "fromPersonaId": "priya"
        },
        {
          "id": "no-recommendations",
          "round": 3,
          "matchCriteria": {
            "minInsightsLength": 50,
            "requireKeywordsAny": ["international", "apac", "latam", "country", "region"],
            "rejectKeywordsAny": ["recommend", "should", "propose", "we'd", "we would", "produce more"]
          },
          "feedback": "much better, you're aiming at the right question now. last gap: insights are observations, recommendations are actions. give me three things you'd actually do with this analysis. plain english, like you're saying it to daniela in a hallway.",
          "fromPersonaId": "priya"
        },
        {
          "id": "polished",
          "round": 4,
          "matchCriteria": {},
          "feedback": "this is solid work, you can submit when you're ready. one tiny note: lead with the recommendation, then back it with the data. execs read top down. but honestly, ship it.",
          "fromPersonaId": "priya"
        }
      ]
    },
    "durationMinutes": 60,
    "type": "individual",
    "availablePrimitives": ["ChatWithPersona", "ReadDocument", "QueryDataset", "BuildArtifact", "UploadDeliverable", "LLMJudge"],
    "requiredWorldKnowledge": [],
    "linkedPersonaIds": ["priya"],
    "rubric": {
      "hardCriteria": [
        {
          "id": "hc-1",
          "description": "Notebook loads netflix_titles.csv and prints basic metrics (row count, column types, missing-value counts).",
          "verificationMethod": "Inspect notebook cells for pd.read_csv, df.info(), df.isnull().sum() or equivalent."
        },
        {
          "id": "hc-2",
          "description": "At least one univariate visualisation (histogram, countplot, or distplot) is present in the notebook.",
          "verificationMethod": "Inspect notebook for matplotlib/seaborn plotting calls and rendered image output."
        },
        {
          "id": "hc-3",
          "description": "Insights text in Submit is at least 200 characters and addresses international markets.",
          "verificationMethod": "Check Submit.insightsDraft length and keyword presence (international, APAC, LATAM, country)."
        },
        {
          "id": "hc-4",
          "description": "Insights text contains at least 3 actionable recommendations (use of 'recommend' / 'should' / 'propose' or equivalent action verbs).",
          "verificationMethod": "Count recommendation-style sentences in Submit.insightsDraft."
        }
      ],
      "qualitativeCriteria": [
        {
          "id": "qc-1",
          "description": "Recommendations are written in plain English suitable for a non-technical VP.",
          "scoringGuide": {
            "one": "Heavy jargon, technical terms unexplained, dense paragraphs.",
            "three": "Mostly plain English, occasional technical lapse, recommendations decipherable.",
            "five": "Crisp, plain-English recommendations any exec could read and act on."
          }
        },
        {
          "id": "qc-2",
          "description": "Recommendations are backed by specific data from the analysis, not generic opinions.",
          "scoringGuide": {
            "one": "Recommendations feel like personal opinions with no data attached.",
            "three": "Some recommendations cite data, others are anecdotal.",
            "five": "Every recommendation cites a specific finding from the EDA."
          }
        }
      ],
      "passCondition": "All hard criteria met and qualitative criteria average >= 3.",
      "judgePromptTemplate": "(unused — Netflix uses the mock judge in deliverable.mockFeedback)"
    },
    "notes": "Iterative submit mode. Feedback states defined in deliverable.mockFeedback. The dataset is at /data/netflix_titles.csv (mounted by the Pyodide kernel)."
  }
]
```

- [ ] **Step 11.2: Validate the full Netflix package against the schema.**

```bash
npm run validate -- runtime/public/course-package-netflix.json
```

Expected:
```
OK — runtime/public/course-package-netflix.json
  client:    Netflix
  scope:     netflix.t1
  version:   1.0.0
  modules:   1
  tasks:     1
  personas:  1
  ...
```

If validation fails, read the errors and fix the JSON — most likely culprits: missing `min(8)` on glossary, missing `min(4)` on hardCriteria, missing `min(1)` on personas[0].privateKnowledge.

- [ ] **Step 11.3: Re-validate Helix to confirm no regression.**

```bash
npm run validate -- runtime/public/course-package.json
```

Expected: still OK with the existing summary numbers.

- [ ] **Step 11.4: Commit.**

```bash
git add runtime/public/course-package-netflix.json
git commit -m "data: complete Netflix CoursePackage with task + rubric + mock feedback

Final piece. Adds netflix.t1 task: full brief (Priya's voice), rubric
(4 hard criteria + 2 qualitative), deliverable in iterative mode
with 4 mock feedback states (empty / no-intl / no-recs / polished).
JSON now validates against the schema."
```

---

## Task 12: Notebook — branch Cell run on `notebook.runtime`

**Files:**
- Modify: `runtime/components/apps/notebook/Cell.tsx` (or wherever `runCell` action is wired)
- Modify: `runtime/components/apps/notebook/CodeCell.tsx`
- Modify: `runtime/components/apps/notebook/NotebookView.tsx`

The existing notebook calls a simulated `runCell` from the store (sets state to "running", then "done" after 600ms, shows authored outputs). For `runtime === "pyodide"` notebooks, we want a different path: call the Pyodide kernel, store live outputs.

- [ ] **Step 12.1: Read the existing notebook components.**

```bash
cat runtime/components/apps/notebook/NotebookView.tsx
cat runtime/components/apps/notebook/Cell.tsx
cat runtime/components/apps/notebook/CodeCell.tsx
```

Find:
- Where the active notebook is read from `coursePackage.fixtures.notebooks`.
- Where the Run button calls into the store's `runCell` action.
- Where outputs are rendered (which field is read).

- [ ] **Step 12.2: Add kernel-boot effect to `NotebookView.tsx`.**

At the top of `NotebookView`, after the active notebook is resolved:

```ts
const bootStatus = useCaseForgeStore((s) => s.pyodideBootStatus);
const bootError = useCaseForgeStore((s) => s.pyodideBootError);
const bootPyodide = useCaseForgeStore((s) => s.bootPyodide);

useEffect(() => {
  if (active?.runtime === "pyodide" && bootStatus === "idle") {
    void bootPyodide();
  }
}, [active?.runtime, bootStatus, bootPyodide]);
```

Add a banner in the toolbar area:

```tsx
{active?.runtime === "pyodide" && bootStatus === "booting" && (
  <div className="text-xs text-stone-500 px-2 py-1">Booting Python kernel… ~15s</div>
)}
{active?.runtime === "pyodide" && bootStatus === "error" && (
  <div className="text-xs text-red-600 px-2 py-1">
    Kernel boot failed: {bootError}
    <button onClick={() => void bootPyodide()} className="ml-2 underline">Retry</button>
  </div>
)}
{active?.runtime === "pyodide" && bootStatus === "ready" && (
  <div className="text-xs text-stone-500 px-2 py-1">Python 3 (Pyodide)</div>
)}
```

If the existing toolbar already has a kernel label, replace it with this conditional version.

- [ ] **Step 12.3: Update the run path in `CodeCell.tsx`.**

Find the Run button's onClick. It currently calls something like `runCell(slug, cellId)` from the store. Wrap with a runtime check:

```ts
const notebook = useCaseForgeStore((s) => /* the active notebook */);
const kernel = useCaseForgeStore((s) => s.pyodideKernel);
const setLive = useCaseForgeStore((s) => s.setCellLiveOutputs);
const runCell = useCaseForgeStore((s) => s.runCell);
const setCellRunState = useCaseForgeStore((s) => s.setCellRunState);  // or whatever action sets running/done

async function handleRun() {
  if (notebook?.runtime === "pyodide") {
    if (!kernel) return;     // boot still in progress; button should already be disabled
    setCellRunState(notebook.slug, cellId, "running");
    try {
      const outputs = await kernel.runCell(currentSource);
      setLive(cellId, outputs);
      setCellRunState(notebook.slug, cellId, "done");
    } catch (err) {
      setLive(cellId, [{ type: "error", content: (err as Error).message ?? String(err) }]);
      setCellRunState(notebook.slug, cellId, "done");
    }
  } else {
    // existing simulated path
    runCell(notebook!.slug, cellId);
  }
}
```

`currentSource` is the cell's current source (resolved per the existing cell-resolution rule from the notebook spec).

- [ ] **Step 12.4: Update `Cell.tsx` (or wherever outputs are rendered) to prefer live outputs over authored.**

The existing renderer reads `cell.outputs` (authored). Update to:

```ts
const liveOutputs = useCaseForgeStore((s) => s.cellLiveOutputs[cellId]);
const outputs = notebook?.runtime === "pyodide"
  ? (liveOutputs ?? [])
  : (cell.outputs ?? []);
```

Pass `outputs` to `CellOutput` instead of `cell.outputs` directly.

- [ ] **Step 12.5: Disable the Run button when kernel isn't ready.**

In `CodeCell.tsx`:

```tsx
<button
  onClick={handleRun}
  disabled={notebook?.runtime === "pyodide" && bootStatus !== "ready"}
  ...
>...</button>
```

- [ ] **Step 12.6: Smoke test on Helix (no Pyodide).**

```bash
cd runtime && npm run dev
# http://localhost:3000/
# Open Notebook → run the claims-data-explorer cells
```

Expected: authored outputs still appear, exactly as before. No Pyodide CDN script loads in the Network tab. Existing behaviour preserved.

- [ ] **Step 12.7: Smoke test on Netflix (with Pyodide).**

```bash
# http://localhost:3000/?case=netflix
# Open Notebook → wait for kernel to boot (~10-30s, watch the toolbar) → type:
#    import pandas as pd
#    df = pd.read_csv("/data/netflix_titles.csv")
#    df.head()
# Run that cell.
```

Expected: `df.head()` renders as an HTML table (Pyodide stringifies pandas DataFrames as text repr by default; that's fine — text repr is informative). Next cell: `df.info()` shows actual missing-value counts.

```python
# Plot test
import matplotlib.pyplot as plt
df['type'].value_counts().plot(kind='bar')
plt.show()
```

Expected: an inline PNG of a bar chart of Movie vs TV Show counts.

If `pd.read_csv` returns an error like `FileNotFoundError`, check the kernel-boot console for CSV mount errors; verify the file exists at `runtime/public/data/netflix_titles.csv`.

- [ ] **Step 12.8: Commit.**

```bash
git add runtime/components/apps/notebook/
git commit -m "notebook: branch run path on notebook.runtime

For runtime === 'pyodide', boot Pyodide on first open, route Run
through pyodideKernel.runCell, render live outputs. Simulated runtime
keeps existing authored-output behaviour for Helix's claims-data-explorer."
```

---

## Task 13: Submit app — components + dock registration

**Files:**
- Create: `runtime/components/apps/submit/SubmitApp.tsx`
- Create: `runtime/components/apps/submit/IterativeSubmit.tsx`
- Create: `runtime/components/apps/submit/FeedbackBubble.tsx`
- Modify: `runtime/lib/app-registry.ts`
- Modify: `runtime/app/page.tsx` (or wherever `APP_COMPONENTS` map lives — wires `submit` id to `SubmitApp`)

- [ ] **Step 13.1: Create `SubmitApp.tsx` (the dispatcher).**

```tsx
// runtime/components/apps/submit/SubmitApp.tsx
"use client";

import { useCaseForgeStore } from "@/lib/store";
import IterativeSubmit from "./IterativeSubmit";

export default function SubmitApp() {
  const pkg = useCaseForgeStore((s) => s.coursePackage);
  const currentTask = useCaseForgeStore((s) => s.currentTask);

  const task = currentTask ?? pkg?.modules[0]?.tasks[0];
  const judgeMode = task?.deliverable?.judgeMode ?? "single";

  if (judgeMode === "iterative") {
    return <IterativeSubmit task={task!} pkg={pkg!} />;
  }

  // judgeMode === "single" — Submit app for Helix-style cases.
  // Stub for now; Helix doesn't currently dock-register Submit so this is unreachable.
  return (
    <div className="flex h-full w-full items-center justify-center bg-stone-50 text-stone-500">
      <p className="text-sm">Single-shot Submit not implemented yet.</p>
    </div>
  );
}
```

- [ ] **Step 13.2: Create `FeedbackBubble.tsx`.**

```tsx
// runtime/components/apps/submit/FeedbackBubble.tsx
"use client";

import Markdown from "@/components/shared/Markdown";

interface Props {
  round: number;
  feedback: string;
  fromPersonaName: string;
  at: number;
}

export default function FeedbackBubble({ round, feedback, fromPersonaName, at }: Props) {
  const minutesAgo = Math.floor((Date.now() - at) / 60000);
  const timeLabel = minutesAgo < 1 ? "just now" : `${minutesAgo} min ago`;
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-xs text-stone-500">
        <span><strong className="text-stone-700">{fromPersonaName}</strong> · Round {round}</span>
        <span>{timeLabel}</span>
      </div>
      <div className="text-sm leading-relaxed text-stone-800">
        <Markdown>{feedback}</Markdown>
      </div>
    </div>
  );
}
```

If `@/components/shared/Markdown` doesn't exist or has a different name, use the project's existing markdown renderer (find it with `grep -rn "react-markdown" runtime/components/`).

- [ ] **Step 13.3: Create `IterativeSubmit.tsx`.**

```tsx
// runtime/components/apps/submit/IterativeSubmit.tsx
"use client";

import { useMemo, useState } from "react";
import { useCaseForgeStore } from "@/lib/store";
import { mockJudge } from "@/lib/mock-judge";
import FeedbackBubble from "./FeedbackBubble";
import type { Task, CoursePackage } from "@/lib/types";

interface Props {
  task: Task;
  pkg: CoursePackage;
}

export default function IterativeSubmit({ task, pkg }: Props) {
  const insightsDraft = useCaseForgeStore((s) => s.insightsDraft);
  const setInsightsDraft = useCaseForgeStore((s) => s.setInsightsDraft);
  const feedbackHistory = useCaseForgeStore((s) => s.feedbackHistory);
  const appendFeedback = useCaseForgeStore((s) => s.appendFeedback);
  const submissionFinalized = useCaseForgeStore((s) => s.submissionFinalized);
  const finalizeSubmission = useCaseForgeStore((s) => s.finalizeSubmission);
  const notebooks = useCaseForgeStore((s) => s.coursePackage?.fixtures?.notebooks ?? []);

  const [reviewing, setReviewing] = useState(false);
  const [confirmingFinal, setConfirmingFinal] = useState(false);

  const linkedNotebook = useMemo(
    () => notebooks.find((nb) => nb.linkedTasks.includes(task.id)) ?? null,
    [notebooks, task.id],
  );

  // Build the matcher input from current state
  function buildJudgeInput() {
    const cells = linkedNotebook?.cells ?? [];
    const sources = cells
      .filter((c) => c.type === "code")
      .map((c) => c.source.toLowerCase())
      .join("\n");
    return {
      insightsText: insightsDraft,
      notebookCellCount: cells.length,
      notebookSourceConcat: sources,
    };
  }

  async function handleGetFeedback() {
    if (submissionFinalized || reviewing) return;
    setReviewing(true);
    // Intentional pause so the demo registers what's happening
    await new Promise((r) => setTimeout(r, 1500));
    const state = mockJudge(buildJudgeInput(), task.deliverable.mockFeedback);
    if (state) {
      appendFeedback({
        round: feedbackHistory.length + 1,
        feedback: state.feedback,
        fromPersonaId: state.fromPersonaId,
      });
    }
    setReviewing(false);
  }

  const personaName = useMemo(() => {
    const id = task.deliverable.mockFeedback[0]?.fromPersonaId ?? "priya";
    return pkg.personas.find((p) => p.id === id)?.name ?? id;
  }, [pkg.personas, task.deliverable.mockFeedback]);

  if (submissionFinalized) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-stone-50">
        <div className="max-w-md rounded-lg border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800">Submission locked</h2>
          <p className="mt-2 text-sm text-stone-600">
            Your final submission has been recorded. Nice work — Priya will take it from here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-stone-50">
      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        {/* Insights editor */}
        <div className="flex flex-1 flex-col">
          <label className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Insights & Recommendations
          </label>
          <textarea
            value={insightsDraft}
            onChange={(e) => setInsightsDraft(e.target.value)}
            placeholder="Write your insights and recommendations here. Plain English. Three recommendations max."
            className="flex-1 rounded-md border border-stone-200 bg-white p-3 text-sm leading-relaxed text-stone-800 shadow-sm focus:border-stone-400 focus:outline-none"
          />
        </div>
        {/* Notebook preview */}
        <div className="flex w-72 flex-col">
          <label className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Notebook preview
          </label>
          <div className="flex-1 overflow-y-auto rounded-md border border-stone-200 bg-white p-3 text-xs text-stone-600 shadow-sm">
            {linkedNotebook ? (
              <>
                <div className="mb-2 font-semibold text-stone-700">{linkedNotebook.title}</div>
                {linkedNotebook.cells.map((c, i) => (
                  <div key={c.id} className="mb-2 border-l-2 border-stone-200 pl-2">
                    <span className="mr-1 text-stone-400">[{i + 1}]</span>
                    <code className="whitespace-pre-wrap break-all">{c.source.slice(0, 120)}{c.source.length > 120 ? "…" : ""}</code>
                  </div>
                ))}
              </>
            ) : (
              <span className="text-stone-400">No notebook linked.</span>
            )}
          </div>
        </div>
      </div>

      {/* Feedback history */}
      <div className="border-t border-stone-200 bg-stone-100 p-4">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-500">
          Feedback from {personaName}
        </label>
        <div className="max-h-48 space-y-3 overflow-y-auto">
          {feedbackHistory.length === 0 && !reviewing && (
            <p className="text-xs text-stone-400">
              No feedback yet. Submit a draft to get a review.
            </p>
          )}
          {feedbackHistory.map((entry) => {
            const persona = pkg.personas.find((p) => p.id === entry.fromPersonaId);
            return (
              <FeedbackBubble
                key={entry.id}
                round={entry.round}
                feedback={entry.feedback}
                fromPersonaName={persona?.name ?? entry.fromPersonaId}
                at={entry.at}
              />
            );
          })}
          {reviewing && (
            <div className="text-xs italic text-stone-500">{personaName} is reviewing your draft…</div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between border-t border-stone-200 bg-white px-4 py-3">
        <button
          onClick={handleGetFeedback}
          disabled={reviewing}
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stone-700 disabled:opacity-50"
        >
          {reviewing ? "Reviewing…" : `Get feedback from ${personaName}`}
        </button>
        <button
          onClick={() => setConfirmingFinal(true)}
          className="text-sm text-stone-600 underline-offset-2 hover:underline"
        >
          Final submit
        </button>
      </div>

      {/* Confirm final submit modal */}
      {confirmingFinal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-stone-800">Lock in your submission?</h3>
            <p className="mt-2 text-sm text-stone-600">
              Once you final-submit, your work is locked and you can't iterate further.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmingFinal(false)}
                className="rounded-md px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={() => { finalizeSubmission(); setConfirmingFinal(false); }}
                className="rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-700"
              >
                Submit & lock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 13.4: Register `submit` in `app-registry.ts`.**

Open `runtime/lib/app-registry.ts`. Add an entry:

```ts
{
  id: "submit",
  label: "Submit",
  icon: "\u{1F4E4}",
  iconImage: "/icons/briefing.png",   // reuse briefing icon for now; replace later if you want a unique asset
  description: "Submit your deliverable for review",
},
```

The registry is just a flat list of entries. The Desktop will pick which to show based on the dock builder logic.

- [ ] **Step 13.5: Gate Submit out of the dock for `judgeMode === "single"` cases.**

Find where the dock is built — likely in `runtime/components/desktop/Desktop.tsx` or in `Sidebar.tsx`, reading `APP_REGISTRY` and producing the launcher icons. Add a filter:

```ts
const pkg = useCaseForgeStore((s) => s.coursePackage);
const currentTask = useCaseForgeStore((s) => s.currentTask);
const judgeMode = currentTask?.deliverable?.judgeMode
  ?? pkg?.modules[0]?.tasks[0]?.deliverable?.judgeMode
  ?? "single";

const visibleApps = APP_REGISTRY.filter((app) => {
  if (app.id === "submit") return judgeMode === "iterative";
  return true;
});
```

Use `visibleApps` everywhere the current code uses `APP_REGISTRY` for dock-building. Leave other usages of `APP_REGISTRY` (like the type-only registry lookup) alone.

- [ ] **Step 13.6: Wire `submit` into the `APP_COMPONENTS` map.**

In `runtime/app/page.tsx` (or wherever the AppId-to-component map lives, search with `grep -rn "APP_COMPONENTS" runtime/`):

```ts
import SubmitApp from "@/components/apps/submit/SubmitApp";

const APP_COMPONENTS: Record<AppId, () => JSX.Element> = {
  // ...existing entries...
  submit: SubmitApp,
};
```

- [ ] **Step 13.7: Smoke test on Helix.**

```bash
cd runtime && npm run dev
# http://localhost:3000/
```

Expected: dock contains the existing apps **without** Submit. Helix dock = `briefing, wiki, chat, sheets, bigquery, terminal, notebook`. No Submit icon.

- [ ] **Step 13.8: Smoke test on Netflix.**

```bash
# http://localhost:3000/?case=netflix
```

Expected:
1. Submit icon is in the dock.
2. Click Submit → IterativeSubmit renders: empty textarea, notebook preview shows the starter cell, feedback history empty, two buttons.
3. Type 10 characters in the textarea, click "Get feedback from Priya" → after ~1.5s, a feedback bubble appears with the **empty-draft** message.
4. Type ~200 characters mentioning "genre" only (no "international"), submit → **no-international-angle** bubble.
5. Replace text to include "international growth" but no recommendation language → **no-recommendations** bubble.
6. Add "we recommend producing more APAC originals" → **polished** bubble.
7. Click Final submit → confirm modal → submit & lock → completion banner; both buttons gone.

- [ ] **Step 13.9: Commit.**

```bash
git add runtime/components/apps/submit/ runtime/lib/app-registry.ts runtime/app/page.tsx runtime/components/desktop/
git commit -m "submit: new Submit app with iterative judge loop

Three new components: SubmitApp (dispatcher), IterativeSubmit
(two-panel + history), FeedbackBubble. Gated into the dock only when
the active task's deliverable.judgeMode === 'iterative' so Helix is
unchanged."
```

---

## Task 14: End-to-end smoke test (full golden path)

**Files:** (no code changes)

This task is purely manual verification of the full Netflix demo flow plus Helix regression check.

- [ ] **Step 14.1: Helix regression test.**

```bash
cd runtime && npm run dev
# http://localhost:3000/
```

Verify:
1. IntroGate runs to completion as before.
2. Desktop loads with Helix-themed briefing, sidebar lists Helix apps minus Submit.
3. Briefing app shows the Helix RevOps brief.
4. Chat → pick Sam → Sam's existing openingLine appears as the first message.
5. Ask Sam "what's the weather like in SF?" — Expected: refusal per guardrails.
6. Notebook → the existing `claims-data-explorer` notebook renders with authored outputs when Run is clicked. No Pyodide boot, no CDN script in the Network tab.

If any of these regress, do not proceed — root-cause the issue.

- [ ] **Step 14.2: Netflix happy path test.**

```bash
# http://localhost:3000/?case=netflix
```

Verify:
1. IntroGate runs, Desktop loads.
2. Dock contains: briefing, wiki, chat, notebook, submit. (Sheets/BigQuery/Terminal may or may not appear depending on linkedTasks filtering — that's incidental.)
3. **Briefing** shows Priya's brief: VP ask, "DM me on Slack first", rubric, encouragement.
4. **Wiki** shows the three Netflix pages.
5. **Chat → Priya** thread already contains her openingLine. Ask "can you narrow this down?" — expect a scope reveal about international markets.
6. **Notebook** boots Pyodide (banner shows "Booting Python kernel…"), then becomes interactive. Type:
   ```python
   import pandas as pd
   df = pd.read_csv("/data/netflix_titles.csv")
   df.shape
   ```
   Expect: `(8807, 12)` (or similar).
7. Add a plot:
   ```python
   import matplotlib.pyplot as plt
   df['type'].value_counts().plot(kind='bar')
   plt.show()
   ```
   Expect: inline PNG of a bar chart.
8. **Submit** → write ~10 chars in insights → Get feedback → state 1 fires.
9. Bulk in a real first-draft (~250 chars, no international) → state 2 fires.
10. Add international content → state 3 fires.
11. Add recommendations → state 4 fires.
12. Final submit → confirm → completion banner shows. Notebook and Submit text become read-only.

- [ ] **Step 14.3: Document any deviations.**

If any step diverges from expected behaviour, capture the failure in an issue or a follow-up file note. Do not silently leave bugs.

- [ ] **Step 14.4: Final integration commit (if any tweaks were needed).**

```bash
git add -A
git status
git commit -m "smoke: integration tweaks after E2E walkthrough" --allow-empty
```

`--allow-empty` lets you note "smoke test passed cleanly" in git history even if nothing changed.

---

## Self-review checklist (run after writing this plan)

- ✅ Spec coverage: every section of `2026-05-25-netflix-sim-design.md` has at least one task.
- ✅ Placeholder scan: no TBD, TODO, "implement later." Code in every step.
- ✅ Type consistency: `Notebook.runtime`, `MockFeedbackState` (with min/max length + cells, require-any/all, reject-any), `cellLiveOutputs`, `Deliverable.judgeMode`, `mockFeedback` referenced identically across all tasks.
- ⚠️ Engineer-facing reminders: this codebase has no test runner. Verification is via `npm run validate`, `tsc --noEmit`, and manual smoke tests against `npm run dev`. The mock-judge module ships with an inline tsx self-test.

---

## Out-of-band notes

- **Pyodide first-load** can take 10–30s on slow networks. Demo machine should warm the cache once before showtime by opening the Netflix Notebook app in the browser ahead of the demo. The CDN runtime is then cached in IndexedDB.
- **CSV size:** the dataset is ~3MB. Served from `runtime/public/data/`; it adds to first-load weight for *any* visitor. Acceptable for now; if Helix demo viewers complain about slow page load, move the CSV under a Netflix-specific subdirectory and fetch only on Pyodide boot.
- **Submit icon:** task 13 reuses briefing's icon. Replace with a dedicated submit icon if visual polish becomes a demo priority.
