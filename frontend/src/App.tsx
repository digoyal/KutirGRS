import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import StudentsPage from "./pages/StudentsPage";
import StudentDetailPage from "./pages/StudentDetailPage";
import StudentAddPage from "./pages/StudentAddPage";
import KutirsPage from "./pages/KutirsPage";
import KutirDetailPage from "./pages/KutirDetailPage";
import KutirAddPage from "./pages/KutirAddPage";
import SchoolsPage from "./pages/SchoolsPage";
import SchoolDetailPage from "./pages/SchoolDetailPage";
import SchoolAddPage from "./pages/SchoolAddPage";
import VisitsPage from "./pages/VisitsPage";
import VisitsDashboardPage from "./pages/VisitsDashboardPage";
import VisitAddPage from "./pages/VisitAddPage";
import VisitDetailPage from "./pages/VisitDetailPage";
import UsersPage from "./pages/UsersPage";
import UserDetailPage from "./pages/UserDetailPage";
import UserAddPage from "./pages/UserAddPage";
import GeoPage from "./pages/GeoPage";
import AdmissionsPage from "./pages/AdmissionsPage";
import AdmissionAddPage from "./pages/AdmissionAddPage";
import AdmissionDetailPage from "./pages/AdmissionDetailPage";
import StudentProgressPage from "./pages/StudentProgressPage";
import ProgressDetailPage from "./pages/ProgressDetailPage";
import ProgressAddPage from "./pages/ProgressAddPage";
import NewYearSetupPage from "./pages/NewYearSetupPage";
import ImportDataPage from "./pages/ImportDataPage";
import ReportsPage from "./pages/ReportsPage";
import LookupsPage from "./pages/LookupsPage";
import ExamCentersPage from "./pages/ExamCentersPage";
import ExamCenterDetailPage from "./pages/ExamCenterDetailPage";
import ExamCenterAddPage from "./pages/ExamCenterAddPage";
import FieldConfigPage from "./pages/FieldConfigPage";
import DeployPage from "./pages/DeployPage";

const queryClient = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: "2rem" }}>Loading…</div>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>}>
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/new" element={<StudentAddPage />} />
        <Route path="students/:id" element={<StudentDetailPage />} />
        <Route path="kutirs" element={<KutirsPage />} />
        <Route path="kutirs/new" element={<KutirAddPage />} />
        <Route path="kutirs/:id" element={<KutirDetailPage />} />
        <Route path="schools" element={<SchoolsPage />} />
        <Route path="schools/new" element={<SchoolAddPage />} />
        <Route path="schools/:id" element={<SchoolDetailPage />} />
        <Route path="visits" element={<VisitsDashboardPage />} />
        <Route path="visits/detail" element={<VisitsPage />} />
        <Route path="visits/detail/new" element={<VisitAddPage />} />
        <Route path="visits/detail/:id" element={<VisitDetailPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/new" element={<UserAddPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="geo" element={<GeoPage />} />
        <Route path="admissions" element={<AdmissionsPage />} />
        <Route path="admissions/new" element={<AdmissionAddPage />} />
        <Route path="admissions/:id" element={<AdmissionDetailPage />} />
        <Route path="lookups" element={<LookupsPage />} />
        <Route path="exam-centers" element={<ExamCentersPage />} />
        <Route path="exam-centers/new" element={<ExamCenterAddPage />} />
        <Route path="exam-centers/:id" element={<ExamCenterDetailPage />} />
        <Route path="progress" element={<StudentProgressPage />} />
        <Route path="progress/new" element={<ProgressAddPage />} />
        <Route path="progress/:id" element={<ProgressDetailPage />} />
        <Route path="new-year-setup" element={<NewYearSetupPage />} />
        <Route path="import" element={<ImportDataPage />} />
        <Route path="admin/field-config" element={<FieldConfigPage />} />
        <Route path="admin/deploy" element={<DeployPage />} />
        <Route path="reports">
          <Route path="detailed" element={<ReportsPage />} />
          <Route path="summary" element={<ReportsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
