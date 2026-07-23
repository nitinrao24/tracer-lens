import {
  getSummary, getCostTrend, getLatencyByModel, getCostByPrompt, getModelTokenUsage
} from "@tracerlens/db";
import { optimize } from "@tracerlens/sdk";
import StatCard from "../components/StatCard";
import CostTrendChart from "../components/CostTrendChart";
import LatencyChart from "../components/LatencyChart";
import PromptCostTable from "../components/PromptCostTable";
import OptimizerPanel from "../components/OptimizerPanel";
import { compactUsd, ms, pct, compactNum } from "../lib/format";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;

export default async function DashboardPage() {
  const [summary, trend, latency, prompts, usage] = await Promise.all([
    getSummary(WINDOW_DAYS),
    getCostTrend(WINDOW_DAYS),
    getLatencyByModel(WINDOW_DAYS),
    getCostByPrompt(WINDOW_DAYS),
    getModelTokenUsage(WINDOW_DAYS)
  ]);

  if (summary.totalCalls === 0) {
    return (
      <main className="shell">
        <div className="empty">
          <h1>No spans yet</h1>
          <p>
            Start Postgres, then run <code>npm run db:migrate</code> and <code>npm run seed</code>{" "}
            to populate the dashboard.
          </p>
        </div>
      </main>
    );
  }

  const report = optimize(usage, { eligibleFraction: 0.6 });
  const worstP95 = latency[0];

  return (
    <main className="shell">
      <header className="masthead">
        <div>
          <h1>Tracer<span>Lens</span></h1>
          <p>LLM cost &amp; latency observability across multi-model backends</p>
        </div>
        <span className="window-tag">Last {WINDOW_DAYS} days</span>
      </header>

      <section className="grid grid-4">
        <StatCard
          label="Total spend"
          value={compactUsd(summary.totalCostUsd)}
          note={`${summary.totalCalls.toLocaleString("en-US")} instrumented calls`}
        />
        <StatCard
          label="Tokens processed"
          value={compactNum(summary.totalTokens)}
          note={`across ${usage.length} model${usage.length === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Avg latency"
          value={ms(summary.avgLatencyMs)}
          note={worstP95 ? `worst P95: ${ms(worstP95.p95)}` : undefined}
        />
        <StatCard
          label="Error rate"
          value={pct(summary.errorRate, 2)}
          note={summary.errorRate > 0.05 ? "above 5% threshold" : "within threshold"}
          tone={summary.errorRate > 0.05 ? "bad" : "good"}
        />
      </section>

      <section className="grid grid-2 section">
        <div className="card">
          <h2>Daily inference cost</h2>
          <p className="sub">Spend per day across all providers</p>
          <CostTrendChart data={trend.map((t: any) => ({ day: t.day, costUsd: t.cost_usd, calls: t.calls }))} />
        </div>
        <div className="card">
          <h2>Latency percentiles by model</h2>
          <p className="sub">P50 / P95 / P99, sorted by P95</p>
          <LatencyChart data={latency as any} />
        </div>
      </section>

      <section className="card section">
        <h2>Cost by prompt</h2>
        <p className="sub">Which prompts are actually driving spend</p>
        <PromptCostTable rows={prompts as any} />
      </section>

      <OptimizerPanel report={report} />
    </main>
  );
}
