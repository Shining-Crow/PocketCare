import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HeartPulse } from "lucide-react";

const Navbar = () => {
    const navigate = useNavigate();
    const [loggedIn, setLoggedIn] = useState(false);

    useEffect(() => {
        const checkAuth = () => setLoggedIn(!!localStorage.getItem('token'));
        checkAuth();
        window.addEventListener('storage', checkAuth);
        // Clear localStorage on tab/browser close to force logout
        const handleUnload = () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        };
        window.addEventListener('beforeunload', handleUnload);
        const interval = setInterval(checkAuth, 500);
        return () => {
            window.removeEventListener('storage', checkAuth);
            window.removeEventListener('beforeunload', handleUnload);
            clearInterval(interval);
        };
    }, []);

        // Logout handler
        const handleLogout = () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setLoggedIn(false);
            navigate('/');
        };

    return (
        <nav className="bg-white shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">

                    {/* Logo */}
                    <div className="flex items-center space-x-2 cursor-pointer"
                        onClick={() => navigate("/")}>
                        <HeartPulse className="w-8 h-8 text-blue-600" />
                        <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            PocketCare
                        </span>
                    </div>

                    {/* Desktop Links */}
                    <div className="hidden md:flex space-x-8">
                        <a
                            href="#features"
                            className="text-gray-700 hover:text-blue-600 transition"
                        >
                            Features
                        </a>
                        <a
                            href="#how-it-works"
                            className="text-gray-700 hover:text-blue-600 transition"
                        >
                            How It Works
                        </a>
                        <a
                            href="#about"
                            className="text-gray-700 hover:text-blue-600 transition"
                        >
                            About
                        </a>
                    </div>

                    {/* Auth Buttons */}
                    <div className="flex space-x-4"> 
                            {!loggedIn ? (
                                <>
                                    <button
                                        onClick={() => navigate("/login")}
                                        className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition"
                                    >
                                        Login
                                    </button>
                                    <button
                                        onClick={() => navigate("/getstarted")}
                                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                                    >
                                        Get Started
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleLogout}
                                    className="px-4 py-2 text-red-600 hover:text-red-700 font-medium transition"
                                >
                                    Log Out
                                </button>
                            )}
                    </div>

                </div>
            </div>
        </nav>
    );
};

export default Navbar;
