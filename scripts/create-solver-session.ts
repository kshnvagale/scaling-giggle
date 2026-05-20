#!/usr/bin/env tsx
/**
 * Create a solver agent session with the CoursePackage + solver toolkit uploaded.
 *
 * Usage:
 *   npx tsx scripts/create-solver-session.ts <agent-id>
 *
 * Creates the session, uploads all files, and prints the session ID + first message to send.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createReadStream, existsSync } from "node:fs";
import { resolve } from "node:path";
import "dotenv/config";

const BETA = "managed-agents-2026-04-01";

const API_KEY = process.env.ANTHROPIC_API_KEY;
const AGENT_ID = process.argv[2];
const ENV_ID = process.env.COURSEFORGE_ENVIRONMENT_ID;

if (!API_KEY) {
  console.error("✗ ANTHROPIC_API_KEY not set");
  process.exit(1);
}
if (!AGENT_ID) {
  console.error("Usage: npx tsx scripts/create-solver-session.ts <solver-agent-id>");
  console.error("Create 3 solver agents (haiku, sonnet, opus) in the Managed Agents UI first.");
  process.exit(1);
}
if (!ENV_ID) {
  console.error("✗ COURSEFORGE_ENVIRONMENT_ID not set in .env");
  process.exit(1);
}

// Write API key to a temp file for upload
import { writeFileSync, unlinkSync } from "node:fs";
const apiKeyTmpPath = resolve(".api-key-tmp.txt");
writeFileSync(apiKeyTmpPath, API_KEY!);

// Files to upload: [local path, container mount path]
const FILES = [
  [apiKeyTmpPath, "/work/api-key.txt"],
  ["packages/phase6_package.json", "/work/course-package.json"],
  ["scripts/solver/setup.js", "/work/solver/setup.js"],
  ["scripts/solver/read-brief.js", "/work/solver/read-brief.js"],
  ["scripts/solver/list-wiki.js", "/work/solver/list-wiki.js"],
  ["scripts/solver/read-wiki.js", "/work/solver/read-wiki.js"],
  ["scripts/solver/list-personas.js", "/work/solver/list-personas.js"],
  ["scripts/solver/interview.js", "/work/solver/interview.js"],
  ["scripts/solver/submit.js", "/work/solver/submit.js"],
];

for (const [local] of FILES) {
  if (!existsSync(resolve(local))) {
    console.error(`✗ missing: ${local}`);
    process.exit(1);
  }
}

const client = new Anthropic({ apiKey: API_KEY });

async function main() {
  console.log(`→ uploading ${FILES.length} files…`);
  const resources: Array<{ type: "file"; file_id: string; mount_path: string }> = [];

  for (const [local, mount] of FILES) {
    process.stdout.write(`  ${local} → ${mount} … `);
    const file = await client.beta.files.upload(
      { file: createReadStream(resolve(local)) },
      { betas: [BETA] },
    );
    console.log(`✓ ${file.id}`);
    resources.push({ type: "file", file_id: file.id, mount_path: mount });
  }

  console.log(`\n→ creating session on agent ${AGENT_ID}…`);
  const session = await client.beta.sessions.create(
    {
      agent: AGENT_ID,
      environment_id: ENV_ID!,
      title: `Solver — ${new Date().toISOString().split("T")[0]}`,
      resources,
    },
    { betas: [BETA] },
  );

  // Clean up temp api key file
  try { unlinkSync(apiKeyTmpPath); } catch {}

  console.log(`  ✓ session: ${session.id}`);
  console.log(`\n✓ Done. Open the session in the UI and send:\n`);
  console.log(`    Run \`node /work/solver/setup.js\` to verify the environment, then begin solving the task.\n`);
}

main().catch((err) => {
  console.error("\n✗ failed:", err?.error ?? err);
  process.exit(1);
});
