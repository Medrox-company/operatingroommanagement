'use client';

import React, { useId, useMemo, useState } from 'react';
import { AlertCircle, Bell, CalendarDays, Lock, Search, X } from 'lucide-react';
import type { OperatingRoom } from '../../types';
import { useHospital } from '../../contexts/HospitalContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkflowStatusesContext } from '../../contexts/WorkflowStatusesContext';
import { useNowMinuteMs } from '../../hooks/useSharedClock';
import { filterMobileRooms, mobileElapsed, mobileEndTime, mobileRoomPhase, type MobileRoomFilter } from '../../lib/mobile-room-display';
import { MobileHeader } from './MobileShell';
import './mobile-overview.css';

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
  const now = useNowMinuteMs();
  const searchId = useId();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MobileRoomFilter>('all');
  const visibleRooms = useMemo(() => filterMobileRooms(rooms, workflowStatuses, filter, search), [rooms, workflowStatuses, filter, search]);
  const readyCount = rooms.filter(room => mobileRoomPhase(room, workflowStatuses).ready).length;
  const activeCount = rooms.filter(room => mobileRoomPhase(room, workflowStatuses).active).length;
  const hasNotice = rooms.some(room => room.noticeMessage || room.isEmergency);
  const date = new Date(now);

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

      <div className="mro-search">
        <Search size={18} strokeWidth={1.7} aria-hidden />
        <label className="sr-only" htmlFor={searchId}>Najít sál</label>
        <input id={searchId} type="search" placeholder="Najít sál…" value={search} onChange={event => setSearch(event.target.value)} autoComplete="off" />
        {search && <button type="button" onClick={() => setSearch('')} aria-label="Vymazat hledání"><X size={16} /></button>}
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
              return (
                // Karta se barví podle aktuální fáze. Připravený sál zůstává
                // neutrální, aby v přehledu vynikly sály, kde se něco děje.
                <li
                  key={room.id}
                  className="mro-room m-unified-card"
                  data-emergency={room.isEmergency || undefined}
                  data-emphasized={!phase.ready ? 'true' : undefined}
                  style={{ '--room-phase-color': phase.color } as React.CSSProperties}
                >
                  <button type="button" className="mro-room-open" onClick={() => onSelectRoom(room.id)} aria-label={`Otevřít detail sálu ${room.name}, ${phase.title}`}>
                    <span className="mro-room-identity">
                      <strong className="m-unified-card-title">{room.name}</strong>
                      {/* Řádek fáze nese i obě akce — patička s „Detail" a tečkami
                          zmizela, karta je díky tomu o dvě řady nižší. */}
                      <span className="mro-phase-row">
                        <span className="mro-phase-label" style={{ color: `color-mix(in srgb, ${phase.color} 65%, var(--m-text) 35%)` }}>
                          <i className="mro-status-dot" style={{ background: phase.color }} aria-hidden />{phase.title}
                        </span>
                        <span className="mro-room-actions">
                          <span
                            role="button"
                            tabIndex={0}
                            aria-pressed={room.isEmergency}
                            aria-label={room.isEmergency ? `Zrušit stav nouze na sále ${room.name}` : `Vyhlásit stav nouze na sále ${room.name}`}
                            className="mro-room-action"
                            data-active={room.isEmergency || undefined}
                            data-tone="emergency"
                            onClick={event => { event.stopPropagation(); onEmergency(room.id); }}
                            onKeyDown={event => {
                              if (event.key !== 'Enter' && event.key !== ' ') return;
                              event.preventDefault();
                              event.stopPropagation();
                              onEmergency(room.id);
                            }}
                          >
                            <AlertCircle size={16} strokeWidth={2} aria-hidden />
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            aria-pressed={room.isLocked}
                            aria-label={room.isLocked ? `Odemknout sál ${room.name}` : `Uzamknout sál ${room.name}`}
                            className="mro-room-action"
                            data-active={room.isLocked || undefined}
                            data-tone="lock"
                            onClick={event => { event.stopPropagation(); onLock(room.id); }}
                            onKeyDown={event => {
                              if (event.key !== 'Enter' && event.key !== ' ') return;
                              event.preventDefault();
                              event.stopPropagation();
                              onLock(room.id);
                            }}
                          >
                            <Lock size={16} strokeWidth={2} aria-hidden />
                          </span>
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
          {visibleRooms.length === 0 && <div className="mro-empty"><strong>{rooms.length === 0 ? 'Zatím nejsou k dispozici žádné sály' : 'Žádný sál neodpovídá filtru'}</strong><p>{rooms.length === 0 ? 'Sály se zobrazí po přiřazení k vašemu zařízení.' : 'Zkuste jiný název nebo zobrazte všechny sály.'}</p>{rooms.length > 0 && <button type="button" onClick={() => { setSearch(''); setFilter('all'); }}>Zobrazit všechny</button>}</div>}
        </>
      )}
    </section>
  );
}
