import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  Hospital,
  Calendar,
  MessageSquare,
  FileText,
  Activity,
  Shield,
  Clock,
  Users
} from 'lucide-react';

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function Home() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Activity className="w-8 h-8" />,
      title: "AI Symptom Analyzer",
      description: "Get instant insights about your symptoms and recommended specialists"
    },
    {
      icon: <Hospital className="w-8 h-8" />,
      title: "Find Doctors & Hospitals",
      description: "Search and book appointments with verified healthcare professionals",
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: "Easy Booking",
      description: "Schedule appointments and manage your healthcare visits seamlessly",
      link: "/appointments"
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Medical Reports",
      description: "Upload and understand your lab reports with AI assistance"
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "24/7 Health Chat",
      description: "Get health guidance anytime with our AI-powered chatbot"
    },
    {
      icon: <HeartPulse className="w-8 h-8" />,
      title: "SOS Emergency",
      description: "Quick access to emergency services and nearby hospitals"
    }
  ];

  const stats = [
    { icon: <Users className="w-6 h-6" />, value: "10K+", label: "Active Users" },
    { icon: <Hospital className="w-6 h-6" />, value: "500+", label: "Partner Hospitals" },
    { icon: <Clock className="w-6 h-6" />, value: "24/7", label: "Support Available" },
    { icon: <Shield className="w-6 h-6" />, value: "100%", label: "Secure & Private" }
  ]; 

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block mb-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                AI-Powered Healthcare Platform
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Your Health,
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {' '}Simplified
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Access AI-powered symptom analysis, find doctors, book appointments,
                and get emergency help — all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/register')}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                >
                  Start Free Trial
                </button>
                <button className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition">
                  Watch Demo
                </button>
              </div>
              <div className="mt-8 flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-green-500" />
                  HIPAA Compliant
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-blue-500" />
                  24/7 Available
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-8">
                <img
                  src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop"
                  alt="Healthcare"
                  className="rounded-lg w-full"
                />
                <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Activity className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">AI Analysis</p>
                    <p className="text-xs text-gray-500">Instant Results</p>
                  </div>
                </div>
                <div className="absolute -top-6 -right-6 bg-white rounded-xl shadow-xl p-4 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => navigate('/appointments')}
                    className="flex items-center space-x-3 focus:outline-none"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Easy Booking</p>
                      <p className="text-xs text-gray-500">Quick & Simple</p>
                    </div>
                  </button>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-2xl transform rotate-3"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4 text-blue-600">
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Better Health
            </h2>
            <p className="text-xl text-gray-600">
              Comprehensive healthcare tools powered by artificial intelligence
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const isClickable = !!feature.link;
              const handleClick = () => {
                if (feature.link) navigate(feature.link);
              };
              const clickableProps = isClickable
                ? {
                    role: 'button',
                    tabIndex: 0,
                    onClick: handleClick,
                    onKeyPress: (e) => { if (e.key === 'Enter') handleClick(); },
                    className: "bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100 cursor-pointer"
                  }
                : {
                    className: "bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100"
                  };
              return (
                <div key={index} {...clickableProps}>
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Take Control of Your Health?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of users who trust PocketCare for their healthcare needs
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
          >
            Get Started for Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default Home;
