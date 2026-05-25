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

  // Netflix sim — iterative submit
  insightsDraft: string;
  feedbackHistory: Array<{
    id: string;
    round: number;
    feedback: string;
    fromPersonaId: string;
    at: number;
  }>;
  submissionFinalized: boolean;
  setInsightsDraft: (text: string) => void;
  appendFeedback: (entry: {
    round: number;
    feedback: string;
    fromPersonaId: string;
  }) => void;
  finalizeSubmission: () => void;

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

export const useCaseForgeStore = create<CaseForgeState>()((set, get) => ({
  // Initial values
  coursePackage: null,
  currentTask: null,
  activeApp: "briefing",
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

  // Netflix sim — iterative submit
  insightsDraft: "",
  feedbackHistory: [],
  submissionFinalized: false,

  // Desktop
  setActiveApp: (app) => set({ activeApp: app }),
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

  // Netflix sim — iterative submit
  setInsightsDraft: (text) => set({ insightsDraft: text }),

  appendFeedback: (entry) =>
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

  // Init
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
      pyodideKernel: null,
      pyodideBootStatus: "idle",
      pyodideBootError: null,
      cellLiveOutputs: {},
      insightsDraft: "",
      feedbackHistory: [],
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
