export type Area = 
  'Ασπροβάλτα' | 'Σταυρός' | 'Νέα Βρασνά' | 'Νέα Μάδυτος' | 
  'Ανοιξιά' | 'Απολλωνία' | 'Αρέθουσα' | 'Βαμβακιά' | 'Βρασνά' | 
  'Κοκκαλού' | 'Λίμνη' | 'Μαυρούδα' | 'Μεγάλη Βόλβη' | 'Μικρή Βόλβη' | 
  'Μόδι' | 'Παραλία Βρασνών' | 'Ρεντίνα' | 'Σκεπαστό';
export type Status = 'Τετελεσμένη' | 'Απόπειρα';
export type Rank = 'Αστυνόμος Β΄' | 'Υπαστυνόμος Α΄' | 'Υπαστυνόμος Β΄' | 'Ανθυπαστυνόμος' | 'Αρχιφύλακας' | 'Αστυφύλακας';
export type TheftType = 'Οικία (Κύρια)' | 'Οικία (Εξοχική)' | 'Επιχείρηση' | 'Από όχημα' | 'Κλοπή Αυτοκινήτου' | 'Οχήματος';
export type StolenItem = 'Ηλεκτρονικά' | 'Κοσμήματα' | 'Μετρητά' | 'Εργαλεία' | 'Άλλο';
export type SuspectStatus = 'Άγνωστοι' | 'Γνωστοί';
export type ModusOperandi = 'Ανασφάλιστο' | 'Θραύση υαλοπίνακα' | 'Παραβίαση κλειδαριάς' | 'Διάρρηξη παραθύρου/μπαλκονόπορτας' | 'Χωρίς ίχνη' | 'Άλλο';

export interface Location {
  lat: number;
  lng: number;
}

export interface Incident {
  id: string;
  recordedAt: any; // Firestore Timestamp
  officerDetails: string;
  occurrenceAt: any; // Firestore Timestamp
  duration: string;
  area: Area;
  address: string;
  location: Location;
  status: Status;
  theftType: TheftType;
  modusOperandi: ModusOperandi | string;
  usedTools: boolean;
  toolsDescription: string;
  stolenItems: StolenItem[];
  suspectDetails: SuspectStatus;
  suspectNames?: string;
  perpetratorDescription: string;
  vehicle: string;
  plateNumber: string;
  linkedIncidents: string;
  hasAlarm: boolean;
  hasCameras: boolean;
  forensicsCalled: boolean;
  victimName: string;
  victimPhone: string;
  witnesses: string;
  notes: string;
  photo1: string;
  photo2: string;
  createdBy: string;
  creatorName?: string;
  creatorRank?: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedByRank?: string;
  updatedAt?: any; // Firestore Timestamp
  incidentDate?: string;
}

export interface UserProfile {
  uid: string;
  rank: Rank;
  lastName: string;
  firstName: string;
  notificationPrefs?: {
    enabled: boolean;
    quietHours?: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
}
