/** Post-migration smoke check: verifies the schema and analytics queries work end to end. */
import { sql, getSummary, getLatencyByModel, getModelTokenUsage } from "@tracerlens/db";
import { optimize } from "@tracerlens/sdk";

async function main() {
  const summary = await getSummary(30);
  const latency = await getLatencyByModel(30);
  const usage = await getModelTokenUsage(30);

  const checks: [string, boolean][] = [
    ["spans ingested", summary.totalCalls > 0],
    ["cost recorded", summary.totalCostUsd > 0],
    ["latency percentiles computed", latency.length > 0 && latency[0].p95 > 0],
    ["model usage aggregated", usage.length > 0]
  ];

  if (usage.length > 0) {
    const report = optimize(usage, { eligibleFraction: 0.6 });
    checks.push(["optimizer produced a projection", report.projectedCostUsd <= report.currentCostUsd]);
  }

  let failed = false;
  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
    if (!ok) failed = true;
  }
  console.log(
    `\n${summary.totalCalls} calls, ${summary.totalTokens} tokens, $${summary.totalCostUsd.toFixed(4)}`
  );
  await sql.end();
  process.exit(failed ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await sql.end().catch(() => {});
  process.exit(1);
});
