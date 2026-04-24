import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Incident } from '../types';
import { format, subWeeks, subMonths, subYears, isAfter } from 'date-fns';
import { el } from 'date-fns/locale';
import { Filter, Calendar } from 'lucide-react';
import { toUpperCaseAccentFree } from '../lib/Typography';
import { toast } from 'react-hot-toast';

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 400);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Fix for Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom colored icons
const redIcon = new L.Icon({
  ...DefaultIcon.options,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const orangeIcon = new L.Icon({
  ...DefaultIcon.options,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface IncidentMapProps {
  onEdit: (incident: Incident) => void;
}

type TimeRange = 'week' | 'month' | 'year' | 'all';

export default function IncidentMap({ onEdit }: IncidentMapProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [center, setCenter] = useState<[number, number]>([40.6644, 23.6967]); // Volvi Municipality
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'incidents')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
      setIncidents(data);
    }, (error) => {
      console.error("Σφάλμα συγχρονισμού χάρτη:", error);
      toast.error("Σφάλμα συγχρονισμού χάρτη. Ενδέχεται να εμφανίζονται παλιά δεδομένα.");
    });

    return unsubscribe;
  }, []);

  const filteredIncidents = useMemo(() => {
    const now = new Date();
    return incidents.filter(incident => {
      if (timeRange === 'all') return true;
      
      const recordedDate = incident.recordedAt?.toDate();
      if (!recordedDate) return false;

      if (timeRange === 'week') return isAfter(recordedDate, subWeeks(now, 1));
      if (timeRange === 'month') return isAfter(recordedDate, subMonths(now, 1));
      if (timeRange === 'year') return isAfter(recordedDate, subYears(now, 1));
      
      return true;
    });
  }, [incidents, timeRange]);

  return (
    <div className="w-full h-full flex flex-col flex-1 relative group bg-slate-50 min-h-[60vh]">
      {/* Time Range Filter Bar */}
      <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[1000] flex bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 py-1 px-1 sm:px-1.5 shadow-lg max-w-[90vw] overflow-x-auto no-scrollbar">
        {[
          { id: 'week', label: 'ΕΒΔΟΜΑΔΑ' },
          { id: 'month', label: 'ΜΗΝΑΣ' },
          { id: 'year', label: 'ΕΤΟΣ' },
          { id: 'all', label: 'ΟΛΑ' },
        ].map((range) => (
          <button
            key={range.id}
            onClick={() => setTimeRange(range.id as TimeRange)}
            className={`px-3 sm:px-6 py-2 sm:py-2 rounded-lg text-[10px] sm:text-xs font-semibold transition-all whitespace-nowrap ${timeRange === range.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
          >
            {toUpperCaseAccentFree(range.label)}
          </button>
        ))}
      </div>

      <MapContainer 
        center={center} 
        zoom={11} 
        scrollWheelZoom={true} 
        className="w-full h-full"
        style={{ height: '100%', width: '100%' }}
      >
        <MapResizer />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {filteredIncidents.map((incident) => (
          incident.location && (
            <Marker 
              key={incident.id} 
              position={[incident.location.lat, incident.location.lng]}
              icon={incident.status === 'Τετελεσμένη' ? redIcon : orangeIcon}
            >
              <Popup className="incident-popup min-w-[240px]">
                <div className="p-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-md ${incident.status === 'Τετελεσμένη' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                      {toUpperCaseAccentFree(incident.status)}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-1">{toUpperCaseAccentFree(incident.theftType)}</h4>
                  <div className="flex items-start gap-2 mb-4">
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                      {toUpperCaseAccentFree(incident.area)}, {incident.address}
                    </p>
                  </div>
                  <button 
                    onClick={() => onEdit(incident)}
                    className="w-full bg-blue-600 text-white text-[12px] font-semibold uppercase py-2.5 rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                  >
                    ΛΕΠΤΟΜΕΡΕΙΕΣ
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-8 left-8 z-[1000] bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200 shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
        <h5 className="text-[11px] font-bold text-slate-500 mb-4 uppercase tracking-wider">ΥΠΟΜΝΗΜΑ</h5>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-sm border border-red-600" />
            <span className="text-xs font-semibold text-slate-700">ΤΕΤΕΛΕΣΜΕΝΗ</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-orange-500 shadow-sm border border-orange-600" />
            <span className="text-xs font-semibold text-slate-700">ΑΠΟΠΕΙΡΑ</span>
          </div>
        </div>
      </div>
    </div>
  );
}
