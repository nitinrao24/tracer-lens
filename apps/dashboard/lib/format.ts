export const usd = (n: number, digits = 2) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const compactUsd = (n: number) => (n < 1 ? `$${n.toFixed(4)}` : usd(n));

export const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;

export const ms = (n: number) => `${Math.round(n).toLocaleString("en-US")} ms`;

export const compactNum = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
  : String(n);
