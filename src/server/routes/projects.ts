import { Router, type Request, type Response } from "express";
import type { Pool } from "pg";
import { z } from "zod";
import type { ProjectListResponse, ProjectResponse } from "../../types/domain";
import { requireWorkspacePermission } from "../auth/middleware";
import {
  archiveWorkspaceProject,
  createWorkspaceProject,
  getWorkspaceProject,
  listWorkspaceProjects,
  renameWorkspaceProject,
} from "../services/projects";
import { validateRequest } from "../validation";

const workspaceParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});

const projectParamsSchema = workspaceParamsSchema.extend({
  projectId: z.string().uuid(),
});

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(160),
});

const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(160),
});

export function createProjectsRouter(dbPool: Pool): Router {
  const router = Router();

  router.get(
    "/workspaces/:workspaceId/projects",
    validateRequest("params", workspaceParamsSchema),
    ...requireWorkspacePermission(dbPool, "documents.view", (req) => String(req.params.workspaceId)),
    async (req: Request, res: Response, next) => {
      try {
        const projects = await listWorkspaceProjects(dbPool, req.workspaceMembership!);
        const response: ProjectListResponse = { projects };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/workspaces/:workspaceId/projects",
    validateRequest("params", workspaceParamsSchema),
    ...requireWorkspacePermission(dbPool, "projects.create", (req) => String(req.params.workspaceId)),
    validateRequest("body", createProjectSchema),
    async (req: Request, res: Response, next) => {
      try {
        const { workspaceId } = req.params as z.infer<typeof workspaceParamsSchema>;
        const { name } = req.body as z.infer<typeof createProjectSchema>;
        const project = await createWorkspaceProject(dbPool, {
          workspaceId,
          name,
          actorSub: req.auth!.user.sub,
        });
        const response: ProjectResponse = { project };
        res.status(201).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/workspaces/:workspaceId/projects/:projectId",
    validateRequest("params", projectParamsSchema),
    ...requireWorkspacePermission(dbPool, "documents.view", (req) => String(req.params.workspaceId)),
    async (req: Request, res: Response, next) => {
      try {
        const { projectId } = req.params as z.infer<typeof projectParamsSchema>;
        const project = await getWorkspaceProject(dbPool, req.workspaceMembership!, projectId);
        const response: ProjectResponse = { project };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/workspaces/:workspaceId/projects/:projectId",
    validateRequest("params", projectParamsSchema),
    ...requireWorkspacePermission(dbPool, "projects.manage", (req) => String(req.params.workspaceId)),
    validateRequest("body", updateProjectSchema),
    async (req: Request, res: Response, next) => {
      try {
        const { workspaceId, projectId } = req.params as z.infer<typeof projectParamsSchema>;
        const { name } = req.body as z.infer<typeof updateProjectSchema>;
        await renameWorkspaceProject(dbPool, {
          workspaceId,
          projectId,
          name,
          actorSub: req.auth!.user.sub,
        });
        const project = await getWorkspaceProject(dbPool, req.workspaceMembership!, projectId);
        res.json({ project });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/workspaces/:workspaceId/projects/:projectId",
    validateRequest("params", projectParamsSchema),
    ...requireWorkspacePermission(dbPool, "projects.manage", (req) => String(req.params.workspaceId)),
    async (req: Request, res: Response, next) => {
      try {
        const { workspaceId, projectId } = req.params as z.infer<typeof projectParamsSchema>;
        await archiveWorkspaceProject(dbPool, {
          workspaceId,
          projectId,
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
