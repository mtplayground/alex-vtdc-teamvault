import { FormEvent, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { ApiError } from "../api/client";
import {
  useAppShellQuery,
  useCreateInvitationMutation,
  useRemoveMemberMutation,
  useRosterQuery,
  useUpdateMemberRoleMutation,
} from "../api/queries";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { Input } from "../components/ui/Input";
import { LoadingState } from "../components/ui/LoadingState";
import { RoleBadge } from "../components/ui/RoleBadge";
import { useToast } from "../components/ui/Toast";
import type { Role } from "../types/domain";

function invitationErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "Invitation could not be created. Try again shortly.";
  }

  if (error.code === "invitation_already_pending") {
    return "An invitation is already pending for that email address.";
  }

  if (error.code === "invitation_rate_limited") {
    return "Too many invitations have been sent to that email. Try again shortly.";
  }

  if (error.code === "validation_error") {
    return "Enter a valid email address before sending an invitation.";
  }

  return error.message || "Invitation could not be created. Try again shortly.";
}

function roleChangeErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.code === "last_owner_required") {
    return "A workspace must keep at least one owner.";
  }

  return "Role could not be updated.";
}

function removeMemberErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.code === "last_owner_required") {
    return "A workspace must keep at least one owner.";
  }

  return "Member could not be removed.";
}

export function MembersPage() {
  const { data } = useAppShellQuery();
  const workspaceId = data?.workspace?.id;
  const roster = useRosterQuery(workspaceId);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [role, setRole] = useState<Extract<Role, "member" | "guest">>("member");
  const invite = useCreateInvitationMutation();
  const updateRole = useUpdateMemberRoleMutation(workspaceId);
  const removeMember = useRemoveMemberMutation(workspaceId);
  const { notify } = useToast();
  const canManageMembers = Boolean(data?.workspace?.permissions.includes("members.manage"));
  const canManageRoles = Boolean(data?.workspace?.permissions.includes("roles.manage"));

  async function onInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!data?.workspace) {
      return;
    }

    setInviteError(null);

    try {
      const result = await invite.mutateAsync({
        workspaceId: data.workspace.id,
        email,
        role,
      });
      setEmail("");
      setRole("member");
      setInviteOpen(false);
      notify(result.emailStatus === "sent" ? "Invitation sent." : "Invitation created; email delivery is pending.", "success");
    } catch (error) {
      setInviteError(invitationErrorMessage(error));
    }
  }

  async function onRoleChange(userSub: string, nextRole: Role) {
    if (!workspaceId) {
      return;
    }

    try {
      await updateRole.mutateAsync({ workspaceId, userSub, role: nextRole });
      notify("Role updated.", "success");
    } catch (error) {
      notify(roleChangeErrorMessage(error), "error");
    }
  }

  async function onRemove(userSub: string) {
    if (!workspaceId) {
      return;
    }

    try {
      await removeMember.mutateAsync({ workspaceId, userSub });
      notify("Member removed.", "success");
    } catch (error) {
      notify(removeMemberErrorMessage(error), "error");
    }
  }

  if (roster.isLoading || !roster.data) {
    return <LoadingState title="Loading roster" detail="Preparing members and pending invitations." />;
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Members</p>
          <h2>People and roles</h2>
          <p>Owners can invite people and assign roles. Members and guests can review access without changing it.</p>
        </div>
        <Button
          disabled={!canManageMembers}
          title={canManageMembers ? undefined : "Only owners can invite members."}
          onClick={() => setInviteOpen(true)}
        >
          <UserPlus size={16} />
          Invite
        </Button>
      </section>

      <section className="list-panel">
        {roster.data.members.map((member) => (
          <article className="list-row" key={member.sub}>
            <div>
              <h3>{member.name ?? member.email}</h3>
              <p>{member.email}</p>
            </div>
            <div className="row-actions">
              <RoleBadge role={member.role} />
              {canManageRoles ? (
                <select
                  aria-label={`Change role for ${member.email}`}
                  className="inline-select"
                  value={member.role}
                  onChange={(event) => void onRoleChange(member.sub, event.target.value as Role)}
                  disabled={updateRole.isPending}
                >
                  <option value="owner">Owner</option>
                  <option value="member">Member</option>
                  <option value="guest">Guest</option>
                </select>
              ) : null}
              {canManageMembers ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => void onRemove(member.sub)}
                  disabled={removeMember.isPending}
                >
                  <Trash2 size={14} />
                  Remove
                </Button>
              ) : null}
              {!canManageMembers ? <span className="permission-note">View only</span> : null}
            </div>
          </article>
        ))}
      </section>

      <section className="page-stack" aria-label="Pending invitations">
        <div className="page-header page-header--compact">
          <div>
            <p className="eyebrow">Pending</p>
            <h2>Invitations</h2>
          </div>
        </div>
        <section className="list-panel">
          {roster.data.pendingInvitations.length ? (
            roster.data.pendingInvitations.map((invitation) => (
              <article className="list-row" key={invitation.id}>
                <div>
                  <h3>{invitation.email}</h3>
                  <p>Expires {new Date(invitation.expiresAt).toLocaleDateString()}</p>
                </div>
                <RoleBadge role={invitation.role} />
              </article>
            ))
          ) : (
            <article className="list-row">
              <div>
                <h3>No pending invitations</h3>
                <p>New invitations will appear here until they are accepted or expire.</p>
              </div>
            </article>
          )}
        </section>
      </section>

      <Dialog
        open={inviteOpen}
        title="Invite member"
        description="Choose the role this person will receive after accepting."
        onClose={() => setInviteOpen(false)}
      >
        <form className="dialog-actions" onSubmit={onInvite}>
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label className="input-field" htmlFor="invitation-role">
            <span>Role</span>
            <select id="invitation-role" value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
              <option value="member">Member</option>
              <option value="guest">Guest</option>
            </select>
            <small>Members can create projects and upload documents. Guests can view and download only.</small>
          </label>
          {inviteError ? <p className="form-error">{inviteError}</p> : null}
          <Button type="submit" disabled={invite.isPending}>
            <UserPlus size={16} />
            {invite.isPending ? "Sending" : "Send invitation"}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
