export interface ModelPrice {
  /** USD per 1,000,000 input tokens. */
  input: number;
  /** USD per 1,000,000 output tokens. */
  output: number;
}

/**
 * List prices in USD per 1M tokens. Prices change — verify against provider
 * pricing pages before relying on absolute figures. Matched by longest prefix.
 */
export const MODEL_PRICING: Record<string, ModelPrice> = {
  // Anthropic
  "claude-opus-4": { input: 15, output: 75 },
  "claude-sonnet-4": { input: 3, output: 15 },
  "claude-3-5-sonnet": { input: 3, output: 15 },
  "claude-3-5-haiku": { input: 0.8, output: 4 },
  "claude-3-opus": { input: 15, output: 75 },
  "claude-3-haiku": { input: 0.25, output: 1.25 },
  // OpenAI
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4-turbo": { input: 10, output: 30 },
  "o1-mini": { input: 1.1, output: 4.4 },
  "o1": { input: 15, output: 60 }
};

const FALLBACK: ModelPrice = { input: 0, output: 0 };

export function priceForModel(model: string): ModelPrice {
  let best: { key: string; price: ModelPrice } | null = null;
  for (const [key, price] of Object.entries(MODEL_PRICING)) {
    if (model.startsWith(key) && (!best || key.length > best.key.length)) {
      best = { key, price };
    }
  }
  return best?.price ?? FALLBACK;
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const price = priceForModel(model);
  const cost = (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
  return Math.round(cost * 1e6) / 1e6; // micro-dollar precision
}
