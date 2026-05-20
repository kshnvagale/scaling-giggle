"use client";

import { Icon } from "@/components/shared/Icon";
import type { AppId, AppRegistryEntry } from "@/lib/types";

interface SidebarProps {
  appRegistry: AppRegistryEntry[];
  activeApp: AppId;
  onAppChange: (id: AppId) => void;
}

export function Sidebar({ appRegistry, activeApp, onAppChange }: SidebarProps) {
  return (
    <aside className="w-56 flex-shrink-0 bg-[#f5ead6] border-r border-[#d4c5a9] flex flex-col py-3">
      <nav className="flex flex-col gap-1 px-2">
        {appRegistry.map((entry) => {
          const isActive = entry.id === activeApp;
          return (
            <button
              key={entry.id}
              onClick={() => onAppChange(entry.id)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                ${
                  isActive
                    ? "bg-amber-100 border-l-4 border-amber-700 pl-2"
                    : "border-l-4 border-transparent hover:bg-amber-50 pl-2"
                }
              `}
            >
              <Icon emoji={entry.icon} size="md" />
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    isActive ? "text-amber-700" : "text-stone-700"
                  }`}
                >
                  {entry.label}
                </p>
                <p className="text-xs text-stone-500 truncate">
                  {entry.description}
                </p>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
