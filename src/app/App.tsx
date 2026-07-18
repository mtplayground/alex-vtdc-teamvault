import { Navigate, Route, Routes } from "react-router-dom";
import { useSessionQuery } from "../api/queries";
import { AppLayout } from "../components/layout/AppLayout";
import { LoadingState } from "../components/ui/LoadingState";
import { ActivityPage } from "../pages/ActivityPage";
import { CheckEmailPage } from "../pages/CheckEmailPage";
import { DashboardPage } from "../pages/DashboardPage";
import { DocumentsPage } from "../pages/DocumentsPage";
import { MembersPage } from "../pages/MembersPage";
import { ProjectsPage } from "../pages/ProjectsPage";
import { RegisterPage } from "../pages/RegisterPage";
import { SettingsPage } from "../pages/SettingsPage";
import { VerifiedPage } from "../pages/VerifiedPage";

export function App() {
  const { data: session, isLoading } = useSessionQuery();

  if (isLoading || !session) {
    return <LoadingState title="Checking session" detail="Confirming account status." />;
  }

  if (!session.authenticated) {
    return (
      <Routes>
        <Route path="/" element={<RegisterPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/verified" element={<VerifiedPage />} />
        <Route path="*" element={<Navigate to="/register" replace />} />
      </Routes>
    );
  }

  if (!session.verified) {
    return (
      <Routes>
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/verified" element={<VerifiedPage />} />
        <Route path="*" element={<Navigate to="/check-email" replace />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
