import { performance } from "node:perf_hooks";
import { SpanStatusCode } from "@opentelemetry/api";
import { getTracer } from "./telemetry";
import { emit } from "./sinks";
import { estimateCost } from "./pricing";
import type { Provider, TracerLensConfig } from "./types";

interface Usage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

interface WrapOptions {
  provider: Provider;
  operation: string;
  config: TracerLensConfig;
  requestModel?: string;
  run: () => Promise<any>;
  extractUsage: (result: any) => Usage;
}

async function traceCall(opts: WrapOptions): Promise<any> {
  const span = getTracer().startSpan(`${opts.provider}.${opts.operation}`);
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const ctx = span.spanContext();
  try {
    const result = await opts.run();
    const latencyMs = Math.round(performance.now() - start);
    const usage = opts.extractUsage(result);
    const costUsd = estimateCost(usage.model, usage.inputTokens, usage.outputTokens);
    const totalTokens = usage.inputTokens + usage.outputTokens;
    span.setAttributes({
      "gen_ai.system": opts.provider,
      "gen_ai.request.model": opts.requestModel ?? usage.model,
      "gen_ai.response.model": usage.model,
      "gen_ai.usage.input_tokens": usage.inputTokens,
      "gen_ai.usage.output_tokens": usage.outputTokens,
      "tracerlens.total_tokens": totalTokens,
      "tracerlens.cost_usd": costUsd,
      "tracerlens.latency_ms": latencyMs,
      ...(opts.config.promptName ? { "tracerlens.prompt_name": opts.config.promptName } : {})
    });
    span.setStatus({ code: SpanStatusCode.OK });
    await emit({
      traceId: ctx.traceId,
      spanId: ctx.spanId,
      provider: opts.provider,
      model: usage.model,
      operation: opts.operation,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens,
      costUsd,
      latencyMs,
      status: "ok",
      promptName: opts.config.promptName,
      startTime: startedAt,
      metadata: opts.config.metadata
    });
    return result;
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
    await emit({
      traceId: ctx.traceId,
      spanId: ctx.spanId,
      provider: opts.provider,
      model: opts.requestModel ?? "unknown",
      operation: opts.operation,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      latencyMs,
      status: "error",
      errorMessage: String(err),
      promptName: opts.config.promptName,
      startTime: startedAt,
      metadata: opts.config.metadata
    });
    throw err;
  } finally {
    span.end();
  }
}

export function instrumentAnthropic<T>(client: T, config: TracerLensConfig = {}): T {
  const messages = (client as any)?.messages;
  if (!messages || typeof messages.create !== "function") {
    throw new Error("instrumentAnthropic: expected client.messages.create to be a function");
  }
  const original = messages.create.bind(messages);
  messages.create = (...args: any[]) =>
    traceCall({
      provider: "anthropic",
      operation: "messages.create",
      config,
      requestModel: args[0]?.model,
      run: () => original(...args),
      extractUsage: (res) => ({
        model: res?.model ?? args[0]?.model ?? "unknown",
        inputTokens: res?.usage?.input_tokens ?? 0,
        outputTokens: res?.usage?.output_tokens ?? 0
      })
    });
  return client;
}

export function instrumentOpenAI<T>(client: T, config: TracerLensConfig = {}): T {
  const completions = (client as any)?.chat?.completions;
  if (!completions || typeof completions.create !== "function") {
    throw new Error("instrumentOpenAI: expected client.chat.completions.create to be a function");
  }
  const original = completions.create.bind(completions);
  completions.create = (...args: any[]) =>
    traceCall({
      provider: "openai",
      operation: "chat.completions.create",
      config,
      requestModel: args[0]?.model,
      run: () => original(...args),
      extractUsage: (res) => ({
        model: res?.model ?? args[0]?.model ?? "unknown",
        inputTokens: res?.usage?.prompt_tokens ?? 0,
        outputTokens: res?.usage?.completion_tokens ?? 0
      })
    });
  return client;
}
