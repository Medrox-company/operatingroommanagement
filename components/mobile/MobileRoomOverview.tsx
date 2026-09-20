'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CalendarDays } from 'lucide-react';
import type { OperatingRoom } from '../../types';
import { useHospital } from '../../contexts/HospitalContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkflowStatusesContext } from '../../contexts/WorkflowStatusesContext';
import { useNowMinuteMs } from '../../hooks/useSharedClock';
import { filterMobileRooms, mobileElapsed, mobileEndTime, mobileRoomPhase, readableInk, type MobileRoomFilter } from '../../lib/mobile-room-display';
import { useIsMobileDark } from '../../hooks/useIsMobileDark';
import { MobileHeader } from './MobileShell';
import MobileRoomQuickActions from './MobileRoomQuickActions';
import './mobile-overview.css';

/* Krytí barevného pruhu a plocha karty pod ním. Musí odpovídat --mro-band-alpha
   v mobile-overview.css — z těchto hodnot se počítá, jak pruh doopravdy vypadá,
   a podle toho se volí barva písma. */
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
  onNavigate?: (view: string) => void;
}

export default function MobileRoomOverview({ rooms, roomsLoaded, viewControls, onSelectRoom, onEmergency, onLock, onNavigate }: MobileRoomOverviewProps) {
  const { activeHospital } = useHospital();
  const { hasModuleAccess } = useAuth();
  const { workflowStatuses } = useWorkflowStatusesContext();
  const isDark = useIsMobileDark();
  const band = isDark ? BAND.dark : BAND.light;
  const now = useNowMinuteMs();
  // Hledání sálů se na telefonu neujalo — seznam je krátký a filtry stačí.
  const [filter, setFilter] = useState<MobileRoomFilter>('all');
  const visibleRooms = useMemo(() => filterMobileRooms(rooms, workflowStatuses, filter, ''), [rooms, workflowStatuses, filter]);
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

  const openQuickActions = useCallback((roomId: string) => {
    pressRef.current.opened = true;
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
    <section className="mobile-room-overview md:hidden" lang="cs" aria-label="Přehled operačních sálů">
      <MobileHeader kicker="Operační blok" title="Přehled sálů"
        description={activeHospital?.hospital_short_name || activeHospital?.hospital_name || 'Operační sály'}
        right={(
          <>
            {/* Přepínač zobrazení sedí v jednom řádku se zvonkem — dvě kruhové
                ikony místo pruhu se záložkami pod hlavičkou. */}
            {viewControls}
            {onNavigate && hasModuleAccess('alerts') && (
              <button type="button" className="mro-icon-button" onClick={() => onNavigate('alerts')} aria-label={hasNotice ? 'Upozornění – nové zprávy' : 'Upozornění'}>
                <Bell size={20} strokeWidth={1.7} aria-hidden />
                {hasNotice && <span className="mro-notice-dot" />}
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
        <div><strong>{roomsLoaded ? rooms.length : '—'}</strong><span>sálů</span></div>
        <div><strong>{roomsLoaded ? activeCount : '—'}</strong><span>aktivních</span></div>
        <div><strong>{roomsLoaded ? readyCount : '—'}</strong><span>připravených</span></div>
      </div>

      <div className="mro-filters" role="group" aria-label="Filtrovat sály">
        {([['all', 'Všechny'], ['active', 'Aktivní'], ['ready', 'Připravené']] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </div>

      {!roomsLoaded ? <p className="mro-empty" role="status">Načítám operační sály…</p> : (
        <>
          <p className="sr-only" role="status">Zobrazeno {visibleRooms.length} z {rooms.length} sálů.</p>
          <div className="mro-list-heading" aria-hidden><span>Operační sály</span><span>{visibleRooms.length}</span></div>
          <ul className="mro-room-list">
            {visibleRooms.map(room => {
              const phase = mobileRoomPhase(room, workflowStatuses);
              const elapsed = phase.active ? mobileElapsed(room.operationStartedAt || room.phaseStartedAt, now) : '—';
              // Závoj = opak inkoustu. Přechod se tak odklání od barvy písma,
              // takže stínování kontrast nesnižuje, ale zvyšuje.
              const phaseInk = readableInk(phase.color, band.alpha, band.surface);
              const phaseVeil = phaseInk === '#FFFFFF' ? '#05070F' : '#FFFFFF';
              return (
                // Barvu aktuálního statusu nese patka karty — plný barevný pruh
                // je v mřížce čitelný na první pohled i přes celý displej.
                // Tělo karty se navíc jemně tónuje, ale jen když se na sále něco
                // děje; připravený sál zůstává klidný a barvu má jen v pruhu.
                <li
                  key={room.id}
                  className="mro-room m-unified-card"
                  data-emergency={room.isEmergency || undefined}
                  data-emphasized={!phase.ready ? 'true' : undefined}
                  style={{
                    '--room-phase-color': phase.color,
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
                    onContextMenu={event => { event.preventDefault(); cancelPress(); openQuickActions(room.id); }}
                    aria-label={`Sál ${room.name}, ${phase.title}. Ťuknutím otevřete detail, podržením nabídku akcí.`}
                  >
                    <span className="mro-room-identity">
                      <strong className="m-unified-card-title">{room.name}</strong>
                      <span className="mro-phase-row">
                        <span className="mro-phase-label" style={{ color: `color-mix(in srgb, ${phase.color} 65%, var(--m-text) 35%)` }}>
                          <i className="mro-status-dot" style={{ background: phase.color }} aria-hidden />
                          <span className="mro-phase-name">{phase.title}</span>
                        </span>
                      </span>
                      {room.isEnhancedHygiene && <small>Hygienický režim</small>}
                      {room.patientCalledAt && !room.patientArrivedAt && <small>Pacient přivolán</small>}
                      {room.patientArrivedAt && <small>Pacient na sále</small>}
                    </span>
                    <span className="mro-room-time">
                      <span className="mro-room-metric"><span>Uplynulo</span><strong aria-label={`Uplynulý čas ${elapsed}`}>{elapsed}</strong></span>
                      <span className="mro-room-metric"><span>Odhad konce</span><strong>{phase.active ? mobileEndTime(room.estimatedEndTime) : '—'}</strong></span>
                    </span>
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
          onOpenDetail={() => onSelectRoom(quickActionsRoom.id)}
          onClose={() => setQuickActionsId(null)}
        />
      )}
    </section>
  );
}
