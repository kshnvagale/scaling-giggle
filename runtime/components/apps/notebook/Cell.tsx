"use client";

import { useCaseForgeStore } from "@/lib/store";
import type { NotebookOutput } from "@/lib/types";
import CodeCell from "./CodeCell";
import MarkdownCell from "./MarkdownCell";

export interface ResolvedCell {
  id: string;
  type: "code" | "markdown";
  source: string;
  isOverlay: boolean;
  authoredOutputs: NotebookOutput[];
  executionCount?: number;
}

interface CellProps {
  slug: string;
  cell: ResolvedCell;
  isFirst: boolean;
  isLast: boolean;
  notebookRuntime: "simulated" | "pyodide";
}

export default function Cell({
  slug,
  cell,
  isFirst,
  isLast,
  notebookRuntime,
}: CellProps) {
  const moveCell = useCaseForgeStore((s) => s.moveCell);
  const deleteCell = useCaseForgeStore((s) => s.deleteCell);
  const convertCellType = useCaseForgeStore((s) => s.convertCellType);

  return (
    <div className="group relative rounded-md border border-transparent hover:border-stone-200 hover:bg-stone-50/50 transition-colors px-1 py-1">
      <div className="absolute right-2 top-1 z-10 hidden gap-1 group-hover:flex">
        <button
          onClick={() => moveCell(slug, cell.id, "up")}
          disabled={isFirst}
          className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[11px] text-stone-600 hover:text-blue-600 disabled:opacity-40"
          title="Move up"
        >
          ↑
        </button>
        <button
          onClick={() => moveCell(slug, cell.id, "down")}
          disabled={isLast}
          className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[11px] text-stone-600 hover:text-blue-600 disabled:opacity-40"
          title="Move down"
        >
          ↓
        </button>
        <button
          onClick={() =>
            convertCellType(
              slug,
              cell.id,
              cell.type === "code" ? "markdown" : "code",
              cell.source,
            )
          }
          className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[11px] text-stone-600 hover:text-blue-600"
          title="Convert cell type"
        >
          {cell.type === "code" ? "→ md" : "→ code"}
        </button>
        <button
          onClick={() => deleteCell(slug, cell.id)}
          className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[11px] text-stone-600 hover:text-rose-600"
          title="Delete cell"
        >
          ×
        </button>
      </div>

      {cell.type === "code" ? (
        <CodeCell
          slug={slug}
          cellId={cell.id}
          source={cell.source}
          executionCount={cell.executionCount}
          outputs={cell.authoredOutputs}
          isOverlay={cell.isOverlay}
          notebookRuntime={notebookRuntime}
        />
      ) : (
        <MarkdownCell slug={slug} cellId={cell.id} source={cell.source} />
      )}
    </div>
  );
}
