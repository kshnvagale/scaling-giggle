"use client";

interface Props {
  round: number;
  feedback: string;
  fromPersonaName: string;
  at: number;
}

export default function FeedbackBubble({ round, feedback, fromPersonaName, at }: Props) {
  const minutesAgo = Math.floor((Date.now() - at) / 60000);
  const timeLabel = minutesAgo < 1 ? "just now" : `${minutesAgo} min ago`;
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-xs text-stone-500">
        <span>
          <strong className="text-stone-700">{fromPersonaName}</strong> · Round {round}
        </span>
        <span>{timeLabel}</span>
      </div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
        {feedback}
      </div>
    </div>
  );
}
