import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { ActivityPage } from "../pages/ActivityPage";
import { DashboardPage } from "../pages/DashboardPage";
import { DocumentsPage } from "../pages/DocumentsPage";
import { MembersPage } from "../pages/MembersPage";
import { ProjectsPage } from "../pages/ProjectsPage";
import { SettingsPage } from "../pages/SettingsPage";

export function App() {
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
