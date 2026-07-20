import { sql } from "./client";
import type { SpanInsert } from "./types";

export async function insertSpan(s: SpanInsert): Promise<void> {
  await sql`
    INSERT INTO llm_spans (
      trace_id, span_id, provider, model, operation,
      input_tokens, output_tokens, total_tokens, cost_usd, latency_ms,
      status, error_message, prompt_name, metadata, created_at
    ) VALUES (
      ${s.traceId}, ${s.spanId}, ${s.provider}, ${s.model}, ${s.operation},
      ${s.inputTokens}, ${s.outputTokens}, ${s.totalTokens}, ${s.costUsd}, ${s.latencyMs},
      ${s.status ?? "ok"}, ${s.errorMessage ?? null}, ${s.promptName ?? null},
      ${s.metadata ? sql.json(s.metadata as any) : null},
      ${s.startTime ? new Date(s.startTime) : new Date()}
    )
  `;
}

export async function insertSpans(rows: SpanInsert[]): Promise<number> {
  for (const r of rows) await insertSpan(r);
  return rows.length;
}

export interface Summary {
  totalCostUsd: number;
  totalCalls: number;
  totalTokens: number;
  avgLatencyMs: number;
  errorRate: number;
}

export async function getSummary(sinceDays = 30): Promise<Summary> {
  const [row] = await sql<any[]>`
    SELECT
      COALESCE(SUM(cost_usd), 0)::float8               AS total_cost_usd,
      COUNT(*)::int                                    AS total_calls,
      COALESCE(SUM(total_tokens), 0)::int              AS total_tokens,
      COALESCE(AVG(latency_ms), 0)::float8             AS avg_latency_ms,
      COALESCE(AVG((status <> 'ok')::int), 0)::float8  AS error_rate
    FROM llm_spans
    WHERE created_at >= now() - (${sinceDays} || ' days')::interval
  `;
  return {
    totalCostUsd: row.total_cost_usd,
    totalCalls: row.total_calls,
    totalTokens: row.total_tokens,
    avgLatencyMs: row.avg_latency_ms,
    errorRate: row.error_rate
  };
}

export async function getCostTrend(sinceDays = 30) {
  return sql<any[]>`
    SELECT
      date_trunc('day', created_at)::date::text AS day,
      SUM(cost_usd)::float8 AS cost_usd,
      COUNT(*)::int         AS calls
    FROM llm_spans
    WHERE created_at >= now() - (${sinceDays} || ' days')::interval
    GROUP BY 1 ORDER BY 1
  `;
}

export async function getLatencyByModel(sinceDays = 30) {
  return sql<any[]>`
    SELECT
      model,
      percentile_cont(0.5)  WITHIN GROUP (ORDER BY latency_ms)::float8 AS p50,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)::float8 AS p95,
      percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms)::float8 AS p99,
      COUNT(*)::int AS calls
    FROM llm_spans
    WHERE created_at >= now() - (${sinceDays} || ' days')::interval
    GROUP BY model ORDER BY p95 DESC
  `;
}

export async function getCostByModel(sinceDays = 30) {
  return sql<any[]>`
    SELECT
      model, provider,
      SUM(cost_usd)::float8  AS cost_usd,
      SUM(total_tokens)::int AS tokens,
      COUNT(*)::int          AS calls
    FROM llm_spans
    WHERE created_at >= now() - (${sinceDays} || ' days')::interval
    GROUP BY model, provider ORDER BY cost_usd DESC
  `;
}

export async function getCostByPrompt(sinceDays = 30) {
  return sql<any[]>`
    SELECT
      COALESCE(prompt_name, '(unnamed)') AS prompt_name,
      SUM(cost_usd)::float8    AS cost_usd,
      COUNT(*)::int            AS calls,
      AVG(cost_usd)::float8    AS avg_cost_usd,
      SUM(total_tokens)::int   AS tokens
    FROM llm_spans
    WHERE created_at >= now() - (${sinceDays} || ' days')::interval
    GROUP BY 1 ORDER BY cost_usd DESC
  `;
}
