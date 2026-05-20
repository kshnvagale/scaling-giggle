"use client";

interface WindowChromeProps {
  title: string;
  subtitle: string;
  appIcon: string;
  appLabel: string;
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
  subtitle,
  appIcon,
  appLabel,
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
        flex h-full flex-col overflow-hidden border
        ${isMaximized ? "rounded-[22px]" : "rounded-[24px]"}
        ${isFocused
          ? "border-[#ccbfa6] bg-[#fbfaf7] shadow-[0_34px_90px_rgba(35,26,11,0.24)]"
          : "border-[#d8cfbf] bg-[#f8f6f1] shadow-[0_22px_56px_rgba(35,26,11,0.14)]"
        }
      `}
    >
      <div
        onPointerDown={onHeaderPointerDown}
        onDoubleClick={onHeaderDoubleClick}
        className={`
          flex h-12 select-none items-center gap-3 border-b px-4
          ${isFocused
            ? "border-[#cdbfa8] bg-[linear-gradient(180deg,#f7f2e8_0%,#ebe1cf_100%)]"
            : "border-[#d9cfbf] bg-[linear-gradient(180deg,#f1ede5_0%,#e5ddd0_100%)]"
          }
        `}
      >
        <div className="flex items-center gap-[7px]">
          <TrafficLight
            colorClassName="border-[#df4744]/40 bg-[#ff5f57]"
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
            colorClassName="border-[#dea123]/40 bg-[#febc2e]"
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
            colorClassName="border-[#1aab29]/40 bg-[#28c840]"
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

        <div className="flex min-w-0 flex-1 justify-center">
          <span
            className={`
              max-w-[34rem] truncate rounded-full px-3 py-1 text-[12px] font-semibold tracking-[0.01em]
              ${isFocused ? "bg-white/58 text-[#2b261d]" : "bg-white/38 text-[#6a6458]"}
            `}
          >
            {title}
          </span>
        </div>

        <div className="flex w-28 justify-end">
          <span
            className={`
              inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]
              ${isFocused
                ? "bg-white/58 text-[#6e5c22]"
                : "bg-white/34 text-[#8b8272]"
              }
            `}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isFocused ? "bg-[#28c840]" : "bg-[#b8ab92]"}`}
            />
            {isFocused ? "Live" : "Idle"}
          </span>
        </div>
      </div>

      <div
        className={`
          flex h-10 items-center gap-3 border-b px-4 text-[11px]
          ${isFocused ? "border-[#d9ceba] bg-[#f7f2e9]" : "border-[#e1d8ca] bg-[#f3efe7]"}
        `}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-black/6 bg-white/70 px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <span className="text-sm">{appIcon}</span>
          <span className="font-semibold text-[#2b261d]">{appLabel}</span>
        </div>

        <span className="min-w-0 truncate text-[#6c6458]">{subtitle}</span>

        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-full bg-black/5 px-2.5 py-1 font-medium text-[#6c6458]">
            {isMaximized ? "Maximized" : "Resizable"}
          </span>
        </div>
      </div>

      <div
        className={`
          window-content relative flex-1 overflow-hidden
          ${isFocused ? "bg-[var(--window-bg)]" : "bg-[color-mix(in_srgb,var(--window-bg)_94%,#e5dccd)]"}
        `}
      >
        {children}
      </div>
    </div>
  );
}

function TrafficLight({
  colorClassName,
  icon,
  label,
  onClick,
}: {
  colorClassName: string;
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
      className="group/traffic relative flex h-7 w-7 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3559a7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#efe7d7]"
    >
      <span
        className={`relative flex h-[13px] w-[13px] items-center justify-center rounded-full border ${colorClassName}`}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 13 13"
          className="text-black/60 opacity-0 transition-opacity duration-150 group-hover/traffic:opacity-100 group-focus-visible/traffic:opacity-100"
          fill="none"
        >
          {icon}
        </svg>
      </span>
    </button>
  );
}
