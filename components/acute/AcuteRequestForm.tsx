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
import { C } from '../statistics/statistics-theme';
import type { AcuteRequestDraft } from '../../contexts/AcuteRequestsContext';

/**
 * Zadání akutního požadavku.
 *
 * Vzhled se drží designového jazyka aplikace, ne vlastních hodnot: plochy,
 * okraje a odstíny textu jdou z tokenů `--stats-*` na :root (přístupné přes
 * objekt C), ovládací prvky mají geometrii `.dashboard-view-option`, nadpisy
 * sekcí stejnou stupnici jako statistiky. Žádná nová vrstva CSS.
 *
 * Pozn.: objekt C žije v components/statistics/, protože tam vznikl. Jsou to
 * ale celoaplikační tokeny — jejich přesun do neutrálního místa je součástí
 * plánovaného sjednocení designového systému.
 *
 * Návrh stojí na jednom předpokladu: vyplňuje se v noci, ve spěchu, na
 * telefonu. Proto je vše na jedné obrazovce, povinné jen to nutné a délka se
 * vybírá z přednastavených hodnot místo psaní čísla.
 */

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

/** Popisek sekce — stejná stupnice jako SectionLabel ve statistikách. */
function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <span className="flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.muted }}>
      {children}
      {hint ? <span className="font-normal normal-case tracking-normal" style={{ color: C.faint }}>{hint}</span> : null}
    </span>
  );
}

/** Textové pole v jednotném vzhledu modulů. */
function TextField({
  value, onChange, placeholder, maxLength, ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  maxLength?: number;
  ariaLabel?: string;
}) {
  return (
    <input
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      aria-label={ariaLabel}
      autoComplete="off"
      className="min-h-[36px] rounded-lg px-3 text-[13px] outline-none transition-colors"
      style={{ background: C.surfaceActive, border: `1px solid ${C.border}`, color: C.text }}
    />
  );
}

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
    return [
      level.label,
      department?.name,
      procedure.trim() || 'výkon neuveden',
      formatDuration(estimatedMinutes),
      patientSurname.trim() ? `${patientSurname.trim()}${patientWard.trim() ? `, ${patientWard.trim()}` : ''}` : null,
    ].filter(Boolean).join(' · ');
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
    <form className="flex flex-col gap-5" onSubmit={event => { event.preventDefault(); submit(); }}>
      {/* 1 — stupeň */}
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5"><FieldLabel>Stupeň urgentnosti</FieldLabel></legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {URGENCY_LEVELS.map(item => {
            const selected = urgency === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setUrgency(item.id)}
                aria-pressed={selected}
                className="flex flex-col items-start gap-1.5 rounded-xl p-3 text-left transition-colors"
                style={{
                  background: selected ? `${item.color}1a` : C.surface,
                  border: `1px solid ${selected ? `${item.color}66` : C.border}`,
                }}
              >
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: item.color }} aria-hidden />
                  <span className="text-[12px] font-semibold" style={{ color: selected ? item.color : C.text }}>
                    {item.label}
                  </span>
                </span>
                <span className="text-[10.5px] leading-snug" style={{ color: C.muted }}>{item.meaning}</span>
                <span className="mt-auto text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.faint }}>
                  okno {formatDuration(windows[item.id])}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* 2 — žádající oddělení */}
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5"><FieldLabel>Žádající oddělení</FieldLabel></legend>
        {departments.length === 0 ? (
          <p
            className="rounded-lg px-3 py-2 text-[11.5px] leading-relaxed"
            style={{ background: `${C.yellow}14`, border: `1px solid ${C.yellow}33`, color: C.text }}
          >
            Zařízení nemá nastavená žádná oddělení. Doplňte je v nastavení; bez nich nelze určit žadatele.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {departments.map(item => {
              const selected = departmentId === item.id;
              const accent = item.accent_color || C.accent;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDepartmentId(item.id)}
                  aria-pressed={selected}
                  className="dashboard-view-option"
                  style={selected ? { background: `${accent}26`, color: '#EDF5FF', boxShadow: `inset 0 0 0 1px ${accent}59` } : undefined}
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
        <FieldLabel>Výkon</FieldLabel>
        <TextField value={procedure} onChange={setProcedure} maxLength={120} placeholder="např. apendektomie" />
        {/* Volný text je jediné místo, kudy se do databáze můžou dostat údaje,
            které tam nemají být. Nápověda je levnější než filtr, který by
            u akutního výkonu blokoval zadání. */}
        <span className="text-[10.5px]" style={{ color: C.faint }}>Jen typ výkonu, bez údajů o pacientovi.</span>
      </label>

      {/* 4 — pacient: pouze příjmení a oddělení */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Příjmení pacienta</FieldLabel>
          <TextField value={patientSurname} onChange={setPatientSurname} maxLength={60} />
        </label>
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Oddělení pacienta</FieldLabel>
          <TextField value={patientWard} onChange={setPatientWard} maxLength={40} placeholder="např. JIP 2" />
        </label>
      </div>

      {/* 5 — předpokládaná délka */}
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5">
          <FieldLabel hint={suggestedMinutes ? `z naměřené historie ${formatDuration(suggestedMinutes)}` : undefined}>
            Předpokládaná délka
          </FieldLabel>
        </legend>
        <div className="flex flex-wrap items-center gap-1.5">
          {DURATION_STEPS.map(minutes => (
            <button
              key={minutes}
              type="button"
              onClick={() => setEstimatedMinutes(minutes)}
              aria-pressed={estimatedMinutes === minutes}
              className="dashboard-view-option tabular-nums"
            >
              {formatDuration(minutes)}
            </button>
          ))}
          <span
            className="flex min-h-[36px] items-center gap-2 rounded-lg px-3"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}
          >
            <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color: C.faint }}>jinak</span>
            <input
              type="number"
              min={5}
              max={600}
              step={5}
              value={estimatedMinutes}
              onChange={event => setEstimatedMinutes(Math.max(5, Math.min(600, Number(event.target.value) || 0)))}
              className="w-14 bg-transparent text-[12px] font-semibold tabular-nums outline-none"
              style={{ color: C.text }}
              aria-label="Předpokládaná délka v minutách"
            />
            <span className="text-[10px]" style={{ color: C.faint }}>min</span>
          </span>
        </div>
      </fieldset>

      {/* volitelná poznámka pro sál */}
      <label className="flex flex-col gap-1.5">
        <FieldLabel hint="volitelné">Poznámka pro sál</FieldLabel>
        <TextField
          value={note}
          onChange={setNote}
          maxLength={120}
          placeholder="septický výkon, potřeba ARO lůžka, zvláštní instrumentárium"
        />
      </label>

      {/* rekapitulace a potvrzení */}
      <div className="flex flex-col gap-3 rounded-xl p-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <p className="text-[12.5px] leading-relaxed" style={{ color: recap ? C.text : C.faint }}>
          {recap || 'Vyberte stupeň urgentnosti.'}
        </p>
        {windowMinutes !== null && level ? (
          <p className="flex items-center gap-2 text-[11.5px]" style={{ color: level.color }}>
            <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            Okno do sálu {formatDuration(windowMinutes)} od zadání.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="submit"
            disabled={!isComplete}
            aria-pressed={isComplete}
            className="dashboard-view-option disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
            Zařadit do fronty
          </button>
          {onCancel ? (
            <button type="button" onClick={onCancel} className="dashboard-view-option">
              <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Zrušit
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
