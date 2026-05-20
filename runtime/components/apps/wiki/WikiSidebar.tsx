"use client";

import { useState } from "react";

interface WikiSidebarProps {
  pages: Array<{ slug: string; title: string; linkedTasks: string[] }>;
  activeSlug: string | null;
  currentTaskId: string;
  onPageSelect: (slug: string) => void;
}

export default function WikiSidebar({
  pages,
  activeSlug,
  currentTaskId,
  onPageSelect,
}: WikiSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="w-8 flex-shrink-0 border-r border-[#dadce0] bg-white flex flex-col items-center pt-2">
        <button
          onClick={() => setCollapsed(false)}
          className="w-6 h-6 rounded flex items-center justify-center text-[#5f6368] hover:bg-[#e8eaed]"
          title="Show document tabs"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-[200px] flex-shrink-0 border-r border-[#dadce0] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCollapsed(true)}
            className="w-5 h-5 rounded flex items-center justify-center text-[#5f6368] hover:bg-[#e8eaed]"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 3H11M1 6H11M1 9H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
          <span className="text-[12px] font-medium text-[#1f1f1f]">Document tabs</span>
        </div>
        <span className="text-[10px] text-[#5f6368] bg-[#e8eaed] px-1.5 py-0.5 rounded">{pages.length}</span>
      </div>

      {/* Page list */}
      <nav className="flex-1 overflow-y-auto px-1.5 pb-2">
        {pages.map((page, i) => {
          const isActive = page.slug === activeSlug;
          const isLinked = page.linkedTasks.includes(currentTaskId);

          return (
            <button
              key={page.slug}
              onClick={() => onPageSelect(page.slug)}
              className={`
                w-full flex items-center gap-2 px-2.5 py-[6px] rounded text-left text-[12px]
                transition-colors duration-75 mb-px
                ${isActive
                  ? "bg-[#d3e3fd] text-[#041e49] font-medium"
                  : "text-[#1f1f1f] hover:bg-[#f1f3f4]"
                }
              `}
            >
              {/* Doc icon */}
              <div className={`w-4 h-4 rounded-sm flex items-center justify-center flex-shrink-0 text-[8px] font-bold
                ${isActive ? "bg-[#4285f4] text-white" : isLinked ? "bg-[#1a73e8] text-white" : "bg-[#dadce0] text-[#5f6368]"}
              `}>
                {i + 1}
              </div>
              <span className="truncate">{page.title}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
