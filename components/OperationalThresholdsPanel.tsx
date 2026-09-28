'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, SlidersHorizontal } from 'lucide-react';
import { DEFAULT_THRESHOLDS, type OperationalThresholds } from '../hooks/useOperationalThresholds';

/**
 * Provozní prahy upozornění.
 *
 * Každý operační trakt má jiné normály — na jednodenní chirurgii je
 * pětiminutová fáze běžná, na kardiochirurgii podezřelá. Hodnoty proto patří
 * nemocnici do ruky, ne do kódu.
 */
const FIELDS: Array<{
  key: keyof OperationalThresholds;
  label: string;
  hint: string;
}> = [
  {
    key: 'shortPhaseMinutes',
    label: 'Podezřele krátká fáze',
    hint: 'Kratší fáze vyvolá při potvrzení přechodu dotaz, jestli jde opravdu pokračovat.',
  },
  {
    key: 'cleaningWarningMinutes',
    label: 'Přesah úklidu sálu',
    hint: 'Po této době se v detailu sálu objeví upozornění, že úklid trvá déle než obvykle.',
  },
  {
    key: 'rapidSurgeryMinutes',
    label: 'Podezřele rychlý výkon',
    hint: 'Přechod z příjezdu na sál do chirurgického výkonu kratší než tato doba vyvolá varování.',
  },
  {
    key: 'firstCaseGraceMinutes',
    label: 'Tolerance prvního startu',
    hint: 'O kolik smí první výkon dne nabrat zpoždění, aby se ve statistikách počítal jako včasný.',
  },
];

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function OperationalThresholdsPanel() {
  const [values, setValues] = useState<OperationalThresholds>(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [state, setState] = useState<SaveState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/operational-thresholds', { credentials: 'include', cache: 'no-store' });
        const json = await response.json();
        if (cancelled) return;
        if (json?.thresholds) setValues(json.thresholds);
        setConfigured(Boolean(json?.configured));
      } catch {
        // Necháme výchozí hodnoty, panel zůstane použitelný.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const save = useCallback(async () => {
    setState('saving');
    setMessage(null);
    try {
      const response = await fetch('/api/operational-thresholds', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setState('error');
        setMessage(json?.error || 'Uložení se nezdařilo.');
        return;
      }
      setState('saved');
      window.setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('error');
      setMessage('Uložení se nezdařilo — zkontrolujte spojení.');
    }
  }, [values]);

  const setField = (key: keyof OperationalThresholds, raw: string) => {
    const parsed = Number(raw);
    setValues(previous => ({
      ...previous,
      [key]: Number.isFinite(parsed) ? Math.min(240, Math.max(1, Math.round(parsed))) : previous[key],
    }));
  };

  return (
    <section className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
      <header className="mb-3 flex items-center gap-2.5">
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-white/45" strokeWidth={1.6} aria-hidden />
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold leading-tight text-white/92">Provozní prahy upozornění</h2>
          <p className="mt-0.5 text-[10.5px] leading-tight text-white/38">
            Kdy má systém upozornit, že něco trvá jinak, než je na tomto pracovišti obvyklé.
          </p>
        </div>
      </header>

      {!loading && !configured && (
        <p className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-[11px] leading-relaxed text-amber-200/90">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
          Prahy zatím nejsou v databázi — aplikace jede na výchozích hodnotách. Uložení bude
          fungovat po spuštění skriptu <code className="text-amber-100">scripts/add-operational-thresholds.sql</code>.
        </p>
      )}

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {FIELDS.map(({ key, label, hint }) => (
          <label key={key} className="flex flex-col gap-1.5 rounded-lg border border-white/[0.05] bg-black/10 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-white/45">{label}</span>
            <span className="flex items-baseline gap-1.5">
              <input
                type="number"
                min={1}
                max={240}
                value={values[key]}
                disabled={loading}
                onChange={event => setField(key, event.target.value)}
                className="w-16 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[17px] font-light tabular-nums text-white/95 outline-none transition-colors focus:border-cyan-300/50"
              />
              <span className="text-[10px] text-white/35">minut</span>
            </span>
            <span className="text-[10px] leading-snug text-white/32">{hint}</span>
          </label>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={loading || state === 'saving'}
          className="inline-flex min-h-[34px] items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-400/10 px-3.5 text-[12px] font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/16 disabled:opacity-50"
        >
          {state === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          {state === 'saved' ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
          {state === 'saving' ? 'Ukládám…' : state === 'saved' ? 'Uloženo' : 'Uložit prahy'}
        </button>
        {message && <span className="text-[11px] text-amber-300/90">{message}</span>}
      </div>
    </section>
  );
}
