import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import HealthChat from "./pages/HealthChat";
import Messages from "./pages/Messages";
import SymptomChecker from "./pages/SymptomChecker";
import UserProfile from "./pages/UserProfile";
import { isAuthenticated, getCurrentUser } from "./utils/auth";
import GetStarted from "./pages/GetStarted";
import DoctorRegister from "./pages/DoctorRegister";
import DoctorDashboard from "./pages/DoctorDashboard";
import Appointments from "./pages/Appointments";
import DoctorSearch from "./pages/DoctorSearch";
import BookAppointment from "./pages/BookAppointment";
import DoctorInfo from "./pages/DoctorInfo";
import AuthenticatedLayout from "./components/AuthenticatedLayout";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import MedicalReports from "./pages/MedicalReports";
import WeightManagement from "./pages/WeightManagement";
import HospitalLogin from "./pages/HospitalLogin";
import HospitalDashboard from "./pages/HospitalDashboard";

// Protected Route Component
function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }) {
  return isAuthenticated() ? <Navigate to="/dashboard" replace /> : children;
}

// Protected Route Component for Admin
function AdminProtectedRoute({ children }) {
  const adminToken = localStorage.getItem("adminToken");
  return adminToken ? children : <Navigate to="/admin/login" />;
}

function HospitalProtectedRoute({ children }) {
  const hospitalToken = localStorage.getItem("hospitalToken");
  return hospitalToken ? children : <Navigate to="/hospital/login" />;
}

// Dashboard Controller - routes to correct dashboard based on role
function DashboardController() {
  const user = getCurrentUser();
  console.log("DashboardController - Current user:", user);
  return user?.role === "doctor" ? <DoctorDashboard /> : <Dashboard />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <PublicOnlyRoute>
              <Home />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/getstarted"
          element={
            <PublicOnlyRoute>
              <GetStarted />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/doctorregister"
          element={
            <PublicOnlyRoute>
              <DoctorRegister />
            </PublicOnlyRoute>
          }
        />

        {/* Authenticated area */}
        <Route
          element={
            <ProtectedRoute>
              <AuthenticatedLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardController />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/health-chat" element={<HealthChat />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/symptom-checker" element={<SymptomChecker />} />
          <Route path="/reports" element={<MedicalReports />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/doctors" element={<DoctorSearch />} />
          <Route path="/doctor/:id" element={<DoctorInfo />} />
          <Route path="/book/:doctorId" element={<BookAppointment />} />
          <Route path="/weight-management" element={<WeightManagement />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />
        <Route path="/admin" element={<Navigate to="/admin/login" />} />

        {/* Hospital Routes */}
        <Route path="/hospital/login" element={<HospitalLogin />} />
        <Route
          path="/hospital/dashboard"
          element={
            <HospitalProtectedRoute>
              <HospitalDashboard />
            </HospitalProtectedRoute>
          }
        />
        <Route path="/hospital" element={<Navigate to="/hospital/login" />} />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
