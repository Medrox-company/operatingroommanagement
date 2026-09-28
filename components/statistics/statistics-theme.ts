'use client';

import '../mobile/mobile-statistics.css';
// ── Design tokens ──────────────────────────────────────────────────────────────
export const C = {
  accent:  '#06B6D4',
  green:   '#10B981',
  orange:  '#F97316',
  yellow:  '#FBBF24',
  red:     '#EF4444',
  border:  'var(--stats-border)',
  borderHover: 'var(--stats-border-hover)',
  surface: 'var(--stats-surface)',
  surfaceActive: 'var(--stats-surface-active)',
  muted:   'var(--stats-muted)',
  faint:   'var(--stats-faint)',
  ghost:   'var(--stats-ghost)',
  text:    'var(--stats-text)',
};

export const DEPT_COLORS: Record<string,string> = {
  TRA:'#06B6D4', CHIR:'#F97316', ROBOT:'#A78BFA',
  URO:'#EC4899', ORL:'#3B82F6', CÉVNÍ:'#14B8A6',
  'HPB + PLICNÍ':'#FBBF24', DĚTSKÉ:'#10B981', MAMMO:'#818CF8',
};

// ── Tooltip shared style ─────────�����─��������──────────────────────────────────────────
export const TIP = {
  contentStyle:{
    background:'rgba(2,8,23,0.97)',
    border:`1px solid ${C.border}`,
    borderRadius:10,
    fontSize:12,
    fontFamily:'var(--font-sans)',
    boxShadow:'0 16px 36px rgba(0,0,0,0.28)',
  },
  labelStyle:  { color:C.muted },
  itemStyle:   { color:C.accent },
};
