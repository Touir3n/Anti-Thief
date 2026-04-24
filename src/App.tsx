/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';
import { Shield, List, Map as MapIcon, Plus, LogOut, Search, Filter, Bell, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'react-hot-toast';
import IncidentList from './components/IncidentList';
import IncidentForm from './components/IncidentForm';
import IncidentMap from './components/IncidentMap';
import OfficerProfileForm from './components/OfficerProfileForm';
import SettingsModal from './components/SettingsModal';
import { toUpperCaseAccentFree } from './lib/Typography';
import { UserProfile, Incident } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [view, setView] = useState<'list' | 'map' | 'form'>('list');
  const [editingIncident, setEditingIncident] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleOpenIncident = async (id: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'incidents', id));
      if (docSnap.exists()) {
        setEditingIncident({ id: docSnap.id, ...docSnap.data() });
        setView('form');
      } else {
        toast.error('Το συμβάν δεν βρέθηκε');
      }
    } catch (error) {
      toast.error('Σφάλμα κατά την ανάκτηση');
    }
  };

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
        } catch (err) {
          console.error("Failed to load profile", err);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!userProfile || !userProfile.notificationPrefs?.enabled) return;

    const prefs = userProfile.notificationPrefs;

    const now = Timestamp.now();
    const q = query(
      collection(db, 'incidents'),
      where('recordedAt', '>=', now)
    );

    const checkQuietHours = (): boolean => {
      if (!prefs.quietHours?.enabled) return false;
      const { start, end } = prefs.quietHours;
      if (!start || !end) return false;
      
      const currentTime = new Date();
      const currentHours = currentTime.getHours();
      const currentMinutes = currentTime.getMinutes();
      
      const [startHours, startMinutes] = start.split(':').map(Number);
      const [endHours, endMinutes] = end.split(':').map(Number);
      
      const timeInMinutes = currentHours * 60 + currentMinutes;
      const startInMinutes = startHours * 60 + startMinutes;
      const endInMinutes = endHours * 60 + endMinutes;
      
      if (startInMinutes < endInMinutes) {
        // e.g. 08:00 to 18:00
        return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
      } else {
        // e.g. 22:00 to 06:00 (crosses midnight)
        return timeInMinutes >= startInMinutes || timeInMinutes <= endInMinutes;
      }
    };

    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data() as Incident;
          if (data.createdBy === userProfile.uid) return;

          // Don't notify if we are in quiet hours
          if (checkQuietHours()) return;

          toast(
            (t) => (
              <div className="flex flex-col">
                <div className="font-bold uppercase tracking-widest text-[#1A237E] flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  ΝΕΟ ΣΥΜΒΑΝ
                </div>
                <div className="text-sm mt-1">{data.area} - {data.theftType}</div>
              </div>
            ),
            { duration: 6000, position: 'top-right' }
          );
        }
      });
    });

    return () => unsub();
  }, [userProfile]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
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
          className="w-full max-w-md bg-white p-10 rounded-[32px] shadow-2xl text-center text-slate-800"
        >
          <div className="bg-[#1A237E]/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Shield className="text-[#1A237E] w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight uppercase leading-none">
            ANTI<br />THIEF
          </h1>
          <p className="text-slate-400 mb-10 text-sm font-medium tracking-wide uppercase">
            {toUpperCaseAccentFree('ΣΥΣΤΗΜΑ ΔΙΑΧΕΙΡΙΣΗΣ v2.4')}
          </p>
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
      <header className="bg-[#1A237E] text-white p-4 sm:p-8 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="bg-white/20 p-2 sm:p-3 rounded-xl shrink-0">
              <Shield className="text-white w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="flex flex-col min-w-0 justify-center">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-none truncate mt-1">ANTI-THIEF</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4 shrink-0 pl-2">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-sm font-bold tracking-tight">
                {userProfile ? `${userProfile.rank} ${userProfile.lastName} ${userProfile.firstName}` : user.displayName || user.email}
              </span>
              <span className="text-[10px] text-white/40 uppercase font-black">{toUpperCaseAccentFree('ΧΡΗΣΤΗΣ ΣΥΣΤΗΜΑΤΟΣ')}</span>
            </div>
            {userProfile && (
              <button 
                onClick={() => setShowSettings(true)}
                className="relative p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/10"
                title="Ρυθμίσεις Ειδοποιήσεων"
              >
                <Bell className="w-5 h-5" />
                {userProfile.notificationPrefs?.enabled && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#D4AF37] rounded-full animate-pulse border-2 border-[#1A237E]" />
                )}
              </button>
            )}
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-12 pb-32">
        <AnimatePresence mode="wait">
          {!userProfile && user && (
            <OfficerProfileForm onComplete={setUserProfile} />
          )}
          {showSettings && userProfile && (
            <SettingsModal 
              userProfile={userProfile} 
              onClose={() => setShowSettings(false)}
              onUpdate={setUserProfile} 
            />
          )}
          {view === 'list' && (
            <motion.div 
              key="list"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="h-full"
            >
              <IncidentList 
                onEdit={(incident) => {
                  setEditingIncident(incident);
                  setView('form');
                }} 
              />
            </motion.div>
          )}
          {view === 'map' && (
            <motion.div 
              key="map"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-[60vh] sm:h-[calc(100vh-280px)] bg-white rounded-[32px] sm:rounded-[48px] overflow-hidden shadow-xl border border-slate-200"
            >
              <IncidentMap 
                onEdit={(incident) => {
                  setEditingIncident(incident);
                  setView('form');
                }} 
              />
            </motion.div>
          )}
          {view === 'form' && (
            <motion.div 
              key="form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="max-w-4xl mx-auto"
            >
              <IncidentForm 
                key={editingIncident ? editingIncident.id : 'new'}
                incident={editingIncident} 
                userProfile={userProfile}
                onClose={() => {
                  setView('list');
                  setEditingIncident(null);
                }} 
                onOpenIncident={handleOpenIncident}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-2xl border border-slate-200 px-6 sm:px-10 py-5 flex items-center gap-6 sm:gap-12 z-50 max-w-[95vw] sm:max-w-none">
        <button 
          onClick={() => { setView('list'); setEditingIncident(null); }}
          className={`flex flex-col items-center gap-1.5 transition-all ${view === 'list' ? 'text-[#1A237E] scale-110' : 'text-slate-300 hover:text-slate-500'}`}
        >
          <List className="w-6 h-6 sm:w-7 sm:h-7" />
          <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-[0.1em] sm:tracking-[0.2em]">{toUpperCaseAccentFree('ΛΙΣΤΑ')}</span>
        </button>
        
        <button 
          onClick={() => { setView('form'); setEditingIncident(null); }}
          className="bg-[#1A237E] hover:bg-[#1A237E]/90 text-white p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] shadow-xl shadow-[#1A237E]/30 active:scale-90 transition-all -mt-10 border-4 border-white"
        >
          <Plus className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>

        <button 
          onClick={() => { setView('map'); setEditingIncident(null); }}
          className={`flex flex-col items-center gap-1.5 transition-all ${view === 'map' ? 'text-[#1A237E] scale-110' : 'text-slate-300 hover:text-slate-500'}`}
        >
          <MapIcon className="w-6 h-6 sm:w-7 sm:h-7" />
          <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-[0.1em] sm:tracking-[0.2em]">{toUpperCaseAccentFree('ΧΑΡΤΗΣ')}</span>
        </button>
      </nav>
    </div>
  );
}
