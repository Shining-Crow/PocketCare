import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackToDashboardButton({ className = "" }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate("/dashboard")}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-transparent border border-gray-200 hover:opacity-80 active:opacity-70 transition ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      Back
    </button>
  );
}
