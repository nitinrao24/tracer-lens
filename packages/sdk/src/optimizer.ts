import { estimateCost, priceForModel } from "./pricing";

export interface ModelUsage {
  model: string;
  provider?: string;
  inputTokens: number;
  outputTokens: number;
  calls: number;
}

export interface Recommendation {
  model: string;
  targetModel: string;
  calls: number;
  eligibleCalls: number;
  currentCostUsd: number;
  projectedCostUsd: number;
  savingsUsd: number;
  savingsPct: number;
}

export interface OptimizationReport {
  currentCostUsd: number;
  projectedCostUsd: number;
  savingsUsd: number;
  savingsPct: number;
  eligibleFraction: number;
  recommendations: Recommendation[];
}

/**
 * Cheaper same-family fallbacks. Matched by longest model prefix, so
 * "gpt-4o-2024-11-20" maps through the "gpt-4o" entry.
 */
export const DOWNGRADE_PATHS: Record<string, string> = {
  "claude-opus-4": "claude-sonnet-4",
  "claude-3-opus": "claude-3-5-sonnet",
  "claude-sonnet-4": "claude-3-5-haiku",
  "claude-3-5-sonnet": "claude-3-5-haiku",
  "gpt-4-turbo": "gpt-4o",
  "gpt-4o": "gpt-4o-mini",
  "o1": "o1-mini"
};

export function resolveDowngrade(model: string): string | null {
  let best: { key: string; target: string } | null = null;
  for (const [key, target] of Object.entries(DOWNGRADE_PATHS)) {
    if (model.startsWith(key) && (!best || key.length > best.key.length)) {
      best = { key, target };
    }
  }
  if (!best) return null;

  // A prefix match can land on the model's own cheaper sibling: "gpt-4o" is a
  // prefix of "gpt-4o-mini-2024-07-18", which would recommend downgrading the
  // model to itself. Reject when the model already IS the target.
  if (model.startsWith(best.target)) return null;

  // Never recommend a target that isn't strictly cheaper on both token types.
  const current = priceForModel(model);
  const target = priceForModel(best.target);
  if (target.input >= current.input && target.output >= current.output) return null;

  return best.target;
}

export interface OptimizeOptions {
  /**
   * Share of traffic assumed simple enough to serve from the cheaper model.
   * Conservative default; tune against your own eval pass rate.
   */
  eligibleFraction?: number;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

export function optimize(usages: ModelUsage[], options: OptimizeOptions = {}): OptimizationReport {
  const frac = Math.min(Math.max(options.eligibleFraction ?? 0.6, 0), 1);
  const recommendations: Recommendation[] = [];
  let currentTotal = 0;
  let projectedTotal = 0;

  for (const u of usages) {
    const current = estimateCost(u.model, u.inputTokens, u.outputTokens);
    currentTotal += current;

    const target = resolveDowngrade(u.model);
    if (!target || priceForModel(target).input === 0) {
      projectedTotal += current;
      continue;
    }

    const projected =
      estimateCost(target, u.inputTokens * frac, u.outputTokens * frac) +
      estimateCost(u.model, u.inputTokens * (1 - frac), u.outputTokens * (1 - frac));
    projectedTotal += projected;

    const savings = current - projected;
    if (savings <= 0) continue;

    recommendations.push({
      model: u.model,
      targetModel: target,
      calls: u.calls,
      eligibleCalls: Math.round(u.calls * frac),
      currentCostUsd: round(current),
      projectedCostUsd: round(projected),
      savingsUsd: round(savings),
      savingsPct: current > 0 ? savings / current : 0
    });
  }

  recommendations.sort((a, b) => b.savingsUsd - a.savingsUsd);
  const savings = currentTotal - projectedTotal;

  return {
    currentCostUsd: round(currentTotal),
    projectedCostUsd: round(projectedTotal),
    savingsUsd: round(savings),
    savingsPct: currentTotal > 0 ? savings / currentTotal : 0,
    eligibleFraction: frac,
    recommendations
  };
}
