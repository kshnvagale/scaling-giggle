#!/usr/bin/env node
/**
 * List available personas for interviews.
 * Shows name, role, and opening line — but NOT private knowledge.
 */
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("/work/course-package.json", "utf-8"));
const task = pkg.modules[0].tasks[0];
const linked = pkg.personas.filter(p => task.linkedPersonaIds.includes(p.id));

console.log(`=== AVAILABLE CONTACTS (${linked.length}) ===`);
linked.forEach((p, i) => {
  console.log(`\n  ${i + 1}. ${p.name}`);
  console.log(`     ID:   ${p.id}`);
  console.log(`     Role: ${p.role}`);
  console.log(`     Bio:  ${p.backstory.split(".")[0]}.`);
});

const log = { ts: new Date().toISOString(), action: "list_personas", count: linked.length, ids: linked.map(p => p.id) };
fs.appendFileSync("/work/solver-log.jsonl", JSON.stringify(log) + "\n");
