import axios from "axios";

const API_URL =
  (process.env.REACT_APP_API_URL || "http://localhost:5000") + "/api";

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Use admin token only on admin endpoints/pages; otherwise use user token.
    // If an old adminToken exists, sending it to non-admin endpoints can cause 401s
    // and trigger the global logout redirect.
    const userToken = localStorage.getItem("token");
    const adminToken = localStorage.getItem("adminToken");
    const hospitalToken = localStorage.getItem("hospitalToken");
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "";
    const url = (config?.url || "").toString();

    const isAdminContext =
      currentPath.startsWith("/admin") ||
      url.startsWith("/auth/admin") ||
      url.includes("/admin/");

    const isHospitalContext =
      currentPath.startsWith("/hospital") ||
      url.startsWith("/auth/hospital") ||
      url.includes("/hospital/");

    const token = isAdminContext ? adminToken : isHospitalContext ? hospitalToken : userToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // If we're sending a file upload (FormData), remove the default JSON content-type.
    // This allows the browser to set `multipart/form-data; boundary=...` correctly.
    try {
      if (typeof FormData !== "undefined" && config.data instanceof FormData) {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    } catch (e) {
      // no-op
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only force-logout when the backend explicitly indicates an invalid/expired token.
      // This prevents infinite redirect loops when a single endpoint returns 401 for other reasons.
      const apiError = error.response?.data?.error;
      const apiMsg = error.response?.data?.msg;
      const shouldForceLogout =
        apiError === "Invalid or expired token" ||
        (typeof apiMsg === "string" && apiMsg.toLowerCase().includes("token"));

      const hasAnyToken = !!(
        localStorage.getItem("token") || localStorage.getItem("adminToken") || localStorage.getItem("hospitalToken")
      );

      if (shouldForceLogout && hasAnyToken) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminInfo");
        localStorage.removeItem("hospitalToken");
        localStorage.removeItem("hospitalInfo");

        // Redirect to appropriate login page
        const currentPath = window.location.pathname;
        if (currentPath.includes("/admin")) {
          window.location.href = "/admin/login";
        } else if (currentPath.includes("/hospital")) {
          window.location.href = "/hospital/login";
        } else {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
