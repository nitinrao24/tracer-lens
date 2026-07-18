export type Provider = "anthropic" | "openai";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LLMSpanRecord {
  traceId: string;
  spanId: string;
  provider: Provider;
  model: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  status: "ok" | "error";
  errorMessage?: string;
  promptName?: string;
  startTime: string;
  metadata?: Record<string, unknown>;
}

export interface TracerLensConfig {
  /** Logical service name recorded on spans. */
  serviceName?: string;
  /** Stable name to correlate cost across calls of the same prompt. */
  promptName?: string;
  /** Extra attributes merged onto every emitted record. */
  metadata?: Record<string, unknown>;
}
