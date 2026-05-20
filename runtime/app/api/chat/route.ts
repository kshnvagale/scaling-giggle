import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      personaSystemPrompt,
      privateKnowledge,
      worldContext,
      messages: requestMessages,
    } = body as {
      personaSystemPrompt: string;
      privateKnowledge: string[];
      worldContext: string;
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Build composite system prompt
    const slackVoice = `

CRITICAL COMMUNICATION RULES — you are chatting on Slack, not writing an email:
- Write SHORT messages. 1-3 sentences max per message. Break longer thoughts into multiple short lines.
- Be conversational and casual. Use contractions (I'm, don't, we've, that's).
- NEVER use em dashes (—). Use periods or line breaks instead.
- NEVER write big paragraph blocks. If you have a lot to say, use short separate lines.
- Use "lol", "haha", "yeah", "nah", "tbh", "btw" occasionally — you're a real person on Slack.
- Use emoji sparingly but naturally (one per 3-4 messages).
- Ask follow-up questions to keep the conversation going.
- Don't over-explain. Let the learner ask for more detail.
- It's okay to say "hmm let me think" or "good question" before answering.
- Type like you're texting a coworker, not writing a report.`;

    const systemPrompt = [
      personaSystemPrompt,
      slackVoice,
      "\n\nPrivate knowledge you have (share naturally when asked the right questions):\n" +
        privateKnowledge.join("\n"),
      "\n\nWorld context about the company:\n" + worldContext,
    ].join("");

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: requestMessages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ reply: text });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
