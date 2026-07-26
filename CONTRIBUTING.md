# Contributing to TracerLens

## Local setup

```bash
npm install
npm run build -w @tracerlens/sdk   # dashboard and seed import the built SDK
docker compose up -d               # Postgres 16
npm run db:migrate
npm run seed
npm run dev
```

## Before opening a PR

```bash
npm run test --workspaces
npm run cost:check
```

## The cost regression check

Every PR is priced against a fixed synthetic workload (`scripts/workload.json`) and
compared to `.cost-baseline.json`. CI fails when:

- total workload cost rises more than `COST_TOLERANCE` (default 5%),
- any single prompt's cost rises more than the same tolerance, or
- the optimizer's projected savings drop below `SAVINGS_FLOOR` (default 30%).

If a change *should* move cost — a provider price update, a new model in the
pricing table — regenerate the baseline and commit it:

```bash
npm run cost:baseline
```

Explain the change in the PR description so the new baseline is reviewable.

## Adding a model

1. Add list pricing (USD per 1M tokens) to `MODEL_PRICING` in `packages/sdk/src/pricing.ts`.
2. If a cheaper same-family model exists, add a `DOWNGRADE_PATHS` entry.
3. Add a case to `packages/sdk/src/__tests__/optimizer.test.ts` — prefix collisions
   are easy to introduce and the tests exist to catch them.
