import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { motion } from 'motion/react';
import { Users as UsersIcon, X, Check, XCircle } from 'lucide-react';
import { toUpperCaseAccentFree } from '../lib/Typography';
import { UserProfile } from '../types';

interface UsersModalProps {
  onClose: () => void;
}

export default function UsersModal({ onClose }: UsersModalProps) {
  const [users, setUsers] = useState<(UserProfile & { email?: string, lastActiveAt?: any })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let usersData: any[] = [];
      snapshot.forEach(doc => {
        usersData.push({ ...doc.data(), uid: doc.id });
      });
      
      // Sort users by name
      usersData.sort((a, b) => {
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
      });
      
      setUsers(usersData);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const toggleApproval = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        isApproved: !currentStatus
      });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAdmin = async (uid: string, currentIsAdmin: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        isAdmin: !currentIsAdmin
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="bg-[#1A237E] p-4 sm:p-5 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-200" />
            <h2 className="text-base sm:text-lg font-bold uppercase tracking-widest">{toUpperCaseAccentFree('Χρήστες & Πρόσβαση')}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-95">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 sm:p-5 overflow-y-auto bg-slate-50 flex-1 custom-scrollbar">
          {loading ? (
            <div className="p-4 text-center text-slate-500 font-medium">Φόρτωση...</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {users.map(u => {
                const isSelf = u.uid === auth.currentUser?.uid;
                const userEmail = u.email || (isSelf ? auth.currentUser?.email : '');
                const targetIsAdmin = userEmail?.toLowerCase() === 'panagiotidispaul@gmail.com' || u.isAdmin === true;
                const targetIsSuperAdmin = userEmail?.toLowerCase() === 'panagiotidispaul@gmail.com';
                const currentUserIsSuperAdmin = auth.currentUser?.email?.toLowerCase() === 'panagiotidispaul@gmail.com';
                const approved = u.isApproved === true || targetIsAdmin;
                const canToggleAdmin = !isSelf && !targetIsSuperAdmin && approved && (currentUserIsSuperAdmin || !u.isAdmin);

                return (
                  <div key={u.uid} className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col gap-3 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-center gap-2">
                       <div className="flex flex-wrap items-center gap-2 min-w-0">
                         <h4 className="font-bold text-slate-800 text-[13px] leading-snug truncate">
                           {u.rank} {toUpperCaseAccentFree(u.lastName)} {toUpperCaseAccentFree(u.firstName)}
                         </h4>
                         {isSelf && (
                           <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border border-blue-100 shrink-0">
                             EΓΩ
                           </span>
                         )}
                         {targetIsAdmin && (
                           <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border border-amber-200 shrink-0">
                             ADMIN
                           </span>
                         )}
                       </div>
                       
                       <div className="flex flex-col gap-1 shrink-0">
                         {!isSelf && (
                           <button 
                             onClick={() => toggleApproval(u.uid, approved)}
                             className={`px-2 py-1 rounded w-auto flex items-center justify-center min-w-[70px] text-[9px] font-bold transition-all border shadow-sm ${
                               approved 
                                 ? "bg-transparent border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600" 
                                 : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                             }`}
                             title={approved ? "Αφαίρεση πρόσβασης" : "Έγκριση πρόσβασης"}
                             disabled={targetIsAdmin && !currentUserIsSuperAdmin}
                           >
                             {approved ? "ΑΦΑΙΡΕΣΗ" : "ΕΓΚΡΙΣΗ"}
                           </button>
                         )}
                         {canToggleAdmin && (
                           <button 
                             onClick={() => toggleAdmin(u.uid, u.isAdmin || false)}
                             className={`px-2 py-1 rounded w-auto flex items-center justify-center min-w-[70px] text-[9px] font-bold transition-all border shadow-sm ${
                               u.isAdmin 
                                 ? "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200" 
                                 : "bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200"
                             }`}
                             title={u.isAdmin ? "Αφαίρεση admin" : "Κάνε admin"}
                           >
                             {u.isAdmin ? "- ADMIN" : "+ ADMIN"}
                           </button>
                         )}
                       </div>
                    </div>
                
                    {!approved && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase flex items-center gap-1 border border-orange-100">
                          <XCircle className="w-3 h-3" /> Εκκρεμεί έγκριση
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
