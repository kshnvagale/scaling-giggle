"use client";

import { useCallback, useMemo } from "react";
import { useCaseForgeStore } from "@/lib/store";
import { MAX_FILE_SIZE_MB } from "@/lib/constants";
import FileUploader from "./FileUploader";
import JudgeResult from "./JudgeResult";
import RetryPrompt from "./RetryPrompt";

function formatAcceptedFormats(formats: string[]) {
  return formats.map((format) => format.toUpperCase()).join(" · ");
}

function splitAcceptanceSummary(summary: string) {
  const items = summary
    .split(/[\n.]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : [summary];
}

export default function SubmitApp() {
  const currentTask = useCaseForgeStore((state) => state.currentTask);
  const uploadedFile = useCaseForgeStore((state) => state.uploadedFile);
  const judgeResult = useCaseForgeStore((state) => state.judgeResult);
  const isJudging = useCaseForgeStore((state) => state.isJudging);
  const attemptCount = useCaseForgeStore((state) => state.attemptCount);
  const setUploadedFile = useCaseForgeStore((state) => state.setUploadedFile);
  const setJudgeResult = useCaseForgeStore((state) => state.setJudgeResult);
  const setIsJudging = useCaseForgeStore((state) => state.setIsJudging);
  const incrementAttemptCount = useCaseForgeStore((state) => state.incrementAttemptCount);
  const resetSubmission = useCaseForgeStore((state) => state.resetSubmission);

  const handleSubmit = useCallback(async () => {
    if (!uploadedFile || !currentTask) {
      return;
    }

    setIsJudging(true);

    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsDataURL(uploadedFile);
      });

      const nameParts = uploadedFile.name.split(".");
      const fileType =
        nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase() : "other";

      const { rubric, deliverable } = currentTask;

      const response = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judgePromptTemplate: rubric.judgePromptTemplate,
          hardCriteria: rubric.hardCriteria,
          qualitativeCriteria: rubric.qualitativeCriteria,
          passCondition: rubric.passCondition,
          deliverableDescription: deliverable.acceptanceSummary,
          fileContent: base64String,
          fileType,
        }),
      });

      const data = await response.json();

      setJudgeResult({
        passed: data.passed ?? false,
        criteriaResults: data.criteriaResults ?? [],
        overallFeedback:
          data.overallFeedback ?? "No feedback received from the judge.",
        timestamp: Date.now(),
      });
      incrementAttemptCount();
    } catch {
      setJudgeResult({
        passed: false,
        criteriaResults: [],
        overallFeedback:
          "An error occurred while grading your submission. Please try again.",
        timestamp: Date.now(),
      });
      incrementAttemptCount();
    } finally {
      setIsJudging(false);
    }
  }, [
    currentTask,
    incrementAttemptCount,
    setIsJudging,
    setJudgeResult,
    uploadedFile,
  ]);

  const handleRetry = useCallback(() => {
    resetSubmission();
  }, [resetSubmission]);

  if (!currentTask) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f7f4ee] text-[#6f675b]">
        No task loaded.
      </div>
    );
  }

  const { deliverable } = currentTask;
  const acceptedFormats =
    deliverable.format === "other"
      ? ["pdf", "png", "jpg", "md", "zip"]
      : [deliverable.format];
  const acceptanceChecklist = useMemo(
    () => splitAcceptanceSummary(deliverable.acceptanceSummary),
    [deliverable.acceptanceSummary],
  );

  if (isJudging) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f7f4ee] px-6 py-10">
        <div className="w-full max-w-xl rounded-2xl border border-[#ddd3c4] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#d9ccb8] border-t-[#4a4035]" />
          <p className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-[#857765]">
            Reviewing submission
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[#231d15]">
            Checking the uploaded file
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#625a4e]">
            The evaluator is validating the required criteria and scoring the
            deliverable against the rubric.
          </p>
        </div>
      </div>
    );
  }

  if (judgeResult) {
    return (
      <div className="h-full overflow-y-auto bg-[#f7f4ee]">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#857765]">
                Submission Review
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-[#231d15]">
                Result
              </h1>
            </div>
            <span className="inline-flex rounded-full border border-[#ddd3c4] bg-white px-3 py-1 text-sm text-[#5f5549]">
              Attempt {attemptCount}
            </span>
          </div>

          <JudgeResult result={judgeResult} />

          {!judgeResult.passed && (
            <div className="mt-5">
              <RetryPrompt onRetry={handleRetry} attemptCount={attemptCount} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f7f4ee]">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="rounded-2xl border border-[#ddd3c4] bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#857765]">
            Submission
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[#231d15]">
            Submit deliverable
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#625a4e]">
            Upload the final file for this task. The evaluator will grade this exact
            file against the rubric.
          </p>

          <div className="mt-5 flex flex-wrap gap-2 text-sm text-[#5f5549]">
            <MetaChip label="Format" value={formatAcceptedFormats(acceptedFormats)} />
            <MetaChip label="Size" value={`${MAX_FILE_SIZE_MB} MB max`} />
            <MetaChip label="Attempt" value={`${attemptCount + 1}`} />
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-[#ddd3c4] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#231d15]">Deliverable brief</h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#857765]">
                  Type
                </p>
                <p className="mt-1 text-sm text-[#231d15]">{deliverable.type}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#857765]">
                  Acceptance checklist
                </p>
                <ul className="mt-3 space-y-2">
                  {acceptanceChecklist.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="flex gap-3 rounded-xl border border-[#ece5da] bg-[#faf8f3] px-3 py-3 text-sm leading-6 text-[#4f463b]"
                    >
                      <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-[#ddd3c4] bg-white text-xs font-medium text-[#5f5549]">
                        {index + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#ddd3c4] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#231d15]">Upload file</h2>
                <p className="mt-2 text-sm leading-6 text-[#625a4e]">
                  Attach one file. You can replace it before submitting.
                </p>
              </div>
              <span
                className={`
                  rounded-full border px-3 py-1 text-xs font-medium
                  ${uploadedFile
                    ? "border-[#ccd9cf] bg-[#f4faf5] text-[#2b6b46]"
                    : "border-[#ddd3c4] bg-[#faf8f3] text-[#6a6053]"
                  }
                `}
              >
                {uploadedFile ? "Ready" : "Waiting"}
              </span>
            </div>

            <div className="mt-5">
              <FileUploader
                onFileSelect={setUploadedFile}
                acceptedFormats={acceptedFormats}
                maxSizeMB={MAX_FILE_SIZE_MB}
                currentFile={uploadedFile}
                onRemove={() => setUploadedFile(null)}
              />
            </div>

            <div className="mt-5 border-t border-[#ece5da] pt-5">
              <p className="text-sm text-[#5f5549]">
                {uploadedFile
                  ? "The attached file is ready for review."
                  : "Add the final deliverable to enable submission."}
              </p>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!uploadedFile}
                className={`
                  mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3758a5] focus-visible:ring-offset-2 focus-visible:ring-offset-white
                  ${uploadedFile
                    ? "bg-[#231d15] text-white hover:bg-[#3a3127]"
                    : "cursor-not-allowed bg-[#e5ddd1] text-[#8a7f72]"
                  }
                `}
              >
                {uploadedFile ? "Submit for review" : "Attach a file to continue"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#ddd3c4] bg-[#faf8f3] px-3 py-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#857765]">
        {label}
      </span>
      <span className="text-sm text-[#231d15]">{value}</span>
    </span>
  );
}
