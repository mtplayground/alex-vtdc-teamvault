import { PropsWithChildren } from "react";
import { LogOut, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppShellQuery } from "../../api/queries";
import { Button } from "../ui/Button";
import { LoadingState } from "../ui/LoadingState";
import { RoleBadge } from "../ui/RoleBadge";
import { SideNav } from "./SideNav";
import { useAppState } from "../../state/AppState";
import { useAuth } from "../../state/AuthContext";

export function AppLayout({ children }: PropsWithChildren) {
  const { data, isLoading } = useAppShellQuery();
  const { toggleSidebar } = useAppState();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  if (isLoading || !data) {
    return <LoadingState title="Preparing workspace" detail="Loading layout and workspace context." />;
  }

  return (
    <div className="app-shell">
      <SideNav workspace={data.workspace} />
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
    </div>
  );
}
