"use client";

// AppSlot is no longer needed as a separate component — the window chrome
// and app rendering are now handled directly in Desktop.tsx.
// This file is kept for import compatibility.

import type { AppId } from "@/lib/types";

interface AppSlotProps {
  appComponents: Record<AppId, React.ComponentType>;
  activeApp: AppId;
}

export function AppSlot({ appComponents, activeApp }: AppSlotProps) {
  const ActiveComponent = appComponents[activeApp];
  return <ActiveComponent key={activeApp} />;
}
