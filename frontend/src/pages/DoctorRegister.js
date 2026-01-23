import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Calendar,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Sparkles,
} from "lucide-react";
import api from "../utils/api";

const DoctorRegister = () => {
  const navigate = useNavigate();
  const [specialties, setSpecialties] = useState([]);
  const [specialtyQuery, setSpecialtyQuery] = useState("");
  const [specialtyDropdownOpen, setSpecialtyDropdownOpen] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState([]); // [{ id?: number, name: string }]

  const filteredSpecialties = useMemo(() => {
    const q = (specialtyQuery || "").trim().toLowerCase();
    const base = Array.isArray(specialties) ? specialties : [];
    if (!q) return base.slice(0, 8);
    return base
      .filter((s) => (s?.name || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [specialties, specialtyQuery]);

  const canAddCustom = useMemo(() => {
    const q = (specialtyQuery || "").trim();
    if (!q) return false;
    const existsInSelected = selectedSpecialties.some(
      (x) => (x?.name || "").toLowerCase() === q.toLowerCase(),
    );
    const existsInList = specialties.some(
      (s) => (s?.name || "").toLowerCase() === q.toLowerCase(),
    );
    return !existsInSelected && !existsInList;
  }, [specialtyQuery, selectedSpecialties, specialties]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    qualification: "",
    experience: "",
    consultation_fee: "",
    bio: "",
    captcha_id: "",
    captcha_answer: "",
  });

  const [captchaImage, setCaptchaImage] = useState("");
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
    } catch {
      setCaptchaImage("");
      setError("Unable to load captcha. Please refresh the page.");
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const res = await api.get("/specialties");
        const list = Array.isArray(res.data?.specialties)
          ? res.data.specialties
          : [];
        setSpecialties(list);
      } catch {
        // If specialties API fails, fallback to old free-text input behavior.
        setSpecialties([]);
      }
    };
    fetchSpecialties();
    fetchCaptcha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addSpecialty = (item) => {
    const name = (item?.name || "").trim();
    if (!name) return;
    const exists = selectedSpecialties.some(
      (x) => (x?.name || "").toLowerCase() === name.toLowerCase(),
    );
    if (exists) return;

    const next = [...selectedSpecialties, { id: item?.id, name }];
    setSelectedSpecialties(next);
    setSpecialtyQuery("");
    setSpecialtyDropdownOpen(false);
  };

  const removeSpecialty = (name) => {
    setSelectedSpecialties((prev) =>
      prev.filter(
        (x) => (x?.name || "").toLowerCase() !== (name || "").toLowerCase(),
      ),
    );
  };

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = { ...formData };

      if (!selectedSpecialties.length) {
        setError("Please select at least one specialty.");
        setLoading(false);
        return;
      }

      const names = selectedSpecialties.map((s) => s.name).filter(Boolean);
      const ids = selectedSpecialties
        .map((s) => s.id)
        .filter((x) => typeof x === "number");
      payload.specialties = names;
      payload.specialty_ids = ids;

      // Backward compatibility: set primary
      payload.specialty = names[0];
      if (ids.length) payload.specialty_id = ids[0];

      const response = await api.post("/auth/doctor/register", payload);
      if (response.data.access_token) {
        localStorage.setItem("token", response.data.access_token);
        // Keep auth storage consistent across the app:
        // DashboardController / getCurrentUser() reads from `user`.
        if (response.data.user) {
          localStorage.setItem("user", JSON.stringify(response.data.user));
        }
      }
      navigate("/dashboard"); // or doctor dashboard
    } catch (err) {
      const msg = err.response?.data?.error || "Registration failed.";
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
        <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-2xl overflow-hidden lg:h-[calc(100vh-6rem)]">
          <div className="grid lg:grid-cols-2 lg:h-full">
            {/* Left: Form */}
            <div className="bg-white/70 lg:h-full lg:overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent">
              <div className="w-full p-6 sm:p-8">
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

                <div className="mt-4">
                  <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
                    Doctor Registration
                  </h2>
                  <p className="mt-2 text-center text-sm text-gray-600">
                    Join PocketCare as a doctor
                  </p>
                </div>

                <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-xs font-semibold text-gray-700"
                      >
                        Full Name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        className="mt-1 appearance-none relative block w-full px-4 py-2.5 border border-gray-200 rounded-2xl bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-xs font-semibold text-gray-700"
                      >
                        Email address
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="mt-1 appearance-none relative block w-full px-4 py-2.5 border border-gray-200 rounded-2xl bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label
                        htmlFor="password"
                        className="block text-xs font-semibold text-gray-700"
                      >
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="mt-1 appearance-none relative block w-full px-4 py-2.5 border border-gray-200 rounded-2xl bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
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
                        className="block text-xs font-semibold text-gray-700"
                      >
                        Phone Number (Optional)
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        className="mt-1 appearance-none relative block w-full px-4 py-2.5 border border-gray-200 rounded-2xl bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
                        placeholder="+1234567890"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="qualification"
                        className="block text-xs font-semibold text-gray-700"
                      >
                        Qualification
                      </label>
                      <input
                        id="qualification"
                        name="qualification"
                        type="text"
                        className="mt-1 appearance-none relative block w-full px-4 py-2.5 border border-gray-200 rounded-2xl bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
                        placeholder="MBBS, MD"
                        value={formData.qualification}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="experience"
                        className="block text-xs font-semibold text-gray-700"
                      >
                        Years of Experience
                      </label>
                      <input
                        id="experience"
                        name="experience"
                        type="number"
                        min="0"
                        className="mt-1 appearance-none relative block w-full px-4 py-2.5 border border-gray-200 rounded-2xl bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
                        placeholder="5"
                        value={formData.experience}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="consultation_fee"
                        className="block text-xs font-semibold text-gray-700"
                      >
                        Consultation Fee
                      </label>
                      <input
                        id="consultation_fee"
                        name="consultation_fee"
                        type="number"
                        min="0"
                        step="0.01"
                        className="mt-1 appearance-none relative block w-full px-4 py-2.5 border border-gray-200 rounded-2xl bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
                        placeholder="500.00"
                        value={formData.consultation_fee}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="captcha_answer"
                          className="block text-xs font-semibold text-gray-700"
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
                        className="mt-2 appearance-none relative block w-full px-4 py-2.5 border border-gray-200 rounded-2xl bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
                        placeholder="Enter the text you see"
                        value={formData.captcha_answer}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label
                        htmlFor="specialty"
                        className="block text-xs font-semibold text-gray-700"
                      >
                        Specialty
                      </label>
                      <div className="mt-1">
                        {!!selectedSpecialties.length && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {selectedSpecialties.map((s) => (
                              <span
                                key={s.name}
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-sm"
                              >
                                {s.name}
                                <button
                                  type="button"
                                  className="text-blue-700 hover:text-blue-900"
                                  onClick={() => removeSpecialty(s.name)}
                                  aria-label={`Remove ${s.name}`}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="relative">
                          <input
                            id="specialty"
                            type="text"
                            className="appearance-none relative block w-full px-4 py-2.5 border border-gray-200 rounded-2xl bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
                            placeholder="Select specialties (search and pick multiple)"
                            value={specialtyQuery}
                            onChange={(e) => {
                              setSpecialtyQuery(e.target.value);
                              setSpecialtyDropdownOpen(true);
                            }}
                            onFocus={() => setSpecialtyDropdownOpen(true)}
                          />

                          {specialtyDropdownOpen && (
                            <div
                              className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-lg max-h-56 overflow-auto"
                              onMouseDown={(e) => e.preventDefault()}
                            >
                              {filteredSpecialties.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  className="w-full text-left px-4 py-2 hover:bg-gray-50"
                                  onClick={() =>
                                    addSpecialty({
                                      id: Number(s.id),
                                      name: s.name,
                                    })
                                  }
                                >
                                  {s.name}
                                </button>
                              ))}

                              {canAddCustom && (
                                <button
                                  type="button"
                                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-blue-700"
                                  onClick={() =>
                                    addSpecialty({ name: specialtyQuery })
                                  }
                                >
                                  Add “{specialtyQuery.trim()}”
                                </button>
                              )}

                              {!filteredSpecialties.length && !canAddCustom && (
                                <div className="px-4 py-2.5 text-sm text-gray-500">
                                  No matches
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <p className="mt-2 text-xs text-gray-500">
                          Pick from the list, or search and add your own. You
                          can select multiple.
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label
                        htmlFor="bio"
                        className="block text-xs font-semibold text-gray-700"
                      >
                        Short Bio
                      </label>
                      <textarea
                        id="bio"
                        name="bio"
                        className="mt-1 appearance-none relative block w-full px-4 py-2.5 border border-gray-200 rounded-2xl bg-white/80 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition min-h-[88px] resize-none"
                        placeholder="Tell us about yourself"
                        value={formData.bio}
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
                      {loading ? "Registering..." : "Register"}
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
            <div className="hidden lg:flex relative overflow-hidden border-t border-white/60 lg:border-t-0 lg:border-l lg:border-white/60 lg:h-full lg:overflow-hidden">
              <div className="absolute inset-0">
                <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" />
                <div className="absolute top-24 -left-28 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 right-16 w-72 h-72 bg-emerald-300/20 rounded-full blur-3xl" />
              </div>

              <div className="relative w-full p-8 flex flex-col h-full">
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
                      Doctor portal registration
                    </div>
                  </div>
                </div>

                <div className="mt-10">
                  <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">
                    Build your practice with PocketCare
                  </h1>
                  <p className="mt-3 text-gray-600 leading-relaxed">
                    Set up your profile, specialties, and consultation details
                    to start receiving appointments and messages.
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-4">
                  <div className="flex items-start gap-3 rounded-2xl bg-white/70 border border-white/60 px-5 py-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600/10 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-blue-700" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        Verified details
                      </div>
                      <div className="text-sm text-gray-600">
                        Captcha helps prevent spam registrations.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl bg-white/70 border border-white/60 px-5 py-4">
                    <div className="w-10 h-10 rounded-2xl bg-purple-600/10 flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-purple-700" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        Specialty discovery
                      </div>
                      <div className="text-sm text-gray-600">
                        Patients can find you faster by specialty.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl bg-white/70 border border-white/60 px-5 py-4">
                    <div className="w-10 h-10 rounded-2xl bg-amber-600/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        Schedule-ready profile
                      </div>
                      <div className="text-sm text-gray-600">
                        Complete details once, then manage appointments easily.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl bg-white/70 border border-white/60 px-5 py-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        Modern care
                      </div>
                      <div className="text-sm text-gray-600">
                        Chat, appointments, and profile management.
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
                          id="pcLineDoctorRegister"
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
                        stroke="url(#pcLineDoctorRegister)"
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
};

export default DoctorRegister;
