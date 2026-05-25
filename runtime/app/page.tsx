"use client";

import { useEffect, useMemo, useState } from "react";
import { useCaseForgeStore } from "@/lib/store";
import { loadCoursePackage } from "@/lib/course-loader";
import { APP_REGISTRY } from "@/lib/app-registry";
import type { AppId } from "@/lib/types";

// Agent A
import { Desktop } from "@/components/desktop/Desktop";

// Agent B
import BriefingApp from "@/components/apps/briefing/BriefingApp";
import WikiApp from "@/components/apps/wiki/WikiApp";

// Agent C
import ChatApp from "@/components/apps/chat/ChatApp";

import SheetsApp from "@/components/apps/sheets/SheetsApp";
import BigQueryApp from "@/components/apps/bigquery/BigQueryApp";
import TerminalApp from "@/components/apps/terminal/TerminalApp";
import NotebookApp from "@/components/apps/notebook/NotebookApp";
import SubmitApp from "@/components/apps/submit/SubmitApp";

import { IntroGate } from "@/components/intro/IntroGate";
import { IntroOnboarding } from "@/components/intro/IntroOnboarding";

const APP_COMPONENTS: Record<AppId, React.ComponentType> = {
  briefing: BriefingApp,
  wiki: WikiApp,
  chat: ChatApp,
  sheets: SheetsApp,
  bigquery: BigQueryApp,
  terminal: TerminalApp,
  notebook: NotebookApp,
  submit: SubmitApp,
};

export default function HomePage() {
  const loadPkg = useCaseForgeStore((s) => s.loadCoursePackage);
  const pkg = useCaseForgeStore((s) => s.coursePackage);
  const currentTask = useCaseForgeStore((s) => s.currentTask);
  const startTimer = useCaseForgeStore((s) => s.startTimer);
  const [error, setError] = useState<string | null>(null);

  // Gate the Submit app into the dock only for iterative judge cases (Netflix).
  // Helix and other single-shot cases keep the original 7-app dock.
  const visibleApps = useMemo(() => {
    const judgeMode =
      currentTask?.deliverable?.judgeMode ??
      pkg?.modules?.[0]?.tasks?.[0]?.deliverable?.judgeMode ??
      "single";
    return APP_REGISTRY.filter((app) => {
      if (app.id === "submit") return judgeMode === "iterative";
      return true;
    });
  }, [pkg, currentTask]);

  useEffect(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    const caseId = new URLSearchParams(search).get("case");
    const url =
      caseId === "netflix"
        ? "/course-package-netflix.json"
        : "/course-package.json";
    loadCoursePackage(url)
      .then((data) => {
        loadPkg(data);
        const task = data.modules?.[0]?.tasks?.[0];
        if (task?.durationMinutes) {
          startTimer(task.durationMinutes);
        }
      })
      .catch((err) => setError(err.message));
  }, [loadPkg, startTimer]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg font-medium">Failed to load simulation</p>
          <p className="text-stone-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <IntroGate />
      {pkg ? (
        <Desktop appRegistry={visibleApps} appComponents={APP_COMPONENTS} />
      ) : (
        <div className="min-h-screen bg-black" aria-hidden="true" />
      )}
      <IntroOnboarding />
    </>
  );
}
