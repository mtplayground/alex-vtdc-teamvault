import type { AppShellData, SessionData } from "../types/domain";

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
    memberCount: 8,
    projectCount: 4,
    documentCount: 32,
  },
  projects: [
    {
      id: "project-1",
      name: "Board approvals",
      documentCount: 12,
      updatedAt: "Today",
      visibility: "workspace",
    },
    {
      id: "project-2",
      name: "Vendor diligence",
      documentCount: 9,
      updatedAt: "Yesterday",
      visibility: "guest-scoped",
    },
    {
      id: "project-3",
      name: "Policy archive",
      documentCount: 11,
      updatedAt: "Jul 15",
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

export const apiClient = {
  getAuthRedirectUrl(mode: "login" | "register", returnTo = "/"): string {
    return `${apiBaseUrl}/auth/${mode}?return_to=${encodeURIComponent(returnTo)}`;
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

  async getAppShell(): Promise<AppShellData> {
    if (import.meta.env.DEV) {
      return shellPreviewData;
    }

    return request<AppShellData>("/app-shell");
  },
};
