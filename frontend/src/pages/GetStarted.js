import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Stethoscope, User } from "lucide-react";

const GetStarted = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      <div className="relative overflow-hidden">
        {/* Decorative blobs */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
          <div className="absolute top-28 -right-28 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-13 left-1/3 w-96 h-96 bg-emerald-300/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/favicon.png"
                alt="PocketCare"
                className="w-10 h-10 rounded-xl shadow-sm ring-1 ring-white/60"
              />
              <div>
                <div className="text-xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  PocketCare
                </div>
                <div className="text-xs text-gray-600 font-medium">
                  Choose how to continue
                </div>
              </div>
            </div>

            <Link
              to="/login"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 border border-white/60 text-gray-700 font-semibold hover:bg-white transition"
            >
              Sign in
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Main */}
          <div className="mt-10 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight text-center">
              Get started with
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                PocketCare
              </span>
            </h1>
            <p className="mt-3 text-gray-600 text-lg text-center">
              Choose your role to continue.
            </p>

            <div className="mt-8 grid md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="group w-full text-left rounded-3xl bg-white/70 border border-white/60 shadow-xl hover:shadow-2xl transition overflow-hidden focus:outline-none focus:ring-4 focus:ring-blue-100"
                aria-label="Continue as User"
              >
                <div className="relative p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center border border-white/60">
                        <User className="w-6 h-6 text-blue-700" />
                      </div>
                      <div>
                        <div className="text-2xl font-extrabold text-gray-900">
                          User
                        </div>
                        <div className="text-sm text-gray-600">
                          Book appointments & manage health
                        </div>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-blue-600 text-white font-semibold text-sm shadow-sm group-hover:opacity-95 transition">
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>

                  <div className="mt-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Find doctors and book time slots
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      Use chat and health features
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate("/doctorregister")}
                className="group w-full text-left rounded-3xl bg-white/70 border border-white/60 shadow-xl hover:shadow-2xl transition overflow-hidden focus:outline-none focus:ring-4 focus:ring-emerald-100"
                aria-label="Continue as Doctor"
              >
                <div className="relative p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 flex items-center justify-center border border-white/60">
                        <Stethoscope className="w-6 h-6 text-emerald-700" />
                      </div>
                      <div>
                        <div className="text-2xl font-extrabold text-gray-900">
                          Doctor
                        </div>
                        <div className="text-sm text-gray-600">
                          Create profile & start consulting
                        </div>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-emerald-600 text-white font-semibold text-sm shadow-sm group-hover:opacity-95 transition">
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>

                  <div className="mt-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Manage appointments & patients
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Receive messages and bookings
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-8 sm:hidden">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 border border-white/60 text-gray-700 font-semibold hover:bg-white transition"
            >
              Sign in
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;
