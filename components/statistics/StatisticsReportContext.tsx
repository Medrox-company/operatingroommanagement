'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import type { StatisticsTab } from './StatisticsNavigation';
import type { StatisticsReport } from '../../lib/statistics-print';
import { StatisticsPhaseFilterContext } from './StatisticsPhaseFilterContext';
import { statisticsPhaseFilterNote } from '../../lib/statistics-phase-filter';

export type { StatisticsReport } from '../../lib/statistics-print';

type RegisterReport = (tab: StatisticsTab, report: StatisticsReport | null) => () => void;
export const StatisticsReportContext = createContext<RegisterReport | null>(null);

/** Publish committed tab data, including its local filters, without fetching or
 * re-rendering the parent. Unmounted/loading tabs cannot leave a stale report. */
export function useStatisticsReport(tab: StatisticsTab, report: StatisticsReport | null) {
  const register = useContext(StatisticsReportContext);
  const excludeShortPhases = useContext(StatisticsPhaseFilterContext);
  const describedReport = useMemo(() => report ? {
    ...report,
    context: `${report.context ?? ''} ${statisticsPhaseFilterNote(excludeShortPhases)}`.trim(),
  } : null, [report, excludeShortPhases]);
  useEffect(() => register?.(tab, describedReport), [register, tab, describedReport]);
}
