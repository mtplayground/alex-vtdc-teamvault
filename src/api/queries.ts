import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

export function useAppShellQuery() {
  return useQuery({
    queryKey: ["app-shell"],
    queryFn: apiClient.getAppShell,
  });
}

export function useSessionQuery() {
  return useQuery({
    queryKey: ["session"],
    queryFn: apiClient.getSession,
  });
}
