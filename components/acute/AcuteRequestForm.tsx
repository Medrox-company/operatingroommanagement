'use client';

import React, { useMemo, useState } from 'react';
import { Check, Clock, X } from 'lucide-react';
import {
  URGENCY_LEVELS,
  formatDuration,
  urgencyLevel,
  type AcuteUrgency,
  type UrgencyWindows,
} from '../../lib/acute-requests';
import type { AcuteRequestDraft } from '../../contexts/AcuteRequestsContext';

/** Oddělení pro výběr žadatele. Shodné s tvarem řádku v tabulce oddělení. */
export interface AcuteDepartmentOption {
  id: string;
  name: string;
  accent_color?: string | null;
}

interface AcuteRequestFormProps {
  departments: AcuteDepartmentOption[];
  windows: UrgencyWindows;
  /** Odhad délky z naměřené historie; bez něj se použije 60 minut. */
  suggestedMinutes?: number;
  onSubmit: (draft: AcuteRequestDraft) => void;
  onCancel?: () => void;
}

const DURATION_STEPS = [30, 45, 60, 90, 120, 180];

/**
 * Zadání akutního požadavku.
 *
 * Návrh stojí na jednom předpokladu: vyplňuje se v noci, ve spěchu, na telefonu.
 * Proto jsou všechna pole na jedné obrazovce (žádný průvodce krok za krokem),
 * povinné je jen to nutné a délka se vybírá z přednastavených hodnot místo
 * psaní čísla. Čím víc povinných polí, tím spíš to někdo obejde telefonátem
 * a modul zůstane prázdný.
 */
export default function AcuteRequestForm({
  departments,
  windows,
  suggestedMinutes,
  onSubmit,
  onCancel,
}: AcuteRequestFormProps) {
  const [urgency, setUrgency] = useState<AcuteUrgency | null>(null);
  const [departmentId, setDepartmentId] = useState<string>(departments[0]?.id ?? '');
  const [procedure, setProcedure] = useState('');
  const [patientSurname, setPatientSurname] = useState('');
  const [patientWard, setPatientWard] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(suggestedMinutes ?? 60);
  const [note, setNote] = useState('');

  const department = departments.find(item => item.id === departmentId);
  const level = urgency ? urgencyLevel(urgency) : null;
  const windowMinutes = urgency ? windows[urgency] : null;

  const isComplete = Boolean(urgency && departmentId && procedure.trim() && patientSurname.trim() && estimatedMinutes > 0);

  /** Rekapitulace jednou větou — poslední kontrola před potvrzením. */
  const recap = useMemo(() => {
    if (!level) return null;
    const parts = [
      level.label,
      department?.name,
      procedure.trim() || 'výkon neuveden',
      formatDuration(estimatedMinutes),
      patientSurname.trim() ? `${patientSurname.trim()}${patientWard.trim() ? `, ${patientWard.trim()}` : ''}` : null,
    ].filter(Boolean);
    return parts.join(' · ');
  }, [level, department, procedure, estimatedMinutes, patientSurname, patientWard]);

  const submit = () => {
    if (!isComplete || !urgency) return;
    onSubmit({
      urgency,
      departmentId,
      procedure: procedure.trim(),
      patientSurname: patientSurname.trim(),
      patientWard: patientWard.trim(),
      estimatedMinutes,
      note: note.trim() || undefined,
    });
  };

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={event => { event.preventDefault(); submit(); }}
    >
      {/* 1 — stupeň */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
          Stupeň urgentnosti
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {URGENCY_LEVELS.map(item => {
            const selected = urgency === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setUrgency(item.id)}
                aria-pressed={selected}
                className="flex min-h-[72px] flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]/60"
                style={{
                  borderColor: selected ? item.color : 'rgba(255,255,255,0.09)',
                  background: selected ? `${item.color}1f` : 'rgba(255,255,255,0.025)',
                }}
              >
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} aria-hidden />
                  <span className="text-[13px] font-semibold" style={{ color: selected ? '#FFFFFF' : 'rgba(255,255,255,0.9)' }}>
                    {item.label}
                  </span>
                </span>
                <span className="text-[10.5px] leading-snug text-white/55">{item.meaning}</span>
                <span className="mt-auto text-[10px] font-semibold uppercase tracking-[0.1em] text-white/45">
                  okno {formatDuration(windows[item.id])}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* 2 — žádající oddělení */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
          Žádající oddělení
        </legend>
        {departments.length === 0 ? (
          <p className="rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-[11.5px] leading-relaxed text-amber-200/90">
            Zařízení nemá nastavená žádná oddělení. Doplňte je v nastavení; bez nich nelze určit žadatele.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {departments.map(item => {
              const selected = departmentId === item.id;
              const accent = item.accent_color || '#38BDF8';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDepartmentId(item.id)}
                  aria-pressed={selected}
                  className="min-h-[40px] rounded-lg border px-3.5 text-[12.5px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]/60"
                  style={{
                    borderColor: selected ? accent : 'rgba(255,255,255,0.09)',
                    background: selected ? `${accent}24` : 'rgba(255,255,255,0.025)',
                    color: selected ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
                  }}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      {/* 3 — výkon */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Výkon</span>
        <input
          value={procedure}
          onChange={event => setProcedure(event.target.value)}
          maxLength={120}
          placeholder="např. apendektomie"
          className="min-h-[44px] rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[14px] text-white/95 outline-none transition-colors placeholder:text-white/30 focus:border-cyan-300/50"
        />
        {/* Volný text je jediné místo, kudy se do databáze můžou dostat údaje,
            které tam nemají být. Nápověda je levnější než filtr, který by
            u akutního výkonu blokoval zadání. */}
        <span className="text-[10.5px] text-white/45">Jen typ výkonu, bez údajů o pacientovi.</span>
      </label>

      {/* 4 — pacient: pouze příjmení a oddělení */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Příjmení pacienta</span>
          <input
            value={patientSurname}
            onChange={event => setPatientSurname(event.target.value)}
            maxLength={60}
            autoComplete="off"
            className="min-h-[44px] rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[14px] text-white/95 outline-none transition-colors focus:border-cyan-300/50"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Oddělení pacienta</span>
          <input
            value={patientWard}
            onChange={event => setPatientWard(event.target.value)}
            maxLength={40}
            placeholder="např. JIP 2"
            className="min-h-[44px] rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[14px] text-white/95 outline-none transition-colors placeholder:text-white/30 focus:border-cyan-300/50"
          />
        </label>
      </div>

      {/* 5 — předpokládaná délka */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
          Předpokládaná délka
          {suggestedMinutes ? (
            <span className="font-normal normal-case tracking-normal text-white/40">
              z naměřené historie {formatDuration(suggestedMinutes)}
            </span>
          ) : null}
        </legend>
        <div className="flex flex-wrap gap-2">
          {DURATION_STEPS.map(minutes => {
            const selected = estimatedMinutes === minutes;
            return (
              <button
                key={minutes}
                type="button"
                onClick={() => setEstimatedMinutes(minutes)}
                aria-pressed={selected}
                className={`min-h-[40px] min-w-[68px] rounded-lg border px-3 text-[12.5px] font-semibold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]/60 ${
                  selected
                    ? 'border-cyan-300/50 bg-cyan-400/15 text-white'
                    : 'border-white/10 bg-white/[0.025] text-white/70 hover:bg-white/[0.05]'
                }`}
              >
                {formatDuration(minutes)}
              </button>
            );
          })}
          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-3">
            <span className="text-[10.5px] uppercase tracking-[0.1em] text-white/45">jinak</span>
            <input
              type="number"
              min={5}
              max={600}
              step={5}
              value={estimatedMinutes}
              onChange={event => setEstimatedMinutes(Math.max(5, Math.min(600, Number(event.target.value) || 0)))}
              className="w-16 bg-transparent py-2 text-[13px] font-semibold tabular-nums text-white/95 outline-none"
              aria-label="Předpokládaná délka v minutách"
            />
            <span className="text-[10.5px] text-white/45">min</span>
          </label>
        </div>
      </fieldset>

      {/* volitelná poznámka pro sál */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
          Poznámka pro sál <span className="font-normal normal-case tracking-normal text-white/40">volitelné</span>
        </span>
        <input
          value={note}
          onChange={event => setNote(event.target.value)}
          maxLength={120}
          placeholder="septický výkon, potřeba ARO lůžka, zvláštní instrumentárium"
          className="min-h-[44px] rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[13px] text-white/95 outline-none transition-colors placeholder:text-white/30 focus:border-cyan-300/50"
        />
      </label>

      {/* rekapitulace a potvrzení */}
      <div className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
        <p className="text-[13px] leading-relaxed text-white/85">
          {recap || <span className="text-white/45">Vyberte stupeň urgentnosti.</span>}
        </p>
        {windowMinutes !== null && level ? (
          <p className="flex items-center gap-2 text-[11.5px]" style={{ color: `${level.color}cc` }}>
            <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            Okno do sálu {formatDuration(windowMinutes)} od zadání.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={!isComplete}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-400/15 px-4 text-[13px] font-semibold text-cyan-50 transition-colors hover:bg-cyan-400/22 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check className="h-4 w-4" strokeWidth={2.2} aria-hidden />
            Zařadit do fronty
          </button>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 text-[13px] font-medium text-white/70 transition-colors hover:bg-white/[0.07]"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
              Zrušit
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
