import React, { useState } from 'react';

const HospitalBedManagement = () => {
  // Load initial data from localStorage if exists
  const savedBedStatus = JSON.parse(localStorage.getItem('bedStatus'));
  
  const [bedStatus, setBedStatus] = useState(savedBedStatus || {
    general: { total: 50, available: 15, reserved: 5 },
    icu: { total: 20, available: 2, reserved: 3 },
    emergency: { total: 15, available: 5, reserved: 2 },
    pediatrics: { total: 25, available: 10, reserved: 3 },
    maternity: { total: 30, available: 10, reserved: 5 }
  });

  const updateBedCount = (type, field, value) => {
    const newValue = parseInt(value) || 0;
    const maxValue = field === 'available' ? bedStatus[type].total : 
                     bedStatus[type].total - bedStatus[type].available;
    
    // Validate input
    if (newValue < 0) return;
    if (newValue > maxValue && field !== 'total') {
      alert(`Cannot exceed maximum of ${maxValue} for ${field} beds`);
      return;
    }

    const updatedStatus = {
      ...bedStatus,
      [type]: {
        ...bedStatus[type],
        [field]: newValue
      }
    };
    
    setBedStatus(updatedStatus);
    // Auto-save to localStorage for demo
    localStorage.setItem('bedStatus', JSON.stringify(updatedStatus));
  };

  const saveBedStatus = () => {
    // Save to localStorage (in real app, this would be API call)
    localStorage.setItem('bedStatus', JSON.stringify(bedStatus));
    
    // Also update hospital dashboard data
    const hospitalInfo = JSON.parse(localStorage.getItem('hospitalInfo') || '{}');
    const updatedHospitalInfo = {
      ...hospitalInfo,
      lastBedUpdate: new Date().toISOString(),
      bedStatus: bedStatus
    };
    localStorage.setItem('hospitalInfo', JSON.stringify(updatedHospitalInfo));
    
    alert('Bed status updated successfully! SOS routing is now active with new availability.');
  };

  const resetToDefault = () => {
    if (window.confirm('Reset all bed counts to default values?')) {
      const defaultStatus = {
        general: { total: 50, available: 15, reserved: 5 },
        icu: { total: 20, available: 2, reserved: 3 },
        emergency: { total: 15, available: 5, reserved: 2 },
        pediatrics: { total: 25, available: 10, reserved: 3 },
        maternity: { total: 30, available: 10, reserved: 5 }
      };
      setBedStatus(defaultStatus);
      localStorage.setItem('bedStatus', JSON.stringify(defaultStatus));
    }
  };

  // Calculate total available beds
  const totalAvailableBeds = Object.values(bedStatus).reduce((sum, ward) => sum + ward.available, 0);
  const totalCapacity = Object.values(bedStatus).reduce((sum, ward) => sum + ward.total, 0);
  const sosAvailability = totalAvailableBeds > 5 ? 'high' : totalAvailableBeds > 0 ? 'medium' : 'low';

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Bed Management</h1>
        <p className="text-gray-600">Update real-time bed availability for accurate SOS emergency routing</p>
      </div>

      {/* SOS Status Banner */}
      <div className="mb-8 p-6 rounded-xl border shadow-sm" style={{
        background: sosAvailability === 'high' ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' :
                   sosAvailability === 'medium' ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' :
                   'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
        borderColor: sosAvailability === 'high' ? '#10b981' :
                    sosAvailability === 'medium' ? '#f59e0b' :
                    '#ef4444'
      }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-1">
              {sosAvailability === 'high' ? '🚨 Ready for Emergencies' :
               sosAvailability === 'medium' ? '⚠️ Limited Capacity' :
               '🔴 Full Capacity'}
            </h3>
            <p className="text-gray-700">
              {sosAvailability === 'high' ? 'Your hospital is optimally prepared for emergency cases' :
               sosAvailability === 'medium' ? 'Emergency cases will be routed only for critical needs' :
               'No beds available for emergency routing'}
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="text-3xl font-bold text-gray-800">{totalAvailableBeds} / {totalCapacity}</div>
            <p className="text-sm text-gray-600">Available beds / Total capacity</p>
          </div>
        </div>
      </div>

      {/* Bed Management Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {Object.entries(bedStatus).map(([type, data]) => {
          const occupied = data.total - data.available - data.reserved;
          const occupancyPercentage = (occupied / data.total) * 100;
          const occupancyColor = occupancyPercentage > 90 ? 'bg-red-500' :
                               occupancyPercentage > 75 ? 'bg-yellow-500' :
                               'bg-green-500';
          
          return (
            <div key={type} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 capitalize">{type} Ward</h3>
                  <p className="text-sm text-gray-500">Total Capacity: {data.total} beds</p>
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${data.available > 5 ? 'bg-green-100 text-green-800' : data.available > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                    {data.available} Available
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Available Beds */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Available Beds
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      max={data.total}
                      value={data.available}
                      onChange={(e) => updateBedCount(type, 'available', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-500">/ {data.total}</span>
                  </div>
                </div>

                {/* Reserved Beds */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reserved Beds
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      max={data.total - data.available}
                      value={data.reserved}
                      onChange={(e) => updateBedCount(type, 'reserved', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-500">
                      Max: {data.total - data.available}
                    </span>
                  </div>
                </div>

                {/* Occupancy Summary */}
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Occupied Beds:</span>
                    <span className="font-medium text-gray-800">{occupied} beds</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${occupancyColor}`}
                      style={{ width: `${occupancyPercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>{Math.round(occupancyPercentage)}% Occupied</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="p-2 bg-blue-50 rounded">
                    <div className="font-semibold text-blue-700">{data.available}</div>
                    <div className="text-gray-600">Available</div>
                  </div>
                  <div className="p-2 bg-yellow-50 rounded">
                    <div className="font-semibold text-yellow-700">{data.reserved}</div>
                    <div className="text-gray-600">Reserved</div>
                  </div>
                  <div className="p-2 bg-gray-100 rounded">
                    <div className="font-semibold text-gray-700">{occupied}</div>
                    <div className="text-gray-600">Occupied</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-8 p-6 bg-gray-50 rounded-xl">
        <div>
          <h4 className="font-medium text-gray-800 mb-1">📊 Real-time SOS Integration</h4>
          <p className="text-sm text-gray-600">
            Updated bed availability automatically routes emergency cases to your hospital. 
            Save changes to activate new routing.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={resetToDefault}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Reset to Default
          </button>
          <button
            onClick={saveBedStatus}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center"
          >
            <span className="mr-2">💾</span>
            Save & Activate SOS Routing
          </button>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-6 text-sm text-gray-500">
        <p className="mb-1">💡 <strong>Tips:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Update bed counts regularly for accurate emergency routing</li>
          <li>Reserved beds are for scheduled procedures/admissions</li>
          <li>Emergency cases are routed based on available beds</li>
          <li>Save changes to update the live SOS system</li>
        </ul>
      </div>
    </div>
  );
};

export default HospitalBedManagement;