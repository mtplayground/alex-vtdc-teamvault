import { createHash, randomBytes } from "node:crypto";
import type { Pool } from "pg";
import { config } from "../config";
import {
  acceptInvitation,
  createInvitation,
  findInvitationByTokenHashForUpdate,
  upsertWorkspaceMembership,
} from "../db/repositories";
import type { InvitationRecord, WorkspaceRole } from "../db/types";
import { emailSender } from "../email/client";
import { buildWorkspaceInvitationEmail, toSendEmailInput } from "../email/templates";
import { ApiError } from "../errors";
import { logActivity } from "./activity";
import { listUserWorkspaces } from "./workspaces";

const invitationTtlMs = 7 * 24 * 60 * 60 * 1000;
const inviteWindowMs = 15 * 60 * 1000;
const maxInvitesPerWindow = 5;
const inviteAttempts = new Map<string, { count: number; resetAt: number }>();

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createToken(): string {
  return randomBytes(32).toString("base64url");
}

function rateLimitInvite(input: { workspaceId: string; inviterSub: string; email: string }) {
  const key = `${input.workspaceId}:${input.inviterSub}:${input.email.toLowerCase()}`;
  const now = Date.now();
  const current = inviteAttempts.get(key);

  if (!current || current.resetAt <= now) {
    inviteAttempts.set(key, { count: 1, resetAt: now + inviteWindowMs });
    return;
  }

  if (current.count >= maxInvitesPerWindow) {
    throw new ApiError(429, "invitation_rate_limited", "Too many invitations. Try again shortly.");
  }

  current.count += 1;
}

export async function inviteWorkspaceMember(
  dbPool: Pool,
  input: {
    workspaceId: string;
    inviterSub: string;
    inviterName: string;
    email: string;
    role: WorkspaceRole;
  },
) {
  rateLimitInvite(input);

  const workspace = (await listUserWorkspaces(dbPool, input.inviterSub)).find((item) => item.id === input.workspaceId);

  if (!workspace) {
    throw new ApiError(403, "workspace_forbidden", "You do not have access to this workspace.");
  }

  const token = createToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + invitationTtlMs);
  const acceptUrl = new URL("/invite/accept", config.selfUrl);
  acceptUrl.searchParams.set("token", token);

  let invitation: InvitationRecord;

  try {
    invitation = await createInvitation(dbPool, {
      workspaceId: input.workspaceId,
      invitedBySub: input.inviterSub,
      email: input.email,
      role: input.role,
      tokenHash,
      expiresAt,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(409, "invitation_already_pending", "An invitation is already pending for this email.");
    }

    throw error;
  }

  await logActivity(dbPool, {
    workspaceId: input.workspaceId,
    actorSub: input.inviterSub,
    action: "invitation_created",
    targetType: "invitation",
    targetId: invitation.id,
    metadata: { email: input.email, role: input.role },
  });

  const template = buildWorkspaceInvitationEmail({
    acceptUrl: acceptUrl.toString(),
    inviterName: input.inviterName,
    workspaceName: workspace.name,
    role: input.role,
  });
  const emailResult = await emailSender.send(toSendEmailInput(input.email, template));

  return {
    invitationId: invitation.id,
    expiresAt: invitation.expiresAt,
    emailStatus: emailResult.status,
  };
}

export async function acceptWorkspaceInvitation(
  dbPool: Pool,
  input: { token: string; userSub: string; userEmail: string },
) {
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");
    const invitation = await findInvitationByTokenHashForUpdate(client, hashToken(input.token));

    if (!invitation || invitation.status !== "pending") {
      throw new ApiError(400, "invitation_invalid", "This invitation is no longer valid.");
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      throw new ApiError(400, "invitation_expired", "This invitation has expired.");
    }

    if (invitation.email.toLowerCase() !== input.userEmail.toLowerCase()) {
      throw new ApiError(403, "invitation_email_mismatch", "Sign in with the invited email address.");
    }

    await upsertWorkspaceMembership(client, {
      workspaceId: invitation.workspaceId,
      userSub: input.userSub,
      role: invitation.role,
    });

    const acceptedInvitation = await acceptInvitation(client, {
      invitationId: invitation.id,
      acceptedUserSub: input.userSub,
    });

    await logActivity(client, {
      workspaceId: invitation.workspaceId,
      actorSub: input.userSub,
      action: "invitation_accepted",
      targetType: "invitation",
      targetId: invitation.id,
      metadata: { role: invitation.role },
    });

    await client.query("COMMIT");

    return {
      workspaceId: acceptedInvitation.workspaceId,
      role: acceptedInvitation.role,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
