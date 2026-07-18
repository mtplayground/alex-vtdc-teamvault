import { Router } from "express";
import type { Pool } from "pg";
import { z } from "zod";
import { config } from "../config";
import { requireVerifiedSession } from "../auth/middleware";
import { getAuthenticatedSession } from "../auth/session";
import { ApiError } from "../errors";
import { validateRequest } from "../validation";

const redirectQuerySchema = z.object({
  return_to: z
    .string()
    .trim()
    .default("/")
    .refine((value) => value.startsWith("/") && !value.startsWith("//") && value !== "/api" && !value.startsWith("/api/"), {
      message: "return_to must be a frontend path.",
    }),
});

const passwordResetRequestSchema = z.object({
  email: z.string().trim().email(),
});

const resetRequestWindowMs = 15 * 60 * 1000;
const maxResetRequestsPerWindow = 5;
const resetRequestAttempts = new Map<string, { count: number; resetAt: number }>();

function buildLoginUrl(returnToPath: string): string {
  const returnTo = new URL(returnToPath, config.selfUrl);
  const loginUrl = new URL("/login", config.auth.url);
  loginUrl.searchParams.set("app_token", config.auth.appToken);
  loginUrl.searchParams.set("return_to", returnTo.toString());
  return loginUrl.toString();
}

function rateLimitResetRequest(ip: string | undefined, email: string) {
  const key = `${ip ?? "unknown"}:${email.toLowerCase()}`;
  const now = Date.now();
  const current = resetRequestAttempts.get(key);

  if (!current || current.resetAt <= now) {
    resetRequestAttempts.set(key, { count: 1, resetAt: now + resetRequestWindowMs });
    return;
  }

  if (current.count >= maxResetRequestsPerWindow) {
    throw new ApiError(429, "password_reset_rate_limited", "Too many reset requests. Try again shortly.");
  }

  current.count += 1;
}

export function createAuthRouter(dbPool: Pool): Router {
  const router = Router();

  router.get("/auth/login", validateRequest("query", redirectQuerySchema), (req, res) => {
    res.redirect(buildLoginUrl(req.query.return_to as string));
  });

  router.get("/auth/register", validateRequest("query", redirectQuerySchema), (req, res) => {
    res.redirect(buildLoginUrl(req.query.return_to as string));
  });

  router.get("/auth/password-reset", validateRequest("query", redirectQuerySchema), (req, res) => {
    res.redirect(buildLoginUrl(req.query.return_to as string));
  });

  router.post("/auth/password-reset/request", validateRequest("body", passwordResetRequestSchema), (req, res, next) => {
    try {
      const { email } = req.body as z.infer<typeof passwordResetRequestSchema>;
      rateLimitResetRequest(req.ip, email);

      res.json({
        status: "delegated",
        loginUrl: buildLoginUrl("/reset-password/complete"),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/session", async (req, res, next) => {
    try {
      const session = await getAuthenticatedSession(req, dbPool);

      if (!session) {
        res.status(401).json({
          authenticated: false,
          loginUrl: buildLoginUrl("/"),
        });
        return;
      }

      if (!session.user.emailVerified) {
        res.status(403).json({
          authenticated: true,
          verified: false,
          loginUrl: buildLoginUrl("/check-email"),
          user: {
            name: session.user.name,
            email: session.user.email,
            pictureUrl: session.user.pictureUrl,
          },
        });
        return;
      }

      res.json({
        authenticated: true,
        verified: true,
        registrationStatus: session.isNewRegistration ? "registered" : "returning",
        user: {
          name: session.user.name,
          email: session.user.email,
          pictureUrl: session.user.pictureUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/session/required", ...requireVerifiedSession(dbPool), (_req, res) => {
    res.json({ ok: true });
  });

  router.post("/auth/logout", (_req, res) => {
    res.clearCookie("mctai_session", {
      httpOnly: true,
      sameSite: "lax",
      secure: config.nodeEnv === "production",
      path: "/",
    });

    res.json({
      authenticated: false,
      loginUrl: buildLoginUrl("/login"),
    });
  });

  return router;
}
