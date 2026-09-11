import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import StudentsPage from "./pages/StudentsPage";
import StudentDetailPage from "./pages/StudentDetailPage";
import KutirsPage from "./pages/KutirsPage";
import KutirDetailPage from "./pages/KutirDetailPage";
import SchoolsPage from "./pages/SchoolsPage";
import VisitsPage from "./pages/VisitsPage";
import VisitsDashboardPage from "./pages/VisitsDashboardPage";
import UsersPage from "./pages/UsersPage";
import GeoPage from "./pages/GeoPage";
import AdmissionsPage from "./pages/AdmissionsPage";
import StudentProgressPage from "./pages/StudentProgressPage";
import ReportsPage from "./pages/ReportsPage";
import LookupsPage from "./pages/LookupsPage";
import ExamCentersPage from "./pages/ExamCentersPage";

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
        <Route path="students/:id" element={<StudentDetailPage />} />
        <Route path="kutirs" element={<KutirsPage />} />
        <Route path="kutirs/:id" element={<KutirDetailPage />} />
        <Route path="schools" element={<SchoolsPage />} />
        <Route path="visits" element={<VisitsDashboardPage />} />
        <Route path="visits/detail" element={<VisitsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="geo" element={<GeoPage />} />
        <Route path="admissions" element={<AdmissionsPage />} />
        <Route path="lookups" element={<LookupsPage />} />
        <Route path="exam-centers" element={<ExamCentersPage />} />
        <Route path="progress" element={<StudentProgressPage />} />
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
