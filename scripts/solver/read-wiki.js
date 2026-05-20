#!/usr/bin/env node
/**
 * Read a specific wiki page by slug.
 * Usage: node read-wiki.js <slug>
 */
const fs = require("fs");
const slug = process.argv[2];

if (!slug) {
  console.error("Usage: node read-wiki.js <slug>");
  console.error("Run list-wiki.js to see available slugs.");
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync("/work/course-package.json", "utf-8"));
const page = pkg.fixtures.wikiPages.find(p => p.slug === slug);

if (!page) {
  console.error(`Page not found: "${slug}"`);
  console.error("Available:", pkg.fixtures.wikiPages.map(p => p.slug).join(", "));
  process.exit(1);
}

console.log(`=== ${page.title} ===`);
console.log("");
console.log(page.body);

const log = { ts: new Date().toISOString(), action: "read_wiki", slug, title: page.title, chars: page.body.length };
fs.appendFileSync("/work/solver-log.jsonl", JSON.stringify(log) + "\n");
