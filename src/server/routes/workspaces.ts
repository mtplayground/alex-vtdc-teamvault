import { Router, type Request, type Response } from "express";
import type { Pool } from "pg";
import { z } from "zod";
import type { WorkspaceListResponse } from "../../types/domain";
import { requireVerifiedSession } from "../auth/middleware";
import { createOwnedWorkspace, listUserWorkspaces } from "../services/workspaces";
import { validateRequest } from "../validation";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export function createWorkspacesRouter(dbPool: Pool): Router {
  const router = Router();

  router.get("/workspaces", ...requireVerifiedSession(dbPool), async (req: Request, res: Response, next) => {
    try {
      const workspaces = await listUserWorkspaces(dbPool, req.auth!.user.sub);
      const response: WorkspaceListResponse = { workspaces };
      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/workspaces",
    ...requireVerifiedSession(dbPool),
    validateRequest("body", createWorkspaceSchema),
    async (req: Request, res: Response, next) => {
      try {
        const { name } = req.body as z.infer<typeof createWorkspaceSchema>;
        const workspace = await createOwnedWorkspace(dbPool, {
          name,
          ownerSub: req.auth!.user.sub,
        });
        const workspaces = await listUserWorkspaces(dbPool, req.auth!.user.sub);

        res.status(201).json({
          workspaceId: workspace.id,
          workspaces,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
