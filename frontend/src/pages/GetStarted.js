import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Stethoscope } from 'lucide-react';

const GetStarted = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 px-4">

            {/* Title */}
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome to PocketCare
            </h1>
            <p className="text-gray-600 mb-10 text-center">
                Get started by choosing your role
            </p>

            {/* Cards */}
            <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">

                {/* User Card */}
                <div
                    onClick={() => navigate('/register')}
                    className="flex-1 cursor-pointer bg-white rounded-xl shadow-lg p-10 text-center hover:shadow-2xl hover:scale-105 transition duration-300"
                >
                    <div className="flex justify-center mb-4">
                        <User className="w-12 h-12 text-blue-500" />
                    </div>
                    <h2 className="text-3xl font-semibold text-blue-600 mb-4">
                        User
                    </h2>
                    <p className="text-gray-600 text-lg">
                        Book appointments, manage health records, and access care easily.
                    </p>
                </div>

                {/* Doctor Card */}
                <div
                    onClick={() => navigate('/doctorregister')}
                    className="flex-1 cursor-pointer bg-white rounded-xl shadow-lg p-10 text-center hover:shadow-2xl hover:scale-105 transition duration-300"
                >
                    <div className="flex justify-center mb-4">
                        <Stethoscope className="w-12 h-12 text-green-500" />
                    </div>
                    <h2 className="text-3xl font-semibold text-green-600 mb-4">
                        Doctor
                    </h2>
                    <p className="text-gray-600 text-lg">
                        Manage patients, appointments, and provide professional care.
                    </p>
                </div>

            </div>
        </div>
    );
};

export default GetStarted;
