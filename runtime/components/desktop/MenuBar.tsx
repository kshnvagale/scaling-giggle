"use client";

import { useEffect, useState } from "react";

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
  onSubmitClick: () => void;
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
  });
}

export function MenuBar({
  clientName,
  taskTitle,
  timer,
  attemptCount,
  activeWindowLabel,
  onSubmitClick,
}: MenuBarProps) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());

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

  const isLowTime = remaining !== null && remaining > 0 && remaining < 5 * 60_000;
  const isExpired = timer?.isExpired || (remaining !== null && remaining <= 0);

  return (
    <div
      className="flex h-8 select-none items-center gap-4 px-4 text-[12px]"
      style={{ background: "var(--menu-bg)", color: "var(--menu-text)" }}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">🏢</span>
        <span className="text-[13px] font-semibold tracking-tight">{clientName}</span>
      </div>

      <div className="hidden items-center gap-1 md:flex">
        {["Simulation", "Resources", "Progress"].map((item) => (
          <span
            key={item}
            className="menu-item rounded px-2.5 py-0.5 text-white/70 hover:text-white/90"
          >
            {item}
          </span>
        ))}
      </div>

      <div className="ml-2 hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/72 sm:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-[#28c840]" />
        {activeWindowLabel}
      </div>

      <div className="min-w-0 flex-1">
        {taskTitle && (
          <span className="hidden truncate text-[12px] text-white/48 lg:block">{taskTitle}</span>
        )}
      </div>

      {timer && remaining !== null && (
        <span
          className={`
            font-mono text-[12px] font-semibold tabular-nums
            ${isExpired ? "text-red-400" : isLowTime ? "text-amber-300" : "text-white/78"}
          `}
        >
          {isExpired ? "00:00" : formatTime(remaining)}
        </span>
      )}

      <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/64 sm:inline-flex">
        Attempt #{attemptCount}
      </span>

      <span className="text-white/46">{formatClock(now)}</span>

      <button
        type="button"
        onClick={onSubmitClick}
        aria-label="Open submit window"
        className="rounded-full px-3 py-1 text-[12px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-transform duration-150 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d1b16]"
        style={{ background: "var(--accent)" }}
      >
        Submit
      </button>
    </div>
  );
}
