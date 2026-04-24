import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Incident } from '../types';
import { Search, Filter, Calendar, MapPin, ChevronRight, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { toUpperCaseAccentFree } from '../lib/Typography';

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
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-14 pr-6 focus:ring-4 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all shadow-sm font-medium text-slate-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 lg:flex lg:flex-row gap-3 shrink-0">
            <select 
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-[#1A237E]/20 focus:border-[#1A237E] font-bold text-xs sm:text-[11px] uppercase tracking-widest text-[#1A237E] text-ellipsis overflow-hidden whitespace-nowrap lg:w-40 appearance-none text-center"
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
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-[#1A237E]/20 focus:border-[#1A237E] font-bold text-xs sm:text-[11px] uppercase tracking-widest text-slate-600 text-ellipsis overflow-hidden whitespace-nowrap lg:w-40 appearance-none text-center"
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
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-[#1A237E]/20 focus:border-[#1A237E] font-bold text-xs sm:text-[11px] uppercase tracking-widest text-slate-600 text-ellipsis overflow-hidden whitespace-nowrap lg:w-40 appearance-none text-center"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">{toUpperCaseAccentFree('ΕΙΔΟΣ')}</option>
              <option value="Οικία (Κύρια)">{toUpperCaseAccentFree('Οικία (Κύρια)')}</option>
              <option value="Οικία (Εξοχική)">{toUpperCaseAccentFree('Οικία (Εξοχική)')}</option>
              <option value="Επιχείρηση">{toUpperCaseAccentFree('Επιχείρηση')}</option>
              <option value="Από όχημα">{toUpperCaseAccentFree('Από όχημα')}</option>
              <option value="Κλοπή Αυτοκινήτου">{toUpperCaseAccentFree('Κλοπή Οχήματος')}</option>
            </select>
            <select 
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-[#1A237E]/20 focus:border-[#1A237E] font-bold text-xs sm:text-[11px] uppercase tracking-widest text-slate-600 text-ellipsis overflow-hidden whitespace-nowrap lg:w-40 appearance-none text-center"
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

      {/* Stats Counter */}
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {toUpperCaseAccentFree(`ΕΜΦΑΝΙΣΗ ${filteredIncidents.length} ΠΕΡΙΣΤΑΤΙΚΩΝ`)}
        </h3>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence>
          {filteredIncidents.map((incident) => (
            <motion.div
              layout
              key={incident.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              onClick={() => onEdit(incident)}
              className="bg-white border sm:border-slate-200 rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 hover:shadow-xl hover:border-[#1A237E]/30 transition-all cursor-pointer group relative overflow-hidden shadow-sm"
            >
              {/* Status Indicator */}
              <div className={`absolute top-0 right-0 px-4 py-2 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest ${incident.status === 'Τετελεσμένη' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                {toUpperCaseAccentFree(incident.status)}
              </div>

              <div className="flex items-start gap-4 sm:gap-6">
                <div className={`p-4 shrink-0 rounded-2xl ${incident.status === 'Τετελεσμένη' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                  {incident.status === 'Τετελεσμένη' ? <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" /> : <Plus className="w-6 h-6 sm:w-7 sm:h-7" />}
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-[#1A237E] transition-colors break-words line-clamp-2">
                    {toUpperCaseAccentFree(incident.theftType)}
                  </h3>
                  <div className="flex items-start gap-2 text-slate-500 text-sm mt-2 font-medium">
                    <MapPin className="w-4 h-4 shrink-0 text-slate-300 mt-0.5" />
                    <span className="line-clamp-2">{incident.address}, {toUpperCaseAccentFree(incident.area)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-slate-400 text-[9px] sm:text-[10px] mt-4 font-bold uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span className="whitespace-nowrap text-slate-400">
                      ΚΑΤ: {incident.recordedAt?.toDate ? format(incident.recordedAt.toDate(), "d MMM yy", { locale: el }) : '...'}
                    </span>
                    {incident.incidentDate && (
                      <>
                        <span className="hidden sm:inline-block mx-1">•</span>
                        <span className="whitespace-nowrap text-[#1A237E]/80 font-black">
                         ΣΥΜ: {format(new Date(incident.incidentDate), "d MMM yy | HH:mm", { locale: el })}
                        </span>
                      </>
                    )}
                    <span className="hidden sm:inline-block mx-1 text-slate-300">•</span>
                    <span className="text-slate-400 shrink-0">
                      <span className="font-black text-[#1A237E]/60">{incident.creatorRank ? toUpperCaseAccentFree(incident.creatorRank) + ' ' : ''}</span>
                      {incident.creatorName ? toUpperCaseAccentFree(incident.creatorName) : incident.createdBy?.substring(0, 8)}
                    </span>
                  </div>
                </div>
                <div className="self-center hidden sm:block">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#1A237E] group-hover:text-white transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {incident.notes && (
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
