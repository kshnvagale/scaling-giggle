"use client";

import { useCaseForgeStore } from "@/lib/store";
import { Markdown } from "@/components/shared/Markdown";
import { MeetingRecording } from "./MeetingRecording";

export default function BriefingApp() {
  const currentTask = useCaseForgeStore((s) => s.currentTask);

  if (!currentTask) {
    return (
      <div className="flex h-full items-center justify-center text-stone-400">
        No task loaded.
      </div>
    );
  }

  const { title, brief, deliverable, durationMinutes, meetingRecording } = currentTask;

  return (
    <div className="h-full overflow-y-auto bg-stone-50">
      <div className="mx-auto max-w-3xl px-8 py-10">
        {/* Meeting recording (optional) */}
        {meetingRecording && (
          <div className="mb-8">
            <MeetingRecording recording={meetingRecording} />
          </div>
        )}

        {/* Task title */}
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          {title}
        </h1>

        {/* Duration badge */}
        <span className="mt-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
          ~{durationMinutes} minutes
        </span>

        {/* Brief */}
        <div className="mt-8">
          <Markdown content={brief} className="prose prose-stone max-w-none" />
        </div>

        {/* Deliverable info box */}
        <div className="mt-10 rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-amber-900">
            Deliverable
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex gap-3">
              <dt className="w-24 flex-shrink-0 font-medium text-stone-500">
                Type
              </dt>
              <dd className="text-stone-800">{deliverable.type}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-24 flex-shrink-0 font-medium text-stone-500">
                Format
              </dt>
              <dd className="text-stone-800">{deliverable.format}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-24 flex-shrink-0 font-medium text-stone-500">
                Acceptance
              </dt>
              <dd className="text-stone-800">
                {deliverable.acceptanceSummary}
              </dd>
            </div>
          </dl>
        </div>

        {/* Hint card */}
        <div className="mt-8 rounded-lg border border-stone-200 bg-white p-5 text-sm leading-relaxed text-stone-600">
          Use the <strong className="text-stone-800">Wiki</strong> to research,{" "}
          <strong className="text-stone-800">Chat</strong> to interview SMEs,
          then <strong className="text-stone-800">Submit</strong> your
          deliverable.
        </div>
      </div>
    </div>
  );
}
