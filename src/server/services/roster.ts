import type { Pool } from "pg";
import type { RosterResponse } from "../../types/domain";
import {
  countWorkspaceOwners,
  deleteWorkspaceMember,
  getWorkspaceMembership,
  listPendingWorkspaceInvitations,
  listWorkspaceMembers,
  updateWorkspaceMemberRole,
} from "../db/repositories";
import type { WorkspaceRole } from "../db/types";
import { ApiError } from "../errors";
import { logActivity } from "./activity";

export async function getWorkspaceRoster(dbPool: Pool, workspaceId: string): Promise<RosterResponse> {
  const [members, pendingInvitations] = await Promise.all([
    listWorkspaceMembers(dbPool, workspaceId),
    listPendingWorkspaceInvitations(dbPool, workspaceId),
  ]);

  return {
    members: members.map((member) => ({
      ...member,
      joinedAt: member.joinedAt.toISOString(),
    })),
    pendingInvitations: pendingInvitations.map((invitation) => ({
      ...invitation,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
    })),
  };
}

export async function changeWorkspaceMemberRole(
  dbPool: Pool,
  input: { workspaceId: string; actorSub: string; userSub: string; role: WorkspaceRole },
) {
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");
    const membership = await getWorkspaceMembership(client, {
      workspaceId: input.workspaceId,
      userSub: input.userSub,
    });

    if (!membership) {
      throw new ApiError(404, "member_not_found", "Workspace member was not found.");
    }

    if (membership.role === "owner" && input.role !== "owner" && (await countWorkspaceOwners(client, input.workspaceId)) <= 1) {
      throw new ApiError(400, "last_owner_required", "A workspace must keep at least one owner.");
    }

    const updated = await updateWorkspaceMemberRole(client, {
      workspaceId: input.workspaceId,
      userSub: input.userSub,
      role: input.role,
    });

    if (!updated) {
      throw new ApiError(404, "member_not_found", "Workspace member was not found.");
    }

    await logActivity(client, {
      workspaceId: input.workspaceId,
      actorSub: input.actorSub,
      action: "member_role_changed",
      targetType: "member",
      metadata: { userSub: input.userSub, previousRole: membership.role, role: input.role },
    });

    await client.query("COMMIT");
    return updated;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function removeWorkspaceMember(
  dbPool: Pool,
  input: { workspaceId: string; actorSub: string; userSub: string },
) {
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");
    const membership = await getWorkspaceMembership(client, {
      workspaceId: input.workspaceId,
      userSub: input.userSub,
    });

    if (!membership) {
      throw new ApiError(404, "member_not_found", "Workspace member was not found.");
    }

    if (membership.role === "owner" && (await countWorkspaceOwners(client, input.workspaceId)) <= 1) {
      throw new ApiError(400, "last_owner_required", "A workspace must keep at least one owner.");
    }

    const removed = await deleteWorkspaceMember(client, {
      workspaceId: input.workspaceId,
      userSub: input.userSub,
    });

    if (!removed) {
      throw new ApiError(404, "member_not_found", "Workspace member was not found.");
    }

    await logActivity(client, {
      workspaceId: input.workspaceId,
      actorSub: input.actorSub,
      action: "member_removed",
      targetType: "member",
      metadata: { userSub: input.userSub, role: membership.role },
    });

    await client.query("COMMIT");
    return removed;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
