import { sql } from "./client";

export interface ModelTokenUsageRow {
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  calls: number;
  costUsd: number;
}

/** Token totals per model — the input the cost optimizer runs on. */
export async function getModelTokenUsage(sinceDays = 30): Promise<ModelTokenUsageRow[]> {
  const rows = await sql<any[]>`
    SELECT
      model,
      provider,
      COALESCE(SUM(input_tokens), 0)::bigint  AS input_tokens,
      COALESCE(SUM(output_tokens), 0)::bigint AS output_tokens,
      COUNT(*)::int                           AS calls,
      COALESCE(SUM(cost_usd), 0)::float8      AS cost_usd
    FROM llm_spans
    WHERE created_at >= now() - (${sinceDays} || ' days')::interval
      AND status = 'ok'
    GROUP BY model, provider
    ORDER BY cost_usd DESC
  `;
  return rows.map((r) => ({
    model: r.model,
    provider: r.provider,
    inputTokens: Number(r.input_tokens),
    outputTokens: Number(r.output_tokens),
    calls: r.calls,
    costUsd: r.cost_usd
  }));
}

/** Daily cost split by prompt name — powers the per-prompt trend chart. */
export async function getPromptCostTrend(sinceDays = 30) {
  return sql<any[]>`
    SELECT
      date_trunc('day', created_at)::date::text AS day,
      COALESCE(prompt_name, '(unnamed)')        AS prompt_name,
      SUM(cost_usd)::float8                     AS cost_usd
    FROM llm_spans
    WHERE created_at >= now() - (${sinceDays} || ' days')::interval
    GROUP BY 1, 2
    ORDER BY 1
  `;
}
