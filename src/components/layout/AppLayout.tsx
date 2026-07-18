import { FormEvent, PropsWithChildren, useState } from "react";
import { LogOut, Menu, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppShellQuery, useCreateWorkspaceMutation } from "../../api/queries";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { LoadingState } from "../ui/LoadingState";
import { RoleBadge } from "../ui/RoleBadge";
import { SideNav } from "./SideNav";
import { useAppState } from "../../state/AppState";
import { useAuth } from "../../state/AuthContext";
import { WorkspaceHomePage } from "../../pages/WorkspaceHomePage";

export function AppLayout({ children }: PropsWithChildren) {
  const { data, isLoading } = useAppShellQuery();
  const { setSelectedWorkspaceId, toggleSidebar } = useAppState();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const createWorkspace = useCreateWorkspaceMutation();

  if (isLoading || !data) {
    return <LoadingState title="Preparing workspace" detail="Loading layout and workspace context." />;
  }

  if (!data.workspace) {
    return <WorkspaceHomePage />;
  }

  async function onCreateWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createWorkspace.mutateAsync(workspaceName);
    setWorkspaceName("");
    setCreateOpen(false);
  }

  return (
    <div className="app-shell">
      <SideNav
        workspace={data.workspace}
        workspaces={data.workspaces}
        onWorkspaceChange={(workspaceId) => setSelectedWorkspaceId(workspaceId)}
      />
      <div className="app-main">
        <header className="top-bar">
          <div className="top-bar__left">
            <Button variant="ghost" size="icon" aria-label="Toggle navigation" onClick={toggleSidebar}>
              <Menu size={18} />
            </Button>
            <div>
              <p className="eyebrow">Current workspace</p>
              <h1>{data.workspace.name}</h1>
            </div>
          </div>
          <div className="top-bar__right">
            <RoleBadge role={data.workspace.role} />
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Workspace
            </Button>
            <div className="user-chip" aria-label={`Signed in as ${data.currentUser.name}`}>
              {data.currentUser.pictureUrl ? (
                <img src={data.currentUser.pictureUrl} alt="" referrerPolicy="no-referrer" />
              ) : null}
              <span>{data.currentUser.name}</span>
              <small>{data.currentUser.email}</small>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={async () => {
                await signOut();
                navigate("/login", { replace: true });
              }}
            >
              <LogOut size={18} />
            </Button>
          </div>
        </header>
        <main className="content-area">{children}</main>
      </div>
      <Dialog
        open={createOpen}
        title="Create workspace"
        description="The creator becomes the workspace owner."
        onClose={() => setCreateOpen(false)}
      >
        <form className="dialog-actions" onSubmit={onCreateWorkspace}>
          <Input
            label="Workspace name"
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            required
            maxLength={120}
          />
          <Button type="submit" disabled={createWorkspace.isPending}>
            <Plus size={16} />
            {createWorkspace.isPending ? "Creating" : "Create workspace"}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
