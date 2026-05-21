"use client";

import { useEffect } from "react";
import { useCaseForgeStore } from "@/lib/store";

const INTRO_SEEN_KEY = "caseforge:intro-seen";

/**
 * Decides whether the intro shows on mount and registers the cmd-shift-I
 * replay shortcut. Renders nothing.
 */
export function IntroGate() {
  const openIntro = useCaseForgeStore((s) => s.openIntro);
  const introOpen = useCaseForgeStore((s) => s.introOpen);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(INTRO_SEEN_KEY) === "true";
    } catch {
      // sessionStorage may be unavailable; fall through and show the intro.
    }
    if (!seen) openIntro();
  }, [openIntro]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      // cmd-shift-I (macOS) or ctrl-shift-I (other) re-opens the intro for
      // demos/debug. Does NOT clear the sessionStorage seen flag.
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === "i") {
        // Browser devtools also bind this; we don't preventDefault unless
        // we're actually doing something.
        if (!introOpen) {
          e.preventDefault();
          openIntro();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [introOpen, openIntro]);

  return null;
}
