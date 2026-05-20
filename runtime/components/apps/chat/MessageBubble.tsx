"use client";

import { Markdown } from "@/components/shared/Markdown";
import type { ChatMessage } from "@/lib/types";

interface MessageBubbleProps {
  message: ChatMessage;
  personaName?: string;
  avatarColor?: string;
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function MessageBubble({ message, personaName, avatarColor }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const displayName = isUser ? "You" : personaName ?? "Assistant";

  return (
    <div className="group flex items-start gap-2.5 px-5 py-1.5 hover:bg-[#f8f8f8] transition-colors duration-75">
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
        style={{ backgroundColor: isUser ? "#1d1b16" : (avatarColor ?? "#264653") }}
      >
        {isUser ? "You" : getInitials(displayName)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-bold text-[#1d1b16]">{displayName}</span>
          <span className="text-[11px] text-[#9c9484] opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message.timestamp)}
          </span>
        </div>
        <div className="mt-0.5 text-[14px] text-[#1d1b16] leading-relaxed">
          <Markdown content={message.content} className="prose prose-sm prose-stone max-w-none [&>p]:my-0.5" />
        </div>
      </div>
    </div>
  );
}
