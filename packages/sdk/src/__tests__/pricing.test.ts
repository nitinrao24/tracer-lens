import { describe, it, expect } from "vitest";
import { estimateCost, priceForModel } from "../pricing";

describe("pricing", () => {
  it("matches the longest model prefix", () => {
    expect(priceForModel("claude-3-5-sonnet-20241022").input).toBe(3);
    expect(priceForModel("gpt-4o-mini-2024-07-18").input).toBe(0.15);
  });

  it("computes blended cost per 1M tokens", () => {
    // 1M input @ $3 + 1M output @ $15 = $18
    expect(estimateCost("claude-sonnet-4", 1_000_000, 1_000_000)).toBeCloseTo(18, 6);
  });

  it("returns zero for unknown models", () => {
    expect(estimateCost("mystery-model", 1000, 1000)).toBe(0);
  });
});
