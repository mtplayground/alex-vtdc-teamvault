import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { DocumentAccessResponse, DocumentSummary, ShareDocumentResponse } from "../../types/domain";
import { config } from "../config";
import {
  createDocument,
  findWorkspaceMemberByEmail,
  getDocumentForProject,
  getProjectForWorkspace,
  grantProjectGuestAccess,
  listDocumentsForProject,
  recordActivity,
} from "../db/repositories";
import type { DocumentKind, WorkspaceMembershipRecord } from "../db/types";
import { emailSender } from "../email/client";
import { buildDocumentSharedEmail, toSendEmailInput } from "../email/templates";
import { ApiError } from "../errors";
import { deleteObject, getReadUrl, putObject } from "../storage/client";
import { listUserWorkspaces } from "./workspaces";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const DOCUMENT_ACCESS_SECONDS = 300;

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

function contentDisposition(disposition: "inline" | "attachment", filename: string): string {
  const safe = safeFilename(filename).replace(/"/g, "");
  return `${disposition}; filename="${safe}"`;
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

export async function getWorkspaceProjectDocument(
  dbPool: Pool,
  membership: WorkspaceMembershipRecord,
  projectId: string,
  documentId: string,
): Promise<DocumentSummary> {
  const project = await getProjectForWorkspace(dbPool, {
    workspaceId: membership.workspaceId,
    projectId,
    userSub: membership.userSub,
    role: membership.role,
  });

  if (!project) {
    throw new ApiError(404, "project_not_found", "Project was not found.");
  }

  const document = await getDocumentForProject(dbPool, {
    workspaceId: membership.workspaceId,
    projectId,
    documentId,
  });

  if (!document) {
    throw new ApiError(404, "document_not_found", "Document was not found.");
  }

  return toDocumentSummary(document);
}

export async function createWorkspaceProjectDocumentAccess(
  dbPool: Pool,
  input: {
    membership: WorkspaceMembershipRecord;
    actorSub: string;
    projectId: string;
    documentId: string;
    disposition: "inline" | "attachment";
  },
): Promise<DocumentAccessResponse> {
  const project = await getProjectForWorkspace(dbPool, {
    workspaceId: input.membership.workspaceId,
    projectId: input.projectId,
    userSub: input.membership.userSub,
    role: input.membership.role,
  });

  if (!project) {
    throw new ApiError(404, "project_not_found", "Project was not found.");
  }

  const document = await getDocumentForProject(dbPool, {
    workspaceId: input.membership.workspaceId,
    projectId: input.projectId,
    documentId: input.documentId,
  });

  if (!document) {
    throw new ApiError(404, "document_not_found", "Document was not found.");
  }

  const url = await getReadUrl(document.storageKey, {
    expiresInSeconds: DOCUMENT_ACCESS_SECONDS,
    contentDisposition: contentDisposition(input.disposition, document.originalFilename),
    contentType: document.contentType,
  });

  if (input.disposition === "attachment") {
    await recordActivity(dbPool, {
      workspaceId: input.membership.workspaceId,
      actorSub: input.actorSub,
      action: "document_downloaded",
      targetType: "document",
      targetId: document.id,
      metadata: {
        documentName: document.originalFilename,
        projectId: input.projectId,
        projectName: project.name,
      },
    });
  }

  return {
    url,
    expiresAt: new Date(Date.now() + DOCUMENT_ACCESS_SECONDS * 1000).toISOString(),
    disposition: input.disposition,
  };
}

export async function shareWorkspaceProjectDocument(
  dbPool: Pool,
  input: {
    membership: WorkspaceMembershipRecord;
    actorSub: string;
    actorName: string;
    projectId: string;
    documentId: string;
    recipientEmail: string;
  },
): Promise<ShareDocumentResponse> {
  const workspace = (await listUserWorkspaces(dbPool, input.actorSub)).find(
    (item) => item.id === input.membership.workspaceId,
  );
  const project = await getProjectForWorkspace(dbPool, {
    workspaceId: input.membership.workspaceId,
    projectId: input.projectId,
    userSub: input.membership.userSub,
    role: input.membership.role,
  });

  if (!workspace || !project) {
    throw new ApiError(404, "project_not_found", "Project was not found.");
  }

  const document = await getDocumentForProject(dbPool, {
    workspaceId: input.membership.workspaceId,
    projectId: input.projectId,
    documentId: input.documentId,
  });

  if (!document) {
    throw new ApiError(404, "document_not_found", "Document was not found.");
  }

  const recipient = await findWorkspaceMemberByEmail(dbPool, {
    workspaceId: input.membership.workspaceId,
    email: input.recipientEmail,
  });

  if (!recipient) {
    throw new ApiError(404, "recipient_not_found", "Share with an existing workspace member or guest.");
  }

  const client = await dbPool.connect();
  let projectAccessGranted = false;

  try {
    await client.query("BEGIN");

    if (recipient.role === "guest") {
      projectAccessGranted = await grantProjectGuestAccess(client, {
        workspaceId: input.membership.workspaceId,
        projectId: input.projectId,
        userSub: recipient.sub,
        grantedBySub: input.actorSub,
      });
    }

    await recordActivity(client, {
      workspaceId: input.membership.workspaceId,
      actorSub: input.actorSub,
      action: "document_shared",
      targetType: "document",
      targetId: document.id,
      metadata: {
        documentName: document.originalFilename,
        projectId: input.projectId,
        projectName: project.name,
        recipientEmail: recipient.email,
        recipientRole: recipient.role,
        projectAccessGranted,
      },
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const documentUrl = new URL(`/projects/${input.projectId}/documents/${input.documentId}`, config.selfUrl);
  const template = buildDocumentSharedEmail({
    documentUrl: documentUrl.toString(),
    sharedByName: input.actorName,
    workspaceName: workspace.name,
    projectName: project.name,
    documentName: document.originalFilename,
  });
  const emailResult = await emailSender.send(toSendEmailInput(recipient.email, template));

  return {
    recipientEmail: recipient.email,
    projectAccessGranted,
    emailStatus: emailResult.status,
  };
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
