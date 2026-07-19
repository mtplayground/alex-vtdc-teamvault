import { Router } from "express";
import type { Pool } from "pg";
import { config } from "../config";

export function createHealthRouter(dbPool: Pool): Router {
  const router = Router();

  router.get("/health", async (_req, res, next) => {
    try {
      await dbPool.query("SELECT 1");

      res.json({
        status: "ok",
        service: "api",
        environment: config.nodeEnv,
        database: "ok",
        storage: {
          bucket: config.storage.bucket ?? null,
          configured: config.storage.enabled,
        },
        email: {
          configured: config.email.enabled,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
