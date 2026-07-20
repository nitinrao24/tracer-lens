export interface SpanInsert {
  traceId: string;
  spanId: string;
  provider: string;
  model: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  status?: string;
  errorMessage?: string;
  promptName?: string;
  startTime?: string;
  metadata?: Record<string, unknown>;
}
