"use client";

import { useCaseForgeStore } from "@/lib/store";

interface AddCellButtonProps {
  slug: string;
  afterCellId: string | null;
}

export default function AddCellButton({ slug, afterCellId }: AddCellButtonProps) {
  const addCell = useCaseForgeStore((s) => s.addCell);

  return (
    <div className="group flex h-6 items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
      <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-2 py-1 shadow-sm">
        <button
          onClick={() => addCell(slug, afterCellId, "code")}
          className="text-[11px] font-medium text-stone-600 hover:text-blue-600"
        >
          + Code
        </button>
        <span className="text-stone-300">·</span>
        <button
          onClick={() => addCell(slug, afterCellId, "markdown")}
          className="text-[11px] font-medium text-stone-600 hover:text-blue-600"
        >
          + Markdown
        </button>
      </div>
    </div>
  );
}
