# Graph Report - .  (2026-05-21)

## Corpus Check
- Large corpus: 99 files · ~544,835 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 332 nodes · 424 edges · 36 communities (27 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Notebook App & Zustand Store|Notebook App & Zustand Store]]
- [[_COMMUNITY_Desktop OS Shell|Desktop OS Shell]]
- [[_COMMUNITY_CoursePackage Schema|CoursePackage Schema]]
- [[_COMMUNITY_Architecture & Design Principles|Architecture & Design Principles]]
- [[_COMMUNITY_BigQuery Simulator App|BigQuery Simulator App]]
- [[_COMMUNITY_Chat Messaging Components|Chat Messaging Components]]
- [[_COMMUNITY_Insurance Domain Curriculum|Insurance Domain Curriculum]]
- [[_COMMUNITY_Meeting Recording UI|Meeting Recording UI]]
- [[_COMMUNITY_Chat App Root|Chat App Root]]
- [[_COMMUNITY_Solver Toolkit setup|Solver Toolkit: setup]]
- [[_COMMUNITY_Sheets Simulator App|Sheets Simulator App]]
- [[_COMMUNITY_Terminal Simulator App|Terminal Simulator App]]
- [[_COMMUNITY_Wallpapers API Route|Wallpapers API Route]]
- [[_COMMUNITY_Persona Picker UI|Persona Picker UI]]
- [[_COMMUNITY_Judge API Route|Judge API Route]]
- [[_COMMUNITY_Solver Session Bootstrap|Solver Session Bootstrap]]
- [[_COMMUNITY_Author Pipeline Upload|Author Pipeline: Upload]]
- [[_COMMUNITY_Solver Toolkit read-wiki|Solver Toolkit: read-wiki]]
- [[_COMMUNITY_Solver Toolkit list-personas|Solver Toolkit: list-personas]]
- [[_COMMUNITY_Taskbar|Taskbar]]
- [[_COMMUNITY_Solver Toolkit list-wiki|Solver Toolkit: list-wiki]]
- [[_COMMUNITY_Solver Toolkit interview|Solver Toolkit: interview]]
- [[_COMMUNITY_Solver Toolkit read-brief|Solver Toolkit: read-brief]]
- [[_COMMUNITY_Next.js Root Layout|Next.js Root Layout]]
- [[_COMMUNITY_Author Pipeline Download|Author Pipeline: Download]]
- [[_COMMUNITY_Solver Toolkit submit|Solver Toolkit: submit]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]
- [[_COMMUNITY_Persona Chat Doc & Slack Voice|Persona Chat Doc & Slack Voice]]
- [[_COMMUNITY_Judge API Doc|Judge API Doc]]

## God Nodes (most connected - your core abstractions)
1. `useCaseForgeStore` - 27 edges
2. `Virtusa Forward Deployed Engineer Programme` - 8 edges
3. `CoursePackage JSON contract` - 7 edges
4. `CaseForge Solver agent` - 7 edges
5. `Markdown()` - 6 edges
6. `AppId` - 6 edges
7. `Notebook App Design Spec` - 6 edges
8. `MeetingRecording()` - 5 edges
9. `Module 1: Insurance Domain Immersion & System Discovery` - 5 edges
10. `NotebookApp (fifth desktop app)` - 5 edges

## Surprising Connections (you probably didn't know these)
- `100% Task-Driven, Zero Lectures design principle` --semantically_similar_to--> `Two-system architecture (Author Pipeline + Learner Runtime)`  [INFERRED] [semantically similar]
  Virtusa_fde_curriculum - PDT Copy.docx.md → CLAUDE.md
- `CaseForge Solver agent` --semantically_similar_to--> `Four learner apps: Briefing, Wiki, Chat, Submit`  [INFERRED] [semantically similar]
  agents/solver-agent.md → CLAUDE.md
- `Never hardcode domain content principle` --rationale_for--> `Notebook App Design Spec`  [INFERRED]
  CLAUDE.md → docs/superpowers/specs/2026-05-20-notebook-app-design.md
- `Solver Agent (validation sanity check)` --references--> `CaseForge Solver agent`  [INFERRED]
  CLAUDE.md → agents/solver-agent.md
- `Policy Lifecycle Explorer sample notebook (M1.T1)` --references--> `Module 1: Insurance Domain Immersion & System Discovery`  [INFERRED]
  docs/superpowers/plans/2026-05-20-notebook-app.md → Virtusa_fde_curriculum - PDT Copy.docx.md

## Hyperedges (group relationships)
- **Curriculum -> CoursePackage -> Learner Runtime data flow** — virtusa_fde_curriculum_programme, claude_md_author_pipeline, claude_md_coursepackage_contract, claude_md_learner_runtime [EXTRACTED 1.00]
- **Notebook app spec/plan/implementation triad** — notebook_app_design_design_spec, notebook_app_plan_implementation_plan, notebook_app_plan_notebook_app_component, notebook_app_design_notebook_schema_types, notebook_app_plan_notebook_overlay_state [EXTRACTED 1.00]
- **Solver agent validates CoursePackage authoring sufficiency** — solver_agent_caseforge_solver, solver_agent_toolkit_scripts, claude_md_coursepackage_contract, claude_md_author_pipeline [EXTRACTED 1.00]

## Communities (36 total, 9 thin omitted)

### Community 0 - "Notebook App & Zustand Store"
Cohesion: 0.08
Nodes (30): BriefingApp(), highlight(), CaseForgeState, CellRunState, CoursePackageData, NotebookOverlay, TaskData, useCaseForgeStore (+22 more)

### Community 1 - "Desktop OS Shell"
Cohesion: 0.06
Nodes (28): Bounds, clamp(), clampBounds(), clampContextMenuPosition(), DEFAULT_VIEWPORT, Desktop(), DESKTOP_CONTEXT_MENU, DesktopContextMenuState (+20 more)

### Community 2 - "CoursePackage Schema"
Cohesion: 0.07
Nodes (29): CoursePackage, Dataset, Deliverable, Email, Fixtures, GlossaryEntry, HardCriterion, InWorldDocument (+21 more)

### Community 3 - "Architecture & Design Principles"
Cohesion: 0.1
Nodes (29): Author Pipeline (Managed Agents SDK, tsx scripts), Four learner apps: Briefing, Wiki, Chat, Submit, CoursePackage JSON contract, Desktop OS shell (windowed apps), Learner Runtime (Next.js 14 App Router), Anthropic Managed Agents beta (managed-agents-2026-04-01), Never hardcode domain content principle, Schema-first design principle (+21 more)

### Community 4 - "BigQuery Simulator App"
Cohesion: 0.09
Nodes (10): APP_COMPONENTS, HomePage(), DatasetDef, DATASETS, QueryTab, SQL_KEYWORDS, TableDef, TABS (+2 more)

### Community 5 - "Chat Messaging Components"
Cohesion: 0.11
Nodes (14): formatTime(), getInitials(), MessageBubble(), MessageBubbleProps, AppSlotProps, SidebarProps, AppId, AppRegistryEntry (+6 more)

### Community 6 - "Insurance Domain Curriculum"
Cohesion: 0.19
Nodes (14): Policy Lifecycle Explorer sample notebook (M1.T1), ACORD XML/JSON insurance data standard, Regulatory compliance (NAIC, GDPR/CCPA, SOC 2), FNOL (First Notice of Loss), Guidewire InsuranceSuite (PolicyCenter, ClaimCenter, BillingCenter), Meridian Insurance (fictional client), Module 1: Insurance Domain Immersion & System Discovery, Module 2: Rapid Prototyping on Legacy Insurance Systems (+6 more)

### Community 7 - "Meeting Recording UI"
Cohesion: 0.24
Nodes (10): colorFor(), formatRecordedAt(), formatTime(), gridClass(), initials(), MeetingRecording(), ParticipantTile(), Props (+2 more)

### Community 8 - "Chat App Root"
Cohesion: 0.24
Nodes (5): AVATAR_COLORS, ChatApp(), getInitials(), ChatInput(), ChatInputProps

### Community 9 - "Solver Toolkit: setup"
Cohesion: 0.22
Nodes (7): { execSync }, EXPECTED_FILES, found, fs, path, pkg, UPLOAD_DIRS

### Community 10 - "Sheets Simulator App"
Cohesion: 0.33
Nodes (4): colLetter(), Sheet, SHEETS, SheetsApp()

### Community 11 - "Terminal Simulator App"
Cohesion: 0.33
Nodes (5): FILES, HELP_TEXT, normalize(), resolvePath(), TerminalLine

### Community 12 - "Wallpapers API Route"
Cohesion: 0.47
Nodes (5): GET(), getContentType(), getWallpaperNames(), SUPPORTED_EXTENSIONS, WALLPAPER_DIR

### Community 13 - "Persona Picker UI"
Cohesion: 0.33
Nodes (3): AVATAR_COLORS, PersonaCardData, PersonaPickerProps

### Community 14 - "Judge API Route"
Cohesion: 0.4
Nodes (3): IMAGE_EXTENSIONS, JudgeRequestBody, MEDIA_TYPE_MAP

### Community 15 - "Solver Session Bootstrap"
Cohesion: 0.4
Nodes (3): apiKeyTmpPath, client, FILES

### Community 16 - "Author Pipeline: Upload"
Cohesion: 0.5
Nodes (4): client, FILES, main(), resolveEnvironmentId()

### Community 17 - "Solver Toolkit: read-wiki"
Cohesion: 0.4
Nodes (4): fs, log, page, pkg

### Community 18 - "Solver Toolkit: list-personas"
Cohesion: 0.4
Nodes (4): fs, linked, log, pkg

### Community 19 - "Taskbar"
Cohesion: 0.67
Nodes (3): formatTime(), TaskBar(), TaskBarProps

### Community 20 - "Solver Toolkit: list-wiki"
Cohesion: 0.5
Nodes (3): fs, log, pkg

### Community 22 - "Solver Toolkit: read-brief"
Cohesion: 0.5
Nodes (3): fs, log, pkg

## Knowledge Gaps
- **141 isolated node(s):** `config`, `nextConfig`, `config`, `metadata`, `APP_COMPONENTS` (+136 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useCaseForgeStore` connect `Notebook App & Zustand Store` to `Chat App Root`, `Desktop OS Shell`, `BigQuery Simulator App`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `AppId` connect `Chat Messaging Components` to `Notebook App & Zustand Store`, `Desktop OS Shell`, `BigQuery Simulator App`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `Virtusa Forward Deployed Engineer Programme` connect `Insurance Domain Curriculum` to `Architecture & Design Principles`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `CaseForge Solver agent` (e.g. with `Solver Agent (validation sanity check)` and `Four learner apps: Briefing, Wiki, Chat, Submit`) actually correct?**
  _`CaseForge Solver agent` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `config`, `nextConfig`, `config` to the rest of the system?**
  _141 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Notebook App & Zustand Store` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Desktop OS Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._