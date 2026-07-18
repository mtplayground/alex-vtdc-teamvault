import { FileText, FolderOpen, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppShellQuery, useProjectsQuery } from "../api/queries";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState } from "../components/ui/LoadingState";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function DocumentsPage() {
  const { data } = useAppShellQuery();
  const workspaceId = data?.workspace?.id;
  const projects = useProjectsQuery(workspaceId);
  const canUpload = Boolean(data?.workspace?.permissions.includes("documents.upload"));

  if (!data?.workspace || projects.isLoading || !projects.data) {
    return <LoadingState title="Loading documents" detail="Preparing projects and document counts." />;
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Documents</p>
          <h2>Document library</h2>
          <p>
            Documents are organized by project. {canUpload ? "Open a project to upload PDFs and images." : "Guests can open shared projects in view-only mode."}
          </p>
        </div>
      </section>

      {projects.data.projects.length ? (
        <section className="list-panel">
          {projects.data.projects.map((project) => (
            <article className="list-row" key={project.id}>
              <Link to={`/projects/${project.id}`} className="project-link">
                <FolderOpen size={18} />
                <div>
                  <h3>{project.name}</h3>
                  <p>
                    {project.documentCount} documents · Updated {formatDate(project.updatedAt)}
                  </p>
                </div>
              </Link>
              <span className="visibility-chip">
                <Lock size={14} />
                {project.visibility === "guest-scoped" ? "Guest scoped" : "Workspace"}
              </span>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          title="No projects available"
          detail="Create a project before uploading documents, or ask an owner to grant project access."
          action={<FileText size={20} />}
        />
      )}
    </div>
  );
}
