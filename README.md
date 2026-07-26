# TracerLens

[![CI](https://github.com/nitinrao24/tracer-lens/actions/workflows/ci.yml/badge.svg)](https://github.com/nitinrao24/tracer-lens/actions/workflows/ci.yml)
[![Cost regression](https://github.com/nitinrao24/tracer-lens/actions/workflows/cost-regression.yml/badge.svg)](https://github.com/nitinrao24/tracer-lens/actions/workflows/cost-regression.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

LLM cost & latency observability for Claude and OpenAI, built on OpenTelemetry.

Wrap your existing client, and every call lands in Postgres with token counts,
latency, model, and computed cost attached — then read it back as per-prompt cost
trends, P95 latency by model, and concrete model-routing recommendations.

## Packages

| Package | What it does |
| --- | --- |
| `@tracerlens/sdk` | Instruments Claude/OpenAI clients, emits OpenTelemetry spans, batches them to an ingestion endpoint, and prices model-routing changes |
| `@tracerlens/db` | Postgres schema, migrations, and analytics queries (daily cost, P50/P95/P99 latency, cost by prompt) |
| `@tracerlens/dashboard` | Next.js App Router dashboard plus `/api/ingest`, `/api/metrics`, `/api/health` |

## Quick start

```bash
npm install
npm run build -w @tracerlens/sdk
docker compose up -d               # Postgres 16
npm run db:migrate
npm run seed                       # ~1500 sample spans
npm run dev                        # http://localhost:3000
```

Run the whole stack in Docker instead:

```bash
docker compose --profile app up --build
```

## Instrumenting your app

```ts
import Anthropic from "@anthropic-ai/sdk";
import { instrumentAnthropic, addSink, tracerLensExporter } from "@tracerlens/sdk";

addSink(tracerLensExporter({ endpoint: "http://localhost:3000/api/ingest" }));

const client = instrumentAnthropic(new Anthropic(), { promptName: "classify-ticket" });
await client.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 512, messages: [...] });
```

The exporter batches spans (20 per flush, or every 3s) so instrumentation stays off
the hot path. Failed exports are dropped rather than surfaced to your callers.

## Cost regression testing in CI

`npm run cost:check` prices a fixed workload through the SDK's pricing table and
optimizer, then diffs it against a committed baseline. It runs on every pull
request and comments the result. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Deployment

Vercel builds via `vercel.json` (SDK first, then the dashboard). Set `DATABASE_URL`
in project settings, pointed at a managed Postgres instance. To deploy from CI, add
`VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as repository secrets — the
deploy workflow skips cleanly when they're absent.

## Cost model

Prices in `packages/sdk/src/pricing.ts` are list prices per 1M tokens, matched by
longest model prefix. Verify against current provider pricing before relying on
absolute figures. Savings projections assume a configurable share of traffic can be
served by the cheapest strictly-cheaper same-family model.

## License

MIT
