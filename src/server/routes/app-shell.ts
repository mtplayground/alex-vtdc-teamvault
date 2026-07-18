import { Router } from "express";
import type { Pool } from "pg";
import { z } from "zod";
import type { AppShellData } from "../../types/domain";
import { getAuthenticatedSession } from "../auth/session";
import { ApiError } from "../errors";
import { validateRequest } from "../validation";

const querySchema = z.object({
  workspaceId: z.string().uuid().optional(),
});

const shellData: AppShellData = {
  currentUser: {
    name: "Workspace Owner",
    email: "owner@example.com",
  },
  workspace: {
    id: "preview-workspace",
    name: "Acme Legal Review",
    role: "owner",
    memberCount: 8,
    projectCount: 4,
    documentCount: 32,
  },
  projects: [
    {
      id: "project-1",
      name: "Board approvals",
      documentCount: 12,
      updatedAt: "Today",
      visibility: "workspace",
    },
    {
      id: "project-2",
      name: "Vendor diligence",
      documentCount: 9,
      updatedAt: "Yesterday",
      visibility: "guest-scoped",
    },
    {
      id: "project-3",
      name: "Policy archive",
      documentCount: 11,
      updatedAt: "Jul 15",
      visibility: "workspace",
    },
  ],
  activity: [
    {
      id: "activity-1",
      actor: "Mira Lee",
      action: "uploaded",
      target: "Vendor agreement.pdf",
      role: "member",
      occurredAt: "10:42",
    },
    {
      id: "activity-2",
      actor: "Jon Bell",
      action: "viewed",
      target: "Board packet.pdf",
      role: "guest",
      occurredAt: "09:15",
    },
    {
      id: "activity-3",
      actor: "Avery Hart",
      action: "created project",
      target: "Policy archive",
      role: "owner",
      occurredAt: "Yesterday",
    },
  ],
};

export function createAppShellRouter(dbPool?: Pool): Router {
  const router = Router();

  router.get("/app-shell", validateRequest("query", querySchema), async (req, res, next) => {
    try {
      if (dbPool) {
        const session = await getAuthenticatedSession(req, dbPool);

        if (!session) {
          throw new ApiError(401, "unauthenticated", "Sign in is required.");
        }

        if (!session.user.emailVerified) {
          throw new ApiError(403, "email_unverified", "Email verification is required.");
        }

        res.json({
          ...shellData,
          currentUser: {
            name: session.user.name ?? session.user.email,
            email: session.user.email,
            pictureUrl: session.user.pictureUrl,
          },
        });
        return;
      }

      res.json(shellData);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
