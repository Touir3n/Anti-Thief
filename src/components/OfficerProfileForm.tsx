import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Rank, UserProfile } from '../types';
import { db, auth } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ShieldCheck, User } from 'lucide-react';
import { toUpperCaseAccentFree } from '../lib/Typography';
import { toast } from 'react-hot-toast';

interface OfficerProfileFormProps {
  onComplete: (profile: UserProfile) => void;
}

const RANKS: Rank[] = ['Αστυνόμος Β΄', 'Υπαστυνόμος Α΄', 'Υπαστυνόμος Β΄', 'Ανθυπαστυνόμος', 'Αρχιφύλακας', 'Αστυφύλακας'];

export default function OfficerProfileForm({ onComplete }: OfficerProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    rank: '' as Rank | '',
    lastName: '',
    firstName: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (!formData.rank || !formData.lastName || !formData.firstName) return;

    setLoading(true);
    try {
      const profile: UserProfile = {
        uid: auth.currentUser.uid,
        rank: formData.rank,
        lastName: formData.lastName.toUpperCase(),
        firstName: formData.firstName.toUpperCase()
      };

      await setDoc(doc(db, 'users', auth.currentUser.uid), profile);
      onComplete(profile);
    } catch (err: any) {
      console.error("Σφάλμα κατά την αποθήκευση του προφίλ:", err);
      toast.error(`Αποτυχία ενημέρωσης: ${err?.message || 'Άγνωστο σφάλμα'}`);
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
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#D4AF37] to-[#1A237E]" />
        
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#1A237E]/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-[#1A237E]" />
          </div>
          <h2 className="text-2xl font-black text-[#1A237E] uppercase tracking-tight mb-2">
            {toUpperCaseAccentFree('ΤΑΥΤΟΤΗΤΑ ΑΣΤΥΝΟΜΙΚΟΥ')}
          </h2>
          <p className="text-slate-500 font-medium">Παρακαλώ συμπληρώστε τα στοιχεία σας για την καταγραφή των συμβάντων.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-black ml-1">
              {toUpperCaseAccentFree('ΒΑΘΜΟΣ')}
            </label>
            <select 
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 outline-none focus:ring-4 focus:ring-[#1A237E]/5 focus:border-[#1A237E] transition-all text-slate-900 font-bold appearance-none text-center sm:text-left"
              value={formData.rank}
              onChange={(e) => setFormData(prev => ({ ...prev, rank: e.target.value as Rank }))}
            >
              <option value="" disabled>ΕΠΙΛΕΞΤΕ ΒΑΘΜΟ...</option>
              {RANKS.map(rank => (
                <option key={rank} value={rank}>{toUpperCaseAccentFree(rank)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-black ml-1">
              {toUpperCaseAccentFree('ΕΠΩΝΥΜΟ')}
            </label>
            <input 
              required
              type="text"
              placeholder="π.χ. ΠΑΠΑΔΟΠΟΥΛΟΣ"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 outline-none focus:ring-4 focus:ring-[#1A237E]/5 focus:border-[#1A237E] transition-all text-slate-900 font-bold uppercase tracking-widest text-center sm:text-left"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-black ml-1">
              {toUpperCaseAccentFree('ΟΝΟΜΑ')}
            </label>
            <input 
              required
              type="text"
              placeholder="π.χ. ΓΕΩΡΓΙΟΣ"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 outline-none focus:ring-4 focus:ring-[#1A237E]/5 focus:border-[#1A237E] transition-all text-slate-900 font-bold uppercase tracking-widest text-center sm:text-left"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#1A237E] text-[#D4AF37] disabled:opacity-50 py-5 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-[#1A237E]/90 transition-all active:scale-[0.98] mt-8 flex items-center justify-center gap-2"
          >
            <User className="w-5 h-5" />
            {loading ? toUpperCaseAccentFree('Αποθηκευση...') : toUpperCaseAccentFree('ΟΛΟΚΛΗΡΩΣΗ ΕΓΓΡΑΦΗΣ')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
