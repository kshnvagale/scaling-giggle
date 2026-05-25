# Graph Report - /Users/kshnvagale/Documents/Ai/Scaler/CaseForge/game  (2026-05-25)

## Corpus Check
- Large corpus: 106 files · ~552,122 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 436 nodes · 572 edges · 38 communities (27 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.87)
- Token cost: 110,000 input · 12,447 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Chat & Briefing UI|Chat & Briefing UI]]
- [[_COMMUNITY_Desktop OS Shell|Desktop OS Shell]]
- [[_COMMUNITY_Meridian Insurance Domain (M1.T1)|Meridian Insurance Domain (M1.T1)]]
- [[_COMMUNITY_Two-System Architecture|Two-System Architecture]]
- [[_COMMUNITY_Runtime Apps & APIs|Runtime Apps & APIs]]
- [[_COMMUNITY_CoursePackage Schema|CoursePackage Schema]]
- [[_COMMUNITY_App Registry & Page Shell|App Registry & Page Shell]]
- [[_COMMUNITY_Intro Onboarding|Intro Onboarding]]
- [[_COMMUNITY_BigQuery App|BigQuery App]]
- [[_COMMUNITY_Meeting Recording Player|Meeting Recording Player]]
- [[_COMMUNITY_Solver setup|Solver: setup]]
- [[_COMMUNITY_Sheets App|Sheets App]]
- [[_COMMUNITY_Wallpapers API|Wallpapers API]]
- [[_COMMUNITY_Persona Picker|Persona Picker]]
- [[_COMMUNITY_Judge API (Grading)|Judge API (Grading)]]
- [[_COMMUNITY_Solver Session Creator|Solver Session Creator]]
- [[_COMMUNITY_Upload-Session Script|Upload-Session Script]]
- [[_COMMUNITY_Solver read-wiki|Solver: read-wiki]]
- [[_COMMUNITY_Solver list-personas|Solver: list-personas]]
- [[_COMMUNITY_TaskBar|TaskBar]]
- [[_COMMUNITY_Solver list-wiki|Solver: list-wiki]]
- [[_COMMUNITY_Solver interview|Solver: interview]]
- [[_COMMUNITY_Solver read-brief|Solver: read-brief]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_Download-Package Script|Download-Package Script]]
- [[_COMMUNITY_Solver submit|Solver: submit]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]
- [[_COMMUNITY_Persona Voice System|Persona Voice System]]
- [[_COMMUNITY_Misc (singleton)|Misc (singleton)]]
- [[_COMMUNITY_Misc (singleton)|Misc (singleton)]]
- [[_COMMUNITY_Misc (singleton)|Misc (singleton)]]

## God Nodes (most connected - your core abstractions)
1. `useCaseForgeStore` - 35 edges
2. `CaseForge Solver Agent` - 11 edges
3. `Meridian Policy Lifecycle Process Map (M1.T1 deliverable)` - 11 edges
4. `Virtusa FDE 14-Week Curriculum` - 9 edges
5. `useReducedMotion()` - 8 edges
6. `Virtusa Forward Deployed Engineer Programme` - 8 edges
7. `Notebook App (planned 5th desktop app)` - 8 edges
8. `Notebook App Design Spec` - 8 edges
9. `AppId` - 7 edges
10. `Module 1: Insurance Domain Immersion & System Discovery` - 7 edges

## Surprising Connections (you probably didn't know these)
- `100% Task-Driven, Zero Lectures design principle` --semantically_similar_to--> `Two-system architecture (Author Pipeline + Learner Runtime)`  [INFERRED] [semantically similar]
  Virtusa_fde_curriculum - PDT Copy.docx.md → CLAUDE.md
- `100% Task-Driven, Zero Lectures principle` --semantically_similar_to--> `Meridian Policy Lifecycle Process Map (M1.T1 deliverable)`  [INFERRED] [semantically similar]
  Virtusa_fde_curriculum - PDT Copy.docx.md → packages/deliverable.md
- `CaseForge Solver agent` --semantically_similar_to--> `Four learner apps: Briefing, Wiki, Chat, Submit`  [INFERRED] [semantically similar]
  agents/solver-agent.md → CLAUDE.md
- `Zero-prop component pattern` --semantically_similar_to--> `Zustand notebookState overlay (cellOrder, userCells, edits, runStates)`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/superpowers/plans/2026-05-20-notebook-app.md
- `Honest simulation semantics (no faked REPL)` --semantically_similar_to--> `Slack voice persona system prompt`  [INFERRED] [semantically similar]
  docs/superpowers/specs/2026-05-20-notebook-app-design.md → CLAUDE.md

## Hyperedges (group relationships)
- **Curriculum -> CoursePackage -> Learner Runtime data flow** — virtusa_fde_curriculum_programme, claude_md_author_pipeline, claude_md_coursepackage_contract, claude_md_learner_runtime [EXTRACTED 1.00]
- **Solver agent validates CoursePackage authoring sufficiency** — solver_agent_caseforge_solver, solver_agent_toolkit_scripts, claude_md_coursepackage_contract, claude_md_author_pipeline [EXTRACTED 1.00]
- **Notebook app spec/plan/implementation triad** — notebook_app_design_design_spec, notebook_app_plan_implementation_plan, notebook_app_plan_notebook_app_component, notebook_app_design_notebook_schema_types, notebook_app_plan_notebook_overlay_state [EXTRACTED 1.00]
- **CoursePackage JSON as load-bearing contract between systems** — claude_md_course_package_schema, claude_md_author_pipeline, claude_md_learner_runtime, claude_md_course_package_json, claude_md_validate_script [EXTRACTED 1.00]
- **Desktop OS Shell with five learner apps (Briefing, Wiki, Chat, Submit, Notebook)** — claude_md_desktop_shell, claude_md_briefing_app, claude_md_wiki_app, claude_md_chat_app, claude_md_submit_app, notebook_plan_app [EXTRACTED 1.00]
- **Solver agent validates CoursePackage via wiki + persona interview + submit** — solver_agent_solver, solver_agent_read_wiki, solver_agent_interview, solver_agent_submit, claude_md_course_package_json [EXTRACTED 1.00]

## Communities (38 total, 11 thin omitted)

### Community 0 - "Chat & Briefing UI"
Cohesion: 0.05
Nodes (44): BriefingApp(), AVATAR_COLORS, ChatApp(), getInitials(), ChatInput(), ChatInputProps, formatTime(), getInitials() (+36 more)

### Community 1 - "Desktop OS Shell"
Cohesion: 0.05
Nodes (37): Bounds, clamp(), clampBounds(), clampContextMenuPosition(), DEFAULT_VIEWPORT, Desktop(), DESKTOP_CONTEXT_MENU, DesktopContextMenuState (+29 more)

### Community 2 - "Meridian Insurance Domain (M1.T1)"
Cohesion: 0.07
Nodes (39): ACORD XML version mismatch (~12% rating error rate), BillingCenter, ClaimCenter, CT/CO Cancellation Notice Compliance Gap (Q1 2026), Nightly DataStage Sync Window Gap (24-48h lag), Dual-PAS Architecture (Mainframe + Guidewire PolicyCenter), Legacy Mainframe PAS, Task M1.T1 (Policy Lifecycle Mapping) (+31 more)

### Community 3 - "Two-System Architecture"
Cohesion: 0.07
Nodes (36): Author Pipeline (Managed Agents SDK, tsx scripts), Four learner apps: Briefing, Wiki, Chat, Submit, runtime/public/course-package.json (runtime fixture), CoursePackage JSON contract, Desktop OS shell (windowed apps), npm run download, Learner Runtime (Next.js 14 App Router), Anthropic Managed Agents beta (managed-agents-2026-04-01) (+28 more)

### Community 4 - "Runtime Apps & APIs"
Cohesion: 0.06
Nodes (35): Briefing App, Chat API route (app/api/chat), Chat App, CoursePackage Schema (load-bearing contract), Desktop OS Shell (Desktop.tsx), Judge API route (app/api/judge), Slack voice persona system prompt, npm run solver (+27 more)

### Community 5 - "CoursePackage Schema"
Cohesion: 0.07
Nodes (29): CoursePackage, Dataset, Deliverable, Email, Fixtures, GlossaryEntry, HardCriterion, InWorldDocument (+21 more)

### Community 6 - "App Registry & Page Shell"
Cohesion: 0.08
Nodes (17): APP_COMPONENTS, HomePage(), AppSlotProps, SidebarProps, IntroGate(), APP_REGISTRY, loadCoursePackage(), AppId (+9 more)

### Community 7 - "Intro Onboarding"
Cohesion: 0.18
Nodes (14): Stage2Lens(), Stage3Workspace(), Stage4People(), Stage5Clock(), WORKSPACE_ICONS, IntroOnboarding(), IntroPortal(), PrimaryButton (+6 more)

### Community 8 - "BigQuery App"
Cohesion: 0.13
Nodes (6): DatasetDef, DATASETS, QueryTab, SQL_KEYWORDS, TableDef, TABS

### Community 9 - "Meeting Recording Player"
Cohesion: 0.24
Nodes (10): colorFor(), formatRecordedAt(), formatTime(), gridClass(), initials(), MeetingRecording(), ParticipantTile(), Props (+2 more)

### Community 10 - "Solver: setup"
Cohesion: 0.22
Nodes (7): { execSync }, EXPECTED_FILES, found, fs, path, pkg, UPLOAD_DIRS

### Community 11 - "Sheets App"
Cohesion: 0.33
Nodes (4): colLetter(), Sheet, SHEETS, SheetsApp()

### Community 12 - "Wallpapers API"
Cohesion: 0.47
Nodes (5): GET(), getContentType(), getWallpaperNames(), SUPPORTED_EXTENSIONS, WALLPAPER_DIR

### Community 13 - "Persona Picker"
Cohesion: 0.33
Nodes (3): AVATAR_COLORS, PersonaCardData, PersonaPickerProps

### Community 14 - "Judge API (Grading)"
Cohesion: 0.4
Nodes (3): IMAGE_EXTENSIONS, JudgeRequestBody, MEDIA_TYPE_MAP

### Community 15 - "Solver Session Creator"
Cohesion: 0.4
Nodes (3): apiKeyTmpPath, client, FILES

### Community 16 - "Upload-Session Script"
Cohesion: 0.5
Nodes (4): client, FILES, main(), resolveEnvironmentId()

### Community 17 - "Solver: read-wiki"
Cohesion: 0.4
Nodes (4): fs, log, page, pkg

### Community 18 - "Solver: list-personas"
Cohesion: 0.4
Nodes (4): fs, linked, log, pkg

### Community 19 - "TaskBar"
Cohesion: 0.67
Nodes (3): formatTime(), TaskBar(), TaskBarProps

### Community 20 - "Solver: list-wiki"
Cohesion: 0.5
Nodes (3): fs, log, pkg

### Community 22 - "Solver: read-brief"
Cohesion: 0.5
Nodes (3): fs, log, pkg

## Knowledge Gaps
- **193 isolated node(s):** `config`, `nextConfig`, `config`, `metadata`, `APP_COMPONENTS` (+188 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useCaseForgeStore` connect `Chat & Briefing UI` to `Desktop OS Shell`, `App Registry & Page Shell`, `Intro Onboarding`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `Two-system architecture (Author Pipeline + Learner Runtime)` connect `Two-System Architecture` to `Runtime Apps & APIs`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Notebook App (planned 5th desktop app)` connect `Runtime Apps & APIs` to `Meridian Insurance Domain (M1.T1)`, `Two-System Architecture`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `config`, `nextConfig`, `config` to the rest of the system?**
  _193 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Chat & Briefing UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Desktop OS Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Meridian Insurance Domain (M1.T1)` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._