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
      className="
        relative flex h-8 select-none items-center gap-4 px-4 text-[13px] font-semibold text-white
        bg-black/15 backdrop-blur-2xl
        shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]
      "
      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[15px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">🏢</span>
        <span className="text-[13px] font-semibold tracking-tight">{clientName}</span>
      </div>

      <div className="hidden items-center gap-0.5 md:flex">
        {["Simulation", "Resources", "Progress"].map((item) => (
          <span
            key={item}
            className="menu-item cursor-default rounded px-2.5 py-0.5 text-white/95 hover:bg-white/15"
          >
            {item}
          </span>
        ))}
      </div>

      <div className="ml-1 hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/85 backdrop-blur-md sm:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-[#28c840] shadow-[0_0_6px_rgba(40,200,64,0.6)]" />
        {activeWindowLabel}
      </div>

      <div className="min-w-0 flex-1">
        {taskTitle && (
          <span className="hidden truncate text-[12px] font-medium text-white/70 lg:block">
            {taskTitle}
          </span>
        )}
      </div>

      {timer && remaining !== null && (
        <span
          className={`
            font-mono text-[12px] font-semibold tabular-nums
            ${isExpired ? "text-red-300" : isLowTime ? "text-amber-200" : "text-white/90"}
          `}
        >
          {isExpired ? "00:00" : formatTime(remaining)}
        </span>
      )}

      <span className="hidden rounded-full bg-white/12 px-2 py-0.5 text-[11px] font-medium text-white/80 sm:inline-flex">
        Attempt #{attemptCount}
      </span>

      <span className="text-[12px] font-medium text-white/80">{formatClock(now)}</span>
    </div>
  );
}
