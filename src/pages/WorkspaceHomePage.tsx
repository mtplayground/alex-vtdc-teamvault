import { FormEvent, useState } from "react";
import { Building2, Plus } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { LoadingState } from "../components/ui/LoadingState";
import { useCreateWorkspaceMutation, useWorkspacesQuery } from "../api/queries";
import { useAppState } from "../state/AppState";

export function WorkspaceHomePage() {
  const [name, setName] = useState("");
  const { data, isLoading } = useWorkspacesQuery();
  const { selectedWorkspaceId, setSelectedWorkspaceId } = useAppState();
  const createWorkspace = useCreateWorkspaceMutation();

  if (isLoading || !data) {
    return <LoadingState title="Loading workspaces" detail="Checking your workspace memberships." />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createWorkspace.mutateAsync(name);
    setName("");
  }

  return (
    <main className="auth-page">
      <section className="auth-panel workspace-home">
        <div className="auth-mark" aria-hidden="true">
          <Building2 size={24} />
        </div>
        <p className="eyebrow">Workspace home</p>
        <h1>{data.workspaces.length ? "Choose a workspace" : "Create a workspace"}</h1>
        <p>
          Workspaces keep projects, documents, members, and activity organized under the right owner account.
        </p>

        {data.workspaces.length ? (
          <div className="workspace-list" aria-label="Your workspaces">
            {data.workspaces.map((workspace) => (
              <button
                className={workspace.id === selectedWorkspaceId ? "workspace-option workspace-option--active" : "workspace-option"}
                key={workspace.id}
                type="button"
                onClick={() => setSelectedWorkspaceId(workspace.id)}
              >
                <span>{workspace.name}</span>
                <small>
                  {workspace.role} · {workspace.memberCount} member{workspace.memberCount === 1 ? "" : "s"}
                </small>
              </button>
            ))}
          </div>
        ) : null}

        <form className="auth-form" onSubmit={onSubmit}>
          <Input
            label={data.workspaces.length ? "New workspace name" : "Workspace name"}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={120}
          />
          <Button type="submit" disabled={createWorkspace.isPending}>
            <Plus size={16} />
            {createWorkspace.isPending ? "Creating" : "Create workspace"}
          </Button>
        </form>
      </section>
    </main>
  );
}
