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
    id: "customers",
    name: "Customers",
    color: "#1a73e8",
    columns: ["ID", "Account", "Region", "Plan", "MRR (USD)", "Status"],
    rows: [
      ["C-1042", "Northwind Logistics", "NA-East", "Enterprise", 18400, "Active"],
      ["C-1043", "Helios Retail Group", "EU-West", "Growth", 6200, "Active"],
      ["C-1044", "Kestrel Bank", "NA-West", "Enterprise", 24800, "Active"],
      ["C-1045", "Pinecrest Health", "NA-East", "Growth", 5400, "At risk"],
      ["C-1046", "Bluefin Energy", "APAC", "Enterprise", 19200, "Active"],
      ["C-1047", "Atlas Manufacturing", "EU-Central", "Growth", 7100, "Active"],
      ["C-1048", "Sable Media", "NA-East", "Starter", 1200, "Churned"],
      ["C-1049", "Verity Insurance", "NA-West", "Enterprise", 22600, "Active"],
      ["C-1050", "Marigold Foods", "EU-West", "Growth", 4900, "Active"],
      ["C-1051", "Quanta Robotics", "APAC", "Enterprise", 26100, "Active"],
      ["C-1052", "Ironclad Defense", "NA-East", "Enterprise", 31200, "Active"],
      ["C-1053", "Cobalt Travel", "EU-West", "Starter", 980, "At risk"],
    ],
  },
  {
    id: "transactions",
    name: "Transactions",
    color: "#0f9d58",
    columns: ["Txn ID", "Date", "Account", "Amount (USD)", "Type", "Channel"],
    rows: [
      ["T-9821", "2026-05-01", "Northwind Logistics", 18400, "Subscription", "Direct"],
      ["T-9822", "2026-05-02", "Helios Retail Group", 6200, "Subscription", "Partner"],
      ["T-9823", "2026-05-03", "Kestrel Bank", 24800, "Subscription", "Direct"],
      ["T-9824", "2026-05-03", "Pinecrest Health", 5400, "Subscription", "Direct"],
      ["T-9825", "2026-05-05", "Bluefin Energy", 19200, "Subscription", "Partner"],
      ["T-9826", "2026-05-06", "Atlas Manufacturing", 7100, "Subscription", "Direct"],
      ["T-9827", "2026-05-08", "Verity Insurance", 22600, "Subscription", "Direct"],
      ["T-9828", "2026-05-10", "Marigold Foods", 4900, "Subscription", "Partner"],
      ["T-9829", "2026-05-11", "Quanta Robotics", 26100, "Subscription", "Direct"],
      ["T-9830", "2026-05-12", "Ironclad Defense", 31200, "Subscription", "Direct"],
      ["T-9831", "2026-05-14", "Northwind Logistics", 1800, "Add-on", "Direct"],
      ["T-9832", "2026-05-15", "Kestrel Bank", 4200, "Add-on", "Direct"],
    ],
  },
  {
    id: "inventory",
    name: "Inventory",
    color: "#f4b400",
    columns: ["SKU", "Product", "Warehouse", "On hand", "Reserved", "Reorder at"],
    rows: [
      ["SKU-A100", "Sensor Module v3", "WH-Austin", 1240, 320, 500],
      ["SKU-A101", "Sensor Module v4", "WH-Austin", 480, 120, 400],
      ["SKU-B200", "Edge Gateway", "WH-Reno", 92, 40, 100],
      ["SKU-B201", "Edge Gateway Pro", "WH-Reno", 36, 18, 60],
      ["SKU-C300", "Battery Pack 12V", "WH-Singapore", 2100, 540, 800],
      ["SKU-C301", "Battery Pack 24V", "WH-Singapore", 780, 200, 600],
      ["SKU-D400", "Cable Harness A", "WH-Rotterdam", 5400, 1200, 2500],
      ["SKU-D401", "Cable Harness B", "WH-Rotterdam", 3200, 900, 2000],
      ["SKU-E500", "Display Panel 7\"", "WH-Austin", 410, 110, 250],
      ["SKU-E501", "Display Panel 10\"", "WH-Austin", 220, 80, 200],
      ["SKU-F600", "Enclosure IP65", "WH-Reno", 670, 200, 400],
      ["SKU-F601", "Enclosure IP67", "WH-Reno", 145, 60, 200],
    ],
  },
  {
    id: "kpis",
    name: "KPIs",
    color: "#db4437",
    columns: ["Metric", "Q1 2026", "Q2 2026 (MTD)", "Target", "Owner"],
    rows: [
      ["MRR (USD)", 168200, 187300, 200000, "Finance"],
      ["New logos", 14, 9, 18, "Sales"],
      ["Churned logos", 3, 2, "≤ 4", "CS"],
      ["Gross retention", "94.1%", "94.8%", "≥ 95%", "CS"],
      ["NRR", "112%", "118%", "≥ 115%", "CS"],
      ["CAC payback (mo)", 14, 12, "≤ 12", "Finance"],
      ["Pipeline coverage", "3.1x", "3.6x", "≥ 3x", "Sales"],
      ["P0 incidents", 1, 0, 0, "Platform"],
      ["NPS", 42, 47, "≥ 45", "Product"],
      ["Support CSAT", "91%", "93%", "≥ 92%", "Support"],
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
        <div className="w-7 h-7 rounded-md bg-[#0f9d58] flex items-center justify-center text-white text-[12px] font-semibold">
          ▦
        </div>
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[#202124] font-medium">Operations Workbook</span>
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
