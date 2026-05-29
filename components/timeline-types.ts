/**
 * Timeline Module Type Definitions
 * 
 * Kompletní typ-safe rozhraní pro TimelineModuleHIG
 */

/** Status timeline položky */
export type TimelineStatus = 
  | 'idle'        // Nevyužito
  | 'active'      // Probíhá
  | 'pending'     // Čeká na start
  | 'completed'   // Hotovo
  | 'error'       // Chyba
  | 'warning';    // Varování

/** Metadata klíče specifické pro operační sály */
export interface OperatingRoomMetadata {
  roomId?: string;                  // ID operačního sálu
  surgeon?: string;                 // Jméno chirurga
  procedure?: string;               // Typ procedury
  patientId?: string;               // ID pacienta
  isEmergency?: boolean;            // Je to nouzový zákrok?
  department?: string;              // Oddělení (ortho, cardiac, etc.)
  estimatedDuration?: number;       // Odhadovaná doba v minutách
  anesthesiologist?: string;        // Anesteziolog
  equipmentReq?: string[];          // Požadovaná zařízení
  notes?: string;                   // Poznámky
  [key: string]: any;               // Dalších vlastních polí
}

/** Jednotlivá položka na timeline */
export interface TimelineItemData {
  /** Jedinečný identifikátor */
  id: string;
  
  /** Název operace/aktivitu */
  label: string;
  
  /** Podrobný popis (viditelný na hover) */
  description?: string;
  
  /** Čas startu ve formátu HH:mm */
  startTime: string;
  
  /** Čas konce ve formátu HH:mm */
  endTime: string;
  
  /** Stav položky */
  status: TimelineStatus;
  
  /** Progress 0-100 pro aktivní operace */
  progress?: number;
  
  /** Metadata (room info, surgeon, patient, atd.) */
  metadata?: OperatingRoomMetadata;
  
  /** Přepsání výchozí barvy pro tento status */
  color?: string;
  
  /** Je položka interaktivní? */
  isInteractive?: boolean;
  
  /** Callback při kliku na položku */
  onClick?: () => void;
  
  /** Tooltip text viditelný na hover */
  tooltip?: string;
}

/** Barevné schéma pro timeline */
export interface TimelineColorScheme {
  background: string;           // Pozadí kontejneru
  surface: string;              // Primární povrch
  surfaceSecondary: string;     // Sekundární povrch (glass layer)
  border: string;               // Barva hranic
  text: string;                 // Primární text
  textSecondary: string;        // Sekundární text
  accent: string;               // Akcentní barva (current time, highlights)
}

/** Velikosti písma */
export interface FontSizeConfig {
  label?: string;               // Default: '14px'
  time?: string;                // Default: '12px'
  metadata?: string;            // Default: '11px'
}

/** Barvy pro jednotlivé stavy */
export type StatusColorMap = Record<TimelineStatus, string>;

/** Konfigurace Timeline modulu */
export interface TimelineConfig {
  // ========== DESIGN ==========
  
  /**
   * Výchozí barevné schéma
   * - 'system': Podle OS nastavení
   * - 'light': Světlý režim
   * - 'dark': Tmavý režim (default)
   */
  colorScheme: 'system' | 'light' | 'dark';
  
  /**
   * Vlastní barvy pro komponenty
   * Pokud není nastaveno, použijí se výchozí hodnoty
   */
  colors?: Partial<TimelineColorScheme>;
  
  /**
   * Barvy pro jednotlivé stavy
   * Může se dynamicky měnit
   */
  statusColors?: Partial<StatusColorMap>;
  
  // ========== TYPOGRAFIE ==========
  
  /** Font stack (default: -apple-system, BlinkMacSystemFont, "Segoe UI", ...) */
  fontFamily?: string;
  
  /** Velikosti písma */
  fontSize?: FontSizeConfig;
  
  // ========== LAYOUT ==========
  
  /** Počáteční hodina timeline (default: 7) */
  startHour?: number;
  
  /** Konečná hodina timeline (default: 31 = 7:00 příštího dne) */
  endHour?: number;
  
  /** Minuty mezi time markery (15, 30, 60, 120) (default: 60) */
  timeStep?: number;
  
  /** Výška řádku v pixelech (default: 56) */
  rowHeight?: number;
  
  /** Aktivovat kompaktní režim pro mobile? (default: false) */
  compactMode?: boolean;
  
  // ========== ANIMACE ==========
  
  /** Trvání animací v ms (default: 300) */
  animationDuration?: number;
  
  /** Povolit animace? (default: true) */
  showAnimations?: boolean;
  
  // ========== CHOVÁNÍ ==========
  
  /** Zobrazit indikátor aktuálního času? (default: true) */
  showCurrentTime?: boolean;
  
  /** Zobrazit popisky času? (default: true) */
  showTimeLabels?: boolean;
  
  /** Formát času ('12h' nebo '24h') (default: '24h') */
  hourFormat?: '12h' | '24h';
  
  /** Timezone pro časy (default: local) */
  timezone?: string;
}

/** Props pro TimelineModuleHIG komponent */
export interface TimelineModuleProps {
  /** Pole položek k zobrazení na timeline */
  items: TimelineItemData[];
  
  /** Konfigurace modulu (všechno volitelné) */
  config?: Partial<TimelineConfig>;
  
  /** Callback když uživatel klikne na položku */
  onItemClick?: (item: TimelineItemData) => void;
  
  /** Aktuální čas (default: new Date()) */
  currentTime?: Date;
  
  /** Je modul v loadingu? */
  loading?: boolean;
  
  /** Chybová zpráva k zobrazení */
  error?: string | null;
}

/** Export výchozí konfigurace */
export const DEFAULT_CONFIG: TimelineConfig = {
  colorScheme: 'dark',
  colors: {
    background: '#0F172A',
    surface: 'rgba(255,255,255,0.03)',
    surfaceSecondary: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.08)',
    text: 'rgba(255,255,255,0.95)',
    textSecondary: 'rgba(255,255,255,0.65)',
    accent: '#06B6D4',
  },
  statusColors: {
    idle: '#64748B',        // Slate
    active: '#06B6D4',      // Cyan
    pending: '#F59E0B',     // Amber
    completed: '#10B981',   // Emerald
    error: '#EF4444',       // Red
    warning: '#F97316',     // Orange
  },
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: {
    label: '14px',
    time: '12px',
    metadata: '11px',
  },
  startHour: 7,
  endHour: 31,
  timeStep: 60,
  rowHeight: 56,
  compactMode: false,
  animationDuration: 300,
  showAnimations: true,
  showCurrentTime: true,
  showTimeLabels: true,
  hourFormat: '24h',
};

/** Přednastavené konfigurační profily */
export const CONFIG_PRESETS = {
  /** Apple Modern Dark (default) */
  APPLE_MODERN: {
    colorScheme: 'dark',
    animationDuration: 400,
    showAnimations: true,
    rowHeight: 56,
  } as Partial<TimelineConfig>,

  /** Vysoký kontrast pro medicínská prostředí */
  HIGH_CONTRAST: {
    colorScheme: 'dark',
    colors: {
      background: '#000000',
      surface: 'rgba(255,255,255,0.08)',
      surfaceSecondary: 'rgba(255,255,255,0.12)',
      text: '#FFFFFF',
      accent: '#00FF00',
    },
    statusColors: {
      active: '#00FF00',
      error: '#FF0000',
      warning: '#FFFF00',
      completed: '#00FF00',
      idle: '#666666',
      pending: '#FFFF00',
    },
    rowHeight: 64,
  } as Partial<TimelineConfig>,

  /** Světlý režim */
  LIGHT: {
    colorScheme: 'light',
    colors: {
      background: '#FFFFFF',
      surface: 'rgba(0,0,0,0.03)',
      text: 'rgba(0,0,0,0.95)',
      accent: '#0891B2',
    },
  } as Partial<TimelineConfig>,

  /** Kompaktní pro mobile */
  COMPACT: {
    compactMode: true,
    rowHeight: 40,
    fontSize: {
      label: '12px',
      time: '10px',
      metadata: '9px',
    },
    timeStep: 120,
  } as Partial<TimelineConfig>,
};

/** Helper pro validaci timelineItemData */
export function validateTimelineItem(item: TimelineItemData): boolean {
  if (!item.id || !item.label) return false;
  if (!item.startTime || !item.endTime) return false;
  if (!['idle', 'active', 'pending', 'completed', 'error', 'warning'].includes(item.status)) {
    return false;
  }
  if (item.progress !== undefined && (item.progress < 0 || item.progress > 100)) {
    return false;
  }
  return true;
}

/** Helper pro formátování času */
export function formatTime(hours: number, format: '12h' | '24h'): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  if (format === '12h') {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  }

  return `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Helper pro vypočítání pozice na timeline */
export function getTimePercent(
  timeString: string,
  startHour: number,
  endHour: number
): number {
  const [h, m] = timeString.split(':').map(Number);
  const totalHours = endHour - startHour;
  const timeInHours = h + m / 60;
  const relativeHours = timeInHours - startHour;
  return Math.min(100, Math.max(0, (relativeHours / totalHours) * 100));
}

/**
 * Helper pro výpočet trvání operace v minutách
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;

  // Pokud endTime je menší než startTime, předpokládáme příští den
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return endMinutes - startMinutes;
}

/**
 * Helper pro vypočítání zbývajícího času
 */
export function calculateRemainingTime(
  endTime: string,
  currentTime: Date
): number | null {
  const [endH, endM] = endTime.split(':').map(Number);
  const endDate = new Date(currentTime);
  endDate.setHours(endH, endM, 0, 0);

  // Pokud endTime je v minulosti, přidej 24h (příští den)
  if (endDate < currentTime) {
    endDate.setDate(endDate.getDate() + 1);
  }

  const diff = endDate.getTime() - currentTime.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60))); // Vrátí minuty
}

/** Type-safe runtime validation */
export type TimelineValidationResult = 
  | { valid: true; data: TimelineItemData }
  | { valid: false; error: string };

export function validateAndNormalize(item: Partial<TimelineItemData>): TimelineValidationResult {
  if (!item.id) return { valid: false, error: 'Missing id' };
  if (!item.label) return { valid: false, error: 'Missing label' };
  if (!item.startTime) return { valid: false, error: 'Missing startTime' };
  if (!item.endTime) return { valid: false, error: 'Missing endTime' };
  if (!item.status) return { valid: false, error: 'Missing status' };

  return {
    valid: true,
    data: item as TimelineItemData,
  };
}
