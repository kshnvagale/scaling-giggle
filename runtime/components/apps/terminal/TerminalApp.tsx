"use client";

import { useEffect, useRef, useState } from "react";

interface TerminalLine {
  id: number;
  kind: "input" | "output" | "error" | "system";
  cwd?: string;
  text: string;
}

const USER = "kishan";
const HOST = "caseforge";
const HOME = "~";

// dummy filesystem
const FILES: Record<string, string[] | string> = {
  "~": ["briefing.md", "datasets/", "scripts/", "README.md"],
  "~/datasets": ["customers.csv", "transactions.csv", "inventory.csv", "kpis.csv"],
  "~/scripts": ["query.sql", "load.sh", "verify.py"],
  "~/briefing.md":
    "# Phase 6 — Operations Review\n\nReview the workbook, identify accounts at risk of churn, and\ndraft a remediation plan for the leadership team by EOD.\n",
  "~/README.md":
    "CaseForge sandbox — desktop shell.\nType `help` to see available commands.\n",
  "~/scripts/query.sql":
    "SELECT account, mrr_usd FROM operations.customers\nWHERE status = 'Active'\nORDER BY mrr_usd DESC\nLIMIT 10;",
  "~/scripts/load.sh":
    "#!/usr/bin/env bash\nbq load --source_format=CSV operations.customers datasets/customers.csv\n",
  "~/scripts/verify.py":
    "import csv\nwith open('datasets/customers.csv') as f:\n    rows = list(csv.DictReader(f))\nprint(f'Loaded {len(rows)} customers')\n",
};

const HELP_TEXT = [
  "Available commands:",
  "  help               Show this help",
  "  ls [path]          List directory contents",
  "  pwd                Print working directory",
  "  cd <path>          Change directory",
  "  cat <file>         Print file contents",
  "  echo <text>        Print text",
  "  whoami             Print current user",
  "  date               Print current date/time",
  "  bq query \"SQL\"     Hand off a query to the BigQuery app",
  "  open <app>         Hint: switch to another app on the desktop",
  "  clear              Clear the screen",
  "  exit               (no-op in this sandbox)",
].join("\n");

function resolvePath(cwd: string, target: string): string {
  if (!target || target === "~") return "~";
  if (target.startsWith("~")) return normalize(target);
  if (target.startsWith("/")) return normalize(target);
  if (target === "..") {
    if (cwd === "~") return "~";
    const parts = cwd.split("/");
    parts.pop();
    return parts.join("/") || "~";
  }
  if (target === ".") return cwd;
  return normalize(`${cwd}/${target}`);
}

function normalize(p: string): string {
  return p.replace(/\/+$/g, "").replace(/\/\.\//g, "/");
}

export default function TerminalApp() {
  const [cwd, setCwd] = useState<string>(HOME);
  const [history, setHistory] = useState<TerminalLine[]>(() => [
    {
      id: 0,
      kind: "system",
      text: `CaseForge Shell 1.0.4 — last login: ${new Date().toLocaleString()}\nType \`help\` to get started.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [cmdIdx, setCmdIdx] = useState<number>(-1);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const nextId = useRef(1);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [history]);

  function addLines(lines: Array<Omit<TerminalLine, "id">>) {
    setHistory((prev) => [
      ...prev,
      ...lines.map((l) => ({ ...l, id: nextId.current++ })),
    ]);
  }

  function run(raw: string) {
    const command = raw.trim();
    addLines([{ kind: "input", cwd, text: raw }]);
    if (!command) return;
    setCmdHistory((prev) => [...prev, command]);
    setCmdIdx(-1);

    const [head, ...rest] = command.split(/\s+/);
    const arg = rest.join(" ");

    switch (head) {
      case "help":
        return addLines([{ kind: "output", text: HELP_TEXT }]);

      case "pwd":
        return addLines([{ kind: "output", text: cwd }]);

      case "whoami":
        return addLines([{ kind: "output", text: USER }]);

      case "date":
        return addLines([{ kind: "output", text: new Date().toString() }]);

      case "echo":
        return addLines([{ kind: "output", text: arg }]);

      case "clear":
        nextId.current = 1;
        return setHistory([]);

      case "ls": {
        const target = arg ? resolvePath(cwd, arg) : cwd;
        const node = FILES[target];
        if (Array.isArray(node)) {
          return addLines([{ kind: "output", text: node.join("  ") }]);
        }
        if (typeof node === "string") {
          return addLines([{ kind: "error", text: `ls: ${target}: Not a directory` }]);
        }
        return addLines([{ kind: "error", text: `ls: ${arg || target}: No such file or directory` }]);
      }

      case "cd": {
        if (!arg) {
          setCwd("~");
          return;
        }
        const target = resolvePath(cwd, arg);
        if (Array.isArray(FILES[target])) {
          setCwd(target);
          return;
        }
        return addLines([{ kind: "error", text: `cd: ${arg}: Not a directory` }]);
      }

      case "cat": {
        if (!arg) {
          return addLines([{ kind: "error", text: "cat: missing file operand" }]);
        }
        const target = resolvePath(cwd, arg);
        const node = FILES[target];
        if (typeof node === "string") {
          return addLines([{ kind: "output", text: node }]);
        }
        if (Array.isArray(node)) {
          return addLines([{ kind: "error", text: `cat: ${arg}: Is a directory` }]);
        }
        return addLines([{ kind: "error", text: `cat: ${arg}: No such file or directory` }]);
      }

      case "bq": {
        if (rest[0] === "query") {
          return addLines([
            {
              kind: "output",
              text: `Submitting query to caseforge-ops-prod…\nTip: open the BigQuery app to view full results.\n\nbquxjob_${Math.random().toString(36).slice(2, 8)} | 0.6 s | 4.1 KB processed`,
            },
          ]);
        }
        return addLines([{ kind: "error", text: `bq: unknown sub-command '${rest[0] ?? ""}'` }]);
      }

      case "open": {
        if (!arg) {
          return addLines([{ kind: "error", text: "open: missing app name" }]);
        }
        return addLines([
          {
            kind: "output",
            text: `Click the ${arg} icon in the dock to launch it.`,
          },
        ]);
      }

      case "exit":
        return addLines([{ kind: "output", text: "(close the window from the title bar)" }]);

      default:
        return addLines([
          { kind: "error", text: `${head}: command not found. Try \`help\`.` },
        ]);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      run(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIdx = cmdIdx === -1 ? cmdHistory.length - 1 : Math.max(0, cmdIdx - 1);
      setCmdIdx(nextIdx);
      setInput(cmdHistory[nextIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (cmdIdx === -1) return;
      const nextIdx = cmdIdx + 1;
      if (nextIdx >= cmdHistory.length) {
        setCmdIdx(-1);
        setInput("");
      } else {
        setCmdIdx(nextIdx);
        setInput(cmdHistory[nextIdx]);
      }
    } else if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      nextId.current = 1;
      setHistory([]);
    }
  }

  const prompt = (p: string) => (
    <>
      <span className="text-[#7ee787]">{USER}@{HOST}</span>
      <span className="text-[#c9d1d9]">:</span>
      <span className="text-[#79c0ff]">{p}</span>
      <span className="text-[#c9d1d9]">$ </span>
    </>
  );

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex flex-col h-full min-h-0 bg-[#0d1117] text-[#c9d1d9] font-mono"
      style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace' }}
    >
      {/* Tab bar (iTerm/Terminal-style) */}
      <div className="flex items-end gap-1 px-3 pt-2 border-b border-[#21262d] bg-[#161b22] flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-t-md bg-[#0d1117] text-[12px] text-[#c9d1d9] border-t border-l border-r border-[#21262d]">
          <span className="w-2 h-2 rounded-full bg-[#7ee787]" />
          {USER}@{HOST}: {cwd}
        </div>
      </div>

      {/* Scrollback */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-3 text-[13px] leading-[1.55]"
      >
        {history.map((line) => {
          if (line.kind === "system") {
            return (
              <div key={line.id} className="text-[#8b949e] whitespace-pre-wrap mb-2">
                {line.text}
              </div>
            );
          }
          if (line.kind === "input") {
            return (
              <div key={line.id} className="whitespace-pre-wrap">
                {prompt(line.cwd ?? "~")}
                <span className="text-[#c9d1d9]">{line.text}</span>
              </div>
            );
          }
          if (line.kind === "error") {
            return (
              <div key={line.id} className="text-[#ff7b72] whitespace-pre-wrap">
                {line.text}
              </div>
            );
          }
          return (
            <div key={line.id} className="text-[#c9d1d9] whitespace-pre-wrap">
              {line.text}
            </div>
          );
        })}

        {/* Active prompt */}
        <div className="flex items-center">
          {prompt(cwd)}
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoComplete="off"
            className="flex-1 bg-transparent outline-none text-[#c9d1d9] caret-[#7ee787]"
          />
        </div>
      </div>
    </div>
  );
}
