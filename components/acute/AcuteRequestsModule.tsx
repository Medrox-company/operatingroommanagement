'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Plus, Siren, X } from 'lucide-react';
import ModulePageHeading from '../ModulePageHeading';
import { MobileCard, MobileModuleHeader, MobileScreen, MobileSectionLabel } from '../mobile/MobileShell';
import { useNowMinuteMs } from '../../hooks/useSharedClock';
import { useAcuteRequests } from '../../contexts/AcuteRequestsContext';
import { URGENCY_LEVELS, formatDuration, isWaiting } from '../../lib/acute-requests';
import AcuteQueue from './AcuteQueue';
import AcuteRequestForm, { type AcuteDepartmentOption } from './AcuteRequestForm';

/**
 * Modul Akutní příjem — fronta požadavků na akutní operační výkon.
 *
 * První krok staví jen rozhraní. Oddělení i požadavky jsou zatím ukázkové;
 * druhý krok je vymění za tabulky `departments` a `acute_requests`, aniž by
 * se musely měnit komponenty — celý modul sahá jen na AcuteRequestsContext.
 */

/**
 * Ukázková oddělení. Druhý krok je nahradí voláním fetchDepartments().
 * Pozn.: `components/DepartmentsManager.tsx` v projektu existuje, ale není
 * zapojený do Nastavení — aby si zařízení mohlo oddělení nastavit, bude
 * potřeba ho vrátit. Tvar odpovídá řádku tabulky, aby výměna byla bezbolestná.
 */
const DEMO_DEPARTMENTS: AcuteDepartmentOption[] = [
  { id: 'demo-chirurgie', name: 'Chirurgie', accent_color: '#F97316' },
  { id: 'demo-traumatologie', name: 'Traumatologie', accent_color: '#06B6D4' },
  { id: 'demo-ortopedie', name: 'Ortopedie', accent_color: '#A78BFA' },
  { id: 'demo-urologie', name: 'Urologie', accent_color: '#EC4899' },
  { id: 'demo-gynekologie', name: 'Gynekologie', accent_color: '#34D399' },
];

export default function AcuteRequestsModule() {
  const { requests, summary, windows, isDemoData, createRequest, moveToPosition } = useAcuteRequests();
  const nowMs = useNowMinuteMs();
  const [formOpen, setFormOpen] = useState(false);

  const waiting = useMemo(() => requests.filter(isWaiting), [requests]);

  const counters = URGENCY_LEVELS.map(level => ({
    level,
    count: summary.byUrgency[level.id],
  }));

  const headline = summary.waiting === 0
    ? 'Fronta je prázdná'
    : `${summary.waiting} ${summary.waiting === 1 ? 'požadavek' : summary.waiting < 5 ? 'požadavky' : 'požadavků'} čeká na sál`;

  const nextDeadline = summary.nextDeadlineMs
    ? new Date(summary.nextDeadlineMs).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
    : null;

  /** Shrnutí nad frontou — stejné na mobilu i na desktopu. */
  const Overview = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {counters.map(({ level, count }) => (
          <div
            key={level.id}
            className="flex min-w-[112px] flex-1 flex-col gap-1 rounded-xl border p-3"
            style={{
              borderColor: count > 0 ? `${level.color}40` : 'rgba(255,255,255,0.07)',
              background: count > 0 ? `${level.color}12` : 'rgba(255,255,255,0.02)',
            }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: count > 0 ? level.color : 'rgba(255,255,255,0.45)' }}>
              {level.label}
            </span>
            <span className="text-[22px] font-light leading-none tabular-nums text-white/95">{count}</span>
            <span className="text-[10px] text-white/40">okno {formatDuration(windows[level.id])}</span>
          </div>
        ))}
      </div>

      {summary.overdue > 0 ? (
        <p className="flex items-start gap-2 rounded-lg border border-[#FB7185]/30 bg-[#FB7185]/[0.08] px-3 py-2 text-[12px] leading-relaxed text-[#FFC9D1]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          {summary.overdue} {summary.overdue === 1 ? 'požadavek má' : 'požadavky mají'} vypršelé okno do sálu.
        </p>
      ) : nextDeadline ? (
        <p className="text-[12px] text-white/50">Nejbližší konec okna v {nextDeadline}.</p>
      ) : null}

      {isDemoData ? (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-200/80">
          Ukázková data. Modul zatím běží bez databáze — po obnovení stránky se fronta vrátí do výchozího stavu.
        </p>
      ) : null}
    </div>
  );

  const Queue = (
    <AcuteQueue
      requests={waiting}
      departments={DEMO_DEPARTMENTS}
      windows={windows}
      nowMs={nowMs}
      onMove={moveToPosition}
    />
  );

  const Form = (
    <AcuteRequestForm
      departments={DEMO_DEPARTMENTS}
      windows={windows}
      onSubmit={draft => { createRequest(draft); setFormOpen(false); }}
      onCancel={() => setFormOpen(false)}
    />
  );

  return (
    <>
      {/* ========== MOBILNÍ ROZVRŽENÍ ========== */}
      <MobileScreen>
        <MobileModuleHeader kicker="Operační blok" title="Akutní příjem" />
        <MobileCard>
          <h2 className="m-unified-card-title">{headline}</h2>
          <div className="mt-3">{Overview}</div>
        </MobileCard>

        {formOpen ? (
          <MobileCard>
            <h2 className="m-unified-card-title">Nový požadavek</h2>
            <div className="mt-3">{Form}</div>
          </MobileCard>
        ) : (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-400/15 text-[14px] font-semibold text-cyan-50"
          >
            <Plus className="h-4.5 w-4.5" strokeWidth={2.2} aria-hidden />
            Zadat akutní výkon
          </button>
        )}

        <MobileSectionLabel>Fronta požadavků</MobileSectionLabel>
        <div className="px-1">{Queue}</div>
      </MobileScreen>

      {/* ========== DESKTOPOVÉ ROZVRŽENÍ ========== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="app-module-shell hidden h-full w-full flex-col px-8 py-8 md:flex md:pl-32 md:pr-10"
      >
        <div className="app-module-content flex h-full min-h-0 flex-col">
          <header className="app-module-page-header shrink-0">
            <ModulePageHeading
              icon={Siren}
              kicker="OPERAČNÍ PROGRAM · AKUTNÍ PŘÍJEM"
              title="AKUTNÍ"
              mutedTitle="PŘÍJEM"
              actions={
                <button
                  type="button"
                  onClick={() => setFormOpen(open => !open)}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-400/12 px-3.5 text-[12.5px] font-semibold text-cyan-50 transition-colors hover:bg-cyan-400/20"
                >
                  {formOpen ? <X className="h-4 w-4" strokeWidth={2.2} aria-hidden /> : <Plus className="h-4 w-4" strokeWidth={2.2} aria-hidden />}
                  {formOpen ? 'Zavřít zadání' : 'Zadat akutní výkon'}
                </button>
              }
            />
          </header>

          <div className="grid min-h-0 flex-1 gap-5 overflow-hidden lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* fronta */}
            <section className="flex min-h-0 flex-col gap-3 overflow-hidden" aria-label="Fronta akutních požadavků">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/70">{headline}</h2>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">{Queue}</div>
            </section>

            {/* pravý sloupec: souhrn, případně formulář */}
            <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
              {Overview}
              {formOpen ? (
                <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4" aria-label="Nový požadavek">
                  <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-white/70">Nový požadavek</h2>
                  {Form}
                </section>
              ) : null}
            </aside>
          </div>
        </div>
      </motion.div>
    </>
  );
}
