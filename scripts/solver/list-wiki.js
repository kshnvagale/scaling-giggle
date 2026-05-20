#!/usr/bin/env node
/**
 * List all available wiki pages.
 */
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("/work/course-package.json", "utf-8"));
const pages = pkg.fixtures.wikiPages;

console.log(`=== WIKI PAGES (${pages.length} available) ===`);
pages.forEach((p, i) => {
  console.log(`  ${i + 1}. [${p.slug}] ${p.title} (${p.body.length} chars)`);
});

const log = { ts: new Date().toISOString(), action: "list_wiki", page_count: pages.length };
fs.appendFileSync("/work/solver-log.jsonl", JSON.stringify(log) + "\n");
