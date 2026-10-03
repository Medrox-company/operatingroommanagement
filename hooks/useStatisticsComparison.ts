'use client';

import useSWR from 'swr';
import { fetchStatusHistory } from '../lib/db';
import { useHospital } from '../contexts/HospitalContext';
import { aggregateRoomStatistics, type StatisticsPeriod } from './useStatisticsData';

/**
 * Srovnání období.
 *
 * Absolutní číslo za měsíc samo o sobě málo řekne — provozní data dávají smysl
 * až v trendu. Hook dopočítá stejně dlouhé okno bezprostředně před zvoleným
 * obdobím a totéž okno o rok dřív, takže jde odlišit skutečný posun od
 * sezónního výkyvu.
 *
 * Načítá se samostatně a líně: hlavní statistiky na něj nečekají a při chybě
 * se srovnání jen nezobrazí.
 */
const DAYS: Record<StatisticsPeriod, number> = {
  'den': 1,
  'týden': 7,
  'měsíc': 30,
  'rok': 365,
};

export interface PeriodSummary {
  operations: number;
  emergencies: number;
  averageOperationMinutes: number;
}

export interface StatisticsComparison {
  current: PeriodSummary;
  previous: PeriodSummary;
  lastYear: PeriodSummary | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function summarize(history: Awaited<ReturnType<typeof fetchStatusHistory>>): PeriodSummary {
  const rows = history ?? [];
  const stats = aggregateRoomStatistics(rows);
  return {
    operations: stats.totalOperations,
    emergencies: stats.emergencyCount,
    averageOperationMinutes: stats.averageOperationDuration,
  };
}

/** Rozdíl v procentech proti srovnávacímu období; null, když není s čím srovnávat. */
export function percentChange(current: number, baseline: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || baseline === 0) return null;
  return Math.round(((current - baseline) / baseline) * 100);
}

export function useStatisticsComparison(period: StatisticsPeriod) {
  const { activeHospitalId } = useHospital();

  const { data, error, isLoading } = useSWR<StatisticsComparison>(
    activeHospitalId ? ['statistics-comparison', activeHospitalId, period] : null,
    async () => {
      const now = new Date();
      const days = DAYS[period];
      const currentFrom = new Date(now.getTime() - days * DAY_MS);
      const previousFrom = new Date(currentFrom.getTime() - days * DAY_MS);

      // Stejné okno loni — posun o kalendářní rok, ne o 365 dní, aby seděl
      // přestupný rok i posun pracovních dnů byl co nejmenší.
      const lastYearTo = new Date(now);
      lastYearTo.setFullYear(lastYearTo.getFullYear() - 1);
      const lastYearFrom = new Date(lastYearTo.getTime() - days * DAY_MS);

      const [current, previous, lastYear] = await Promise.all([
        fetchStatusHistory({ fromDate: currentFrom, toDate: now, all: true }),
        fetchStatusHistory({ fromDate: previousFrom, toDate: currentFrom, all: true }),
        fetchStatusHistory({ fromDate: lastYearFrom, toDate: lastYearTo, all: true }),
      ]);

      return {
        current: summarize(current),
        previous: summarize(previous),
        // Prázdná loňská historie není nula, ale „nemáme s čím srovnat".
        lastYear: lastYear && lastYear.length > 0 ? summarize(lastYear) : null,
      };
    },
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  return { comparison: data ?? null, isLoading, error };
}
