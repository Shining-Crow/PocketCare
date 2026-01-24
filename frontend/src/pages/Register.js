import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { HeartPulse, ShieldCheck, Stethoscope, Sparkles } from "lucide-react";
import { register } from "../utils/auth";
import api from "../utils/api";

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    captcha_id: "",
    captcha_answer: "",
  });
  const [captchaImage, setCaptchaImage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const res = await api.get("/auth/captcha");
      const b64 = res.data?.image_base64 || "";
      setCaptchaImage(
        b64 ? `data:${res.data?.mime_type || "image/png"};base64,${b64}` : "",
      );
      setFormData((prev) => ({
        ...prev,
        captcha_id: res.data?.captcha_id || "",
        captcha_answer: "",
      }));
    } catch (e) {
      setCaptchaImage("");
      setError("Unable to load captcha. Please refresh the page.");
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(formData);
      navigate("/dashboard");
    } catch (err) {
      const msg =
        err.response?.data?.error || "Registration failed. Please try again.";
      setError(msg);
      if ((msg || "").toLowerCase().includes("captcha")) {
        await fetchCaptcha();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 sm:px-6 lg:px-8 py-10 flex items-center">
      <div className="w-full max-w-6xl mx-auto">
        <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="grid lg:grid-cols-2">
            {/* Left: Form */}
            <div className="flex items-center bg-white/70">
              <div className="w-full p-8 sm:p-10">
                <div className="flex items-center justify-center gap-3 lg:hidden">
                  <img
                    src="/favicon.png"
                    alt="PocketCare"
                    className="w-10 h-10 rounded-xl shadow-sm ring-1 ring-white/60"
                  />
                  <div className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    PocketCare
                  </div>
                </div>

                <div className="mt-6">
                  <h2 className="text-center text-3xl font-extrabold text-gray-900">
                    Create your account
                  </h2>
                  <p className="mt-2 text-center text-sm text-gray-600">
                    Join PocketCare today
                  </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Full Name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        className="mt-1 appearance-none relative block w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Email address
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="mt-1 appearance-none relative block w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="mt-1 appearance-none relative block w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
                        placeholder="At least 8 characters"
                        value={formData.password}
                        onChange={handleChange}
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        Must be 8+ characters with uppercase, lowercase, and
                        number
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Phone Number (Optional)
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        className="mt-1 appearance-none relative block w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
                        placeholder="+1234567890"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="captcha_answer"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Captcha
                        </label>
                        <button
                          type="button"
                          onClick={fetchCaptcha}
                          disabled={captchaLoading}
                          className="text-sm font-semibold text-primary hover:text-blue-600 disabled:opacity-50"
                        >
                          {captchaLoading ? "Loading..." : "New captcha"}
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-center border border-gray-200 rounded-2xl bg-white/80 px-3 py-3 min-h-[96px]">
                        {captchaImage ? (
                          <img
                            src={captchaImage}
                            alt="Captcha"
                            className="h-16 sm:h-20 w-auto max-w-full object-contain"
                          />
                        ) : (
                          <div className="text-sm text-gray-700">
                            {captchaLoading
                              ? "Loading captcha..."
                              : "Captcha unavailable"}
                          </div>
                        )}
                      </div>

                      <input
                        id="captcha_answer"
                        name="captcha_answer"
                        type="text"
                        required
                        className="mt-2 appearance-none relative block w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
                        placeholder="Enter the text you see"
                        value={formData.captcha_answer}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-2xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
                    >
                      {loading ? "Creating account..." : "Sign up"}
                    </button>
                  </div>

                  <div className="text-center text-sm">
                    <span className="text-gray-600">
                      Already have an account?{" "}
                    </span>
                    <Link
                      to="/login"
                      className="font-medium text-primary hover:text-blue-600"
                    >
                      Sign in
                    </Link>
                  </div>
                </form>
              </div>
            </div>

            {/* Right: About / Illustration */}
            <div className="hidden lg:flex relative overflow-hidden border-t border-white/60 lg:border-t-0 lg:border-l lg:border-white/60">
              <div className="absolute inset-0">
                <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" />
                <div className="absolute top-24 -left-28 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 right-16 w-72 h-72 bg-emerald-300/20 rounded-full blur-3xl" />
              </div>

              <div className="relative w-full p-10 flex flex-col">
                <div className="flex items-center gap-3">
                  <img
                    src="/favicon.png"
                    alt="PocketCare"
                    className="w-10 h-10 rounded-xl shadow-sm ring-1 ring-white/60"
                  />
                  <div>
                    <div className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      PocketCare
                    </div>
                    <div className="text-sm text-gray-600 font-medium">
                      Your health companion, in one place
                    </div>
                  </div>
                </div>

                <div className="mt-10">
                  <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">
                    Start your health journey today
                  </h1>
                  <p className="mt-3 text-gray-600 leading-relaxed">
                    Create an account to book appointments, message doctors,
                    manage reports, and use health tools.
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-4">
                  <div className="flex items-start gap-3 rounded-2xl bg-white/70 border border-white/60 px-5 py-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600/10 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-blue-700" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        Secure signup
                      </div>
                      <div className="text-sm text-gray-600">
                        Captcha-protected account creation.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl bg-white/70 border border-white/60 px-5 py-4">
                    <div className="w-10 h-10 rounded-2xl bg-purple-600/10 flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-purple-700" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        Doctor access
                      </div>
                      <div className="text-sm text-gray-600">
                        Find doctors and book appointments easily.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl bg-white/70 border border-white/60 px-5 py-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        All-in-one
                      </div>
                      <div className="text-sm text-gray-600">
                        Messages, reports, symptom checker, and more.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-10" aria-hidden="true">
                  <div className="rounded-3xl bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-white/60 px-6 py-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-white/70 border border-white/60 flex items-center justify-center">
                        <HeartPulse className="w-5 h-5 text-blue-700" />
                      </div>
                      <div className="text-sm font-semibold text-gray-700">
                        Care that feels modern.
                      </div>
                    </div>
                    <svg viewBox="0 0 800 140" className="w-full h-20">
                      <defs>
                        <linearGradient
                          id="pcLineRegister"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop
                            offset="0"
                            stopColor="#2563eb"
                            stopOpacity="0.9"
                          />
                          <stop
                            offset="1"
                            stopColor="#7c3aed"
                            stopOpacity="0.9"
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d="M10 80 H150 L190 30 L230 120 L270 60 L310 80 H430 L470 40 L510 120 L550 65 L590 80 H790"
                        fill="none"
                        stroke="url(#pcLineRegister)"
                        strokeWidth="6"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      <circle cx="190" cy="30" r="6" fill="#2563eb" />
                      <circle cx="470" cy="40" r="6" fill="#7c3aed" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
