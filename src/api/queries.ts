import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useActivityQuery(workspaceId?: string) {
  return useInfiniteQuery({
    queryKey: ["activity", workspaceId],
    queryFn: ({ pageParam }) =>
      apiClient.listActivity({
        workspaceId: workspaceId!,
        offset: pageParam,
        limit: 25,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: Boolean(workspaceId),
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

export function useCreateInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.createInvitation,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["activity", variables.workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ["app-shell"] });
    },
  });
}

export function useRosterQuery(workspaceId?: string) {
  return useQuery({
    queryKey: ["roster", workspaceId],
    queryFn: () => apiClient.getRoster(workspaceId!),
    enabled: Boolean(workspaceId),
  });
}

export function useUpdateMemberRoleMutation(workspaceId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.updateMemberRole,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roster", workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      void queryClient.invalidateQueries({ queryKey: ["app-shell"] });
      void queryClient.invalidateQueries({ queryKey: ["activity", workspaceId] });
    },
  });
}

export function useRemoveMemberMutation(workspaceId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.removeMember,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roster", workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      void queryClient.invalidateQueries({ queryKey: ["app-shell"] });
      void queryClient.invalidateQueries({ queryKey: ["activity", workspaceId] });
    },
  });
}

export function useAcceptInvitationMutation() {
  const queryClient = useQueryClient();
  const { setSelectedWorkspaceId } = useAppState();

  return useMutation({
    mutationFn: apiClient.acceptInvitation,
    onSuccess: (data) => {
      setSelectedWorkspaceId(data.workspaceId);
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      void queryClient.invalidateQueries({ queryKey: ["app-shell"] });
    },
  });
}

export function useProjectsQuery(workspaceId?: string) {
  return useQuery({
    queryKey: ["projects", workspaceId],
    queryFn: () => apiClient.listProjects(workspaceId!),
    enabled: Boolean(workspaceId),
  });
}

export function useProjectQuery(workspaceId?: string, projectId?: string) {
  return useQuery({
    queryKey: ["project", workspaceId, projectId],
    queryFn: () => apiClient.getProject({ workspaceId: workspaceId!, projectId: projectId! }),
    enabled: Boolean(workspaceId && projectId),
  });
}

export function useCreateProjectMutation(workspaceId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.createProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects", workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ["app-shell"] });
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      void queryClient.invalidateQueries({ queryKey: ["activity", workspaceId] });
    },
  });
}

export function useRenameProjectMutation(workspaceId?: string, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.renameProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects", workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ["project", workspaceId, projectId] });
      void queryClient.invalidateQueries({ queryKey: ["app-shell"] });
      void queryClient.invalidateQueries({ queryKey: ["activity", workspaceId] });
    },
  });
}

export function useArchiveProjectMutation(workspaceId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.archiveProject,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["projects", workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ["project", workspaceId, variables.projectId] });
      void queryClient.invalidateQueries({ queryKey: ["app-shell"] });
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      void queryClient.invalidateQueries({ queryKey: ["activity", workspaceId] });
    },
  });
}

export function useDocumentsQuery(workspaceId?: string, projectId?: string) {
  return useQuery({
    queryKey: ["documents", workspaceId, projectId],
    queryFn: () => apiClient.listDocuments({ workspaceId: workspaceId!, projectId: projectId! }),
    enabled: Boolean(workspaceId && projectId),
  });
}

export function useUploadDocumentMutation(workspaceId?: string, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.uploadDocument,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["documents", workspaceId, projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project", workspaceId, projectId] });
      void queryClient.invalidateQueries({ queryKey: ["projects", workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ["app-shell"] });
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      void queryClient.invalidateQueries({ queryKey: ["activity", workspaceId] });
    },
  });
}

export function useDocumentQuery(workspaceId?: string, projectId?: string, documentId?: string) {
  return useQuery({
    queryKey: ["document", workspaceId, projectId, documentId],
    queryFn: () =>
      apiClient.getDocument({
        workspaceId: workspaceId!,
        projectId: projectId!,
        documentId: documentId!,
      }),
    enabled: Boolean(workspaceId && projectId && documentId),
  });
}

export function useDocumentPreviewUrlQuery(workspaceId?: string, projectId?: string, documentId?: string) {
  return useQuery({
    queryKey: ["document-preview-url", workspaceId, projectId, documentId],
    queryFn: () =>
      apiClient.getDocumentPreviewUrl({
        workspaceId: workspaceId!,
        projectId: projectId!,
        documentId: documentId!,
      }),
    enabled: Boolean(workspaceId && projectId && documentId),
    staleTime: 4 * 60 * 1000,
  });
}

export function useDocumentDownloadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.createDocumentDownloadUrl,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["activity", variables.workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ["app-shell"] });
    },
  });
}

export function useShareDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.shareDocument,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["activity", variables.workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ["app-shell"] });
    },
  });
}
