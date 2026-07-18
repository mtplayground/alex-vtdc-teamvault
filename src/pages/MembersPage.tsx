import { FormEvent, useState } from "react";
import { UserPlus } from "lucide-react";
import { useAppShellQuery, useCreateInvitationMutation } from "../api/queries";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { Input } from "../components/ui/Input";
import { RoleBadge } from "../components/ui/RoleBadge";
import { useToast } from "../components/ui/Toast";
import type { Role } from "../types/domain";

const members = [
  { name: "Avery Hart", email: "avery@example.com", role: "owner" as const },
  { name: "Mira Lee", email: "mira@example.com", role: "member" as const },
  { name: "Jon Bell", email: "jon@example.com", role: "guest" as const },
];

export function MembersPage() {
  const { data } = useAppShellQuery();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [role, setRole] = useState<Extract<Role, "member" | "guest">>("member");
  const invite = useCreateInvitationMutation();
  const { notify } = useToast();
  const canManageMembers = Boolean(data?.workspace?.permissions.includes("members.manage"));

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
    } catch {
      setInviteError("Invitation could not be created. Check for a pending invite or try again shortly.");
    }
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
        {members.map((member) => (
          <article className="list-row" key={member.email}>
            <div>
              <h3>{member.name}</h3>
              <p>{member.email}</p>
            </div>
            <div className="row-actions">
              <RoleBadge role={member.role} />
              {!canManageMembers ? <span className="permission-note">View only</span> : null}
            </div>
          </article>
        ))}
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
