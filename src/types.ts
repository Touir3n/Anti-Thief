export type Area = string;
export type Status = 'Τετελεσμένη' | 'Απόπειρα';
export type Rank = 'Αστυνόμος Β΄' | 'Υπαστυνόμος Α΄' | 'Υπαστυνόμος Β΄' | 'Ανθυπαστυνόμος' | 'Αρχιφύλακας' | 'Αστυφύλακας';
export type TheftType = 'Οικίας' | 'Εξοχικό' | 'Επιχείρησης' | 'Κλοπή από όχημα' | 'Κλοπή οχήματος' | 'Ληστεία';
export type StolenItem = 'Ηλεκτρονικά' | 'Κοσμήματα' | 'Μετρητά' | 'Εργαλεία' | 'Άλλο';
export type SuspectStatus = 'Άγνωστοι' | 'Γνωστοί';
export type ModusOperandi = string;

export interface Location {
  lat: number;
  lng: number;
}

export interface EditHistoryEntry {
  updatedAt: any;
  updatedBy: string;
  updatedByName?: string;
  updatedByRank?: string;
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
  modusOperandi?: ModusOperandi;
  carCategory?: string; // e.g. Ι.Χ.Ε., ΔΙΚΥΚΛΟ, etc.
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
  witnessName: string;
  witnessPhone: string;
  notes: string;
  photo1: string;
  photo2: string;
  photo3?: string;
  createdBy: string;
  creatorName?: string;
  creatorRank?: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedByRank?: string;
  updatedAt?: any; // Firestore Timestamp
  editHistory?: EditHistoryEntry[];
  isTimeRange?: boolean;
  incidentDate?: string;
  incidentDateFrom?: string;
  incidentDateTo?: string;
}

export interface UserProfile {
  uid: string;
  rank: Rank;
  lastName: string;
  firstName: string;
  email?: string;
  isApproved?: boolean;
  notificationPrefs?: {
    enabled: boolean;
    quietHours?: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
}
