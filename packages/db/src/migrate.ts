import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { sql } from "./client";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "migrations");

async function run() {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const [existing] = await sql`SELECT 1 FROM _migrations WHERE name = ${file}`;
    if (existing) { console.log(`= skip ${file}`); continue; }
    await sql.unsafe(readFileSync(join(migrationsDir, file), "utf8"));
    await sql`INSERT INTO _migrations (name) VALUES (${file})`;
    console.log(`+ applied ${file}`);
  }
  await sql.end();
  console.log("migrations complete");
}

run().catch((err) => { console.error(err); process.exit(1); });
