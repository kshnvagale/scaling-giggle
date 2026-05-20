"use client";

import Editor from "react-simple-code-editor";
import { useCaseForgeStore } from "@/lib/store";
import { highlight } from "@/lib/notebook-prism";
import CellOutput from "./CellOutput";
import type { NotebookOutput } from "@/lib/types";

interface CodeCellProps {
  slug: string;
  cellId: string;
  source: string;
  executionCount?: number;
  outputs: NotebookOutput[];
  isOverlay: boolean;
}

export default function CodeCell({
  slug,
  cellId,
  source,
  executionCount,
  outputs,
  isOverlay,
}: CodeCellProps) {
  const editCellSource = useCaseForgeStore((s) => s.editCellSource);
  const runCell = useCaseForgeStore((s) => s.runCell);
  const runState = useCaseForgeStore(
    (s) => s.notebookState[slug]?.cellRunStates[cellId] ?? "idle",
  );

  const showOutput = runState === "done";
  const resolvedOutputs: NotebookOutput[] =
    isOverlay || outputs.length === 0
      ? [
          {
            type: "stdout",
            content:
              "(no recorded output — this notebook is a simulated environment)",
          },
        ]
      : outputs;

  return (
    <div className="flex gap-2">
      <div className="flex w-12 flex-col items-end pr-1 pt-1 text-[11px] text-stone-400">
        <button
          onClick={() => runCell(slug, cellId)}
          disabled={runState === "running"}
          className="mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50"
          title="Run cell"
          aria-label="Run cell"
        >
          {runState === "running" ? (
            <span className="block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <path d="M2 1 L9 5 L2 9 Z" fill="currentColor" />
            </svg>
          )}
        </button>
        <span className="font-mono">
          [
          {showOutput && executionCount !== undefined
            ? executionCount
            : runState === "done"
            ? "*"
            : " "}
          ]
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="notebook-prism rounded border border-stone-200 bg-white">
          <Editor
            value={source}
            onValueChange={(v) => editCellSource(slug, cellId, v)}
            highlight={(code) => highlight(code, "python")}
            padding={10}
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          />
        </div>
        {showOutput && (
          <div className="mt-2 space-y-2 px-1">
            {resolvedOutputs.map((out, i) => (
              <CellOutput key={i} output={out} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
