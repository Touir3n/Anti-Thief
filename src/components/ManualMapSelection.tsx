import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Location } from '../types';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface ManualMapSelectionProps {
  location: Location;
  onChange: (loc: Location) => void;
}

function LocationMarker({ location, onChange }: { location: Location, onChange: (loc: Location) => void }) {
  const map = useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  useEffect(() => {
    map.flyTo([location.lat, location.lng], map.getZoom());
  }, [location, map]);

  return location ? (
    <Marker position={[location.lat, location.lng]}></Marker>
  ) : null;
}

export default function ManualMapSelection({ location, onChange }: ManualMapSelectionProps) {
  return (
    <div className="w-full h-[300px] rounded-xl overflow-hidden shadow-inner border border-slate-200">
      <MapContainer 
        center={[location.lat, location.lng]} 
        zoom={13} 
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker location={location} onChange={onChange} />
      </MapContainer>
    </div>
  );
}
