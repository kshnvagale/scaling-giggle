# Netflix Content Strategy Sim — Design Spec

**Date:** 2026-05-25
**Status:** Brainstorming → spec (this doc) → plan → implementation
**Author:** Kishan Vagale + Claude

## Goal

Add a second simulation — **Netflix Content Strategy** — to the CaseForge learner runtime, alongside the existing Meridian PolSync sim. The learner solves a Kaggle-style EDA case in a real Jupyter-feel notebook (Pyodide kernel), iterates against a mock AI mentor (Priya) who gives prose feedback on each draft, and finalises a deliverable.

This sim is built for a demo. The existing Meridian sim must continue to work unchanged. Both sims share the same OS shell, app dock, store, and persona/chat infrastructure.

## Design principles (inherited from CaseForge)

1. **Data-driven, never hardcoded.** All domain content lives in `course-package-netflix.json`, never in components.
2. **Zero-prop, store-driven UI.** Components read from `useCaseForgeStore`.
3. **Schema-first.** Any new shape extends `schema/course_package.ts` before runtime code uses it. New fields are optional / defaulted so Meridian's existing JSON stays valid.
4. **Honest semantics.** Where execution is real (Pyodide), it's real. Where the judge is mocked, the runtime doesn't pretend it's an LLM call.
5. **Meridian-safe.** Every addition is additive. No edits to `course-package.json`, no changes to existing component behavior unless explicitly noted.

## Scope

### In scope (v1)

- New case JSON `runtime/public/course-package-netflix.json`.
- New dataset asset `runtime/public/data/netflix_titles.csv` (from Kaggle).
- URL-based case selection: `localhost:3000/?case=netflix` loads the Netflix package; `localhost:3000/` continues to load Meridian.
- Notebook app upgraded to support a real Pyodide kernel (`kernel: "pyodide"` notebooks execute real Python in the browser; `kernel: "simulated"` notebooks keep the existing authored-outputs behaviour).
- Submit app upgraded to support an iterative-feedback mode (`judgeMode: "iterative"` shows a draft / feedback / revise loop; `judgeMode: "single"` keeps Meridian's current behaviour).
- Mock judge: deterministic, state-machine-based, returns Priya-voiced prose feedback. No LLM call.
- One Netflix persona (Priya), with hardened guardrails and a pre-populated opening message.
- Three Wiki pages (Dataset Dictionary, Rating Reference, Catalog Note).
- Briefing doc in Priya's voice.
- Pyodide loaded lazily from CDN on first Notebook open.

### Explicitly out of scope (v1, YAGNI)

- Case picker UI. URL query param is the only switch.
- Real LLM-based grading. The judge is mocked.
- Multi-case state isolation beyond what loading a fresh CoursePackage already does. (Reloading the page switches cases cleanly; no in-session case switching.)
- Vendored Pyodide for offline demos. CDN is sufficient for v1; if demo machine has no network, follow-up to vendor `runtime/public/pyodide/`.
- Persisting notebook edits or feedback history across reloads (Zustand-only, matches existing pattern).
- Author-pipeline support for generating notebooks or feedback states. The Netflix CoursePackage is hand-authored for now.
- Notebook → PDF export.
- Plot interactivity (matplotlib outputs render as static PNG).

## Current codebase state (verified before this spec)

CLAUDE.md describes "four learner apps: Briefing, Wiki, Chat, Submit." The codebase has drifted:

- **Apps that exist:** `briefing, wiki, chat, sheets, bigquery, terminal, notebook` (all in `AppId` and `app-registry.ts`).
- **Notebook app is already built** per the approved 2026-05-20 notebook spec — simulated-outputs flavour. Folder: `runtime/components/apps/notebook/` with `NotebookApp, NotebookView, NotebookSidebar, Cell, CodeCell, MarkdownCell, CellOutput, AddCellButton`.
- **Submit app no longer exists.** It was removed at some point. The store retains `judgeResult: JudgeResult | null` and a `setJudgeResult` action, but no UI reads them. The Judge API endpoint at `app/api/judge/route.ts` still exists. The Meridian briefing still references "Submit your deliverable" in its copy, but clicking through there's no Submit surface.

This spec proceeds on the basis that:
1. The notebook app implementation from 2026-05-20 is **the baseline**, not a precondition.
2. **Submit is gone and we are reintroducing it specifically for Netflix's iterative-judge flow.** It will be registered as a new app `submit` in `AppId` and `app-registry`, but **only registered into the dock when the active CoursePackage has `deliverable.judgeMode === "iterative"`**. Meridian doesn't get a Submit app back (its CoursePackage has no `judgeMode` field → defaults to `"single"` → the Submit app is gated out of the dock). If Meridian wants Submit back later, change one field in its JSON.

## Architecture: what's reused vs new

### Reused unchanged

- **Desktop OS shell** (`Desktop.tsx`) — window manager, taskbar, menu bar, wallpaper.
- **Briefing app** — already renders whatever briefing the CoursePackage provides.
- **Wiki app** — already renders `coursePackage.wiki[]`.
- **Chat app + `app/api/chat`** — already roleplays personas from `coursePackage.personas[]` via the existing Anthropic API call with system prompt composition.
- **Notebook app** — simulated-output behaviour from the 2026-05-20 spec is preserved as the default. We add a Pyodide path beside it, gated on `notebook.kernel === "pyodide"`.
- **Zustand store** — generic over CoursePackage.
- **IntroGate** — runs for both cases; we'll keep its existing copy and let the briefing carry the Netflix-specific framing.

### Modified (additively, Meridian behaviour preserved)

| File | Change |
|---|---|
| `runtime/app/page.tsx` | Read `?case=` query param; pick `/course-package.json` (default) or `/course-package-netflix.json`. |
| `runtime/app/api/chat/route.ts` | Add a **guardrails block** to the composed system prompt, after the Slack-voice block. Applies to every persona — Meridian benefits too. |
| `runtime/components/apps/chat/*` | When a thread is empty and the persona has `initialMessage`, render that message as the first bubble. No API call. |
| `runtime/lib/app-registry.ts` | Add `submit` entry, gated at registration-time on `coursePackage.deliverable.judgeMode === "iterative"`. The dock builder consults the active CoursePackage. |
| `runtime/lib/types.ts` | Add `"submit"` to `AppId` union. |
| `runtime/components/apps/notebook/*` | Branch on `notebook.kernel`. Default `"simulated"` keeps current behaviour. New `"pyodide"` path: lazy-load Pyodide, mount the CSV, route Run actions through the real kernel. |
| `schema/course_package.ts` | Additive fields described in the Schema section. |

### New

| File | Purpose |
|---|---|
| `runtime/public/course-package-netflix.json` | The new case's content. |
| `runtime/public/data/netflix_titles.csv` | The Kaggle dataset, mounted into Pyodide on kernel boot. |
| `runtime/lib/pyodide-kernel.ts` | Thin wrapper around Pyodide: load runtime + pandas + matplotlib, mount CSV, expose `runCell(source) → outputs[]`. |
| `runtime/lib/mock-judge.ts` | Deterministic state-machine judge for `judgeMode: "iterative"`. |
| `runtime/components/apps/submit/IterativeSubmit.tsx` | Two-panel layout + feedback history. |
| `runtime/components/apps/submit/FeedbackBubble.tsx` | Renders one round of Priya's feedback in the history. |

## URL-based case selection

`runtime/app/page.tsx` currently calls `loadCoursePackage("/course-package.json")` unconditionally. New behaviour:

```ts
const params = useSearchParams();
const caseId = params.get("case");  // "netflix" | null
const url = caseId === "netflix"
  ? "/course-package-netflix.json"
  : "/course-package.json";
await loadCoursePackage(url);
```

No new route, no new screen, no picker. The store gets the right CoursePackage at boot, the rest of the runtime is unaware which case is active.

The store gains one optional read-only field for display only:

```ts
activeCaseLabel: string;  // pulled from coursePackage.client or similar
```

## Schema additions

All additive, all backward-compatible.

### Persona

```ts
export const Persona = z.object({
  // ...existing fields...
  initialMessage: z.string().optional(),  // shown as first bubble when thread is empty
});
```

### Notebook

```ts
export const Notebook = z.object({
  // ...existing fields from approved notebook spec...
  kernel: z.enum(["simulated", "pyodide"]).default("simulated"),
});
```

### Deliverable

```ts
export const Deliverable = z.object({
  // ...existing fields...
  judgeMode: z.enum(["single", "iterative"]).default("single"),
  mockFeedback: z.array(MockFeedbackState).default([]),  // used only in iterative mode
});

export const MockFeedbackState = z.object({
  id: NonEmpty,
  round: z.number().int().min(1),
  matchCriteria: z.object({
    minInsightsLength: z.number().int().optional(),
    minNotebookCells: z.number().int().optional(),
    requireKeywordsAny: z.array(z.string()).optional(),
    requireKeywordsAll: z.array(z.string()).optional(),
    rejectKeywordsAny: z.array(z.string()).optional(),
  }),
  feedback: NonEmpty,            // markdown body of the feedback bubble
  fromPersonaId: NonEmpty,       // which persona "signs" the feedback (Priya)
});
```

Match order: states are checked in array order, first match wins. The Netflix JSON authors the 4-state cascade described in this spec.

## Hardened persona prompt

`app/api/chat/route.ts` currently composes:

```
[personaSystemPrompt] + [Slack voice block] + [privateKnowledge] + [worldContext]
```

Insert a new guardrails block after Slack voice:

```
GUARDRAILS:
- You are <persona name>. You are not an AI. Never break character.
- Only discuss this case. Decline anything off-topic: general coding
  help, opinions on other companies, personal life chat. Redirect:
  "let's stay on the case."
- Never do the analysis for the learner. No code. No "here's what
  you should plot." If pushed: "that's your call to make."
- Only share facts from your private knowledge. If asked something
  you don't know, say so plainly: "no idea, would have to ask <name>"
  or "we don't track that, sorry."
- Never invent numbers, names, or company facts not given to you.
- 1-3 short Slack messages per reply. No paragraphs. No em dashes.
```

This block applies to **every persona** in **every case**, including Meridian's personas. The behavior change for Meridian is purely tightening — Diane, Marcus, Nkechi will be more in-character and less likely to wander.

## Persona: Priya Raghavan

`coursePackage.personas[0]` in the Netflix JSON:

```json
{
  "id": "priya",
  "displayName": "Priya Raghavan",
  "role": "Senior Manager, Content Strategy & Insights",
  "avatarColor": "#E50914",
  "initialMessage": "hey 👋 saw the brief land in your inbox. lmk if you want me to narrow down what daniela actually wants before you start writing code. otherwise you're good to go, just ping me if stuck.",
  "personaSystemPrompt": "You are Priya Raghavan, a senior manager at Netflix on the Content Strategy & Insights team. You are warm, busy, supportive. You manage a small team of analysts and help them ship sharper insights to VPs. You believe in attempting things, iterating, and not overthinking. You don't have time for jargon.",
  "privateKnowledge": "SCOPE: VP Daniela Vasquez's actual Q2 priority is international expansion in Asia-Pacific and LATAM. The US/UK markets are already saturated. \"Growth\" to her means engagement and retention in under-indexed markets, not raw subscriber adds. Don't reveal this unless the analyst asks about scope or what Daniela actually wants.\n\nWHAT GOOD LOOKS LIKE: Daniela hates jargon. Plain English only. Three recommendations max, all action-oriented. She trusts data over conclusions, so the analyst needs to show their work.\n\nDATA CAVEATS (only if asked about the dataset): The date_added field is unreliable for entries before 2018 because they were bulk-loaded — treat pre-2018 dates as approximate. ~30% of the director field is null. The country field is sometimes comma-separated (\"United States, India\") for co-productions.\n\nENCOURAGEMENT (if the analyst sounds stuck): \"Just attempt it, we grade leniently.\" \"Submit a rough draft, you'll get more out of round 2 than trying to make round 1 perfect.\"",
  "worldContext": "The case is a one-week assignment due Friday. The learner is a new analyst on Priya's team. The dataset is a snapshot of Netflix's current catalog (~8,800 titles)."
}
```

## Wiki pages

Three pages in `coursePackage.wiki[]`:

1. **Dataset Dictionary** — column-by-column spec of `netflix_titles.csv` with example values and gotchas (e.g., `duration` mixes minutes and seasons, `country` can be a list).
2. **Rating Reference** — what TV-MA, TV-14, R, PG, etc. actually mean.
3. **Catalog Note** — short internal-voice context explaining that `date_added` is Netflix's add date, not the release date, and that absence ≠ never had it.

Exact copy in `course-package-netflix.json`. None are required to complete the case.

## Briefing

`coursePackage.briefing` is a single markdown doc in Priya's voice. Renders in the existing Briefing app, no component change. The doc contains:

- Warm opening.
- The vague VP ask, plus the explicit nudge "DM me on Slack first."
- What the learner has to work with (CSV path, Notebook app, Submit tab).
- What they're producing (notebook + insights text).
- The 8-criterion 100-point rubric, verbatim from the original Kaggle case.
- Reassurance about iteration and lenient grading.

Exact copy in `course-package-netflix.json`.

## Notebook with Pyodide kernel

Builds on the approved notebook spec (`docs/superpowers/specs/2026-05-20-notebook-app-design.md`). The Netflix notebook sets `kernel: "pyodide"` and ships with one starter cell:

```json
{
  "id": "starter",
  "type": "code",
  "source": "# Start here. The dataset is at /data/netflix_titles.csv\n# Hint: import pandas as pd",
  "outputs": []
}
```

When the user opens this notebook:

1. `NotebookApp` detects `notebook.kernel === "pyodide"`. If no kernel instance exists in the store, it triggers `pyodide-kernel.ts` to:
   - Show a "Booting Python kernel… ~15s" loading state.
   - Load Pyodide from `https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js`.
   - Install `pandas` and `matplotlib` packages via `pyodide.loadPackage`.
   - Configure matplotlib's `Agg` backend so `plt.show()` returns a base64 PNG instead of opening a window.
   - Fetch `/data/netflix_titles.csv` and write it to Pyodide's virtual FS at `/data/netflix_titles.csv`.
   - Store the kernel instance in the store as `pyodideKernel`.
2. Subsequent `runCell` calls go through `pyodideKernel.runCell(source)`, which returns a structured `outputs[]` array matching the existing `NotebookOutput` schema:
   - `type: "stdout"` for prints / repr.
   - `type: "result"` for the last expression value (Jupyter-style).
   - `type: "image"` with base64 PNG content for matplotlib figures.
   - `type: "error"` with the traceback for exceptions.
3. Variables persist across cells (Pyodide is one Python process per page).

### `pyodide-kernel.ts` shape

```ts
export interface PyodideKernel {
  ready: boolean;
  bootPromise: Promise<void>;        // resolves when ready
  runCell(source: string): Promise<NotebookOutput[]>;
  reset(): Promise<void>;            // re-init kernel; for "Restart Kernel" toolbar action
}

export async function bootPyodideKernel(csvUrl: string): Promise<PyodideKernel>;
```

- The kernel is created once per page load. If the user reloads, it boots again.
- Singleton lives in the Zustand store (`pyodideKernel: PyodideKernel | null`).
- Boot errors (CDN unreachable, package install failure) surface as a kernel-status banner in the notebook toolbar with a Retry button.

### Cell run flow

Replaces the 600ms fake delay from the approved spec, but only for `kernel: "pyodide"` notebooks:

- `runCell` action in the store calls `pyodideKernel.runCell(source)`.
- While the promise is pending, `cellRunStates[cellId] = "running"`.
- On resolve, write the returned outputs into a new store field `cellLiveOutputs[cellId]`, set state to `"done"`.
- The `Cell` component renders `cellLiveOutputs[id]` when present, falling back to `cell.outputs` (authored, for simulated notebooks).

This isolates the Pyodide execution path from the simulated path. Meridian's `claims-data-explorer` notebook continues to use the simulated path.

### `kernel === "pyodide"` cell resolution

For Pyodide notebooks, the "authored outputs" branch of the cell resolution rule from the approved notebook spec is **never** used — there are no authored outputs. The output panel shows live outputs from the last `runCell` call. Before the first run, the output area is empty.

## Submit app: iterative judge mode

The existing Submit app reads `coursePackage.deliverable` and renders Meridian's single-shot submit. For Netflix (`judgeMode: "iterative"`), it renders `IterativeSubmit` instead.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Submit ▸ Netflix Content Strategy                            │
├──────────────────────────────┬──────────────────────────────┤
│                              │                              │
│   Insights & Recommendations │   Notebook preview           │
│   ┌────────────────────────┐ │   (read-only thumbnail)      │
│   │                        │ │                              │
│   │  (markdown editor)     │ │   netflix-catalog-analysis   │
│   │                        │ │   ─────────────────          │
│   │                        │ │   [1] df = pd.read_csv(...)  │
│   │                        │ │   [2] df.info()              │
│   │                        │ │   [3] ...                    │
│   │                        │ │                              │
│   └────────────────────────┘ │                              │
│                              │                              │
├──────────────────────────────┴──────────────────────────────┤
│   Feedback from Priya                                        │
│   ┌────────────────────────────────────────────────────────┐ │
│   │ Round 1 · 2 min ago                                   │ │
│   │ "good start, you've got the basic EDA shape down..."  │ │
│   └────────────────────────────────────────────────────────┘ │
│   ┌────────────────────────────────────────────────────────┐ │
│   │ Round 2 · just now                                    │ │
│   │ "much better, you're aiming at the right question..."  │ │
│   └────────────────────────────────────────────────────────┘ │
│                                                              │
│   [ Get feedback from Priya ]      [ Final submit ]          │
└──────────────────────────────────────────────────────────────┘
```

### "Get feedback from Priya"

1. Capture current insights text + current notebook state (cell count, cell sources concatenated).
2. Show a "Priya is reviewing your draft…" loading state (~1.5s, intentional pause so the demo audience registers what's happening).
3. Call `mockJudge(insights, notebookState, mockFeedbackStates)` → returns the matching `MockFeedbackState`.
4. Append a new feedback bubble to the history with that state's `feedback`, signed as the `fromPersonaId` persona.
5. Editor stays editable. User can iterate forever (the spec does not cap rounds).

### "Final submit"

1. Confirmation modal: "Once you submit, your work is locked. Continue?"
2. On confirm: set `submissionFinalized: true` in the store, hide the action buttons, replace with a completion banner.
3. Notebook becomes read-only after final submit (we set a flag the notebook reads to disable Run / Edit).

## Mock judge: state machine

`runtime/lib/mock-judge.ts`:

```ts
export interface MockJudgeInput {
  insightsText: string;
  notebookCellCount: number;
  notebookSourceConcat: string;     // all cell sources joined, lowercase
}

export function mockJudge(
  input: MockJudgeInput,
  states: MockFeedbackState[],
): MockFeedbackState {
  for (const state of states) {
    if (matches(state.matchCriteria, input)) return state;
  }
  return states[states.length - 1];   // last state = catch-all "polished"
}
```

`matches` evaluates each criterion that is set; missing criteria are not enforced. All set criteria must hold for a state to match. States are evaluated in array order.

### Netflix's 4 mock feedback states

| # | Match criteria | Feedback voice (truncated) |
|---|---|---|
| 1 | `insightsText.length < 50` OR `notebookCellCount < 3` | *"hey, looks like you haven't really attempted this yet. submit a real draft and i'll give you proper feedback. doesn't need to be perfect."* |
| 2 | `rejectKeywordsAny: ["international","apac","latam","country","region"]` (i.e. none of these appear in insights) | *"good start, you've got the basic EDA shape down. but you're missing the angle daniela actually cares about, which is international growth. did we chat about that? go look at where the catalog is light by country and see what shows up. round 2 will be a lot stronger."* |
| 3 | `requireKeywordsAny: ["international","apac","latam","country","region"]` AND `rejectKeywordsAny: ["recommend","should","propose"]` | *"much better, you're aiming at the right question now. last gap: insights are observations, recommendations are actions. give me three things you'd actually do with this analysis. plain english, like you're saying it to daniela in a hallway."* |
| 4 | (catch-all) | *"this is solid work, you can submit when you're ready. one tiny note: lead with the recommendation, then back it with the data. execs read top down. but honestly, ship it."* |

This produces a deterministic 3-round arc for the demo's golden path: first submit (empty) → state 1, second submit (real draft, missed international) → state 2, third submit (international + observations only) → state 3, fourth submit (with recommendations) → state 4. Off-script paths still get a sensible match.

Exact feedback copy lives in `course-package-netflix.json`, not in code.

## Demo golden path

For the demo presenter's benefit, the intended path is:

1. Open `localhost:3000/?case=netflix`.
2. IntroGate → Desktop loads with the Netflix wallpaper / app dock.
3. Open **Briefing** → read Priya's doc.
4. Open **Chat** → Priya's opening message is already there → ask "can you narrow this down?" → she reveals the international angle.
5. (Optional) Open **Wiki** → glance at the dataset dictionary.
6. Open **Notebook** → kernel boots (~15s, first time) → write EDA code, run cells, see real outputs.
7. Open **Submit** → write a thin first draft → "Get feedback from Priya" → mock state 1 fires.
8. Beef up draft (still missing international) → submit again → state 2 fires ("missed the international angle").
9. Revise insights to mention international markets, but as observations only → submit → state 3 fires ("recommendations are actions").
10. Add three concrete recommendations → submit → state 4 fires ("ship it").
11. Final submit → confirmation → completion banner.

The presenter can deviate from this path; the mock judge still matches sensibly.

## Files added / modified

### Added

- `runtime/public/course-package-netflix.json`
- `runtime/public/data/netflix_titles.csv`
- `runtime/lib/pyodide-kernel.ts`
- `runtime/lib/mock-judge.ts`
- `runtime/components/apps/submit/SubmitApp.tsx` — the new app's top-level entry. Internally branches on `judgeMode`: today only `"iterative"` is implemented; `"single"` mode is left as a future hook (Meridian will still not have Submit in its dock).
- `runtime/components/apps/submit/IterativeSubmit.tsx` — the two-panel + feedback-history UI.
- `runtime/components/apps/submit/FeedbackBubble.tsx` — one round in the feedback history.

### Modified

- `schema/course_package.ts` — schema additions described above.
- `runtime/lib/types.ts` — add `"submit"` to `AppId`; re-export new schema types.
- `runtime/lib/store.ts` — new state: `pyodideKernel`, `cellLiveOutputs`, `insightsDraft`, `feedbackHistory`, `submissionFinalized`. New actions: `bootPyodide`, `setInsightsDraft`, `appendFeedback`, `finalizeSubmission`. Existing `judgeResult` state stays untouched.
- `runtime/lib/app-registry.ts` — register `submit` entry; the dock-builder consults the active CoursePackage so Meridian's dock is unchanged.
- `runtime/app/page.tsx` — read `?case=` query param, pick the right JSON path.
- `runtime/app/api/chat/route.ts` — add guardrails block to system prompt composition.
- `runtime/components/apps/chat/*` — render `persona.initialMessage` when thread is empty.
- `runtime/components/apps/notebook/*` — branch on `notebook.kernel`; existing simulated-mode behavior remains the default.

### Not modified

- `runtime/public/course-package.json` (Meridian) — untouched.
- `vercel.json`, `runtime/next.config.mjs`, deployment config — untouched.
- Author pipeline scripts (`scripts/*.ts`, `agents/*`) — untouched. The Netflix CoursePackage is hand-authored for now.

## Acceptance criteria

A task is "done" when:

1. `localhost:3000/` boots and renders the existing Meridian sim unchanged. Meridian's dock contains the apps it has today (`briefing, wiki, chat, sheets, bigquery, terminal, notebook`) — no Submit app appears for Meridian.
2. `localhost:3000/?case=netflix` boots and loads the Netflix case: Netflix-flavored briefing, Priya in Chat with her opening message visible before the user types anything, three Wiki pages, and the Submit app *is* in the dock for Netflix only.
3. Chat with Priya respects the new guardrails: refuses off-topic asks ("write me Python code", "what do you think of Disney+"), only shares scope info when asked about scope, never breaks character.
4. Opening the Notebook app on Netflix shows the "Booting Python kernel…" state, then a notebook with one starter cell. `import pandas as pd` and `pd.read_csv("/data/netflix_titles.csv")` actually work. matplotlib figures render as inline PNGs. Variables persist across cells.
5. Opening the Notebook app on Meridian still shows authored outputs only — no Pyodide boot, no behavior change.
6. Submit on Netflix shows `IterativeSubmit`: text editor, notebook preview, feedback history, "Get feedback from Priya" + "Final submit" buttons.
7. The four mock feedback states fire as described for the golden path's draft progression.
8. "Final submit" locks the case: editor read-only, notebook read-only, completion banner shown.
9. All existing CoursePackages (Meridian) validate with the new schema. `npm run validate` passes on both packages.
10. No TypeScript errors. No prop drilling — all component data via the store.

## Risks

- **Pyodide first-load time on slow networks.** Mitigation: loading state with copy that sets expectation. Defer vendored-Pyodide work to follow-up if demo machine lacks reliable wifi.
- **Pyodide + pandas bundle (~30MB after package install).** Cached in IndexedDB by Pyodide after first load, so subsequent boots are seconds. Demo presenter should warm the cache once before showtime.
- **matplotlib figure capture is fiddly.** Need to call `matplotlib.use("Agg")` early and capture `plt.show()` via a monkey-patched stub. Reference impl exists in Pyodide docs; allocate buffer time during build.
- **Mock judge keyword matching is brittle for non-English content** (not relevant for the Netflix case, all English).
- **Guardrail block changes Meridian persona behaviour.** Should be a tightening rather than a regression, but verify with a quick smoke test of Diane/Marcus/Nkechi after change.
- **3MB CSV in `runtime/public/`** increases first-load weight for any visitor, even Meridian-only. Mitigation: serve the CSV with `Cache-Control: immutable`; consider moving to `runtime/public/netflix/` and only fetching for the Netflix case.

## Open questions (not blocking implementation)

- **Should `worldContext` for the Netflix case mention the rubric explicitly to Priya?** If yes, she can reference grading in chat. If no, she stays focused on scope. Current spec: no — rubric stays in briefing.
- **Should the iterative judge expose round numbers in the UI?** Current spec: yes, "Round N · timestamp" on each bubble.
- **Wallpaper for Netflix sim** — keep the same default, or switch to a Netflix-themed one? Current spec: same default. Visual distinction comes from briefing content + Priya's avatar color (`#E50914`).
- **Should final submit produce a downloadable artifact (notebook + insights bundle)?** Current spec: no — completion banner only.

## Dependencies added

`runtime/package.json` new runtime dep:

- None (Pyodide loads from CDN at runtime, not as an npm dep).

Dev-time helpers:

- None additional beyond what the notebook spec already requires (`react-simple-code-editor`, `prismjs`).
