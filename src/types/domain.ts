import type { Permission } from "../authorization/permissions";

export type Role = "owner" | "member" | "guest";

export type PermissionStatus = "allowed" | "limited" | "blocked";

export interface WorkspaceSummary {
  id: string;
  name: string;
  role: Role;
  permissions: Permission[];
  memberCount: number;
  projectCount: number;
  documentCount: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  documentCount: number;
  updatedAt: string;
  visibility: "workspace" | "guest-scoped";
}

export interface ProjectListResponse {
  projects: ProjectSummary[];
}

export interface ProjectResponse {
  project: ProjectSummary;
}

export interface DocumentSummary {
  id: string;
  projectId: string;
  originalFilename: string;
  contentType: string;
  kind: "image" | "pdf";
  sizeBytes: number;
  uploadedAt: string;
  uploaderName: string | null;
  uploaderEmail: string | null;
}

export interface DocumentListResponse {
  documents: DocumentSummary[];
}

export interface UploadDocumentResponse {
  document: DocumentSummary;
}

export interface DocumentResponse {
  document: DocumentSummary;
}

export interface DocumentAccessResponse {
  url: string;
  expiresAt: string;
  disposition: "inline" | "attachment";
}

export interface ShareDocumentResponse {
  recipientEmail: string;
  projectAccessGranted: boolean;
  emailStatus: "sent" | "skipped" | "rate_limited" | "failed";
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  role: Role;
  occurredAt: string;
}

export interface ActivityListResponse {
  activity: ActivityItem[];
  nextOffset: number | null;
}

export interface AppShellData {
  currentUser: {
    name: string;
    email: string;
    pictureUrl?: string | null;
  };
  workspace: WorkspaceSummary | null;
  workspaces: WorkspaceSummary[];
  projects: ProjectSummary[];
  activity: ActivityItem[];
}

export interface WorkspaceListResponse {
  workspaces: WorkspaceSummary[];
}

export interface CreateWorkspaceResponse {
  workspaceId: string;
  workspaces: WorkspaceSummary[];
}

export interface CreateInvitationResponse {
  invitationId: string;
  expiresAt: string;
  emailStatus: "sent" | "skipped" | "rate_limited" | "failed";
}

export interface AcceptInvitationResponse {
  workspaceId: string;
  role: Role;
}

export interface RosterMember {
  sub: string;
  name: string | null;
  email: string;
  pictureUrl: string | null;
  role: Role;
  joinedAt: string;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: Exclude<Role, "owner">;
  expiresAt: string;
  createdAt: string;
}

export interface RosterResponse {
  members: RosterMember[];
  pendingInvitations: PendingInvitation[];
}

export type SessionData =
  | {
      authenticated: false;
      loginUrl: string;
    }
  | {
      authenticated: true;
      verified: false;
      loginUrl: string;
      user: {
        name: string | null;
        email: string;
        pictureUrl: string | null;
      };
    }
  | {
      authenticated: true;
      verified: true;
      registrationStatus: "registered" | "returning";
      user: {
        name: string | null;
        email: string;
        pictureUrl: string | null;
      };
    };
