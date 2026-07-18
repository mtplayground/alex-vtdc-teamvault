import { Pool, type PoolConfig } from "pg";
import { config } from "../config";

function buildPoolConfig(connectionString: string, maxConnections: number): PoolConfig {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");
  url.searchParams.delete("sslmode");

  return {
    connectionString: url.toString(),
    max: maxConnections,
    ssl: sslMode && sslMode !== "disable" ? { rejectUnauthorized: false } : undefined,
  };
}

export function createDatabasePool(connectionString = config.database.url, maxConnections = config.database.poolSize): Pool {
  return new Pool(buildPoolConfig(connectionString, maxConnections));
}

export const dbPool = createDatabasePool();
