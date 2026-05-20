"use client";

import { useRef, useState, useCallback, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    });
  }, [value, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const hasText = value.trim().length > 0;

  return (
    <div className="px-4 pb-3 pt-1 flex-shrink-0">
      <div
        className={`
          rounded-lg border bg-white transition-colors
          ${disabled ? "border-[#e0e0e0] opacity-60" : "border-[#bbb] focus-within:border-[#868686] focus-within:shadow-[0_0_0_1px_#868686]"}
        `}
      >
        {/* Text area */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); adjustHeight(); }}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          rows={1}
          disabled={disabled}
          className="w-full resize-none bg-transparent px-3 pt-2 pb-0 text-[13px] text-[#1d1d1d] placeholder-[#8d8d8e] outline-none leading-[1.46]"
        />

        {/* Bottom toolbar — like Slack */}
        <div className="flex items-center justify-between px-1.5 py-1">
          {/* Left: formatting */}
          <div className="flex items-center">
            {/* Bold */}
            <ToolbarBtn>
              <path d="M4 3h5a3 3 0 0 1 0 6H4V3Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M4 9h6a3 3 0 0 1 0 6H4V9Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </ToolbarBtn>
            {/* Italic */}
            <ToolbarBtn>
              <path d="M7 3h5M4 15h5M9.5 3L6.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </ToolbarBtn>
            {/* Strikethrough */}
            <ToolbarBtn>
              <path d="M3 9h12M5.5 3C5.5 3 4 4.5 4 6c0 2 2 3 5 3s5 1 5 3c0 1.5-1.5 3-5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </ToolbarBtn>

            <div className="w-px h-4 bg-[#ddd] mx-1" />

            {/* Link */}
            <ToolbarBtn>
              <path d="M7 11l-1.5 1.5a2.5 2.5 0 0 1-3.5-3.5L4.5 6.5a2.5 2.5 0 0 1 3.5 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M11 7l1.5-1.5a2.5 2.5 0 0 0-3.5-3.5L6.5 4.5a2.5 2.5 0 0 0 0 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </ToolbarBtn>
            {/* List */}
            <ToolbarBtn>
              <path d="M4 4h10M4 9h10M4 14h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="1.5" cy="4" r="1" fill="currentColor"/>
              <circle cx="1.5" cy="9" r="1" fill="currentColor"/>
              <circle cx="1.5" cy="14" r="1" fill="currentColor"/>
            </ToolbarBtn>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-0.5">
            {/* Emoji */}
            <ToolbarBtn>
              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <circle cx="6.5" cy="7.5" r="1" fill="currentColor"/>
              <circle cx="11.5" cy="7.5" r="1" fill="currentColor"/>
              <path d="M6 11.5c1 1.5 4 1.5 6 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
            </ToolbarBtn>
            {/* Attachment */}
            <ToolbarBtn>
              <path d="M14 6l-6.5 6.5a3 3 0 0 1-4.25-4.25L10 1.5a2 2 0 0 1 2.83 2.83L6 11.17a1 1 0 0 1-1.42-1.42L11 3.33" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            </ToolbarBtn>

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={disabled || !hasText}
              className={`
                w-7 h-7 rounded flex items-center justify-center transition-colors ml-0.5
                ${hasText && !disabled
                  ? "bg-[#007a5a] text-white hover:bg-[#005e44]"
                  : "text-[#bbb] cursor-default"
                }
              `}
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
                <path d="M1.946 9.315c-.522-.174-.527-.455.01-.634L19.087.686c.529-.176.832.12.684.638L14.764 19.13c-.15.529-.455.547-.68.045L10 10 1.946 9.315Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="w-7 h-7 rounded flex items-center justify-center text-[#616061] hover:bg-[#f0f0f0] hover:text-[#1d1d1d] transition-colors">
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none">{children}</svg>
    </button>
  );
}
