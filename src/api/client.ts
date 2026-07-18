import type {
  AcceptInvitationResponse,
  AppShellData,
  CreateInvitationResponse,
  CreateWorkspaceResponse,
  DocumentListResponse,
  ProjectListResponse,
  ProjectResponse,
  RosterMember,
  RosterResponse,
  Role,
  SessionData,
  UploadDocumentResponse,
  WorkspaceListResponse,
} from "../types/domain";
import { getPermissionsForRole } from "../authorization/permissions";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    throw new ApiError(`Request failed with status ${response.status}`, response.status);
  }

  return response.json() as Promise<T>;
}

const shellPreviewData: AppShellData = {
  currentUser: {
    name: "Workspace Owner",
    email: "owner@example.com",
    pictureUrl: null,
  },
  workspace: {
    id: "preview-workspace",
    name: "Acme Legal Review",
    role: "owner",
    permissions: getPermissionsForRole("owner"),
    memberCount: 8,
    projectCount: 4,
    documentCount: 32,
  },
  workspaces: [
    {
      id: "preview-workspace",
      name: "Acme Legal Review",
      role: "owner",
      permissions: getPermissionsForRole("owner"),
      memberCount: 8,
      projectCount: 4,
      documentCount: 32,
    },
  ],
  projects: [
    {
      id: "project-1",
      name: "Board approvals",
      documentCount: 12,
      updatedAt: new Date().toISOString(),
      visibility: "workspace",
    },
    {
      id: "project-2",
      name: "Vendor diligence",
      documentCount: 9,
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      visibility: "guest-scoped",
    },
    {
      id: "project-3",
      name: "Policy archive",
      documentCount: 11,
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      visibility: "workspace",
    },
  ],
  activity: [
    {
      id: "activity-1",
      actor: "Mira Lee",
      action: "uploaded",
      target: "Vendor agreement.pdf",
      role: "member",
      occurredAt: "10:42",
    },
    {
      id: "activity-2",
      actor: "Jon Bell",
      action: "viewed",
      target: "Board packet.pdf",
      role: "guest",
      occurredAt: "09:15",
    },
    {
      id: "activity-3",
      actor: "Avery Hart",
      action: "created project",
      target: "Policy archive",
      role: "owner",
      occurredAt: "Yesterday",
    },
  ],
};

const previewSessionData: SessionData = {
  authenticated: true,
  verified: true,
  registrationStatus: "returning",
  user: {
    name: "Workspace Owner",
    email: "owner@example.com",
    pictureUrl: null,
  },
};

const rosterPreviewData: RosterResponse = {
  members: [
    {
      sub: "preview-owner",
      name: "Avery Hart",
      email: "avery@example.com",
      pictureUrl: null,
      role: "owner",
      joinedAt: new Date().toISOString(),
    },
    {
      sub: "preview-member",
      name: "Mira Lee",
      email: "mira@example.com",
      pictureUrl: null,
      role: "member",
      joinedAt: new Date().toISOString(),
    },
    {
      sub: "preview-guest",
      name: "Jon Bell",
      email: "jon@example.com",
      pictureUrl: null,
      role: "guest",
      joinedAt: new Date().toISOString(),
    },
  ],
  pendingInvitations: [
    {
      id: "preview-invitation",
      email: "pending@example.com",
      role: "guest",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

const documentPreviewData: DocumentListResponse = {
  documents: [
    {
      id: "document-1",
      projectId: "project-1",
      originalFilename: "Board packet.pdf",
      contentType: "application/pdf",
      kind: "pdf",
      sizeBytes: 1840000,
      uploadedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      uploaderName: "Avery Hart",
      uploaderEmail: "avery@example.com",
    },
    {
      id: "document-2",
      projectId: "project-1",
      originalFilename: "Signature page.png",
      contentType: "image/png",
      kind: "image",
      sizeBytes: 420000,
      uploadedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      uploaderName: "Mira Lee",
      uploaderEmail: "mira@example.com",
    },
  ],
};

export const apiClient = {
  getAuthRedirectUrl(mode: "login" | "register" | "password-reset", returnTo = "/"): string {
    return `${apiBaseUrl}/auth/${mode}?return_to=${encodeURIComponent(returnTo)}`;
  },

  async requestPasswordReset(email: string): Promise<{ status: "delegated"; loginUrl: string }> {
    if (import.meta.env.DEV) {
      return {
        status: "delegated",
        loginUrl: this.getAuthRedirectUrl("password-reset", "/reset-password/complete"),
      };
    }

    return request<{ status: "delegated"; loginUrl: string }>("/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async getSession(): Promise<SessionData> {
    if (import.meta.env.DEV) {
      return previewSessionData;
    }

    const response = await fetch(`${apiBaseUrl}/session`, {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (response.status === 401 || response.status === 403) {
      return response.json() as Promise<SessionData>;
    }

    if (!response.ok) {
      throw new ApiError(`Request failed with status ${response.status}`, response.status);
    }

    return response.json() as Promise<SessionData>;
  },

  async signOut(): Promise<{ authenticated: false; loginUrl: string }> {
    if (import.meta.env.DEV) {
      return {
        authenticated: false,
        loginUrl: this.getAuthRedirectUrl("login", "/"),
      };
    }

    return request<{ authenticated: false; loginUrl: string }>("/auth/logout", { method: "POST" });
  },

  async getAppShell(workspaceId?: string | null): Promise<AppShellData> {
    if (import.meta.env.DEV) {
      return shellPreviewData;
    }

    const query = workspaceId ? `?${new URLSearchParams({ workspaceId })}` : "";
    return request<AppShellData>(`/app-shell${query}`);
  },

  async listWorkspaces(): Promise<WorkspaceListResponse> {
    if (import.meta.env.DEV) {
      return { workspaces: shellPreviewData.workspaces };
    }

    return request<WorkspaceListResponse>("/workspaces");
  },

  async createWorkspace(name: string): Promise<CreateWorkspaceResponse> {
    if (import.meta.env.DEV) {
      const workspaceId = crypto.randomUUID();
      return {
        workspaceId,
        workspaces: [
          {
            id: workspaceId,
            name,
            role: "owner",
            permissions: getPermissionsForRole("owner"),
            memberCount: 1,
            projectCount: 0,
            documentCount: 0,
          },
          ...shellPreviewData.workspaces,
        ],
      };
    }

    return request<CreateWorkspaceResponse>("/workspaces", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  async createInvitation(input: {
    workspaceId: string;
    email: string;
    role: Extract<Role, "member" | "guest">;
  }): Promise<CreateInvitationResponse> {
    if (import.meta.env.DEV) {
      return {
        invitationId: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        emailStatus: "skipped",
      };
    }

    return request<CreateInvitationResponse>(`/workspaces/${input.workspaceId}/invitations`, {
      method: "POST",
      body: JSON.stringify({ email: input.email, role: input.role }),
    });
  },

  async acceptInvitation(token: string): Promise<AcceptInvitationResponse> {
    if (import.meta.env.DEV) {
      return {
        workspaceId: shellPreviewData.workspace?.id ?? "preview-workspace",
        role: "member",
      };
    }

    return request<AcceptInvitationResponse>("/invitations/accept", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },

  async getRoster(workspaceId: string): Promise<RosterResponse> {
    if (import.meta.env.DEV) {
      return rosterPreviewData;
    }

    return request<RosterResponse>(`/workspaces/${workspaceId}/roster`);
  },

  async updateMemberRole(input: { workspaceId: string; userSub: string; role: Role }): Promise<RosterMember> {
    if (import.meta.env.DEV) {
      const member = rosterPreviewData.members.find((item) => item.sub === input.userSub) ?? rosterPreviewData.members[0];
      return {
        ...member,
        role: input.role,
      };
    }

    return request<RosterMember>(
      `/workspaces/${input.workspaceId}/members/${encodeURIComponent(input.userSub)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ role: input.role }),
      },
    );
  },

  async removeMember(input: { workspaceId: string; userSub: string }): Promise<void> {
    if (import.meta.env.DEV) {
      return;
    }

    const response = await fetch(`${apiBaseUrl}/workspaces/${input.workspaceId}/members/${encodeURIComponent(input.userSub)}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new ApiError(`Request failed with status ${response.status}`, response.status);
    }
  },

  async listProjects(workspaceId: string): Promise<ProjectListResponse> {
    if (import.meta.env.DEV) {
      return { projects: shellPreviewData.projects };
    }

    return request<ProjectListResponse>(`/workspaces/${workspaceId}/projects`);
  },

  async getProject(input: { workspaceId: string; projectId: string }): Promise<ProjectResponse> {
    if (import.meta.env.DEV) {
      const project =
        shellPreviewData.projects.find((item) => item.id === input.projectId) ?? shellPreviewData.projects[0];
      return { project };
    }

    return request<ProjectResponse>(`/workspaces/${input.workspaceId}/projects/${input.projectId}`);
  },

  async createProject(input: { workspaceId: string; name: string }): Promise<ProjectResponse> {
    if (import.meta.env.DEV) {
      return {
        project: {
          id: crypto.randomUUID(),
          name: input.name,
          documentCount: 0,
          updatedAt: new Date().toISOString(),
          visibility: "workspace",
        },
      };
    }

    return request<ProjectResponse>(`/workspaces/${input.workspaceId}/projects`, {
      method: "POST",
      body: JSON.stringify({ name: input.name }),
    });
  },

  async renameProject(input: { workspaceId: string; projectId: string; name: string }): Promise<ProjectResponse> {
    if (import.meta.env.DEV) {
      const project =
        shellPreviewData.projects.find((item) => item.id === input.projectId) ?? shellPreviewData.projects[0];
      return {
        project: {
          ...project,
          name: input.name,
          updatedAt: new Date().toISOString(),
        },
      };
    }

    return request<ProjectResponse>(`/workspaces/${input.workspaceId}/projects/${input.projectId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: input.name }),
    });
  },

  async archiveProject(input: { workspaceId: string; projectId: string }): Promise<void> {
    if (import.meta.env.DEV) {
      return;
    }

    const response = await fetch(`${apiBaseUrl}/workspaces/${input.workspaceId}/projects/${input.projectId}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new ApiError(`Request failed with status ${response.status}`, response.status);
    }
  },

  async listDocuments(input: { workspaceId: string; projectId: string }): Promise<DocumentListResponse> {
    if (import.meta.env.DEV) {
      return {
        documents: documentPreviewData.documents.filter((document) => document.projectId === input.projectId),
      };
    }

    return request<DocumentListResponse>(
      `/workspaces/${input.workspaceId}/projects/${input.projectId}/documents`,
    );
  },

  async uploadDocument(input: {
    workspaceId: string;
    projectId: string;
    file: File;
  }): Promise<UploadDocumentResponse> {
    if (import.meta.env.DEV) {
      return {
        document: {
          id: crypto.randomUUID(),
          projectId: input.projectId,
          originalFilename: input.file.name,
          contentType: input.file.type,
          kind: input.file.type === "application/pdf" ? "pdf" : "image",
          sizeBytes: input.file.size,
          uploadedAt: new Date().toISOString(),
          uploaderName: shellPreviewData.currentUser.name,
          uploaderEmail: shellPreviewData.currentUser.email,
        },
      };
    }

    const body = new FormData();
    body.append("file", input.file);

    const response = await fetch(
      `${apiBaseUrl}/workspaces/${input.workspaceId}/projects/${input.projectId}/documents`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
        body,
      },
    );

    if (!response.ok) {
      throw new ApiError(`Request failed with status ${response.status}`, response.status);
    }

    return response.json() as Promise<UploadDocumentResponse>;
  },
};
