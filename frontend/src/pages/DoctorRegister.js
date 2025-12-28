import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api'; 

const DoctorRegister = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        specialty: '',
        qualification: '',
        experience: '',
        consultation_fee: '',
        bio: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/doctor/register', formData);
            if (response.data.access_token) {
                localStorage.setItem('token', response.data.access_token);
                localStorage.setItem('doctor', JSON.stringify(response.data.doctor));
            }
            navigate('/dashboard'); // or doctor dashboard
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed.');
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
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
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
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
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
                            <label htmlFor="specialty" className="block text-sm font-medium text-gray-700">
                                Specialty
                            </label>
                            <input
                                id="specialty"
                                name="specialty"
                                type="text"
                                required
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                                placeholder="Cardiology"
                                value={formData.specialty}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label htmlFor="qualification" className="block text-sm font-medium text-gray-700">
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
                            <label htmlFor="experience" className="block text-sm font-medium text-gray-700">
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
                            <label htmlFor="consultation_fee" className="block text-sm font-medium text-gray-700">
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
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
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
                            {loading ? 'Registering...' : 'Register'}
                        </button>
                    </div>

                    <div className="text-center text-sm">
                        <span className="text-gray-600">Already have an account? </span>
                        <Link to="/login" className="font-medium text-primary hover:text-blue-600">
                            Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DoctorRegister;
