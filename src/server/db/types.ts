export type WorkspaceRole = "owner" | "member" | "guest";
export type DocumentKind = "image" | "pdf";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export type ActivityAction =
  | "workspace_created"
  | "invitation_created"
  | "invitation_accepted"
  | "member_role_changed"
  | "member_removed"
  | "project_created"
  | "project_updated"
  | "project_archived"
  | "document_uploaded"
  | "document_downloaded"
  | "document_shared";

export interface UserRecord {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  pictureUrl: string | null;
  createdAt: Date;
  lastSeenAt: Date;
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  createdBySub: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMembershipRecord {
  id: string;
  workspaceId: string;
  userSub: string;
  role: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectRecord {
  id: string;
  workspaceId: string;
  name: string;
  createdBySub: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  uploaderSub: string | null;
  originalFilename: string;
  contentType: string;
  kind: DocumentKind;
  sizeBytes: string;
  storageKey: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface InvitationRecord {
  id: string;
  workspaceId: string;
  invitedBySub: string;
  acceptedUserSub: string | null;
  email: string;
  role: WorkspaceRole;
  tokenHash: string;
  status: InvitationStatus;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityEntryRecord {
  id: string;
  workspaceId: string;
  actorSub: string | null;
  action: ActivityAction;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
