import { useAppShellQuery } from "../api/queries";
import { RoleBadge } from "../components/ui/RoleBadge";

export function ActivityPage() {
  const { data } = useAppShellQuery();

  if (!data) {
    return null;
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Activity</p>
          <h2>Workspace history</h2>
          <p>A stable timeline surface is ready for audited workspace events.</p>
        </div>
      </section>

      <section className="timeline">
        {data.activity.map((item) => (
          <article className="timeline-row" key={item.id}>
            <div className="timeline-marker" />
            <div>
              <h3>
                {item.actor} {item.action} {item.target}
              </h3>
              <p>{item.occurredAt}</p>
            </div>
            <RoleBadge role={item.role} />
          </article>
        ))}
      </section>
    </div>
  );
}
