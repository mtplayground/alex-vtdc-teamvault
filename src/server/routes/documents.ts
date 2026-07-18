import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import type { Pool } from "pg";
import { z } from "zod";
import type {
  DocumentAccessResponse,
  DocumentListResponse,
  DocumentResponse,
  ShareDocumentResponse,
  UploadDocumentResponse,
} from "../../types/domain";
import { requireWorkspacePermission } from "../auth/middleware";
import { ApiError } from "../errors";
import {
  createWorkspaceProjectDocumentAccess,
  getWorkspaceProjectDocument,
  listWorkspaceProjectDocuments,
  MAX_DOCUMENT_BYTES,
  shareWorkspaceProjectDocument,
  uploadWorkspaceProjectDocument,
} from "../services/documents";
import { validateRequest } from "../validation";

const paramsSchema = z.object({
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
});

const documentParamsSchema = paramsSchema.extend({
  documentId: z.string().uuid(),
});

const shareDocumentSchema = z.object({
  email: z.string().trim().email(),
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_DOCUMENT_BYTES,
    files: 1,
  },
}).single("file");

function parseUpload(req: Request, res: Response, next: NextFunction) {
  upload(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(new ApiError(400, "document_too_large", "Uploaded files must be 10 MB or smaller."));
      return;
    }

    if (error) {
      next(error);
      return;
    }

    next();
  });
}

export function createDocumentsRouter(dbPool: Pool): Router {
  const router = Router();

  router.get(
    "/workspaces/:workspaceId/projects/:projectId/documents",
    validateRequest("params", paramsSchema),
    ...requireWorkspacePermission(dbPool, "documents.view", (req) => String(req.params.workspaceId)),
    async (req: Request, res: Response, next) => {
      try {
        const { projectId } = req.params as z.infer<typeof paramsSchema>;
        const documents = await listWorkspaceProjectDocuments(dbPool, req.workspaceMembership!, projectId);
        const response: DocumentListResponse = { documents };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/workspaces/:workspaceId/projects/:projectId/documents",
    validateRequest("params", paramsSchema),
    ...requireWorkspacePermission(dbPool, "documents.upload", (req) => String(req.params.workspaceId)),
    parseUpload,
    async (req: Request, res: Response, next) => {
      try {
        const { projectId } = req.params as z.infer<typeof paramsSchema>;

        if (!req.file) {
          throw new ApiError(400, "document_required", "Choose a PDF or image file to upload.");
        }

        const document = await uploadWorkspaceProjectDocument(dbPool, {
          membership: req.workspaceMembership!,
          projectId,
          uploaderSub: req.auth!.user.sub,
          file: req.file,
        });
        const response: UploadDocumentResponse = { document };
        res.status(201).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/workspaces/:workspaceId/projects/:projectId/documents/:documentId",
    validateRequest("params", documentParamsSchema),
    ...requireWorkspacePermission(dbPool, "documents.view", (req) => String(req.params.workspaceId)),
    async (req: Request, res: Response, next) => {
      try {
        const { projectId, documentId } = req.params as z.infer<typeof documentParamsSchema>;
        const document = await getWorkspaceProjectDocument(
          dbPool,
          req.workspaceMembership!,
          projectId,
          documentId,
        );
        const response: DocumentResponse = { document };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/workspaces/:workspaceId/projects/:projectId/documents/:documentId/preview-url",
    validateRequest("params", documentParamsSchema),
    ...requireWorkspacePermission(dbPool, "documents.view", (req) => String(req.params.workspaceId)),
    async (req: Request, res: Response, next) => {
      try {
        const { projectId, documentId } = req.params as z.infer<typeof documentParamsSchema>;
        const response: DocumentAccessResponse = await createWorkspaceProjectDocumentAccess(dbPool, {
          membership: req.workspaceMembership!,
          actorSub: req.auth!.user.sub,
          projectId,
          documentId,
          disposition: "inline",
        });
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/workspaces/:workspaceId/projects/:projectId/documents/:documentId/download-url",
    validateRequest("params", documentParamsSchema),
    ...requireWorkspacePermission(dbPool, "documents.download", (req) => String(req.params.workspaceId)),
    async (req: Request, res: Response, next) => {
      try {
        const { projectId, documentId } = req.params as z.infer<typeof documentParamsSchema>;
        const response: DocumentAccessResponse = await createWorkspaceProjectDocumentAccess(dbPool, {
          membership: req.workspaceMembership!,
          actorSub: req.auth!.user.sub,
          projectId,
          documentId,
          disposition: "attachment",
        });
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/workspaces/:workspaceId/projects/:projectId/documents/:documentId/share",
    validateRequest("params", documentParamsSchema),
    ...requireWorkspacePermission(dbPool, "documents.organize", (req) => String(req.params.workspaceId)),
    validateRequest("body", shareDocumentSchema),
    async (req: Request, res: Response, next) => {
      try {
        const { projectId, documentId } = req.params as z.infer<typeof documentParamsSchema>;
        const { email } = req.body as z.infer<typeof shareDocumentSchema>;
        const response: ShareDocumentResponse = await shareWorkspaceProjectDocument(dbPool, {
          membership: req.workspaceMembership!,
          actorSub: req.auth!.user.sub,
          actorName: req.auth!.user.name ?? req.auth!.user.email,
          projectId,
          documentId,
          recipientEmail: email,
        });
        res.status(201).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
