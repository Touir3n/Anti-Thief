import { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Incident } from '../types';
import { format, subWeeks, subMonths, subYears, isAfter } from 'date-fns';
import { el } from 'date-fns/locale';
import { Filter, Calendar, Home, Store, CarFront, Car, ChevronDown, ChevronUp, X, TreePalm } from 'lucide-react';
import { toUpperCaseAccentFree } from '../lib/Typography';
import { toast } from 'react-hot-toast';
import MultiSelect from './MultiSelect';
import SingleSelect from './SingleSelect';
import { AREAS, THEFT_TYPES, MO_HOUSE, MO_VEHICLE, MO_ROBBERY, TYPE_COLORS } from '../constants';
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

const yellowIcon = new L.Icon({
  ...DefaultIcon.options,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  ...DefaultIcon.options,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
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

interface IncidentMapProps {
  onEdit: (incident: Incident) => void;
  incidents: Incident[];
}

const getInitialState = (key: string, fallback: any) => {
  const saved = sessionStorage.getItem(key);
  return saved ? JSON.parse(saved) : fallback;
};

export default function IncidentMap({ onEdit, incidents }: IncidentMapProps) {
  const markerRefs = useRef<{[key: string]: L.Marker}>({});
  const mapRef = useRef<L.Map | null>(null);
  
  const [center, setCenter] = useState<[number, number]>([40.6644, 23.6967]); // Volvi Municipality
  const [timeRange, setTimeRange] = useState<TimeRange>(() => getInitialState('map_timeRange', 'month'));
  const [filterTypes, setFilterTypes] = useState<string[]>(() => getInitialState('map_filterTypes', []));
  const [filterAreas, setFilterAreas] = useState<string[]>(() => getInitialState('map_filterAreas', []));
  const [filterMOs, setFilterMOs] = useState<string[]>(() => getInitialState('map_filterMOs', []));
  
  const [customStart, setCustomStart] = useState(() => getInitialState('map_customStart', ''));
  const [customEnd, setCustomEnd] = useState(() => getInitialState('map_customEnd', ''));
  const [showRelatedOnly, setShowRelatedOnly] = useState(() => getInitialState('map_showRelatedOnly', false));
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(() => getInitialState('map_isFiltersExpanded', true));

  const [expandedPopupId, setExpandedPopupId] = useState<string | null>(null);

  const [focusedIncidentId, setFocusedIncidentId] = useState<string | null>(null);

  useEffect(() => {
    sessionStorage.setItem('map_timeRange', JSON.stringify(timeRange));
    sessionStorage.setItem('map_filterTypes', JSON.stringify(filterTypes));
    sessionStorage.setItem('map_filterAreas', JSON.stringify(filterAreas));
    sessionStorage.setItem('map_filterMOs', JSON.stringify(filterMOs));
    sessionStorage.setItem('map_customStart', JSON.stringify(customStart));
    sessionStorage.setItem('map_customEnd', JSON.stringify(customEnd));
    sessionStorage.setItem('map_showRelatedOnly', JSON.stringify(showRelatedOnly));
    sessionStorage.setItem('map_isFiltersExpanded', JSON.stringify(isFiltersExpanded));
  }, [timeRange, filterTypes, filterAreas, filterMOs, customStart, customEnd, showRelatedOnly, isFiltersExpanded]);

  const handleClearFilters = () => {
    setTimeRange('month');
    setFilterTypes([]);
    setFilterAreas([]);
    setFilterMOs([]);
    setCustomStart('');
    setCustomEnd('');
    setShowRelatedOnly(false);
    setFocusedIncidentId(null);
  };


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
    
    const hasHouse = types.includes('Οικίας') || types.includes('Εξοχικό') || types.includes('Επιχείρησης');
    const hasVehicle = types.includes('Κλοπή από όχημα') || types.includes('Κλοπή οχήματος');
    const hasRobbery = types.includes('Ληστεία');
    
    if (hasHouse) {
      MO_HOUSE.forEach(mo => options.push({ label: mo, value: mo }));
    }
    if (hasVehicle) {
      MO_VEHICLE.forEach(mo => {
        if (!options.some(o => o.value === mo)) options.push({ label: mo, value: mo });
      });
    }
    if (hasRobbery) {
      MO_ROBBERY.forEach(mo => {
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
    
    let baseFiltered = incidents.filter(incident => {
      // 1. Type Filter
      let matchesType = true;
      if (filterTypes.length > 0) {
        // Map old DB values if needed
        const mappedType = 
          ((incident.theftType as string) === 'Οικία (Κύρια)') ? 'Οικίας' :
          ((incident.theftType as string) === 'Οικία (Εξοχική)') ? 'Εξοχικό' :
          ((incident.theftType as string) === 'Επιχείρηση') ? 'Επιχείρησης' :
          ((incident.theftType as string) === 'Από όχημα') ? 'Κλοπή από όχημα' :
          ((incident.theftType as string) === 'Κλοπή Αυτοκινήτου') ? 'Κλοπή οχήματος' : incident.theftType;

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

    if (focusedIncidentId) {
      const g: Record<string, string[]> = {};
      incidents.forEach(inc => {
         g[inc.id] = (inc.linkedIncidents || '').split(',').map(s=>s.trim()).filter(s=>s.length>0);
      });
      
      const visited = new Set<string>();
      const stack = [focusedIncidentId];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (!visited.has(current)) {
          visited.add(current);
          const neighbors = g[current] || [];
          for (const neighbor of neighbors) {
            if (g[neighbor] && !visited.has(neighbor)) {
              stack.push(neighbor);
            }
          }
        }
      }
      baseFiltered = incidents.filter(inc => visited.has(inc.id)); // Overrides time/area filters to guarantee showing the series!
    }

    return baseFiltered;
  }, [incidents, timeRange, filterTypes, filterAreas, filterMOs, customStart, customEnd, showRelatedOnly, focusedIncidentId]);

  useEffect(() => {
    if (mapRef.current) {
      const locations = filteredIncidents
        .filter(inc => inc.location)
        .map(inc => L.latLng(inc.location.lat, inc.location.lng));
      
      if (locations.length > 0) {
        const bounds = L.latLngBounds(locations);
        if (bounds.isValid()) {
          // Add a small delay to ensure any map resizing/rendering finishes first
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.flyToBounds(bounds, { padding: [50, 50], maxZoom: 15, duration: 1 });
            }
          }, 100);
        }
      }
    }
  }, [timeRange, filterTypes, filterAreas, filterMOs, customStart, customEnd, showRelatedOnly, focusedIncidentId]);

  const graph = useMemo(() => {
    const g: Record<string, string[]> = {};
    incidents.forEach(inc => {
       g[inc.id] = (inc.linkedIncidents || '').split(',').map(s=>s.trim()).filter(s=>s.length>0);
    });
    return g;
  }, [incidents]);

  const getRelatedIncidents = (incidentId: string) => {
    const visited = new Set<string>();
    const stack = [incidentId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (!visited.has(current)) {
        visited.add(current);
        const neighbors = graph[current] || [];
        for (const neighbor of neighbors) {
          if (graph[neighbor] && !visited.has(neighbor)) {
            stack.push(neighbor);
          }
        }
      }
    }
    visited.delete(incidentId); // Remove self
    return incidents.filter(inc => visited.has(inc.id));
  };

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
              className="w-full flex flex-col gap-2 pointer-events-auto overflow-visible sm:max-w-[400px] lg:max-w-none"
            >
              <div className="grid grid-cols-2 lg:flex lg:flex-row gap-2 bg-white/70 backdrop-blur-md rounded-xl border border-white/50 p-2 shadow-sm w-full relative z-20">
                {/* Time Range */}
                <div className="col-span-2 lg:col-auto">
                  <SingleSelect 
                    label="ΧΡΟΝΟΣ: ΟΛΑ"
                    options={[
                      { label: 'ΧΡΟΝΟΣ: ΟΛΑ', value: 'all' },
                      { label: 'ΤΕΛΕΥΤΑΙΑ ΕΒΔΟΜΑΔΑ', value: 'week' },
                      { label: 'ΤΕΛΕΥΤΑΙΟΣ ΜΗΝΑΣ', value: 'month' },
                      { label: 'ΤΡΕΧΟΝ ΕΤΟΣ', value: 'year' },
                      { label: 'ΕΠΙΛΟΓΗ ΔΙΑΣΤΗΜΑΤΟΣ', value: 'custom' },
                    ]}
                    selected={timeRange}
                    onChange={(val) => setTimeRange(val as TimeRange)}
                    className="w-full lg:w-36 h-[34px]"
                  />
                </div>

                <div className="col-span-1 lg:col-auto lg:flex-1">
                  <MultiSelect 
                    label="ΠΕΡΙΟΧΗ"
                    options={areaOptions}
                    selected={filterAreas}
                    onChange={setFilterAreas}
                    className="w-full h-[34px]"
                  />
                </div>
                <div className="col-span-1 lg:col-auto lg:flex-1">
                  <MultiSelect 
                    label="ΕΙΔΟΣ"
                    options={THEFT_TYPES.map(t => ({ label: t, value: t }))}
                    selected={filterTypes}
                    onChange={setFilterTypes}
                    className="w-full h-[34px]"
                  />
                </div>
                <div className="col-span-1 lg:col-auto lg:flex-1">
                  <MultiSelect 
                    label="ΜΕΘΟΔΟΣ"
                    options={moOptions}
                    selected={filterMOs}
                    onChange={setFilterMOs}
                    className="w-full h-[34px]"
                  />
                </div>
                
                {/* Clear Filters / Active Series Indicator */}
                <div className="col-span-2 lg:col-auto flex items-center gap-2 h-[34px] lg:w-auto shrink-0 justify-end">
                  {focusedIncidentId && (
                    <div className="flex-1 flex items-center justify-between px-2 h-full bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                      <span className="text-[9px] sm:text-[10px] font-bold whitespace-nowrap leading-none mt-0.5">{toUpperCaseAccentFree('ΕΝΕΡΓΗ ΣΕΙΡΑ')}</span>
                      <button onClick={(e) => { e.stopPropagation(); setFocusedIncidentId(null); }} className="p-0.5 hover:bg-blue-100 rounded-md">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {(timeRange !== 'month' || filterTypes.length > 0 || filterAreas.length > 0 || filterMOs.length > 0 || focusedIncidentId) && (
                    <button
                      onClick={handleClearFilters}
                      className="h-full px-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg flex items-center justify-center transition-colors ml-auto"
                      title="Εκκαθάριση Φίλτρων"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Custom Range Inputs */}
              <AnimatePresence>
                {timeRange === 'custom' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col sm:flex-row gap-2 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 p-3 shadow-lg pointer-events-auto self-start sm:self-center w-full mx-auto relative z-10"
                  >
                    <div className="flex-1 w-full">
                      <label className="text-[9px] uppercase tracking-[0.2em] text-[#1A237E] font-bold mb-1.5 block">{toUpperCaseAccentFree('Από')}</label>
                      <input 
                        type="date" 
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-700"
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="text-[9px] uppercase tracking-[0.2em] text-[#1A237E] font-bold mb-1.5 block">{toUpperCaseAccentFree('Έως')}</label>
                      <input 
                        type="date" 
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-700"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <MapContainer 
        ref={mapRef}
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
          let customIcon: any = blackIcon;
          switch (incident.theftType as string) {
            case 'Οικίας':
            case 'Οικία (Κύρια)':
              customIcon = greyIcon;
              break;
            case 'Εξοχικό':
            case 'Οικία (Εξοχική)':
              customIcon = yellowIcon;
              break;
            case 'Επιχείρησης':
            case 'Επιχείρηση':
              customIcon = goldIcon;
              break;
            case 'Κλοπή από όχημα':
            case 'Από όχημα':
              customIcon = violetIcon;
              break;
            case 'Κλοπή οχήματος':
            case 'Κλοπή Αυτοκινήτου':
              customIcon = blueIcon;
              break;
            case 'Ληστεία':
              customIcon = redIcon;
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

          const relatedIncidents = getRelatedIncidents(incident.id);

          return incident.location && (
            <Marker 
              key={incident.id} 
              ref={(r) => { if (r) markerRefs.current[incident.id] = r; }}
              position={[incident.location.lat, incident.location.lng]}
              icon={customIcon}
              eventHandlers={{
                click: () => {
                   setExpandedPopupId(null);
                }
              }}
            >
              <Popup className="incident-popup min-w-[240px]">
                <div className={`p-4 ${TYPE_COLORS[incident.theftType as string] || 'bg-white'} shadow-sm`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${incident.status === 'Τετελεσμένη' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-orange-50 text-orange-600 border border-orange-200'} bg-white/90 backdrop-blur-sm shadow-sm`}>
                      {toUpperCaseAccentFree(incident.status)}
                    </span>
                  </div>
                  <h4 className="text-[15px] font-bold mb-1 opacity-90">{toUpperCaseAccentFree(incident.theftType || '')}</h4>
                  <div className="flex items-start gap-2 mb-3">
                    <p className="text-[13px] font-medium leading-relaxed opacity-80">
                      {toUpperCaseAccentFree(incident.area)}, {incident.address}
                      <br/>
                      <span className="text-xs opacity-70 mt-1 block font-semibold">
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

                  {relatedIncidents.length > 0 && (
                    <div className="mb-3 flex flex-col gap-2">
                       <div className="flex items-center gap-2">
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             setExpandedPopupId(expandedPopupId === incident.id ? null : incident.id);
                           }}
                           className="flex-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-white/80 border border-slate-200 px-2 py-1.5 rounded-lg hover:bg-white transition-colors uppercase justify-between"
                         >
                           <span>ΣΥΣΧΕΤΙΖΟΜΕΝΕΣ ({relatedIncidents.length})</span>
                           {expandedPopupId === incident.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                         </button>
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             setFocusedIncidentId(incident.id);
                           }}
                           className="bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-200 px-2 py-1.5 rounded-lg transition-colors flex items-center justify-center"
                           title="Προβολή της σειράς στο χάρτη"
                         >
                           <Filter className="w-4 h-4" />
                         </button>
                       </div>
                       {expandedPopupId === incident.id && (
                         <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto custom-scrollbar p-1">
                           {relatedIncidents.map(rel => (
                              <div key={rel.id} onClick={(e) => { 
                                e.stopPropagation(); 
                                if (rel.location && mapRef.current) {
                                  mapRef.current.flyTo([rel.location.lat, rel.location.lng], 15);
                                  setTimeout(() => {
                                    if (markerRefs.current[rel.id]) {
                                      markerRefs.current[rel.id].openPopup();
                                    }
                                  }, 500);
                                } else {
                                  // Fallback to old behavior if no location or map
                                  onEdit(rel);
                                }
                              }} className="bg-white/90 border border-slate-200/60 p-2 rounded-lg cursor-pointer hover:bg-white hover:border-blue-300 transition-colors">
                                 <h5 className="text-[10px] font-bold text-slate-800">{toUpperCaseAccentFree(rel.theftType)}</h5>
                                 <p className="text-[9px] text-slate-500 mt-0.5">
                                   {toUpperCaseAccentFree(rel.area)} • {rel.incidentDate ? new Date(rel.incidentDate).toLocaleDateString('el-GR') : ''}
                                 </p>
                              </div>
                           ))}
                         </div>
                       )}
                    </div>
                  )}

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
    </div>
  );
}
