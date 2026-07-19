import { existsSync } from "node:fs";
import path from "node:path";
import cookieParser from "cookie-parser";
import express from "express";
import { config } from "./config";
import { dbPool } from "./db/pool";
import { errorHandler, notFound } from "./errors";
import { createActivityRouter } from "./routes/activity";
import { createAppShellRouter } from "./routes/app-shell";
import { createAuthRouter } from "./routes/auth";
import { createDocumentsRouter } from "./routes/documents";
import { createHealthRouter } from "./routes/health";
import { createInvitationsRouter } from "./routes/invitations";
import { createProjectsRouter } from "./routes/projects";
import { createRosterRouter } from "./routes/roster";
import { createWorkspacesRouter } from "./routes/workspaces";

const clientDistPath = path.resolve(process.cwd(), "dist");
const clientIndexPath = path.join(clientDistPath, "index.html");

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", true);
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    const origin = req.header("Origin");

    const publicHost = String(req.header("X-Forwarded-Host") ?? req.header("Host") ?? "")
      .split(",")[0]
      .trim()
      .toLowerCase()
      .replace(/:\d+$/, "");
    let originHost: string | null = null;

    if (origin) {
      try {
        originHost = new URL(origin).host.toLowerCase().replace(/:\d+$/, "");
      } catch {
        originHost = null;
      }
    }

    const configuredHosts = [config.corsOrigin, config.selfUrl]
      .map((value) => {
        try {
          return new URL(value).host.toLowerCase().replace(/:\d+$/, "");
        } catch {
          return value.toLowerCase().replace(/^https?:\/\//, "").replace(/:\d+$/, "");
        }
      });

    if (origin && originHost && (originHost === publicHost || configuredHosts.includes(originHost))) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Vary", "Origin");
    }

    res.header("Access-Control-Allow-Headers", "Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    next();
  });

  const apiRouter = express.Router();
  apiRouter.use(createHealthRouter(dbPool));
  apiRouter.use(createAuthRouter(dbPool));
  apiRouter.use(createWorkspacesRouter(dbPool));
  apiRouter.use(createInvitationsRouter(dbPool));
  apiRouter.use(createRosterRouter(dbPool));
  apiRouter.use(createProjectsRouter(dbPool));
  apiRouter.use(createDocumentsRouter(dbPool));
  apiRouter.use(createActivityRouter(dbPool));
  apiRouter.use(createAppShellRouter(dbPool));

  app.use("/api", apiRouter);

  if (existsSync(clientIndexPath)) {
    app.use(express.static(clientDistPath, { index: false, maxAge: config.nodeEnv === "production" ? "1h" : 0 }));
    app.get(/.*/, (req, res, next) => {
      if (req.path.startsWith("/api")) {
        next();
        return;
      }

      res.sendFile(clientIndexPath);
    });
  }

  app.use((_req, _res, next) => next(notFound()));
  app.use(errorHandler);

  return app;
}
