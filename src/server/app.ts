import cookieParser from "cookie-parser";
import express from "express";
import { config } from "./config";
import { dbPool } from "./db/pool";
import { errorHandler, notFound } from "./errors";
import { createAppShellRouter } from "./routes/app-shell";
import { createAuthRouter } from "./routes/auth";
import { createHealthRouter } from "./routes/health";
import { createInvitationsRouter } from "./routes/invitations";
import { createWorkspacesRouter } from "./routes/workspaces";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", true);
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    const origin = req.header("Origin");

    if (origin && origin === config.corsOrigin) {
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
  apiRouter.use(createAppShellRouter(dbPool));

  app.use("/api", apiRouter);
  app.use((_req, _res, next) => next(notFound()));
  app.use(errorHandler);

  return app;
}
