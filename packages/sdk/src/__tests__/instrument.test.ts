import { describe, it, expect, beforeEach } from "vitest";
import { instrumentAnthropic } from "../instrument";
import { addSink, clearSinks } from "../sinks";
import type { LLMSpanRecord } from "../types";

function fakeAnthropic() {
  return {
    messages: {
      create: async (_params: any) => ({
        model: "claude-sonnet-4-20250514",
        usage: { input_tokens: 1000, output_tokens: 500 },
        content: [{ type: "text", text: "hi" }]
      })
    }
  };
}

describe("instrumentAnthropic", () => {
  beforeEach(() => clearSinks());

  it("emits a span record with cost and tokens", async () => {
    const records: LLMSpanRecord[] = [];
    addSink((r) => { records.push(r); });
    const client = instrumentAnthropic(fakeAnthropic(), { promptName: "greeting" });
    const res = await client.messages.create({ model: "claude-sonnet-4-20250514" });
    expect(res.content[0].text).toBe("hi");
    expect(records).toHaveLength(1);
    const rec = records[0];
    expect(rec.provider).toBe("anthropic");
    expect(rec.inputTokens).toBe(1000);
    expect(rec.outputTokens).toBe(500);
    expect(rec.totalTokens).toBe(1500);
    // 1000/1e6*3 + 500/1e6*15 = 0.0105
    expect(rec.costUsd).toBeCloseTo(0.0105, 6);
    expect(rec.promptName).toBe("greeting");
    expect(rec.status).toBe("ok");
  });
});
