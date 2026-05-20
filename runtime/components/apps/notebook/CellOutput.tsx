"use client";

import type { NotebookOutput } from "@/lib/types";

interface CellOutputProps {
  output: NotebookOutput;
}

export default function CellOutput({ output }: CellOutputProps) {
  switch (output.type) {
    case "stdout":
      return (
        <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-stone-700">
          {output.content}
        </pre>
      );
    case "stderr":
      return (
        <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-rose-700 bg-rose-50 rounded px-2 py-1">
          {output.content}
        </pre>
      );
    case "result":
      return (
        <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-stone-900">
          {output.content}
        </pre>
      );
    case "error":
      return (
        <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-rose-800 bg-rose-50 border border-rose-200 rounded px-2 py-1">
          {output.content}
        </pre>
      );
    case "image": {
      const src = output.content.startsWith("data:")
        ? output.content
        : `data:${output.mimeType ?? "image/png"};base64,${output.content}`;
      return (
        <img
          src={src}
          alt="cell output"
          className="max-w-full rounded border border-stone-200"
        />
      );
    }
    case "table": {
      const rows = output.content.trim().split("\n").map((r) => r.split(","));
      const [header, ...body] = rows;
      return (
        <div className="overflow-x-auto">
          <table className="text-[12.5px] border border-stone-200">
            <thead className="bg-stone-100">
              <tr>
                {header.map((h, i) => (
                  <th
                    key={i}
                    className="px-2 py-1 text-left font-medium text-stone-700 border-b border-stone-200"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri} className="border-b border-stone-100">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1 text-stone-800 font-mono">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    default:
      return null;
  }
}
