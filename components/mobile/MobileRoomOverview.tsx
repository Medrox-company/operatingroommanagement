'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CalendarDays, ChevronRight, Clock3, Grip, LayoutGrid, Phone, Rows3, UsersRound, ShieldAlert, LogIn, Pause, MessageSquare } from 'lucide-react';
import type { OperatingRoom } from '../../types';
import { useHospital } from '../../contexts/HospitalContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkflowStatusesContext } from '../../contexts/WorkflowStatusesContext';
import { useRealtimeContext } from '../../contexts/RealtimeContext';
import { useNowMinuteMs } from '../../hooks/useSharedClock';
import { filterMobileRooms, mobileElapsed, mobileEndTime, mobileRoomPhase, readableInk, type MobileRoomFilter } from '../../lib/mobile-room-display';
import { useIsMobileDark } from '../../hooks/useIsMobileDark';
import { useAppDesign } from '../../hooks/useAppDesign';
import { MobileHeader, MobileDesignSelector } from './MobileShell';
import { mobileRoomPhaseVisual } from '../../lib/mobile-room-phase-visual';
import MobileRoomOrbit from './MobileRoomOrbit';
import MobileRoomQuickActions from './MobileRoomQuickActions';
import { acuteDashboardDescription, type AcuteDashboardRoomSummary } from '../../lib/acute-dashboard';
import AcuteDashboardBadge from '../room/AcuteDashboardBadge';
import './mobile-overview.css';
import './mobile-overview-orbit.css';

const BAND = {
  light: { alpha: 0.65, surface: '#FDFEFF' },
  dark: { alpha: 0.72, surface: '#131F49' },
};

/** Kolik musí stisk vydržet, než se otevře nabídka akcí. */
const LONG_PRESS_MS = 500;
/** Posun prstu, po kterém už jde o scrollování, ne o podržení. */
const LONG_PRESS_TOLERANCE_PX = 10;

interface MobileRoomOverviewProps {
  rooms: OperatingRoom[];
  roomsLoaded: boolean;
  viewControls?: React.ReactNode;
  onSelectRoom: (id: string) => void;
  onEmergency: (id: string) => void;
  onLock: (id: string) => void;
  onMessage?: (id: string) => void;
  onNavigate?: (view: string) => void;
  acuteByRoom?: ReadonlyMap<string, AcuteDashboardRoomSummary>;
}

export default function MobileRoomOverview({ rooms, roomsLoaded, viewControls, onSelectRoom, onEmergency, onLock, onMessage, onNavigate, acuteByRoom }: MobileRoomOverviewProps) {
  const { activeHospital } = useHospital();
  const { hasModuleAccess } = useAuth();
  const { workflowStatuses } = useWorkflowStatusesContext();
  const { connected } = useRealtimeContext();
  const now = useNowMinuteMs();
  const isDark = useIsMobileDark();
  const band = isDark ? BAND.dark : BAND.light;
  const { design } = useAppDesign();
  const cliniq = design === 'cliniq';
  // Hledání sálů se na telefonu neujalo — seznam je krátký a filtry stačí.
  const [layout, setLayout] = useState<'grid' | 'rows'>('grid');
  useEffect(() => {
    try { if (localStorage.getItem('or-room-card-layout') === 'rows') setLayout('rows'); } catch { /* Storage is optional. */ }
  }, []);
  const changeLayout = (value: 'grid' | 'rows') => {
    setLayout(value);
    try { localStorage.setItem('or-room-card-layout', value); } catch { /* Keep the visible choice. */ }
  };
  const [filter, setFilter] = useState<MobileRoomFilter>('all');
  const visibleRooms = useMemo(() => filterMobileRooms(rooms, workflowStatuses, filter, ''), [rooms, workflowStatuses, filter]);
  const statusCounts = workflowStatuses.map((status, index) => ({
    index,
    title: status.title || status.name || 'Status',
    color: mobileRoomPhaseVisual(status).color,
    count: rooms.filter(room => room.currentStepIndex === index).length,
  })).filter(status => status.count > 0);
  const unknownCount = rooms.filter(room => !Number.isInteger(room.currentStepIndex) || !workflowStatuses[room.currentStepIndex]).length;
  const readyCount = rooms.filter(room => mobileRoomPhase(room, workflowStatuses).ready).length;
  const activeCount = rooms.filter(room => mobileRoomPhase(room, workflowStatuses).active).length;
  const hasNotice = rooms.some(room => room.noticeMessage || room.isEmergency);
  const date = new Date(now);

  // Nabídka akcí po dlouhém stisku. Drží se jen id — objekt sálu se při
  // každém refreshi nahrazuje novým, takže by nabídka ukazovala stará data.
  const [quickActionsId, setQuickActionsId] = useState<string | null>(null);
  const quickActionsRoom = quickActionsId ? rooms.find(room => room.id === quickActionsId) ?? null : null;
  const pressRef = useRef<{ timer: number | null; x: number; y: number; opened: boolean }>({ timer: null, x: 0, y: 0, opened: false });

  const cancelPress = useCallback(() => {
    if (pressRef.current.timer === null) return;
    window.clearTimeout(pressRef.current.timer);
    pressRef.current.timer = null;
  }, []);

  useEffect(() => cancelPress, [cancelPress]);

  const openQuickActions = useCallback((roomId: string, suppressNextClick = true) => {
    pressRef.current.opened = suppressNextClick;
    // Krátká vibrace potvrdí, že se stisk počítá — jinak uživatel drží naslepo.
    navigator.vibrate?.(18);
    setQuickActionsId(roomId);
  }, []);

  const startPress = useCallback((roomId: string, event: React.PointerEvent) => {
    cancelPress();
    pressRef.current.opened = false;
    pressRef.current.x = event.clientX;
    pressRef.current.y = event.clientY;
    pressRef.current.timer = window.setTimeout(() => {
      pressRef.current.timer = null;
      openQuickActions(roomId);
    }, LONG_PRESS_MS);
  }, [cancelPress, openQuickActions]);

  const movePress = useCallback((event: React.PointerEvent) => {
    if (pressRef.current.timer === null) return;
    const dx = Math.abs(event.clientX - pressRef.current.x);
    const dy = Math.abs(event.clientY - pressRef.current.y);
    if (dx > LONG_PRESS_TOLERANCE_PX || dy > LONG_PRESS_TOLERANCE_PX) cancelPress();
  }, [cancelPress]);

  // Po dlouhém stisku přijde ještě klik — ten už nesmí otevřít detail sálu.
  const handleRoomClick = useCallback((roomId: string) => {
    if (pressRef.current.opened) {
      pressRef.current.opened = false;
      return;
    }
    onSelectRoom(roomId);
  }, [onSelectRoom]);

  return (
    <section className={`mobile-room-overview md:hidden${cliniq ? ' mobile-room-overview-orbit' : ''}`} lang="cs" aria-label="Přehled operačních sálů">
      {cliniq ? <>
        <header className="mro-orbit-header">
          <details className="mro-orbit-tools" onKeyDown={event => {
            if (event.key !== 'Escape') return;
            event.currentTarget.open = false;
            event.currentTarget.querySelector('summary')?.focus();
          }}>
            <summary aria-label="Nastavení přehledu sálů"><Grip aria-hidden="true" /></summary>
            <div className="mro-orbit-settings">
              <strong>Nastavení přehledu</strong>
              {viewControls}
              <MobileDesignSelector />
              <div className="mro-layout-toggle" role="group" aria-label="Rozložení sálů">
                <button type="button" aria-label="Dva sály vedle sebe" aria-pressed={layout === 'grid'} onClick={() => changeLayout('grid')}><LayoutGrid size={19} aria-hidden /><span>Dva sloupce</span></button>
                <button type="button" aria-label="Podélné boxy" aria-pressed={layout === 'rows'} onClick={() => changeLayout('rows')}><Rows3 size={19} aria-hidden /><span>Podélné karty</span></button>
              </div>
            </div>
          </details>
          <div className="mro-orbit-heading">
            <h1>Přehled sálů</h1>
            <p data-connected={connected}><span className="mro-orbit-live"><i aria-hidden="true" />{connected ? 'Živě' : 'Připojuji…'}</span><span aria-hidden="true">–</span><span>{roomsLoaded ? rooms.length : '—'} sálů</span></p>
          </div>
          {onNavigate && hasModuleAccess('alerts') ? <button type="button" className="mro-icon-button" onClick={() => onNavigate('alerts')} aria-label={hasNotice ? 'Upozornění – nové zprávy' : 'Upozornění'}>
            <Bell aria-hidden="true" />{hasNotice && <span className="mro-notice-dot" aria-hidden="true" />}
          </button> : <span className="mro-orbit-header-spacer" aria-hidden="true" />}
        </header>
        <div className="mro-orbit-statuses" aria-label="Souhrn sálů" aria-busy={!roomsLoaded}>
          {roomsLoaded ? <>
            {statusCounts.map(status => <span key={status.index} style={{ '--room-phase-color': status.color } as React.CSSProperties}><i aria-hidden="true" /><strong>{status.count}</strong> {status.title}</span>)}
            {unknownCount > 0 && <span style={{ '--room-phase-color': '#7890A8' } as React.CSSProperties}><i aria-hidden="true" /><strong>{unknownCount}</strong> Stav není k dispozici</span>}
          </> : <span>Načítám stavy…</span>}
        </div>
      </> : <><MobileHeader kicker="Operační blok" title="Přehled sálů"
        description={activeHospital?.hospital_short_name || activeHospital?.hospital_name || 'Operační sály'}
        right={(
          <>
            {/* Přepínač zobrazení sedí v jednom řádku se zvonkem — dvě kruhové
                ikony místo pruhu se záložkami pod hlavičkou. */}
            {viewControls}
            {onNavigate && hasModuleAccess('alerts') && (
              <button type="button" className="mro-icon-button" onClick={() => onNavigate('alerts')} aria-label={hasNotice ? 'Upozornění – nové zprávy' : 'Upozornění'}>
                <Bell size={20} strokeWidth={1.7} aria-hidden />
                {hasNotice && <span className="mro-notice-dot" aria-hidden="true" />}
              </button>
            )}
          </>
        )}
        secondary={<div className="mro-date">
          <CalendarDays size={18} strokeWidth={1.6} aria-hidden />
          <time dateTime={date.toISOString()}><span>{date.toLocaleDateString('cs-CZ', { weekday: 'long' })}</span>{date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })}</time>
        </div>}
      />

      <div className="mro-counts" aria-label="Souhrn sálů">
        <div className="mro-count-total"><strong>{roomsLoaded ? rooms.length : '—'}</strong><span>{cliniq ? 'operačních sálů' : 'sálů'}</span></div>
        <div><strong>{roomsLoaded ? activeCount : '—'}</strong><span>aktivních</span></div>
        <div><strong>{roomsLoaded ? readyCount : '—'}</strong><span>připravených</span></div>
      </div>
      </>}

      <div className="mro-filters" role="group" aria-label="Filtrovat sály">
        {([['all', 'Všechny'], ['active', cliniq ? 'Probíhá' : 'Aktivní'], ['ready', cliniq ? 'Připraveno' : 'Připravené']] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </div>

      {!roomsLoaded ? <p className="mro-empty" role="status">Načítám operační sály…</p> : (
        <>
          <p className="sr-only" role="status">Zobrazeno {visibleRooms.length} sálů odpovídajících filtru. Celkem {rooms.length} sálů.</p>
          {!cliniq && <div className="mro-list-heading"><span>Operační sály <small>{visibleRooms.length}</small></span>
          </div>
          }
          <ul className="mro-room-list" data-layout={cliniq ? layout : 'grid'}>
            {visibleRooms.map(room => {
              const phase = mobileRoomPhase(room, workflowStatuses);
              const configuredPhase = mobileRoomPhaseVisual(workflowStatuses[room.currentStepIndex]);
              const badges = [
                { active: !!room.patientCalledAt && !room.patientArrivedAt, kind: 'call', title: 'Pacient přivolán', Icon: Phone },
                { active: !!room.isEnhancedHygiene, kind: 'hygiene', title: 'Infekční režim', Icon: ShieldAlert },
                { active: !!room.patientArrivedAt, kind: 'arrival', title: 'Pacient na sále', Icon: LogIn },
                { active: !!room.isPaused, kind: 'pause', title: 'Pauza', Icon: Pause },
                { active: !!room.noticeMessage?.trim(), kind: 'message', title: 'Zpráva pro sál', Icon: MessageSquare },
              ].filter(badge => badge.active);
              const surfaceColor = room.isEmergency || room.isLocked ? phase.color
                : room.isEnhancedHygiene ? 'var(--color-warning, #FFB020)'
                : room.isPaused ? 'var(--color-info, #5B8DEF)'
                : phase.ready || !workflowStatuses[room.currentStepIndex] ? 'transparent'
                : configuredPhase.color;
              const assignedTeam = [room.staff?.doctor?.name, room.staff?.nurse?.name].filter(name => typeof name === 'string' && name.trim()).length;
              const elapsed = phase.active ? mobileElapsed(room.operationStartedAt || room.phaseStartedAt, now) : '—';
              const phaseInk = readableInk(phase.color, band.alpha, band.surface);
              const phaseVeil = phaseInk === '#FFFFFF' ? '#05070F' : '#FFFFFF';
              const acuteSummary = acuteByRoom?.get(room.id);
              return (
                // Phase color follows the hospital workflow, including its custom statuses.
                <li
                  key={room.id}
                  className="mro-room m-unified-card"
                  data-emergency={room.isEmergency || undefined}
                  data-locked={room.isLocked || undefined}
                  data-emphasized={!phase.ready ? 'true' : undefined}
                  style={{
                    '--room-phase-color': cliniq ? configuredPhase.color : phase.color,
                    '--room-surface-color': cliniq ? surfaceColor : undefined,
                    '--room-phase-ink': phaseInk,
                    '--room-phase-veil': phaseVeil,
                  } as React.CSSProperties}
                >
                  {/* Ťuknutí otevře detail, podržení nabídku akcí. Kontextové menu
                      systému se potlačuje, jinak by iOS nad kartou vyskočilo vlastní. */}
                  <button
                    type="button"
                    className="mro-room-open"
                    onClick={() => handleRoomClick(room.id)}
                    onPointerDown={event => startPress(room.id, event)}
                    onPointerMove={movePress}
                    onPointerUp={cancelPress}
                    onPointerCancel={cancelPress}
                    onPointerLeave={cancelPress}
                    onContextMenu={event => { event.preventDefault(); cancelPress(); openQuickActions(room.id, event.detail !== 0); }}
                    onKeyDown={event => {
                      if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
                      event.preventDefault();
                      openQuickActions(room.id, false);
                    }}
                    aria-label={`Sál ${room.name}, ${phase.title}. Uplynulo ${elapsed}, odhad konce ${phase.active ? mobileEndTime(room.estimatedEndTime) : 'není k dispozici'}.${cliniq ? ` Přiřazený tým ${assignedTeam} ze 2 rolí.` : ''} ${acuteDashboardDescription(acuteSummary)} Otevřít detail. Podržením nebo klávesou nabídky otevřít rychlé akce.`}
                  >
                    <span className="mro-room-identity">
                      {cliniq && <span className="mro-orbit-room-kicker"><span className={badges.length ? 'sr-only' : undefined}>Operační sál</span></span>}
                      <strong className="m-unified-card-title">{room.name}</strong>
                      {!cliniq && <span className="mro-phase-row">
                        <span className="mro-phase-label">
                          <i className="mro-status-dot" style={{ background: phase.color }} aria-hidden />
                          <span className="mro-phase-name">{phase.title}</span>
                        </span>
                      </span>}
                      {room.isEnhancedHygiene && <small>Hygienický režim</small>}
                      {!cliniq && room.patientCalledAt && !room.patientArrivedAt && <small>Pacient přivolán</small>}
                      {room.patientArrivedAt && <small>Pacient na sále</small>}
                      <AcuteDashboardBadge summary={acuteSummary} mobile />
                    </span>
                    {cliniq ? <>
                      <MobileRoomOrbit room={room} statuses={workflowStatuses} title={phase.title} />
                      <span className="mro-orbit-card-footer">
                        <span className="mro-orbit-end"><Clock3 aria-hidden="true" /><span><span>Odhad konce</span><strong>{phase.active ? mobileEndTime(room.estimatedEndTime) : '—'}</strong><small>Uplynulo {elapsed}</small></span></span>
                        <span className="mro-orbit-team" aria-label={`Přiřazený tým ${assignedTeam} ze 2 rolí`}><UsersRound aria-hidden="true" /><span>Tým<strong>{assignedTeam === 2 ? 'kompletní' : `${assignedTeam} / 2`}</strong></span></span>
                      </span>
                    </> : <span className="mro-room-time">
                      <span className="mro-room-metric"><span>{cliniq ? 'Od začátku' : 'Uplynulo'}</span><strong aria-label={`Uplynulý čas ${elapsed}`}>{elapsed}</strong></span>
                      <span className="mro-room-metric"><span>Odhad konce</span><strong>{phase.active ? mobileEndTime(room.estimatedEndTime) : '—'}</strong></span>
                    </span>}
                    {cliniq && badges.length > 0 && <span className="mro-status-badges">{badges.map(({ kind, title, Icon }) => <span key={kind} className="mro-call-badge" data-kind={kind} title={title}><Icon aria-hidden="true" /><span className="sr-only">{title}</span></span>)}</span>}
                    {cliniq && <span className="mro-room-chevron" aria-hidden><ChevronRight size={18} /></span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {visibleRooms.length === 0 && <div className="mro-empty"><strong>{rooms.length === 0 ? 'Zatím nejsou k dispozici žádné sály' : 'Žádný sál neodpovídá filtru'}</strong><p>{rooms.length === 0 ? 'Sály se zobrazí po přiřazení k vašemu zařízení.' : 'Zkuste jiný filtr nebo zobrazte všechny sály.'}</p>{rooms.length > 0 && <button type="button" onClick={() => setFilter('all')}>Zobrazit všechny</button>}</div>}
        </>
      )}

      {quickActionsRoom && (
        <MobileRoomQuickActions
          room={quickActionsRoom}
          phaseTitle={mobileRoomPhase(quickActionsRoom, workflowStatuses).title}
          phaseColor={mobileRoomPhase(quickActionsRoom, workflowStatuses).color}
          onEmergency={() => onEmergency(quickActionsRoom.id)}
          onLock={() => onLock(quickActionsRoom.id)}
          onMessage={onMessage ? () => onMessage(quickActionsRoom.id) : undefined}
          onOpenDetail={() => onSelectRoom(quickActionsRoom.id)}
          onClose={() => setQuickActionsId(null)}
        />
      )}
    </section>
  );
}
