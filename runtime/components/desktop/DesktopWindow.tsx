"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEventHandler, ReactNode } from "react";
import type { AppId } from "@/lib/types";

export interface MinimizeAnchor {
  /** Viewport-pixel translate-X needed to move the window's center to the dock icon's center. */
  dx: number;
  /** Viewport-pixel translate-Y needed to move the window's center to the dock icon's center. */
  dy: number;
}

interface DesktopWindowProps {
  appId: AppId;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  zIndex: number;
  isOpen: boolean;
  isMinimized: boolean;
  isClosing: boolean;
  isMaximizing: boolean;
  isInteracting: boolean;
  isMoving: boolean;
  isFocused: boolean;
  minimizeAnchor: MinimizeAnchor | undefined;
  onPointerDownCapture: PointerEventHandler<HTMLDivElement>;
  children: ReactNode;
}

const WINDOW_LIFT_SCALE = 1.012;
const WINDOW_LIFT_OFFSET = -8;

// macOS-style easing: cubic-bezier(0.32, 0.72, 0, 1) — Apple's preferred curve
// for window transitions in recent macOS releases. Same family as expo.out.
const APPLE_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const INTERACT_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

const ENTER_TRANSITION = [
  `left 240ms ${APPLE_EASE}`,
  `top 240ms ${APPLE_EASE}`,
  `width 240ms ${APPLE_EASE}`,
  `height 240ms ${APPLE_EASE}`,
  `transform 240ms ${APPLE_EASE}`,
  `opacity 220ms ${APPLE_EASE}`,
  `filter 240ms ease`,
].join(", ");

const CLOSE_TRANSITION = [
  `transform 220ms cubic-bezier(0.4, 0, 0.6, 1)`,
  `opacity 200ms cubic-bezier(0.4, 0, 0.6, 1)`,
].join(", ");

const MINIMIZE_TRANSITION = [
  `transform 380ms ${APPLE_EASE}`,
  `opacity 320ms ${APPLE_EASE}`,
  `filter 320ms ${APPLE_EASE}`,
].join(", ");

const RESTORE_TRANSITION = [
  `transform 320ms ${INTERACT_EASE}`,
  `opacity 280ms ${INTERACT_EASE}`,
  `filter 280ms ${INTERACT_EASE}`,
].join(", ");

// Maximize / restore-from-maximize: bigger size change, deserves longer
// duration + a more dramatic ease-out. cubic-bezier(0.16, 1, 0.3, 1) is
// "expo.out" — fast departure, gentle settle. Matches macOS feel.
const MAXIMIZE_TRANSITION = [
  `left 360ms ${INTERACT_EASE}`,
  `top 360ms ${INTERACT_EASE}`,
  `width 360ms ${INTERACT_EASE}`,
  `height 360ms ${INTERACT_EASE}`,
  `transform 360ms ${INTERACT_EASE}`,
  `filter 360ms ${INTERACT_EASE}`,
].join(", ");

const INTERACTION_TRANSITION = [
  `transform 180ms ${INTERACT_EASE}`,
  `opacity 160ms ease`,
  `filter 220ms ${INTERACT_EASE}`,
].join(", ");

export function DesktopWindow({
  appId,
  bounds,
  zIndex,
  isMinimized,
  isClosing,
  isMaximizing,
  isInteracting,
  isMoving,
  isFocused,
  minimizeAnchor,
  onPointerDownCapture,
  children,
}: DesktopWindowProps) {
  // Tracks whether this window has completed its mount frame. Used to play
  // the entrance animation (scale 0.94 → 1, opacity 0 → 1) on first paint.
  const [hasEntered, setHasEntered] = useState(false);
  const prevMinimized = useRef(isMinimized);

  useEffect(() => {
    // Two RAFs: ensures the initial styles have committed before the
    // browser sees the new "entered" styles, so the transition fires.
    let rafA = 0;
    let rafB = 0;
    rafA = requestAnimationFrame(() => {
      rafB = requestAnimationFrame(() => setHasEntered(true));
    });
    return () => {
      cancelAnimationFrame(rafA);
      cancelAnimationFrame(rafB);
    };
  }, []);

  // Detect a minimize → restored transition so we can pick the restore
  // transition timing (rather than the inbound minimize timing).
  const wasMinimized = prevMinimized.current;
  prevMinimized.current = isMinimized;
  const restoringFromMinimize = wasMinimized && !isMinimized;

  // ── Transform composition by state precedence ──────────────────────────
  let transform: string;
  let opacity: number;

  if (isClosing) {
    // Close: scale-toward-center + fade. Mirrors entrance.
    transform = "translate3d(0, 0, 0) scale(0.94)";
    opacity = 0;
  } else if (isMinimized) {
    if (minimizeAnchor) {
      // Cinematic dock-anchored minimize: translate to dock icon position,
      // scale down to roughly icon-sized. Order matters — translate first
      // so dx/dy are in viewport pixels (not scaled units).
      transform = `translate(${minimizeAnchor.dx}px, ${minimizeAnchor.dy}px) scale(0.08)`;
    } else {
      // Fallback if dock icon ref wasn't ready in time.
      transform = "translate3d(0, 64px, 0) scale(0.85)";
    }
    opacity = 0;
  } else if (!hasEntered) {
    // Just mounted — animate in from slightly-shrunken + faded.
    transform = "translate3d(0, 0, 0) scale(0.94)";
    opacity = 0;
  } else if (isMoving) {
    // Picked-up lift while dragging.
    transform = `translate3d(0, ${WINDOW_LIFT_OFFSET}px, 0) scale(${WINDOW_LIFT_SCALE})`;
    opacity = 1;
  } else {
    transform = "translate3d(0, 0, 0) scale(1)";
    opacity = 1;
  }

  // Filter composition. Minimized windows get a subtle blur as they fly
  // toward the dock — adds depth to the dock-anchor animation.
  let filter: string;
  if (isMinimized) {
    filter = "blur(3px) saturate(0.85) brightness(0.95)";
  } else if (isFocused) {
    filter = "none";
  } else {
    filter = "saturate(0.9) brightness(0.98)";
  }

  // Pick the right transition timing. Precedence: close > minimize > restore
  // > maximize > interaction > standard enter.
  let transition: string;
  if (isClosing) {
    transition = CLOSE_TRANSITION;
  } else if (isMinimized) {
    transition = MINIMIZE_TRANSITION;
  } else if (restoringFromMinimize) {
    transition = RESTORE_TRANSITION;
  } else if (isMaximizing) {
    transition = MAXIMIZE_TRANSITION;
  } else if (isInteracting) {
    transition = INTERACTION_TRANSITION;
  } else {
    transition = ENTER_TRANSITION;
  }

  return (
    <div
      data-window-id={appId}
      data-no-desktop-menu="true"
      onPointerDownCapture={onPointerDownCapture}
      className="absolute"
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        zIndex,
        opacity,
        transform,
        pointerEvents: isMinimized || isClosing ? "none" : "auto",
        filter,
        transition,
        transformOrigin: "center center",
        willChange: isInteracting ? "transform" : undefined,
      }}
    >
      {children}
    </div>
  );
}
