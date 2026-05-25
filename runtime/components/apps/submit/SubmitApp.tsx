"use client";

import { useCaseForgeStore } from "@/lib/store";
import IterativeSubmit from "./IterativeSubmit";

export default function SubmitApp() {
  const pkg = useCaseForgeStore((s) => s.coursePackage);
  const currentTask = useCaseForgeStore((s) => s.currentTask);

  const task = currentTask ?? pkg?.modules?.[0]?.tasks?.[0];
  const judgeMode = task?.deliverable?.judgeMode ?? "single";

  if (judgeMode === "iterative") {
    return <IterativeSubmit task={task!} pkg={pkg!} />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-stone-50 text-stone-500">
      <p className="text-sm">Single-shot Submit not implemented yet.</p>
    </div>
  );
}
