import type { Pool, PoolClient, QueryResultRow } from "pg";
import type {
  ActivityAction,
  ActivityEntryRecord,
  DocumentKind,
  DocumentRecord,
  InvitationRecord,
  ProjectRecord,
  UserRecord,
  WorkspaceMembershipRecord,
  WorkspaceRecord,
  WorkspaceRole,
} from "./types";

type Queryable = Pick<Pool | PoolClient, "query">;

function requireOne<T extends QueryResultRow>(rows: T[], entityName: string): T {
  const row = rows[0];
  if (!row) {
    throw new Error(`${entityName} was not created.`);
  }

  return row;
}

function mapUser(row: QueryResultRow): UserRecord {
  return {
    sub: row.sub,
    email: row.email,
    emailVerified: row.email_verified,
    name: row.name,
    pictureUrl: row.picture_url,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  };
}

function mapWorkspace(row: QueryResultRow): WorkspaceRecord {
  return {
    id: row.id,
    name: row.name,
    createdBySub: row.created_by_sub,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMembership(row: QueryResultRow): WorkspaceMembershipRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userSub: row.user_sub,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProject(row: QueryResultRow): ProjectRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    createdBySub: row.created_by_sub,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDocument(row: QueryResultRow): DocumentRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    uploaderSub: row.uploader_sub,
    originalFilename: row.original_filename,
    contentType: row.content_type,
    kind: row.kind,
    sizeBytes: row.size_bytes,
    storageKey: row.storage_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapInvitation(row: QueryResultRow): InvitationRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    invitedBySub: row.invited_by_sub,
    acceptedUserSub: row.accepted_user_sub,
    email: row.email,
    role: row.role,
    tokenHash: row.token_hash,
    status: row.status,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapActivity(row: QueryResultRow): ActivityEntryRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    actorSub: row.actor_sub,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export async function upsertUser(
  db: Queryable,
  input: {
    sub: string;
    email: string;
    emailVerified?: boolean;
    name?: string | null;
    pictureUrl?: string | null;
  },
): Promise<UserRecord> {
  const result = await db.query(
    `
      INSERT INTO users (sub, email, email_verified, name, picture_url)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (sub) DO UPDATE
      SET email = EXCLUDED.email,
          email_verified = EXCLUDED.email_verified,
          name = EXCLUDED.name,
          picture_url = EXCLUDED.picture_url,
          last_seen_at = NOW()
      RETURNING *
    `,
    [input.sub, input.email, input.emailVerified ?? false, input.name ?? null, input.pictureUrl ?? null],
  );

  return mapUser(requireOne(result.rows, "User"));
}

export async function createWorkspace(
  db: Queryable,
  input: { name: string; createdBySub: string },
): Promise<WorkspaceRecord> {
  const result = await db.query(
    `
      INSERT INTO workspaces (name, created_by_sub)
      VALUES ($1, $2)
      RETURNING *
    `,
    [input.name, input.createdBySub],
  );

  return mapWorkspace(requireOne(result.rows, "Workspace"));
}

export async function createWorkspaceMembership(
  db: Queryable,
  input: { workspaceId: string; userSub: string; role: WorkspaceRole },
): Promise<WorkspaceMembershipRecord> {
  const result = await db.query(
    `
      INSERT INTO workspace_memberships (workspace_id, user_sub, role)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [input.workspaceId, input.userSub, input.role],
  );

  return mapMembership(requireOne(result.rows, "Workspace membership"));
}

export async function createProject(
  db: Queryable,
  input: { workspaceId: string; name: string; createdBySub?: string | null },
): Promise<ProjectRecord> {
  const result = await db.query(
    `
      INSERT INTO projects (workspace_id, name, created_by_sub)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [input.workspaceId, input.name, input.createdBySub ?? null],
  );

  return mapProject(requireOne(result.rows, "Project"));
}

export async function createDocument(
  db: Queryable,
  input: {
    workspaceId: string;
    projectId: string;
    uploaderSub?: string | null;
    originalFilename: string;
    contentType: string;
    kind: DocumentKind;
    sizeBytes: number;
    storageKey: string;
  },
): Promise<DocumentRecord> {
  const result = await db.query(
    `
      INSERT INTO documents (
        workspace_id,
        project_id,
        uploader_sub,
        original_filename,
        content_type,
        kind,
        size_bytes,
        storage_key
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [
      input.workspaceId,
      input.projectId,
      input.uploaderSub ?? null,
      input.originalFilename,
      input.contentType,
      input.kind,
      input.sizeBytes,
      input.storageKey,
    ],
  );

  return mapDocument(requireOne(result.rows, "Document"));
}

export async function createInvitation(
  db: Queryable,
  input: {
    workspaceId: string;
    invitedBySub: string;
    email: string;
    role: WorkspaceRole;
    tokenHash: string;
    expiresAt: Date;
  },
): Promise<InvitationRecord> {
  const result = await db.query(
    `
      INSERT INTO invitations (workspace_id, invited_by_sub, email, role, token_hash, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [input.workspaceId, input.invitedBySub, input.email, input.role, input.tokenHash, input.expiresAt],
  );

  return mapInvitation(requireOne(result.rows, "Invitation"));
}

export async function recordActivity(
  db: Queryable,
  input: {
    workspaceId: string;
    actorSub?: string | null;
    action: ActivityAction;
    targetType: string;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<ActivityEntryRecord> {
  const result = await db.query(
    `
      INSERT INTO activity_entries (workspace_id, actor_sub, action, target_type, target_id, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [
      input.workspaceId,
      input.actorSub ?? null,
      input.action,
      input.targetType,
      input.targetId ?? null,
      input.metadata ?? {},
    ],
  );

  return mapActivity(requireOne(result.rows, "Activity entry"));
}
