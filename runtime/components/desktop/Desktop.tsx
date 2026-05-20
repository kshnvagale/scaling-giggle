"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCaseForgeStore } from "@/lib/store";
import { isImageDark } from "@/lib/imageUtils";
import type { AppId, AppRegistryEntry } from "@/lib/types";
import { MenuBar } from "./MenuBar";
import { WindowChrome } from "./WindowChrome";

interface DesktopProps {
  appRegistry: AppRegistryEntry[];
  appComponents: Record<AppId, React.ComponentType>;
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

interface LayoutMetrics {
  leftRailWidth: number;
  rightRailWidth: number;
  dockHeight: number;
  compact: boolean;
}

interface DesktopWindowState extends Bounds {
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  restoreBounds: Bounds | null;
}

interface WindowPreset {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  xBias: number;
  yBias: number;
  open: boolean;
}

interface WallpaperEntry {
  id: number;
  name: string;
  url: string;
}

interface DesktopContextMenuState {
  x: number;
  y: number;
}

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type PointerInteraction =
  | {
      kind: "move";
      appId: AppId;
      startPointerX: number;
      startPointerY: number;
      startBounds: Bounds;
    }
  | {
      kind: "resize";
      appId: AppId;
      direction: ResizeDirection;
      startPointerX: number;
      startPointerY: number;
      startBounds: Bounds;
    };

const MENU_BAR_HEIGHT = 32;
const DESKTOP_MARGIN = 18;
const DEFAULT_VIEWPORT: ViewportSize = { width: 1440, height: 860 };
const WINDOW_TRANSITION =
  "left 220ms cubic-bezier(0.16, 1, 0.3, 1), top 220ms cubic-bezier(0.16, 1, 0.3, 1), width 220ms cubic-bezier(0.16, 1, 0.3, 1), height 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 160ms ease, filter 220ms cubic-bezier(0.16, 1, 0.3, 1)";
const WINDOW_INTERACTION_TRANSITION =
  "transform 180ms cubic-bezier(0.16, 1, 0.3, 1), opacity 160ms ease, filter 220ms cubic-bezier(0.16, 1, 0.3, 1)";
const WINDOW_LIFT_SCALE = 1.012;
const WINDOW_LIFT_OFFSET = -8;

const RESIZE_CURSOR: Record<ResizeDirection, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
};

const WINDOW_PRESETS: Record<AppId, WindowPreset> = {
  briefing: {
    width: 920,
    height: 660,
    minWidth: 700,
    minHeight: 460,
    xBias: 0.08,
    yBias: 0.04,
    open: true,
  },
  wiki: {
    width: 1020,
    height: 700,
    minWidth: 780,
    minHeight: 520,
    xBias: 0.18,
    yBias: 0.08,
    open: false,
  },
  chat: {
    width: 940,
    height: 640,
    minWidth: 740,
    minHeight: 500,
    xBias: 0.26,
    yBias: 0.12,
    open: false,
  },
  sheets: {
    width: 1080,
    height: 700,
    minWidth: 820,
    minHeight: 520,
    xBias: 0.22,
    yBias: 0.1,
    open: false,
  },
  bigquery: {
    width: 1160,
    height: 740,
    minWidth: 880,
    minHeight: 560,
    xBias: 0.3,
    yBias: 0.14,
    open: false,
  },
  terminal: {
    width: 820,
    height: 520,
    minWidth: 540,
    minHeight: 360,
    xBias: 0.38,
    yBias: 0.18,
    open: false,
  },
  notebook: {
    width: 1100,
    height: 720,
    minWidth: 820,
    minHeight: 540,
    xBias: 0.34,
    yBias: 0.22,
    open: false,
  },
  submit: {
    width: 820,
    height: 600,
    minWidth: 660,
    minHeight: 440,
    xBias: 0.2,
    yBias: 0.1,
    open: false,
  },
};

const WALLPAPER_STORAGE_KEY = "caseforge.desktop.wallpaper";
const ICON_POSITIONS_STORAGE_KEY = "caseforge.desktop.iconPositions";
const ICON_CELL_WIDTH = 88;
const ICON_CELL_HEIGHT = 92;
const ICON_DRAG_THRESHOLD_PX = 4;
const ICON_EDGE_PADDING = 16;
const DESKTOP_CONTEXT_MENU = {
  width: 248,
  height: 104,
};
const DESKTOP_STATUS_TIMEOUT = 2200;
const DESKTOP_REFRESH_TIMEOUT = 520;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getLayoutMetrics(viewport: ViewportSize): LayoutMetrics {
  const compact = viewport.width < 900;

  return {
    leftRailWidth: compact ? 84 : 104,
    rightRailWidth: compact ? 0 : 104,
    dockHeight: compact ? 80 : 92,
    compact,
  };
}

function getWorkspace(viewport: ViewportSize, layout: LayoutMetrics): Bounds {
  const x = DESKTOP_MARGIN;
  const y = 18;
  const width = Math.max(320, viewport.width - DESKTOP_MARGIN * 2);
  const height = Math.max(360, viewport.height - (layout.dockHeight + 28));

  return { x, y, width, height };
}

function getWindowSpawnArea(viewport: ViewportSize, layout: LayoutMetrics): Bounds {
  const x = DESKTOP_MARGIN + layout.leftRailWidth + 18;
  const y = 18;
  const width = Math.max(
    320,
    viewport.width - (DESKTOP_MARGIN * 2 + layout.leftRailWidth + layout.rightRailWidth + 36),
  );
  const height = Math.max(360, viewport.height - (layout.dockHeight + 28));

  return { x, y, width, height };
}

function clampBounds(bounds: Bounds, preset: WindowPreset, workspace: Bounds): Bounds {
  const width = clamp(bounds.width, preset.minWidth, workspace.width);
  const height = clamp(bounds.height, preset.minHeight, workspace.height);
  const maxX = workspace.x + workspace.width - width;
  const maxY = workspace.y + workspace.height - height;

  return {
    x: clamp(bounds.x, workspace.x, maxX),
    y: clamp(bounds.y, workspace.y, maxY),
    width,
    height,
  };
}

function createInitialWindowStates(workspace: Bounds): Record<AppId, DesktopWindowState> {
  const entries = (Object.keys(WINDOW_PRESETS) as AppId[]).map((appId, index) => {
    const preset = WINDOW_PRESETS[appId];
    const width = Math.min(preset.width, workspace.width - 24);
    const height = Math.min(preset.height, workspace.height - 24);
    const x = clamp(
      workspace.x + (workspace.width - width) * preset.xBias,
      workspace.x + 18,
      workspace.x + workspace.width - width - 18,
    );
    const y = clamp(
      workspace.y + (workspace.height - height) * preset.yBias,
      workspace.y + 12,
      workspace.y + workspace.height - height - 12,
    );

    return [
      appId,
      {
        x,
        y,
        width,
        height,
        isOpen: preset.open,
        isMinimized: false,
        isMaximized: false,
        zIndex: preset.open ? 20 + index : index,
        restoreBounds: null,
      },
    ] as const;
  });

  return Object.fromEntries(entries) as Record<AppId, DesktopWindowState>;
}

function reconcileWindowState(
  windowState: DesktopWindowState,
  preset: WindowPreset,
  workspace: Bounds,
): DesktopWindowState {
  if (windowState.isMaximized) {
    return {
      ...windowState,
      x: workspace.x,
      y: workspace.y,
      width: workspace.width,
      height: workspace.height,
      restoreBounds: windowState.restoreBounds
        ? clampBounds(windowState.restoreBounds, preset, workspace)
        : windowState.restoreBounds,
    };
  }

  return {
    ...windowState,
    ...clampBounds(windowState, preset, workspace),
    restoreBounds: windowState.restoreBounds
      ? clampBounds(windowState.restoreBounds, preset, workspace)
      : windowState.restoreBounds,
  };
}

function resizeBounds(
  startBounds: Bounds,
  direction: ResizeDirection,
  deltaX: number,
  deltaY: number,
  preset: WindowPreset,
  workspace: Bounds,
): Bounds {
  let nextX = startBounds.x;
  let nextY = startBounds.y;
  let nextWidth = startBounds.width;
  let nextHeight = startBounds.height;

  if (direction.includes("e")) {
    nextWidth = clamp(
      startBounds.width + deltaX,
      preset.minWidth,
      workspace.x + workspace.width - startBounds.x,
    );
  }

  if (direction.includes("s")) {
    nextHeight = clamp(
      startBounds.height + deltaY,
      preset.minHeight,
      workspace.y + workspace.height - startBounds.y,
    );
  }

  if (direction.includes("w")) {
    nextX = clamp(
      startBounds.x + deltaX,
      workspace.x,
      startBounds.x + startBounds.width - preset.minWidth,
    );
    nextWidth = startBounds.width + (startBounds.x - nextX);
  }

  if (direction.includes("n")) {
    nextY = clamp(
      startBounds.y + deltaY,
      workspace.y,
      startBounds.y + startBounds.height - preset.minHeight,
    );
    nextHeight = startBounds.height + (startBounds.y - nextY);
  }

  return clampBounds(
    {
      x: nextX,
      y: nextY,
      width: nextWidth,
      height: nextHeight,
    },
    preset,
    workspace,
  );
}

function getTopVisibleWindow(
  windows: Record<AppId, DesktopWindowState>,
  excludeAppId?: AppId,
): AppId | null {
  const visibleWindows = (Object.entries(windows) as Array<[AppId, DesktopWindowState]>)
    .filter(([appId, windowState]) => {
      if (excludeAppId && appId === excludeAppId) {
        return false;
      }
      return windowState.isOpen && !windowState.isMinimized;
    })
    .sort(([, a], [, b]) => b.zIndex - a.zIndex);

  return visibleWindows[0]?.[0] ?? null;
}

function formatWallpaperLabel(name: string) {
  return name
    .replace(/\.[^/.]+$/, "")
    .replace(/[()]/g, " ")
    .replace(/[-_]+/g, " ")
    .replace(/\b(?:thumbnail|thumb)\b/gi, "")
    .replace(/\b\d+K\b/gi, "")
    .replace(/^(?:\s*\d+\s+)+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clampContextMenuPosition(
  x: number,
  y: number,
  width: number,
  height: number,
): DesktopContextMenuState {
  return {
    x: clamp(x, 14, Math.max(14, width - DESKTOP_CONTEXT_MENU.width - 14)),
    y: clamp(y, 14, Math.max(14, height - DESKTOP_CONTEXT_MENU.height - 14)),
  };
}

export function Desktop({ appRegistry, appComponents }: DesktopProps) {
  const activeApp = useCaseForgeStore((s) => s.activeApp);
  const setActiveApp = useCaseForgeStore((s) => s.setActiveApp);
  const currentTask = useCaseForgeStore((s) => s.currentTask);
  const timer = useCaseForgeStore((s) => s.timer);
  const attemptCount = useCaseForgeStore((s) => s.attemptCount);
  const coursePackage = useCaseForgeStore((s) => s.coursePackage);

  const [viewport, setViewport] = useState<ViewportSize>(DEFAULT_VIEWPORT);
  const [windowStates, setWindowStates] = useState<Record<AppId, DesktopWindowState>>(() =>
    createInitialWindowStates(
      getWindowSpawnArea(DEFAULT_VIEWPORT, getLayoutMetrics(DEFAULT_VIEWPORT)),
    ),
  );
  const [interactionAppId, setInteractionAppId] = useState<AppId | null>(null);
  const [interactionKind, setInteractionKind] = useState<PointerInteraction["kind"] | null>(null);
  const [wallpapers, setWallpapers] = useState<WallpaperEntry[]>([]);
  const [wallpaperIndex, setWallpaperIndex] = useState(0);
  const [isDarkWallpaper, setIsDarkWallpaper] = useState(false);
  const [contextMenu, setContextMenu] = useState<DesktopContextMenuState | null>(null);
  const [desktopStatus, setDesktopStatus] = useState<string | null>(null);
  const [isRefreshingDesktop, setIsRefreshingDesktop] = useState(false);
  const [iconPositions, setIconPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    appRegistry.forEach((entry, index) => {
      positions[entry.id] = {
        x: ICON_EDGE_PADDING,
        y: ICON_EDGE_PADDING + index * ICON_CELL_HEIGHT,
      };
    });
    return positions;
  });

  const layoutMetrics = useMemo(() => getLayoutMetrics(viewport), [viewport]);
  const workspace = useMemo(
    () => getWorkspace(viewport, layoutMetrics),
    [viewport, layoutMetrics],
  );
  const workspaceRef = useRef(workspace);
  const hasMeasuredRef = useRef(false);
  const zCounterRef = useRef(40);
  const interactionRef = useRef<PointerInteraction | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const statusTimeoutRef = useRef<number | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        window.clearTimeout(statusTimeoutRef.current);
      }
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function syncViewport() {
      const nextViewport = {
        width: window.innerWidth,
        height: Math.max(520, window.innerHeight - MENU_BAR_HEIGHT),
      };
      const nextLayoutMetrics = getLayoutMetrics(nextViewport);
      const nextWorkspace = getWorkspace(nextViewport, nextLayoutMetrics);

      workspaceRef.current = nextWorkspace;
      setViewport(nextViewport);
      setWindowStates((prev) => {
        if (!hasMeasuredRef.current) {
          hasMeasuredRef.current = true;
          return createInitialWindowStates(
            getWindowSpawnArea(nextViewport, nextLayoutMetrics),
          );
        }

        return (Object.keys(prev) as AppId[]).reduce<Record<AppId, DesktopWindowState>>(
          (acc, appId) => {
            acc[appId] = reconcileWindowState(
              prev[appId],
              WINDOW_PRESETS[appId],
              nextWorkspace,
            );
            return acc;
          },
          {} as Record<AppId, DesktopWindowState>,
        );
      });
    }

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadWallpapers() {
      try {
        const response = await fetch("/api/wallpapers", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load wallpapers: ${response.status}`);
        }

        const nextWallpapers = (await response.json()) as WallpaperEntry[];
        if (isCancelled || nextWallpapers.length === 0) {
          return;
        }

        const storedWallpaperName = window.localStorage.getItem(WALLPAPER_STORAGE_KEY);
        const storedIndex = storedWallpaperName
          ? nextWallpapers.findIndex((wallpaper) => wallpaper.name === storedWallpaperName)
          : -1;

        setWallpapers(nextWallpapers);
        setWallpaperIndex(storedIndex >= 0 ? storedIndex : 0);
      } catch (error) {
        console.error("Unable to load desktop wallpapers.", error);
      }
    }

    loadWallpapers();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Restore persisted icon positions on mount, merged onto the computed defaults.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(ICON_POSITIONS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, { x: number; y: number }>;
      if (!parsed || typeof parsed !== "object") return;
      setIconPositions((prev) => {
        const next = { ...prev };
        for (const id of Object.keys(parsed)) {
          const p = parsed[id];
          if (p && typeof p.x === "number" && typeof p.y === "number") {
            next[id] = { x: p.x, y: p.y };
          }
        }
        return next;
      });
    } catch {
      // ignore malformed storage
    }
  }, []);

  const commitIconPosition = (appId: AppId, pos: { x: number; y: number }) => {
    setIconPositions((prev) => {
      const next = { ...prev, [appId]: pos };
      try {
        window.localStorage.setItem(ICON_POSITIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage failures
      }
      return next;
    });
  };

  const setIconPositionTransient = (appId: AppId, pos: { x: number; y: number }) => {
    setIconPositions((prev) => ({ ...prev, [appId]: pos }));
  };

  useEffect(() => {
    const activeWallpaper = wallpapers[wallpaperIndex] ?? wallpapers[0];
    if (!activeWallpaper) {
      return;
    }

    window.localStorage.setItem(WALLPAPER_STORAGE_KEY, activeWallpaper.name);
    
    const url = `${activeWallpaper.url}${activeWallpaper.url.includes("?") ? "&" : "?"}v=${wallpaperIndex}`;
    isImageDark(url).then(setIsDarkWallpaper);
  }, [wallpaperIndex, wallpapers]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const interaction = interactionRef.current;
      if (!interaction) {
        return;
      }

      const preset = WINDOW_PRESETS[interaction.appId];
      const workspaceBounds = workspaceRef.current;
      const deltaX = event.clientX - interaction.startPointerX;
      const deltaY = event.clientY - interaction.startPointerY;

      setWindowStates((prev) => {
        const currentWindow = prev[interaction.appId];
        if (!currentWindow || currentWindow.isMaximized) {
          return prev;
        }

        const nextBounds =
          interaction.kind === "move"
            ? clampBounds(
                {
                  ...interaction.startBounds,
                  x: interaction.startBounds.x + deltaX,
                  y: interaction.startBounds.y + deltaY,
                },
                preset,
                workspaceBounds,
              )
            : resizeBounds(
                interaction.startBounds,
                interaction.direction,
                deltaX,
                deltaY,
                preset,
                workspaceBounds,
              );

        return {
          ...prev,
          [interaction.appId]: {
            ...currentWindow,
            ...nextBounds,
          },
        };
      });
    }

    function finishInteraction() {
      interactionRef.current = null;
      setInteractionAppId(null);
      setInteractionKind(null);
      document.body.style.cursor = "";
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishInteraction);
    window.addEventListener("pointercancel", finishInteraction);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishInteraction);
      window.removeEventListener("pointercancel", finishInteraction);
    };
  }, []);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (contextMenuRef.current?.contains(event.target as Node)) {
        return;
      }

      setContextMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    }

    function handleResize() {
      setContextMenu(null);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [contextMenu]);

  function bringWindowToFront(appId: AppId) {
    const windowState = windowStates[appId];
    if (!windowState || !windowState.isOpen) {
      return;
    }

    if (!windowState.isMinimized && activeApp === appId) {
      return;
    }

    setWindowStates((prev) => {
      const nextWindow = prev[appId];
      if (!nextWindow) {
        return prev;
      }

      zCounterRef.current += 1;

      return {
        ...prev,
        [appId]: {
          ...nextWindow,
          isOpen: true,
          isMinimized: false,
          zIndex: zCounterRef.current,
        },
      };
    });

    setActiveApp(appId);
  }

  function openWindow(appId: AppId) {
    setWindowStates((prev) => {
      const currentWindow = prev[appId];
      if (!currentWindow) {
        return prev;
      }

      const nextWindow = currentWindow.isMaximized
        ? {
            ...currentWindow,
            x: workspaceRef.current.x,
            y: workspaceRef.current.y,
            width: workspaceRef.current.width,
            height: workspaceRef.current.height,
          }
        : reconcileWindowState(
            {
              ...currentWindow,
              isMinimized: false,
            },
            WINDOW_PRESETS[appId],
            workspaceRef.current,
          );

      zCounterRef.current += 1;

      return {
        ...prev,
        [appId]: {
          ...nextWindow,
          isOpen: true,
          isMinimized: false,
          zIndex: zCounterRef.current,
        },
      };
    });

    setActiveApp(appId);
  }

  function closeWindow(appId: AppId) {
    const nextActiveApp = getTopVisibleWindow(windowStates, appId);

    setWindowStates((prev) => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        isOpen: false,
        isMinimized: false,
      },
    }));

    if (nextActiveApp) {
      setActiveApp(nextActiveApp);
    }
  }

  function minimizeWindow(appId: AppId) {
    const nextActiveApp = getTopVisibleWindow(windowStates, appId);

    setWindowStates((prev) => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        isMinimized: true,
      },
    }));

    if (nextActiveApp) {
      setActiveApp(nextActiveApp);
    }
  }

  function toggleWindowSize(appId: AppId) {
    setWindowStates((prev) => {
      const currentWindow = prev[appId];
      if (!currentWindow || !currentWindow.isOpen) {
        return prev;
      }

      zCounterRef.current += 1;

      if (currentWindow.isMaximized && currentWindow.restoreBounds) {
        return {
          ...prev,
          [appId]: {
            ...currentWindow,
            ...clampBounds(
              currentWindow.restoreBounds,
              WINDOW_PRESETS[appId],
              workspaceRef.current,
            ),
            isMaximized: false,
            isMinimized: false,
            zIndex: zCounterRef.current,
            restoreBounds: null,
          },
        };
      }

      return {
        ...prev,
        [appId]: {
          ...currentWindow,
          x: workspaceRef.current.x,
          y: workspaceRef.current.y,
          width: workspaceRef.current.width,
          height: workspaceRef.current.height,
          isMaximized: true,
          isMinimized: false,
          zIndex: zCounterRef.current,
          restoreBounds: {
            x: currentWindow.x,
            y: currentWindow.y,
            width: currentWindow.width,
            height: currentWindow.height,
          },
        },
      };
    });

    setActiveApp(appId);
  }

  function beginMove(appId: AppId, event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    const windowState = windowStates[appId];
    if (!windowState || windowState.isMaximized) {
      return;
    }

    event.preventDefault();
    bringWindowToFront(appId);
    interactionRef.current = {
      kind: "move",
      appId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startBounds: {
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
      },
    };
    setInteractionAppId(appId);
    setInteractionKind("move");
    document.body.style.cursor = "grabbing";
  }

  function beginResize(
    appId: AppId,
    direction: ResizeDirection,
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    if (event.button !== 0) {
      return;
    }

    const windowState = windowStates[appId];
    if (!windowState || windowState.isMaximized || windowState.isMinimized) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    bringWindowToFront(appId);
    interactionRef.current = {
      kind: "resize",
      appId,
      direction,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startBounds: {
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
      },
    };
    setInteractionAppId(appId);
    setInteractionKind("resize");
    document.body.style.cursor = RESIZE_CURSOR[direction];
  }

  function announceDesktopStatus(message: string) {
    if (statusTimeoutRef.current) {
      window.clearTimeout(statusTimeoutRef.current);
    }

    setDesktopStatus(message);
    statusTimeoutRef.current = window.setTimeout(() => {
      setDesktopStatus(null);
      statusTimeoutRef.current = null;
    }, DESKTOP_STATUS_TIMEOUT);
  }

  function handleDesktopContextMenu(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("[data-no-desktop-menu='true']")) {
      setContextMenu(null);
      return;
    }

    event.preventDefault();

    const bounds = event.currentTarget.getBoundingClientRect();
    setContextMenu(
      clampContextMenuPosition(
        event.clientX - bounds.left,
        event.clientY - bounds.top,
        bounds.width,
        bounds.height,
      ),
    );
  }

  function cycleWallpaper() {
    if (!wallpapers.length) {
      return;
    }

    const nextIndex = (wallpaperIndex + 1) % wallpapers.length;
    const nextWallpaper = wallpapers[nextIndex];

    setWallpaperIndex(nextIndex);
    setContextMenu(null);
    announceDesktopStatus(
      `Wallpaper changed to ${formatWallpaperLabel(nextWallpaper.name)}.`,
    );
  }

  function refreshDesktop() {
    setContextMenu(null);
    setIsRefreshingDesktop(true);
    announceDesktopStatus("Desktop refreshed.");

    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = window.setTimeout(() => {
      setIsRefreshingDesktop(false);
      refreshTimeoutRef.current = null;
    }, DESKTOP_REFRESH_TIMEOUT);
  }

  const orderedWindows = useMemo(
    () =>
      appRegistry
        .map((entry) => ({
          entry,
          windowState: windowStates[entry.id],
        }))
        .filter((item) => item.windowState?.isOpen)
        .sort((a, b) => a.windowState.zIndex - b.windowState.zIndex),
    [appRegistry, windowStates],
  );

  const visibleActiveAppId =
    windowStates[activeApp]?.isOpen && !windowStates[activeApp]?.isMinimized
      ? activeApp
      : getTopVisibleWindow(windowStates);
  const focusedEntry = visibleActiveAppId
    ? appRegistry.find((entry) => entry.id === visibleActiveAppId) ?? null
    : null;

  const activeWallpaper = wallpapers[wallpaperIndex] ?? wallpapers[0] ?? null;
  const activeWallpaperUrl = activeWallpaper
    ? `${activeWallpaper.url}${activeWallpaper.url.includes("?") ? "&" : "?"}v=${wallpaperIndex}`
    : null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[var(--kraft)] text-[var(--text-primary)]">
      {/* Wallpaper layer — covers the entire viewport, including behind the menu bar */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {activeWallpaperUrl && (
          <img
            key={activeWallpaperUrl}
            src={activeWallpaperUrl}
            alt=""
            draggable={false}
            className="desktop-wallpaper-enter absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,12,5,0.22),rgba(17,12,5,0.08)_18%,rgba(17,12,5,0.22))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,244,219,0.28),transparent_34%),radial-gradient(circle_at_78%_14%,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_72%_82%,rgba(74,49,14,0.18),transparent_32%)]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,0.22)_0.8px,transparent_0.8px)] [background-size:18px_18px]" />
        <div className="absolute left-[12%] top-[-14%] h-[28rem] w-[28rem] rounded-full bg-white/12 blur-3xl" />
        <div className="absolute right-[8%] top-[12%] h-[24rem] w-[24rem] rounded-full bg-[#8f6a2d]/15 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[26%] h-[20rem] w-[24rem] rounded-full bg-black/12 blur-3xl" />
      </div>

      <div className="relative z-10 flex h-full flex-col overflow-hidden">
        <MenuBar
          clientName={coursePackage?.meta?.client ?? "CaseForge"}
          taskTitle={currentTask?.title ?? null}
          timer={timer}
          attemptCount={attemptCount}
          activeWindowLabel={focusedEntry?.label ?? "Desktop"}
        />

        <div
          className={`relative flex-1 overflow-hidden ${isRefreshingDesktop ? "desktop-shell-refresh" : ""}`}
          onContextMenu={handleDesktopContextMenu}
        >

          <div className="pointer-events-none absolute inset-0 z-10">
            {appRegistry.map((entry) => {
              const windowState = windowStates[entry.id];
              const pos = iconPositions[entry.id] ?? {
                x: ICON_EDGE_PADDING,
                y: ICON_EDGE_PADDING,
              };
              const clampedX = clamp(
                pos.x,
                0,
                Math.max(0, viewport.width - ICON_CELL_WIDTH),
              );
              const clampedY = clamp(
                pos.y,
                0,
                Math.max(
                  0,
                  viewport.height - MENU_BAR_HEIGHT - layoutMetrics.dockHeight - ICON_CELL_HEIGHT,
                ),
              );
              return (
                <DraggableDesktopIcon
                  key={entry.id}
                  icon={entry.icon}
                  label={entry.label}
                  ariaLabel={`${entry.label}. ${entry.description}`}
                  isFocused={
                    entry.id === activeApp && windowState?.isOpen && !windowState.isMinimized
                  }
                  isOpen={windowState?.isOpen ?? false}
                  isDarkBackground={isDarkWallpaper}
                  position={{ x: clampedX, y: clampedY }}
                  onPositionChange={(p) => setIconPositionTransient(entry.id, p)}
                  onCommit={(p) => commitIconPosition(entry.id, p)}
                  onClick={() => openWindow(entry.id)}
                />
              );
            })}
          </div>

          {!layoutMetrics.compact && (
            <div
              className="absolute inset-y-4 right-4 z-10 flex flex-col items-center gap-1"
              style={{ width: layoutMetrics.rightRailWidth - 8 }}
            >
              <div className="flex-1" />
              <DesktopIcon
                icon="🗑️"
                label="Trash"
                detail="Empty"
                isFocused={false}
                isOpen={false}
                interactive={false}
                dimmed
                isDarkBackground={isDarkWallpaper}
              />
              <div className="h-4" />
            </div>
          )}

          {orderedWindows.map(({ entry, windowState }) => {
            const AppComponent = appComponents[entry.id];
            const isFocused = entry.id === activeApp && !windowState.isMinimized;
            const isInteracting = interactionAppId === entry.id;
            const isMoving = isInteracting && interactionKind === "move";

            return (
              <div
                key={entry.id}
                onPointerDownCapture={() => bringWindowToFront(entry.id)}
                className="absolute"
                data-no-desktop-menu="true"
                style={{
                  left: windowState.x,
                  top: windowState.y,
                  width: windowState.width,
                  height: windowState.height,
                  zIndex: windowState.zIndex,
                  opacity: windowState.isMinimized ? 0 : 1,
                  transform: windowState.isMinimized
                    ? "translate3d(0, 48px, 0) scale(0.92)"
                    : isMoving
                      ? `translate3d(0, ${WINDOW_LIFT_OFFSET}px, 0) scale(${WINDOW_LIFT_SCALE})`
                      : "translate3d(0, 0, 0) scale(1)",
                  pointerEvents: windowState.isMinimized ? "none" : "auto",
                  filter: isFocused ? "none" : "saturate(0.9) brightness(0.98)",
                  transition: isInteracting ? WINDOW_INTERACTION_TRANSITION : WINDOW_TRANSITION,
                  transformOrigin: "center top",
                  willChange: isInteracting ? "transform" : undefined,
                }}
              >
                <div className="relative h-full">
                  <WindowChrome
                    title={`${currentTask?.title ?? "CaseForge"} — ${entry.label}`}
                    subtitle={entry.description}
                    appIcon={entry.icon}
                    appLabel={entry.label}
                    isFocused={isFocused}
                    isMaximized={windowState.isMaximized}
                    onHeaderPointerDown={(event) => beginMove(entry.id, event)}
                    onHeaderDoubleClick={() => toggleWindowSize(entry.id)}
                    onMinimize={() => minimizeWindow(entry.id)}
                    onMaximize={() => toggleWindowSize(entry.id)}
                    onClose={() => closeWindow(entry.id)}
                  >
                    <AppComponent />
                  </WindowChrome>

                  {!windowState.isMaximized && (
                    <>
                      <ResizeHandle direction="n" onPointerDown={(event) => beginResize(entry.id, "n", event)} />
                      <ResizeHandle direction="s" onPointerDown={(event) => beginResize(entry.id, "s", event)} />
                      <ResizeHandle direction="e" onPointerDown={(event) => beginResize(entry.id, "e", event)} />
                      <ResizeHandle direction="w" onPointerDown={(event) => beginResize(entry.id, "w", event)} />
                      <ResizeHandle direction="ne" onPointerDown={(event) => beginResize(entry.id, "ne", event)} />
                      <ResizeHandle direction="nw" onPointerDown={(event) => beginResize(entry.id, "nw", event)} />
                      <ResizeHandle direction="se" onPointerDown={(event) => beginResize(entry.id, "se", event)} />
                      <ResizeHandle direction="sw" onPointerDown={(event) => beginResize(entry.id, "sw", event)} />
                    </>
                  )}
                </div>
              </div>
            );
          })}

          <div
            className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2"
            data-no-desktop-menu="true"
          >
            <div
              className="
                flex items-center gap-1.5 rounded-[26px] border border-white/35 bg-white/18 px-2.5 py-2 backdrop-blur-2xl
                shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(0,0,0,0.10),0_22px_56px_rgba(0,0,0,0.32)]
                sm:gap-2 sm:rounded-[30px] sm:px-3
              "
            >
              {appRegistry.map((entry) => {
                const windowState = windowStates[entry.id];
                const isFocused =
                  entry.id === activeApp && windowState?.isOpen && !windowState.isMinimized;
                const isRunning = windowState?.isOpen;

                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-label={`${entry.label}${isRunning ? ", open" : ""}`}
                    aria-pressed={isFocused}
                    onClick={() => openWindow(entry.id)}
                    data-no-desktop-menu="true"
                    className={`
                      group relative flex h-12 w-12 items-center justify-center rounded-2xl border text-xl transition-all duration-200 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0 sm:h-14 sm:w-14 sm:text-2xl
                      ${isFocused
                        ? "border-white/65 bg-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-1px_0_rgba(0,0,0,0.10),0_10px_22px_rgba(0,0,0,0.28)]"
                        : isRunning
                          ? "border-white/45 bg-white/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] hover:-translate-y-1 hover:bg-white/32"
                          : "border-white/25 bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:-translate-y-1 hover:bg-white/22"
                      }
                    `}
                  >
                    <span className="transition-transform duration-200 group-hover:scale-110 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
                      {entry.icon}
                    </span>
                    <span
                      className={`
                        absolute -bottom-[7px] h-1.5 rounded-full transition-all duration-200
                        ${isFocused
                          ? "w-5 bg-white/95 shadow-[0_0_8px_rgba(255,255,255,0.55)]"
                          : isRunning
                            ? "w-2.5 bg-white/70"
                            : "w-0 bg-transparent"
                        }
                      `}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {contextMenu && (
            <div
              ref={contextMenuRef}
              role="menu"
              aria-label="Desktop actions"
              aria-orientation="vertical"
              className="desktop-context-menu absolute z-40 w-[248px] overflow-hidden rounded-[12px] border border-[#b7af9e] bg-[#e7dfcf] shadow-[0_10px_24px_rgba(25,18,8,0.16)]"
              style={{
                left: contextMenu.x,
                top: contextMenu.y,
              }}
              data-no-desktop-menu="true"
              onContextMenu={(event) => event.preventDefault()}
            >
              <button
                type="button"
                role="menuitem"
                onClick={cycleWallpaper}
                disabled={!wallpapers.length}
                className="w-full px-4 py-3 text-left text-[15px] font-medium text-[#2e271e] transition-colors hover:bg-[#f2ece0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3559a7] focus-visible:ring-inset disabled:cursor-not-allowed disabled:text-[#8b8173]"
              >
                Change Wallpaper
              </button>

              <span className="mx-3 h-px bg-[#c7c0b1]" aria-hidden="true" />

              <button
                type="button"
                role="menuitem"
                onClick={refreshDesktop}
                className="w-full px-4 py-3 text-left text-[15px] font-medium text-[#2e271e] transition-colors hover:bg-[#f2ece0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3559a7] focus-visible:ring-inset"
              >
                Refresh Desktop
              </button>
            </div>
          )}

          {desktopStatus && (
            <div className="pointer-events-none absolute bottom-6 right-5 z-40">
              <div
                className="desktop-status-chip rounded-[18px] border border-white/60 bg-[#1d1b16]/78 px-4 py-2 text-sm font-medium text-[#f3ead8] shadow-[0_18px_42px_rgba(25,18,8,0.32)] backdrop-blur-xl"
                aria-live="polite"
                aria-atomic="true"
              >
                {desktopStatus}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResizeHandle({
  direction,
  onPointerDown,
}: {
  direction: ResizeDirection;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const positionClassName: Record<ResizeDirection, string> = {
    n: "left-5 right-5 top-[-4px] h-2 cursor-ns-resize",
    s: "left-5 right-5 bottom-[-4px] h-2 cursor-ns-resize",
    e: "right-[-4px] top-5 bottom-5 w-2 cursor-ew-resize",
    w: "left-[-4px] top-5 bottom-5 w-2 cursor-ew-resize",
    ne: "right-[-4px] top-[-4px] h-4 w-4 cursor-nesw-resize",
    nw: "left-[-4px] top-[-4px] h-4 w-4 cursor-nwse-resize",
    se: "right-[-4px] bottom-[-4px] h-4 w-4 cursor-nwse-resize",
    sw: "left-[-4px] bottom-[-4px] h-4 w-4 cursor-nesw-resize",
  };

  return (
    <div
      className={`absolute z-20 ${positionClassName[direction]}`}
      onPointerDown={onPointerDown}
    />
  );
}

function DesktopIcon({
  icon,
  label,
  ariaLabel,
  detail,
  isFocused,
  isOpen,
  onClick,
  dimmed,
  interactive = true,
  showDetail = true,
  isDarkBackground = false,
}: {
  icon: string;
  label: string;
  ariaLabel?: string;
  detail?: string;
  isFocused: boolean;
  isOpen: boolean;
  onClick?: () => void;
  dimmed?: boolean;
  interactive?: boolean;
  showDetail?: boolean;
  isDarkBackground?: boolean;
}) {
  const content = (
    <>
      <div
        className={`
          relative flex h-[60px] w-[60px] items-center justify-center rounded-[16px] text-[32px] leading-none transition-all duration-200 backdrop-blur-2xl
          ${isFocused
            ? "bg-white/30 border border-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-1px_0_rgba(0,0,0,0.08),0_10px_28px_rgba(0,0,0,0.28)]"
            : "bg-white/18 border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.10),0_8px_22px_rgba(0,0,0,0.22)] group-hover:scale-[1.06] group-hover:bg-white/26"
          }
        `}
      >
        <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">{icon}</span>
        {isOpen && (
          <span className="absolute -bottom-[7px] h-1.5 w-4 rounded-full bg-white/85 shadow-[0_0_8px_rgba(255,255,255,0.55)]" />
        )}
      </div>

      <span
        className={`
          text-center text-[13px] font-semibold leading-tight
          ${isDarkBackground ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" : isFocused ? "text-[#1d1b16]" : "text-[#2c261d]"}
        `}
      >
        {label}
      </span>

      {showDetail && detail && (
        <span className={`max-w-[80px] truncate text-center text-[11px] leading-tight ${isDarkBackground ? "text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]" : "text-[#625642]"}`}>
          {detail}
        </span>
      )}
    </>
  );

  const className = `
    group flex w-[88px] select-none flex-col items-center gap-1.5 rounded-[18px] px-2 py-2 text-left transition-all duration-200
    ${interactive ? "cursor-pointer" : "cursor-default"}
    ${dimmed ? "opacity-85" : ""}
  `;

  if (!interactive) {
    return (
      <div className={className} data-no-desktop-menu="true">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? (detail ? `${label}. ${detail}` : label)}
      aria-pressed={isFocused}
      data-no-desktop-menu="true"
      className={`${className} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3559a7] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kraft)]`}
    >
      {content}
    </button>
  );
}

function DraggableDesktopIcon({
  icon,
  label,
  ariaLabel,
  isFocused,
  isOpen,
  isDarkBackground,
  position,
  onPositionChange,
  onCommit,
  onClick,
}: {
  icon: string;
  label: string;
  ariaLabel?: string;
  isFocused: boolean;
  isOpen: boolean;
  isDarkBackground: boolean;
  position: { x: number; y: number };
  onPositionChange: (p: { x: number; y: number }) => void;
  onCommit: (p: { x: number; y: number }) => void;
  onClick: () => void;
}) {
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPos: { x: number; y: number };
    isDragging: boolean;
    pointerId: number;
    target: HTMLDivElement;
  } | null>(null);
  const justDraggedRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPos: position,
      isDragging: false,
      pointerId: e.pointerId,
      target: e.currentTarget as HTMLDivElement,
    };
    // Defer setPointerCapture until we know this is a drag (see handlePointerMove).
    // Capturing on every pointerdown can swallow the synthesized click event on
    // inner elements, so simple taps must never enter capture.
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const ds = dragRef.current;
    if (!ds) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (!ds.isDragging && Math.hypot(dx, dy) > ICON_DRAG_THRESHOLD_PX) {
      ds.isDragging = true;
      setIsDragging(true);
      try {
        ds.target.setPointerCapture(ds.pointerId);
      } catch {
        // ignore capture failure
      }
    }
    if (ds.isDragging) {
      onPositionChange({ x: ds.startPos.x + dx, y: ds.startPos.y + dy });
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const ds = dragRef.current;
    if (!ds) return;
    if (ds.isDragging) {
      try {
        ds.target.releasePointerCapture(ds.pointerId);
      } catch {
        // ignore release failure
      }
      const final = {
        x: ds.startPos.x + (e.clientX - ds.startX),
        y: ds.startPos.y + (e.clientY - ds.startY),
      };
      onCommit(final);
      justDraggedRef.current = true;
      window.setTimeout(() => {
        justDraggedRef.current = false;
      }, 0);
    }
    dragRef.current = null;
    setIsDragging(false);
  }

  function handleClick() {
    if (justDraggedRef.current) return;
    onClick();
  }

  return (
    <div
      className="pointer-events-auto absolute"
      style={{
        left: position.x,
        top: position.y,
        touchAction: "none",
        cursor: isDragging ? "grabbing" : undefined,
        zIndex: isDragging ? 11 : 10,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      data-no-desktop-menu="true"
    >
      <DesktopIcon
        icon={icon}
        label={label}
        ariaLabel={ariaLabel}
        isFocused={isFocused}
        isOpen={isOpen}
        onClick={handleClick}
        showDetail={false}
        isDarkBackground={isDarkBackground}
      />
    </div>
  );
}
