import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const HospitalLogin = () => {
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!credentials.email || !credentials.password) {
            setError('Please enter both Email and Password');
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await api.post('/auth/hospital/login', {
                email: credentials.email,
                password: credentials.password,
            });

            const token = res?.data?.access_token;
            const hospital = res?.data?.hospital;

            if (!token || !hospital) {
                throw new Error('Invalid login response');
            }

            localStorage.setItem('hospitalToken', token);
            localStorage.setItem('hospitalInfo', JSON.stringify(hospital));

            navigate('/hospital/dashboard');
        } catch (err) {
            const apiError = err?.response?.data?.error;
            setError(apiError || err?.message || 'Login failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        PocketCare
                    </h1>
                    <p className="text-xl font-semibold text-gray-800">Hospital Portal</p>
                    <p className="text-gray-600 mt-2">Access your hospital management dashboard</p>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Hospital ID
                            </label>
                            <input
                                type="text"
                                value={credentials.hospitalId}
                                onChange={(e) => setCredentials({ ...credentials, hospitalId: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter your hospital ID"
                            />
                        </div>
                                    Email
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                    type="email"
                                    value={credentials.email}
                                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                                type="password"
                                value={credentials.password}
                                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter your password"
                            />
                        </div>
                                disabled={isSubmitting}

                        {error && (
                                {isSubmitting ? 'Signing In...' : 'Sign In'}
                                {error}
                            </div>
                            className="w-full bg-green-50 text-green-700 py-3 rounded-lg font-semibold hover:bg-green-100 transition-all border border-green-200"
                        >
                            🎯 Demo Access (Quick Login)
                        </button>
                        <p className="text-xs text-gray-500 text-center mt-2">
                            Click for instant access to demo dashboard
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => navigate('/')}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                            ← Back to Home
                        </button>
                    </div>
                </div>

                {/* Features */}
                <div className="mt-8 grid grid-cols-2 gap-4 text-center">
                    <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4">
                        <div className="text-2xl mb-2">🏥</div>
                        <p className="text-sm font-medium text-gray-700">Bed Management</p>
                    </div>
                    <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4">
                        <div className="text-2xl mb-2">👨‍⚕️</div>
                        <p className="text-sm font-medium text-gray-700">Doctor Portal</p>
                    </div>
                    <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4">
                        <div className="text-2xl mb-2">📅</div>
                        <p className="text-sm font-medium text-gray-700">Appointments</p>
                    </div>
                    <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4">
                        <div className="text-2xl mb-2">📊</div>
                        <p className="text-sm font-medium text-gray-700">Analytics</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HospitalLogin;
