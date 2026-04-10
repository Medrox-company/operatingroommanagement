# Kompletní Dokumentace Aplikace - Operating Room Management System

## 1. PŘEHLED APLIKACE

### 1.1 Účel aplikace
Aplikace slouží pro **řízení a monitoring operačních sálů** v nemocničním prostředí. Umožňuje:
- Real-time sledování stavu všech operačních sálů
- Správu workflow jednotlivých operací (8 fází)
- Přiřazování personálu k sálům
- Statistické přehledy a analýzy
- Časovou osu operací
- Správu směn a rozpisů

### 1.2 Technologický stack
- **Frontend**: React 18.3.1, Next.js 15.2.4
- **Styling**: Tailwind CSS 3.4.1
- **Animace**: Framer Motion 11.11.17
- **Ikony**: Lucide React 0.454.0
- **Grafy**: Recharts 2.13.0
- **Backend/DB**: Supabase (PostgreSQL + Realtime)
- **Jazyk**: TypeScript 5.8.2

---

## 2. ARCHITEKTURA APLIKACE

### 2.1 Struktura souborů
```
/
├── App.tsx                     # Hlavní komponenta aplikace
├── types.ts                    # TypeScript definice typů
├── constants.ts                # Konstanty, mock data, workflow kroky
├── app/
│   ├── page.tsx               # Next.js vstupní stránka
│   ├── layout.tsx             # Root layout
│   └── api/
│       ├── rooms/route.ts     # API endpoint pro operační sály
│       ├── workflow-statuses/route.ts  # API pro workflow statusy
│       └── operating-rooms/reorder/route.ts  # API pro přeřazování
├── components/
│   ├── RoomCard.tsx           # Karta operačního sálu (dashboard)
│   ├── RoomDetail.tsx         # Detailní zobrazení sálu
│   ├── TimelineModule.tsx     # Modul časové osy
│   ├── StatisticsModule.tsx   # Statistiky a analýzy
│   ├── StaffManager.tsx       # Správa personálu
│   ├── OperatingRoomsManager.tsx  # Správa operačních sálů
│   ├── SettingsPage.tsx       # Nastavení aplikace
│   ├── AdminModule.tsx        # Administrátorský modul
│   ├── LoginPage.tsx          # Přihlašovací stránka
│   ├── Sidebar.tsx            # Postranní navigace (desktop)
│   ├── MobileNav.tsx          # Spodní navigace (mobile)
│   ├── TopBar.tsx             # Horní panel
│   ├── ErrorBoundary.tsx      # Zachycení chyb
│   ├── AnimatedCounter.tsx    # Animovaný počítadlo
│   ├── StaffPickerModal.tsx   # Modal pro výběr personálu
│   ├── StatusesManager.tsx    # Správa workflow statusů
│   ├── DepartmentsManager.tsx # Správa oddělení
│   ├── ScheduleManager.tsx    # Správa rozvrhů
│   ├── ShiftScheduleManager.tsx # Správa směn
│   ├── BackgroundManager.tsx  # Správa pozadí
│   ├── NotificationsManager.tsx # Správa notifikací
│   └── PlaceholderView.tsx    # Placeholder komponenta
├── contexts/
│   ├── AuthContext.tsx        # Autentizace a oprávnění
│   └── WorkflowStatusesContext.tsx  # Workflow statusy
├── hooks/
│   ├── useEmergencyAlert.ts   # Hook pro nouzové alarmy
│   ├── useRealtimeSubscription.ts  # Hook pro realtime
│   ├── useEmailNotifications.ts    # Hook pro email notifikace
│   └── useWorkflowStatuses.ts      # Hook pro workflow
├── lib/
│   ├── db.ts                  # Databázová vrstva
│   ├── supabase.ts           # Supabase klient
│   ├── email.ts              # Email funkce
│   └── realtime-notifications.ts  # Realtime notifikace
└── scripts/                   # SQL skripty pro databázi
```

### 2.2 Datový tok
```
Supabase DB ←→ lib/db.ts ←→ App.tsx ←→ Komponenty
                   ↓
           Realtime Subscription
                   ↓
        Automatické aktualizace UI
```

---

## 3. DATOVÉ TYPY A STRUKTURY

### 3.1 OperatingRoom (Operační sál)
```typescript
interface OperatingRoom {
  id: string;                    // Unikátní ID sálu
  name: string;                  // Název (např. "Sál č. 1")
  department: string;            // Oddělení (TRA, CHIR, URO...)
  status: RoomStatus;            // FREE, BUSY, CLEANING, MAINTENANCE
  queueCount: number;            // Počet čekajících operací
  operations24h: number;         // Počet operací za 24h
  currentStepIndex: number;      // Aktuální fáze workflow (0-7)
  
  // Stavy sálu
  isEmergency?: boolean;         // Nouzový stav
  isLocked?: boolean;            // Uzamčený sál
  isPaused?: boolean;            // Pozastavená operace
  isSeptic?: boolean;            // Septický sál
  isEnhancedHygiene?: boolean;   // Zvýšený hygienický režim
  
  // Časové značky
  patientCalledAt?: string;      // Kdy byl pacient zavolán
  patientArrivedAt?: string;     // Kdy pacient přijel
  phaseStartedAt?: string;       // Začátek aktuální fáze
  operationStartedAt?: string;   // Začátek operace
  estimatedEndTime?: string;     // Odhadovaný konec
  
  // Personál
  staff: {
    doctor: Staff;               // Lékař
    nurse: Staff;                // Sestra
    anesthesiologist?: Staff;    // Anesteziolog
  };
  
  // Historie
  statusHistory?: StatusHistoryEntry[];      // Historie změn statusů
  completedOperations?: CompletedOperation[]; // Dokončené operace
  
  // Rozvrh
  weeklySchedule?: WeeklySchedule;  // Týdenní pracovní doba
  sort_order?: number;              // Pořadí zobrazení
}
```

### 3.2 Staff (Personál)
```typescript
interface Staff {
  id?: string;
  name: string | null;
  role: 'DOCTOR' | 'NURSE' | 'ANESTHESIOLOGIST';
  skill_level?: SkillLevel;      // L3, L2, L1, A, SR, N, S
  availability?: number;         // 0-100%
  is_external?: boolean;         // Externí pracovník
  is_recommended?: boolean;      // Doporučený
  is_active?: boolean;           // Aktivní
  sick_leave_days?: number;      // Dny nemocenské
  vacation_days?: number;        // Dny dovolené
  notes?: string;                // Poznámky
}
```

### 3.3 WorkflowStatus (Workflow status)
```typescript
interface WorkflowStatus {
  id: string;
  name: string;                  // Název statusu
  title: string;                 // Zobrazovaný titulek
  description: string | null;
  order_index: number;           // Pořadí v workflow
  sort_order: number;
  color: string;                 // Barva statusu
  accent_color: string;
  is_active: boolean;            // Aktivní status
  count_in_statistics: boolean;  // Počítat ve statistikách
  default_duration: number;      // Výchozí doba trvání
  show_in_timeline: boolean;     // Zobrazit v časové ose
  show_in_room_detail: boolean;  // Zobrazit v detailu sálu
  is_special: boolean;           // Speciální status (tlačítka)
  special_type: string | null;   // Typ speciálního statusu
}
```

### 3.4 WeeklySchedule (Týdenní rozvrh)
```typescript
interface WeeklySchedule {
  monday: DayWorkingHours;
  tuesday: DayWorkingHours;
  wednesday: DayWorkingHours;
  thursday: DayWorkingHours;
  friday: DayWorkingHours;
  saturday: DayWorkingHours;
  sunday: DayWorkingHours;
}

interface DayWorkingHours {
  enabled: boolean;              // Den je aktivní
  startHour: number;             // Začátek (0-23)
  startMinute: number;           // Minuta začátku
  endHour: number;               // Konec (0-23)
  endMinute: number;             // Minuta konce
}
```

---

## 4. WORKFLOW OPERACE (8 FÁZÍ)

### 4.1 Sekvenční fáze (0-7)
| Index | Název | Popis | Barva | Odpovědnost |
|-------|-------|-------|-------|-------------|
| 0 | Sál připraven | Výchozí stav, sál je připraven | #6B7280 | Vedoucí sestra |
| 1 | Příjezd na sál | Pacient přijel na sál | #8B5CF6 | Příjmový tým |
| 2 | Začátek anestezie | Anestezie zahájena | #EC4899 | Anesteziolog |
| 3 | Chirurgický výkon | Probíhá operace | #EF4444 | Chirurg |
| 4 | Ukončení výkonu | Operace dokončena | #F59E0B | Chirurg |
| 5 | Ukončení anestezie | Pacient se probouzí | #A855F7 | Anesteziolog |
| 6 | Odjezd ze sálu | Pacient odváží | #10B981 | Příjmový tým |
| 7 | Úklid sálu | Probíhá úklid | #F97316 | Sanitární tým |

### 4.2 Speciální statusy (tlačítka)
| Typ | Název | Popis | Barva |
|-----|-------|-------|-------|
| pause | Pauza | Pozastavení operace | #22D3EE |
| hygiene | Hygienický režim | Zvýšená hygiena | #FBBF24 |
| patient_called | Volání pacienta | Pacient zavolán | #3B82F6 |
| patient_arrived_tract | Příjezd do traktu | Pacient v traktu | #06B6D4 |

### 4.3 Přechody mezi fázemi
- Fáze se mění sekvenčně: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 0
- Po fázi 7 (Úklid) se automaticky resetuje na fázi 0 (Sál připraven)
- Při přechodu z fáze 6 na 0/7 se operace počítá jako dokončená

---

## 5. KOMPONENTY - DETAILNÍ POPIS

### 5.1 App.tsx - Hlavní komponenta

**Účel**: Centrální komponenta řídící celou aplikaci

**Stavy**:
- `rooms` - Pole všech operačních sálů
- `selectedRoomId` - ID vybraného sálu pro detail
- `currentView` - Aktuální modul (dashboard, timeline, statistics...)
- `isDbConnected` - Stav připojení k databázi
- `bgSettings` - Nastavení pozadí

**Klíčové funkce**:
```typescript
// Změna workflow fáze
handleStepChange(roomId: string, newStepIndex: number, stepColor?: string)

// Přepnutí nouzového stavu
toggleEmergency(roomId: string)

// Přepnutí zámku sálu
toggleLock(roomId: string)

// Změna času ukončení
handleEndTimeChange(roomId: string, newTime: Date | null)

// Změna personálu
handleStaffChange(roomId: string, role: string, staffId: string, staffName: string)

// Změna stavu pacienta
handlePatientStatusChange(roomId: string, calledAt: string | null, arrivedAt: string | null)

// Přepnutí hygienického režimu
handleEnhancedHygieneToggle(roomId: string, enabled: boolean)
```

**Realtime subscriptions**:
- Automatické aktualizace při změnách v databázi
- Debounce 2000ms pro prevenci flickeringu
- Cleanup interval pro memory management

### 5.2 RoomCard.tsx - Karta sálu

**Účel**: Zobrazení operačního sálu na dashboardu

**Props**:
```typescript
interface RoomCardProps {
  room: OperatingRoom;
  onClick?: () => void;
  onEmergency?: (e: React.MouseEvent) => void;
  onLock?: (e: React.MouseEvent) => void;
}
```

**Funkce**:
- Kruhový progress indikátor workflow
- Počítadlo dokončených operací za 24h (okno 7:00-6:59)
- Ikony stavu (emergency, locked, paused)
- Zobrazení personálu
- Indikátory volání/příjezdu pacienta

**Výpočet operací za 24h**:
```typescript
// Okno: 7:00 dnes → 6:59 zítra (nebo 7:00 včera → 6:59 dnes před 7:00)
const todayOperationCount = room.completedOperations.filter(op => {
  const opEnd = new Date(op.endedAt);
  return opEnd >= startOfWindow && opEnd <= endOfWindow;
}).length;
```

### 5.3 RoomDetail.tsx - Detail sálu

**Účel**: Detailní zobrazení a ovládání operačního sálu

**Funkce**:
- Workflow navigace (předchozí/další fáze)
- Úprava odhadovaného času ukončení (+/- 15 min)
- Tlačítko pauzy operace
- Výběr personálu (lékař, sestra)
- Volání pacienta / příjezd pacienta
- Přepnutí hygienického režimu
- Elapsed time counter pro aktuální fázi
- Navigace mezi sály (šipky vlevo/vpravo)

**Timery a cleanup**:
```typescript
// Cleanup při unmount
useEffect(() => {
  return () => {
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    if (endTimeTimeoutRef.current) clearTimeout(endTimeTimeoutRef.current);
    if (patientCallTimerRef.current) clearInterval(patientCallTimerRef.current);
  };
}, []);
```

### 5.4 TimelineModule.tsx - Časová osa

**Účel**: Gantt-chart zobrazení operací všech sálů

**Konstanty**:
```typescript
const TIMELINE_START_HOUR = 7;   // Začátek osy (7:00)
const TIMELINE_END_HOUR = 31;    // Konec osy (7:00 dalšího dne)
const TIMELINE_HOURS = 24;       // Délka okna
```

**Funkce**:
- 24-hodinová časová osa (7:00 → 7:00)
- Barevné bloky podle workflow fáze
- Indikátor aktuálního času (červená čára)
- Kliknutí na sál otevře detail
- Zobrazení přesahů (operace přes 15:30)
- Marker konce pracovní doby
- Responsivní design (mobile/desktop)

**Výpočet pozice na ose**:
```typescript
const getTimePercent = (date: Date): number => {
  const hours = date.getHours() + date.getMinutes() / 60;
  let percent = ((hours - TIMELINE_START_HOUR) / TIMELINE_HOURS) * 100;
  if (percent < 0) percent += (24 / TIMELINE_HOURS) * 100;
  return Math.max(0, Math.min(100, percent));
};
```

### 5.5 StatisticsModule.tsx - Statistiky

**Účel**: Analytické přehledy a grafy

**Záložky**:
- **Přehled**: Souhrn klíčových metrik
- **Sály**: Statistiky jednotlivých sálů
- **Fáze**: Analýza workflow fází
- **Heatmapa**: Vytížení podle dne/hodiny

**Období**:
- Den / Týden / Měsíc / Rok

**Grafy (Recharts)**:
- AreaChart - vytížení v čase
- BarChart - počty operací
- RadarChart - distribuce fází
- PieChart - rozdělení oddělení
- Heatmapa - 7×24 grid vytížení

### 5.6 StaffManager.tsx - Správa personálu

**Účel**: CRUD operace pro personál

**Funkce**:
- Seznam lékařů a sester
- Přidání nového personálu
- Úprava existujícího (skill level, dostupnost, poznámky)
- Mazání personálu
- Filtry podle role a aktivního stavu
- Vyhledávání podle jména

**Skill levels**:
| Kód | Význam | Barva |
|-----|--------|-------|
| L3 | Level 3 (senior) | Emerald |
| L2 | Level 2 | Cyan |
| L1 | Level 1 | Yellow |
| A | Absolvent | Orange |
| SR | Sekundární rezident | Purple |
| N | Nováček | Red |
| S | Stážista | Gray |

### 5.7 OperatingRoomsManager.tsx - Správa sálů

**Účel**: Správa operačních sálů a jejich rozvrhů

**Funkce**:
- Přidání nového sálu
- Úprava existujícího sálu
- Mazání sálu
- Nastavení týdenního rozvrhu (pracovní doba po dnech)
- Přeřazování pořadí sálů (drag & drop)
- Přiřazení oddělení

**Týdenní rozvrh**:
```typescript
// Výchozí pracovní doba: Po-Pá 7:00-15:30, So-Ne neaktivní
const DEFAULT_WEEKLY_SCHEDULE = {
  monday: { enabled: true, startHour: 7, startMinute: 0, endHour: 15, endMinute: 30 },
  // ... další dny
  saturday: { enabled: false, ... },
  sunday: { enabled: false, ... },
};
```

### 5.8 SettingsPage.tsx - Nastavení

**Účel**: Centrální hub pro konfiguraci aplikace

**Sekce**:
- Operační sály (OperatingRoomsManager)
- Personál (StaffManager)
- Workflow statusy (StatusesManager)
- Oddělení (DepartmentsManager)
- Směny (ShiftScheduleManager)
- Pozadí (BackgroundManager)
- Notifikace (NotificationsManager)

### 5.9 LoginPage.tsx - Přihlášení

**Účel**: Autentizace uživatelů

**Demo účty**:
- `admin@nemocnice.cz` / `admin123` - Administrátor
- `user@nemocnice.cz` / `user123` - Běžný uživatel

**Funkce**:
- Formulář pro email a heslo
- Validace vstupu
- Uložení session do localStorage
- Redirect po přihlášení

---

## 6. KONTEXTY

### 6.1 AuthContext

**Účel**: Správa autentizace a oprávnění

**Hodnoty**:
```typescript
interface AuthContextType {
  user: User | null;             // Přihlášený uživatel
  isLoading: boolean;            // Stav načítání
  isAuthenticated: boolean;      // Je přihlášen?
  isAdmin: boolean;              // Je admin?
  modules: AppModule[];          // Dostupné moduly
  login: (email, password) => Promise<Result>;
  logout: () => void;
  refreshModules: () => Promise<void>;
  toggleModule: (moduleId, enabled) => Promise<boolean>;
}
```

**Moduly aplikace**:
| ID | Název | Ikona | Barva |
|----|-------|-------|-------|
| dashboard | Dashboard | LayoutGrid | #00D8C1 |
| timeline | Timeline | Calendar | #A855F7 |
| statistics | Statistics | BarChart3 | #06B6D4 |
| staff | Staff | Users | #10B981 |
| alerts | Alerts | Bell | #EC4899 |
| settings | Settings | Settings | #64748B |

### 6.2 WorkflowStatusesContext

**Účel**: Centrální správa workflow statusů

**Hodnoty**:
```typescript
interface WorkflowStatusesContextValue {
  statuses: WorkflowStatus[];           // Všechny statusy
  activeStatuses: WorkflowStatus[];     // Pouze aktivní
  workflowStatuses: WorkflowStatus[];   // Aktivní bez speciálních
  statisticsStatuses: WorkflowStatus[]; // Pro statistiky
  loading: boolean;
  error: string | null;
  updateStatus: (id, updates) => Promise<void>;
  getStatusByIndex: (index) => WorkflowStatus | undefined;
  getStatusColor: (index) => string;
  refreshStatuses: () => Promise<void>;
}
```

---

## 7. HOOKS

### 7.1 useEmergencyAlert

**Účel**: Přehrávání zvukového alarmu při aktivaci nouzového stavu

**Funkce**:
- Web Audio API pro generování alarmu
- Unlock audio na mobilních zařízeních
- Detekce změny isEmergency z false na true
- Přehrání 5-cyklového střídavého tónu (880Hz/440Hz)

```typescript
export function useEmergencyAlert(rooms: OperatingRoom[], selectedRoomId: string | null) {
  // Sleduje změny isEmergency a přehrává alarm
}
```

### 7.2 useRealtimeSubscription

**Účel**: Správa Supabase realtime subscriptions

### 7.3 useEmailNotifications

**Účel**: Odesílání email notifikací

### 7.4 useWorkflowStatuses

**Účel**: Alternativní hook pro workflow statusy

---

## 8. DATABÁZOVÁ VRSTVA (lib/db.ts)

### 8.1 Konfigurace
```typescript
import { supabase, isSupabaseConfigured } from './supabase';

// Retry wrapper pro síťové chyby
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
```

### 8.2 CRUD Funkce

#### Operační sály
```typescript
// Načtení všech sálů
fetchOperatingRooms(): Promise<OperatingRoom[]>

// Aktualizace sálu
updateOperatingRoom(id: string, updates: Partial<DBOperatingRoom>): Promise<boolean>

// Vytvoření sálu
createOperatingRoom(roomData: CreateRoomData): Promise<boolean>

// Smazání sálu
deleteOperatingRoom(id: string): Promise<boolean>

// Realtime subscription
subscribeToOperatingRooms(
  onFullRefresh: () => void,
  onGranularUpdate: (roomId: string, changes: any) => void
): () => void
```

#### Personál
```typescript
fetchStaffMembers(): Promise<DBStaff[]>
updateStaffMember(id: string, updates: Partial<DBStaff>): Promise<boolean>
createStaffMember(data: CreateStaffData): Promise<string | null>
deleteStaffMember(id: string): Promise<boolean>
```

#### Workflow statusy
```typescript
fetchWorkflowStatuses(): Promise<WorkflowStatus[]>
updateWorkflowStatus(id: string, updates: Partial<WorkflowStatus>): Promise<boolean>
```

#### Statistiky
```typescript
fetchRoomStatistics(roomId?: string, period?: string): Promise<RoomStatistics>
fetchStatusHistory(roomId: string, date: string): Promise<StatusHistoryRow[]>
recordStatusEvent(roomId: string, stepIndex: number, color: string, name: string): Promise<void>
```

### 8.3 Transformace dat
```typescript
// DB row → App type
function transformRoom(
  row: DBOperatingRoom,
  staffMap: Map<string, DBStaff>,
  patientMap: Map<string, DBPatient>,
  procedureMap: Map<string, DBProcedure>
): OperatingRoom

// Granulární update (realtime)
function transformSingleRoom(
  roomId: string,
  dbChanges: Partial<DBOperatingRoom>,
  currentRoom: OperatingRoom
): Partial<OperatingRoom>
```

---

## 9. API ENDPOINTY

### 9.1 GET /api/rooms
Vrací všechny operační sály

### 9.2 GET /api/workflow-statuses
Vrací workflow statusy

### 9.3 POST /api/operating-rooms/reorder
Přeřazení pořadí sálů

---

## 10. DATABÁZOVÉ SCHÉMA (Supabase)

### 10.1 Tabulka: operating_rooms
| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | text | PRIMARY KEY |
| name | text | Název sálu |
| department | text | Oddělení |
| status | text | FREE/BUSY/CLEANING/MAINTENANCE |
| queue_count | integer | Počet ve frontě |
| operations_24h | integer | Operace za 24h |
| current_step_index | integer | Aktuální fáze (0-7) |
| is_emergency | boolean | Nouzový stav |
| is_locked | boolean | Uzamčen |
| is_paused | boolean | Pozastaven |
| is_septic | boolean | Septický |
| is_enhanced_hygiene | boolean | Zvýšená hygiena |
| patient_called_at | timestamptz | Volání pacienta |
| patient_arrived_at | timestamptz | Příjezd pacienta |
| phase_started_at | timestamptz | Začátek fáze |
| operation_started_at | timestamptz | Začátek operace |
| estimated_end_time | timestamptz | Odhadovaný konec |
| weekly_schedule | jsonb | Týdenní rozvrh |
| completed_operations | jsonb | Dokončené operace |
| status_history | jsonb | Historie statusů |
| sort_order | integer | Pořadí zobrazení |
| doctor_id | text | FK na staff |
| nurse_id | text | FK na staff |

### 10.2 Tabulka: staff
| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | uuid | PRIMARY KEY |
| name | text | Jméno |
| role | text | DOCTOR/NURSE |
| skill_level | text | L3/L2/L1/A/SR/N/S |
| availability | integer | Dostupnost 0-100 |
| is_external | boolean | Externí |
| is_recommended | boolean | Doporučený |
| is_active | boolean | Aktivní |
| sick_leave_days | integer | Nemocenské dny |
| vacation_days | integer | Dovolená |
| notes | text | Poznámky |

### 10.3 Tabulka: workflow_statuses
| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | uuid | PRIMARY KEY |
| name | text | Název statusu |
| description | text | Popis |
| sort_order | integer | Pořadí |
| accent_color | text | Barva |
| icon | text | Ikona |
| is_active | boolean | Aktivní |
| include_in_statistics | boolean | Ve statistikách |
| show_in_timeline | boolean | V časové ose |
| show_in_room_detail | boolean | V detailu |
| default_duration_minutes | integer | Výchozí doba |
| is_special | boolean | Speciální |
| special_type | text | Typ speciálního |

### 10.4 Tabulka: app_users
| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | uuid | PRIMARY KEY |
| email | text | UNIQUE |
| name | text | Jméno |
| role | text | admin/user |
| is_active | boolean | Aktivní |
| password_hash | text | Hash hesla |

### 10.5 Tabulka: app_modules
| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | text | PRIMARY KEY |
| name | text | Název modulu |
| description | text | Popis |
| is_enabled | boolean | Povolený |
| icon | text | Ikona |
| accent_color | text | Barva |
| sort_order | integer | Pořadí |

### 10.6 RLS Politiky
```sql
-- operating_rooms
CREATE POLICY "operating_rooms_read" ON operating_rooms FOR SELECT USING (true);
CREATE POLICY "operating_rooms_write" ON operating_rooms FOR ALL USING (true);

-- staff
CREATE POLICY "staff_read" ON staff FOR SELECT USING (true);
CREATE POLICY "staff_write" ON staff FOR ALL USING (true);

-- workflow_statuses
CREATE POLICY "workflow_statuses_read" ON workflow_statuses FOR SELECT USING (true);
CREATE POLICY "workflow_statuses_write" ON workflow_statuses FOR ALL USING (true);
```

---

## 11. REALTIME SYNCHRONIZACE

### 11.1 Subscription setup
```typescript
const unsubscribe = subscribeToOperatingRooms(
  // Full refresh (INSERT/DELETE)
  async () => {
    const dbRooms = await fetchOperatingRooms();
    setRooms(dbRooms);
  },
  // Granular update (UPDATE)
  (roomId, dbChanges) => {
    setRooms(prev => prev.map(r => 
      r.id === roomId ? { ...r, ...transformSingleRoom(roomId, dbChanges, r) } : r
    ));
  }
);
```

### 11.2 Debounce mechanismus
- Lokální update: uloží timestamp do `recentLocalUpdates`
- Realtime update: ignoruje pokud timestamp < 2000ms
- Cleanup: každých 10s maže staré záznamy

### 11.3 Granulární vs Full refresh
- **UPDATE**: Transformuje pouze změněné pole
- **INSERT/DELETE**: Plný refresh všech dat

---

## 12. CHYBOVÉ STAVY A RECOVERY

### 12.1 ErrorBoundary
```typescript
// Zachycuje React errors
// Automatický retry (max 3x)
// Fallback UI s tlačítkem "Zkusit znovu"
// Logování chyb do konzole
```

### 12.2 Network resilience
```typescript
// withRetry wrapper
// Max 3 pokusy
// Exponential backoff (1s, 2s, 3s)
// Detekce transientních chyb (network, timeout, connection)
```

### 12.3 Global error handlers
```typescript
// window.addEventListener('error', ...)
// window.addEventListener('unhandledrejection', ...)
// Prevence white screen
```

---

## 13. OPTIMALIZACE VÝKONU

### 13.1 Memoizace
- `useMemo` pro výpočetně náročné hodnoty
- `useCallback` pro handler funkce
- `React.memo` pro komponenty (RoomCard)

### 13.2 Lazy loading
- Dynamický import modulů
- Suspense boundaries

### 13.3 Memory management
- Cleanup timeoutů/intervalů při unmount
- WeakMap pro cache
- Periodický cleanup recentLocalUpdates

### 13.4 Debounce a throttling
- 2000ms debounce pro realtime updates
- Timeout pro API calls (5s)
- Cleanup interval (10s)

---

## 14. MOBILNÍ PODPORA

### 14.1 Responsive design
- Mobile-first přístup
- Tailwind breakpoints: `md:`, `lg:`
- Touch-friendly ovládání (min 44px)

### 14.2 MobileNav
- Spodní navigační lišta
- Ikony pro hlavní moduly
- Aktivní stav indikátor

### 14.3 Audio unlock
- Touch event listeners pro iOS
- Silent buffer playback
- SharedAudioContext

---

## 15. BEZPEČNOST

### 15.1 Autentizace
- Session v localStorage
- Role-based access (admin/user)
- Timeout při neaktivitě (plánováno)

### 15.2 Autorizace
- RLS politiky v Supabase
- Admin-only moduly
- Modulová oprávnění

### 15.3 Data validation
- TypeScript typy
- Optional chaining
- Null guards

---

## 16. ZÁVISLOSTI (package.json)

### 16.1 Production
```json
{
  "@supabase/supabase-js": "^2.43.0",  // Supabase klient
  "framer-motion": "^11.11.17",        // Animace
  "lucide-react": "^0.454.0",          // Ikony
  "next": "^15.2.4",                   // React framework
  "react": "^18.3.1",                  // UI knihovna
  "react-dom": "^18.3.1",              // React DOM
  "recharts": "^2.13.0"                // Grafy
}
```

### 16.2 Development
```json
{
  "@types/node": "^22.14.0",
  "@types/react": "^18.3.1",
  "@types/react-dom": "^18.3.1",
  "autoprefixer": "^10.4.18",
  "postcss": "^8.4.32",
  "tailwindcss": "^3.4.1",
  "typescript": "~5.8.2"
}
```

---

## 17. DEPLOYMENT

### 17.1 Vercel
- Automatický deploy z Git
- Preview deployments
- Environment variables

### 17.2 Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

---

## 18. TESTOVÁNÍ (Plánováno)

### 18.1 Unit testy
- Jest + React Testing Library
- Testování komponent
- Testování hooks

### 18.2 E2E testy
- Playwright/Cypress
- User flows
- Cross-browser

### 18.3 Performance testy
- Lighthouse
- Core Web Vitals
- Load testing

---

## 19. ZNÁMÉ LIMITACE

1. **Demo autentizace** - Hesla nejsou hashována (bcrypt)
2. **Offline mode** - Není implementován
3. **Push notifikace** - Pouze in-app
4. **Export dat** - Není implementován
5. **Audit log** - Pouze statusHistory pro sály

---

## 20. BUDOUCÍ VÝVOJ

1. PWA podpora
2. Push notifikace
3. Export do PDF/Excel
4. Pokročilé statistiky s ML
5. Integrace s nemocničním IS
6. Multi-tenant architektura
7. Offline-first s sync
8. Voice commands
9. AR/VR vizualizace
10. Prediktivní analýzy

---

*Dokumentace verze 1.0 - Aktualizováno: 2026-04-09*
