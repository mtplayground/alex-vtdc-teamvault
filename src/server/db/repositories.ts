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
import { getPermissionsForRole } from "../../authorization/permissions";

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

export async function upsertAuthenticatedUser(
  db: Queryable,
  input: {
    sub: string;
    email: string;
    emailVerified?: boolean;
    name?: string | null;
    pictureUrl?: string | null;
  },
): Promise<{ user: UserRecord; isNew: boolean }> {
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
      RETURNING *, (xmax = 0) AS inserted
    `,
    [input.sub, input.email, input.emailVerified ?? false, input.name ?? null, input.pictureUrl ?? null],
  );

  const row = requireOne(result.rows, "User");

  return {
    user: mapUser(row),
    isNew: row.inserted,
  };
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

export async function listWorkspaceSummariesForUser(db: Queryable, userSub: string) {
  const result = await db.query(
    `
      SELECT
        w.id,
        w.name,
        wm.role,
        COUNT(DISTINCT wm_all.id)::INT AS member_count,
        COUNT(DISTINCT p.id)::INT AS project_count,
        COUNT(DISTINCT d.id)::INT AS document_count,
        w.updated_at
      FROM workspace_memberships wm
      JOIN workspaces w ON w.id = wm.workspace_id
      LEFT JOIN workspace_memberships wm_all ON wm_all.workspace_id = w.id
      LEFT JOIN projects p ON p.workspace_id = w.id AND p.archived_at IS NULL
      LEFT JOIN documents d ON d.workspace_id = w.id AND d.deleted_at IS NULL
      WHERE wm.user_sub = $1
      GROUP BY w.id, w.name, wm.role, w.updated_at
      ORDER BY w.updated_at DESC, w.created_at DESC
    `,
    [userSub],
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role as WorkspaceRole,
    permissions: getPermissionsForRole(row.role as WorkspaceRole),
    memberCount: row.member_count,
    projectCount: row.project_count,
    documentCount: row.document_count,
  }));
}

export async function getWorkspaceMembership(
  db: Queryable,
  input: { workspaceId: string; userSub: string },
): Promise<WorkspaceMembershipRecord | null> {
  const result = await db.query(
    `
      SELECT *
      FROM workspace_memberships
      WHERE workspace_id = $1 AND user_sub = $2
    `,
    [input.workspaceId, input.userSub],
  );

  const row = result.rows[0];
  return row ? mapMembership(row) : null;
}

export async function listWorkspaceMembers(db: Queryable, workspaceId: string) {
  const result = await db.query(
    `
      SELECT
        u.sub,
        u.name,
        u.email,
        u.picture_url,
        wm.role,
        wm.created_at AS joined_at
      FROM workspace_memberships wm
      JOIN users u ON u.sub = wm.user_sub
      WHERE wm.workspace_id = $1
      ORDER BY
        CASE wm.role WHEN 'owner' THEN 1 WHEN 'member' THEN 2 ELSE 3 END,
        lower(u.email::TEXT)
    `,
    [workspaceId],
  );

  return result.rows.map((row) => ({
    sub: row.sub,
    name: row.name,
    email: row.email,
    pictureUrl: row.picture_url,
    role: row.role as WorkspaceRole,
    joinedAt: row.joined_at,
  }));
}

export async function listPendingWorkspaceInvitations(db: Queryable, workspaceId: string) {
  const result = await db.query(
    `
      SELECT id, email, role, expires_at, created_at
      FROM invitations
      WHERE workspace_id = $1
        AND status = 'pending'
        AND expires_at > NOW()
      ORDER BY created_at DESC
    `,
    [workspaceId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role as Exclude<WorkspaceRole, "owner">,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}

export async function countWorkspaceOwners(db: Queryable, workspaceId: string): Promise<number> {
  const result = await db.query(
    `
      SELECT COUNT(*)::INT AS owner_count
      FROM workspace_memberships
      WHERE workspace_id = $1 AND role = 'owner'
    `,
    [workspaceId],
  );

  return result.rows[0]?.owner_count ?? 0;
}

export async function updateWorkspaceMemberRole(
  db: Queryable,
  input: { workspaceId: string; userSub: string; role: WorkspaceRole },
): Promise<WorkspaceMembershipRecord | null> {
  const result = await db.query(
    `
      UPDATE workspace_memberships
      SET role = $3,
          updated_at = NOW()
      WHERE workspace_id = $1 AND user_sub = $2
      RETURNING *
    `,
    [input.workspaceId, input.userSub, input.role],
  );

  const row = result.rows[0];
  return row ? mapMembership(row) : null;
}

export async function deleteWorkspaceMember(
  db: Queryable,
  input: { workspaceId: string; userSub: string },
): Promise<WorkspaceMembershipRecord | null> {
  const result = await db.query(
    `
      DELETE FROM workspace_memberships
      WHERE workspace_id = $1 AND user_sub = $2
      RETURNING *
    `,
    [input.workspaceId, input.userSub],
  );

  const row = result.rows[0];
  return row ? mapMembership(row) : null;
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

export async function listProjectsForWorkspace(
  db: Queryable,
  input: { workspaceId: string; userSub: string; role: WorkspaceRole },
) {
  const guestFilter =
    input.role === "guest"
      ? `
        AND EXISTS (
          SELECT 1
          FROM project_guest_access pga
          WHERE pga.project_id = p.id
            AND pga.user_sub = $2
        )
      `
      : "";
  const params = input.role === "guest" ? [input.workspaceId, input.userSub] : [input.workspaceId];

  const result = await db.query(
    `
      SELECT
        p.id,
        p.workspace_id,
        p.name,
        p.created_by_sub,
        p.archived_at,
        p.created_at,
        p.updated_at,
        COUNT(d.id)::INT AS document_count,
        EXISTS (
          SELECT 1 FROM project_guest_access pga WHERE pga.project_id = p.id
        ) AS guest_scoped
      FROM projects p
      LEFT JOIN documents d ON d.project_id = p.id AND d.deleted_at IS NULL
      WHERE p.workspace_id = $1
        AND p.archived_at IS NULL
        ${guestFilter}
      GROUP BY p.id
      ORDER BY p.updated_at DESC, p.created_at DESC
    `,
    params,
  );

  return result.rows.map((row) => ({
    ...mapProject(row),
    documentCount: row.document_count,
    visibility: row.guest_scoped ? ("guest-scoped" as const) : ("workspace" as const),
  }));
}

export async function getProjectForWorkspace(
  db: Queryable,
  input: { workspaceId: string; projectId: string; userSub: string; role: WorkspaceRole },
) {
  const projects = await listProjectsForWorkspace(db, {
    workspaceId: input.workspaceId,
    userSub: input.userSub,
    role: input.role,
  });

  return projects.find((project) => project.id === input.projectId) ?? null;
}

export async function renameProject(
  db: Queryable,
  input: { workspaceId: string; projectId: string; name: string },
): Promise<ProjectRecord | null> {
  const result = await db.query(
    `
      UPDATE projects
      SET name = $3,
          updated_at = NOW()
      WHERE workspace_id = $1
        AND id = $2
        AND archived_at IS NULL
      RETURNING *
    `,
    [input.workspaceId, input.projectId, input.name],
  );

  const row = result.rows[0];
  return row ? mapProject(row) : null;
}

export async function archiveProject(
  db: Queryable,
  input: { workspaceId: string; projectId: string },
): Promise<ProjectRecord | null> {
  const result = await db.query(
    `
      UPDATE projects
      SET archived_at = NOW(),
          updated_at = NOW()
      WHERE workspace_id = $1
        AND id = $2
        AND archived_at IS NULL
      RETURNING *
    `,
    [input.workspaceId, input.projectId],
  );

  const row = result.rows[0];
  return row ? mapProject(row) : null;
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

export async function listDocumentsForProject(
  db: Queryable,
  input: { workspaceId: string; projectId: string },
) {
  const result = await db.query(
    `
      SELECT
        d.*,
        u.name AS uploader_name,
        u.email AS uploader_email
      FROM documents d
      LEFT JOIN users u ON u.sub = d.uploader_sub
      WHERE d.workspace_id = $1
        AND d.project_id = $2
        AND d.deleted_at IS NULL
      ORDER BY d.created_at DESC
    `,
    [input.workspaceId, input.projectId],
  );

  return result.rows.map((row) => ({
    ...mapDocument(row),
    uploaderName: row.uploader_name as string | null,
    uploaderEmail: row.uploader_email as string | null,
  }));
}

export async function getDocumentForProject(
  db: Queryable,
  input: { workspaceId: string; projectId: string; documentId: string },
) {
  const result = await db.query(
    `
      SELECT
        d.*,
        u.name AS uploader_name,
        u.email AS uploader_email
      FROM documents d
      LEFT JOIN users u ON u.sub = d.uploader_sub
      WHERE d.workspace_id = $1
        AND d.project_id = $2
        AND d.id = $3
        AND d.deleted_at IS NULL
    `,
    [input.workspaceId, input.projectId, input.documentId],
  );

  const row = result.rows[0];

  return row
    ? {
        ...mapDocument(row),
        uploaderName: row.uploader_name as string | null,
        uploaderEmail: row.uploader_email as string | null,
      }
    : null;
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

export async function findInvitationByTokenHashForUpdate(
  db: Queryable,
  tokenHash: string,
): Promise<InvitationRecord | null> {
  const result = await db.query(
    `
      SELECT *
      FROM invitations
      WHERE token_hash = $1
      FOR UPDATE
    `,
    [tokenHash],
  );

  const row = result.rows[0];
  return row ? mapInvitation(row) : null;
}

export async function acceptInvitation(
  db: Queryable,
  input: { invitationId: string; acceptedUserSub: string },
): Promise<InvitationRecord> {
  const result = await db.query(
    `
      UPDATE invitations
      SET status = 'accepted',
          accepted_user_sub = $2,
          accepted_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [input.invitationId, input.acceptedUserSub],
  );

  return mapInvitation(requireOne(result.rows, "Invitation"));
}

export async function upsertWorkspaceMembership(
  db: Queryable,
  input: { workspaceId: string; userSub: string; role: WorkspaceRole },
): Promise<WorkspaceMembershipRecord> {
  const result = await db.query(
    `
      INSERT INTO workspace_memberships (workspace_id, user_sub, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (workspace_id, user_sub) DO UPDATE
      SET role = EXCLUDED.role,
          updated_at = NOW()
      RETURNING *
    `,
    [input.workspaceId, input.userSub, input.role],
  );

  return mapMembership(requireOne(result.rows, "Workspace membership"));
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
