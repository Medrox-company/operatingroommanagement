
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
  SprayCan,
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


export const WORKFLOW_STEPS = [
  { title: "Příjezd na sál", organizer: "Příjmový tým", status: "Probíhá", color: '#A78BFA', Icon: UserCheck },
  { title: "Začátek anestezie", organizer: "MUDr. Jelínek", status: "Kritické", color: '#2DD4BF', Icon: Syringe },
  { title: "Chirurgický výkon", organizer: "MUDr. Procházka", status: "Operační fáze", color: '#FF3B30', Icon: Scissors },
  { title: "Ukončení výkonu", organizer: "MUDr. Procházka", status: "Dokončování", color: '#FBBF24', Icon: Star },
  { title: "Ukončení anestezie", organizer: "Anest. sestra", status: "Monitoring", color: '#818CF8', Icon: Activity },
  { title: "Úklid sálu", organizer: "Sanitární tým", status: "Sanitace", color: '#F97316', Icon: SprayCan },
  { title: "Sál připraven", organizer: "Vedoucí sestra", status: "Volno", color: '#34C759', Icon: Sparkles },
];

export const STEP_DURATIONS = [
  15, // Příjezd na sál
  30, // Začátek anestezie
  60, // Chirurgický výkon (placeholder, will be overridden by procedure duration)
  15, // Ukončení výkonu
  30, // Ukončení anestezie
  30, // Úklid sálu
  0   // Sál připraven
];

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
    currentStepIndex: 2,
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
    currentStepIndex: 3,
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
    currentStepIndex: 6,
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
    currentStepIndex: 6,
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
    currentStepIndex: 6,
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
    currentStepIndex: 6,
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
    currentStepIndex: 6,
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
    currentStepIndex: 6,
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
    currentStepIndex: 6,
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
    currentStepIndex: 6,
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
    currentStepIndex: 6,
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
    currentStepIndex: 6,
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
