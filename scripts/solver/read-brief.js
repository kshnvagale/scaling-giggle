#!/usr/bin/env node
/**
 * Print the task brief (what the learner sees). Does NOT show the rubric.
 */
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("/work/course-package.json", "utf-8"));
const task = pkg.modules[0].tasks[0];

console.log("=== TASK BRIEF ===");
console.log(`Title: ${task.title}`);
console.log(`Duration: ~${task.durationMinutes} minutes`);
console.log(`Deliverable type: ${task.deliverable.type}`);
console.log(`Deliverable format: ${task.deliverable.format}`);
console.log("");
console.log(task.brief);
console.log("");
console.log("=== DELIVERABLE REQUIREMENTS ===");
console.log(task.deliverable.acceptanceSummary);

// Log
const log = { ts: new Date().toISOString(), action: "read_brief", task_id: task.id, task_title: task.title };
fs.appendFileSync("/work/solver-log.jsonl", JSON.stringify(log) + "\n");
