import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon paths for bundlers (CRA)
// eslint-disable-next-line no-underscore-dangle
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function normalizeLatLng(value) {
  const lat = Number(value?.lat);
  const lng = Number(value?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat: clamp(lat, -90, 90),
    lng: clamp(lng, -180, 180),
  };
}

export default function LocationPickerMap({
  value,
  onChange,
  initialCenter = { lat: 23.8103, lng: 90.4125 }, // Dhaka default
  initialZoom = 12,
  height = 280,
}) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const containerRef = useRef(null);

  const normalizedValue = useMemo(() => normalizeLatLng(value), [value]);

  const [query, setQuery] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState("");

  const setLatLng = (latlng) => {
    const next = normalizeLatLng({ lat: latlng.lat, lng: latlng.lng });
    if (!next) return;
    onChange?.(next);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const start = normalizedValue || normalizeLatLng(initialCenter) || { lat: 0, lng: 0 };

    const map = L.map(containerRef.current, {
      center: [start.lat, start.lng],
      zoom: initialZoom,
      zoomControl: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const marker = L.marker([start.lat, start.lng], { draggable: true }).addTo(map);
    markerRef.current = marker;

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setLatLng(pos);
    });

    map.on("click", (e) => {
      marker.setLatLng(e.latlng);
      setLatLng(e.latlng);
    });

    // Ensure initial value is propagated if missing
    if (!normalizedValue) {
      onChange?.(start);
    }

    return () => {
      try {
        map.off();
        map.remove();
      } catch (e) {
        // no-op
      }
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep marker in sync when parent updates value
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    if (!normalizedValue) return;

    const current = marker.getLatLng();
    const changed =
      Math.abs(current.lat - normalizedValue.lat) > 1e-8 ||
      Math.abs(current.lng - normalizedValue.lng) > 1e-8;

    if (changed) {
      marker.setLatLng([normalizedValue.lat, normalizedValue.lng]);
    }
  }, [normalizedValue]);

  const handleUseMyLocation = () => {
    setSearchError("");
    if (!navigator.geolocation) {
      setSearchError("Geolocation is not supported in this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setLatLng(next);
        mapRef.current?.setView([next.lat, next.lng], 15);
      },
      (err) => {
        setSearchError(err?.message || "Failed to get location");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const handleSearch = async () => {
    const q = (query || "").trim();
    if (!q) return;

    setSearchBusy(true);
    setSearchError("");

    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", q);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");

      const res = await fetch(url.toString(), {
        headers: {
          // Nominatim asks for a valid UA; browsers control UA, so we provide Referer-like context.
          "Accept": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`);
      }

      const data = await res.json();
      if (!Array.isArray(data) || !data.length) {
        setSearchError("No results found");
        return;
      }

      const first = data[0];
      const lat = Number(first.lat);
      const lng = Number(first.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setSearchError("Invalid search result");
        return;
      }

      const next = { lat, lng };
      setLatLng(next);
      mapRef.current?.setView([lat, lng], 15);
    } catch (e) {
      setSearchError(e?.message || "Search failed");
    } finally {
      setSearchBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row gap-2">
        <input
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          placeholder="Search location (e.g., 'Dhaka Medical College')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searchBusy}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {searchBusy ? "Searching..." : "Search"}
        </button>
        <button
          type="button"
          onClick={handleUseMyLocation}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-900 hover:bg-gray-200"
        >
          Use my location
        </button>
      </div>

      {searchError ? (
        <div className="text-xs text-red-600">{searchError}</div>
      ) : (
        <div className="text-xs text-gray-500">
          Tip: click the map or drag the marker.
        </div>
      )}

      <div
        ref={containerRef}
        className="rounded-xl border border-gray-200 overflow-hidden"
        style={{ height }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Latitude</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            value={normalizedValue?.lat ?? ""}
            onChange={(e) => {
              const lat = Number(e.target.value);
              if (!Number.isFinite(lat)) {
                onChange?.({ lat: e.target.value, lng: normalizedValue?.lng });
                return;
              }
              onChange?.({ lat, lng: normalizedValue?.lng });
            }}
            placeholder="e.g., 23.8103"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Longitude</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            value={normalizedValue?.lng ?? ""}
            onChange={(e) => {
              const lng = Number(e.target.value);
              if (!Number.isFinite(lng)) {
                onChange?.({ lat: normalizedValue?.lat, lng: e.target.value });
                return;
              }
              onChange?.({ lat: normalizedValue?.lat, lng });
            }}
            placeholder="e.g., 90.4125"
          />
        </div>
      </div>
    </div>
  );
}
