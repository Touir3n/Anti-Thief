import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Incident } from '../types';
import { format, subWeeks, subMonths, subYears, isAfter } from 'date-fns';
import { el } from 'date-fns/locale';
import { Filter, Calendar, Home, Store, CarFront, Car, ChevronDown, ChevronUp } from 'lucide-react';
import { toUpperCaseAccentFree } from '../lib/Typography';
import { toast } from 'react-hot-toast';
import MultiSelect from './MultiSelect';
import { AREAS, THEFT_TYPES, MO_HOUSE, MO_VEHICLE } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

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
const blueIcon = new L.Icon({
  ...DefaultIcon.options,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const goldIcon = new L.Icon({
  ...DefaultIcon.options,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const greyIcon = new L.Icon({
  ...DefaultIcon.options,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const violetIcon = new L.Icon({
  ...DefaultIcon.options,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const blackIcon = new L.Icon({
  ...DefaultIcon.options,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

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

type TimeRange = 'week' | 'month' | 'year' | 'custom' | 'all';

export default function IncidentMap({ onEdit, incidents }: IncidentMapProps) {
  const [center, setCenter] = useState<[number, number]>([40.6644, 23.6967]); // Volvi Municipality
  const [timeRange, setTimeRange] = useState<TimeRange>('month'); // default to month for map readability
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterAreas, setFilterAreas] = useState<string[]>([]);
  const [filterMOs, setFilterMOs] = useState<string[]>([]);
  
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showRelatedOnly, setShowRelatedOnly] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

  const recordedAreas = useMemo(() => {
    const areas = new Set<string>();
    incidents.forEach(inc => {
      if (inc.area) areas.add(inc.area);
    });
    return Array.from(areas).sort((a,b) => a.localeCompare(b, 'el'));
  }, [incidents]);

  const areaOptions = useMemo(() => {
    let options: {label: string, value: string, isGroup?: boolean, indent?: boolean}[] = [];
    const validUnknown: string[] = [];
    
    Object.entries(AREAS).forEach(([muni, villages]) => {
      options.push({ label: muni, value: muni, isGroup: true });
      villages.forEach(v => {
        options.push({ label: v, value: v, indent: true });
      });
    });

    recordedAreas.forEach(a => {
      let found = false;
      Object.values(AREAS).forEach(villages => {
        if (villages.includes(a)) found = true;
      });
      if (!found) validUnknown.push(a);
    });

    if (validUnknown.length > 0) {
      options.push({ label: 'ΑΛΛΕΣ ΠΕΡΙΟΧΕΣ / ΑΓΝΩΣΤΕΣ', value: 'OTHER_AREAS', isGroup: true });
      validUnknown.forEach(a => {
        options.push({ label: a, value: a, indent: true });
      });
    }
    return options;
  }, [recordedAreas]);

  const moOptions = useMemo(() => {
    const types = filterTypes.length > 0 ? filterTypes : THEFT_TYPES;
    let options: {label: string, value: string}[] = [];
    
    const hasHouse = types.includes('Οικίας') || types.includes('Επιχείρησης');
    const hasVehicle = types.includes('Κλοπή από όχημα') || types.includes('Κλοπή οχήματος');
    
    if (hasHouse) {
      MO_HOUSE.forEach(mo => options.push({ label: mo, value: mo }));
    }
    if (hasVehicle) {
      MO_VEHICLE.forEach(mo => {
        if (!options.some(o => o.value === mo)) options.push({ label: mo, value: mo });
      });
    }
    
    // add any custom MOs from data
    const customMOs = new Set<string>();
    incidents.forEach(inc => {
      if (inc.modusOperandi && !options.some(o => o.value === inc.modusOperandi)) {
        customMOs.add(inc.modusOperandi);
      }
    });
    
    if (customMOs.size > 0 && options.length > 0) {
      // separator-like item isn't strictly needed without isGroup, but we can add
    }
    
    Array.from(customMOs).forEach(mo => {
      options.push({ label: mo, value: mo });
    });
    
    return options;
  }, [filterTypes, incidents]);

  // Clean up MO filters if type changes and MO no longer applies
  useEffect(() => {
    if (filterMOs.length > 0) {
      const validMOs = moOptions.map(o => o.value);
      const newMOs = filterMOs.filter(mo => validMOs.includes(mo));
      if (newMOs.length !== filterMOs.length) {
        setFilterMOs(newMOs);
      }
    }
  }, [moOptions, filterMOs]);

  const filteredIncidents = useMemo(() => {
    const now = new Date();
    
    return incidents.filter(incident => {
      // 1. Type Filter
      let matchesType = true;
      if (filterTypes.length > 0) {
        // Map old DB values if needed
        const mappedType = 
          (incident.theftType === 'Οικία (Κύρια)' || incident.theftType === 'Οικία (Εξοχική)') ? 'Οικίας' :
          (incident.theftType === 'Επιχείρηση') ? 'Επιχείρησης' :
          (incident.theftType === 'Από όχημα') ? 'Κλοπή από όχημα' :
          (incident.theftType === 'Κλοπή Αυτοκινήτου') ? 'Κλοπή οχήματος' : incident.theftType;

        matchesType = filterTypes.includes(mappedType || '');
      }

      if (!matchesType) return false;

      // 2. Area Filter
      let matchesArea = true;
      if (filterAreas.length > 0) {
        matchesArea = filterAreas.includes(incident.area || '');
      }
      if (!matchesArea) return false;

      // 3. MO Filter
      let matchesMO = true;
      if (filterMOs.length > 0) {
        matchesMO = filterMOs.includes(incident.modusOperandi || '');
      }
      if (!matchesMO) return false;

      // 4. Date Filter
      let matchesDate = true;
      if (timeRange !== 'all') {
        const recordedDate = incident.recordedAt?.toDate();
        if (!recordedDate) return false;
  
        if (timeRange === 'week') {
          matchesDate = isAfter(recordedDate, subWeeks(now, 1));
        } else if (timeRange === 'month') {
          matchesDate = isAfter(recordedDate, subMonths(now, 1));
        } else if (timeRange === 'year') {
          matchesDate = recordedDate.getFullYear() === now.getFullYear();
        } else if (timeRange === 'custom') {
          if (customStart) {
            const start = new Date(customStart);
            if (recordedDate < start) matchesDate = false;
          }
          if (customEnd) {
            const end = new Date(customEnd);
            end.setHours(23, 59, 59, 999);
            if (recordedDate > end) matchesDate = false;
          }
        }
      }
      
      if (!matchesDate) return false;

      // 5. Related Only Filter
      if (showRelatedOnly) {
         if (!incident.linkedIncidents || incident.linkedIncidents.trim().length === 0) return false;
      }

      return true;
    });
  }, [incidents, timeRange, filterTypes, filterAreas, filterMOs, customStart, customEnd, showRelatedOnly]);

  const markerColors = useMemo(() => {
    if (!showRelatedOnly) return {};

    const graph: Record<string, string[]> = {};
    filteredIncidents.forEach(inc => {
       graph[inc.id] = (inc.linkedIncidents || '').split(',').map(s=>s.trim()).filter(s=>s.length>0);
    });

    const colors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080'];
    
    // DFS to find components
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const inc of filteredIncidents) {
      if (!visited.has(inc.id)) {
        const component: string[] = [];
        const stack = [inc.id];
        while (stack.length > 0) {
          const current = stack.pop()!;
          if (!visited.has(current)) {
            visited.add(current);
            component.push(current);
            const neighbors = graph[current] || [];
            for (const neighbor of neighbors) {
              // only follow links to other visible incidents
              if (graph[neighbor] && !visited.has(neighbor)) {
                stack.push(neighbor);
              }
            }
          }
        }
        if (component.length > 1) {
          components.push(component);
        } else if (component.length === 1) { // standalone in this view
          components.push(component);
        }
      }
    }

    // Sort to give consistent colors
    components.sort((a,b) => b.length - a.length);

    const res: Record<string, string> = {};
    components.forEach((comp, idx) => {
       const color = colors[idx % colors.length];
       comp.forEach(id => res[id] = color);
    });

    return res;
  }, [filteredIncidents, showRelatedOnly]);

  return (
    <div className="w-full h-full flex flex-col flex-1 relative group bg-slate-50 min-h-[60vh]">
      {/* Map Filters */}
      <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[1000] flex flex-col gap-2 w-full max-w-4xl px-4 pointer-events-none items-center">
        
        <div className="flex justify-end w-full mb-1 sm:max-w-[400px] lg:max-w-none">
           <button 
             onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
             className="pointer-events-auto bg-white/90 backdrop-blur-md rounded-full px-3 py-1.5 border border-slate-200/60 shadow-sm flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-600 hover:bg-white hover:text-blue-600 transition-colors"
           >
             {toUpperCaseAccentFree('ΦΙΛΤΡΑ')}
             {isFiltersExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
           </button>
        </div>

        <AnimatePresence>
          {isFiltersExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0, translateY: -10 }}
              animate={{ height: 'auto', opacity: 1, translateY: 0 }}
              exit={{ height: 0, opacity: 0, translateY: -10 }}
              className="w-full flex flex-col gap-2 pointer-events-auto overflow-hidden sm:max-w-[400px] lg:max-w-none"
            >
              <div className="grid grid-cols-2 lg:flex lg:flex-row gap-2 bg-white/70 backdrop-blur-md rounded-xl border border-white/50 p-2 shadow-sm w-full">
                {/* Time Range */}
                <select 
                  className="col-span-2 lg:col-span-1 w-full lg:w-36 bg-white/90 border border-slate-200/60 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/50 font-medium text-[11px] lg:text-[10px] xl:text-[11px] text-slate-700 h-[34px] uppercase"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                >
                  <option value="all">ΧΡΟΝΟΣ: ΟΛΑ</option>
                  <option value="week">ΤΕΛΕΥΤΑΙΑ ΕΒΔΟΜΑΔΑ</option>
                  <option value="month">ΤΕΛΕΥΤΑΙΟΣ ΜΗΝΑΣ</option>
                  <option value="year">ΤΡΕΧΟΝ ΕΤΟΣ</option>
                  <option value="custom">ΕΠΙΛΟΓΗ ΔΙΑΣΤΗΜΑΤΟΣ</option>
                </select>

                <MultiSelect 
                  label="ΠΕΡΙΟΧΗ"
                  options={areaOptions}
                  selected={filterAreas}
                  onChange={setFilterAreas}
                  className="w-full lg:flex-1 h-[34px]"
                />
                <MultiSelect 
                  label="ΕΙΔΟΣ"
                  options={THEFT_TYPES.map(t => ({ label: t, value: t }))}
                  selected={filterTypes}
                  onChange={setFilterTypes}
                  className="w-full lg:flex-1 h-[34px]"
                />
                <MultiSelect 
                  label="ΜΕΘΟΔΟΣ"
                  options={moOptions}
                  selected={filterMOs}
                  onChange={setFilterMOs}
                  className="w-full lg:flex-1 h-[34px]"
                />
                
                {/* Related toggle */}
                <label className="col-span-2 lg:col-span-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-white/90 rounded-lg border border-slate-200/60 cursor-pointer h-[34px] shrink-0">
                  <input 
                    type="checkbox" 
                    checked={showRelatedOnly}
                    onChange={(e) => setShowRelatedOnly(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 scale-90"
                  />
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 whitespace-nowrap leading-none mt-0.5">{toUpperCaseAccentFree('ΣΥΣΧΕΤΙΣΜΕΝΕΣ')}</span>
                </label>
              </div>

              {/* Custom Range Inputs */}
              <AnimatePresence>
                {timeRange === 'custom' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex gap-2 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 p-2 shadow-lg pointer-events-auto self-start sm:self-center w-max mx-auto overflow-hidden"
                  >
                    <input 
                      type="date" 
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-700"
                    />
                    <span className="text-slate-400 self-center">-</span>
                    <input 
                      type="date" 
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-700"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
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
        {filteredIncidents.map((incident) => {
          let customIcon = blackIcon;
          switch (incident.theftType) {
            case 'Οικίας':
            case 'Οικία (Κύρια)':
            case 'Οικία (Εξοχική)':
              customIcon = greyIcon;
              break;
            case 'Επιχείρησης':
            case 'Επιχείρηση':
              customIcon = goldIcon;
              break;
            case 'Κλοπή από όχημα':
            case 'Από όχημα':
              customIcon = blueIcon;
              break;
            case 'Κλοπή οχήματος':
            case 'Κλοπή Αυτοκινήτου':
              customIcon = violetIcon;
              break;
          }
          
          if (showRelatedOnly && markerColors[incident.id]) {
            const hex = markerColors[incident.id];
            customIcon = L.divIcon({
              className: 'custom-color-marker',
              html: `<div style="background-color: ${hex}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9]
            });
          }

          return incident.location && (
            <Marker 
              key={incident.id} 
              position={[incident.location.lat, incident.location.lng]}
              icon={customIcon}
            >
              <Popup className="incident-popup min-w-[240px]">
                <div className="p-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-md ${incident.status === 'Τετελεσμένη' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                      {toUpperCaseAccentFree(incident.status)}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-1">{toUpperCaseAccentFree(incident.theftType || '')}</h4>
                  <div className="flex items-start gap-2 mb-4">
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                      {toUpperCaseAccentFree(incident.area)}, {incident.address}
                      <br/>
                      <span className="text-xs text-slate-400 mt-1 block">
                        {incident.isTimeRange 
                          ? `${incident.incidentDateFrom ? new Date(incident.incidentDateFrom).toLocaleDateString('el-GR') : ''} - ${incident.incidentDateTo ? new Date(incident.incidentDateTo).toLocaleDateString('el-GR') : ''}`
                          : (incident.incidentDate ? new Date(incident.incidentDate).toLocaleString('el-GR') : '')
                        }
                      </span>
                      {incident.modusOperandi && (
                        <span className="text-xs text-slate-400 block mt-0.5">
                          M.O.: {toUpperCaseAccentFree(incident.modusOperandi)}
                        </span>
                      )}
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
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-8 left-8 z-[1000] bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200 shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
        <h5 className="text-[11px] font-bold text-slate-500 mb-4 uppercase tracking-wider">ΥΠΟΜΝΗΜΑ</h5>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-[#707070] shadow-sm border border-[#707070]" />
            <span className="text-xs font-semibold text-slate-700">ΟΙΚΙΑΣ</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-[#cb8427] shadow-sm border border-[#cb8427]" />
            <span className="text-xs font-semibold text-slate-700">ΕΠΙΧΕΙΡΗΣΗΣ</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-[#2b82cb] shadow-sm border border-[#2b82cb]" />
            <span className="text-xs font-semibold text-slate-700">ΚΛΟΠΗ ΑΠΟ ΟΧΗΜΑ</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-[#9c2bc8] shadow-sm border border-[#9c2bc8]" />
            <span className="text-xs font-semibold text-slate-700">ΚΛΟΠΗ ΟΧΗΜΑΤΟΣ</span>
          </div>
        </div>
      </div>
    </div>
  );
}
