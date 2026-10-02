'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { OperatingRoom, DEFAULT_WEEKLY_SCHEDULE } from '../../types';
import { Lock, AlertTriangle, Activity, Pause, Phone, BedDouble, Biohazard } from 'lucide-react';
import { C, TIMELINE_START_HOUR, ROOM_LABEL_WIDTH, MIN_ROW_HEIGHT } from './constants';
import { isOperationInWindow, exceedsT24Hours, getOperationPosition as getOperationPositionRaw } from './utils';
import type { WorkflowStatus } from '../../contexts/WorkflowStatusesContext';
import type { CurrentRoomSpecialty } from '../../lib/room-specialty';
import { describeTimelineOperationalWarning, type TimelineOperationalWarning } from '../../lib/timeline-operational-warnings';
import { calculateUnusedOperatingMinutes } from '../../lib/timeline-unused-minutes';
import { TimelineRoomSpecialtyStrip } from '../RoomSpecialtyBadge';
/** Najetí myší na výkon — sdílený tvar mezi řádkem a bublinou v rodiči. */
export interface TimelineHoveredOp {
  room: OperatingRoom;
  x: number;
  y: number;
  /** Pokud je vyplněno, jde o najetí na již DOKONČENOU operaci (jinak živý výkon). */
  completed?: {
    startedAt: string;
    endedAt: string;
    statusHistory?: Array<{ stepIndex: number; startedAt: string; stepName?: string; color?: string }>;
  };
}

export interface TimelineRoomRowProps {
  room: OperatingRoom;
  warnings: readonly TimelineOperationalWarning[];
  roomIndex: number;
  currentTime: Date;
  dayWindowStartMs: number;
  TIMELINE_HOURS: number;
  rowHeight: number;
  density: 'auto' | 'compact' | 'comfort';
  showSummary: boolean;
  scrubActive: boolean;
  scrubTime: number | null;
  activeStatuses: WorkflowStatus[];
  statusByOrderIndex: Record<number, WorkflowStatus>;
  currentSpecialties: Map<string, CurrentRoomSpecialty[]>;
  /** Z celého objektu využití potřebuje řádek jen svoji vlastní míru vytížení. */
  roomUtilization: { rows: Array<{ id: string; utilizationPct: number; operations: number; occupiedMinutes: number }> };
  getTimePercentForTimeline: (date: Date, referenceStart: Date) => number;
  getOperationPosition: (startDate: Date, endDate: Date, currentTime: Date) => ReturnType<typeof getOperationPositionRaw>;
  getRemainingTime: (room: OperatingRoom) => string;
  getAroPosition: (roomId: string) => number | null;
  getOvertimeInfo: (roomId: string) => { overtimeMinutes: number } | undefined;
  statusAtTime: (room: OperatingRoom, t: number) => { color: string; name: string } | null;
  utilColor: (pct: number) => string;
  openLiveRoom: (roomOrId: OperatingRoom | string) => void;
  openHistoricalPhase: (
    room: OperatingRoom,
    history: NonNullable<OperatingRoom['statusHistory']>,
    phaseIndex: number,
    operationStartedAt: string,
    phaseEndedAt: string,
    cycleEndedAt?: string,
  ) => void;
  setStatsRoomId: React.Dispatch<React.SetStateAction<string | null>>;
  setHoveredOp: React.Dispatch<React.SetStateAction<TimelineHoveredOp | null>>;
}

/**
 * Jeden řádek rozvrhu — jeden sál.
 *
 * Vyjmuto z TimelineModule beze změny značkování i chování: komponenta nemá
 * vlastní stav ani hooky, takže se překresluje přesně tak často jako dřív,
 * když byla tělem callbacku v .map().
 */
export function TimelineRoomRow({
  room,
  warnings,
  roomIndex,
  currentTime,
  dayWindowStartMs,
  TIMELINE_HOURS,
  rowHeight,
  density,
  showSummary,
  scrubActive,
  scrubTime,
  activeStatuses,
  statusByOrderIndex,
  currentSpecialties,
  roomUtilization,
  getTimePercentForTimeline,
  getOperationPosition,
  getRemainingTime,
  getAroPosition,
  getOvertimeInfo,
  statusAtTime,
  utilColor,
  openLiveRoom,
  openHistoricalPhase,
  setStatsRoomId,
  setHoveredOp,
}: TimelineRoomRowProps) {
  const currentSpecialty = currentSpecialties.get(room.id);
  // Get current workflow step info from database context
  const totalSteps = activeStatuses.length > 0 ? activeStatuses.length : 1;
  const stepIndex = Math.min(room.currentStepIndex, totalSteps - 1);
  const isActive = stepIndex > 0; // index 0 = "Sál připraven"
  const isFree = stepIndex === 0;
  const remainingTime = getRemainingTime(room);
  const visibleWarnings = warnings.filter(warning => warning.type === 'schedule_collision');
  const warningSummary = visibleWarnings.map(describeTimelineOperationalWarning).join('; ');
  const unusedMinutes = calculateUnusedOperatingMinutes(room, currentTime);
  const unusedLabel = `Nevyužito ${unusedMinutes === null ? '—' : `${unusedMinutes} min`}`;
  const unusedDescription = unusedMinutes === null
    ? 'Nevyužité minuty nelze určit: pro dnešek není nastavena platná pracovní doba sálu.'
    : `${unusedMinutes} nevyužitých minut v dosud uplynulé nastavené pracovní době sálu, po zohlednění přestávky. Zahrnuje čas bez zaznamenaného operačního cyklu.`;
  const unusedSeverity = unusedMinutes === null ? 'unknown'
    : unusedMinutes >= 240 ? 'critical'
    : unusedMinutes >= 120 ? 'high'
    : unusedMinutes >= 60 ? 'medium' : 'low';
  const unusedLineColor = {
    unknown: C.slate,
    low: C.green,
    medium: C.yellow,
    high: C.orange,
    critical: C.red,
  }[unusedSeverity];
  const teamRoles = [
    { role: 'doctor', label: 'ARO lékař', assigned: Boolean(room.staff?.doctor?.name?.trim()) },
    { role: 'nurse', label: 'ARO sestra', assigned: Boolean(room.staff?.nurse?.name?.trim()) },
  ] as const;
  const teamSummary = teamRoles.map(({ label, assigned }) => `${label}: ${assigned ? 'vyplněno' : 'nevyplněno'}`).join('; ');
  const teamDots = (
    <span className="flex flex-shrink-0 flex-col items-center justify-center gap-[6px] px-[3px]"
      title={teamSummary} aria-hidden="true">
      {teamRoles.map(({ role, assigned }) => (
        <span key={role} data-team-role={role} data-team-assigned={assigned}
          className="block h-[7px] w-[7px] rounded-full"
          style={{ backgroundColor: assigned ? C.green : C.red }} />
      ))}
    </span>
  );
  
  // Get status from database context.
  // FIX: room.currentStepIndex je pozice v POLI activeStatuses (0-based), NIKOLI
  // db `order_index`. Lookup přes statusByOrderIndex selhával, pokud měla DB
  // jiné číslování (1-based nebo s mezerami) — text statusu se pak nezobrazil.
  // Sjednoceno s logikou v RoomCard.tsx (přímá indexace pole).
  const safeStepIndex = Math.max(0, Math.min(room.currentStepIndex, activeStatuses.length - 1));
  const currentStep = activeStatuses[safeStepIndex] || statusByOrderIndex[room.currentStepIndex] || null;
  // If paused, override color to pause color (cyan)
  const PAUSE_COLOR = '#22D3EE';
  const stepColor = room.isPaused 
    ? PAUSE_COLOR 
    : (currentStep?.accent_color || currentStep?.color || '#6B7280');
  const stepName = room.isLocked
    ? 'Sál uzamčen'
    : room.isPaused 
      ? 'Pauza' 
      : (currentStep?.title || currentStep?.name || 'Status');
  const StepIcon = Activity; // Default icon
  const availabilityStatus = room.isEmergency
    ? { label: 'Stav nouze', color: C.red }
    : room.isLocked
      ? { label: 'Sál uzamčen', color: C.slate }
      : room.isPaused
        ? { label: 'Pauza', color: C.cyan }
        : isFree
          ? { label: stepName, color: C.green }
          : { label: 'Sál v provozu', color: C.blue };
  const availabilityBadge = (
    <div className="timeline-room-availability-summary absolute right-3 top-1/2 z-[15] flex max-h-[calc(100%-4px)] w-[122px] -translate-y-1/2 flex-col overflow-hidden rounded-md"
      style={{ background: `${availabilityStatus.color}1a`, border: `1px solid ${availabilityStatus.color}45` }}
      data-room-availability={room.isEmergency ? 'emergency' : room.isLocked ? 'locked' : room.isPaused ? 'paused' : isFree ? 'ready' : 'busy'}>
      <div className="flex min-h-0 items-center gap-2 px-2 py-0.5">
        <p className="min-w-0 flex-1 truncate text-[10px] font-semibold leading-tight"
          style={{ color: isFree ? C.textHi : availabilityStatus.color }}>{availabilityStatus.label}</p>
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
          style={{ background: availabilityStatus.color }} aria-hidden="true" />
      </div>
      <div className="border-t px-2 py-0.5 text-center text-[9px] font-medium leading-tight tabular-nums whitespace-nowrap"
        style={{ borderColor: `${availabilityStatus.color}35`, color: '#B9C7D8', background: C.bgPanel }}
        title={unusedDescription} aria-hidden="true">{unusedLabel}</div>
      <div className="h-[2px] flex-shrink-0" style={{ background: unusedLineColor }}
        data-unused-severity={unusedSeverity} aria-hidden="true" />
    </div>
  );

  // Calculate operation bar position
  // Use currentProcedure if available, otherwise use phaseStartedAt or current time as fallback
  const startParts = room.currentProcedure?.startTime?.split(':');
  let boxLeftPct = 0;
  let boxWidthPct = 0;
  let progressPct = 0;
  let startDate: Date = new Date();
  let endDate: Date = new Date();
  // Prostoj (turnover) před aktuálním výkonem a pauza — pro živý řádek
  let gapLeftPct = 0, gapWidthPct = 0, gapMins = 0;

  // Show status bar if active - use operationStartedAt (arrival to OR) as the fixed start point
  const hasRealData = startParts && startParts.length === 2;
  const hasOperationStart = room.operationStartedAt;
  const shouldShowBar = isActive; // Always show for active rooms

  if (isActive) {
    // Determine start time - ALWAYS use operationStartedAt (arrival to OR) as the reference point
    if (hasOperationStart) {
      startDate = new Date(room.operationStartedAt);
    } else if (hasRealData) {
      startDate = new Date();
      startDate.setHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);
    } else if (room.phaseStartedAt) {
      startDate = new Date(room.phaseStartedAt);
    } else {
      startDate = new Date(currentTime.getTime() - 30 * 60 * 1000);
    }

    // Calculate window start: 7:00 today (or yesterday if before 7:00)
    const activeWindowStart = new Date(currentTime);
    activeWindowStart.setHours(TIMELINE_START_HOUR, 0, 0, 0);
    if (currentTime.getHours() < TIMELINE_START_HOUR) {
      activeWindowStart.setDate(activeWindowStart.getDate() - 1);
    }

    // Use date-aware percent calculation
    const rawLeftPct = getTimePercentForTimeline(startDate, activeWindowStart);
    // If operation started before window (continuing), clamp to 0
    boxLeftPct = Math.max(0, rawLeftPct);

    // Prostoj před aktuálním výkonem: od konce předchozí operace do
    // začátku té současné (kolik minut sál stál).
    const gapWindowStart = new Date(currentTime);
    gapWindowStart.setHours(TIMELINE_START_HOUR, 0, 0, 0);
    if (currentTime.getHours() < TIMELINE_START_HOUR) gapWindowStart.setDate(gapWindowStart.getDate() - 1);
    const prevEnd = (room.completedOperations || [])
      .map((op) => new Date(op.endedAt).getTime())
      // Prostoje zobrazujeme jen mezi výkony ve stejném provozním dni.
      // Předchozí den se nesmí natáhnout od začátku osy k prvnímu výkonu.
      .filter((t) => Number.isFinite(t) && t >= gapWindowStart.getTime() && t <= startDate.getTime())
      .sort((a, b) => b - a)[0];
    if (prevEnd) {
      const mins = Math.round((startDate.getTime() - prevEnd) / 60000);
      if (mins >= 2) {
        const gl = getTimePercentForTimeline(new Date(prevEnd), activeWindowStart);
        const gr = getTimePercentForTimeline(startDate, activeWindowStart);
        const gw = Math.min(100, gr) - Math.max(0, gl);
        if (gw > 0) { gapLeftPct = Math.max(0, gl); gapWidthPct = gw; gapMins = mins; }
      }
    }

    if (room.estimatedEndTime) {
      const estimatedEnd = new Date(room.estimatedEndTime);
      // Pokud operace stále probíhá a aktuální čas přesahuje odhadovaný konec,
      // prodloužíme zobrazení na aktuální čas (výkon dosud neskončil)
      endDate = currentTime > estimatedEnd ? currentTime : estimatedEnd;
    } else if (room.currentProcedure?.estimatedDuration) {
      const estimatedEnd = new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000);
      endDate = currentTime > estimatedEnd ? currentTime : estimatedEnd;
    } else {
      const fallbackDurations = [30, 20, 120, 60, 30, 45, 0];
      const duration = fallbackDurations[Math.min(stepIndex, 5)] || 90;
      const estimatedEnd = new Date(startDate.getTime() + duration * 60 * 1000);
      endDate = currentTime > estimatedEnd ? currentTime : estimatedEnd;
    }

    const rawRightPct = getTimePercentForTimeline(endDate, activeWindowStart);
    // Clamp right to 100 (timeline boundary)
    const boxRightPct = Math.min(100, rawRightPct);
    boxWidthPct = Math.max(2, boxRightPct - boxLeftPct);
    // nowWindowPct for progress calculation
    const nowWindowPct = getTimePercentForTimeline(currentTime, activeWindowStart);
    progressPct = Math.max(0, Math.min(100, ((nowWindowPct - boxLeftPct) / boxWidthPct) * 100));
  }

  /* Emergency row — full-banner pulsing red banner při aktivním stavu nouze. */
  if (room.isEmergency) {
    const bannerColor = C.red;
    const bannerLabel = 'STAV NOUZE';
    const shouldPulse = true;
    return (
      <div
        key={room.id}
        role="button"
        tabIndex={0}
        aria-label={`${room.name} — ${bannerLabel}; ${unusedDescription}; ${teamSummary}${warningSummary ? `; ${warningSummary}` : ''}`}
        className={`timeline-room-row ${roomIndex % 2 === 1 ? 'timeline-room-row-alt' : ''} flex items-stretch cursor-pointer transition-colors duration-200 group overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-400/70`}
        style={density === 'auto'
          ? { flex: '1 1 0%', minHeight: MIN_ROW_HEIGHT }
          : { height: rowHeight, flex: '0 0 auto' }}
        onClick={() => openLiveRoom(room.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openLiveRoom(room.id);
          }
        }}
      >
        <div 
          role="button"
          tabIndex={0}
          aria-label={`Celodenní souhrn sálu ${room.name}; ${unusedDescription}; ${teamSummary}${warningSummary ? `; ${warningSummary}` : ''}`}
          className="timeline-room-label flex-shrink-0 flex items-center gap-2 px-3 py-1 min-h-0 overflow-hidden sticky left-0 z-20 transition-colors duration-200 group-hover:bg-white/[0.04]"
          style={{ width: ROOM_LABEL_WIDTH, minWidth: ROOM_LABEL_WIDTH }}
          onClick={(event) => {
            event.stopPropagation();
            setStatsRoomId(room.id);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              setStatsRoomId(room.id);
            }
          }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <div className="min-w-0 flex-1 self-center">
              <p className="room-name-nobreak whitespace-normal text-[14px] font-semibold leading-[17px] tracking-[-0.01em]" style={{ color: `${bannerColor}cc` }}>{room.name}</p>
              {room.department && (
                <p className="mt-1 truncate text-[7.5px] font-medium uppercase leading-[9px] tracking-[0.18em] text-white/26">
                  {room.department}
                </p>
              )}
            </div>
            <TimelineRoomSpecialtyStrip specialties={currentSpecialty} />
          </div>
          {visibleWarnings.length > 0 && (
            <span className="flex flex-shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-semibold"
              style={{ color: C.yellow, background: `${C.yellow}16`, border: `1px solid ${C.yellow}55` }}
              title={warningSummary} aria-hidden="true">
              <AlertTriangle className="h-3 w-3" />Kolize{visibleWarnings.length > 1 ? ` +${visibleWarnings.length - 1}` : ''}
            </span>
          )}
          {teamDots}
        </div>
        {/* Emergency timeline box - tinted glassmorph */}
        <div className="relative flex-1 overflow-hidden rounded-r-[14px]">
        <div className={`absolute inset-y-1 left-2 right-2 rounded-xl overflow-hidden ${shouldPulse ? 'animate-pulse' : ''}`}>
          <div 
            className="absolute inset-0 rounded-md"
              style={{ 
                background: `linear-gradient(135deg, ${bannerColor}26 0%, ${bannerColor}12 100%)`,
                border: `1px solid ${bannerColor}55`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05)`,
              }}
            />
            {/* Content */}
            <div className="absolute inset-0 flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: '#ffffff' }} />
              <span className="font-bold tracking-[0.2em] uppercase select-none" style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.93)' }}>
                {bannerLabel}
              </span>
              {room.currentProcedure?.name && (
                <span className="font-medium tracking-wide truncate max-w-[40ch]" style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.80)' }}>
                  · {room.currentProcedure.name}
                </span>
              )}
            </div>
          </div>
          {availabilityBadge}
        </div>
      </div>
    );
  }

  /* Active / Free / Locked row - Premium glass card design */
  return (
    <div
      key={room.id}
      role="button"
      tabIndex={0}
      aria-label={`${room.name} — ${stepName}; ${unusedDescription}; ${teamSummary}${warningSummary ? `; ${warningSummary}` : ''}`}
        className={`timeline-room-row ${roomIndex % 2 === 1 ? 'timeline-room-row-alt' : ''} relative flex items-stretch group cursor-pointer overflow-hidden transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300/65 ${room.isLocked ? 'locked-room-glow' : ''}`}
        style={{
          ...(density === 'auto'
            ? { flex: '1 1 0%', minHeight: MIN_ROW_HEIGHT }
            : { height: rowHeight, flex: '0 0 auto' }),
          ...(room.isLocked ? { borderColor: C.borderActive } : {}),
      }}
      onClick={() => (showSummary ? setStatsRoomId(room.id) : openLiveRoom(room.id))}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (showSummary) setStatsRoomId(room.id);
          else openLiveRoom(room.id);
        }
      }}
    >
      {/* Diagonální lesk řádku při najetí myší — jemné oživení interakce */}
      <div className="tl-row-sheen" />

      {/* Colored left accent bar - Premium enhanced */}
      <div
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-all duration-300 z-30"
        style={{ 
          background: isActive
            ? `linear-gradient(to bottom, ${stepColor}, ${stepColor}cc)`
            : `linear-gradient(to bottom, ${C.slate}50, ${C.slate}20)`,
          boxShadow: isActive ? `0 0 10px ${stepColor}55` : 'none',
        }}
      />
      
      {/* Room Label - Premium glass panel (sticky při zoomu, aby zůstal vlevo) */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Celodenní souhrn sálu ${room.name}; ${unusedDescription}; ${teamSummary}${warningSummary ? `; ${warningSummary}` : ''}`}
        className="timeline-room-label flex-shrink-0 flex items-center gap-3 pl-4 pr-3 min-h-0 overflow-hidden transition-colors duration-200 sticky left-0 z-20"
        style={{
          width: ROOM_LABEL_WIDTH,
          minWidth: ROOM_LABEL_WIDTH,
        }}
        onClick={(event) => {
          event.stopPropagation();
          setStatsRoomId(room.id);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            setStatsRoomId(room.id);
          }
        }}
      >
        {/* ARO Overtime Badge - Premium style */}
        {(() => {
          const aroPosition = getAroPosition(room.id);
          const overtimeInfo = getOvertimeInfo(room.id);
          
          if (aroPosition && overtimeInfo) {
            return (
              /* Odznaky v levém sloupci nemají rámeček ani výplň.
                 Pět orámovaných a svítících krabiček vedle sebe udělalo
                 z jmenného sloupce nejhlučnější místo obrazovky a název
                 sálu se do zbytku nevešel. */
              <div
                className="flex flex-shrink-0 flex-col items-center justify-center leading-none"
                title={`ARO pozice ${aroPosition} · přesah ${overtimeInfo.overtimeMinutes} min`}
              >
                <span className="text-[7px] font-semibold tracking-[0.14em]" style={{ color: `${C.yellow}b0` }}>ARO</span>
                <span className="mt-1 text-[13px] font-semibold tabular-nums text-white/85">{aroPosition}</span>
                <span className="mt-0.5 text-[7px] font-medium tabular-nums" style={{ color: `${C.yellow}99` }}>+{overtimeInfo.overtimeMinutes}m</span>
              </div>
            );
          }
          return null;
        })()}

        {/* Patient Called Badge - Premium */}
        {room.patientCalledAt && !room.patientArrivedAt && (
          /* Bez nekonečného pulzování — smyčka běžela pořád na monitoru,
             který se nikdy nevypíná. */
          <div className="flex flex-shrink-0 items-center" title="Pacient volán">
            <Phone className="h-[15px] w-[15px]" style={{ color: C.blue }} strokeWidth={1.8} />
          </div>
        )}

        {/* Patient Arrived Badge - Premium */}
        {room.patientArrivedAt && (
          <div className="flex flex-shrink-0 items-center" title="Pacient v operačním traktu">
            <BedDouble className="h-[15px] w-[15px]" style={{ color: C.green }} strokeWidth={1.8} />
          </div>
        )}

        {/* Lock Badge - Premium */}
        {room.isLocked && (
          <div className="flex flex-shrink-0 items-center" title="Sál uzamčen">
            <Lock className="h-[15px] w-[15px]" style={{ color: C.cyan }} strokeWidth={1.8} />
          </div>
        )}
        
        
        {/* Room info card - Premium glass */}
        <div className="min-w-0 flex-1 flex items-center gap-3">
          {/* Název se zkratkami v prvním řádku, subtilní popis sálu pod ním. */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="min-w-0 flex-1 self-center">
              {/* Název se NIKDY nezkracuje. Zalomí se přednostně mezi slovy;
                  break-words je až poslední záchrana pro jediné dlouhé
                  slovo, aby přeteklý text nezmizel za okrajem sloupce. */}
              <p className="room-name-nobreak whitespace-normal text-[14px] font-semibold leading-[17px] tracking-[-0.01em] text-white">{room.name}</p>
              {room.department && (
                <p className="mt-1 truncate text-[7.5px] font-medium uppercase leading-[9px] tracking-[0.18em] text-white/26">
                  {room.department}
                </p>
              )}
            </div>
            <TimelineRoomSpecialtyStrip specialties={currentSpecialty} />
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {room.isEnhancedHygiene && (
              <span
                className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: '#FB923C' }}
                title="Infekční pacient — zvýšený hygienický režim"
              >
                <Biohazard className="h-3 w-3" strokeWidth={1.8} />
                Infekční
              </span>
            )}
            {room.isSeptic && (
              <span
                className="text-[8px] font-bold px-2 py-0.5 rounded-md uppercase"
                style={{
                  background: `${C.purple}20`,
                  color: C.purple,
                  border: `1px solid ${C.purple}40`,
                }}
              >
                SEPTIKA
              </span>
            )}
            {room.isPaused && !room.isEmergency && !room.isLocked && (
              <span 
                className="text-[8px] font-bold px-2 py-0.5 rounded-md uppercase flex items-center gap-1"
                style={{ 
                  background: `${C.cyan}20`,
                  color: C.cyan,
                  border: `1px solid ${C.cyan}40`,
                }}
              >
                <Pause className="w-2.5 h-2.5" />
                PAUZA
              </span>
            )}
          </div>
        </div>
        {visibleWarnings.length > 0 && (
          <span className="flex flex-shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-semibold"
            style={{ color: C.yellow, background: `${C.yellow}16`, border: `1px solid ${C.yellow}55` }}
            title={warningSummary} aria-hidden="true">
            <AlertTriangle className="h-3 w-3" />Kolize{visibleWarnings.length > 1 ? ` +${visibleWarnings.length - 1}` : ''}
          </span>
        )}
        {teamDots}
      </div>

      {/* Timeline section - Premium glass with grid */}
      <div
        className="relative flex-1 overflow-hidden"
        style={{
          background: 'transparent'
        }}
      >
        {warnings.filter(warning => warning.type === 'schedule_collision').map(warning => {
          if (warning.type !== 'schedule_collision') return null;
          const visibleHours = TIMELINE_HOURS * 3600_000;
          const left = Math.max(0, (warning.overlapStartMs - dayWindowStartMs) / visibleHours * 100);
          const right = Math.min(100, (warning.overlapEndMs - dayWindowStartMs) / visibleHours * 100);
          if (right <= left) return null;
          return <span key={warning.scheduleIds.join(':')}
            className="absolute top-0 z-[12] h-[3px] rounded-full pointer-events-none"
            style={{ left: `${left}%`, width: `${right - left}%`, minWidth: 3, background: C.yellow, boxShadow: `0 0 6px ${C.yellow}99` }}
            aria-hidden="true" />;
        })}
        {/* Marker aktivace hygienického režimu (infekční pacient) — ikona
            v čase, kdy byl režim vyhlášen. Bod zůstává i po vypnutí režimu
            (pulzuje jen dokud je režim aktivní). */}
        {room.enhancedHygieneAt && (() => {
          const ws = new Date(currentTime);
          ws.setHours(TIMELINE_START_HOUR, 0, 0, 0);
          if (currentTime.getHours() < TIMELINE_START_HOUR) ws.setDate(ws.getDate() - 1);
          const pct = getTimePercentForTimeline(new Date(room.enhancedHygieneAt), ws);
          if (!Number.isFinite(pct) || pct < 0 || pct > 100) return null;
          const active = !!room.isEnhancedHygiene;
          return (
            <div
              className="absolute top-0 bottom-0 z-[25] pointer-events-none flex items-center"
              style={{ left: `${pct}%` }}
              title={`Vyhlášen hygienický režim · ${new Date(room.enhancedHygieneAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`}
            >
              <div
                className={`-translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center ${active ? 'animate-pulse' : ''}`}
                style={{
                  background: active ? 'rgba(249,115,22,0.95)' : 'rgba(249,115,22,0.55)',
                  boxShadow: active ? '0 0 12px rgba(249,115,22,0.8)' : '0 0 6px rgba(249,115,22,0.35)',
                  border: '1.5px solid #fff',
                }}
              >
                <Biohazard className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          );
        })()}

        {/* Marker pauzy — ikona v čase, kdy byla pauza aktivována (pausedAt).
            Stejný princip jako marker hygienického režimu. */}
        {room.isPaused && room.pausedAt && !room.isLocked && (() => {
          const ws = new Date(currentTime);
          ws.setHours(TIMELINE_START_HOUR, 0, 0, 0);
          if (currentTime.getHours() < TIMELINE_START_HOUR) ws.setDate(ws.getDate() - 1);
          const pct = getTimePercentForTimeline(new Date(room.pausedAt), ws);
          if (!Number.isFinite(pct) || pct < 0 || pct > 100) return null;
          return (
            <div
              className="absolute top-0 bottom-0 z-[26] pointer-events-none flex items-center"
              style={{ left: `${pct}%` }}
              title={`Pauza · ${new Date(room.pausedAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`}
            >
              <div
                className="-translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center animate-pulse"
                style={{
                  background: `${C.cyan}f0`,
                  boxShadow: `0 0 12px ${C.cyan}cc`,
                  border: '1.5px solid #fff',
                }}
              >
                <Pause className="w-3 h-3 text-white" fill="#fff" />
              </div>
            </div>
          );
        })()}

        {/* Locked room diagonal stripes overlay */}
        {room.isLocked && (
          <div className="locked-room-stripes absolute inset-0 z-10 rounded-[5px]" />
        )}
        
        {/* Locked room overlay — jeden velký, centrovaný nápis přes celý řádek.
            Žádné další statusové texty se u uzamčeného sálu nezobrazují. */}
        {room.isLocked && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            {/* Outlined pill dle referenčního designu */}
            <div
              className="flex items-center gap-2.5 px-5 py-1.5 rounded-[5px]"
              style={{
                background: 'rgba(6, 20, 28, 0.78)',
                border: '1.5px solid rgba(255, 255, 255, 0.28)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.45)',
              }}
            >
              <Lock className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.85)' }} />
              <span
                className="text-sm font-bold uppercase tracking-[0.25em] whitespace-nowrap"
                style={{ color: 'rgba(255,255,255,0.92)' }}
              >
                SÁL UZAVŘEN
              </span>
            </div>
          </div>
        )}
        {/* Hodinová mřížka se kreslí globálně přes všechny řádky
            (viz „Hour grid overlay" výše), proto ji zde záměrně
            NEopakujeme — eliminuje duplicitní DOM a nekonzistentní
            noční výpo��et. */}

        {/* ── Časová lupa: stav sálu v navoleném čase — svítící bod + název fáze ── */}
        {scrubActive && scrubTime !== null && !room.isLocked && (() => {
          const ph = statusAtTime(room, scrubTime);
          const pctInRow = Math.max(0, Math.min(100, ((scrubTime - dayWindowStartMs) / (TIMELINE_HOURS * 3600_000)) * 100));
          return (
            <div
              className="absolute top-1/2 -translate-y-1/2 z-50 pointer-events-none flex items-center gap-1.5"
              style={{ left: `${pctInRow}%` }}
            >
              <div
                className="w-3 h-3 rounded-full -translate-x-1/2 flex-shrink-0"
                style={ph ? {
                  background: ph.color,
                  border: '2px solid rgba(255,255,255,0.9)',
                  boxShadow: `0 0 0 3px ${ph.color}26`,
                } : {
                  background: 'rgba(255,255,255,0.12)',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                }}
              />
              {rowHeight >= 34 && (
                <span
                  className="px-1.5 py-[2px] rounded text-[9px] font-semibold whitespace-nowrap leading-none"
                  style={ph ? {
                    background: 'rgba(4, 12, 18, 0.9)',
                    color: ph.color,
                    border: `1px solid ${ph.color}55`,
                  } : {
                    background: 'rgba(4, 12, 18, 0.75)',
                    color: 'rgba(255,255,255,0.4)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  {ph ? ph.name : 'Volný'}
                </span>
              )}
            </div>
          );
        })()}

        {/* ── Souhrnný (statistický) režim: STEJNÁ časová osa, jen místo živé
            operace zobrazuje všechny dnešní operace po fázích + statistiky řádku ── */}
        {showSummary && !room.isLocked && (() => {
          const summaryWindowStart = new Date(currentTime);
          summaryWindowStart.setHours(TIMELINE_START_HOUR, 0, 0, 0);
          if (currentTime.getHours() < TIMELINE_START_HOUR) {
            summaryWindowStart.setDate(summaryWindowStart.getDate() - 1);
          }
          const stepColorMap: Record<number, string> = {};
          activeStatuses.forEach((s, idx) => {
            stepColorMap[idx] = s.accent_color || s.color || '#6b7280';
          });
          type Seg = { l: number; w: number; color: string; name: string };
          const segs: Seg[] = [];
          const addHistory = (
            history: Array<{ stepIndex: number; startedAt: string; color?: string; stepName?: string }> | undefined,
            fallbackStart: number,
            opEnd: number,
          ) => {
            const hist = history && history.length > 0
              ? history
              : [{ stepIndex: 1, startedAt: new Date(fallbackStart).toISOString() }];
            hist.forEach((entry, idx) => {
              const s = new Date(entry.startedAt).getTime();
              const e = idx + 1 < hist.length ? new Date(hist[idx + 1].startedAt).getTime() : opEnd;
              if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return;
              const l = getTimePercentForTimeline(new Date(s), summaryWindowStart);
              const r = getTimePercentForTimeline(new Date(e), summaryWindowStart);
              const w = Math.min(100, r) - Math.max(0, l);
              if (w <= 0) return;
              segs.push({
                l: Math.max(0, l),
                w,
                color: stepColorMap[entry.stepIndex] || entry.color || C.slate,
                name: entry.stepName || activeStatuses[entry.stepIndex]?.name || 'Fáze',
              });
            });
          };
          (room.completedOperations || []).forEach((op) => {
            const s = new Date(op.startedAt).getTime();
            const e = new Date(op.endedAt).getTime();
            if (Number.isFinite(s) && Number.isFinite(e) && e > s) addHistory(op.statusHistory, s, e);
          });
          if (room.operationStartedAt && room.currentStepIndex > 0) {
            addHistory(room.statusHistory, new Date(room.operationStartedAt).getTime(), currentTime.getTime());
          }

          // ── Turnover / prostoje: mezery mezi po sobě jdoucími výkony ──
          // Seřadíme dnešní operace dle času a spočítáme prázdné mezery
          // (kolik minut sál stál mezi koncem jednoho a začátkem dalšího).
          const opsList: { s: number; e: number }[] = [];
          (room.completedOperations || []).forEach((op) => {
            const s = new Date(op.startedAt).getTime();
            const e = new Date(op.endedAt).getTime();
            if (Number.isFinite(s) && Number.isFinite(e) && e > s) opsList.push({ s, e });
          });
          if (room.operationStartedAt && room.currentStepIndex > 0) {
            const s = new Date(room.operationStartedAt).getTime();
            if (Number.isFinite(s)) opsList.push({ s, e: currentTime.getTime() });
          }
          opsList.sort((a, b) => a.s - b.s);
          const gaps: { l: number; w: number; mins: number }[] = [];
          for (let i = 1; i < opsList.length; i++) {
            const gs = opsList[i - 1].e;
            const ge = opsList[i].s;
            const mins = Math.round((ge - gs) / 60000);
            if (mins < 2) continue; // drobné mezery ignorujeme
            const l = getTimePercentForTimeline(new Date(gs), summaryWindowStart);
            const r = getTimePercentForTimeline(new Date(ge), summaryWindowStart);
            const w = Math.min(100, r) - Math.max(0, l);
            if (w <= 0) continue;
            gaps.push({ l: Math.max(0, l), w, mins });
          }

          const u = roomUtilization.rows.find((x) => x.id === room.id);
          const uc = u ? utilColor(u.utilizationPct) : C.slate;
          return (
            <>
              {/* Prostoje (turnover) mezi výkony — šrafovaný pruh + minuty */}
              {gaps.map((g, i) => (
                <div
                  key={`gap-${i}`}
                  className="absolute top-[30%] bottom-[30%] rounded-[3px] flex items-center justify-center pointer-events-none overflow-hidden"
                  title={`Prostoj mezi výkony · ${g.mins} min`}
                  style={{
                    left: `${g.l}%`,
                    width: `${Math.max(0.3, g.w)}%`,
                    // Prostoj: jen tón, bez rámečku a bez oblého tvaru — stejná
              // pravidla jako karty výkonů.
              background: 'rgba(245,158,11,0.065)',
              borderRadius: '3px',
                    border: 'none',
                  }}
                >
                  {g.w > 2.6 && (
                    <span className="text-[9px] font-bold tabular-nums whitespace-nowrap px-0.5" style={{ color: '#FBBF24' }}>{g.mins}m</span>
                  )}
                </div>
              ))}
              {segs.map((sg, i) => (
                <div
                  key={`sum-${i}`}
                  className="absolute top-[20%] bottom-[20%] rounded-[4px]"
                  title={sg.name}
                  style={{
                    left: `${sg.l}%`,
                    width: `${Math.max(0.35, sg.w)}%`,
                    background: `linear-gradient(180deg, ${sg.color}cc 0%, ${sg.color}77 100%)`,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                  }}
                />
              ))}
              {segs.length === 0 && (
                <div className="absolute inset-0 flex items-center pl-4 pointer-events-none">
                  <span className="text-[10px] text-white/25">Dnes zatím žádné operace</span>
                </div>
              )}
              {u && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none z-10">
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold tabular-nums"
                    style={{ background: `${uc}1f`, color: uc, border: `1px solid ${uc}40` }}
                    title="Vytížení provozní doby"
                  >
                    {u.utilizationPct}%
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold tabular-nums text-white/70"
                    style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}` }}
                    title="Počet dnešních operací"
                  >
                    {u.operations} op
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold tabular-nums text-white/70"
                    style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}` }}
                    title="Obsazený operační čas"
                  >
                    {Math.floor(u.occupiedMinutes / 60)}h {String(u.occupiedMinutes % 60).padStart(2, '0')}m
                  </span>
                </div>
              )}
            </>
          );
        })()}

        {/* Waiting bar — Shows patient waiting in operating tract before operation starts */}
        {!showSummary && !room.isLocked && room.patientArrivedAt && (() => {
          const arrivedTime = new Date(room.patientArrivedAt).getTime();
          
          // Určit konec čekání - buď start operace, nebo aktuální čas pokud operace běží
          let endTime = currentTime.getTime();
          if (room.operationStartedAt) {
            endTime = new Date(room.operationStartedAt).getTime();
          } else if (room.currentProcedure?.startTime) {
            const startParts = room.currentProcedure.startTime.split(':');
            if (startParts.length === 2) {
              const plannedStart = new Date();
              plannedStart.setHours(parseInt(startParts[0]), parseInt(startParts[1]), 0, 0);
              endTime = plannedStart.getTime();
            }
          }
          
          // Pokud pacient přijel později než operace začala, nezobrazovat
          if (arrivedTime > endTime) return null;
          
          // Zjistit pozici baru
          const position = getOperationPosition(
            new Date(arrivedTime),
            new Date(endTime),
            currentTime
          );
          
          if (position.width <= 0) return null;
          
          return (
            <div
              key="patient-waiting"
              className="absolute bottom-1 overflow-hidden"
              style={{
                left: `${position.left}%`,
                width: `${Math.max(0.5, position.width)}%`,
                height: '3px',
                zIndex: 3,
              }}
            >
              {/* Tyrkysový waiting bar - pacient je v traktu a čeká */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'rgba(6, 182, 212, 0.9)',
                  boxShadow: '0 0 6px rgba(6, 182, 212, 0.7)',
                }}
                title="Pacient v operačním traktu - čeká na operaci"
              />
            </div>
          );
        })()}
        
        {/* Completed operations - Premium glass cards.
            U uzamčeného sálu nic dalšího nevykreslujeme — viz overlay výše. */}
        {!room.isLocked && (() => {
          const opsToRender = room.completedOperations || [];
          
          if (opsToRender.length === 0) return null;
          
          const filteredOps = opsToRender.filter(operation => {
            const opStartDate = new Date(operation.startedAt);
            const opEndDate = new Date(operation.endedAt);
            const inWindow = isOperationInWindow(opStartDate, opEndDate, currentTime);
            return inWindow;
          });
          
          if (filteredOps.length === 0) return null;
          
          return filteredOps.map((operation, opIdx) => {
            const opStartDate = new Date(operation.startedAt);
            const opEndDate = new Date(operation.endedAt);
            const exceedsDay = exceedsT24Hours(opStartDate, opEndDate);
            
            const position = getOperationPosition(opStartDate, opEndDate, currentTime);
            
            if (position.width <= 0) return null;
            
            const isContinuingOp = position.isContinuing;
            const isRoomReady = (room.statusHistory && room.statusHistory.length > 0);


            return (
              <div
                key={`completed-${opIdx}`}
                /* Výkon je neutrální karta; barvu nese proužek fází po HORNÍ
                   hraně. Když barvy vyplňovaly celou plochu, sousední výkony
                   splynuly v jednu pruhovanou masu a nešlo poznat, kde jeden
                   končí a druhý začíná. Takhle drží plocha klid, barva sedí
                   na hraně a uvnitř zbylo místo na čas. */
                /* Design systém projektu (.21st/DESIGN.md) má u karet zapsáno:
                   „no visible outline; selection is communicated by color,
                   background tint, icon, and a short bottom indicator" a
                   zakazuje záře. Karta výkonu to plní doslova — žádný rámeček,
                   žádný stín, jen tón barvy převažující fáze a krátký ukazatel
                   při spodní hraně. Rádius je nemocnicky střídmý, ne oblý. */
                className="timeline-operation-block timeline-operation-completed absolute top-1 bottom-1 overflow-hidden rounded-[4px] group"
                style={{
                  left: `${position.left}%`,
                  width: `${Math.max(0.5, position.width)}%`,
                  // Podklad je jen decentní, barvu nesou průhledné segmenty fází.
                  background: isContinuingOp
                    ? `${C.green}1c`
                    : isRoomReady ? `${C.cyan}16` : 'rgba(255,255,255,0.03)',
                  border: 'none',
                  boxShadow: 'none',
                }}
                onMouseEnter={(e) => setHoveredOp({ room, x: e.clientX, y: e.clientY, completed: { startedAt: operation.startedAt, endedAt: operation.endedAt, statusHistory: operation.statusHistory } })}
                onMouseMove={(e) => setHoveredOp({ room, x: e.clientX, y: e.clientY, completed: { startedAt: operation.startedAt, endedAt: operation.endedAt, statusHistory: operation.statusHistory } })}
                onMouseLeave={() => setHoveredOp(null)}
              >
                  {/* Completed operation segments with colors from database context */}
                  {operation.statusHistory && operation.statusHistory.length > 0 && (
                    <div className="absolute inset-0 flex overflow-hidden rounded-[4px]">
                      {(() => {
                        // KLÍČOVÉ: `stepIndex` v room_status_history se ukládá jako
                        // POZICE v poli `activeDbStatuses` (kompaktní 0..N po vyfiltrování
                        // neaktivních statusů) — viz RoomDetail.changeStep ��� App.updateRoomStep.
                        // DB `sort_order` má mezery (např. neaktivní "Začátek anestezie" má
                        // sort_order=2, takže "Chirurgický výkon" je sort_order=3 ale POZICE 2).
                        // Proto MUSÍME indexovat podle pozice v poli, NE podle order_index,
                        // jinak se barvy posunou a Ukončení výkonu se vykreslí barvou
                        // Chirurgického výkonu apod.
                        const stepColorMap: Record<number, string> = {};
                        activeStatuses.forEach((s, idx) => {
                          stepColorMap[idx] = s.accent_color || s.color || '#6b7280';
                        });

                        const opStart = new Date(operation.startedAt).getTime();
                        const opEnd = new Date(operation.endedAt).getTime();
                        const opDuration = Math.max(1, opEnd - opStart);

                        return operation.statusHistory.map((entry, idx) => {
                          const segStart = new Date(entry.startedAt).getTime();
                          const nextEntry = operation.statusHistory[idx + 1];
                          const segEnd = nextEntry
                            ? new Date(nextEntry.startedAt).getTime()
                            : opEnd;
                          const segDuration = Math.max(0, segEnd - segStart);
                          const segWidthPct = (segDuration / opDuration) * 100;
                          const segLeftPct = ((segStart - opStart) / opDuration) * 100;
                          if (segWidthPct <= 0) return undefined;
                          // AKTUÁLNÍ barva z DB má VŽDY přednost (live z "Správa statusů").
                          // entry.color je jen fallback pro stavy, jejichž status už v DB
                          // neexistuje (např. byl smazán). STEP_INDEX_COLORS NEPOUŽÍVÁME —
                          // hardkódovaná paleta by mohla zase posunout barvy mimo realitu DB.
                          const phaseColor = stepColorMap[entry.stepIndex] || entry.color || '#6b7280';

                          return (
                            <div
                              key={`seg-${idx}`}
                              role="button"
                              tabIndex={0}
                              aria-label={`Zobrazit fázi ${entry.stepName || statusByOrderIndex[entry.stepIndex]?.title || ''}`}
                              /* hover:brightness() je filtr a vytlačil by každý
                                 segment do vlastní offscreen textury. Průhlednost
                                 zvládne kompozitor sám. */
                              /* hover:brightness() je filtr a vytlačil by každý segment
                                 do vlastní offscreen textury. Inset stín překreslí jen
                                 ten jeden segment. */
                              className="absolute top-0 bottom-0 cursor-pointer transition-shadow duration-150 hover:shadow-[inset_0_0_0_999px_rgba(255,255,255,0.10)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/80"
                              style={{
                                left: `${Math.max(0, segLeftPct)}%`,
                                width: `${Math.max(0.5, segWidthPct)}%`,
                                // Průhledná barva fáze — plocha pod ní zůstává čitelná.
                                background: `linear-gradient(180deg, ${phaseColor}3d 0%, ${phaseColor}22 100%)`,
                                borderRight: idx < operation.statusHistory.length - 1 ? '1px solid rgba(185,205,225,0.14)' : 'none',
                              }}
                              title={entry.stepName || statusByOrderIndex[entry.stepIndex]?.title || ''}
                              onClick={(event) => {
                                event.stopPropagation();
                                openHistoricalPhase(room, operation.statusHistory, idx, operation.startedAt, new Date(segEnd).toISOString(), operation.endedAt);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  openHistoricalPhase(room, operation.statusHistory, idx, operation.startedAt, new Date(segEnd).toISOString(), operation.endedAt);
                                }
                              }}
                            />
                          );
                        }).filter(Boolean);
                      })()}
                    </div>
                  )}
                  
                  {/* Dokončený blok zůstává bez textového času. Přesné údaje jsou
                      dostupné v detailu po najetí, samotná osa tak zůstává čistá. */}
                  <div className="absolute inset-0 z-10 flex items-center justify-end pr-2 pl-3 pointer-events-none">
                    {isContinuingOp && position.width > 6 && (
                      <span className="timeline-operation-label text-[10px] font-bold truncate uppercase tracking-wide">
                        POKRAČUJÍCÍ VÝKON
                      </span>
                    )}
                    {!isContinuingOp && isRoomReady && position.width > 4 && (
                      /* Hidden: Room ready pill */
                      <></>
                    )}
                  </div>
              </div>
            );
          })
        })()}

        {/* Continuing operation bar (green):
            Displayed ONLY when the current window starts at 7:00 today and the operation
            started BEFORE that 7:00 (i.e. it ran overnight and is still active).
            The bar goes from 0% (7:00 today) to the estimated end time position.
        */}
        {isActive && !room.isLocked && room.operationStartedAt && room.estimatedEndTime && (() => {
          const opStart = new Date(room.operationStartedAt);
          const opEnd   = new Date(room.estimatedEndTime);

          // Window start = 7:00 of the current calendar day (never yesterday)
          const windowStart = new Date(currentTime);
          windowStart.setHours(TIMELINE_START_HOUR, 0, 0, 0);

          // Only show when op started BEFORE today's 7:00 → it's a true overnight carry-over
          if (opStart >= windowStart) return null;

          // Position of estimated end on today's timeline (0% = 7:00, 100% = 7:00 tomorrow)
          const endPct = getTimePercentForTimeline(opEnd, windowStart);
          // Cap to visible area (7:00-7:00)
          const displayWidthPct = Math.max(2, Math.min(endPct, 100));

          // Format end time for display
          const endHours   = opEnd.getHours().toString().padStart(2, '0');
          const endMinutes = opEnd.getMinutes().toString().padStart(2, '0');

          return (
            <div
              className="absolute top-0.5 bottom-0.5 overflow-hidden flex items-center justify-between px-3"
              style={{
                left: '0%',
                width: `${displayWidthPct}%`,
                background: `linear-gradient(90deg, ${stepColor}35 0%, ${stepColor}20 100%)`,
                borderRight: `2px solid ${stepColor}`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.2)`,
                zIndex: 1,
              }}
            >
              <span className="text-[11px] font-semibold text-white uppercase tracking-[0.15em] truncate">
                POKRAČUJÍCÍ VÝKON
              </span>
              <span className="text-[10px] font-bold ml-2 whitespace-nowrap" style={{ color: stepColor }}>
                do {endHours}:{endMinutes}
              </span>
            </div>
          );
        })()}

        {/* Active operation bar — Premium Futuristic Control Center style:
           • Glassmorphism with subtle gradients
           • Animated glow effects based on status
           • Professional card-like appearance */}
        
        {/* Pre-operation timeline bar — Shows patient call → arrival in tract → start of operation */}
        {room.patientCalledAt && !room.isLocked && (() => {
          // Pokud je pacient volán, zobrazit pre-operation timeline
          const calledTime = new Date(room.patientCalledAt).getTime();
          const arrivedTime = room.patientArrivedAt ? new Date(room.patientArrivedAt).getTime() : null;
          
          // Použít operationStartedAt pokud existuje (operace již začala), jinak plánovaný čas
          let operationStartTime = null;
          if (room.operationStartedAt) {
            operationStartTime = new Date(room.operationStartedAt).getTime();
          } else if (room.currentProcedure?.startTime) {
            // Plánovaný čas - převést HH:MM na timestamp dnes
            const startParts = room.currentProcedure.startTime.split(':');
            if (startParts.length === 2) {
              const plannedStart = new Date();
              plannedStart.setHours(parseInt(startParts[0]), parseInt(startParts[1]), 0, 0);
              operationStartTime = plannedStart.getTime();
            }
          }
          
          if (!operationStartTime) return null;
          if (calledTime > operationStartTime) return null; // Volání je v budoucnosti za operací
          
          const totalDuration = operationStartTime - calledTime;
          const arrivedPct = arrivedTime && arrivedTime >= calledTime && arrivedTime <= operationStartTime
            ? ((arrivedTime - calledTime) / totalDuration) * 100 
            : null;
          
          const position = getOperationPosition(
            new Date(calledTime),
            new Date(operationStartTime),
            currentTime
          );
          
          if (position.width <= 0) return null;
          
          return (
            <div
              key="pre-operation-timeline"
              className="absolute bottom-1 overflow-hidden"
              style={{
                left: `${position.left}%`,
                width: `${Math.max(0.5, position.width)}%`,
                height: '3px',
                zIndex: 2,
              }}
            >
              {/* Background track */}
              <div className="absolute inset-0" style={{ background: 'rgba(100,100,120,0.2)' }} />
              
              {/* Called to Arrived segment (zelená) */}
              {arrivedPct !== null && (
                <div
                  className="absolute top-0 bottom-0"
                  style={{
                    left: '0%',
                    width: `${arrivedPct}%`,
                    background: 'rgba(34, 197, 94, 0.6)',
                    boxShadow: '0 0 4px rgba(34, 197, 94, 0.5)',
                  }}
                  title="Pacient volán → v operačním traktu"
                />
              )}
              
              {/* Arrived to Operation Start segment (tyrkysová) */}
              {arrivedPct !== null && (
                <div
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${arrivedPct}%`,
                    width: `${100 - arrivedPct}%`,
                    background: 'rgba(6, 182, 212, 0.6)',
                    boxShadow: '0 0 4px rgba(6, 182, 212, 0.5)',
                  }}
                  title="Pacient v operačním traktu → začátek operace"
                />
              )}
              
              {/* Fallback: bez arrivedTime, jen volání -> operace */}
              {!arrivedPct && (
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'rgba(34, 197, 94, 0.5)',
                    boxShadow: '0 0 4px rgba(34, 197, 94, 0.4)',
                  }}
                  title="Pacient volán → začátek operace"
                />
              )}
            </div>
          );
        })()}
        
        {/* Prostoj (turnover) před aktuálním výkonem — živý režim */}
        {!showSummary && isActive && !room.isLocked && gapWidthPct > 0 && (
          <div
            className="absolute top-[41%] bottom-[41%] flex items-center justify-center pointer-events-none overflow-hidden z-[5]"
            title={`Prostoj mezi výkony · ${gapMins} min`}
            style={{
              left: `${gapLeftPct}%`,
              width: `${Math.max(0.3, gapWidthPct)}%`,
              // Prostoj je kapsle s plně zaoblenými konci, ne šrafovaná plocha.
              // Šrafování bylo nejhlasitější prvek osy a u sálu, který stojí
              // přes noc, přebilo i samotné výkony.
              background: 'rgba(245,158,11,0.10)',
              borderRadius: '999px',
              border: '1px solid rgba(245,158,11,0.22)',
            }}
          >
            {gapWidthPct > 2.6 && (
              <span className="text-[9px] font-bold tabular-nums whitespace-nowrap px-0.5" style={{ color: '#FBBF24' }}>{gapMins}m</span>
            )}
          </div>
        )}

        {!showSummary && isActive && !room.isLocked && shouldShowBar && boxWidthPct > 0 && (
          <motion.div
            className="timeline-operation-block absolute top-1 bottom-1 overflow-hidden rounded-[5px]"
            style={{
              left: `${Math.max(0, boxLeftPct)}%`,
              width: `${boxWidthPct}%`,
              background: `${stepColor}2e`,
              boxShadow: `0 14px 36px -18px rgba(0,0,0,0.70), 0 0 22px -10px ${stepColor}`,
              border: `1px solid ${stepColor}55`,
            }}
            initial={false}
            onMouseEnter={(e) => setHoveredOp({ room, x: e.clientX, y: e.clientY })}
            onMouseMove={(e) => setHoveredOp({ room, x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setHoveredOp(null)}
          >
            {/* Svítící bod na živém konci lišty — ukazuje, kde operace „roste" */}
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1.5 h-1.5 rounded-full z-20 pointer-events-none"
              style={{ background: stepColor, border: '1.5px solid rgba(255,255,255,0.85)' }}
            />

            {/* Jasná zaoblená levá „čepička" lišty */}
            <div
              className="absolute left-0 top-0 bottom-0 w-2 rounded-l-sm"
              style={{
                background: `linear-gradient(to bottom, ${stepColor}, ${stepColor}cc)`,
                boxShadow: `0 0 0 3px ${stepColor}30`,
              }}
            />

            {/* Premium progress bar with gradient */}
            <div className="absolute left-2 right-0 top-0 bottom-0 overflow-hidden">
              {(() => {
                const history = room.statusHistory || [];
                const operationStart = room.operationStartedAt
                  ? new Date(room.operationStartedAt).getTime()
                  : room.phaseStartedAt
                    ? new Date(room.phaseStartedAt).getTime()
                    : Date.now() - 30 * 60 * 1000;
                const now = Date.now();
                
                // Estimate end time: use provided estimate or default to 120 min
                const estimatedEndTime = room.estimatedEndTime
                  ? new Date(room.estimatedEndTime).getTime()
                  : operationStart + 120 * 60 * 1000;
                
                // Total duration is from start to estimated end (not to "now")
                const totalDuration = Math.max(1, estimatedEndTime - operationStart);

                const stepColorMap: Record<number, string> = {};
                activeStatuses.forEach((s, idx) => {
                  stepColorMap[idx] = s.accent_color || s.color || '#6b7280';
                });

                // If we have status history, render colored segments
                if (history.length > 0) {
                  return (
                    <div className="h-full w-full flex relative">
                      {history.map((entry, idx) => {
                        const segStart = new Date(entry.startedAt).getTime();
                        const nextEntry = history[idx + 1];
                        const segEnd = nextEntry
                          ? new Date(nextEntry.startedAt).getTime()
                          : estimatedEndTime; // Current segment extends to estimated end
                        const segDuration = Math.max(0, segEnd - segStart);
                        const segWidthPct = (segDuration / totalDuration) * 100;
                        const segLeftPct = ((segStart - operationStart) / totalDuration) * 100;
                        
                        if (segWidthPct <= 0) return null;
                        
                        // Get color from stepColorMap using entry.stepIndex, or use entry.color as fallback
                        const phaseColor = stepColorMap[entry.stepIndex] || entry.color || '#6b7280';
                        const isCurrentSegment = !nextEntry;

                        return (
                          <div
                            key={`active-seg-${idx}`}
                            role="button"
                            tabIndex={0}
                            aria-label={`Zobrazit fázi ${entry.stepName || statusByOrderIndex[entry.stepIndex]?.title || ''}`}
                            className="cursor-pointer transition-[filter] hover:brightness-125 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/80"
                            style={{
                              position: 'absolute',
                              top: 0,
                              bottom: 0,
                              left: `${Math.max(0, segLeftPct)}%`,
                              width: `${Math.max(0.5, segWidthPct)}%`,
                              // Proběhlé i aktuální fáze stejnou plnou barvou statusu (bez šrafování).
                              background: `linear-gradient(180deg, ${phaseColor}94 0%, ${phaseColor}5c 100%)`,
                              borderRight: !isCurrentSegment ? `1px solid rgba(0,0,0,0.3)` : 'none',
                              boxShadow: isCurrentSegment
                                ? `inset 0 1px 0 rgba(255,255,255,0.15), inset -1px 0 0 ${phaseColor}80`
                                : 'inset 0 1px 0 rgba(255,255,255,0.1)',
                            }}
                            title={entry.stepName || statusByOrderIndex[entry.stepIndex]?.title || ''}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (isCurrentSegment) {
                                openLiveRoom(room.id);
                                return;
                              }
                              const historicalEnd = nextEntry?.startedAt ?? currentTime.toISOString();
                              openHistoricalPhase(room, history, idx, new Date(operationStart).toISOString(), historicalEnd, currentTime.toISOString());
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                event.stopPropagation();
                                if (isCurrentSegment) {
                                  openLiveRoom(room.id);
                                  return;
                                }
                                const historicalEnd = nextEntry?.startedAt ?? currentTime.toISOString();
                                openHistoricalPhase(room, history, idx, new Date(operationStart).toISOString(), historicalEnd, currentTime.toISOString());
                              }
                            }}
                          >
                          </div>
                        );
                      })}
                      {/* Šikmé šrafování přes část statusu ZA aktuálním časem —
                          jasně odlišuje plán/projekci od už proběhlé reality */}
                      {now < estimatedEndTime && (() => {
                        const nowPctInBar = ((now - operationStart) / totalDuration) * 100;
                        if (nowPctInBar >= 100) return null;
                        return (
                          <div
                            className="absolute top-0 bottom-0 right-0 z-10 pointer-events-none"
                            style={{
                              left: `${Math.max(0, nowPctInBar)}%`,
                              // Sdělení nese štítek uprostřed, ne textura přes celý řádek.
                              background: 'rgba(255,255,255,0.028)',
                            }}
                          />
                        );
                      })()}

                      {/* Animated edge glow on rightmost segment */}
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-px z-10"
                        style={{ 
                          background: `linear-gradient(to bottom, ${stepColor}80, ${stepColor}30)`,
                          boxShadow: `0 0 8px ${stepColor}50`,
                        }}
                      />
                      
                      {/* Patient called and arrived timeline markers */}
                      {room.patientCalledAt && (() => {
                        const calledTime = new Date(room.patientCalledAt).getTime();
                        const calledPct = ((calledTime - operationStart) / totalDuration) * 100;
                        if (calledPct < 0 || calledPct > 100) return null;
                        return (
                          <div
                            key="patient-called"
                            className="absolute bottom-0 h-1 w-px"
                            style={{
                              left: `${Math.max(0, calledPct)}%`,
                              background: 'rgba(34, 197, 94, 0.7)',
                              boxShadow: '0 0 4px rgba(34, 197, 94, 0.8)',
                            }}
                            title="Pacient volán"
                          />
                        );
                      })()}
                      
                      {room.patientArrivedAt && (() => {
                        const arrivedTime = new Date(room.patientArrivedAt).getTime();
                        const arrivedPct = ((arrivedTime - operationStart) / totalDuration) * 100;
                        if (arrivedPct < 0 || arrivedPct > 100) return null;
                        return (
                          <div
                            key="patient-arrived"
                            className="absolute bottom-0 h-1 w-px"
                            style={{
                              left: `${Math.max(0, arrivedPct)}%`,
                              background: 'rgba(6, 182, 212, 0.7)',
                              boxShadow: '0 0 4px rgba(6, 182, 212, 0.8)',
                            }}
                            title="Pacient v operačním traktu"
                          />
                        );
                      })()}
                    </div>
                  );
                }
                
                // Fallback: single color progress if no history
                const estimatedEndTimeFallback = room.estimatedEndTime
                  ? new Date(room.estimatedEndTime).getTime()
                  : operationStart + 120 * 60 * 1000;
                const effectiveEndTime = Math.max(estimatedEndTimeFallback, now);
                const totalDurationFallback = Math.max(1, effectiveEndTime - operationStart);
                const elapsed = now - operationStart;
                const progressPct = Math.min(100, Math.max(0, (elapsed / totalDurationFallback) * 100));

                return (
                  <div 
                    className="h-full relative w-full"
                    style={{
                      background: `linear-gradient(180deg, ${stepColor}50 0%, ${stepColor}25 100%)`,
                    }}
                  >
                    <div 
                      className="h-full relative"
                      style={{
                        width: `${progressPct}%`,
                        background: 'inherit',
                      }}
                    >
                      {/* Edge glow */}
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-px"
                        style={{ 
                          background: `linear-gradient(to bottom, ${stepColor}80, ${stepColor}30)`,
                          boxShadow: `0 0 8px ${stepColor}50`,
                        }}
                      />
                    </div>
                    
                    {/* Šikmé šrafování za aktuálním časem (fallback bez historie) */}
                    {progressPct < 100 && (
                      <div
                        className="absolute top-0 bottom-0 right-0 pointer-events-none"
                        style={{
                          left: `${Math.max(0, progressPct)}%`,
                          // Uzamčený sál nese sdělení štítek uprostřed, ne textura přes
                              // celý řádek. Husté šrafování překreslovalo celou šířku
                              // osy a působilo hlasitěji než probíhající výkony.
                              // Sdělení nese štítek uprostřed řádku, ne textura přes celou šířku osy.
                              background: 'rgba(255,255,255,0.026)',
                        }}
                      />
                    )}

                    {/* Patient called and arrived timeline markers - fallback */}
                    {room.patientCalledAt && (() => {
                      const calledTime = new Date(room.patientCalledAt).getTime();
                      const calledPct = ((calledTime - operationStart) / totalDurationFallback) * 100;
                      if (calledPct < 0 || calledPct > 100) return null;
                      return (
                        <div
                          key="patient-called-fb"
                          className="absolute bottom-0 h-1 w-px"
                          style={{
                            left: `${Math.max(0, calledPct)}%`,
                            background: 'rgba(34, 197, 94, 0.7)',
                            boxShadow: '0 0 4px rgba(34, 197, 94, 0.8)',
                          }}
                          title="Pacient volán"
                        />
                      );
                    })()}
                    
                    {room.patientArrivedAt && (() => {
                      const arrivedTime = new Date(room.patientArrivedAt).getTime();
                      const arrivedPct = ((arrivedTime - operationStart) / totalDurationFallback) * 100;
                      if (arrivedPct < 0 || arrivedPct > 100) return null;
                      return (
                        <div
                          key="patient-arrived-fb"
                          className="absolute bottom-0 h-1 w-px"
                          style={{
                            left: `${Math.max(0, arrivedPct)}%`,
                            background: 'rgba(6, 182, 212, 0.7)',
                            boxShadow: '0 0 4px rgba(6, 182, 212, 0.8)',
                          }}
                          title="Pacient v operačním traktu"
                        />
                      );
                    })()}
                  </div>
                );
              })()}
            </div>

            {/* Živý světelný přeliv přes aktivní lištu — jemně „dýchá",
                zdůrazňuje, že operace právě probíhá. */}
            {!room.isPaused && <div className="tl-shimmer" style={{ opacity: 0.5, zIndex: 2 }} />}

            {/* PAUZA jako samostatný úsek na ose — od začátku pauzy (pausedAt)
                do teď, cyan šrafování jako status. Když pausedAt chybí
                (starší data), zobrazí se přes celou lištu. */}
            {room.isPaused && (() => {
              const span = Math.max(1, endDate.getTime() - startDate.getTime());
              const ps = room.pausedAt ? new Date(room.pausedAt).getTime() : NaN;
              const hasStart = Number.isFinite(ps) && ps >= startDate.getTime();
              const l = hasStart ? Math.max(0, Math.min(100, ((ps - startDate.getTime()) / span) * 100)) : 0;
              const r = Math.max(0, Math.min(100, ((currentTime.getTime() - startDate.getTime()) / span) * 100));
              const w = hasStart ? Math.max(0.6, r - l) : 100;
              const pauseMins = hasStart ? Math.round((currentTime.getTime() - ps) / 60000) : 0;
              return (
                <div
                  className="absolute top-0 bottom-0 z-[6] pointer-events-none flex items-center justify-center overflow-hidden"
                  title={pauseMins > 0 ? `Pauza · ${pauseMins} min` : 'Pauza'}
                  style={{
                    left: `${l}%`,
                    width: `${w}%`,
                    // Plná barva pauzy (cyan) — čte se jako barevný status na ose.
                    background: `linear-gradient(180deg, ${C.cyan}55 0%, ${C.cyan}2e 100%)`,
                    borderLeft: hasStart ? `1.5px solid ${C.cyan}d9` : 'none',
                    boxShadow: hasStart ? `inset 6px 0 12px -6px ${C.cyan}99` : `inset 0 0 0 1.5px ${C.cyan}80`,
                  }}
                >
                  {/* Jemný živý přeliv, ať je úsek pauzy „živý" jako ostatní statusy */}
                  <div className="tl-shimmer" style={{ opacity: 0.35 }} />
                  {/* Délka pauzy v minutách — v duchu značení prostojů */}
                  {w > 2.6 && pauseMins > 0 && (
                    <span className="relative text-[9px] font-bold tabular-nums whitespace-nowrap px-1 rounded flex items-center gap-0.5" style={{ color: '#0B2027', background: `${C.cyan}e6` }}>
                      <Pause className="w-2.5 h-2.5" fill="#0B2027" /> {pauseMins}m
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Skluz (overrun) — úsek lišty za odhadovaným koncem operace.
                Standard světových OR systémů: okamžitě viditelné překročení
                plánovaného času (červené šrafování + přerušovaná hranice). */}
            {(() => {
              if (!room.estimatedEndTime || room.isPaused) return null;
              const estMs = new Date(room.estimatedEndTime).getTime();
              if (!Number.isFinite(estMs)) return null;
              const overrunMs = currentTime.getTime() - estMs;
              if (overrunMs < 5 * 60 * 1000 || !warnings.some(warning => warning.type === 'overdue')) return null;
              const startMs = startDate.getTime();
              const span = Math.max(1, endDate.getTime() - startMs);
              const leftPct = Math.max(0, Math.min(100, ((estMs - startMs) / span) * 100));
              const overrunMins = Math.round(overrunMs / 60000);
              const overrunW = 100 - leftPct;
              return (
                <div
                  className="absolute top-0 bottom-0 right-0 z-[6] pointer-events-none rounded-r-[5px] overflow-hidden flex items-center justify-center"
                  title={`Překročený odhad konce · +${overrunMins} min`}
                  style={{
                    left: `${leftPct}%`,
                    background: `${C.red}14`,
                    borderLeft: `1.5px dashed ${C.red}b0`,
                    boxShadow: `inset 0 0 12px ${C.red}25`,
                  }}
                >
                  {overrunW > 3.2 && (
                    <span className="text-[9px] font-bold tabular-nums whitespace-nowrap px-1 rounded" style={{ color: '#fff', background: `${C.red}d9` }}>+{overrunMins}m</span>
                  )}
                </div>
              );
            })()}

            {/* Content overlay - Premium card content */}
            {(() => {
              const showRightBadge = !room.isPaused && boxWidthPct > 18 && remainingTime && stepIndex !== 0;
              return (
            <div className={`absolute inset-0 flex items-center pointer-events-none z-10 pl-5 pr-4 ${showRightBadge ? 'pr-20' : ''}`}>
              {room.isPaused ? (
                /* Pause state - Premium */
                <div className="min-w-0 flex-1 flex items-center gap-3">
                  {boxWidthPct > 5 && (
                    <motion.div 
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ 
                        background: `linear-gradient(135deg, ${C.cyan}30 0%, ${C.cyan}15 100%)`,
                        border: `1px solid ${C.cyan}40`,
                      }}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Pause className="w-4 h-4" style={{ color: C.cyan }} />
                    </motion.div>
                  )}
                  {boxWidthPct > 12 && (
                    <div className="flex flex-col min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: C.cyan }}>
                        PAUZA
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Normal state - Premium card layout */
                <div className="min-w-0 flex-1 flex items-center gap-4">
                  
                  {/* Card content */}
                  {boxWidthPct > 10 && (
                    <div className="min-w-0 flex-1 flex flex-col">
                      {/* Title only */}
                      <div className="flex items-center gap-2">
                        <p className="timeline-operation-label text-xs font-bold truncate">
                          {stepName}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Time info on right - Premium pill (červená při skluzu) */}
                  {showRightBadge && (() => {
                    const isOverrun = remainingTime.startsWith('-');
                    return (
                    <motion.div
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg"
                      style={{
                        background: isOverrun
                          ? `linear-gradient(135deg, ${C.red}2a 0%, ${C.red}12 100%)`
                          : `linear-gradient(135deg, ${C.bgSurface} 0%, rgba(0,0,0,0.3) 100%)`,
                        border: isOverrun ? `1px solid ${C.red}60` : `1px solid ${C.border}`,
                        boxShadow: isOverrun ? `0 0 10px ${C.red}30` : undefined,
                      }}
                      animate={isOverrun ? { opacity: [0.85, 1, 0.85] } : undefined}
                      transition={isOverrun ? { duration: 1.6, repeat: Infinity } : undefined}
                    >
                      <p
                        className="text-[11px] font-mono font-medium"
                        style={{ color: isOverrun ? '#FCA5A5' : 'rgba(255,255,255,0.8)' }}
                      >
                        {isOverrun ? `přesah ${remainingTime.slice(1)}` : remainingTime}
                      </p>
                    </motion.div>
                    );
                  })()}
                </div>
              )}
            </div>
              );
            })()}
          </motion.div>
        )}

        {/* Stejná dvouřádková karta pro každý stav; tenká linka kóduje
            množství dosud nevyužité pracovní doby. */}
        {availabilityBadge}

        {/* Room-specific end of working hours indicator */}
        {(() => {
          const schedule = room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
          const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
          const todayKey = dayKeys[currentTime.getDay()];
          const todaySchedule = schedule[todayKey];
          
          if (!todaySchedule.enabled) return null;
          
          // Calculate end time as minutes from timeline start (7:00)
          const endHour = todaySchedule.endHour;
          const endMinute = todaySchedule.endMinute;
          let minutesFromTimelineStart = (endHour * 60 + endMinute) - (TIMELINE_START_HOUR * 60);
          // If before 7:00, it's next day portion
          if (minutesFromTimelineStart < 0) {
            minutesFromTimelineStart += 24 * 60;
          }
          const endPercent = (minutesFromTimelineStart / (TIMELINE_HOURS * 60)) * 100;
          const isNextDayEnd = endHour >= 0 && endHour < TIMELINE_START_HOUR;
          
          // Značka konce pracovní doby sálu (working-hours hranice).
          // Barva NEZÁVISÍ na aktuálním statusu — má vlastní oranžovou identitu,
          // aby byla na časové ose okam��itě rozpoznatelná např��č sály a statusy.
          return (
            <>
            <div
              className="absolute top-0 bottom-0 z-20 group/eohours"
              style={{ left: `${endPercent}%` }}
            >
              {/* Jemná přerušovaná čára — značka konce provozní doby sálu.
                  Decentní amber, aby nepřebíjela statusy ani časovou osu. */}
              <div
                className="absolute inset-y-0 left-0 w-px"
                style={{
                  backgroundImage: 'repeating-linear-gradient(to bottom, rgba(54,217,236,0.55) 0px, rgba(54,217,236,0.55) 4px, transparent 4px, transparent 9px)',
                }}
              />
              {/* Kompaktní amber chip s časem.
                  Aby nevznikal sloupec identických chipů přes všechny
                  řádky, zobrazujeme čas trvale jen na PRVNÍM řádku;
                  na ostatních se odhalí při najetí myší na čáru
                  (čára „konec provozní doby" zůstává na každém řádku). */}
              {/* Čas konce směny viditelný na KAŽDÉM řádku (dle referenčního designu) */}
              {roomIndex === 0 && (
                <div
                  className="absolute top-0.5 left-0 -translate-x-1/2 px-1 py-px rounded-[4px] text-[8px] font-semibold font-mono tabular-nums whitespace-nowrap leading-none opacity-90"
                  style={{
                    background: 'rgba(54, 217, 236, 0.10)',
                    border: '1px solid rgba(54, 217, 236, 0.30)',
                    color: 'rgba(178, 235, 244, 0.95)',
                  }}
                >
                  {todaySchedule.endHour.toString().padStart(2, '0')}:{todaySchedule.endMinute.toString().padStart(2, '0')}
                </div>
              )}
            </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
