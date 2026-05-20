#!/usr/bin/env tsx
/**
 * Create a Managed Agents session on CourseForge Author with the four required
 * files mounted at their expected paths.
 *
 * Behavior:
 *   1. Discover an environment (either $COURSEFORGE_ENVIRONMENT_ID or the first
 *      listed environment on the account).
 *   2. Upload each local file via the Files API → file_id.
 *   3. Create a new session on $COURSEFORGE_AGENT_ID with all files attached
 *      as resources at the right mount paths in one call.
 *   4. Print the session ID and the exact first message to send.
 *
 * Usage:
 *   npm run upload
 */

import Anthropic from "@anthropic-ai/sdk";
import { createReadStream, existsSync } from "node:fs";
import { resolve } from "node:path";
import "dotenv/config";

const BETA = "managed-agents-2026-04-01";

const API_KEY = process.env.ANTHROPIC_API_KEY;
const AGENT_ID = process.env.COURSEFORGE_AGENT_ID;
const ENV_ID_OVERRIDE = process.env.COURSEFORGE_ENVIRONMENT_ID;

if (!API_KEY) {
  console.error("✗ ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}
if (!AGENT_ID) {
  console.error("✗ COURSEFORGE_AGENT_ID is not set in .env");
  process.exit(1);
}

const FILES: Array<{ local: string; mount: string }> = [
  {
    local: "Virtusa_fde_curriculum - PDT Copy.docx.md",
    mount: "/work/input/curriculum.md",
  },
  { local: "schema/course_package.ts", mount: "/work/schema/course_package.ts" },
  { local: "schema/validate.ts", mount: "/work/schema/validate.ts" },
  { local: "schema/package.json", mount: "/work/schema/package.json" },
];

for (const { local } of FILES) {
  if (!existsSync(resolve(local))) {
    console.error(`✗ missing local file: ${local}`);
    process.exit(1);
  }
}

const client = new Anthropic({ apiKey: API_KEY });

async function resolveEnvironmentId(): Promise<string> {
  if (ENV_ID_OVERRIDE) {
    console.log(`→ using environment from .env: ${ENV_ID_OVERRIDE}`);
    return ENV_ID_OVERRIDE;
  }
  console.log(`→ discovering environments on account…`);
  const page = await client.beta.environments.list({ betas: [BETA] });
  const envs = page.data ?? [];
  if (envs.length === 0) {
    console.error(
      "\n✗ no environments found on this account.\n" +
        "  Create one in the Managed Agents UI (Environments tab), then either:\n" +
        "    - re-run this script (it'll pick up the first one), or\n" +
        "    - set COURSEFORGE_ENVIRONMENT_ID=env_... in .env to pin a specific one.\n",
    );
    process.exit(1);
  }
  const first = envs[0]!;
  console.log(`  ✓ found ${envs.length} environment(s); using: ${first.id} (${(first as any).name ?? "unnamed"})`);
  return first.id;
}

async function main() {
  const environmentId = await resolveEnvironmentId();

  console.log(`\n→ uploading ${FILES.length} files via Files API…`);
  const uploaded: Array<{ file_id: string; mount: string; local: string }> = [];
  for (const { local, mount } of FILES) {
    const abs = resolve(local);
    process.stdout.write(`  ${local} … `);
    const file = await client.beta.files.upload(
      { file: createReadStream(abs) },
      { betas: [BETA] },
    );
    console.log(`✓ ${file.id}`);
    uploaded.push({ file_id: file.id, mount, local });
  }

  console.log(`\n→ creating session on agent ${AGENT_ID}…`);
  const session = await client.beta.sessions.create(
    {
      agent: AGENT_ID!,
      environment_id: environmentId,
      title: "CourseForge — Virtusa M1.T1",
      resources: uploaded.map(({ file_id, mount }) => ({
        type: "file" as const,
        file_id,
        mount_path: mount,
      })),
    },
    { betas: [BETA] },
  );

  console.log(`  ✓ session: ${session.id}`);
  console.log(`  ✓ status:  ${session.status}`);

  console.log(`\n✓ done. open the session in the Managed Agents UI:`);
  console.log(`    ${session.id}`);
  console.log(`\nSend this as the first user message:\n`);
  console.log(`    input=/work/input/curriculum.md`);
  console.log(`    schema=/work/schema/course_package.ts`);
  console.log(`    scope=M1.T1`);
  console.log(`\n    Begin Phase 1.\n`);
}

main().catch((err) => {
  console.error("\n✗ upload failed:");
  console.error(err?.error ?? err);
  process.exit(1);
});
