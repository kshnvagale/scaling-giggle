"use client";

import { useCaseForgeStore } from "@/lib/store";
import type { Notebook } from "@/lib/types";

interface NotebookSidebarProps {
  notebooks: Notebook[];
  activeSlug: string | null;
}

export default function NotebookSidebar({ notebooks, activeSlug }: NotebookSidebarProps) {
  const setActiveNotebookSlug = useCaseForgeStore((s) => s.setActiveNotebookSlug);

  return (
    <aside className="flex w-56 flex-col border-r border-stone-200 bg-stone-50">
      <div className="border-b border-stone-200 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-stone-500">
        Notebooks
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {notebooks.map((nb) => {
          const active = nb.slug === activeSlug;
          return (
            <button
              key={nb.slug}
              onClick={() => setActiveNotebookSlug(nb.slug)}
              className={`block w-full truncate px-3 py-2 text-left text-[12.5px] ${
                active
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
              title={nb.title}
            >
              {nb.title}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
