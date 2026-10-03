'use client';

import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowLeftRight, LogOut, RefreshCw, Scissors, SlidersHorizontal, Sparkles, Stethoscope, Timer, type LucideIcon } from 'lucide-react';
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
import type { StatusHistoryProgress, StatusHistoryRow } from '../../lib/db';
import { useWorkflowStatusesContext } from '../../contexts/WorkflowStatusesContext';
import {
  buildMonthlyPerformance,
  type MetricSummary,
  type PerformanceMetricKind,
  type PerformanceMonth,
} from '../../lib/statistics-performance';
import type { StatisticsReport } from '../../lib/statistics-print';
import { useStatisticsReport } from './StatisticsReportContext';
import { Card, C } from './shared';
import './performance-tab.css';

export interface PerformanceTabProps {
  rooms: OperatingRoom[];
  history: StatusHistoryRow[];
  isLoading: boolean;
  error: string | null;
  loadedAt: string | null;
  loadingProgress?: StatusHistoryProgress;
  onRefresh: () => void;
}

type DisplayMode = 'all-positive' | 'at-least-minute';

const METRICS: Array<{ key: PerformanceMetricKind; label: string; icon: LucideIcon }> = [
  { key: 'aroStart', label: 'ARO START', icon: Stethoscope },
  { key: 'surgery', label: 'Chirurgický výkon', icon: Scissors },
  { key: 'aroEnd', label: 'ARO KONEC', icon: LogOut },
  { key: 'cleanup', label: 'Úklid', icon: Sparkles },
  { key: 'turnover', label: 'Obrat pacienta', icon: ArrowLeftRight },
];

const numberFormatter = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 1 });
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
      month: month.key.slice(5) + '/' + month.key.slice(2, 4),
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
              return item ? `${item.fullMonth}${item.partial ? ' · neuzavřený měsíc' : ''} · n=${item.count}` : '';
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

export function PerformanceTab({ rooms, history, isLoading, error, loadedAt, onRefresh }: PerformanceTabProps) {
  const [roomId, setRoomId] = useState('all');
  const [metric, setMetric] = useState<PerformanceMetricKind>('aroStart');
  const [mode, setMode] = useState<DisplayMode>('all-positive');
  const [mobilePage, setMobilePage] = useState<0 | 1>(1);
  const [monthKey, setMonthKey] = useState('current');
  const { workflowStatuses, loading: workflowLoading, error: workflowError, refreshStatuses } = useWorkflowStatusesContext();
  const options = useMemo(() => {
    const names = workflowStatuses.map(status => status.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' '));
    return {
      anesthesiaStartEnabled: names.some(name => /^(zacatek|zahajeni) anestezie(\b|$)|^an(a)?esthesia start$/.test(name)),
      anesthesiaEndEnabled: names.some(name => /^(ukonceni|konec) anestezie(\b|$)|^an(a)?esthesia end$/.test(name)),
    };
  }, [workflowStatuses]);
  const sourceError = error || workflowError || (!workflowLoading && !workflowStatuses.length ? 'Nastavení fází není dostupné.' : null);
  const sourcesLoading = isLoading || workflowLoading;
  const refresh = () => { onRefresh(); void refreshStatuses(); };

  const result = useMemo(() => buildMonthlyPerformance(history, rooms, loadedAt ? new Date(loadedAt) : new Date(), options), [history, rooms, loadedAt, options]);
  const selectedRoom = rooms.find(room => room.id === roomId);
  const months = (selectedRoom ? result.byRoom[selectedRoom.id] : result.months) ?? result.months;
  const selectedMonth = months.find(month => month.key === monthKey) ?? months.at(-1)!;
  const boxSummaries = monthKey === 'all'
    ? (selectedRoom ? result.totalsByRoom[selectedRoom.id] : result.totals)
    : selectedMonth;
  const boxPeriodLabel = monthKey === 'all' ? 'Posledních 12 kalendářních měsíců'
    : `${selectedMonth.label}${selectedMonth.isPartial ? ' · průběžně' : ''}`;
  const metricDetails = useMemo<Record<PerformanceMetricKind, string>>(() => ({
    aroStart: options.anesthesiaStartEnabled ? 'Začátek anestezie → začátek chirurgického výkonu' : 'Příjezd pacienta na sál → začátek chirurgického výkonu',
    surgery: 'Začátek chirurgického výkonu → ukončení výkonu',
    aroEnd: options.anesthesiaEndEnabled ? 'Ukončení výkonu → ukončení anestezie' : 'Ukončení výkonu → odjezd ze sálu',
    cleanup: 'Zahájení úklidu sálu → sál připraven',
    turnover: 'Odjezd ze sálu → příjezd dalšího pacienta na tentýž sál · pouze pracovní doba Po–Pá',
  }), [options]);
  const closedMonths = months.filter(month => !month.isPartial);
  const latestClosed = closedMonths.at(-1);
  const previousClosed = closedMonths.at(-2);
  const latestSummary = latestClosed?.[metric];
  const latestValues = useMemo(() => latestSummary ? selectedValues(latestSummary, mode) : null, [latestSummary, mode]);
  const previousValues = previousClosed ? selectedValues(previousClosed[metric], mode) : null;
  const averageDifference = latestValues?.average != null && previousValues?.average != null
    ? latestValues.average - previousValues.average : null;
  const roundedDifference = averageDifference === null ? null : Math.round(Math.abs(averageDifference));
  const averageDifferenceLabel = averageDifference === null
    ? 'Srovnání s předchozím měsícem není dostupné.'
    : `Průměr za ${latestClosed?.label} proti ${previousClosed?.label}: ${roundedDifference ? (averageDifference > 0 ? '+' : '−') : ''}${minuteFormatter.format(Math.abs(averageDifference))} min${previousValues?.average ? ` (${averageDifference > 0 ? '+' : averageDifference < 0 ? '−' : ''}${numberFormatter.format(Math.abs(averageDifference / previousValues.average * 100))} %)` : ''}.`;
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
  const loadedLabel = loadedAt && Number.isFinite(Date.parse(loadedAt))
    ? new Date(loadedAt).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Prague' })
    : null;

  const report = useMemo<StatisticsReport | null>(() => {
    if (sourcesLoading || sourceError) return null;
    return {
      context: [
        `Výkonnost v časovém pásmu ${result.timezone}. Sál: ${roomLabel}. Období boxů: ${boxPeriodLabel}. Detail trendu: ${metricLabel}.`,
        mode === 'all-positive'
          ? 'Zobrazení: všechna kladná naměřená trvání, včetně trvání kratších než jedna minuta.'
          : 'Zobrazení: pouze trvání nejméně jedna minuta. Tato hranice slouží ke kontrole záznamů, není hygienickou normou a uložená data se nemění.',
        'Aritmetický průměr je součet platných délek dělený počtem měření, nikoli průměr průměrů sálů. ARO, chirurgický výkon a úklid měří skutečný uplynulý čas včetně pauz. Chybějící, nejednoznačné a nekladné intervaly ani označená ukázková data se nezapočítávají. Období určuje konec intervalu.',
        'Časy zobrazujeme zaokrouhlené na celé minuty; výpočty a filtry zachovávají přesnost. Hodnota 0 min může znamenat kladný čas kratší než 30 sekund, pomlčka znamená chybějící měření.',
        'Obrat pacienta zahrnuje pouze průnik intervalu od odjezdu do příjezdu dalšího pacienta s nastavenou pracovní dobou sálu od pondělí do pátku. Čas mimo pracovní dobu a víkendy se nezapočítávají. Bez dalšího příjezdu ani bez platné pracovní doby se obrat neodhaduje. Používá se aktuálně uložený týdenní rozvrh; historické změny pracovní doby nejsou doloženy.',
        'Běžící měsíc není uzavřený; kratší čas sám o sobě nedokazuje zlepšení kvality ani bezpečnosti.',
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
        title: `${metricLabel} po kalendářních měsících`,
        description: `Sál: ${roomLabel}. Pomlčka znamená nedostupné měření, nikoli nulu. Poslední měsíc může být neuzavřený.`,
        columns: [
          { label: 'Měsíc' }, { label: 'Průměr', align: 'right' }, { label: 'Medián', align: 'right' }, { label: '90. percentil', align: 'right' },
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
  }, [sourceError, sourcesLoading, boxPeriodLabel, boxSummaries, metric, metricDetails, metricLabel, mode, months, result.timezone, roomLabel]);
  useStatisticsReport('vykonnost', report);

  if (sourceError) {
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
      <p className="stats-performance-description" role="status">Načítám data výkonnosti…</p>
    </section>;
  }

  const chartMonths = mobilePage === 0 ? months.slice(0, 6) : months.slice(-6);

  return (
    <section className="stats-performance space-y-4" aria-label="Měsíční výkonnost operačních sálů">
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="min-w-0 flex flex-col gap-4 xl:order-2">
      <div className="stats-performance-intro">
        <div>
          <p className="stats-performance-eyebrow">Historie událostí · 12 kalendářních měsíců</p>
          <h2 className="stats-performance-heading">Výkonnost provozu</h2>
          <p className="stats-performance-description">Průměrné časy z doložených událostí. Vyberte ukazatel pro podrobný měsíční trend; období boxů nastavíte v panelu Výběr dat.</p>
        </div>
        <div className="stats-performance-freshness">
          <span>{sourcesLoading ? 'Obnovuji historii…' : loadedLabel ? `Načteno ${loadedLabel}` : 'Čas načtení není k dispozici'}</span>
          <button type="button" onClick={refresh} disabled={sourcesLoading} aria-label="Obnovit data výkonnosti" title="Obnovit data výkonnosti">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <fieldset className="stats-performance-metric-grid" aria-label="Ukazatel výkonnosti">
        <legend className="sr-only">Ukazatel výkonnosti · {boxPeriodLabel} · {roomLabel}</legend>
        {METRICS.map(item => {
          const summary = boxSummaries[item.key];
          const values = selectedValues(summary, mode);
          const Icon = item.icon;
          return <button key={item.key} type="button" className="stats-performance-metric-box" aria-pressed={metric === item.key} onClick={() => setMetric(item.key)}>
            <span className="stats-performance-metric-title">
              <Icon className="stats-performance-metric-icon" strokeWidth={1.75} aria-hidden="true" focusable="false" />
              <span>{item.label}</span>
            </span>
            <span className="stats-performance-metric-caption">Průměrná doba</span>
            <strong className="stats-performance-metric-value">{formatMinutes(values.average)}</strong>
            <span className="stats-performance-metric-detail">{metricDetails[item.key]}</span>
            {item.key === 'turnover' && <span className="stats-performance-fine-print">Jen nastavená pracovní doba · bez víkendů.</span>}
            <span className="stats-performance-metric-footer">
              <span>{values.count ? `${wholeFormatter.format(values.count)} měření` : 'Bez platného měření'}</span>
              <span>{metric === item.key ? 'Zobrazený trend' : 'Zobrazit trend'}</span>
            </span>
          </button>;
        })}
      </fieldset>
      <p className="stats-performance-fine-print">{boxPeriodLabel} · {roomLabel} · {mode === 'all-positive' ? 'všechna kladná měření' : 'pouze měření ≥ 1 min'}. Časy zaokrouhlené na celé minuty; výpočty zachovávají přesnost. 0 min může znamenat čas kratší než 30 s. Pomlčka znamená nedostatek podkladů.</p>

      <Card className="stats-performance-method p-3 sm:p-4">
        <div>
          <p className="text-xs font-semibold" style={{ color: C.textHi }}>Výběr měření</p>
          <p className="mt-1 text-xs leading-5" style={{ color: C.muted }}>ARO, výkon a úklid: skutečný uplynulý čas včetně pauz. Obrat: pouze nastavená pracovní doba bez víkendů. Průměr = součet dob / počet měření. Krátké časy lze skrýt pouze ve výpočtu; uložené údaje se nemění. Nastavení anesteziologických fází platí pro celý výběr, chybějící hranice se nenahrazují odhadem.</p>
        </div>
        <label className="stats-performance-quality-toggle">
          <input type="checkbox" checked={mode === 'at-least-minute'} onChange={event => setMode(event.target.checked ? 'at-least-minute' : 'all-positive')} />
          <span>Jen měření ≥ 1 min</span>
        </label>
      </Card>

      <Card className="stats-performance-chart-card p-3 sm:p-5">
        <div className="stats-performance-chart-head">
          <div>
            <p className="stats-performance-eyebrow">Měsíční trend</p>
            <h3 className="stats-performance-card-title">{metricLabel}</h3>
            <p className="stats-performance-fine-print">{metricDetails[metric]}. Posledních 12 kalendářních měsíců · minuty · {roomLabel}. V grafu {wholeFormatter.format(totalIncluded)} z {wholeFormatter.format(totalObserved)} posuzovaných intervalů.</p>
          </div>
          <div className="stats-performance-legend" aria-hidden="true">
            <span><i className="stats-performance-line stats-performance-line--median" />Průměr</span>
            <span><i className="stats-performance-line stats-performance-line--p90" />90. percentil</span>
          </div>
        </div>

        {hasMeasuredValues ? (
          <>
            <div className="stats-performance-mobile-pager">
              <button type="button" aria-pressed={mobilePage === 0} onClick={() => setMobilePage(0)}>Starší měsíce</button>
              <button type="button" aria-pressed={mobilePage === 1} onClick={() => setMobilePage(1)}>Novější měsíce</button>
            </div>
            <div className="stats-performance-chart-wide"><TrendChart months={months} mode={mode} metric={metric} /></div>
            <div className="stats-performance-chart-narrow"><TrendChart months={chartMonths} mode={mode} metric={metric} /></div>
            <p className="stats-performance-fine-print mt-2">{measuredMonths < 4 ? 'Měření jsou dostupná jen v několika měsících; graf zatím neprokazuje trend. ' : ''}Probíhající měsíc je neúplný. Bez srovnání podobného provozu a zachování bezpečnostních postupů kratší čas sám o sobě nedokazuje zlepšení.</p>
          </>
        ) : (
          <div className="stats-performance-empty" role="status">
            <p className="font-semibold" style={{ color: C.textHi }}>Měření zatím není dostupné</p>
            <p className="mt-1 text-sm leading-6" style={{ color: C.muted }}>{metricExplanation(metric)}</p>
          </div>
        )}
      </Card>

        </div>
        <aside className="stats-performance-sidebar min-w-0 flex flex-col gap-4 xl:order-1" aria-label="Souhrn výkonnosti">
          <Card className="stats-performance-overview">
            <div className="flex items-center justify-between gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ color: C.accent, background: C.surface2, border: `1px solid ${C.border}` }}><Timer size={16} aria-hidden="true" /></span>
              <span className="rounded-md border px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.muted, borderColor: C.border }}>Uzavřený měsíc</span>
            </div>
            <h2 className="stats-performance-card-title mt-4">{metricLabel}</h2>
            <p className="stats-performance-fine-print">{latestClosed?.label ?? 'Bez uzavřeného měsíce'} · {roomLabel}</p>
            <p className="stats-performance-overview-value">{formatMinutes(latestValues?.average ?? null)}</p>
            <p className="stats-performance-fine-print">Průměrná doba z reálných měření</p>
            <dl className="stats-performance-overview-details">
              <div><dt>90. percentil</dt><dd>{formatMinutes(latestValues?.p90 ?? null)}</dd></div>
              <div><dt>Počet měření</dt><dd>{latestSummary?.observed ? wholeFormatter.format(latestValues?.count ?? 0) : '—'}</dd></div>
              <div><dt>Posuzované intervaly</dt><dd>{wholeFormatter.format(latestSummary?.observed ?? 0)}</dd></div>
            </dl>
            <p className="stats-performance-fine-print">90. percentil: devět z deseti měření je nejvýše tato doba. Probíhající měsíc není podkladem souhrnu.</p>
            <div className="mt-4 border-t pt-4" style={{ borderColor: C.border }}>
              <p className="stats-performance-eyebrow">Meziměsíční srovnání</p>
              <p className="stats-performance-fine-print" role="status">{averageDifferenceLabel}</p>
              <p className="stats-performance-fine-print">Pouze uzavřené měsíce. Změna doby není hodnocením kvality péče.</p>
            </div>
          </Card>
          <Card title="Výběr dat" icon={SlidersHorizontal}>
            <div className="stats-performance-sidebar-filters">
              <label className="stats-performance-room-filter">
                <span>Období boxů</span>
                <select value={monthKey === 'all' ? 'all' : selectedMonth.key} onChange={event => setMonthKey(event.target.value)}>
                  {[...months].reverse().map(month => <option key={month.key} value={month.key}>{month.label}{month.isPartial ? ' (průběžně)' : ''}</option>)}
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
        </aside>
      </div>

      <div className="grid gap-4">
        <Card className="p-3 sm:p-5">
          <p className="stats-performance-eyebrow">Kontrola záznamů</p>
          <h3 className="stats-performance-card-title">Co je ve výpočtu</h3>
          <dl className="stats-performance-quality-list mt-3">
            <div><dt>Posuzované intervaly</dt><dd>{wholeFormatter.format(totalObserved)}</dd></div>
            <div><dt>V zobrazeném výpočtu</dt><dd>{wholeFormatter.format(totalIncluded)} <span>({formatRatio(totalIncluded, totalObserved)})</span></dd></div>
            <div><dt>Časy kratší než 1 min</dt><dd>{wholeFormatter.format(totalShort)}</dd></div>
            <div><dt>Neúplné, nejednoznačné nebo s časem ≤ 0</dt><dd>{wholeFormatter.format(totalMissing + totalNonPositive)}</dd></div>
            {result.excludedSynthetic > 0 && <div><dt>Vyloučené ukázkové události v načtené historii</dt><dd>{wholeFormatter.format(result.excludedSynthetic)}</dd></div>}
            {unassignedInvalidTimestamp ? <div><dt>Čas nelze přiřadit k měsíci</dt><dd>{wholeFormatter.format(unassignedInvalidTimestamp)}</dd></div> : null}
          </dl>
          <p className="stats-performance-fine-print mt-3">Zdroj: historie fází v databázi. Příjezd do traktu není příjezd na sál. Interval zařazujeme do měsíce jeho konce podle Europe/Prague. Poslední fáze se může projevit až po potvrzení navazujícího stavu. Jedna minuta je kontrolní filtr, nikoli hygienická norma. Obrat pacienta zahrnuje pouze nastavenou pracovní dobu od pondělí do pátku mezi doloženým odjezdem a dalším příjezdem. Čas mimo pracovní dobu a víkendy se nezapočítávají. Používáme aktuálně uložený týdenní rozvrh; historické změny pracovní doby nejsou doloženy. Samotná délka přestávky bez jejího začátku a konce neumožňuje určit, zda do obratu zasáhla.</p>
        </Card>
      </div>

      <Card className="p-3 sm:p-5">
        <div>
          <p className="stats-performance-eyebrow">Naměřené hodnoty</p>
          <h3 className="stats-performance-card-title">Přehled po měsících</h3>
          <p className="stats-performance-fine-print">{roomLabel} · {metricLabel} · {mode === 'all-positive' ? 'všechna kladná měření' : 'jen měření ≥ 1 min'}. Pomlčka není nula.</p>
        </div>
        <div className="stats-performance-table-wrap mt-4">
          <table className="stats-performance-table">
            <caption className="sr-only">Měsíční naměřené časy a počty událostí pro ukazatel {metricLabel} a výběr {roomLabel}</caption>
            <thead><tr>
              <th scope="col">Měsíc</th><th scope="col">Průměr</th><th scope="col">Medián</th><th scope="col">90. percentil</th>
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
      </Card>
    </section>
  );
}

export default PerformanceTab;
