import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Doctor Registration
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join PocketCare as a doctor
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
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
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
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
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
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
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={handleChange}
              />
              <p className="mt-1 text-xs text-gray-500">
                Must be 8+ characters with uppercase, lowercase, and number
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
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
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
                  className="text-sm font-medium text-primary hover:text-blue-600 disabled:opacity-50"
                >
                  {captchaLoading ? "Loading..." : "New captcha"}
                </button>
              </div>

              <div className="mt-2 flex items-center justify-center border border-gray-200 rounded-md bg-white py-2">
                {captchaImage ? (
                  <img src={captchaImage} alt="Captcha" className="h-12" />
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
                className="mt-2 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Enter the text you see"
                value={formData.captcha_answer}
                onChange={handleChange}
              />
            </div>

            <div>
              <label
                htmlFor="specialty"
                className="block text-sm font-medium text-gray-700"
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
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
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
                      className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-auto"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {filteredSpecialties.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-50"
                          onClick={() =>
                            addSpecialty({ id: Number(s.id), name: s.name })
                          }
                        >
                          {s.name}
                        </button>
                      ))}

                      {canAddCustom && (
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-blue-700"
                          onClick={() => addSpecialty({ name: specialtyQuery })}
                        >
                          Add “{specialtyQuery.trim()}”
                        </button>
                      )}

                      {!filteredSpecialties.length && !canAddCustom && (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No matches
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="mt-1 text-xs text-gray-500">
                  Pick from the list, or search and add your own. You can select
                  multiple.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="qualification"
                className="block text-sm font-medium text-gray-700"
              >
                Qualification
              </label>
              <input
                id="qualification"
                name="qualification"
                type="text"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="MBBS, MD"
                value={formData.qualification}
                onChange={handleChange}
              />
            </div>

            <div>
              <label
                htmlFor="experience"
                className="block text-sm font-medium text-gray-700"
              >
                Years of Experience
              </label>
              <input
                id="experience"
                name="experience"
                type="number"
                min="0"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="5"
                value={formData.experience}
                onChange={handleChange}
              />
            </div>

            <div>
              <label
                htmlFor="consultation_fee"
                className="block text-sm font-medium text-gray-700"
              >
                Consultation Fee
              </label>
              <input
                id="consultation_fee"
                name="consultation_fee"
                type="number"
                min="0"
                step="0.01"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="500.00"
                value={formData.consultation_fee}
                onChange={handleChange}
              />
            </div>

            <div>
              <label
                htmlFor="bio"
                className="block text-sm font-medium text-gray-700"
              >
                Short Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
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
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
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
  );
};

export default DoctorRegister;
