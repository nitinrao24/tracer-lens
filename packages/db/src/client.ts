import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ??
  "postgres://tracerlens:tracerlens@localhost:5432/tracerlens";

export const sql = postgres(connectionString, {
  max: Number(process.env.PG_POOL_MAX ?? 5),
  idle_timeout: 20,
  onnotice: () => {}
});
