import { FormEvent, useState } from "react";
import { Archive, Edit3, FolderOpen, Lock, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  useAppShellQuery,
  useArchiveProjectMutation,
  useCreateProjectMutation,
  useProjectsQuery,
  useRenameProjectMutation,
} from "../api/queries";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadingState } from "../components/ui/LoadingState";
import { useToast } from "../components/ui/Toast";
import type { ProjectSummary } from "../types/domain";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function projectFormError(error: unknown) {
  if (error instanceof ApiError && error.code === "project_name_taken") {
    return "A project with that name already exists.";
  }

  if (error instanceof ApiError && error.code === "validation_error") {
    return "Project names must be 160 characters or fewer.";
  }

  return "Project could not be saved. Check the name and try again.";
}

export function ProjectsPage() {
  const { data } = useAppShellQuery();
  const workspaceId = data?.workspace?.id;
  const projects = useProjectsQuery(workspaceId);
  const createProject = useCreateProjectMutation(workspaceId);
  const renameProject = useRenameProjectMutation(workspaceId);
  const archiveProject = useArchiveProjectMutation(workspaceId);
  const { notify } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [editingProject, setEditingProject] = useState<ProjectSummary | null>(null);
  const [editName, setEditName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  if (!data?.workspace || projects.isLoading || !projects.data) {
    return <LoadingState title="Loading projects" detail="Preparing project folders and permissions." />;
  }

  const canCreateProjects = data.workspace.permissions.includes("projects.create");
  const canManageProjects = data.workspace.permissions.includes("projects.manage");

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspaceId) {
      return;
    }

    setFormError(null);

    try {
      await createProject.mutateAsync({ workspaceId, name: projectName.trim() });
      setProjectName("");
      setCreateOpen(false);
      notify("Project created.", "success");
    } catch (error) {
      setFormError(projectFormError(error));
    }
  }

  function startRename(project: ProjectSummary) {
    setEditingProject(project);
    setEditName(project.name);
    setFormError(null);
  }

  async function onRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspaceId || !editingProject) {
      return;
    }

    setFormError(null);

    try {
      await renameProject.mutateAsync({
        workspaceId,
        projectId: editingProject.id,
        name: editName.trim(),
      });
      setEditingProject(null);
      setEditName("");
      notify("Project renamed.", "success");
    } catch (error) {
      setFormError(projectFormError(error));
    }
  }

  async function onArchive(project: ProjectSummary) {
    if (!workspaceId) {
      return;
    }

    try {
      await archiveProject.mutateAsync({ workspaceId, projectId: project.id });
      notify("Project archived.", "success");
    } catch {
      notify("Project could not be archived.", "error");
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Projects</p>
          <h2>Project folders</h2>
          <p>Each project groups documents and defines where guest visibility is scoped.</p>
        </div>
        <Button
          disabled={!canCreateProjects}
          title={canCreateProjects ? undefined : "Your role cannot create projects."}
          onClick={() => {
            setFormError(null);
            setCreateOpen(true);
          }}
        >
          <Plus size={16} />
          New project
        </Button>
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
              <div className="row-actions">
                <span className="visibility-chip">
                  <Lock size={14} />
                  {project.visibility === "guest-scoped" ? "Guest scoped" : "Workspace"}
                </span>
                {canManageProjects ? (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => startRename(project)}>
                      <Edit3 size={14} />
                      Rename
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => void onArchive(project)}
                      disabled={archiveProject.isPending}
                    >
                      <Archive size={14} />
                      Archive
                    </Button>
                  </>
                ) : (
                  <span className="permission-note">View only</span>
                )}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          title="No projects yet"
          detail="Create a project folder before uploading documents or inviting guest reviewers."
          action={
            <Button disabled={!canCreateProjects} onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              New project
            </Button>
          }
        />
      )}

      <Dialog
        open={createOpen}
        title="Create project"
        description="Name the folder where workspace documents will be organized."
        onClose={() => setCreateOpen(false)}
      >
        <form className="dialog-actions" onSubmit={onCreate}>
          <Input
            label="Project name"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            maxLength={160}
            required
          />
          {formError ? <p className="form-error">{formError}</p> : null}
          <Button type="submit" disabled={createProject.isPending || !projectName.trim()}>
            <Plus size={16} />
            {createProject.isPending ? "Creating" : "Create project"}
          </Button>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(editingProject)}
        title="Rename project"
        description="Update the project name shown to workspace members and invited guests."
        onClose={() => setEditingProject(null)}
      >
        <form className="dialog-actions" onSubmit={onRename}>
          <Input
            label="Project name"
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            maxLength={160}
            required
          />
          {formError ? <p className="form-error">{formError}</p> : null}
          <Button type="submit" disabled={renameProject.isPending || !editName.trim()}>
            <Edit3 size={16} />
            {renameProject.isPending ? "Saving" : "Save name"}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
