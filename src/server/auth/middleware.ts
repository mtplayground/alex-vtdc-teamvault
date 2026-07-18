import type { NextFunction, Request, Response } from "express";
import type { Pool } from "pg";
import { ApiError } from "../errors";
import { getAuthenticatedSession, type AuthenticatedSession } from "./session";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedSession;
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
