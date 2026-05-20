# Notebook App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a fifth desktop app to the CaseForge learner runtime — a simulated Jupyter / Google Colab-style notebook driven by authored cells in the `CoursePackage`, with full learner-side interactivity (add, delete, reorder, edit, convert, run) and Prism syntax highlighting.

**Architecture:** Schema-first. `CoursePackage.fixtures.notebooks` carries authored notebooks and per-cell pre-recorded outputs. A Zustand overlay (`notebookState`) stores learner mutations (added cells, edits, type conversions, order, run state). The notebook UI is a sidebar (notebook picker) + cell list (composition of `Cell` → `CodeCell` | `MarkdownCell`). Run is simulated with a ≈600ms delay; only untouched authored cells reveal their authored output, everything else shows a "no recorded output" stub.

**Tech Stack:** Next.js 14 App Router · React 18 · Zustand · Tailwind · `react-simple-code-editor` · `prismjs` · `react-markdown` + `remark-gfm` (existing) · Zod (schema validation, dev-only).

**Source spec:** `docs/superpowers/specs/2026-05-20-notebook-app-design.md`

**No test framework exists in this repo.** Verification per task uses `npm run validate` (zod schema check), `npm --prefix runtime run build` (TypeScript + Next.js type-check), and `npm --prefix runtime run dev` browser smoke checks. Adding a test framework is out of scope.

---

## File Map

**Created:**
- `runtime/components/apps/notebook/NotebookApp.tsx`
- `runtime/components/apps/notebook/NotebookSidebar.tsx`
- `runtime/components/apps/notebook/NotebookView.tsx`
- `runtime/components/apps/notebook/Cell.tsx`
- `runtime/components/apps/notebook/CodeCell.tsx`
- `runtime/components/apps/notebook/MarkdownCell.tsx`
- `runtime/components/apps/notebook/CellOutput.tsx`
- `runtime/components/apps/notebook/AddCellButton.tsx`
- `runtime/lib/notebook-prism.ts`

**Modified:**
- `schema/course_package.ts` — add `NotebookOutput`, `NotebookCell`, `Notebook`; add `notebooks` to `Fixtures`
- `runtime/lib/types.ts` — extend `AppId`, re-export notebook types
- `runtime/lib/app-registry.ts` — add notebook entry
- `runtime/lib/store.ts` — add `notebookState`, `activeNotebookSlug`, all 7 actions; integrate into `loadCoursePackage` + `resetSubmission`
- `runtime/components/desktop/Desktop.tsx` — add `notebook` entry to `WINDOW_PRESETS`
- `runtime/app/page.tsx` — import + register `NotebookApp` in `APP_COMPONENTS`
- `runtime/app/globals.css` — scoped Prism theme styles
- `runtime/package.json` — add `react-simple-code-editor`, `prismjs`, `@types/prismjs`
- `runtime/public/course-package.json` — append one sample notebook

---

## Task 1: Extend the schema with Notebook types

**Files:**
- Modify: `schema/course_package.ts`

- [ ] **Step 1: Add `NotebookOutput`, `NotebookCell`, `Notebook` zod definitions**

Insert immediately after the `Email` definition and before the `Fixtures` definition in `schema/course_package.ts`:

```ts
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
  cells: z.array(NotebookCell).min(1),
  linkedTasks: z.array(z.string()),
});
```

- [ ] **Step 2: Add `notebooks` to the `Fixtures` object**

Modify the `Fixtures` definition (currently has `wikiPages`, `datasets`, `documents`, `emails`). Add the line:

```ts
export const Fixtures = z.object({
  wikiPages: z.array(WikiPage),
  datasets: z.array(Dataset),
  documents: z.array(InWorldDocument),
  emails: z.array(Email),
  notebooks: z.array(Notebook).default([]),
});
```

- [ ] **Step 3: Validate existing course-package.json stays valid (backward compat)**

Run from repo root:
```
npm run validate -- runtime/public/course-package.json
```
Expected: `OK — runtime/public/course-package.json`. The `.default([])` on `notebooks` means the existing JSON (which has no `notebooks` field) still passes.

- [ ] **Step 4: Commit**

```
git add schema/course_package.ts
git commit -m "schema: add Notebook, NotebookCell, NotebookOutput types"
```

---

## Task 2: Install runtime dependencies

**Files:**
- Modify: `runtime/package.json` (via npm)

- [ ] **Step 1: Install deps in `runtime/`**

```
cd runtime && npm install react-simple-code-editor prismjs && npm install -D @types/prismjs
```

- [ ] **Step 2: Verify versions land in `runtime/package.json`**

`react-simple-code-editor` and `prismjs` should appear under `dependencies`; `@types/prismjs` under `devDependencies`. No version pinning beyond what npm picks — these libraries are stable.

- [ ] **Step 3: Build check**

```
cd runtime && npm run build
```
Expected: build succeeds (we haven't used the new deps yet, so this is just a regression check). If it fails for unrelated reasons, stop and investigate before continuing.

- [ ] **Step 4: Commit**

```
git add runtime/package.json runtime/package-lock.json
git commit -m "runtime: add react-simple-code-editor + prismjs"
```

---

## Task 3: Extend AppId and register the app shell (empty)

This task wires the notebook app into the desktop with a placeholder body, so the app appears in the taskbar and clicking it shows a stub. Everything below this task fleshes out the body.

**Files:**
- Modify: `runtime/lib/types.ts`
- Modify: `runtime/lib/app-registry.ts`
- Modify: `runtime/components/desktop/Desktop.tsx` (`WINDOW_PRESETS`)
- Modify: `runtime/app/page.tsx` (`APP_COMPONENTS`)
- Create: `runtime/components/apps/notebook/NotebookApp.tsx` (placeholder)

- [ ] **Step 1: Extend `AppId` and re-export notebook types**

In `runtime/lib/types.ts`, change the `AppId` union to:

```ts
export type AppId = "briefing" | "wiki" | "chat" | "submit" | "notebook";
```

And in the re-exports block at the top of the file, add `Notebook`, `NotebookCell`, `NotebookOutput`:

```ts
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
  Notebook,
  NotebookCell,
  NotebookOutput,
} from "@schema/course_package";
```

- [ ] **Step 2: Add notebook to the app registry**

In `runtime/lib/app-registry.ts`, append to the `APP_REGISTRY` array:

```ts
{
  id: "notebook",
  label: "Notebook",
  icon: "\u{1F4D3}", // 📓
  description: "Interactive notebooks with code and analysis",
},
```

- [ ] **Step 3: Add a `WINDOW_PRESETS` entry**

In `runtime/components/desktop/Desktop.tsx`, find the `WINDOW_PRESETS: Record<AppId, WindowPreset>` constant (around line 103) and add inside the object literal:

```ts
notebook: {
  width: 1100,
  height: 720,
  minWidth: 820,
  minHeight: 540,
  xBias: 0.22,
  yBias: 0.06,
  open: false,
},
```

- [ ] **Step 4: Create placeholder `NotebookApp.tsx`**

Write `runtime/components/apps/notebook/NotebookApp.tsx`:

```tsx
"use client";

export default function NotebookApp() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-stone-50 text-stone-500">
      <p className="text-sm">Notebook app — under construction</p>
    </div>
  );
}
```

- [ ] **Step 5: Register the component in `page.tsx`**

In `runtime/app/page.tsx`, add the import and the registry entry:

```tsx
import NotebookApp from "@/components/apps/notebook/NotebookApp";

// ...

const APP_COMPONENTS: Record<AppId, React.ComponentType> = {
  briefing: BriefingApp,
  wiki: WikiApp,
  chat: ChatApp,
  submit: SubmitApp,
  notebook: NotebookApp,
};
```

- [ ] **Step 6: Build check**

```
cd runtime && npm run build
```
Expected: build succeeds. TypeScript should be happy because every `Record<AppId, ...>` consumer now has a `notebook` key.

- [ ] **Step 7: Browser smoke check**

```
cd runtime && npm run dev
```
Open http://localhost:3000. The Notebook icon should appear in the taskbar / app list. Clicking it should open a window showing "Notebook app — under construction". Kill the dev server.

- [ ] **Step 8: Commit**

```
git add runtime/lib/types.ts runtime/lib/app-registry.ts runtime/components/desktop/Desktop.tsx runtime/app/page.tsx runtime/components/apps/notebook/NotebookApp.tsx
git commit -m "runtime: register notebook app shell"
```

---

## Task 4: Extend Zustand store with notebook state and actions

**Files:**
- Modify: `runtime/lib/store.ts`

- [ ] **Step 1: Add notebook types and state to `CaseForgeState`**

In `runtime/lib/store.ts`, just below the existing `eslint-disable` `TaskData` line, add:

```ts
export type CellRunState = "idle" | "running" | "done";

export interface NotebookOverlay {
  cellOrder: string[];
  userCells: Record<string, { type: "code" | "markdown"; source: string }>;
  cellSourceEdits: Record<string, string>;
  cellRunStates: Record<string, CellRunState>;
}
```

Then in the `CaseForgeState` interface (after the Submit / Timer sections, before `loadCoursePackage`), insert:

```ts
// Notebook
activeNotebookSlug: string | null;
setActiveNotebookSlug: (slug: string | null) => void;
notebookState: Record<string, NotebookOverlay>;
initNotebookOverlay: (slug: string, authoredCellIds: string[]) => void;
addCell: (slug: string, afterCellId: string | null, type: "code" | "markdown") => void;
deleteCell: (slug: string, cellId: string) => void;
moveCell: (slug: string, cellId: string, direction: "up" | "down") => void;
convertCellType: (slug: string, cellId: string) => void;
editCellSource: (slug: string, cellId: string, source: string) => void;
runCell: (slug: string, cellId: string) => void;
runAll: (slug: string, codeCellIds: string[]) => void;
```

Note: `runAll` receives the list of code-cell ids from the caller (`NotebookView`) which has the resolved-type info. Keeping that out of the store keeps the store free of resolution logic.

- [ ] **Step 2: Initialize the new state**

Add to the initial state block (alongside `timer: null`):

```ts
activeNotebookSlug: null,
notebookState: {},
```

- [ ] **Step 3: Implement `setActiveNotebookSlug` and `initNotebookOverlay`**

Inside the `create<CaseForgeState>()((set) => ({ ... }))` body, add:

```ts
setActiveNotebookSlug: (slug) => set({ activeNotebookSlug: slug }),

initNotebookOverlay: (slug, authoredCellIds) =>
  set((state) => {
    if (state.notebookState[slug]) return {};
    return {
      notebookState: {
        ...state.notebookState,
        [slug]: {
          cellOrder: [...authoredCellIds],
          userCells: {},
          cellSourceEdits: {},
          cellRunStates: {},
        },
      },
    };
  }),
```

- [ ] **Step 4: Implement `addCell`, `deleteCell`, `moveCell`**

```ts
addCell: (slug, afterCellId, type) =>
  set((state) => {
    const overlay = state.notebookState[slug];
    if (!overlay) return {};
    const newId = crypto.randomUUID();
    const idx = afterCellId
      ? overlay.cellOrder.indexOf(afterCellId)
      : overlay.cellOrder.length - 1;
    const nextOrder = [...overlay.cellOrder];
    nextOrder.splice(idx + 1, 0, newId);
    return {
      notebookState: {
        ...state.notebookState,
        [slug]: {
          ...overlay,
          cellOrder: nextOrder,
          userCells: {
            ...overlay.userCells,
            [newId]: { type, source: type === "code" ? "" : "_Write markdown here…_" },
          },
        },
      },
    };
  }),

deleteCell: (slug, cellId) =>
  set((state) => {
    const overlay = state.notebookState[slug];
    if (!overlay) return {};
    const nextOrder = overlay.cellOrder.filter((id) => id !== cellId);
    const { [cellId]: _u, ...nextUserCells } = overlay.userCells;
    const { [cellId]: _e, ...nextEdits } = overlay.cellSourceEdits;
    const { [cellId]: _r, ...nextRuns } = overlay.cellRunStates;
    return {
      notebookState: {
        ...state.notebookState,
        [slug]: {
          cellOrder: nextOrder,
          userCells: nextUserCells,
          cellSourceEdits: nextEdits,
          cellRunStates: nextRuns,
        },
      },
    };
  }),

moveCell: (slug, cellId, direction) =>
  set((state) => {
    const overlay = state.notebookState[slug];
    if (!overlay) return {};
    const idx = overlay.cellOrder.indexOf(cellId);
    if (idx === -1) return {};
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= overlay.cellOrder.length) return {};
    const nextOrder = [...overlay.cellOrder];
    [nextOrder[idx], nextOrder[swapIdx]] = [nextOrder[swapIdx], nextOrder[idx]];
    return {
      notebookState: {
        ...state.notebookState,
        [slug]: { ...overlay, cellOrder: nextOrder },
      },
    };
  }),
```

- [ ] **Step 5: Implement `convertCellType` and `editCellSource`**

```ts
convertCellType: (slug, cellId) =>
  set((state) => {
    const overlay = state.notebookState[slug];
    if (!overlay) return {};
    const existing = overlay.userCells[cellId];
    if (existing) {
      // Already overlay-owned — flip type
      return {
        notebookState: {
          ...state.notebookState,
          [slug]: {
            ...overlay,
            userCells: {
              ...overlay.userCells,
              [cellId]: {
                ...existing,
                type: existing.type === "code" ? "markdown" : "code",
              },
            },
          },
        },
      };
    }
    // Authored cell — promote into userCells with current resolved source
    // We don't have authored info in the store, so callers must pass current source
    // via editCellSource first. To keep this action self-contained, we look it up
    // through the source-edit (if any) and otherwise default to empty — callers
    // should provide an edit first or use the helper in NotebookView.
    // Simpler approach: callers pass the resolved current source into convertCellType.
    // To avoid breaking the action contract, treat this as a no-op for authored
    // cells without an edit; NotebookView will pre-write the edit before calling.
    const currentSource = overlay.cellSourceEdits[cellId];
    if (currentSource === undefined) return {};
    return {
      notebookState: {
        ...state.notebookState,
        [slug]: {
          ...overlay,
          userCells: {
            ...overlay.userCells,
            [cellId]: { type: "code", source: currentSource },
            // type defaults to "code"; NotebookView toggles it via a second call
            // — but to be ergonomic, see below: we'll change the signature.
          },
        },
      },
    };
  }),
```

**Stop — that signature is awkward.** Refactor: pass the *target* type and *current source* into `convertCellType` so the action is self-contained. Update the interface from Step 1 and the implementation:

Update interface (replace the earlier line):
```ts
convertCellType: (
  slug: string,
  cellId: string,
  nextType: "code" | "markdown",
  currentSource: string,
) => void;
```

Implementation:
```ts
convertCellType: (slug, cellId, nextType, currentSource) =>
  set((state) => {
    const overlay = state.notebookState[slug];
    if (!overlay) return {};
    return {
      notebookState: {
        ...state.notebookState,
        [slug]: {
          ...overlay,
          userCells: {
            ...overlay.userCells,
            [cellId]: { type: nextType, source: currentSource },
          },
          // Clear any pending edit since the cell is now overlay-owned
          cellSourceEdits: (() => {
            const { [cellId]: _drop, ...rest } = overlay.cellSourceEdits;
            return rest;
          })(),
        },
      },
    };
  }),
```

`editCellSource`:
```ts
editCellSource: (slug, cellId, source) =>
  set((state) => {
    const overlay = state.notebookState[slug];
    if (!overlay) return {};
    // If it's a user cell, mutate userCells; otherwise write to cellSourceEdits.
    if (overlay.userCells[cellId]) {
      return {
        notebookState: {
          ...state.notebookState,
          [slug]: {
            ...overlay,
            userCells: {
              ...overlay.userCells,
              [cellId]: { ...overlay.userCells[cellId], source },
            },
          },
        },
      };
    }
    return {
      notebookState: {
        ...state.notebookState,
        [slug]: {
          ...overlay,
          cellSourceEdits: { ...overlay.cellSourceEdits, [cellId]: source },
        },
      },
    };
  }),
```

- [ ] **Step 6: Implement `runCell` and `runAll`**

```ts
runCell: (slug, cellId) => {
  set((state) => {
    const overlay = state.notebookState[slug];
    if (!overlay) return {};
    return {
      notebookState: {
        ...state.notebookState,
        [slug]: {
          ...overlay,
          cellRunStates: { ...overlay.cellRunStates, [cellId]: "running" },
        },
      },
    };
  });
  setTimeout(() => {
    set((state) => {
      const overlay = state.notebookState[slug];
      if (!overlay) return {};
      return {
        notebookState: {
          ...state.notebookState,
          [slug]: {
            ...overlay,
            cellRunStates: { ...overlay.cellRunStates, [cellId]: "done" },
          },
        },
      };
    });
  }, 600);
},

runAll: (slug, codeCellIds) => {
  codeCellIds.forEach((cellId, i) => {
    setTimeout(() => {
      // call into the same store
      useCaseForgeStore.getState().runCell(slug, cellId);
    }, i * 700);
  });
},
```

Note: `runAll` references `useCaseForgeStore.getState()`. That's available inside the same module (the `useCaseForgeStore` const is created right above), so this works.

- [ ] **Step 7: Reset notebook state in `loadCoursePackage` and `resetSubmission`**

In the existing `loadCoursePackage` action, add `notebookState: {}` and `activeNotebookSlug: null` to the `set({...})` call:

```ts
loadCoursePackage: (pkg, taskId) => {
  const task = taskId
    ? pkg.modules.flatMap((m: any) => m.tasks).find((t: any) => t.id === taskId)
    : pkg.modules[0]?.tasks[0];
  set({
    coursePackage: pkg,
    currentTask: task ?? null,
    activeApp: "briefing",
    activeWikiSlug: null,
    activePersonaId: null,
    chatHistories: {},
    uploadedFile: null,
    judgeResult: null,
    isJudging: false,
    attemptCount: 0,
    activeNotebookSlug: null,
    notebookState: {},
  });
},
```

`resetSubmission` does **not** need to clear notebook state — it only clears submission UI. Leave it as-is.

- [ ] **Step 8: Build check**

```
cd runtime && npm run build
```
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 9: Commit**

```
git add runtime/lib/store.ts
git commit -m "store: add notebook overlay state and actions"
```

---

## Task 5: Prism setup + scoped CSS theme

**Files:**
- Create: `runtime/lib/notebook-prism.ts`
- Modify: `runtime/app/globals.css`

- [ ] **Step 1: Create `runtime/lib/notebook-prism.ts`**

This module configures Prism with only the languages we need and exports a `highlight(code, language)` helper. Keeping Prism imports here avoids polluting other modules.

```ts
"use client";

import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-markdown";

export function highlight(code: string, language: "python" | "markdown"): string {
  const grammar = Prism.languages[language];
  if (!grammar) return code;
  return Prism.highlight(code, grammar, language);
}
```

- [ ] **Step 2: Append a scoped Prism theme to `globals.css`**

Append to the end of `runtime/app/globals.css`:

```css
/* Notebook Prism theme — scoped under .notebook-prism so it doesn't leak. */
.notebook-prism {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  line-height: 1.55;
  color: #1f2937;
}
.notebook-prism .token.comment,
.notebook-prism .token.prolog,
.notebook-prism .token.doctype,
.notebook-prism .token.cdata { color: #6b7280; font-style: italic; }
.notebook-prism .token.punctuation { color: #374151; }
.notebook-prism .token.property,
.notebook-prism .token.tag,
.notebook-prism .token.constant,
.notebook-prism .token.symbol,
.notebook-prism .token.deleted { color: #9333ea; }
.notebook-prism .token.boolean,
.notebook-prism .token.number { color: #b45309; }
.notebook-prism .token.selector,
.notebook-prism .token.attr-name,
.notebook-prism .token.string,
.notebook-prism .token.char,
.notebook-prism .token.builtin,
.notebook-prism .token.inserted { color: #15803d; }
.notebook-prism .token.operator,
.notebook-prism .token.entity,
.notebook-prism .token.url,
.notebook-prism .token.variable { color: #0f766e; }
.notebook-prism .token.atrule,
.notebook-prism .token.attr-value,
.notebook-prism .token.function,
.notebook-prism .token.class-name { color: #2563eb; }
.notebook-prism .token.keyword { color: #c026d3; font-weight: 500; }
.notebook-prism .token.regex,
.notebook-prism .token.important { color: #dc2626; }
```

- [ ] **Step 3: Build check**

```
cd runtime && npm run build
```
Expected: succeeds.

- [ ] **Step 4: Commit**

```
git add runtime/lib/notebook-prism.ts runtime/app/globals.css
git commit -m "runtime: scoped Prism theme + helper for notebook"
```

---

## Task 6: CellOutput component

**Files:**
- Create: `runtime/components/apps/notebook/CellOutput.tsx`

- [ ] **Step 1: Write `CellOutput.tsx`**

```tsx
"use client";

import type { NotebookOutput } from "@/lib/types";

interface CellOutputProps {
  output: NotebookOutput;
}

export default function CellOutput({ output }: CellOutputProps) {
  switch (output.type) {
    case "stdout":
      return (
        <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-stone-700">
          {output.content}
        </pre>
      );
    case "stderr":
      return (
        <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-rose-700 bg-rose-50 rounded px-2 py-1">
          {output.content}
        </pre>
      );
    case "result":
      return (
        <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-stone-900">
          {output.content}
        </pre>
      );
    case "error":
      return (
        <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-rose-800 bg-rose-50 border border-rose-200 rounded px-2 py-1">
          {output.content}
        </pre>
      );
    case "image": {
      const src = output.content.startsWith("data:")
        ? output.content
        : `data:${output.mimeType ?? "image/png"};base64,${output.content}`;
      return (
        <img
          src={src}
          alt="cell output"
          className="max-w-full rounded border border-stone-200"
        />
      );
    }
    case "table": {
      // Expect CSV (comma-separated) in content for v1
      const rows = output.content.trim().split("\n").map((r) => r.split(","));
      const [header, ...body] = rows;
      return (
        <div className="overflow-x-auto">
          <table className="text-[12.5px] border border-stone-200">
            <thead className="bg-stone-100">
              <tr>
                {header.map((h, i) => (
                  <th key={i} className="px-2 py-1 text-left font-medium text-stone-700 border-b border-stone-200">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri} className="border-b border-stone-100">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1 text-stone-800 font-mono">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    default:
      return null;
  }
}
```

- [ ] **Step 2: Build check**

```
cd runtime && npm run build
```
Expected: succeeds (component is unused so far, but TypeScript-checked).

- [ ] **Step 3: Commit**

```
git add runtime/components/apps/notebook/CellOutput.tsx
git commit -m "notebook: CellOutput renderer"
```

---

## Task 7: MarkdownCell component

**Files:**
- Create: `runtime/components/apps/notebook/MarkdownCell.tsx`

- [ ] **Step 1: Write `MarkdownCell.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Markdown } from "@/components/shared/Markdown";
import { useCaseForgeStore } from "@/lib/store";

interface MarkdownCellProps {
  slug: string;
  cellId: string;
  source: string;
}

export default function MarkdownCell({ slug, cellId, source }: MarkdownCellProps) {
  const editCellSource = useCaseForgeStore((s) => s.editCellSource);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <textarea
        autoFocus
        value={source}
        onChange={(e) => editCellSource(slug, cellId, e.target.value)}
        onBlur={() => setEditing(false)}
        className="w-full min-h-[120px] resize-y rounded border border-stone-200 bg-white px-3 py-2 font-mono text-[13px] leading-relaxed text-stone-800 focus:border-stone-400 focus:outline-none"
        placeholder="Markdown content…"
      />
    );
  }

  return (
    <div
      onDoubleClick={() => setEditing(true)}
      className="cursor-text px-3 py-2 prose prose-stone prose-sm max-w-none"
      title="Double-click to edit"
    >
      <Markdown>{source}</Markdown>
    </div>
  );
}
```

- [ ] **Step 2: Verify `Markdown` named export**

The shared Markdown component is at `runtime/components/shared/Markdown.tsx`. If its default export is used instead of a named one, change the import accordingly. Quick check:

```
cd /Users/kshnvagale/Documents/Ai/Scaler/CaseForge/game && grep -n "export" runtime/components/shared/Markdown.tsx
```

If it's `export default function Markdown(...)`, change the import to:
```ts
import Markdown from "@/components/shared/Markdown";
```

- [ ] **Step 3: Build check**

```
cd runtime && npm run build
```
Expected: succeeds.

- [ ] **Step 4: Commit**

```
git add runtime/components/apps/notebook/MarkdownCell.tsx
git commit -m "notebook: MarkdownCell with edit/render toggle"
```

---

## Task 8: CodeCell component

**Files:**
- Create: `runtime/components/apps/notebook/CodeCell.tsx`

- [ ] **Step 1: Write `CodeCell.tsx`**

```tsx
"use client";

import Editor from "react-simple-code-editor";
import { useCaseForgeStore } from "@/lib/store";
import { highlight } from "@/lib/notebook-prism";
import CellOutput from "./CellOutput";
import type { NotebookOutput } from "@/lib/types";

interface CodeCellProps {
  slug: string;
  cellId: string;
  source: string;
  executionCount?: number;
  outputs: NotebookOutput[];
  isOverlay: boolean; // true if learner-added or edited (authored outputs detach)
}

export default function CodeCell({
  slug,
  cellId,
  source,
  executionCount,
  outputs,
  isOverlay,
}: CodeCellProps) {
  const editCellSource = useCaseForgeStore((s) => s.editCellSource);
  const runCell = useCaseForgeStore((s) => s.runCell);
  const runState = useCaseForgeStore(
    (s) => s.notebookState[slug]?.cellRunStates[cellId] ?? "idle",
  );

  const showOutput = runState === "done";
  const resolvedOutputs: NotebookOutput[] =
    isOverlay || outputs.length === 0
      ? [
          {
            type: "stdout",
            content:
              "(no recorded output — this notebook is a simulated environment)",
          },
        ]
      : outputs;

  return (
    <div className="flex gap-2">
      {/* Gutter: execution count + run button */}
      <div className="flex w-12 flex-col items-end pr-1 pt-1 text-[11px] text-stone-400">
        <button
          onClick={() => runCell(slug, cellId)}
          disabled={runState === "running"}
          className="mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50"
          title="Run cell"
          aria-label="Run cell"
        >
          {runState === "running" ? (
            <span className="block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <path d="M2 1 L9 5 L2 9 Z" fill="currentColor" />
            </svg>
          )}
        </button>
        <span className="font-mono">
          [{showOutput && executionCount !== undefined ? executionCount : runState === "done" ? "*" : " "}]
        </span>
      </div>

      {/* Editor + output */}
      <div className="flex-1 min-w-0">
        <div className="notebook-prism rounded border border-stone-200 bg-white">
          <Editor
            value={source}
            onValueChange={(v) => editCellSource(slug, cellId, v)}
            highlight={(code) => highlight(code, "python")}
            padding={10}
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          />
        </div>
        {showOutput && (
          <div className="mt-2 space-y-2 px-1">
            {resolvedOutputs.map((out, i) => (
              <CellOutput key={i} output={out} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```
cd runtime && npm run build
```
Expected: succeeds. If `react-simple-code-editor` has no bundled types, the build still passes because the package ships TypeScript types; if not, add a one-line `declare module "react-simple-code-editor";` to a `.d.ts` file in `runtime/`. Verify by running the build first.

- [ ] **Step 3: Commit**

```
git add runtime/components/apps/notebook/CodeCell.tsx
git commit -m "notebook: CodeCell with editor and simulated run"
```

---

## Task 9: AddCellButton component

**Files:**
- Create: `runtime/components/apps/notebook/AddCellButton.tsx`

- [ ] **Step 1: Write `AddCellButton.tsx`**

```tsx
"use client";

import { useCaseForgeStore } from "@/lib/store";

interface AddCellButtonProps {
  slug: string;
  afterCellId: string | null; // null = insert at top
}

export default function AddCellButton({ slug, afterCellId }: AddCellButtonProps) {
  const addCell = useCaseForgeStore((s) => s.addCell);

  return (
    <div className="group flex h-6 items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
      <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-2 py-1 shadow-sm">
        <button
          onClick={() => addCell(slug, afterCellId, "code")}
          className="text-[11px] font-medium text-stone-600 hover:text-blue-600"
        >
          + Code
        </button>
        <span className="text-stone-300">·</span>
        <button
          onClick={() => addCell(slug, afterCellId, "markdown")}
          className="text-[11px] font-medium text-stone-600 hover:text-blue-600"
        >
          + Markdown
        </button>
      </div>
    </div>
  );
}
```

Note: `addCell` was specified in the store as inserting *after* `afterCellId`, with `null` meaning "at the end". For "insert at top" we change semantics — see Step 2.

- [ ] **Step 2: Adjust `addCell` semantics to support insert-at-top**

Reopen `runtime/lib/store.ts` and replace the `addCell` implementation with the version below. The change: when `afterCellId` is the string `"__top__"`, insert at index 0; when `null`, append to end.

```ts
addCell: (slug, afterCellId, type) =>
  set((state) => {
    const overlay = state.notebookState[slug];
    if (!overlay) return {};
    const newId = crypto.randomUUID();
    let insertAt: number;
    if (afterCellId === null) {
      insertAt = overlay.cellOrder.length;
    } else if (afterCellId === "__top__") {
      insertAt = 0;
    } else {
      const idx = overlay.cellOrder.indexOf(afterCellId);
      insertAt = idx === -1 ? overlay.cellOrder.length : idx + 1;
    }
    const nextOrder = [...overlay.cellOrder];
    nextOrder.splice(insertAt, 0, newId);
    return {
      notebookState: {
        ...state.notebookState,
        [slug]: {
          ...overlay,
          cellOrder: nextOrder,
          userCells: {
            ...overlay.userCells,
            [newId]: { type, source: type === "code" ? "" : "_Write markdown here…_" },
          },
        },
      },
    };
  }),
```

And update the `AddCellButton` prop type to accept `"__top__"` too. But to keep the component API clean, leave `afterCellId: string | null` and let `NotebookView` pass `"__top__"` as a string when needed. Update the prop type in `AddCellButton.tsx`:

```ts
interface AddCellButtonProps {
  slug: string;
  afterCellId: string | null; // null = append at end, "__top__" = insert at top, else after that id
}
```

- [ ] **Step 3: Build check**

```
cd runtime && npm run build
```

- [ ] **Step 4: Commit**

```
git add runtime/components/apps/notebook/AddCellButton.tsx runtime/lib/store.ts
git commit -m "notebook: AddCellButton + addCell top/end semantics"
```

---

## Task 10: Cell component (per-cell toolbar + dispatch)

**Files:**
- Create: `runtime/components/apps/notebook/Cell.tsx`

- [ ] **Step 1: Write `Cell.tsx`**

```tsx
"use client";

import { useCaseForgeStore } from "@/lib/store";
import type { NotebookOutput } from "@/lib/types";
import CodeCell from "./CodeCell";
import MarkdownCell from "./MarkdownCell";

export interface ResolvedCell {
  id: string;
  type: "code" | "markdown";
  source: string;
  isOverlay: boolean;            // learner-added or edited (authored outputs detach)
  authoredOutputs: NotebookOutput[];
  executionCount?: number;
}

interface CellProps {
  slug: string;
  cell: ResolvedCell;
  isFirst: boolean;
  isLast: boolean;
}

export default function Cell({ slug, cell, isFirst, isLast }: CellProps) {
  const moveCell = useCaseForgeStore((s) => s.moveCell);
  const deleteCell = useCaseForgeStore((s) => s.deleteCell);
  const convertCellType = useCaseForgeStore((s) => s.convertCellType);

  return (
    <div className="group relative rounded-md border border-transparent hover:border-stone-200 hover:bg-stone-50/50 transition-colors px-1 py-1">
      {/* Hover toolbar */}
      <div className="absolute right-2 top-1 z-10 hidden gap-1 group-hover:flex">
        <button
          onClick={() => moveCell(slug, cell.id, "up")}
          disabled={isFirst}
          className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[11px] text-stone-600 hover:text-blue-600 disabled:opacity-40"
          title="Move up"
        >
          ↑
        </button>
        <button
          onClick={() => moveCell(slug, cell.id, "down")}
          disabled={isLast}
          className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[11px] text-stone-600 hover:text-blue-600 disabled:opacity-40"
          title="Move down"
        >
          ↓
        </button>
        <button
          onClick={() =>
            convertCellType(
              slug,
              cell.id,
              cell.type === "code" ? "markdown" : "code",
              cell.source,
            )
          }
          className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[11px] text-stone-600 hover:text-blue-600"
          title="Convert cell type"
        >
          {cell.type === "code" ? "→ md" : "→ code"}
        </button>
        <button
          onClick={() => deleteCell(slug, cell.id)}
          className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[11px] text-stone-600 hover:text-rose-600"
          title="Delete cell"
        >
          ×
        </button>
      </div>

      {cell.type === "code" ? (
        <CodeCell
          slug={slug}
          cellId={cell.id}
          source={cell.source}
          executionCount={cell.executionCount}
          outputs={cell.authoredOutputs}
          isOverlay={cell.isOverlay}
        />
      ) : (
        <MarkdownCell slug={slug} cellId={cell.id} source={cell.source} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```
cd runtime && npm run build
```

- [ ] **Step 3: Commit**

```
git add runtime/components/apps/notebook/Cell.tsx
git commit -m "notebook: Cell toolbar and type dispatch"
```

---

## Task 11: NotebookView (composition + resolution rule)

**Files:**
- Create: `runtime/components/apps/notebook/NotebookView.tsx`

- [ ] **Step 1: Write `NotebookView.tsx`**

```tsx
"use client";

import { useEffect, useMemo } from "react";
import { useCaseForgeStore } from "@/lib/store";
import type { Notebook } from "@/lib/types";
import Cell, { type ResolvedCell } from "./Cell";
import AddCellButton from "./AddCellButton";

interface NotebookViewProps {
  notebook: Notebook;
}

export default function NotebookView({ notebook }: NotebookViewProps) {
  const overlay = useCaseForgeStore((s) => s.notebookState[notebook.slug]);
  const initOverlay = useCaseForgeStore((s) => s.initNotebookOverlay);
  const addCell = useCaseForgeStore((s) => s.addCell);
  const runAll = useCaseForgeStore((s) => s.runAll);

  // Ensure overlay exists for this notebook
  useEffect(() => {
    initOverlay(
      notebook.slug,
      notebook.cells.map((c) => c.id),
    );
  }, [notebook.slug, notebook.cells, initOverlay]);

  const resolved = useMemo<ResolvedCell[]>(() => {
    if (!overlay) return [];
    const authoredById = new Map(notebook.cells.map((c) => [c.id, c]));
    return overlay.cellOrder.map((id) => {
      const authored = authoredById.get(id);
      const userCell = overlay.userCells[id];
      const sourceEdit = overlay.cellSourceEdits[id];

      const type: "code" | "markdown" = userCell?.type ?? authored?.type ?? "code";
      const source = sourceEdit ?? userCell?.source ?? authored?.source ?? "";
      const isOverlay = !authored || !!userCell || sourceEdit !== undefined;

      return {
        id,
        type,
        source,
        isOverlay,
        authoredOutputs: authored && !isOverlay ? authored.outputs : [],
        executionCount: authored?.executionCount,
      };
    });
  }, [overlay, notebook.cells]);

  if (!overlay) {
    return <div className="p-6 text-sm text-stone-500">Loading notebook…</div>;
  }

  const codeCellIds = resolved.filter((c) => c.type === "code").map((c) => c.id);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-2">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-stone-900">{notebook.title}</h2>
          <span className="rounded bg-stone-200 px-1.5 py-0.5 font-mono text-[10.5px] text-stone-600">
            {notebook.kernel} (simulated)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => runAll(notebook.slug, codeCellIds)}
            className="rounded bg-blue-600 px-2.5 py-1 text-[11.5px] font-medium text-white hover:bg-blue-700"
          >
            Run all
          </button>
          <button
            onClick={() => addCell(notebook.slug, null, "code")}
            className="rounded border border-stone-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-stone-700 hover:border-blue-300 hover:text-blue-700"
          >
            + Code
          </button>
          <button
            onClick={() => addCell(notebook.slug, null, "markdown")}
            className="rounded border border-stone-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-stone-700 hover:border-blue-300 hover:text-blue-700"
          >
            + Markdown
          </button>
        </div>
      </div>

      {/* Cell list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {notebook.description && (
          <p className="mb-3 text-xs italic text-stone-500">{notebook.description}</p>
        )}

        <AddCellButton slug={notebook.slug} afterCellId="__top__" />
        {resolved.map((c, i) => (
          <div key={c.id}>
            <Cell
              slug={notebook.slug}
              cell={c}
              isFirst={i === 0}
              isLast={i === resolved.length - 1}
            />
            <AddCellButton slug={notebook.slug} afterCellId={c.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```
cd runtime && npm run build
```

- [ ] **Step 3: Commit**

```
git add runtime/components/apps/notebook/NotebookView.tsx
git commit -m "notebook: NotebookView with cell resolution rule"
```

---

## Task 12: NotebookSidebar (notebook picker)

**Files:**
- Create: `runtime/components/apps/notebook/NotebookSidebar.tsx`

- [ ] **Step 1: Write `NotebookSidebar.tsx`**

```tsx
"use client";

import { useCaseForgeStore } from "@/lib/store";
import type { Notebook } from "@/lib/types";

interface NotebookSidebarProps {
  notebooks: Notebook[];
  activeSlug: string | null;
}

export default function NotebookSidebar({ notebooks, activeSlug }: NotebookSidebarProps) {
  const setActiveNotebookSlug = useCaseForgeStore((s) => s.setActiveNotebookSlug);

  return (
    <aside className="flex w-56 flex-col border-r border-stone-200 bg-stone-50">
      <div className="border-b border-stone-200 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-stone-500">
        Notebooks
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {notebooks.map((nb) => {
          const active = nb.slug === activeSlug;
          return (
            <button
              key={nb.slug}
              onClick={() => setActiveNotebookSlug(nb.slug)}
              className={`block w-full truncate px-3 py-2 text-left text-[12.5px] ${
                active
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
              title={nb.title}
            >
              {nb.title}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Build check**

```
cd runtime && npm run build
```

- [ ] **Step 3: Commit**

```
git add runtime/components/apps/notebook/NotebookSidebar.tsx
git commit -m "notebook: NotebookSidebar picker"
```

---

## Task 13: NotebookApp (final host wiring)

**Files:**
- Modify: `runtime/components/apps/notebook/NotebookApp.tsx`

Replace the placeholder from Task 3 with the real composition.

- [ ] **Step 1: Replace `NotebookApp.tsx`**

```tsx
"use client";

import { useEffect, useMemo } from "react";
import { useCaseForgeStore } from "@/lib/store";
import type { Notebook } from "@/lib/types";
import NotebookSidebar from "./NotebookSidebar";
import NotebookView from "./NotebookView";

export default function NotebookApp() {
  const pkg = useCaseForgeStore((s) => s.coursePackage);
  const currentTask = useCaseForgeStore((s) => s.currentTask);
  const activeSlug = useCaseForgeStore((s) => s.activeNotebookSlug);
  const setActiveSlug = useCaseForgeStore((s) => s.setActiveNotebookSlug);

  const notebooks: Notebook[] = useMemo(() => {
    const all: Notebook[] = pkg?.fixtures?.notebooks ?? [];
    if (!currentTask) return all;
    return all.filter(
      (nb) => nb.linkedTasks.length === 0 || nb.linkedTasks.includes(currentTask.id),
    );
  }, [pkg, currentTask]);

  // Auto-pick first notebook when the app opens
  useEffect(() => {
    if (!activeSlug && notebooks.length > 0) {
      setActiveSlug(notebooks[0].slug);
    }
  }, [activeSlug, notebooks, setActiveSlug]);

  const active = notebooks.find((nb) => nb.slug === activeSlug) ?? notebooks[0];

  if (notebooks.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-stone-50 text-stone-500">
        <div className="text-center">
          <p className="text-sm">No notebooks for this task yet.</p>
          <p className="mt-1 text-xs text-stone-400">
            Notebooks linked to the current task will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-white">
      <NotebookSidebar notebooks={notebooks} activeSlug={active?.slug ?? null} />
      {active ? (
        <div className="flex-1 min-w-0">
          <NotebookView notebook={active} />
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```
cd runtime && npm run build
```

- [ ] **Step 3: Browser smoke check**

```
cd runtime && npm run dev
```

Open http://localhost:3000 and click the Notebook app. Expect "No notebooks for this task yet." since no sample notebook has been added to the JSON yet. The empty state should be clean and centered. Kill the dev server.

- [ ] **Step 4: Commit**

```
git add runtime/components/apps/notebook/NotebookApp.tsx
git commit -m "notebook: NotebookApp host + empty state"
```

---

## Task 14: Sample notebook in course-package.json

**Files:**
- Modify: `runtime/public/course-package.json`

- [ ] **Step 1: Append a sample `notebooks` array to `fixtures`**

In `runtime/public/course-package.json`, the `fixtures` object currently ends with `"emails": [...]`. After the closing `]` of `emails` (still inside `fixtures`), add a comma and the `notebooks` array. The notebook below is small but exercises stdout, table, and image outputs and is tied to `M1.T1`.

Insert (immediately before the closing brace of `fixtures`):

```json
"notebooks": [
  {
    "slug": "policy-lifecycle-explorer",
    "title": "Policy Lifecycle Explorer",
    "description": "A guided walkthrough of Meridian's policy lifecycle data. Run each cell to see what the underlying tables look like.",
    "kernel": "python3",
    "linkedTasks": ["M1.T1"],
    "cells": [
      {
        "id": "nb-cell-intro",
        "type": "markdown",
        "source": "# Policy Lifecycle Explorer\n\nThis notebook gives you a feel for the data you'll be mapping in **M1.T1**. Run each cell to see live extracts. Edit cells freely — your edits are local to this session.",
        "outputs": []
      },
      {
        "id": "nb-cell-import",
        "type": "code",
        "source": "import pandas as pd\nfrom pathlib import Path\n\ndata_dir = Path('/data/meridian')\nprint('Connected to Meridian data lake:', data_dir)",
        "language": "python",
        "executionCount": 1,
        "outputs": [
          {
            "type": "stdout",
            "content": "Connected to Meridian data lake: /data/meridian"
          }
        ]
      },
      {
        "id": "nb-cell-policies",
        "type": "code",
        "source": "policies = pd.read_parquet(data_dir / 'policies.parquet')\npolicies.head(5)",
        "language": "python",
        "executionCount": 2,
        "outputs": [
          {
            "type": "table",
            "content": "policy_id,lob,status,bound_at,system\nPOL-100001,Auto,Active,2025-01-12,Guidewire\nPOL-100002,Homeowners,Active,2025-01-14,Guidewire\nPOL-100003,Commercial Property,Active,2025-01-18,Legacy Mainframe\nPOL-100004,Auto,Cancelled,2024-11-02,Guidewire\nPOL-100005,General Liability,Active,2025-02-03,Legacy Mainframe"
          }
        ]
      },
      {
        "id": "nb-cell-by-lob",
        "type": "markdown",
        "source": "## Active policies by line of business\n\nThe legacy mainframe still owns Commercial and Life lines. Personal Auto and Homeowners migrated to Guidewire three years ago.",
        "outputs": []
      },
      {
        "id": "nb-cell-groupby",
        "type": "code",
        "source": "active = policies[policies.status == 'Active']\nactive.groupby(['lob', 'system']).size().reset_index(name='count')",
        "language": "python",
        "executionCount": 3,
        "outputs": [
          {
            "type": "table",
            "content": "lob,system,count\nAuto,Guidewire,4200000\nHomeowners,Guidewire,3000000\nCommercial Property,Legacy Mainframe,2150000\nGeneral Liability,Legacy Mainframe,1450000\nTerm Life,Legacy Mainframe,720000\nWhole Life,Legacy Mainframe,480000"
          }
        ]
      }
    ]
  }
]
```

If the existing `emails` array ends with `]` followed by `}` (closing `fixtures`), the correct insertion is to change `]` to `],` and add the `"notebooks": [...]` array before the closing `}` of `fixtures`.

- [ ] **Step 2: Validate the JSON**

From repo root:
```
npm run validate -- runtime/public/course-package.json
```
Expected: `OK — runtime/public/course-package.json` with a non-zero `wiki`, `datasets`, etc. count. The validate script doesn't currently print notebook counts, but the package should parse cleanly. If you see an error, the most likely cause is a JSON syntax issue (trailing comma, missing `]`).

- [ ] **Step 3: Build check + browser smoke check**

```
cd runtime && npm run build && npm run dev
```

In the browser:
1. Open the Notebook app — should show sidebar with "Policy Lifecycle Explorer".
2. The markdown cells should render with the prose styling.
3. Click Run on `nb-cell-import` — running spinner, then "Connected to Meridian data lake: /data/meridian" appears as stdout.
4. Click Run on `nb-cell-policies` — table renders with 5 rows.
5. Edit `nb-cell-import` source (add a character). Click Run again. The output should now read "(no recorded output — this notebook is a simulated environment)" since the cell is now in overlay state.
6. Hover between cells — `+ Code` and `+ Markdown` ghost buttons appear. Add a code cell. Run it. It shows the "no recorded output" message.
7. Use the ↑ / ↓ buttons in a cell's hover toolbar to reorder. Use × to delete. Use `→ md` to convert a code cell to markdown.
8. Click "Run all" in the toolbar — code cells execute top-to-bottom with a brief stagger.

Kill the dev server.

- [ ] **Step 4: Commit**

```
git add runtime/public/course-package.json
git commit -m "data: add sample Policy Lifecycle Explorer notebook"
```

---

## Task 15: Final verification

- [ ] **Step 1: Full build + type-check**

```
cd runtime && npm run build
```
Expected: succeeds.

- [ ] **Step 2: Schema validation**

```
cd /Users/kshnvagale/Documents/Ai/Scaler/CaseForge/game && npm run validate -- runtime/public/course-package.json
```
Expected: `OK`.

- [ ] **Step 3: Manual acceptance walkthrough**

Run the dev server and step through the acceptance criteria from the spec (section "Acceptance criteria", items 1–9). All nine items must pass.

- [ ] **Step 4: Bundle size check (informational)**

```
cd runtime && npm run build
```
Inspect the Next.js build output. The Notebook route's First Load JS should be under 40kb gzipped added vs. the existing baseline. If it's higher, investigate Prism language imports (only Python + Markdown should be loaded).

- [ ] **Step 5: No git changes outstanding**

```
git status
```
Expected: working tree clean for everything in this plan's scope.

---

## Self-Review (run before handing off)

**1. Spec coverage:**
- ✅ Schema: Task 1 covers all three new types and Fixtures addition.
- ✅ Deps: Task 2.
- ✅ AppId / registry / window preset / page.tsx: Task 3.
- ✅ Store overlay + 7 actions + reset integration: Task 4.
- ✅ Prism + scoped CSS: Task 5.
- ✅ CellOutput all 6 output types: Task 6.
- ✅ MarkdownCell edit/render toggle: Task 7.
- ✅ CodeCell with run + isOverlay branching: Task 8.
- ✅ AddCellButton between cells: Task 9.
- ✅ Cell toolbar (Run via CodeCell, ↑, ↓, convert, delete): Task 10.
- ✅ NotebookView (resolution rule, Run All, +Code/+Markdown toolbar): Task 11.
- ✅ NotebookSidebar (linkedTasks filter handled in NotebookApp): Task 12.
- ✅ NotebookApp empty state + auto-pick: Task 13.
- ✅ Sample notebook in JSON: Task 14.
- ✅ Acceptance criteria walkthrough: Task 15.

**2. Placeholder scan:** No TODOs, TBDs, or "implement later" in any task. All code is inlined.

**3. Type consistency:**
- `addCell(slug, afterCellId, type)` — signature consistent across store, AddCellButton, NotebookView (which uses `null` and `"__top__"`).
- `convertCellType(slug, cellId, nextType, currentSource)` — 4-arg form, matches Cell.tsx call site.
- `NotebookOverlay`, `CellRunState`, `ResolvedCell` — defined once, imported correctly.
- `notebooks` schema field has `.default([])` — `pkg.fixtures.notebooks ?? []` fallback in NotebookApp is redundant-but-safe.

No issues to fix.
