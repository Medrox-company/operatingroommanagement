import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback, useDeferredValue } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, DEFAULT_WEEKLY_SCHEDULE, DEFAULT_DAILY_BREAK_MINUTES } from '../types';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { useHospital } from '../contexts/HospitalContext';
import MobileTimelineView from './mobile/MobileTimelineView';
import AroOvertimePopup from './AroOvertimePopup';
import CapacityForecast from './timeline/CapacityForecast';
import DayStatistics from './timeline/DayStatistics';
import DelaySimulator from './timeline/DelaySimulator';
import PhaseFingerprint from './timeline/PhaseFingerprint';
import AttentionFeed from './timeline/AttentionFeed';
import PhaseOptimizer from './timeline/PhaseOptimizer';
import TimelineHistory from './timeline/TimelineHistory';
import { TimelineRoomRow, type TimelineHoveredOp } from './timeline/TimelineRoomRow';
import { TimelineAxisHeader } from './timeline/TimelineAxisHeader';
import { TimelineCommandBar } from './timeline/TimelineCommandBar';
import { AlertTriangle, X, CheckCircle, Search, Crosshair } from 'lucide-react';

// ========== DESIGN TOKENS, CONSTANTS & HELPERS (extrahováno do ./timeline) ==========
import { C, TIMELINE_START_HOUR, TIMELINE_HOURS as TIMELINE_HOURS_FULL, ROOM_LABEL_WIDTH, MIN_ROW_HEIGHT, MAX_ROW_HEIGHT } from './timeline/constants';
import { getTimePercent as getTimePercentRaw, parseTimeToDate, getTimePercentForTimeline as getTimePercentForTimelineRaw, getOperationPosition as getOperationPositionRaw } from './timeline/utils';
import RoomDetailPopup from './timeline/RoomDetailPopup';
import { useCurrentRoomSpecialties } from '../hooks/useCurrentRoomSpecialties';
import { clearRoomAroOvertimeStart, fetchTimelineSchedules, markRoomAroOvertimeStart, type TimelineScheduleRow } from '../lib/db';
import { deriveTimelineOperationalWarnings } from '../lib/timeline-operational-warnings';
import { useTimelineCompletedOperations } from '../hooks/useTimelineCompletedOperations';
import { mergeCompletedOperations } from '../lib/completed-operations';
import { useNowDate, useNowMsAtGranularity } from '../hooks/useSharedClock';
import { useOperationalThresholds } from '../hooks/useOperationalThresholds';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
  /** Volitelný callback pro ruční obnovení dat (refetch). Pokud chybí, tlačítko se neukáže. */
  onRefresh?: () => Promise<void> | void;
}

const TIMELINE_OPERATIONAL_TICK_MS = 10_000;
const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const TimelineClockDisplay: React.FC = React.memo(() => {
  // Sdílený tik aplikace. Komponenta je memoizovaná, takže se sekundovým
  // překreslením mění jen text hodin, nikoli celá časová osa.
  const clockTime = useNowDate();

  return (
    <div
      className="timeline-clock-clean relative flex h-12 w-auto min-w-[108px] xl:min-w-[124px] xl:w-44 shrink-0 flex-col items-center justify-center px-1.5 xl:px-3 py-1"
      aria-label={`Aktuální čas ${clockTime.toLocaleTimeString('cs-CZ')}`}
    >
      <motion.p
        className="flex items-baseline gap-1 xl:gap-1.5 text-[22px] xl:text-[30px] font-medium leading-none tracking-[-0.04em] tabular-nums whitespace-nowrap"
        style={{ color: C.textHi }}
        initial={false}
      >
        <span>
          {clockTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="text-[11px] xl:text-[12px] font-medium tracking-normal text-white/28 tabular-nums">
          {clockTime.toLocaleTimeString('cs-CZ', { second: '2-digit' })}
        </span>
      </motion.p>
    </div>
  );
});

TimelineClockDisplay.displayName = 'TimelineClockDisplay';

/* ════════ Minimapa dne — komprimovaný přehled obsazenosti s navigací ════════
   Zobrazuje se při zoomu > 1: každý sál je tenká „lane", operace jsou barevné
   segmenty, rámeček ukazuje aktuální výřez. Kliknutím se přesune pohled. */
interface MinimapLane {
  id: string;
  segs: Array<{ l: number; w: number; color: string; active?: boolean }>;
  emergency: boolean;
}
interface TimelineMinimapProps {
  lanes: MinimapLane[];
  nowPct: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  axisRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
}
const TimelineMinimap: React.FC<TimelineMinimapProps> = ({ lanes, nowPct, containerRef, axisRef, zoom }) => {
  const [viewport, setViewport] = useState({ left: 0, width: 1 });
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const fullWidth = Math.max(1, el.scrollWidth - ROOM_LABEL_WIDTH);
      const visible = Math.max(0, el.clientWidth - ROOM_LABEL_WIDTH);
      setViewport({ left: el.scrollLeft / fullWidth, width: Math.min(1, visible / fullWidth) });
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    // Po animaci šířky (zoom transition 250 ms) přepočítej výřez
    const t = window.setTimeout(update, 320);
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [containerRef, zoom]);

  const navigate = (clientX: number) => {
    const track = trackRef.current;
    const el = containerRef.current;
    if (!track || !el) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const fullWidth = el.scrollWidth - ROOM_LABEL_WIDTH;
    const visible = el.clientWidth - ROOM_LABEL_WIDTH;
    const target = Math.max(0, ratio * fullWidth - visible / 2);
    el.scrollTo({ left: target, behavior: 'smooth' });
    if (axisRef.current) axisRef.current.scrollTo({ left: target, behavior: 'smooth' });
  };

  const laneH = lanes.length > 0 ? 100 / lanes.length : 100;

  return (
    <div
      ref={trackRef}
      className="relative flex-1 h-9 rounded-lg overflow-hidden cursor-pointer select-none"
      style={{ background: 'rgba(2, 6, 23, 0.55)', border: `1px solid ${C.border}` }}
      onClick={(e) => navigate(e.clientX)}
      onMouseMove={(e) => { if (e.buttons === 1) navigate(e.clientX); }}
      role="scrollbar"
      aria-label="Minimapa dne — navigace po časové ose"
      data-tour="tl-minimap"
      aria-valuenow={Math.round(viewport.left * 100)}
    >
      {/* Lanes s operacemi */}
      {lanes.map((lane, i) => (
        <div
          key={lane.id}
          className="absolute left-0 right-0"
          style={{ top: `${i * laneH}%`, height: `${laneH}%`, padding: '1px 0' }}
        >
          {lane.emergency && (
            <div className="absolute inset-0" style={{ background: `${C.red}28` }} />
          )}
          {lane.segs.map((s, j) => (
            <div
              key={j}
              className={`absolute top-[15%] bottom-[15%] rounded-sm ${s.active ? 'animate-pulse' : ''}`}
              style={{ left: `${s.l}%`, width: `${Math.max(0.4, s.w)}%`, background: s.color, opacity: s.active ? 0.95 : 0.55 }}
            />
          ))}
        </div>
      ))}
      {/* Značka teď */}
      <div
        className="absolute top-0 bottom-0 w-px z-10 pointer-events-none"
        style={{ left: `${nowPct}%`, background: C.cyan, boxShadow: `0 0 6px ${C.cyan}` }}
      />
      {/* Aktuální výřez */}
      <motion.div
        className="absolute top-0 bottom-0 z-20 rounded-md pointer-events-none"
        animate={{ left: `${viewport.left * 100}%`, width: `${viewport.width * 100}%` }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        style={{ background: `${C.cyan}10`, border: `1.5px solid ${C.cyan}70`, boxShadow: `inset 0 0 12px ${C.cyan}15` }}
      />
    </div>
  );
};

import type { SortMode, StatusFilter } from './timeline/row-types';

function TimelineModuleImpl({ rooms: sourceRooms, onRefresh }: TimelineModuleProps) {
  const { activeHospitalId, tokenRevision, loading: hospitalLoading } = useHospital();
  // Tolerance pozdního startu prvního výkonu dne — z nastavení zařízení.
  const { thresholds } = useOperationalThresholds();
  const firstCaseGraceMinutes = thresholds.firstCaseGraceMinutes;
  const {
    completedOperationsByRoom,
    refreshCompletedOperations,
  } = useTimelineCompletedOperations();
  const mergedRooms = useMemo(() => sourceRooms.map((room) => {
    const eventOperations = completedOperationsByRoom.get(room.id) ?? [];
    if (eventOperations.length === 0) return room;
    return {
      ...room,
      completedOperations: mergeCompletedOperations(
        room.completedOperations ?? [],
        eventOperations,
      ),
    };
  }), [completedOperationsByRoom, sourceRooms]);
  // Historie může přidat desítky bloků v jediném okamžiku. Odložená hodnota
  // nechá React dokončit interaktivní přepnutí modulu a těžkou grafiku
  // připraví mimo kritickou cestu prvního vykreslení.
  const rooms = useDeferredValue(mergedRooms);
  const { currentByRoom: currentSpecialties } = useCurrentRoomSpecialties();
  // Get workflow statuses from database context - already filtered and sorted
  const { workflowStatuses } = useWorkflowStatusesContext();
  
  // workflowStatuses is already filtered (active, non-special) and sorted by context
  const activeStatuses = workflowStatuses;
  
  // Lookup mapa pro rychlý přístup k statusu podle order_index (room.currentStepIndex)
  const statusByOrderIndex = useMemo(() => {
    const map: Record<number, typeof activeStatuses[number]> = {};
    activeStatuses.forEach((s) => {
      map[s.order_index] = s;
    });
    return map;
  }, [activeStatuses]);
  
  const operationalTimeMs = useNowMsAtGranularity(TIMELINE_OPERATIONAL_TICK_MS);
  const currentTime = useMemo(() => new Date(operationalTimeMs), [operationalTimeMs]);
  const operationalWindow = useMemo(() => {
    const start = new Date(currentTime);
    if (start.getHours() < TIMELINE_START_HOUR) start.setDate(start.getDate() - 1);
    start.setHours(TIMELINE_START_HOUR, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setHours(TIMELINE_START_HOUR, 0, 0, 0);
    return { startMs: start.getTime(), endMs: end.getTime(), fromDate: localDateKey(start), toDate: localDateKey(end) };
  }, [currentTime]);
  // Plán se mění méně často než živý stav sálů. Krátký periodický refetch
  // zachytí kolize i bez rozšíření realtime publikace a drží tenant oddělený.
  const { data: plannedSchedules, mutate: refreshPlannedSchedules } = useSWR<TimelineScheduleRow[] | null>(
    activeHospitalId && !hospitalLoading
      ? ['timeline-planned-schedules', activeHospitalId, tokenRevision, operationalWindow.fromDate]
      : null,
    () => fetchTimelineSchedules({
      hospitalId: activeHospitalId!,
      fromDate: operationalWindow.fromDate,
      toDate: operationalWindow.toDate,
    }),
    { refreshInterval: 2 * 60_000, dedupingInterval: 30_000, revalidateOnFocus: true, revalidateOnReconnect: true },
  );
  const warningsByRoom = useMemo(() => deriveTimelineOperationalWarnings(
    rooms, plannedSchedules, currentTime.getTime(), activeStatuses, operationalWindow,
  ), [rooms, plannedSchedules, currentTime, activeStatuses, operationalWindow]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);
  const [selectedDetailTime, setSelectedDetailTime] = useState<Date | null>(null);
  const [selectedPhaseEndTime, setSelectedPhaseEndTime] = useState<Date | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [rowHeight, setRowHeight] = useState<number>(MAX_ROW_HEIGHT);
  // Hustota řádků: 'auto' = vejít vše na obrazovku; 'compact' = víc sálů (pevná nízká
  // výška + scroll); 'comfort' = víc detailu (pevná vyšší výška + scroll).
  const [density, setDensity] = useState<'auto' | 'compact' | 'comfort'>('auto');
  const [showAroPopup, setShowAroPopup] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showFingerprint, setShowFingerprint] = useState(false);
  const [showAttention, setShowAttention] = useState(false);
  const [showPhaseOptimizer, setShowPhaseOptimizer] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // --- Nové funkce: vyhledávání, filtr stavu, zoom časové osy, hover tooltip ---
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  // Zoom odstraněn — osa vždy zobrazuje celý den (konstanta ponechána, aby
  // navazující logika (minimapa, sub-hodinové dílky) zůstala typově konzistentní).
  const zoom = 1;
  const [hoveredOp, setHoveredOp] = useState<TimelineHoveredOp | null>(null);
  // --- Další funkce: řazení, souhrn dne, živá data ---
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [statsRoomId, setStatsRoomId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  /** Šířka časové osy — určuje hustotu a velikost hodinových popisků. */
  const [axisWidth, setAxisWidth] = useState(0);
  useLayoutEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const updateAxisWidth = (width: number) => {
      setAxisWidth((previousWidth) => (
        Math.abs(previousWidth - width) < 1 ? previousWidth : width
      ));
    };
    const ro = new ResizeObserver(entries => {
      for (const e of entries) updateAxisWidth(e.contentRect.width);
    });
    ro.observe(el);
    updateAxisWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  const rowsContainerRef = useRef<HTMLDivElement>(null);
  const moduleRootRef = useRef<HTMLDivElement>(null);
  // TV / fullscreen režim — pro nástěnnou obrazovku na operačním traktu
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Živý popup ukládá pouze ID. Aktuální objekt sálu se při každém renderu
  // vezme z centrálního SWR/Realtime pole `rooms`, takže nevzniká další dotaz
  // ani samostatná subscription a detail nikdy nedrží zastaralý snapshot.
  const openLiveRoom = useCallback((roomOrId: OperatingRoom | string) => {
    setSelectedRoom(null);
    setSelectedRoomId(typeof roomOrId === 'string' ? roomOrId : roomOrId.id);
    setSelectedDetailTime(null);
    setSelectedPhaseEndTime(null);
  }, []);

  const closeRoomDetail = useCallback(() => {
    setSelectedRoomId(null);
    setSelectedRoom(null);
    setSelectedDetailTime(null);
    setSelectedPhaseEndTime(null);
  }, []);

  const detailRoom = useMemo(() => {
    if (selectedRoom) return selectedRoom;
    if (!selectedRoomId) return null;
    return rooms.find(room => room.id === selectedRoomId) ?? null;
  }, [rooms, selectedRoom, selectedRoomId]);

  const openHistoricalPhase = useCallback((
    room: OperatingRoom,
    history: NonNullable<OperatingRoom['statusHistory']>,
    phaseIndex: number,
    operationStartedAt: string,
    phaseEndedAt: string,
    cycleEndedAt: string = phaseEndedAt,
  ) => {
    const phase = history[phaseIndex];
    if (!phase) return;

    setSelectedRoomId(null);
    setSelectedDetailTime(new Date(cycleEndedAt));
    setSelectedPhaseEndTime(new Date(phaseEndedAt));
    setSelectedRoom({
      ...room,
      // Historický snímek nesmí být nahrazen aktuálním sálem při živém refetchi.
      id: `${room.id}:history:${operationStartedAt}:${phaseIndex}`,
      currentStepIndex: phase.stepIndex,
      operationStartedAt,
      phaseStartedAt: phase.startedAt,
      estimatedEndTime: phaseEndedAt,
      // Procenta vždy vycházejí z celého dostupného cyklu; zvýrazněná fáze
      // má samostatný konec pro správný údaj „ve fázi“.
      statusHistory: history,
      isPaused: false,
      pausedAt: null,
    });
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void moduleRootRef.current?.requestFullscreen?.();
    }
  }, []);

  // Po každé změně dat (realtime/refetch) aktualizuj „poslední aktualizace"
  useEffect(() => { setLastUpdated(new Date()); }, [rooms]);

  // Ruční obnovení dat
  const handleRefresh = useCallback(async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        Promise.resolve(onRefresh()),
        refreshCompletedOperations(),
        refreshPlannedSchedules(),
      ]);
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing, refreshCompletedOperations, refreshPlannedSchedules]);

  // ── Dynamický rozsah osy ──
  // Standardně osa končí v 0:00 (7:00 → 24:00 = 17 h). Jakmile aktuální čas
  // překročí půlnoc (0:00–6:59), rozsah se rozšíří na plných 24 h (7:00 → 7:00),
  // aby byl vidět i noční provoz až do konce (6:00). Lokální definice stíní
  // konstantu i utils funkce, takže se dynamický rozsah propíše do celé osy.
  const afterMidnight = currentTime.getHours() < TIMELINE_START_HOUR;
  const TIMELINE_HOURS = afterMidnight ? TIMELINE_HOURS_FULL : (24 - TIMELINE_START_HOUR);
  const TIME_MARKERS = Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => i);
  const getTimePercent = (date: Date) => getTimePercentRaw(date, TIMELINE_HOURS);
  const getTimePercentForTimeline = (date: Date, ref: Date) => getTimePercentForTimelineRaw(date, ref, TIMELINE_HOURS);
  const getOperationPosition = (s: Date, e: Date, ct: Date) => getOperationPositionRaw(s, e, ct, TIMELINE_HOURS);

  // Skok na aktuální čas — odscrolluje osu i řádky tak, aby byl „teď" indikátor uprostřed.
  const scrollToNow = useCallback(() => {
    const container = rowsContainerRef.current;
    if (!container) return;
    const nowPct = getTimePercent(new Date()) / 100; // 0..1 v rámci osy
    const fullWidth = container.scrollWidth - ROOM_LABEL_WIDTH;
    const target = Math.max(0, nowPct * fullWidth - (container.clientWidth - ROOM_LABEL_WIDTH) / 2);
    container.scrollTo({ left: target, behavior: 'smooth' });
    if (timelineRef.current) timelineRef.current.scrollTo({ left: target, behavior: 'smooth' });
  }, []);

  // Klávesové zkratky: T = skok na teď, F = celá obrazovka.
  // Ignorují se, když uživatel píše do inputu.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 't' || e.key === 'T') {
        scrollToNow();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        exitScrubRef.current?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [scrollToNow, toggleFullscreen]);
  // exitScrub je definován níže — ref obchází pořadí deklarací
  const exitScrubRef = useRef<(() => void) | null>(null);



  // Těžká timeline se nepřepočítává každou sekundu. Sdílený aplikační časovač
  // ji probudí po 10 s a při skryté záložce se automaticky uspí.

  /* --- Sály v původním pořadí; nouzové/uzamčené zůstávají na své pozici --- */
  const sortedRooms = useMemo(() => {
    return [...rooms];
  }, [rooms]);

  const roomRequiresAttention = useCallback((room: OperatingRoom) => {
    const estimatedEnd = room.estimatedEndTime ? new Date(room.estimatedEndTime).getTime() : null;

    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const schedule = room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
    const todaySchedule = schedule[dayKeys[currentTime.getDay()]];
    const workingEnd = new Date(currentTime);
    workingEnd.setHours(todaySchedule.endHour, todaySchedule.endMinute, 0, 0);
    const exceedsWorkingHours = room.currentStepIndex < 6
      && !room.isEmergency
      && todaySchedule.enabled
      && estimatedEnd !== null
      && Number.isFinite(estimatedEnd)
      && estimatedEnd > workingEnd.getTime();

    return !!(
      room.isEmergency
      || room.isLocked
      || room.isPaused
      || room.isEnhancedHygiene
      || warningsByRoom.has(room.id)
      || exceedsWorkingHours
    );
  }, [currentTime, warningsByRoom]);

  // --- Filtrované sály podle provozního stavu ---
  // Stav odvozujeme z currentStepIndex: 0 = volný (Sál připraven), >0 = probíhá.
  // Sály ve stavu nouze se zobrazují vždy (kritické).
  const displayRooms = useMemo(() => {
    const filtered = sortedRooms.filter((room) => {
      if (room.isEmergency) return true;
      const isRoomActive = room.currentStepIndex > 0 || room.isLocked || room.isPaused;
      if (statusFilter === 'active') return isRoomActive;
      if (statusFilter === 'free') return !isRoomActive;
      if (statusFilter === 'attention') return roomRequiresAttention(room);
      return true;
    });

    // Řazení dle zvoleného režimu (nemutuje původní pole)
    if (sortMode === 'name') {
      return [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'cs'));
    }
    if (sortMode === 'status') {
      // Aktivní/uzamčené/pauza první, pak volné; sekundárně dle názvu
      const rank = (r: OperatingRoom) =>
        r.isEmergency ? 0 : (r.currentStepIndex > 0 || r.isLocked || r.isPaused) ? 1 : 2;
      return [...filtered].sort((a, b) => rank(a) - rank(b) || (a.name || '').localeCompare(b.name || '', 'cs'));
    }
    return filtered; // 'default' = původní pořadí (sort_order z DB)
  }, [sortedRooms, statusFilter, sortMode, roomRequiresAttention]);

  // Pro statistiky zobrazujeme VŠECHNY sály bez filtrování
  const allRoomsForStats = useMemo(() => {
    const filtered = sortedRooms;
    
    if (sortMode === 'name') {
      return [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'cs'));
    }
    if (sortMode === 'status') {
      const rank = (r: OperatingRoom) =>
        r.isEmergency ? 0 : (r.currentStepIndex > 0 || r.isLocked || r.isPaused) ? 1 : 2;
      return [...filtered].sort((a, b) => rank(a) - rank(b) || (a.name || '').localeCompare(b.name || '', 'cs'));
    }
    return filtered;
  }, [sortedRooms, sortMode]);
  
  // Calculate responsive row height — všechny sály se MUSÍ vejít bez scrollování.
  // useLayoutEffect: výška se nastaví PŘED prvním vykreslením → žádné poskočení/blikání.
  useLayoutEffect(() => {
    const calculateRowHeight = () => {
      const count = displayRooms.length;
      if (rowsContainerRef.current && count > 0) {
        // Pevné hustoty — nezávislé na počtu sálů (scroll zapnut v kontejneru).
        if (density === 'compact') { setRowHeight(34); return; }
        if (density === 'comfort') { setRowHeight(88); return; }
        // 'auto' — všechny sály se vejdou bez scrollování.
        const containerHeight = rowsContainerRef.current.clientHeight;
        // Řádky tvoří souvislou tabulku bez mezer a bez svislého odsazení.
        // Dostupnou výšku proto rozdělíme celou, aby poslední sál vždy dosedl
        // přesně na spodní hranu kontejneru.
        const totalGapPx = 0;
        const totalPaddingPx = 0;
        const availableHeight = Math.max(0, containerHeight - totalGapPx - totalPaddingPx);
        // Math.floor → zaokrouhli dolů, aby ani 1px subpixel rounding nezpůsobil overflow
        const calculatedHeight = Math.floor(availableHeight / count);
        const clampedHeight = Math.max(MIN_ROW_HEIGHT, calculatedHeight);
        setRowHeight(clampedHeight);
      }
    };

    calculateRowHeight();

    // Recalculate on resize
    const resizeObserver = new ResizeObserver(calculateRowHeight);
    if (rowsContainerRef.current) {
      resizeObserver.observe(rowsContainerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [displayRooms.length, density]);

  // Auto-scroll to current time position on mount - NE POTŘEBA KDYŽ JE VŠE VIDITELNÉ
  // useEffect(() => {
  //   if (scrollContainerRef.current) {
  //     const nowPercent = getTimePercent(currentTime);
  //     const scrollWidth = scrollContainerRef.current.scrollWidth - ROOM_LABEL_WIDTH;
  //     const containerWidth = scrollContainerRef.current.clientWidth - ROOM_LABEL_WIDTH;
  //     const scrollPosition = (scrollWidth * nowPercent / 100) - (containerWidth / 2);
  //     scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
  //   }
  // }, []);

  const nowPercent = getTimePercent(currentTime);
  const currentHour = currentTime.getHours();
  const currentMin = currentTime.getMinutes();

  /* --- Stats --- */
  const stats = useMemo(() => {
    const cleaningIndex = Math.max(1, activeStatuses.length - 2);
    const isAvailable = (r: OperatingRoom) => r.currentStepIndex === 0 && !r.isEmergency && !r.isLocked;
    const isCleaningRoom = (r: OperatingRoom) => r.currentStepIndex === cleaningIndex && !r.isEmergency && !r.isLocked;
    const isOperating = (r: OperatingRoom) =>
      r.currentStepIndex > 0
      && r.currentStepIndex !== cleaningIndex
      && !r.isEmergency
      && !r.isLocked;
    const operations = rooms.filter(isOperating).length;
    const cleaning = rooms.filter(isCleaningRoom).length;
    const free = rooms.filter(isAvailable).length;
    const completed = rooms.reduce((acc, r) => acc + Math.max(0, r.operations24h || 0), 0);
    const doctorsWorking = rooms.filter(r => r.staff?.doctor?.name && r.currentStepIndex > 0).length;
    const doctorsFree = rooms.filter(r => r.staff?.doctor?.name && r.currentStepIndex === 0).length;
    const nursesWorking = rooms.filter(r => r.staff?.nurse?.name && r.currentStepIndex > 0).length;
    const nursesFree = rooms.filter(r => r.staff?.nurse?.name && r.currentStepIndex === 0).length;
    const emergencyCount = rooms.filter(r => r.isEmergency).length;
    return { operations, cleaning, free, completed, doctorsWorking, doctorsFree, nursesWorking, nursesFree, emergencyCount };
  }, [rooms, activeStatuses.length]);

  /* --- Vytížení po sálech (POUZE dnešní den, reálná data z DB):
     pro každý sál spočítá počet operací, pracovní kapacitu (z rozvrhu dne,
     minus pauza), obsazené minuty (z dnešních dokončených + probíhající
     operace; pauza se NEpočítá), vytíženost v % a rozpad času po fázích
     operačního cyklu (per-room timeline). --- */
  const roomUtilization = useMemo(() => {
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const todayKey = dayKeys[currentTime.getDay()];
    const now = currentTime.getTime();

    // Hranice dnešního dne; samotné využití níže navíc ořízneme na směnu sálu.
    const dayStart = new Date(currentTime); dayStart.setHours(0, 0, 0, 0);
    const startMs = dayStart.getTime();
    // Mapa barev/názvů fází podle POZICE v poli activeStatuses (stejně jako hlavní timeline)
    const stepColorMap: Record<number, string> = {};
    const stepNameMap: Record<number, string> = {};
    activeStatuses.forEach((s, idx) => {
      stepColorMap[idx] = s.accent_color || s.color || '#6b7280';
      stepNameMap[idx] = s.name || `Fáze ${idx + 1}`;
    });

    // Statistiky vždy počítáme ze VŠECH sálů (nezávisle na filtru časové osy)
    const roomsToProcess = allRoomsForStats;
    const rows = roomsToProcess.map((room) => {
      // Pracovní kapacita dne (minuty) = (konec − začátek) − denní pauza
      const schedule = room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
      const today = schedule[todayKey];
      let workingMinutes = 0;
      let workStartMs = 0;
      let workEndMs = 0;
      let workingScale = 0;
      if (today?.enabled) {
        const startM = today.startHour * 60 + today.startMinute;
        const endM = today.endHour * 60 + today.endMinute;
        const breakM = today.breakMinutes ?? DEFAULT_DAILY_BREAK_MINUTES;
        const grossMinutes = Math.max(0, endM - startM);
        workingMinutes = Math.max(0, grossMinutes - Math.min(breakM, grossMinutes));
        workStartMs = startMs + startM * 60_000;
        workEndMs = startMs + endM * 60_000;
        workingScale = grossMinutes > 0 ? workingMinutes / grossMinutes : 0;
      }

      const workingOverlapMs = (intervalStart: number, intervalEnd: number) => {
        if (workingMinutes <= 0 || intervalEnd <= intervalStart) return 0;
        const overlapStart = Math.max(intervalStart, workStartMs);
        const overlapEnd = Math.min(intervalEnd, workEndMs);
        return overlapEnd > overlapStart ? (overlapEnd - overlapStart) * workingScale : 0;
      };

      let occupiedMs = 0;
      let operations = 0;
      let pausedMs = 0;
      const phaseMs: Record<number, number> = {}; // stepIndex (pozice) → ms

      // Akumulace času po fázích z historie statusů jedné operace
      const accumulatePhases = (history: Array<{ stepIndex: number; startedAt: string }> | undefined, opEndMs: number) => {
        if (!history || history.length === 0) return;
        history.forEach((entry, idx) => {
          const segStart = new Date(entry.startedAt).getTime();
          const next = history[idx + 1];
          const segEnd = next ? new Date(next.startedAt).getTime() : opEndMs;
          const dur = workingOverlapMs(segStart, segEnd);
          if (dur > 0) phaseMs[entry.stepIndex] = (phaseMs[entry.stepIndex] || 0) + dur;
        });
      };

      // Dokončené operace — započítá se výhradně průnik se směnou.
      (room.completedOperations || []).forEach((op) => {
        const s = new Date(op.startedAt).getTime();
        const e = new Date(op.endedAt).getTime();
        if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
          const occupiedInShift = workingOverlapMs(s, e);
          if (occupiedInShift <= 0) return;
          occupiedMs += occupiedInShift;
          operations += 1;
          accumulatePhases(op.statusHistory, e);
        }
      });

      // Probíhající operace — pouze její část uvnitř směny; pauza se nepočítá.
      const isRunning = room.currentStepIndex > 0 && room.currentStepIndex < 6 && !room.isLocked;
      if (isRunning && room.operationStartedAt) {
        const s = new Date(room.operationStartedAt as string).getTime();
        const pauseStart = room.isPaused && room.pausedAt ? new Date(room.pausedAt).getTime() : NaN;
        const measuredEnd = Number.isFinite(pauseStart) ? Math.min(now, pauseStart) : now;
        const occupiedInShift = workingOverlapMs(s, measuredEnd);
        if (occupiedInShift > 0) {
          operations += 1;
          occupiedMs += occupiedInShift;
          accumulatePhases(room.statusHistory, measuredEnd);
        }
        if (Number.isFinite(pauseStart) && now > pauseStart) pausedMs = workingOverlapMs(pauseStart, now);
      }

      // Databázové duplicity ani souběžné intervaly nesmí překročit kapacitu.
      occupiedMs = Math.min(occupiedMs, workingMinutes * 60_000);
      const occupiedMinutes = Math.round(occupiedMs / 60000);
      
      // Využití = obsazené minuty uvnitř směny / čistá pracovní kapacita.
      // Sál bez nastavené pracovní doby má 0 %, nikoli náhradní osmihodinový základ.
      const utilizationPct = workingMinutes > 0
        ? Math.min(100, Math.max(0, Math.round((occupiedMinutes / workingMinutes) * 100)))
        : 0;

      const avgOpMin = operations > 0 ? Math.round(occupiedMs / 60000 / operations) : 0;

      // Sestavení fází cyklu pro per-room timeline (seřazeno dle pozice)
      const phases = Object.entries(phaseMs)
        .map(([idx, ms]) => ({
          stepIndex: Number(idx),
          name: stepNameMap[Number(idx)] || `Fáze ${Number(idx) + 1}`,
          color: stepColorMap[Number(idx)] || '#6b7280',
          minutes: Math.round(ms / 60000),
          ms,
        }))
        .filter((p) => p.ms > 0)
        .sort((a, b) => a.stepIndex - b.stepIndex);
      const phaseTotalMs = phases.reduce((acc, p) => acc + p.ms, 0);

      // Doba pauzy je samostatná část cyklu a nezvětšuje poslední aktivní fázi.
      const pausedMinutes = Math.round(pausedMs / 60000);

      return {
        id: room.id,
        name: room.name,
        department: room.department,
        isEmergency: !!room.isEmergency,
        isPaused: !!room.isPaused,
        isRunning,
        operations,
        workingMinutes,
        occupiedMinutes,
        utilizationPct,
        avgOpMin,
        phases,
        phaseTotalMs,
        pausedMs,
        pausedMinutes,
      };
    });

    // Souhrnný řádek
    const totals = rows.reduce(
      (acc, r) => {
        acc.operations += r.operations;
        acc.workingMinutes += r.workingMinutes;
        acc.occupiedMinutes += r.occupiedMinutes;
        acc.completedOperations += r.operations;
        acc.totalOperatingMs += r.occupiedMinutes * 60000; // ms
        // Počítání pokojů podle statusu
        acc.allRoomsCount++;
        if (r.operations > 0) acc.activeRoomsCount++;
        else if (r.workingMinutes > 0) acc.freeRoomsCount++;
        if (r.isPaused) acc.pausedRoomsCount++;
        if (r.isEmergency) acc.emergencyRoomsCount++;
        return acc;
      },
      { operations: 0, workingMinutes: 0, occupiedMinutes: 0, completedOperations: 0, totalOperatingMs: 0, allRoomsCount: 0, activeRoomsCount: 0, freeRoomsCount: 0, pausedRoomsCount: 0, emergencyRoomsCount: 0 }
    );
    const totalUtilizationPct = totals.workingMinutes > 0
      ? Math.min(100, Math.max(0, Math.round((totals.occupiedMinutes / totals.workingMinutes) * 100)))
      : 0;

    return { rows, totals: { ...totals, utilizationPct: totalUtilizationPct } };
    }, [allRoomsForStats, displayRooms, currentTime, activeStatuses, showSummary]);

  // Barva podle míry vytížení sálu
  const utilColor = (pct: number): string => {
    if (pct >= 70) return C.green;        // zelená — nad 70%
    if (pct >= 50) return C.purple;       // fialová — 50-70%
    if (pct > 0) return C.orange;         // oranžová — do 50%
    return C.red;                         // červená — 0%
  };

  /* --- KPI dle standardů řízení operačních sálů:
     · Utilizace dne (% obsazení provozní doby) — z roomUtilization
     · Ø přestavba (turnover time) — průměrná mezera mezi po sobě jdoucími
       dnešními operacemi téhož sálu (mezery > 3 h se nepočítají — to už
       není přestavba, ale prostoj/pauza programu)
     · 1. start včas (first-case on-time start) — kolik % sálů zahájilo
       první dnešní operaci do 15 minut od začátku provozní doby --- */
  const orKpis = useMemo(() => {
    const dayStart = new Date(currentTime);
    dayStart.setHours(0, 0, 0, 0);
    const dayStartMs = dayStart.getTime();
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const todayKey = dayKeys[currentTime.getDay()];
    // Tolerance pozdního startu prvního výkonu — nastavuje si ji zařízení.
    const FCOTS_GRACE_MS = firstCaseGraceMinutes * 60 * 1000;

    let gapSumMin = 0;
    let gapCount = 0;
    let firstOnTime = 0;
    let firstEligible = 0;

    rooms.forEach((room) => {
      const ops: Array<{ s: number; e: number }> = (room.completedOperations || [])
        .map((op) => ({ s: new Date(op.startedAt).getTime(), e: new Date(op.endedAt).getTime() }))
        .filter((o) => Number.isFinite(o.s) && Number.isFinite(o.e) && o.e > o.s && o.s >= dayStartMs)
        .sort((a, b) => a.s - b.s);

      // Probíhající operace se počítá jako další start (pro turnover i FCOTS)
      if (room.operationStartedAt && room.currentStepIndex > 0 && !room.isLocked) {
        const t = new Date(room.operationStartedAt).getTime();
        if (Number.isFinite(t) && t >= dayStartMs) ops.push({ s: t, e: Number.POSITIVE_INFINITY });
      }

      for (let i = 1; i < ops.length; i++) {
        const gapMin = (ops[i].s - ops[i - 1].e) / 60000;
        if (Number.isFinite(gapMin) && gapMin >= 0 && gapMin <= 180) {
          gapSumMin += gapMin;
          gapCount++;
        }
      }

      const todaySchedule = (room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE)[todayKey];
      if (todaySchedule?.enabled && ops.length > 0) {
        firstEligible++;
        const planned = new Date(currentTime);
        planned.setHours(todaySchedule.startHour, todaySchedule.startMinute, 0, 0);
        if (ops[0].s <= planned.getTime() + FCOTS_GRACE_MS) firstOnTime++;
      }
    });

    return {
      utilizationPct: roomUtilization.totals.utilizationPct,
      avgTurnoverMin: gapCount > 0 ? Math.round(gapSumMin / gapCount) : null,
      fcotsPct: firstEligible > 0 ? Math.round((firstOnTime / firstEligible) * 100) : null,
      fcotsDetail: firstEligible > 0 ? `${firstOnTime}/${firstEligible}` : null,
    };
  }, [rooms, currentTime, roomUtilization, firstCaseGraceMinutes]);

  /* --- Data pro minimapu dne (komprimované lanes všech zobrazených sálů) --- */
  const minimapLanes = useMemo<MinimapLane[]>(() => {
    const windowStart = new Date(currentTime);
    windowStart.setHours(TIMELINE_START_HOUR, 0, 0, 0);
    if (currentTime.getHours() < TIMELINE_START_HOUR) windowStart.setDate(windowStart.getDate() - 1);
    const startMs = windowStart.getTime();
    const spanMs = TIMELINE_HOURS * 3600_000;
    const pct = (t: number) => Math.max(0, Math.min(100, ((t - startMs) / spanMs) * 100));

    return displayRooms.map((room) => {
      const segs: MinimapLane['segs'] = [];
      (room.completedOperations || []).forEach((op) => {
        const s = new Date(op.startedAt).getTime();
        const e = new Date(op.endedAt).getTime();
        if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return;
        const l = pct(s);
        const w = pct(e) - l;
        if (w > 0) segs.push({ l, w, color: 'rgba(148, 163, 184, 0.85)' });
      });
      if (room.operationStartedAt && room.currentStepIndex > 0 && !room.isLocked) {
        const s = new Date(room.operationStartedAt).getTime();
        if (Number.isFinite(s)) {
          const l = pct(s);
          const w = pct(currentTime.getTime()) - l;
          if (w >= 0) {
            const safeIdx = Math.max(0, Math.min(room.currentStepIndex, activeStatuses.length - 1));
            const color = activeStatuses[safeIdx]?.accent_color || activeStatuses[safeIdx]?.color || C.cyan;
            segs.push({ l, w: Math.max(w, 0.4), color, active: true });
          }
        }
      }
      return { id: room.id, segs, emergency: !!room.isEmergency };
    });
  }, [displayRooms, currentTime, activeStatuses]);


  /* Auto-sledování „teď" odstraněno spolu se zoomem — celý den je vždy vidět. */

  /* ════════ ČASOVÁ LUPA & REPLAY DNE (time-travel) ════════
     Scrub režim: tažením myši po ose se zobrazí stav VŠECH sálů v daném
     okamžiku (rekonstrukce z historie statusů). Replay: kinematické
     přehrání celého dne od 7:00 do teď. */
  const [scrubActive, setScrubActive] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  const dayWindowStartMs = operationalWindow.startMs;

  // Stav sálu v libovolném čase t — z dokončených operací i živé historie
  const statusAtTime = useCallback((room: OperatingRoom, t: number): { color: string; name: string } | null => {
    const colorOf = (idx: number, fb?: string) =>
      activeStatuses[idx]?.accent_color || activeStatuses[idx]?.color || fb || '#6b7280';
    const nameOf = (idx: number, fb?: string) => activeStatuses[idx]?.name || fb || 'Fáze';
    const findPhase = (hist: Array<{ stepIndex: number; startedAt: string; color?: string; stepName?: string }> | undefined) => {
      if (!hist || hist.length === 0) return null;
      let cur: { stepIndex: number; startedAt: string; color?: string; stepName?: string } | null = null;
      for (const h of hist) {
        const hs = new Date(h.startedAt).getTime();
        if (Number.isFinite(hs) && hs <= t) cur = h; else break;
      }
      return cur;
    };
    for (const op of room.completedOperations || []) {
      const os = new Date(op.startedAt).getTime();
      const oe = new Date(op.endedAt).getTime();
      if (!Number.isFinite(os) || !Number.isFinite(oe)) continue;
      if (t >= os && t <= oe) {
        const cur = findPhase(op.statusHistory);
        if (cur) return { color: colorOf(cur.stepIndex, cur.color), name: cur.stepName || nameOf(cur.stepIndex) };
        return { color: '#6b7280', name: 'Operace' };
      }
    }
    if (room.operationStartedAt && room.currentStepIndex > 0 && !room.isLocked) {
      const os = new Date(room.operationStartedAt).getTime();
      if (Number.isFinite(os) && t >= os && t <= currentTime.getTime()) {
        const cur = findPhase(room.statusHistory);
        if (cur) return { color: colorOf(cur.stepIndex, cur.color), name: cur.stepName || nameOf(cur.stepIndex) };
      }
    }
    return null;
  }, [activeStatuses, currentTime]);

  const exitScrub = useCallback(() => {
    setScrubActive(false);
    setScrubTime(null);
  }, []);

  useEffect(() => { exitScrubRef.current = exitScrub; }, [exitScrub]);

  const scrubPct = scrubTime !== null
    ? Math.max(0, Math.min(100, ((scrubTime - dayWindowStartMs) / (TIMELINE_HOURS * 3600_000)) * 100))
    : null;

  // Formát minut → "6h 31m" (nebo "31m")
  const fmtMin = (min: number): string => {
    if (min <= 0) return '0m';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  /* --- ARO Overtime Tracking — sály, které přesáhly pracovní dobu.

     Pořadové číslo (1, 2, 3…) dostává sál podle toho, kdy přesah zaznamenal
     jako PRVNÍ. Ten okamžik se ukládá do databáze (`aro_overtime_since`),
     protože jen tak zůstane pořadí stejné po obnovení stránky a shodné na
     všech zařízeních. Dřív se držel jen v paměti záložky, takže se po každém
     načtení přerovnal a čísla neodpovídala skutečnosti.

     Když sál z přesahu vystoupí (operatér zkrátil odhad nebo výkon skončil),
     příznak se v databázi zruší a uvolní místo ostatním. */
  const aroWriteInFlightRef = useRef<Set<string>>(new Set());

  const aroOvertimeRooms = useMemo(() => {
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const todayKey = dayKeys[currentTime.getDay()];
    
    const overtimeList: Array<{
      roomId: string;
      roomName: string;
      estimatedEndTime: Date;
      workingEndTime: Date;
      overtimeMinutes: number;
      enteredAt: number;
    }> = [];
    
    rooms.forEach(room => {
      // Skip non-active or emergency rooms (locked rooms CAN be in ARO overtime)
      if (room.currentStepIndex >= 6 || room.isEmergency) return;
      
      // Get estimated end time
      let endTime: Date | null = null;
      if (room.estimatedEndTime) {
        endTime = new Date(room.estimatedEndTime);
      } else if (room.currentProcedure?.startTime && room.currentProcedure?.estimatedDuration) {
        const startDate = parseTimeToDate(room.currentProcedure.startTime);
        endTime = new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000);
      }
      
      if (!endTime) return;
      
      // Get room's working hours for today
      const schedule = room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
      const todaySchedule = schedule[todayKey];
      
      if (!todaySchedule.enabled) return;
      
      // Calculate working end time
      const workingEndTime = new Date(currentTime);
      workingEndTime.setHours(todaySchedule.endHour, todaySchedule.endMinute, 0, 0);
      
      // Check if estimated end exceeds working hours
      if (endTime > workingEndTime) {
        const overtimeMinutes = Math.round((endTime.getTime() - workingEndTime.getTime()) / (1000 * 60));

        // Okamžik vstupu do přesahu z databáze. Dokud se nezapsal (první
        // detekce), řadíme sál dočasně na konec — po zápisu a nejbližším
        // načtení dat se srovná na správné místo.
        const since = room.aroOvertimeSince ? new Date(room.aroOvertimeSince).getTime() : null;

        overtimeList.push({
          roomId: room.id,
          roomName: room.name,
          estimatedEndTime: endTime,
          workingEndTime,
          overtimeMinutes,
          enteredAt: since ?? Number.MAX_SAFE_INTEGER,
        });
      }
    });

    // Kdo dřív překročil pracovní dobu, dostane ARO #1. Sály bez zapsaného
    // času (těsně po detekci) mají shodný klíč — rozhodne jméno, aby pořadí
    // nekmitalo mezi rerendery.
    return overtimeList.sort((a, b) =>
      a.enteredAt - b.enteredAt || a.roomName.localeCompare(b.roomName, 'cs'),
    );
  }, [rooms, currentTime]);

  /* Zápis a rušení příznaku přesahu. Běží mimo výpočet výše, aby memo zůstalo
     bez vedlejších efektů. Souběh mezi zařízeními řeší podmíněný zápis
     v databázi — uloží se jen první záznam. */
  useEffect(() => {
    const overtimeIds = new Set(aroOvertimeRooms.map(r => r.roomId));

    for (const room of rooms) {
      const inOvertime = overtimeIds.has(room.id);
      const hasFlag = !!room.aroOvertimeSince;
      if (inOvertime === hasFlag) continue;              // stav sedí, nic neděláme
      if (aroWriteInFlightRef.current.has(room.id)) continue; // zápis už běží

      aroWriteInFlightRef.current.add(room.id);
      const done = () => aroWriteInFlightRef.current.delete(room.id);

      if (inOvertime) {
        void markRoomAroOvertimeStart(room.id, new Date().toISOString()).finally(done);
      } else {
        void clearRoomAroOvertimeStart(room.id).finally(done);
      }
    }
  }, [aroOvertimeRooms, rooms]);

  const attentionCount = useMemo(() => {
    const flagged = new Set(aroOvertimeRooms.map((room) => room.roomId));
    rooms.forEach((room) => {
      if (roomRequiresAttention(room)) flagged.add(room.id);
    });
    return flagged.size;
  }, [aroOvertimeRooms, rooms, roomRequiresAttention]);
  
  // Get ARO position for a room (returns position number or null if not in overtime)
  const getAroPosition = (roomId: string): number | null => {
    const index = aroOvertimeRooms.findIndex(r => r.roomId === roomId);
    return index >= 0 ? index + 1 : null;
  };
  
  // Get overtime info for a room
  const getOvertimeInfo = (roomId: string) => {
    return aroOvertimeRooms.find(r => r.roomId === roomId);
  };

  // Calculate shift line positions (as percentage of 24-hour view from 7:00)
  // These are no longer used but kept for reference
  // const shiftStartPercent = 0;
  // const shiftEndPercent = ((SHIFT_END_HOUR - TIMELINE_START_HOUR) / TIMELINE_HOURS) * 100;

  // Get remaining time for room
  const getRemainingTime = (room: OperatingRoom): string => {
    if (room.currentStepIndex >= 6) return '';
    if (!room.estimatedEndTime && !room.currentProcedure?.estimatedDuration) return '';
    
    let endTime: Date;
    if (room.estimatedEndTime) {
      endTime = new Date(room.estimatedEndTime);
    } else if (room.currentProcedure?.startTime && room.currentProcedure?.estimatedDuration) {
      const startDate = parseTimeToDate(room.currentProcedure.startTime);
      endTime = new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000);
    } else {
      return '';
    }
    
    const remainingMs = endTime.getTime() - currentTime.getTime();
    
    // Pokud čas přesáhl odhad ale výkon stále probíhá (currentStepIndex < 6), zobrazíme překročený čas
    if (remainingMs <= 0) {
      // Výkon stále běží - zobrazíme záporný čas (překročení)
      const overMs = Math.abs(remainingMs);
      const overHours = Math.floor(overMs / (1000 * 60 * 60));
      const overMinutes = Math.floor((overMs % (1000 * 60 * 60)) / (1000 * 60));
      return `-${overHours}h ${overMinutes < 10 ? '0' : ''}${overMinutes}m`;
    }
    
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `+${hours}h ${minutes < 10 ? '0' : ''}${minutes}m`;
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("cs-CZ", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  // Count active rooms for numbering

  return (
    <div
      ref={moduleRootRef}
      className={`w-full h-full text-white overflow-hidden flex flex-col relative antialiased ${isFullscreen ? 'app-timeline-background' : ''}`}
      style={{
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'optimizeLegibility',
      }}
    >
      {/* Room Detail Popup */}
      <AnimatePresence>
        {detailRoom && (
          <RoomDetailPopup
            key={detailRoom.id}
            room={detailRoom}
            onClose={closeRoomDetail}
            currentTime={selectedDetailTime ?? currentTime}
            selectedPhaseEndTime={selectedPhaseEndTime}
          />
        )}
        {showAroPopup && (
          <AroOvertimePopup
            isOpen={showAroPopup}
            onClose={() => setShowAroPopup(false)}
            overtimeRooms={aroOvertimeRooms}
            roomsMap={new Map(rooms.map(r => [r.id, r]))}
            currentTime={currentTime}
          />
        )}


        {/* Detail statistik sálu pro daný den */}
        {statsRoomId && (() => {
          const sr = roomUtilization.rows.find((x) => x.id === statsRoomId);
          if (!sr) return null;
          const closed = sr.workingMinutes === 0;
          const col = closed ? 'rgba(255,255,255,0.4)' : utilColor(sr.utilizationPct);
          const kpis: { label: string; value: string; color: string }[] = [
            { label: 'Vytíženost', value: closed ? '—' : `${sr.utilizationPct}%`, color: col },
            { label: 'Operace dnes', value: `${sr.operations}`, color: C.cyan },
            { label: 'Obsazené', value: fmtMin(sr.occupiedMinutes), color: C.textHi },
            { label: 'Pracovní', value: sr.workingMinutes > 0 ? fmtMin(sr.workingMinutes) : '—', color: 'rgba(255,255,255,0.7)' },
            { label: 'Ø délka operace', value: sr.avgOpMin > 0 ? fmtMin(sr.avgOpMin) : '—', color: C.textHi },
            { label: 'Pauza', value: sr.pausedMinutes > 0 ? fmtMin(sr.pausedMinutes) : '—', color: sr.pausedMinutes > 0 ? C.cyan : 'rgba(255,255,255,0.4)' },
          ];
          const measuredByStep = new Map(sr.phases.map((phase) => [phase.stepIndex, phase]));
          const summaryPhases = [
            ...activeStatuses.map((status, index) => {
              const measured = measuredByStep.get(index);
              return {
                name: status.name || `Fáze ${index + 1}`,
                color: status.accent_color || status.color || '#6b7280',
                ms: measured?.ms || 0,
                minutes: measured?.minutes || 0,
              };
            }),
            { name: 'Pauza', color: C.cyan, ms: sr.pausedMs, minutes: sr.pausedMinutes },
          ];
          const summaryTotalMs = summaryPhases.reduce((sum, phase) => sum + phase.ms, 0);
          return (
            <motion.div
              className="timeline-popup-overlay fixed inset-0 z-[120] flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStatsRoomId(null)}
              role="dialog"
              aria-modal="true"
              aria-label={`Statistiky sálu ${sr.name}`}
            >
              <motion.div
                className="timeline-popup-panel w-full max-w-5xl max-h-[calc(100vh-32px)] overflow-y-auto"
                initial={{ scale: 0.96, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 12 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Hlavička */}
                <div className="timeline-popup-header flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex flex-col leading-tight min-w-0">
                    <h2 className="truncate" style={{ color: C.textHi }}>
                      {sr.name}
                      {sr.isEmergency && <span className="ml-2 text-[9px] font-bold uppercase" style={{ color: C.red }}>NOUZE</span>}
                      {sr.isPaused && <span className="ml-2 text-[9px] font-bold uppercase" style={{ color: C.yellow }}>PAUZA</span>}
                    </h2>
                    <p className="mt-1 uppercase">
                      {sr.department || 'Operační sál'} · statistiky pro {currentTime.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={() => setStatsRoomId(null)}
                    aria-label="Zavřít"
                    className="timeline-popup-close w-9 h-9 flex items-center justify-center transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4 text-white/60" />
                  </button>
                </div>

                {/* Statistiky sálu používají přesně stejnou skladbu jako detail
                    fáze: pilulka s nadpisem, souhrnná karta a pod ní vodorovný
                    pás fází. Dřív to byly KPI dlaždice, prstenec a dva sloupce
                    řádků po stranách — jiný jazyk pro tentýž typ obsahu. */}
                <div className="px-5 pt-4 pb-1">
                  <div className="timeline-popup-journey-heading flex items-end justify-between mb-4">
                    <div>
                      <p className="timeline-popup-journey-kicker text-[10px] uppercase tracking-[0.28em] font-semibold">Cesta výkonu</p>
                      <p className="timeline-popup-journey-title mt-2">Celodenní zastoupení fází</p>
                    </div>
                    <span className="timeline-popup-journey-count tabular-nums">
                      {String(sr.operations).padStart(2, '0')} {sr.operations === 1 ? 'cyklus' : 'cyklů'}
                    </span>
                  </div>

                  <section className="timeline-popup-journey" aria-label="Zastoupení fází za celý den">
                    <div className="timeline-popup-journey-summary">
                      <div>
                        <span className="timeline-popup-section-title">Celý den</span>
                        <div className="mt-2 flex items-baseline gap-2.5">
                          <strong style={{ color: C.textHi }}>{sr.operations}</strong>
                          <span style={{ color: C.cyan }}>{sr.operations === 1 ? 'cyklus' : 'cykly'}</span>
                        </div>
                        <p className="mt-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>
                          {fmtMin(Math.round(summaryTotalMs / 60000))} naměřeno
                        </p>
                      </div>

                      <div>
                        <div className="mb-2.5 flex items-center justify-between">
                          <span className="timeline-popup-section-title">Podíl fází včetně pauzy</span>
                          <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>100 %</span>
                        </div>
                        <div className="timeline-popup-data-bar flex h-3 w-full overflow-hidden gap-px p-px">
                          {summaryPhases.map((phase, index) => {
                            const share = summaryTotalMs > 0 ? (phase.ms / summaryTotalMs) * 100 : 0;
                            if (share <= 0) return null;
                            return (
                              <motion.div
                                key={`${phase.name}-${index}`}
                                title={`${phase.name} · ${share.toFixed(1)} % · ${phase.minutes} min`}
                                className="h-full"
                                style={{ width: `${share}%`, minWidth: 4, background: phase.color }}
                                initial={{ scaleX: 0, opacity: 0 }}
                                animate={{ scaleX: 1, opacity: 1 }}
                                transition={{ delay: index * 0.05, duration: 0.45 }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <ol className="timeline-popup-phase-roadmap" aria-label="Fáze za celý den">
                      {summaryPhases.map((phase, index) => {
                        const share = summaryTotalMs > 0 ? (phase.ms / summaryTotalMs) * 100 : 0;
                        const merged = phase.minutes > 0;
                        return (
                          <li key={`${phase.name}-${index}`} className="timeline-popup-phase-roadmap-step">
                            <span
                              className="timeline-popup-phase-roadmap-marker"
                              style={{
                                borderColor: merged ? `${phase.color}66` : 'rgba(255,255,255,0.12)',
                                background: merged ? `${phase.color}22` : 'rgba(255,255,255,0.03)',
                                color: merged ? phase.color : 'rgba(255,255,255,0.35)',
                              }}
                            >
                              {index + 1}
                            </span>
                            <span className="timeline-popup-phase-roadmap-status">
                              {merged ? 'Změřeno' : 'Bez záznamu'}
                            </span>
                            <strong className="timeline-popup-phase-roadmap-name">{phase.name}</strong>
                            <span
                              className="timeline-popup-phase-roadmap-share"
                              style={{ color: merged ? phase.color : 'rgba(255,255,255,0.3)' }}
                            >
                              {share.toFixed(1)} %
                            </span>
                            <span className="timeline-popup-phase-roadmap-time">{phase.minutes} min</span>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                </div>

                {/* Klíčové hodnoty dne — stejný pás jako patička detailu fáze. */}
                <dl className="timeline-popup-facts relative z-10 mx-5 mb-5 mt-4">
                  {kpis.map((k, i) => (
                    <div key={i} className="timeline-popup-fact">
                      <div className="min-w-0">
                        <dt>{k.label}</dt>
                        <dd className="tabular-nums" style={{ color: k.color }}>{k.value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Prognóza kapacity & Statistiky dne — samostatné popupy s vlastní AnimatePresence */}
      <CapacityForecast
        isOpen={showForecast}
        onClose={() => setShowForecast(false)}
        rooms={rooms}
        currentTime={currentTime}
      />
      <DayStatistics
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        rows={roomUtilization.rows}
        totals={roomUtilization.totals}
        kpis={orKpis}
        onSelectRoom={(id) => setStatsRoomId(id)}
      />
      <PhaseFingerprint
        isOpen={showFingerprint}
        onClose={() => setShowFingerprint(false)}
        rows={roomUtilization.rows}
      />
      <AttentionFeed
        isOpen={showAttention}
        onClose={() => setShowAttention(false)}
        rooms={rooms}
        currentTime={currentTime}
        warningsByRoom={warningsByRoom}
        planAvailable={plannedSchedules !== null && plannedSchedules !== undefined}
        onSelectRoom={(id) => { setShowAttention(false); openLiveRoom(id); }}
      />
      <PhaseOptimizer
        isOpen={showPhaseOptimizer}
        onClose={() => setShowPhaseOptimizer(false)}
        rows={roomUtilization.rows}
        onSelectRoom={(id) => { setShowPhaseOptimizer(false); setStatsRoomId(id); }}
      />
      <TimelineHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        rooms={rooms}
        onSelectRoom={(id) => { setShowHistory(false); openLiveRoom(id); }}
      />
      <DelaySimulator
        isOpen={showSimulator}
        onClose={() => setShowSimulator(false)}
        rooms={rooms}
        currentTime={currentTime}
      />

      {/* Hover tooltip pro probíhající operace — fixed pozice u kurzoru, mimo overflow clip */}
      <AnimatePresence>
        {hoveredOp && hoveredOp.completed && (() => {
          const r = hoveredOp.room;
          const c = hoveredOp.completed;
          const startMs = new Date(c.startedAt).getTime();
          const endMs = new Date(c.endedAt).getTime();
          const durMin = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
            ? Math.round((endMs - startMs) / 60000) : 0;
          const durStr = durMin >= 60 ? `${Math.floor(durMin / 60)}h ${String(durMin % 60).padStart(2, '0')}m` : `${durMin}m`;
          const fmt = (ms: number) => Number.isFinite(ms) ? new Date(ms).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '—';
          const phases = c.statusHistory?.length || 0;
          const clr = C.slate;
          return (
            <motion.div
              className="fixed z-[100] pointer-events-none rounded-xl px-4 py-3"
              style={{
                left: Math.min(hoveredOp.x + 16, (typeof window !== 'undefined' ? window.innerWidth : 1920) - 280),
                top: hoveredOp.y + 16,
                width: 260,
                background: '#0d1426',
                border: `1px solid ${clr}55`,
                boxShadow: `0 12px 40px rgba(0,0,0,0.55), 0 0 24px ${clr}22`,
              }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.12 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: clr, boxShadow: `0 0 8px ${clr}` }} />
                <p className="text-sm font-semibold text-white truncate">{r.name}</p>
              </div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md"
                  style={{ background: `${clr}1f`, color: clr, border: `1px solid ${clr}40` }}
                >
                  Dokončená operace
                </span>
                {phases > 0 && (
                  <span className="text-[10px] text-white/45">{phases} {phases === 1 ? 'fáze' : phases < 5 ? 'fáze' : 'fází'}</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Začátek', value: fmt(startMs) },
                  { label: 'Konec', value: fmt(endMs) },
                  { label: 'Trvání', value: durStr },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[8px] uppercase tracking-[0.15em] text-white/35 mb-0.5">{item.label}</p>
                    <p className="text-xs font-bold tabular-nums text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })()}
        {hoveredOp && !hoveredOp.completed && (() => {
          const r = hoveredOp.room;
          const stepIdx = Math.max(0, Math.min(r.currentStepIndex, activeStatuses.length - 1));
          const step = activeStatuses[stepIdx] || statusByOrderIndex[r.currentStepIndex] || null;
          const stepClr = r.isPaused ? '#22D3EE' : (step?.accent_color || step?.color || C.cyan);
          const stepTitle = r.isPaused ? 'Pauza' : (step?.title || step?.name || 'Probíhá');
          const startStr = r.operationStartedAt
            ? new Date(r.operationStartedAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
            : (r.currentProcedure?.startTime || '—');
          const endStr = r.estimatedEndTime
            ? new Date(r.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
            : '—';
          const remaining = getRemainingTime(r);
          return (
            <motion.div
              className="fixed z-[100] pointer-events-none rounded-xl px-4 py-3"
              style={{
                left: Math.min(hoveredOp.x + 16, (typeof window !== 'undefined' ? window.innerWidth : 1920) - 280),
                top: hoveredOp.y + 16,
                width: 260,
                background: '#0d1426',
                border: `1px solid ${stepClr}55`,
                boxShadow: `0 12px 40px rgba(0,0,0,0.55), 0 0 24px ${stepClr}22`,
              }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.12 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stepClr, boxShadow: `0 0 8px ${stepClr}` }} />
                <p className="text-sm font-semibold text-white truncate">{r.name}</p>
              </div>
              {r.currentProcedure?.name && (
                <p className="text-xs text-white/70 mb-2 leading-snug line-clamp-2">{r.currentProcedure.name}</p>
              )}
              <div className="flex items-center gap-1.5 mb-2.5">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md"
                  style={{ background: `${stepClr}1f`, color: stepClr, border: `1px solid ${stepClr}40` }}
                >
                  {stepTitle}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Začátek', value: startStr },
                  { label: 'Odhad konce', value: endStr },
                  { label: 'Zbývá', value: remaining || '—' },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[8px] uppercase tracking-[0.15em] text-white/35 mb-0.5">{item.label}</p>
                    <p className="text-xs font-bold tabular-nums text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ======== MOBILE VIEW (md:hidden) — redesigned ======== */}
      <MobileTimelineView
        rooms={sortedRooms}
        warningsByRoom={warningsByRoom}
        currentSpecialties={currentSpecialties}
        activeStatuses={activeStatuses}
        currentTime={currentTime}
        stats={stats}
        onSelectRoom={openLiveRoom}
      />

      {/* ======== DESKTOP VIEW (hidden on mobile) ======== */}
      <div
        className="app-module-content hidden md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden"
      >

      {/* ======== Header with Title and Stats ======== */}
      <div 
        className="sticky top-0 z-40 flex-shrink-0"
        style={{
          background: 'transparent',
        }}
      >
        <div className="-mt-1 pt-1 pb-3">

          {/* Jediná horní lišta — nástroje vlevo, čas uprostřed, zoom a ARO vpravo */}
          <div className="timeline-commandbar relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 xl:gap-3">

            {/* Left: timeline actions */}
            <TimelineCommandBar
              activeStatuses={activeStatuses}
              sortMode={sortMode}
              setSortMode={setSortMode}
              showSortMenu={showSortMenu}
              setShowSortMenu={setShowSortMenu}
              showToolsMenu={showToolsMenu}
              setShowToolsMenu={setShowToolsMenu}
              showLegend={showLegend}
              setShowLegend={setShowLegend}
              showSummary={showSummary}
              setShowSummary={setShowSummary}
              density={density}
              setDensity={setDensity}
              scrubActive={scrubActive}
              setScrubActive={setScrubActive}
              exitScrub={exitScrub}
              isFullscreen={isFullscreen}
              toggleFullscreen={toggleFullscreen}
              attentionCount={attentionCount}
              lastUpdated={lastUpdated}
              isRefreshing={isRefreshing}
              handleRefresh={handleRefresh}
              onRefresh={onRefresh}
              setShowHistory={setShowHistory}
              setShowAttention={setShowAttention}
              setShowSimulator={setShowSimulator}
              setShowForecast={setShowForecast}
              setShowPhaseOptimizer={setShowPhaseOptimizer}
              setShowFingerprint={setShowFingerprint}
              setShowStats={setShowStats}
            />

            {/* Čas je přesně uprostřed lišty a bez samostatného rámečku. */}
            <TimelineClockDisplay />

            {/* Right: ARO Overtime indicator (zoom ovládání odstraněno — osa
                vždy zobrazuje celý den na šířku) */}
            <div className="flex items-center justify-end gap-2.5 min-w-0">

            {aroOvertimeRooms.length > 0 ? (
              <motion.button
                onClick={() => setShowAroPopup(true)}
                className="relative flex-shrink-0 h-12 rounded-lg px-4 py-2 overflow-hidden transition-transform duration-300 hover:scale-[1.02] cursor-pointer"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  background: `linear-gradient(135deg, ${C.red}20 0%, ${C.red}10 100%)`,
                  border: `2px solid ${C.red}50`,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                <div className="relative flex items-center gap-3 h-full">
                  <motion.div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      background: `${C.red}30`,
                      border: `2px solid ${C.red}60`,
                      boxShadow: 'none',
                    }}
                  >
                    <AlertTriangle className="w-4 h-4" style={{ color: C.red }} />
                  </motion.div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.25em] font-bold" style={{ color: C.red }}>ARO PŘESAH</p>
                    <p className="text-xl font-black leading-tight tabular-nums" style={{ color: C.red }}>
                      {aroOvertimeRooms.length}
                      <span className="text-xs font-medium ml-1 opacity-70">sálů</span>
                    </p>
                  </div>
                </div>
              </motion.button>
            ) : (
              <div
                className="timeline-status-calm flex-shrink-0 h-12 rounded-lg px-4 py-2 flex items-center gap-2.5"
                style={{
                  background: `linear-gradient(135deg, ${C.green}15 0%, ${C.green}05 100%)`,
                }}
              >
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: `${C.green}18` }}
                >
                  <CheckCircle className="w-4 h-4" style={{ color: C.green }} />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.25em] font-medium text-white/40">ARO STATUS</p>
                  <p className="text-sm font-semibold" style={{ color: C.green }}>V pořádku</p>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>


      {/* ======== Main Timeline ======== */}
      <div className="timeline-scheduler-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] relative z-10">

        {/* Time Axis Header — tmavší pás nad řádky; vnější hranu kreslí shell */}
            <TimelineAxisHeader
              zoom={zoom}
              TIME_MARKERS={TIME_MARKERS}
              TIMELINE_HOURS={TIMELINE_HOURS}
              axisWidth={axisWidth}
              currentHour={currentHour}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              timelineRef={timelineRef}
            />

        {/* Navigační minimapa se objeví jen při přiblížení a nezabírá místo v základním zobrazení. */}
        {zoom > 1 && (
          <div
            className="flex flex-shrink-0 items-center h-11"
            style={{
              background: 'rgba(6,15,24,0.93)',
              borderLeft: `1px solid ${C.borderStrong}`,
              borderRight: `1px solid ${C.borderStrong}`,
              borderTop: `1px solid ${C.border}`,
            }}
          >
            <div
              className="h-full px-4 flex items-center justify-between gap-3 shrink-0"
              style={{ width: ROOM_LABEL_WIDTH, minWidth: ROOM_LABEL_WIDTH, borderRight: `1px solid ${C.border}` }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Crosshair className="w-3.5 h-3.5 shrink-0" style={{ color: C.cyan }} />
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/55">Navigace dne</p>
                  <p className="text-[8px] text-white/28 truncate">Kliknutím posuňte výřez</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold tabular-nums" style={{ color: C.cyan }}>{zoom.toFixed(1)}×</span>
            </div>
            <div className="flex-1 px-3">
              <TimelineMinimap
                lanes={minimapLanes}
                nowPct={nowPercent}
                containerRef={rowsContainerRef}
                axisRef={timelineRef}
                zoom={zoom}
              />
            </div>
          </div>
        )}

        {/* Room Rows Container */}
        <div
          className="flex-1 min-h-0 overflow-x-auto overflow-y-auto timeline-scroll"
          data-tour="tl-canvas"
          style={{
            // Podklad řádků nese shell (tmavý gradient) — zde jen průhledná plocha
            // bez vlastního rámečku, aby se hrany nezdvojovaly.
            background: 'transparent',
          }}
          ref={rowsContainerRef}
          onScroll={(e) => {
            // Synchronizace horizontálního scrollu řádk�� s časovou osou nahoře
            if (timelineRef.current) timelineRef.current.scrollLeft = e.currentTarget.scrollLeft;
          }}
        >
          <div
            className={`relative ${density === 'auto' ? 'h-full' : 'min-h-full'}`}
            ref={scrollContainerRef}
            style={{
              width: `${zoom * 100}%`,
              minWidth: `${zoom * 100}%`,
              background: 'transparent',
              transition: 'width 0.25s ease, min-width 0.25s ease',
            }}
          >
            {/* Denní pásy (RÁNO/DEN/VEČER/NOC) odstraněny — jednotný tmavý podklad,
                o vizuální rytmus se stará jen hodinová mřížka. */}

            {/* Now indicator - Premium animated line with glow */}
            <AnimatePresence>
              {nowPercent >= 0 && nowPercent <= 100 && (
                <motion.div 
                  className="absolute top-0 bottom-0 z-30 pointer-events-none" 
                  style={{
                    left: `calc(${ROOM_LABEL_WIDTH}px + ((100% - ${ROOM_LABEL_WIDTH}px) * ${nowPercent / 100}))`
                  }}
                  initial={false}
                >
                  {/* „Teď" používá modrotyrkysovou linku scheduleru; výstražné barvy
                      tak zůstávají vyhrazené pro provozní rizika. */}
                  <div
                    className="absolute -left-[1px] top-0 bottom-0 w-[2px]"
                    style={{
                      background: `linear-gradient(to bottom, ${C.now}, ${C.primary})`,
                      boxShadow: `0 0 12px ${C.now}42`,
                    }}
                  />
                  {/* Bod „teď". Dřív pulzoval ve smyčce bez konce — na sálovém
                      monitoru, který běží nepřetržitě, to znamená vykreslování,
                      které se nikdy nezastaví. Linka se navíc sama posouvá, takže
                      o pohyb nepřijdeme. Statický bod v prstenci ho nahradí. */}
                  <div
                    className="absolute -left-[1px] top-[2px] -translate-x-1/2 w-2.5 h-2.5 rounded-full"
                    style={{
                      background: C.now,
                      boxShadow: `0 0 0 3px ${C.now}26, 0 0 12px ${C.now}80`,
                    }}
                  />
                  <div
                    className="absolute -left-[1px] -top-[14px] -translate-x-1/2 px-2.5 py-[4px] rounded-lg whitespace-nowrap"
                    style={{
                      background: `linear-gradient(135deg, ${C.now}, ${C.primary})`,
                      boxShadow: `0 5px 16px ${C.primary}38`,
                    }}
                  >
                    <span className="text-[10px] font-bold font-mono tabular-nums leading-none" style={{ color: '#06111A' }}>
                      {currentHour}:{currentMin < 10 ? '0' : ''}{currentMin}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hour grid overlay — jemná svislá hodinová mřížka přes řádky, sladěná s časovou osou */}
            <div className="absolute inset-y-0 z-20 pointer-events-none" style={{ left: ROOM_LABEL_WIDTH, right: 0 }}>
              {TIME_MARKERS.slice(0, -1).map((hour, i) => {
                const leftPct = (i * 100) / TIMELINE_HOURS;
                const widthPct = 100 / TIMELINE_HOURS;
                const actualHour = TIMELINE_START_HOUR + hour;
                const displayHour = actualHour % 24;
                const isMajorHour = displayHour % 3 === 0;
                return (
                  <div
                    key={`grid-${hour}-${i}`}
                    className="absolute top-0 bottom-0"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  >
                    {/* Pozadí mřížky je jednotné — bez nočního ztmavení i bez
                        zvýraznění aktuální hodiny (na přání jednotný vzhled). */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-px"
                      style={{
                        background: isMajorHour
                          ? 'rgba(255, 255, 255, 0.06)'
                          : 'rgba(255, 255, 255, 0.022)',
                      }}
                    />
                    {/* Sub-hodinové dílky — objeví se až při zoomu, kdy mají smysl:
                        zoom ≥ 2 → půlhodiny, zoom ≥ 3 → čtvrthodiny */}
                    {zoom >= 2 && (
                      <div
                        className="absolute top-0 bottom-0 w-px"
                        style={{ left: '50%', background: 'rgba(148, 163, 184, 0.045)' }}
                      />
                    )}
                    {zoom >= 3 && (
                      <>
                        <div
                          className="absolute top-0 bottom-0 w-px"
                          style={{ left: '25%', background: 'rgba(148, 163, 184, 0.03)' }}
                        />
                        <div
                          className="absolute top-0 bottom-0 w-px"
                          style={{ left: '75%', background: 'rgba(148, 163, 184, 0.03)' }}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ════════ ČASOVÁ LUPA — interaktivní vrstva + světelná linie ════════ */}
            {scrubActive && (
              <div
                className="absolute inset-0 z-40"
                style={{ cursor: 'col-resize' }}
                onPointerMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left - ROOM_LABEL_WIDTH;
                  const w = Math.max(1, rect.width - ROOM_LABEL_WIDTH);
                  const pct = Math.max(0, Math.min(1, x / w));
                  const t = dayWindowStartMs + pct * TIMELINE_HOURS * 3600_000;
                  setScrubTime(Math.min(t, currentTime.getTime()));
                }}
                onDoubleClick={exitScrub}
                title="Dvojklik nebo Esc ukončí časovou lupu"
              >
                {/* Ztmavení scény — spotlight efekt */}
                <div className="absolute inset-0" style={{ background: 'rgba(3, 10, 15, 0.35)' }} />

                {scrubPct !== null && scrubTime !== null && (
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none"
                    style={{ left: `calc(${ROOM_LABEL_WIDTH}px + ((100% - ${ROOM_LABEL_WIDTH}px) * ${scrubPct / 100}))` }}
                  >
                    {/* Hlavní linie lupy */}
                    <div
                      className="absolute top-0 bottom-0 -left-[1px] w-[2px] rounded-full"
                      style={{
                        background: `linear-gradient(to bottom, ${C.purple}, ${C.purple}60)`,
                        boxShadow: `0 0 0 3px ${C.purple}26`,
                      }}
                    />
                    {/* Časová pilulka lupy */}
                    <div
                      className="absolute -top-[13px] -left-[1px] -translate-x-1/2 px-2.5 py-[4px] rounded-md whitespace-nowrap"
                      style={{
                        background: `linear-gradient(135deg, ${C.purple} 0%, #7C5CE0 100%)`,
                        boxShadow: `0 2px 10px rgba(0,0,0,0.5), 0 0 14px ${C.purple}55`,
                      }}
                    >
                      <span className="text-[11px] font-bold font-mono tabular-nums leading-none" style={{ color: '#150B2E' }}>
                        {new Date(scrubTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Room Rows */}
            <div className={`relative z-10 flex flex-col gap-0 ${density === 'auto' ? 'h-full' : ''}`}>
            {displayRooms.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <Search className="w-6 h-6 text-white/25" />
                <p className="text-sm text-white/50">Žádné sály neodpovídají filtru</p>
                <button
                  onClick={() => setStatusFilter('all')}
                  className="text-xs font-medium px-3 py-1 rounded-md transition-colors"
                  style={{ color: C.cyan, background: `${C.cyan}14`, border: `1px solid ${C.cyan}30` }}
                >
                  Zrušit filtr
                </button>
              </div>
            )}
            {displayRooms.map((room, roomIndex) => (
              <TimelineRoomRow
                key={room.id}
                room={room}
                warnings={warningsByRoom.get(room.id) ?? []}
                roomIndex={roomIndex}
                currentTime={currentTime}
                dayWindowStartMs={dayWindowStartMs}
                TIMELINE_HOURS={TIMELINE_HOURS}
                rowHeight={rowHeight}
                density={density}
                showSummary={showSummary}
                scrubActive={scrubActive}
                scrubTime={scrubTime}
                activeStatuses={activeStatuses}
                statusByOrderIndex={statusByOrderIndex}
                currentSpecialties={currentSpecialties}
                roomUtilization={roomUtilization}
                getTimePercentForTimeline={getTimePercentForTimeline}
                getOperationPosition={getOperationPosition}
                getRemainingTime={getRemainingTime}
                getAroPosition={getAroPosition}
                getOvertimeInfo={getOvertimeInfo}
                statusAtTime={statusAtTime}
                utilColor={utilColor}
                openLiveRoom={openLiveRoom}
                openHistoricalPhase={openHistoricalPhase}
                setStatsRoomId={setStatsRoomId}
                setHoveredOp={setHoveredOp}
              />
            ))}
            </div>
          </div>
        </div>
      </div>

      </div>{/* end desktop wrapper */}
    </div>
  );
}

// Memoized export — TimelineModule je drahý (1500+ řádků s framer-motion animacemi
// a iterací nad rooms × hours). Default shallow compare zajistí, že když App.tsx
// re-renderuje z nesouvisejícího důvodu (otevření modalu, změna current view),
// TimelineModule re-render přeskoč��. Re-renderne se jen když se reálně změní `rooms`.
const TimelineModule = React.memo(TimelineModuleImpl);
export default TimelineModule;
