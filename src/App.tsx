import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LocationProtectedRoute from "@/components/LocationProtectedRoute";
import { useEffect, useState } from "react";
import { loadModels } from "@/services/faceService";

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
import AdminAccountsPage from "@/pages/admin/AdminAccountsPage";

// Staff Pages
import StaffLayout from "@/layouts/StaffLayout";
import StaffTasksPage from "@/pages/staff/StaffTasksPage";
import StaffProfilePage from "@/pages/staff/StaffProfilePage";
import StaffDailyReportPage from "@/pages/staff/StaffDailyReportPage";
import StaffExpensePage from "@/pages/staff/StaffExpensePage";

// Public Pages
import AttendancePage from "@/pages/AttendancePage";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    loadModels();
  }, []);


  return (
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

              {/* Public Attendance Route - Protected by Location */}
              <Route
                path="/attendance"
                element={<AttendancePage />}
              />

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
              <Route
                path="/admin/accounts"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminLayout>
                      <AdminAccountsPage />
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
                path="/staff/reports"
                element={
                  <ProtectedRoute allowedRole="staff">
                    <StaffLayout>
                      <StaffDailyReportPage />
                    </StaffLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/staff/expense"
                element={
                  <ProtectedRoute allowedRole="staff">
                    <StaffLayout>
                      <StaffExpensePage />
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
};

export default App;
