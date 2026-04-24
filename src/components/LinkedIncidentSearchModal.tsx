import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Incident } from '../types';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { X, Search, ShieldCheck, MapPin, Calendar, Check } from 'lucide-react';
import { toUpperCaseAccentFree } from '../lib/Typography';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

interface LinkedIncidentSearchModalProps {
  onClose: () => void;
  onSelect: (incidentId: string) => void;
  selectedIds: string[];
  allIncidents?: Incident[];
}

export default function LinkedIncidentSearchModal({ onClose, onSelect, selectedIds, allIncidents }: LinkedIncidentSearchModalProps) {
  const [incidents, setIncidents] = useState<Incident[]>(allIncidents || []);
  const [loading, setLoading] = useState(!allIncidents);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (allIncidents) {
      setIncidents(allIncidents);
      setLoading(false);
      return;
    }
    
    // Only fetch if allIncidents wasn't provided (fallback)
    const fetchIncidents = async () => {
      try {
        const q = query(
          collection(db, 'incidents'),
          orderBy('recordedAt', 'desc'),
          limit(50)
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => doc.data() as Incident);
        setIncidents(fetched);
      } catch (err: any) {
        console.error('Σφάλμα κατά την αναζήτηση συμβάντων:', err);
        toast.error(`Αποτυχία φόρτωσης λίστας συμβάντων: ${err?.message || 'Άγνωστο σφάλμα'}`);
      } finally {
        setLoading(false);
      }
    };
    fetchIncidents();
  }, [allIncidents]);

  const filteredIncidents = incidents.filter(inc => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (inc.id?.toLowerCase() || '').includes(q) ||
      inc.area.toLowerCase().includes(q) ||
      inc.theftType.toLowerCase().includes(q) ||
      (inc.address?.toLowerCase() || '').includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-[9999] bg-[#1A237E]/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-slate-50 flex flex-col rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-2xl h-[85vh]"
      >
        <div className="p-6 sm:p-8 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-[#1A237E] uppercase tracking-tight">ΑΝΑΖΗΤΗΣΗ ΣΥΜΒΑΝΤΩΝ</h3>
            <p className="text-slate-500 text-sm mt-1">Επιλέξτε συμβάντα για σύνδεση</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 bg-white shrink-0 border-b border-slate-100">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Αναζήτηση με ID, Περιοχή, Είδος Κλοπής..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 py-4 outline-none focus:ring-4 focus:ring-[#1A237E]/5 focus:border-[#1A237E] transition-all text-slate-900 font-bold"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 p-space-y-3 space-y-3 bg-slate-50">
          {loading ? (
            <div className="text-center text-slate-400 py-10 font-bold uppercase tracking-widest text-sm">Φορτωση υποθεσεων...</div>
          ) : filteredIncidents.length === 0 ? (
            <div className="text-center text-slate-400 py-10 font-bold uppercase tracking-widest text-sm">Δεν Βρεθηκαν Υποθεσεις</div>
          ) : (
            filteredIncidents.map(incident => {
              const isSelected = incident.id ? selectedIds.includes(incident.id) : false;
              return (
                <div 
                  key={incident.id}
                  onClick={() => incident.id && onSelect(incident.id)}
                  className={`bg-white p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group ${
                    isSelected 
                      ? 'border-[#1A237E] bg-[#1A237E] shadow-lg shadow-[#1A237E]/20' 
                      : 'border-slate-100 hover:border-[#1A237E]/20 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-[10px] sm:text-xs font-black uppercase tracking-widest px-2 sm:px-3 py-1 rounded-lg ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#1A237E]/10 text-[#1A237E]'
                      }`}>
                        {incident.id?.split('-')[1] || incident.id}
                      </span>
                      <span className={`text-xs sm:text-sm font-bold uppercase truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                        {toUpperCaseAccentFree(incident.theftType)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className={`flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{incident.area}{incident.address ? `, ${incident.address}` : ''}</span>
                      </div>
                      {incident.incidentDate && (
                        <div className={`flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>{format(new Date(incident.incidentDate), "d MMM yy", { locale: el })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                    isSelected 
                      ? 'bg-white border-white text-[#1A237E]' 
                      : 'border-slate-200 group-hover:border-[#1A237E]/30 bg-slate-50 text-slate-300'
                  }`}>
                    {isSelected ? <Check className="w-4 h-4 font-bold" /> : <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 sm:p-6 bg-white border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-[#1A237E] text-[#D4AF37] disabled:opacity-50 py-4 rounded-xl font-black uppercase tracking-[0.2em] hover:bg-[#1A237E]/90 transition-all active:scale-[0.98]"
          >
            ΟΛΟΚΛΗΡΩΣΗ
          </button>
        </div>
      </motion.div>
    </div>
  );
}
