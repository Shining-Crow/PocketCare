import React from 'react';

const HospitalEmergencySOS = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🚨 Emergency SOS Management</h2>
          <p className="text-gray-600 mt-1">Real-time emergency alerts and response system</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            ● System Active
          </span>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
            Settings
          </button>
        </div>
      </div>

      {/* Emergency Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-2">Active Alerts</h3>
              <p className="text-3xl font-bold">3</p>
            </div>
            <div className="text-3xl animate-pulse">🚨</div>
          </div>
          <p className="text-red-100 text-sm mt-2">Awaiting response</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-2">Response Time</h3>
              <p className="text-3xl font-bold">4.2 min</p>
            </div>
            <div className="text-3xl">⏱️</div>
          </div>
          <p className="text-blue-100 text-sm mt-2">Average today</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-2">Cases Resolved</h3>
              <p className="text-3xl font-bold">12</p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
          <p className="text-green-100 text-sm mt-2">Today's count</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-2">Success Rate</h3>
              <p className="text-3xl font-bold">94%</p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
          <p className="text-purple-100 text-sm mt-2">This month</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Emergencies - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Active Emergency Alerts</h3>
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>All Priorities</option>
              <option>High Priority</option>
              <option>Medium Priority</option>
              <option>Low Priority</option>
            </select>
          </div>
          
          <div className="space-y-4">
            {[
              { 
                id: 1, 
                name: 'John Doe', 
                age: 45, 
                condition: 'Cardiac Arrest', 
                symptoms: 'Chest pain, difficulty breathing', 
                location: 'Sector 7, Dhaka', 
                distance: '2.3 km', 
                time: '2 min ago', 
                priority: 'High',
                bloodType: 'O+',
                phone: '+880 1712-345678'
              },
              { 
                id: 2, 
                name: 'Sarah Smith', 
                age: 32, 
                condition: 'Severe Bleeding', 
                symptoms: 'Heavy bleeding from injury', 
                location: 'Gulshan, Dhaka', 
                distance: '3.8 km', 
                time: '5 min ago', 
                priority: 'High',
                bloodType: 'A+',
                phone: '+880 1812-345678'
              },
              { 
                id: 3, 
                name: 'Mike Johnson', 
                age: 58, 
                condition: 'Difficulty Breathing', 
                symptoms: 'Severe shortness of breath', 
                location: 'Banani, Dhaka', 
                distance: '1.5 km', 
                time: '8 min ago', 
                priority: 'Medium',
                bloodType: 'B+',
                phone: '+880 1912-345678'
              },
            ].map(alert => (
              <div key={alert.id} className="border border-red-200 rounded-xl bg-gradient-to-r from-red-50 to-white p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3">
                    <div className="text-3xl animate-pulse">🚨</div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-bold text-gray-800 text-lg">{alert.name}</p>
                        <span className="text-sm text-gray-600">({alert.age} yrs)</span>
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                          {alert.bloodType}
                        </span>
                      </div>
                      <p className="text-red-700 font-semibold mt-1">{alert.condition}</p>
                      <p className="text-sm text-gray-600 mt-1">{alert.symptoms}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      alert.priority === 'High' ? 'bg-red-500 text-white animate-pulse' : 
                      alert.priority === 'Medium' ? 'bg-yellow-500 text-white' : 
                      'bg-blue-500 text-white'
                    }`}>
                      {alert.priority.toUpperCase()}
                    </span>
                    <p className="text-xs text-gray-500 mt-2">{alert.time}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 p-3 bg-white rounded-lg border border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm font-medium text-gray-800">📍 {alert.location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Distance</p>
                    <p className="text-sm font-medium text-gray-800">🚗 {alert.distance}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Contact</p>
                    <p className="text-sm font-medium text-gray-800">📞 {alert.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="text-sm font-medium text-orange-600">⏳ Awaiting Response</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium text-sm flex items-center justify-center">
                    ✓ Accept & Dispatch Ambulance
                  </button>
                  <button className="px-4 py-2.5 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition font-medium text-sm">
                    📞 Call
                  </button>
                  <button className="px-4 py-2.5 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium text-sm">
                    📍 Map
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar - Stats & Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Emergency Resources */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h4 className="font-semibold text-gray-800 mb-4">Available Resources</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Ambulances</p>
                  <p className="text-xs text-gray-500">Ready to dispatch</p>
                </div>
                <p className="text-2xl font-bold text-green-600">5</p>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">ER Doctors</p>
                  <p className="text-xs text-gray-500">On duty now</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">8</p>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">ER Beds</p>
                  <p className="text-xs text-gray-500">Available</p>
                </div>
                <p className="text-2xl font-bold text-purple-600">12</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h4 className="font-semibold text-gray-800 mb-4">Recent Activity</h4>
            <div className="space-y-3">
              {[
                { action: 'Emergency resolved', patient: 'Ahmed K.', time: '15 min ago', status: 'success' },
                { action: 'Ambulance dispatched', patient: 'Fatima R.', time: '32 min ago', status: 'active' },
                { action: 'Patient admitted', patient: 'Karim M.', time: '1 hour ago', status: 'success' },
              ].map((activity, idx) => (
                <div key={idx} className="flex items-start space-x-3 p-2">
                  <div className={`mt-1 w-2 h-2 rounded-full ${
                    activity.status === 'success' ? 'bg-green-500' : 'bg-orange-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.patient} • {activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-5">
            <h4 className="font-semibold mb-3">Emergency Hotline</h4>
            <p className="text-3xl font-bold mb-2">999</p>
            <p className="text-sm text-red-100">24/7 Emergency Services</p>
            <button className="mt-4 w-full py-2 bg-white text-red-600 rounded-lg font-medium hover:bg-red-50 transition">
              Quick Dial
            </button>
          </div>

          {/* System Status */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h4 className="font-semibold text-gray-800 mb-4">System Status</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">GPS Tracking</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Alert System</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Auto-Routing</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Enabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalEmergencySOS;
