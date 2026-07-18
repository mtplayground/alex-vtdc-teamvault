import { Router, type NextFunction, type Request, type Response } from "express";
import type { Pool } from "pg";
import { z } from "zod";
import { getPermissionsForRole } from "../../authorization/permissions";
import type { AppShellData } from "../../types/domain";
import { requireVerifiedSession } from "../auth/middleware";
import { getWorkspaceMembership } from "../db/repositories";
import { ApiError } from "../errors";
import { listWorkspaceActivity } from "../services/activity";
import { listWorkspaceProjects } from "../services/projects";
import { listUserWorkspaces } from "../services/workspaces";
import { validateRequest } from "../validation";

const querySchema = z.object({
  workspaceId: z.string().uuid().optional(),
});

const previewWorkspace = {
  id: "preview-workspace",
  name: "Acme Legal Review",
  role: "owner" as const,
  permissions: getPermissionsForRole("owner"),
  memberCount: 8,
  projectCount: 4,
  documentCount: 32,
};

const shellData: AppShellData = {
  currentUser: {
    name: "Workspace Owner",
    email: "owner@example.com",
  },
  workspace: previewWorkspace,
  workspaces: [previewWorkspace],
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

export function createAppShellRouter(dbPool: Pool): Router {
  const router = Router();

  router.get(
    "/app-shell",
    validateRequest("query", querySchema),
    ...requireVerifiedSession(dbPool),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const session = req.auth!;
        const workspaces = await listUserWorkspaces(dbPool, session.user.sub);
        const requestedWorkspaceId = req.query.workspaceId as string | undefined;
        const requestedWorkspace = requestedWorkspaceId
          ? workspaces.find((item) => item.id === requestedWorkspaceId)
          : undefined;

        if (requestedWorkspaceId && !requestedWorkspace) {
          throw new ApiError(403, "workspace_forbidden", "You do not have access to this workspace.");
        }

        const workspace = requestedWorkspace ?? workspaces[0] ?? null;
        const membership = workspace
          ? await getWorkspaceMembership(dbPool, { workspaceId: workspace.id, userSub: session.user.sub })
          : null;
        const projects = membership ? await listWorkspaceProjects(dbPool, membership) : [];
        const activity = workspace ? await listWorkspaceActivity(dbPool, workspace.id, 10) : [];

        res.json({
          ...shellData,
          currentUser: {
            name: session.user.name ?? session.user.email,
            email: session.user.email,
            pictureUrl: session.user.pictureUrl,
          },
          workspace,
          workspaces,
          projects,
          activity,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
