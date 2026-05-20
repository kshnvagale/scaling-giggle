"use client";

import { useMemo, useState } from "react";

interface TableDef {
  name: string;
  rows: number;
  size: string;
}

interface DatasetDef {
  name: string;
  tables: TableDef[];
}

interface QueryTab {
  id: string;
  title: string;
  sql: string;
  resultColumns: string[];
  resultRows: Array<Array<string | number>>;
  bytesProcessed: string;
  elapsed: string;
}

const PROJECT = "caseforge-ops-prod";

const DATASETS: DatasetDef[] = [
  {
    name: "operations",
    tables: [
      { name: "customers", rows: 12, size: "4.1 KB" },
      { name: "transactions", rows: 12, size: "3.8 KB" },
      { name: "inventory", rows: 12, size: "4.6 KB" },
    ],
  },
  {
    name: "finance",
    tables: [
      { name: "kpis_quarterly", rows: 10, size: "2.2 KB" },
      { name: "revenue_daily", rows: 365, size: "112 KB" },
      { name: "invoices", rows: 4821, size: "1.7 MB" },
    ],
  },
  {
    name: "support",
    tables: [
      { name: "tickets", rows: 1240, size: "412 KB" },
      { name: "csat_responses", rows: 880, size: "188 KB" },
      { name: "agents", rows: 28, size: "3.2 KB" },
    ],
  },
];

const TABS: QueryTab[] = [
  {
    id: "q1",
    title: "Top accounts by MRR",
    sql: `-- Top accounts by monthly recurring revenue
SELECT
  account,
  region,
  plan,
  mrr_usd,
  status
FROM \`caseforge-ops-prod.operations.customers\`
WHERE status = 'Active'
ORDER BY mrr_usd DESC
LIMIT 10;`,
    resultColumns: ["account", "region", "plan", "mrr_usd", "status"],
    resultRows: [
      ["Ironclad Defense", "NA-East", "Enterprise", 31200, "Active"],
      ["Quanta Robotics", "APAC", "Enterprise", 26100, "Active"],
      ["Kestrel Bank", "NA-West", "Enterprise", 24800, "Active"],
      ["Verity Insurance", "NA-West", "Enterprise", 22600, "Active"],
      ["Bluefin Energy", "APAC", "Enterprise", 19200, "Active"],
      ["Northwind Logistics", "NA-East", "Enterprise", 18400, "Active"],
      ["Atlas Manufacturing", "EU-Central", "Growth", 7100, "Active"],
      ["Helios Retail Group", "EU-West", "Growth", 6200, "Active"],
      ["Marigold Foods", "EU-West", "Growth", 4900, "Active"],
    ],
    bytesProcessed: "4.1 KB",
    elapsed: "0.4 s",
  },
  {
    id: "q2",
    title: "Inventory below reorder",
    sql: `-- Items below reorder threshold (after reservations)
SELECT
  sku,
  product,
  warehouse,
  on_hand,
  reserved,
  reorder_at,
  on_hand - reserved AS available
FROM \`caseforge-ops-prod.operations.inventory\`
WHERE on_hand - reserved < reorder_at
ORDER BY (reorder_at - (on_hand - reserved)) DESC;`,
    resultColumns: ["sku", "product", "warehouse", "on_hand", "reserved", "reorder_at", "available"],
    resultRows: [
      ["SKU-B201", "Edge Gateway Pro", "WH-Reno", 36, 18, 60, 18],
      ["SKU-B200", "Edge Gateway", "WH-Reno", 92, 40, 100, 52],
      ["SKU-F601", "Enclosure IP67", "WH-Reno", 145, 60, 200, 85],
      ["SKU-E501", "Display Panel 10\"", "WH-Austin", 220, 80, 200, 140],
    ],
    bytesProcessed: "4.6 KB",
    elapsed: "0.6 s",
  },
  {
    id: "q3",
    title: "Revenue by region (MTD)",
    sql: `-- Month-to-date revenue by region
SELECT
  c.region,
  COUNT(DISTINCT c.id) AS active_accounts,
  ROUND(SUM(t.amount_usd), 0) AS revenue_usd
FROM \`caseforge-ops-prod.operations.transactions\` t
JOIN \`caseforge-ops-prod.operations.customers\` c
  ON t.account = c.account
WHERE t.date BETWEEN '2026-05-01' AND CURRENT_DATE()
GROUP BY c.region
ORDER BY revenue_usd DESC;`,
    resultColumns: ["region", "active_accounts", "revenue_usd"],
    resultRows: [
      ["NA-East", 3, 51400],
      ["NA-West", 2, 51600],
      ["APAC", 2, 45300],
      ["EU-West", 2, 11100],
      ["EU-Central", 1, 7100],
    ],
    bytesProcessed: "7.9 KB",
    elapsed: "0.8 s",
  },
];

const SQL_KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "AND", "OR", "ORDER", "BY", "GROUP", "LIMIT",
  "JOIN", "ON", "AS", "COUNT", "SUM", "ROUND", "DISTINCT", "BETWEEN",
  "CURRENT_DATE", "ASC", "DESC", "NULL", "IS", "NOT", "IN", "LEFT", "RIGHT", "INNER",
]);

export default function BigQueryApp() {
  const [activeTabId, setActiveTabId] = useState<string>(TABS[0].id);
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(
    new Set(["operations"]),
  );
  const [projectExpanded, setProjectExpanded] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(true);
  const [resultsTab, setResultsTab] = useState<"results" | "info" | "graph" | "chart">("results");

  const activeTab = useMemo(
    () => TABS.find((t) => t.id === activeTabId) ?? TABS[0],
    [activeTabId],
  );

  function toggleDataset(name: string) {
    setExpandedDatasets((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function runQuery() {
    setIsRunning(true);
    setHasRun(false);
    window.setTimeout(() => {
      setIsRunning(false);
      setHasRun(true);
    }, 650);
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-white text-[#202124]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-3 h-11 border-b border-[#dadce0] bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center text-[#1a73e8]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 6v6c0 4.4 3.6 8 8 10 4.4-2 8-5.6 8-10V6l-8-4zm0 4l5.4 2.7v3.7c0 3.1-2.4 5.8-5.4 7-3-1.2-5.4-3.9-5.4-7V8.7L12 6z" />
            </svg>
          </div>
          <span className="text-[14px] font-medium text-[#202124]">BigQuery</span>
        </div>

        <div className="w-px h-5 bg-[#dadce0] mx-1" />

        <div className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#f1f3f4] cursor-default">
          <div className="w-4 h-4 rounded-sm bg-[#1a73e8]" />
          <span className="text-[12px] text-[#202124]">{PROJECT}</span>
          <svg width="10" height="10" viewBox="0 0 8 8" fill="none" className="text-[#5f6368]">
            <path d="M2 3L4 5L6 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1 px-2 py-1 rounded border border-[#dadce0] bg-white text-[#5f6368] text-[12px] w-[260px]">
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
            <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M12 12l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span>Search resources</span>
        </div>
      </div>

      {/* Body: explorer + editor */}
      <div className="flex flex-1 min-h-0">
        {/* Explorer sidebar */}
        <div className="w-[260px] border-r border-[#dadce0] bg-[#f8f9fa] flex flex-col flex-shrink-0">
          <div className="flex items-center justify-between px-3 h-9 border-b border-[#dadce0]">
            <span className="text-[12px] font-medium text-[#202124]">Explorer</span>
            <div className="flex items-center gap-1 text-[#5f6368]">
              <ExplorerIcon title="Add data">
                <path d="M9 4v10M4 9h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </ExplorerIcon>
              <ExplorerIcon title="More">
                <circle cx="4" cy="9" r="1" fill="currentColor" />
                <circle cx="9" cy="9" r="1" fill="currentColor" />
                <circle cx="14" cy="9" r="1" fill="currentColor" />
              </ExplorerIcon>
            </div>
          </div>

          <div className="px-2 py-2 border-b border-[#dadce0]">
            <div className="flex items-center gap-1 px-2 py-1 rounded border border-[#dadce0] bg-white text-[#5f6368] text-[12px]">
              <svg width="12" height="12" viewBox="0 0 18 18" fill="none">
                <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M12 12l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <span>Type to search</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-1 text-[12px]">
            {/* Project node */}
            <TreeRow
              level={0}
              expanded={projectExpanded}
              onToggle={() => setProjectExpanded((v) => !v)}
              icon={
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                  <rect x="3" y="3" width="12" height="12" rx="1.5" stroke="#1a73e8" strokeWidth="1.4" />
                  <path d="M3 7h12M7 3v12" stroke="#1a73e8" strokeWidth="1.2" />
                </svg>
              }
              label={PROJECT}
            />

            {projectExpanded &&
              DATASETS.map((ds) => {
                const isOpen = expandedDatasets.has(ds.name);
                return (
                  <div key={ds.name}>
                    <TreeRow
                      level={1}
                      expanded={isOpen}
                      onToggle={() => toggleDataset(ds.name)}
                      icon={
                        <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                          <path
                            d="M3 5a1 1 0 0 1 1-1h3l2 2h5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5z"
                            stroke="#5f6368"
                            strokeWidth="1.3"
                            fill="none"
                          />
                        </svg>
                      }
                      label={ds.name}
                    />
                    {isOpen &&
                      ds.tables.map((t) => (
                        <TreeRow
                          key={t.name}
                          level={2}
                          icon={
                            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                              <rect x="3" y="4" width="12" height="10" stroke="#5f6368" strokeWidth="1.2" fill="none" />
                              <line x1="3" y1="7.5" x2="15" y2="7.5" stroke="#5f6368" strokeWidth="1.2" />
                              <line x1="9" y1="4" x2="9" y2="14" stroke="#5f6368" strokeWidth="1.2" />
                            </svg>
                          }
                          label={t.name}
                          trailing={
                            <span className="text-[10px] text-[#5f6368]">
                              {t.rows.toLocaleString()} rows
                            </span>
                          }
                        />
                      ))}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Editor + results */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Query tabs */}
          <div className="flex items-center border-b border-[#dadce0] bg-[#f8f9fa] flex-shrink-0">
            {TABS.map((t) => {
              const isActive = t.id === activeTabId;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTabId(t.id)}
                  className={`flex items-center gap-2 px-3 h-9 text-[12px] border-r border-[#dadce0] ${
                    isActive
                      ? "bg-white text-[#202124] border-b-2 border-b-[#1a73e8] -mb-px"
                      : "text-[#5f6368] hover:bg-[#f1f3f4]"
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 18 18" fill="none" className="text-[#1a73e8]">
                    <path
                      d="M4 4h7l3 3v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      fill="none"
                    />
                  </svg>
                  {t.title}
                  <span className="text-[#5f6368] hover:text-[#202124] ml-1">×</span>
                </button>
              );
            })}
            <button className="px-2 h-9 text-[#5f6368] hover:bg-[#f1f3f4]">
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                <path d="M9 4v10M4 9h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-2 px-3 h-11 border-b border-[#dadce0] bg-white flex-shrink-0">
            <button
              onClick={runQuery}
              disabled={isRunning}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium transition-colors ${
                isRunning
                  ? "bg-[#1a73e8]/60 text-white cursor-wait"
                  : "bg-[#1a73e8] text-white hover:bg-[#1765cc]"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 18 18" fill="currentColor">
                <path d="M5 3l9 6-9 6V3z" />
              </svg>
              {isRunning ? "Running..." : "Run"}
            </button>

            <ActionBtn label="Save">
              <path
                d="M4 3h8l2 2v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
                stroke="currentColor"
                strokeWidth="1.3"
                fill="none"
              />
              <rect x="6" y="3" width="5" height="3" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </ActionBtn>
            <ActionBtn label="Schedule">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.3" fill="none" />
              <path d="M9 6v3.5L11 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </ActionBtn>
            <ActionBtn label="More">
              <circle cx="4" cy="9" r="1.2" fill="currentColor" />
              <circle cx="9" cy="9" r="1.2" fill="currentColor" />
              <circle cx="14" cy="9" r="1.2" fill="currentColor" />
            </ActionBtn>

            <div className="flex-1" />

            <span className="text-[11px] text-[#5f6368]">
              This query will process <span className="text-[#202124] font-medium">{activeTab.bytesProcessed}</span> when run.
            </span>
          </div>

          {/* SQL editor */}
          <div className="flex-shrink-0 max-h-[280px] overflow-auto bg-white border-b border-[#dadce0]">
            <div className="flex font-mono text-[12px] leading-[20px]">
              {/* Line numbers */}
              <div className="select-none text-right pr-3 pl-3 py-2 text-[#9aa0a6] bg-[#f8f9fa] border-r border-[#dadce0]">
                {activeTab.sql.split("\n").map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              {/* Code */}
              <pre className="py-2 px-3 flex-1 whitespace-pre">
                {activeTab.sql.split("\n").map((line, i) => (
                  <div key={i}>{highlightSql(line)}</div>
                ))}
              </pre>
            </div>
          </div>

          {/* Results panel */}
          <div className="flex-1 min-h-0 flex flex-col bg-white">
            {/* Results tabs */}
            <div className="flex items-center border-b border-[#dadce0] flex-shrink-0">
              <ResultsTab
                active={resultsTab === "results"}
                onClick={() => setResultsTab("results")}
              >
                Query results
              </ResultsTab>
              <ResultsTab
                active={resultsTab === "info"}
                onClick={() => setResultsTab("info")}
              >
                Job information
              </ResultsTab>
              <ResultsTab
                active={resultsTab === "graph"}
                onClick={() => setResultsTab("graph")}
              >
                Execution graph
              </ResultsTab>
              <ResultsTab
                active={resultsTab === "chart"}
                onClick={() => setResultsTab("chart")}
              >
                Chart
              </ResultsTab>

              <div className="flex-1" />

              {hasRun && resultsTab === "results" && (
                <div className="flex items-center gap-3 pr-3 text-[11px] text-[#5f6368]">
                  <span>
                    <span className="text-[#0f9d58]">✓</span> {activeTab.resultRows.length} rows
                  </span>
                  <span>{activeTab.elapsed}</span>
                  <span>{activeTab.bytesProcessed} processed</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
              {isRunning && (
                <div className="flex items-center justify-center h-full text-[#5f6368] text-[12px]">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-[#1a73e8] border-t-transparent animate-spin" />
                    Running query…
                  </span>
                </div>
              )}

              {!isRunning && hasRun && resultsTab === "results" && (
                <ResultsTable
                  columns={activeTab.resultColumns}
                  rows={activeTab.resultRows}
                />
              )}

              {!isRunning && hasRun && resultsTab === "info" && (
                <JobInfo tab={activeTab} />
              )}

              {!isRunning && hasRun && resultsTab === "graph" && (
                <div className="p-6 text-[12px] text-[#5f6368]">
                  Execution graph not available in this preview.
                </div>
              )}

              {!isRunning && hasRun && resultsTab === "chart" && (
                <div className="p-6 text-[12px] text-[#5f6368]">
                  Chart visualization not available in this preview.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultsTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <table className="w-full border-collapse text-[12px]">
      <thead>
        <tr className="bg-[#f8f9fa]">
          <th className="sticky top-0 px-3 py-2 text-left text-[#5f6368] font-medium border-b border-[#dadce0] w-[44px]">
            Row
          </th>
          {columns.map((c) => (
            <th
              key={c}
              className="sticky top-0 px-3 py-2 text-left text-[#5f6368] font-medium border-b border-[#dadce0]"
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx} className="hover:bg-[#f1f3f4]">
            <td className="px-3 py-1.5 text-[#5f6368] border-b border-[#f1f3f4]">
              {idx + 1}
            </td>
            {row.map((cell, ci) => {
              const isNumber = typeof cell === "number";
              return (
                <td
                  key={ci}
                  className={`px-3 py-1.5 border-b border-[#f1f3f4] ${
                    isNumber ? "text-right tabular-nums" : "text-left"
                  } text-[#202124]`}
                >
                  {isNumber ? cell.toLocaleString("en-US") : cell}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function JobInfo({ tab }: { tab: QueryTab }) {
  const entries: Array<[string, string]> = [
    ["Job ID", `bquxjob_${tab.id}_${Math.floor(Date.now() / 1000)}`],
    ["User", "kishan.vagale@scaler.com"],
    ["Location", "US (multi-region)"],
    ["Creation time", new Date().toLocaleString()],
    ["Duration", tab.elapsed],
    ["Bytes processed", tab.bytesProcessed],
    ["Bytes billed", tab.bytesProcessed],
    ["Slot ms", "1,240"],
    ["Destination table", "Temporary table"],
  ];
  return (
    <div className="p-4">
      <table className="text-[12px]">
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td className="pr-6 py-1 text-[#5f6368] align-top">{k}</td>
              <td className="py-1 text-[#202124] font-mono">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TreeRow({
  level,
  expanded,
  onToggle,
  icon,
  label,
  trailing,
}: {
  level: number;
  expanded?: boolean;
  onToggle?: () => void;
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      onClick={onToggle}
      className="flex items-center gap-1.5 h-7 pr-2 hover:bg-[#e8eaed] cursor-default group"
      style={{ paddingLeft: 6 + level * 14 }}
    >
      <span className="w-3 flex items-center justify-center text-[#5f6368]">
        {onToggle ? (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
            fill="none"
          >
            <path d="M3 2l4 3-4 3V2z" fill="currentColor" />
          </svg>
        ) : null}
      </span>
      <span className="flex items-center">{icon}</span>
      <span className="flex-1 truncate text-[#202124]">{label}</span>
      {trailing}
    </div>
  );
}

function ExplorerIcon({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      className="w-6 h-6 rounded hover:bg-[#e8eaed] flex items-center justify-center"
    >
      <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
        {children}
      </svg>
    </button>
  );
}

function ResultsTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 h-9 text-[12px] border-b-2 ${
        active
          ? "border-[#1a73e8] text-[#1a73e8] font-medium"
          : "border-transparent text-[#5f6368] hover:text-[#202124]"
      }`}
    >
      {children}
    </button>
  );
}

function ActionBtn({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button className="flex items-center gap-1.5 h-8 px-2 rounded text-[12px] text-[#5f6368] hover:bg-[#f1f3f4]">
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
        {children}
      </svg>
      {label}
    </button>
  );
}

// ── SQL syntax highlighter ──────────────────────────────────────────
function highlightSql(line: string): React.ReactNode {
  if (line.trim().startsWith("--")) {
    return <span className="text-[#137333]">{line || " "}</span>;
  }

  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]*`|'[^']*'|\b\d+\b|\w+|\s+|[^\s\w])/g;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(line)) !== null) {
    const token = match[0];
    if (/^`/.test(token) || /^'/.test(token)) {
      parts.push(
        <span key={key++} className="text-[#a8323c]">
          {token}
        </span>,
      );
    } else if (/^\d+$/.test(token)) {
      parts.push(
        <span key={key++} className="text-[#1a73e8]">
          {token}
        </span>,
      );
    } else if (/^\w+$/.test(token) && SQL_KEYWORDS.has(token.toUpperCase())) {
      parts.push(
        <span key={key++} className="text-[#1a73e8] font-medium">
          {token}
        </span>,
      );
    } else {
      parts.push(token);
    }
  }

  if (parts.length === 0) return " ";
  return <>{parts}</>;
}
