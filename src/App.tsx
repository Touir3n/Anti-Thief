/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';
import { List, Map as MapIcon, Plus, LogOut, Search, Filter, Settings, Users, QrCode, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'react-hot-toast';
import IncidentList from './components/IncidentList';
import IncidentForm from './components/IncidentForm';
import IncidentMap from './components/IncidentMap';
import OfficerProfileForm from './components/OfficerProfileForm';
import UsersModal from './components/UsersModal';
import DeletedIncidentsModal from './components/DeletedIncidentsModal';
import ShareModal from './components/ShareModal';
import AppLogo from './components/AppLogo';
import { toUpperCaseAccentFree } from './lib/Typography';
import { UserProfile, Incident } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  
  const isSysAdmin = user?.email?.toLowerCase() === 'panagiotidispaul@gmail.com' || userProfile?.isAdmin === true;
  const hasAccess = userProfile && (userProfile.isApproved === true || isSysAdmin);
  
  // Global incidents state to prevent quota exhaustion from tab switching
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  
  const [view, setView] = useState<'list' | 'map' | 'form'>('list');
  const [editingIncident, setEditingIncident] = useState<any>(null);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const isSuperAdmin = user?.email?.toLowerCase() === 'panagiotidispaul@gmail.com';

  const handleOpenIncident = async (id: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'incidents', id));
      if (docSnap.exists()) {
        setEditingIncident({ id: docSnap.id, ...docSnap.data() });
        setView('form');
      } else {
        toast.error('Το συμβάν δεν βρέθηκε');
      }
    } catch (error: any) {
      console.error("Σφάλμα κατά την ανάκτηση συμβάντος:", error);
      toast.error(`Σφάλμα κατά την ανάκτηση: ${error?.message || 'Άγνωστο σφάλμα'}`);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [view, editingIncident]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setProfileLoading(true);
        try {
          const profileDoc = await getDoc(doc(db, 'users', u.uid));
          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
        } catch (err: any) {
          console.error("Σφάλμα κατά τη φόρτωση προφίλ:", err);
          toast.error(`Αποτυχία φόρτωσης προφίλ: ${err?.message || 'Άγνωστο σφάλμα'}`);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Centralized incidents listener
  useEffect(() => {
    if (!hasAccess) return;
    
    const q = query(
      collection(db, 'incidents'),
      orderBy('recordedAt', 'desc'),
      limit(150)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
      setIncidents(data);
      setIncidentsLoading(false);
    }, (error) => {
      console.error("Σφάλμα συγχρονισμού λίστας συμβάντων:", error);
      toast.error("Σφάλμα σύνδεσης. Ενδέχεται να εμφανίζονται παλιά δεδομένα.");
      setIncidentsLoading(false);
    });

    return unsubscribe;
  }, [userProfile]);



  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Σφάλμα σύνδεσης:", error);
      toast.error(`Αποτυχία σύνδεσης: ${error?.message || 'Άγνωστο σφάλμα'}`);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F1F3F5]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#1A237E] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#1A237E] text-white p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white p-10 rounded-[32px] shadow-2xl text-center text-slate-800 flex flex-col items-center"
        >
          <AppLogo className="w-48 h-48 mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl" />
          <h1 className="text-4xl font-black mb-10 tracking-tight uppercase leading-none">
            ANTI-THIEF
          </h1>
          <button 
            onClick={handleLogin}
            className="w-full bg-[#1A237E] hover:bg-[#1A237E]/90 text-white font-bold py-5 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-[#1A237E]/20"
          >
            Σύνδεση με Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-[#F1F3F5] text-slate-800 flex flex-col font-sans overflow-x-hidden">
      <Toaster position="top-center" />
      {/* Header */}
      <header className="bg-[#1A237E] text-white p-4 sm:p-6 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center flex-1 min-w-0 pr-2 gap-3 sm:gap-4">
            <AppLogo className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 bg-transparent rounded-lg" />
            <div className="flex flex-col min-w-0 justify-center">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight leading-none shrink-0 truncate">
                ANTI-THIEF
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 shrink-0 pl-0 sm:pl-2">
            <div className="hidden xl:flex flex-col items-end mr-2">
              <span className="text-sm font-bold tracking-tight truncate max-w-[200px]">
                {userProfile ? `${userProfile.rank} ${userProfile.lastName} ${userProfile.firstName}` : user.displayName || user.email}
              </span>
              <span className="text-[10px] text-white/40 uppercase font-black">{toUpperCaseAccentFree('ΧΡΗΣΤΗΣ ΣΥΣΤΗΜΑΤΟΣ')}</span>
            </div>
            {isSysAdmin && (
              <>
                <button 
                  onClick={() => setShowUsersModal(true)}
                  className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/10"
                  title="Χρήστες & Πρόσβαση"
                >
                  <Users className="w-5 h-5" />
                </button>
              </>
            )}
            {isSuperAdmin && (
              <>
                <button 
                  onClick={() => setShowDeletedModal(true)}
                  className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/10"
                  title="Ιστορικό Διαγραφών"
                >
                  <Archive className="w-5 h-5" />
                </button>
              </>
            )}
            <button 
              onClick={() => setShowShareModal(true)}
              className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/10"
              title="Κοινοποίηση (QR Code)"
            >
              <QrCode className="w-5 h-5" />
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/10"
              title="Αποσύνδεση"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 max-w-7xl w-full mx-auto p-4 sm:p-12 flex flex-col ${view === 'form' ? 'pb-8 sm:pb-12' : 'pb-28 landscape:pb-32 sm:pb-32'}`}>
        <AnimatePresence mode="wait">
          {!userProfile && user && (
            <OfficerProfileForm onComplete={setUserProfile} />
          )}
          {userProfile && !hasAccess && (
            <div className="flex-1 flex items-center justify-center">
               <div className="bg-amber-50 border border-amber-200 text-amber-800 p-8 rounded-3xl max-w-md text-center shadow-sm">
                 <AppLogo className="w-16 h-16 mx-auto mb-4" variant="default" />
                 <h2 className="text-xl font-bold mb-2">Ο λογαριασμός σας τελεί σε αναμονή έγκρισης</h2>
                 <p className="text-sm">Παρακαλούμε επικοινωνήστε με τον διαχειριστή του συστήματος για να σας δοθεί δικαίωμα εξουσιοδοτημένης πρόσβασης στα δεδομένα.</p>
               </div>
            </div>
          )}
          {showUsersModal && (
            <UsersModal onClose={() => setShowUsersModal(false)} />
          )}
          {showDeletedModal && (
            <DeletedIncidentsModal onClose={() => setShowDeletedModal(false)} />
          )}
          {showShareModal && (
            <ShareModal onClose={() => setShowShareModal(false)} />
          )}
          {hasAccess && view === 'list' && (
            <motion.div 
              key="list"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="h-full flex-1"
            >
              <IncidentList 
                incidents={incidents}
                loading={incidentsLoading}
                onEdit={(incident) => {
                  setEditingIncident(incident);
                  setView('form');
                }} 
              />
            </motion.div>
          )}
          {hasAccess && view === 'map' && (
            <motion.div 
              key="map"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-[75vh] landscape:h-[80vh] sm:h-[calc(100vh-280px)] flex flex-col w-full bg-white rounded-[32px] sm:rounded-[48px] overflow-hidden shadow-xl border border-slate-200 relative z-10"
            >
              <IncidentMap 
                incidents={incidents}
                onEdit={(incident) => {
                  setEditingIncident(incident);
                  window.sessionStorage.setItem('prevView', 'map');
                  setView('form');
                }} 
              />
            </motion.div>
          )}
          {hasAccess && view === 'form' && (
            <motion.div 
              key="form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="max-w-4xl w-full mx-auto"
            >
              <IncidentForm 
                key={editingIncident ? editingIncident.id : 'new'}
                incident={editingIncident} 
                userProfile={userProfile}
                allIncidents={incidents}
                onClose={() => {
                  const prev = window.sessionStorage.getItem('prevView');
                  if (prev === 'map') {
                    setView('map');
                    window.sessionStorage.removeItem('prevView');
                  } else {
                    setView('list');
                  }
                  setEditingIncident(null);
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }} 
                onOpenIncident={handleOpenIncident}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      {view !== 'form' && hasAccess && !showUsersModal && !showShareModal && (
        <nav className="fixed bottom-6 landscape:bottom-2 sm:bottom-8 left-1/2 -translate-x-1/2 bg-white/95 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/60 px-6 sm:px-10 py-3 landscape:py-1.5 sm:py-5 flex items-center gap-6 sm:gap-12 z-[5000] max-w-[90vw] sm:max-w-none backdrop-blur-md">
          <button 
            onClick={() => { setView('list'); setEditingIncident(null); }}
            className={`flex flex-col items-center gap-1 sm:gap-1.5 transition-all ${view === 'list' ? 'text-[#1A237E] scale-110' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <List className="w-5 h-5 sm:w-7 sm:h-7" />
            <span className="text-[9px] uppercase font-black tracking-[0.2em] hidden sm:block">{toUpperCaseAccentFree('ΛΙΣΤΑ')}</span>
          </button>
          
          <button 
            onClick={() => { setView('form'); setEditingIncident(null); }}
            className="bg-[#1A237E] hover:bg-[#1A237E]/90 text-white p-3 sm:p-5 rounded-xl xl:rounded-3xl shadow-xl shadow-[#1A237E]/30 active:scale-95 transition-all outline-none landscape:-mt-6 sm:-mt-10"
          >
            <Plus className="w-5 h-5 sm:w-8 sm:h-8" />
          </button>

          <button 
            onClick={() => { setView('map'); setEditingIncident(null); }}
            className={`flex flex-col items-center gap-1 sm:gap-1.5 transition-all ${view === 'map' ? 'text-[#1A237E] scale-110' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <MapIcon className="w-5 h-5 sm:w-7 sm:h-7" />
            <span className="text-[9px] uppercase font-black tracking-[0.2em] hidden sm:block">{toUpperCaseAccentFree('ΧΑΡΤΗΣ')}</span>
          </button>
        </nav>
      )}
    </div>
  );
}
