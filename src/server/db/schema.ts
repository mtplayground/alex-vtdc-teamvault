export const tableNames = {
  users: "users",
  workspaces: "workspaces",
  workspaceMemberships: "workspace_memberships",
  projects: "projects",
  projectGuestAccess: "project_guest_access",
  documents: "documents",
  invitations: "invitations",
  activityEntries: "activity_entries",
} as const;

export const enumNames = {
  workspaceRole: "workspace_role",
  documentKind: "document_kind",
  invitationStatus: "invitation_status",
  activityAction: "activity_action",
} as const;
