import { NextResponse } from "next/server";
import { getSummary, getLatencyByModel, getModelTokenUsage } from "@tracerlens/db";
import { optimize } from "@tracerlens/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Machine-readable snapshot — consumed by the CI cost-regression check in stage 4. */
export async function GET(req: Request) {
  const days = Number(new URL(req.url).searchParams.get("days") ?? 30);
  try {
    const [summary, latency, usage] = await Promise.all([
      getSummary(days),
      getLatencyByModel(days),
      getModelTokenUsage(days)
    ]);
    return NextResponse.json({
      windowDays: days,
      summary,
      latency,
      usage,
      optimization: optimize(usage, { eligibleFraction: 0.6 })
    });
  } catch (err) {
    console.error("[metrics] query failed:", err);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
}
