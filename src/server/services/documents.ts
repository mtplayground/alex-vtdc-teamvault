import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { DocumentSummary } from "../../types/domain";
import {
  createDocument,
  getProjectForWorkspace,
  listDocumentsForProject,
  recordActivity,
} from "../db/repositories";
import type { DocumentKind, WorkspaceMembershipRecord } from "../db/types";
import { ApiError } from "../errors";
import { deleteObject, putObject } from "../storage/client";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const allowedContentTypes: Record<string, DocumentKind> = {
  "application/pdf": "pdf",
  "image/gif": "image",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
};

function toDocumentSummary(
  document: Awaited<ReturnType<typeof listDocumentsForProject>>[number],
): DocumentSummary {
  return {
    id: document.id,
    projectId: document.projectId,
    originalFilename: document.originalFilename,
    contentType: document.contentType,
    kind: document.kind,
    sizeBytes: Number(document.sizeBytes),
    uploadedAt: document.createdAt.toISOString(),
    uploaderName: document.uploaderName,
    uploaderEmail: document.uploaderEmail,
  };
}

function safeFilename(filename: string): string {
  const clean = filename.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return clean.slice(0, 120) || "document";
}

function validateUpload(file: Express.Multer.File): DocumentKind {
  const kind = allowedContentTypes[file.mimetype];

  if (!kind) {
    throw new ApiError(400, "unsupported_document_type", "Only PDF and image files can be uploaded.");
  }

  if (file.size <= 0) {
    throw new ApiError(400, "empty_document", "Uploaded file is empty.");
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new ApiError(400, "document_too_large", "Uploaded files must be 10 MB or smaller.");
  }

  return kind;
}

export async function listWorkspaceProjectDocuments(
  dbPool: Pool,
  membership: WorkspaceMembershipRecord,
  projectId: string,
): Promise<DocumentSummary[]> {
  const project = await getProjectForWorkspace(dbPool, {
    workspaceId: membership.workspaceId,
    projectId,
    userSub: membership.userSub,
    role: membership.role,
  });

  if (!project) {
    throw new ApiError(404, "project_not_found", "Project was not found.");
  }

  const documents = await listDocumentsForProject(dbPool, {
    workspaceId: membership.workspaceId,
    projectId,
  });

  return documents.map(toDocumentSummary);
}

export async function uploadWorkspaceProjectDocument(
  dbPool: Pool,
  input: {
    membership: WorkspaceMembershipRecord;
    projectId: string;
    uploaderSub: string;
    file: Express.Multer.File;
  },
): Promise<DocumentSummary> {
  const project = await getProjectForWorkspace(dbPool, {
    workspaceId: input.membership.workspaceId,
    projectId: input.projectId,
    userSub: input.membership.userSub,
    role: input.membership.role,
  });

  if (!project) {
    throw new ApiError(404, "project_not_found", "Project was not found.");
  }

  const kind = validateUpload(input.file);
  const storageKey = [
    "workspaces",
    input.membership.workspaceId,
    "projects",
    input.projectId,
    "documents",
    `${randomUUID()}-${safeFilename(input.file.originalname)}`,
  ].join("/");

  await putObject({
    Key: storageKey,
    Body: input.file.buffer,
    ContentLength: input.file.size,
    ContentType: input.file.mimetype,
  });

  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");
    const document = await createDocument(client, {
      workspaceId: input.membership.workspaceId,
      projectId: input.projectId,
      uploaderSub: input.uploaderSub,
      originalFilename: input.file.originalname,
      contentType: input.file.mimetype,
      kind,
      sizeBytes: input.file.size,
      storageKey,
    });

    await recordActivity(client, {
      workspaceId: input.membership.workspaceId,
      actorSub: input.uploaderSub,
      action: "document_uploaded",
      targetType: "document",
      targetId: document.id,
      metadata: {
        documentName: document.originalFilename,
        projectId: input.projectId,
        projectName: project.name,
        sizeBytes: input.file.size,
      },
    });

    await client.query("COMMIT");

    return {
      id: document.id,
      projectId: document.projectId,
      originalFilename: document.originalFilename,
      contentType: document.contentType,
      kind: document.kind,
      sizeBytes: Number(document.sizeBytes),
      uploadedAt: document.createdAt.toISOString(),
      uploaderName: null,
      uploaderEmail: null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    await deleteObject(storageKey).catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
