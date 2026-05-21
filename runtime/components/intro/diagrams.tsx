"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "./useReducedMotion";

const WORKSPACE_ICONS = [
  { src: "/icons/briefing.png", alt: "Briefing" },
  { src: "/icons/wiki.png", alt: "Wiki" },
  { src: "/icons/chat.png", alt: "Chat" },
  { src: "/icons/sheets.png", alt: "Sheets" },
  { src: "/icons/terminal.png", alt: "Terminal" },
];

/**
 * Stage 2 — "This is a simulation, not a course."
 *
 * A soft monochrome lens with a tiny abstract window glyph inside. Hints at
 * "looking into a real thing." The outer ring breathes (scale 1↔1.02, 4s).
 * The window glyph is static.
 */
export function Stage2Lens() {
  const ref = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced || !ref.current) return;
      const outer = ref.current.querySelector(".lens-outer");
      if (!outer) return;
      gsap.to(outer, {
        scale: 1.02,
        transformOrigin: "50% 50%",
        duration: 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 0.9, // wait for parent entrance to settle
      });
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <svg
      ref={ref}
      width="96"
      height="96"
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
    >
      {/* Soft outer ring — the lens */}
      <circle
        className="lens-outer"
        cx="48"
        cy="48"
        r="40"
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.42)"
        strokeWidth="1.25"
      />

      {/* Inner window glyph */}
      <g
        transform="translate(48 48)"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.25"
        fill="none"
      >
        <rect x="-16" y="-12" width="32" height="24" rx="2.5" />
        <line x1="-16" y1="-5" x2="16" y2="-5" />
        <circle cx="-12.5" cy="-8.5" r="1.1" fill="rgba(255,255,255,0.7)" stroke="none" />
        <circle cx="-8.5" cy="-8.5" r="1.1" fill="rgba(255,255,255,0.7)" stroke="none" />
        <circle cx="-4.5" cy="-8.5" r="1.1" fill="rgba(255,255,255,0.7)" stroke="none" />
      </g>
    </svg>
  );
}

/**
 * Stage 3 — "This is your workspace."
 *
 * Five real macOS-style app icons stagger in left-to-right. Each rises 12px,
 * blur-clears 6→0px, and fades 0→1 with a 60ms cascade. Total ~0.74s.
 */
export function Stage3Workspace() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (!ref.current) return;
      const icons = ref.current.querySelectorAll<HTMLElement>(".ws-icon");
      if (!icons.length) return;
      const shadow = "drop-shadow(0 6px 18px rgba(0,0,0,0.35))";
      if (reduced) {
        gsap.set(icons, { opacity: 1, y: 0, filter: shadow });
        return;
      }
      gsap.fromTo(
        icons,
        { opacity: 0, y: 12, filter: `${shadow} blur(6px)` },
        {
          opacity: 1,
          y: 0,
          filter: `${shadow} blur(0px)`,
          duration: 0.5,
          ease: "expo.out",
          stagger: 0.06,
          delay: 0.1, // let the parent wrapper begin its reveal first
        },
      );
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <div ref={ref} className="flex items-center gap-5">
      {WORKSPACE_ICONS.map((icon) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={icon.src}
          src={icon.src}
          alt={icon.alt}
          width={72}
          height={72}
          className="ws-icon h-[72px] w-[72px] select-none"
          style={{ willChange: "transform, opacity, filter" }}
          draggable={false}
        />
      ))}
    </div>
  );
}

/**
 * Stage 4 — "Explore. Ask. Try things."
 *
 * Three faceless avatar circles with soft gradients drift up from below.
 * Each settles into a continuous gentle float loop with its own phase —
 * the trio breathes asynchronously like real people in a room. Above the
 * middle avatar, three small SVG speech-mark glyphs fade in and drift up
 * a few pixels with a soft cycle, suggesting active conversation.
 */
export function Stage4People() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (!ref.current) return;
      const avatars = ref.current.querySelectorAll<HTMLElement>(".avatar");
      const marks = ref.current.querySelectorAll<HTMLElement>(".mark");
      if (!avatars.length) return;

      if (reduced) {
        gsap.set(avatars, { opacity: 1, y: 0, rotate: 0 });
        gsap.set(marks, { opacity: 0.65, y: 0 });
        return;
      }

      gsap.set(avatars, { opacity: 0, y: 30, rotate: 0 });
      gsap.set(marks, { opacity: 0, y: 6, scale: 0.85 });

      const tl = gsap.timeline({ delay: 0.05 });
      tl.to(avatars, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "expo.out",
        stagger: { each: 0.09, from: "center" },
      });

      tl.to(
        marks,
        {
          opacity: 0.7,
          y: 0,
          scale: 1,
          duration: 0.45,
          ease: "power2.out",
          stagger: 0.07,
        },
        "-=0.2",
      );

      // After settle: per-avatar float loops with distinct phases.
      const floatSpecs = [
        { amp: 4, dur: 3.1, delay: 1.0 },
        { amp: 5, dur: 3.6, delay: 1.15 },
        { amp: 4, dur: 3.3, delay: 1.25 },
      ];
      avatars.forEach((av, i) => {
        const spec = floatSpecs[i] ?? floatSpecs[0];
        gsap.to(av, {
          y: -spec.amp,
          duration: spec.dur,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: spec.delay,
        });
      });

      // Typing-indicator wave — each dot bobs with a phase offset so it
      // reads as someone actively typing, not a synchronized pulse.
      marks.forEach((dot, i) => {
        gsap.to(dot, {
          y: -4,
          duration: 0.55,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: 1.2 + i * 0.22,
        });
      });
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <div ref={ref} className="relative flex items-end justify-center gap-7 h-[128px] pt-5">
      {/* Typing-indicator dots above the middle avatar */}
      <div className="pointer-events-none absolute left-1/2 top-0 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/[0.08] px-2.5 py-1.5 backdrop-blur-md">
        <span
          className="mark inline-block h-1.5 w-1.5 rounded-full bg-white/80"
          style={{ willChange: "transform, opacity" }}
        />
        <span
          className="mark inline-block h-1.5 w-1.5 rounded-full bg-white/80"
          style={{ willChange: "transform, opacity" }}
        />
        <span
          className="mark inline-block h-1.5 w-1.5 rounded-full bg-white/80"
          style={{ willChange: "transform, opacity" }}
        />
      </div>

      {/* Left avatar */}
      <div
        className="avatar flex h-[60px] w-[60px] items-center justify-center rounded-full font-semibold text-white/95"
        style={{
          willChange: "transform, opacity",
          background:
            "linear-gradient(135deg, #5b8def 0%, #7c63d6 100%)",
          boxShadow: "0 8px 24px -8px rgba(91,141,239,0.45)",
          fontSize: "22px",
          letterSpacing: "0.02em",
        }}
        aria-hidden="true"
      >
        M
      </div>

      {/* Middle avatar — slightly larger */}
      <div
        className="avatar flex h-[68px] w-[68px] items-center justify-center rounded-full font-semibold text-white/95"
        style={{
          willChange: "transform, opacity",
          background:
            "linear-gradient(135deg, #f5a06a 0%, #d96b6b 100%)",
          boxShadow: "0 10px 28px -10px rgba(245,160,106,0.5)",
          fontSize: "25px",
          letterSpacing: "0.02em",
        }}
        aria-hidden="true"
      >
        J
      </div>

      {/* Right avatar */}
      <div
        className="avatar flex h-[60px] w-[60px] items-center justify-center rounded-full font-semibold text-white/95"
        style={{
          willChange: "transform, opacity",
          background:
            "linear-gradient(135deg, #4ad29c 0%, #2c8c8c 100%)",
          boxShadow: "0 8px 24px -8px rgba(74,210,156,0.45)",
          fontSize: "22px",
          letterSpacing: "0.02em",
        }}
        aria-hidden="true"
      >
        S
      </div>
    </div>
  );
}

/**
 * Stage 5 — "Ship when you're ready."
 *
 * SVG clock face: dial path-draws via stroke-dashoffset, four tick marks
 * stagger in, center dot pops, minute hand grows from center and sweeps
 * 12 → 3 in one smooth motion. All on free-tier GSAP — no DrawSVG plugin.
 */
export function Stage5Clock() {
  const ref = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (!ref.current) return;
      const dial = ref.current.querySelector<SVGCircleElement>(".dial");
      const ticks = ref.current.querySelectorAll<SVGLineElement>(".tick");
      const hand = ref.current.querySelector<SVGLineElement>(".hand");
      const center = ref.current.querySelector<SVGCircleElement>(".center-dot");
      if (!dial || !hand || !center) return;

      const circumference = 2 * Math.PI * 40;

      if (reduced) {
        gsap.set(dial, { strokeDashoffset: 0, strokeDasharray: "none" });
        gsap.set(ticks, { opacity: 1, scale: 1 });
        gsap.set(center, { scale: 1 });
        gsap.set(hand, { rotation: 90, scaleY: 1, opacity: 1, svgOrigin: "50 50" });
        return;
      }

      gsap.set(dial, {
        strokeDasharray: circumference,
        strokeDashoffset: circumference,
      });
      gsap.set(ticks, { opacity: 0, scale: 0.6, svgOrigin: "50 50" });
      gsap.set(center, { scale: 0, svgOrigin: "50 50" });
      gsap.set(hand, { rotation: 0, scaleY: 0, opacity: 0, svgOrigin: "50 50" });

      const tl = gsap.timeline({ delay: 0.1 });

      tl.to(dial, {
        strokeDashoffset: 0,
        duration: 0.8,
        ease: "expo.out",
      });

      tl.to(
        ticks,
        {
          opacity: 0.9,
          scale: 1,
          duration: 0.35,
          ease: "power3.out",
          stagger: 0.05,
        },
        "-=0.45",
      );

      tl.to(
        center,
        {
          scale: 1,
          duration: 0.35,
          ease: "expo.out",
        },
        "-=0.25",
      );

      tl.to(
        hand,
        {
          opacity: 1,
          scaleY: 1,
          duration: 0.35,
          ease: "power2.out",
        },
        "-=0.15",
      );

      tl.to(hand, {
        rotation: 90, // sweep to 3 o'clock
        duration: 0.75,
        ease: "expo.out",
      });
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <svg
      ref={ref}
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      {/* Dial */}
      <circle
        className="dial"
        cx="50"
        cy="50"
        r="40"
        fill="rgba(255,255,255,0.03)"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Tick marks at 12, 3, 6, 9 */}
      <line className="tick" x1="50" y1="14" x2="50" y2="20" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
      <line className="tick" x1="86" y1="50" x2="80" y2="50" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
      <line className="tick" x1="50" y1="86" x2="50" y2="80" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
      <line className="tick" x1="14" y1="50" x2="20" y2="50" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Minute hand — points to 12 initially */}
      <line
        className="hand"
        x1="50"
        y1="50"
        x2="50"
        y2="22"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Center pivot */}
      <circle className="center-dot" cx="50" cy="50" r="2.5" fill="rgba(255,255,255,0.9)" />
    </svg>
  );
}
