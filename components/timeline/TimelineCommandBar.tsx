'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, ChevronDown, RefreshCw, ArrowUpDown, BarChart3, History, TrendingUp, SlidersHorizontal, Fingerprint, BellRing, Maximize2, Minimize2, List, CalendarDays, Activity, Zap, CheckCircle } from 'lucide-react';
import { C } from './constants';
import type { SortMode } from './row-types';
import type { WorkflowStatus } from '../../contexts/WorkflowStatusesContext';

export interface TimelineCommandBarProps {
  activeStatuses: WorkflowStatus[];
  sortMode: SortMode;
  setSortMode: React.Dispatch<React.SetStateAction<SortMode>>;
  showSortMenu: boolean;
  setShowSortMenu: React.Dispatch<React.SetStateAction<boolean>>;
  showToolsMenu: boolean;
  setShowToolsMenu: React.Dispatch<React.SetStateAction<boolean>>;
  showLegend: boolean;
  setShowLegend: React.Dispatch<React.SetStateAction<boolean>>;
  showSummary: boolean;
  setShowSummary: React.Dispatch<React.SetStateAction<boolean>>;
  density: 'auto' | 'compact' | 'comfort';
  setDensity: React.Dispatch<React.SetStateAction<'auto' | 'compact' | 'comfort'>>;
  scrubActive: boolean;
  setScrubActive: React.Dispatch<React.SetStateAction<boolean>>;
  exitScrub: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  attentionCount: number;
  lastUpdated: Date;
  isRefreshing: boolean;
  handleRefresh: () => void | Promise<void>;
  onRefresh?: () => Promise<void> | void;
  setShowHistory: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAttention: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSimulator: React.Dispatch<React.SetStateAction<boolean>>;
  setShowForecast: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPhaseOptimizer: React.Dispatch<React.SetStateAction<boolean>>;
  setShowFingerprint: React.Dispatch<React.SetStateAction<boolean>>;
  setShowStats: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Ovládací lišta rozvrhu — řazení, nástroje, hustota, režim posuvu, celá obrazovka.
 *
 * Vyjmuto z TimelineModule bez změny značkování. Vlastní obal s třídou
 * `timeline-commandbar` zůstává v modulu, aby se nezměnila struktura layoutu.
 */
export function TimelineCommandBar({
  activeStatuses,
  sortMode,
  setSortMode,
  showSortMenu,
  setShowSortMenu,
  showToolsMenu,
  setShowToolsMenu,
  showLegend,
  setShowLegend,
  showSummary,
  setShowSummary,
  density,
  setDensity,
  scrubActive,
  setScrubActive,
  exitScrub,
  isFullscreen,
  toggleFullscreen,
  attentionCount,
  lastUpdated,
  isRefreshing,
  handleRefresh,
  onRefresh,
  setShowHistory,
  setShowAttention,
  setShowSimulator,
  setShowForecast,
  setShowPhaseOptimizer,
  setShowFingerprint,
  setShowStats,
}: TimelineCommandBarProps) {
  return (
    <div className="flex items-center justify-start min-w-0 overflow-visible">
      <div className="hidden md:flex items-center min-w-0 max-w-full overflow-visible">
    {/* Akční cluster: živá data / souhrn / řazení */}
    <div
      className="timeline-toolbar-float hidden md:flex items-center h-12 shrink-0 rounded-lg px-1 xl:px-2 gap-0.5 xl:gap-1"
    >
      {/* Indikátor živých dat + ruční obnovení */}
      <button
        onClick={handleRefresh}
        disabled={!onRefresh || isRefreshing}
        aria-label="Obnovit data"
        data-tour="tl-refresh"
        title={`Živě · aktualizováno ${lastUpdated.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
        className="flex items-center justify-center gap-1 xl:gap-2 h-8 w-8 xl:w-auto px-0 xl:px-2 rounded-xl transition-colors hover:bg-white/5 disabled:cursor-default"
      >
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: C.green }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: C.green }} />
        </span>
        <span className="hidden xl:inline text-[10px] font-semibold uppercase tracking-wider text-white/50 tabular-nums">
          {lastUpdated.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
        </span>
        {onRefresh && (
          <RefreshCw className="w-2.5 h-2.5 text-white/30" />
        )}
      </button>

      <div className="w-px h-6 bg-white/10 mx-0.5" />

      {/* Historie — listování po dnech a zpětné zobrazení časové osy */}
      <button
        onClick={() => setShowHistory(true)}
        aria-label="Historie"
        data-tour="tl-history"
        title="Historie — listování po dnech a zpětné zobrazení časové osy"
        className="w-7 xl:w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5"
      >
        <CalendarDays className="w-4 h-4 text-white/60" />
      </button>

      {/* Živé zobrazení / denní souhrn — využívá stejnou osu a zachovává kontext sálů. */}
      <button
        onClick={() => setShowSummary((value) => !value)}
        aria-label={showSummary ? 'Zobrazit živý provoz' : 'Zobrazit denní souhrn'}
        data-tour="tl-summary"
        aria-pressed={showSummary}
        title={showSummary ? 'Zpět na živý provoz' : 'Denní souhrn — všechny dnešní výkony a využití sálů'}
        className="h-8 w-7 xl:w-auto px-0 xl:px-2 rounded-xl flex items-center justify-center gap-0 xl:gap-1.5 transition-colors hover:bg-white/5"
        style={showSummary
          ? { background: `${C.blue}1f`, color: C.blue, boxShadow: `inset 0 0 0 1px ${C.blue}35` }
          : { color: 'rgba(255,255,255,0.6)' }}
      >
        {showSummary ? <Activity className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
        <span className="hidden 2xl:inline text-xs font-semibold">
          {showSummary ? 'Živě' : 'Souhrn'}
        </span>
      </button>

      {/* Hustota řádků — Auto → Kompakt → Komfort */}
      <button
        onClick={() => setDensity((d) => (d === 'auto' ? 'compact' : d === 'compact' ? 'comfort' : 'auto'))}
        aria-label="Hustota řádků"
        data-tour="tl-density"
        title={density === 'auto' ? 'Hustota: Auto (vejít vše) — klikni pro Kompakt' : density === 'compact' ? 'Hustota: Kompakt (víc sálů) — klikni pro Komfort' : 'Hustota: Komfort (víc detailu) — klikni pro Auto'}
        className="h-8 w-7 xl:w-auto px-0 xl:px-2 rounded-xl flex items-center justify-center gap-0 xl:gap-1.5 transition-colors hover:bg-white/5"
        style={density !== 'auto'
          ? { background: `${C.cyan}1f`, color: C.cyan, boxShadow: `inset 0 0 0 1px ${C.cyan}35` }
          : { color: 'rgba(255,255,255,0.6)' }}
      >
        <List className="w-4 h-4" />
        <span className="hidden 2xl:inline text-xs font-semibold">
          {density === 'auto' ? 'Auto' : density === 'compact' ? 'Kompakt' : 'Komfort'}
        </span>
      </button>

      {/* Triáž pozornosti — co vyžaduje pozornost teď */}
      <button
        onClick={() => setShowAttention(true)}
        aria-label="Triáž pozornosti"
        data-tour="tl-attention"
        title="Triáž pozornosti — vše, co teď vyžaduje pozornost na sálech"
        className="relative w-7 xl:w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5"
      >
        <BellRing className="w-4 h-4 text-white/60" />
        {attentionCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 min-w-3.5 h-3.5 px-0.5 rounded-full flex items-center justify-center text-[8px] font-bold tabular-nums"
            style={{ background: C.orange, color: '#201005', border: '1px solid rgba(4,11,18,0.9)' }}
          >
            {Math.min(attentionCount, 9)}
          </span>
        )}
      </button>

      {/* Legenda všech barev a provozních značek. */}
      <div className="relative">
        <button
          onClick={() => setShowLegend((value) => !value)}
          aria-label="Legenda časové osy"
          data-tour="tl-legend"
          aria-haspopup="dialog"
          aria-expanded={showLegend}
          title="Legenda fází a provozních značek"
          className="w-7 xl:w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5"
          style={showLegend ? { background: `${C.cyan}1f`, color: C.cyan } : undefined}
        >
          <Info className={`w-4 h-4 ${showLegend ? '' : 'text-white/60'}`} />
        </button>
        <AnimatePresence>
          {showLegend && (
            <>
              <button type="button" aria-label="Zavřít legendu časové osy" className="fixed inset-0 z-40 cursor-default" onClick={() => setShowLegend(false)} />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.12 }}
                role="dialog"
                aria-label="Legenda časové osy"
                className="timeline-popup-panel absolute left-0 top-11 z-50 w-[360px] overflow-hidden p-4"
                style={{
                  background: 'rgba(5,14,24,0.98)',
                  border: `1px solid ${C.borderStrong}`,
                  boxShadow: '0 20px 52px rgba(0,0,0,0.58)',
                  backdropFilter: 'blur(24px)',
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs font-bold text-white/90">Legenda časové osy</p>
                    <p className="text-[10px] text-white/38 mt-0.5">Fáze a provozní události v jednom přehledu</p>
                  </div>
                  <button
                    onClick={() => setShowLegend(false)}
                    aria-label="Zavřít legendu"
                    className="timeline-popup-close w-7 h-7 flex items-center justify-center transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-white/50" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {activeStatuses.map((status) => {
                    const color = status.accent_color || status.color || C.slate;
                    return (
                      <div key={status.id} className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: color }} />
                        <span className="text-[10px] font-medium text-white/65 truncate">{status.name}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="h-px my-3" style={{ background: C.border }} />
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {[
                    { label: 'Aktuální čas', color: '#FF9800' },
                    { label: 'Pauza', color: C.cyan },
                    { label: 'Vyžaduje pozornost', color: C.orange },
                    { label: 'Nouzový stav', color: C.red },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className="w-4 h-[2px] shrink-0" style={{ background: item.color }} />
                      <span className="text-[10px] font-medium text-white/55">{item.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Pokročilé nástroje — soustředěné do jednoho přehledného menu */}
      <div className="relative">
        <button
          onClick={() => setShowToolsMenu((value) => !value)}
          aria-label="Pokročilé nástroje"
          data-tour="tl-tools"
          aria-haspopup="menu"
          aria-expanded={showToolsMenu}
          className="h-8 w-8 xl:w-auto px-0 xl:px-2.5 rounded-xl flex items-center justify-center gap-0 xl:gap-1.5 text-xs font-semibold transition-colors hover:bg-white/5"
          style={showToolsMenu ? { background: `${C.cyan}1f`, color: C.cyan } : { color: 'rgba(255,255,255,0.65)' }}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden 2xl:inline">Nástroje</span>
          <ChevronDown className={`hidden xl:block w-3.5 h-3.5 transition-transform ${showToolsMenu ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {showToolsMenu && (
            <>
              <button type="button" aria-label="Zavřít nabídku nástrojů" data-tour="tl-tools-dismiss" className="fixed inset-0 z-40 cursor-default" onClick={() => setShowToolsMenu(false)} />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.12 }}
                role="menu"
                className="timeline-popup-panel absolute left-0 top-11 z-50 w-64 overflow-hidden p-1.5"
                style={{
                  background: 'rgba(7,16,25,0.98)',
                  border: `1px solid ${C.borderStrong}`,
                  boxShadow: '0 22px 55px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(24px)',
                }}
              >
                {[
                  { tour: 'simulator', label: 'Simulátor zpoždění', detail: 'Dopad skluzu na provoz', icon: SlidersHorizontal, color: C.orange, action: () => setShowSimulator(true) },
                  { tour: 'forecast', label: 'Prognóza kapacity', detail: 'Vytížení a úzká hrdla', icon: TrendingUp, color: C.blue, action: () => setShowForecast(true) },
                  { tour: 'optimizer', label: 'Optimalizace fází', detail: 'Doporučení ke zrychlení', icon: Zap, color: C.yellow, action: () => setShowPhaseOptimizer(true) },
                  { tour: 'fingerprint', label: 'Fázový otisk', detail: 'Porovnání profilů sálů', icon: Fingerprint, color: C.purple, action: () => setShowFingerprint(true) },
                  { tour: 'stats', label: 'Statistiky dne', detail: 'Výkon a rozpad času', icon: BarChart3, color: C.green, action: () => setShowStats(true) },
                ].map((tool) => {
                  const ToolIcon = tool.icon;
                  return (
                    <button
                      key={tool.label}
                      role="menuitem"
                      data-tour={`tl-tool-${tool.tour}`}
                      onClick={() => { tool.action(); setShowToolsMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.055] transition-colors"
                    >
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ color: tool.color, background: `${tool.color}14`, border: `1px solid ${tool.color}25` }}
                      >
                        <ToolIcon className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-white/85">{tool.label}</span>
                        <span className="block text-[10px] text-white/35 mt-0.5">{tool.detail}</span>
                      </span>
                    </button>
                  );
                })}
                <div className="xl:hidden h-px my-1.5 mx-2 bg-white/[0.07]" />
                <div className="xl:hidden px-3 pt-1.5 pb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/30">
                  Zobrazení na tabletu
                </div>
                <button
                  role="menuitem"
                  onClick={() => {
                    if (scrubActive) exitScrub(); else setScrubActive(true);
                    setShowToolsMenu(false);
                  }}
                  className="flex xl:hidden w-full items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.055] transition-colors"
                >
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/[0.035] border border-white/[0.07]">
                    <History className="w-4 h-4 text-white/60" />
                  </span>
                  <span className="text-xs font-semibold text-white/80">{scrubActive ? 'Ukončit časovou lupu' : 'Časová lupa'}</span>
                </button>
                <button
                  role="menuitem"
                  onClick={() => { toggleFullscreen(); setShowToolsMenu(false); }}
                  className="flex xl:hidden w-full items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.055] transition-colors"
                >
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/[0.035] border border-white/[0.07]">
                    {isFullscreen ? <Minimize2 className="w-4 h-4 text-white/60" /> : <Maximize2 className="w-4 h-4 text-white/60" />}
                  </span>
                  <span className="text-xs font-semibold text-white/80">{isFullscreen ? 'Ukončit celou obrazovku' : 'Celá obrazovka'}</span>
                </button>
                <div className="xl:hidden px-3 pt-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/30">
                  Řazení sálů
                </div>
                {([
                  { key: 'default', label: 'Výchozí pořadí' },
                  { key: 'name', label: 'Podle názvu (A–Z)' },
                  { key: 'status', label: 'Podle stavu' },
                ] as { key: SortMode; label: string }[]).map((option) => (
                  <button
                    key={`tablet-sort-${option.key}`}
                    role="menuitemradio"
                    aria-checked={sortMode === option.key}
                    onClick={() => { setSortMode(option.key); setShowToolsMenu(false); }}
                    className="flex xl:hidden w-full items-center justify-between gap-3 px-3 py-2 rounded-xl text-left text-xs font-medium hover:bg-white/[0.055] transition-colors"
                    style={{ color: sortMode === option.key ? C.cyan : 'rgba(255,255,255,0.68)' }}
                  >
                    {option.label}
                    {sortMode === option.key && <CheckCircle className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Časová lupa — inspekce stavu sálů v libovolném čase dne */}
      <button
        onClick={() => (scrubActive ? exitScrub() : setScrubActive(true))}
        aria-pressed={scrubActive}
        aria-label="Časová lupa — stav sálů v čase"
        title="Časová lupa: táhni po ose a uvidíš stav všech sálů v daném čase (Esc zavře)"
        className="hidden xl:flex w-8 h-8 rounded-xl items-center justify-center transition-colors hover:bg-white/5"
        style={scrubActive ? { background: `${C.purple}1f`, color: C.purple } : undefined}
      >
        <History className={`w-4 h-4 ${scrubActive ? '' : 'text-white/60'}`} />
      </button>

      <div className="hidden xl:block w-px h-6 bg-white/10 mx-0.5" />

      {/* TV / fullscreen režim — nástěnná obrazovka */}
      <button
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? 'Ukončit režim celé obrazovky' : 'Režim celé obrazovky (TV)'}
        aria-pressed={isFullscreen}
        title={isFullscreen ? 'Ukončit TV režim (F)' : 'TV režim — celá obrazovka (F)'}
        className="hidden xl:flex w-8 h-8 rounded-xl items-center justify-center transition-colors hover:bg-white/5"
        style={isFullscreen ? { background: `${C.cyan}1f`, color: C.cyan } : undefined}
      >
        {isFullscreen
          ? <Minimize2 className="w-4 h-4" />
          : <Maximize2 className="w-4 h-4 text-white/60" />}
      </button>

      <div className="hidden xl:block w-px h-6 bg-white/10 mx-0.5" />

      {/* Řazení sálů */}
      <div className="relative hidden xl:block">
        <button
          onClick={() => setShowSortMenu((v) => !v)}
          aria-label="Řadit sály"
          aria-haspopup="menu"
          aria-expanded={showSortMenu}
          title="Řadit sály"
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5"
          style={sortMode !== 'default' ? { background: `${C.cyan}1f`, color: C.cyan } : undefined}
        >
          <ArrowUpDown className={`w-4 h-4 ${sortMode !== 'default' ? '' : 'text-white/60'}`} />
        </button>
        <AnimatePresence>
          {showSortMenu && (
            <>
              <button type="button" aria-label="Zavřít nabídku řazení" className="fixed inset-0 z-40 cursor-default" onClick={() => setShowSortMenu(false)} />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.12 }}
                role="menu"
                className="timeline-popup-panel absolute right-0 top-11 z-50 w-44 overflow-hidden py-1"
                style={{ background: '#0f141c', border: `1px solid ${C.borderStrong}`, boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}
              >
                {([
                  { key: 'default', label: 'Výchozí pořadí' },
                  { key: 'name', label: 'Podle názvu (A–Z)' },
                  { key: 'status', label: 'Podle stavu' },
                ] as { key: SortMode; label: string }[]).map((opt) => (
                  <button
                    key={opt.key}
                    role="menuitemradio"
                    aria-checked={sortMode === opt.key}
                    onClick={() => { setSortMode(opt.key); setShowSortMenu(false); }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-white/5"
                    style={{ color: sortMode === opt.key ? C.cyan : 'rgba(255,255,255,0.7)' }}
                  >
                    {opt.label}
                    {sortMode === opt.key && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
      </div>
    </div>
  );
}
