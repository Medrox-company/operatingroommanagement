'use client';

import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { percentChange, useStatisticsComparison } from '../hooks/useStatisticsComparison';
import type { StatisticsPeriod } from '../hooks/useStatisticsData';

/**
 * Srovnání období.
 *
 * Číslo za měsíc nic neříká, dokud není proti čemu ho položit. Pruh ukazuje
 * tři klíčové ukazatele proti bezprostředně předchozímu stejně dlouhému oknu
 * a proti témuž oknu loni — sezónní výkyv tak nevypadá jako zlepšení.
 */
const PERIOD_LABEL: Record<StatisticsPeriod, { previous: string; lastYear: string }> = {
  'den': { previous: 'proti předchozímu dni', lastYear: 'proti témuž dni loni' },
  'týden': { previous: 'proti minulému týdnu', lastYear: 'proti témuž týdnu loni' },
  'měsíc': { previous: 'proti minulému měsíci', lastYear: 'proti témuž měsíci loni' },
  'rok': { previous: 'proti předchozímu roku', lastYear: 'proti předloňskému roku' },
};

interface Palette {
  accent: string;
  green: string;
  red: string;
  muted: string;
  faint: string;
  text: string;
  border: string;
  surface: string;
}

interface Metric {
  label: string;
  value: number;
  suffix?: string;
  /** U některých metrik je pokles dobrá zpráva (nouzové režimy). */
  lowerIsBetter?: boolean;
}

function Delta({ change, palette, lowerIsBetter }: { change: number | null; palette: Palette; lowerIsBetter?: boolean }) {
  if (change === null) {
    return <span className="text-[10px]" style={{ color: palette.faint }}>bez srovnání</span>;
  }
  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: palette.muted }}>
        <Minus className="h-3 w-3" strokeWidth={2} aria-hidden /> beze změny
      </span>
    );
  }
  const rising = change > 0;
  const good = lowerIsBetter ? !rising : rising;
  const Icon = rising ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums"
      style={{ color: good ? palette.green : palette.red }}
    >
      <Icon className="h-3 w-3" strokeWidth={2.2} aria-hidden />
      {rising ? '+' : ''}{change} %
    </span>
  );
}

export default function StatisticsTrendStrip({ period, palette }: { period: StatisticsPeriod; palette: Palette }) {
  const { comparison, isLoading } = useStatisticsComparison(period);

  // Než data dorazí — a když srovnání selže — pruh se prostě neukáže.
  // Hlavní statistiky na něm nestojí.
  if (isLoading || !comparison) return null;

  const { current, previous, lastYear } = comparison;

  const metrics: Metric[] = [
    { label: 'Dokončené výkony', value: current.operations },
    { label: 'Průměrná délka výkonu', value: Math.round(current.averageOperationMinutes), suffix: ' min', lowerIsBetter: true },
    { label: 'Nouzové režimy', value: current.emergencies, lowerIsBetter: true },
  ];

  const baselines: Array<[keyof typeof previous, number]> = [
    ['operations', previous.operations],
    ['averageOperationMinutes', previous.averageOperationMinutes],
    ['emergencies', previous.emergencies],
  ];

  const labels = PERIOD_LABEL[period];

  return (
    <section
      className="stats-trend-strip grid gap-px overflow-hidden rounded-lg sm:grid-cols-3"
      style={{ border: `1px solid ${palette.border}`, background: palette.border }}
      aria-label={`Srovnání období — ${labels.previous}`}
    >
      {metrics.map((metric, index) => {
        const previousValue = baselines[index][1];
        const lastYearValue = lastYear
          ? [lastYear.operations, lastYear.averageOperationMinutes, lastYear.emergencies][index]
          : null;
        return (
          <div key={metric.label} className="flex flex-col gap-2 px-4 py-3" style={{ background: palette.surface }}>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: palette.muted }}>
              {metric.label}
            </p>
            <p className="text-2xl font-light leading-none tabular-nums" style={{ color: palette.text }}>
              {metric.value}{metric.suffix ?? ''}
            </p>
            <div className="flex flex-col gap-1">
              <span className="flex items-baseline gap-1.5">
                <Delta change={percentChange(metric.value, previousValue)} palette={palette} lowerIsBetter={metric.lowerIsBetter} />
                <span className="text-[9.5px]" style={{ color: palette.faint }}>{labels.previous}</span>
              </span>
              <span className="flex items-baseline gap-1.5">
                <Delta
                  change={lastYearValue === null ? null : percentChange(metric.value, lastYearValue)}
                  palette={palette}
                  lowerIsBetter={metric.lowerIsBetter}
                />
                <span className="text-[9.5px]" style={{ color: palette.faint }}>{labels.lastYear}</span>
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
