import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const HospitalBedManagement = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Ward bed management - using original structure
  const [bedStatus, setBedStatus] = useState({
    general_ac: { total: 0, available: 0, reserved: 0 },
    general_non_ac: { total: 0, available: 0, reserved: 0 },
    icu: { total: 0, available: 0, reserved: 0 },
    emergency: { total: 0, available: 0, reserved: 0 },
    pediatrics_ac: { total: 0, available: 0, reserved: 0 },
    pediatrics_non_ac: { total: 0, available: 0, reserved: 0 },
    maternity_ac: { total: 0, available: 0, reserved: 0 },
    maternity_non_ac: { total: 0, available: 0, reserved: 0 },
    // Private Rooms
    private_1bed_no_bath: { total: 0, available: 0, reserved: 0 },
    private_1bed_with_bath: { total: 0, available: 0, reserved: 0 },
    private_2bed_with_bath: { total: 0, available: 0, reserved: 0 }
  });
  
  const hospitalId = 1; // TODO: Get from logged-in hospital context

  // Ward configuration with labels
  const wardConfig = {
    general_ac: { label: 'General Ward (AC)', wardType: 'general', acType: 'ac' },
    general_non_ac: { label: 'General Ward (Non-AC)', wardType: 'general', acType: 'non_ac' },
    maternity_ac: { label: 'Maternity Ward (AC)', wardType: 'maternity', acType: 'ac' },
    maternity_non_ac: { label: 'Maternity Ward (Non-AC)', wardType: 'maternity', acType: 'non_ac' },
    pediatrics_ac: { label: 'Pediatrics Ward (AC)', wardType: 'pediatrics', acType: 'ac' },
    pediatrics_non_ac: { label: 'Pediatrics Ward (Non-AC)', wardType: 'pediatrics', acType: 'non_ac' },
    icu: { label: 'ICU', wardType: 'icu', acType: 'not_applicable' },
    emergency: { label: 'Emergency', wardType: 'emergency', acType: 'not_applicable' },
    // Private Rooms - treated as wards for consistency
    private_1bed_no_bath: { label: 'Private Room (1 Bed)', wardType: 'private_room', acType: 'not_applicable', roomConfig: '1_bed_no_bath' },
    private_1bed_with_bath: { label: 'Private Room (1 Bed, Attached Bath)', wardType: 'private_room', acType: 'not_applicable', roomConfig: '1_bed_with_bath' },
    private_2bed_with_bath: { label: 'Private Room (2 Beds, Attached Bath)', wardType: 'private_room', acType: 'not_applicable', roomConfig: '2_bed_with_bath' }
  };

  useEffect(() => {
    loadBedData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadBedData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/bed-management/bed-wards?hospital_id=${hospitalId}`);
      if (response.data.success && response.data.wards.length > 0) {
        const newBedStatus = {
          general_ac: { total: 0, available: 0, reserved: 0 },
          general_non_ac: { total: 0, available: 0, reserved: 0 },
          icu: { total: 0, available: 0, reserved: 0 },
          emergency: { total: 0, available: 0, reserved: 0 },
          pediatrics_ac: { total: 0, available: 0, reserved: 0 },
          pediatrics_non_ac: { total: 0, available: 0, reserved: 0 },
          maternity_ac: { total: 0, available: 0, reserved: 0 },
          maternity_non_ac: { total: 0, available: 0, reserved: 0 },
          private_1bed_no_bath: { total: 0, available: 0, reserved: 0 },
          private_1bed_with_bath: { total: 0, available: 0, reserved: 0 },
          private_2bed_with_bath: { total: 0, available: 0, reserved: 0 }
        };
        response.data.wards.forEach(ward => {
          // Handle regular wards
          if (ward.ward_type !== 'private_room') {
            const key = ward.ac_type === 'not_applicable' 
              ? ward.ward_type 
              : `${ward.ward_type}_${ward.ac_type}`;
            if (newBedStatus[key]) {
              newBedStatus[key] = {
                total: ward.total_beds,
                available: ward.available_beds,
                reserved: ward.reserved_beds,
                id: ward.id
              };
            }
          } else {
            // Handle private rooms - map by room configuration
            // Convert room_config to match state key format
            // room_config: 1_bed_no_bath -> state key: private_1bed_no_bath (no underscore between 1 and bed)
            let key = `private_${ward.room_config}`;
            
            // Check if key exists, if not try alternative format
            if (!newBedStatus[key]) {
              // Try without underscore between number and bed
              key = key.replace(/_(\d+)_bed/, '_$1bed');
            }
            
            if (newBedStatus[key]) {
              newBedStatus[key] = {
                total: ward.total_beds,
                available: ward.available_beds,
                reserved: ward.reserved_beds,
                id: ward.id
              };
            } else {
              console.warn(`Private room key not found. Tried: private_${ward.room_config} and ${key}`);
            }
          }
        });
        setBedStatus(newBedStatus);
      }
    } catch (error) {
      console.error('Error loading bed data:', error);
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  const updateBedCount = (type, field, value) => {
    // Allow empty string for user to clear the input
    if (value === '') {
      const updatedStatus = {
        ...bedStatus,
        [type]: {
          ...bedStatus[type],
          [field]: ''
        }
      };
      setBedStatus(updatedStatus);
      return;
    }

    const newValue = parseInt(value);
    
    // If not a valid number, ignore
    if (isNaN(newValue)) return;
    
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
  };

  const saveBedStatus = async () => {
    setSaving(true);
    try {
      for (const [key, data] of Object.entries(bedStatus)) {
        const config = wardConfig[key];
        // Convert empty strings to 0 before saving
        const total = parseInt(data.total) || 0;
        const available = parseInt(data.available) || 0;
        const reserved = parseInt(data.reserved) || 0;
        const occupied = total - available - reserved;
        
        const wardData = {
          hospital_id: hospitalId,
          ward_type: config.wardType,
          ac_type: config.acType,
          total_beds: total,
          available_beds: available,
          reserved_beds: reserved,
          occupied_beds: occupied
        };
        
        // Add room configuration for private rooms
        if (config.roomConfig) {
          wardData.room_config = config.roomConfig;
        }
        
        await api.post('/bed-management/bed-wards', wardData);
      }
      
      setShowSuccessModal(true);
      await loadBedData();
    } catch (error) {
      console.error('Error saving bed status:', error);
      alert('Failed to save bed data');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    setBedStatus({
      general_ac: { total: 50, available: 10, reserved: 5 },
      general_non_ac: { total: 40, available: 8, reserved: 3 },
      maternity_ac: { total: 30, available: 6, reserved: 2 },
      maternity_non_ac: { total: 25, available: 5, reserved: 2 },
      pediatrics_ac: { total: 20, available: 4, reserved: 2 },
      pediatrics_non_ac: { total: 15, available: 3, reserved: 1 },
      icu: { total: 10, available: 2, reserved: 1 },
      emergency: { total: 15, available: 5, reserved: 0 },
      private_1bed_no_bath: { total: 10, available: 3, reserved: 1 },
      private_1bed_with_bath: { total: 8, available: 2, reserved: 1 },
      private_2bed_with_bath: { total: 5, available: 1, reserved: 1 }
    });
  };



  // Calculate total available beds
  const totalAvailableBeds = Object.values(bedStatus).reduce((sum, ward) => sum + ward.available, 0);
  const totalCapacity = Object.values(bedStatus).reduce((sum, ward) => sum + ward.total, 0);
  const sosAvailability = totalAvailableBeds > 10 ? 'high' : totalAvailableBeds > 0 ? 'medium' : 'low';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Loading bed management...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Bed Management</h1>
        <p className="text-gray-600">Update real-time bed availability for accurate emergency routing</p>
      </div>

      {/* Status Banner */}
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
              {sosAvailability === 'high' ? 'Hospital is optimally prepared for emergency cases' :
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
          const occupancyPercentage = data.total > 0 ? (occupied / data.total) * 100 : 0;
          const occupancyColor = occupancyPercentage > 90 ? 'bg-red-500' :
            occupancyPercentage > 75 ? 'bg-yellow-500' :
              'bg-green-500';

          return (
            <div key={type} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{wardConfig[type].label}</h3>
                  <p className="text-sm text-gray-500">Total Capacity: {data.total} beds</p>
                </div>
                <div className="text-right">
                  <div className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap inline-block ${
                    data.available > 5 
                      ? 'bg-green-100 text-green-700 border border-green-300' 
                      : data.available > 0 
                        ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' 
                        : 'bg-red-100 text-red-700 border border-red-300'
                  }`}>
                    {data.available} Available
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Total Beds */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Beds
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={data.total}
                    onChange={(e) => updateBedCount(type, 'total', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

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
      <div className="flex space-x-4">
        <button
          onClick={saveBedStatus}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
        <button
          onClick={resetToDefault}
          disabled={saving}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition disabled:opacity-50"
        >
          Reset to Default
        </button>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform animate-slideUp">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            
            {/* Success Message */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Success!</h3>
              <p className="text-gray-600">Bed status has been updated successfully</p>
            </div>
            
            {/* Close Button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition duration-200 transform hover:scale-105"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Add custom animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default HospitalBedManagement;
