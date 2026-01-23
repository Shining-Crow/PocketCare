import React from "react";
import { BadgeDollarSign, GraduationCap, Stethoscope } from "lucide-react";

export default function DoctorCard({ doctor, onClick }) {
  const qualification = (doctor?.qualification || "").trim();

  const rawFee = doctor?.consultation_fee;
  const feeNumber = rawFee === 0 || rawFee ? Number(rawFee) : Number.NaN;
  const hasFee = Number.isFinite(feeNumber) && feeNumber >= 0;
  const formattedFee = hasFee
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
        feeNumber,
      )
    : "";

  return (
    <div
      className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
    >
      {/* Doctor Image */}
      <div className="w-full h-44 bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center overflow-hidden relative">
        {doctor?.image ? (
          <img
            src={doctor.image}
            alt={doctor?.name || "Doctor"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center relative">
            <div
              className="absolute inset-0 flex items-center justify-center"
              aria-hidden="true"
            >
              <Stethoscope className="w-24 h-24 text-blue-300/60" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="w-full p-5 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-gray-900 truncate">
              {doctor?.name || "Doctor"}
            </h2>
            <p className="text-gray-600 text-sm truncate">
              {doctor?.specialty || "Specialty not listed"}
            </p>
          </div>

          <span
            className={
              "shrink-0 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border " +
              (doctor?.is_available
                ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                : "text-rose-700 border-rose-200 bg-rose-50")
            }
          >
            <span
              className={
                "w-2 h-2 rounded-full " +
                (doctor?.is_available ? "bg-emerald-500" : "bg-rose-500")
              }
            />
            {doctor?.is_available ? "Available" : "Unavailable"}
          </span>
        </div>

        {(qualification || hasFee) && (
          <div className="mt-3 grid grid-cols-1 gap-2">
            {!!qualification && (
              <div className="inline-flex items-center gap-2 text-sm text-gray-700">
                <span className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-blue-700" />
                </span>
                <span className="truncate">{qualification}</span>
              </div>
            )}

            {hasFee && (
              <div className="inline-flex items-center gap-2 text-sm text-gray-700">
                <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <BadgeDollarSign className="w-4 h-4 text-emerald-700" />
                </span>
                <span className="font-semibold">৳{formattedFee}</span>
                <span className="text-gray-500">consultation fee</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
