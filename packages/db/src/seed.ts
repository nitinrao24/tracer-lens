import { estimateCost } from "@tracerlens/sdk";
import { insertSpan } from "./queries";
import { sql } from "./client";

const MODELS = [
  { provider: "anthropic", model: "claude-sonnet-4-20250514" },
  { provider: "anthropic", model: "claude-3-5-haiku-20241022" },
  { provider: "openai", model: "gpt-4o-2024-11-20" },
  { provider: "openai", model: "gpt-4o-mini-2024-07-18" }
];
const PROMPTS = ["classify-ticket", "summarize-doc", "extract-entities", "chat-reply", "rerank"];

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randId = (n: number) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");

async function seed() {
  const count = Number(process.argv[2] ?? 1500);
  console.log(`seeding ${count} spans...`);
  for (let i = 0; i < count; i++) {
    const m = MODELS[rand(0, MODELS.length - 1)];
    const prompt = PROMPTS[rand(0, PROMPTS.length - 1)];
    const input = rand(200, 4000);
    const output = rand(50, 1200);
    const created = new Date(Date.now() - rand(0, 29) * 86400000 - rand(0, 86400) * 1000);
    await insertSpan({
      traceId: randId(32),
      spanId: randId(16),
      provider: m.provider,
      model: m.model,
      operation: m.provider === "openai" ? "chat.completions.create" : "messages.create",
      inputTokens: input,
      outputTokens: output,
      totalTokens: input + output,
      costUsd: estimateCost(m.model, input, output),
      latencyMs: rand(300, 5200),
      status: Math.random() < 0.02 ? "error" : "ok",
      promptName: prompt,
      startTime: created.toISOString()
    });
  }
  await sql.end();
  console.log("seed complete");
}

seed().catch((err) => { console.error(err); process.exit(1); });
