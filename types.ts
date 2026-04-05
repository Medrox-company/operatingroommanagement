
export enum RoomStatus {
  FREE = 'FREE',
  BUSY = 'BUSY',
  CLEANING = 'CLEANING',
  MAINTENANCE = 'MAINTENANCE'
}

export type SkillLevel = 'L3' | 'L2' | 'L1' | 'A' | 'SR' | 'N' | 'S';

export interface Staff {
  id?: string;
  name: string | null;
  role: 'DOCTOR' | 'NURSE' | 'ANESTHESIOLOGIST';
  skill_level?: SkillLevel;
  availability?: number; // 0-100
  is_external?: boolean;
  is_recommended?: boolean;
  is_active?: boolean;
  sick_leave_days?: number;
  vacation_days?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
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

// Working hours for a specific day
export interface DayWorkingHours {
  enabled: boolean;       // Whether the room operates this day
  startHour: number;      // Start hour (0-23)
  startMinute: number;    // Start minute (0-59)
  endHour: number;        // End hour (0-23)
  endMinute: number;      // End minute (0-59)
}

// Weekly schedule for a room
export interface WeeklySchedule {
  monday: DayWorkingHours;
  tuesday: DayWorkingHours;
  wednesday: DayWorkingHours;
  thursday: DayWorkingHours;
  friday: DayWorkingHours;
  saturday: DayWorkingHours;
  sunday: DayWorkingHours;
}

// Default working hours
export const DEFAULT_WORKING_HOURS: DayWorkingHours = {
  enabled: true,
  startHour: 7,
  startMinute: 0,
  endHour: 15,
  endMinute: 30,
};

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  monday: { ...DEFAULT_WORKING_HOURS },
  tuesday: { ...DEFAULT_WORKING_HOURS },
  wednesday: { ...DEFAULT_WORKING_HOURS },
  thursday: { ...DEFAULT_WORKING_HOURS },
  friday: { ...DEFAULT_WORKING_HOURS },
  saturday: { enabled: false, startHour: 7, startMinute: 0, endHour: 12, endMinute: 0 },
  sunday: { enabled: false, startHour: 7, startMinute: 0, endHour: 12, endMinute: 0 },
};

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
  isEnhancedHygiene?: boolean; // Zvýšený hygienický režim
  isPaused?: boolean; // Pauza operace
  patientCalledAt?: string | null; // ISO timestamp kdy byl pacient zavolán
  patientArrivedAt?: string | null; // ISO timestamp kdy pacient přijel
  phaseStartedAt?: string | null; // ISO timestamp začátku aktuální fáze
  operationStartedAt?: string | null; // ISO timestamp kdy začala operace (Příjezd na sál)
  statusHistory?: Array<{ stepIndex: number; startedAt: string; color?: string; stepName?: string }>; // Historie změn statusů
  completedOperations?: Array<{ 
    startedAt: string; // ISO timestamp začátku operace
    endedAt: string; // ISO timestamp konce operace
    statusHistory: Array<{ stepIndex: number; startedAt: string; color?: string; stepName?: string }>; // Historie změn statusů
  }>; // Dokončené operace daného dne
  currentStepIndex: number; // Index aktuální fáze workflow (0-7)
  
  // Working hours schedule
  weeklySchedule?: WeeklySchedule;
  
  // Extended details for interactivity
  currentPatient?: Patient;
  currentProcedure?: Procedure;
  estimatedEndTime?: string; // ISO String
}
