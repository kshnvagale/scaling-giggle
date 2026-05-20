# Notebook App — Design Spec

**Date:** 2026-05-20
**Status:** Approved (brainstorming → spec → plan)
**Author:** Kishan Vagale + Claude

## Goal

Add a fifth desktop app to the CaseForge learner runtime — a Jupyter / Google Colab-style notebook — so course authors can deliver hands-on "exploration" experiences (read a dataset, run an analysis, inspect a result) as part of a training simulation.

The notebook is a **simulated, author-curated** environment, not a real REPL. Cells and their outputs are authored content shipped inside the `CoursePackage` JSON. Learners can fully edit, add, delete, reorder, and "Run" cells, but execution is mocked.

## Design principles (inherited from CaseForge)

1. **Data-driven, never hardcoded.** All notebook content (cells, outputs, language) comes from `CoursePackage.fixtures.notebooks`. No domain content in components.
2. **Zero-prop, store-driven UI.** Components read from `useCaseForgeStore`. New state lives in the Zustand store.
3. **Schema-first.** Any new domain shape extends `schema/course_package.ts` before runtime code touches it.
4. **Honest semantics.** Where execution is simulated, the UI states it plainly rather than faking REPL behavior.

## Scope

### In scope (v1)

- New app id `notebook` registered alongside `briefing | wiki | chat | submit`.
- Schema additions: `NotebookCell`, `Notebook`, and `notebooks: Notebook[]` field added to `Fixtures` (with `.default([])` for backward compatibility).
- Notebook sidebar listing all notebooks filtered by the current task's `linkedTasks`.
- Notebook view with cell list, toolbar (Run All, Add Code, Add Markdown, kernel label).
- Two cell types: `code` and `markdown`.
- Cell-level toolbar: Run, Move Up, Move Down, Convert Type, Delete.
- "+" ghost buttons between cells to insert new cells (code or markdown).
- Simulated `Run` flow: idle → running (≈600ms) → done; output area reveals.
- Syntax highlighting via `react-simple-code-editor` + `prismjs` (Python + markdown only).
- Code rendered inside markdown cells highlighted via the same Prism setup, attached to the existing `runtime/components/shared/Markdown.tsx`.
- One sample notebook added to `runtime/public/course-package.json` so the app has live content on day one.

### Explicitly out of scope (v1, YAGNI)

- Real code execution (no Pyodide, no backend exec, no sandboxed JS).
- Saving / loading `.ipynb` files.
- Drag-and-drop cell reorder (arrow buttons only).
- Variable inspector or persistent scope between cells.
- Multiple kernels (label only — single `python3` value).
- localStorage persistence of learner edits across reloads — overlay state lives only in Zustand for the session (matches how chat histories behave today).
- Monaco or CodeMirror editor (kept out to protect bundle size).
- Cell-level autocomplete, linting, or formatting.

## Schema additions

Added to `schema/course_package.ts`:

```ts
export const NotebookOutput = z.object({
  type: z.enum(["stdout", "stderr", "result", "image", "table", "error"]),
  content: z.string(),               // text, base64 png, or CSV/JSON string for tables
  mimeType: z.string().optional(),
});

export const NotebookCell = z.object({
  id: NonEmpty,                      // stable id, used to key outputs and learner edits
  type: z.enum(["code", "markdown"]),
  source: NonEmpty,                  // code text or markdown body
  language: z.string().optional(),   // "python" default for code cells
  outputs: z.array(NotebookOutput).default([]),
  executionCount: z.number().int().optional(),  // displayed as [1], [2] in the gutter
});

export const Notebook = z.object({
  slug: NonEmpty,
  title: NonEmpty,
  description: z.string().optional(),
  kernel: z.string().default("python3"),
  cells: z.array(NotebookCell).min(1),
  linkedTasks: z.array(z.string()),
});
```

Added to `Fixtures`:

```ts
notebooks: z.array(Notebook).default([]),
```

Existing course packages without a `notebooks` field stay valid because of `.default([])`. The notebook app shows an empty state when the current task has no linked notebooks.

## Runtime types

`runtime/lib/types.ts`:

- Extend `AppId` to `"briefing" | "wiki" | "chat" | "submit" | "notebook"`.
- Re-export `Notebook`, `NotebookCell`, `NotebookOutput` from `@schema/course_package`.

## Store additions

`runtime/lib/store.ts`:

```ts
interface NotebookOverlay {
  cellOrder: string[];                             // current order of all cell ids
  userCells: Record<string, { type: "code"|"markdown"; source: string }>;  // learner-added cells
  cellSourceEdits: Record<string, string>;         // edits to authored cell source, by cell id
  cellRunStates: Record<string, "idle"|"running"|"done">;
}

// new state
activeNotebookSlug: string | null;
notebookState: Record<string, NotebookOverlay>;    // keyed by notebook slug

// new actions
setActiveNotebookSlug(slug: string | null): void;
initNotebookOverlay(slug: string, authoredCellIds: string[]): void; // idempotent
addCell(slug: string, afterCellId: string | null, type: "code"|"markdown"): void;
deleteCell(slug: string, cellId: string): void;
moveCell(slug: string, cellId: string, direction: "up"|"down"): void;
convertCellType(slug: string, cellId: string): void;
editCellSource(slug: string, cellId: string, source: string): void;
runCell(slug: string, cellId: string): void;       // sets "running" then "done" after delay
runAll(slug: string): void;
```

Notes:
- `runCell` sets `cellRunStates[cellId] = "running"`, then after ≈600ms sets it to `"done"`. The component reads run state to decide whether to render output.
- Cell ids for learner-added cells use `crypto.randomUUID()`.
- `resetSubmission()` and `loadCoursePackage()` clear `notebookState` and `activeNotebookSlug`.

## Cell resolution rule (the load-bearing detail)

When rendering, walk `notebookState[slug].cellOrder`. For each cell id resolve in this order:

1. **Type** — `userCells[id].type` if present, otherwise the authored cell's type.
2. **Source** — `cellSourceEdits[id]` if present → `userCells[id].source` if present → authored `cell.source` otherwise.
3. **Outputs** — only the authored cell's `outputs`, and only when the id is **not** present in `userCells` and is **not** present in `cellSourceEdits`.
4. **Run behavior** — when `runCell` is invoked, set state to `running`, wait ≈600ms, set to `done`. The output panel then renders per rule 3.
   - Authored cell, untouched → show authored outputs.
   - Learner-added cell, or authored cell that has been edited or converted → show a single `stdout`-styled output: `(no recorded output — this notebook is a simulated environment)`.

**Conversion semantics:** `convertCellType` on an authored cell promotes it into `userCells` by writing `{ type: newType, source: <current resolved source> }`. From that point forward the cell is overlay-owned and its authored outputs no longer apply. `convertCellType` on an already-overlay cell just flips the type in `userCells`.

**Run All semantics:** iterates `cellOrder` and calls `runCell` only on cells whose resolved type is `code`. Markdown cells are skipped.

This is the honest mental model: outputs belong to authored cells in their authored shape. Edit it, you lose its output. Add a new one, there's no output to show.

## Components

```
runtime/components/apps/notebook/
├── NotebookApp.tsx         # top-level: sidebar + active notebook host, handles empty state
├── NotebookSidebar.tsx     # list of notebooks filtered by currentTask.id ∈ linkedTasks
├── NotebookView.tsx        # toolbar (Run All, Add Code, Add Markdown, kernel label) + cell list
├── Cell.tsx                # per-cell toolbar (Run, ↑, ↓, convert, delete); dispatches by type
├── CodeCell.tsx            # react-simple-code-editor + run + execution count + CellOutput
├── MarkdownCell.tsx        # edit mode (textarea) ↔ rendered mode (Markdown); double-click to edit
├── CellOutput.tsx          # renders one of stdout / stderr / result / image / table / error
└── AddCellButton.tsx       # ghost "+" buttons rendered between cells
```

Boundaries:
- `NotebookApp` is the only component that reads `coursePackage.fixtures.notebooks` and `currentTask`. Everything below it receives a resolved notebook + overlay via the store.
- `Cell` switches on resolved type and renders `CodeCell` or `MarkdownCell`. Toolbar buttons call store actions only.
- `CellOutput` is purely presentational, switches on `output.type`.

## UI direction

- Light Colab-feel: white cell background, soft grey gutter, `[n]:` execution count on the left.
- "Run" is a small blue play button in the cell's left gutter; clicking sets the cell to "running", spinner replaces the play icon, then output reveals.
- Cell toolbar is hover-revealed (top-right of cell) to keep the surface clean — matches Colab.
- Run All sequences cells top-to-bottom with the same delay between them.
- AddCellButton is a thin horizontal "+" that appears on hover between cells.
- Kernel label in toolbar: `Python 3 (simulated)` — sets honest expectations.

## Sample data (course-package.json)

One notebook added to the existing M1.T1 package, slug `claims-data-explorer`, linked to the first task. ~5 cells:

1. Markdown header: "Explore the Virtusa claims dataset"
2. Code: `import pandas as pd; df = pd.read_csv("claims.csv"); df.head()` → authored table output
3. Markdown: short narrative
4. Code: a `groupby` example → authored stdout output
5. Code: a chart example → authored image output (small inline PNG)

The exact content is curriculum work, not spec work. The schema and renderer must support all three output types from day one.

## Dependencies added

`runtime/package.json` new deps:

- `react-simple-code-editor` (~3kb)
- `prismjs` (~10kb gzipped, only Python + markdown grammars imported)
- Types: `@types/prismjs` (devDep)

No other deps. Bundle impact target: under 40kb gzipped added to first load.

## Deployment & data flow

No changes required to:

- `vercel.json`
- `runtime/next.config.mjs`
- `runtime/app/api/*` routes
- The author pipeline (Managed Agents) — though authors should eventually generate notebooks. That's a follow-up; v1 ships with the sample baked into `course-package.json` by hand.

## Acceptance criteria

A task is "done" when:

1. `npm --prefix runtime run dev` boots, the Notebook app appears in the desktop taskbar, and clicking it shows the sample `claims-data-explorer` notebook.
2. The sidebar lists only notebooks whose `linkedTasks` include the current task id; tasks with no notebooks show an empty state ("No notebooks for this task yet.").
3. Clicking Run on an authored cell shows a brief running state then reveals the authored output. Clicking Run on a learner-added cell shows the "no recorded output" message.
4. Editing an authored cell's source then running it shows the "no recorded output" message (outputs detach on edit).
5. Cells can be added above / below any cell, deleted, moved up / down, and converted between code and markdown. The order persists across app switches within the session.
6. Code cells render with Python syntax highlighting. Markdown cells render with markdown via the existing `Markdown` component and have highlighted code blocks.
7. The schema validates: existing course packages without a `notebooks` field still pass `npm run validate`, and the updated `runtime/public/course-package.json` with the sample notebook passes too.
8. No TypeScript errors. No prop drilling — all component data comes from the store.
9. First-load bundle increase is under 40kb gzipped.

## Open questions (none blocking v1)

- Authoring flow: when the Managed Agents pipeline learns to produce notebooks, how does it pick outputs? (Probably runs the cells once in a sandbox and snapshots; deferred.)
- Should notebook state persist across reloads? (Not in v1. Revisit if learners complain about losing edits on accidental refresh.)
- Drag-and-drop reorder polish — defer until interactive cells are validated as useful.

## Risks

- **Prism + react-simple-code-editor combination** is well-trodden but Prism's CSS theme is global. Mitigation: scope Prism styles via a wrapper class to avoid leaking into Wiki / Briefing / Markdown chat blocks.
- **Performance with large notebooks** — `react-simple-code-editor` re-renders on each keystroke. Mitigation: keep the sample notebook small; if real notebooks exceed ~30 cells, virtualize. Out of scope for v1.
- **Output content size** — base64 images in `outputs[].content` inflate the CoursePackage JSON. Mitigation: keep sample images small (under 50kb each). Document the constraint for authors.
