import React from 'react';
import { Shield, Search, User as UserIcon, Camera, Image as ImageIcon, Link2, MapPin, Calendar, Home, Store, CarFront, Car, Umbrella, Crosshair, PersonStanding, Warehouse } from 'lucide-react';
import { Incident } from '../types';
import { toUpperCaseAccentFree } from '../lib/Typography';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

import { LinkedIncidentTag } from './LinkedIncidentTag';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Props {
  incident: Partial<Incident>;
  setFullscreenImage: (url: string) => void;
  onOpenIncident?: (id: string) => void | Promise<void>;
}

export default function IncidentReadOnlyView({ incident, setFullscreenImage, onOpenIncident }: Props) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2.5">
              <span className="p-2 bg-slate-200/50 rounded-lg text-slate-500"><Shield className="w-4 h-4" /></span> ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ
            </h3>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Κατάσταση & Είδος</div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${incident.status === 'Τετελεσμένη' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {incident.status ? toUpperCaseAccentFree(incident.status) : '-'}
                  </span>
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    {(() => {
                      if (!incident.theftType) return '-';
                      switch (incident.theftType as string) {
                        case 'Οικίας':
                        case 'Οικία (Κύρια)':
                          return <><Home className="w-4 h-4 text-slate-400" /> {toUpperCaseAccentFree(incident.theftType)}</>;
                        case 'Εξοχικό':
                        case 'Οικία (Εξοχική)':
                          return <><Umbrella className="w-4 h-4 text-slate-400" /> {toUpperCaseAccentFree(incident.theftType)}</>;
                        case 'Επιχείρησης':
                        case 'Επιχείρηση':
                          return <><Store className="w-4 h-4 text-slate-400" /> {toUpperCaseAccentFree(incident.theftType)}</>;
                        case 'Κλοπή από όχημα':
                        case 'Από όχημα':
                          return <><CarFront className="w-4 h-4 text-slate-400" /> {toUpperCaseAccentFree(incident.theftType)}</>;
                        case 'Κλοπή οχήματος':
                        case 'Κλοπή Αυτοκινήτου':
                          return <><Car className="w-4 h-4 text-slate-400" /> {toUpperCaseAccentFree(incident.theftType)}</>;
                        case 'Ληστεία':
                          return <><Crosshair className="w-4 h-4 text-slate-400" /> {toUpperCaseAccentFree(incident.theftType)}</>;
                        case 'Κλοπή σε βάρος πεζού':
                          return <><PersonStanding className="w-4 h-4 text-slate-400" /> {toUpperCaseAccentFree(incident.theftType)}</>;
                        case 'Αποθήκη':
                          return <><Warehouse className="w-4 h-4 text-slate-400" /> {toUpperCaseAccentFree(incident.theftType)}</>;
                        default: return toUpperCaseAccentFree(incident.theftType);
                      }
                    })()}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Χρόνος Συμβάντος</div>
                <div className="font-medium text-slate-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {incident.isTimeRange ? (
                    <div className="flex flex-col">
                      <span>Από {incident.incidentDateFrom ? format(new Date(incident.incidentDateFrom), 'PPpp', { locale: el }) : '-'}</span>
                      <span>Εώς {incident.incidentDateTo ? format(new Date(incident.incidentDateTo), 'PPpp', { locale: el }) : '-'}</span>
                    </div>
                  ) : (
                    incident.incidentDate ? format(new Date(incident.incidentDate), 'PPpp', { locale: el }) : '-'
                  )}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Τοποθεσία</div>
                <div className="font-medium text-slate-700">
                  {incident.address || '-'}, <span className="text-slate-500">{incident.area ? toUpperCaseAccentFree(incident.area) : '-'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2.5">
              <span className="p-2 bg-slate-200/50 rounded-lg text-slate-500"><Search className="w-4 h-4" /></span> ΣΤΟΙΧΕΙΑ ΤΕΛΕΣΗΣ & ΔΡΑΣΤΩΝ
            </h3>
            <div className="space-y-3">
              {incident.theftType === 'Κλοπή οχήματος' && incident.carCategory && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Κατηγορία Οχήματος</div>
                  <div className="font-medium text-slate-700">{incident.carCategory}</div>
                </div>
              )}
              {incident.theftType !== 'Κλοπή οχήματος' && incident.modusOperandi && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Μέθοδος (M.O.)</div>
                  <div className="font-medium text-slate-700">{incident.modusOperandi}</div>
                </div>
              )}
              {incident.stolenItems && incident.stolenItems.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Κλοπιμαία</div>
                  <div className="flex flex-wrap gap-1.5">
                    {incident.stolenItems.map(item => (
                      <span key={item} className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2.5 py-1 rounded-md uppercase">
                        {toUpperCaseAccentFree(item)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {incident.stolenValue && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Αξία Κλοπιμαίων</div>
                  <div className="font-medium text-slate-700">{incident.stolenValue}</div>
                </div>
              )}
              {incident.hasTheftInsurance && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Ασφάλεια Κλοπής</div>
                  <div className="font-medium text-slate-700">ΝΑΙ, ΥΠΑΡΧΕΙ ΑΣΦΑΛΙΣΤΗΡΙΟ</div>
                </div>
              )}
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Δράστες</div>
                <div className="font-medium text-slate-700">
                  <span className="mr-2">{incident.suspectDetails ? toUpperCaseAccentFree(incident.suspectDetails) : '-'}</span>
                  {incident.suspectNames && <span className="text-sm text-slate-500">({incident.suspectNames})</span>}
                </div>
              </div>
              {incident.perpetratorDescription && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Περιγραφή</div>
                  <div className="text-sm text-slate-600">{incident.perpetratorDescription}</div>
                </div>
              )}
              {(incident.vehicle || incident.plateNumber) && (
                <div className="flex gap-4">
                  {incident.vehicle && (
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Όχημα</div>
                      <div className="font-medium text-slate-700">{incident.vehicle}</div>
                    </div>
                  )}
                  {incident.plateNumber && (
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Πινακίδα</div>
                      <div className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{incident.plateNumber}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2.5">
              <span className="p-2 bg-slate-200/50 rounded-lg text-slate-500"><UserIcon className="w-4 h-4" /></span> ΠΛΗΡΟΦΟΡΙΕΣ ΠΑΘΟΝΤΑ & ΜΑΡΤΥΡΑ
            </h3>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Παθών</div>
                <div className="font-medium text-slate-700">{incident.victimName || '-'} {incident.victimPhone && <span className="text-slate-400 ml-2">({incident.victimPhone})</span>}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Μάρτυρας</div>
                <div className="font-medium text-slate-700">{incident.witnessName || '-'} {incident.witnessPhone && <span className="text-slate-400 ml-2">({incident.witnessPhone})</span>}</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2.5">
              <span className="p-2 bg-slate-200/50 rounded-lg text-slate-500"><Camera className="w-4 h-4" /></span> ΠΡΟΣΤΑΣΙΑ & ΕΓΚΛΗΜΑΤΟΛΟΓΙΚΟ
            </h3>
            <div className="flex flex-wrap gap-2">
              {incident.hasAlarm && (
                <span className="px-2.5 py-1 rounded-lg text-[13px] font-bold bg-green-100 text-green-700">
                  ΣΥΝΑΓΕΡΜΟΣ
                </span>
              )}
              {incident.hasCameras && (
                <span className="px-2.5 py-1 rounded-lg text-[13px] font-bold bg-green-100 text-green-700">
                  ΚΑΜΕΡΕΣ
                </span>
              )}
              {incident.forensicsCalled && (
                <span className="px-2.5 py-1 rounded-lg text-[13px] font-bold bg-blue-100 text-blue-700">
                  ΚΛΗΣΗ ΥΕΕΒΕ
                </span>
              )}
              {!incident.hasAlarm && !incident.hasCameras && !incident.forensicsCalled && (
                <span className="text-[13px] font-medium text-slate-500">
                  Δεν υπάρχουν στοιχεία
                </span>
              )}
            </div>
          </div>

          {(incident.photo1 || incident.photo2 || incident.photo3) && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2.5">
                <span className="p-2 bg-slate-200/50 rounded-lg text-slate-500"><ImageIcon className="w-4 h-4" /></span> ΦΩΤΟΓΡΑΦΙΕΣ
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[incident.photo1, incident.photo2, incident.photo3].filter(Boolean).map((photo, index) => (
                  <div key={index} className="aspect-video max-h-[300px] w-full bg-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <img src={photo!} alt={`Φωτογραφία ${index + 1}`} className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setFullscreenImage(photo!)} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {(incident.notes || incident.linkedIncidents) && (
           <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
             {incident.notes && (
               <div className="mb-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A237E] mb-2 flex items-center gap-2">
                   ΛΕΠΤΟΜΕΡΕΙΕΣ / ΣΗΜΕΙΩΣΕΙΣ
                 </h3>
                 <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed break-all">{incident.notes}</p>
               </div>
             )}
             {incident.linkedIncidents && (
               <div>
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A237E] mb-3 flex items-center gap-2.5">
                   <span className="p-2 bg-blue-100 rounded-lg text-blue-600"><Link2 className="w-4 h-4" /></span> ΣΥΣΧΕΤΙΖΟΜΕΝΑ ΣΥΜΒΑΝΤΑ
                 </h3>
                 <div className="flex flex-col gap-2">
                    {incident.linkedIncidents.split(',').filter(id => id.trim() !== '').map(id => (
                      <LinkedIncidentTag key={id.trim()} id={id.trim()} onOpen={onOpenIncident} />
                    ))}
                 </div>
               </div>
             )}
           </div>
         )}
      
        {incident.location && (
          <div className="bg-slate-50 p-2 sm:p-5 rounded-2xl border border-slate-100">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2.5 px-3 sm:px-0">
               <span className="p-2 bg-slate-200/50 rounded-lg text-slate-500"><MapPin className="w-4 h-4" /></span> ΤΟΠΟΘΕΣΙΑ ΧΑΡΤΗ
             </h3>
             <div className="h-[250px] w-full bg-slate-200 rounded-xl overflow-hidden relative z-0">
               <MapContainer 
                 center={[incident.location.lat, incident.location.lng]} 
                 zoom={15} 
                 style={{ height: '100%', width: '100%', zIndex: 0 }}
               >
                 <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                 <Marker position={[incident.location.lat, incident.location.lng]} />
               </MapContainer>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
