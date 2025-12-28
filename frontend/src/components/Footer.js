import React from "react";
import { HeartPulse } from "lucide-react";

const Footer = () => {
    return (
        <footer className="bg-gray-900 text-gray-400 py-12 px-4">
            <div className="max-w-7xl mx-auto text-center">

                {/* Logo */}
                <div className="flex items-center justify-center space-x-2 mb-4">
                    <HeartPulse className="w-6 h-6 text-blue-500" />
                    <span className="text-xl font-bold text-white">
                        PocketCare
                    </span>
                </div>

                {/* Copyright */}
                <p className="mb-4">
                    © 2025 PocketCare. All rights reserved.
                </p>

                {/* Disclaimer */}
                <p className="text-sm text-gray-500 max-w-2xl mx-auto">
                    For informational purposes only. Always consult healthcare
                    professionals.
                </p>

            </div>
        </footer>
    );
};

export default Footer;
