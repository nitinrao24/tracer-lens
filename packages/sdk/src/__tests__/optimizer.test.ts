import { describe, it, expect } from "vitest";
import { optimize, resolveDowngrade } from "../optimizer";

describe("optimizer", () => {
  it("resolves the longest matching downgrade path", () => {
    expect(resolveDowngrade("gpt-4o-2024-11-20")).toBe("gpt-4o-mini");
    expect(resolveDowngrade("claude-sonnet-4-20250514")).toBe("claude-3-5-haiku");
  });

  it("never downgrades a model to itself via prefix collision", () => {
    // "gpt-4o" is a prefix of "gpt-4o-mini-2024-07-18"; "o1" is a prefix of "o1-mini".
    expect(resolveDowngrade("gpt-4o-mini-2024-07-18")).toBeNull();
    expect(resolveDowngrade("o1-mini-2024-09-12")).toBeNull();
  });

  it("rejects targets that are not strictly cheaper", () => {
    expect(resolveDowngrade("some-unpriced-model")).toBeNull();
  });

  it("prices the routing delta from real token counts", () => {
    const report = optimize(
      [{ model: "gpt-4o-2024-11-20", inputTokens: 1_000_000, outputTokens: 1_000_000, calls: 100 }],
      { eligibleFraction: 0.6 }
    );
    // current: 1M*$2.50 + 1M*$10 = $12.50
    expect(report.currentCostUsd).toBeCloseTo(12.5, 4);
    // 60% to gpt-4o-mini ($0.09 + $0.36) + 40% retained ($1.00 + $4.00) = $5.45
    expect(report.projectedCostUsd).toBeCloseTo(5.45, 4);
    expect(report.savingsPct).toBeGreaterThan(0.3);
    expect(report.recommendations[0].eligibleCalls).toBe(60);
  });

  it("leaves models with no cheaper fallback untouched", () => {
    const report = optimize(
      [{ model: "gpt-4o-mini-2024-07-18", inputTokens: 500_000, outputTokens: 100_000, calls: 40 }]
    );
    expect(report.savingsUsd).toBe(0);
    expect(report.recommendations).toHaveLength(0);
  });
});
