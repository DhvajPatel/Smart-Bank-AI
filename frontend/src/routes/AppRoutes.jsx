import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import Login from "../pages/auth/Login";
import AppShell from "../components/layout/AppShell";
import Settings from "../pages/shared/Settings";

import EmployeeDashboard from "../pages/employee/Dashboard";
import CustomerDashboard from "../pages/customer/CustomerDashboard";
import EmployeeCustomers from "../pages/employee/Customers";
import Customer360 from "../pages/employee/Customer360";
import Finance from "../pages/employee/Finance";
import Spending from "../pages/employee/Spending";
import LoanPrediction from "../pages/employee/LoanPrediction";
import Recommendations from "../pages/employee/Recommendations";

import AdminDashboard from "../pages/admin/Dashboard";
import Analytics from "../pages/admin/Analytics";
import LoanAnalytics from "../pages/admin/LoanAnalytics";
import Marketing from "../pages/admin/Marketing";
import SystemOverview from "../pages/admin/SystemOverview";

function ProtectedRoute({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    const dest = user.role === "admin" ? "/admin" : "/employee";
    return <Navigate to={dest} replace />;
  }
  return children;
}

export default function AppRoutes() {
  const { user } = useAuth();

  const defaultDest = !user
    ? "/login"
    : user.role === "admin"
    ? "/admin"
    : user.role === "customer"
    ? `/employee/customers/${user.customer_id}`
    : "/employee";

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={defaultDest} replace /> : <Login />}
      />

      {/* employee + customer share the same shell, both use "employee" routes */}
      <Route
        path="/employee"
        element={
          <ProtectedRoute role={null}>
            <AppShell />
          </ProtectedRoute>
        }
      >
        {/* customer role sees their personal dashboard; employee sees portfolio */}
        <Route index element={
          user?.role === "customer" ? <CustomerDashboard /> : <EmployeeDashboard />
        } />
        <Route path="customers" element={<EmployeeCustomers />} />
        <Route path="customers/:id" element={<Customer360 />} />
        <Route path="finance" element={<Finance />} />
        <Route path="spending" element={<Spending />} />
        <Route path="loans" element={<LoanPrediction />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="customers" element={<EmployeeCustomers />} />
        <Route path="customers/:id" element={<Customer360 />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="loans" element={<LoanAnalytics />} />
        <Route path="marketing" element={<Marketing />} />
        <Route path="models" element={<SystemOverview />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to={defaultDest} replace />} />
    </Routes>
  );
}
