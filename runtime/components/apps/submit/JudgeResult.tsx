"use client";

import type { JudgeResult as JudgeResultType } from "@/lib/types";

interface JudgeResultProps {
  result: JudgeResultType;
}

function ScoreBadge({ score }: { score: number }) {
  let className = "border-[#ddd3c4] bg-[#faf8f3] text-[#4f463b]";
  if (score >= 4) className = "border-[#cdd9cf] bg-[#f4faf5] text-[#2b6b46]";
  if (score <= 2) className = "border-[#ead2cb] bg-[#fff8f6] text-[#9a4538]";

  return (
    <span
      className={`inline-flex min-w-12 items-center justify-center rounded-full border px-3 py-1 text-sm font-medium ${className}`}
    >
      {score}/5
    </span>
  );
}

function StatusPill({ passed }: { passed: boolean }) {
  return (
    <span
      className={`
        inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.14em]
        ${passed
          ? "border-[#cdd9cf] bg-[#f4faf5] text-[#2b6b46]"
          : "border-[#ead2cb] bg-[#fff8f6] text-[#9a4538]"
        }
      `}
    >
      <span
        className={`h-2 w-2 rounded-full ${passed ? "bg-[#2b6b46]" : "bg-[#9a4538]"}`}
      />
      {passed ? "Approved" : "Needs revision"}
    </span>
  );
}

function ResultSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#ddd3c4] bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-[#231d15]">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function JudgeResult({ result }: JudgeResultProps) {
  const { passed, overallFeedback, criteriaResults } = result;
  const hardCriteria = criteriaResults.filter((criterion) => criterion.score === undefined);
  const qualitativeCriteria = criteriaResults.filter((criterion) => criterion.score !== undefined);
  const passedCount = criteriaResults.filter((criterion) => criterion.passed).length;
  const averageScore =
    qualitativeCriteria.length > 0
      ? (
          qualitativeCriteria.reduce((sum, criterion) => sum + (criterion.score ?? 0), 0) /
          qualitativeCriteria.length
        ).toFixed(1)
      : null;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#ddd3c4] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <StatusPill passed={passed} />
            <h2 className="mt-3 text-2xl font-semibold text-[#231d15]">
              {passed ? "Submission accepted" : "Submission needs changes"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#625a4e]">
              {passed
                ? "The deliverable passed the review criteria."
                : "The evaluator found issues that should be fixed before the next attempt."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[220px]">
            <SummaryTile label="Passed" value={`${passedCount}/${criteriaResults.length}`} />
            <SummaryTile
              label={averageScore ? "Average" : "Hard gates"}
              value={averageScore ?? `${hardCriteria.length}`}
            />
          </div>
        </div>
      </section>

      <ResultSection title="Overall feedback">
        <p className="text-sm leading-6 text-[#4f463b]">{overallFeedback}</p>
      </ResultSection>

      {hardCriteria.length > 0 && (
        <ResultSection title="Hard criteria">
          <ul className="space-y-3">
            {hardCriteria.map((criterion) => (
              <li
                key={criterion.criterionId}
                className="rounded-xl border border-[#ece5da] bg-[#faf8f3] px-4 py-3"
              >
                <div className="flex gap-3">
                  <span
                    className={`
                      mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium
                      ${criterion.passed
                        ? "bg-[#e8f3ea] text-[#2b6b46]"
                        : "bg-[#fff1ed] text-[#9a4538]"
                      }
                    `}
                  >
                    {criterion.passed ? "✓" : "!"}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[#231d15]">
                      {criterion.description}
                    </p>
                    {criterion.feedback && (
                      <p className="mt-1 text-sm leading-6 text-[#625a4e]">
                        {criterion.feedback}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ResultSection>
      )}

      {qualitativeCriteria.length > 0 && (
        <ResultSection title="Qualitative scoring">
          <ul className="space-y-3">
            {qualitativeCriteria.map((criterion) => (
              <li
                key={criterion.criterionId}
                className="rounded-xl border border-[#ece5da] bg-[#faf8f3] px-4 py-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#231d15]">
                      {criterion.description}
                    </p>
                    {criterion.feedback && (
                      <p className="mt-1 text-sm leading-6 text-[#625a4e]">
                        {criterion.feedback}
                      </p>
                    )}
                  </div>
                  {criterion.score !== undefined && <ScoreBadge score={criterion.score} />}
                </div>
              </li>
            ))}
          </ul>
        </ResultSection>
      )}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#ece5da] bg-[#faf8f3] px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#857765]">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-[#231d15]">{value}</p>
    </div>
  );
}
