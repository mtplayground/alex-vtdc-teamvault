import { Router, type Request, type Response } from "express";
import type { Pool } from "pg";
import { z } from "zod";
import { requireVerifiedSession, requireWorkspacePermission } from "../auth/middleware";
import { acceptWorkspaceInvitation, inviteWorkspaceMember } from "../services/invitations";
import { validateRequest } from "../validation";

const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});

const createInvitationSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["member", "guest"]),
});

const acceptInvitationSchema = z.object({
  token: z.string().trim().min(20),
});

export function createInvitationsRouter(dbPool: Pool): Router {
  const router = Router();

  router.post(
    "/workspaces/:workspaceId/invitations",
    validateRequest("params", workspaceParamsSchema),
    ...requireWorkspacePermission(dbPool, "members.manage", (req) => String(req.params.workspaceId)),
    validateRequest("body", createInvitationSchema),
    async (req: Request, res: Response, next) => {
      try {
        const { workspaceId } = req.params as z.infer<typeof workspaceParamsSchema>;
        const { email, role } = req.body as z.infer<typeof createInvitationSchema>;
        const result = await inviteWorkspaceMember(dbPool, {
          workspaceId,
          email,
          role,
          inviterSub: req.auth!.user.sub,
          inviterName: req.auth!.user.name ?? req.auth!.user.email,
        });

        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/invitations/accept",
    ...requireVerifiedSession(dbPool),
    validateRequest("body", acceptInvitationSchema),
    async (req: Request, res: Response, next) => {
      try {
        const { token } = req.body as z.infer<typeof acceptInvitationSchema>;
        const result = await acceptWorkspaceInvitation(dbPool, {
          token,
          userSub: req.auth!.user.sub,
          userEmail: req.auth!.user.email,
        });

        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
