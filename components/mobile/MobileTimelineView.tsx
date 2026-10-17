'use client';

import React, { useId, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, LocateFixed } from 'lucide-react';
import type { OperatingRoom } from '../../types';
import type { CurrentRoomSpecialty } from '../../lib/room-specialty';
import { describeTimelineOperationalWarning, type TimelineOperationalWarning } from '../../lib/timeline-operational-warnings';
import { calculateUnusedOperatingMinutes } from '../../lib/timeline-unused-minutes';
import { mobileRoomPhase } from '../../lib/mobile-room-display';
import { getMobileRoomSegments, getMobileTimelineWindow, type MobileTimelineStatus } from '../../lib/mobile-timeline';
import { MobileModuleHeader, MobilePillTabs } from './MobileShell';
import type { AcuteRequest } from '../../lib/acute-requests';
import { findAcuteCycleLink, type AcuteCycleLink } from '../../lib/acute-cycle-links';
import { useAcuteCycleLinks } from '../../hooks/useAcuteCycleLinks';
import { CompletedAcuteCycleLabel, completedAcuteCycleDescription } from '../timeline/CompletedAcuteCycleLabel';
import { AcuteProposalLane, AcuteTimelineSummary, acuteProposalsForWindow } from '../timeline/AcuteProposalLane';
import './mobile-timeline.css';
import './mobile-timeline-orbit.css';

interface Props {
  rooms: OperatingRoom[];
  currentSpecialties: Map<string, CurrentRoomSpecialty[]>;
  activeStatuses: MobileTimelineStatus[];
  currentTime: Date;
  stats: { operations: number; cleaning: number; free: number; completed: number; emergencyCount: number };
  warningsByRoom?: ReadonlyMap<string, TimelineOperationalWarning[]>;
  onSelectRoom: (room: OperatingRoom) => void;
  acuteRequests?: readonly AcuteRequest[];
  acuteCycleLinks?: readonly AcuteCycleLink[];
  acuteEnabled?: boolean;
  acuteError?: string | null;
  acuteLoading?: boolean;
  onOpenAcuteRequests?: () => void;
  onOpenAcuteRoom?: (request: AcuteRequest) => void;
}

const formatTime = (ms: number) => new Date(ms).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
const formatDate = (ms: number) => new Date(ms).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });

/** All rooms share a compact axis; short screens retain vertical access to every room. */
export default function MobileTimelineView({ rooms, currentSpecialties, activeStatuses, currentTime, stats, warningsByRoom, onSelectRoom,
  acuteRequests = [], acuteCycleLinks = [], acuteEnabled = false, acuteError, acuteLoading, onOpenAcuteRequests, onOpenAcuteRoom }: Props) {
  const [scale, setScale] = useState<'2' | '4' | 'day'>('4');
  const [timeOffset, setTimeOffset] = useState(0);
  const descriptionId = useId();
  const nowMs = currentTime.getTime();
  // Keep a browsed window stable while the live clock continues ticking.
  const [browsingAnchor, setBrowsingAnchor] = useState<number | null>(null);
  const window = useMemo(() => getMobileTimelineWindow(
    browsingAnchor ?? nowMs, scale === 'day' ? 'day' : Number(scale) as 2 | 4, timeOffset,
  ), [browsingAnchor, nowMs, scale, timeOffset]);
  const browsedAcuteCycles = useAcuteCycleLinks(acuteEnabled, window);
  const links = useMemo(() => acuteEnabled ? [...new Map([...acuteCycleLinks, ...browsedAcuteCycles.links]
    .map(link => [link.requestId, link])).values()] : [], [acuteEnabled, acuteCycleLinks, browsedAcuteCycles.links]);
  const proposedRequests = useMemo(() => {
    const linkedRequestIds = new Set(links.map(link => link.requestId));
    return acuteRequests.filter(request => !linkedRequestIds.has(request.id));
  }, [acuteRequests, links]);
  const span = window.endMs - window.startMs;
  const nowPct = (nowMs - window.startMs) / span * 100;
  const showNow = nowPct >= 0 && nowPct <= 100;
  const ticks = Array.from({ length: 5 }, (_, index) => ({ percent: index * 25, ms: window.startMs + span * index / 4 }));

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
      <div className="mtl-controls">
        <MobilePillTabs tabs={[{ id: '2', label: '2 h' }, { id: '4', label: '4 h' }, { id: 'day', label: 'Den' }]}
          value={scale} onChange={value => { setScale(value); goNow(); }} className="mtl-scales" />
        <button type="button" className="mtl-now" onClick={goNow} aria-label="Zobrazit aktuální čas"><LocateFixed size={17} aria-hidden /><span>Teď</span></button>
      </div>
      {acuteEnabled && <AcuteTimelineSummary mobile count={proposedRequests.length}
        unassignedCount={proposedRequests.filter(request => !request.proposedRoomId).length}
        error={acuteError} loading={acuteLoading} onOpen={onOpenAcuteRequests} />}
      <section className="mtl-axis" aria-label="Časová osa provozu">
        <header className="mtl-axis-heading">
          <div><h2>{rangeLabel}</h2><p className="mtl-room-count" role="status">Všechny sály · {rooms.length}</p><span className="mtl-range-announcement" role="status">Časový úsek {formatTime(window.startMs)} až {formatTime(window.endMs)}</span></div>
          <div className="mtl-time-pager" role="group" aria-label="Posun časové osy">
            <button type="button" onClick={() => moveTime(-1)} aria-label="Předchozí časový úsek"><ChevronLeft size={19} aria-hidden /></button>
            <button type="button" onClick={() => moveTime(1)} aria-label="Následující časový úsek"><ChevronRight size={19} aria-hidden /></button>
          </div>
        </header>
        <div className="mtl-ruler" aria-label={`${formatTime(window.startMs)} až ${formatTime(window.endMs)}`}>
          {ticks.map((tick, index) => <time key={index} dateTime={new Date(tick.ms).toISOString()} style={{ left: `${tick.percent}%` }} data-edge={index === 0 ? 'start' : index === 4 ? 'end' : undefined}>{formatTime(tick.ms)}</time>)}
        </div>
        <div className="mtl-rows">
          {rooms.map(room => {
            const phase = mobileRoomPhase(room, activeStatuses);
            const segments = getMobileRoomSegments(room, activeStatuses, nowMs, window);
            const completedAcuteCycles = (room.completedOperations ?? []).flatMap(cycle => {
              const link = findAcuteCycleLink(links, room.id, cycle.startedAt, cycle.endedAt);
              const startMs = Date.parse(cycle.startedAt);
              const endMs = Date.parse(cycle.endedAt);
              if (!link || endMs > nowMs || endMs <= window.startMs || startMs >= window.endMs) return [];
              const clippedStart = Math.max(window.startMs, startMs);
              const clippedEnd = Math.min(window.endMs, endMs);
              return [{ link, leftPct: (clippedStart - window.startMs) / span * 100,
                widthPct: (clippedEnd - clippedStart) / span * 100 }];
            });
            const acuteDescriptions = completedAcuteCycles.map(({ link }) => completedAcuteCycleDescription(link)).join('. ');
            const specialtyLabel = currentSpecialties.get(room.id)?.map(specialty => specialty.name).join(', ');
            const warnings = warningsByRoom?.get(room.id) ?? [];
            const visibleWarnings = warnings.filter(warning => warning.type === 'schedule_collision');
            const featuredWarning = visibleWarnings[0];
            const unusedMinutes = calculateUnusedOperatingMinutes(room, currentTime);
            const unusedDescription = unusedMinutes === null
              ? 'Nevyužité minuty nelze určit: pro dnešek není nastavena platná pracovní doba sálu.'
              : `${unusedMinutes} nevyužitých minut v dosud uplynulé nastavené pracovní době sálu, po zohlednění přestávky. Zahrnuje čas bez zaznamenaného operačního cyklu.`;
            const doctorAssigned = Boolean(room.staff?.doctor?.name?.trim());
            const nurseAssigned = Boolean(room.staff?.nurse?.name?.trim());
            const teamSummary = `ARO lékař: ${doctorAssigned ? 'vyplněno' : 'nevyplněno'}; ARO sestra: ${nurseAssigned ? 'vyplněno' : 'nevyplněno'}`;
            return (
              <React.Fragment key={room.id}>
              <button type="button" key={room.id} className="mtl-row" onClick={() => onSelectRoom(room)}
                aria-label={`${room.name}, nyní ${phase.title}${specialtyLabel ? `, ${specialtyLabel}` : ''}. ${unusedDescription} ${teamSummary}.${visibleWarnings.length ? ` Upozornění: ${visibleWarnings.map(describeTimelineOperationalWarning).join('; ')}.` : ''}${acuteDescriptions ? ` ${acuteDescriptions}.` : ''} Otevřít detail sálu.`}
                aria-describedby={`${descriptionId}-${room.id}`}>
                <span className="mtl-row-heading">
                  <strong title={room.name}>{room.name}</strong>
                  <span className="mtl-row-status">
                    <span className="mtl-status-line">
                      <span className="mtl-phase" title={`Aktuální stav: ${phase.title}`}><i style={{ background: phase.color }} aria-hidden /><span className="sr-only">{phase.title}</span></span>
                      <span className="mtl-team-dots" title={teamSummary} aria-hidden="true">
                        <i data-team-role="doctor" data-team-assigned={doctorAssigned} />
                        <i data-team-role="nurse" data-team-assigned={nurseAssigned} />
                      </span>
                    </span>
                    {featuredWarning && <span className="mtl-warning-chip" data-kind="schedule_collision" aria-hidden="true">
                      !
                    </span>}
                  </span>
                </span>
                <span className="mtl-track" aria-hidden>
                  {ticks.map((tick, index) => <span key={index} className="mtl-gridline" style={{ left: `${tick.percent}%` }} />)}
                  {segments.map(segment => <span key={segment.key} className="mtl-segment" data-kind={segment.kind}
                    title={`${segment.label} · ${formatTime(segment.startMs)}–${formatTime(segment.endMs)}`}
                    style={{ left: `${segment.leftPct}%`, width: `${segment.widthPct}%`, '--segment-color': segment.color } as React.CSSProperties} />)}
                  {completedAcuteCycles.map(({ link, leftPct, widthPct }) => <span key={link.requestId}
                    className="mtl-completed-acute-cycle" style={{ left: `${leftPct}%`, width: `${widthPct}%` }}>
                    <CompletedAcuteCycleLabel link={link} mobile />
                  </span>)}
                  {segments.length === 0 && <span className="mtl-no-record" title="Bez záznamu v tomto úseku">—</span>}
                  {showNow && <span className="mtl-now-line" style={{ left: `${nowPct}%` }} />}
                </span>
                <span id={`${descriptionId}-${room.id}`} className="sr-only">{segments.map(segment => `${segment.label}: ${formatTime(segment.startMs)} až ${formatTime(segment.endMs)}`).join('. ') || 'Bez záznamu v tomto časovém úseku.'}</span>
              </button>
              {acuteEnabled && !acuteError && acuteProposalsForWindow(proposedRequests, room.id, window.startMs, window.endMs).map(proposal => (
                <AcuteProposalLane key={proposal.request.id} mobile proposal={proposal} roomName={room.name}
                  roomWarning={room.isEmergency ? 'Sál ve stavu nouze' : room.isLocked ? 'Sál uzamčen' : undefined}
                  onOpen={onOpenAcuteRoom ? () => onOpenAcuteRoom(proposal.request) : onOpenAcuteRequests} />
              ))}
              </React.Fragment>
            );
          })}
          {rooms.length === 0 && <div className="mtl-empty" role="status"><strong>Žádné operační sály</strong><span>Pro toto zařízení zatím není co zobrazit.</span></div>}
        </div>
        <div className="mtl-legend" aria-label="Legenda časové osy"><span><i />Průběh</span><span><i data-kind="estimate" />Odhad</span><span><i data-kind="now" />Teď {formatTime(nowMs)}</span></div>
        <span className="sr-only">{stats.operations + stats.cleaning} aktivních sálů, {stats.free} připravených, {stats.completed} dokončených výkonů, {stats.emergencyCount} stavů nouze.</span>
      </section>
    </section>
  );
}
