'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeftRight, LogOut, RefreshCw, Scissors, SlidersHorizontal, Sparkles, Stethoscope, type LucideIcon } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { OperatingRoom } from '../../types';
import { fetchStatusHistory, type StatusHistoryProgress, type StatusHistoryRow } from '../../lib/db';
import { useWorkflowStatusesContext } from '../../contexts/WorkflowStatusesContext';
import { useHospital } from '../../contexts/HospitalContext';
import {
  buildMonthlyPerformance,
  performanceDayRange,
  type MetricSummary,
  type PerformanceMetricKind,
  type PerformanceMonth,
} from '../../lib/statistics-performance';
import type { StatisticsReport } from '../../lib/statistics-print';
import { useStatisticsReport } from './StatisticsReportContext';
import { Card, C } from './shared';
import { PerformancePreloader } from './PerformancePreloader';
import { GlassCalendar } from './AppCharts';
import './performance-tab.css';
import './performance-preloader.css';

export interface PerformanceTabProps {
  rooms: OperatingRoom[];
  history: StatusHistoryRow[];
  isLoading: boolean;
  error: string | null;
  loadedAt: string | null;
  loadingProgress?: StatusHistoryProgress;
  onRefresh: () => void;
  excludeShortPhases?: boolean;
  onExcludeShortPhasesChange?: (excluded: boolean) => void;
}

type DisplayMode = 'all-positive' | 'at-least-minute';

const METRICS: Array<{ key: PerformanceMetricKind; label: string; icon: LucideIcon }> = [
  { key: 'aroStart', label: 'ARO START', icon: Stethoscope },
  { key: 'surgery', label: 'Chirurgický výkon', icon: Scissors },
  { key: 'aroEnd', label: 'ARO KONEC', icon: LogOut },
  { key: 'cleanup', label: 'Úklid', icon: Sparkles },
  { key: 'turnover', label: 'Obrat pacienta', icon: ArrowLeftRight },
];

const wholeFormatter = new Intl.NumberFormat('cs-CZ');
const minuteFormatter = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 });

function formatMinutes(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  // Round only the final presentation; the model, sample filters and graph
  // coordinates retain their measured precision.
  return `${minuteFormatter.format(value)} min`;
}

function formatRatio(count: number, denominator: number): string {
  return denominator > 0 ? `${Math.round((count / denominator) * 100)} %` : '—';
}

function selectedValues(summary: MetricSummary, mode: DisplayMode) {
  return mode === 'all-positive'
    ? { average: summary.rawAverageMinutes, median: summary.rawMedianMinutes, p90: summary.rawP90Minutes, count: summary.rawCount }
    : { average: summary.averageMinutes, median: summary.medianMinutes, p90: summary.p90Minutes, count: summary.count };
}

function metricExplanation(metric: PerformanceMetricKind): string {
  if (metric === 'turnover') {
    return 'Je potřeba doložený odjezd pacienta, příjezd následujícího pacienta na tentýž sál a platná nastavená pracovní doba. Započítávají se pouze minuty uvnitř pracovní doby od pondělí do pátku. Bez navazujícího příjezdu měření nevzniká.';
  }
  return 'Pro tento výběr chybí jednoznačně doložený začátek a konec intervalu. Je-li zapnutá anesteziologická fáze, její chybějící záznam nenahrazujeme příjezdem nebo odjezdem. Pomlčka není nulová doba.';
}

function TrendChart({ months, mode, metric }: {
  months: PerformanceMonth[];
  mode: DisplayMode;
  metric: PerformanceMetricKind;
}) {
  const data = useMemo(() => months.map(month => {
    const summary = month[metric];
    const values = selectedValues(summary, mode);
    return {
      month: month.key.length === 10 ? month.key.slice(8) + '.' + month.key.slice(5, 7) + '.' : month.key.slice(5) + '/' + month.key.slice(2, 4),
      fullMonth: month.label,
      partial: month.isPartial,
      average: values.average,
      p90: values.p90,
      count: values.count,
    };
  }), [months, mode, metric]);

  return (
    <div className="stats-performance-chart" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 14, left: -20, bottom: 4 }}>
          <CartesianGrid stroke="var(--stats-border)" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'var(--stats-muted)', fontSize: 10 }} interval={0} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--stats-muted)', fontSize: 10 }}
            tickFormatter={value => `${value}`}
            domain={[0, 'auto']}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{ background: 'var(--stats-surface-3)', border: '1px solid var(--stats-border-hover)', borderRadius: 8, color: 'var(--stats-text-strong)', fontSize: 12 }}
            labelFormatter={(_label, payload) => {
              const item = payload?.[0]?.payload as (typeof data)[number] | undefined;
              return item ? `${item.fullMonth}${item.partial ? (months.length === 1 && months[0].key.length === 10 ? ' · probíhající den' : ' · neuzavřený měsíc') : ''} · n=${item.count}` : '';
            }}
            formatter={(value, name) => [formatMinutes(typeof value === 'number' ? value : null), name === 'average' ? 'Průměr' : '90. percentil']}
          />
          <Line type="linear" dataKey="average" name="average" stroke="var(--performance-median)" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1.5, fill: 'var(--stats-surface-3)' }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
          <Line type="linear" dataKey="p90" name="p90" stroke="var(--performance-p90)" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2.5, strokeWidth: 1.5, fill: 'var(--stats-surface-3)' }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PerformanceTab({ rooms, history, isLoading, error, loadedAt, loadingProgress, onRefresh, excludeShortPhases, onExcludeShortPhasesChange }: PerformanceTabProps) {
  const [roomId, setRoomId] = useState('all');
  const [metric, setMetric] = useState<PerformanceMetricKind>('aroStart');
  const [localMode, setLocalMode] = useState<DisplayMode>('all-positive');
  const mode: DisplayMode = excludeShortPhases === undefined ? localMode : excludeShortPhases ? 'at-least-minute' : 'all-positive';
  const [mobilePage, setMobilePage] = useState<0 | 1>(1);
  const [monthKey, setMonthKey] = useState('current');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayRefresh, setDayRefresh] = useState(0);
  const [daySnapshot, setDaySnapshot] = useState<{
    hospitalId: string; revision: string | null; history: StatusHistoryRow[] | null;
    loadedAt: string | null; error: string | null; progress?: StatusHistoryProgress;
  } | null>(null);
  const { activeHospitalId, loading: hospitalLoading } = useHospital();
  const scopeRef = useRef(activeHospitalId);
  scopeRef.current = activeHospitalId;
  const daySelected = selectedDay !== null;
  const dayRange = useMemo(() => selectedDay ? performanceDayRange(selectedDay) : undefined, [selectedDay]);
  const scopedDaySnapshot = !hospitalLoading && daySnapshot?.hospitalId === activeHospitalId && daySnapshot.revision === loadedAt ? daySnapshot : null;
  const dayLoading = daySelected && (!scopedDaySnapshot || (!scopedDaySnapshot.history && !scopedDaySnapshot.error));
  useEffect(() => {
    if (!daySelected || !activeHospitalId || hospitalLoading) return;
    let cancelled = false;
    const hospitalId = activeHospitalId;
    setDaySnapshot({ hospitalId, revision: loadedAt, history: null, loadedAt: null, error: null });
    // Read the complete surrounding history once per selection session. A day
    // slice can lose the previous patient's departure or a later closing marker.
    void fetchStatusHistory({ all: true, toDate: new Date(), eventTypes: ['step_change', 'operation_start', 'operation_end', 'operation_completed'], onProgress: progress => {
      if (!cancelled && scopeRef.current === hospitalId) setDaySnapshot(current => current?.hospitalId === hospitalId ? { ...current, progress } : current);
    } }).then(rows => {
      if (cancelled || scopeRef.current !== hospitalId) return;
      setDaySnapshot(current => ({ hospitalId, revision: loadedAt, history: rows, loadedAt: rows ? new Date().toISOString() : null,
        error: rows === null ? 'Historii pro vybraný den se nepodařilo načíst.' : null, progress: current?.progress }));
    }).catch(() => {
      if (!cancelled && scopeRef.current === hospitalId) setDaySnapshot({ hospitalId, revision: loadedAt, history: null, loadedAt: null, error: 'Historii pro vybraný den se nepodařilo načíst.' });
    });
    return () => { cancelled = true; };
  }, [daySelected, activeHospitalId, hospitalLoading, loadedAt, dayRefresh]);
  const { workflowStatuses, loading: workflowLoading, error: workflowError, refreshStatuses } = useWorkflowStatusesContext();
  const options = useMemo(() => {
    const names = workflowStatuses.map(status => status.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' '));
    return {
      anesthesiaStartEnabled: names.some(name => /^(zacatek|zahajeni) anestezie(\b|$)|^an(a)?esthesia start$/.test(name)),
      anesthesiaEndEnabled: names.some(name => /^(ukonceni|konec) anestezie(\b|$)|^an(a)?esthesia end$/.test(name)),
    };
  }, [workflowStatuses]);
  const baseSourceError = error || workflowError || (!workflowLoading && !workflowStatuses.length ? 'Nastavení fází není dostupné.' : null);
  const sourceError = baseSourceError || (daySelected ? scopedDaySnapshot?.error : null);
  const sourcesLoading = isLoading || workflowLoading || hospitalLoading || dayLoading;
  const sourceProgress = dayLoading ? scopedDaySnapshot?.progress : loadingProgress;
  const activeProgress = sourceProgress?.complete && sourcesLoading ? { ...sourceProgress, complete: false } : sourceProgress;
  const refresh = () => { if (daySelected) { setDaySnapshot(null); setDayRefresh(value => value + 1); } else onRefresh(); void refreshStatuses(); };

  const monthlyResult = useMemo(() => buildMonthlyPerformance(history, rooms, loadedAt ? new Date(loadedAt) : new Date(), options), [history, rooms, loadedAt, options]);
  const result = useMemo(() => dayRange ? buildMonthlyPerformance(scopedDaySnapshot?.history ?? [], rooms,
    scopedDaySnapshot?.loadedAt ? new Date(scopedDaySnapshot.loadedAt) : new Date(), { ...options, endpointRange: dayRange }) : monthlyResult,
  [dayRange, scopedDaySnapshot, rooms, options, monthlyResult]);
  const selectedRoom = rooms.find(room => room.id === roomId);
  const monthlyMonths = (selectedRoom ? monthlyResult.byRoom[selectedRoom.id] : monthlyResult.months) ?? monthlyResult.months;
  const dayLabel = dayRange ? dayRange.from.toLocaleDateString('cs-CZ', { timeZone: 'Europe/Prague', dateStyle: 'long' }) : null;
  const months = useMemo(() => ((selectedRoom ? result.byRoom[selectedRoom.id] : result.months) ?? result.months).map(month => dayRange ? {
    ...month, key: selectedDay!, label: dayLabel!, start: dayRange.from.toISOString(), end: dayRange.to.toISOString(),
    isPartial: Date.now() < dayRange.to.getTime(),
  } : month), [selectedRoom, result, dayRange, selectedDay, dayLabel]);
  const selectedMonth = monthlyMonths.find(month => month.key === monthKey) ?? monthlyMonths.at(-1)!;
  const calendarValue = useMemo(() => selectedDay
    ? new Date(Number(selectedDay.slice(0, 4)), Number(selectedDay.slice(5, 7)) - 1, Number(selectedDay.slice(8, 10)))
    : new Date(Number(selectedMonth.key.slice(0, 4)), Number(selectedMonth.key.slice(5, 7)) - 1,
      selectedMonth.isPartial ? Number(new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'Europe/Prague' }).format(new Date())) : 1), [selectedDay, selectedMonth.key, selectedMonth.isPartial]);
  const calendarMinDate = useMemo(() => new Date(Number(monthlyMonths[0].key.slice(0, 4)), Number(monthlyMonths[0].key.slice(5, 7)) - 1, 1), [monthlyMonths[0].key]);
  const boxSummaries = selectedDay || monthKey === 'all'
    ? (selectedRoom ? result.totalsByRoom[selectedRoom.id] : result.totals)
    : selectedMonth;
  const boxPeriodLabel = selectedDay ? `${dayLabel}${Date.now() < dayRange!.to.getTime() ? ' · průběžně' : ''}` : monthKey === 'all' ? 'Posledních 12 kalendářních měsíců'
    : `${selectedMonth.label}${selectedMonth.isPartial ? ' · průběžně' : ''}`;
  const metricDetails = useMemo<Record<PerformanceMetricKind, string>>(() => ({
    aroStart: options.anesthesiaStartEnabled ? 'Začátek anestezie → začátek chirurgického výkonu' : 'Příjezd pacienta na sál → začátek chirurgického výkonu',
    surgery: 'Začátek chirurgického výkonu → ukončení výkonu',
    aroEnd: options.anesthesiaEndEnabled ? 'Ukončení výkonu → ukončení anestezie' : 'Ukončení výkonu → odjezd ze sálu',
    cleanup: 'Zahájení úklidu sálu → sál připraven',
    turnover: 'Odjezd ze sálu → příjezd dalšího pacienta na tentýž sál · pouze pracovní doba Po–Pá',
  }), [options]);
  const totalObserved = months.reduce((sum, month) => sum + month[metric].observed, 0);
  const totalIncluded = months.reduce((sum, month) => sum + selectedValues(month[metric], mode).count, 0);
  const totalShort = months.reduce((sum, month) => sum + month[metric].quality.underOneMinute, 0);
  const totalMissing = months.reduce((sum, month) => sum + month[metric].quality.missingDuration, 0);
  const totalNonPositive = months.reduce((sum, month) => sum + month[metric].quality.nonPositive, 0);
  const unassignedInvalidTimestamp = selectedRoom ? null : result.unassignedInvalidTimestamp[metric];
  const hasMeasuredValues = totalIncluded > 0;
  const measuredMonths = months.filter(month => selectedValues(month[metric], mode).count > 0).length;
  const roomLabel = selectedRoom?.name ?? 'Všechny sály';
  const metricLabel = METRICS.find(item => item.key === metric)!.label;
  const activeLoadedAt = selectedDay ? scopedDaySnapshot?.loadedAt : loadedAt;
  const loadedLabel = activeLoadedAt && Number.isFinite(Date.parse(activeLoadedAt))
    ? new Date(activeLoadedAt).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Prague' })
    : null;

  const report = useMemo<StatisticsReport | null>(() => {
    if (sourcesLoading || sourceError) return null;
    return {
      periodLabel: selectedDay ? `${dayLabel} · Europe/Prague · kalendářní den` : 'Posledních 12 kalendářních měsíců',
      context: [
        `Výkonnost v časovém pásmu ${result.timezone}. Sál: ${roomLabel}. Období boxů: ${boxPeriodLabel}. Detail trendu: ${metricLabel}.`,
        mode === 'all-positive'
          ? 'Zobrazení: všechna kladná naměřená trvání, včetně trvání kratších než jedna minuta.'
          : 'Zobrazení: pouze trvání nejméně jedna minuta. Tato hranice slouží ke kontrole záznamů, není hygienickou normou a uložená data se nemění.',
        'Aritmetický průměr je součet platných délek dělený počtem měření, nikoli průměr průměrů sálů. ARO, chirurgický výkon a úklid měří skutečný uplynulý čas včetně pauz. Chybějící, nejednoznačné a nekladné intervaly ani označená ukázková data se nezapočítávají. Období určuje konec intervalu.',
        'Časy zobrazujeme zaokrouhlené na celé minuty; výpočty a filtry zachovávají přesnost. Hodnota 0 min může znamenat kladný čas kratší než 30 sekund, pomlčka znamená chybějící měření.',
        'Obrat pacienta zahrnuje pouze průnik intervalu od odjezdu do příjezdu dalšího pacienta s nastavenou pracovní dobou sálu od pondělí do pátku. Čas mimo pracovní dobu a víkendy se nezapočítávají. Bez dalšího příjezdu ani bez platné pracovní doby se obrat neodhaduje. Používá se aktuálně uložený týdenní rozvrh; historické změny pracovní doby nejsou doloženy.',
        selectedDay ? 'Vybraný kalendářní den určuje konec měřeného intervalu. Okolní historie zůstává zachována pro rekonstrukci cyklů. Dnešní den je průběžný.' : 'Běžící měsíc není uzavřený; kratší čas sám o sobě nedokazuje zlepšení kvality ani bezpečnosti.',
      ].join(' '),
      metrics: [
        ...METRICS.map(item => ({ label: item.label, value: formatMinutes(selectedValues(boxSummaries[item.key], mode).average), detail: `Průměr · ${selectedValues(boxSummaries[item.key], mode).count} měření · ${boxPeriodLabel}` })),
      ],
      sections: [{
        title: 'Definice a zdroj měření',
        description: 'Pouze doložené události z databáze. Nastavení anesteziologických fází se používá pro celý zobrazený výběr; chybějící povinná hranice se nenahrazuje.',
        columns: [{ label: 'Ukazatel' }, { label: 'Měřený interval' }, { label: 'Počet měření', align: 'right' }],
        rows: METRICS.map(item => [item.label, metricDetails[item.key], selectedValues(boxSummaries[item.key], mode).count]),
      }, {
        title: selectedDay ? `${metricLabel} · ${dayLabel}` : `${metricLabel} po kalendářních měsících`,
        description: `Sál: ${roomLabel}. Pomlčka znamená nedostupné měření, nikoli nulu. ${selectedDay ? 'Dnešní den může být neúplný.' : 'Poslední měsíc může být neuzavřený.'}`,
        columns: [
          { label: selectedDay ? 'Den' : 'Měsíc' }, { label: 'Průměr', align: 'right' }, { label: 'Medián', align: 'right' }, { label: '90. percentil', align: 'right' },
          { label: 'V grafu', align: 'right' }, { label: 'Zaznamenáno', align: 'right' },
          { label: 'Pod 1 min', align: 'right' }, { label: 'Bez délky / ≤ 0', align: 'right' },
        ],
        rows: months.map(month => {
          const summary = month[metric];
          const values = selectedValues(summary, mode);
          return [
            `${month.label}${month.isPartial ? ' (průběžně)' : ''}`,
            formatMinutes(values.average), formatMinutes(values.median), formatMinutes(values.p90), values.count, summary.observed,
            summary.quality.underOneMinute, summary.quality.missingDuration + summary.quality.nonPositive,
          ];
        }),
        emptyMessage: 'Pro toto období nejsou měření.',
      }],
    };
  }, [sourceError, sourcesLoading, boxPeriodLabel, boxSummaries, dayLabel, selectedDay, metric, metricDetails, metricLabel, mode, months, result.timezone, roomLabel]);
  useStatisticsReport('vykonnost', report);

  if (baseSourceError) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" style={{ color: C.orange }} aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold" style={{ color: C.textHi }}>Výkonnost se nepodařilo načíst</h2>
            <p className="mt-1 text-sm" style={{ color: C.muted }}>{sourceError}</p>
            <p className="mt-1 text-xs" style={{ color: C.muted }}>Chyba načtení není nulová výkonnost.</p>
            <button type="button" onClick={refresh} className="stats-performance-retry mt-4">Zkusit znovu</button>
          </div>
        </div>
      </Card>
    );
  }

  if (sourcesLoading && (!loadedAt || !workflowStatuses.length)) {
    return <section className="stats-performance" aria-label="Načítání výkonnosti">
      <PerformancePreloader progress={activeProgress} workflowLoading={workflowLoading} />
    </section>;
  }

  const chartMonths = mobilePage === 0 ? months.slice(0, 6) : months.slice(-6);
  const SelectedMetricIcon = METRICS.find(item => item.key === metric)?.icon ?? Stethoscope;

  return (
    <section className="stats-performance space-y-4" aria-label={selectedDay ? `Výkonnost operačních sálů · ${dayLabel}` : 'Měsíční výkonnost operačních sálů'}>
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="min-w-0 flex flex-col gap-4 xl:order-2">
      <Card className="stats-performance-overview-panel">
        <div className="stats-performance-intro flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-medium" style={{ color: C.muted }}>Výkonnost</p>
            <h2 className="stats-card-title stats-performance-heading mt-1 text-[16px] font-semibold tracking-tight" style={{ color: C.textHi }}>Výkonnost provozu</h2>
            <p className="mt-1 text-[11px]" style={{ color: C.muted }}>Průměrné časy doložených intervalů · vyberte ukazatel pro {selectedDay ? 'detail dne' : 'měsíční trend'}.</p>
          </div>
          <div className="stats-performance-freshness">
            <span className="stats-performance-period-badge rounded-md px-3 py-2 text-[11px] font-medium" style={{ color: C.text, background: C.ghost, border: `1px solid ${C.border}` }}>Období: {boxPeriodLabel}</span>
            <button type="button" onClick={refresh} disabled={sourcesLoading} aria-label="Obnovit data výkonnosti" title={loadedLabel ? `Obnovit data výkonnosti · načteno ${loadedLabel}` : 'Obnovit data výkonnosti'}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        {sourcesLoading && <div className="mt-3"><PerformancePreloader progress={activeProgress} workflowLoading={workflowLoading} compact /></div>}

        <fieldset className="stats-kpi-strip stats-performance-metric-grid mt-4" aria-label="Ukazatel výkonnosti">
          <legend className="sr-only">Ukazatel výkonnosti · {boxPeriodLabel} · {roomLabel}</legend>
          {METRICS.map(item => {
            const summary = boxSummaries[item.key];
            const values = selectedValues(summary, mode);
            const Icon = item.icon;
            return <button key={item.key} type="button" className="stats-performance-metric-box" aria-pressed={metric === item.key} onClick={() => setMetric(item.key)}>
              <span className="stats-performance-metric-title">
                <span className="stats-performance-metric-icon-frame">
                  <Icon className="stats-performance-metric-icon" size={13} strokeWidth={2.4} aria-hidden="true" focusable="false" />
                </span>
                <span>{item.label}</span>
              </span>
              <span className="stats-performance-metric-caption sr-only">Průměrná doba</span>
              <strong className="stats-performance-metric-value">{formatMinutes(values.average)}</strong>
              <span className="stats-performance-metric-detail sr-only">{metricDetails[item.key]}{item.key === 'turnover' ? ' Jen nastavená pracovní doba · bez víkendů.' : ''}</span>
              <span className="stats-performance-metric-footer">
                <span>{dayLoading ? 'Načítám měření…' : selectedDay && scopedDaySnapshot?.error ? 'Data nejsou dostupná' : values.count ? `${wholeFormatter.format(values.count)} měření` : 'Bez platného měření'}</span>
                <span className="stats-performance-selection" aria-hidden="true">{metric === item.key ? selectedDay ? 'Detail dne' : 'Vybraný trend' : 'Vybrat'}</span>
              </span>
            </button>;
          })}
        </fieldset>
        <p className="stats-performance-fine-print mt-3">{roomLabel} · {mode === 'all-positive' ? 'všechna kladná měření' : 'pouze měření ≥ 1 min'}. Časy na celé minuty. Pomlčka znamená nedostatek podkladů.</p>
      </Card>

      {selectedDay && scopedDaySnapshot?.error && <Card className="p-4">
        <div role="alert">
        <p className="font-semibold" style={{ color: C.textHi }}>Denní výkonnost se nepodařilo načíst</p>
        <p className="stats-performance-fine-print">{scopedDaySnapshot.error} Chyba načtení není nulová výkonnost.</p>
        <button type="button" className="stats-performance-retry mt-3" onClick={refresh}>Zkusit znovu</button>
        </div>
      </Card>}

      <Card className="stats-performance-chart-card">
        <div className="stats-performance-chart-head">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ color: C.accent, background: C.surface2, border: `1px solid ${C.border}` }}><SelectedMetricIcon size={16} aria-hidden="true" /></span>
            <div className="min-w-0">
              <h3 className="stats-card-title text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>{metricLabel} · {selectedDay ? 'detail dne' : 'měsíční trend'}</h3>
              <p className="mt-0.5 text-[10px]" style={{ color: C.muted }}>{metricDetails[metric]}</p>
            </div>
          </div>
          <div className="stats-performance-legend" aria-hidden="true">
            <span><i className="stats-performance-line stats-performance-line--median" />Průměr</span>
            <span><i className="stats-performance-line stats-performance-line--p90" />90. percentil</span>
          </div>
        </div>
        <p className="stats-performance-fine-print mt-3">{selectedDay ? dayLabel : 'Posledních 12 kalendářních měsíců'} · minuty · {roomLabel}. {dayLoading ? 'Načítám měření vybraného dne.' : selectedDay && scopedDaySnapshot?.error ? 'Počet měření není dostupný.' : `V grafu ${wholeFormatter.format(totalIncluded)} z ${wholeFormatter.format(totalObserved)} posuzovaných intervalů.`}</p>

        {dayLoading ? <PerformancePreloader progress={activeProgress} compact /> : selectedDay && scopedDaySnapshot?.error ? (
          <p className="stats-performance-fine-print">Data vybraného dne nejsou dostupná. Zvolte jiné období nebo zopakujte načtení.</p>
        ) : hasMeasuredValues ? (
          <>
            {!selectedDay && <div className="stats-performance-mobile-pager">
              <button type="button" aria-pressed={mobilePage === 0} onClick={() => setMobilePage(0)}>Starší měsíce</button>
              <button type="button" aria-pressed={mobilePage === 1} onClick={() => setMobilePage(1)}>Novější měsíce</button>
            </div>}
            <div className="stats-performance-plot mt-3 rounded-lg p-3" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
              <div className="stats-performance-chart-wide"><TrendChart months={months} mode={mode} metric={metric} /></div>
              <div className="stats-performance-chart-narrow"><TrendChart months={chartMonths} mode={mode} metric={metric} /></div>
            </div>
            <p className="stats-performance-fine-print mt-2">{selectedDay ? 'Souhrn jednoho dne neprokazuje trend. Dnešní den je průběžný. ' : `${measuredMonths < 4 ? 'Měření jsou dostupná jen v několika měsících; graf zatím neprokazuje trend. ' : ''}Probíhající měsíc je neúplný. `}Bez srovnání podobného provozu a zachování bezpečnostních postupů kratší čas sám o sobě nedokazuje zlepšení.</p>
          </>
        ) : (
          <div className="stats-performance-empty" role="status">
            <p className="font-semibold" style={{ color: C.textHi }}>Měření zatím není dostupné</p>
            <p className="mt-1 text-sm leading-6" style={{ color: C.muted }}>{metricExplanation(metric)}</p>
          </div>
        )}
      </Card>

      <Card className="stats-performance-method">
        <div>
          <h3 className="stats-card-title text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>Výběr měření</h3>
          <p className="stats-performance-fine-print">ARO, výkon a úklid: skutečný uplynulý čas včetně pauz. Obrat: pouze nastavená pracovní doba bez víkendů. Průměr = součet dob / počet měření. Krátké časy lze skrýt pouze ve výpočtu; uložené údaje se nemění. Nastavení anesteziologických fází platí pro celý výběr, chybějící hranice se nenahrazují odhadem. Výpočty zachovávají přesnost; 0 min může znamenat kladný čas kratší než 30 s.</p>
        </div>
        <label className="stats-performance-quality-toggle">
          <input type="checkbox" checked={mode === 'at-least-minute'} onChange={event => {
            setLocalMode(event.target.checked ? 'at-least-minute' : 'all-positive');
            onExcludeShortPhasesChange?.(event.target.checked);
          }} />
          <span>Jen měření ≥ 1 min</span>
        </label>
      </Card>

        </div>
        <aside className="stats-performance-sidebar min-w-0 flex flex-col gap-4 xl:order-1" aria-label="Souhrn výkonnosti">
          <Card title="Výběr dat" icon={SlidersHorizontal}>
            <div className="stats-performance-sidebar-filters">
              <label className="stats-performance-room-filter">
                <span>Období boxů</span>
                <select value={selectedDay ? 'day' : monthKey === 'all' ? 'all' : selectedMonth.key} onChange={event => {
                  if (event.target.value === 'day') return;
                  setSelectedDay(null); setMonthKey(event.target.value);
                }}>
                  {selectedDay && <option value="day">Den · {dayLabel}</option>}
                  {[...monthlyMonths].reverse().map(month => <option key={month.key} value={month.key}>{month.label}{month.isPartial ? ' (průběžně)' : ''}</option>)}
                  <option value="all">Celých 12 měsíců</option>
                </select>
              </label>
              <label className="stats-performance-room-filter">
                <span>Sál</span>
                <select value={selectedRoom ? selectedRoom.id : 'all'} onChange={event => setRoomId(event.target.value)}>
                  <option value="all">Všechny sály</option>
                  {[...rooms].sort((a, b) => a.name.localeCompare(b.name, 'cs-CZ')).map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
                </select>
              </label>
            </div>
          </Card>
          <div className="print-hide">
            <GlassCalendar
              value={calendarValue}
              minDate={calendarMinDate}
              onChange={day => {
                if (!daySelected) setDaySnapshot(null);
                setSelectedDay(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`);
              }}
              accent={C.accent}
            />
            <p className="stats-performance-fine-print">{selectedDay ? `Vybraný den: ${dayLabel}.` : 'Kalendář vybere jeden konkrétní den.'} Výběr měsíce obnoví měsíční přehled.</p>
          </div>
        </aside>
      </div>

      {!dayLoading && !(selectedDay && scopedDaySnapshot?.error) && <div className="grid gap-4">
        <Card>
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ color: C.accent, background: C.surface2, border: `1px solid ${C.border}` }}><AlertCircle size={16} aria-hidden="true" /></span>
            <div>
              <h3 className="stats-card-title text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>Co je ve výpočtu</h3>
              <p className="mt-0.5 text-[10px]" style={{ color: C.muted }}>Kontrola doložených záznamů a kvality měření</p>
            </div>
          </div>
          <dl className="stats-performance-quality-list mt-3">
            <div><dt>Posuzované intervaly</dt><dd>{wholeFormatter.format(totalObserved)}</dd></div>
            <div><dt>V zobrazeném výpočtu</dt><dd>{wholeFormatter.format(totalIncluded)} <span>({formatRatio(totalIncluded, totalObserved)})</span></dd></div>
            <div><dt>Časy kratší než 1 min</dt><dd>{wholeFormatter.format(totalShort)}</dd></div>
            <div><dt>Neúplné, nejednoznačné nebo s časem ≤ 0</dt><dd>{wholeFormatter.format(totalMissing + totalNonPositive)}</dd></div>
            {result.excludedSynthetic > 0 && <div><dt>Vyloučené ukázkové události v načtené historii</dt><dd>{wholeFormatter.format(result.excludedSynthetic)}</dd></div>}
            {unassignedInvalidTimestamp ? <div><dt>Čas v načtené historii nelze přiřadit {selectedDay ? 'ke dni' : 'k měsíci'}</dt><dd>{wholeFormatter.format(unassignedInvalidTimestamp)}</dd></div> : null}
          </dl>
          <p className="stats-performance-fine-print mt-3">Zdroj: historie fází v databázi. Příjezd do traktu není příjezd na sál. Interval zařazujeme do {selectedDay ? 'dne' : 'měsíce'} jeho konce podle Europe/Prague. Poslední fáze se může projevit až po potvrzení navazujícího stavu. Jedna minuta je kontrolní filtr, nikoli hygienická norma. Obrat pacienta zahrnuje pouze nastavenou pracovní dobu od pondělí do pátku mezi doloženým odjezdem a dalším příjezdem. Čas mimo pracovní dobu a víkendy se nezapočítávají. Používáme aktuálně uložený týdenní rozvrh; historické změny pracovní doby nejsou doloženy. Samotná délka přestávky bez jejího začátku a konce neumožňuje určit, zda do obratu zasáhla.</p>
        </Card>
      </div>}

      {!dayLoading && !(selectedDay && scopedDaySnapshot?.error) && <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="stats-card-title text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>{selectedDay ? `Přehled dne · ${dayLabel}` : 'Přehled po měsících'}</h3>
            <p className="mt-0.5 text-[10px]" style={{ color: C.muted }}>{roomLabel} · {metricLabel} · {mode === 'all-positive' ? 'všechna kladná měření' : 'jen měření ≥ 1 min'}. Pomlčka není nula.</p>
          </div>
          <span className="rounded-md px-2.5 py-1 text-[10px] font-medium tabular-nums" style={{ color: C.text, background: C.ghost, border: `1px solid ${C.border}` }}>{selectedDay ? '1 den' : '12 měsíců'}</span>
        </div>
        <div className="stats-performance-table-wrap mt-4">
          <table className="stats-performance-table">
            <caption className="sr-only">{selectedDay ? `Den ${dayLabel}` : 'Měsíční'} naměřené časy a počty událostí pro ukazatel {metricLabel} a výběr {roomLabel}</caption>
            <thead><tr>
              <th scope="col">{selectedDay ? 'Den' : 'Měsíc'}</th><th scope="col">Průměr</th><th scope="col">Medián</th><th scope="col">90. percentil</th>
              <th scope="col">V grafu</th><th scope="col">Zaznamenáno</th><th scope="col">Pod 1 min</th>
            </tr></thead>
            <tbody>{[...months].reverse().map(month => {
              const summary = month[metric];
              const values = selectedValues(summary, mode);
              return <tr key={month.key}>
                <th scope="row">{month.label}{month.isPartial && <span className="stats-performance-partial">průběžně</span>}</th>
                <td>{formatMinutes(values.average)}</td><td>{formatMinutes(values.median)}</td><td>{formatMinutes(values.p90)}</td>
                <td>{wholeFormatter.format(values.count)}</td><td>{wholeFormatter.format(summary.observed)}</td>
                <td>{wholeFormatter.format(summary.quality.underOneMinute)}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </Card>}
    </section>
  );
}

export default PerformanceTab;
