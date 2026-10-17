'use client';

import { createContext, useContext, useMemo } from 'react';
import type { StatusHistoryRow } from '../../lib/db';
import { filterStatisticsPhaseDurations } from '../../lib/statistics-phase-filter';

export const StatisticsPhaseFilterContext = createContext(false);

/** Covers day histories fetched inside tabs as well as the parent's snapshots. */
export function useStatisticsPhaseHistory(history: StatusHistoryRow[]): StatusHistoryRow[] {
  const excluded = useContext(StatisticsPhaseFilterContext);
  return useMemo(() => filterStatisticsPhaseDurations(history, excluded), [history, excluded]);
}
