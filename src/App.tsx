import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { UserRole } from "./types";
import { lazy, Suspense } from "react";

// Eager-loaded pages (critical path)
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const Students = lazy(() => import("./pages/Students"));
const Teachers = lazy(() => import("./pages/Teachers"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Notices = lazy(() => import("./pages/Notices"));
const Timetable = lazy(() => import("./pages/Timetable"));
const Syllabus = lazy(() => import("./pages/Syllabus"));
const Reports = lazy(() => import("./pages/Reports"));
const Assignments = lazy(() => import("./pages/Assignments"));
const Exams = lazy(() => import("./pages/Exams"));
const Fees = lazy(() => import("./pages/Fees"));
const Institutes = lazy(() => import("./pages/Institutes"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const StudentProfilePage = lazy(() => import("./pages/StudentProfilePage"));
const Settings = lazy(() => import("./pages/Settings"));
const AcademicYears = lazy(() => import("./pages/AcademicYears"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function PageLoader() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

const ADMIN_ROLES: UserRole[] = ['super_admin', 'institute_admin'];
const STAFF_ROLES: UserRole[] = ['super_admin', 'institute_admin', 'class_teacher', 'subject_teacher'];
const ALL_ROLES: UserRole[] = ['super_admin', 'institute_admin', 'class_teacher', 'subject_teacher', 'student', 'parent'];

function RoleBasedDashboard() {
  const { user } = useAuth();
  switch (user?.role) {
    case 'student':
      return <StudentDashboard />;
    case 'parent':
      return <ParentDashboard />;
    case 'class_teacher':
    case 'subject_teacher':
      return <TeacherDashboard />;
    default:
      return <Dashboard />;
  }
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />} />
      <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense>} />
      <Route path="/reset-password" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />

      {/* Dashboard */}
      <Route path="/dashboard" element={<ProtectedRoute><RoleBasedDashboard /></ProtectedRoute>} />

      {/* Admin & Staff modules */}
      <Route path="/academic-years" element={<ProtectedRoute roles={ADMIN_ROLES}><AcademicYears /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute roles={STAFF_ROLES}><Students /></ProtectedRoute>} />
      <Route path="/teachers" element={<ProtectedRoute roles={ADMIN_ROLES}><Teachers /></ProtectedRoute>} />
      <Route path="/fees" element={<ProtectedRoute roles={[...ADMIN_ROLES, 'student', 'parent']}><Fees /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute roles={STAFF_ROLES}><Reports /></ProtectedRoute>} />

      {/* All authenticated users */}
      <Route path="/attendance" element={<ProtectedRoute roles={ALL_ROLES}><Attendance /></ProtectedRoute>} />
      <Route path="/timetable" element={<ProtectedRoute roles={ALL_ROLES}><Timetable /></ProtectedRoute>} />
      <Route path="/syllabus" element={<ProtectedRoute roles={ALL_ROLES}><Syllabus /></ProtectedRoute>} />
      <Route path="/notices" element={<ProtectedRoute roles={ALL_ROLES}><Notices /></ProtectedRoute>} />
      <Route path="/assignments" element={<ProtectedRoute roles={ALL_ROLES}><Assignments /></ProtectedRoute>} />
      <Route path="/exams" element={<ProtectedRoute roles={ALL_ROLES}><Exams /></ProtectedRoute>} />

      {/* Student profile */}
      <Route path="/profile" element={<ProtectedRoute roles={['student']}><StudentProfilePage /></ProtectedRoute>} />

      {/* Super admin only */}
      <Route path="/institutes" element={<ProtectedRoute roles={['super_admin']}><Institutes /></ProtectedRoute>} />

      {/* Placeholder routes */}
      <Route path="/grading" element={<ProtectedRoute roles={ADMIN_ROLES}><ComingSoon title="Grading Configuration" /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
