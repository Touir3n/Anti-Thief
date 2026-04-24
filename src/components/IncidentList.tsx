import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError } from '../firebase';
import { Incident } from '../types';
import { Search, Filter, Calendar, MapPin, ChevronRight, AlertTriangle, CheckCircle, Plus, Trash2, AlertCircle, X, LayoutGrid, LayoutList, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { toUpperCaseAccentFree } from '../lib/Typography';

import { toast } from 'react-hot-toast';

interface IncidentListProps {
  onEdit: (incident: Incident) => void;
}

export default function IncidentList({ onEdit }: IncidentListProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterMO, setFilterMO] = useState('All');
  const [dateFilterMode, setDateFilterMode] = useState('All');
  const [customMonthStart, setCustomMonthStart] = useState('');
  const [customMonthEnd, setCustomMonthEnd] = useState('');
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed');

  useEffect(() => {
    if (!auth.currentUser) return;

    // In a real police app, we might query all. 
    // But for security demo, we query createdBy.
    const q = query(
      collection(db, 'incidents'),
      orderBy('recordedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
      setIncidents(data);
      setLoading(false);
    }, (error) => {
      console.error("Σφάλμα συγχρονισμού λίστας συμβάντων:", error);
      toast.error("Σφάλμα σύνδεσης. Η λίστα λειτουργεί εκτός σύνδεσης.");
    });

    return unsubscribe;
  }, []);

  const filteredIncidents = incidents.filter(inc => {
    const matchesSearch = 
      inc.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.theftType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.victimName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesArea = filterArea === 'All' || inc.area === filterArea;
    const matchesType = filterType === 'All' || inc.theftType === filterType;
    const matchesMO = filterMO === 'All' || inc.modusOperandi === filterMO;

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
      } else if (dateFilterMode === 'Last365') {
        const lastYear = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        matchesDate = incDate >= lastYear;
      } else if (dateFilterMode === 'Custom') {
        if (customMonthStart) {
          const [year, month] = customMonthStart.split('-');
          const start = new Date(Number(year), Number(month) - 1, 1);
          if (incDate < start) matchesDate = false;
        }
        if (customMonthEnd) {
          const [year, month] = customMonthEnd.split('-');
          const end = new Date(Number(year), Number(month), 0, 23, 59, 59); // Last day of month
          if (incDate > end) matchesDate = false;
        }
      }
    }

    return matchesSearch && matchesArea && matchesType && matchesDate && matchesMO;
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
              placeholder="Αναζήτηση διεύθυνσης, είδους ή παθόντα..."
              className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-6 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium text-slate-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 lg:flex lg:flex-row gap-3 shrink-0">
            <select 
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-xs text-slate-700 text-ellipsis overflow-hidden whitespace-nowrap lg:w-40"
              value={dateFilterMode}
              onChange={(e) => setDateFilterMode(e.target.value)}
            >
              <option value="All">{toUpperCaseAccentFree('ΧΡΟΝΟΣ')}</option>
              <option value="Last7">{toUpperCaseAccentFree('ΕΒΔΟΜΑΔΑ')}</option>
              <option value="Last30">{toUpperCaseAccentFree('ΜΗΝΑΣ')}</option>
              <option value="Last365">{toUpperCaseAccentFree('ΕΤΟΣ')}</option>
              <option value="Custom">{toUpperCaseAccentFree('ΕΠΙΛΟΓΗ ΜΗΝΑ')}</option>
            </select>
            <select 
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-xs text-slate-700 text-ellipsis overflow-hidden whitespace-nowrap lg:w-40"
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
            >
              <option value="All">{toUpperCaseAccentFree('ΠΕΡΙΟΧΗ')}</option>
              {[
                'Ασπροβάλτα', 'Σταυρός', 'Νέα Βρασνά', 'Νέα Μάδυτος',
                'Ανοιξιά', 'Απολλωνία', 'Αρέθουσα', 'Βαμβακιά', 'Βρασνά', 
                'Κοκκαλού', 'Λίμνη', 'Μαυρούδα', 'Μεγάλη Βόλβη', 'Μικρή Βόλβη', 
                'Μόδι', 'Παραλία Βρασνών', 'Ρεντίνα', 'Σκεπαστό'
              ].map(area => (
                <option key={area} value={area}>{toUpperCaseAccentFree(area)}</option>
              ))}
            </select>
            <select 
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-xs text-slate-700 text-ellipsis overflow-hidden whitespace-nowrap lg:w-40"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">{toUpperCaseAccentFree('ΕΙΔΟΣ')}</option>
              <option value="Οικία (Κύρια)">{toUpperCaseAccentFree('Οικία (Κύρια)')}</option>
              <option value="Οικία (Εξοχική)">{toUpperCaseAccentFree('Οικία (Εξοχική)')}</option>
              <option value="Επιχείρηση">{toUpperCaseAccentFree('Επιχείρηση')}</option>
              <option value="Από όχημα">{toUpperCaseAccentFree('Από όχημα')}</option>
              <option value="Κλοπή Αυτοκινήτου">{toUpperCaseAccentFree('Κλοπή Αυτοκινήτου')}</option>
            </select>
            <select 
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-xs text-slate-700 text-ellipsis overflow-hidden whitespace-nowrap lg:w-40"
              value={filterMO}
              onChange={(e) => setFilterMO(e.target.value)}
            >
              <option value="All">{toUpperCaseAccentFree('ΤΡΟΠΟΣ ΔΡΑΣΗΣ')}</option>
              {[
                'Ανασφάλιστο', 'Θραύση υαλοπίνακα', 'Παραβίαση κλειδαριάς', 
                'Διάρρηξη παραθύρου/μπαλκονόπορτας', 'Χωρίς ίχνη', 'Άλλο'
              ].map(mo => (
                <option key={mo} value={mo}>{toUpperCaseAccentFree(mo)}</option>
              ))}
            </select>
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
          {filteredIncidents.map((incident) => (
            <motion.div
              layout
              key={incident.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              onClick={() => onEdit(incident)}
              className={`bg-white border transition-all cursor-pointer group relative overflow-hidden ${
                viewMode === 'detailed' 
                  ? "border-slate-200 rounded-2xl p-5 sm:p-6 hover:shadow-lg hover:border-blue-200" 
                  : "border-slate-100 rounded-xl p-3 sm:p-4 hover:border-blue-300 hover:shadow-md"
              }`}
            >
              <div className={`flex ${viewMode === 'detailed' ? 'items-start gap-4 sm:gap-6' : 'items-center gap-3 sm:gap-4'}`}>
                <div className={`${viewMode === 'detailed' ? 'p-4 rounded-2xl' : 'p-2.5 rounded-xl'} shrink-0 flex items-center justify-center ${incident.status === 'Τετελεσμένη' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                  {incident.status === 'Τετελεσμένη' ? <AlertTriangle className={viewMode === 'detailed' ? "w-6 h-6" : "w-5 h-5"} /> : <Plus className={viewMode === 'detailed' ? "w-6 h-6" : "w-5 h-5"} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`flex flex-col ${viewMode === 'compact' ? 'sm:flex-row sm:items-center' : ''} gap-1 sm:gap-3`}>
                    <div className={`flex items-center gap-2 ${viewMode === 'detailed' ? 'mb-2' : ''}`}>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${incident.status === 'Τετελεσμένη' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                        {toUpperCaseAccentFree(incident.status)}
                      </span>
                    </div>
                    <h3 className={`${viewMode === 'detailed' ? 'text-base sm:text-lg' : 'text-sm'} font-bold text-slate-900 group-hover:text-blue-600 transition-colors break-words line-clamp-1`}>
                      {toUpperCaseAccentFree(incident.theftType)}
                    </h3>
                  </div>
                  
                  {viewMode === 'detailed' ? (
                    <>
                      <div className="flex items-start gap-2 text-slate-500 text-sm mt-2 font-medium">
                        <MapPin className="w-4 h-4 shrink-0 text-slate-300 mt-0.5" />
                        <span className="line-clamp-2">{incident.address}, {toUpperCaseAccentFree(incident.area)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-slate-500 text-xs mt-4 font-medium">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{incident.recordedAt?.toDate ? format(incident.recordedAt.toDate(), "d MMM yy", { locale: el }) : '...'}</span>
                        </div>
                        {incident.incidentDate && (
                          <div className="flex items-center gap-1.5 bg-blue-50/50 text-blue-700 px-2 py-1 rounded-md">
                            <span className="font-semibold">{format(new Date(incident.incidentDate), "d MMM yy | HH:mm", { locale: el })}</span>
                          </div>
                        )}
                        <div className="flex text-slate-400 w-full sm:w-auto sm:ml-auto items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-md overflow-hidden mt-1 sm:mt-0">
                          {incident.creatorRank && <span className="text-slate-500 font-semibold truncate max-w-[45%] sm:max-w-none">{incident.creatorRank}</span>}
                          <span className="truncate flex-1">{incident.creatorName || incident.createdBy?.substring(0, 8)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1.5 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="line-clamp-1">{incident.area}</span>
                      </div>
                      {incident.incidentDate && (
                         <div className="flex items-center gap-1.5 sm:border-l sm:border-slate-200 sm:pl-4">
                           <Clock className="w-3.5 h-3.5 text-slate-400" />
                           <span className="font-semibold">{format(new Date(incident.incidentDate), "d MMM yy | HH:mm", { locale: el })}</span>
                         </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="self-center hidden sm:flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${viewMode === 'detailed' ? 'bg-slate-50 group-hover:bg-blue-600 group-hover:text-white' : 'text-slate-300 group-hover:text-blue-500'}`}>
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {viewMode === 'detailed' && incident.notes && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed italic">
                    "{incident.notes}"
                  </p>
                </div>
              )}
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
    </div>
  );
}
