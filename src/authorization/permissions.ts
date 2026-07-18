export type WorkspaceRole = "owner" | "member" | "guest";

export type Permission =
  | "workspace.manage"
  | "members.manage"
  | "roles.manage"
  | "projects.create"
  | "documents.upload"
  | "documents.organize"
  | "documents.view"
  | "documents.download";

const permissionsByRole: Record<WorkspaceRole, Permission[]> = {
  owner: [
    "workspace.manage",
    "members.manage",
    "roles.manage",
    "projects.create",
    "documents.upload",
    "documents.organize",
    "documents.view",
    "documents.download",
  ],
  member: ["projects.create", "documents.upload", "documents.organize", "documents.view", "documents.download"],
  guest: ["documents.view", "documents.download"],
};

export function getPermissionsForRole(role: WorkspaceRole): Permission[] {
  return [...permissionsByRole[role]];
}

export function hasPermission(role: WorkspaceRole, permission: Permission): boolean {
  return permissionsByRole[role].includes(permission);
}
