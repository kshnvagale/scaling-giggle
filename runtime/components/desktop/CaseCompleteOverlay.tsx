"use client";

import { useEffect, useState } from "react";
import { useCaseForgeStore } from "@/lib/store";

/**
 * Full-screen celebration shown when the active case is finalized
 * (submissionFinalized = true). Mounts on top of the desktop, dims everything
 * behind it. The store flips this flag from submitForReview() when the
 * judge returns a score >= deliverable.completionScoreThreshold.
 */
export default function CaseCompleteOverlay() {
  const submissionFinalized = useCaseForgeStore((s) => s.submissionFinalized);
  const lastReviewScore = useCaseForgeStore((s) => s.lastReviewScore);
  const reviewCount = useCaseForgeStore((s) => s.reviewCount);
  const pkg = useCaseForgeStore((s) => s.coursePackage);
  const currentTask = useCaseForgeStore((s) => s.currentTask);
  const timer = useCaseForgeStore((s) => s.timer);

  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Tiny entrance animation hook — trigger on mount so opacity/scale animates in.
  useEffect(() => {
    if (submissionFinalized) {
      const t = setTimeout(() => setMounted(true), 30);
      return () => clearTimeout(t);
    }
    setMounted(false);
    setDismissed(false);
  }, [submissionFinalized]);

  if (!submissionFinalized || dismissed) return null;

  const clientName: string = pkg?.world?.client?.name ?? pkg?.meta?.client ?? "Case";
  const taskTitle: string = currentTask?.title ?? "Case complete";
  const personaId: string = currentTask?.deliverable?.mockFeedback?.[0]?.fromPersonaId ?? "";
  const personaName: string =
    pkg?.personas?.find((p: { id: string; name: string }) => p.id === personaId)?.name ?? "";

  const elapsedMinutes = formatElapsed(timer);
  const score = lastReviewScore ?? 0;

  return (
    <div
      className="absolute inset-0 z-[100] flex items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.82) 70%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        className="mx-6 max-w-lg rounded-2xl border border-white/10 bg-stone-950 px-10 py-9 text-center shadow-2xl"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "scale(1)" : "scale(0.96)",
          transition: "opacity 400ms ease-out, transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
          {clientName}
        </div>
        <div className="mb-6 text-3xl font-bold tracking-tight text-white">
          Case complete 🎉
        </div>

        <div className="mb-7 text-sm leading-relaxed text-white/70">
          {personaName ? `${personaName} locked in your submission.` : "Your submission has been locked in."}
          <br />
          Great work.
        </div>

        <div className="mb-8 grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-white/5 p-1">
          <Stat label="Final score" value={`${score}/100`} />
          <Stat label="Review rounds" value={String(reviewCount)} />
          <Stat label="Time used" value={elapsedMinutes} />
        </div>

        <div className="text-left">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            What you submitted
          </div>
          <div className="text-sm text-white/80">
            {taskTitle}
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="mt-8 w-full rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-stone-900 transition hover:bg-stone-100"
        >
          Done
        </button>

        <div className="mt-3 text-[11px] text-white/30">
          (Reload the page to start over)
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-stone-900 px-3 py-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-white/40">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-white">{value}</div>
    </div>
  );
}

function formatElapsed(timer: { startedAt?: number } | null | undefined): string {
  if (!timer?.startedAt) return "—";
  const minutes = Math.max(0, Math.floor((Date.now() - timer.startedAt) / 60_000));
  if (minutes === 0) return "< 1 min";
  return `${minutes} min`;
}
