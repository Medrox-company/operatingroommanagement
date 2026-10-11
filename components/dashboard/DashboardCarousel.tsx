'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Clock3, LockKeyhole, Pause, Users } from 'lucide-react';
import type { OperatingRoom } from '../../types';
import type { CurrentRoomSpecialty } from '../../lib/room-specialty';
import type { AcuteDashboardRoomSummary } from '../../lib/acute-dashboard';
import { carouselCardPlacement, carouselContentFits, carouselRoomPresentation, carouselSelection, carouselTurnToIndex, carouselWrappedIndex } from '../../lib/dashboard-carousel';
import { useWorkflowStatusesContext } from '../../contexts/WorkflowStatusesContext';
import { useOperationalDayWindow } from '../../hooks/useOperationalDayWindow';
import { useNowMinuteMs } from '../../hooks/useSharedClock';
import AcuteDashboardBadge from '../room/AcuteDashboardBadge';
import styles from './dashboard-carousel.module.css';

interface DashboardCarouselProps {
  rooms: OperatingRoom[];
  specialtiesByRoom: ReadonlyMap<string, CurrentRoomSpecialty[]>;
  acuteByRoom?: ReadonlyMap<string, AcuteDashboardRoomSummary>;
  onSelectRoom: (roomId: string) => void;
  onEmergency: (roomId: string) => void;
  onLock: (roomId: string) => void;
}

function StatusRing({ model }: { model: ReturnType<typeof carouselRoomPresentation> }) {
  const gradientId = useId();
  const circumference = 2 * Math.PI * 62;
  const Icon = model.state === 'emergency' ? AlertTriangle : model.state === 'locked' ? LockKeyhole : model.state === 'paused' ? Pause : null;
  return (
    <span className={styles.ring}>
      <svg viewBox="0 0 160 160" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="20" y1="10" x2="130" y2="150" gradientUnits="userSpaceOnUse">
            <stop stopColor={model.color} />
            <stop offset=".48" stopColor={model.color} stopOpacity=".8" />
            <stop offset="1" stopColor={model.color} stopOpacity=".35" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r="72" className={styles.ringOutline} />
        <circle cx="80" cy="80" r="62" className={styles.ringTrack} />
        <circle cx="80" cy="80" r="62" stroke={model.color} strokeWidth="10" opacity=".16" className={styles.ringHalo} />
        <circle cx="80" cy="80" r="62" stroke={`url(#${gradientId})`} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - model.progress)} transform="rotate(-90 80 80)" />
      </svg>
      <span className={styles.ringCenter}>
        {Icon ? <Icon size={36} strokeWidth={1.4} aria-hidden="true" /> : <span className={styles.count}>{model.count}</span>}
        <span className={styles.ringCaption}>{Icon ? model.title : 'Dokončené cykly'}</span>
      </span>
    </span>
  );
}

export default function DashboardCarousel({ rooms, specialtiesByRoom, acuteByRoom, onSelectRoom, onEmergency, onLock }: DashboardCarouselProps) {
  const { workflowStatuses } = useWorkflowStatusesContext();
  const day = useOperationalDayWindow();
  const now = useNowMinuteMs();
  const [selection, setSelection] = useState({ id: rooms[0]?.id ?? null, turn: 0 });
  const [rotating, setRotating] = useState(false);
  const [layout, setLayout] = useState({ overflow: false, height: 640 });
  const selectionRef = useRef(selection);
  const previousIds = useRef(rooms.map(room => room.id));
  const selectedIndex = carouselSelection(rooms, selection.id);
  const selectionStale = selection.id !== (rooms[selectedIndex]?.id ?? null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const chooserRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<{ pointerId: number; x: number; y: number; moved: boolean; canRotate: boolean } | null>(null);
  const suppressClick = useRef(false);
  const viewportId = useId();
  const models = useMemo(() => rooms.map(room => carouselRoomPresentation(room, workflowStatuses, day, now)), [rooms, workflowStatuses, day, now]);
  const roomIds = JSON.stringify(rooms.map(room => room.id));

  // Real room identity survives refresh/reordering; placement matches the Settings coverflow.
  useEffect(() => {
    const ids = JSON.parse(roomIds) as string[];
    const current = selectionRef.current;
    const index = Math.max(0, ids.indexOf(current.id ?? ''));
    const next = { id: ids[index] ?? null, turn: carouselTurnToIndex(current.turn, index, ids.length) };
    if (next.id !== current.id || next.turn !== current.turn) {
      // A previously side-positioned fallback must settle before its clinical buttons become usable.
      if (next.id !== current.id) setRotating(Boolean(next.id && previousIds.current.includes(next.id)
        && typeof window !== 'undefined' && window.matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)').matches));
      selectionRef.current = next;
      setSelection(next);
    }
    previousIds.current = ids;
    gestureRef.current = null;
  }, [roomIds]);

  useEffect(() => {
    const frame = frameRef.current;
    const chooser = chooserRef.current;
    const root = viewportRef.current?.closest<HTMLElement>('.dashboard-carousel-module');
    const heading = root?.querySelector<HTMLElement>('.dashboard-page-header');
    if (!frame || !chooser || !root || !heading) return;
    const measure = () => {
      const headingBottom = heading.getBoundingClientRect().bottom - root.getBoundingClientRect().top + root.scrollTop;
      const overflow = !carouselContentFits(root.clientHeight, frame.offsetHeight, headingBottom, chooser.offsetHeight);
      const height = Math.max(640, frame.offsetHeight + 2 * chooser.offsetHeight + 96);
      setLayout(current => current.overflow === overflow && current.height === height ? current : { overflow, height });
    };
    const observer = new ResizeObserver(measure);
    [frame, chooser, root, heading].forEach(element => observer.observe(element));
    measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const motion = window.matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)');
    const stopHiddenMotion = () => { if (!motion.matches) setRotating(false); };
    motion.addEventListener('change', stopHiddenMotion);
    return () => motion.removeEventListener('change', stopHiddenMotion);
  }, []);

  const select = useCallback((index: number, step?: -1 | 1) => {
    if (!rooms.length) return;
    const current = selectionRef.current;
    const currentIndex = carouselSelection(rooms, current.id);
    const currentTurn = carouselTurnToIndex(current.turn, currentIndex, rooms.length);
    const nextTurn = rooms.length <= 1 ? 0 : step ? currentTurn + step : carouselTurnToIndex(currentTurn, index, rooms.length);
    if (nextTurn === currentTurn && current.id === rooms[currentIndex]?.id) return;
    const room = rooms[carouselWrappedIndex(nextTurn, rooms.length)];
    // Never leave keyboard focus in a card that is about to become inert.
    if (viewportRef.current?.contains(document.activeElement) && document.activeElement?.closest('[data-room-id]')) {
      viewportRef.current.focus({ preventScroll: true });
    }
    const next = { id: room.id, turn: nextTurn };
    setRotating(typeof window !== 'undefined' && window.matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)').matches);
    selectionRef.current = next;
    setSelection(next);
  }, [rooms]);

  // Capture only intentional horizontal trackpad gestures. Vertical wheel keeps normal page scrolling.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || rooms.length <= 1) return;
    let distance = 0;
    let lastMove = -Infinity;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      if (performance.now() - lastMove < 420) return;
      distance += event.deltaX * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientWidth : 1);
      if (Math.abs(distance) < 45) return;
      select(0, distance > 0 ? 1 : -1);
      distance = 0;
      lastMove = performance.now();
    };
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [rooms.length, select]);

  const finishGesture = (event: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancelled && gesture.canRotate && gesture.moved && Math.abs(event.clientX - gesture.x) >= 45) select(0, event.clientX < gesture.x ? 1 : -1);
  };

  return (
    <section className={styles.carousel} data-overflow={layout.overflow}
      style={{ '--carousel-content-height': `${layout.height}px` } as React.CSSProperties}
      role="region" aria-roledescription="carousel" aria-label="Přehled operačních sálů">
      <div className={styles.viewport} ref={viewportRef} id={viewportId} tabIndex={0}
        aria-label="Kruhový výběr sálů. Šipky vlevo a vpravo otáčejí dokola. Home první sál, End poslední sál."
        onPointerDown={event => {
          suppressClick.current = false;
          if (event.button !== 0 || !event.isPrimary || rooms.length <= 1) return;
          const button = (event.target as Element).closest('button');
          // A drag on a clinical button cancels its click; it never changes clinical state.
          const canRotate = !button || button.hasAttribute('data-orbit-select') || button.hasAttribute('data-orbit-swipe');
          gestureRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false, canRotate };
        }}
        onPointerMove={event => {
          const gesture = gestureRef.current;
          if (!gesture || gesture.pointerId !== event.pointerId) return;
          const dx = Math.abs(event.clientX - gesture.x);
          const dy = Math.abs(event.clientY - gesture.y);
          if (!gesture.moved && dy > 12 && dy > dx) { suppressClick.current = true; gestureRef.current = null; return; }
          if (dx < 12 && !gesture.moved) return;
          gesture.moved = true;
          suppressClick.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          event.preventDefault();
        }}
        onPointerUp={event => finishGesture(event)} onPointerCancel={event => finishGesture(event, true)}
        onLostPointerCapture={() => { gestureRef.current = null; }}
        onClickCapture={event => {
          if (suppressClick.current && event.detail > 0) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; }
        }}
        onKeyDown={event => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault(); select(0, event.key === 'ArrowRight' ? 1 : -1);
          } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault(); select(event.key === 'Home' ? 0 : rooms.length - 1);
          }
        }}>
        <div className={styles.orbit} ref={frameRef}>
        {rooms.map((room, index) => {
          const model = models[index];
          const specialties = specialtiesByRoom.get(room.id) ?? [];
          const fullDay = specialties.find(specialty => specialty.dayPart === 'FULL_DAY');
          const am = fullDay ?? specialties.find(specialty => specialty.dayPart === 'AM');
          const pm = fullDay ?? specialties.find(specialty => specialty.dayPart === 'PM');
          const selected = index === selectedIndex;
          const placement = carouselCardPlacement(index, selectedIndex, rooms.length);
          return (
            <article key={room.id} className={styles.card} data-room-id={room.id} data-selected={selected}
              data-neighbor={placement.distance === -1 ? 'left' : placement.distance === 1 ? 'right' : undefined} aria-hidden={!selected}
              role="group" aria-roledescription="karta" aria-label={`${index + 1} z ${rooms.length}: ${room.name}`}
              style={{ '--carousel-accent': model.color, '--carousel-distance': placement.distance, '--carousel-depth': placement.depth,
                '--carousel-scale': placement.scale, opacity: placement.opacity, filter: `brightness(${placement.brightness})`,
                zIndex: placement.zIndex, pointerEvents: placement.visible ? 'auto' : 'none' } as React.CSSProperties}
              onTransitionEnd={event => {
                if (selected && event.target === event.currentTarget && event.propertyName === 'transform') setRotating(false);
              }}>
              <div className={styles.cardContent} inert={!selected || rotating || selectionStale}>
              <button type="button" className={styles.main} data-orbit-swipe="" disabled={!selected || rotating || selectionStale} onClick={() => onSelectRoom(room.id)}
                aria-label={`Otevřít detail: ${room.name}. ${model.title}. Dokončené cykly: ${model.count}. Fáze ${model.phasePosition}.`}>
                <span className={styles.phase}><i style={{ backgroundColor: model.color }} aria-hidden="true" />{model.title}</span>
                <span className={styles.visual}><StatusRing model={model} /></span>
                <span className={styles.identity}><span className={styles.name}>{room.name}</span><span className={styles.department}>{room.department}</span></span>
                <span className={styles.timings}>
                  <span><span className={styles.metricLabel}><Clock3 size={13} aria-hidden="true" />Doba fáze</span><span className={styles.metricValue}>{model.phaseMinutes ?? '—'}{model.phaseMinutes !== null && <small> min</small>}</span></span>
                  <span><span className={styles.metricLabel}>Od začátku cyklu</span><span className={styles.metricValue}>{model.cycleMinutes ?? '—'}{model.cycleMinutes !== null && <small> min</small>}</span></span>
                </span>
                <span className={styles.specialties}>
                  <span><small>DOPOL.</small><span>{am?.name || 'Bez oboru'}</span></span>
                  <span><small>ODPOL.</small><span>{pm?.name || 'Bez oboru'}</span></span>
                </span>
                {room.isSeptic && <span className={styles.notice}>Septický režim</span>}
                {room.noticeMessage && <span className={styles.notice}>{room.noticeMessage}</span>}
                <AcuteDashboardBadge summary={acuteByRoom?.get(room.id)} />
              </button>
              <div className={styles.footer}>
                <button type="button" className={styles.staff} disabled={!selected || rotating || selectionStale} onClick={() => onSelectRoom(room.id)}
                  aria-label={`Personál a detail sálu ${room.name}. Lékař: ${room.staff.doctor?.name || 'nepřiřazen'}. Sestra: ${room.staff.nurse?.name || 'nepřiřazena'}.`}>
                  <Users size={18} strokeWidth={1.5} aria-hidden="true" /><span>Personál</span>
                </button>
                <button type="button" className={`${styles.action} ${styles.emergency}`} disabled={!selected || rotating || selectionStale} aria-pressed={Boolean(room.isEmergency)}
                  aria-label={`${room.isEmergency ? 'Ukončit' : 'Vyhlásit'} nouzový stav: ${room.name}`} title="Nouzový stav" onClick={() => onEmergency(room.id)}><AlertTriangle size={18} strokeWidth={1.5} aria-hidden="true" /></button>
                <button type="button" className={`${styles.action} ${styles.lock}`} disabled={!selected || rotating || selectionStale} aria-pressed={Boolean(room.isLocked)}
                  aria-label={`${room.isLocked ? 'Odemknout' : 'Uzamknout'} sál: ${room.name}`} title={room.isLocked ? 'Odemknout sál' : 'Uzamknout sál'} onClick={() => onLock(room.id)}><LockKeyhole size={18} strokeWidth={1.5} aria-hidden="true" /></button>
                <button type="button" className={styles.detail} disabled={!selected || rotating || selectionStale} onClick={() => onSelectRoom(room.id)} aria-label={`Otevřít detail sálu ${room.name}`} title="Otevřít detail sálu"><ArrowRight size={18} strokeWidth={1.4} aria-hidden="true" /></button>
              </div>
              </div>
              {(!selected || rotating || selectionStale) && <button type="button" className={styles.selectCard} data-orbit-select="" tabIndex={-1} aria-label={`Přesunout dopředu: ${room.name}`}
                onClick={() => { viewportRef.current?.focus({ preventScroll: true }); select(index); }} />}
            </article>
          );
        })}
        </div>
      </div>
      <div className={styles.navigation}>
        <button type="button" onClick={() => select(0, -1)} disabled={rooms.length <= 1} aria-label="Předchozí sál" aria-controls={viewportId}><ArrowLeft size={19} aria-hidden="true" /></button>
        <button type="button" onClick={() => select(0, 1)} disabled={rooms.length <= 1} aria-label="Následující sál" aria-controls={viewportId}><ArrowRight size={19} aria-hidden="true" /></button>
      </div>
      <div className={styles.chooser} ref={chooserRef}>
      <span className={styles.position} aria-live="polite" aria-atomic="true"><span>{rooms[selectedIndex]?.name}</span><small>{rooms.length ? selectedIndex + 1 : 0} / {rooms.length}</small></span>
      <div className={styles.roomList} role="group" aria-label="Rychlý výběr sálu">
        {rooms.map((room, index) => <button key={room.id} type="button" aria-label={room.name} title={room.name} aria-pressed={selectedIndex === index} aria-controls={viewportId} onClick={() => select(index)}>
          <i style={{ backgroundColor: models[index].color }} aria-hidden="true" />
        </button>)}
      </div>
      </div>
    </section>
  );
}
