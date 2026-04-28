import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { X, Archive, Calendar, User, Clock, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { toUpperCaseAccentFree } from '../lib/Typography';

export default function DeletedIncidentsModal({ onClose }: { onClose: () => void }) {
  const [deletedIncidents, setDeletedIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'deleted_incidents'), orderBy('deletedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: any[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });
      setDeletedIncidents(results);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching deleted incidents:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    if (timestamp.toDate) return timestamp.toDate().toLocaleString('el-GR');
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toLocaleString('el-GR');
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) return d.toLocaleString('el-GR');
    return String(timestamp);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'deleted_incidents', id));
      toast.success(toUpperCaseAccentFree('ΤΟ ΣΥΜΒΑΝ ΔΙΑΓΡΑΦΗΚΕ ΟΡΙΣΤΙΚΑ'));
      setConfirmDeleteId(null);
    } catch (error) {
      console.error('Error deleting incident permanently:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error(toUpperCaseAccentFree('ΣΦΑΛΜΑ: ' + errMsg));
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-slate-50 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-2.5 rounded-xl text-red-600 border border-red-100">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">ΙΣΤΟΡΙΚΟ ΔΙΑΓΡΑΦΩΝ</h2>
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mt-0.5">ΜΟΝΟ ΓΙΑ SUPER ADMIN</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 p-safe">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-800"></div>
            </div>
          ) : deletedIncidents.length === 0 ? (
            <div className="text-center py-20 text-slate-400 flex flex-col items-center">
              <Archive className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-semibold">Δεν υπάρχουν διαγραμμένα συμβάντα</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deletedIncidents.map((incident) => (
                <div key={incident.id} className="bg-white border text-left border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all">
                  <div className="flex sm:flex-row flex-col sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                       <span className="font-black text-[13px] bg-slate-100 px-2 py-1 flex items-center justify-center rounded-lg text-slate-700">
                         {toUpperCaseAccentFree(incident.area || '-')}
                       </span>
                       <span className="font-bold text-[13px] text-slate-600">
                         {toUpperCaseAccentFree(incident.theftType || '-')}
                       </span>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="text-[10px] sm:text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-lg flex items-center gap-1.5">
                         <Archive className="w-3.5 h-3.5" />
                         ΔΙΑΓΡΑΦΗΚΕ ΚΑΤΑ {formatDate(incident.deletedAt)}
                      </div>
                      {confirmDeleteId === incident.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(incident.id)}
                            className="text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 px-2 flex items-center h-[26px] rounded-lg transition-colors border border-red-700 uppercase"
                          >
                            ΟΡΙΣΤΙΚΑ;
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors h-[26px] w-[26px] flex items-center justify-center shrink-0"
                            title="Ακύρωση"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(incident.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 bg-white"
                          title="Οριστική Διαγραφή"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] font-medium text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 min-w-0">
                       <div className="flex items-center gap-1.5 shrink-0">
                         <User className="w-3.5 h-3.5 text-slate-400" />
                         <span className="text-slate-400">Διαγράφηκε από:</span>
                       </div>
                       <span className="text-slate-800 font-bold break-all">{incident.deletedByEmail || incident.deletedBy || '?'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 min-w-0">
                       <div className="flex items-center gap-1.5 shrink-0">
                         <Clock className="w-3.5 h-3.5 text-slate-400" />
                         <span className="text-slate-400">Δημιουργός:</span>
                       </div>
                       <span className="text-slate-800 font-bold break-words">{toUpperCaseAccentFree(incident.creatorName) || incident.createdBy || '?'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 min-w-0 sm:col-span-2">
                       <div className="flex items-center gap-1.5 shrink-0">
                         <Calendar className="w-3.5 h-3.5 text-slate-400" />
                         <span className="text-slate-400">Ημ/νία Συμβάντος:</span>
                       </div>
                       <span className="text-slate-800 font-bold">{formatDate(incident.incidentDate || incident.incidentDateFrom)}</span>
                    </div>
                  </div>
                  
                  {incident.notes && (
                    <div className="text-[11px] text-slate-500 italic mt-1 border-l-2 border-slate-200 pl-2">
                      "{incident.notes.length > 150 ? incident.notes.substring(0, 150) + '...' : incident.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
