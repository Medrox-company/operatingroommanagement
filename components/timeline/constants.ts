// ========== DESIGN TOKENS (Deep Navy Control Center — žlutý akcent, perwinkle) ==========
// Paleta inspirovaná moderními logistickými dashboardy: hluboká indigo-navy
// plocha, teplý žlutý primární akcent, perwinkle modrá pro informace a měkké
// pastelové statusové barvy, které na tmavém podkladu krásně září.
export const C = {
  // Primary accent — Medical Teal-Cyan (dle referenčního screenshotu)
  accent: '#36D9EC',
  cyan: '#36D9EC', // alias ponechán kvůli rozsáhlému použití v kódu

  // Status colors — chladné pastely ladící s teal podkladem
  green: '#34D399',       // Success — mint
  yellow: '#FBBF24',      // Warning — amber
  orange: '#FB923C',      // Alert — měkká oranžová
  red: '#F43F5E',         // Critical — rose
  purple: '#A78BFA',      // Planning — světlý violet
  pink: '#F472B6',        // Special — pastel pink
  blue: '#38BDF8',        // Info — sky blue
  slate: '#7E93A8',       // Completed — chladný slate

  // Surface & Glass Effects — hluboký teal-černý podklad (referenční screenshot)
  bgDeep: '#06141D',                        // Deep teal black
  bgSurface: 'rgb(7, 19, 27)',              // Glass surface
  bgElevated: 'rgba(16, 38, 50, 0.92)',     // Elevated cards
  bgCard: 'rgba(10, 26, 36, 0.96)',         // Card background
  bgPanel: 'rgba(8, 22, 31, 0.95)',         // Sticky panely / toolbar (neprůhledné)

  // Borders & Lines
  border: 'rgba(125, 165, 185, 0.12)',      // Subtle border (chladná)
  borderStrong: 'rgba(125, 165, 185, 0.20)',// Definovanější hrana (toolbar, panely)
  borderHover: 'rgba(54, 217, 236, 0.35)',  // Cyan hover
  borderActive: 'rgba(54, 217, 236, 0.55)', // Active state
  gridLine: 'rgba(125, 165, 185, 0.07)',    // Timeline grid

  // Glass & Glow
  glass: 'rgba(255, 255, 255, 0.025)',
  glassHover: 'rgba(54, 217, 236, 0.08)',
  glowCyan: '0 0 20px rgba(54, 217, 236, 0.40)',
  glowGreen: '0 0 16px rgba(52, 211, 153, 0.4)',
  glowRed: '0 0 16px rgba(244, 63, 94, 0.5)',

  // Text
  textHi: 'rgba(255, 255, 255, 0.95)',
  text: 'rgba(255, 255, 255, 0.80)',
  muted: 'rgba(255, 255, 255, 0.45)',
  faint: 'rgba(255, 255, 255, 0.25)',
};

// ========== TIMELINE LAYOUT CONSTANTS ==========
export const TIMELINE_START_HOUR = 7;
export const TIMELINE_END_HOUR = 31; // 7:00 next day (7 + 24 = 31)
export const TIMELINE_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR; // 24 hours
export const ROOM_LABEL_WIDTH = 320;
export const MIN_ROW_HEIGHT = 24; // Absolutní spodní hranice — pod tím už není čitelné (1 line truncate)
export const MAX_ROW_HEIGHT = 72; // Maximum row height (when few rooms)
export const ROW_GAP_PX = 6;      // gap-1.5 mezi řádky (Tailwind: 0.375rem = 6px) — musí korespondovat s `gap-1.5` v JSX
export const ROW_PADDING_PX = 8;  // py-2 vertikální padding kolem všech řádků (Tailwind: 0.5rem = 8px)
export const TIME_MARKERS = Array.from({ length: 25 }, (_, i) => i); // 0-24 for 24 hour markers

export const ROOM_COLOR_ORDER = ['orange', 'purple', 'pink', 'blue', 'green', 'red', 'cyan'] as const;

export const ROOM_COLORS: Record<string, { bg: string; border: string; stripe: string; text: string; glow: string }> = {
  orange: { bg: '#F97316', border: '#FB923C', stripe: '#FDBA74', text: '#FFF', glow: '0 0 20px rgba(249, 115, 22, 0.4)' },
  purple: { bg: '#8B5CF6', border: '#A78BFA', stripe: '#C4B5FD', text: '#FFF', glow: '0 0 20px rgba(139, 92, 246, 0.4)' },
  pink: { bg: '#EC4899', border: '#F472B6', stripe: '#F9A8D4', text: '#FFF', glow: '0 0 20px rgba(236, 72, 153, 0.4)' },
  blue: { bg: '#3B82F6', border: '#60A5FA', stripe: '#93C5FD', text: '#FFF', glow: '0 0 20px rgba(59, 130, 246, 0.4)' },
  green: { bg: '#10B981', border: '#34D399', stripe: '#6EE7B7', text: '#FFF', glow: '0 0 20px rgba(16, 185, 129, 0.4)' },
  red: { bg: '#EF4444', border: '#F87171', stripe: '#FCA5A5', text: '#FFF', glow: '0 0 20px rgba(239, 68, 68, 0.4)' },
  cyan: { bg: '#06B6D4', border: '#22D3EE', stripe: '#67E8F9', text: '#FFF', glow: '0 0 20px rgba(6, 182, 212, 0.4)' },
};

// Step colors podle step_index z databáze - dynamicky přepsáno z kontextu v renderování.
// Fallback paleta sladěná s navy/žlutým stylem — měkké pastely, které na tmavém
// podkladu příjemně září a jsou od sebe na první pohled rozlišitelné.
export const STEP_INDEX_COLORS: Record<number, string> = {
  0: '#8A94A6', // připraven — neutrální slate
  1: '#7C8CF8', // perwinkle
  2: '#F472B6', // pastel pink
  3: '#F43F5E', // rose — kritická fáze
  4: '#FFC83D', // signální žlutá
  5: '#A78BFA', // světlý violet
  6: '#34D399', // mint — dokončeno
  7: '#FB923C', // měkká oranžová
};
