"use client";

import { useCallback } from "react";
import { useCaseForgeStore } from "@/lib/store";
import { Markdown } from "@/components/shared/Markdown";

interface WikiPageProps {
  page: { slug: string; title: string; body: string } | null;
}

export default function WikiPage({ page }: WikiPageProps) {
  const setActiveWikiSlug = useCaseForgeStore((s) => s.setActiveWikiSlug);

  const handleLinkClick = useCallback(
    (slug: string) => {
      setActiveWikiSlug(slug);
    },
    [setActiveWikiSlug],
  );

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#e8eaed] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-[#5f6368]">
              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2V8H20M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-[13px] text-[#5f6368]">Select a document from the sidebar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-6 px-4">
      {/* Paper document */}
      <div
        className="w-full max-w-[816px] bg-white rounded-sm min-h-[900px]"
        style={{
          boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)",
          padding: "72px 96px",
        }}
      >
        {/* Document content */}
        <Markdown
          content={page.body}
          onLinkClick={handleLinkClick}
          className="
            prose prose-stone max-w-none
            prose-headings:font-normal prose-headings:text-[#1f1f1f]
            prose-h1:text-[26px] prose-h1:leading-[1.3] prose-h1:mb-3 prose-h1:mt-6
            prose-h2:text-[20px] prose-h2:leading-[1.3] prose-h2:mb-2 prose-h2:mt-5 prose-h2:border-b prose-h2:border-[#dadce0] prose-h2:pb-1
            prose-h3:text-[16px] prose-h3:leading-[1.3] prose-h3:mb-1 prose-h3:mt-4
            prose-p:text-[11pt] prose-p:leading-[1.6] prose-p:text-[#1f1f1f] prose-p:my-2
            prose-li:text-[11pt] prose-li:text-[#1f1f1f]
            prose-a:text-[#1a73e8] prose-a:no-underline hover:prose-a:underline
            prose-strong:text-[#1f1f1f]
            prose-table:text-[10pt]
            prose-th:bg-[#f1f3f4] prose-th:text-[#1f1f1f] prose-th:font-medium prose-th:text-left prose-th:px-3 prose-th:py-2
            prose-td:px-3 prose-td:py-2 prose-td:border-[#dadce0]
            prose-hr:border-[#dadce0]
            prose-code:text-[10pt] prose-code:bg-[#f1f3f4] prose-code:text-[#1f1f1f] prose-code:rounded prose-code:px-1 prose-code:py-0.5
            prose-pre:bg-[#f1f3f4] prose-pre:text-[#1f1f1f] prose-pre:border prose-pre:border-[#dadce0] prose-pre:rounded-lg prose-pre:text-[10pt] prose-pre:leading-[1.6]
            [&_pre_code]:bg-transparent [&_pre_code]:text-[#1f1f1f] [&_pre_code]:p-0
            prose-blockquote:border-l-[#dadce0] prose-blockquote:text-[#5f6368]
          "
        />
      </div>
    </div>
  );
}
