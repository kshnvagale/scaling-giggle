"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useCaseForgeStore } from "@/lib/store";
import { STAGES, LAST_INDEX, type StageDef } from "./stages";
import { useReducedMotion } from "./useReducedMotion";

const HELLO_HOLD_MS = 3500;
const WORDMARK = "CaseForge";
const MIN_DESKTOP_WIDTH = 768;

export function IntroOnboarding() {
  const introOpen = useCaseForgeStore((s) => s.introOpen);
  const closeIntro = useCaseForgeStore((s) => s.closeIntro);
  const pkg = useCaseForgeStore((s) => s.coursePackage);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !introOpen) return null;
  return createPortal(
    <IntroPortal closeIntro={closeIntro} pkgLoaded={pkg !== null} />,
    document.body,
  );
}

function IntroPortal({
  closeIntro,
  pkgLoaded,
}: {
  closeIntro: () => void;
  pkgLoaded: boolean;
}) {
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();

  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const lightPassRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const primaryBtnRef = useRef<HTMLButtonElement>(null);
  const lastDirection = useRef<"forward" | "back">("forward");

  const [index, setIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const stage: StageDef = STAGES[index];

  // ── Cursor-reactive backdrop glow ───────────────────────────────────────
  // A soft radial highlight on a separate overlay div that eases toward the
  // mouse position. requestAnimationFrame lerps current toward target; no
  // React re-renders. Disabled for reduced motion.
  useEffect(() => {
    if (reduced) return;
    const glow = glowRef.current;
    if (!glow) return;

    // Start centered so the first paint isn't a corner glow.
    let targetX = 50;
    let targetY = 45;
    let currX = 50;
    let currY = 45;
    let rafId = 0;
    let alive = true;

    const onMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth) * 100;
      targetY = (e.clientY / window.innerHeight) * 100;
    };

    const tick = () => {
      if (!alive) return;
      currX += (targetX - currX) * 0.06;
      currY += (targetY - currY) * 0.06;
      glow.style.background = `radial-gradient(520px circle at ${currX}% ${currY}%, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.025) 35%, rgba(255,255,255,0) 65%)`;
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    rafId = requestAnimationFrame(tick);

    return () => {
      alive = false;
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, [reduced]);

  // ── Phase 1: mount animation ─────────────────────────────────────────────
  useGSAP(
    () => {
      if (!backdropRef.current || !cardRef.current) return;
      if (reduced) {
        gsap.set(backdropRef.current, { opacity: 0.55, backdropFilter: "blur(24px)" });
        gsap.set(cardRef.current, { opacity: 1, scale: 1, y: 0 });
        return;
      }
      const tl = gsap.timeline();
      tl.fromTo(
        backdropRef.current,
        { opacity: 0, backdropFilter: "blur(0px)" },
        {
          opacity: 0.55,
          backdropFilter: "blur(24px)",
          duration: 0.6,
          ease: "power2.out",
        },
      ).fromTo(
        cardRef.current,
        { opacity: 0, scale: 0.96, y: 8 },
        { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: "expo.out" },
        "-=0.5",
      );
    },
    { scope: rootRef },
  );

  // ── Phase 2: stage entrance — fires every time `index` changes ──────────
  useGSAP(
    () => {
      if (!stageRef.current) return;
      const wrapper = stageRef.current.firstElementChild as HTMLElement | null;
      const chars = stageRef.current.querySelectorAll<HTMLElement>(".char");
      const words = stageRef.current.querySelectorAll<HTMLElement>(".word");
      const diagram = stageRef.current.querySelector<HTMLElement>(".diagram");

      if (reduced) {
        if (wrapper) gsap.set(wrapper, { opacity: 1, scale: 1, y: 0 });
        gsap.set([chars, words, diagram].filter(Boolean), { opacity: 1, y: 0, filter: "none" });
        setIsTransitioning(false);
        return;
      }

      // Direction-aware spatial logic. Forward feels like "leaning in":
      // content approaches from below (positive y) and from slightly larger
      // scale (1.02 → 1). Back is the mirror: from above + slightly smaller.
      const forward = lastDirection.current === "forward";
      const charY = forward ? 14 : -14;
      const wordY = forward ? 6 : -6;
      const diagramY = forward ? 12 : -12;
      const wrapperScale = forward ? 1.02 : 0.98;

      const tl = gsap.timeline({
        onComplete: () => setIsTransitioning(false),
      });

      // Subtle scale on the whole stage wrapper for spatial cohesion.
      if (wrapper) {
        tl.fromTo(
          wrapper,
          { scale: wrapperScale },
          { scale: 1, duration: 0.55, ease: "expo.out" },
          0,
        );
      }

      if (diagram) {
        tl.fromTo(
          diagram,
          { opacity: 0, y: diagramY, filter: "blur(6px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease: "expo.out" },
          0,
        );
      }
      if (chars.length) {
        tl.fromTo(
          chars,
          { opacity: 0, y: charY },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: "expo.out",
            stagger: stage.kind === "hello" ? 0.045 : 0.018,
          },
          diagram ? "-=0.4" : 0.05,
        );
      }
      if (words.length) {
        tl.fromTo(
          words,
          { opacity: 0, y: wordY },
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
            ease: "power2.out",
            stagger: 0.04,
          },
          "-=0.3",
        );
      }
    },
    { dependencies: [index, reduced], scope: stageRef },
  );

  // ── Focus primary button on each content stage entrance ─────────────────
  useEffect(() => {
    if (stage.kind !== "content") return;
    const t = setTimeout(() => primaryBtnRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [index, stage.kind]);

  // ── Hello auto-advance ──────────────────────────────────────────────────
  useEffect(() => {
    if (stage.kind !== "hello") return;
    const hold = reduced ? 1200 : HELLO_HOLD_MS;
    const t = setTimeout(() => advance(), hold);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, reduced]);

  // ── Keyboard handlers ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isDismissing) return;
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
        return;
      }
      if (isTransitioning) return;
      if (stage.kind === "hello") {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
          e.preventDefault();
          advance();
        }
        return;
      }
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        advance();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        retreat();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isTransitioning, isDismissing, stage.kind]);

  // ── Stage transition orchestration ──────────────────────────────────────
  function advance() {
    if (isTransitioning || isDismissing) return;
    if (index === LAST_INDEX) {
      if (!pkgLoaded) return; // CTA gated until pkg ready
      dismiss();
      return;
    }
    transitionTo(index + 1, "forward");
  }

  function retreat() {
    if (isTransitioning || isDismissing) return;
    if (index === 0) return; // hello is non-retreatable
    transitionTo(index - 1, "back");
  }

  function transitionTo(next: number, direction: "forward" | "back") {
    if (!stageRef.current) return;
    setIsTransitioning(true);
    lastDirection.current = direction;
    if (reduced) {
      setIndex(next);
      return;
    }
    // Forward "recedes" (scale 0.99) as it drifts up; back "approaches"
    // (scale 1.01) as it drifts down. Mirror of the incoming entrance.
    gsap.to(stageRef.current.children, {
      opacity: 0,
      y: direction === "forward" ? -8 : 8,
      scale: direction === "forward" ? 0.99 : 1.01,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => setIndex(next),
    });
  }

  function dismiss() {
    if (isDismissing) return;
    setIsDismissing(true);
    if (reduced) {
      closeIntro();
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => closeIntro(),
    });

    // Card disappears first — faster than the original, so the desktop
    // reveal moment isn't muddied by the card still being there.
    if (cardRef.current) {
      tl.to(
        cardRef.current.querySelector(".card-inner"),
        { opacity: 0, scale: 1.04, duration: 0.32, ease: "power2.in" },
        0,
      );
      tl.to(
        cardRef.current,
        { opacity: 0, scale: 0.94, duration: 0.42, ease: "power3.in" },
        0.08,
      );
    }

    // Backdrop clears slightly later for a "curtain pulling back" feel.
    if (backdropRef.current) {
      tl.to(
        backdropRef.current,
        {
          opacity: 0,
          backdropFilter: "blur(0px)",
          duration: 0.7,
          ease: "power2.out",
        },
        0.2,
      );
    }

    // Cursor-reactive glow fades alongside the backdrop.
    if (glowRef.current) {
      tl.to(
        glowRef.current,
        { opacity: 0, duration: 0.55, ease: "power2.out" },
        0.2,
      );
    }

    // Cinematic light-pass: a soft elliptical highlight sweeps left → right
    // across the screen during the reveal, like a curtain pulling back to
    // expose the desktop underneath.
    if (lightPassRef.current) {
      tl.fromTo(
        lightPassRef.current,
        { xPercent: -120, opacity: 0 },
        {
          xPercent: 120,
          opacity: 1,
          duration: 0.9,
          ease: "power2.inOut",
          // The opacity rises and falls — handled by overshoot-style timing.
          // Using an onUpdate to shape opacity around midpoint:
          onUpdate: function () {
            const p = this.progress();
            // Bell curve: peaks at p=0.5, zero at 0 and 1.
            const peak = 1 - Math.abs(p - 0.5) * 2;
            if (lightPassRef.current) {
              lightPassRef.current.style.opacity = String(peak * 0.85);
            }
          },
        },
        0.18,
      );
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        ref={rootRef}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
      >
        <div className="max-w-sm px-8 text-center text-white/90">
          <p className="mb-3 text-2xl font-medium tracking-tight">Best on desktop.</p>
          <p className="text-white/60 leading-relaxed">
            CaseForge is a desktop workspace simulation. Open this on a larger
            screen to start.
          </p>
        </div>
      </div>
    );
  }

  const showChrome = stage.kind === "content";

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby="intro-heading"
    >
      {/* Backdrop: blurred, dimmed glass over the desktop, with a subtle
          radial vignette that draws focus toward the card. */}
      <div
        ref={backdropRef}
        className="absolute inset-0"
        style={{
          opacity: 0,
          backdropFilter: "blur(0px)",
          background:
            "radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.78) 60%, rgba(0,0,0,0.92) 100%)",
        }}
        aria-hidden="true"
      />

      {/* Cursor-reactive glow — soft radial highlight that eases toward the
          mouse. Sits above the vignette so the card glass picks up the light. */}
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      />

      {/* Cinematic light-pass overlay — only visible during dismiss, sweeps
          left → right across the screen as the desktop reveals. */}
      <div
        ref={lightPassRef}
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0,
          background:
            "linear-gradient(105deg, transparent 0%, transparent 35%, rgba(255,255,255,0.22) 50%, transparent 65%, transparent 100%)",
          willChange: "transform, opacity",
        }}
        aria-hidden="true"
      />

      {/* Glass card */}
      <div
        ref={cardRef}
        className="relative mx-6 w-full max-w-[820px] rounded-3xl border border-white/10 bg-white/[0.06] shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)]"
        style={{
          backdropFilter: "blur(40px) saturate(140%)",
          WebkitBackdropFilter: "blur(40px) saturate(140%)",
        }}
      >
        <div className="card-inner">
          {/* Stage content — keeps comfortable horizontal padding for legibility. */}
          <div className={`px-14 pt-16 ${showChrome ? "pb-6" : "pb-16"}`}>
            <div ref={stageRef} className="min-h-[352px]">
              {stage.kind === "hello" ? (
                <HelloStage key={stage.id} />
              ) : (
                <ContentStage key={stage.id} stage={stage} />
              )}
            </div>
          </div>

          {/* Footer — buttons sit closer to the card edges (px-8 = 32px),
              consistent placement across every content stage. */}
          {showChrome && (
            <div className="flex items-center justify-between px-8 pb-7 pt-2">
              {/* Back button */}
              <button
                type="button"
                onClick={retreat}
                disabled={index <= 1 || isTransitioning}
                className="text-sm text-white/50 transition hover:text-white/80 disabled:invisible"
              >
                ← Back
              </button>

              {/* Progress dots */}
              <div className="flex items-center gap-2" aria-hidden="true">
                {STAGES.slice(1).map((s, i) => {
                  const active = i + 1 === index;
                  return (
                    <span
                      key={s.id}
                      className="block h-1.5 w-1.5 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: active
                          ? "rgba(255,255,255,0.95)"
                          : "rgba(255,255,255,0.25)",
                        transform: active ? "scale(1.25)" : "scale(1)",
                      }}
                    />
                  );
                })}
              </div>

              {/* Continue / Get Started */}
              <PrimaryButton
                ref={primaryBtnRef}
                isLast={index === LAST_INDEX}
                pkgLoaded={pkgLoaded}
                disabled={isTransitioning}
                onClick={advance}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Hello stage: animated wordmark ─────────────────────────────────────────
function HelloStage() {
  return (
    <div
      id="intro-heading"
      className="flex h-[352px] items-center justify-center"
    >
      <div className="text-8xl font-semibold tracking-tight text-white/95 sm:text-9xl">
        {WORDMARK.split("").map((c, i) => (
          <span
            key={i}
            className="char inline-block"
            style={{ willChange: "transform, opacity" }}
          >
            {c === " " ? " " : c}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Content stage: headline + body (diagrams come in later passes) ────────
function ContentStage({ stage }: { stage: StageDef }) {
  const headline = stage.headline ?? "";
  const body = stage.body ?? "";

  return (
    <div>
      {stage.diagram ? (
        <div className="diagram mb-8 flex justify-start" style={{ willChange: "transform, opacity, filter" }}>
          {stage.diagram}
        </div>
      ) : null}
      <h2
        id="intro-heading"
        className="text-[2.25rem] font-semibold leading-[1.15] tracking-tight text-white/95"
      >
        {headline.split("").map((c, i) => (
          <span
            key={i}
            className="char inline-block"
            style={{ willChange: "transform, opacity" }}
          >
            {c === " " ? " " : c}
          </span>
        ))}
      </h2>
      <p className="mt-5 text-lg leading-relaxed text-white/65">
        {body.split(/(\s+)/).map((token, i) =>
          token.trim() ? (
            <span
              key={i}
              className="word inline-block"
              style={{ willChange: "transform, opacity" }}
            >
              {token}
            </span>
          ) : (
            <span key={i}>{token}</span>
          ),
        )}
      </p>
    </div>
  );
}

// ── Primary CTA: morphs label/state based on pkg load ─────────────────────
interface PrimaryButtonProps {
  isLast: boolean;
  pkgLoaded: boolean;
  disabled: boolean;
  onClick: () => void;
}

const PrimaryButton = forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  function PrimaryButton({ isLast, pkgLoaded, disabled, onClick }, ref) {
    const showSpinner = isLast && !pkgLoaded;
    const label = isLast
      ? pkgLoaded
        ? "Get Started"
        : "Preparing your workspace…"
      : "Continue →";
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled || (isLast && !pkgLoaded)}
        className="group inline-flex items-center gap-2 rounded-full bg-white/95 px-5 py-2 text-sm font-medium text-black shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-black/50"
      >
        {showSpinner && (
          <span
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-black/30 border-t-black/80"
            aria-hidden="true"
          />
        )}
        <span>{label}</span>
      </button>
    );
  },
);

// ── Tiny viewport hook (mobile sorry-screen) ──────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(`(max-width: ${MIN_DESKTOP_WIDTH - 1}px)`);
    setMobile(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return mobile;
}
