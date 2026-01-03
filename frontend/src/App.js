import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import HealthChat from './pages/HealthChat';
import { isAuthenticated, getCurrentUser } from './utils/auth';
import GetStarted from './pages/GetStarted';
import DoctorRegister from './pages/DoctorRegister';
import DoctorDashboard from './pages/DoctorDashboard';
import Appointments from './pages/Appointments';
import BookAppointment from './pages/BookAppointment';
import DoctorInfo from './pages/DoctorInfo';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

// Protected Route Component
function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" />;
}

// Protected Route Component for Admin
function AdminProtectedRoute({ children }) {
  const adminToken = localStorage.getItem('adminToken');
  return adminToken ? children : <Navigate to="/admin/login" />;
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
        <Route path="/" element={<Home />} />
        <Route path="/getstarted" element={<GetStarted />} />
        <Route path="/login" element={<Login />} />
        <Route path="/doctorregister" element={<DoctorRegister />} />
        <Route path="/register" element={<Register />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/doctor/:id" element={<DoctorInfo />} />
        <Route path="/book/:doctorId" element={<BookAppointment />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardController />
            </ProtectedRoute>
          }
        />
        <Route
          path="/health-chat"
          element={
            <ProtectedRoute>
              <HealthChat />
            </ProtectedRoute>
          }
        />

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

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
