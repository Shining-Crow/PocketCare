import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, AlertTriangle, Settings, Users, Activity } from 'lucide-react';
import api from '../utils/api';

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/admin/login', {
        email,
        password
      });

      // Store admin token and info
      localStorage.setItem('adminToken', response.data.access_token);
      localStorage.setItem('adminInfo', JSON.stringify(response.data.admin));
      
      // Redirect to admin dashboard
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 sm:px-6 lg:px-8 py-10 flex items-center">
      <div className="w-full max-w-6xl mx-auto">
        <div className="rounded-3xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="grid lg:grid-cols-2">
            {/* Left: Brand / Admin Info */}
            <div className="hidden lg:flex relative overflow-hidden">
              <div className="absolute inset-0">
                <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute top-20 -right-28 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 left-16 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
              </div>

              <div className="relative w-full p-10 flex flex-col">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <ShieldCheck className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      PocketCare
                    </div>
                    <div className="text-sm text-slate-400 font-medium">
                      Administration Portal
                    </div>
                  </div>
                </div>

                <div className="mt-10">
                  <h1 className="text-4xl font-extrabold text-white leading-tight">
                    Admin Control Center
                  </h1>
                  <p className="mt-3 text-slate-400 leading-relaxed">
                    Secure access to manage hospitals, doctors, users, and system settings for PocketCare platform.
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-4">
                  <div className="flex items-start gap-3 rounded-2xl bg-slate-700/50 border border-slate-600/60 px-5 py-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        User Management
                      </div>
                      <div className="text-sm text-slate-400">
                        Manage patients, doctors, and hospital accounts.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl bg-slate-700/50 border border-slate-600/60 px-5 py-4">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        System Analytics
                      </div>
                      <div className="text-sm text-slate-400">
                        Monitor platform health and user activity.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl bg-slate-700/50 border border-slate-600/60 px-5 py-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                      <Settings className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        System Configuration
                      </div>
                      <div className="text-sm text-slate-400">
                        Configure platform settings and permissions.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security badge */}
                <div className="mt-auto pt-10" aria-hidden="true">
                  <div className="rounded-3xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-slate-600/60 px-6 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-700/70 border border-slate-600/60 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">
                          Secure Access Control
                        </div>
                        <div className="text-xs text-slate-400">
                          Role-based authentication with encrypted sessions
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Login Form */}
            <div className="flex items-center bg-slate-900/50 border-t border-slate-700/60 lg:border-t-0 lg:border-l lg:border-slate-700/60">
              <div className="w-full p-8 sm:p-10">
                <div className="flex items-center justify-center gap-3 lg:hidden">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    PocketCare Admin
                  </div>
                </div>

                <div className="mt-6">
                  <h2 className="text-center text-3xl font-extrabold text-white">
                    Administrator Login
                  </h2>
                  <p className="mt-2 text-center text-sm text-slate-400">
                    Enter your credentials to access the control panel
                  </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-slate-300"
                      >
                        Email Address
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="mt-1 appearance-none relative block w-full px-4 py-3 border border-slate-600 rounded-2xl bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition"
                        placeholder="admin@pocketcare.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-slate-300"
                      >
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="mt-1 appearance-none relative block w-full px-4 py-3 border border-slate-600 rounded-2xl bg-slate-800/80 text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent text-sm font-semibold rounded-2xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-5 h-5" />
                          <span>Sign in to Admin Portal</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mt-6">
                    <AlertTriangle className="w-4 h-4" />
                    <span>This portal is restricted to administrators only</span>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
