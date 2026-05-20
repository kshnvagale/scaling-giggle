"use client";

import { useEffect, useMemo } from "react";
import { useCaseForgeStore } from "@/lib/store";
import WikiSidebar from "./WikiSidebar";
import WikiPage from "./WikiPage";

export default function WikiApp() {
  const coursePackage = useCaseForgeStore((s) => s.coursePackage);
  const currentTask = useCaseForgeStore((s) => s.currentTask);
  const activeWikiSlug = useCaseForgeStore((s) => s.activeWikiSlug);
  const setActiveWikiSlug = useCaseForgeStore((s) => s.setActiveWikiSlug);

  const pages: Array<{ slug: string; title: string; body: string; linkedTasks: string[] }> =
    coursePackage?.fixtures?.wikiPages ?? [];

  useEffect(() => {
    if (activeWikiSlug === null && pages.length > 0) {
      setActiveWikiSlug(pages[0].slug);
    }
  }, [activeWikiSlug, pages, setActiveWikiSlug]);

  const activePage = useMemo(
    () => pages.find((p) => p.slug === activeWikiSlug) ?? null,
    [pages, activeWikiSlug],
  );

  if (!coursePackage || !currentTask) {
    return (
      <div className="flex h-full items-center justify-center text-[#5f6368]">
        No course data loaded.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Google Docs toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-[#dadce0] bg-[#f9fbfd] flex-shrink-0">
        {/* Undo/Redo */}
        <ToolBtn title="Undo">
          <path d="M7 7H4V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4 7C4 7 5.5 3 10 3C14.5 3 16 6.5 16 8.5C16 10.5 14.5 13 10 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </ToolBtn>
        <ToolBtn title="Redo">
          <path d="M13 7H16V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 7C16 7 14.5 3 10 3C5.5 3 4 6.5 4 8.5C4 10.5 5.5 13 10 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </ToolBtn>

        <div className="w-px h-5 bg-[#dadce0] mx-1" />

        {/* Zoom */}
        <span className="text-[11px] text-[#444] px-2 py-1 rounded hover:bg-[#e8eaed] cursor-default">100%</span>

        <div className="w-px h-5 bg-[#dadce0] mx-1" />

        {/* Heading selector */}
        <div className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#e8eaed] cursor-default">
          <span className="text-[11px] text-[#444]">Normal text</span>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-[#444]">
            <path d="M2 3L4 5L6 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>

        <div className="w-px h-5 bg-[#dadce0] mx-1" />

        {/* Font */}
        <div className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#e8eaed] cursor-default min-w-[80px]">
          <span className="text-[11px] text-[#444]">Arial</span>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-[#444] ml-auto">
            <path d="M2 3L4 5L6 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>

        <div className="w-px h-5 bg-[#dadce0] mx-1" />

        {/* Font size */}
        <span className="text-[11px] text-[#444] px-2 py-1 rounded hover:bg-[#e8eaed] cursor-default">11</span>

        <div className="w-px h-5 bg-[#dadce0] mx-1" />

        {/* B I U */}
        <ToolBtn title="Bold"><text x="5" y="14" fill="currentColor" fontSize="13" fontWeight="bold" fontFamily="Arial">B</text></ToolBtn>
        <ToolBtn title="Italic"><text x="6" y="14" fill="currentColor" fontSize="13" fontStyle="italic" fontFamily="Arial">I</text></ToolBtn>
        <ToolBtn title="Underline"><text x="5" y="13" fill="currentColor" fontSize="13" fontFamily="Arial" textDecoration="underline">U</text></ToolBtn>

        <div className="w-px h-5 bg-[#dadce0] mx-1" />

        {/* Text color */}
        <ToolBtn title="Text color">
          <text x="5" y="12" fill="currentColor" fontSize="13" fontWeight="bold" fontFamily="Arial">A</text>
          <rect x="3" y="15" width="12" height="2.5" fill="#000" rx="0.5"/>
        </ToolBtn>

        {/* Highlight */}
        <ToolBtn title="Highlight">
          <rect x="4" y="3" width="10" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none"/>
          <rect x="3" y="15" width="12" height="2.5" fill="#fbbc04" rx="0.5"/>
        </ToolBtn>

        <div className="flex-1" />

        {/* Editing mode */}
        <div className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#e8eaed] cursor-default">
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none" className="text-[#444]">
            <path d="M13.5 2.5L15.5 4.5L5.5 14.5L2 16L3.5 12.5L13.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          </svg>
          <span className="text-[11px] text-[#444]">Viewing</span>
        </div>
      </div>

      {/* Main area: sidebar + document */}
      <div className="flex flex-1 min-h-0">
        {/* Document tabs sidebar — like Google Docs outline */}
        <WikiSidebar
          pages={pages}
          activeSlug={activeWikiSlug}
          currentTaskId={currentTask.id}
          onPageSelect={setActiveWikiSlug}
        />

        {/* Document area — gray background with white paper */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-[#f8f9fa]">
          <WikiPage page={activePage} />
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <button
      title={title}
      className="w-7 h-7 rounded flex items-center justify-center text-[#444] hover:bg-[#e8eaed] transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">{children}</svg>
    </button>
  );
}
