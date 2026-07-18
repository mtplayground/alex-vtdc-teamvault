import { Pool, type PoolConfig } from "pg";

function buildPoolConfig(connectionString: string): PoolConfig {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");
  url.searchParams.delete("sslmode");
  const maxConnections = Number.parseInt(process.env.DATABASE_POOL_SIZE ?? "10", 10);

  return {
    connectionString: url.toString(),
    max: Number.isFinite(maxConnections) && maxConnections > 0 ? maxConnections : 10,
    ssl: sslMode && sslMode !== "disable" ? { rejectUnauthorized: false } : undefined,
  };
}

export function createDatabasePool(connectionString = process.env.DATABASE_URL): Pool {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  return new Pool(buildPoolConfig(connectionString));
}

export const dbPool = createDatabasePool();
