import { describe, it, expect, vi } from "vitest";
import { tracerLensExporter } from "../exporters";
import type { LLMSpanRecord } from "../types";

function record(): LLMSpanRecord {
  return {
    traceId: "t", spanId: "s", provider: "anthropic", model: "claude-sonnet-4",
    operation: "messages.create", inputTokens: 10, outputTokens: 5, totalTokens: 15,
    costUsd: 0.001, latencyMs: 100, status: "ok", startTime: new Date().toISOString()
  };
}

describe("tracerLensExporter", () => {
  it("flushes once batchSize is reached", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    const sink = tracerLensExporter({ batchSize: 2, fetchImpl: fetchImpl as any });
    sink(record());
    expect(fetchImpl).not.toHaveBeenCalled();
    sink(record());
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    const body = JSON.parse((fetchImpl.mock.calls[0][1] as any).body);
    expect(body).toHaveLength(2);
  });
});
