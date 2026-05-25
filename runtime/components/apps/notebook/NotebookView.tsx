"use client";

import { useEffect, useMemo } from "react";
import { useCaseForgeStore } from "@/lib/store";
import type { Notebook } from "@/lib/types";
import Cell, { type ResolvedCell } from "./Cell";
import AddCellButton from "./AddCellButton";

interface NotebookViewProps {
  notebook: Notebook;
}

export default function NotebookView({ notebook }: NotebookViewProps) {
  const overlay = useCaseForgeStore((s) => s.notebookState[notebook.slug]);
  const initOverlay = useCaseForgeStore((s) => s.initNotebookOverlay);
  const addCell = useCaseForgeStore((s) => s.addCell);
  const runAll = useCaseForgeStore((s) => s.runAll);

  const bootStatus = useCaseForgeStore((s) => s.pyodideBootStatus);
  const bootError = useCaseForgeStore((s) => s.pyodideBootError);
  const bootPyodide = useCaseForgeStore((s) => s.bootPyodide);

  // Submit-for-Review (iterative judge cases)
  const currentTask = useCaseForgeStore((s) => s.currentTask);
  const personas = useCaseForgeStore((s) => s.coursePackage?.personas ?? []);
  const reviewStatus = useCaseForgeStore((s) => s.reviewStatus);
  const reviewCount = useCaseForgeStore((s) => s.reviewCount);
  const submissionFinalized = useCaseForgeStore((s) => s.submissionFinalized);
  const submitForReview = useCaseForgeStore((s) => s.submitForReview);
  const setActivePersonaId = useCaseForgeStore((s) => s.setActivePersonaId);
  const requestOpenWindow = useCaseForgeStore((s) => s.requestOpenWindow);

  const judgeMode: string = currentTask?.deliverable?.judgeMode ?? "single";
  const isIterativeCase = judgeMode === "iterative";
  const reviewerId: string =
    currentTask?.deliverable?.mockFeedback?.[0]?.fromPersonaId ?? "priya";
  const reviewer = personas.find((p: { id: string }) => p.id === reviewerId);
  const reviewerName: string = reviewer?.name ?? "Priya";

  const isPyodide = notebook.runtime === "pyodide";

  async function handleSubmitForReview() {
    if (reviewStatus === "reviewing" || submissionFinalized) return;
    // Open Chat focused on the reviewer's thread BEFORE the API call so the
    // user immediately sees where feedback will land. The "Priya is reviewing"
    // indicator appears in the chat thread while submitForReview is in-flight.
    setActivePersonaId(reviewerId);
    requestOpenWindow("chat");
    await submitForReview();
  }

  const submitDisabled =
    reviewStatus === "reviewing" ||
    submissionFinalized ||
    (isPyodide && bootStatus !== "ready");

  useEffect(() => {
    initOverlay(
      notebook.slug,
      notebook.cells.map((c) => c.id),
    );
  }, [notebook.slug, notebook.cells, initOverlay]);

  useEffect(() => {
    if (isPyodide && bootStatus === "idle") {
      void bootPyodide();
    }
  }, [isPyodide, bootStatus, bootPyodide]);

  const resolved = useMemo<ResolvedCell[]>(() => {
    if (!overlay) return [];
    const authoredById = new Map(notebook.cells.map((c) => [c.id, c]));
    return overlay.cellOrder.map((id) => {
      const authored = authoredById.get(id);
      const userCell = overlay.userCells[id];
      const sourceEdit = overlay.cellSourceEdits[id];

      const type: "code" | "markdown" = userCell?.type ?? authored?.type ?? "code";
      const source = sourceEdit ?? userCell?.source ?? authored?.source ?? "";
      const isOverlay = !authored || !!userCell || sourceEdit !== undefined;

      return {
        id,
        type,
        source,
        isOverlay,
        authoredOutputs: authored && !isOverlay ? authored.outputs : [],
        executionCount: authored?.executionCount,
      };
    });
  }, [overlay, notebook.cells]);

  if (!overlay) {
    return <div className="p-6 text-sm text-stone-500">Loading notebook…</div>;
  }

  const codeCellIds = resolved.filter((c) => c.type === "code").map((c) => c.id);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-2">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-stone-900">{notebook.title}</h2>
          {isPyodide ? (
            <>
              {bootStatus === "booting" && (
                <span className="text-xs text-stone-500">
                  Booting Python kernel… ~15s
                </span>
              )}
              {bootStatus === "error" && (
                <span className="text-xs text-red-600">
                  Kernel boot failed: {bootError}
                  <button
                    onClick={() => void bootPyodide()}
                    className="ml-2 underline"
                  >
                    Retry
                  </button>
                </span>
              )}
              {bootStatus === "ready" && (
                <span className="rounded bg-stone-200 px-1.5 py-0.5 font-mono text-[10.5px] text-stone-600">
                  Python 3 (Pyodide)
                </span>
              )}
              {bootStatus === "idle" && (
                <span className="rounded bg-stone-200 px-1.5 py-0.5 font-mono text-[10.5px] text-stone-600">
                  {notebook.kernel}
                </span>
              )}
            </>
          ) : (
            <span className="rounded bg-stone-200 px-1.5 py-0.5 font-mono text-[10.5px] text-stone-600">
              {notebook.kernel} (simulated)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => runAll(notebook.slug, codeCellIds)}
            className="rounded bg-blue-600 px-2.5 py-1 text-[11.5px] font-medium text-white hover:bg-blue-700"
          >
            Run all
          </button>
          <button
            onClick={() => addCell(notebook.slug, null, "code")}
            className="rounded border border-stone-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-stone-700 hover:border-blue-300 hover:text-blue-700"
          >
            + Code
          </button>
          <button
            onClick={() => addCell(notebook.slug, null, "markdown")}
            className="rounded border border-stone-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-stone-700 hover:border-blue-300 hover:text-blue-700"
          >
            + Markdown
          </button>
          {isIterativeCase && (
            <>
              <div className="mx-1 h-4 w-px bg-stone-300" />
              <button
                onClick={handleSubmitForReview}
                disabled={submitDisabled}
                title={
                  submissionFinalized
                    ? "Submission locked"
                    : reviewStatus === "reviewing"
                    ? `${reviewerName} is reviewing…`
                    : `Send your notebook to ${reviewerName} for feedback`
                }
                className="rounded bg-[#E50914] px-3 py-1 text-[11.5px] font-semibold text-white shadow-sm hover:bg-[#b30710] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reviewStatus === "reviewing"
                  ? `${reviewerName} reviewing…`
                  : reviewCount === 0
                  ? "Submit for Review"
                  : `Submit for Review (round ${reviewCount + 1})`}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {notebook.description && (
          <p className="mb-3 text-xs italic text-stone-500">{notebook.description}</p>
        )}

        <AddCellButton slug={notebook.slug} afterCellId="__top__" />
        {resolved.map((c, i) => (
          <div key={c.id}>
            <Cell
              slug={notebook.slug}
              cell={c}
              isFirst={i === 0}
              isLast={i === resolved.length - 1}
              notebookRuntime={notebook.runtime}
            />
            <AddCellButton slug={notebook.slug} afterCellId={c.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
