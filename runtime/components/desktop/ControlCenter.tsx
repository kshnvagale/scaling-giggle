"use client";

import { useCaseForgeStore } from "@/lib/store";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

interface ControlCenterProps {
  isOpen: boolean;
  onClose: () => void;
  brightness: number;
  setBrightness: (b: number) => void;
}

export default function ControlCenter({
  isOpen,
  onClose,
  brightness,
  setBrightness,
}: ControlCenterProps) {
  const {
    desktopTheme,
    setDesktopTheme,
    isOnline,
    setIsOnline,
    volume,
    setVolume,
  } = useCaseForgeStore();

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (isOpen && containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { scale: 0.94, opacity: 0, y: -10, filter: "blur(8px)" },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.3,
          ease: "back.out(1.2)",
        }
      );
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        // Prevent immediate close if clicking the toggle button
        const target = e.target as HTMLElement;
        if (target.closest(".control-center-toggle-btn")) return;
        onClose();
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="
        control-center-panel absolute right-4 top-11 z-50 w-[320px] rounded-[22px] p-4.5 select-none
        border border-white/20 dark:border-white/10
        bg-white/25 dark:bg-black/30 backdrop-blur-3xl saturate-150
        shadow-[0_20px_60px_rgba(0,0,0,0.22),0_0_1px_rgba(0,0,0,0.2)]
        flex flex-col gap-4 text-[var(--text-primary)]
      "
      style={{
        transformOrigin: "top right",
      }}
    >
      {/* Top Section: Toggles Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Connection Box */}
        <div className="flex flex-col justify-between rounded-[16px] bg-white/35 dark:bg-black/20 p-3 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`
                flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 shadow-sm
                ${
                  isOnline
                    ? "bg-[#007aff] text-white"
                    : "bg-white/30 dark:bg-white/10 text-stone-600 dark:text-stone-400"
                }
              `}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M21 21h1.5m-3 0h-3.75a1.125 1.125 0 01-1.125-1.125V18a2.25 2.25 0 00-2.25-2.25h-1.5a2.25 2.25 0 00-2.25 2.25v1.875c0 .621-.504 1.125-1.125 1.125H3.75A1.125 1.125 0 012.625 19.875V9.75M9 9h.008v.008H9V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.008v.008H9v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm9-5.25h.008v.008h-.008V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.008v.008h-.008v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
            </button>
            <div className="flex flex-col min-w-0">
              <span className="text-[11.5px] font-bold tracking-tight truncate leading-tight">
                Wi-Fi
              </span>
              <span className="text-[10px] opacity-60 font-semibold leading-tight">
                {isOnline ? "helix-corp" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Focus / Bluetooth Mock */}
        <div className="flex flex-col justify-between rounded-[16px] bg-white/35 dark:bg-black/20 p-3 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white shadow-sm">
              🌙
            </span>
            <div className="flex flex-col">
              <span className="text-[11.5px] font-bold tracking-tight leading-tight">
                Focus
              </span>
              <span className="text-[10px] opacity-60 font-semibold leading-tight">
                Do Not Disturb
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Control Block */}
      <div className="rounded-[16px] bg-white/35 dark:bg-black/20 p-3 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] flex flex-col gap-2">
        <span className="text-[11px] font-bold opacity-60 uppercase tracking-wider pl-0.5">
          System Aesthetic Theme
        </span>
        <div className="flex rounded-[10px] bg-black/5 dark:bg-white/5 p-1 border border-black/5 dark:border-white/5 relative z-10">
          {(["kraft", "macos-light", "macos-dark"] as const).map((theme) => {
            const isActive = desktopTheme === theme;
            const labelMap = {
              kraft: "Kraft Paper",
              "macos-light": "Aqua Light",
              "macos-dark": "Obsidian Dark",
            };
            return (
              <button
                key={theme}
                onClick={() => setDesktopTheme(theme)}
                className={`
                  flex-1 py-1 text-[11px] font-bold rounded-[7px] text-center transition-all duration-200
                  ${
                    isActive
                      ? "bg-white dark:bg-white/15 text-[var(--text-primary)] shadow-sm border border-black/5 dark:border-white/5"
                      : "text-stone-600 dark:text-stone-400 hover:text-[var(--text-primary)]"
                  }
                `}
              >
                {labelMap[theme]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Display & Sound Sliders */}
      <div className="rounded-[16px] bg-white/35 dark:bg-black/20 p-3.5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] flex flex-col gap-4">
        {/* Brightness Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center px-0.5">
            <span className="text-[11.5px] font-bold tracking-tight opacity-75">
              Display Brightness
            </span>
            <span className="text-[10.5px] font-mono opacity-60">{brightness}%</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">☀️</span>
            <input
              type="range"
              min="15"
              max="100"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="
                h-4 flex-1 cursor-pointer appearance-none rounded-full bg-black/10 dark:bg-white/15 outline-none overflow-hidden
                accent-[#007aff] dark:accent-[#0a84ff]
              "
              style={{
                WebkitAppearance: "none",
              }}
            />
          </div>
        </div>

        {/* Volume Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center px-0.5">
            <span className="text-[11.5px] font-bold tracking-tight opacity-75">
              System Volume
            </span>
            <span className="text-[10.5px] font-mono opacity-60">{volume}%</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">🔊</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="
                h-4 flex-1 cursor-pointer appearance-none rounded-full bg-black/10 dark:bg-white/15 outline-none overflow-hidden
                accent-[#007aff] dark:accent-[#0a84ff]
              "
              style={{
                WebkitAppearance: "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* Attempt Widget Summary */}
      <div className="rounded-[16px] bg-white/35 dark:bg-black/20 p-3 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-base">💼</span>
          <span className="text-[11.5px] font-bold">Evaluation Sandbox</span>
        </div>
        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Connected
        </span>
      </div>
    </div>
  );
}
