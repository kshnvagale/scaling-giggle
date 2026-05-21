"use client";

import type { ReactNode } from "react";
import { Stage2Lens, Stage3Workspace, Stage4People, Stage5Clock } from "./diagrams";

export type StageId = "hello" | "simulation" | "workspace" | "explore" | "ship";

export interface StageDef {
  id: StageId;
  /** Hello is a cinematic auto-advance frame with no chrome. */
  kind: "hello" | "content";
  /** Headline string, rendered character-by-character on entrance. */
  headline?: string;
  /** Body paragraph, rendered word-by-word on entrance. */
  body?: string;
  /** Optional decorative diagram rendered above the headline. */
  diagram?: ReactNode;
}

export const STAGES: StageDef[] = [
  {
    id: "hello",
    kind: "hello",
  },
  {
    id: "simulation",
    kind: "content",
    headline: "This is a simulation, not a course.",
    body:
      "You'll be dropped into a real-world scenario. No answer key. No hints. Treat it like work.",
    diagram: <Stage2Lens />,
  },
  {
    id: "workspace",
    kind: "content",
    headline: "This is your workspace.",
    body:
      "Apps, files, people — everything you need is here. Open them like any desktop. Move things around. Make it yours.",
    diagram: <Stage3Workspace />,
  },
  {
    id: "explore",
    kind: "content",
    headline: "Explore. Ask. Try things.",
    body:
      "Talk to your team. Read the docs. Run queries. There's no penalty for being curious — or wrong.",
    diagram: <Stage4People />,
  },
  {
    id: "ship",
    kind: "content",
    headline: "Ship when you're ready.",
    body:
      "There's a deliverable. There's a clock. And there's an honest judge waiting.",
    diagram: <Stage5Clock />,
  },
];

/** Index of the last content stage (used by the controller). */
export const LAST_INDEX = STAGES.length - 1;
