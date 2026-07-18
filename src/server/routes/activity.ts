import { Router, type Request, type Response } from "express";
import type { Pool } from "pg";
import { z } from "zod";
import type { ActivityListResponse } from "../../types/domain";
import { requireWorkspacePermission } from "../auth/middleware";
import { listWorkspaceActivity } from "../services/activity";
import { validateRequest } from "../validation";

const paramsSchema = z.object({
  workspaceId: z.string().uuid(),
});

export function createActivityRouter(dbPool: Pool): Router {
  const router = Router();

  router.get(
    "/workspaces/:workspaceId/activity",
    validateRequest("params", paramsSchema),
    ...requireWorkspacePermission(dbPool, "documents.view", (req) => String(req.params.workspaceId)),
    async (req: Request, res: Response, next) => {
      try {
        const { workspaceId } = req.params as z.infer<typeof paramsSchema>;
        const activity = await listWorkspaceActivity(dbPool, workspaceId);
        const response: ActivityListResponse = { activity };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
