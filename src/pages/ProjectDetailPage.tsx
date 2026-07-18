import { Archive, ArrowLeft, Edit3, FolderOpen, Lock } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAppShellQuery, useArchiveProjectMutation, useProjectQuery } from "../api/queries";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState } from "../components/ui/LoadingState";
import { useToast } from "../components/ui/Toast";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { data } = useAppShellQuery();
  const workspaceId = data?.workspace?.id;
  const project = useProjectQuery(workspaceId, projectId);
  const archiveProject = useArchiveProjectMutation(workspaceId);
  const { notify } = useToast();

  if (!data?.workspace || project.isLoading) {
    return <LoadingState title="Loading project" detail="Preparing project details." />;
  }

  if (!project.data) {
    return (
      <EmptyState
        title="Project unavailable"
        detail="This project may have been archived or your role may not include access to it."
        action={
          <Link className="button button--secondary button--md" to="/projects">
            <ArrowLeft size={16} />
            Back to projects
          </Link>
        }
      />
    );
  }

  const canManageProjects = data.workspace.permissions.includes("projects.manage");
  const currentProject = project.data.project;

  async function onArchive() {
    if (!workspaceId || !projectId) {
      return;
    }

    try {
      await archiveProject.mutateAsync({ workspaceId, projectId });
      notify("Project archived.", "success");
      navigate("/projects");
    } catch {
      notify("Project could not be archived.", "error");
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Project</p>
          <h2>{currentProject.name}</h2>
          <p>
            {currentProject.documentCount} documents · Updated {formatDate(currentProject.updatedAt)}
          </p>
        </div>
        <div className="row-actions">
          <Link className="button button--secondary button--md" to="/projects">
            <ArrowLeft size={16} />
            Projects
          </Link>
          {canManageProjects ? (
            <Button variant="danger" onClick={() => void onArchive()} disabled={archiveProject.isPending}>
              <Archive size={16} />
              Archive
            </Button>
          ) : null}
        </div>
      </section>

      <section className="state-panel state-panel--compact">
        <FolderOpen size={20} />
        <h2>Project access</h2>
        <p>
          <span className="visibility-chip">
            <Lock size={14} />
            {currentProject.visibility === "guest-scoped" ? "Guest scoped" : "Workspace"}
          </span>
        </p>
      </section>

      <EmptyState
        title="Documents will appear here"
        detail="This page is ready for the document workflow to attach uploads, reviews, and guest access to the project."
        action={
          canManageProjects ? (
            <Link className="button button--secondary button--md" to="/projects">
              <Edit3 size={16} />
              Manage project
            </Link>
          ) : null
        }
      />
    </div>
  );
}
