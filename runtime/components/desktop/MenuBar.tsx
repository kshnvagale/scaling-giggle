"use client";

import { useEffect, useState, useRef } from "react";
import { useCaseForgeStore } from "@/lib/store";

interface MenuBarProps {
  clientName: string;
  taskTitle: string | null;
  timer: {
    startedAt: number;
    durationMinutes: number;
    isExpired: boolean;
  } | null;
  attemptCount: number;
  activeWindowLabel: string;
  onCycleWallpaper?: () => void;
  onRefreshDesktop?: () => void;
  isDarkWallpaper?: boolean;
}

function formatTime(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatClock(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function MenuBar({
  clientName,
  taskTitle,
  timer,
  attemptCount,
  activeWindowLabel,
  onCycleWallpaper,
  onRefreshDesktop,
  isDarkWallpaper = false,
}: MenuBarProps) {
  const { isOnline, toggleControlCenter, controlCenterOpen } = useCaseForgeStore();

  const [remaining, setRemaining] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());
  
  // Dropdown states
  const [appleMenuOpen, setAppleMenuOpen] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [editMenuOpen, setEditMenuOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);

  const appleMenuRef = useRef<HTMLDivElement>(null);
  const appMenuRef = useRef<HTMLDivElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const editMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!timer) {
      setRemaining(null);
      return;
    }

    const activeTimer = timer;

    function tick() {
      const end = activeTimer.startedAt + activeTimer.durationMinutes * 60_000;
      setRemaining(end - Date.now());
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Close menus on click outside
  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (appleMenuOpen && appleMenuRef.current && !appleMenuRef.current.contains(target)) {
        setAppleMenuOpen(false);
      }
      if (appMenuOpen && appMenuRef.current && !appMenuRef.current.contains(target)) {
        setAppMenuOpen(false);
      }
      if (fileMenuOpen && fileMenuRef.current && !fileMenuRef.current.contains(target)) {
        setFileMenuOpen(false);
      }
      if (editMenuOpen && editMenuRef.current && !editMenuRef.current.contains(target)) {
        setEditMenuOpen(false);
      }
    }
    window.addEventListener("click", clickOutside);
    return () => window.removeEventListener("click", clickOutside);
  }, [appleMenuOpen, appMenuOpen, fileMenuOpen, editMenuOpen]);

  const isLowTime = remaining !== null && remaining > 0 && remaining < 5 * 60_000;
  const isExpired = timer?.isExpired || (remaining !== null && remaining <= 0);

  // App-specific helper context items
  const getContextualItems = () => {
    switch (activeWindowLabel.toLowerCase()) {
      case "chat":
        return {
          file: ["New Conversation", "Export Log", "Mute Notifications"],
          edit: ["Copy Selection", "Clear Screen", "Search Messages"],
        };
      case "terminal":
        return {
          file: ["New Window", "Restart Shell", "Save Scrollback"],
          edit: ["Reset Terminal", "Copy Command", "Clear Scrollback"],
        };
      case "briefing":
        return {
          file: ["Print Objectives", "Mark Important", "Download Briefing"],
          edit: ["Select Text", "Copy Clues", "Find Section"],
        };
      default:
        return {
          file: ["Open Workspace", "Save Progress", "Close active tab"],
          edit: ["Undo", "Redo", "Select All"],
        };
    }
  };

  const contextMenus = getContextualItems();

  // Zero-fill menubar: lets the wallpaper show through. Text colour follows
  // the wallpaper brightness; a soft text-shadow keeps glyphs legible
  // against any background.
  const menuBarTextClass = isDarkWallpaper ? "text-white" : "text-stone-900";

  return (
    <>
      <div
        className={`
          relative z-30 flex h-8 select-none items-center gap-4 bg-transparent px-4 text-[13px] font-semibold
          transition-colors duration-300
          ${menuBarTextClass}
        `}
        style={{
          textShadow: isDarkWallpaper
            ? "0 1px 2.5px rgba(0,0,0,0.45)"
            : "0 0.5px 1px rgba(255,255,255,0.45)",
        }}
      >
        {/* Left Side: Apple Icon & App Menus */}
        <div className="flex items-center gap-4">
          {/* Apple Menu */}
          <div className="relative" ref={appleMenuRef}>
            <button
              onClick={() => setAppleMenuOpen(!appleMenuOpen)}
              className="text-[15px] px-1.5 py-0.5 rounded hover:bg-white/15 dark:hover:bg-white/10 flex items-center justify-center font-normal transition-colors"
            >
              
            </button>
            {appleMenuOpen && (
              <div className="absolute left-0 top-7 w-52 rounded-lg border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/75 backdrop-blur-2xl shadow-xl z-50 flex flex-col p-1 animate-macos-dropdown text-stone-950 dark:text-stone-50">
                <button
                  onClick={() => {
                    setAboutModalOpen(true);
                    setAppleMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded hover:bg-[#007aff] hover:text-white text-[12px] font-bold"
                >
                  About This Case Study
                </button>
                <div className="h-px bg-black/5 dark:bg-white/10 my-1" />
                <button
                  onClick={() => {
                    if (onCycleWallpaper) onCycleWallpaper();
                    setAppleMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded hover:bg-[#007aff] hover:text-white text-[12px] font-bold"
                >
                  Next Wallpaper
                </button>
                <button
                  onClick={() => {
                    if (onRefreshDesktop) onRefreshDesktop();
                    setAppleMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded hover:bg-[#007aff] hover:text-white text-[12px] font-bold"
                >
                  Refresh Desktop
                </button>
                <div className="h-px bg-black/5 dark:bg-white/10 my-1" />
                <button
                  onClick={() => setAppleMenuOpen(false)}
                  className="w-full text-left px-3 py-1.5 rounded text-red-500 hover:bg-red-500 hover:text-white text-[12px] font-bold"
                >
                  Force Quit Applications
                </button>
              </div>
            )}
          </div>

          {/* Active App Context Name */}
          <div className="relative" ref={appMenuRef}>
            <button
              onClick={() => setAppMenuOpen(!appMenuOpen)}
              className="text-[13px] font-bold px-2 py-0.5 rounded hover:bg-white/15 dark:hover:bg-white/10 transition-colors"
            >
              {activeWindowLabel}
            </button>
            {appMenuOpen && (
              <div className="absolute left-0 top-7 w-48 rounded-lg border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/75 backdrop-blur-2xl shadow-xl z-50 flex flex-col p-1 animate-macos-dropdown text-stone-950 dark:text-stone-50">
                <span className="px-3 py-1 text-[10px] uppercase tracking-wider text-stone-500 font-extrabold pl-3">
                  System Context
                </span>
                <span className="px-3 py-1.5 text-[12px] text-stone-600 dark:text-stone-400 font-semibold pl-3">
                  Version 1.2.0 (Stable)
                </span>
                <div className="h-px bg-black/5 dark:bg-white/10 my-1" />
                <button
                  onClick={() => setAppMenuOpen(false)}
                  className="w-full text-left px-3 py-1.5 rounded hover:bg-[#007aff] hover:text-white text-[12px] font-bold"
                >
                  Hide {activeWindowLabel}
                </button>
              </div>
            )}
          </div>

          {/* Context Menu: File */}
          <div className="relative" ref={fileMenuRef}>
            <button
              onClick={() => setFileMenuOpen(!fileMenuOpen)}
              className="text-[12.5px] font-medium px-2 py-0.5 rounded hover:bg-white/15 dark:hover:bg-white/10 transition-colors hidden sm:block"
            >
              File
            </button>
            {fileMenuOpen && (
              <div className="absolute left-0 top-7 w-48 rounded-lg border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/75 backdrop-blur-2xl shadow-xl z-50 flex flex-col p-1 animate-macos-dropdown text-stone-950 dark:text-stone-50">
                {contextMenus.file.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setFileMenuOpen(false)}
                    className="w-full text-left px-3 py-1.5 rounded hover:bg-[#007aff] hover:text-white text-[12px] font-bold"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Context Menu: Edit */}
          <div className="relative" ref={editMenuRef}>
            <button
              onClick={() => setEditMenuOpen(!editMenuOpen)}
              className="text-[12.5px] font-medium px-2 py-0.5 rounded hover:bg-white/15 dark:hover:bg-white/10 transition-colors hidden sm:block"
            >
              Edit
            </button>
            {editMenuOpen && (
              <div className="absolute left-0 top-7 w-48 rounded-lg border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/75 backdrop-blur-2xl shadow-xl z-50 flex flex-col p-1 animate-macos-dropdown text-stone-950 dark:text-stone-50">
                {contextMenus.edit.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setEditMenuOpen(false)}
                    className="w-full text-left px-3 py-1.5 rounded hover:bg-[#007aff] hover:text-white text-[12px] font-bold"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Section: Task Title (Sleek pill container) */}
        <div className="min-w-0 flex-1 flex justify-center">
          {taskTitle && (
            <div className="hidden items-center gap-1.5 rounded-full border border-black/10 dark:border-white/10 bg-white/15 dark:bg-white/5 px-3 py-0.5 text-[11px] font-bold text-inherit backdrop-blur-md lg:flex select-none shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="max-w-[320px] truncate">{taskTitle}</span>
            </div>
          )}
        </div>

        {/* Right Side: Tray Icons, Battery, Wi-Fi, Control Center, Time */}
        <div className="flex items-center gap-3.5 pl-2">
          {/* Attempt Badging */}
          <span className="hidden rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-600 dark:text-amber-400 border border-amber-500/20 sm:inline-flex select-none">
            Attempt #{attemptCount}
          </span>

          {/* Dynamic timer count */}
          {timer && remaining !== null && (
            <div className="flex items-center gap-1 border-r border-black/10 dark:border-white/10 pr-3.5 h-4 select-none">
              ⏱️
              <span
                className={`
                  font-mono text-[12.5px] font-extrabold tabular-nums tracking-wide
                  ${isExpired ? "text-red-500 animate-pulse" : isLowTime ? "text-amber-500" : "text-current opacity-80"}
                `}
              >
                {isExpired ? "00:00" : formatTime(remaining)}
              </span>
            </div>
          )}

          {/* Wi-Fi Icon Indicator */}
          <div className="flex items-center justify-center">
            {isOnline ? (
              <span className="text-[14px] opacity-80" title="Connected to Network">
                📶
              </span>
            ) : (
              <span className="text-[14px] text-red-500 font-extrabold" title="Offline">
                📵
              </span>
            )}
          </div>

          {/* Control Center Toggle Cluster Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleControlCenter();
            }}
            className={`
              control-center-toggle-btn flex items-center justify-center h-6 w-7 rounded transition-all duration-200
              ${
                controlCenterOpen
                  ? "bg-[#007aff] text-white shadow-sm"
                  : "hover:bg-white/15 dark:hover:bg-white/10"
              }
            `}
            title="Control Center"
          >
            <span className="text-[13px] leading-none transform rotate-90">🎛️</span>
          </button>

          {/* Clock Display */}
          <span className="text-[12.5px] font-bold tracking-tight select-none">
            {formatClock(now)}
          </span>
        </div>
      </div>

      {/* Glassmorphic About Dialog */}
      {aboutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-sm">
          <div className="relative w-80 rounded-[22px] border border-[var(--chrome-border)] bg-[var(--window-bg)] backdrop-blur-3xl saturate-150 p-6 flex flex-col items-center gap-4 text-center text-[var(--text-primary)] shadow-2xl animate-window-enter">
            <span className="text-[44px] drop-shadow-md select-none"></span>
            <div className="flex flex-col gap-1">
              <h3 className="text-[16px] font-extrabold tracking-tight">{clientName}</h3>
              <p className="text-[11.5px] text-stone-500 font-semibold leading-normal">
                CourseForge Learner OS Sim
              </p>
              <p className="text-[11px] opacity-60 font-semibold leading-normal">
                Q2 Revenue Diagnostic Sandbox
              </p>
            </div>
            
            <div className="w-full bg-stone-500/10 border border-stone-500/20 rounded-xl p-3 flex flex-col gap-1.5 text-left text-[11px] font-bold">
              <div className="flex justify-between">
                <span className="opacity-50">Simulation Status</span>
                <span className="text-[#007aff]">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-50">Active Task</span>
                <span className="truncate max-w-[150px]">{taskTitle ?? "Not loaded"}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-50">Attempts Taken</span>
                <span>{attemptCount}</span>
              </div>
            </div>

            <button
              onClick={() => setAboutModalOpen(false)}
              className="mt-2 w-full py-2 bg-[#007aff] hover:bg-[#0062cc] text-white rounded-xl text-[12px] font-extrabold shadow transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
