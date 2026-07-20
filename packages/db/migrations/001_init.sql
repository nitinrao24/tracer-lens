CREATE TABLE IF NOT EXISTS llm_spans (
  id            BIGSERIAL PRIMARY KEY,
  trace_id      TEXT NOT NULL,
  span_id       TEXT NOT NULL,
  provider      TEXT NOT NULL,
  model         TEXT NOT NULL,
  operation     TEXT NOT NULL,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens  INTEGER NOT NULL DEFAULT 0,
  cost_usd      NUMERIC(12,6) NOT NULL DEFAULT 0,
  latency_ms    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'ok',
  error_message TEXT,
  prompt_name   TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_llm_spans_created_at  ON llm_spans (created_at);
CREATE INDEX IF NOT EXISTS idx_llm_spans_model       ON llm_spans (model);
CREATE INDEX IF NOT EXISTS idx_llm_spans_prompt_name ON llm_spans (prompt_name);
