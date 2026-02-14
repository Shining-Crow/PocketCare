import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DoctorNavbar from "./DoctorNavbar";
import UserNavbar from "./UserNavbar";
import { getCurrentUser, logout } from "../utils/auth";

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const isDoctor = user?.role === "doctor";
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(() => {
    const lang = i18n.resolvedLanguage || i18n.language || "en";
    return lang.startsWith("bn") ? "bn" : "en";
  });

  useEffect(() => {
    localStorage.setItem("pc_user_language", language);
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [i18n, language]);

  useEffect(() => {
    // React Router doesn't reset scroll by default.
    // This prevents landing on the dashboard slightly scrolled down after login/navigation.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleToggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "bn" : "en"));
  };

  return (
    <div className="min-h-screen">
      {isDoctor ? (
        <DoctorNavbar handleLogout={handleLogout} />
      ) : (
        <UserNavbar
          language={language}
          onToggleLanguage={handleToggleLanguage}
        />
      )}

      <Outlet />
    </div>
  );
}

export default AuthenticatedLayout;
