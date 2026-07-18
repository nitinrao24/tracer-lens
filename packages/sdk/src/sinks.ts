import type { LLMSpanRecord } from "./types";

export type SpanSink = (record: LLMSpanRecord) => void | Promise<void>;

const sinks: SpanSink[] = [];

export function addSink(sink: SpanSink): void {
  sinks.push(sink);
}

export function clearSinks(): void {
  sinks.length = 0;
}

export async function emit(record: LLMSpanRecord): Promise<void> {
  await Promise.all(
    sinks.map((sink) =>
      Promise.resolve()
        .then(() => sink(record))
        .catch((err) => {
          if (process.env.TRACERLENS_DEBUG === "1") {
            console.error("[tracerlens] sink error:", err);
          }
        })
    )
  );
}

export const consoleSink: SpanSink = (r) => {
  console.log(
    `[tracerlens] ${r.provider}/${r.model} ${r.totalTokens}tok ${r.latencyMs}ms $${r.costUsd.toFixed(6)} ${r.status}`
  );
};
