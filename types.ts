
export enum RoomStatus {
  FREE = 'FREE',
  BUSY = 'BUSY',
  CLEANING = 'CLEANING',
  MAINTENANCE = 'MAINTENANCE'
}

export interface Staff {
  name: string | null;
  role: 'DOCTOR' | 'NURSE' | 'ANESTHESIOLOGIST';
}

export interface Patient {
  name: string;
  id: string;
  age: number;
  bloodType?: string;
}

export interface Procedure {
  name: string;
  startTime: string; // ISO string or time string
  estimatedDuration: number; // in minutes
  progress: number; // 0-100
}

export interface OperatingRoom {
  id: string;
  name: string;
  department: string;
  status: RoomStatus;
  queueCount: number;
  operations24h: number; 
  staff: {
    doctor: Staff;
    nurse: Staff;
    anesthesiologist?: Staff;
  };
  isSeptic?: boolean;
  isEmergency?: boolean;
  isLocked?: boolean;
  currentStepIndex: number; // Index aktuální fáze workflow (0-7)
  
  // Extended details for interactivity
  currentPatient?: Patient;
  currentProcedure?: Procedure;
  estimatedEndTime?: string; // ISO String
}