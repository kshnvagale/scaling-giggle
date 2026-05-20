"use client";

import { useEffect, useMemo } from "react";
import { useCaseForgeStore } from "@/lib/store";
import type { Notebook } from "@/lib/types";
import NotebookSidebar from "./NotebookSidebar";
import NotebookView from "./NotebookView";

export default function NotebookApp() {
  const pkg = useCaseForgeStore((s) => s.coursePackage);
  const currentTask = useCaseForgeStore((s) => s.currentTask);
  const activeSlug = useCaseForgeStore((s) => s.activeNotebookSlug);
  const setActiveSlug = useCaseForgeStore((s) => s.setActiveNotebookSlug);

  const notebooks: Notebook[] = useMemo(() => {
    const all: Notebook[] = pkg?.fixtures?.notebooks ?? [];
    if (!currentTask) return all;
    return all.filter(
      (nb) => nb.linkedTasks.length === 0 || nb.linkedTasks.includes(currentTask.id),
    );
  }, [pkg, currentTask]);

  useEffect(() => {
    if (!activeSlug && notebooks.length > 0) {
      setActiveSlug(notebooks[0].slug);
    }
  }, [activeSlug, notebooks, setActiveSlug]);

  const active = notebooks.find((nb) => nb.slug === activeSlug) ?? notebooks[0];

  if (notebooks.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-stone-50 text-stone-500">
        <div className="text-center">
          <p className="text-sm">No notebooks for this task yet.</p>
          <p className="mt-1 text-xs text-stone-400">
            Notebooks linked to the current task will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-white">
      <NotebookSidebar notebooks={notebooks} activeSlug={active?.slug ?? null} />
      {active ? (
        <div className="flex-1 min-w-0">
          <NotebookView notebook={active} />
        </div>
      ) : null}
    </div>
  );
}
