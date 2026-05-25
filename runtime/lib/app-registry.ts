import type { AppRegistryEntry } from "./types";

export const APP_REGISTRY: AppRegistryEntry[] = [
  {
    id: "briefing",
    label: "Briefing",
    icon: "\u{1F4CB}",
    iconImage: "/icons/briefing.png",
    description: "Your task assignment and objectives",
  },
  {
    id: "wiki",
    label: "Wiki",
    icon: "\u{1F4D6}",
    iconImage: "/icons/wiki.png",
    description: "Company knowledge base and documentation",
  },
  {
    id: "chat",
    label: "Chat",
    icon: "\u{1F4AC}",
    iconImage: "/icons/chat.png",
    description: "Talk to subject matter experts",
  },
  {
    id: "sheets",
    label: "Sheets",
    icon: "\u{1F4CA}",
    iconImage: "/icons/sheets.png",
    description: "Spreadsheets with operational data",
  },
  {
    id: "bigquery",
    label: "BigQuery",
    icon: "\u{1F5C4}",
    iconImage: "/icons/bigquery.svg",
    description: "Run SQL against operational data",
  },
  {
    id: "terminal",
    label: "Terminal",
    icon: "\u{1F4BB}",
    iconImage: "/icons/terminal.png",
    description: "Command-line shell",
  },
  {
    id: "notebook",
    label: "Notebook",
    icon: "\u{1F4D3}",
    iconImage: "/icons/notebook.png",
    description: "Interactive notebooks with code and analysis",
  },
];

export function getAppEntry(id: string) {
  return APP_REGISTRY.find((a) => a.id === id)!;
}
