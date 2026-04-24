import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { db, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Bell, BellOff, X } from 'lucide-react';
import { toUpperCaseAccentFree } from '../lib/Typography';
import { toast } from 'react-hot-toast';

interface SettingsModalProps {
  userProfile: UserProfile;
  onClose: () => void;
  onUpdate: (profile: UserProfile) => void;
}

export default function SettingsModal({ userProfile, onClose, onUpdate }: SettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const prefs = userProfile.notificationPrefs;
  
  const [enabled, setEnabled] = useState(prefs?.enabled ?? false);
  const [quietEnabled, setQuietEnabled] = useState(prefs?.quietHours?.enabled ?? false);
  const [quietStart, setQuietStart] = useState(prefs?.quietHours?.start ?? '22:00');
  const [quietEnd, setQuietEnd] = useState(prefs?.quietHours?.end ?? '06:00');

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const newPrefs: UserProfile['notificationPrefs'] = { 
        enabled,
        quietHours: {
          enabled: quietEnabled,
          start: quietStart,
          end: quietEnd
        }
      };
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        notificationPrefs: newPrefs
      });
      onUpdate({ ...userProfile, notificationPrefs: newPrefs });
      toast.success(toUpperCaseAccentFree('ΟΙ ΡΥΘΜΙΣΕΙΣ ΑΠΟΘΗΚΕΥΤΗΚΑΝ'));
      onClose();
    } catch (err: any) {
      console.error("Σφάλμα κατά την αποθήκευση ρυθμίσεων:", err);
      toast.error(`Η αποθήκευση απέτυχε: ${err?.message || 'Άγνωστο σφάλμα'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#1A237E]/95 backdrop-blur-xl z-[9999] p-4 flex items-center justify-center overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-[32px] p-8 md:p-12 shadow-2xl relative overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#1A237E]/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Bell className="w-8 h-8 text-[#1A237E]" />
          </div>
          <h2 className="text-2xl font-black text-[#1A237E] uppercase tracking-tight mb-2">
            {toUpperCaseAccentFree('ΡΥΘΜΙΣΕΙΣ ΕΙΔΟΠΟΙΗΣΕΩΝ')}
          </h2>
          <p className="text-slate-500 font-medium">Διαμορφώστε τις προτιμήσεις λήψης ειδοποιήσεων για νέα συμβάντα.</p>
        </div>

        <div className="space-y-6">
          <label className="flex items-center justify-between p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="flex-1 pr-4">
              <div className="font-bold text-slate-800 uppercase tracking-widest text-sm">{toUpperCaseAccentFree('Ενεργοποιηση')}</div>
              <div className="text-xs text-slate-500 mt-1">Λαμβάνετε ειδοποιήσεις για όλα τα νέα συμβάντα (εντός της εφαρμογής)</div>
            </div>
            <div className="relative flex-shrink-0 flex items-center">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <div className={`block w-14 h-8 rounded-full transition-colors ${enabled ? 'bg-[#1A237E]' : 'bg-slate-300'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${enabled ? 'transform translate-x-6' : ''}`}></div>
            </div>
          </label>

          <AnimatePresence>
            {enabled && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="p-5 rounded-2xl border-2 border-slate-100 bg-white">
                  <label className="flex items-center justify-between cursor-pointer mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${quietEnabled ? 'bg-[#1A237E]/10 text-[#1A237E]' : 'bg-slate-100 text-slate-400'}`}>
                        <BellOff className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 uppercase tracking-widest text-xs">{toUpperCaseAccentFree('ΩΡΕΣ ΚΟΙΝΗΣ ΗΣΥΧΙΑΣ')}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">ΜΗΝ ΕΝΟΧΛΕΙΤΕ ΣΕ ΑΥΤΟ ΤΟ ΔΙΑΣΤΗΜΑ</div>
                      </div>
                    </div>
                    <div className="relative flex-shrink-0 flex items-center">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={quietEnabled}
                        onChange={(e) => setQuietEnabled(e.target.checked)}
                      />
                      <div className={`block w-11 h-6 rounded-full transition-colors ${quietEnabled ? 'bg-[#1A237E]' : 'bg-slate-300'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${quietEnabled ? 'transform translate-x-5' : ''}`}></div>
                    </div>
                  </label>

                  <AnimatePresence>
                    {quietEnabled && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100"
                      >
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 ml-1">ΑΠΟ</label>
                          <input 
                            type="time" 
                            value={quietStart}
                            onChange={(e) => setQuietStart(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A237E] transition-all text-slate-900 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 ml-1">ΕΩΣ</label>
                          <input 
                            type="time" 
                            value={quietEnd}
                            onChange={(e) => setQuietEnd(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1A237E] transition-all text-slate-900 font-bold"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-[#1A237E] text-[#D4AF37] disabled:opacity-50 py-5 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-[#1A237E]/90 transition-all active:scale-[0.98] mt-4"
          >
            {loading ? toUpperCaseAccentFree('Αποθηκευση...') : toUpperCaseAccentFree('ΑΠΟΘΗΚΕΥΣΗ ΡΥΘΜΙΣΕΩΝ')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
