'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BedDouble,
  BellRing,
  Building2,
  CalendarDays,
  Check,
  CircleCheck,
  Clock3,
  Cuboid,
  Focus,
  LayoutGrid,
  ListChecks,
  Map as MapIcon,
  Timer,
  UsersRound,
  X,
} from 'lucide-react';
import type { OperatingRoom } from '../../types';
import { useSpatialProject } from '../../hooks/useSpatialProject';
import { useOperationalDayWindow } from '../../hooks/useOperationalDayWindow';
import { useNowMinuteMs } from '../../hooks/useSharedClock';
import { useWorkflowStatusesContext, type WorkflowStatus } from '../../contexts/WorkflowStatusesContext';
import { useHospital } from '../../contexts/HospitalContext';
import { DashboardViewer } from '../../vendor/orms-spatial-editor/src/dashboard-viewer.js';
import type { BuildingProject } from '../../lib/spatial-project';
import SpatialLoadingBar from './SpatialLoadingBar';

type CameraMode = 'spatial' | 'plan';

const READY_STEPS = new Set([0, 7]);
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 23;

// currentStepIndex je pozice ve filtrovaném seznamu aktivních kroků workflow.
// Nesmí se porovnávat s order_index: po skrytí nebo deaktivaci kroku se tyto
// hodnoty mohou lišit a 3D sál by pak dostal barvu jiné fáze.
const workflowStatusAt = (statuses: readonly WorkflowStatus[], index: number) => {
  const position = Math.trunc(index);
  if (!Number.isFinite(position) || position < 0) return undefined;
  return statuses[position];
};

const roomTone = (room?: OperatingRoom) => {
  if (!room) return { key: 'unlinked', color: '#7E8AA5', label: 'Bez propojení' };
  if (room.isEmergency) return { key: 'emergency', color: '#FB7185', label: 'Emergency' };
  if (room.isLocked) return { key: 'locked', color: '#FACC15', label: 'Uzamčeno' };
  if (room.isPaused) return { key: 'paused', color: '#22D3EE', label: 'Pauza' };
  if (READY_STEPS.has(room.currentStepIndex)) return { key: 'ready', color: '#2DD4BF', label: 'Sál připraven' };
  return { key: 'active', color: '#6A8DFF', label: 'Probíhá výkon' };
};

const isOperationalTone = (tone: ReturnType<typeof roomTone>) => tone.key === 'active' || tone.key === 'paused';

const formatClock = (value?: string | number | Date | null) => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
};

const formatElapsed = (start?: string | null, now = Date.now()) => {
  if (!start) return '00:00';
  const startMs = new Date(start).getTime();
  if (!Number.isFinite(startMs)) return '00:00';
  const totalMinutes = Math.max(0, Math.floor((now - startMs) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const staffCount = (room: OperatingRoom) => [
  room.staff?.doctor?.name,
  room.staff?.nurse?.name,
  room.staff?.anesthesiologist?.name,
].filter(Boolean).length;

const SpatialCanvas = React.memo(function SpatialCanvas({
  project,
  floorId,
  cameraMode,
  roomsById,
  statusColorByRoomId,
  fitSignal,
  selectedSpatialRoomId,
  onSelect,
}: {
  project: BuildingProject;
  floorId: string;
  cameraMode: CameraMode;
  roomsById: Map<string, OperatingRoom>;
  statusColorByRoomId: Map<string, string>;
  fitSignal: number;
  selectedSpatialRoomId: string | null;
  onSelect: (spatialRoomId: string) => void;
}) {
  const roomVisuals = useMemo(() => new Map(project.rooms.filter((room) => room.floorId === floorId).map((spatialRoom) => {
    const applicationRoom = spatialRoom.externalId ? roomsById.get(spatialRoom.externalId) : undefined;
    const tone = roomTone(applicationRoom);
    return [spatialRoom.id, {
      statusColor: applicationRoom && tone.key !== 'ready' && tone.key !== 'unlinked' ? statusColorByRoomId.get(applicationRoom.id) || tone.color : null,
      active: isOperationalTone(tone),
    }] as const;
  })), [floorId, project.rooms, roomsById, statusColorByRoomId]);
  const hostRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<DashboardViewer | null>(null);
  const selectRef = useRef(onSelect);
  const selectedRoomRef = useRef(selectedSpatialRoomId);
  const roomVisualsRef = useRef(roomVisuals);
  const cameraModeRef = useRef(cameraMode);
  const [sceneProgress, setSceneProgress] = useState(70);
  const [sceneReady, setSceneReady] = useState(false);
  selectRef.current = onSelect;
  selectedRoomRef.current = selectedSpatialRoomId;
  roomVisualsRef.current = roomVisuals;
  cameraModeRef.current = cameraMode;

  useEffect(() => {
    if (!hostRef.current || !labelsRef.current) return;
    const viewer = new DashboardViewer(hostRef.current, labelsRef.current, (roomId) => selectRef.current(roomId));
    viewerRef.current = viewer;
    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    let cancelled = false;
    const frames: number[] = [];
    const schedule = (callback: () => void) => {
      frames.push(requestAnimationFrame(() => {
        if (!cancelled) callback();
      }));
    };

    setSceneReady(false);
    setSceneProgress(72);
    // Dva snímky nechají prohlížeč nejprve vykreslit loader. Sestavení scény
    // je pak synchronní, ale díky sdílené geometrii trvá jen zlomek původního času.
    schedule(() => {
      setSceneProgress(80);
      schedule(() => {
        void viewer.setProject(
          project,
          floorId,
          selectedRoomRef.current,
          roomVisualsRef.current,
          (loaded, total) => {
            if (!cancelled) setSceneProgress(82 + Math.round((loaded / Math.max(1, total)) * 14));
          },
        ).then(() => {
          if (cancelled) return;
          setSceneProgress(97);
          schedule(() => {
            viewer.fit(cameraModeRef.current === 'plan');
            setSceneProgress(100);
            schedule(() => setSceneReady(true));
          });
        });
      });
    });

    return () => {
      cancelled = true;
      frames.forEach(cancelAnimationFrame);
    };
  }, [floorId, project]);

  useEffect(() => {
    viewerRef.current?.setSelectedRoom(selectedSpatialRoomId);
  }, [selectedSpatialRoomId]);

  useEffect(() => {
    viewerRef.current?.setRoomVisuals(roomVisuals);
  }, [roomVisuals]);

  useEffect(() => {
    const labels = labelsRef.current;
    if (!labels) return;
    for (const element of Array.from(labels.querySelectorAll<HTMLButtonElement>('button[data-room]'))) {
      const spatialRoom = project.rooms.find((room) => room.id === element.dataset.room);
      const applicationRoom = spatialRoom?.externalId ? roomsById.get(spatialRoom.externalId) : undefined;
      const tone = roomTone(applicationRoom);
      const statusColor = applicationRoom ? statusColorByRoomId.get(applicationRoom.id) || tone.color : tone.color;
      const selected = spatialRoom?.id === selectedSpatialRoomId;
      element.dataset.state = tone.key;
      element.dataset.active = String(isOperationalTone(tone));
      element.dataset.selected = String(selected);
      element.style.setProperty('--spatial-room-color', statusColor);
      element.setAttribute('aria-pressed', String(selected));
      element.title = applicationRoom ? `${applicationRoom.name} · ${tone.label}` : `${spatialRoom?.name || 'Místnost'} · Bez propojení`;
    }
  }, [floorId, project, roomsById, selectedSpatialRoomId, statusColorByRoomId]);

  useEffect(() => {
    viewerRef.current?.fit(cameraMode === 'plan');
  }, [cameraMode, fitSignal]);

  return (
    <div className="spatial-dashboard-canvas absolute inset-0">
      <div ref={hostRef} className="absolute inset-0" />
      <div ref={labelsRef} className="spatial-dashboard-labels pointer-events-none absolute inset-0" />
      {!sceneReady && <SpatialLoadingBar label="Sestavuji 3D dispozici" progress={sceneProgress} overlay />}
    </div>
  );
});

function IconControl({ active, label, children, onClick }: {
  active?: boolean;
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`spatial-icon-control ${active ? 'is-active' : ''}`}
    >
      {children}
    </button>
  );
}

function MetricTile({ icon, label, value, suffix }: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  suffix?: React.ReactNode;
}) {
  return (
    <div className="spatial-summary-card spatial-metric-card">
      <p>{label}</p>
      <div className="spatial-metric-value">
        <span className="spatial-metric-icon">{icon}</span>
        <strong>{value}</strong>
        {suffix && <span>{suffix}</span>}
      </div>
    </div>
  );
}

function ProgramOverview({ rooms, start, end, now }: {
  rooms: OperatingRoom[];
  start: number;
  end: number;
  now: number;
}) {
  const visibleRooms = useMemo(() => {
    const withActivity = rooms.filter((room) => {
      const completed = room.completedOperations?.some((operation) => {
        const endedAt = new Date(operation.endedAt).getTime();
        return endedAt >= start && endedAt <= end;
      });
      return completed || Boolean(room.operationStartedAt && !READY_STEPS.has(room.currentStepIndex));
    });
    const ordered = [...withActivity, ...rooms.filter((room) => !withActivity.includes(room))];
    return ordered.slice(0, 6);
  }, [end, rooms, start]);

  const rangeStart = new Date(start);
  rangeStart.setHours(DAY_START_HOUR, 0, 0, 0);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setHours(DAY_END_HOUR, 0, 0, 0);
  const rangeStartMs = rangeStart.getTime();
  const rangeMs = Math.max(1, rangeEnd.getTime() - rangeStartMs);
  const position = (value: number) => Math.max(0, Math.min(100, ((value - rangeStartMs) / rangeMs) * 100));
  const nowPosition = position(now);

  return (
    <div className="spatial-summary-card spatial-program-card">
      <div className="spatial-program-heading">
        <div>
          <p>Dnešní program</p>
          <span>{visibleRooms.length} zobrazených sálů</span>
        </div>
        <ListChecks className="h-4 w-4 text-white/38" strokeWidth={1.7} />
      </div>
      <div className="spatial-program-axis" aria-hidden>
        {[8, 10, 12, 14, 16, 18, 20, 22].map((hour) => (
          <span key={hour} style={{ left: `${((hour - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR)) * 100}%` }}>{String(hour).padStart(2, '0')}:00</span>
        ))}
      </div>
      <div className="spatial-program-grid">
        <div className="spatial-program-now" style={{ left: `${nowPosition}%` }} aria-hidden />
        {visibleRooms.map((room) => {
          const segments = (room.completedOperations || []).flatMap((operation) => {
            const segmentStart = new Date(operation.startedAt).getTime();
            const segmentEnd = new Date(operation.endedAt).getTime();
            if (!Number.isFinite(segmentStart) || !Number.isFinite(segmentEnd) || segmentEnd < rangeStartMs || segmentStart > rangeEnd.getTime()) return [];
            return [{ start: Math.max(segmentStart, rangeStartMs), end: Math.min(segmentEnd, rangeEnd.getTime()), current: false }];
          });
          if (room.operationStartedAt && !READY_STEPS.has(room.currentStepIndex)) {
            const operationStart = new Date(room.operationStartedAt).getTime();
            const estimatedEnd = room.estimatedEndTime ? new Date(room.estimatedEndTime).getTime() : now + 60 * 60_000;
            if (Number.isFinite(operationStart)) segments.push({ start: Math.max(operationStart, rangeStartMs), end: Math.min(Math.max(estimatedEnd, now), rangeEnd.getTime()), current: true });
          }
          return (
            <div className="spatial-program-row" key={room.id}>
              <span title={room.name}>{room.name}</span>
              <div>
                {segments.map((segment, index) => (
                  <i
                    key={`${room.id}-${index}`}
                    className={segment.current ? 'is-current' : ''}
                    style={{ left: `${position(segment.start)}%`, width: `${Math.max(1.5, position(segment.end) - position(segment.start))}%` }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoomDetailPanel({ room, phaseName, phaseColor, progress, now, onClose, onOpen }: {
  room: OperatingRoom;
  phaseName: string;
  phaseColor: string;
  progress: number;
  now: number;
  onClose: () => void;
  onOpen: () => void;
}) {
  const elapsedStart = room.operationStartedAt || room.phaseStartedAt;
  const team = staffCount(room);
  const nextTime = room.estimatedEndTime
    ? formatClock(new Date(new Date(room.estimatedEndTime).getTime() + 20 * 60_000))
    : '—';
  return (
    <aside className="spatial-room-panel" aria-label={`Detail ${room.name}`}>
      <div className="spatial-room-panel-heading">
        <div>
          <h2>{room.name}</h2>
          <p><i style={{ backgroundColor: phaseColor }} />{phaseName}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Zavřít detail vybraného sálu"><X className="h-4 w-4" /></button>
      </div>

      <div className="spatial-room-progress">
        <div><span style={{ width: `${progress}%` }} /></div>
        <p><span>{formatElapsed(room.phaseStartedAt, now)}</span><span>{room.estimatedEndTime ? formatClock(room.estimatedEndTime) : '—'}</span></p>
      </div>

      <div className="spatial-room-info-grid">
        <div>
          <p><Timer />Uplynulý čas</p>
          <strong>{formatElapsed(elapsedStart, now)}</strong>
          <span>{elapsedStart ? `Od ${formatClock(elapsedStart)}` : 'Výkon nezahájen'}</span>
        </div>
        <div>
          <p><Clock3 />Odhad konce</p>
          <strong>{formatClock(room.estimatedEndTime)}</strong>
          <span>{room.estimatedEndTime ? 'Dle aktuálního plánu' : 'Bez odhadu'}</span>
        </div>
        <div>
          <p><UsersRound />Tým na sále</p>
          <strong>{team} <small>/ 3</small></strong>
          <span>{team >= 3 ? 'Kompletní' : 'Čeká na doplnění'}</span>
        </div>
        <div>
          <p><CalendarDays />Další výkon</p>
          <strong>{room.queueCount > 0 ? nextTime : '—'}</strong>
          <span>{room.queueCount > 0 ? `${room.queueCount} v pořadí` : 'Program dokončen'}</span>
        </div>
      </div>

      <button type="button" className="spatial-open-room" onClick={onOpen}>
        <span>Otevřít detail sálu</span>
        <ArrowRight className="h-5 w-5" strokeWidth={1.8} />
      </button>
    </aside>
  );
}

export default function SpatialDashboardView({ rooms, onSelectRoom, onSwitchToCards }: {
  rooms: OperatingRoom[];
  onSelectRoom: (roomId: string) => void;
  onSwitchToCards: () => void;
}) {
  const { project, isLoading, error } = useSpatialProject(rooms);
  const { activeHospital } = useHospital();
  const { workflowStatuses } = useWorkflowStatusesContext();
  const operationalWindow = useOperationalDayWindow();
  // V této obrazovce se všechny časové hodnoty zobrazují po minutách. Díky
  // minutovému odběru se celý 3D dashboard nepřekresluje každou sekundu.
  const nowMs = useNowMinuteMs();
  const nowDate = useMemo(() => new Date(nowMs), [nowMs]);
  const [floorId, setFloorId] = useState(project.floors[0]?.id || '');
  const [cameraMode, setCameraMode] = useState<CameraMode>('spatial');
  const [fitSignal, setFitSignal] = useState(0);
  const [selectedSpatialRoomId, setSelectedSpatialRoomId] = useState<string | null>(null);
  const [selectionDismissed, setSelectionDismissed] = useState(false);
  const roomsById = useMemo(() => new Map(rooms.map((room) => [room.id, room])), [rooms]);
  const statusColorByRoomId = useMemo(() => new Map(rooms.map((room) => {
    const status = workflowStatusAt(workflowStatuses, room.currentStepIndex);
    const color = room.isEmergency ? '#FB7185'
      : room.isLocked ? '#FACC15'
        : room.isPaused ? '#22D3EE'
          : status?.accent_color || roomTone(room).color;
    return [room.id, color] as const;
  })), [rooms, workflowStatuses]);

  const spatialRooms = useMemo(() => project.rooms.filter((room) => room.floorId === floorId && room.type === 'operating'), [floorId, project.rooms]);

  useEffect(() => {
    if (!project.floors.some((floor) => floor.id === floorId)) setFloorId(project.floors[0]?.id || '');
  }, [floorId, project.floors]);

  useEffect(() => {
    const selectedStillVisible = spatialRooms.some((room) => room.id === selectedSpatialRoomId);
    if (selectedStillVisible) return;
    if (selectionDismissed) return;
    const activeSpatialRoom = spatialRooms.find((spatialRoom) => {
      const room = spatialRoom.externalId ? roomsById.get(spatialRoom.externalId) : undefined;
      return room && isOperationalTone(roomTone(room));
    });
    const linkedRooms = spatialRooms.filter((room) => room.externalId);
    setSelectedSpatialRoomId(activeSpatialRoom?.id || linkedRooms[1]?.id || linkedRooms[0]?.id || null);
  }, [roomsById, selectedSpatialRoomId, selectionDismissed, spatialRooms]);

  const selectedSpatialRoom = spatialRooms.find((room) => room.id === selectedSpatialRoomId);
  const selectedRoom = selectedSpatialRoom?.externalId ? roomsById.get(selectedSpatialRoom.externalId) : undefined;
  const selectSpatialRoom = useCallback((spatialRoomId: string) => {
    setSelectionDismissed(false);
    setSelectedSpatialRoomId(spatialRoomId);
  }, []);

  const statusCounts = useMemo(() => {
    const counts = { active: 0, ready: 0, locked: 0, emergency: 0 };
    rooms.forEach((room) => {
      const tone = roomTone(room);
      const key = (tone.key === 'paused' ? 'active' : tone.key) as keyof typeof counts;
      if (key in counts) counts[key] += 1;
    });
    return counts;
  }, [rooms]);

  const completedToday = useMemo(() => rooms.reduce((total, room) => total + (room.completedOperations || []).filter((operation) => {
    const endedAt = new Date(operation.endedAt).getTime();
    return endedAt >= operationalWindow.start && endedAt <= operationalWindow.end;
  }).length, 0), [operationalWindow.end, operationalWindow.start, rooms]);

  const plannedToday = Math.max(completedToday + statusCounts.active + rooms.reduce((total, room) => total + Math.max(0, room.queueCount || 0), 0), completedToday);
  const roomsInService = rooms.filter((room) => !room.isLocked).length;
  const phaseStatus = selectedRoom
    ? workflowStatusAt(workflowStatuses, selectedRoom.currentStepIndex)
    : undefined;
  const selectedTone = roomTone(selectedRoom);
  const phaseName = selectedRoom?.isEmergency ? 'Emergency'
    : selectedRoom?.isLocked ? 'Sál uzamčen'
      : selectedRoom?.isPaused ? 'Pauza'
        : phaseStatus?.name || selectedTone.label;
  const phaseColor = selectedRoom?.isEmergency ? '#FB7185'
    : selectedRoom?.isLocked ? '#FACC15'
      : selectedRoom?.isPaused ? '#22D3EE'
        : phaseStatus?.accent_color || selectedTone.color;
  const progress = selectedRoom && !READY_STEPS.has(selectedRoom.currentStepIndex)
    ? Math.max(8, Math.min(100, ((selectedRoom.currentStepIndex + 1) / Math.max(1, workflowStatuses.length)) * 100))
    : 0;
  const alertRoom = rooms.find((room) => room.isEmergency)
    || rooms.find((room) => Boolean(room.noticeMessage))
    || rooms.find((room) => room.isLocked)
    || rooms.find((room) => room.currentStepIndex === Math.max(0, workflowStatuses.length - 1))
    || selectedRoom
    || rooms[0];
  const alertText = alertRoom?.isEmergency ? 'Aktivní emergency režim'
    : alertRoom?.noticeMessage || (alertRoom?.isLocked ? 'Sál je dočasně uzamčen' : 'Provoz bez kritického omezení');

  if (isLoading) {
    return <SpatialLoadingBar label="Načítám dispozici a živá data" initial={36} ceiling={68} />;
  }

  return (
    <section className="spatial-control-shell">
      <header className="spatial-control-header">
        <div className="spatial-control-title">
          <span className="spatial-control-mark"><BedDouble /></span>
          <div>
            <h1>OPERAČNÍ BLOK</h1>
            <p>{activeHospital?.hospital_name || project.name}</p>
          </div>
        </div>

        <div className="spatial-context-controls">
          <div><CalendarDays /><span>{nowDate.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
          <div><Clock3 /><span>{formatClock(nowDate)}</span></div>
          <label>
            <Building2 />
            <select value={floorId} onChange={(event) => {
              setFloorId(event.target.value);
              setSelectionDismissed(false);
              setSelectedSpatialRoomId(null);
            }} aria-label="Podlaží">
              {project.floors.map((floor) => <option key={floor.id} value={floor.id}>{floor.name}</option>)}
            </select>
          </label>
        </div>

        <div className="spatial-view-controls">
          <IconControl label="Karty sálů" onClick={onSwitchToCards}><LayoutGrid /></IconControl>
          <IconControl active={cameraMode === 'spatial'} label="3D pohled" onClick={() => setCameraMode('spatial')}><Cuboid /></IconControl>
          <IconControl active={cameraMode === 'plan'} label="Půdorys" onClick={() => setCameraMode('plan')}><MapIcon /></IconControl>
          <IconControl label="Vycentrovat scénu" onClick={() => setFitSignal((value) => value + 1)}><Focus /></IconControl>
        </div>
      </header>

      <div className="spatial-control-main">
        <div className="spatial-stage">
          <div className="spatial-stage-modes">
            <button type="button" className={cameraMode === 'spatial' ? 'is-active' : ''} onClick={() => setCameraMode('spatial')}>
              <span><Cuboid /></span><b>3D pohled</b>
            </button>
            <button type="button" className={cameraMode === 'plan' ? 'is-active' : ''} onClick={() => setCameraMode('plan')}>
              <span><MapIcon /></span><b>Půdorys</b>
            </button>
          </div>

          <SpatialCanvas
            project={project}
            floorId={floorId}
            cameraMode={cameraMode}
            roomsById={roomsById}
            statusColorByRoomId={statusColorByRoomId}
            fitSignal={fitSignal}
            selectedSpatialRoomId={selectedSpatialRoomId}
            onSelect={selectSpatialRoom}
          />

          <p className="spatial-stage-caption">Koncepční vizualizace · kliknutím vyberte sál</p>
          {error && <p className="spatial-stage-error">Výchozí dispozice · {error.message}</p>}
        </div>

        {selectedRoom ? (
          <RoomDetailPanel
            room={selectedRoom}
            phaseName={phaseName}
            phaseColor={phaseColor}
            progress={progress}
            now={nowMs}
            onClose={() => {
              setSelectionDismissed(true);
              setSelectedSpatialRoomId(null);
            }}
            onOpen={() => onSelectRoom(selectedRoom.id)}
          />
        ) : (
          <aside className="spatial-room-panel spatial-room-panel-empty">
            <Cuboid />
            <h2>Vyberte operační sál</h2>
            <p>Klikněte na sál v prostorovém modelu pro zobrazení živých provozních dat.</p>
          </aside>
        )}
      </div>

      <div className="spatial-summary-grid">
        <MetricTile icon={<BedDouble />} label="Sály v provozu" value={roomsInService} suffix={`/ ${rooms.length}`} />
        <MetricTile icon={<CircleCheck />} label="Připravené sály" value={statusCounts.ready} />
        <MetricTile icon={<ListChecks />} label="Dnešní výkony" value={completedToday} suffix={`/ ${plannedToday}`} />
        <ProgramOverview rooms={rooms} start={operationalWindow.start} end={operationalWindow.end} now={nowMs} />
        <button type="button" className="spatial-alert-card" onClick={() => alertRoom && onSelectRoom(alertRoom.id)}>
          <span><BellRing />Provozní upozornění</span>
          <strong>{alertRoom?.name || 'Operační blok'}</strong>
          <p>{alertText}</p>
          <i>Zobrazit <ArrowRight /></i>
        </button>
      </div>

      <footer className="spatial-control-footer">
        <span>Živá provozní data</span>
        <span>{activeHospital?.hospital_short_name || activeHospital?.hospital_name || project.name}</span>
        <span>ORMS v1.0</span>
        <strong><Check />Efektivnější péče. Každý den.</strong>
      </footer>
    </section>
  );
}
