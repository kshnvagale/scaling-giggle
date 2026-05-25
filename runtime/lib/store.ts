"use client";

import { create } from "zustand";
import type {
  AppId,
  ChatMessage,
  JudgeResult,
  NotebookOutput,
  SessionTimerState,
} from "./types";
import type { PyodideKernel } from "@/lib/pyodide-kernel";

// We store CoursePackage as `any` to avoid importing the Zod runtime in client bundle.
// Type safety is enforced at load time via course-loader.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CoursePackageData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TaskData = any;

export type CellRunState = "idle" | "running" | "done";

export interface NotebookOverlay {
  cellOrder: string[];
  userCells: Record<string, { type: "code" | "markdown"; source: string }>;
  cellSourceEdits: Record<string, string>;
  cellRunStates: Record<string, CellRunState>;
}

export interface CaseForgeState {
  // Course data (loaded once)
  coursePackage: CoursePackageData | null;
  currentTask: TaskData | null;

  // Desktop shell
  activeApp: AppId;
  setActiveApp: (app: AppId) => void;
  // One-shot request for the Desktop window manager to open a (possibly
  // closed/minimized) window. Cross-app coordination (e.g. Notebook asking
  // Desktop to open Chat after Submit-for-Review). Desktop reads & clears.
  pendingOpenWindow: AppId | null;
  requestOpenWindow: (app: AppId) => void;
  clearPendingOpenWindow: () => void;
  // Last-read timestamp per persona thread. Used to compute unread badges
  // on the Chat dock icon and the persona row in the chat sidebar.
  chatLastReadAt: Record<string, number>;
  markPersonaRead: (personaId: string) => void;

  // Wiki
  activeWikiSlug: string | null;
  setActiveWikiSlug: (slug: string | null) => void;

  // Chat
  activePersonaId: string | null;
  setActivePersonaId: (id: string | null) => void;
  chatHistories: Record<string, ChatMessage[]>;
  addChatMessage: (personaId: string, message: ChatMessage) => void;

  // Submit
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
  judgeResult: JudgeResult | null;
  setJudgeResult: (result: JudgeResult | null) => void;
  isJudging: boolean;
  setIsJudging: (v: boolean) => void;
  attemptCount: number;
  incrementAttemptCount: () => void;

  // Timer
  timer: SessionTimerState | null;
  startTimer: (durationMinutes: number) => void;
  expireTimer: () => void;

  // Notebook
  activeNotebookSlug: string | null;
  setActiveNotebookSlug: (slug: string | null) => void;
  notebookState: Record<string, NotebookOverlay>;
  initNotebookOverlay: (slug: string, authoredCellIds: string[]) => void;
  addCell: (slug: string, afterCellId: string | null, type: "code" | "markdown") => void;
  deleteCell: (slug: string, cellId: string) => void;
  moveCell: (slug: string, cellId: string, direction: "up" | "down") => void;
  convertCellType: (
    slug: string,
    cellId: string,
    nextType: "code" | "markdown",
    currentSource: string,
  ) => void;
  editCellSource: (slug: string, cellId: string, source: string) => void;
  runCell: (slug: string, cellId: string) => void;
  runAll: (slug: string, codeCellIds: string[]) => void;

  // Intro onboarding
  introOpen: boolean;
  openIntro: () => void;
  closeIntro: () => void;

  // Netflix sim — Pyodide kernel
  pyodideKernel: PyodideKernel | null;
  pyodideBootStatus: "idle" | "booting" | "ready" | "error";
  pyodideBootError: string | null;
  cellLiveOutputs: Record<string, NotebookOutput[]>;
  bootPyodide: () => Promise<void>;
  setCellLiveOutputs: (cellId: string, outputs: NotebookOutput[]) => void;

  // Netflix sim — Submit-for-Review loop
  reviewStatus: "idle" | "reviewing" | "error";
  reviewError: string | null;
  reviewCount: number;
  lastReviewScore: number | null;
  submissionFinalized: boolean;
  submitForReview: () => Promise<void>;
  finalizeSubmission: () => void;
  dismissReviewError: () => void;

  // Initialization
  loadCoursePackage: (pkg: CoursePackageData, taskId?: string) => void;

  // Reset submit state for retry
  resetSubmission: () => void;

  // macOS desktop preferences
  desktopTheme: "kraft" | "macos-light" | "macos-dark";
  setDesktopTheme: (theme: "kraft" | "macos-light" | "macos-dark") => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
  controlCenterOpen: boolean;
  setControlCenterOpen: (open: boolean) => void;
  toggleControlCenter: () => void;
}

const INTRO_SEEN_KEY = "caseforge:intro-seen";

// Convert the authored MockFeedbackState[] into rubric tiers the AI judge can anchor to.
// Each state's `score` defines the tier centre; we widen by ~halfway to the adjacent state.
function buildRubricTiers(
  mockFeedback: Array<{ id: string; score?: number; feedback: string }>,
): Array<{ scoreMin: number; scoreMax: number; label: string; exampleFeedback: string }> {
  const sorted = mockFeedback
    .filter((s) => typeof s.score === "number")
    .sort((a, b) => (a.score as number) - (b.score as number));
  if (sorted.length === 0) {
    // No scored states — return a single permissive tier so the LLM still works.
    return [{ scoreMin: 0, scoreMax: 100, label: "any", exampleFeedback: mockFeedback[0]?.feedback ?? "" }];
  }
  return sorted.map((state, idx) => {
    const center = state.score as number;
    const prev = idx > 0 ? (sorted[idx - 1].score as number) : -1;
    const next = idx < sorted.length - 1 ? (sorted[idx + 1].score as number) : 101;
    const scoreMin = idx === 0 ? 0 : Math.floor((prev + center) / 2) + 1;
    const scoreMax = idx === sorted.length - 1 ? 100 : Math.floor((center + next) / 2);
    return {
      scoreMin: Math.max(0, scoreMin),
      scoreMax: Math.min(100, scoreMax),
      label: state.id,
      exampleFeedback: state.feedback,
    };
  });
}

export const useCaseForgeStore = create<CaseForgeState>()((set, get) => ({
  // Initial values
  coursePackage: null,
  currentTask: null,
  activeApp: "briefing",
  pendingOpenWindow: null,
  chatLastReadAt: {},
  activeWikiSlug: null,
  activePersonaId: null,
  chatHistories: {},
  uploadedFile: null,
  judgeResult: null,
  isJudging: false,
  attemptCount: 0,
  timer: null,
  activeNotebookSlug: null,
  notebookState: {},
  introOpen: false,
  desktopTheme: "kraft",
  isOnline: true,
  volume: 80,
  controlCenterOpen: false,

  // Netflix sim — Pyodide kernel
  pyodideKernel: null,
  pyodideBootStatus: "idle",
  pyodideBootError: null,
  cellLiveOutputs: {},

  // Netflix sim — Submit-for-Review loop
  reviewStatus: "idle",
  reviewError: null,
  reviewCount: 0,
  lastReviewScore: null,
  submissionFinalized: false,

  // Desktop
  setActiveApp: (app) => set({ activeApp: app }),
  requestOpenWindow: (app) => set({ pendingOpenWindow: app }),
  clearPendingOpenWindow: () => set({ pendingOpenWindow: null }),
  markPersonaRead: (personaId) =>
    set((s) => ({ chatLastReadAt: { ...s.chatLastReadAt, [personaId]: Date.now() } })),
  setDesktopTheme: (theme) => set({ desktopTheme: theme }),
  setIsOnline: (online) => set({ isOnline: online }),
  setVolume: (volume) => set({ volume }),
  setControlCenterOpen: (open) => set({ controlCenterOpen: open }),
  toggleControlCenter: () => set((state) => ({ controlCenterOpen: !state.controlCenterOpen })),

  // Intro onboarding
  openIntro: () => set({ introOpen: true }),
  closeIntro: () => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(INTRO_SEEN_KEY, "true");
      } catch {
        // sessionStorage may be unavailable (e.g. private browsing edge cases)
      }
    }
    set({ introOpen: false });
  },

  // Wiki
  setActiveWikiSlug: (slug) => set({ activeWikiSlug: slug }),

  // Chat
  setActivePersonaId: (id) => set({ activePersonaId: id }),
  addChatMessage: (personaId, message) =>
    set((state) => ({
      chatHistories: {
        ...state.chatHistories,
        [personaId]: [...(state.chatHistories[personaId] ?? []), message],
      },
    })),

  // Submit
  setUploadedFile: (file) => set({ uploadedFile: file }),
  setJudgeResult: (result) => set({ judgeResult: result }),
  setIsJudging: (v) => set({ isJudging: v }),
  incrementAttemptCount: () =>
    set((state) => ({ attemptCount: state.attemptCount + 1 })),

  // Timer
  startTimer: (durationMinutes) =>
    set({
      timer: {
        startedAt: Date.now(),
        durationMinutes,
        isExpired: false,
      },
    }),
  expireTimer: () =>
    set((state) => ({
      timer: state.timer ? { ...state.timer, isExpired: true } : null,
    })),

  // Notebook
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
              [newId]: {
                type,
                source: type === "code" ? "" : "_Write markdown here…_",
              },
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

  convertCellType: (slug, cellId, nextType, currentSource) =>
    set((state) => {
      const overlay = state.notebookState[slug];
      if (!overlay) return {};
      const { [cellId]: _drop, ...restEdits } = overlay.cellSourceEdits;
      return {
        notebookState: {
          ...state.notebookState,
          [slug]: {
            ...overlay,
            userCells: {
              ...overlay.userCells,
              [cellId]: { type: nextType, source: currentSource },
            },
            cellSourceEdits: restEdits,
          },
        },
      };
    }),

  editCellSource: (slug, cellId, source) =>
    set((state) => {
      const overlay = state.notebookState[slug];
      if (!overlay) return {};
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
        useCaseForgeStore.getState().runCell(slug, cellId);
      }, i * 700);
    });
  },

  // Netflix sim — Pyodide kernel
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

  setCellLiveOutputs: (cellId, outputs) =>
    set((s) => ({
      cellLiveOutputs: { ...s.cellLiveOutputs, [cellId]: outputs },
    })),

  // Netflix sim — Submit-for-Review loop
  dismissReviewError: () => set({ reviewStatus: "idle", reviewError: null }),

  finalizeSubmission: () => set({ submissionFinalized: true }),

  submitForReview: async () => {
    const state = get();
    if (state.reviewStatus === "reviewing" || state.submissionFinalized) return;

    const pkg = state.coursePackage;
    const task = state.currentTask ?? pkg?.modules?.[0]?.tasks?.[0];
    if (!pkg || !task) {
      set({ reviewStatus: "error", reviewError: "no active case loaded" });
      return;
    }

    // Resolve the active notebook (first one linked to the current task).
    const notebooks = pkg.fixtures?.notebooks ?? [];
    const notebook =
      notebooks.find((nb: any) => nb.linkedTasks?.includes(task.id)) ?? notebooks[0];
    if (!notebook) {
      set({ reviewStatus: "error", reviewError: "no notebook to submit" });
      return;
    }

    // Gather current cell sources from store overlay (live edits) merged with authored.
    const overlay = state.notebookState?.[notebook.slug];
    const cellOrder: string[] = overlay?.cellOrder ?? notebook.cells.map((c: any) => c.id);
    const submittedCells = cellOrder.map((cellId) => {
      const authored = notebook.cells.find((c: any) => c.id === cellId);
      const userCell = overlay?.userCells?.[cellId];
      const editedSource = overlay?.cellSourceEdits?.[cellId];
      const type = userCell?.type ?? authored?.type ?? "code";
      const source = editedSource ?? userCell?.source ?? authored?.source ?? "";
      return { type, source } as { type: "code" | "markdown"; source: string };
    });

    // Resolve the reviewer persona (first one in mockFeedback, default "priya").
    const deliverable: any = task.deliverable ?? {};
    const mockFeedback: any[] = deliverable.mockFeedback ?? [];
    const reviewerId: string = mockFeedback[0]?.fromPersonaId ?? "priya";
    const reviewer = pkg.personas?.find((p: any) => p.id === reviewerId);
    const completionThreshold: number = deliverable.completionScoreThreshold ?? 80;

    set({ reviewStatus: "reviewing", reviewError: null });

    // Try the AI judge first; fall back to the deterministic mock judge on any failure.
    let result: { score: number; feedback: string } | null = null;
    try {
      const rubricTiers = buildRubricTiers(mockFeedback);
      const res = await fetch("/api/judge-notebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notebookCells: submittedCells,
          persona: {
            name: reviewer?.name ?? reviewerId,
            systemPrompt: reviewer?.systemPrompt ?? "",
          },
          rubricTiers,
          caseContext: task.brief?.slice(0, 800),
          worldContext: pkg.world?.clientProfile?.slice(0, 600),
          completionThreshold,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { score?: number; feedback?: string };
        if (typeof data.score === "number" && typeof data.feedback === "string") {
          result = { score: data.score, feedback: data.feedback };
        }
      }
    } catch {
      // network error → fall through to mock judge
    }

    if (!result) {
      // Deterministic fallback using the mock judge cascade.
      const { mockJudge } = await import("@/lib/mock-judge");
      const sourceConcat = submittedCells.map((c) => c.source.toLowerCase()).join("\n");
      const matched = mockJudge(
        { insightsText: "", notebookCellCount: submittedCells.length, notebookSourceConcat: sourceConcat },
        mockFeedback,
      );
      if (matched) {
        result = {
          score: typeof matched.score === "number" ? matched.score : 50,
          feedback: matched.feedback,
        };
      } else {
        result = { score: 50, feedback: "got your draft, but i can't review it right now. try again in a sec?" };
      }
    }

    // Deliver feedback as a chat message in the reviewer's thread.
    const { feedback, score } = result;
    const reviewCount = state.reviewCount + 1;
    set((s) => {
      const history = s.chatHistories[reviewerId] ?? [];
      const newMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        personaId: reviewerId,
        content: feedback,
        timestamp: Date.now(),
        meta: { kind: "review", round: reviewCount, score },
      };
      return {
        chatHistories: { ...s.chatHistories, [reviewerId]: [...history, newMsg] },
        reviewStatus: "idle" as const,
        reviewCount,
        lastReviewScore: score,
      };
    });

    // If at or above threshold, finalize the case.
    if (score >= completionThreshold) {
      // Wait a beat so the user sees the feedback message land before the overlay.
      setTimeout(() => set({ submissionFinalized: true }), 1500);
    }
  },

  // Init
  loadCoursePackage: (pkg, taskId) => {
    const task = taskId
      ? pkg.modules.flatMap((m: any) => m.tasks).find((t: any) => t.id === taskId)
      : pkg.modules[0]?.tasks[0];
    set({
      coursePackage: pkg,
      currentTask: task ?? null,
      activeApp: "briefing",
      pendingOpenWindow: null,
      chatLastReadAt: {},
      activeWikiSlug: null,
      activePersonaId: null,
      chatHistories: {},
      uploadedFile: null,
      judgeResult: null,
      isJudging: false,
      attemptCount: 0,
      activeNotebookSlug: null,
      notebookState: {},
      pyodideKernel: null,
      pyodideBootStatus: "idle",
      pyodideBootError: null,
      cellLiveOutputs: {},
      reviewStatus: "idle",
      reviewError: null,
      reviewCount: 0,
      lastReviewScore: null,
      submissionFinalized: false,
    });
  },

  // Reset for retry
  resetSubmission: () =>
    set({
      uploadedFile: null,
      judgeResult: null,
      isJudging: false,
    }),
}));
