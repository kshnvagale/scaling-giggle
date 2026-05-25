"use client";

import { useMemo, useState } from "react";
import { useCaseForgeStore } from "@/lib/store";
import { mockJudge } from "@/lib/mock-judge";
import FeedbackBubble from "./FeedbackBubble";
import type { Task, CoursePackage } from "@/lib/types";

interface Props {
  task: Task;
  pkg: CoursePackage;
}

export default function IterativeSubmit({ task, pkg }: Props) {
  const insightsDraft = useCaseForgeStore((s) => s.insightsDraft);
  const setInsightsDraft = useCaseForgeStore((s) => s.setInsightsDraft);
  const feedbackHistory = useCaseForgeStore((s) => s.feedbackHistory);
  const appendFeedback = useCaseForgeStore((s) => s.appendFeedback);
  const submissionFinalized = useCaseForgeStore((s) => s.submissionFinalized);
  const finalizeSubmission = useCaseForgeStore((s) => s.finalizeSubmission);
  const notebooks = useCaseForgeStore(
    (s) => s.coursePackage?.fixtures?.notebooks ?? [],
  );

  const [reviewing, setReviewing] = useState(false);
  const [confirmingFinal, setConfirmingFinal] = useState(false);

  const linkedNotebook = useMemo(
    () =>
      notebooks.find((nb: any) => nb.linkedTasks?.includes(task.id)) ?? null,
    [notebooks, task.id],
  );

  function buildJudgeInput() {
    const cells = linkedNotebook?.cells ?? [];
    const sources = cells
      .filter((c: any) => c.type === "code")
      .map((c: any) => String(c.source ?? "").toLowerCase())
      .join("\n");
    return {
      insightsText: insightsDraft,
      notebookCellCount: cells.length,
      notebookSourceConcat: sources,
    };
  }

  async function handleGetFeedback() {
    if (submissionFinalized || reviewing) return;
    setReviewing(true);
    await new Promise((r) => setTimeout(r, 1500));
    const state = mockJudge(buildJudgeInput(), task.deliverable.mockFeedback ?? []);
    if (state) {
      appendFeedback({
        round: feedbackHistory.length + 1,
        feedback: state.feedback,
        fromPersonaId: state.fromPersonaId,
      });
    }
    setReviewing(false);
  }

  const personaName = useMemo(() => {
    const id = task.deliverable.mockFeedback?.[0]?.fromPersonaId ?? "priya";
    return pkg.personas.find((p) => p.id === id)?.name ?? id;
  }, [pkg.personas, task.deliverable.mockFeedback]);

  if (submissionFinalized) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-stone-50">
        <div className="max-w-md rounded-lg border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800">Submission locked</h2>
          <p className="mt-2 text-sm text-stone-600">
            Your final submission has been recorded. Nice work — {personaName} will take it from here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col bg-stone-50">
      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        <div className="flex flex-1 flex-col">
          <label className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Insights & Recommendations
          </label>
          <textarea
            value={insightsDraft}
            onChange={(e) => setInsightsDraft(e.target.value)}
            placeholder="Write your insights and recommendations here. Plain English. Three recommendations max."
            className="flex-1 rounded-md border border-stone-200 bg-white p-3 text-sm leading-relaxed text-stone-800 shadow-sm focus:border-stone-400 focus:outline-none"
          />
        </div>
        <div className="flex w-72 flex-col">
          <label className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Notebook preview
          </label>
          <div className="flex-1 overflow-y-auto rounded-md border border-stone-200 bg-white p-3 text-xs text-stone-600 shadow-sm">
            {linkedNotebook ? (
              <>
                <div className="mb-2 font-semibold text-stone-700">{linkedNotebook.title}</div>
                {linkedNotebook.cells.map((c: any, i: number) => (
                  <div key={c.id} className="mb-2 border-l-2 border-stone-200 pl-2">
                    <span className="mr-1 text-stone-400">[{i + 1}]</span>
                    <code className="whitespace-pre-wrap break-all">
                      {String(c.source ?? "").slice(0, 120)}
                      {String(c.source ?? "").length > 120 ? "…" : ""}
                    </code>
                  </div>
                ))}
              </>
            ) : (
              <span className="text-stone-400">No notebook linked.</span>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-stone-200 bg-stone-100 p-4">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-500">
          Feedback from {personaName}
        </label>
        <div className="max-h-48 space-y-3 overflow-y-auto">
          {feedbackHistory.length === 0 && !reviewing && (
            <p className="text-xs text-stone-400">
              No feedback yet. Submit a draft to get a review.
            </p>
          )}
          {feedbackHistory.map((entry) => {
            const persona = pkg.personas.find((p) => p.id === entry.fromPersonaId);
            return (
              <FeedbackBubble
                key={entry.id}
                round={entry.round}
                feedback={entry.feedback}
                fromPersonaName={persona?.name ?? entry.fromPersonaId}
                at={entry.at}
              />
            );
          })}
          {reviewing && (
            <div className="text-xs italic text-stone-500">
              {personaName} is reviewing your draft…
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-stone-200 bg-white px-4 py-3">
        <button
          onClick={handleGetFeedback}
          disabled={reviewing}
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stone-700 disabled:opacity-50"
        >
          {reviewing ? "Reviewing…" : `Get feedback from ${personaName}`}
        </button>
        <button
          onClick={() => setConfirmingFinal(true)}
          className="text-sm text-stone-600 underline-offset-2 hover:underline"
        >
          Final submit
        </button>
      </div>

      {confirmingFinal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-stone-800">Lock in your submission?</h3>
            <p className="mt-2 text-sm text-stone-600">
              Once you final-submit, your work is locked and you can&apos;t iterate further.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmingFinal(false)}
                className="rounded-md px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  finalizeSubmission();
                  setConfirmingFinal(false);
                }}
                className="rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-700"
              >
                Submit & lock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
