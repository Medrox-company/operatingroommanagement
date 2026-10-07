'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Plus, Siren, X } from 'lucide-react';
import ModulePageHeading from '../ModulePageHeading';
import { MobileCard, MobileModuleHeader, MobileScreen, MobileSectionLabel } from '../mobile/MobileShell';
import { useNowMinuteMs } from '../../hooks/useSharedClock';
import { useAcuteRequests } from '../../contexts/AcuteRequestsContext';
import { URGENCY_LEVELS, formatDuration, isWaiting } from '../../lib/acute-requests';
import { C } from '../statistics/statistics-theme';
import { SectionLabel } from '../statistics/StatisticsPrimitives';
import AcuteQueue from './AcuteQueue';
import AcuteRequestForm, { type AcuteDepartmentOption } from './AcuteRequestForm';

/**
 * Modul Akutní příjem — fronta požadavků na akutní operační výkon.
 *
 * Obal, typografie i plochy jsou shodné s ostatními moduly: `app-module-shell`
 * / `app-module-content` / `app-module-page-header` a ModulePageHeading na
 * desktopu, MobileScreen s kartami na telefonu. Barvy a odstíny textu jdou
 * z tokenů `--stats-*` na :root. Modul nepřidává žádný vlastní CSS soubor.
 *
 * První krok staví jen rozhraní; druhý vymění paměťové úložiště za tabulky,
 * aniž by se komponenty změnily.
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
  { id: 'demo-gynekologie', name: 'Gynekologie', accent_color: '#10B981' },
];

export default function AcuteRequestsModule() {
  const { requests, summary, windows, isDemoData, createRequest, moveToPosition } = useAcuteRequests();
  const nowMs = useNowMinuteMs();
  const [formOpen, setFormOpen] = useState(false);

  const waiting = useMemo(() => requests.filter(isWaiting), [requests]);

  const headline = summary.waiting === 0
    ? 'Fronta je prázdná'
    : `${summary.waiting} ${summary.waiting === 1 ? 'požadavek' : summary.waiting < 5 ? 'požadavky' : 'požadavků'} čeká na sál`;

  const nextDeadline = summary.nextDeadlineMs
    ? new Date(summary.nextDeadlineMs).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
    : null;

  /**
   * Souhrn po stupních — stejná geometrie jako pruh ukazatelů ve statistikách:
   * drobný popisek nad velkým lehkým číslem.
   */
  const Overview = (
    <div className="flex flex-col gap-3">
      <div
        className="grid grid-cols-3 overflow-hidden rounded-xl"
        style={{ background: C.surface, border: `1px solid ${C.border}` }}
      >
        {URGENCY_LEVELS.map((level, index) => {
          const count = summary.byUrgency[level.id];
          return (
            <div
              key={level.id}
              className="flex flex-col justify-between px-4 py-3"
              style={{ borderRight: index < URGENCY_LEVELS.length - 1 ? `1px solid ${C.border}` : undefined }}
            >
              <p
                className="mb-2.5 text-[9px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: count > 0 ? level.color : C.muted }}
              >
                {level.label}
              </p>
              <p className="text-2xl font-light leading-none tabular-nums" style={{ color: count > 0 ? C.text : C.faint }}>
                {count}
              </p>
              <p className="mt-1.5 text-[10px]" style={{ color: C.faint }}>okno {formatDuration(windows[level.id])}</p>
            </div>
          );
        })}
      </div>

      {summary.overdue > 0 ? (
        <p
          className="flex items-start gap-2 rounded-lg px-3 py-2 text-[11.5px] leading-relaxed"
          style={{ background: `${C.red}14`, border: `1px solid ${C.red}3d`, color: C.text }}
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: C.red }} strokeWidth={2} aria-hidden />
          {summary.overdue} {summary.overdue === 1 ? 'požadavek má' : 'požadavky mají'} vypršelé okno do sálu.
        </p>
      ) : nextDeadline ? (
        <p className="text-[11.5px]" style={{ color: C.muted }}>Nejbližší konec okna v {nextDeadline}.</p>
      ) : null}

      {isDemoData ? (
        <p
          className="rounded-lg px-3 py-2 text-[11px] leading-relaxed"
          style={{ background: `${C.yellow}12`, border: `1px solid ${C.yellow}2e`, color: C.muted }}
        >
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
          <MobileCard as="button" onClick={() => setFormOpen(true)}>
            <span className="flex items-center justify-center gap-2 text-[14px] font-semibold" style={{ color: 'var(--m-accent)' }}>
              <Plus className="h-4 w-4" strokeWidth={2.2} aria-hidden />
              Zadat akutní výkon
            </span>
          </MobileCard>
        )}

        <MobileSectionLabel>Fronta požadavků</MobileSectionLabel>
        {Queue}
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
                  aria-pressed={formOpen}
                  className="dashboard-view-option"
                >
                  {formOpen ? <X className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden /> : <Plus className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />}
                  {formOpen ? 'Zavřít zadání' : 'Zadat akutní výkon'}
                </button>
              }
            />
          </header>

          <div className="grid min-h-0 flex-1 gap-5 overflow-hidden lg:grid-cols-[minmax(0,1fr)_380px]">
            <section className="flex min-h-0 flex-col overflow-hidden" aria-label="Fronta akutních požadavků">
              <SectionLabel>{headline}</SectionLabel>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">{Queue}</div>
            </section>

            <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
              {Overview}
              {formOpen ? (
                <section aria-label="Nový požadavek">
                  <SectionLabel>Nový požadavek</SectionLabel>
                  <div className="rounded-xl p-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                    {Form}
                  </div>
                </section>
              ) : null}
            </aside>
          </div>
        </div>
      </motion.div>
    </>
  );
}
