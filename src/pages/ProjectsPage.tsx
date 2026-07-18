import { Lock, Plus } from "lucide-react";
import { useAppShellQuery } from "../api/queries";
import { Button } from "../components/ui/Button";

export function ProjectsPage() {
  const { data } = useAppShellQuery();

  if (!data) {
    return null;
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Projects</p>
          <h2>Project folders</h2>
          <p>Each project groups documents and defines where guest visibility will be scoped.</p>
        </div>
        <Button>
          <Plus size={16} />
          New project
        </Button>
      </section>

      <section className="list-panel">
        {data.projects.map((project) => (
          <article className="list-row" key={project.id}>
            <div>
              <h3>{project.name}</h3>
              <p>{project.documentCount} documents · Updated {project.updatedAt}</p>
            </div>
            <span className="visibility-chip">
              <Lock size={14} />
              {project.visibility === "guest-scoped" ? "Guest scoped" : "Workspace"}
            </span>
          </article>
        ))}
      </section>
    </div>
  );
}
