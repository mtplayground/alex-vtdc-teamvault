import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

function buildPoolConfig(connectionString) {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");
  url.searchParams.delete("sslmode");

  const config = { connectionString: url.toString() };

  if (sslMode && sslMode !== "disable") {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../migrations");
const migrationFiles = ["0001_core_schema.sql"];

const pool = new Pool(buildPoolConfig(databaseUrl));

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  for (const filename of migrationFiles) {
    const alreadyApplied = await pool.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [filename]);
    if (alreadyApplied.rowCount) {
      console.log(`Skipping ${filename}; already applied.`);
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, filename), "utf8");
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
      await client.query("COMMIT");
      console.log(`Applied ${filename}.`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
} catch (error) {
  console.error("Migration failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
