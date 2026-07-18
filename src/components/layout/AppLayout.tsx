import { PropsWithChildren } from "react";
import { Menu } from "lucide-react";
import { useAppShellQuery } from "../../api/queries";
import { Button } from "../ui/Button";
import { LoadingState } from "../ui/LoadingState";
import { RoleBadge } from "../ui/RoleBadge";
import { SideNav } from "./SideNav";
import { useAppState } from "../../state/AppState";

export function AppLayout({ children }: PropsWithChildren) {
  const { data, isLoading } = useAppShellQuery();
  const { toggleSidebar } = useAppState();

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
          </div>
        </header>
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}
