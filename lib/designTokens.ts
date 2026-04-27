/**
 * Design Tokens — sjednocený zdroj pravdy pro design napříč aplikací.
 *
 * Tokens jsou extrahované z `LoginPage.tsx`, který slouží jako referenční
 * design systém. Účelem je:
 *  1. Odstranit duplicaci stylů napříč moduly
 *  2. Garantovat, že případná budoucí změna brand barvy / typografie /
 *     glassmorph efektu se projeví všude konzistentně
 *  3. Poskytnout jasné API pro hero sekce, eyebrow labels, glassmorph
 *     karty, primary buttons, inputs a focus ring
 *
 * Použití:
 *   import { C, tw } from '@/lib/designTokens';
 *
 *   <h1 className={tw.heroTitle}>Dashboard</h1>
 *   <p className={tw.eyebrow}>SPRÁVA SÁLŮ</p>
 *   <div className={tw.glassCard}>...</div>
 *   <button className={tw.btnPrimary}>Uložit</button>
 *   <input className={tw.input} />
 */

// ============================================================
// COLOR PALETTE
// ============================================================
// Pouze 5 barev v souladu s Design Guidelines (1 brand + 3 neutrals + 1 accent)
export const C = {
  /** Primární brand accent (LoginPage žlutá) */
  yellow: '#FBBF24',
  /** Tlumenější varianta žluté pro hover/disabled */
  yellowMuted: '#F59E0B',
  /** Background base */
  black: '#000000',
  /** Glassmorph karta — fill */
  surfaceFill: 'rgba(255, 255, 255, 0.04)',
  /** Glassmorph karta — border */
  surfaceBorder: 'rgba(255, 255, 255, 0.07)',
  /** Glassmorph karta — border (silnější varianta pro focus/hover) */
  surfaceBorderStrong: 'rgba(255, 255, 255, 0.12)',
  /** Sekundární text */
  textMuted: 'rgba(255, 255, 255, 0.55)',
  /** Tercierní text (eyebrow labels, captions) */
  textFaint: 'rgba(255, 255, 255, 0.40)',
} as const;

// ============================================================
// TAILWIND CLASS RECIPES
// ============================================================
// Předpřipravené třídy pro nejčastější patterny. Lze rozšiřovat
// přes `cn(tw.heroTitle, "text-3xl md:text-5xl")` pattern.

export const tw = {
  // ---- Typography ----------------------------------------
  /** Hero h1 nadpis sekce/modulu (LoginPage style) */
  heroTitle: 'font-bold tracking-tight uppercase leading-none text-balance',
  /** Sub-heading (h2, sekční nadpis uvnitř modulu) */
  sectionTitle: 'font-bold tracking-tight text-pretty',
  /** Eyebrow label nad heroem (např. "SPRÁVA OPERAČNÍCH SÁLŮ") */
  eyebrow: 'text-xs font-semibold tracking-[0.3em] uppercase text-white/40',
  /** Caption / metadata pod heroem */
  caption: 'text-sm text-white/55 leading-relaxed',

  // ---- Layout primitivy ---------------------------------
  /** Glassmorph karta (LoginPage card style) */
  glassCard:
    'bg-white/[0.04] border border-white/[0.07] rounded-2xl backdrop-blur-md',
  /** Glassmorph karta s vyšším zvýrazněním (dialog, modal) */
  glassCardElevated:
    'bg-white/[0.06] border border-white/[0.12] rounded-2xl backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]',

  // ---- Buttons ------------------------------------------
  /** Primary button (LoginPage žluté tlačítko) */
  btnPrimary:
    'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold text-black bg-[#FBBF24] hover:bg-[#F59E0B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  /** Secondary / ghost button */
  btnGhost:
    'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white/80 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] hover:border-white/[0.12] transition-colors',
  /** Icon-only button (pro toolbary, close ikony) */
  btnIcon:
    'inline-flex items-center justify-center rounded-xl w-10 h-10 text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] transition-colors',

  // ---- Form elements -----------------------------------
  /** Text input / textarea (LoginPage input style) */
  input:
    'w-full rounded-xl px-4 py-3.5 bg-white/[0.03] border border-white/[0.07] text-white placeholder-white/30 focus:outline-none focus:border-[#FBBF24]/50 focus:bg-white/[0.05] transition-colors',
  /** Form label */
  label: 'block text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-2',

  // ---- Accessibility ------------------------------------
  /** Žlutý focus-visible ring (LoginPage pattern) */
  focusRing:
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
} as const;

/**
 * Pomocná funkce pro spojování tříd. Filtruje falsy hodnoty.
 *
 * @example
 *   className={cx(tw.glassCard, isActive && 'border-[#FBBF24]/40')}
 */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
