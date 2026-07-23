# TracerLens

LLM cost & latency observability for Claude and OpenAI, built on OpenTelemetry.

## What's here

- **`@tracerlens/sdk`** — wraps Claude/OpenAI clients, emits OpenTelemetry spans tagged
  with token counts, latency, model, and computed cost. Includes a batching exporter
  and a cost optimizer that prices model-routing changes from observed token counts.
- **`@tracerlens/db`** — Postgres schema, migrations, and analytics queries
  (daily cost trend, P50/P95/P99 latency by model, cost by prompt).
- **`@tracerlens/dashboard`** — Next.js App Router dashboard plus the `/api/ingest`
  and `/api/metrics` endpoints.

## Quick start

```bash
npm install
npm run build -w @tracerlens/sdk   # dashboard + seed import the built SDK
docker compose up -d               # Postgres 16
npm run db:migrate
npm run seed                       # ~1500 sample spans
npm run dev                        # http://localhost:3000
```

## Instrumenting your app

```ts
import Anthropic from "@anthropic-ai/sdk";
import { instrumentAnthropic, addSink, tracerLensExporter } from "@tracerlens/sdk";

addSink(tracerLensExporter({ endpoint: "http://localhost:3000/api/ingest" }));

const client = instrumentAnthropic(new Anthropic(), { promptName: "classify-ticket" });
await client.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 512, messages: [...] });
```

Every call now lands in Postgres with token counts, latency, and cost attached.

## Cost model

Prices in `packages/sdk/src/pricing.ts` are list prices per 1M tokens, matched by
longest model prefix. Verify against current provider pricing before relying on
absolute figures. The optimizer's savings projection assumes a configurable share of
traffic can be served by the cheapest same-family model.
