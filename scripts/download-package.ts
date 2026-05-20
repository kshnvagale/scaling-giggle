#!/usr/bin/env tsx
/**
 * Download all output files from a Managed Agent session.
 *
 * Usage:
 *   npm run download
 *   npm run download -- sesn_...
 */

import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, basename } from "node:path";
import "dotenv/config";

const BETA = "managed-agents-2026-04-01";

const API_KEY = process.env.ANTHROPIC_API_KEY;
const SESSION_ID = process.argv[2] || process.env.COURSEFORGE_SESSION_ID;

if (!API_KEY) {
  console.error("✗ ANTHROPIC_API_KEY not set");
  process.exit(1);
}
if (!SESSION_ID) {
  console.error("✗ Provide session ID as argument or set COURSEFORGE_SESSION_ID in .env");
  process.exit(1);
}

const client = new Anthropic({ apiKey: API_KEY });

async function main() {
  console.log(`→ listing files for session ${SESSION_ID}…`);

  // List files scoped to this session — requires beta header
  const files: any[] = [];
  try {
    for await (const f of client.beta.files.list({ scope_id: SESSION_ID!, betas: [BETA] })) {
      files.push(f);
    }
  } catch (e: any) {
    // If scope_id still fails, try listing all files and filtering
    console.log(`  scope_id filter failed, listing all files and filtering…`);
    for await (const f of client.beta.files.list({ betas: [BETA] })) {
      // Check if file is scoped to our session
      const scope = (f as any).scope;
      if (scope?.id === SESSION_ID || scope?.session_id === SESSION_ID) {
        files.push(f);
      }
      // Also grab by filename pattern
      const name = (f as any).filename ?? "";
      if (name.includes("phase6") || name.includes("courseforge") || name.includes("package")) {
        if (!files.find((x: any) => x.id === f.id)) {
          files.push(f);
        }
      }
    }
  }

  if (files.length === 0) {
    console.log("\n  no matching files found.");
    console.log("  trying session resources instead…\n");

    // Try session resources API
    try {
      const resources: any[] = [];
      for await (const r of client.beta.sessions.resources.list(SESSION_ID!, { betas: [BETA] })) {
        resources.push(r);
      }
      console.log(`  found ${resources.length} session resource(s):`);
      for (const r of resources) {
        console.log(`    - ${r.type}: ${(r as any).file_id ?? (r as any).mount_path ?? r.id}`);
        // Try to download file resources
        if (r.type === "file" && (r as any).file_id) {
          try {
            const resp = await client.beta.files.download((r as any).file_id, { betas: [BETA] });
            const buf = Buffer.from(await resp.arrayBuffer());
            const name = (r as any).mount_path?.split("/").pop() ?? `${(r as any).file_id}.bin`;
            const outPath = resolve("packages", name);
            mkdirSync(resolve("packages"), { recursive: true });
            writeFileSync(outPath, buf);
            console.log(`    ✓ saved to ${outPath}`);
          } catch (dlErr: any) {
            console.log(`    ✗ download failed: ${dlErr?.message ?? dlErr}`);
          }
        }
      }
      if (resources.length === 0) {
        console.log("  no resources found either.");
        console.log("\n  fallback: copy the JSON manually from the Managed Agents UI.");
        console.log("  paste it into: runtime/public/course-package.json");
      }
    } catch (resErr: any) {
      console.error(`  resources API failed: ${resErr?.error?.message ?? resErr?.message ?? resErr}`);
      console.log("\n  fallback: copy the JSON manually from the Managed Agents UI.");
      console.log("  paste it into: runtime/public/course-package.json");
    }
    return;
  }

  console.log(`  found ${files.length} file(s):`);

  // Create output directories
  const packagesDir = resolve("packages");
  const runtimePublic = resolve("runtime/public");
  mkdirSync(packagesDir, { recursive: true });

  for (const f of files) {
    const name = (f as any).filename || f.id;
    console.log(`\n→ downloading: ${name} (${f.id})`);

    try {
      const resp = await client.beta.files.download(f.id, { betas: [BETA] });
      const buf = Buffer.from(await resp.arrayBuffer());

      // Save to packages/ dir
      const outPath = resolve(packagesDir, basename(name));
      writeFileSync(outPath, buf);
      console.log(`  ✓ saved to ${outPath}`);

      // If it's the main package JSON, also copy to runtime/public/
      if (name.includes("package") && name.endsWith(".json")) {
        const runtimePath = resolve(runtimePublic, "course-package.json");
        writeFileSync(runtimePath, buf);
        console.log(`  ✓ also saved to ${runtimePath}`);
      }
    } catch (err: any) {
      console.error(`  ✗ failed to download ${name}: ${err?.message ?? err}`);
    }
  }

  console.log(`\n✓ done.`);
}

main().catch((err) => {
  console.error("\n✗ failed:", err?.error ?? err);
  process.exit(1);
});
