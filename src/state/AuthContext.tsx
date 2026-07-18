import { createContext, PropsWithChildren, useContext, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useSessionQuery } from "../api/queries";
import type { SessionData } from "../types/domain";

interface AuthContextValue {
  session: SessionData | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  isVerified: boolean;
  loginUrl: string;
  registerUrl: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useSessionQuery();

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      isAuthenticated: Boolean(session?.authenticated),
      isVerified: Boolean(session?.authenticated && session.verified),
      loginUrl: apiClient.getAuthRedirectUrl("login", "/"),
      registerUrl: apiClient.getAuthRedirectUrl("register", "/"),
      async signOut() {
        const signedOutSession = await apiClient.signOut();
        queryClient.setQueryData(["session"], signedOutSession);
        queryClient.removeQueries({ queryKey: ["app-shell"] });
      },
    }),
    [isLoading, queryClient, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return value;
}
