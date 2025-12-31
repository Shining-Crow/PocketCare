import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import HealthChat from './pages/HealthChat';
import { isAuthenticated } from './utils/auth';
import GetStarted from './pages/GetStarted';
import DoctorRegister from './pages/DoctorRegister';

// Protected Route Component
function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" />;
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
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
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
      </Routes>
    </Router>
  );
}

export default App;
