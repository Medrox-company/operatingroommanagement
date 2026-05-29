// ========== DESIGN TOKENS (Premium Medical Dashboard - Futuristic Control Center) ==========
export const C = {
  // Primary accent - Medical Cyan
  accent: '#06B6D4',
  cyan: '#06B6D4',

  // Status colors - Vivid & Professional
  green: '#10B981',       // Active/Success - Emerald
  yellow: '#F59E0B',      // Preparation/Warning - Amber
  orange: '#F97316',      // Alert - Orange
  red: '#EF4444',         // Delayed/Critical - Red
  purple: '#8B5CF6',      // Planning - Violet
  pink: '#EC4899',        // Special - Pink
  blue: '#3B82F6',        // Info - Blue
  slate: '#64748B',       // Completed - Slate

  // Surface & Glass Effects
  bgDeep: '#030712',                        // Deep space black
  bgSurface: 'rgb(0 9 29 / 85%)',           // Glass surface
  bgElevated: 'rgba(30, 41, 59, 0.9)',      // Elevated cards
  bgCard: 'rgba(15, 23, 42, 0.95)',         // Card background

  // Borders & Lines
  border: 'rgba(148, 163, 184, 0.08)',      // Subtle border
  borderHover: 'rgba(6, 182, 212, 0.3)',    // Cyan hover
  borderActive: 'rgba(6, 182, 212, 0.5)',   // Active state
  gridLine: 'rgba(148, 163, 184, 0.06)',    // Timeline grid

  // Glass & Glow
  glass: 'rgba(255, 255, 255, 0.02)',
  glassHover: 'rgba(6, 182, 212, 0.08)',
  glowCyan: '0 0 20px rgba(6, 182, 212, 0.4)',
  glowGreen: '0 0 16px rgba(16, 185, 129, 0.4)',
  glowRed: '0 0 16px rgba(239, 68, 68, 0.5)',

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

// Step colors podle step_index z databáze - dynamicky přepsáno z kontextu v renderování
export const STEP_INDEX_COLORS: Record<number, string> = {
  0: '#6b7280',
  1: '#8b5cf6',
  2: '#ec4899',
  3: '#ef4444',
  4: '#f59e0b',
  5: '#a855f7',
  6: '#10b981',
  7: '#f97316',
};
