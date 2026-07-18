import { useActivityQuery, useAppShellQuery } from "../api/queries";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState } from "../components/ui/LoadingState";
import { RoleBadge } from "../components/ui/RoleBadge";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function ActivityPage() {
  const { data } = useAppShellQuery();
  const workspaceId = data?.workspace?.id;
  const activity = useActivityQuery(workspaceId);

  if (!data?.workspace || activity.isLoading || !activity.data) {
    return <LoadingState title="Loading activity" detail="Preparing workspace history." />;
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Activity</p>
          <h2>Workspace history</h2>
          <p>Workspace events from invitations, role changes, projects, documents, downloads, and shares.</p>
        </div>
      </section>

      {activity.data.activity.length ? (
        <section className="timeline">
          {activity.data.activity.map((item) => (
            <article className="timeline-row" key={item.id}>
              <div className="timeline-marker" />
              <div>
                <h3>
                  {item.actor} {item.action} {item.target}
                </h3>
                <p>{formatDate(item.occurredAt)}</p>
              </div>
              <RoleBadge role={item.role} />
            </article>
          ))}
        </section>
      ) : (
        <EmptyState title="No activity yet" detail="Workspace events will appear here as people collaborate." />
      )}
    </div>
  );
}
