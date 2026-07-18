import { ShieldCheck, Upload, UserPlus } from "lucide-react";
import { useAppShellQuery, useSessionQuery } from "../api/queries";
import { RoleBadge } from "../components/ui/RoleBadge";

export function DashboardPage() {
  const { data } = useAppShellQuery();
  const { data: session } = useSessionQuery();

  if (!data?.workspace) {
    return null;
  }

  const stats = [
    { label: "Projects", value: data.workspace.projectCount },
    { label: "Documents", value: data.workspace.documentCount },
    { label: "People", value: data.workspace.memberCount },
  ];
  const permissions = data.workspace.permissions;

  return (
    <div className="page-stack">
      {session?.authenticated && session.verified ? (
        <section className="state-panel state-panel--compact">
          <ShieldCheck size={20} />
          <h2>
            {session.registrationStatus === "registered"
              ? "Registration complete."
              : `Welcome back, ${session.user.name ?? session.user.email}.`}
          </h2>
          <p>Your verified account is ready for workspace access.</p>
        </section>
      ) : null}

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
        <article className={permissions.includes("workspace.manage") ? "" : "action-grid__limited"}>
          <ShieldCheck size={22} />
          <h3>Workspace control</h3>
          <p>{permissions.includes("workspace.manage") ? "You can manage workspace settings and member roles." : "Your role can use the workspace without changing owner controls."}</p>
        </article>
        <article className={permissions.includes("documents.upload") ? "" : "action-grid__limited"}>
          <Upload size={22} />
          <h3>Document workflow</h3>
          <p>{permissions.includes("documents.upload") ? "You can upload, organize, view, and download documents." : "You can view and download documents available to your role."}</p>
        </article>
        <article className={permissions.includes("members.manage") ? "" : "action-grid__limited"}>
          <UserPlus size={22} />
          <h3>Member management</h3>
          <p>{permissions.includes("members.manage") ? "You can invite members and adjust workspace roles." : "Only owners can invite members or change roles."}</p>
        </article>
      </section>
    </div>
  );
}
