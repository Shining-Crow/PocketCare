import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import DoctorNavbar from "./DoctorNavbar";
import UserNavbar from "./UserNavbar";
import { getCurrentUser, logout } from "../utils/auth";

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const isDoctor = user?.role === "doctor";

  useEffect(() => {
    // React Router doesn't reset scroll by default.
    // This prevents landing on the dashboard slightly scrolled down after login/navigation.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen">
      {isDoctor ? <DoctorNavbar handleLogout={handleLogout} /> : <UserNavbar />}

      <Outlet />
    </div>
  );
}

export default AuthenticatedLayout;
