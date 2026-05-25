"use client";

import type { NotebookOutput } from "@/lib/types";

// Loaded onto window by the Pyodide CDN script tag we inject.
type PyodideInterface = {
  runPythonAsync: (code: string) => Promise<unknown>;
  globals: { get: (name: string) => unknown };
  loadPackage: (pkgs: string[] | string) => Promise<void>;
  FS: {
    mkdirTree: (path: string) => void;
    writeFile: (path: string, data: Uint8Array | string) => void;
  };
};

declare global {
  interface Window {
    loadPyodide?: (opts?: { indexURL: string }) => Promise<PyodideInterface>;
  }
}

export interface PyodideKernel {
  ready: boolean;
  runCell: (source: string) => Promise<NotebookOutput[]>;
}

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PYODIDE_SCRIPT_SRC = `${PYODIDE_INDEX_URL}pyodide.js`;

let cachedBootPromise: Promise<PyodideKernel> | null = null;

export function bootPyodideKernel(csvUrl: string): Promise<PyodideKernel> {
  if (!cachedBootPromise) {
    cachedBootPromise = doBoot(csvUrl);
  }
  return cachedBootPromise;
}

async function doBoot(csvUrl: string): Promise<PyodideKernel> {
  await injectScript(PYODIDE_SCRIPT_SRC);
  if (!window.loadPyodide) {
    throw new Error("pyodide script loaded but window.loadPyodide is undefined");
  }
  const pyodide = await window.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
  await pyodide.loadPackage(["pandas", "matplotlib"]);

  // Force matplotlib to use the Agg backend so plt.show() doesn't try to open a window.
  await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import io, base64

_FIG_BUFFER = []

_original_show = plt.show
def _capture_show(*args, **kwargs):
    fig = plt.gcf()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=110, bbox_inches="tight")
    buf.seek(0)
    _FIG_BUFFER.append(base64.b64encode(buf.read()).decode("ascii"))
    plt.clf()
plt.show = _capture_show

import sys
class _StdoutCapture:
    def __init__(self): self.buf = []
    def write(self, s): self.buf.append(s)
    def flush(self): pass
class _StderrCapture(_StdoutCapture):
    pass

_STDOUT_CAPTURE = _StdoutCapture()
_STDERR_CAPTURE = _StderrCapture()
  `);

  // Mount the CSV.
  const csvBytes = await fetchCsv(csvUrl);
  pyodide.FS.mkdirTree("/data");
  pyodide.FS.writeFile("/data/netflix_titles.csv", csvBytes);

  return {
    ready: true,
    runCell: (source) => runCell(pyodide, source),
  };
}

async function runCell(pyodide: PyodideInterface, source: string): Promise<NotebookOutput[]> {
  const outputs: NotebookOutput[] = [];
  // Reset capture buffers
  await pyodide.runPythonAsync(`
_FIG_BUFFER.clear()
_STDOUT_CAPTURE.buf.clear()
_STDERR_CAPTURE.buf.clear()
import sys
sys.stdout = _STDOUT_CAPTURE
sys.stderr = _STDERR_CAPTURE
  `);

  let resultRepr: string | null = null;
  let errorText: string | null = null;
  try {
    const value = await pyodide.runPythonAsync(source);
    if (value !== undefined && value !== null) {
      try { resultRepr = String(value); } catch { resultRepr = null; }
    }
  } catch (err) {
    errorText = (err as Error).message ?? String(err);
  } finally {
    await pyodide.runPythonAsync(`
import sys
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
    `);
  }

  const stdoutText = String(await pyodide.runPythonAsync(`"".join(_STDOUT_CAPTURE.buf)`));
  const stderrText = String(await pyodide.runPythonAsync(`"".join(_STDERR_CAPTURE.buf)`));
  if (stdoutText) outputs.push({ type: "stdout", content: stdoutText });
  if (stderrText) outputs.push({ type: "stderr", content: stderrText });

  if (errorText) {
    outputs.push({ type: "error", content: errorText });
    return outputs;
  }

  // Captured figures
  const figCount = Number(await pyodide.runPythonAsync(`len(_FIG_BUFFER)`));
  for (let i = 0; i < figCount; i++) {
    const b64 = String(await pyodide.runPythonAsync(`_FIG_BUFFER[${i}]`));
    outputs.push({ type: "image", content: b64, mimeType: "image/png" });
  }

  if (resultRepr && resultRepr !== "None") {
    outputs.push({ type: "result", content: resultRepr });
  }
  return outputs;
}

async function fetchCsv(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to fetch ${url}: HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const tag = document.createElement("script");
    tag.src = src;
    tag.async = true;
    tag.onload = () => resolve();
    tag.onerror = () => reject(new Error(`failed to load script ${src}`));
    document.head.appendChild(tag);
  });
}
