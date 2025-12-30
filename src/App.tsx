import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/NotFound";

// Admin Pages
import AdminLayout from "@/layouts/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminStaffPage from "@/pages/admin/AdminStaffPage";
import AdminTasksPage from "@/pages/admin/AdminTasksPage";
import AdminAttendancePage from "@/pages/admin/AdminAttendancePage";
import AdminReportsPage from "@/pages/admin/AdminReportsPage";

// Staff Pages
import StaffLayout from "@/layouts/StaffLayout";
import StaffTasksPage from "@/pages/staff/StaffTasksPage";
import StaffAttendancePage from "@/pages/staff/StaffAttendancePage";
import StaffProfilePage from "@/pages/staff/StaffProfilePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Redirect root to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/staff"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout>
                    <AdminStaffPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tasks"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout>
                    <AdminTasksPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/attendance"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout>
                    <AdminAttendancePage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout>
                    <AdminReportsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            {/* Staff Routes */}
            <Route
              path="/staff"
              element={
                <ProtectedRoute allowedRole="staff">
                  <StaffLayout>
                    <StaffTasksPage />
                  </StaffLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/attendance"
              element={
                <ProtectedRoute allowedRole="staff">
                  <StaffLayout>
                    <StaffAttendancePage />
                  </StaffLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/profile"
              element={
                <ProtectedRoute allowedRole="staff">
                  <StaffLayout>
                    <StaffProfilePage />
                  </StaffLayout>
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
