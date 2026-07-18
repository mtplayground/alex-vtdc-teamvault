import { Activity, FileText, FolderKanban, Home, Settings, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { WorkspaceSummary } from "../../types/domain";
import { useAppState } from "../../state/AppState";

const navItems = [
  { to: "/", label: "Overview", icon: Home },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/members", label: "Members", icon: Users },
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function SideNav({ workspace }: { workspace: WorkspaceSummary }) {
  const { sidebarCollapsed } = useAppState();

  return (
    <aside className={sidebarCollapsed ? "side-nav side-nav--collapsed" : "side-nav"}>
      <div className="side-nav__brand">
        <div className="brand-mark" aria-hidden="true">
          D
        </div>
        <div className="side-nav__brand-text">
          <strong>Documents</strong>
          <span>Secure workspace</span>
        </div>
      </div>

      <nav className="side-nav__links" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"}>
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="side-nav__summary">
        <span>{workspace.projectCount} projects</span>
        <span>{workspace.documentCount} documents</span>
      </div>
    </aside>
  );
}
