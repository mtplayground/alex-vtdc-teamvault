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
          bucket: config.storage.bucket,
          configured: true,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
