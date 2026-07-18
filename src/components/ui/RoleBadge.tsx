import type { Role } from "../../types/domain";

const roleLabels: Record<Role, string> = {
  owner: "Owner",
  member: "Member",
  guest: "Guest",
};

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`role-badge role-badge--${role}`}>{roleLabels[role]}</span>;
}
