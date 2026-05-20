import type { AppRegistryEntry } from "./types";

export const APP_REGISTRY: AppRegistryEntry[] = [
  {
    id: "briefing",
    label: "Briefing",
    icon: "\u{1F4CB}",
    description: "Your task assignment and objectives",
  },
  {
    id: "wiki",
    label: "Wiki",
    icon: "\u{1F4D6}",
    description: "Company knowledge base and documentation",
  },
  {
    id: "chat",
    label: "Chat",
    icon: "\u{1F4AC}",
    description: "Talk to subject matter experts",
  },
  {
    id: "sheets",
    label: "Sheets",
    icon: "\u{1F4CA}",
    description: "Spreadsheets with operational data",
  },
  {
    id: "bigquery",
    label: "BigQuery",
    icon: "\u{1F5C4}",
    description: "Run SQL against operational data",
  },
  {
    id: "terminal",
    label: "Terminal",
    icon: "\u{1F4BB}",
    description: "Command-line shell",
  },
  {
    id: "notebook",
    label: "Notebook",
    icon: "\u{1F4D3}",
    description: "Interactive notebooks with code and analysis",
  },
  {
    id: "submit",
    label: "Submit",
    icon: "\u{1F4E4}",
    description: "Upload your deliverable for grading",
  },
];

export function getAppEntry(id: string) {
  return APP_REGISTRY.find((a) => a.id === id)!;
}
