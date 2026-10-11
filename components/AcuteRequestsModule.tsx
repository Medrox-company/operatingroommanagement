'use client';

import React, { useMemo, useRef, useState } from 'react';
import { ArrowDownUp, ArrowRight, CalendarDays, CheckCircle2, Circle, Clock3, GripVertical, History, Plus, RefreshCw, Shield, UserRound } from 'lucide-react';
import type { OperatingRoom } from '../types';
import type { AcuteRequest } from '../lib/acute-requests';
import type { AcuteCycleLink } from '../lib/acute-cycle-links';
import { acuteCycleMinutes, partitionAcuteModuleRequests, type AcuteModuleHistoryDays } from '../lib/acute-module-cycles';
import { acuteCycleDay, acuteDayCycleQueryWindow, acutePickerDateFromKey, acutePickerDateKey, acutePragueDateKey, clampAcuteDaySelection, isAcuteDayKey, projectAcuteDayView } from '../lib/acute-day-view';
import { projectAcuteCircularTimeline } from '../lib/acute-circular-timeline';
import { useAcuteRequests, type AcuteRequestsController } from '../hooks/useAcuteRequests';
import { useAcuteCycleLinks } from '../hooks/useAcuteCycleLinks';
import { useNowMinuteMs } from '../hooks/useSharedClock';
import ModulePageHeading from './ModulePageHeading';
import { activeRequests, eventLabel, formatDateTime, formatTime, latestReorder, STATUS_LABELS, URGENCY_LABELS, urgencyCountLabel, waitingRequestsLabel, wholeWaitingMinutes } from './acute/display';
import { AcuteCycleDetailDialog, AcuteDetailDialog, AcuteRequestFormDialog, AcuteReorderDialog, restoreAcuteDialogFocus } from './acute/AcuteDialogs';
import AcuteCircularTimeline from './acute/AcuteCircularTimeline';
import { DayNavigator, GlassCalendar } from './statistics/AppCharts';
import './acute/acute-requests.css';

export interface AcuteRequestsModuleProps {
  rooms: OperatingRoom[];
  /** Injected only by isolated QA; production uses the authenticated hospital-scoped API. */
  controller?: AcuteRequestsController;
  /** Optional evidence for isolated QA; never used instead of authenticated production data. */
  cycleEvidence?: AcuteModuleCycleEvidence;
  now?: number;
  selectedDayKey?: string;
  onSelectedDayChange?: (dayKey: string) => void;
}

export interface AcuteModuleCycleEvidence {
  links: readonly AcuteCycleLink[];
  loading: boolean;
  error: string | null;
  refresh?: () => Promise<unknown>;
}
const EMPTY_CYCLE_EVIDENCE: AcuteModuleCycleEvidence = { links: [], loading: false, error: null };

function LiveAcuteRequestsModule({ rooms, now: fixedNow, selectedDayKey: controlledDay, onSelectedDayChange }: Pick<AcuteRequestsModuleProps, 'rooms' | 'now' | 'selectedDayKey' | 'onSelectedDayChange'>) {
  const controller = useAcuteRequests();
  const minute = useNowMinuteMs();
  const now = fixedNow ?? minute;
  const [historyDays, setHistoryDays] = useState<AcuteModuleHistoryDays>(30);
  const [daySelection, setDaySelection] = useState<{ scopeId: string | undefined; dayKey: string } | null>(null);
  const todayKey = acutePragueDateKey(now)!;
  const selectedDayKey = clampAcuteDaySelection(now, controlledDay ?? (daySelection?.scopeId === controller.scopeId ? daySelection.dayKey : todayKey));
  const window = useMemo(() => acuteDayCycleQueryWindow(now, selectedDayKey, historyDays), [todayKey, selectedDayKey, historyDays]);
  const cycleEvidence = useAcuteCycleLinks(true, window);
  return <AcuteRequestsView key={controller.scopeId} rooms={rooms} controller={controller} now={now} cycleEvidence={cycleEvidence} historyDays={historyDays} onHistoryDaysChange={setHistoryDays} selectedDayKey={selectedDayKey} onSelectedDayChange={dayKey => { setDaySelection({ scopeId: controller.scopeId, dayKey }); onSelectedDayChange?.(dayKey); }} />;
}

export default function AcuteRequestsModule({ controller, ...props }: AcuteRequestsModuleProps) {
  return controller ? <AcuteRequestsView key={controller.scopeId} {...props} controller={controller} /> : <LiveAcuteRequestsModule rooms={props.rooms} now={props.now} selectedDayKey={props.selectedDayKey} onSelectedDayChange={props.onSelectedDayChange} />;
}

type Tab = 'requests' | 'timeline' | 'history';
const TABS: Array<{ id: Tab; label: string }> = [{ id: 'requests', label: 'Požadavky' }, { id: 'timeline', label: 'Časová osa' }, { id: 'history', label: 'Historie' }];

type AcuteRequestsViewProps = Required<Pick<AcuteRequestsModuleProps, 'controller' | 'rooms'>> & Pick<AcuteRequestsModuleProps, 'now' | 'cycleEvidence' | 'selectedDayKey' | 'onSelectedDayChange'> & {
  historyDays?: AcuteModuleHistoryDays;
  onHistoryDaysChange?: (days: AcuteModuleHistoryDays) => void;
};

export function AcuteRequestsView({ rooms, controller, now: fixedNow, cycleEvidence = EMPTY_CYCLE_EVIDENCE, historyDays: controlledDays, onHistoryDaysChange, selectedDayKey: controlledDay, onSelectedDayChange }: AcuteRequestsViewProps) {
  const minute = useNowMinuteMs();
  const now = fixedNow ?? minute;
  const [tab, setTab] = useState<Tab>('requests');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [localDays, setLocalDays] = useState<AcuteModuleHistoryDays>(30);
  const [localDay, setLocalDay] = useState<string | null>(null);
  const [form, setForm] = useState<{ request: AcuteRequest | null; revision: number } | null>(null);
  const [reorder, setReorder] = useState<{ requests: AcuteRequest[]; revision: number } | null>(null);
  const [notice, setNotice] = useState('');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dialogOpener = useRef<HTMLButtonElement | null>(null);
  const rememberOpener = (button: HTMLButtonElement) => { dialogOpener.current = button; };
  const openNewRequest = (button: HTMLButtonElement) => { rememberOpener(button); setForm({ request: null, revision: controller.revision }); };
  const closeAutoFocus = (event: Event) => restoreAcuteDialogFocus(event, dialogOpener.current, tabRefs.current[TABS.findIndex(item => item.id === tab)] ?? null);
  const active = useMemo(() => activeRequests(controller.requests), [controller.requests]);
  const historyDays = controlledDays ?? localDays;
  const todayKey = acutePragueDateKey(now)!;
  const selectedDayKey = clampAcuteDaySelection(now, controlledDay ?? localDay);
  const pickerDates = useMemo(() => {
    const midnight = (key: string) => { const date = acutePickerDateFromKey(key)!; date.setHours(0, 0, 0, 0); return date; };
    const earliest = acutePragueDateKey(acuteDayCycleQueryWindow(now, todayKey, 365).startMs)!;
    return { selected: midnight(isAcuteDayKey(selectedDayKey) ? selectedDayKey : todayKey), today: midnight(todayKey), min: midnight(earliest) };
  }, [selectedDayKey, todayKey]);
  const historyWindow = useMemo(() => acuteDayCycleQueryWindow(now, todayKey, historyDays), [todayKey, historyDays]);
  const fullPartition = useMemo(() => partitionAcuteModuleRequests(controller.requests, cycleEvidence.links), [controller.requests, cycleEvidence.links]);
  const historyPartition = useMemo(() => partitionAcuteModuleRequests(controller.requests, cycleEvidence.links, historyWindow), [controller.requests, cycleEvidence.links, historyWindow]);
  const dayView = useMemo(() => projectAcuteDayView(fullPartition, controller.requests, selectedDayKey), [fullPartition, controller.requests, selectedDayKey]);
  const partition = dayView.partition;
  const { waiting, begun, performed } = partition;
  const evidenceReady = !cycleEvidence.loading && !cycleEvidence.error;
  const loading = controller.loading || cycleEvidence.loading;
  const error = controller.error || cycleEvidence.error;
  const roomNames = useMemo(() => new Map(rooms.map(room => [room.id, room.name])), [rooms]);
  const requestById = useMemo(() => new Map(controller.requests.map(request => [request.id, request])), [controller.requests]);
  const receiptFallbackIds = useMemo(() => new Set(cycleEvidence.links.filter(link => acuteCycleDay(link, requestById.get(link.requestId)).source !== 'receivedAt').map(link => link.requestId)), [cycleEvidence.links, requestById]);
  const selected = selectedId ? requestById.get(selectedId) ?? null : null;
  const selectedCycle = evidenceReady && selectedCycleId ? cycleEvidence.links.find(link => link.requestId === selectedCycleId) : undefined;
  const counts = useMemo(() => ({ emergent: waiting.filter(request => request.urgency === 'emergent').length, urgent: waiting.filter(request => request.urgency === 'urgent').length, expedited: waiting.filter(request => request.urgency === 'expedited').length }), [waiting]);
  const waitingText = waitingRequestsLabel(waiting.length);
  const timelineNodes = useMemo(() => tab === 'timeline' ? projectAcuteCircularTimeline(partition, controller.requests, now) : [], [tab, partition, controller.requests, now]);
  const archived = dayView.archived.map(item => item.request).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const openRequest = (requestId: string, button: HTMLButtonElement) => { rememberOpener(button); setSelectedCycleId(null); setSelectedId(requestId); };
  const openCycle = (cycle: AcuteCycleLink, button: HTMLButtonElement) => { rememberOpener(button); setSelectedCycleId(cycle.requestId); setSelectedId(requestById.has(cycle.requestId) ? cycle.requestId : null); };
  const closeDetail = () => { setSelectedId(null); setSelectedCycleId(null); };
  const dayLabel = pickerDates.selected.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
  const periodText = `Vybraný den: ${dayLabel}`;
  const historyPeriodText = `Posledních ${historyDays} kalendářních dní`;
  const performedContext = `${historyPeriodText} · skutečně dokončené operační cykly.${historyPartition.supplementalPerformed.length ? ` Navíc ${historyPartition.supplementalPerformed.length} starší dokončené cykly dosud neuzavřených požadavků mimo vybrané období.` : ''}`;
  const changeSelectedDay = (dayKey: string) => {
    const earliest = acutePickerDateKey(pickerDates.min)!;
    if (!isAcuteDayKey(dayKey) || dayKey < earliest || dayKey > todayKey) return;
    (onSelectedDayChange ?? setLocalDay)(dayKey);
    closeDetail();
  };
  const pickDate = (date: Date) => { const key = acutePickerDateKey(date); if (key) { changeSelectedDay(key); if (tab === 'history') setTab('requests'); } };
  const calendarHeat = useMemo(() => loading || error ? {} : Object.fromEntries([...dayView.activityByDay].map(([key, activity]) => [key, activity.requests > 0 ? 1 : 0])), [dayView.activityByDay, loading, error]);
  const dayRequestCount = dayView.activityByDay.get(selectedDayKey)?.requests ?? 0;
  const outsideWaitingCount = dayView.otherDayWaiting.length;

  return (
    <section className="acute-module statistics-module statistics-settings" aria-label="Akutní operační výkony" aria-busy={loading || controller.busy}>
      <header className="acute-page-header app-module-page-header">
        <ModulePageHeading icon={Shield} kicker="Koordinace operačního programu" title="Akutní" mutedTitle="výkony" />
      </header>

      <div className="acute-toolbar">
        <div className="acute-metric-rail" aria-label={`Souhrn požadavků pro ${dayLabel}`}>
          {[
            { label: 'Požadavky', value: dayRequestCount, icon: Shield, color: 'var(--color-info)' },
            { label: 'Čekají', value: waiting.length, icon: Clock3, color: 'var(--color-warning)' },
            { label: 'Zahájené', value: begun.length, icon: RefreshCw, color: 'var(--color-primary)' },
            { label: 'Provedené', value: performed.length, icon: CheckCircle2, color: 'var(--color-success)' },
          ].map(({ label, value, icon: Icon, color }) => <div key={label} className="acute-metric"><div><span>{label}</span><strong>{loading || error ? '—' : value}</strong></div><Icon size={16} strokeWidth={1.5} style={{ color }} aria-hidden /></div>)}
        </div>
        <div className="acute-tabs" role="tablist" aria-label="Zobrazení akutních požadavků">
          {TABS.map((item, index) => <button key={item.id} ref={element => { tabRefs.current[index] = element; }} id={`acute-tab-${item.id}`} role="tab" type="button" aria-selected={tab === item.id} aria-controls={`acute-panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)} onKeyDown={event => {
            let next: number | undefined;
            if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
            if (event.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = TABS.length - 1;
            if (next !== undefined) { event.preventDefault(); setTab(TABS[next].id); tabRefs.current[next]?.focus(); }
          }}>{item.label}</button>)}
        </div>
        <div className="acute-toolbar-actions">
          {tab === 'requests' && controller.canManage && active.length > 1 && <button type="button" className="acute-button acute-button-quiet" disabled={controller.busy || loading || Boolean(error)} onClick={event => { rememberOpener(event.currentTarget); setReorder({ requests: active, revision: controller.revision }); }}><ArrowDownUp size={17} aria-hidden />Upravit pořadí</button>}
          {controller.canManage && <button type="button" className="acute-button acute-button-primary" disabled={controller.busy} onClick={event => openNewRequest(event.currentTarget)}><Plus size={17} aria-hidden />Nový požadavek</button>}
        </div>
      </div>

      <div className="acute-day-bar">
        <div><strong>{tab === 'history' ? 'Historie požadavků' : dayLabel}</strong><span>{tab === 'history' ? 'Záznamy mimo vybraný den a audit změn' : 'Podle dne zadání · Europe/Prague'}</span></div>
        {tab === 'history' ? <label className="acute-cycle-period"><span>Historie cyklů</span><select aria-label="Období historie akutních cyklů" value={historyDays} onChange={event => { const days = Number(event.currentTarget.value) as AcuteModuleHistoryDays; if (days !== 30 && days !== 90 && days !== 365) return; (onHistoryDaysChange ?? setLocalDays)(days); closeDetail(); }}><option value={30}>30 dní</option><option value={90}>90 dní</option><option value={365}>365 dní</option></select></label> : <DayNavigator value={pickerDates.selected} onChange={pickDate} today={pickerDates.today} minDate={pickerDates.min} className="acute-day-navigator" />}
      </div>
      {!loading && !error && outsideWaitingCount > 0 && <button type="button" className="acute-other-day-note" onClick={() => setTab('history')}><History size={16} aria-hidden /><span>Mimo vybraný den čekají další požadavky: <strong>{outsideWaitingCount}</strong></span><span>Otevřít historii</span><ArrowRight size={16} aria-hidden /></button>}
      <div className="acute-day-workspace">
      <div className="acute-day-main">
      {notice && <p className="acute-status-message" role="status">{notice}</p>}
      {!loading && !error && tab !== 'history' && [...begun, ...performed].some(cycle => receiptFallbackIds.has(cycle.requestId)) && <p className="acute-context-note">U některých historických cyklů není původní čas zadání dostupný. Tyto cykly jsou zařazené podle skutečného dne zahájení, nikoli podle nedoloženého zadání požadavku.</p>}
      {error ? <div className="acute-state acute-error" role="alert"><p>{error}</p>{controller.errorCode === 'ACUTE_MIGRATION_REQUIRED' && <p className="acute-subtle">Databáze tohoto zařízení zatím nemá schéma akutních požadavků. Upozorněte správce aplikace.</p>}{cycleEvidence.error && <p className="acute-subtle">Bez ověřené evidence cyklů nelze bezpečně rozlišit čekající, zahájené a provedené výkony.</p>}<button type="button" className="acute-button acute-button-quiet" onClick={() => { void controller.refresh(); void cycleEvidence.refresh?.(); }}><RefreshCw size={17} aria-hidden />Zkusit znovu</button></div> : loading ? <div className="acute-state" role="status"><RefreshCw size={22} aria-hidden /><p>Načítání akutních požadavků a operačních cyklů…</p></div> : (
        <div role="tabpanel" id={`acute-panel-${tab}`} aria-labelledby={`acute-tab-${tab}`} tabIndex={0} className="acute-tab-panel">
          {tab === 'requests' && <>
            {waiting.length > 0 && <div className="acute-order-heading"><strong>{waitingText} · ručně nastavené pořadí</strong><span>Pořadí není klinická naléhavost. {urgencyCountLabel(counts.emergent, 'emergent')} · {urgencyCountLabel(counts.urgent, 'urgent')} · {urgencyCountLabel(counts.expedited, 'expedited')}</span></div>}
            {waiting.length ? <div className="acute-card-grid">{waiting.map(request => <AcuteRequestCard key={request.id} request={request} controller={controller} roomNames={roomNames} now={now} onOpen={button => openRequest(request.id, button)} />)}</div> : begun.length || performed.length ? <p className="acute-context-note">Žádné čekající požadavky pro vybraný den. Nový výkon zadáte tlačítkem Nový požadavek.</p> : <AcuteEmptyState canManage={controller.canManage} busy={controller.busy} onCreate={openNewRequest} />}
            {begun.length > 0 && <AcuteCycleSection title="Zahájené operační cykly" description="Zahájení cyklu není potvrzením dokončeného výkonu. Čekání ani odhad se již nezapočítávají do čekajících požadavků." cycles={begun} roomNames={roomNames} receiptFallbackIds={receiptFallbackIds} onOpen={openCycle} />}
            {performed.length > 0 && <AcuteCycleSection title="Provedené akutní výkony" description={`${periodText} · doložené dokončení celého cyklu.`} cycles={performed} roomNames={roomNames} receiptFallbackIds={receiptFallbackIds} completed onOpen={openCycle} />}
          </>}
          {tab === 'timeline' && <AcuteCircularTimeline nodes={timelineNodes} roomNames={roomNames} periodText={periodText} unplacedCount={waiting.length + begun.length + performed.length - timelineNodes.length} onOpenRequest={openRequest} onOpenCycle={openCycle} />}
          {tab === 'history' && <>
            <div className="acute-order-heading"><strong>Historie požadavků a změn</strong><span>Uzavření požadavku není záznamem provedeného operačního výkonu.</span></div>
            {dayView.otherDayWaiting.length > 0 && <section className="acute-other-day-requests" aria-label="Čekající požadavky z ostatních dnů"><h2>Čekající požadavky z ostatních dnů</h2><p className="acute-context-note">Stále čekají na výkon. Zachované je celé provozní pořadí bez automatického uzavření.</p><div className="acute-card-grid">{dayView.otherDayWaiting.map(request => <AcuteRequestCard key={request.id} request={request} controller={controller} roomNames={roomNames} now={now} onOpen={button => openRequest(request.id, button)} />)}</div></section>}
            {dayView.otherDayBegun.length > 0 && <AcuteCycleSection title="Zahájené cykly z ostatních dnů" description="Tyto cykly dosud nemají doložené dokončení." cycles={dayView.otherDayBegun} roomNames={roomNames} receiptFallbackIds={receiptFallbackIds} onOpen={openCycle} />}
            {controller.historyLimited && <p className="acute-context-note">Je zobrazen omezený výběr nejnovější historie. Záznamy změn zůstávají uložené v databázi.</p>}
            <AcuteCycleSection title="Provedené akutní výkony" description={performedContext} cycles={historyPartition.performed} roomNames={roomNames} receiptFallbackIds={receiptFallbackIds} completed onOpen={openCycle} />
            {archived.length > 0 && <section className="acute-unassigned"><h2>Ručně uzavřené nebo zrušené požadavky</h2><p className="acute-context-note">Samotný stav požadavku nepotvrzuje provedení operace. Tento seznam je omezený přehled požadavků, nezávislý na období historie cyklů.</p>{archived.map(request => <button key={request.id} type="button" className="acute-history-row" onClick={event => openRequest(request.id, event.currentTarget)}><span><strong>{request.procedureName}</strong><small>{request.reference || request.department}</small></span><span>{STATUS_LABELS[request.status]}<small>{formatDateTime(request.updatedAt)}</small></span><ArrowRight size={18} aria-hidden /></button>)}</section>}
            {controller.events.length ? <ol className="acute-event-list">{[...controller.events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).map(event => <li key={event.id}><History size={17} aria-hidden /><div><strong>{eventLabel(event.action)}{event.action === 'reorder' && event.previousPosition !== event.newPosition ? ` ${event.previousPosition ?? '—'} → ${event.newPosition ?? '—'}` : ''}</strong><p>{requestById.get(event.requestId)?.procedureName ?? 'Akutní požadavek'} · {event.actorName}</p>{event.reason && <p>{event.reason}</p>}<time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time></div></li>)}</ol> : <div className="acute-state"><History size={26} aria-hidden /><h2>Historie zatím neobsahuje záznamy</h2></div>}
          </>}
        </div>
      )}
      {controller.historyLimited && tab !== 'history' && <p className="acute-context-note">Starší uzavřené požadavky jsou dostupné pouze v omezeném načteném výběru. Prázdný den nemusí znamenat úplnou historickou evidenci.</p>}
      </div>
      <aside className="acute-calendar-aside" aria-label="Kalendář akutních požadavků">
        <div className="acute-calendar-heading"><CalendarDays size={18} aria-hidden /><div><h2>Kalendář požadavků</h2><p>Vyberte den zadání</p></div></div>
        <GlassCalendar value={pickerDates.selected} onChange={pickDate} today={pickerDates.today} minDate={pickerDates.min} heat={calendarHeat} accent="#06B6D4" className="acute-calendar" />
        <p className="acute-context-note">Zvýrazněné dny obsahují skutečně načtené požadavky. Ostatní dny a změny najdete v Historii.</p>
      </aside>
      </div>
      <footer className="acute-footer"><span>Operating Room Manager</span><span>Údaje z evidovaných požadavků a skutečných cyklů zařízení</span></footer>
      {form && <AcuteRequestFormDialog key={form.request?.id ?? 'new'} open rooms={rooms} request={form.request} revision={form.revision} controller={controller} onCloseAutoFocus={closeAutoFocus} onClose={() => setForm(null)} onSaved={() => { setForm(null); if (!form.request) { changeSelectedDay(todayKey); setTab('requests'); } setNotice(form.request ? 'Změny požadavku byly uloženy.' : 'Akutní požadavek byl přijat.'); }} />}
      {selected && !form && !loading && !error && <AcuteDetailDialog request={selected} cycle={selectedCycle ?? cycleEvidence.links.find(link => link.requestId === selected.id)} rooms={rooms} controller={controller} now={now} onCloseAutoFocus={closeAutoFocus} onClose={closeDetail} onEdit={() => setForm({ request: selected, revision: controller.revision })} onNotice={setNotice} />}
      {!selected && selectedCycle && !form && !loading && !error && <AcuteCycleDetailDialog cycle={selectedCycle} rooms={rooms} onCloseAutoFocus={closeAutoFocus} onClose={closeDetail} />}
      {reorder && <AcuteReorderDialog requests={reorder.requests} revision={reorder.revision} controller={controller} onCloseAutoFocus={closeAutoFocus} onClose={() => setReorder(null)} onSaved={() => { setReorder(null); setNotice('Nové pořadí a důvod změny byly uloženy do historie.'); }} />}
    </section>
  );
}

function AcuteCycleSection({ title, description, cycles, roomNames, receiptFallbackIds, completed = false, onOpen }: {
  title: string;
  description: string;
  cycles: readonly AcuteCycleLink[];
  roomNames: ReadonlyMap<string, string>;
  receiptFallbackIds?: ReadonlySet<string>;
  completed?: boolean;
  onOpen: (cycle: AcuteCycleLink, button: HTMLButtonElement) => void;
}) {
  return <section className="acute-cycle-section" aria-label={title}>
    <div className="acute-cycle-section-heading"><h2>{title}</h2><span className="acute-cycle-count" aria-label={`Počet: ${cycles.length}`}>{cycles.length}</span></div>
    <p className="acute-context-note">{description}</p>
    {cycles.length ? cycles.map(cycle => <button key={cycle.requestId} type="button" className="acute-history-row acute-cycle-row" data-urgency={cycle.urgency} onClick={event => onOpen(cycle, event.currentTarget)} aria-label={`Otevřít ${completed ? 'provedený výkon' : 'zahájený cyklus'} ${cycle.procedureName}`}>
      <span className="acute-cycle-identity"><strong>{cycle.procedureName}</strong><small className="acute-urgency"><Circle size={9} fill="currentColor" aria-hidden />{URGENCY_LABELS[cycle.urgency]} · původní zápis #{cycle.submissionPosition ?? '—'}</small><small>{roomNames.get(cycle.roomId) ?? `Sál ${cycle.roomId}`}</small></span>
      <span className="acute-cycle-evidence"><strong>{completed ? 'Provedeno' : 'Cyklus zahájen'}</strong><small>Zahájení cyklu: {formatDateTime(cycle.startedAt)}</small>{completed && <small>Dokončení cyklu: {formatDateTime(cycle.endedAt)}</small>}{receiptFallbackIds?.has(cycle.requestId) && <small>Den podle zahájení cyklu · původní čas zadání není dostupný</small>}</span>
      {completed && <span className="acute-cycle-duration"><strong>{acuteCycleMinutes(cycle)} min</strong><small>Skutečná délka celého cyklu</small></span>}
      <ArrowRight size={18} aria-hidden />
    </button>) : <p className="acute-context-note">Ve vybraném období není evidován dokončený akutní operační cyklus.</p>}
    {completed && cycles.length > 0 && <p className="acute-context-note acute-cycle-rounding-note">Časy jsou zaokrouhlené na celé minuty; 0 min může znamenat cyklus kratší než 30 s.</p>}
  </section>;
}

function AcuteEmptyState({ canManage, busy, onCreate }: { canManage: boolean; busy: boolean; onCreate: (button: HTMLButtonElement) => void }) {
  const rings = <svg className="acute-empty-rings" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
    <circle className="acute-empty-ring-outer" cx="120" cy="120" r="117" />
    <circle className="acute-empty-ring-main" cx="120" cy="120" r="107" />
    <circle className="acute-empty-ring-inner" cx="120" cy="120" r="98" />
  </svg>;
  return <div className="acute-empty">
    {canManage ? <button type="button" className="acute-empty-orb" disabled={busy} aria-label="Nový požadavek z prázdného přehledu" onClick={event => onCreate(event.currentTarget)}>
      {rings}<span className="acute-empty-orb-copy"><Plus size={28} strokeWidth={1.5} aria-hidden /><span>Nový<br />požadavek</span></span>
    </button> : <div className="acute-empty-orb acute-empty-orb-readonly">{rings}<span className="acute-empty-orb-copy"><Shield size={28} strokeWidth={1.5} aria-hidden /><span>Bez<br />požadavků</span></span></div>}
    <div className="acute-empty-caption"><h2>Žádné čekající požadavky pro vybraný den</h2><p>{canManage ? 'Kliknutím na kruh zadáte nový akutní výkon pro aktuální den.' : 'Nové požadavky může zadávat koordinátor.'}</p></div>
  </div>;
}

function AcuteRequestCard({ request, controller, roomNames, now, onOpen }: { request: AcuteRequest; controller: AcuteRequestsController; roomNames: Map<string, string>; now: number; onOpen: (button: HTMLButtonElement) => void }) {
  const reordered = latestReorder(request.id, controller.events);
  return <article className="acute-card" data-urgency={request.urgency} aria-label={`Pořadí ${request.queuePosition}, ${request.procedureName}, ${URGENCY_LABELS[request.urgency]}`}>
    <div className="acute-card-main">
      <div className="acute-card-rank"><GripVertical size={20} strokeWidth={1.8} aria-hidden /><strong>Pořadí {request.queuePosition ?? '—'}</strong>{request.reference && <span className="acute-reference">{request.reference}</span>}<time className="acute-card-received" dateTime={request.receivedAt}>Zadáno {formatDateTime(request.receivedAt)}</time></div>
      <div className="acute-card-title"><h2>{request.procedureName}</h2><p>{request.department}</p><span className="acute-urgency"><Circle size={12} fill="currentColor" aria-hidden />{URGENCY_LABELS[request.urgency]}</span></div>
      <dl className="acute-card-metrics"><div><dt>Čekání od přijetí</dt><dd>{wholeWaitingMinutes(request.receivedAt, now) ?? '—'} <span>min</span></dd></div><div><dt>Odhad výkonu</dt><dd>{request.estimatedDurationMinutes} <span>min</span></dd></div></dl>
    </div>
    <div className="acute-card-footer">
      <div className="acute-card-assignment"><UserRound size={24} strokeWidth={1.35} aria-hidden /><div><p>{request.proposedRoomId ? `${roomNames.get(request.proposedRoomId) ?? 'Přiřazený sál'} · návrh — nepotvrzeno` : 'Bez přiděleného sálu'}</p>{request.acknowledgedAt && <small>Převzato koordinátorem · {formatTime(request.acknowledgedAt)}</small>}</div></div>
      <div className="acute-card-audit">{reordered ? <><Clock3 size={19} strokeWidth={1.5} aria-hidden /><div><p>Pořadí změněno {reordered.previousPosition ?? '—'} → {reordered.newPosition ?? '—'} · {formatTime(reordered.occurredAt)}</p><small>{reordered.actorName} · Důvod: {reordered.reason}</small></div></> : <><Circle size={19} strokeWidth={1.4} aria-hidden /><p>{request.status === 'pending' ? 'Nepřevzato' : request.proposedRoomId ? 'Převzato · návrh zařazení' : 'Převzato · bez zařazení'}</p></>}</div>
    </div>
    <button type="button" className="acute-card-hitarea" onClick={event => onOpen(event.currentTarget)} aria-label={`Otevřít detail požadavku ${request.procedureName}`}><span className="acute-open-button" aria-hidden><ArrowRight size={23} strokeWidth={1.5} /></span></button>
  </article>;
}
