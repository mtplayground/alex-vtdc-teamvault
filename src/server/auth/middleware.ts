import type { NextFunction, Request, Response } from "express";
import type { Pool } from "pg";
import type { Permission } from "../../authorization/permissions";
import { hasPermission } from "../../authorization/permissions";
import { getWorkspaceMembership } from "../db/repositories";
import type { WorkspaceMembershipRecord } from "../db/types";
import { ApiError } from "../errors";
import { getAuthenticatedSession, type AuthenticatedSession } from "./session";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedSession;
      workspaceMembership?: WorkspaceMembershipRecord | null;
    }
  }
}

export function requireAuthenticatedSession(dbPool: Pool) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const session = await getAuthenticatedSession(req, dbPool);

      if (!session) {
        next(new ApiError(401, "unauthenticated", "Sign in is required."));
        return;
      }

      req.auth = session;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireVerifiedSession(dbPool: Pool) {
  return [
    requireAuthenticatedSession(dbPool),
    (req: Request, _res: Response, next: NextFunction) => {
      if (!req.auth?.user.emailVerified) {
        next(new ApiError(403, "email_unverified", "Email verification is required."));
        return;
      }

      next();
    },
  ];
}

export function requireWorkspacePermission(
  dbPool: Pool,
  permission: Permission,
  getWorkspaceId: (req: Request) => string | undefined,
) {
  return [
    ...requireVerifiedSession(dbPool),
    async (req: Request, _res: Response, next: NextFunction) => {
      try {
        const workspaceId = getWorkspaceId(req);

        if (!workspaceId) {
          next(new ApiError(400, "workspace_required", "A workspace is required."));
          return;
        }

        const membership = await getWorkspaceMembership(dbPool, {
          workspaceId,
          userSub: req.auth!.user.sub,
        });

        if (!membership || !hasPermission(membership.role, permission)) {
          next(new ApiError(403, "forbidden", "You do not have permission to perform this action."));
          return;
        }

        req.workspaceMembership = membership;
        next();
      } catch (error) {
        next(error);
      }
    },
  ];
}
