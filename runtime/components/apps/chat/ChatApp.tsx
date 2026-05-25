"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCaseForgeStore } from "@/lib/store";
import { MAX_CHAT_TURNS } from "@/lib/constants";
import { ChatInput } from "./ChatInput";
import { Markdown } from "@/components/shared/Markdown";
import type { ChatMessage } from "@/lib/types";

const AVATAR_COLORS = ["#264653", "#2a9d8f", "#e76f51", "#6d597a", "#355070"];

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ChatApp() {
  const coursePackage = useCaseForgeStore((s) => s.coursePackage);
  const currentTask = useCaseForgeStore((s) => s.currentTask);
  const activePersonaId = useCaseForgeStore((s) => s.activePersonaId);
  const setActivePersonaId = useCaseForgeStore((s) => s.setActivePersonaId);
  const chatHistories = useCaseForgeStore((s) => s.chatHistories);
  const addChatMessage = useCaseForgeStore((s) => s.addChatMessage);

  const [isSending, setIsSending] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolledRef = useRef(false);
  const reviewStatus = useCaseForgeStore((s) => s.reviewStatus);
  const chatLastReadAt = useCaseForgeStore((s) => s.chatLastReadAt);
  const markPersonaRead = useCaseForgeStore((s) => s.markPersonaRead);

  const linkedPersonas: any[] =
    coursePackage?.personas?.filter(
      (p: any) => currentTask?.linkedPersonaIds?.includes(p.id),
    ) ?? [];

  const activePersona = activePersonaId
    ? linkedPersonas.find((p: any) => p.id === activePersonaId)
    : null;

  const messages: ChatMessage[] =
    activePersonaId ? chatHistories[activePersonaId] ?? [] : [];

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: hasAutoScrolledRef.current ? "smooth" : "auto",
    });
    hasAutoScrolledRef.current = true;
  }, [messages.length]);

  const handleSelectPersona = useCallback(
    (id: string) => {
      setActivePersonaId(id);
      markPersonaRead(id);
      const history = chatHistories[id];
      if (!history || history.length === 0) {
        const persona = linkedPersonas.find((p: any) => p.id === id);
        if (persona?.openingLine) {
          addChatMessage(id, {
            id: crypto.randomUUID(), role: "assistant", personaId: id,
            content: persona.openingLine, timestamp: Date.now(),
          });
        }
      }
    },
    [setActivePersonaId, markPersonaRead, chatHistories, linkedPersonas, addChatMessage],
  );

  // Note: we deliberately do NOT auto-mark messages as read when they land in
  // the active thread. If we did, the Submit-for-Review flow would clear the
  // notification dot the instant Priya's feedback message lands (because the
  // chat window has already been auto-opened to her thread). Instead, the dot
  // persists until the user explicitly clicks Priya in the sidebar or sends a
  // message — both real "I've engaged with this" signals.

  const handleSend = useCallback(
    async (text: string) => {
      if (!activePersonaId || !activePersona || isSending) return;
      const currentMessages = chatHistories[activePersonaId] ?? [];
      if (currentMessages.length >= MAX_CHAT_TURNS) return;

      addChatMessage(activePersonaId, {
        id: crypto.randomUUID(), role: "user", personaId: activePersonaId,
        content: text, timestamp: Date.now(),
      });
      markPersonaRead(activePersonaId);
      setIsSending(true);

      try {
        const apiMessages = [
          ...currentMessages.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: text },
        ];
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personaSystemPrompt: activePersona.systemPrompt,
            personaName: activePersona.name,
            privateKnowledge: activePersona.privateKnowledge?.map((k: any) => k.value) ?? [],
            worldContext: coursePackage?.world?.clientProfile ?? "",
            messages: apiMessages,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Failed to get response");
        addChatMessage(activePersonaId, {
          id: crypto.randomUUID(), role: "assistant", personaId: activePersonaId,
          content: data.reply, timestamp: Date.now(),
        });
      } catch (error) {
        addChatMessage(activePersonaId, {
          id: crypto.randomUUID(), role: "assistant", personaId: activePersonaId,
          content: `_Error: ${error instanceof Error ? error.message : "Something went wrong."}_`,
          timestamp: Date.now(),
        });
      } finally {
        setIsSending(false);
      }
    },
    [activePersonaId, activePersona, isSending, chatHistories, addChatMessage, coursePackage, markPersonaRead],
  );

  const turnsRemaining = MAX_CHAT_TURNS - messages.length;

  return (
    <div className="flex h-full">
      {/* ── Slack dark sidebar ── */}
      <div className="w-[220px] flex-shrink-0 flex flex-col" style={{ background: "#1a1d21" }}>
        {/* Workspace header */}
        <div className="px-3 pt-3 pb-2 border-b border-white/10">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-bold text-white truncate">{coursePackage?.meta?.client ?? "Workspace"} SMEs</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-white/50 flex-shrink-0">
              <path d="M3 4L5 6L7 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* DM section */}
        <div className="flex-1 overflow-y-auto pt-3 pb-2">
          <div className="px-3 mb-1.5 flex items-center justify-between">
            <span className="text-[12px] font-medium text-white/50 tracking-wide">Direct messages</span>
            <button className="w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>

          {linkedPersonas.map((persona: any, i: number) => {
            const isActive = persona.id === activePersonaId;
            const history = chatHistories[persona.id] ?? [];
            const hasHistory = history.length > 0;
            const lastMessageAt = history.length > 0 ? history[history.length - 1].timestamp : 0;
            const lastReadAt = chatLastReadAt[persona.id] ?? 0;
            const lastMessageRole = history.length > 0 ? history[history.length - 1].role : "user";
            // Unread = there's an assistant message newer than our last read,
            // AND this thread isn't the one we're currently viewing.
            const hasUnread =
              !isActive && lastMessageRole === "assistant" && lastMessageAt > lastReadAt;
            return (
              <button
                key={persona.id}
                onClick={() => handleSelectPersona(persona.id)}
                className={`
                  w-full flex items-center gap-2 px-3 py-[5px] text-left
                  transition-colors duration-75 rounded-md mx-1
                  ${isActive
                    ? "bg-[#1164a3] text-white"
                    : "text-[#cfc3cf] hover:bg-white/[0.06]"
                  }
                `}
                style={{ width: "calc(100% - 8px)" }}
              >
                {/* Avatar with status dot */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white"
                    style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {getInitials(persona.name)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-[8px] h-[8px] rounded-full bg-[#2bac76] border-[1.5px] border-[#1a1d21]" />
                </div>

                <span
                  className={`flex-1 min-w-0 truncate text-[13px] ${
                    isActive
                      ? "font-medium"
                      : hasUnread
                      ? "font-semibold text-white"
                      : hasHistory
                      ? ""
                      : "text-[#cfc3cf]/70"
                  }`}
                >
                  {persona.name}
                </span>

                {hasUnread && (
                  <span className="ml-1 inline-block h-[7px] w-[7px] flex-shrink-0 rounded-full bg-[#e01e5a]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right panel ── */}
      {activePersona ? (
        <div className="flex-1 min-w-0 flex flex-col bg-white">
          {/* Conversation header */}
          <div className="flex items-center border-b border-[#e0e0e0] px-4 py-2 flex-shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[15px] font-bold text-[#1d1d1d]">{activePersona.name}</span>
              <span className="w-[7px] h-[7px] rounded-full bg-[#2bac76]" />
            </div>
            {turnsRemaining <= 10 && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-[#fff3cd] text-[#856404] font-medium">
                {turnsRemaining} messages left
              </span>
            )}
          </div>

          {/* Persona context bar */}
          <div className="px-4 py-2.5 bg-[#f8f8f8] border-b border-[#e0e0e0] flex-shrink-0">
            <p className="text-[12px] text-[#616061]">
              <span className="font-medium text-[#1d1d1d]">{activePersona.role}</span>
              {" · "}{activePersona.backstory?.split(".")[0]}.
            </p>
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto">
            {/* Today separator */}
            <div className="flex items-center px-5 py-3">
              <div className="flex-1 h-px bg-[#e0e0e0]" />
              <span className="px-3 text-[12px] font-bold text-[#1d1d1d] bg-white">Today</span>
              <div className="flex-1 h-px bg-[#e0e0e0]" />
            </div>

            {messages.map((msg) => {
              const isUser = msg.role === "user";
              const name = isUser ? "You" : activePersona.name;
              const personaIdx = linkedPersonas.findIndex((p: any) => p.id === activePersonaId);
              const color = isUser ? "#1d1d1d" : AVATAR_COLORS[personaIdx % AVATAR_COLORS.length];

              return (
                <div key={msg.id} className="group flex items-start gap-2 px-5 py-1 hover:bg-[#f8f8f8] transition-colors duration-75">
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: color }}
                  >
                    {isUser ? "You" : getInitials(name)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-bold text-[#1d1d1d]">{name}</span>
                      <span className="text-[11px] text-[#616061] opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <div className="text-[15px] text-[#1d1d1d] leading-[1.46] mt-0.5 [&_p]:my-0.5">
                      <Markdown content={msg.content} className="prose prose-sm prose-stone max-w-none [&>p]:my-0 [&>p]:leading-[1.46]" />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing / reviewing indicator */}
            {(isSending || reviewStatus === "reviewing") && (
              <div className="flex items-start gap-2 px-5 py-1">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: AVATAR_COLORS[linkedPersonas.findIndex((p: any) => p.id === activePersonaId) % AVATAR_COLORS.length] }}
                >
                  {getInitials(activePersona.name)}
                </div>
                <div className="pt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="typing-dot w-[6px] h-[6px] rounded-full bg-[#616061]" />
                    <span className="typing-dot w-[6px] h-[6px] rounded-full bg-[#616061]" />
                    <span className="typing-dot w-[6px] h-[6px] rounded-full bg-[#616061]" />
                    {reviewStatus === "reviewing" && (
                      <span className="ml-1.5 text-[11.5px] italic text-[#616061]">
                        reviewing your notebook…
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="h-2" />
          </div>

          {/* Input */}
          <ChatInput onSend={handleSend} disabled={isSending || turnsRemaining <= 0} />
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 bg-white flex flex-col items-center justify-center">
          <div className="max-w-sm text-center px-8">
            <div className="w-12 h-12 rounded-xl bg-[#f0f0f0] flex items-center justify-center text-2xl mx-auto mb-4">💬</div>
            <h2 className="text-[17px] font-bold text-[#1d1d1d]">Select a conversation</h2>
            <p className="mt-1.5 text-[13px] text-[#616061] leading-relaxed">
              Pick a stakeholder from the sidebar to start interviewing. Each person has unique knowledge you need for your deliverable.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
