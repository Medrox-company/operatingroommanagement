// ========== DESIGN TOKENS (Premium Medical Dashboard - Beautiful Gantt-Inspired Timeline) ==========
export const C = {
  // Primary accent - Medical Cyan
  accent: '#06B6D4',
  cyan: '#06B6D4',

  // Status colors - Vivid & Professional (inspired by Gantt timeline)
  green: '#10B981',       // Success/Complete - Emerald
  yellow: '#FBBF24',      // Preparation/Research - Amber (brightened for better visibility)
  orange: '#F97316',      // Alert/Surgery - Vibrant Orange
  red: '#EF4444',         // Delayed/Critical - Red
  purple: '#A855F7',      // Planning/Design - Vivid Purple (upgraded)
  pink: '#EC4899',        // Special - Pink
  blue: '#3B82F6',        // Info/Dev - Bright Blue
  slate: '#64748B',       // Completed - Slate
  
  // New vibrant colors for better Gantt-style palette
  indigo: '#6366F1',      // Indigo for variations
  teal: '#14B8A6',        // Teal alternative
  amber: '#F59E0B',       // Warm amber
  lime: '#84CC16',        // Fresh lime for new tasks

  // Surface & Glass Effects — sjednocená modro-černá hloubka (slate 950 → 900)
  bgDeep: '#030712',                        // Deep space black
  bgSurface: 'rgb(0, 6, 17)',                // Glass surface
  bgElevated: 'rgba(23, 33, 54, 0.92)',     // Elevated cards
  bgCard: 'rgba(13, 20, 38, 0.96)',         // Card background
  bgPanel: 'rgba(11, 17, 32, 0.95)',        // Sticky panely / toolbar (neprůhledné)

  // Borders & Lines — o něco definovanější pro lepší čitelnost hran
  border: 'rgba(148, 163, 184, 0.10)',      // Subtle border
  borderStrong: 'rgba(148, 163, 184, 0.18)',// Definovanější hrana (toolbar, panely)
  borderHover: 'rgba(6, 182, 212, 0.35)',   // Cyan hover
  borderActive: 'rgba(6, 182, 212, 0.55)',  // Active state
  gridLine: 'rgba(148, 163, 184, 0.06)',    // Timeline grid

  // Glass & Glow
  glass: 'rgba(255, 255, 255, 0.025)',
  glassHover: 'rgba(6, 182, 212, 0.08)',
  glowCyan: '0 0 20px rgba(6, 182, 212, 0.45)',
  glowGreen: '0 0 16px rgba(16, 185, 129, 0.4)',
  glowRed: '0 0 16px rgba(239, 68, 68, 0.5)',
  glowPurple: '0 0 18px rgba(168, 85, 247, 0.45)',
  glowBlue: '0 0 16px rgba(59, 130, 246, 0.4)',
  glowYellow: '0 0 18px rgba(251, 191, 36, 0.35)',

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

export const ROOM_COLOR_ORDER = ['orange', 'purple', 'pink', 'blue', 'green', 'red', 'cyan', 'yellow', 'indigo', 'teal', 'lime'] as const;

export const ROOM_COLORS: Record<string, { bg: string; border: string; stripe: string; text: string; glow: string }> = {
  orange: { bg: '#F97316', border: '#FB923C', stripe: '#FDBA74', text: '#FFF', glow: '0 0 24px rgba(249, 115, 22, 0.5)' },
  purple: { bg: '#A855F7', border: '#C084FC', stripe: '#E9D5FF', text: '#FFF', glow: '0 0 24px rgba(168, 85, 247, 0.5)' },
  pink: { bg: '#EC4899', border: '#F472B6', stripe: '#F9A8D4', text: '#FFF', glow: '0 0 24px rgba(236, 72, 153, 0.5)' },
  blue: { bg: '#3B82F6', border: '#60A5FA', stripe: '#93C5FD', text: '#FFF', glow: '0 0 24px rgba(59, 130, 246, 0.5)' },
  green: { bg: '#10B981', border: '#34D399', stripe: '#6EE7B7', text: '#FFF', glow: '0 0 24px rgba(16, 185, 129, 0.5)' },
  red: { bg: '#EF4444', border: '#F87171', stripe: '#FCA5A5', text: '#FFF', glow: '0 0 24px rgba(239, 68, 68, 0.5)' },
  cyan: { bg: '#06B6D4', border: '#22D3EE', stripe: '#67E8F9', text: '#FFF', glow: '0 0 24px rgba(6, 182, 212, 0.5)' },
  yellow: { bg: '#FBBF24', border: '#FCD34D', stripe: '#FDE68A', text: '#000', glow: '0 0 24px rgba(251, 191, 36, 0.45)' },
  indigo: { bg: '#6366F1', border: '#818CF8', stripe: '#C7D2FE', text: '#FFF', glow: '0 0 24px rgba(99, 102, 241, 0.5)' },
  teal: { bg: '#14B8A6', border: '#2DD4BF', stripe: '#99F6E4', text: '#FFF', glow: '0 0 24px rgba(20, 184, 166, 0.5)' },
  lime: { bg: '#84CC16', border: '#A3E635', stripe: '#D4FC79', text: '#000', glow: '0 0 24px rgba(132, 204, 22, 0.45)' },
};

// Step colors podle step_index z databáze - dynamicky přepsáno z kontextu v renderování
// Inspirován Gantt timeline s vibrantními barvami pro různé fáze
export const STEP_INDEX_COLORS: Record<number, string> = {
  0: '#9CA3AF',  // Gray - Pending
  1: '#A855F7',  // Purple - Planning/Preparation
  2: '#EC4899',  // Pink - Design/Pre-op
  3: '#EF4444',  // Red - Critical/Active surgery
  4: '#FBBF24',  // Yellow - Mid-operation
  5: '#8B5CF6',  // Violet - Complex phase
  6: '#10B981',  // Green - Completion/Recovery
  7: '#F97316',  // Orange - Post-operation
  8: '#3B82F6',  // Blue - Monitoring
  9: '#06B6D4',  // Cyan - Final checks
};
