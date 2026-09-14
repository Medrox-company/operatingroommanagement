'use client';

import { createContext, useContext, useEffect } from 'react';
import type { StatisticsTab } from './StatisticsNavigation';
import type { StatisticsReport } from '../../lib/statistics-print';

export type { StatisticsReport } from '../../lib/statistics-print';

type RegisterReport = (tab: StatisticsTab, report: StatisticsReport | null) => () => void;
export const StatisticsReportContext = createContext<RegisterReport | null>(null);

/** Publish committed tab data, including its local filters, without fetching or
 * re-rendering the parent. Unmounted/loading tabs cannot leave a stale report. */
export function useStatisticsReport(tab: StatisticsTab, report: StatisticsReport | null) {
  const register = useContext(StatisticsReportContext);
  useEffect(() => register?.(tab, report), [register, tab, report]);
}
