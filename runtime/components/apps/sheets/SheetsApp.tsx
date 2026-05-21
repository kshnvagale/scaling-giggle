"use client";

import { useMemo, useState } from "react";

interface Sheet {
  id: string;
  name: string;
  color: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}

const SHEETS: Sheet[] = [
  {
    id: "accounts",
    name: "Accounts",
    color: "#0E7C7B",
    columns: ["ID", "Account", "Segment", "Region", "ARR (USD)", "Status"],
    rows: [
      ["A-2104", "Ironclad Defense", "Enterprise", "NA-East", 412000, "Active"],
      ["A-2105", "Quanta Robotics", "Enterprise", "APAC", 318000, "Active"],
      ["A-2106", "Kestrel Bank", "Enterprise", "NA-West", 296000, "Active"],
      ["A-2107", "Bluefin Energy", "Enterprise", "APAC", 234000, "Active"],
      ["A-2108", "Northwind Logistics", "Enterprise", "NA-East", 188000, "Downgraded"],
      ["A-2109", "Verity Insurance", "Enterprise", "NA-West", 142000, "Downgraded"],
      ["A-2110", "Atlas Manufacturing", "Enterprise", "EU-Central", 124000, "Downgraded"],
      ["A-2111", "Helios Retail Group", "Mid-Market", "EU-West", 68400, "Active"],
      ["A-2112", "Marigold Foods", "Mid-Market", "EU-West", 54200, "Active"],
      ["A-2113", "Pinecrest Health", "Mid-Market", "NA-East", 61800, "Churned"],
      ["A-2114", "Sable Media", "Mid-Market", "NA-East", 38600, "Churned"],
      ["A-2115", "Cobalt Travel", "Mid-Market", "EU-West", 42100, "Churned"],
      ["A-2116", "Brightline Therapeutics", "Mid-Market", "NA-West", 47800, "Active"],
      ["A-2117", "Lumio Studios", "Mid-Market", "NA-East", 51400, "Active"],
    ],
  },
  {
    id: "subscriptions",
    name: "Subscriptions",
    color: "#1a73e8",
    columns: ["Sub ID", "Account", "Product", "MRR (USD)", "Start", "Renewal", "Status"],
    rows: [
      ["S-5001", "Ironclad Defense", "Helix Core", 28200, "2025-03-01", "2027-03-01", "Active"],
      ["S-5002", "Ironclad Defense", "Helix Alerts", 6100, "2025-03-01", "2027-03-01", "Active"],
      ["S-5003", "Quanta Robotics", "Helix Core", 21600, "2025-08-15", "2026-08-15", "Active"],
      ["S-5004", "Quanta Robotics", "Helix Lineage", 4900, "2026-02-01", "2027-02-01", "Active"],
      ["S-5005", "Kestrel Bank", "Helix Core", 19800, "2025-11-01", "2026-11-01", "Active"],
      ["S-5006", "Bluefin Energy", "Helix Core", 16400, "2025-09-12", "2026-09-12", "Active"],
      ["S-5007", "Northwind Logistics", "Helix Core", 12200, "2024-06-01", "2027-06-01", "Active"],
      ["S-5008", "Verity Insurance", "Helix Core", 10800, "2024-09-01", "2026-09-01", "Active"],
      ["S-5009", "Atlas Manufacturing", "Helix Core", 9400, "2024-12-01", "2026-12-01", "Active"],
      ["S-5010", "Helios Retail Group", "Helix Core", 4800, "2025-05-10", "2026-05-10", "Active"],
      ["S-5011", "Helios Retail Group", "Helix Alerts", 900, "2025-05-10", "2026-05-10", "Active"],
      ["S-5012", "Marigold Foods", "Helix Core", 4500, "2025-07-01", "2026-07-01", "Active"],
      ["S-5013", "Pinecrest Health", "Helix Core", 5150, "2025-04-15", "2026-04-15", "Canceled"],
      ["S-5014", "Sable Media", "Helix Core", 3200, "2025-05-22", "2026-05-22", "Canceled"],
      ["S-5015", "Cobalt Travel", "Helix Core", 3500, "2025-06-10", "2026-06-10", "Canceled"],
      ["S-5016", "Brightline Therapeutics", "Helix Lineage", 1200, "2026-03-04", "2027-03-04", "Active"],
    ],
  },
  {
    id: "pipeline",
    name: "Pipeline",
    color: "#f4b400",
    columns: ["Opp ID", "Account", "Segment", "Stage", "ACV (USD)", "Days in Stage", "Close Date"],
    rows: [
      ["O-7401", "Foxglove Analytics", "Mid-Market", "Proof of Value", 62000, 18, "2026-08-22"],
      ["O-7402", "Tinderbox Apps", "Mid-Market", "Discovery", 41000, 24, "2026-09-10"],
      ["O-7403", "Halcyon Learning", "Mid-Market", "Proposal", 58000, 12, "2026-07-30"],
      ["O-7404", "Mercer Robotics", "Mid-Market", "Negotiation", 74000, 9, "2026-07-18"],
      ["O-7405", "Cobalt Travel", "Mid-Market", "Closed Lost", 36000, 0, "2026-06-12"],
      ["O-7406", "Ironclad Defense", "Enterprise", "Closed Won", 152000, 0, "2026-06-28"],
      ["O-7407", "Quanta Robotics", "Enterprise", "Proposal", 218000, 21, "2026-08-15"],
      ["O-7408", "Kestrel Bank", "Enterprise", "Negotiation", 184000, 14, "2026-07-25"],
      ["O-7409", "Bluefin Energy", "Enterprise", "Discovery", 96000, 33, "2026-09-30"],
      ["O-7410", "Verity Insurance", "Enterprise", "Qualify", 124000, 28, "2026-10-12"],
      ["O-7411", "Atlas Manufacturing", "Enterprise", "Prospect", 88000, 11, "2026-11-04"],
      ["O-7412", "Pinecrest Health", "Mid-Market", "Closed Lost", 48000, 0, "2026-05-18"],
    ],
  },
  {
    id: "kpis",
    name: "KPIs",
    color: "#db4437",
    columns: ["Metric", "Q1 2026", "Q2 2026 (Actual)", "Q2 2026 (Target)", "Owner"],
    rows: [
      ["Net new ARR (USD)", 7800000, 7600000, 9500000, "RevOps"],
      ["Mid-Market gross churn", "6.8%", "11.2%", "≤ 8%", "CS"],
      ["Enterprise gross churn", "2.1%", "2.4%", "≤ 3%", "CS"],
      ["Lineage attach rate", "21%", "18%", "35%", "Product"],
      ["Pipeline coverage", "3.2x", "3.4x", "≥ 3x", "Sales"],
      ["New-logo Mid-Market count", 42, 33, 52, "Sales"],
      ["Avg sales cycle (weeks)", 8, 11, "≤ 9", "Sales"],
      ["NRR", "116%", "108%", "≥ 115%", "CS"],
      ["GRR", "93.2%", "89.4%", "≥ 92%", "CS"],
      ["Support CSAT", "92%", "93%", "≥ 92%", "Support"],
    ],
  },
];

export default function SheetsApp() {
  const [activeSheetId, setActiveSheetId] = useState<string>(SHEETS[0].id);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number }>({ row: 0, col: 0 });

  const activeSheet = useMemo(
    () => SHEETS.find((s) => s.id === activeSheetId) ?? SHEETS[0],
    [activeSheetId],
  );

  const selectedValue = activeSheet.rows[selectedCell.row]?.[selectedCell.col];
  const cellRef = `${colLetter(selectedCell.col)}${selectedCell.row + 2}`;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white text-[#202124]">
      {/* Title row + menus (Sheets-style) */}
      <div className="flex items-center gap-3 px-3 pt-2 pb-1 border-b border-[#dadce0] flex-shrink-0">
        <div className="w-7 h-7 rounded-md bg-[#0E7C7B] flex items-center justify-center text-white text-[12px] font-semibold">
          ▦
        </div>
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[#202124] font-medium">Helix Cloud RevOps Workbook</span>
            <span className="text-[11px] text-[#5f6368]">★</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#5f6368]">
            <span className="hover:text-[#202124] cursor-default">File</span>
            <span className="hover:text-[#202124] cursor-default">Edit</span>
            <span className="hover:text-[#202124] cursor-default">View</span>
            <span className="hover:text-[#202124] cursor-default">Insert</span>
            <span className="hover:text-[#202124] cursor-default">Format</span>
            <span className="hover:text-[#202124] cursor-default">Data</span>
            <span className="hover:text-[#202124] cursor-default">Tools</span>
            <span className="hover:text-[#202124] cursor-default">Help</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-[#dadce0] bg-[#f9fbfd] flex-shrink-0">
        <ToolBtn title="Undo">
          <path d="M7 7H4V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 7C4 7 5.5 3 10 3C14.5 3 16 6.5 16 8.5C16 10.5 14.5 13 10 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </ToolBtn>
        <ToolBtn title="Redo">
          <path d="M13 7H16V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 7C16 7 14.5 3 10 3C5.5 3 4 6.5 4 8.5C4 10.5 5.5 13 10 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </ToolBtn>

        <div className="w-px h-5 bg-[#dadce0] mx-1" />

        <span className="text-[11px] text-[#444] px-2 py-1 rounded hover:bg-[#e8eaed] cursor-default">100%</span>

        <div className="w-px h-5 bg-[#dadce0] mx-1" />

        <ToolBtn title="Currency">
          <text x="5" y="13" fill="currentColor" fontSize="12" fontFamily="Arial">$</text>
        </ToolBtn>
        <ToolBtn title="Percent">
          <text x="3" y="13" fill="currentColor" fontSize="12" fontFamily="Arial">%</text>
        </ToolBtn>
        <ToolBtn title="Decrease decimal">
          <text x="2" y="13" fill="currentColor" fontSize="11" fontFamily="Arial">.0</text>
        </ToolBtn>
        <ToolBtn title="Increase decimal">
          <text x="2" y="13" fill="currentColor" fontSize="11" fontFamily="Arial">.00</text>
        </ToolBtn>

        <div className="w-px h-5 bg-[#dadce0] mx-1" />

        <div className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#e8eaed] cursor-default min-w-[88px]">
          <span className="text-[11px] text-[#444]">Default</span>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-[#444] ml-auto">
            <path d="M2 3L4 5L6 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>

        <div className="w-px h-5 bg-[#dadce0] mx-1" />

        <span className="text-[11px] text-[#444] px-2 py-1 rounded hover:bg-[#e8eaed] cursor-default">10</span>

        <div className="w-px h-5 bg-[#dadce0] mx-1" />

        <ToolBtn title="Bold"><text x="5" y="14" fill="currentColor" fontSize="13" fontWeight="bold" fontFamily="Arial">B</text></ToolBtn>
        <ToolBtn title="Italic"><text x="6" y="14" fill="currentColor" fontSize="13" fontStyle="italic" fontFamily="Arial">I</text></ToolBtn>
        <ToolBtn title="Strikethrough"><text x="3" y="13" fill="currentColor" fontSize="13" fontFamily="Arial" textDecoration="line-through">S</text></ToolBtn>

        <div className="w-px h-5 bg-[#dadce0] mx-1" />

        <ToolBtn title="Fill color">
          <path d="M5 4l5 5-3 3-5-5z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
          <rect x="3" y="15" width="12" height="2.5" fill="#0f9d58" rx="0.5" />
        </ToolBtn>
        <ToolBtn title="Borders">
          <rect x="3" y="3" width="12" height="12" stroke="currentColor" strokeWidth="1.2" fill="none" />
          <line x1="9" y1="3" x2="9" y2="15" stroke="currentColor" strokeWidth="1.2" />
          <line x1="3" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="1.2" />
        </ToolBtn>

        <div className="flex-1" />

        <ToolBtn title="Filter">
          <path d="M3 4h12l-5 6v4l-2 1v-5L3 4z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
        </ToolBtn>
        <ToolBtn title="Chart">
          <rect x="3" y="10" width="2.5" height="5" fill="currentColor" />
          <rect x="7" y="6" width="2.5" height="9" fill="currentColor" />
          <rect x="11" y="3" width="2.5" height="12" fill="currentColor" />
        </ToolBtn>
      </div>

      {/* Formula bar */}
      <div className="flex items-center border-b border-[#dadce0] bg-white flex-shrink-0 text-[11px]">
        <div className="px-2 py-1 w-[68px] border-r border-[#dadce0] text-[#5f6368] font-medium">
          {cellRef}
        </div>
        <div className="px-2 py-1 border-r border-[#dadce0] text-[#5f6368]">fx</div>
        <div className="px-2 py-1 flex-1 text-[#202124] truncate">
          {selectedValue !== undefined ? String(selectedValue) : ""}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0 overflow-auto bg-white">
        <table className="border-collapse text-[12px]" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 bg-[#f8f9fa] border-r border-b border-[#dadce0] text-[#5f6368] font-normal w-[44px] h-[22px]" />
              {activeSheet.columns.map((_, idx) => (
                <th
                  key={idx}
                  className="sticky top-0 z-10 bg-[#f8f9fa] border-r border-b border-[#dadce0] text-[#5f6368] font-normal h-[22px] text-center"
                  style={{ width: 160 }}
                >
                  {colLetter(idx)}
                </th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 z-10 bg-[#f8f9fa] border-r border-b border-[#dadce0] text-[#5f6368] font-normal text-center h-[26px]">
                1
              </th>
              {activeSheet.columns.map((header, idx) => (
                <td
                  key={idx}
                  className="border-r border-b border-[#dadce0] px-2 h-[26px] font-semibold text-[#202124] bg-white"
                >
                  {header}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeSheet.rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <th className="sticky left-0 z-10 bg-[#f8f9fa] border-r border-b border-[#dadce0] text-[#5f6368] font-normal text-center h-[26px]">
                  {rowIdx + 2}
                </th>
                {row.map((cell, colIdx) => {
                  const isSelected =
                    selectedCell.row === rowIdx && selectedCell.col === colIdx;
                  const isNumber = typeof cell === "number";
                  return (
                    <td
                      key={colIdx}
                      onClick={() => setSelectedCell({ row: rowIdx, col: colIdx })}
                      className={`border-r border-b border-[#dadce0] px-2 h-[26px] cursor-cell truncate ${
                        isNumber ? "text-right tabular-nums" : "text-left"
                      } ${
                        isSelected
                          ? "outline outline-2 outline-[#1a73e8] -outline-offset-2 bg-[#e8f0fe]"
                          : "bg-white hover:bg-[#f1f3f4]"
                      }`}
                    >
                      {formatCell(cell)}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* trailing empty rows for spreadsheet feel */}
            {Array.from({ length: 14 }).map((_, idx) => (
              <tr key={`empty-${idx}`}>
                <th className="sticky left-0 z-10 bg-[#f8f9fa] border-r border-b border-[#dadce0] text-[#5f6368] font-normal text-center h-[26px]">
                  {activeSheet.rows.length + 2 + idx}
                </th>
                {activeSheet.columns.map((_, colIdx) => (
                  <td
                    key={colIdx}
                    className="border-r border-b border-[#dadce0] h-[26px] bg-white"
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sheet tabs */}
      <div className="flex items-center gap-1 px-2 py-1 border-t border-[#dadce0] bg-[#f8f9fa] flex-shrink-0 overflow-x-auto">
        <button
          title="Add sheet"
          className="w-6 h-6 rounded hover:bg-[#e8eaed] text-[#5f6368] flex items-center justify-center"
        >
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
            <path d="M9 4v10M4 9h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <button
          title="All sheets"
          className="w-6 h-6 rounded hover:bg-[#e8eaed] text-[#5f6368] flex items-center justify-center"
        >
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
            <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>

        <div className="w-px h-5 bg-[#dadce0] mx-1" />

        {SHEETS.map((sheet) => {
          const isActive = sheet.id === activeSheetId;
          return (
            <button
              key={sheet.id}
              onClick={() => {
                setActiveSheetId(sheet.id);
                setSelectedCell({ row: 0, col: 0 });
              }}
              className={`flex items-center gap-1.5 px-3 h-7 rounded-t-md text-[12px] border-t border-l border-r whitespace-nowrap ${
                isActive
                  ? "bg-white border-[#dadce0] text-[#202124] font-medium -mb-px"
                  : "bg-transparent border-transparent text-[#5f6368] hover:bg-[#e8eaed]"
              }`}
              style={isActive ? { boxShadow: `inset 0 -2px 0 0 ${sheet.color}` } : undefined}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: sheet.color }}
              />
              {sheet.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function colLetter(idx: number): string {
  let n = idx;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function formatCell(value: string | number): string {
  if (typeof value === "number") {
    return value.toLocaleString("en-US");
  }
  return value;
}

function ToolBtn({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <button
      title={title}
      className="w-7 h-7 rounded flex items-center justify-center text-[#444] hover:bg-[#e8eaed] transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        {children}
      </svg>
    </button>
  );
}
