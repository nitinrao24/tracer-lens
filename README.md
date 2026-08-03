# TracerLens

**Observability that prices every LLM call, then tells you which ones to stop making.** An OpenTelemetry SDK for Claude and OpenAI, a Postgres store, and a dashboard that turns spans into a cost decision.

The name is the thesis: a tracer is the thing you inject to see where the money goes. Most LLM dashboards show you *that* you spent; this one shows you *where the next dollar shouldn't go*.

---

## The problem

Ask an LLM app what it costs to run and you get a monthly invoice — one number, after the fact, with no way to attribute it. Which prompt drove it? Which model? Was the p95 latency spike the retry storm on Tuesday or the new summarization path? The invoice cannot say.

That information exists at the moment each call is made — model, token counts, latency, the prompt that issued it — and it is thrown away the instant the response returns. By the time finance asks, the spans are gone.

An observability layer that keeps it has two jobs, and the second one is the one people skip:

1. **Capture enough** that every dollar is attributable to a prompt and a model.
2. **Turn the capture into an action** — not another chart, a specific "route this traffic to that model and save this much."

Most tracing demos do the first and stop. TracerLens measures both, and the second is what the résumé bullet is actually about.

---

## What it does

Wrap your existing client. Every call lands in Postgres with token counts, latency, model, and computed cost attached — then reads back as three things a dashboard of raw spans can't give you.

Measured against a seeded 30-day workload (~1,500 calls across four models, five prompts):

| | what you get | what it costs you |
|---|---|---|
| Raw provider dashboards | total spend, per-day | **0** attribution — no prompt, no per-model p95 |
| Spans in a log aggregator | searchable events | you build every query and chart yourself |
| **TracerLens** | **per-prompt cost, p50/p95/p99 by model, a priced routing plan** | one `addSink` line on the hot path |

**Read the tradeoff honestly.** If all you need is "what did last month cost," your provider's own billing page is free and already correct. TracerLens earns its place only when you need to answer *which prompt* and *which model* — and, crucially, *what to do about it*. Attribution is the floor; the routing recommendation is the point.

Three things the raw spans become:

- **Per-prompt cost trend.** Spend attributed to the `promptName` that issued each call, over time. This is the "our summarization path quietly tripled" chart that an invoice can never draw.
- **Latency percentiles by model.** p50/p95/p99 per model, sorted by p95 — because the average hides the tail, and the tail is what your users feel.
- **A priced routing plan.** Not "you spent a lot on GPT-4o" but "route 60% of this traffic to GPT-4o-mini and save 47%," computed from *observed token counts*, not a rule of thumb.

The full cost model, including where it's honest and where it assumes, is in the [Cost model](#cost-model) section.

## The optimizer: where the 30% comes from

The résumé says "reducing projected inference cost by 30%+." That number is not typed into a slide — it's computed, and it's guarded by CI.

The optimizer takes real per-model token totals and, for each model with a strictly-cheaper same-family sibling, prices the delta of routing a configurable share of traffic to the cheaper model:

```ts
// 60% of gpt-4o traffic to gpt-4o-mini, 40% stays put — priced from observed tokens.
const report = optimize(usage, { eligibleFraction: 0.6 });
// → { currentCostUsd, projectedCostUsd, savingsUsd, savingsPct, recommendations[] }
```

Two things make it defensible rather than a vanity metric:

- **It's priced, not estimated.** Savings come from `estimateCost()` run against the actual token counts in Postgres, per model, per split. Change the token mix and the number moves.
- **It's honest about eligibility.** The `eligibleFraction` is the share of traffic simple enough to serve from the cheaper model — a knob you tune against your own eval pass rate, not an assumption baked in at 100%.

### The bug the tests caught

Prefix matching is how the pricing and downgrade tables resolve `gpt-4o-2024-11-20` to the `gpt-4o` entry. It also, silently, resolved `gpt-4o-mini-2024-07-18` to the `gpt-4o` key — and recommended downgrading the model *to itself*. The savings filter hid it (a self-downgrade saves nothing, so the row was dropped), but the logic was wrong and would have produced nonsense the moment a new model was added.

The unit test caught it. The fix, in `resolveDowngrade`, is two guards: reject when the model already *is* the target, and reject when the target isn't strictly cheaper on both token dimensions. The negative result produced the guard.

---

## The four signals, all load-bearing

Every span carries four pieces of metadata, and the dashboard needs all four because cost attribution genuinely requires all four.

| Signal | What it answers | Where it comes from |
|---|---|---|
| **Model** | which backend, at which price | the response's reported model, not the request's |
| **Tokens** | how much this call actually consumed | provider `usage`, split input/output |
| **Cost** | the dollar figure, per call | `estimateCost()` — tokens × longest-prefix price |
| **Latency** | how the tail behaves, per model | wall-clock around the wrapped call |

The one that makes it compound is **prompt name**. A cost number without a prompt is a scold; a cost number *per prompt* is a decision. `instrumentAnthropic(client, { promptName: "classify-ticket" })` threads a stable label through every span, and that label is what the per-prompt trend and the routing plan both group on.

```ts
import Anthropic from "@anthropic-ai/sdk";
import { instrumentAnthropic, addSink, tracerLensExporter } from "@tracerlens/sdk";

addSink(tracerLensExporter({ endpoint: "http://localhost:3000/api/ingest" }));

const client = instrumentAnthropic(new Anthropic(), { promptName: "classify-ticket" });
await client.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 512, messages: [...] });
```

The exporter batches spans — 20 per flush, or every 3 seconds — so instrumentation stays off the hot path, and a failed export is dropped rather than surfaced to your caller. Observability that can take down the thing it observes is worse than none.

---

## Cost regression in CI

The 30%+ claim is only worth making if it can't silently rot. So it's a test.

`npm run cost:check` prices a fixed synthetic workload (`scripts/workload.json`, held constant so cost changes are attributable to code, not traffic) through the SDK's pricing table and optimizer, then diffs the result against a committed baseline (`.cost-baseline.json`). It runs on every pull request and comments the table back onto the PR. CI fails when:

- total workload cost rises more than `COST_TOLERANCE` (default 5%),
- any single prompt's cost rises more than that same tolerance, or
- the optimizer's projected savings drop below `SAVINGS_FLOOR` (default 30%).

Touch a price in `pricing.ts` or a downgrade path, and the bot tells the reviewer exactly what moved and by how much. If the change is intentional — a provider price update, a new model — you regenerate the baseline with `npm run cost:baseline` and explain it in the PR. The number on the résumé is the number the pipeline enforces.

---

## Running it

Everything runs locally with Docker and no API keys — the seed loads ~1,500 synthetic spans so the dashboard has data on first boot.

```bash
npm install
npm run build -w @tracerlens/sdk   # the dashboard and seed import the built SDK
docker compose up -d               # Postgres 16
npm run db:migrate                 # apply the schema
npm run seed                       # ~1,500 sample spans
npm run dev                        # the dashboard at localhost:3000
```

Run the whole stack in Docker instead of just the database:

```bash
docker compose --profile app up --build
```

Inspect the machine-readable snapshot the CI check reads:

```bash
curl localhost:3000/api/metrics | jq .optimization
```

### Build order matters

`@tracerlens/db` and the dashboard both import from `@tracerlens/sdk`'s **built** output, so `npm run build -w @tracerlens/sdk` has to run before the first `seed` or `dev`. Skip it and you get `Cannot find module '@tracerlens/sdk/dist/index.js'` — the seed is trying to import code that hasn't been compiled yet.

---

## Layout

```
packages/
  sdk/src/
    instrument.ts       wraps Claude/OpenAI, times the call, emits the span
    pricing.ts          list prices per 1M tokens, longest-prefix match
    optimizer.ts        prices routing changes; the resolveDowngrade guards live here
    exporters.ts        batching sink that POSTs to the ingestion endpoint
  db/src/
    queries.ts          summary, cost trend, latency percentiles
    analytics.ts        per-model token usage — the optimizer's input
    migrate.ts          idempotent, tracked in a _migrations table
apps/dashboard/
  app/page.tsx          the board — stat cards, charts, optimizer panel
  app/api/ingest        span ingestion
  app/api/metrics       machine-readable snapshot for CI
scripts/
  workload.json         the fixed traffic mix the cost check prices
  cost-regression.mts   baseline diff, PR comment, the three failure gates
.github/workflows/      CI, cost regression bot, guarded Vercel deploy
```

---

## Cost model

Prices in `packages/sdk/src/pricing.ts` are **list prices per 1M tokens**, matched by longest model prefix so `claude-3-5-sonnet-20241022` resolves through the `claude-3-5-sonnet` entry. They are a snapshot — verify against current provider pricing before relying on absolute figures. What TracerLens gets right is the *shape*: attribution per prompt, percentiles per model, and a savings projection that moves with your actual token mix. What it assumes is the `eligibleFraction` — the share of traffic a cheaper model can serve without failing your evals — which is a number only your own eval suite can supply.

---

## Deployment

Vercel builds via `vercel.json` (SDK first, then the dashboard). Set `DATABASE_URL` in project settings, pointed at a managed Postgres instance (Neon and Supabase both have free tiers), and run the migration against it once. To deploy from CI, add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as repository secrets — the deploy workflow skips cleanly when they're absent, so the pipeline is green from the first push.

---

## License

MIT
