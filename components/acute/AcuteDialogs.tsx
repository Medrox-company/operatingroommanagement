'use client';

import React, { useId, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowDown, ArrowUp, CalendarClock, Check, ClipboardList, Clock3, History, Pencil, ShieldAlert, Siren, Timer, X } from 'lucide-react';
import { ACUTE_INPUT_LIMITS, type AcuteRequest, type AcuteRequestInput } from '../../lib/acute-requests';
import type { AcuteCycleLink } from '../../lib/acute-cycle-links';
import { acuteCycleMinutes, completedAcuteCycle } from '../../lib/acute-module-cycles';
import type { AcuteRequestsController } from '../../hooks/useAcuteRequests';
import type { OperatingRoom } from '../../types';
import { acuteRoomOptions, eventLabel, formatDateTime, STATUS_LABELS, URGENCY_DESCRIPTIONS, URGENCY_LABELS, wholeWaitingMinutes } from './display';

/** Controlled Radix dialogs have no Trigger; restore their actual opener explicitly. */
export function restoreAcuteDialogFocus(event: Event, opener: HTMLElement | null, fallback: HTMLElement | null) {
  event.preventDefault();
  const document = opener?.ownerDocument ?? fallback?.ownerDocument;
  // A replacement dialog owns focus during detail/edit transitions. Do not focus its background.
  if (!document || document.querySelector('[role="dialog"][data-state="open"]')) return;
  const available = (element: HTMLElement | null) => element?.isConnected && element.getClientRects().length > 0 && !element.matches(':disabled, [aria-disabled="true"]') && !element.closest('[inert], [hidden]');
  const target = available(opener) ? opener : available(fallback) ? fallback : null;
  target?.focus({ preventScroll: true });
  if (target && document.activeElement !== target && target !== fallback && available(fallback)) fallback?.focus({ preventScroll: true });
}

type DialogFocusProps = { onCloseAutoFocus: (event: Event) => void };

function AcuteDialog({ open = true, title, description, onClose, onCloseAutoFocus, children, wide = false, intake = false }: { open?: boolean; title: string; description: string; onClose: () => void; children: React.ReactNode; wide?: boolean; intake?: boolean } & DialogFocusProps) {
  return <Dialog.Root open={open} onOpenChange={next => { if (!next) onClose(); }}><Dialog.Portal>
    <Dialog.Overlay className="acute-dialog-overlay timeline-popup-overlay" />
    <Dialog.Content className={`acute-dialog timeline-popup-panel${wide ? ' acute-dialog-wide' : ''}${intake ? ' acute-dialog-intake' : ''}`} onCloseAutoFocus={onCloseAutoFocus}>
      <div className="acute-dialog-heading timeline-popup-header">
        <div className="acute-dialog-heading-copy"><div className="acute-dialog-title-row"><span className="acute-dialog-heading-icon" aria-hidden><ClipboardList size={18} /></span><Dialog.Title>{title}</Dialog.Title></div><Dialog.Description>{description}</Dialog.Description></div>
        <Dialog.Close asChild><button type="button" className="acute-icon-button timeline-popup-close" aria-label="Zavřít okno"><X size={18} aria-hidden /></button></Dialog.Close>
      </div>
      <div className="acute-dialog-body">{children}</div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}

type Draft = Omit<AcuteRequestInput, 'estimatedDurationMinutes' | 'urgency' | 'reference' | 'clinicalDecisionAt' | 'latestStartAt' | 'proposedStartAt'> & { estimatedDurationMinutes: string; urgency: AcuteRequestInput['urgency'] | '' };

type DurationBand = 'up-to-30' | 'up-to-60' | 'over-60';

export function acuteDurationBand(minutes: string): DurationBand | '' {
  const value = Number(minutes);
  if (!Number.isInteger(value) || value < ACUTE_INPUT_LIMITS.durationMin || value > ACUTE_INPUT_LIMITS.durationMax) return '';
  return value <= 30 ? 'up-to-30' : value <= 60 ? 'up-to-60' : 'over-60';
}

/** The user-approved over-60 planning estimate is 120 min, not a recorded duration. */
export function selectAcuteDuration(minutes: string, band: DurationBand): string {
  if (band === 'over-60') return '120';
  if (acuteDurationBand(minutes) === band) return minutes;
  return band === 'up-to-30' ? '30' : '60';
}

const durationOptions = [
  { value: 'up-to-30', label: 'Do 30 min' },
  { value: 'up-to-60', label: 'Do 60 min' },
  { value: 'over-60', label: 'Více než 60 min' },
] as const;

export function AcuteDurationPicker({ id, band, minutes, disabled, onBandChange }: { id: string; band: DurationBand | ''; minutes: string; disabled: boolean; onBandChange: (band: DurationBand) => void }) {
  return <fieldset className="acute-duration-picker" disabled={disabled} aria-describedby={`${id}-help`}>
    <legend>Odhad výkonu (min)</legend>
    <div className="acute-duration-options">{durationOptions.map(option => <div className="acute-duration-choice" key={option.value}>
      <input className="acute-duration-input" id={`${id}-${option.value}`} name={id} type="radio" value={option.value} checked={band === option.value} required onChange={() => onBandChange(option.value)} aria-label={option.label} />
      <label className="acute-duration-option" htmlFor={`${id}-${option.value}`}><span>{option.label}</span><span className="acute-duration-check" aria-hidden>{band === option.value && <Check size={12} />}</span></label>
    </div>)}</div>
    <p className="acute-duration-value acute-field-help" aria-live="polite">{band ? `Odhad pro časovou osu: ${minutes} min` : 'Vyberte časový rozsah.'}</p>
    <p id={`${id}-help`} className="acute-field-help">Volba nad 60 min používá předpokládanou délku 120 min. Nejde o skutečně naměřený čas.</p>
  </fieldset>;
}

/** Removed controls do not erase or round the exact values in existing records. */
export function acuteIntakeInput(draft: Draft, request: AcuteRequest | null): AcuteRequestInput {
  if (!draft.urgency) throw new Error('Vyberte naléhavost stanovenou lékařem.');
  if (!acuteDurationBand(draft.estimatedDurationMinutes)) throw new Error(`Zadejte odhad výkonu v celých minutách od ${ACUTE_INPUT_LIMITS.durationMin} do ${ACUTE_INPUT_LIMITS.durationMax}.`);
  return {
    ...draft, procedureName: draft.procedureName.trim(), department: draft.department.trim(), description: draft.description.trim(),
    urgency: draft.urgency, estimatedDurationMinutes: Number(draft.estimatedDurationMinutes), proposedRoomId: draft.proposedRoomId || null,
    reference: request?.reference ?? '', clinicalDecisionAt: request?.clinicalDecisionAt ?? null,
    latestStartAt: request?.latestStartAt ?? null, proposedStartAt: draft.proposedRoomId ? request?.proposedStartAt ?? null : null,
  };
}

export function selectAcuteRoom(draft: Draft, room: OperatingRoom): Draft {
  return { ...draft, department: room.department.trim() || room.name.trim(), proposedRoomId: room.id };
}

export function AcuteRoomPicker({ id, rooms, value, department, disabled, required, onChange, onClear }: { id: string; rooms: OperatingRoom[]; value: string; department: string; disabled: boolean; required: boolean; onChange: (room: OperatingRoom) => void; onClear?: () => void }) {
  const selected = rooms.find(room => room.id === value);
  return <fieldset className="acute-room-picker acute-field-full" disabled={disabled} aria-describedby={`${id}-help`}>
    <legend>Operační obor · výběr sálu</legend>
    <div className="acute-room-options">{acuteRoomOptions(rooms).map(({ room, label }) => <div className="acute-room-choice" key={room.id}>
      <input className="acute-room-input" id={`${id}-${room.id}`} type="radio" name={id} value={room.id} checked={value === room.id} required={required} onChange={() => onChange(room)} aria-label={room.name} />
      <label className="acute-room-option" htmlFor={`${id}-${room.id}`} title={`${room.name}${room.department ? ` · ${room.department}` : ''}`}>
        <span className="acute-room-code">{label}</span><span className="acute-room-check" aria-hidden>{value === room.id && <Check size={12} />}</span>
      </label>
    </div>)}</div>
    <div className="acute-room-footer">
      <p id={`${id}-help`} className="acute-field-help" aria-live="polite">{selected ? `${selected.name}${department ? ` · ${department}` : ''}. Návrh sálu není rezervace.` : value ? 'Původně navržený sál není v aktuálním seznamu. Vyberte dostupný sál.' : !rooms.length ? 'V zařízení nejsou nastavené operační sály.' : department ? `Stávající obor: ${department}. Sál zatím není navržen.` : 'Vyberte sál. Operační obor se doplní automaticky; výběr není rezervace.'}</p>
      {onClear && value && <button type="button" className="acute-room-clear" onClick={onClear}>Zrušit návrh sálu</button>}
    </div>
  </fieldset>;
}

const urgencyOptions = [
  { value: 'emergent', subtitle: 'Neodkladný', Icon: Siren },
  { value: 'urgent', subtitle: 'Naléhavý', Icon: Timer },
  { value: 'expedited', subtitle: 'Odložitelný', Icon: CalendarClock },
] as const;

export function AcuteUrgencyPicker({ id, value, disabled, onChange }: { id: string; value: Draft['urgency']; disabled: boolean; onChange: (value: AcuteRequestInput['urgency']) => void }) {
  return <fieldset className="acute-urgency-picker acute-field-full" disabled={disabled} aria-describedby={`${id}-help`}>
    <legend>Klinická naléhavost</legend>
    <div className="acute-urgency-options">{urgencyOptions.map(({ value: urgency, subtitle, Icon }) => <div key={urgency} className="acute-urgency-choice" data-urgency={urgency}>
      <input className="acute-urgency-input" type="radio" id={`${id}-${urgency}`} name={id} value={urgency} checked={value === urgency} onChange={() => onChange(urgency)} required aria-label={`${URGENCY_LABELS[urgency]} ${subtitle}`} aria-describedby={`${id}-${urgency}-description`} />
      <label className="acute-urgency-option" htmlFor={`${id}-${urgency}`}>
        <span className="acute-urgency-selection" aria-hidden>{value === urgency && <Check size={14} />}</span>
        <span className="acute-urgency-option-icon" aria-hidden><Icon size={42} strokeWidth={1.6} /></span>
        <span className="acute-urgency-option-copy"><strong>{URGENCY_LABELS[urgency]}</strong><span className="acute-urgency-option-subtitle">{subtitle}</span><span id={`${id}-${urgency}-description`} className="acute-urgency-description acute-field-help">{URGENCY_DESCRIPTIONS[urgency]}</span></span>
      </label>
    </div>)}</div>
    <p id={`${id}-help`} className="acute-field-help">Výběr priority nenahrazuje klinické posouzení.</p>
  </fieldset>;
}

function initialDraft(request: AcuteRequest | null): Draft {
  return {
    procedureName: request?.procedureName ?? '', department: request?.department ?? '', description: request?.description ?? '',
    urgency: request?.urgency ?? '', estimatedDurationMinutes: request ? String(request.estimatedDurationMinutes) : '',
    proposedRoomId: request?.proposedRoomId ?? '',
  };
}

export function AcuteRequestFormDialog({ open, rooms, request, revision, controller, onClose, onSaved, onCloseAutoFocus }: { open: boolean; rooms: OperatingRoom[]; request: AcuteRequest | null; revision: number; controller: AcuteRequestsController; onClose: () => void; onSaved: () => void } & DialogFocusProps) {
  const uid = useId();
  const [draft, setDraft] = useState<Draft>(() => initialDraft(request));
  const [durationBand, setDurationBand] = useState<DurationBand | ''>(() => acuteDurationBand(request ? String(request.estimatedDurationMinutes) : ''));
  const durationMinutes = !request && durationBand === 'over-60' ? '120' : draft.estimatedDurationMinutes;
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(current => ({ ...current, [key]: value }));
  const id = (name: string) => `${uid}-${name}`;

  return <AcuteDialog open={open} title={request ? 'Upravit akutní požadavek' : 'Nový akutní požadavek'} description="Naléhavost určuje lékař. Pořadí je provozní rozhodnutí koordinátora." onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} intake>
    <form className="acute-form" onSubmit={async event => {
      event.preventDefault(); setError('');
      try {
        if (!draft.urgency) throw new Error('Vyberte naléhavost stanovenou lékařem.');
        if (!durationBand || acuteDurationBand(durationMinutes) !== durationBand) throw new Error('Vyberte odhad délky výkonu.');
        if ((!request || draft.proposedRoomId) && !rooms.some(room => room.id === draft.proposedRoomId)) throw new Error('Vyberte operační sál z aktuálního seznamu zařízení.');
        const input = acuteIntakeInput({ ...draft, estimatedDurationMinutes: durationMinutes }, request);
        await controller.execute(request ? { action: 'update', requestId: request.id, input, reason: reason.trim() } : { action: 'create', input }, revision);
        onSaved();
      } catch (caught) { setError(caught instanceof Error ? caught.message : 'Požadavek se nepodařilo uložit.'); }
    }}>
      <div className="acute-intake-workspace">
        <div className="acute-intake-main">
          <div className="acute-intake-topline">
            <div className="acute-field"><label htmlFor={id('procedure')}>Název chirurgického výkonu</label><input autoComplete="off" id={id('procedure')} value={draft.procedureName} onChange={event => set('procedureName', event.target.value)} required maxLength={ACUTE_INPUT_LIMITS.procedureName} /></div>
            <AcuteDurationPicker id={id('duration')} band={durationBand} minutes={durationMinutes} disabled={controller.busy || !controller.canManage} onBandChange={band => { setDurationBand(band); setDraft(current => ({ ...current, estimatedDurationMinutes: selectAcuteDuration(current.estimatedDurationMinutes, band) })); }} />
          </div>
          <p className="acute-field-help">Odhad pouze chirurgického výkonu, bez anestezie, odjezdu a úklidu.</p>
          <AcuteRoomPicker id={id('room')} rooms={rooms} value={draft.proposedRoomId ?? ''} department={draft.department} disabled={controller.busy || !controller.canManage} required={!request || Boolean(draft.proposedRoomId)} onChange={room => setDraft(current => selectAcuteRoom(current, room))} onClear={request ? () => setDraft(current => ({ ...current, proposedRoomId: '' })) : undefined} />
          <div className={`acute-intake-notes${request ? ' acute-intake-notes-edit' : ''}`}>
            <div className="acute-field"><label htmlFor={id('description')}>Popis / požadavky na koordinaci</label><textarea id={id('description')} value={draft.description} onChange={event => set('description', event.target.value)} rows={2} maxLength={ACUTE_INPUT_LIMITS.description} aria-describedby={id('privacy')} /></div>
            {request && <div className="acute-field"><label htmlFor={id('reason')}>Důvod změny</label><textarea id={id('reason')} rows={2} required maxLength={ACUTE_INPUT_LIMITS.reason} value={reason} onChange={event => setReason(event.target.value)} /></div>}
          </div>
          <p id={id('privacy')} className="acute-field-help">Neuvádějte jméno, rodné číslo ani jiné přímé identifikátory pacienta.</p>
        </div>
        <div className="acute-intake-side">
          <AcuteUrgencyPicker id={id('urgency')} value={draft.urgency} disabled={controller.busy || !controller.canManage} onChange={value => set('urgency', value)} />
          {draft.urgency === 'emergent' && <div className="acute-emergent-note"><ShieldAlert size={22} aria-hidden /><p>Emergentní výkon koordinujte i přímo dle místního urgentního postupu. Zápis do aplikace nenahrazuje telefonické či osobní předání a nesmí zdržet péči.</p></div>}
        </div>
      </div>
      {error && <p className="acute-form-error" role="alert">{error}</p>}
      {!controller.canManage && <p className="acute-form-error" role="alert">Úpravy nejsou nyní dostupné. Obnovte přehled nebo ověřte oprávnění.</p>}
      <div className="acute-dialog-actions"><button type="button" className="acute-button acute-button-quiet" onClick={onClose} disabled={controller.busy}>Zpět</button><button type="submit" className="acute-button acute-button-primary" disabled={controller.busy || !controller.canManage || (!request && !rooms.length)}>{controller.busy ? 'Ukládání…' : request ? 'Uložit změny' : 'Přijmout požadavek'}</button></div>
    </form>
  </AcuteDialog>;
}

export function AcuteReorderDialog({ requests, revision, controller, onClose, onSaved, onCloseAutoFocus }: { requests: AcuteRequest[]; revision: number; controller: AcuteRequestsController; onClose: () => void; onSaved: () => void } & DialogFocusProps) {
  const [ordered, setOrdered] = useState(requests.map(request => request.id));
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const reasonId = useId();
  const move = (index: number, direction: number) => setOrdered(current => {
    const next = [...current]; const target = index + direction;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]]; return next;
  });
  const changed = ordered.some((id, index) => id !== requests[index]?.id);
  return <AcuteDialog title="Upravit pořadí požadavků" description="Změna provozního pořadí nemění klinickou naléhavost. Původní a nové pořadí, autor, čas a důvod se zaznamenají." onClose={onClose} onCloseAutoFocus={onCloseAutoFocus}>
    <form className="acute-form" onSubmit={async event => { event.preventDefault(); setError(''); try { await controller.execute({ action: 'reorder', orderedIds: ordered, reason: reason.trim() }, revision); onSaved(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Pořadí se nepodařilo uložit.'); } }}>
      <ol className="acute-reorder-list" aria-label="Navržené pořadí">{ordered.map((id, index) => { const request = requests.find(item => item.id === id)!; return <li key={id} data-urgency={request.urgency}><span className="acute-rank-number">{index + 1}</span><div><strong>{request.procedureName}</strong><span className="acute-urgency">{URGENCY_LABELS[request.urgency]}</span></div><button type="button" className="acute-icon-button" aria-label={`Posunout ${request.procedureName} výše`} disabled={index === 0 || controller.busy} onClick={() => move(index, -1)}><ArrowUp size={20} aria-hidden /></button><button type="button" className="acute-icon-button" aria-label={`Posunout ${request.procedureName} níže`} disabled={index === ordered.length - 1 || controller.busy} onClick={() => move(index, 1)}><ArrowDown size={20} aria-hidden /></button></li>; })}</ol>
      <p className="acute-field-help" role="status">{changed ? 'Pořadí je změněno, zatím neuloženo.' : 'Pořadí zatím nebylo změněno.'}</p>
      <div className="acute-field"><label htmlFor={reasonId}>Důvod změny pořadí</label><textarea id={reasonId} rows={2} maxLength={ACUTE_INPUT_LIMITS.reason} required value={reason} onChange={event => setReason(event.target.value)} /></div>
      {error && <p className="acute-form-error" role="alert">{error}</p>}
      <div className="acute-dialog-actions"><button type="button" className="acute-button acute-button-quiet" onClick={onClose} disabled={controller.busy}>Zpět</button><button type="submit" className="acute-button acute-button-primary" disabled={!changed || !controller.canManage || controller.busy}>{controller.busy ? 'Ukládání…' : 'Uložit pořadí'}</button></div>
    </form>
  </AcuteDialog>;
}

/** Frozen clinical evidence is independent of the mutable coordination record. */
function AcuteCycleEvidence({ cycle, rooms }: { cycle: AcuteCycleLink; rooms: readonly OperatingRoom[] }) {
  const headingId = useId();
  const completed = completedAcuteCycle(cycle);
  const minutes = acuteCycleMinutes(cycle);
  const started = Number.isFinite(Date.parse(cycle.startedAt)) && Boolean(cycle.startEventId?.trim());
  const roomName = rooms.find(room => room.id === cycle.roomId)?.name ?? 'Původní sál není v aktuálním seznamu';
  const state = completed ? 'Provedeno' : started && cycle.endedAt === null ? 'Cyklus zahájen' : 'Dokončení cyklu není doloženo';
  return <section className="acute-detail-section" aria-labelledby={headingId} data-acute-cycle-evidence="" data-cycle-completed={completed || undefined}>
    <h3 id={headingId}>{completed ? <Check size={18} aria-hidden /> : <Clock3 size={18} aria-hidden />}{state} · skutečný operační cyklus</h3>
    <div className="acute-detail-status">
      <span className="acute-urgency">{URGENCY_LABELS[cycle.urgency]}</span>
      <span>Pořadí při zápisu {cycle.submissionPosition === null ? '—' : `#${cycle.submissionPosition}`}</span>
    </div>
    <dl className="acute-detail-metrics">
      <div className="timeline-popup-metric"><dt>Celý cyklus</dt><dd>{completed && minutes !== null ? `${minutes} min` : '—'}</dd><small>Od skutečného zahájení do dokončení cyklu včetně úklidu. Nejde o odhad chirurgického výkonu.</small></div>
      <div className="timeline-popup-metric"><dt>Skutečný sál</dt><dd>{roomName}</dd><small>Výkon: {cycle.procedureName}</small></div>
      <div className="timeline-popup-metric"><dt>Zahájení cyklu</dt><dd>{started ? <time dateTime={cycle.startedAt}>{formatDateTime(cycle.startedAt)}</time> : 'Není doloženo'}</dd><small>Skutečně zaznamenaný začátek</small></div>
      <div className="timeline-popup-metric"><dt>Dokončení cyklu</dt><dd>{completed ? <time dateTime={cycle.endedAt!}>{formatDateTime(cycle.endedAt)}</time> : 'Dosud nepotvrzeno'}</dd><small>{completed ? 'Potvrzeno událostí dokončení celého cyklu' : 'Samotné uzavření požadavku není dokončením cyklu'}</small></div>
    </dl>
  </section>;
}

/** Older immutable cycles remain readable even outside the bounded request snapshot. */
export function AcuteCycleDetailDialog({ cycle, rooms, onClose, onCloseAutoFocus }: { cycle: AcuteCycleLink; rooms: OperatingRoom[]; onClose: () => void } & DialogFocusProps) {
  return <AcuteDialog title={cycle.procedureName} description="Zaznamenaný akutní výkon · údaje ze skutečného operačního cyklu" onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} wide>
    <div className="acute-detail" data-urgency={cycle.urgency}>
      <AcuteCycleEvidence cycle={cycle} rooms={rooms} />
      <p className="acute-field-help">Původní požadavek není v načteném výběru pořadníku. Zobrazeny jsou uložené údaje skutečného cyklu; žádný nový požadavek se nevytváří.</p>
    </div>
  </AcuteDialog>;
}

export function AcuteDetailDialog({ request, cycle, rooms, controller, now, onClose, onEdit, onNotice, onCloseAutoFocus }: { request: AcuteRequest; cycle?: AcuteCycleLink; rooms: OperatingRoom[]; controller: AcuteRequestsController; now: number; onClose: () => void; onEdit: () => void; onNotice: (notice: string) => void } & DialogFocusProps) {
  const [error, setError] = useState('');
  const [terminalAction, setTerminalAction] = useState<{ action: 'cancel' | 'complete'; revision: number } | null>(null);
  const [reason, setReason] = useState('');
  const reasonId = useId();
  const active = request.status === 'pending' || request.status === 'acknowledged';
  const boundCycle = cycle?.requestId === request.id && cycle.hospitalId === request.hospitalId ? cycle : undefined;
  // Queue closure and its updatedAt never replace the actual time of arrival.
  const waitingEnd = boundCycle ? Date.parse(boundCycle.startedAt) : active ? now : Date.parse(request.updatedAt);
  const events = controller.events.filter(event => event.requestId === request.id).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const roomName = rooms.find(room => room.id === request.proposedRoomId)?.name;
  const late = request.latestStartAt ? Date.parse(request.latestStartAt) < now && active && !boundCycle : false;
  return <AcuteDialog title={boundCycle?.procedureName ?? request.procedureName} description={boundCycle ? 'Skutečný operační cyklus a samostatná evidence požadavku' : `${request.department}${request.reference ? ` · ${request.reference}` : ''}`} onClose={onClose} onCloseAutoFocus={onCloseAutoFocus} wide>
    <div className="acute-detail" data-urgency={boundCycle?.urgency ?? request.urgency}>
      {controller.error && <p className="acute-form-error" role="alert">Aktualizace údajů selhala. Zobrazený záznam nemusí být aktuální. {controller.error}</p>}
      {boundCycle && <AcuteCycleEvidence cycle={boundCycle} rooms={rooms} />}
      {boundCycle && <section className="acute-detail-section"><h3>Samostatný stav požadavku v pořadníku</h3><p className="acute-field-help">{request.procedureName}. Uzavření nebo zrušení požadavku je evidenční úkon a nemění uložený klinický cyklus.</p></section>}
      <div className="acute-detail-status"><span className="acute-urgency">{URGENCY_LABELS[request.urgency]}</span><span>{STATUS_LABELS[request.status]}</span>{request.queuePosition !== null && <span>Provozní pořadí {request.queuePosition}</span>}</div>
      {request.urgency === 'emergent' && active && !boundCycle && <div className="acute-emergent-note"><ShieldAlert size={22} aria-hidden /><p>Použijte také přímou urgentní komunikaci dle místního postupu. Evidence není potvrzením předání ani rezervací sálu.</p></div>}
      <dl className="acute-detail-metrics"><div className="timeline-popup-metric"><dt>{boundCycle ? 'Čekání do zahájení cyklu' : active ? 'Čekání od přijetí do aplikace' : 'Doba do uzavření požadavku'}</dt><dd>{wholeWaitingMinutes(request.receivedAt, waitingEnd) ?? '—'} min</dd><small>{formatDateTime(request.receivedAt)}</small></div><div className="timeline-popup-metric"><dt>Odhad chirurgického výkonu</dt><dd>{request.estimatedDurationMinutes} min</dd><small>Bez anestezie, odjezdu a úklidu</small></div><div className="timeline-popup-metric"><dt>Klinické rozhodnutí</dt><dd>{formatDateTime(request.clinicalDecisionAt)}</dd>{request.clinicalDecisionAt && active && <small>Od rozhodnutí: {wholeWaitingMinutes(request.clinicalDecisionAt, boundCycle ? waitingEnd : now) ?? '—'} min</small>}</div><div className="timeline-popup-metric" data-overdue={late}><dt>Nejzazší zahájení dle lékaře</dt><dd>{formatDateTime(request.latestStartAt)}</dd>{late && <small>Stanovený termín již uplynul</small>}</div></dl>
      {request.description && <section className="acute-detail-section"><h3>Popis / koordinace</h3><p className="acute-preserve-lines">{request.description}</p></section>}
      <section className="acute-detail-section"><h3>Návrh zařazení</h3><p>{request.proposedRoomId ? roomName ?? 'Přiřazený sál' : 'Bez přiděleného sálu'} · {request.proposedStartAt ? formatDateTime(request.proposedStartAt) : 'Čas zatím nenavržen'}</p><p className="acute-field-help">Návrh — nepotvrzeno. Nejde o rezervaci ani potvrzení dostupnosti sálu.</p>{request.acknowledgedAt && <p className="acute-field-help">Převzato koordinátorem {formatDateTime(request.acknowledgedAt)}. Převzetí nepotvrzuje zahájení výkonu.</p>}</section>
      {controller.canManage && active && !terminalAction && <div className="acute-detail-actions">
        {request.status === 'pending' && <button className="acute-button acute-button-primary" type="button" disabled={controller.busy} onClick={async () => { setError(''); try { await controller.execute({ action: 'acknowledge', requestId: request.id }); onNotice('Požadavek byl převzat koordinátorem.'); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Převzetí se nezdařilo.'); } }}><Check size={18} aria-hidden />Převzít koordinaci</button>}
        <button type="button" className="acute-button acute-button-quiet" onClick={onEdit} disabled={controller.busy}><Pencil size={17} aria-hidden />Upravit požadavek</button>
        <button type="button" className="acute-button acute-button-quiet" onClick={() => setTerminalAction({ action: 'complete', revision: controller.revision })} disabled={controller.busy}>Uzavřít požadavek</button>
        <button type="button" className="acute-button acute-button-danger" onClick={() => setTerminalAction({ action: 'cancel', revision: controller.revision })} disabled={controller.busy}>Zrušit požadavek</button>
      </div>}
      {terminalAction && <form className="acute-terminal-form" onSubmit={async event => { event.preventDefault(); setError(''); try { await controller.execute({ action: terminalAction.action, requestId: request.id, reason: reason.trim() }, terminalAction.revision); onNotice(terminalAction.action === 'cancel' ? 'Požadavek byl zrušen a změna zaznamenána.' : 'Požadavek byl uzavřen a změna zaznamenána.'); onClose(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Změna se nezdařila.'); } }}>
        <h3>{terminalAction.action === 'cancel' ? 'Zrušení požadavku' : 'Uzavření požadavku'}</h3><p className="acute-field-help">Tento krok neprovádí klinickou změnu sálu a nevytváří dokončený operační cyklus do statistik.</p><div className="acute-field"><label htmlFor={reasonId}>Důvod</label><textarea id={reasonId} value={reason} onChange={event => setReason(event.target.value)} required rows={2} maxLength={ACUTE_INPUT_LIMITS.reason} /></div><div className="acute-dialog-actions"><button type="button" className="acute-button acute-button-quiet" onClick={() => { setTerminalAction(null); setReason(''); }} disabled={controller.busy}>Zpět</button><button type="submit" className={`acute-button ${terminalAction.action === 'cancel' ? 'acute-button-danger' : 'acute-button-primary'}`} disabled={controller.busy || !controller.canManage}>{controller.busy ? 'Ukládání…' : 'Potvrdit'}</button></div>
      </form>}
      {error && <p className="acute-form-error" role="alert">{error}</p>}
      <section className="acute-detail-section"><h3><History size={18} aria-hidden />Historie požadavku</h3>{events.length ? <ol className="acute-event-list">{events.map(event => <li key={event.id}><Clock3 size={17} aria-hidden /><div><strong>{eventLabel(event.action)}{event.action === 'reorder' ? ` ${event.previousPosition ?? '—'} → ${event.newPosition ?? '—'}` : ''}</strong><p>{event.actorName}{event.reason ? ` · ${event.reason}` : ''}</p><time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time></div></li>)}</ol> : <p className="acute-field-help">Záznamy změn zatím nejsou dostupné.</p>}</section>
    </div>
  </AcuteDialog>;
}
