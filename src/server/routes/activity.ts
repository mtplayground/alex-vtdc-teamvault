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

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export function createActivityRouter(dbPool: Pool): Router {
  const router = Router();

  router.get(
    "/workspaces/:workspaceId/activity",
    validateRequest("params", paramsSchema),
    validateRequest("query", querySchema),
    ...requireWorkspacePermission(dbPool, "documents.view", (req) => String(req.params.workspaceId)),
    async (req: Request, res: Response, next) => {
      try {
        const { limit, offset } = req.query as unknown as z.infer<typeof querySchema>;
        const response: ActivityListResponse = await listWorkspaceActivity(dbPool, req.workspaceMembership!, {
          limit,
          offset,
        });
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
