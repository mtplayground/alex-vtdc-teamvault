export type Role = "owner" | "member" | "guest";

export type PermissionStatus = "allowed" | "limited" | "blocked";

export interface WorkspaceSummary {
  id: string;
  name: string;
  role: Role;
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

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  role: Role;
  occurredAt: string;
}

export interface AppShellData {
  currentUser: {
    name: string;
    email: string;
  };
  workspace: WorkspaceSummary;
  projects: ProjectSummary[];
  activity: ActivityItem[];
}
