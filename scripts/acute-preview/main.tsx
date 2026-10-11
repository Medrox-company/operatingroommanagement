import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, ChartColumn, CircleAlert, LayoutGrid, Settings, Siren, Workflow } from 'lucide-react';
import { AcuteRequestsView } from '../../components/AcuteRequestsModule';
import { ACUTE_INPUT_LIMITS, validateAcuteRequestInput, type AcuteRequest, type AcuteRequestEvent } from '../../lib/acute-requests';
import type { AcuteRequestCommand, AcuteRequestsController, AcuteRequestsSnapshot } from '../../hooks/useAcuteRequests';
import type { OperatingRoom } from '../../types';
import '../../app/globals.css';
import './preview.css';

// No API requests are permitted even if a future UI change accidentally introduces one.
window.fetch = async () => { throw new Error('Síťová volání jsou v izolovaném QA vypnuta.'); };
const NOW = Date.parse('2026-10-07T12:50:00Z');
const iso = (minute: number) => new Date(NOW + minute * 60_000).toISOString();
const HOSPITAL = '00000000-0000-4000-8000-000000000001';
const ACTOR = '00000000-0000-4000-8000-000000000002';
const IDS = ['00000000-0000-4000-8000-000000000046', '00000000-0000-4000-8000-000000000042', '00000000-0000-4000-8000-000000000044', '00000000-0000-4000-8000-000000000043'];
type Mode = 'default' | 'empty' | 'error' | 'readonly' | 'long';
const params = new URLSearchParams(location.search);
const MODES: Mode[] = ['default', 'empty', 'error', 'readonly', 'long'];
const mode: Mode = MODES.includes(params.get('mode') as Mode) ? params.get('mode') as Mode : 'default';
document.documentElement.classList.toggle('m-dark', params.get('theme') !== 'light');

const base = (id: string, queuePosition: number, procedureName: string, department: string, urgency: AcuteRequest['urgency'], wait: number, estimatedDurationMinutes: number): AcuteRequest => ({
  id, hospitalId: HOSPITAL, reference: `AK-${id.slice(-3)}`, queuePosition, procedureName, department, urgency,
  description: '', estimatedDurationMinutes, clinicalDecisionAt: null, latestStartAt: null,
  receivedAt: iso(-wait), proposedRoomId: null, proposedStartAt: null, status: 'pending', acknowledgedAt: null,
  acknowledgedBy: null, createdBy: ACTOR, updatedAt: iso(-wait), revision: 1,
});
const initialRequests = [
  base(IDS[0], 1, 'Revize', 'Chirurgie', 'emergent', 3, 60),
  { ...base(IDS[1], 2, 'Repozice', 'Traumatologie', 'urgent', 45, 45), status: 'acknowledged' as const, acknowledgedAt: iso(-38), acknowledgedBy: ACTOR, latestStartAt: iso(70), description: 'Čeká na dostupnost týmu. Sál a čas jsou pouze návrh.', updatedAt: iso(-18), revision: 3 },
  { ...base(IDS[2], 3, 'Revize', 'Chirurgie', 'urgent', 20, 90), status: 'acknowledged' as const, acknowledgedAt: iso(-10), acknowledgedBy: ACTOR },
  { ...base(IDS[3], 4, 'Ošetření', 'ORL', 'expedited', 30, 30), status: 'acknowledged' as const, acknowledgedAt: iso(-15), acknowledgedBy: ACTOR },
];
const initialEvent: AcuteRequestEvent = { id: 'qa-reference-reorder', requestId: IDS[1], action: 'reorder', actorId: ACTOR, actorName: 'Koordinátor (ukázka)', occurredAt: iso(-18), reason: 'Dostupnost týmu', previousPosition: 4, newPosition: 2, changes: {} };
// This isolated preview has no authenticated hospital source. Never imitate its
// room configuration with invented fixtures; verify room choices in the live app.
const rooms: OperatingRoom[] = [];

function seed(): AcuteRequestsSnapshot {
  const requests = mode === 'empty' || mode === 'error' ? [] : initialRequests.map(request => mode === 'long' ? {
    ...request, procedureName: `${request.procedureName} — dlouhý popis koordinovaného chirurgického výkonu včetně souvisejících provozních požadavků a mezioborové spolupráce`.slice(0, ACUTE_INPUT_LIMITS.procedureName),
    department: 'Dlouhý název operačního oboru pro ověření přístupnosti a zalamování textu'.slice(0, ACUTE_INPUT_LIMITS.department),
    reference: `AK-${request.id.slice(-3)} — interní reference pro lokální kontrolu dlouhých textů`.slice(0, ACUTE_INPUT_LIMITS.reference),
  } : { ...request });
  return { requests, events: requests.length ? [initialEvent] : [], revision: 3, canManage: mode !== 'readonly' && mode !== 'error', historyLimited: false };
}

function Preview() {
  const [snapshot, setSnapshot] = useState(seed);
  const [busy, setBusy] = useState(false);
  const controller = useMemo<AcuteRequestsController>(() => ({
    ...snapshot, scopeId: 'isolated-local-qa', loading: false, busy,
    error: mode === 'error' ? 'Ukázkový chybový stav: akutní požadavky se nepodařilo načíst.' : null,
    errorCode: mode === 'error' ? 'ACUTE_MIGRATION_REQUIRED' : null,
    refresh: async () => undefined,
    execute: async (command: AcuteRequestCommand, expectedRevision = snapshot.revision) => {
      if (!snapshot.canManage) throw new Error('Ukázka je pouze pro čtení.');
      if (busy) throw new Error('Ukázková změna se právě ukládá.');
      if (expectedRevision !== snapshot.revision) throw new Error('Ukázkový konflikt revizí: zavřete okno a otevřete aktuální přehled.');
      setBusy(true);
      try {
        const next: AcuteRequestsSnapshot = { ...snapshot, revision: snapshot.revision + 1, requests: snapshot.requests.map(request => ({ ...request })), events: [...snapshot.events] };
        const event = (request: AcuteRequest, action: AcuteRequestEvent['action'], reason = '', previousPosition = request.queuePosition, newPosition = request.queuePosition) => next.events.unshift({ id: crypto.randomUUID(), requestId: request.id, action, reason, actorId: ACTOR, actorName: 'Koordinátor (ukázka)', occurredAt: iso(0), previousPosition, newPosition, changes: {} });
        const requireActive = (id: string) => { const request = next.requests.find(item => item.id === id); if (!request || (request.status !== 'pending' && request.status !== 'acknowledged')) throw new Error('Ukázkový požadavek již není aktivní.'); return request; };
        if (command.action === 'create') {
          const input = validateAcuteRequestInput(command.input, NOW);
          const request: AcuteRequest = { ...input, id: crypto.randomUUID(), hospitalId: HOSPITAL, receivedAt: iso(0), status: 'pending', queuePosition: next.requests.filter(item => item.queuePosition !== null).length + 1, acknowledgedAt: null, acknowledgedBy: null, createdBy: ACTOR, updatedAt: iso(0), revision: 1 };
          next.requests.push(request); event(request, 'create');
        } else if (command.action === 'reorder') {
          if (!command.reason.trim()) throw new Error('Doplňte důvod změny.');
          const active = next.requests.filter(request => request.status === 'pending' || request.status === 'acknowledged');
          if (command.orderedIds.length !== active.length || new Set(command.orderedIds).size !== active.length || command.orderedIds.some(id => !active.some(request => request.id === id))) throw new Error('Neplatné pořadí ukázkových požadavků.');
          command.orderedIds.forEach((id, index) => { const request = requireActive(id); const previous = request.queuePosition; request.queuePosition = index + 1; if (previous !== request.queuePosition) event(request, 'reorder', command.reason, previous, request.queuePosition); });
        } else {
          const request = requireActive(command.requestId);
          if (command.action === 'update') { Object.assign(request, validateAcuteRequestInput(command.input, NOW)); event(request, 'update', command.reason); }
          if (command.action === 'acknowledge') { if (request.status !== 'pending') throw new Error('Požadavek už byl převzat.'); request.status = 'acknowledged'; request.acknowledgedAt = iso(0); request.acknowledgedBy = ACTOR; event(request, 'acknowledge'); }
          if (command.action === 'complete' || command.action === 'cancel') {
            if (!command.reason.trim()) throw new Error('Doplňte důvod.');
            const previous = request.queuePosition; request.status = command.action === 'complete' ? 'completed' : 'cancelled'; request.queuePosition = null; event(request, command.action, command.reason, previous, null);
            next.requests.filter(item => item.status === 'pending' || item.status === 'acknowledged').sort((a, b) => a.queuePosition! - b.queuePosition!).forEach((item, index) => { const old = item.queuePosition; item.queuePosition = index + 1; if (old !== item.queuePosition) event(item, 'reorder', 'Posun po uzavření požadavku (ukázka)', old, item.queuePosition); });
          }
          request.updatedAt = iso(0); request.revision += 1;
        }
        await Promise.resolve();
        setSnapshot(next);
        return next;
      } finally { setBusy(false); }
    },
  }), [snapshot, busy]);

  return <div className="qa-app app-module-background">
    <aside className="qa-rail" aria-label="Postranní navigace — pouze designová ukázka"><div>{[LayoutGrid, Workflow, CalendarDays, ChartColumn, CircleAlert, Settings, Siren].map((Icon, index) => <span className={`qa-rail-icon${index === 6 ? ' qa-rail-active' : ''}`} key={index} aria-hidden><Icon size={23} strokeWidth={1.5} /></span>)}</div><span className="qa-profile">QA</span></aside>
    <main className="mobile-module-container app-module-shell w-full px-4 sm:px-6 md:pl-32 md:pr-10 py-6 md:py-10 pb-mobile-nav md:pb-10 mobile-safe-top"><div className="app-module-content"><AcuteRequestsView rooms={rooms} controller={controller} now={NOW} /></div></main>
    <div className="qa-controls"><span>IZOLOVANÉ QA · BEZ SEZNAMU SÁLŮ</span><a href="http://localhost:3000/">Skutečná aplikace a nastavené sály ↗</a><label htmlFor="qa-mode">Stav</label><select id="qa-mode" value={mode} onChange={event => { const query = new URLSearchParams(location.search); query.set('mode', event.target.value); location.search = query.toString(); }}><option value="default">Referenční</option><option value="empty">Prázdný</option><option value="error">Chyba</option><option value="readonly">Pouze čtení</option><option value="long">Dlouhé texty</option></select></div>
  </div>;
}

createRoot(document.getElementById('root')!).render(<Preview />);
