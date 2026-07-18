import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { useAppState } from "../state/AppState";

export function useAppShellQuery() {
  const { selectedWorkspaceId } = useAppState();

  return useQuery({
    queryKey: ["app-shell", selectedWorkspaceId],
    queryFn: () => apiClient.getAppShell(selectedWorkspaceId),
  });
}

export function useSessionQuery() {
  return useQuery({
    queryKey: ["session"],
    queryFn: apiClient.getSession,
  });
}

export function useWorkspacesQuery() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: apiClient.listWorkspaces,
  });
}

export function useCreateWorkspaceMutation() {
  const queryClient = useQueryClient();
  const { setSelectedWorkspaceId } = useAppState();

  return useMutation({
    mutationFn: apiClient.createWorkspace,
    onSuccess: (data) => {
      setSelectedWorkspaceId(data.workspaceId);
      queryClient.setQueryData(["workspaces"], { workspaces: data.workspaces });
      void queryClient.invalidateQueries({ queryKey: ["app-shell"] });
    },
  });
}
