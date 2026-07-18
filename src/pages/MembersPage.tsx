import { UserPlus } from "lucide-react";
import { Button } from "../components/ui/Button";
import { RoleBadge } from "../components/ui/RoleBadge";

const members = [
  { name: "Avery Hart", email: "avery@example.com", role: "owner" as const },
  { name: "Mira Lee", email: "mira@example.com", role: "member" as const },
  { name: "Jon Bell", email: "jon@example.com", role: "guest" as const },
];

export function MembersPage() {
  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Members</p>
          <h2>People and roles</h2>
          <p>Owners, members, and guests are visually distinct before permission logic is added.</p>
        </div>
        <Button>
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
            <RoleBadge role={member.role} />
          </article>
        ))}
      </section>
    </div>
  );
}
