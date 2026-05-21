"use client";

interface WindowChromeProps {
  title: string;
  children: React.ReactNode;
  isFocused: boolean;
  isMaximized: boolean;
  onHeaderPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onHeaderDoubleClick: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

export function WindowChrome({
  title,
  children,
  isFocused,
  isMaximized,
  onHeaderPointerDown,
  onHeaderDoubleClick,
  onMinimize,
  onMaximize,
  onClose,
}: WindowChromeProps) {
  return (
    <div
      className={`
        relative flex h-full flex-col overflow-hidden rounded-[12px] transition-all duration-300
        ${isFocused
          ? "border-black/[0.12] dark:border-white/[0.15] shadow-[0_30px_80px_rgba(0,0,0,0.28),0_10px_24px_rgba(0,0,0,0.18)]"
          : "border-black/[0.08] dark:border-white/[0.08] shadow-[0_18px_44px_rgba(0,0,0,0.18),0_6px_14px_rgba(0,0,0,0.12)]"
        }
        glassmorphic-window
      `}
    >
      <div
        onPointerDown={onHeaderPointerDown}
        onDoubleClick={onHeaderDoubleClick}
        className={`
          relative flex h-8 select-none items-center border-b border-black/[0.06] dark:border-white/[0.06]
          transition-colors duration-200
          ${isFocused 
            ? "bg-[var(--window-toolbar)] text-[var(--text-primary)]" 
            : "bg-[var(--window-toolbar)]/80 text-[var(--text-primary)]/50"
          }
        `}
        style={{ cursor: "grab" }}
      >
        {/* Traffic lights (left) - group hover collective state */}
        <div className="group/traffic-lights flex items-center gap-[7.5px] pl-3 pr-2 z-30">
          <TrafficLight
            isFocused={isFocused}
            focusedBg="bg-[#ff5f56]"
            focusedBorder="border-[#e0443e]"
            icon={
              <path
                d="M4.1 4.1L8.9 8.9M8.9 4.1L4.1 8.9"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.25"
              />
            }
            label="Close window"
            onClick={onClose}
          />
          <TrafficLight
            isFocused={isFocused}
            focusedBg="bg-[#ffbd2e]"
            focusedBorder="border-[#df9e14]"
            icon={
              <path
                d="M4 6.5H9"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.35"
              />
            }
            label="Minimize window"
            onClick={onMinimize}
          />
          <TrafficLight
            isFocused={isFocused}
            focusedBg="bg-[#27c93f]"
            focusedBorder="border-[#1a9c2b]"
            icon={
              isMaximized ? (
                <>
                  <rect
                    x="3.8"
                    y="3.8"
                    width="4.7"
                    height="4.7"
                    rx="0.9"
                    stroke="currentColor"
                    strokeWidth="1.1"
                  />
                  <path
                    d="M5.2 2.8H9.2V6.8"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.1"
                  />
                </>
              ) : (
                <path
                  d="M4 8.6V4H8.6M4.5 8.1L9 3.6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.2"
                />
              )
            }
            label={isMaximized ? "Restore window" : "Maximize window"}
            onClick={onMaximize}
          />
        </div>

        {/* Centered title — absolute so traffic-light width doesn't shift it */}
        <div className="pointer-events-none absolute inset-x-0 flex justify-center px-24">
          <span
            className={`
              truncate text-[12.5px] font-semibold tracking-tight transition-all duration-200
              ${isFocused 
                ? "text-[var(--text-primary)] opacity-90" 
                : "text-[var(--text-primary)] opacity-40"
              }
            `}
            style={{
              textShadow: isFocused ? "0 1px 0 rgba(255,255,255,0.4)" : "none",
            }}
          >
            {title}
          </span>
        </div>
      </div>

      <div className="window-content relative flex-1 overflow-hidden bg-[var(--window-bg)]">
        {children}
      </div>
    </div>
  );
}

function TrafficLight({
  isFocused,
  focusedBg,
  focusedBorder,
  icon,
  label,
  onClick,
}: {
  isFocused: boolean;
  focusedBg: string;
  focusedBorder: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      className="group/traffic relative flex h-[12.5px] w-[12.5px] items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3559a7]/60 focus-visible:ring-offset-1"
    >
      <span
        className={`relative flex h-[12.5px] w-[12.5px] items-center justify-center rounded-full border transition-all duration-200 ${
          isFocused
            ? `${focusedBg} ${focusedBorder}`
            : "border-black/10 bg-black/10 dark:border-white/10 dark:bg-white/10"
        }`}
      >
        <svg
          width="12.5"
          height="12.5"
          viewBox="0 0 13 13"
          className="text-black/60 dark:text-white/70 opacity-0 transition-opacity duration-150 group-hover/traffic-lights:opacity-100 group-focus-visible/traffic:opacity-100"
          fill="none"
        >
          {icon}
        </svg>
      </span>
    </button>
  );
}
