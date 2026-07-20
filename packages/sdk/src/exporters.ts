import type { LLMSpanRecord } from "./types";
import type { SpanSink } from "./sinks";

export interface TracerLensExporterOptions {
  endpoint?: string;
  batchSize?: number;
  flushIntervalMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * A batching sink that POSTs span records to the TracerLens ingestion endpoint.
 * Register it with addSink(tracerLensExporter({ endpoint })).
 */
export function tracerLensExporter(options: TracerLensExporterOptions = {}): SpanSink {
  const endpoint =
    options.endpoint ?? process.env.TRACERLENS_ENDPOINT ?? "http://localhost:3000/api/ingest";
  const batchSize = options.batchSize ?? 20;
  const flushIntervalMs = options.flushIntervalMs ?? 3000;
  const doFetch = options.fetchImpl ?? fetch;
  let buffer: LLMSpanRecord[] = [];
  let timer: ReturnType<typeof setInterval> | undefined;

  async function flush(): Promise<void> {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    try {
      await doFetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(batch)
      });
    } catch (err) {
      if (process.env.TRACERLENS_DEBUG === "1") console.error("[tracerlens] export failed:", err);
    }
  }

  function ensureTimer(): void {
    if (timer) return;
    timer = setInterval(() => { void flush(); }, flushIntervalMs);
    if (typeof timer.unref === "function") timer.unref();
  }

  return (record: LLMSpanRecord) => {
    buffer.push(record);
    ensureTimer();
    if (buffer.length >= batchSize) void flush();
  };
}
