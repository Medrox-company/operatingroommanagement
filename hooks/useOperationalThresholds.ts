'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useHospital } from '../contexts/HospitalContext';

/**
 * Provozní prahy upozornění.
 *
 * Do teď byly zadrátované v komponentách (5 minut u krátké fáze, 30 minut
 * u úklidu, 15 minut u pozdního startu prvního výkonu). Každý operační trakt
 * má ale jiné normály — na jednodenní chirurgii je pětiminutová fáze běžná,
 * na kardiochirurgii podezřelá. Hodnoty proto patří do nastavení zařízení.
 *
 * Sloupce v `app_settings` mohou v starší databázi chybět; hook v tom případě
 * vrátí výchozí hodnoty, takže se aplikace chová jako dosud.
 */
export interface OperationalThresholds {
  /** Kratší fáze vyvolá dotaz při potvrzení přechodu (minuty). */
  shortPhaseMinutes: number;
  /** Úklid delší než tohle hlásí varování v detailu sálu (minuty). */
  cleaningWarningMinutes: number;
  /** Výkon kratší než tohle označí banner „podezřele rychlý výkon" (minuty). */
  rapidSurgeryMinutes: number;
  /** Tolerance pozdního startu prvního výkonu dne (minuty). */
  firstCaseGraceMinutes: number;
}

export const DEFAULT_THRESHOLDS: OperationalThresholds = {
  shortPhaseMinutes: 5,
  cleaningWarningMinutes: 30,
  rapidSurgeryMinutes: 5,
  firstCaseGraceMinutes: 15,
};

/** Názvy sloupců v `app_settings` — drží se konvence ostatních polí tabulky. */
export const THRESHOLD_COLUMNS = {
  shortPhaseMinutes: 'threshold_short_phase_minutes',
  cleaningWarningMinutes: 'threshold_cleaning_warning_minutes',
  rapidSurgeryMinutes: 'threshold_rapid_surgery_minutes',
  firstCaseGraceMinutes: 'threshold_first_case_grace_minutes',
} as const;

function toMinutes(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  // Nula ani záporné číslo nedávají smysl a vypnuly by upozornění potichu.
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function useOperationalThresholds() {
  const { activeHospitalId } = useHospital();
  const [thresholds, setThresholds] = useState<OperationalThresholds>(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!activeHospitalId) {
      setThresholds(DEFAULT_THRESHOLDS);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('hospital_id', activeHospitalId)
        .maybeSingle();

      if (error || !data) {
        setThresholds(DEFAULT_THRESHOLDS);
        return;
      }
      const row = data as Record<string, unknown>;
      setThresholds({
        shortPhaseMinutes: toMinutes(row[THRESHOLD_COLUMNS.shortPhaseMinutes], DEFAULT_THRESHOLDS.shortPhaseMinutes),
        cleaningWarningMinutes: toMinutes(row[THRESHOLD_COLUMNS.cleaningWarningMinutes], DEFAULT_THRESHOLDS.cleaningWarningMinutes),
        rapidSurgeryMinutes: toMinutes(row[THRESHOLD_COLUMNS.rapidSurgeryMinutes], DEFAULT_THRESHOLDS.rapidSurgeryMinutes),
        firstCaseGraceMinutes: toMinutes(row[THRESHOLD_COLUMNS.firstCaseGraceMinutes], DEFAULT_THRESHOLDS.firstCaseGraceMinutes),
      });
    } catch {
      // Výpadek spojení nesmí shodit detail sálu — jedeme na výchozích hodnotách.
      setThresholds(DEFAULT_THRESHOLDS);
    } finally {
      setLoading(false);
    }
  }, [activeHospitalId]);

  useEffect(() => { void load(); }, [load]);

  return { thresholds, loading, refresh: load };
}
