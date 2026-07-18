import { ShieldCheck, Upload, UserPlus } from "lucide-react";
import { useAppShellQuery } from "../api/queries";
import { RoleBadge } from "../components/ui/RoleBadge";

export function DashboardPage() {
  const { data } = useAppShellQuery();

  if (!data) {
    return null;
  }

  const stats = [
    { label: "Projects", value: data.workspace.projectCount },
    { label: "Documents", value: data.workspace.documentCount },
    { label: "People", value: data.workspace.memberCount },
  ];

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Workspace document center</h2>
          <p>Organize projects, share files with the right people, and keep role boundaries visible.</p>
        </div>
        <RoleBadge role={data.workspace.role} />
      </section>

      <section className="stat-grid" aria-label="Workspace totals">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      <section className="action-grid" aria-label="Common actions">
        <article>
          <ShieldCheck size={22} />
          <h3>Permission-aware by default</h3>
          <p>Role cues stay near workspace, project, member, and document actions.</p>
        </article>
        <article>
          <Upload size={22} />
          <h3>Document workflow ready</h3>
          <p>The layout has clear space for uploads, previews, downloads, and empty states.</p>
        </article>
        <article>
          <UserPlus size={22} />
          <h3>Collaboration surfaces</h3>
          <p>Members, guests, invitations, and activity have stable navigation from day one.</p>
        </article>
      </section>
    </div>
  );
}
