import { NextResponse } from "next/server";
import { insertSpans, type SpanInsert } from "@tracerlens/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingSpan = Partial<SpanInsert> & { traceId?: string; spanId?: string };

function normalize(raw: IncomingSpan): SpanInsert | null {
  if (!raw || !raw.traceId || !raw.spanId || !raw.model || !raw.provider) return null;
  const inputTokens = Number(raw.inputTokens ?? 0);
  const outputTokens = Number(raw.outputTokens ?? 0);
  return {
    traceId: String(raw.traceId),
    spanId: String(raw.spanId),
    provider: String(raw.provider),
    model: String(raw.model),
    operation: String(raw.operation ?? "unknown"),
    inputTokens,
    outputTokens,
    totalTokens: Number(raw.totalTokens ?? inputTokens + outputTokens),
    costUsd: Number(raw.costUsd ?? 0),
    latencyMs: Number(raw.latencyMs ?? 0),
    status: raw.status ?? "ok",
    errorMessage: raw.errorMessage,
    promptName: raw.promptName,
    startTime: raw.startTime,
    metadata: raw.metadata
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const rawList = Array.isArray(body) ? body : [body];
  const rows = rawList.map(normalize).filter((r): r is SpanInsert => r !== null);
  if (rows.length === 0) {
    return NextResponse.json({ error: "no valid spans" }, { status: 422 });
  }
  try {
    const inserted = await insertSpans(rows);
    return NextResponse.json({ inserted }, { status: 202 });
  } catch (err) {
    console.error("[ingest] insert failed:", err);
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }
}
