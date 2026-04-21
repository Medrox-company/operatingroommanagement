
import { OperatingRoom, RoomStatus } from './types';
import {
  User,
  LayoutGrid,
  CalendarDays,
  Settings,
  Activity,
  AlertCircle,
  UserCheck,
  Syringe,
  Scissors,
  Star,
  Sparkles,
  BarChart3
} from 'lucide-react';

export interface SubDepartment {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  subDepartments: SubDepartment[];
  accentColor: string;
}

export const DEFAULT_DEPARTMENTS: Department[] = [
  {
    id: 'tra',
    name: 'Traumatologie',
    description: 'Léčba úrazů a poranění',
    isActive: true,
    subDepartments: [],
    accentColor: '#00D8C1',
  },
  {
    id: 'chir',
    name: 'Chirurgie',
    description: 'Chirurgické výkony',
    isActive: true,
    subDepartments: [
      { id: 'chir-hpb', name: 'HPB (játra, pankreas, žlučník)', isActive: true },
      { id: 'chir-cevni', name: 'Cévní chirurgie', isActive: true },
      { id: 'chir-detske', name: 'Dětská chirurgie', isActive: true },
      { id: 'chir-mammo', name: 'Mammo chirurgie', isActive: true },
      { id: 'chir-prokto', name: 'Proktochirurgie', isActive: true },
    ],
    accentColor: '#7C3AED',
  },
  {
    id: 'neurochir',
    name: 'Neurochirurgie',
    description: 'Chirurgie nervové soustavy',
    isActive: true,
    subDepartments: [],
    accentColor: '#06B6D4',
  },
  {
    id: 'uro',
    name: 'Urologie',
    description: 'Léčba urogenitálního systému',
    isActive: true,
    subDepartments: [],
    accentColor: '#EC4899',
  },
  {
    id: 'gyn',
    name: 'Gynekologie',
    description: 'Gynekologické výkony',
    isActive: true,
    subDepartments: [],
    accentColor: '#F59E0B',
  },
  {
    id: 'orl',
    name: 'ORL',
    description: 'Otolaryngologie',
    isActive: true,
    subDepartments: [],
    accentColor: '#3B82F6',
  },
  {
    id: 'oftalmologie',
    name: 'Oftalmologie',
    description: 'Oční lékařství',
    isActive: true,
    subDepartments: [],
    accentColor: '#8B5CF6',
  },
  {
    id: 'ortopedicka',
    name: 'Ortopedická chirurgie',
    description: 'Ortopedické výkony',
    isActive: true,
    subDepartments: [],
    accentColor: '#14B8A6',
  },
];


// Main workflow steps (8 steps) - synchronized with database workflow_statuses
// Note: "Volání pacienta" and "Příjezd do operačního traktu" are SPECIAL statuses (buttons)
export const WORKFLOW_STEPS = [
  { name: "Sál připraven",                  title: "Sál připraven",                  organizer: "Vedoucí sestra",    status: "Připraven",       color: '#6B7280', Icon: Sparkles  },
  { name: "Příjezd na sál",                 title: "Příjezd na sál",                 organizer: "Příjmový tým",      status: "Na sále",         color: '#8B5CF6', Icon: UserCheck },
  { name: "Začátek anestezie",              title: "Začátek anestezie",              organizer: "Anesteziolog",      status: "Anestezie",       color: '#EC4899', Icon: Syringe  },
  { name: "Začátek chirurgického výkonu",   title: "Chirurgický výkon",              organizer: "Chirurg",           status: "Operace",         color: '#EF4444', Icon: Scissors },
  { name: "Ukončení chirurgického výkonu",  title: "Ukončení výkonu",                organizer: "Chirurg",           status: "Dokončování",     color: '#F59E0B', Icon: Star     },
  { name: "Ukončení anestezie",             title: "Ukončení anestezie",             organizer: "Anesteziolog",      status: "Probouzení",      color: '#A855F7', Icon: Activity },
  { name: "Odjezd ze sálu",                 title: "Odjezd ze sálu",                 organizer: "Příjmový tým",      status: "Odjezd",          color: '#10B981', Icon: Activity },
  { name: "Úklid sálu",                     title: "Úklid sálu",                     organizer: "Sanitární tým",     status: "Úklid",           color: '#F97316', Icon: Sparkles },
];

// Special statuses (activated by buttons, not part of main sequential workflow)
export const SPECIAL_STATUSES = [
  { id: "status-pause",          name: "Pauza",                       color: '#22D3EE', icon: 'Pause',    special_type: 'pause'               },
  { id: "status-hygiene",        name: "Hygienický režim",            color: '#FBBF24', icon: 'Shield',   special_type: 'hygiene'             },
  { id: "status-patient-called", name: "Volání pacienta",             color: '#3B82F6', icon: 'Phone',    special_type: 'patient_called'      },
  { id: "status-patient-tract",  name: "Příjezd do operačního traktu", color: '#06B6D4', icon: 'Building', special_type: 'patient_arrived_tract' },
];

export const STEP_DURATIONS = [
  0,   // Sál připraven (výchozí stav, netrvá)
  5,   // Příjezd na sál
  20,  // Začátek anestezie
  60,  // Začátek chirurgického výkonu (přepsáno délkou procedury)
  10,  // Ukončení chirurgického výkonu
  15,  // Ukončení anestezie
  10,  // Odjezd ze sálu
  15,  // Úklid sálu
];

export const STEP_COLORS: Record<number, { bg: string; fill: string; border: string; text: string; glow: string; solid: string }> = {
  0: { bg: 'rgba(107,114,128,0.15)', fill: 'rgba(107,114,128,0.35)', border: 'rgba(107,114,128,0.25)', text: '#6B7280', glow: 'rgba(107,114,128,0.2)', solid: '#6B7280' },  // Sál připraven
  1: { bg: 'rgba(139,92,246,0.15)',  fill: 'rgba(139,92,246,0.35)',  border: 'rgba(139,92,246,0.25)',  text: '#8B5CF6', glow: 'rgba(139,92,246,0.2)',  solid: '#8B5CF6' },  // Příjezd na sál
  2: { bg: 'rgba(236,72,153,0.15)',  fill: 'rgba(236,72,153,0.35)',  border: 'rgba(236,72,153,0.25)',  text: '#EC4899', glow: 'rgba(236,72,153,0.2)',  solid: '#EC4899' },  // Začátek anestezie
  3: { bg: 'rgba(239,68,68,0.15)',   fill: 'rgba(239,68,68,0.35)',   border: 'rgba(239,68,68,0.25)',   text: '#EF4444', glow: 'rgba(239,68,68,0.2)',   solid: '#EF4444' },  // Chirurgický výkon
  4: { bg: 'rgba(245,158,11,0.15)',  fill: 'rgba(245,158,11,0.35)',  border: 'rgba(245,158,11,0.25)',  text: '#F59E0B', glow: 'rgba(245,158,11,0.2)',  solid: '#F59E0B' },  // Ukončení výkonu
  5: { bg: 'rgba(168,85,247,0.15)',  fill: 'rgba(168,85,247,0.35)',  border: 'rgba(168,85,247,0.25)',  text: '#A855F7', glow: 'rgba(168,85,247,0.2)',  solid: '#A855F7' },  // Ukončení anestezie
  6: { bg: 'rgba(16,185,129,0.15)',  fill: 'rgba(16,185,129,0.35)',  border: 'rgba(16,185,129,0.25)',  text: '#10B981', glow: 'rgba(16,185,129,0.2)',  solid: '#10B981' },  // Odjezd ze sálu
  7: { bg: 'rgba(249,115,22,0.15)',  fill: 'rgba(249,115,22,0.35)',  border: 'rgba(249,115,22,0.25)',  text: '#F97316', glow: 'rgba(249,115,22,0.2)',  solid: '#F97316' },  // Úklid sálu
};

export const SIDEBAR_ITEMS = [
  { icon: LayoutGrid, label: 'Přehled', id: 'dashboard' },
  { icon: CalendarDays, label: 'Timeline', id: 'timeline' },
  { icon: BarChart3, label: 'Statistiky', id: 'statistics' },
  { icon: User, label: 'Personál', id: 'staff' },
  { icon: AlertCircle, label: 'Upozornění', id: 'alerts' },
  { icon: Settings, label: 'Nastavení', id: 'settings' },
];

export const MOCK_ROOMS: OperatingRoom[] = [
  {
    id: '1',
    name: 'Sál č. 1',
    department: 'TRA',
    status: RoomStatus.BUSY,
    queueCount: 0,
    operations24h: 4,
    currentStepIndex: 3, // Chirurgický výkon
    isEmergency: false,
    isLocked: false,
    estimatedEndTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    staff: {
      doctor: { name: 'MUDr. Procházka', role: 'DOCTOR' },
      nurse: { name: 'Bc. Veselá', role: 'NURSE' },
      anesthesiologist: { name: 'MUDr. Jelínek', role: 'ANESTHESIOLOGIST' }
    },
    currentPatient: {
      name: 'Eva Nováková',
      id: '755210/5678',
      age: 48,
      bloodType: 'B-'
    },
    currentProcedure: {
      name: 'Artroskopie ramene',
      startTime: '08:00',
      estimatedDuration: 120,
      progress: 75
    }
  },
  {
    id: '2',
    name: 'Sál č. 2',
    department: 'CHIR',
    status: RoomStatus.BUSY,
    queueCount: 1,
    operations24h: 6,
    currentStepIndex: 4, // Ukončení výkonu
    isEmergency: false,
    isLocked: false,
    staff: {
      doctor: { name: 'MUDr. Svoboda', role: 'DOCTOR' },
      nurse: { name: 'Bc. Malá', role: 'NURSE' },
      anesthesiologist: { name: 'MUDr. Černý', role: 'ANESTHESIOLOGIST' }
    },
    currentPatient: {
      name: 'Jan Novotný',
      id: '850102/1234',
      age: 42,
      bloodType: 'A+'
    },
    currentProcedure: {
      name: 'Laparoskopická cholecystektomie',
      startTime: '10:00',
      estimatedDuration: 90,
      progress: 90
    }
  },
  {
    id: '3',
    name: 'Sál č. 3',
    department: 'TRA',
    status: RoomStatus.FREE,
    queueCount: 0,
    operations24h: 3,
    currentStepIndex: 0, // Sál připraven
    isEmergency: false,
    isLocked: false,
    staff: {
      doctor: { name: 'MUDr. Kučera', role: 'DOCTOR' },
      nurse: { name: 'Bc. Horáková', role: 'NURSE' },
      anesthesiologist: { name: 'MUDr. Černý', role: 'ANESTHESIOLOGIST' }
    },
    currentPatient: {
      name: 'Pavel Černý',
      id: '680315/4321',
      age: 56,
      bloodType: 'O+'
    },
    currentProcedure: {
      name: 'Náhrada kyčelního kloubu',
      startTime: '09:30',
      estimatedDuration: 180,
      progress: 0
    }
  },
  {
    id: '4',
    name: 'Sál č. 4',
    department: 'CHIR',
    status: RoomStatus.FREE,
    queueCount: 0,
    operations24h: 5,
    currentStepIndex: 0, // Sál připraven
    isEmergency: false,
    isLocked: false,
    staff: {
      doctor: { name: 'MUDr. Zeman', role: 'DOCTOR' },
      nurse: { name: 'Bc. Králová', role: 'NURSE' },
      anesthesiologist: { name: 'MUDr. Kovář', role: 'ANESTHESIOLOGIST' }
    },
    currentPatient: {
      name: 'Lucie Bílá',
      id: '905525/6789',
      age: 33,
      bloodType: 'A-'
    },
    currentProcedure: {
      name: 'Operace štítné žlázy',
      startTime: '11:00',
      estimatedDuration: 150,
      progress: 0
    }
  },
  {
    id: '5',
    name: 'Sál č. 5',
    department: 'CHIR',
    status: RoomStatus.FREE,
    queueCount: 0,
    operations24h: 2,
    currentStepIndex: 0, // Sál připraven
    isEmergency: false,
    isLocked: false,
    staff: {
      doctor: { name: 'MUDr. Svoboda', role: 'DOCTOR' },
      nurse: { name: 'Bc. Malá', role: 'NURSE' },
      anesthesiologist: { name: 'MUDr. Marek', role: 'ANESTHESIOLOGIST' }
    },
    currentPatient: {
      name: 'Karel Vorel',
      id: '550101/1122',
      age: 69,
      bloodType: 'AB+'
    },
    currentProcedure: {
      name: 'Bypass koronární arterie',
      startTime: '07:45',
      estimatedDuration: 360,
      progress: 0
    }
  },
  {
    id: '6',
    name: 'DaVinci',
    department: 'ROBOT',
    status: RoomStatus.FREE,
    queueCount: 0,
    operations24h: 3,
    currentStepIndex: 0, // Sál připraven
    isEmergency: false,
    isLocked: false,
    staff: {
      doctor: { name: 'MUDr. Novák', role: 'DOCTOR' },
      nurse: { name: 'Bc. Dvořáková', role: 'NURSE' },
      anesthesiologist: { name: 'MUDr. Kovář', role: 'ANESTHESIOLOGIST' }
    },
    currentPatient: {
      name: 'Petr Veselý',
      id: '780515/9988',
      age: 55,
      bloodType: '0-'
    },
    currentProcedure: {
      name: 'Robotická prostatektomie',
      startTime: '08:30',
      estimatedDuration: 240,
      progress: 0
    }
  },
  {
    id: '7',
    name: 'Sál č. 7',
    department: 'URO',
    status: RoomStatus.FREE,
    queueCount: 0,
    operations24h: 4,
    currentStepIndex: 0, // Sál připraven
    isEmergency: false,
    isLocked: false,
    staff: {
      doctor: { name: 'MUDr. Fiala', role: 'DOCTOR' },
      nurse: { name: 'Bc. Pokorná', role: 'NURSE' },
      anesthesiologist: { name: 'MUDr. Černý', role: 'ANESTHESIOLOGIST' }
    },
    currentPatient: {
      name: 'Martin Dlouhý',
      id: '820818/7766',
      age: 41,
      bloodType: 'O-'
    },
    currentProcedure: {
      name: 'Nefrektomie',
      startTime: '12:00',
      estimatedDuration: 200,
      progress: 0
    }
  },
  {
    id: '8',
    name: 'Sál č. 8',
    department: 'ORL',
    status: RoomStatus.FREE,
    queueCount: 0,
    operations24h: 8,
    currentStepIndex: 0, // Sál připraven
    isEmergency: false,
    isLocked: false,
    staff: {
      doctor: { name: 'MUDr. Krátký', role: 'DOCTOR' },
      nurse: { name: 'Bc. Jelínková', role: 'NURSE' },
      anesthesiologist: { name: 'MUDr. Kovář', role: 'ANESTHESIOLOGIST' }
    },
    currentPatient: {
      name: 'Jana Malá',
      id: '056012/3344',
      age: 18,
      bloodType: 'A+'
    },
    currentProcedure: {
      name: 'Tonzilektomie',
      startTime: '13:00',
      estimatedDuration: 60,
      progress: 0
    }
  },
  {
    id: '9',
    name: 'Sál č. 9',
    department: 'CÉVNÍ',
    status: RoomStatus.FREE,
    queueCount: 0,
    operations24h: 4,
    currentStepIndex: 0, // Sál připraven
    isEmergency: false,
    isLocked: false,
    staff: {
      doctor: { name: 'MUDr. Beneš', role: 'DOCTOR' },
      nurse: { name: 'Bc. Dvořáková', role: 'NURSE' },
      anesthesiologist: { name: 'MUDr. Veselý', role: 'ANESTHESIOLOGIST' }
    },
    currentPatient: {
      name: 'František Vlk',
      id: '491102/4455',
      age: 74,
      bloodType: 'B+'
    },
    currentProcedure: {
      name: 'Endarterektomie karotidy',
      startTime: '10:30',
      estimatedDuration: 120,
      progress: 0
    }
  },
  {
    id: '10',
    name: 'Sál č. 10',
    department: 'HPB + PLICNÍ',
    status: RoomStatus.FREE,
    queueCount: 0,
    operations24h: 3,
    currentStepIndex: 0, // Sál připraven
    isEmergency: false,
    isLocked: false,
    staff: {
      doctor: { name: 'MUDr. Horáková', role: 'DOCTOR' },
      nurse: { name: 'Bc. Králová', role: 'NURSE' },
      anesthesiologist: { name: 'MUDr. Kovář', role: 'ANESTHESIOLOGIST' }
    },
    currentPatient: {
      name: 'Jana Rychlá',
      id: '505101/0011',
      age: 73,
      bloodType: 'B+'
    },
    currentProcedure: {
      name: 'Resekce jater',
      startTime: '09:15',
      estimatedDuration: 300,
      progress: 0
    }
  },
  {
    id: '11',
    name: 'Sál č. 11',
    department: 'DĚTSKÉ',
    status: RoomStatus.FREE,
    queueCount: 0,
    operations24h: 9,
    currentStepIndex: 0, // Sál připraven
    isEmergency: false,
    isLocked: false,
    staff: {
      doctor: { name: 'MUDr. Růžička', role: 'DOCTOR' },
      nurse: { name: 'Bc. Holá', role: 'NURSE' },
      anesthesiologist: { name: 'MUDr. Marek', role: 'ANESTHESIOLOGIST' }
    },
    currentPatient: {
      name: 'Anna Poláková',
      id: '185405/7890',
      age: 5,
      bloodType: 'O+'
    },
    currentProcedure: {
      name: 'Operace tříselné kýly',
      startTime: '14:00',
      estimatedDuration: 45,
      progress: 0
    }
  },
  {
    id: '12',
    name: 'Sál č. 12',
    department: 'MAMMO',
    status: RoomStatus.FREE,
    queueCount: 0,
    operations24h: 7,
    currentStepIndex: 0, // Sál připraven
    isEmergency: false,
    isLocked: false,
    staff: {
      doctor: { name: 'MUDr. Horáková', role: 'DOCTOR' },
      nurse: { name: 'Bc. Nová', role: 'NURSE' },
      anesthesiologist: { name: 'MUDr. Jelínek', role: 'ANESTHESIOLOGIST' }
    },
    currentPatient: {
      name: 'Marie Kopecká',
      id: '655903/1212',
      age: 58,
      bloodType: 'A+'
    },
    currentProcedure: {
      name: 'Lumpektomie',
      startTime: '08:45',
      estimatedDuration: 90,
      progress: 0
    }
  }
];
