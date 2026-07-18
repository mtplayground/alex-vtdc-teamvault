import { createContext, useContext, useMemo, useState } from "react";

interface AppStateValue {
  selectedWorkspaceId: string | null;
  setSelectedWorkspaceId: (workspaceId: string) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const value = useMemo<AppStateValue>(
    () => ({
      selectedWorkspaceId,
      setSelectedWorkspaceId,
      sidebarCollapsed,
      toggleSidebar: () => setSidebarCollapsed((current) => !current),
    }),
    [selectedWorkspaceId, sidebarCollapsed],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used inside AppStateProvider");
  }

  return context;
}
