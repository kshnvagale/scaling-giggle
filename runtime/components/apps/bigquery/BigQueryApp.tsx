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

const PROJECT = "helix-cloud-prod";

const DATASETS: DatasetDef[] = [
  {
    name: "revenue",
    tables: [
      { name: "accounts", rows: 620, size: "4.1 KB" },
      { name: "subscriptions", rows: 1240, size: "24 KB" },
      { name: "events", rows: 6800, size: "512 KB" },
      { name: "pipeline", rows: 310, size: "38 KB" },
    ],
  },
  {
    name: "customer_success",
    tables: [
      { name: "health_scores", rows: 58000, size: "1.9 MB" },
      { name: "tickets", rows: 1840, size: "620 KB" },
    ],
  },
  {
    name: "product_usage",
    tables: [
      { name: "usage_daily", rows: 412000, size: "38 MB" },
    ],
  },
];

const TABS: QueryTab[] = [
  {
    id: "q1",
    title: "Q2 revenue walk by component",
    sql: `-- Q2 2026 net new ARR walk: new logo + expansion - contraction - churn, by segment
SELECT
  a.segment,
  ROUND(SUM(IF(e.event_type = 'new_logo', e.arr_delta, 0)), 0) AS new_logo_arr,
  ROUND(SUM(IF(e.event_type = 'expansion', e.arr_delta, 0)), 0) AS expansion_arr,
  ROUND(SUM(IF(e.event_type = 'contraction', e.arr_delta, 0)), 0) AS contraction_arr,
  ROUND(SUM(IF(e.event_type = 'churn', e.arr_delta, 0)), 0) AS churn_arr,
  ROUND(SUM(e.arr_delta), 0) AS net_new_arr
FROM \`helix-cloud-prod.revenue.events\` e
JOIN \`helix-cloud-prod.revenue.accounts\` a
  ON e.account_id = a.account_id
WHERE e.event_date BETWEEN '2026-04-01' AND '2026-06-30'
GROUP BY a.segment
ORDER BY net_new_arr DESC;`,
    resultColumns: ["segment", "new_logo_arr", "expansion_arr", "contraction_arr", "churn_arr", "net_new_arr"],
    resultRows: [
      ["Enterprise", 4200000, 1950000, -190000, -205000, 5755000],
      ["Mid-Market", 2100000, 720000, -120000, -855000, 1845000],
    ],
    bytesProcessed: "512 KB",
    elapsed: "0.8 s",
  },
  {
    id: "q2",
    title: "Mid-Market churn by renewal cohort",
    sql: `-- Mid-Market accounts up for renewal in Q2 2026 vs how many churned, with $ impact
SELECT
  FORMAT_DATE('%Y-%m', s.renewal_date) AS renewal_month,
  COUNT(DISTINCT s.account_id) AS accounts_up_for_renewal,
  COUNTIF(s.status = 'canceled') AS churned_accounts,
  ROUND(SAFE_DIVIDE(COUNTIF(s.status = 'canceled'), COUNT(DISTINCT s.account_id)), 3) AS churn_rate,
  ROUND(SUM(IF(s.status = 'canceled', s.arr_usd, 0)), 0) AS lost_arr_usd
FROM \`helix-cloud-prod.revenue.subscriptions\` s
JOIN \`helix-cloud-prod.revenue.accounts\` a
  ON s.account_id = a.account_id
WHERE a.segment = 'Mid-Market'
  AND s.renewal_date BETWEEN '2026-04-01' AND '2026-06-30'
GROUP BY renewal_month
ORDER BY renewal_month;`,
    resultColumns: ["renewal_month", "accounts_up_for_renewal", "churned_accounts", "churn_rate", "lost_arr_usd"],
    resultRows: [
      ["2026-04", 65, 6, 0.092, 248000],
      ["2026-05", 78, 9, 0.115, 312000],
      ["2026-06", 62, 8, 0.129, 295000],
    ],
    bytesProcessed: "24 KB",
    elapsed: "0.5 s",
  },
  {
    id: "q3",
    title: "Lineage attach rate Q1 vs Q2",
    sql: `-- Helix Lineage attach rate on new deals: Q1 2026 vs Q2 2026
SELECT
  CONCAT('Q', CAST(EXTRACT(QUARTER FROM p.close_date) AS STRING), ' ',
         CAST(EXTRACT(YEAR FROM p.close_date) AS STRING)) AS quarter,
  COUNT(DISTINCT p.opportunity_id) AS new_deals_total,
  COUNTIF(EXISTS(
    SELECT 1 FROM \`helix-cloud-prod.revenue.subscriptions\` s
    WHERE s.account_id = p.account_id
      AND s.product = 'Helix Lineage'
      AND s.start_date <= p.close_date
  )) AS deals_with_lineage,
  ROUND(SAFE_DIVIDE(
    COUNTIF(EXISTS(
      SELECT 1 FROM \`helix-cloud-prod.revenue.subscriptions\` s
      WHERE s.account_id = p.account_id
        AND s.product = 'Helix Lineage'
        AND s.start_date <= p.close_date
    )),
    COUNT(DISTINCT p.opportunity_id)
  ), 3) AS attach_rate
FROM \`helix-cloud-prod.revenue.pipeline\` p
WHERE p.stage = 'Closed Won'
  AND p.close_date BETWEEN '2026-01-01' AND '2026-06-30'
GROUP BY quarter
ORDER BY quarter;`,
    resultColumns: ["quarter", "new_deals_total", "deals_with_lineage", "attach_rate"],
    resultRows: [
      ["Q1 2026", 48, 10, 0.208],
      ["Q2 2026", 39, 7, 0.179],
    ],
    bytesProcessed: "62 KB",
    elapsed: "0.7 s",
  },
];

const SQL_KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "AND", "OR", "ORDER", "BY", "GROUP", "LIMIT",
  "JOIN", "ON", "AS", "COUNT", "SUM", "ROUND", "DISTINCT", "BETWEEN",
  "CURRENT_DATE", "ASC", "DESC", "NULL", "IS", "NOT", "IN", "LEFT", "RIGHT", "INNER",
  "IF", "EXISTS", "CAST", "EXTRACT", "QUARTER", "YEAR", "CONCAT",
  "FORMAT_DATE", "SAFE_DIVIDE", "COUNTIF",
]);

export default function BigQueryApp() {
  const [activeTabId, setActiveTabId] = useState<string>(TABS[0].id);
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(
    new Set(["revenue"]),
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
