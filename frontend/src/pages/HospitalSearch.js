import React, { useState, useEffect, useCallback } from "react";
import api from "../utils/api";
import {
  Search,
  MapPin,
  Phone,
  Star,
  Building2,
  Bed,
  Stethoscope,
  Navigation,
  RefreshCw,
  AlertCircle,
  Filter,
  X,
} from "lucide-react";
import Footer from "../components/Footer";
import BackToDashboardButton from "../components/BackToDashboardButton";

function HospitalSearch() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [searchRadius, setSearchRadius] = useState(50); // km
  const [useLocationFilter, setUseLocationFilter] = useState(false); // Only filter by location when explicitly enabled
  const [showFilters, setShowFilters] = useState(false);

  const fetchHospitals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      if (cityFilter) {
        params.city = cityFilter;
      }
      
      // Only apply location filter when explicitly enabled by user
      if (userLocation && useLocationFilter) {
        params.latitude = userLocation.latitude;
        params.longitude = userLocation.longitude;
        params.radius = searchRadius;
      }

      const response = await api.get("/hospitals", { params });
      
      // If we have user location but not filtering, still add distance info client-side
      let hospitalsData = response.data?.hospitals || [];
      if (userLocation && !useLocationFilter) {
        hospitalsData = hospitalsData.map(hospital => {
          if (hospital.latitude && hospital.longitude) {
            const distance = calculateDistance(
              userLocation.latitude, userLocation.longitude,
              hospital.latitude, hospital.longitude
            );
            return { ...hospital, distance: Math.round(distance * 100) / 100 };
          }
          return hospital;
        }).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      }
      
      setHospitals(hospitalsData);
    } catch (err) {
      console.error("Error fetching hospitals:", err);
      setError(err.response?.data?.error || err.response?.data?.msg || "Failed to load hospitals");
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, cityFilter, userLocation, searchRadius, useLocationFilter]);

  // Haversine formula for distance calculation
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationLoading(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setLocationError("Unable to get your location. Please enable location services.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  // Get user location on mount
  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchHospitals();
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCityFilter("");
    setSearchRadius(50);
    setUseLocationFilter(false);
    // Trigger refetch after state updates
    setTimeout(() => {
      fetchHospitals();
    }, 0);
  };

  const openInMaps = (hospital) => {
    if (hospital.latitude && hospital.longitude) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${hospital.latitude},${hospital.longitude}`,
        "_blank"
      );
    } else if (hospital.address) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.address)}`,
        "_blank"
      );
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < fullStars ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          }`}
        />
      );
    }
    return stars;
  };

  return (
    <div>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <BackToDashboardButton />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Hospital Search</h1>
                <p className="text-sm text-gray-500">Find nearby hospitals and healthcare facilities</p>
              </div>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search hospitals by name..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-3 border rounded-xl font-semibold transition-colors flex items-center gap-2 ${
                    showFilters
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Filter className="w-5 h-5" />
                  Filters
                </button>
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                        placeholder="Filter by city..."
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nearby Only
                      </label>
                      <button
                        type="button"
                        onClick={() => setUseLocationFilter(!useLocationFilter)}
                        disabled={!userLocation}
                        className={`w-full px-4 py-2 border rounded-xl font-medium transition-colors ${
                          useLocationFilter
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-gray-200 text-gray-700 hover:bg-gray-100"
                        } ${!userLocation ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {useLocationFilter ? "✓ Enabled" : "Disabled"}
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search Radius (km)
                      </label>
                      <select
                        value={searchRadius}
                        onChange={(e) => setSearchRadius(Number(e.target.value))}
                        disabled={!useLocationFilter}
                        className={`w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          !useLocationFilter ? "opacity-50" : ""
                        }`}
                      >
                        <option value={10}>10 km</option>
                        <option value={25}>25 km</option>
                        <option value={50}>50 km</option>
                        <option value={100}>100 km</option>
                        <option value={500}>500 km</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Clear Filters
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Location Status */}
            <div className="mt-4 flex items-center gap-3">
              {locationLoading ? (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Getting your location...
                </div>
              ) : userLocation ? (
                <div className="flex items-center gap-2 text-emerald-600 text-sm">
                  <MapPin className="w-4 h-4" />
                  Location enabled - {useLocationFilter ? `showing hospitals within ${searchRadius}km` : "sorted by distance"}
                </div>
              ) : locationError ? (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {locationError}
                  <button
                    onClick={getUserLocation}
                    className="text-blue-600 hover:underline ml-2"
                  >
                    Try again
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Searching for hospitals...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Hospitals</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchHospitals}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : hospitals.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Hospitals Found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || cityFilter
                  ? "Try adjusting your search filters"
                  : "No hospitals are registered in the system yet"}
              </p>
              {(searchQuery || cityFilter) && (
                <button
                  onClick={clearFilters}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <p className="text-gray-600">
                  Found <span className="font-semibold text-gray-900">{hospitals.length}</span> hospitals
                </p>
                <button
                  onClick={fetchHospitals}
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>

              {hospitals.map((hospital) => (
                <div
                  key={hospital.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Hospital Icon */}
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>

                    {/* Hospital Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{hospital.name}</h3>
                          <div className="flex items-center gap-1 mt-1">
                            {renderStars(hospital.rating)}
                            <span className="text-sm text-gray-600 ml-1">
                              ({hospital.rating?.toFixed(1) || "0.0"})
                            </span>
                          </div>
                        </div>
                        {hospital.distance !== null && hospital.distance !== undefined && (
                          <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                            <Navigation className="w-4 h-4" />
                            {hospital.distance} km
                          </div>
                        )}
                      </div>

                      {/* Address */}
                      <div className="flex items-start gap-2 mt-3 text-gray-600">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">
                          {hospital.address}
                          {hospital.city && `, ${hospital.city}`}
                          {hospital.state && `, ${hospital.state}`}
                        </span>
                      </div>

                      {/* Contact */}
                      {hospital.phone && (
                        <div className="flex items-center gap-2 mt-2 text-gray-600">
                          <Phone className="w-4 h-4" />
                          <a
                            href={`tel:${hospital.phone}`}
                            className="text-sm hover:text-blue-600 transition-colors"
                          >
                            {hospital.phone}
                          </a>
                          {hospital.emergency_contact && hospital.emergency_contact !== hospital.phone && (
                            <>
                              <span className="text-gray-300">|</span>
                              <span className="text-red-600 text-sm font-medium">
                                Emergency: {hospital.emergency_contact}
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Beds Info */}
                      <div className="flex flex-wrap gap-3 mt-4">
                        {hospital.total_beds && (
                          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                            <Bed className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">
                              <span className="font-semibold">{hospital.available_beds || 0}</span>
                              <span className="text-gray-500">/{hospital.total_beds} beds</span>
                            </span>
                          </div>
                        )}
                        {hospital.icu_beds !== null && hospital.icu_beds !== undefined && (
                          <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg">
                            <Stethoscope className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-red-700 font-medium">
                              {hospital.icu_beds} ICU beds
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Services */}
                      {hospital.services && Array.isArray(hospital.services) && hospital.services.length > 0 && (
                        <div className="mt-4">
                          <div className="flex flex-wrap gap-2">
                            {hospital.services.slice(0, 5).map((service, idx) => (
                              <span
                                key={idx}
                                className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs font-medium"
                              >
                                {service}
                              </span>
                            ))}
                            {hospital.services.length > 5 && (
                              <span className="text-gray-500 text-xs py-1">
                                +{hospital.services.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex md:flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => openInMaps(hospital)}
                        className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                      >
                        <Navigation className="w-4 h-4" />
                        Directions
                      </button>
                      {hospital.phone && (
                        <a
                          href={`tel:${hospital.phone}`}
                          className="flex-1 md:flex-none px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm font-semibold text-gray-700"
                        >
                          <Phone className="w-4 h-4" />
                          Call
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default HospitalSearch;
