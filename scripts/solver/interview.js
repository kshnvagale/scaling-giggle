#!/usr/bin/env node
/**
 * Interview a persona. Multi-turn — remembers previous exchanges.
 * Usage: node interview.js <persona-id> "<your question>"
 *
 * The persona responds using Claude with their system prompt + private knowledge.
 * The solver agent NEVER sees the private knowledge directly.
 */
const fs = require("fs");
const path = require("path");

// Read API key from file if env var not set
if (!process.env.ANTHROPIC_API_KEY && fs.existsSync("/work/api-key.txt")) {
  process.env.ANTHROPIC_API_KEY = fs.readFileSync("/work/api-key.txt", "utf-8").trim();
}

const PERSONA_MODEL = "claude-haiku-4-5-20251001"; // cheap model for persona responses

async function main() {
  const personaId = process.argv[2];
  const question = process.argv.slice(3).join(" ");

  if (!personaId || !question) {
    console.error("Usage: node interview.js <persona-id> \"<your question>\"");
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync("/work/course-package.json", "utf-8"));
  const persona = pkg.personas.find(p => p.id === personaId);

  if (!persona) {
    console.error(`Persona not found: "${personaId}"`);
    console.error("Available:", pkg.personas.map(p => `${p.id} (${p.name})`).join(", "));
    process.exit(1);
  }

  // Load or init conversation history
  const historyPath = `/work/conversations/${personaId}.json`;
  let history = [];
  if (fs.existsSync(historyPath)) {
    history = JSON.parse(fs.readFileSync(historyPath, "utf-8"));
  }

  // If first message, prepend the persona's opening line
  if (history.length === 0) {
    history.push({ role: "assistant", content: persona.openingLine });
    console.log(`[${persona.name} joined the conversation]`);
    console.log(`${persona.name}: ${persona.openingLine}`);
    console.log("");
  }

  // Add the solver's question
  history.push({ role: "user", content: question });

  // Build the persona's system prompt (includes private knowledge — but the SOLVER never sees this)
  const slackVoice = `
You are chatting on Slack. Write SHORT messages (1-3 sentences). Be conversational and casual. Use contractions. NEVER use em dashes. Break longer thoughts into short lines. Use emoji sparingly. Ask follow-up questions naturally. Don't over-explain.`;

  const privateKnowledgeText = persona.privateKnowledge
    .map(k => `- ${k.value}`)
    .join("\n");

  const systemPrompt = [
    persona.systemPrompt,
    slackVoice,
    "\n\nPrivate knowledge (share naturally when asked the right questions):\n" + privateKnowledgeText,
    "\n\nWorld context:\n" + pkg.world.clientProfile,
  ].join("");

  // Call Claude as the persona
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: PERSONA_MODEL,
    max_tokens: 512,
    system: systemPrompt,
    messages: history,
  });

  const reply = response.content[0].type === "text" ? response.content[0].text : "[no response]";

  // Add reply to history
  history.push({ role: "assistant", content: reply });
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

  // Print the exchange
  console.log(`You: ${question}`);
  console.log("");
  console.log(`${persona.name}: ${reply}`);

  // Log
  const log = {
    ts: new Date().toISOString(),
    action: "interview",
    persona_id: personaId,
    persona_name: persona.name,
    question,
    reply,
    turn_number: Math.floor(history.length / 2),
  };
  fs.appendFileSync("/work/solver-log.jsonl", JSON.stringify(log) + "\n");
}

main().catch(err => {
  console.error("Interview failed:", err.message);
  process.exit(1);
});
