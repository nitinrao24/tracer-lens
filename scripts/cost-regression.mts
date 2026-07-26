/**
 * Automated cost regression check.
 *
 * Prices a fixed synthetic workload through the SDK's pricing table and
 * optimizer, then compares the result against a committed baseline. Fails when
 * a change pushes projected spend above tolerance, or when the optimizer's
 * projected savings fall below the floor.
 *
 *   npm run cost:check      verify against .cost-baseline.json
 *   npm run cost:baseline   rewrite the baseline (intentional cost changes)
 */
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { estimateCost, optimize, type ModelUsage } from "@tracerlens/sdk";

const BASELINE_PATH = ".cost-baseline.json";
const WORKLOAD_PATH = "scripts/workload.json";

const TOLERANCE = Number(process.env.COST_TOLERANCE ?? 0.05); // 5% total drift
const SAVINGS_FLOOR = Number(process.env.SAVINGS_FLOOR ?? 0.3); // 30%+ claim
const UPDATE = process.argv.includes("--update");

interface WorkloadCall {
  promptName: string;
  provider: string;
  model: string;
  calls: number;
  inputTokensPerCall: number;
  outputTokensPerCall: number;
}
interface Workload {
  eligibleFraction: number;
  calls: WorkloadCall[];
}
interface Baseline {
  generatedAt: string;
  totalCostUsd: number;
  projectedCostUsd: number;
  savingsPct: number;
  perPrompt: Record<string, number>;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;
const usd = (n: number) => `$${n.toFixed(4)}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function computeReport(workload: Workload) {
  const perPrompt: Record<string, number> = {};
  const byModel = new Map<string, ModelUsage>();

  for (const c of workload.calls) {
    const inputTokens = c.calls * c.inputTokensPerCall;
    const outputTokens = c.calls * c.outputTokensPerCall;
    perPrompt[c.promptName] = round(
      (perPrompt[c.promptName] ?? 0) + estimateCost(c.model, inputTokens, outputTokens)
    );
    const existing = byModel.get(c.model);
    if (existing) {
      existing.inputTokens += inputTokens;
      existing.outputTokens += outputTokens;
      existing.calls += c.calls;
    } else {
      byModel.set(c.model, {
        model: c.model,
        provider: c.provider,
        inputTokens,
        outputTokens,
        calls: c.calls
      });
    }
  }

  const optimization = optimize([...byModel.values()], {
    eligibleFraction: workload.eligibleFraction
  });
  return { perPrompt, optimization };
}

function summary(lines: string[]) {
  const out = lines.join("\n");
  console.log(out);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + "\n");
  }
}

const workload: Workload = JSON.parse(readFileSync(WORKLOAD_PATH, "utf8"));
const { perPrompt, optimization } = computeReport(workload);

const current: Baseline = {
  generatedAt: new Date().toISOString(),
  totalCostUsd: optimization.currentCostUsd,
  projectedCostUsd: optimization.projectedCostUsd,
  savingsPct: round(optimization.savingsPct),
  perPrompt
};

if (UPDATE) {
  writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + "\n");
  console.log(`baseline written: ${usd(current.totalCostUsd)} (savings ${pct(current.savingsPct)})`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error(`No ${BASELINE_PATH} found. Run: npm run cost:baseline`);
  process.exit(1);
}

const baseline: Baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
const failures: string[] = [];
const rows: string[] = [];

const totalDelta =
  baseline.totalCostUsd > 0
    ? (current.totalCostUsd - baseline.totalCostUsd) / baseline.totalCostUsd
    : 0;

rows.push("| Metric | Baseline | Current | Δ |");
rows.push("| --- | ---: | ---: | ---: |");
rows.push(
  `| Workload cost | ${usd(baseline.totalCostUsd)} | ${usd(current.totalCostUsd)} | ${pct(totalDelta)} |`
);
rows.push(
  `| Optimized cost | ${usd(baseline.projectedCostUsd)} | ${usd(current.projectedCostUsd)} | — |`
);
rows.push(
  `| Projected savings | ${pct(baseline.savingsPct)} | ${pct(current.savingsPct)} | ${pct(current.savingsPct - baseline.savingsPct)} |`
);

if (totalDelta > TOLERANCE) {
  failures.push(
    `Workload cost rose ${pct(totalDelta)} (tolerance ${pct(TOLERANCE)}): ${usd(baseline.totalCostUsd)} → ${usd(current.totalCostUsd)}`
  );
}
if (current.savingsPct < SAVINGS_FLOOR) {
  failures.push(
    `Projected savings ${pct(current.savingsPct)} fell below the ${pct(SAVINGS_FLOOR)} floor`
  );
}

const promptRows: string[] = ["", "| Prompt | Baseline | Current | Δ |", "| --- | ---: | ---: | ---: |"];
for (const [name, cost] of Object.entries(current.perPrompt)) {
  const was = baseline.perPrompt[name];
  if (was === undefined) {
    promptRows.push(`| \`${name}\` | — | ${usd(cost)} | new |`);
    continue;
  }
  const delta = was > 0 ? (cost - was) / was : 0;
  promptRows.push(`| \`${name}\` | ${usd(was)} | ${usd(cost)} | ${pct(delta)} |`);
  if (delta > TOLERANCE) {
    failures.push(`Prompt "${name}" cost rose ${pct(delta)} (tolerance ${pct(TOLERANCE)})`);
  }
}

summary([
  failures.length === 0 ? "### Cost regression check passed" : "### Cost regression check failed",
  "",
  ...rows,
  ...promptRows,
  "",
  ...(failures.length ? failures.map((f) => `- ${f}`) : ["No cost regressions detected."])
]);

process.exit(failures.length === 0 ? 0 : 1);
