"use client";
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L, { LatLngTuple } from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon not showing correctly in Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface MapComponentProps {
  user: any;
  refreshData: () => void;
  readonly?: boolean;
  center?: LatLngTuple;
}

export default function MapComponent({ user, refreshData, readonly = false, center }: MapComponentProps) {
  const [position, setPosition] = useState<LatLngTuple>(center || [12.9716, 77.5946]); // Default: Bangalore
  const [address, setAddress] = useState(readonly ? "Pickup Location" : "Click on the map to set location");
  const [wasteType, setWasteType] = useState("Organic");
  const [loading, setLoading] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [mapId] = useState(`map-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
     setMounted(true);
     if(center) setPosition(center);
  }, [center]);

  if (!mounted) return <div className="h-[400px] bg-white/5 rounded-3xl animate-pulse" />;

  // Component to handle Map Clicks and Reverse Geocoding
  function LocationMarker() {
    useMapEvents({
      click: async (e) => {
        if(readonly) return; // Prevent clicking in read-only mode
        const { lat, lng } = e.latlng;
        setPosition([lat, lng]);
        
        try {
          const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          setAddress(res.data.display_name);
        } catch (err) {
          setAddress(`Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      },
    });

    return position ? <Marker position={position} icon={defaultIcon} /> : null;
  }

  const handleSchedule = async () => {
    if (!address || address.includes("Click on")) {
      alert("Please select a location on the map first.");
      return;
    }
    setLoading(true);
    try {
      const locRes = await axios.post(`${API_URL}/locations`, {
        user_id: user.id,
        latitude: position[0],
        longitude: position[1],
        address: address,
        zone: address.split(',')[0].trim() || 'General'
      });

      await axios.post(`${API_URL}/pickups`, {
        citizen_id: user.id,
        location_id: locRes.data.location.id,
        request_date: new Date().toISOString().split('T')[0],
        waste_type: wasteType
      });

      alert("Pickup scheduled successfully!");
      refreshData();
    } catch (err) {
      console.error(err);
      alert("Scheduling failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="w-full rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl relative">
        <MapContainer 
            key={mapId + (center ? center.toString() : '')}
            center={position} 
            zoom={15} 
            scrollWheelZoom={true} 
            style={{ height: '400px', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker />
        </MapContainer>
      </div>

      {!readonly && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Detected Address</label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600 line-clamp-2">
                {address}
                </div>
            </div>
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Waste Category</label>
                <select 
                value={wasteType}
                onChange={(e) => setWasteType(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all text-slate-800"
                >
                <option value="Organic">Organic Waste (Green Bin)</option>
                <option value="Recyclable">Recyclable (Blue Bin)</option>
                <option value="Hazardous">Hazardous / Medical</option>
                <option value="E-Waste">Electronic Waste</option>
                </select>
            </div>
            </div>

            <div className="flex flex-col justify-end">
            <button 
                onClick={handleSchedule}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-emerald-100 uppercase tracking-widest disabled:opacity-50 active:scale-[0.98]"
            >
                {loading ? "Scheduling..." : "Schedule Pickup Now"}
            </button>
            </div>
        </div>
      )}
    </div>
  );
}
