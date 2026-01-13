import React, { useState } from 'react';
import { Clock, X, Plus } from 'lucide-react';

const TimeSlotPicker = ({ isOpen, onClose, onSave, day }) => {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [selectedSlots, setSelectedSlots] = useState([]);

  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(timeString);
    }
  }

  const addTimeSlot = () => {
    if (startTime && endTime && startTime < endTime) {
      const newSlot = `${startTime}-${endTime}`;
      if (!selectedSlots.includes(newSlot)) {
        setSelectedSlots([...selectedSlots, newSlot]);
      }
    }
  };

  const removeSlot = (slotToRemove) => {
    setSelectedSlots(selectedSlots.filter(slot => slot !== slotToRemove));
  };

  const handleSave = () => {
    onSave(selectedSlots);
    setSelectedSlots([]);
    onClose();
  };

  const resetForm = () => {
    setStartTime('09:00');
    setEndTime('10:00');
    setSelectedSlots([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Add Time Slots for {day}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Time Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Select Time Range</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Start Time</label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">End Time</label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={addTimeSlot}
              disabled={!startTime || !endTime || startTime >= endTime}
              className="mt-3 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Time Slot</span>
            </button>
          </div>

          {/* Selected Slots */}
          {selectedSlots.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Time Slots</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-800 font-medium">{slot}</span>
                    </div>
                    <button
                      onClick={() => removeSlot(slot)}
                      className="text-red-500 hover:text-red-700 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Time Slots */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Add Common Slots</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                '09:00-12:00',
                '14:00-17:00',
                '10:00-11:00',
                '15:00-16:00',
                '08:00-09:00',
                '17:00-18:00'
              ].map((quickSlot) => (
                <button
                  key={quickSlot}
                  onClick={() => {
                    if (!selectedSlots.includes(quickSlot)) {
                      setSelectedSlots([...selectedSlots, quickSlot]);
                    }
                  }}
                  disabled={selectedSlots.includes(quickSlot)}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition"
                >
                  {quickSlot}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={selectedSlots.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            Save Slots ({selectedSlots.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeSlotPicker;