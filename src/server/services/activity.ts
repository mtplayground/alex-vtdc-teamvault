import type { Pool, PoolClient } from "pg";
import type { ActivityItem } from "../../types/domain";
import { listWorkspaceActivityEntries, recordActivity } from "../db/repositories";
import type { ActivityAction, WorkspaceRole } from "../db/types";

type ActivityDb = Pool | PoolClient;

interface LogActivityInput {
  workspaceId: string;
  actorSub?: string | null;
  action: ActivityAction;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

function stringMetadata(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function actionLabel(action: ActivityAction): string {
  const labels: Record<ActivityAction, string> = {
    workspace_created: "created workspace",
    invitation_created: "invited",
    invitation_accepted: "accepted invitation",
    member_role_changed: "changed role for",
    member_removed: "removed",
    project_created: "created project",
    project_updated: "updated project",
    project_archived: "archived project",
    document_uploaded: "uploaded",
    document_downloaded: "downloaded",
    document_shared: "shared",
  };

  return labels[action];
}

function targetLabel(entry: Awaited<ReturnType<typeof listWorkspaceActivityEntries>>[number]): string {
  return (
    stringMetadata(entry.metadata, "documentName") ??
    stringMetadata(entry.metadata, "projectName") ??
    stringMetadata(entry.metadata, "workspaceName") ??
    stringMetadata(entry.metadata, "email") ??
    stringMetadata(entry.metadata, "recipientEmail") ??
    stringMetadata(entry.metadata, "userSub") ??
    entry.targetType
  );
}

export async function logActivity(db: ActivityDb, input: LogActivityInput) {
  return recordActivity(db, input);
}

export async function listWorkspaceActivity(
  dbPool: Pool,
  workspaceId: string,
  limit = 50,
): Promise<ActivityItem[]> {
  const entries = await listWorkspaceActivityEntries(dbPool, { workspaceId, limit });

  return entries.map((entry) => ({
    id: entry.id,
    actor: entry.actorName ?? entry.actorEmail ?? "System",
    action: actionLabel(entry.action),
    target: targetLabel(entry),
    role: entry.actorRole ?? ("member" as WorkspaceRole),
    occurredAt: entry.createdAt.toISOString(),
  }));
}
