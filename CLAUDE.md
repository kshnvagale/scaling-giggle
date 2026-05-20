# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Two-system architecture

This repo is **one product, two systems**, connected by a single JSON contract:

```
Curriculum doc (.md)
      │
      ▼
┌─────────────────────────┐
│ Author Pipeline         │   Managed Agents (Anthropic beta)
│ (scripts/, agents/,     │   Driven by tsx scripts from repo root.
│  schema/)               │   Outputs CoursePackage JSON.
└─────────────────────────┘
      │
      ▼
 packages/phase6_package.json
      │  (manually copied / downloaded to)
      ▼
 runtime/public/course-package.json
      │
      ▼
┌─────────────────────────┐
│ Learner Runtime         │   Next.js 14 App Router, Zustand, Tailwind.
│ (runtime/)              │   Desktop-OS sim with Briefing / Wiki / Chat / Submit apps.
└─────────────────────────┘
```

The **CoursePackage** schema (`schema/course_package.ts`) is the load-bearing contract. The author pipeline produces it; the runtime consumes it. Any author-side change MUST keep the runtime able to parse it, and any runtime-side change MUST stay within what the schema guarantees. Never hardcode domain content in the runtime — every domain string (client name, glossary, personas, wiki pages, datasets, rubrics) is loaded from this JSON.

There are **two separate `package.json` files** with no workspaces:
- `./package.json` — tsx scripts for the author pipeline (Anthropic Managed Agents SDK).
- `./runtime/package.json` — the Next.js learner runtime.
Install / run each independently. `vercel.json` builds only `runtime/`.

## Commands

### Author pipeline (run from repo root)

```bash
npm install                    # author-side deps
npm run upload                 # upload curriculum + schema to a Managed Agents session
npm run download               # download generated CoursePackage JSON from a session
npm run download -- sesn_...   # download from a specific session id
npm run validate -- packages/phase6_package.json   # zod-validate a CoursePackage
npm run solver -- <agent-id>   # create a solver-agent session to test-solve a task
```

Author-pipeline scripts need `.env` (copy from `.env.example`):
- `ANTHROPIC_API_KEY`
- `COURSEFORGE_AGENT_ID`
- `COURSEFORGE_ENVIRONMENT_ID` (optional; auto-picks first env otherwise)

All Managed Agents calls go through the beta header `managed-agents-2026-04-01`. The SDK is `@anthropic-ai/sdk` ≥ 0.89 using `client.beta.*` endpoints (`environments`, `files`, `sessions`).

### Runtime (run from `runtime/`)

```bash
cd runtime
npm install
npm run dev        # next dev, http://localhost:3000
npm run build
npm run start
```

The runtime needs its own `runtime/.env` with `ANTHROPIC_API_KEY` (used by `app/api/chat` and `app/api/judge`).

## Where things live

- `schema/course_package.ts` — single source of truth for the CoursePackage shape. Both systems import it. `runtime/lib/types.ts` re-exports types via the `@schema/*` tsconfig path (`runtime/tsconfig.json` → `"@schema/*": ["../schema/*"]`).
- `runtime/public/course-package.json` — what the runtime fetches on load (`runtime/app/page.tsx` → `loadCoursePackage("/course-package.json")`). Replace this to swap simulations. `download-package.ts` writes it automatically when downloading.
- `runtime/lib/store.ts` — global Zustand store. The runtime is **zero-prop**: components pull state via `useCaseForgeStore` rather than receive props. When adding new UI features, prefer extending the store over plumbing props.
- `runtime/components/desktop/Desktop.tsx` — the desktop OS shell (window chrome, menu bar, taskbar, app switching). New "apps" register through `runtime/lib/app-registry.ts` and `AppId` in `runtime/lib/types.ts`.
- `runtime/components/apps/{briefing,wiki,chat,submit}/` — the four learner apps. Each owns its own UI; shared logic goes through the store.
- `runtime/app/api/chat/route.ts` — persona chat. Builds a composite system prompt: `personaSystemPrompt` + a **Slack voice block** + `privateKnowledge` + `worldContext`. The Slack voice block is intentional: personas must write like Slack users (short, casual, no em dashes, no paragraphs). Do not weaken this.
- `runtime/app/api/judge/route.ts` — LLM-as-judge for deliverable grading. Handles two output formats (mock template vs real template); normalizes both into `{ passed, criteriaResults[], overallFeedback }`. If you change rubric output, update both branches.
- `runtime/app/api/wallpapers/route.ts` — serves files from `runtime/wallpaper/`. On Vercel this works because `runtime/` is the project root in deployment.
- `agents/solver-agent.md` — system prompt for an independent "solver" Claude that attempts the simulation as a learner would. Used to validate that a CoursePackage contains enough information for a human to succeed (sanity check on the author pipeline).
- `scripts/solver/*.js` — toolkit (`read-brief`, `list-wiki`, `interview`, `submit`, etc.) that the solver agent calls from inside its session container.

## Adding to the runtime

- New app/screen → add an `AppId` literal in `runtime/lib/types.ts`, add an entry in `runtime/lib/app-registry.ts`, register the component in `runtime/app/page.tsx`'s `APP_COMPONENTS` map.
- New domain data → add to `schema/course_package.ts` first, regenerate / hand-edit `runtime/public/course-package.json`, then read from `useCaseForgeStore((s) => s.coursePackage)`. Never hardcode the data in a component.
- Client bundle stores CoursePackage as `any` in `runtime/lib/store.ts` to keep zod out of the client bundle; runtime validation happens at load (currently trusted at the client; tighten with `CoursePackage.safeParse` if needed).

## Deployment

`vercel.json` at the repo root:
- `installCommand`: `npm install && npm --prefix runtime install` — installs both package trees.
- `buildCommand`: `npm --prefix runtime run build`.
- `outputDirectory`: `runtime/.next`.

The author pipeline never deploys — it runs locally against the Managed Agents API.
