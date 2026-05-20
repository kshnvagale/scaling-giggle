"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
  content: string;
  className?: string;
  onLinkClick?: (slug: string) => void;
}

export function Markdown({ content, className, onLinkClick }: MarkdownProps) {
  return (
    <ReactMarkdown
      className={className ?? "prose prose-stone max-w-none"}
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => {
          if (href?.startsWith("wiki://") && onLinkClick) {
            const slug = href.replace("wiki://", "");
            return (
              <button
                className="text-amber-700 underline hover:text-amber-900"
                onClick={() => onLinkClick(slug)}
              >
                {children}
              </button>
            );
          }
          return (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
