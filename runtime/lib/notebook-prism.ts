"use client";

import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-markdown";

export function highlight(code: string, language: "python" | "markdown"): string {
  const grammar = Prism.languages[language];
  if (!grammar) return code;
  return Prism.highlight(code, grammar, language);
}
