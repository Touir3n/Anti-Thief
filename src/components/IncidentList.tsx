import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError } from '../firebase';
import { Incident } from '../types';
import { Search, Filter, Calendar, MapPin, ChevronRight, AlertTriangle, CheckCircle, Plus, Trash2, AlertCircle, X, LayoutGrid, LayoutList, Clock, Home, Store, CarFront, Car, Camera, TreePalm, Crosshair } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { toUpperCaseAccentFree } from '../lib/Typography';
import { toast } from 'react-hot-toast';
import SingleSelect from './SingleSelect';
import MultiSelect from './MultiSelect';
import { MUNICIPALITIES, THEFT_TYPES, MO_HOUSE, MO_VEHICLE, MO_ROBBERY, TYPE_COLORS, TYPE_BADGE_COLORS } from '../constants';

interface IncidentListProps {
  onEdit: (incident: Incident) => void;
  incidents: Incident[];
  loading: boolean;
}

const getInitialState = (key: string, fallback: any) => {
  const saved = sessionStorage.getItem(key);
  return saved ? JSON.parse(saved) : fallback;
};

export default function IncidentList({ onEdit, incidents, loading }: IncidentListProps) {
  const [searchTerm, setSearchTerm] = useState(() => getInitialState('list_searchTerm', ''));
  const [filterAreas, setFilterAreas] = useState<string[]>(() => getInitialState('list_filterAreas', []));
  const [filterTypes, setFilterTypes] = useState<string[]>(() => getInitialState('list_filterTypes', []));
  const [filterMOs, setFilterMOs] = useState<string[]>(() => getInitialState('list_filterMOs', []));
  const [dateFilterMode, setDateFilterMode] = useState(() => getInitialState('list_dateFilterMode', 'All'));
  const [customMonthStart, setCustomMonthStart] = useState(() => getInitialState('list_customMonthStart', ''));
  const [customMonthEnd, setCustomMonthEnd] = useState(() => getInitialState('list_customMonthEnd', ''));
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>(() => getInitialState('list_viewMode', 'detailed'));
  const [displayLimit, setDisplayLimit] = useState(5);

  useEffect(() => {
    sessionStorage.setItem('list_searchTerm', JSON.stringify(searchTerm));
    sessionStorage.setItem('list_filterAreas', JSON.stringify(filterAreas));
    sessionStorage.setItem('list_filterTypes', JSON.stringify(filterTypes));
    sessionStorage.setItem('list_filterMOs', JSON.stringify(filterMOs));
    sessionStorage.setItem('list_dateFilterMode', JSON.stringify(dateFilterMode));
    sessionStorage.setItem('list_customMonthStart', JSON.stringify(customMonthStart));
    sessionStorage.setItem('list_customMonthEnd', JSON.stringify(customMonthEnd));
    sessionStorage.setItem('list_viewMode', JSON.stringify(viewMode));
  }, [searchTerm, filterAreas, filterTypes, filterMOs, dateFilterMode, customMonthStart, customMonthEnd, viewMode]);

  useEffect(() => {
    // Reset limit when filters change
    setDisplayLimit(5);
  }, [searchTerm, filterAreas, filterTypes, filterMOs, dateFilterMode, customMonthStart, customMonthEnd]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterAreas([]);
    setFilterTypes([]);
    setFilterMOs([]);
    setDateFilterMode('All');
    setCustomMonthStart('');
    setCustomMonthEnd('');
  };

  const recordedAreas = useMemo(() => {
    const areas = new Set<string>();
    incidents.forEach(inc => {
      if (inc.area) areas.add(inc.area);
    });
    return Array.from(areas).sort();
  }, [incidents]);

  const areaOptions = useMemo(() => {
    const options: {label: string, value: string, isGroup?: boolean, indent?: boolean}[] = [];
    const knownAreas = Object.values(MUNICIPALITIES).flat();
    
    for (const [municipality, areas] of Object.entries(MUNICIPALITIES)) {
      const activeAreas = areas.filter(a => recordedAreas.includes(a));
      if (activeAreas.length > 0) {
        options.push({ label: municipality, value: municipality, isGroup: true });
        activeAreas.forEach(a => {
          options.push({ label: a, value: a, indent: true });
        });
      }
    }
    
    const validUnknown = recordedAreas.filter(a => !knownAreas.includes(a));
    if (validUnknown.length > 0) {
      options.push({ label: 'ΑΛΛΕΣ ΠΕΡΙΟΧΕΣ / ΑΓΝΩΣΤΕΣ', value: 'OTHER_AREAS', isGroup: true });
      validUnknown.forEach(a => {
        options.push({ label: a, value: a, indent: true });
      });
    }
    return options;
  }, [recordedAreas]);

  // MO Options depend on the selected types
  const moOptions = useMemo(() => {
    // If nothing selected, or if 'All' implicitly
    const types = filterTypes.length > 0 ? filterTypes : THEFT_TYPES;
    
    let options: {label: string, value: string}[] = [];
    
    const hasHouse = types.includes('Οικίας') || types.includes('Εξοχικό') || types.includes('Επιχείρησης');
    const hasVehicle = types.includes('Κλοπή από όχημα') || types.includes('Κλοπή οχήματος');
    const hasRobbery = types.includes('Ληστεία');
    
    if (hasHouse) {
      MO_HOUSE.forEach(mo => options.push({ label: mo, value: mo }));
    }
    if (hasVehicle) {
      MO_VEHICLE.forEach(mo => options.push({ label: mo, value: mo }));
    }
    if (hasRobbery) {
      MO_ROBBERY.forEach(mo => options.push({ label: mo, value: mo }));
    }
    
    return options;
  }, [filterTypes]);

  useEffect(() => {
    // Clean up MO selection if type changes and selected MOs are no longer valid
    if (filterMOs.length > 0) {
      const validValues = moOptions.map(o => o.value);
      const newMOs = filterMOs.filter(mo => validValues.includes(mo));
      if (newMOs.length !== filterMOs.length) {
        setFilterMOs(newMOs);
      }
    }
  }, [moOptions, filterMOs]);

  const filteredIncidents = incidents.filter(inc => {
    const term = toUpperCaseAccentFree(searchTerm);
    let searchInItems = false;
    if (Array.isArray(inc.stolenItems)) {
      searchInItems = inc.stolenItems.some(s =>
        toUpperCaseAccentFree(typeof s === 'string' ? s : (s as any).description || '').includes(term)
      );
    }
    
    // Convert the entire incident to a string (excluding large fields like photos) for an exhaustive search pool, OR manually check all string fields.
    // Let's manually check all relevant fields to be clean.
    const allText = [
      inc.address,
      inc.theftType,
      inc.victimName,
      inc.victimPhone,
      inc.witnessName,
      inc.witnessPhone,
      inc.area,
      inc.notes,
      inc.modusOperandi,
      inc.creatorName,
      inc.suspectNames,
      inc.perpetratorDescription,
      inc.vehicle,
      inc.plateNumber,
      inc.linkedIncidents,
      inc.carCategory
    ].map(s => s ? toUpperCaseAccentFree(String(s)) : '').join(' ');

    const matchesSearch = !term || allText.includes(term) || searchInItems;
    
    const matchesArea = filterAreas.length === 0 || filterAreas.includes(inc.area);
    const matchesType = filterTypes.length === 0 || filterTypes.includes(inc.theftType);
    const matchesMO = filterMOs.length === 0 || (inc.modusOperandi && filterMOs.includes(inc.modusOperandi));

    let matchesDate = true;
    if (dateFilterMode !== 'All' && inc.recordedAt?.toDate) {
      const incDate = inc.recordedAt.toDate();
      const now = new Date();
      if (dateFilterMode === 'Last7') {
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = incDate >= lastWeek;
      } else if (dateFilterMode === 'Last30') {
        const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = incDate >= lastMonth;
      } else if (dateFilterMode === 'CurrentYear') {
        matchesDate = incDate.getFullYear() === now.getFullYear();
      } else if (dateFilterMode === 'Custom') {
        if (customMonthStart) {
          const start = new Date(customMonthStart);
          if (incDate < start) matchesDate = false;
        }
        if (customMonthEnd) {
          const end = new Date(customMonthEnd);
          end.setHours(23, 59, 59, 999);
          if (incDate > end) matchesDate = false;
        }
      }
    }

    return matchesSearch && matchesArea && matchesType && matchesDate && matchesMO;
  }).sort((a, b) => {
    // Treat missing recordedAt as "just now" for sorting purposes
    const timeA = a.recordedAt?.toMillis ? a.recordedAt.toMillis() : (a.recordedAt?.seconds ? a.recordedAt.seconds * 1000 : Date.now());
    const timeB = b.recordedAt?.toMillis ? b.recordedAt.toMillis() : (b.recordedAt?.seconds ? b.recordedAt.seconds * 1000 : Date.now());
    return timeB - timeA;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-white rounded-[32px] animate-pulse border border-slate-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search & Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Αναζήτηση διεύθυνσης, είδους, παθόντα, τηλεφώνου, αστυνομικού..."
              className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-6 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium text-slate-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 lg:flex lg:flex-row gap-3 shrink-0">
            <SingleSelect
              label="ΧΡΟΝΟΣ"
              options={[
                { label: 'ΧΡΟΝΟΣ', value: 'All' },
                { label: 'ΤΕΛΕΥΤΑΙΑ ΕΒΔΟΜΑΔΑ', value: 'Last7' },
                { label: 'ΤΕΛΕΥΤΑΙΟΣ ΜΗΝΑΣ', value: 'Last30' },
                { label: 'ΤΡΕΧΟΝ ΕΤΟΣ', value: 'CurrentYear' },
                { label: 'ΕΠΙΛΟΓΗ ΔΙΑΣΤΗΜΑΤΟΣ', value: 'Custom' },
              ]}
              selected={dateFilterMode}
              onChange={setDateFilterMode}
              className="w-full lg:w-40 h-[42px]"
            />
            <MultiSelect 
              label="ΠΕΡΙΟΧΗ"
              options={areaOptions}
              selected={filterAreas}
              onChange={setFilterAreas}
              className="w-full lg:w-40 h-[42px]"
            />
            <MultiSelect 
              label="ΕΙΔΟΣ"
              options={THEFT_TYPES.map(t => ({ label: t, value: t }))}
              selected={filterTypes}
              onChange={setFilterTypes}
              className="w-full lg:w-40 h-[42px]"
            />
            <MultiSelect 
              label="ΜΕΘΟΔΟΣ"
              options={moOptions}
              selected={filterMOs}
              onChange={setFilterMOs}
              className="w-full lg:w-48 h-[42px]"
            />
            {(searchTerm || filterAreas.length > 0 || filterTypes.length > 0 || filterMOs.length > 0 || dateFilterMode !== 'All') && (
               <button
                 onClick={handleClearFilters}
                 className="col-span-2 lg:col-auto h-[42px] px-4 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                 title="Εκκαθάριση Φίλτρων"
               >
                 <X className="w-5 h-5 lg:mr-0 mr-2" />
                 <span className="lg:hidden text-xs font-bold uppercase">ΕΚΚΑΘΑΡΙΣΗ ΦΙΛΤΡΩΝ</span>
               </button>
            )}
          </div>
        </div>
        
        {/* Render custom month picker if mode is custom */}
        <AnimatePresence>
          {dateFilterMode === 'Custom' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col sm:flex-row gap-4 items-center bg-white border border-[#1A237E]/30 p-4 sm:p-5 rounded-2xl shadow-sm"
            >
              <div className="flex-1 w-full">
                <label className="text-[9px] uppercase tracking-[0.2em] text-[#1A237E] font-bold mb-2 block">{toUpperCaseAccentFree('Από Μήνα')}</label>
                <input 
                  type="month" 
                  value={customMonthStart} 
                  onChange={e => setCustomMonthStart(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A237E]/50 text-slate-900 font-bold" 
                />
              </div>
              <div className="flex-1 w-full">
                <label className="text-[9px] uppercase tracking-[0.2em] text-[#1A237E] font-bold mb-2 block">{toUpperCaseAccentFree('Έως Μήνα')}</label>
                <input 
                  type="month" 
                  value={customMonthEnd} 
                  onChange={e => setCustomMonthEnd(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A237E]/50 text-slate-900 font-bold" 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats Counter & View Toggles */}
      <div className="flex flex-row items-center justify-between px-1 sm:px-2 gap-4 mb-4 bg-slate-50 border border-slate-100 rounded-2xl p-2 sm:p-3">
        <h3 className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 pl-2">
          {toUpperCaseAccentFree(`ΕΜΦΑΝΙΣΗ ${filteredIncidents.length} ΠΕΡΙΣΤΑΤΙΚΩΝ`)}
        </h3>
        
        <div className="flex bg-white shadow-sm border border-slate-100 rounded-xl p-1 shrink-0">
          <button
            onClick={() => setViewMode('detailed')}
            className={`p-2 rounded-lg transition-all flex items-center justify-center ${viewMode === 'detailed' ? 'bg-white shadow-sm text-[#1A237E]' : 'text-slate-400 hover:text-slate-600'}`}
            title="Αναλυτική προβολή"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('compact')}
            className={`p-2 rounded-lg transition-all flex items-center justify-center ${viewMode === 'compact' ? 'bg-white shadow-sm text-[#1A237E]' : 'text-slate-400 hover:text-slate-600'}`}
            title="Συμπαγής προβολή"
          >
            <LayoutList className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className={viewMode === 'detailed' ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "grid grid-cols-1 gap-3"}>
        <AnimatePresence>
          {filteredIncidents.slice(0, displayLimit).map((incident) => (
            <motion.div
              layout
              key={incident.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              onClick={() => onEdit(incident)}
              className={`transition-all duration-300 ease-out cursor-pointer group relative overflow-hidden border ${
                (() => {
                  const baseStyle = viewMode === 'detailed' 
                    ? "rounded-2xl p-5 sm:p-6 hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1.5" 
                    : "rounded-xl p-2.5 sm:p-3 hover:shadow-md hover:-translate-y-1";
                  
                  return `${TYPE_COLORS[incident.theftType] || 'bg-white border-slate-100'} ${baseStyle}`;
                })()
              }`}
            >
              <div className={`flex flex-col`}>
                <div className={`flex flex-col`}>
                  <div className={`flex ${viewMode === 'detailed' ? 'items-start justify-between' : 'items-center flex-1 min-w-0'} gap-3 sm:gap-4`}>
                    <div className={`flex ${viewMode === 'detailed' ? 'items-start' : 'items-center'} gap-3 sm:gap-4 flex-1 min-w-0`}>
                      <div className={`${viewMode === 'detailed' ? 'p-3.5 rounded-2xl' : 'p-2 rounded-xl'} shrink-0 flex items-center justify-center ${incident.status === 'Τετελεσμένη' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                        {(() => {
                          const iconClass = viewMode === 'detailed' ? "w-6 h-6" : "w-4 h-4";
                          const smallIconClass = viewMode === 'detailed' ? "w-4 h-4" : "w-3 h-3";
                          switch (incident.theftType as string) {
                            case 'Οικίας':
                            case 'Οικία (Κύρια)':
                              return <Home className={iconClass} />;
                            case 'Εξοχικό':
                            case 'Οικία (Εξοχική)':
                              return <TreePalm className={iconClass} />;
                            case 'Επιχείρησης':
                            case 'Επιχείρηση':
                              return <Store className={iconClass} />;
                            case 'Κλοπή από όχημα':
                            case 'Από όχημα':
                              return <CarFront className={iconClass} />;
                            case 'Κλοπή οχήματος':
                            case 'Κλοπή Αυτοκινήτου':
                              return <Car className={iconClass} />;
                            case 'Ληστεία':
                              return <Crosshair className={iconClass} />;
                            default:
                              return incident.status === 'Τετελεσμένη' ? <AlertTriangle className={iconClass} /> : <Plus className={iconClass} />;
                          }
                        })()}
                      </div>
                      
                      <div className={`flex flex-col ${viewMode === 'compact' ? 'gap-0 sm:gap-0.5' : 'gap-0.5 sm:gap-1'} flex-1 min-w-0`}>
                        {viewMode === 'detailed' && (
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${incident.status === 'Τετελεσμένη' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                              {toUpperCaseAccentFree(incident.status)}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${viewMode === 'compact' ? 'items-center gap-2' : 'flex-col'} min-w-0`}>
                           {viewMode === 'compact' && (
                             <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${incident.status === 'Τετελεσμένη' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                               {toUpperCaseAccentFree(incident.status)}
                             </span>
                           )}
                           <h3 className={`${viewMode === 'detailed' ? 'text-base sm:text-lg' : 'text-xs sm:text-[13px]'} font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate`}>
                             {toUpperCaseAccentFree(incident.theftType || '')}
                           </h3>
                        </div>
                        {viewMode === 'compact' && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span className="truncate max-w-[120px] sm:max-w-[180px]">{incident.area}</span>
                            <span className="text-slate-300">•</span>
                            <span className="font-medium shrink-0">
                              {incident.isTimeRange 
                                ? `${incident.incidentDateFrom && format(new Date(incident.incidentDateFrom), "d/MM/yy")} - ${incident.incidentDateTo && format(new Date(incident.incidentDateTo), "d/MM/yy")}`
                                : incident.incidentDate && format(new Date(incident.incidentDate), "d/MM/yy HH:mm")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {viewMode === 'detailed' && (
                      <div className="hidden sm:flex items-center gap-2 mt-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-slate-50 group-hover:bg-blue-600 group-hover:text-white text-slate-400">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {viewMode === 'detailed' && (
                    <div className="flex flex-col gap-3 pl-0 sm:pl-1 mt-3 sm:mt-4">
                      <div className="flex items-start gap-2 text-slate-600 text-[13px] sm:text-sm font-medium">
                        <MapPin className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
                        <span className="line-clamp-2">{incident.address ? `${incident.address}, ` : ''}{toUpperCaseAccentFree(incident.area)}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        {incident.isTimeRange ? (
                          <div className="flex items-center gap-1.5 bg-blue-50/70 text-blue-700 px-2.5 py-1.5 rounded-lg border border-blue-100/50">
                            <Clock className="w-4 h-4 shrink-0 text-blue-500" />
                            <span className="font-semibold text-xs text-nowrap">
                              {incident.incidentDateFrom && format(new Date(incident.incidentDateFrom), "d MMM yy", { locale: el })} - {incident.incidentDateTo && format(new Date(incident.incidentDateTo), "d MMM yy", { locale: el })}
                            </span>
                          </div>
                        ) : (
                          incident.incidentDate && (
                            <div className="flex items-center gap-1.5 bg-blue-50/70 text-blue-700 px-2.5 py-1.5 rounded-lg border border-blue-100/50">
                              <Clock className="w-4 h-4 shrink-0 text-blue-500" />
                              <span className="font-semibold text-xs text-nowrap">{format(new Date(incident.incidentDate), "d MMM yy | HH:mm", { locale: el })}</span>
                            </div>
                          )
                        )}
                        {incident.modusOperandi && (
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-2.5 py-1.5 rounded-lg text-slate-600 max-w-full">
                            <span className="font-bold uppercase tracking-wider text-[10px] shrink-0">ΜΕΘΟΔΟΣ:</span>
                            <span className="truncate text-xs">{incident.modusOperandi}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {viewMode === 'detailed' && incident.notes && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-[13px] text-slate-500 line-clamp-2 leading-relaxed italic break-all">
                      "{incident.notes}"
                    </p>
                  </div>
                )}
                
                <div className={`flex items-start sm:items-center justify-between gap-3 mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-slate-100/50 text-[11px] text-slate-400 font-medium`}>
                  <div className="flex flex-col flex-1 pr-2">
                     <span className="italic leading-snug">
                       Καταχωρήθηκε από <span className="font-semibold text-slate-500">{incident.creatorRank ? `${incident.creatorRank} ` : ''}{toUpperCaseAccentFree(incident.creatorName || incident.createdBy?.substring(0, 8) || '')}</span>
                       {' '}την <span className="font-semibold text-slate-500">{incident.recordedAt?.toDate ? format(incident.recordedAt.toDate(), "dd/MM/yyyy") : '...'}</span>
                       {' '}και ώρα <span className="font-semibold text-slate-500">{incident.recordedAt?.toDate ? format(incident.recordedAt.toDate(), "HH:mm") : '...'}</span>
                     </span>
                  </div>
                  {([incident.photo1, incident.photo2, incident.photo3].filter(Boolean).length > 0) && (
                    <div className="flex items-center justify-center gap-1.5 bg-slate-100/80 px-2 py-1.5 rounded-md shrink-0 border border-slate-200/60 font-semibold text-[10px] uppercase text-slate-600 mt-1 sm:mt-0">
                      <Camera className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">Συνημμένα ({[incident.photo1, incident.photo2, incident.photo3].filter(Boolean).length})</span>
                      <span className="sm:hidden">{[incident.photo1, incident.photo2, incident.photo3].filter(Boolean).length}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredIncidents.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-300 gap-6">
          <Search className="w-16 h-16 opacity-30" />
          <p className="font-bold uppercase tracking-widest text-xs">{toUpperCaseAccentFree('ΔΕΝ ΒΡΕΘΗΚΑΝ ΑΠΟΤΕΛΕΣΜΑΤΑ')}</p>
        </div>
      )}

      {filteredIncidents.length > displayLimit && (
        <div className="flex justify-center mt-8 pb-8">
          <button
            onClick={() => setDisplayLimit(prev => prev + 5)}
            className="bg-white hover:bg-slate-50 text-[#1A237E] font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl border border-slate-200 transition-all shadow-sm hover:shadow-md"
          >
            ΕΜΦΑΝΙΣΗ ΠΕΡΙΣΣΟΤΕΡΩΝ (5)
          </button>
        </div>
      )}
    </div>
  );
}
