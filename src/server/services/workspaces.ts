import type { Pool } from "pg";
import {
  createWorkspace,
  createWorkspaceMembership,
  listWorkspaceSummariesForUser,
} from "../db/repositories";
import { logActivity } from "./activity";

export async function listUserWorkspaces(dbPool: Pool, userSub: string) {
  return listWorkspaceSummariesForUser(dbPool, userSub);
}

export async function createOwnedWorkspace(dbPool: Pool, input: { name: string; ownerSub: string }) {
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");
    const workspace = await createWorkspace(client, { name: input.name, createdBySub: input.ownerSub });

    await createWorkspaceMembership(client, {
      workspaceId: workspace.id,
      userSub: input.ownerSub,
      role: "owner",
    });

    await logActivity(client, {
      workspaceId: workspace.id,
      actorSub: input.ownerSub,
      action: "workspace_created",
      targetType: "workspace",
      targetId: workspace.id,
      metadata: { workspaceName: workspace.name },
    });

    await client.query("COMMIT");

    return workspace;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
