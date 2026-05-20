"use client";

import { useState } from "react";
import { Markdown } from "@/components/shared/Markdown";
import { useCaseForgeStore } from "@/lib/store";

interface MarkdownCellProps {
  slug: string;
  cellId: string;
  source: string;
}

export default function MarkdownCell({ slug, cellId, source }: MarkdownCellProps) {
  const editCellSource = useCaseForgeStore((s) => s.editCellSource);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <textarea
        autoFocus
        value={source}
        onChange={(e) => editCellSource(slug, cellId, e.target.value)}
        onBlur={() => setEditing(false)}
        className="w-full min-h-[120px] resize-y rounded border border-stone-200 bg-white px-3 py-2 font-mono text-[13px] leading-relaxed text-stone-800 focus:border-stone-400 focus:outline-none"
        placeholder="Markdown content…"
      />
    );
  }

  return (
    <div
      onDoubleClick={() => setEditing(true)}
      className="cursor-text px-3 py-2"
      title="Double-click to edit"
    >
      <Markdown content={source} className="prose prose-stone prose-sm max-w-none" />
    </div>
  );
}
