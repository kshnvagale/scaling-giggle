#!/usr/bin/env tsx
/**
 * Usage: npx tsx schema/validate.ts <path-to-package.json>
 *
 * Exit codes:
 *   0 — valid
 *   1 — invalid (schema errors printed)
 *   2 — usage / read error
 */

import { readFileSync } from "node:fs";
import { CoursePackage } from "./course_package.js";

const [, , path] = process.argv;
if (!path) {
  console.error("usage: tsx schema/validate.ts <path-to-package.json>");
  process.exit(2);
}

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(path, "utf-8"));
} catch (e) {
  console.error(`failed to read/parse ${path}: ${(e as Error).message}`);
  process.exit(2);
}

const result = CoursePackage.safeParse(raw);

if (!result.success) {
  console.error(`VALIDATION FAILED — ${path}`);
  for (const issue of result.error.issues) {
    const loc = issue.path.length ? issue.path.join(".") : "<root>";
    console.error(`  ${loc}: ${issue.message}`);
  }
  process.exit(1);
}

const pkg = result.data;
const taskCount = pkg.modules.reduce((n, m) => n + m.tasks.length, 0);

console.log(`OK — ${path}`);
console.log(`  client:    ${pkg.meta.client}`);
console.log(`  scope:     ${pkg.meta.scope}`);
console.log(`  version:   ${pkg.meta.version}`);
console.log(`  modules:   ${pkg.modules.length}`);
console.log(`  tasks:     ${taskCount}`);
console.log(`  personas:  ${pkg.personas.length}`);
console.log(`  glossary:  ${pkg.world.glossary.length}`);
console.log(`  systems:   ${pkg.world.systems.length}`);
console.log(`  wiki:      ${pkg.fixtures.wikiPages.length}`);
console.log(`  datasets:  ${pkg.fixtures.datasets.length}`);
console.log(`  documents: ${pkg.fixtures.documents.length}`);
console.log(`  emails:    ${pkg.fixtures.emails.length}`);
process.exit(0);
