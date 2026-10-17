'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Download, FileJson, FileText, LoaderCircle, X } from 'lucide-react';
import type { OperatingRoom } from '../../types';
import { fetchNotificationsLog, fetchStatusHistory, getDatabaseHospitalId, type StatusHistoryProgress } from '../../lib/db';
import { downloadStatisticsCsv } from '../../lib/statistics-csv';
import { openStatisticsPrintReport } from '../../lib/statistics-print';
import { buildStatisticsPeriodExport, exportDateRange, statisticsExportOperationalDate, statisticsExportProgress, type StatisticsExportPreset } from '../../lib/statistics-export';
import { C } from './statistics-theme';
import { StatisticsPreloader } from './StatisticsPreloader';

export interface StatisticsExportDialogProps {
  open: boolean;
  onClose: () => void;
  rooms: OperatingRoom[];
  hospitalId: string | null;
  hospitalName?: string;
  excludeShortPhases: boolean;
}
const initialProgress = (): StatusHistoryProgress => ({ loaded: 0, total: null, complete: false });
type ExportData = ReturnType<typeof buildStatisticsPeriodExport>;
const choices: Array<{ value: StatisticsExportPreset; label: string }> = [
  { value: 'day', label: 'Den' }, { value: 'week', label: 'Týden' }, { value: 'month', label: 'Měsíc' },
  { value: 'year', label: 'Rok' }, { value: 'custom', label: 'Vlastní období' },
];
const buttonClass = 'min-h-11 rounded-lg border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
const buttonStyle = { color: C.text, borderColor: C.border, background: C.surface };

function downloadJson(data: ExportData) {
  const blob = new Blob([JSON.stringify(data.json, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.metadata.filename}.json`;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function StatisticsExportDialog({ open, onClose, rooms, hospitalId, hospitalName, excludeShortPhases }: StatisticsExportDialogProps) {
  const id = useId();
  const [preset, setPreset] = useState<StatisticsExportPreset>('month');
  const [anchor, setAnchor] = useState(() => statisticsExportOperationalDate());
  const [from, setFrom] = useState(() => statisticsExportOperationalDate());
  const [to, setTo] = useState(() => statisticsExportOperationalDate());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ scope: string; run: number; value: ExportData } | null>(null);
  const [historyProgress, setHistoryProgress] = useState<StatusHistoryProgress>(initialProgress);
  const [notificationProgress, setNotificationProgress] = useState<StatusHistoryProgress>(initialProgress);
  const request = useRef(0);
  const opener = useRef<HTMLElement | null>(null);
  const scope = JSON.stringify([hospitalId, preset, anchor, from, to, excludeShortPhases]);
  const scopeRef = useRef({ scope, open, hospitalId });
  scopeRef.current = { scope, open, hospitalId };
  const ready = open && data?.scope === scope && data.run === request.current ? data.value : null;
  const progress = statisticsExportProgress(historyProgress, notificationProgress, !!ready);
  let range: ReturnType<typeof exportDateRange> | null = null;
  let dateError: string | null = null;
  try { range = exportDateRange(preset, anchor, from, to); } catch (cause) {
    dateError = cause instanceof Error ? cause.message : 'Vyberte platné období.';
  }

  useEffect(() => {
    request.current += 1;
    setData(null); setBusy(false); setError(null);
    setHistoryProgress(initialProgress()); setNotificationProgress(initialProgress());
    return () => { request.current += 1; };
  }, [open, scope]);

  const close = () => { request.current += 1; setBusy(false); setData(null); onClose(); };
  const prepare = async () => {
    if (!range || !hospitalId || busy) return;
    const expectedScope = scope;
    const expectedHospital = hospitalId;
    const run = ++request.current;
    const active = () => request.current === run && scopeRef.current.open && scopeRef.current.scope === expectedScope
      && scopeRef.current.hospitalId === expectedHospital && getDatabaseHospitalId() === expectedHospital;
    setError(null); setData(null); setBusy(true);
    setHistoryProgress(initialProgress()); setNotificationProgress(initialProgress());
    try {
      if (!active()) throw new Error('Zdravotnické zařízení se změnilo. Otevřete export znovu.');
      const generatedAt = new Date();
      const upper = new Date(range.end.getTime() - 1);
      // No cache/31/370-day truncation. Earlier starts AND later closing phases
      // can prove a KPI endpoint inside the requested historical interval.
      const [history, notifications] = await Promise.all([
        fetchStatusHistory({ all: true, toDate: generatedAt, onProgress: value => { if (active()) setHistoryProgress(value); } }),
        fetchNotificationsLog({ all: true, fromDate: range.start, toDate: upper,
          onProgress: value => { if (active()) setNotificationProgress(value); } }),
      ]);
      if (!active()) return;
      if (history === null || notifications === null) {
        throw new Error(history === null ? 'Nepodařilo se načíst úplnou historii sálů. Zkuste načtení znovu.' : 'Nepodařilo se načíst úplný záznam notifikací. Zkuste načtení znovu.');
      }
      const prepared = buildStatisticsPeriodExport({ history, notifications, rooms, range,
        hospitalId: expectedHospital, hospitalName, excludeShortPhases, generatedAt });
      if (!active()) return;
      setData({ scope: expectedScope, run, value: prepared });
    } catch (cause) {
      if (request.current === run && scopeRef.current.open && scopeRef.current.scope === expectedScope) {
        setError(cause instanceof Error ? cause.message : 'Export se nepodařilo připravit.');
      }
    } finally {
      if (request.current === run && scopeRef.current.scope === expectedScope) setBusy(false);
    }
  };
  const exportFile = (format: 'csv' | 'json' | 'pdf') => {
    if (!ready || !open || !scopeRef.current.open || scopeRef.current.scope !== scope
      || data?.scope !== scope || data.run !== request.current || !hospitalId || getDatabaseHospitalId() !== hospitalId) {
      setData(null); setError('Zdravotnické zařízení nebo období se změnilo. Načtěte export znovu.'); return;
    }
    try {
      if (format === 'json') downloadJson(ready);
      else if (format === 'pdf') openStatisticsPrintReport(ready.report, ready.metadata);
      else downloadStatisticsCsv(ready.csvReport, { ...ready.metadata,
        hospitalName: ready.metadata.hospitalName?.replace(/^([\s]*[=+\-@])/, "'$1") });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Soubor se nepodařilo otevřít.'); }
  };

  return <Dialog.Root open={open} onOpenChange={next => { if (!next) close(); }}><Dialog.Portal>
    <Dialog.Overlay className="timeline-popup-overlay fixed inset-0 z-[200]" />
    <Dialog.Content className="timeline-popup-panel statistics-module fixed left-1/2 top-1/2 z-[201] -translate-x-1/2 -translate-y-1/2" style={{ width: 'min(640px, calc(100vw - 24px))', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto' }}
      onOpenAutoFocus={() => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
      onCloseAutoFocus={event => { event.preventDefault(); if (opener.current?.isConnected) opener.current.focus({ preventScroll: true }); }}>
      <div className="timeline-popup-header flex items-start justify-between gap-4 p-4 sm:p-5">
        <div><Dialog.Title className="text-lg font-semibold" style={{ color: C.text }}>Export období</Dialog.Title>
          <Dialog.Description className="mt-1 text-xs leading-relaxed" style={{ color: C.muted }}>Kompletní historické statistiky zařízení{hospitalName ? ` ${hospitalName}` : ''}. Vyberte období, načtěte záznamy a potom formát.</Dialog.Description></div>
        <button type="button" className="timeline-popup-close flex h-11 w-11 shrink-0 items-center justify-center" onClick={close} aria-label="Zavřít export"><X size={18} aria-hidden /></button>
      </div>
      <div className="space-y-5 p-4 sm:p-5">
        <fieldset disabled={busy} className="space-y-3">
          <legend className="mb-2 text-xs font-medium" style={{ color: C.muted }}>Rozsah exportu</legend>
          <div className="flex flex-wrap gap-2">{choices.map(choice => <label key={choice.value} className={`${buttonClass} inline-flex cursor-pointer items-center gap-2`} style={{ ...buttonStyle, ...(preset === choice.value ? { borderColor: C.accent, color: C.accent } : {}) }}>
            <input type="radio" name={`${id}-period`} value={choice.value} checked={preset === choice.value} onChange={() => setPreset(choice.value)} />{choice.label}</label>)}</div>
          {preset === 'custom' ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label htmlFor={`${id}-from`} className="space-y-1 text-xs" style={{ color: C.muted }}><span>Od (včetně)</span><input id={`${id}-from`} type="date" value={from} onChange={event => setFrom(event.target.value)} className={`${buttonClass} block w-full`} style={buttonStyle} /></label>
            <label htmlFor={`${id}-to`} className="space-y-1 text-xs" style={{ color: C.muted }}><span>Do (včetně)</span><input id={`${id}-to`} type="date" value={to} min={from} onChange={event => setTo(event.target.value)} className={`${buttonClass} block w-full`} style={buttonStyle} /></label>
          </div> : <label htmlFor={`${id}-anchor`} className="block space-y-1 text-xs" style={{ color: C.muted }}><span>Datum v požadovaném {preset === 'day' ? 'dni' : preset === 'week' ? 'týdnu' : preset === 'month' ? 'měsíci' : 'roce'}</span><input id={`${id}-anchor`} type="date" value={anchor} onChange={event => setAnchor(event.target.value)} className={`${buttonClass} block w-full`} style={buttonStyle} /></label>}
        </fieldset>
        <p className="text-xs leading-relaxed" style={{ color: C.muted }}>{range ? `${range.from} – ${range.to} včetně (${range.days.length} provozní${range.days.length === 1 ? ' den' : range.days.length < 5 ? ' dny' : 'ch dnů'}). ` : ''}Europe/Prague · provozní den 07:00 až 07:00 následujícího dne. Týden začíná v pondělí.</p>
        <p className="text-xs leading-relaxed" style={{ color: C.muted }}>PDF: kompaktní grafy vytížení podle rozpisu, samostatné hodiny, podíl a časové vytížení ÚPS, fáze, výkonnost a provozní upozornění včetně pozdních příchodů. CSV a JSON navíc obsahují podrobné záznamy. Filtr fází ≥ 1 min {excludeShortPhases ? 'je zapnutý' : 'je vypnutý'}; párování výkonů a upozornění nemění.</p>
        <p className="text-xs leading-relaxed" style={{ color: C.muted }}>Dřívější změny rozpisu a sazeb nejsou archivované: vytížení a referenční náklady používají uloženou konfiguraci. Budoucí dny se do vytížení nezapočítávají. Aktuální stav sálů do PDF nevstupuje.</p>
        {(error || dateError) && <p role="alert" className="text-sm" style={{ color: C.red }}>{error || dateError}</p>}
        {(busy || ready) && <div role="status" aria-live="polite" className="space-y-2 text-xs" style={{ color: C.muted }}>
          <StatisticsPreloader compact progress={progress} label={ready ? 'Export připraven' : historyProgress.complete && notificationProgress.complete ? 'Připravuji souhrny…' : 'Načítám všechny záznamy…'}
            hint={ready ? `Ve zvoleném období ${ready.sourceHistoryCount} událostí a ${ready.sourceNotificationCount} notifikací.` : 'Počet zahrnuje také podpůrné záznamy před i po období potřebné pro správné párování.'} />
        </div>}
        <div className="flex flex-wrap justify-end gap-2 border-t pt-4" style={{ borderColor: C.border }}>
          {busy ? <button type="button" className={buttonClass} style={buttonStyle} onClick={() => { request.current += 1; setBusy(false); setData(null); }}>Zrušit načítání</button>
            : <button type="button" className={`${buttonClass} inline-flex items-center gap-2`} style={{ ...buttonStyle, color: C.accent }} disabled={!range || !hospitalId} onClick={() => void prepare()}><LoaderCircle size={15} aria-hidden />{error ? 'Zkusit znovu' : ready ? 'Načíst znovu' : 'Připravit export'}</button>}
          <button type="button" className={`${buttonClass} inline-flex items-center gap-2`} style={buttonStyle} disabled={!ready || busy} onClick={() => exportFile('csv')}><Download size={15} aria-hidden />CSV</button>
          <button type="button" className={`${buttonClass} inline-flex items-center gap-2`} style={buttonStyle} disabled={!ready || busy} onClick={() => exportFile('json')}><FileJson size={15} aria-hidden />JSON</button>
          <button type="button" className={`${buttonClass} inline-flex items-center gap-2`} style={buttonStyle} disabled={!ready || busy} onClick={() => exportFile('pdf')}><FileText size={15} aria-hidden />PDF / tisk</button>
        </div>
      </div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
