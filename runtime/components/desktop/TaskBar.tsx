"use client";

import { useEffect, useState } from "react";

interface TaskBarProps {
  taskTitle: string | null;
  timer: {
    startedAt: number;
    durationMinutes: number;
    isExpired: boolean;
  } | null;
  attemptCount: number;
}

function formatTime(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function TaskBar({ taskTitle, timer, attemptCount }: TaskBarProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!timer) {
      setRemaining(null);
      return;
    }

    function tick() {
      const end = timer!.startedAt + timer!.durationMinutes * 60_000;
      setRemaining(end - Date.now());
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const isLowTime = remaining !== null && remaining > 0 && remaining < 5 * 60_000;
  const isExpired = timer?.isExpired || (remaining !== null && remaining <= 0);

  const timerColor = isExpired
    ? "text-red-600"
    : isLowTime
      ? "text-amber-600"
      : "text-stone-700";

  return (
    <div className="h-12 flex-shrink-0 flex items-center justify-between px-5 bg-white/80 border-b border-[#d4c5a9]">
      {/* Left — task title */}
      <div className="flex-1 min-w-0">
        {taskTitle ? (
          <p className="text-sm font-medium text-stone-700 truncate">
            {taskTitle}
          </p>
        ) : (
          <p className="text-sm text-stone-400 italic">No task loaded</p>
        )}
      </div>

      {/* Center — timer */}
      <div className="flex-shrink-0 mx-4">
        {timer && remaining !== null ? (
          <span className={`text-sm font-mono font-semibold ${timerColor}`}>
            {isExpired ? "00:00" : formatTime(remaining)}
          </span>
        ) : (
          <span className="text-sm text-stone-400">--:--</span>
        )}
      </div>

      {/* Right — attempt badge */}
      <div className="flex-shrink-0">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          Attempt #{attemptCount}
        </span>
      </div>
    </div>
  );
}
