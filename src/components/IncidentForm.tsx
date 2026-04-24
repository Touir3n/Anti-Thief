import React, { useState, useRef, useEffect } from 'react';
import { db, auth, storage, handleFirestoreError } from '../firebase';
import { doc, setDoc, updateDoc, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Incident, Area, Status, TheftType, StolenItem, SuspectStatus, ModusOperandi, UserProfile } from '../types';
import { X, Check, MapPin, Camera, AlertTriangle, ShieldCheck, User as UserIcon, Phone, Clock, FileText, Loader2, Lock, Unlock, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { toUpperCaseAccentFree } from '../lib/Typography';
import imageCompression from 'browser-image-compression';

interface IncidentFormProps {
  incident?: Incident | null;
  userProfile?: UserProfile | null;
  onClose: () => void;
  onOpenIncident?: (id: string) => void | Promise<void>;
  key?: string | number | null;
}

import LinkedIncidentSearchModal from './LinkedIncidentSearchModal';
import IncidentReadOnlyView from './IncidentReadOnlyView';

const AREAS: Area[] = [
  'Ασπροβάλτα', 'Σταυρός', 'Νέα Βρασνά', 'Νέα Μάδυτος',
  'Ανοιξιά', 'Απολλωνία', 'Αρέθουσα', 'Βαμβακιά', 'Βρασνά', 
  'Κοκκαλού', 'Λίμνη', 'Μαυρούδα', 'Μεγάλη Βόλβη', 'Μικρή Βόλβη', 
  'Μόδι', 'Παραλία Βρασνών', 'Ρεντίνα', 'Σκεπαστό'
];
const STATUSES: Status[] = ['Τετελεσμένη', 'Απόπειρα'];
const THEFT_TYPES: TheftType[] = ['Οικία (Κύρια)', 'Οικία (Εξοχική)', 'Επιχείρηση', 'Από όχημα', 'Κλοπή Αυτοκινήτου'];
const STOLEN_ITEMS: StolenItem[] = ['Ηλεκτρονικά', 'Κοσμήματα', 'Μετρητά', 'Εργαλεία', 'Άλλο'];
const MO_TYPES: ModusOperandi[] = ['Ανασφάλιστο', 'Θραύση υαλοπίνακα', 'Παραβίαση κλειδαριάς', 'Διάρρηξη παραθύρου/μπαλκονόπορτας', 'Χωρίς ίχνη', 'Άλλο'];
const TOOL_TYPES = ['Λοστός', 'Κατσαβίδι', 'Τρυπάνι', 'Τροχός', 'Αντικλείδι', 'Άλλο'];

export default function IncidentForm({ incident, userProfile, onClose, onOpenIncident }: IncidentFormProps) {
  const [loading, setLoading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<{ [key: string]: File | null }>({});
  const [photoPreviews, setPhotoPreviews] = useState<{ [key: string]: string }>({
    photo1: incident?.photo1 || '',
    photo2: incident?.photo2 || '',
  });
  const [imageCompressing, setImageCompressing] = useState<{ [key: string]: boolean }>({});
  const [showLinkedModal, setShowLinkedModal] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(!!incident);
  const [deleteStep, setDeleteStep] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteUnlocked, setIsDeleteUnlocked] = useState(false);

  const handleDelete = async () => {
    if (!incident) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'incidents', incident.id));
      toast.success(toUpperCaseAccentFree('ΤΟ ΣΥΜΒΑΝ ΔΙΑΓΡΑΦΗΚΕ ΕΠΙΤΥΧΩΣ'));
      onClose();
    } catch (error: any) {
      console.error('Σφάλμα διαγραφής:', error);
      toast.error('Η διαγραφή απέτυχε. Ελέγξτε τα δικαιώματά σας.');
      handleFirestoreError(error, 'delete', 'incidents');
    } finally {
      setIsDeleting(false);
    }
  };

  const clearPhoto = (key: string) => {
    setPhotoFiles(prev => ({ ...prev, [key]: null }));
    setPhotoPreviews(prev => ({ ...prev, [key]: '' }));
    handleChange(key as any, ''); // Clear from formData so it's removed in DB if updated
  };

  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const addressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAddressChange = (value: string) => {
    handleChange('address', value);
    
    if (addressTimeoutRef.current) clearTimeout(addressTimeoutRef.current);
    
    if (!value || value.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearchingAddress(true);
    addressTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&addressdetails=1&limit=5&countrycodes=gr`);
        const data = await response.json();
        setAddressSuggestions(data);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Geocoding failed", error);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 500);
  };

  const selectAddress = (suggestion: any) => {
    // Get the road/street address specifically, or use display_name
    const addressName = suggestion.address?.road || suggestion.name || suggestion.display_name.split(',')[0];
    handleChange('address', addressName);
    handleChange('location', {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    });
    
    setShowSuggestions(false);
  };

  const [isManualDate, setIsManualDate] = useState(!!incident);

  useEffect(() => {
    if (!isManualDate && !incident) {
      const interval = setInterval(() => {
        setFormData(prev => ({ ...prev, incidentDate: new Date().toISOString().slice(0, 16) }));
      }, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [isManualDate, incident]);

  const [formData, setFormData] = useState<Partial<Incident>>(incident || {
    area: 'Ασπροβάλτα',
    status: 'Τετελεσμένη',
    theftType: 'Οικία (Κύρια)',
    address: '',
    incidentDate: new Date().toISOString().slice(0, 16),
    stolenItems: [],
    usedTools: false,
    hasAlarm: false,
    hasCameras: false,
    forensicsCalled: false,
    suspectDetails: 'Άγνωστοι',
    location: { lat: 40.6644, lng: 23.6967 } // Default Volvi Area (Stavros)
  });

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`);
      if (!response.ok) return;
      const data = await response.json();
      if (data && data.address) {
        const addrContext = data.address.village || data.address.town || data.address.city || data.address.municipality || '';
        const predefinedArea = AREAS.find(a => 
          addrContext.toLowerCase().includes(a.toLowerCase()) || 
          a.toLowerCase().includes(addrContext.toLowerCase())
        );

        let addressStr = '';
        if (data.address.road) {
            addressStr += data.address.road;
            if (data.address.house_number) {
                addressStr += ' ' + data.address.house_number;
            }
        } else if (data.name) {
            addressStr = data.name;
        } else if (data.display_name) {
            addressStr = data.display_name.split(',')[0];
        }

        setFormData(prev => ({
          ...prev,
          ...(predefinedArea ? { area: predefinedArea } : {}),
          ...(addressStr ? { address: addressStr } : {})
        }));
      }
    } catch (error) {
      console.error("Reverse geocoding failed", error);
    }
  };

  const handleChange = (field: keyof Incident, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleStolen = (item: StolenItem) => {
    const current = formData.stolenItems || [];
    if (current.includes(item)) {
      handleChange('stolenItems', current.filter(i => i !== item));
    } else {
      handleChange('stolenItems', [...current, item]);
    }
  };

  const handleToggleToolType = (tool: string) => {
    const current = formData.usedToolTypes || [];
    if (current.includes(tool)) {
      handleChange('usedToolTypes', current.filter(i => i !== tool));
    } else {
      handleChange('usedToolTypes', [...current, tool]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (file && key) {
      setImageCompressing(prev => ({ ...prev, [key]: true }));
      setPhotoPreviews(prev => ({ ...prev, [key]: URL.createObjectURL(file) })); // Display preview instantly
      
      try {
        const options = {
          maxSizeMB: 0.1,
          maxWidthOrHeight: 800,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        setPhotoFiles(prev => ({ ...prev, [key]: compressedFile }));
      } catch (error: any) {
        console.error("Compression failed:", error);
        toast.error("Σφάλμα κατά τη συμπίεση της φωτογραφίας.");
        setPhotoFiles(prev => ({ ...prev, [key]: file })); // Fallback to original
      } finally {
        setImageCompressing(prev => ({ ...prev, [key]: false }));
      }
    }
  };

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        handleChange('location', { lat, lng });
        toast.success("Η τοποθεσία ενημερώθηκε επιτυχώς");
        await reverseGeocode(lat, lng);
      }, (error) => {
        console.error("Σφάλμα GPS:", error);
        toast.error("Σφάλμα GPS: " + error.message);
      });
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    if (!formData.area || !formData.address || !formData.theftType) {
      toast.error('Παρακαλώ συμπληρώστε τα υποχρεωτικά πεδία (Περιοχή, Διεύθυνση, Είδος)');
      return;
    }

    setLoading(true);
    try {
      const id = incident?.id || `INC-${Date.now()}`;
      const incidentData: any = {
        ...formData,
        id,
        createdBy: incident ? incident.createdBy : auth.currentUser.uid,
        creatorName: incident ? incident.creatorName : (userProfile ? `${userProfile.lastName} ${userProfile.firstName}`.trim() : userProfile?.lastName || auth.currentUser.displayName || ''),
        creatorRank: incident ? incident.creatorRank : (userProfile ? userProfile.rank : ''),
        recordedAt: incident && incident.recordedAt ? incident.recordedAt : serverTimestamp(),
      };

      // Convert photos to base64 and store directly in Firestore
      // Since we heavily compress them, they will fit inside the 1MB document limit.
      for (const key of ['photo1', 'photo2']) {
        const file = photoFiles[key];
        if (file) {
          try {
            const base64String = await fileToBase64(file);
            incidentData[key] = base64String;
          } catch (uploadError: any) {
            console.error(`Σφάλμα κατά την επεξεργασία της φωτογραφίας ${key}:`, uploadError);
            toast.error(`Αποτυχία επεξεργασίας φωτογραφίας (Μέρος ${key.replace('photo', '')}). Η εγγραφή θα αποθηκευτεί χωρίς αυτή.`, { duration: 5000 });
          }
        }
      }

      if (incident) {
        const updateData: any = { ...incidentData };
        delete updateData.id;
        delete updateData.createdBy;
        delete updateData.creatorName;
        delete updateData.creatorRank;
        delete updateData.recordedAt;
        updateData.updatedBy = auth.currentUser.uid;
        updateData.updatedByName = userProfile ? `${userProfile.lastName} ${userProfile.firstName}`.trim() : userProfile?.lastName || auth.currentUser.displayName || '';
        updateData.updatedByRank = userProfile ? userProfile.rank : '';
        updateData.updatedAt = serverTimestamp();
        await updateDoc(doc(db, 'incidents', id), updateData);
        toast.success(toUpperCaseAccentFree('ΕΠΙΤΥΧΗΣ ΕΝΗΜΕΡΩΣΗ ΣΥΜΒΑΝΤΟΣ'));
      } else {
        await setDoc(doc(db, 'incidents', id), incidentData);
        toast.success(toUpperCaseAccentFree('ΤΟ ΣΥΜΒΑΝ ΚΑΤΑΧΩΡΗΘΗΚΕ ΕΠΙΤΥΧΩΣ'));
      }

      // Handle bidirectional linking
      const oldLinked = incident && incident.linkedIncidents ? incident.linkedIncidents.split(',').map((idStr:string) => idStr.trim()).filter((idStr:string) => idStr.length > 0) : [];
      const newLinked = formData.linkedIncidents ? formData.linkedIncidents.split(',').map((idStr:string) => idStr.trim()).filter((idStr:string) => idStr.length > 0) : [];

      const addedLinks = newLinked.filter((idStr:string) => !oldLinked.includes(idStr));
      const removedLinks = oldLinked.filter((idStr:string) => !newLinked.includes(idStr));

      for (const linkedId of addedLinks) {
        try {
          const linkedDocSnap = await getDoc(doc(db, 'incidents', linkedId));
          if (linkedDocSnap.exists()) {
            const linkedData = linkedDocSnap.data();
            const currLinked = linkedData.linkedIncidents ? linkedData.linkedIncidents.split(',').map((s:string) => s.trim()).filter((s:string) => s.length > 0) : [];
            if (!currLinked.includes(id)) {
              currLinked.push(id);
              await updateDoc(doc(db, 'incidents', linkedId), { linkedIncidents: currLinked.join(', ') });
            }
          }
        } catch (e) {
          console.error("Failed to add bidirectional link to", linkedId);
        }
      }

      for (const linkedId of removedLinks) {
        try {
          const linkedDocSnap = await getDoc(doc(db, 'incidents', linkedId));
          if (linkedDocSnap.exists()) {
            const linkedData = linkedDocSnap.data();
            const currLinked = linkedData.linkedIncidents ? linkedData.linkedIncidents.split(',').map((s:string) => s.trim()).filter((s:string) => s.length > 0) : [];
            if (currLinked.includes(id)) {
              const updatedLinked = currLinked.filter((s:string) => s !== id);
              await updateDoc(doc(db, 'incidents', linkedId), { linkedIncidents: updatedLinked.join(', ') });
            }
          }
        } catch (e) {
          console.error("Failed to remove bidirectional link from", linkedId);
        }
      }

      onClose();
    } catch (error: any) {
      toast.error('Σφάλμα: ' + (error.message || 'Άγνωστο'));
      handleFirestoreError(error, incident ? 'update' : 'create', 'incidents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border sm:border-slate-200 rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-xl sm:shadow-2xl mb-24 sm:mb-32 relative">
      {/* Header */}
      <div className="bg-[#1A237E] p-6 sm:p-8 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4 text-white">
          <div className="bg-white/20 p-2 sm:p-3 rounded-xl">
            <AlertTriangle className="text-white w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight leading-none">
              {incident ? (isReadOnly ? toUpperCaseAccentFree('ΣΥΜΒΑΝ') : toUpperCaseAccentFree('ΕΠΕΞΕΡΓΑΣΙΑ')) : toUpperCaseAccentFree('ΝΕΑ ΚΑΤΑΓΡΑΦΗ')}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {incident && (
            <button 
              type="button"
              onClick={() => setIsReadOnly(!isReadOnly)} 
              className={`p-2 sm:p-3 rounded-xl text-white transition-colors flex items-center justify-center ${isReadOnly ? 'bg-red-500/20 hover:bg-red-500/40 text-red-100' : 'bg-green-500/40 hover:bg-green-500/60 text-green-100'}`}
              title={isReadOnly ? 'Ξεκλείδωμα για Επεξεργασία' : 'Κλείδωμα'}
            >
              {isReadOnly ? <Lock className="w-5 h-5 sm:w-6 sm:h-6" /> : <Unlock className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          )}
          <button onClick={onClose} className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Editor & Creator Info Panel */}
      {incident && (
        <div className="bg-amber-50 border-b border-amber-100 p-3 sm:px-8 text-amber-900 text-[10px] sm:text-xs flex flex-col gap-1">
          {(incident.creatorName || incident.createdBy) && (
            <div>
              <span className="font-bold">Δημιουργήθηκε από:</span> {incident.creatorName || incident.createdBy} {incident.creatorRank ? `(${incident.creatorRank})` : ''}
              {incident.recordedAt && ` - ${incident.recordedAt?.toDate ? incident.recordedAt.toDate().toLocaleString('el-GR') : (incident.recordedAt?.seconds ? new Date(incident.recordedAt.seconds * 1000).toLocaleString('el-GR') : '')}`}
            </div>
          )}
          {incident.updatedByName && (
            <div>
              <span className="font-bold">Τελευταία ενημέρωση:</span> {incident.updatedByName} {incident.updatedByRank ? `(${incident.updatedByRank})` : ''} - {incident.updatedAt?.toDate ? incident.updatedAt.toDate().toLocaleString('el-GR') : (incident.updatedAt?.seconds ? new Date(incident.updatedAt.seconds * 1000).toLocaleString('el-GR') : '')}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-5 sm:p-8">
        {isReadOnly ? (
          <IncidentReadOnlyView incident={formData} setFullscreenImage={setFullscreenImage} onOpenIncident={onOpenIncident} />
        ) : (
          <fieldset className="min-w-0 border-0 p-0 m-0 space-y-8 sm:space-y-10">
        {/* Section: Basic Info */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-[#1A237E] font-black text-[10px] uppercase tracking-[0.2em] mb-6">
            <Clock className="w-4 h-4" /> {toUpperCaseAccentFree('ΧΡΟΝΙΚΑ & ΤΟΠΙΚΑ ΣΤΟΙΧΕΙΑ')}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-black ml-1">Ημ/νία & Ωρα Συμβάντος</label>
              <input 
                type="datetime-local"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 sm:px-5 sm:py-4 outline-none focus:ring-4 focus:ring-[#1A237E]/5 focus:border-[#1A237E] transition-all text-slate-900 font-medium text-base h-12 sm:h-auto"
                value={formData.incidentDate || ''}
                onChange={(e) => {
                  setIsManualDate(true);
                  handleChange('incidentDate', e.target.value);
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-black ml-1">{toUpperCaseAccentFree('Είδος Κλοπής')}</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 sm:px-5 sm:py-4 outline-none focus:ring-4 focus:ring-[#1A237E]/5 focus:border-[#1A237E] transition-all text-slate-900 font-medium text-base h-12 sm:h-auto"
                value={formData.theftType}
                onChange={(e) => handleChange('theftType', e.target.value)}
                required
              >
                {THEFT_TYPES.map(t => <option key={t} value={t}>{toUpperCaseAccentFree(t)}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-black ml-1">Κατάσταση</label>
              <div className="grid grid-cols-2 gap-3">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleChange('status', s)}
                    className={`py-4 px-4 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${formData.status === s ? 'bg-[#1A237E] border-[#1A237E] text-white shadow-lg shadow-[#1A237E]/20' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-400'}`}
                  >
                    {toUpperCaseAccentFree(s)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-black ml-1">{toUpperCaseAccentFree('Περιοχή')}</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 sm:px-5 sm:py-4 outline-none focus:ring-4 focus:ring-[#1A237E]/5 focus:border-[#1A237E] transition-all text-slate-900 font-medium text-base h-12 sm:h-auto"
                value={formData.area}
                onChange={(e) => handleChange('area', e.target.value)}
                required
              >
                {AREAS.map(a => <option key={a} value={a}>{toUpperCaseAccentFree(a)}</option>)}
              </select>
            </div>
            <div className="space-y-2 relative">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-black ml-1">{toUpperCaseAccentFree('Διεύθυνση')}</label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Οδός και αριθμός..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 sm:px-5 sm:py-4 outline-none focus:ring-4 focus:ring-[#1A237E]/5 focus:border-[#1A237E] transition-all text-slate-900 font-medium text-base pr-10"
                  value={formData.address || ''}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onFocus={() => {
                    if (addressSuggestions.length > 0) setShowSuggestions(true);
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  required
                />
                {isSearchingAddress && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1A237E]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                )}
              </div>
              <AnimatePresence>
                {showSuggestions && addressSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
                  >
                    {addressSuggestions.map((suggestion, index) => (
                      <div
                        key={suggestion.place_id || index}
                        onClick={() => selectAddress(suggestion)}
                        className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-700">
                            {suggestion.address?.road || suggestion.name || suggestion.display_name.split(',')[0]}
                          </span>
                          <span className="text-xs text-slate-500 line-clamp-1">
                            {suggestion.display_name}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="px-3 py-2 bg-slate-50 text-[9px] text-slate-400 text-right">
                      Powered by OpenStreetMap
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-black ml-1">{toUpperCaseAccentFree('Γεωγραφικό Στίγμα (GPS)')}</label>
            <div className="flex gap-4">
              <div className="flex-1 bg-blue-50 border border-blue-100 rounded-2xl px-6 py-4 text-blue-700 flex items-center gap-3">
                <MapPin className="w-5 h-5" />
                <span className="text-xs font-mono font-bold">{formData.location?.lat.toFixed(6)}, {formData.location?.lng.toFixed(6)}</span>
              </div>
              <button 
                type="button" 
                onClick={getCurrentLocation}
                className="bg-[#1A237E] hover:bg-[#1A237E]/90 p-5 rounded-2xl text-white transition-all shadow-lg shadow-[#1A237E]/20 active:scale-95"
                title="Λήψη τοποθεσίας"
              >
                <MapPin className="w-6 h-6" />
              </button>
            </div>
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* Section: Perpetrator Details */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-[#1A237E] font-black text-[10px] uppercase tracking-[0.2em] mb-6">
            <UserIcon className="w-4 h-4" /> {toUpperCaseAccentFree('ΣΤΟΙΧΕΙΑ ΔΡΑΣΤΩΝ & ΤΡΟΠΟΣ ΤΕΛΕΣΗΣ')}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-black ml-1">{toUpperCaseAccentFree('Στοιχεία Υπόπτων')}</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 sm:px-5 sm:py-4 outline-none focus:ring-4 focus:ring-[#1A237E]/5 focus:border-[#1A237E] transition-all text-slate-900 font-medium text-base h-12 sm:h-auto"
                  value={formData.suspectDetails}
                  onChange={(e) => handleChange('suspectDetails', e.target.value)}
                >
                  <option value="Άγνωστοι">{toUpperCaseAccentFree('Άγνωστοι')}</option>
                  <option value="Γνωστοί">{toUpperCaseAccentFree('Γνωστοί')}</option>
                </select>
              </div>
              
              <AnimatePresence mode="popLayout">
                {formData.suspectDetails === 'Γνωστοί' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-[#1A237E] font-black ml-1">{toUpperCaseAccentFree('Ονόματα / Στοιχεία Δραστών')}</label>
                    <input 
                      type="text"
                      placeholder="Αναφέρετε ονόματα..."
                      className="w-full bg-[#1A237E]/5 border border-[#1A237E]/20 rounded-xl px-4 py-3 sm:px-5 sm:py-4 outline-none focus:ring-4 focus:ring-[#1A237E]/10 transition-all text-[#1A237E] font-bold text-base"
                      value={formData.suspectNames || ''}
                      onChange={(e) => handleChange('suspectNames', e.target.value)}
                    />
                  </motion.div>
                )}
                {formData.suspectDetails === 'Άγνωστοι' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-black ml-1">{toUpperCaseAccentFree('Περιγραφή Δραστών (Υψος, Ρούχα, Περιγραφή)')}</label>
                    <textarea 
                      rows={2}
                      placeholder="Π.χ. Ψηλός 1.80m, φορούσε μαύρο μπουφάν..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-[#1A237E]/5 focus:border-[#1A237E] transition-all text-slate-900 font-medium text-base resize-none"
                      value={formData.perpetratorDescription || ''}
                      onChange={(e) => handleChange('perpetratorDescription', e.target.value)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-black ml-1">{toUpperCaseAccentFree('Τρόπος Τέλεσης (Modus Operandi)')}</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 sm:px-5 sm:py-4 outline-none focus:ring-4 focus:ring-[#1A237E]/5 focus:border-[#1A237E] transition-all text-slate-900 font-medium text-base h-12 sm:h-auto"
                value={formData.modusOperandi || ''}
                onChange={(e) => handleChange('modusOperandi', e.target.value)}
              >
                <option value="" disabled>Επιλέξτε τρόπο...</option>
                {MO_TYPES.map(mo => (
                  <option key={mo} value={mo}>{toUpperCaseAccentFree(mo)}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-black ml-1">{toUpperCaseAccentFree('Όχημα Διαφυγής (Μάρκα, Χρώμα κλπ)')}</label>
              <input 
                type="text"
                placeholder="Π.χ. Μαύρο Golf..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-[#1A237E]/5 focus:border-[#1A237E] transition-all text-slate-900 font-medium text-base"
                value={formData.vehicle || ''}
                onChange={(e) => handleChange('vehicle', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-black ml-1">{toUpperCaseAccentFree('Αριθμός Πινακίδας')}</label>
              <input 
                type="text"
                placeholder="ΑΒΓ-1234"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-[#1A237E]/5 focus:border-[#1A237E] transition-all text-slate-900 font-bold text-base uppercase tracking-widest"
                value={formData.plateNumber || ''}
                onChange={(e) => handleChange('plateNumber', e.target.value?.toUpperCase())}
              />
            </div>
          </div>
          
          <div className="space-y-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            <label className="flex items-center gap-3 sm:gap-4 cursor-pointer group">
              <div 
                onClick={() => handleChange('usedTools', !formData.usedTools)}
                className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${formData.usedTools ? 'bg-[#1A237E] border-[#1A237E]' : 'bg-white border-slate-200'}`}
              >
                {formData.usedTools && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-600">{toUpperCaseAccentFree('Χρήση Εργαλείων Διάρρηξης')}</span>
            </label>
            
            <AnimatePresence>
              {formData.usedTools && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-2 pl-11"
                >
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-black mb-2 block">{toUpperCaseAccentFree('Είδος Εργαλείων')}</label>
                  <div className="flex flex-wrap gap-2">
                    {TOOL_TYPES.map(tool => (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => handleToggleToolType(tool)}
                        className={`py-2 px-3 sm:py-2 sm:px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${formData.usedToolTypes?.includes(tool) ? 'bg-[#1A237E]/10 border-[#1A237E] text-[#1A237E]' : 'bg-white border-slate-200 text-slate-500'}`}
                      >
                        {toUpperCaseAccentFree(tool)}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="space-y-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="text-[10px] uppercase tracking-wider text-[#1A237E] font-black ml-1">{toUpperCaseAccentFree('Συνδεδεμένες Υποθέσεις')}</label>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setShowLinkedModal(true)}
                  className="bg-[#1A237E] hover:bg-[#1A237E]/90 text-[#D4AF37] font-black text-[10px] uppercase px-4 py-2 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 self-start sm:self-auto"
                >
                  ΣΥΣΧΕΤΙΣΜΟΣ ΜΕ ΑΛΛΗ ΥΠΟΘΕΣΗ
                </button>
              )}
            </div>
            {formData.linkedIncidents && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.linkedIncidents.split(',').map(id => id.trim()).filter(id => id.length > 0).map(id => (
                  <div
                    key={id} 
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (onOpenIncident) {
                        try {
                          // Prevent default in case it thinks it's submitting
                          const btn = document.activeElement as HTMLElement;
                          if (btn) btn.blur();
                        } catch(e){}
                        onOpenIncident(id);
                      }
                    }}
                    onKeyDown={(e) => {
                      if(e.key === 'Enter' || e.key === ' ') {
                        if (onOpenIncident) { onOpenIncident(id); }
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-[#1A237E]/20 text-[#1A237E] shadow-sm rounded-lg text-xs font-mono font-bold hover:bg-[#1A237E]/5 transition-colors cursor-pointer"
                    title="Προβολή Υπόθεσης"
                  >
                    {id.split('-')[1] || id}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-black ml-1">{toUpperCaseAccentFree('ΚΛΟΠΙΜΑΙΑ')}</label>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {STOLEN_ITEMS.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleToggleStolen(item)}
                  className={`py-2 px-4 sm:py-3 sm:px-6 rounded-full border text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all ${formData.stolenItems?.includes(item) ? 'bg-[#1A237E]/10 border-[#1A237E] text-[#1A237E]' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                >
                  {toUpperCaseAccentFree(item)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 py-2">
            {[ 
              { key: 'hasAlarm', label: 'Συναγερμός' },
              { key: 'hasCameras', label: 'Συστήματα CCTV' },
              { key: 'forensicsCalled', label: 'Κλήθηκε ΥΕΕΒΕ' }
            ].map(item => (
              <label key={item.key} className="flex items-center gap-3 sm:gap-4 cursor-pointer group p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 hover:border-[#1A237E]/50 transition-all">
                <div 
                  onClick={() => handleChange(item.key as any, !formData[item.key as keyof Incident] as any)}
                  className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${formData[item.key as keyof Incident] ? 'bg-[#1A237E] border-[#1A237E]' : 'bg-white border-slate-200'}`}
                >
                  {formData[item.key as keyof Incident] && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-600">{toUpperCaseAccentFree(item.label)}</span>
              </label>
            ))}
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* Section: Victim Info */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-[#1A237E] font-black text-[10px] uppercase tracking-[0.2em] mb-6">
            <Phone className="w-4 h-4" /> {toUpperCaseAccentFree('ΣΤΟΙΧΕΙΑ ΠΑΘΟΝΤΟΣ & ΜΑΡΤΥΡΑ')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-black ml-1">{toUpperCaseAccentFree('Ονοματεπώνυμο Παθόντος')}</label>
              <input 
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 sm:px-5 sm:py-4 outline-none focus:ring-4 focus:ring-[#1A237E]/5 focus:border-[#1A237E] transition-all text-slate-900 font-medium text-base"
                value={formData.victimName || ''}
                onChange={(e) => handleChange('victimName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-black ml-1">{toUpperCaseAccentFree('Τηλέφωνο Παθόντος')}</label>
              <input 
                type="tel"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 sm:px-5 sm:py-4 outline-none focus:ring-4 focus:ring-[#1A237E]/5 focus:border-[#1A237E] transition-all text-slate-900 font-medium text-base"
                value={formData.victimPhone || ''}
                onChange={(e) => handleChange('victimPhone', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-black ml-1">{toUpperCaseAccentFree('Ονοματεπώνυμο Μάρτυρα')}</label>
              <input 
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 sm:px-5 sm:py-4 outline-none focus:ring-4 focus:ring-[#1A237E]/5 focus:border-[#1A237E] transition-all text-slate-900 font-medium text-base"
                value={formData.witnessName || ''}
                onChange={(e) => handleChange('witnessName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-black ml-1">{toUpperCaseAccentFree('Τηλέφωνο Μάρτυρα')}</label>
              <input 
                type="tel"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 sm:px-5 sm:py-4 outline-none focus:ring-4 focus:ring-[#1A237E]/5 focus:border-[#1A237E] transition-all text-slate-900 font-medium text-base"
                value={formData.witnessPhone || ''}
                onChange={(e) => handleChange('witnessPhone', e.target.value)}
              />
            </div>
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* Section: Photos & Notes */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-[#1A237E] font-black text-[10px] uppercase tracking-[0.2em] mb-6">
            <FileText className="w-4 h-4" /> {toUpperCaseAccentFree('ΠΑΡΑΤΗΡΗΣΕΙΣ - ΕΣΩΤΕΡΙΚΕΣ ΣΗΜΕΙΩΣΕΙΣ')}
          </div>
          
          <div className="space-y-2">
            <textarea 
              rows={4}
              placeholder="Σημειώστε οτιδήποτε σημαντικό..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 sm:px-5 sm:py-4 outline-none focus:ring-4 focus:ring-[#1A237E]/5 focus:border-[#1A237E] transition-all text-slate-900 font-medium text-base resize-none leading-relaxed"
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {['photo1', 'photo2'].map((key, i) => (
              <div 
                key={key} 
                className="relative aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-300 hover:text-[#1A237E] hover:border-[#1A237E] hover:bg-[#1A237E]/5 transition-all group overflow-hidden"
              >
                {photoPreviews[key] ? (
                  <>
                    <img 
                      src={photoPreviews[key]} 
                      alt={`Preview ${i+1}`} 
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90"
                      onClick={() => setFullscreenImage(photoPreviews[key])}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); clearPhoto(key); }}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg z-50 transition-transform active:scale-95"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {imageCompressing[key] && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-10 pointer-events-none">
                        <Loader2 className="w-8 h-8 text-[#1A237E] animate-spin mb-2" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#1A237E] bg-white px-2 py-1 rounded-md">{toUpperCaseAccentFree('ΣΥΜΠΙΕΣΗ...')}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(e, key)} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" 
                    />
                    <Camera className="w-10 h-10 transition-transform group-hover:scale-110 pointer-events-none" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] pointer-events-none">{toUpperCaseAccentFree('ΛΗΨΗ ΦΩΤΟΓΡΑΦΙΑΣ')} {i+1}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
        </fieldset>
        )}

        {/* Footer Actions */}
        <div className="pt-6 sm:pt-10 flex flex-col sm:flex-row gap-4 sm:gap-6">
          {isReadOnly ? (
            <button 
              type="button"
              onClick={onClose}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-[0.2em] py-4 sm:py-5 rounded-2xl transition-all active:scale-95 outline-none"
            >
              {toUpperCaseAccentFree('ΚΛΕΙΣΙΜΟ')}
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row w-full gap-4 sm:gap-6">
              {incident && (
                <div className="flex items-center gap-2 order-3 sm:order-none w-full sm:w-auto">
                  <button 
                    type="button"
                    onClick={() => setIsDeleteUnlocked(!isDeleteUnlocked)}
                    className={`flex-none p-4 sm:p-5 rounded-2xl transition-all flex items-center justify-center ${isDeleteUnlocked ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                    title={isDeleteUnlocked ? 'Κλείδωμα Διαγραφής' : 'Ξεκλείδωμα Διαγραφής'}
                  >
                    {isDeleteUnlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </button>
                  <AnimatePresence>
                    {isDeleteUnlocked && (
                      <motion.button 
                        initial={{ opacity: 0, width: 0, scale: 0.8 }}
                        animate={{ opacity: 1, width: 'auto', scale: 1 }}
                        exit={{ opacity: 0, width: 0, scale: 0.8 }}
                        type="button"
                        onClick={() => setDeleteStep(1)}
                        className="flex-1 sm:flex-none overflow-hidden whitespace-nowrap bg-red-100 hover:bg-red-200 text-red-600 font-black text-[11px] uppercase tracking-[0.2em] py-4 sm:py-5 px-6 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-5 h-5 shrink-0" />
                        <span className="sm:hidden">ΔΙΑΓΡΑΦΗ</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <button 
                type="button"
                onClick={incident ? () => setIsReadOnly(true) : onClose}
                className="flex-[1] bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-[0.2em] py-4 sm:py-5 rounded-2xl transition-all active:scale-95 outline-none order-2 sm:order-1"
              >
                {toUpperCaseAccentFree('ΑΚΥΡΩΣΗ')}
              </button>
              <button 
                disabled={loading || Object.values(imageCompressing).some(v => v)}
                className="flex-[2] bg-[#1A237E] hover:bg-[#1A237E]/90 disabled:opacity-50 text-white font-black text-xs uppercase tracking-[0.2em] py-4 sm:py-5 rounded-2xl transition-all shadow-2xl shadow-[#1A237E]/30 active:scale-95 flex items-center justify-center gap-3 outline-none order-1 sm:order-2 w-full sm:w-auto"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    {incident ? <span className="truncate">{toUpperCaseAccentFree('ΕΝΗΜΕΡΩΣΗ')}</span> : <span className="truncate">{toUpperCaseAccentFree('ΚΑΤΑΧΩΡΗΣΗ')}</span>}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteStep > 0 && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-white/90 backdrop-blur-sm rounded-[24px] sm:rounded-[32px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-8 max-w-md w-full text-center"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                {deleteStep === 1 ? 'Διαγραφή Συμβάντος' : 'Οριστική Διαγραφή'}
              </h3>
              <p className="text-slate-500 text-base mb-8 leading-relaxed">
                {deleteStep === 1 
                  ? 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το συμβάν; Η διαδικασία χρειάζεται διπλή επιβεβαίωση.'
                  : 'ΤΕΛΕΥΤΑΙΑ ΠΡΟΕΙΔΟΠΟΙΗΣΗ: Αυτή η ενέργεια είναι οριστική και δεν μπορεί να αναιρεθεί. Είστε απολύτως σίγουροι;'}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                      if (deleteStep === 1) setDeleteStep(2);
                      else handleDelete();
                  }}
                  disabled={isDeleting}
                  className="w-full px-5 py-4 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold rounded-xl text-base transition-colors shadow-md disabled:opacity-50"
                >
                  {isDeleting ? 'ΔΙΑΓΡΑΦΗ...' : (deleteStep === 1 ? 'ΝΑΙ, ΣΥΝΕΧΕΙΑ ΔΙΑΓΡΑΦΗΣ' : 'ΟΡΙΣΤΙΚΗ ΔΙΑΓΡΑΦΗ')}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteStep(0)}
                  disabled={isDeleting}
                  className="w-full px-5 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-base transition-colors"
                >
                  ΑΚΥΡΩΣΗ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Image Preview */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <button 
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-md transition-all"
            onClick={(e) => { e.stopPropagation(); setFullscreenImage(null); }}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={fullscreenImage} 
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      {/* Linked Incident Search Modal */}
      <AnimatePresence>
        {showLinkedModal && (
          <LinkedIncidentSearchModal
            onClose={() => setShowLinkedModal(false)}
            onSelect={(id) => {
              const current = formData.linkedIncidents ? formData.linkedIncidents.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
              if (current.includes(id)) {
                handleChange('linkedIncidents', current.filter(existing => existing !== id).join(', '));
              } else {
                handleChange('linkedIncidents', [...current, id].join(', '));
              }
            }}
            selectedIds={formData.linkedIncidents ? formData.linkedIncidents.split(',').map(s => s.trim()).filter(s => s.length > 0) : []}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
