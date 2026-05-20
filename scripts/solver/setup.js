#!/usr/bin/env node
/**
 * Verify and prepare the solver environment.
 * - Finds uploaded files (may be at /work/ or /mnt/session/uploads/)
 * - Installs @anthropic-ai/sdk if missing
 * - Validates the course package
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ── Step 1: Find and fix file locations ──
// Files may land at /mnt/session/uploads/ instead of /work/
const EXPECTED_FILES = {
  "/work/course-package.json": ["course-package.json", "phase6_package.json"],
  "/work/api-key.txt": ["api-key.txt", ".api-key-tmp.txt"],
  "/work/solver/setup.js": ["setup.js"],
  "/work/solver/read-brief.js": ["read-brief.js"],
  "/work/solver/list-wiki.js": ["list-wiki.js"],
  "/work/solver/read-wiki.js": ["read-wiki.js"],
  "/work/solver/list-personas.js": ["list-personas.js"],
  "/work/solver/interview.js": ["interview.js"],
  "/work/solver/submit.js": ["submit.js"],
};

const UPLOAD_DIRS = ["/mnt/session/uploads", "/mnt/user", "/home/user/uploads"];

function findUploadedFile(names) {
  for (const dir of UPLOAD_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    for (const name of names) {
      const match = files.find(f => f === name || f.endsWith("_" + name) || f.includes(name));
      if (match) return path.join(dir, match);
    }
  }
  return null;
}

console.log("=== SETTING UP SOLVER ENVIRONMENT ===\n");

// Ensure /work/solver/ exists
fs.mkdirSync("/work/solver", { recursive: true });
fs.mkdirSync("/work/conversations", { recursive: true });

let fixedCount = 0;
for (const [expectedPath, names] of Object.entries(EXPECTED_FILES)) {
  if (fs.existsSync(expectedPath)) continue;

  const found = findUploadedFile(names);
  if (found) {
    // Copy to expected location
    fs.mkdirSync(path.dirname(expectedPath), { recursive: true });
    fs.copyFileSync(found, expectedPath);
    console.log(`  Fixed: ${path.basename(expectedPath)} (copied from ${found})`);
    fixedCount++;
  }
}
if (fixedCount > 0) console.log(`  Relocated ${fixedCount} file(s)\n`);

// ── Step 2: Install @anthropic-ai/sdk if missing ──
try {
  require.resolve("@anthropic-ai/sdk");
  console.log("  @anthropic-ai/sdk: installed");
} catch {
  console.log("  @anthropic-ai/sdk: not found, installing...");
  try {
    execSync("npm install --no-save @anthropic-ai/sdk 2>&1", {
      cwd: "/work",
      stdio: "pipe",
      timeout: 60000,
    });
    console.log("  @anthropic-ai/sdk: installed successfully");
  } catch (e) {
    console.error("  WARNING: Failed to install @anthropic-ai/sdk.");
    console.error("  Run manually: cd /work && npm install @anthropic-ai/sdk");
  }
}

// ── Step 3: Validate course package ──
const PKG_PATH = "/work/course-package.json";
if (!fs.existsSync(PKG_PATH)) {
  console.error("\nERROR: course-package.json not found at", PKG_PATH);
  console.error("Upload it to the container before starting.");
  process.exit(1);
}

// ── Step 4: Check API key ──
if (!process.env.ANTHROPIC_API_KEY && fs.existsSync("/work/api-key.txt")) {
  process.env.ANTHROPIC_API_KEY = fs.readFileSync("/work/api-key.txt", "utf-8").trim();
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("\nERROR: ANTHROPIC_API_KEY not set. Create /work/api-key.txt with your key.");
  process.exit(1);
}
console.log("  API key: found");

// ── Step 5: Print summary ──
const pkg = JSON.parse(fs.readFileSync(PKG_PATH, "utf-8"));
const task = pkg.modules?.[0]?.tasks?.[0];

if (!task) {
  console.error("\nERROR: No task found in course package.");
  process.exit(1);
}

// Initialize log
fs.writeFileSync("/work/solver-log.jsonl", "");

console.log(`\n=== SOLVER ENVIRONMENT READY ===`);
console.log(`Client:     ${pkg.meta.client}`);
console.log(`Industry:   ${pkg.meta.industry}`);
console.log(`Scope:      ${pkg.meta.scope}`);
console.log(`Task:       ${task.title}`);
console.log(`Personas:   ${pkg.personas.length}`);
console.log(`Wiki pages: ${pkg.fixtures.wikiPages.length}`);
console.log(`Datasets:   ${pkg.fixtures.datasets.length}`);
console.log(`Documents:  ${pkg.fixtures.documents.length}`);
console.log(`Emails:     ${pkg.fixtures.emails.length}`);
console.log(`================================`);
console.log(`\nReady. Begin with: node /work/solver/read-brief.js`);
