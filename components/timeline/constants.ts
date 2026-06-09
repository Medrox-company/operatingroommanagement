// ========== DESIGN TOKENS (Premium Medical Dashboard - Luxury Logistics-Inspired Design) ==========
export const C = {
  // Primary accent - Luxury Gold/Yellow (inspired by premium logistics dashboard)
  accent: '#FFD700',       // Vibrant gold/yellow as primary
  cyan: '#06B6D4',         // Kept for secondary elements

  // Status colors - Premium & Professional
  green: '#10B981',        // Success/Complete - Emerald
  yellow: '#FFD700',       // Primary accent - Golden yellow
  orange: '#F97316',       // Alert/Surgery - Vibrant Orange
  red: '#EF4444',          // Delayed/Critical - Red
  purple: '#A855F7',       // Planning/Design - Vivid Purple
  pink: '#EC4899',         // Special - Pink
  blue: '#3B82F6',         // Info/Dev - Bright Blue
  slate: '#64748B',        // Completed - Slate
  
  // Additional colors
  indigo: '#6366F1',       // Indigo for variations
  teal: '#14B8A6',         // Teal alternative
  amber: '#F59E0B',        // Warm amber
  lime: '#84CC16',         // Fresh lime

  // Surface & Glass Effects - Luxury dark blue gradient (like logistics dashboard)
  bgDeep: '#0F1A2E',                        // Premium dark navy (deeper than before)
  bgSurface: 'rgb(15, 26, 46)',             // Rich surface
  bgElevated: 'rgba(30, 50, 80, 0.95)',     // Elevated cards with blue tint
  bgCard: 'rgba(20, 35, 65, 0.98)',         // Card background with luxury blue
  bgPanel: 'rgba(18, 32, 60, 0.98)',        // Sticky panels with premium navy

  // Borders & Lines - Golden accents
  border: 'rgba(255, 215, 0, 0.08)',        // Subtle golden border
  borderStrong: 'rgba(255, 215, 0, 0.15)',  // Stronger golden border
  borderHover: 'rgba(255, 215, 0, 0.35)',   // Golden hover
  borderActive: 'rgba(255, 215, 0, 0.55)',  // Active golden state
  gridLine: 'rgba(59, 130, 246, 0.06)',     // Blue grid lines

  // Glass & Glow - Golden + Blue tones
  glass: 'rgba(255, 255, 255, 0.025)',
  glassHover: 'rgba(255, 215, 0, 0.08)',
  glowCyan: '0 0 24px rgba(255, 215, 0, 0.5)',    // Golden glow
  glowGreen: '0 0 16px rgba(16, 185, 129, 0.4)',
  glowRed: '0 0 16px rgba(239, 68, 68, 0.5)',
  glowPurple: '0 0 18px rgba(168, 85, 247, 0.45)',
  glowBlue: '0 0 20px rgba(59, 130, 246, 0.5)',   // Enhanced blue glow for luxury
  glowYellow: '0 0 24px rgba(255, 215, 0, 0.6)',  // Enhanced golden glow

  // Text
  textHi: 'rgba(255, 255, 255, 0.98)',
  text: 'rgba(255, 255, 255, 0.85)',
  muted: 'rgba(255, 255, 255, 0.50)',
  faint: 'rgba(255, 255, 255, 0.28)',
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
  orange: { bg: '#F97316', border: '#FB923C', stripe: '#FDBA74', text: '#FFF', glow: '0 0 24px rgba(249, 115, 22, 0.6)' },
  purple: { bg: '#A855F7', border: '#C084FC', stripe: '#E9D5FF', text: '#FFF', glow: '0 0 24px rgba(168, 85, 247, 0.6)' },
  pink: { bg: '#EC4899', border: '#F472B6', stripe: '#F9A8D4', text: '#FFF', glow: '0 0 24px rgba(236, 72, 153, 0.6)' },
  blue: { bg: '#3B82F6', border: '#60A5FA', stripe: '#93C5FD', text: '#FFF', glow: '0 0 24px rgba(59, 130, 246, 0.6)' },
  green: { bg: '#10B981', border: '#34D399', stripe: '#6EE7B7', text: '#FFF', glow: '0 0 24px rgba(16, 185, 129, 0.6)' },
  red: { bg: '#EF4444', border: '#F87171', stripe: '#FCA5A5', text: '#FFF', glow: '0 0 24px rgba(239, 68, 68, 0.6)' },
  cyan: { bg: '#06B6D4', border: '#22D3EE', stripe: '#67E8F9', text: '#FFF', glow: '0 0 24px rgba(6, 182, 212, 0.6)' },
  yellow: { bg: '#FFD700', border: '#FFED4E', stripe: '#FFEE73', text: '#000', glow: '0 0 28px rgba(255, 215, 0, 0.7)' }, // Premium gold
  indigo: { bg: '#6366F1', border: '#818CF8', stripe: '#C7D2FE', text: '#FFF', glow: '0 0 24px rgba(99, 102, 241, 0.6)' },
  teal: { bg: '#14B8A6', border: '#2DD4BF', stripe: '#99F6E4', text: '#FFF', glow: '0 0 24px rgba(20, 184, 166, 0.6)' },
  lime: { bg: '#84CC16', border: '#A3E635', stripe: '#D4FC79', text: '#000', glow: '0 0 24px rgba(132, 204, 22, 0.6)' },
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

// ========== NEON COLORS FOR MAXIMUM VISUAL IMPACT ==========
export const NEON_COLORS = {
  // Vibrant neon colors with intense glow effects
  neonBlue: '#0080FF',          // Bright neon blue
  neonCyan: '#00FFFF',          // Bright neon cyan
  neonPurple: '#D946EF',        // Bright neon purple
  neonPink: '#FF006E',          // Bright neon pink
  neonRed: '#FF0033',           // Bright neon red
  neonGreen: '#00FF00',         // Bright neon green
  neonYellow: '#FFFF00',        // Bright neon yellow
  neonOrange: '#FF6600',        // Bright neon orange
  
  // Neon glow effects (box-shadow)
  glowNeonBlue: '0 0 40px rgba(0, 128, 255, 0.8), 0 0 80px rgba(0, 128, 255, 0.4)',
  glowNeonCyan: '0 0 40px rgba(0, 255, 255, 0.8), 0 0 80px rgba(0, 255, 255, 0.4)',
  glowNeonPurple: '0 0 40px rgba(217, 70, 239, 0.8), 0 0 80px rgba(217, 70, 239, 0.4)',
  glowNeonPink: '0 0 40px rgba(255, 0, 110, 0.8), 0 0 80px rgba(255, 0, 110, 0.4)',
  glowNeonRed: '0 0 40px rgba(255, 0, 51, 0.8), 0 0 80px rgba(255, 0, 51, 0.4)',
  glowNeonGreen: '0 0 40px rgba(0, 255, 0, 0.8), 0 0 80px rgba(0, 255, 0, 0.4)',
  glowNeonYellow: '0 0 40px rgba(255, 255, 0, 0.7), 0 0 80px rgba(255, 255, 0, 0.35)',
  glowNeonOrange: '0 0 40px rgba(255, 102, 0, 0.8), 0 0 80px rgba(255, 102, 0, 0.4)',
  
  // Glow animation colors
  glowNeonBlueAnimation: 'rgba(0, 128, 255, 0.6)',
  glowNeonCyanAnimation: 'rgba(0, 255, 255, 0.6)',
  glowNeonPurpleAnimation: 'rgba(217, 70, 239, 0.6)',
  glowNeonPinkAnimation: 'rgba(255, 0, 110, 0.6)',
};
