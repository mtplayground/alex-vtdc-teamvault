import { Router, type Request, type Response } from "express";
import type { Pool } from "pg";
import { z } from "zod";
import { requireWorkspacePermission } from "../auth/middleware";
import { changeWorkspaceMemberRole, getWorkspaceRoster, removeWorkspaceMember } from "../services/roster";
import { validateRequest } from "../validation";

const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});

const memberParamsSchema = workspaceParamsSchema.extend({
  userSub: z.string().min(1),
});

const changeRoleSchema = z.object({
  role: z.enum(["owner", "member", "guest"]),
});

export function createRosterRouter(dbPool: Pool): Router {
  const router = Router();

  router.get(
    "/workspaces/:workspaceId/roster",
    validateRequest("params", workspaceParamsSchema),
    ...requireWorkspacePermission(dbPool, "documents.view", (req) => String(req.params.workspaceId)),
    async (req: Request, res: Response, next) => {
      try {
        const { workspaceId } = req.params as z.infer<typeof workspaceParamsSchema>;
        const roster = await getWorkspaceRoster(dbPool, workspaceId);
        res.json(roster);
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/workspaces/:workspaceId/members/:userSub",
    validateRequest("params", memberParamsSchema),
    ...requireWorkspacePermission(dbPool, "roles.manage", (req) => String(req.params.workspaceId)),
    validateRequest("body", changeRoleSchema),
    async (req: Request, res: Response, next) => {
      try {
        const { workspaceId, userSub } = req.params as z.infer<typeof memberParamsSchema>;
        const { role } = req.body as z.infer<typeof changeRoleSchema>;
        const updated = await changeWorkspaceMemberRole(dbPool, {
          workspaceId,
          userSub,
          role,
          actorSub: req.auth!.user.sub,
        });
        res.json(updated);
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/workspaces/:workspaceId/members/:userSub",
    validateRequest("params", memberParamsSchema),
    ...requireWorkspacePermission(dbPool, "members.manage", (req) => String(req.params.workspaceId)),
    async (req: Request, res: Response, next) => {
      try {
        const { workspaceId, userSub } = req.params as z.infer<typeof memberParamsSchema>;
        await removeWorkspaceMember(dbPool, {
          workspaceId,
          userSub,
          actorSub: req.auth!.user.sub,
        });
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
