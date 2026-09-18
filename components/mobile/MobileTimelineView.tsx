'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, LocateFixed } from 'lucide-react';
import type { OperatingRoom } from '../../types';
import type { CurrentRoomSpecialty } from '../../lib/room-specialty';
import { mobileRoomPhase } from '../../lib/mobile-room-display';
import { getMobileRoomSegments, getMobileTimelineWindow, mobileTimelinePageSize, type MobileTimelineStatus } from '../../lib/mobile-timeline';
import { MobileModuleHeader, MobilePillTabs } from './MobileShell';
import './mobile-timeline.css';

interface Props {
  rooms: OperatingRoom[];
  currentSpecialties: Map<string, CurrentRoomSpecialty[]>;
  activeStatuses: MobileTimelineStatus[];
  currentTime: Date;
  stats: { operations: number; cleaning: number; free: number; completed: number; emergencyCount: number };
  onSelectRoom: (room: OperatingRoom) => void;
}

const formatTime = (ms: number) => new Date(ms).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
const formatDate = (ms: number) => new Date(ms).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });

/** A viewport-sized schedule: navigate time and room pages, never the whole page. */
export default function MobileTimelineView({ rooms, currentSpecialties, activeStatuses, currentTime, stats, onSelectRoom }: Props) {
  const [scale, setScale] = useState<'2' | '4' | 'day'>('4');
  const [timeOffset, setTimeOffset] = useState(0);
  const [firstRoom, setFirstRoom] = useState(0);
  const [pageSize, setPageSize] = useState(1);
  const descriptionId = useId();
  const rowsRef = useRef<HTMLDivElement>(null);
  const nowMs = currentTime.getTime();
  // Keep a browsed window stable while the live clock continues ticking.
  const [browsingAnchor, setBrowsingAnchor] = useState<number | null>(null);
  const window = useMemo(() => getMobileTimelineWindow(
    browsingAnchor ?? nowMs, scale === 'day' ? 'day' : Number(scale) as 2 | 4, timeOffset,
  ), [browsingAnchor, nowMs, scale, timeOffset]);
  const span = window.endMs - window.startMs;
  const nowPct = (nowMs - window.startMs) / span * 100;
  const showNow = nowPct >= 0 && nowPct <= 100;
  const safeFirst = rooms.length === 0 ? 0 : Math.min(Math.floor(firstRoom / pageSize) * pageSize, Math.floor((rooms.length - 1) / pageSize) * pageSize);
  const pageRooms = rooms.slice(safeFirst, safeFirst + pageSize);
  const ticks = Array.from({ length: 5 }, (_, index) => ({ percent: index * 25, ms: window.startMs + span * index / 4 }));

  useEffect(() => {
    const rows = rowsRef.current;
    if (!rows) return;
    const measure = () => setPageSize(mobileTimelinePageSize(rows.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rows);
    return () => observer.disconnect();
  }, []);

  const moveTime = (direction: number) => {
    setBrowsingAnchor(anchor => anchor ?? nowMs);
    setTimeOffset(offset => offset + direction);
  };
  const goNow = () => { setTimeOffset(0); setBrowsingAnchor(null); };
  const rangeLabel = `${formatDate(window.startMs)}${new Date(window.startMs).toDateString() !== new Date(window.endMs).toDateString() ? ` – ${formatDate(window.endMs)}` : ''}`;

  return (
    <section className="mtl-screen md:hidden" lang="cs" aria-label="Rozpis operačních sálů">
      <MobileModuleHeader kicker="Operační blok" title="Rozpis" className="mtl-header"
        right={<time className="mtl-clock" dateTime={currentTime.toISOString()}><span>Živě</span>{formatTime(nowMs)}</time>} />
      <div className="mtl-summary" aria-label="Souhrn aktuálního provozu">
        <span><strong>{rooms.length}</strong>Sálů</span>
        <span><strong>{stats.operations + stats.cleaning}</strong>Aktivních</span>
        <span><strong>{stats.free}</strong>Připravených</span>
        <span data-alert={stats.emergencyCount > 0 || undefined}><strong>{stats.emergencyCount || stats.completed}</strong>{stats.emergencyCount > 0 ? 'Nouze' : 'Dokončeno'}</span>
      </div>
      <div className="mtl-controls">
        <MobilePillTabs tabs={[{ id: '2', label: '2 hodiny' }, { id: '4', label: '4 hodiny' }, { id: 'day', label: 'Celý den' }]}
          value={scale} onChange={value => { setScale(value); goNow(); }} className="mtl-scales" />
        <button type="button" className="mtl-now" onClick={goNow} aria-label="Zobrazit aktuální čas"><LocateFixed size={17} aria-hidden /><span>Teď</span></button>
      </div>
      <section className="m-unified-card mtl-axis" aria-label="Časová osa provozu">
        <header className="m-unified-card-header mtl-axis-heading">
          <div><h2 className="m-unified-card-title">Časová osa</h2><p aria-live="polite">{rangeLabel}</p></div>
          <div className="mtl-time-pager" role="group" aria-label="Posun časové osy">
            <button type="button" onClick={() => moveTime(-1)} aria-label="Předchozí časový úsek"><ChevronLeft size={19} aria-hidden /></button>
            <button type="button" onClick={() => moveTime(1)} aria-label="Následující časový úsek"><ChevronRight size={19} aria-hidden /></button>
          </div>
        </header>
        <div className="mtl-ruler" aria-label={`${formatTime(window.startMs)} až ${formatTime(window.endMs)}`}>
          {ticks.map((tick, index) => <time key={index} dateTime={new Date(tick.ms).toISOString()} style={{ left: `${tick.percent}%` }} data-edge={index === 0 ? 'start' : index === 4 ? 'end' : undefined}>{formatTime(tick.ms)}</time>)}
        </div>
        <div className="mtl-rows" ref={rowsRef} style={{ gridTemplateRows: `repeat(${Math.max(1, pageRooms.length)}, minmax(0, 1fr))` }}>
          {pageRooms.map(room => {
            const phase = mobileRoomPhase(room, activeStatuses);
            const segments = getMobileRoomSegments(room, activeStatuses, nowMs, window);
            const specialtyLabel = currentSpecialties.get(room.id)?.map(specialty => specialty.name).join(', ');
            return (
              <button type="button" key={room.id} className="mtl-row" onClick={() => onSelectRoom(room)}
                aria-label={`${room.name}, nyní ${phase.title}${specialtyLabel ? `, ${specialtyLabel}` : ''}. Otevřít detail sálu.`}
                aria-describedby={`${descriptionId}-${room.id}`}>
                <span className="mtl-row-heading">
                  <strong title={room.name}>{room.name}</strong>
                  <span className="mtl-phase" title={`Aktuální stav: ${phase.title}`}><i style={{ background: phase.color }} aria-hidden />{phase.title}</span>
                </span>
                <span className="mtl-track" aria-hidden>
                  {ticks.map((tick, index) => <span key={index} className="mtl-gridline" style={{ left: `${tick.percent}%` }} />)}
                  {segments.map(segment => <span key={segment.key} className="mtl-segment" data-kind={segment.kind}
                    title={`${segment.label} · ${formatTime(segment.startMs)}–${formatTime(segment.endMs)}`}
                    style={{ left: `${segment.leftPct}%`, width: `${segment.widthPct}%`, '--segment-color': segment.color } as React.CSSProperties} />)}
                  {segments.length === 0 && <span className="mtl-no-record">Bez záznamu v tomto úseku</span>}
                  {showNow && <span className="mtl-now-line" style={{ left: `${nowPct}%` }} />}
                </span>
                <span id={`${descriptionId}-${room.id}`} className="sr-only">{segments.map(segment => `${segment.label}: ${formatTime(segment.startMs)} až ${formatTime(segment.endMs)}`).join('. ') || 'Bez záznamu v tomto časovém úseku.'}</span>
              </button>
            );
          })}
          {rooms.length === 0 && <div className="mtl-empty" role="status"><strong>Žádné operační sály</strong><span>Pro toto zařízení zatím není co zobrazit.</span></div>}
        </div>
        <div className="mtl-legend" aria-label="Legenda časové osy"><span><i />Průběh</span><span><i data-kind="estimate" />Odhad</span><span><i data-kind="now" />Teď {formatTime(nowMs)}</span></div>
        <nav className="mtl-room-pager" aria-label="Stránkování sálů">
          <button type="button" disabled={safeFirst === 0} onClick={() => setFirstRoom(Math.max(0, safeFirst - pageSize))} aria-label="Předchozí sály"><ChevronLeft size={18} aria-hidden /></button>
          <p role="status">{rooms.length ? <><strong>{safeFirst + 1}–{Math.min(safeFirst + pageSize, rooms.length)}</strong> z {rooms.length} sálů</> : '0 sálů'}</p>
          <button type="button" disabled={safeFirst + pageSize >= rooms.length} onClick={() => setFirstRoom(safeFirst + pageSize)} aria-label="Další sály"><ChevronRight size={18} aria-hidden /></button>
        </nav>
      </section>
    </section>
  );
}
