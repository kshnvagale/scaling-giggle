"use client";

interface RetryPromptProps {
  onRetry: () => void;
  attemptCount: number;
}

export default function RetryPrompt({ onRetry, attemptCount }: RetryPromptProps) {
  return (
    <div className="rounded-2xl border border-[#ddd3c4] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-semibold text-[#231d15]">Try another attempt</p>
          <p className="mt-2 text-sm leading-6 text-[#625a4e]">
            Clear the current submission, upload an updated file, and send it for review
            again.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full border border-[#ddd3c4] bg-[#faf8f3] px-3 py-1 text-sm text-[#5f5549]">
            Attempt {attemptCount}
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-[#231d15] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3a3127] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3758a5] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Clear and retry
          </button>
        </div>
      </div>
    </div>
  );
}
