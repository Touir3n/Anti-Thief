import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toUpperCaseAccentFree } from '../lib/Typography';
import { Home, Store, CarFront, Car, Umbrella, Crosshair } from 'lucide-react';

interface LinkedIncidentTagProps {
  id: string;
  onOpen?: (id: string) => void | Promise<void>;
}

export const LinkedIncidentTag: React.FC<LinkedIncidentTagProps> = ({ id, onOpen }) => {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    getDoc(doc(db, 'incidents', id)).then(snap => {
      if (snap.exists()) {
        setData(snap.data());
      }
    });
  }, [id]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.preventDefault();
        if (onOpen) onOpen(id);
      }}
      className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 border-2 border-green-200 text-green-800 shadow-sm rounded-lg text-xs font-medium hover:bg-green-100 transition-colors cursor-pointer"
      title="Προβολή Υπόθεσης"
    >
      {data ? (
        <div className="flex flex-col gap-0.5 pointer-events-none">
          <span className="font-bold flex items-center gap-1.5">
            {(() => {
              const iconClass = "w-3.5 h-3.5 text-green-600";
              switch (data.theftType) {
                case 'Οικίας':
                case 'Οικία (Κύρια)':
                  return <><Home className={iconClass} /> {toUpperCaseAccentFree(data.theftType)}</>;
                case 'Εξοχικό':
                case 'Οικία (Εξοχική)':
                  return <><Umbrella className={iconClass} /> {toUpperCaseAccentFree(data.theftType)}</>;
                case 'Επιχείρησης':
                case 'Επιχείρηση':
                  return <><Store className={iconClass} /> {toUpperCaseAccentFree(data.theftType)}</>;
                case 'Κλοπή από όχημα':
                case 'Από όχημα':
                  return <><CarFront className={iconClass} /> {toUpperCaseAccentFree(data.theftType)}</>;
                case 'Κλοπή οχήματος':
                case 'Κλοπή Αυτοκινήτου':
                  return <><Car className={iconClass} /> {toUpperCaseAccentFree(data.theftType)}</>;
                case 'Ληστεία':
                  return <><Crosshair className={iconClass} /> {toUpperCaseAccentFree(data.theftType)}</>;
                default: return toUpperCaseAccentFree(data.theftType || '');
              }
            })()}
          </span>
          <span className="text-[10px] opacity-80">
            {toUpperCaseAccentFree(data.area)} • {data.isTimeRange ? `${new Date(data.incidentDateFrom).toLocaleDateString('el-GR')} - ${new Date(data.incidentDateTo).toLocaleDateString('el-GR')}` : (data.incidentDate ? new Date(data.incidentDate).toLocaleDateString('el-GR') : '')} • {data.creatorRank} {data.creatorName}
          </span>
        </div>
      ) : (
        <span className="font-mono font-bold">{id.split('-')[1] || id}</span>
      )}
    </div>
  );
};
