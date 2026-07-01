import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, WeeklySchedule, DEFAULT_WEEKLY_SCHEDULE, DEFAULT_DAILY_BREAK_MINUTES } from '../types';
import { STEP_DURATIONS, STEP_COLORS } from '../constants';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import MobileTimelineView from './mobile/MobileTimelineView';
import AroOvertimePopup from './AroOvertimePopup';
import CapacityForecast from './timeline/CapacityForecast';
import DayStatistics from './timeline/DayStatistics';
import DelaySimulator from './timeline/DelaySimulator';
import PhaseFingerprint from './timeline/PhaseFingerprint';
import AttentionFeed from './timeline/AttentionFeed';
import PatientFlow from './timeline/PatientFlow';
import PhaseOptimizer from './timeline/PhaseOptimizer';
import TimelineHistory from './timeline/TimelineHistory';
import { 
  Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe, 
  Settings, User, Info, ChevronRight, Loader2, Pause, Phone, BedDouble, AlertCircle, CheckCircle,
  Search, ZoomIn, ZoomOut, Maximize2, Minimize2,
  RefreshCw, ArrowUpDown, Crosshair, BarChart3, ChevronDown, Timer, History, TrendingUp, SlidersHorizontal, Fingerprint, BellRing, Workflow, Zap, Biohazard
} from 'lucide-react';

// ========== DESIGN TOKENS, CONSTANTS & HELPERS (extrahováno do ./timeline) ==========
import {
  C,
  TIMELINE_START_HOUR,
  TIMELINE_HOURS,
  ROOM_LABEL_WIDTH,
  MIN_ROW_HEIGHT,
  MAX_ROW_HEIGHT,
  ROW_GAP_PX,
  ROW_PADDING_PX,
  TIME_MARKERS,
  ROOM_COLOR_ORDER,
  ROOM_COLORS,
  STEP_INDEX_COLORS,
} from './timeline/constants';
import {
  getTimePercent,
  parseTimeToDate,
  hourLabelCompact,
  isOperationInWindow,
  exceedsT24Hours,
  getTimePercentForTimeline,
  getOperationPosition,
} from './timeline/utils';
import StatBox from './timeline/StatBox';
import RoomDetailPopup from './timeline/RoomDetailPopup';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
  /** Volitelný callback pro ruční obnovení dat (refetch). Pokud chybí, tlačítko se neukáže. */
  onRefresh?: () => Promise<void> | void;
}

const TIME_PERIOD_BANDS = [
  { label: 'RÁNO', left: 0, width: 20.833, color: '#38BDF8' },
  { label: 'DEN', left: 20.833, width: 25, color: '#34D399' },
  { label: 'VEČER', left: 45.833, width: 16.667, color: '#FBBF24' },
  { label: 'NOC', left: 62.5, width: 37.5, color: '#A78BFA' },
] as const;

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

type SortMode = 'default' | 'name' | 'status';

function TimelineModuleImpl({ rooms, onRefresh }: TimelineModuleProps) {
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
  
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  // Mobilní přepínač: list = karty se statusem a progressem; axis = horizontální 24h osa
  const [mobileView, setMobileView] = useState<'list' | 'axis'>('list');
  const [rowHeight, setRowHeight] = useState<number>(MAX_ROW_HEIGHT);
  const [showAroPopup, setShowAroPopup] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showFingerprint, setShowFingerprint] = useState(false);
  const [showAttention, setShowAttention] = useState(false);
  const [showPatientFlow, setShowPatientFlow] = useState(false);
  const [showPhaseOptimizer, setShowPhaseOptimizer] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // --- Nové funkce: vyhledávání, filtr stavu, zoom časové osy, hover tooltip ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'free'>('all');
  const [zoom, setZoom] = useState(1); // 1 = výchozí (celá osa se vejde), >1 = horizontální zoom
  const [hoveredOp, setHoveredOp] = useState<{
    room: OperatingRoom;
    x: number;
    y: number;
    /** Pokud je vyplněno, jde o najetí na již DOKONČENOU operaci (jinak živý výkon). */
    completed?: {
      startedAt: string;
      endedAt: string;
      statusHistory?: Array<{ stepIndex: number; startedAt: string; stepName?: string; color?: string }>;
    };
  } | null>(null);
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
  const rowsContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const moduleRootRef = useRef<HTMLDivElement>(null);
  // TV / fullscreen režim — pro nástěnnou obrazovku na operačním traktu
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      await onRefresh();
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing]);

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

  // Klávesové zkratky: T = skok na teď, + / − = zoom, / = hledání.
  // Ignorují se, když uživatel píše do inputu.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 't' || e.key === 'T') {
        scrollToNow();
      } else if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(4, Math.round((z + 0.5) * 2) / 2));
      } else if (e.key === '-') {
        setZoom((z) => Math.max(1, Math.round((z - 0.5) * 2) / 2));
      } else if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
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



  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  /* --- Sály v původním pořadí; nouzové/uzamčené zůstávají na své pozici --- */
  const sortedRooms = useMemo(() => {
    return [...rooms];
  }, [rooms]);

  // --- Filtrované sály: vyhledávání (název / oddělení) + filtr stavu ---
  // Stav odvozujeme z currentStepIndex: 0 = volný (Sál připraven), >0 = probíhá.
  // Sály ve stavu nouze se zobrazují vždy (kritické).
  const displayRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = sortedRooms.filter((room) => {
      if (room.isEmergency) return true;
      const matchesSearch =
        !q ||
        room.name?.toLowerCase().includes(q) ||
        room.department?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      const isRoomActive = room.currentStepIndex > 0 || room.isLocked || room.isPaused;
      if (statusFilter === 'active') return isRoomActive;
      if (statusFilter === 'free') return !isRoomActive;
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
  }, [sortedRooms, searchQuery, statusFilter, sortMode]);

  // Pro statistiky zobrazujeme VŠECHNY sály bez filtrování
  const allRoomsForStats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = sortedRooms.filter((room) => {
      const matchesSearch =
        !q ||
        room.name?.toLowerCase().includes(q) ||
        room.department?.toLowerCase().includes(q);
      return matchesSearch;
    });
    
    if (sortMode === 'name') {
      return [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'cs'));
    }
    if (sortMode === 'status') {
      const rank = (r: OperatingRoom) =>
        r.isEmergency ? 0 : (r.currentStepIndex > 0 || r.isLocked || r.isPaused) ? 1 : 2;
      return [...filtered].sort((a, b) => rank(a) - rank(b) || (a.name || '').localeCompare(b.name || '', 'cs'));
    }
    return filtered;
  }, [sortedRooms, searchQuery, sortMode]);
  
  // Calculate responsive row height — všechny sály se MUSÍ vejít bez scrollování.
  // useLayoutEffect: výška se nastaví PŘED prvním vykreslením → žádné poskočení/blikání.
  useLayoutEffect(() => {
    const calculateRowHeight = () => {
      const count = displayRooms.length;
      if (rowsContainerRef.current && count > 0) {
        const containerHeight = rowsContainerRef.current.clientHeight;
        const totalGapPx = (count - 1) * ROW_GAP_PX;
        const totalPaddingPx = ROW_PADDING_PX * 2; // top + bottom
        const availableHeight = Math.max(0, containerHeight - totalGapPx - totalPaddingPx);
        // Math.floor → zaokrouhli dolů, aby ani 1px subpixel rounding nezpůsobil overflow
        const calculatedHeight = Math.floor(availableHeight / count);
        const clampedHeight = Math.max(MIN_ROW_HEIGHT, Math.min(MAX_ROW_HEIGHT, calculatedHeight));
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
  }, [displayRooms.length]);

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
    const operations = rooms.filter(r => r.currentStepIndex >= 0 && r.currentStepIndex <= 4 && !r.isEmergency && !r.isLocked).length;
    const cleaning = rooms.filter(r => r.currentStepIndex === 5 && !r.isEmergency && !r.isLocked).length;
    const free = rooms.filter(r => r.currentStepIndex >= 6 && !r.isEmergency && !r.isLocked).length;
    const completed = rooms.reduce((acc, r) => r.currentStepIndex >= 6 ? acc + r.operations24h : acc, 0);
    const doctorsWorking = rooms.filter(r => r.staff?.doctor?.name && r.currentStepIndex > 0).length;
    const doctorsFree = rooms.filter(r => r.staff?.doctor?.name && r.currentStepIndex >= 6).length;
    const nursesWorking = rooms.filter(r => r.staff?.nurse?.name && r.currentStepIndex > 0).length;
    const nursesFree = rooms.filter(r => r.staff?.nurse?.name && r.currentStepIndex >= 6).length;
    const emergencyCount = rooms.filter(r => r.isEmergency).length;
    return { operations, cleaning, free, completed, doctorsWorking, doctorsFree, nursesWorking, nursesFree, emergencyCount };
  }, [rooms]);

  /* --- Vytížení po sálech (POUZE dnešní den, reálná data z DB):
     pro každý sál spočítá počet operací, pracovní kapacitu (z rozvrhu dne,
     minus pauza), obsazené minuty (z dnešních dokončených + probíhající
     operace; pauza se NEpočítá), vytíženost v % a rozpad času po fázích
     operačního cyklu (per-room timeline). --- */
  const roomUtilization = useMemo(() => {
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const todayKey = dayKeys[currentTime.getDay()];
    const now = currentTime.getTime();

    // Hranice dnešního dne — vše počítáme JEN z dnešního dne
    const dayStart = new Date(currentTime); dayStart.setHours(0, 0, 0, 0);
    const startMs = dayStart.getTime();
    const endMs = startMs + 24 * 60 * 60 * 1000;
    const isToday = (iso?: string | null): boolean => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return Number.isFinite(t) && t >= startMs && t < endMs;
    };

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
      if (today?.enabled) {
        const startM = today.startHour * 60 + today.startMinute;
        const endM = today.endHour * 60 + today.endMinute;
        const breakM = today.breakMinutes ?? DEFAULT_DAILY_BREAK_MINUTES;
        workingMinutes = Math.max(0, endM - startM - breakM);
      }

      let occupiedMs = 0;
      let operations = 0;
      const phaseMs: Record<number, number> = {}; // stepIndex (pozice) → ms

      // Akumulace času po fázích z historie statusů jedné operace
      const accumulatePhases = (history: Array<{ stepIndex: number; startedAt: string }> | undefined, opEndMs: number) => {
        if (!history || history.length === 0) return;
        history.forEach((entry, idx) => {
          const segStart = new Date(entry.startedAt).getTime();
          const next = history[idx + 1];
          const segEnd = next ? new Date(next.startedAt).getTime() : opEndMs;
          const dur = Math.max(0, segEnd - segStart);
          if (dur > 0) phaseMs[entry.stepIndex] = (phaseMs[entry.stepIndex] || 0) + dur;
        });
      };

      // Dnešní dokončené operace (filtr na dnešní den dle startedAt)
      (room.completedOperations || []).forEach((op) => {
        if (!isToday(op.startedAt)) return;
        const s = new Date(op.startedAt).getTime();
        const e = new Date(op.endedAt).getTime();
        if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
          occupiedMs += e - s;
          operations++;
          accumulatePhases(op.statusHistory, e);
        }
      });

      // Probíhající operace — pouze pokud začala dnes; pauza se NEpočítá
      const isRunning = room.currentStepIndex > 0 && room.currentStepIndex < 6 && !room.isLocked;
      if (isRunning && isToday(room.operationStartedAt)) {
        operations++;
        const s = new Date(room.operationStartedAt as string).getTime();
        if (!room.isPaused && now > s) occupiedMs += now - s;
        accumulatePhases(room.statusHistory, now);
      }

      const occupiedMinutes = Math.round(occupiedMs / 60000);
      
      // Vytížení se počítá jako procento z pracovní kapacity (z rozvrhu).
      // Pokud je sál dnes zavřený (workingMinutes == 0), ale má operace,
      // pak se počítá z reálného času operací (od první do poslední operace).
      let utilizationPct = 0;
      if (workingMinutes > 0) {
        // Standardní výpočet: procento z pracovní doby
        utilizationPct = Math.round((occupiedMinutes / workingMinutes) * 100);
      } else if (occupiedMinutes > 0) {
        // Sál je zavřený podle rozvrhu, ale má operace dnes
        // Počítáme % vytížení z reálného span času (od první do poslední operace)
        // Zde použijeme arbitrary 8h = 480m jako baseline (typická pracovní doba)
        utilizationPct = Math.round((occupiedMinutes / 480) * 100);
      }

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

      // Doba pauzy — aktuálně probíhající pauza (od pausedAt do teď).
      const pausedMs = room.isPaused && room.pausedAt
        ? Math.max(0, now - new Date(room.pausedAt).getTime())
        : 0;
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
      ? Math.round((totals.occupiedMinutes / totals.workingMinutes) * 100)
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
    const FCOTS_GRACE_MS = 15 * 60 * 1000;

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
  }, [rooms, currentTime, roomUtilization]);

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


  /* --- Auto-sledování „teď": při zoomu drží aktuální čas v záběru --- */
  const [autoFollowNow, setAutoFollowNow] = useState(false);
  useEffect(() => {
    if (!autoFollowNow || zoom <= 1) return;
    scrollToNow();
    const id = setInterval(scrollToNow, 30_000);
    return () => clearInterval(id);
  }, [autoFollowNow, zoom, scrollToNow]);

  /* ════════ ČASOVÁ LUPA & REPLAY DNE (time-travel) ════════
     Scrub režim: tažením myši po ose se zobrazí stav VŠECH sálů v daném
     okamžiku (rekonstrukce z historie statusů). Replay: kinematické
     přehrání celého dne od 7:00 do teď. */
  const [scrubActive, setScrubActive] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  const dayWindowStartMs = useMemo(() => {
    const ws = new Date(currentTime);
    ws.setHours(TIMELINE_START_HOUR, 0, 0, 0);
    if (currentTime.getHours() < TIMELINE_START_HOUR) ws.setDate(ws.getDate() - 1);
    return ws.getTime();
  }, [currentTime]);

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

  /* --- ARO Overtime Tracking - rooms that exceed working hours.
     
     Pořadí ARO čísel (1, 2, 3...) je STABILNÍ podle pořadí, ve kterém sály
     vstoupily do overtime stavu — kdo dříve překročil pracovní dobu, dostane
     nižší číslo. Persistujeme timestampy v `useRef<Map>`, takže se pořadí
     nemění když se změní `estimatedEndTime` jiných sálů.
     
     Když sál opustí overtime stav (např. operatér zkrátil odhad nebo operace
     skončí), jeho záznam se vymaže a uvolní místo pro ostatní. */
  const aroEnteredAtRef = useRef<Map<string, number>>(new Map());
  
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
        
        // Stabilní timestamp vstupu do overtime — pokud sál vstupuje poprvé,
        // zaregistrujeme ho s aktuálním časem; jinak ponecháme původní timestamp.
        let enteredAt = aroEnteredAtRef.current.get(room.id);
        if (enteredAt === undefined) {
          enteredAt = Date.now();
          aroEnteredAtRef.current.set(room.id, enteredAt);
        }
        
        overtimeList.push({
          roomId: room.id,
          roomName: room.name,
          estimatedEndTime: endTime,
          workingEndTime,
          overtimeMinutes,
          enteredAt,
        });
      }
    });
    
    // Garbage collection — odstraň timestampy sálů, které už nejsou v overtime,
    // aby se při návratu sálu do overtime přidělil nový (vyšší) timestamp.
    const activeIds = new Set(overtimeList.map(r => r.roomId));
    for (const id of Array.from(aroEnteredAtRef.current.keys())) {
      if (!activeIds.has(id)) aroEnteredAtRef.current.delete(id);
    }
    
    // Sort podle pořadí vstupu do overtime — kdo první překročil pracovní dobu
    // dostane ARO #1, druhý #2 atd. Stabilní napříč rerender cykly.
    return overtimeList.sort((a, b) => a.enteredAt - b.enteredAt);
  }, [rooms, currentTime]);
  
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
  let activeRoomCounter = 0;

  return (
    <div
      ref={moduleRootRef}
      className="w-full h-full text-white overflow-hidden flex flex-col relative antialiased"
      style={{
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'optimizeLegibility',
        // Pozadí jako dashboard — průhledné (prosvítá globální animované pozadí).
        // Ve fullscreenu zachováme tmavý přechod, aby plocha nebyla prázdná.
        background: isFullscreen
          ? 'radial-gradient(120% 90% at 50% 38%, #241b4f 0%, #140f2e 38%, #0a0a18 70%, #07070f 100%)'
          : 'transparent',
      }}
    >
      {/* Tečkované pozadí jen ve fullscreenu (jinak prosvítá pozadí dashboardu) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.12] z-0"
        style={{ display: isFullscreen ? 'block' : 'none', backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '26px 26px' }}
      />

      {/* Room Detail Popup */}
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPopup room={selectedRoom} onClose={() => setSelectedRoom(null)} currentTime={currentTime} />
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
          return (
            <motion.div
              className="fixed inset-0 z-[120] flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStatsRoomId(null)}
              style={{ background: 'rgba(5,8,16,0.72)', backdropFilter: 'blur(6px)' }}
            >
              <motion.div
                className="w-full max-w-2xl rounded-2xl overflow-hidden"
                initial={{ scale: 0.96, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 12 }}
                onClick={(e) => e.stopPropagation()}
                style={{ background: 'linear-gradient(180deg, rgba(17,24,39,0.98) 0%, rgba(10,15,26,0.98) 100%)', border: `1px solid ${C.borderStrong}`, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
              >
                {/* Hlavička */}
                <div className="flex items-center justify-between gap-4 px-5 py-4" style={{ borderBottom: `1px solid ${C.border}`, borderLeft: `4px solid ${col}` }}>
                  <div className="flex flex-col leading-tight min-w-0">
                    <span className="text-base font-bold truncate" style={{ color: C.textHi }}>
                      {sr.name}
                      {sr.isEmergency && <span className="ml-2 text-[9px] font-bold uppercase" style={{ color: C.red }}>NOUZE</span>}
                      {sr.isPaused && <span className="ml-2 text-[9px] font-bold uppercase" style={{ color: C.yellow }}>PAUZA</span>}
                    </span>
                    <span className="text-[11px] text-white/40">
                      {sr.department || 'Operační sál'} · statistiky pro {currentTime.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <button
                    onClick={() => setStatsRoomId(null)}
                    aria-label="Zavřít"
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10 flex-shrink-0"
                  >
                    <X className="w-4 h-4 text-white/60" />
                  </button>
                </div>

                {/* KPI mřížka */}
                <div className="grid grid-cols-3 gap-2 px-5 pt-4">
                  {kpis.map((k, i) => (
                    <div key={i} className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}` }}>
                      <span className="text-lg font-bold tabular-nums leading-none" style={{ color: k.color }}>{k.value}</span>
                      <span className="text-[9px] uppercase tracking-wider text-white/40 text-center leading-tight">{k.label}</span>
                    </div>
                  ))}
                </div>

                {/* Timeline operačního cyklu (dnes) */}
                <div className="px-5 pt-4">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45">Timeline operačního cyklu (dnes)</span>
                  <div className="flex items-center h-10 rounded-xl overflow-hidden mt-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {sr.phases.length > 0 ? (
                      sr.phases.map((p, pi) => {
                        const w = sr.phaseTotalMs > 0 ? (p.ms / sr.phaseTotalMs) * 100 : 0;
                        return (
                          <div
                            key={pi}
                            className="relative h-full group flex items-center justify-center transition-all hover:brightness-110"
                            style={{ width: `${w}%`, minWidth: w > 0 ? 4 : 0, background: `linear-gradient(180deg, ${p.color} 0%, ${p.color}cc 100%)`, borderRight: pi < sr.phases.length - 1 ? '1px solid rgba(0,0,0,0.25)' : 'none' }}
                          >
                            {w > 10 && <span className="text-[10px] font-bold text-white/95 tabular-nums px-1 truncate">{p.minutes}m</span>}
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-[11px] text-white/30 px-3">Žádné operace v tento den</span>
                    )}
                  </div>
                </div>

                {/* Rozpad času po fázích */}
                <div className="px-5 py-4 mt-2 max-h-64 overflow-y-auto">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45">Čas po fázích</span>
                  <div className="flex flex-col gap-1.5 mt-2">
                    {sr.phases.length > 0 ? (
                      sr.phases.map((p, pi) => {
                        const pct = sr.phaseTotalMs > 0 ? Math.round((p.ms / sr.phaseTotalMs) * 100) : 0;
                        return (
                          <div key={pi} className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.color }} />
                            <span className="text-xs text-white/70 truncate" style={{ width: 150, flexShrink: 0 }}>{p.name}</span>
                            <div className="flex-1 h-2 rounded-full overflow-hidden min-w-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} />
                            </div>
                            <span className="text-xs font-semibold tabular-nums text-right flex-shrink-0" style={{ width: 56, color: C.textHi }}>{p.minutes} min</span>
                            <span className="text-[10px] tabular-nums text-white/40 text-right flex-shrink-0" style={{ width: 36 }}>{pct}%</span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-[11px] text-white/30">Pro tento den nejsou k dispozici žádná data fází.</span>
                    )}
                  </div>
                </div>
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
        onSelectRoom={(id) => { setShowAttention(false); const room = rooms.find((r) => r.id === id); if (room) setSelectedRoom(room); }}
      />
      <PatientFlow
        isOpen={showPatientFlow}
        onClose={() => setShowPatientFlow(false)}
        rooms={rooms}
        onSelectRoom={(id) => { setShowPatientFlow(false); const room = rooms.find((r) => r.id === id); if (room) setSelectedRoom(room); }}
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
        onSelectRoom={(id) => { setShowHistory(false); const room = rooms.find((r) => r.id === id); if (room) setSelectedRoom(room); }}
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
        statusByOrderIndex={statusByOrderIndex}
        activeStatuses={activeStatuses}
        currentTime={currentTime}
        stats={stats}
        mobileView={mobileView}
        onViewChange={setMobileView}
        onSelectRoom={setSelectedRoom}
        getRemainingTime={getRemainingTime}
      />

      {/* ======== DESKTOP VIEW (hidden on mobile) ======== */}
      <div
        className="hidden md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden"
      >

      {/* ======== Header with Title and Stats ======== */}
      <div 
        className="sticky top-0 z-40 flex-shrink-0"
        style={{
          background: 'transparent',
        }}
      >
        <div className={`${isFullscreen ? 'px-4' : 'px-5'} -mt-1 pt-1 pb-2`}>

          {/* Header Row - Live stats (left) · Time (center) · ARO (right) */}
          <div className="relative flex items-center justify-between gap-3">

            {/* Left: timeline actions */}
            <div className="flex-1 flex items-center justify-start min-w-0">
              <div className="hidden lg:flex items-center gap-3">
            {/* Akční cluster: živá data / souhrn / řazení */}
            <div
              className="hidden lg:flex items-center h-14 rounded-2xl px-2 gap-1"
              style={{ background: C.glass, border: `1px solid ${C.borderStrong}` }}
            >
              {/* Indikátor živých dat + ruční obnovení */}
              <button
                onClick={handleRefresh}
                disabled={!onRefresh || isRefreshing}
                aria-label="Obnovit data"
                title={`Živě · aktualizováno ${lastUpdated.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
                className="flex items-center gap-2 h-9 px-2.5 rounded-xl transition-colors hover:bg-white/5 disabled:cursor-default"
              >
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: C.green }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: C.green }} />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50 tabular-nums">
                  {lastUpdated.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {onRefresh && (
                  <RefreshCw className="w-2 h-2 text-white/25" />
                )}
              </button>

              <div className="w-px h-6 bg-white/10 mx-0.5" />

              {/* Historie — listování po dnech a zpětné zobrazení časové osy */}
              <button
                onClick={() => setShowHistory(true)}
                aria-label="Historie"
                title="Historie — listování po dnech a zpětné zobrazení časové osy"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5"
              >
                <CalendarDays className="w-4 h-4 text-white/60" />
              </button>

              {/* Tok pacienta — pipeline napříč traktem */}
              <button
                onClick={() => setShowPatientFlow(true)}
                aria-label="Tok pacienta"
                title="Tok pacienta — kde se nacházejí pacienti napříč traktem (volán → operace → volný)"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5"
              >
                <Workflow className="w-4 h-4 text-white/60" />
              </button>

              {/* Triáž pozornosti — co vyžaduje pozornost teď */}
              <button
                onClick={() => setShowAttention(true)}
                aria-label="Triáž pozornosti"
                title="Triáž pozornosti — vše, co teď vyžaduje pozornost na sálech"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5"
              >
                <BellRing className="w-4 h-4 text-white/60" />
              </button>

              {/* Pokročilé nástroje — soustředěné do jednoho přehledného menu */}
              <div className="relative">
                <button
                  onClick={() => setShowToolsMenu((value) => !value)}
                  aria-label="Pokročilé nástroje"
                  aria-haspopup="menu"
                  aria-expanded={showToolsMenu}
                  className="h-9 px-3 rounded-xl flex items-center gap-2 text-xs font-semibold transition-colors hover:bg-white/5"
                  style={showToolsMenu ? { background: `${C.cyan}1f`, color: C.cyan } : { color: 'rgba(255,255,255,0.65)' }}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Nástroje</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showToolsMenu ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showToolsMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowToolsMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.12 }}
                        role="menu"
                        className="absolute left-0 top-11 z-50 w-64 rounded-2xl overflow-hidden p-1.5"
                        style={{
                          background: 'rgba(7,16,25,0.98)',
                          border: `1px solid ${C.borderStrong}`,
                          boxShadow: '0 22px 55px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
                          backdropFilter: 'blur(24px)',
                        }}
                      >
                        {[
                          { label: 'Simulátor zpoždění', detail: 'Dopad skluzu na provoz', icon: SlidersHorizontal, color: C.orange, action: () => setShowSimulator(true) },
                          { label: 'Prognóza kapacity', detail: 'Vytížení a úzká hrdla', icon: TrendingUp, color: C.blue, action: () => setShowForecast(true) },
                          { label: 'Optimalizace fází', detail: 'Doporučení ke zrychlení', icon: Zap, color: C.yellow, action: () => setShowPhaseOptimizer(true) },
                          { label: 'Fázový otisk', detail: 'Porovnání profilů sálů', icon: Fingerprint, color: C.purple, action: () => setShowFingerprint(true) },
                          { label: 'Statistiky dne', detail: 'Výkon a rozpad času', icon: BarChart3, color: C.green, action: () => setShowStats(true) },
                        ].map((tool) => {
                          const ToolIcon = tool.icon;
                          return (
                            <button
                              key={tool.label}
                              role="menuitem"
                              onClick={() => { tool.action(); setShowToolsMenu(false); }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.055] transition-colors"
                            >
                              <span
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ color: tool.color, background: `${tool.color}14`, border: `1px solid ${tool.color}25` }}
                              >
                                <ToolIcon className="w-4 h-4" />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-xs font-semibold text-white/85">{tool.label}</span>
                                <span className="block text-[10px] text-white/35 mt-0.5">{tool.detail}</span>
                              </span>
                            </button>
                          );
                        })}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Časová lupa — inspekce stavu sálů v libovolném čase dne */}
              <button
                onClick={() => (scrubActive ? exitScrub() : setScrubActive(true))}
                aria-pressed={scrubActive}
                aria-label="Časová lupa — stav sálů v čase"
                title="Časová lupa: táhni po ose a uvidíš stav všech sálů v daném čase (Esc zavře)"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5"
                style={scrubActive ? { background: `${C.purple}1f`, color: C.purple } : undefined}
              >
                <History className={`w-4 h-4 ${scrubActive ? '' : 'text-white/60'}`} />
              </button>

              <div className="w-px h-6 bg-white/10 mx-0.5" />

              {/* TV / fullscreen režim — nástěnná obrazovka */}
              <button
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Ukončit režim celé obrazovky' : 'Režim celé obrazovky (TV)'}
                aria-pressed={isFullscreen}
                title={isFullscreen ? 'Ukončit TV režim (F)' : 'TV režim — celá obrazovka (F)'}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5"
                style={isFullscreen ? { background: `${C.cyan}1f`, color: C.cyan } : undefined}
              >
                {isFullscreen
                  ? <Minimize2 className="w-4 h-4" />
                  : <Maximize2 className="w-4 h-4 text-white/60" />}
              </button>

              <div className="w-px h-6 bg-white/10 mx-0.5" />

              {/* Řazení sálů */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu((v) => !v)}
                  aria-label="Řadit sály"
                  aria-haspopup="menu"
                  aria-expanded={showSortMenu}
                  title="Řadit sály"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5"
                  style={sortMode !== 'default' ? { background: `${C.cyan}1f`, color: C.cyan } : undefined}
                >
                  <ArrowUpDown className={`w-4 h-4 ${sortMode !== 'default' ? '' : 'text-white/60'}`} />
                </button>
                <AnimatePresence>
                  {showSortMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.12 }}
                        role="menu"
                        className="absolute right-0 top-11 z-50 w-44 rounded-xl overflow-hidden py-1"
                        style={{ background: '#0f141c', border: `1px solid ${C.borderStrong}`, boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}
                      >
                        {([
                          { key: 'default', label: 'Výchozí pořadí' },
                          { key: 'name', label: 'Podle názvu (A–Z)' },
                          { key: 'status', label: 'Podle stavu' },
                        ] as { key: SortMode; label: string }[]).map((opt) => (
                          <button
                            key={opt.key}
                            role="menuitemradio"
                            aria-checked={sortMode === opt.key}
                            onClick={() => { setSortMode(opt.key); setShowSortMenu(false); }}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-white/5"
                            style={{ color: sortMode === opt.key ? C.cyan : 'rgba(255,255,255,0.7)' }}
                          >
                            {opt.label}
                            {sortMode === opt.key && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
              </div>
            </div>

            {/* Center: Current Time */}
            <div
              className="flex flex-col items-center justify-center flex-shrink-0 rounded-2xl px-5 py-2"
              style={{ background: 'rgba(255,255,255,0.022)', border: `1px solid ${C.border}` }}
            >
              <p className="text-[9px] uppercase tracking-[0.28em] font-semibold text-white/35 mb-0.5">
                {formatDate(currentTime)}
              </p>
              <motion.p
                className="text-[28px] leading-none font-bold tabular-nums tracking-tight flex items-baseline gap-1"
                style={{ color: C.textHi }}
                initial={false}
              >
                <span>
                  {currentTime.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-base font-semibold tabular-nums text-white/40">
                  {currentTime.toLocaleTimeString("cs-CZ", { second: "2-digit" })}
                </span>
              </motion.p>
            </div>

            {/* Right: zoom + ARO Overtime indicator */}
            <div className="flex-1 flex items-center justify-end gap-3">

            {/* Zoom controls — horizontální zoom časové osy */}
            <div
              className="hidden lg:flex items-center h-14 rounded-2xl px-2 gap-1"
              style={{ background: C.glass, border: `1px solid ${C.borderStrong}` }}
            >
              <button
                onClick={() => setZoom((z) => Math.max(1, Math.round((z - 0.5) * 2) / 2))}
                disabled={zoom <= 1}
                aria-label="Oddálit časovou osu"
                title="Oddálit (−)"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5"
              >
                <ZoomOut className="w-4 h-4 text-white/60" />
              </button>
              <button
                onClick={() => setZoom(1)}
                aria-label="Zobrazit celý den"
                className="px-2 h-9 rounded-xl flex items-center justify-center gap-1.5 transition-colors hover:bg-white/5"
                title="Celý den (reset zoomu)"
              >
                <Maximize2 className="w-3.5 h-3.5 text-white/50" />
                <span className="text-xs font-semibold tabular-nums text-white/70">{zoom.toFixed(1)}×</span>
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(4, Math.round((z + 0.5) * 2) / 2))}
                disabled={zoom >= 4}
                aria-label="Přiblížit časovou osu"
                title="Přiblížit (+)"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5"
              >
                <ZoomIn className="w-4 h-4 text-white/60" />
              </button>
              {/* Skok na aktuální čas — užitečné jen při přiblížení (jinak je vidět celý den) */}
              {zoom > 1 && (
                <>
                  <div className="w-px h-6 bg-white/10 mx-0.5" />
                  <button
                    onClick={scrollToNow}
                    aria-label="Skok na aktuální čas"
                    title="Skočit na aktuální čas (T)"
                    className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl transition-colors hover:bg-white/5"
                    style={{ color: C.cyan }}
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Teď</span>
                  </button>
                  {/* Auto-sledování aktuálního času */}
                  <button
                    onClick={() => setAutoFollowNow((v) => !v)}
                    aria-pressed={autoFollowNow}
                    aria-label="Automaticky sledovat aktuální čas"
                    title="Automaticky držet aktuální čas v záběru (obnovuje se každých 30 s)"
                    className="h-9 px-2 rounded-xl text-[10px] font-bold tracking-widest transition-colors hover:bg-white/5"
                    style={autoFollowNow ? { background: `${C.cyan}1f`, color: C.cyan } : { color: 'rgba(255,255,255,0.45)' }}
                  >
                    AUTO
                  </button>
                </>
              )}
            </div>

            {aroOvertimeRooms.length > 0 ? (
              <motion.button
                onClick={() => setShowAroPopup(true)}
                className="relative flex-shrink-0 h-14 rounded-2xl px-5 py-2.5 overflow-hidden transition-transform duration-300 hover:scale-105 cursor-pointer"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  background: `linear-gradient(135deg, ${C.red}20 0%, ${C.red}10 100%)`,
                  border: `2px solid ${C.red}50`,
                  boxShadow: `0 0 30px ${C.red}30, inset 0 1px 0 rgba(255,255,255,0.05)`,
                }}
              >
                <div className="relative flex items-center gap-3 h-full">
                  <motion.div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      background: `${C.red}30`,
                      border: `2px solid ${C.red}60`,
                      boxShadow: `0 0 12px ${C.red}40`,
                    }}
                  >
                    <AlertTriangle className="w-5 h-5" style={{ color: C.red }} />
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
                className="flex-shrink-0 h-14 rounded-2xl px-5 py-2.5 flex items-center gap-3"
                style={{
                  background: `linear-gradient(135deg, ${C.green}15 0%, ${C.green}05 100%)`,
                  border: `1px solid ${C.green}30`,
                }}
              >
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${C.green}20`, border: `1px solid ${C.green}30` }}
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
      <div className={`flex-1 min-h-0 flex flex-col relative z-10 overflow-hidden ${isFullscreen ? 'px-4' : 'px-4 sm:px-6'}`}>

        {/* Time Axis Header */}
        <div 
          className="flex flex-shrink-0 rounded-t-[22px] relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(12,23,35,0.97) 0%, rgba(8,17,27,0.97) 100%)',
            borderTop: `1px solid ${C.borderStrong}`,
            borderLeft: `1px solid ${C.borderStrong}`,
            borderRight: `1px solid ${C.borderStrong}`,
            boxShadow: 'none',
          }}
        >
          {/* Jemný horní akcent bez záře */}
          <div className="absolute top-0 left-8 right-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(54,217,236,0.42), transparent)' }} />
          
          {/* Room label header — vyhledávání + filtr stavu */}
          <div 
            className="flex-shrink-0 flex items-center px-4 gap-2" 
            style={{ 
              width: ROOM_LABEL_WIDTH, 
              minWidth: ROOM_LABEL_WIDTH, 
              borderRight: `1px solid ${C.border}`,
            }}
          >
            {/* Search input */}
            <div 
              className="flex items-center gap-2 flex-1 min-w-0 h-8 rounded-lg px-2.5 transition-colors focus-within:border-cyan-400/40"
              style={{ background: C.glass, border: `1px solid ${C.borderStrong}` }}
            >
              <Search className="w-3.5 h-3.5 flex-shrink-0 text-white/35" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setSearchQuery(''); e.currentTarget.blur(); } }}
                placeholder="Hledat sál…  ( / )"
                className="flex-1 min-w-0 bg-transparent outline-none text-xs text-white placeholder:text-white/30"
                aria-label="Hledat operační sál"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} aria-label="Vymazat hledání" className="flex-shrink-0">
                  <X className="w-3 h-3 text-white/40 hover:text-white/70 transition-colors" />
                </button>
              )}
            </div>
            {/* Status filter — segmentovaný přepínač */}
            <div 
              className="flex items-center h-8 rounded-lg p-0.5 flex-shrink-0"
              style={{ background: C.glass, border: `1px solid ${C.borderStrong}` }}
            >
              {([
                { key: 'all', label: 'Vše' },
                { key: 'active', label: 'Akt.' },
                { key: 'free', label: 'Vol.' },
              ] as const).map(({ key, label }) => {
                const active = statusFilter === key;
                return (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className="text-[10px] font-semibold px-2 h-7 rounded-md transition-all"
                    style={active ? {
                      background: `${C.cyan}20`,
                      color: C.cyan,
                      boxShadow: `inset 0 0 0 1px ${C.cyan}40`,
                    } : { color: 'rgba(255,255,255,0.45)' }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Time markers - Premium style with elegant grid */}
          <div className="flex-1 overflow-hidden" ref={timelineRef}>
            <div className="flex items-center h-14 relative" style={{ width: `${zoom * 100}%`, transition: 'width 0.25s ease' }}>
              <div className="absolute inset-x-0 top-0 h-4 pointer-events-none">
                {TIME_PERIOD_BANDS.map((period) => (
                  <div
                    key={period.label}
                    className="absolute top-0 h-full flex items-center justify-center"
                    style={{
                      left: `${period.left}%`,
                      width: `${period.width}%`,
                      background: `${period.color}08`,
                      borderRight: '1px solid rgba(148,180,196,0.07)',
                    }}
                  >
                    <span
                      className="text-[7px] font-bold tracking-[0.22em]"
                      style={{ color: `${period.color}8f` }}
                    >
                      {period.label}
                    </span>
                  </div>
                ))}
              </div>
              {TIME_MARKERS.map((hour, i) => {
                const isLast = i === TIME_MARKERS.length - 1;
                const widthPct = 100 / TIMELINE_HOURS;
                const leftPct = i * widthPct;
                const actualHour = TIMELINE_START_HOUR + hour;
                const displayHour = actualHour % 24;
                const isNightHour = displayHour >= 19 || displayHour < 7;
                const isNextDay = actualHour >= 24;
                const isCurrentHour = displayHour === currentHour && !isLast;
                const isMajorHour = displayHour % 3 === 0; // Every 3 hours is major
                
                return (
                  <div 
                    key={`h-${hour}-${i}`} 
                    className="absolute top-0 h-full flex items-center justify-center pt-3"
                    aria-current={isCurrentHour ? 'time' : undefined}
                    style={{
                      left: `${leftPct}%`,
                      width: isLast ? 0 : `${widthPct}%`,
                      background: isCurrentHour
                        ? 'rgba(54,217,236,0.055)'
                        : isNightHour
                          ? 'rgba(2,8,14,0.22)'
                          : 'transparent',
                    }}
                  >
                    {/* Svislá hodinová značka */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-px"
                      style={{
                        background: isMajorHour
                          ? 'rgba(148,180,196,0.18)'
                          : 'rgba(148,180,196,0.075)',
                      }}
                    />
                    {!isLast && (
                      <span
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-px"
                        style={{
                          height: isMajorHour ? 8 : 5,
                          background: isCurrentHour ? C.cyan : isMajorHour ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.16)',
                        }}
                      />
                    )}
                    {!isLast && (
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className={`text-[11px] font-mono tabular-nums transition-colors ${
                            isCurrentHour ? 'font-bold text-cyan-200' : isMajorHour ? 'font-semibold text-white/75' : 'font-medium text-white/40'
                          }`}
                        >
                          {hourLabelCompact(hour)}
                        </span>
                        {isNextDay && displayHour === 0 && (
                          <span className="text-[7px] font-bold uppercase tracking-[0.16em] text-white/28">další den</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Room Rows Container */}
        <div
          className="flex-1 min-h-0 overflow-y-hidden overflow-x-auto rounded-b-[22px] timeline-scroll"
          style={{
            background: 'linear-gradient(180deg, rgba(6,15,24,0.84) 0%, rgba(4,11,18,0.72) 100%)',
            borderLeft: `1px solid ${C.borderStrong}`,
            borderRight: `1px solid ${C.borderStrong}`,
            borderBottom: `1px solid ${C.borderStrong}`,
            boxShadow: 'none',
          }}
          ref={rowsContainerRef}
          onScroll={(e) => {
            // Synchronizace horizontálního scrollu řádk�� s časovou osou nahoře
            if (timelineRef.current) timelineRef.current.scrollLeft = e.currentTarget.scrollLeft;
          }}
        >
          <div 
            className="relative h-full"
            ref={scrollContainerRef}
            style={{
              width: `${zoom * 100}%`,
              minWidth: `${zoom * 100}%`,
              background: 'transparent',
              transition: 'width 0.25s ease, min-width 0.25s ease',
            }}
          >
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
                  {/* Glow effect — sladěno do tyrkysové (medical accent),
                      konzistentní s časovou osou nahoře. Červená je vyhrazena
                      pro stavy nouze, ne pro běžnou značku „teď". */}
                  {/* Main line */}
                  {/* „teď" linka — oranžová, bez záře */}
                  <div
                    className="absolute -left-[1px] top-0 bottom-0 w-[2px]"
                    style={{ background: '#FF9800' }}
                  />
                  {/* Časový štítek na lince — oranžový (jediné zobrazení času) */}
                  <div
                    className="absolute -left-[1px] -top-[11px] -translate-x-1/2 px-2 py-[3px] rounded-md whitespace-nowrap"
                    style={{
                      background: '#FF9800',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    }}
                  >
                    <span className="text-[10px] font-bold font-mono tabular-nums leading-none" style={{ color: '#2B1600' }}>
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
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'rgba(255, 255, 255, 0.035)',
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
                        boxShadow: `0 0 10px ${C.purple}, 0 0 26px ${C.purple}66`,
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
            <div className="relative z-10 flex flex-col gap-1.5 py-2">
            {displayRooms.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <Search className="w-6 h-6 text-white/25" />
                <p className="text-sm text-white/50">Žádné sály neodpovídají filtru</p>
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                  className="text-xs font-medium px-3 py-1 rounded-md transition-colors"
                  style={{ color: C.cyan, background: `${C.cyan}14`, border: `1px solid ${C.cyan}30` }}
                >
                  Zrušit filtr
                </button>
              </div>
            )}
            {displayRooms.map((room, roomIndex) => {
              // Get current workflow step info from database context
              const totalSteps = activeStatuses.length > 0 ? activeStatuses.length : 1;
              const stepIndex = Math.min(room.currentStepIndex, totalSteps - 1);
              const isActive = stepIndex > 0; // index 0 = "Sál připraven"
              const isCleaning = stepIndex === totalSteps - 2; // Second to last step
              const isFree = stepIndex === 0;
              
              // Only increment counter for active (non-free) rooms
              if (isActive && !room.isEmergency && !room.isLocked) {
                activeRoomCounter++;
              }
              const currentRoomNumber = isActive && !room.isEmergency && !room.isLocked ? activeRoomCounter : 0;
              
              const roomColorKey = ROOM_COLOR_ORDER[(currentRoomNumber - 1) % ROOM_COLOR_ORDER.length];
              const roomColor = ROOM_COLORS[roomColorKey] || ROOM_COLORS.blue;
              const remainingTime = getRemainingTime(room);
              
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

              // Calculate operation bar position
              // Use currentProcedure if available, otherwise use phaseStartedAt or current time as fallback
              const startParts = room.currentProcedure?.startTime?.split(':');
              let boxLeftPct = 0;
              let boxWidthPct = 0;
              let progressPct = 0;
              let startDate: Date = new Date();
              let endDate: Date = new Date();
              
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
                    className="flex items-stretch cursor-pointer transition-all duration-200 group rounded-lg"
                    style={{ height: rowHeight }}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <div 
                      className="flex-shrink-0 flex items-center gap-2 px-3 py-1 min-h-0 overflow-hidden sticky left-0 z-20 transition-all duration-200 group-hover:bg-white/[0.03] rounded-l-lg" 
                      style={{ width: ROOM_LABEL_WIDTH, minWidth: ROOM_LABEL_WIDTH, background: 'rgba(11,17,32,0.95)' }}
                    >
                      <div 
                        className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${bannerColor}26`, border: `1px solid ${bannerColor}55` }}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" style={{ color: bannerColor }} />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="text-sm font-semibold tracking-tight truncate" style={{ color: `${bannerColor}cc` }}>{room.name}</p>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] truncate" style={{ color: `${bannerColor}cc` }}>{bannerLabel}</p>
                      </div>
                    </div>
                    {/* Emergency timeline box - tinted glassmorph */}
                    <div className="relative flex-1 overflow-hidden rounded-r-lg">
                    <div className={`absolute inset-y-0.5 left-2 right-2 rounded-sm overflow-hidden ${shouldPulse ? 'animate-pulse' : ''}`}>
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
                    </div>
                  </div>
                );
              }

              /* Active / Free / Locked row - Premium glass card design */
              return (
                <div
                  key={room.id}
                  className={`relative flex items-stretch group cursor-pointer rounded-xl overflow-hidden transition-colors duration-300 ${room.isLocked ? 'locked-room-glow' : ''}`}
                  style={{
                    height: rowHeight,
                    background: isActive
                      ? `linear-gradient(100deg, ${stepColor}24 0%, ${stepColor}0b 38%, rgba(255,255,255,0.012) 100%)`
                      : 'linear-gradient(100deg, rgba(54,217,236,0.025) 0%, rgba(255,255,255,0.012) 58%, rgba(251,191,36,0.01) 100%)',
                    border: room.isLocked
                      ? `1px solid ${C.borderActive}`
                      : `1px solid ${isActive ? `${stepColor}55` : C.border}`,
                    boxShadow: isActive
                      ? `inset 0 1px 0 rgba(255,255,255,0.065), 0 14px 36px -30px ${stepColor}`
                      : 'inset 0 1px 0 rgba(255,255,255,0.035)',
                  }}
                  onClick={() => (showSummary ? setStatsRoomId(room.id) : setSelectedRoom(room))}
                >
                  {/* Diagonální lesk řádku při najetí myší — jemné oživení interakce */}
                  <div className="tl-row-sheen" />

                  {/* Colored left accent bar - Premium enhanced */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all duration-300 z-30"
                    style={{ 
                      background: isActive
                        ? `linear-gradient(to bottom, ${stepColor}, ${stepColor}cc)`
                        : `linear-gradient(to bottom, ${C.slate}50, ${C.slate}20)`,
                      boxShadow: isActive ? `0 0 12px ${stepColor}, 0 0 4px ${stepColor}` : 'none',
                    }}
                  />
                  
                  {/* Room Label - Premium glass panel (sticky při zoomu, aby zůstal vlevo) */}
                  <div
                    className="flex-shrink-0 flex items-center gap-3 pl-4 pr-3 min-h-0 overflow-hidden transition-all duration-200 sticky left-0 z-20"
                    style={{
                      width: ROOM_LABEL_WIDTH,
                      minWidth: ROOM_LABEL_WIDTH,
                      background: isActive
                        ? `linear-gradient(90deg, rgba(5,14,24,0.97), ${stepColor}0D)`
                        : 'linear-gradient(90deg, rgba(5,14,24,0.97), rgba(7,16,25,0.82))',
                      borderRight: `1px solid ${isActive ? `${stepColor}24` : C.border}`,
                      boxShadow: '8px 0 22px -22px rgba(0,0,0,0.9)',
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold tabular-nums"
                      style={{
                        color: isActive ? stepColor : 'rgba(255,255,255,0.42)',
                        background: isActive ? `${stepColor}16` : 'rgba(255,255,255,0.035)',
                        border: `1px solid ${isActive ? `${stepColor}32` : 'rgba(148,180,196,0.12)'}`,
                      }}
                    >
                      {roomIndex + 1}
                    </div>

                    {/* ARO Overtime Badge - Premium style */}
                    {(() => {
                      const aroPosition = getAroPosition(room.id);
                      const overtimeInfo = getOvertimeInfo(room.id);
                      
                      if (aroPosition && overtimeInfo) {
                        return (
                          <motion.div
                            className="flex-shrink-0 flex flex-col items-center justify-center px-2 py-1 rounded-lg"
                            style={{
                              background: `linear-gradient(135deg, ${C.yellow}20 0%, ${C.yellow}10 100%)`,
                              border: `1px solid ${C.yellow}50`,
                              boxShadow: `0 0 12px ${C.yellow}20`,
                            }}
                          >
                            <span className="text-[7px] font-bold tracking-wider" style={{ color: C.yellow }}>ARO</span>
                            <span className="text-xs font-bold text-white/90">{aroPosition}</span>
                            <span className="text-[6px] font-medium" style={{ color: C.yellow }}>+{overtimeInfo.overtimeMinutes}m</span>
                          </motion.div>
                        );
                      }
                      return null;
                    })()}

                    {/* Patient Called Badge - Premium */}
                    {room.patientCalledAt && !room.patientArrivedAt && (
                      <motion.div
                        className="flex-shrink-0 flex flex-col items-center justify-center px-2 py-1 rounded-lg"
                        style={{
                          background: `linear-gradient(135deg, ${C.blue}20 0%, ${C.blue}10 100%)`,
                          border: `1px solid ${C.blue}50`,
                        }}
                        title="Pacient volán"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <span className="text-[7px] font-bold tracking-wider" style={{ color: C.blue }}>VOLÁN</span>
                        <Phone className="w-3 h-3" style={{ color: C.blue }} />
                      </motion.div>
                    )}

                    {/* Patient Arrived Badge - Premium */}
                    {room.patientArrivedAt && (
                      <div
                        className="flex-shrink-0 flex flex-col items-center justify-center px-2 py-1 rounded-lg"
                        style={{
                          background: `linear-gradient(135deg, ${C.green}20 0%, ${C.green}10 100%)`,
                          border: `1px solid ${C.green}50`,
                        }}
                        title="Pacient v operačním traktu"
                      >
                        <span className="text-[7px] font-bold tracking-wider" style={{ color: C.green }}>V OP TRAKTU</span>
                        <BedDouble className="w-3 h-3" style={{ color: C.green }} />
                      </div>
                    )}

                    {/* Lock Badge - Premium */}
                    {room.isLocked && (
                      <div
                        className="flex-shrink-0 flex flex-col items-center justify-center px-2 py-1 rounded-lg"
                        style={{
                          background: `linear-gradient(135deg, ${C.cyan}20 0%, ${C.cyan}10 100%)`,
                          border: `1px solid ${C.cyan}50`,
                        }}
                        title="Sál uzamčen"
                      >
                        <span className="text-[7px] font-bold tracking-wider" style={{ color: C.cyan }}>LOCK</span>
                        <Lock className="w-3 h-3" style={{ color: C.cyan }} />
                      </div>
                    )}
                    
                    
                    {/* Room info card - Premium glass */}
                    <div 
                      className="flex-1 min-w-0 flex items-center gap-3"
                    >
                      {/* Live indicator dot for active operations */}
                      {isActive && (
                        <motion.div
                          className="flex-shrink-0 w-3.5 h-3.5 rounded-full"
                          style={{
                            background: stepColor,
                            boxShadow: `0 0 12px ${stepColor}, 0 0 24px ${stepColor}66`,
                          }}
                          animate={{ opacity: [0.55, 1, 0.55] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      )}

                      {/* Room name and details */}
                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <p className="text-sm font-bold tracking-tight text-white truncate leading-tight">
                          {room.name}
                        </p>
                        {room.department && rowHeight >= 42 && (
                          <p className="text-[8px] font-medium text-white/30 truncate leading-tight mt-0.5 uppercase tracking-[0.18em]">
                            {room.department}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {room.isEnhancedHygiene && (
                          <span
                            className="text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase flex items-center gap-1"
                            style={{
                              background: 'rgba(249,115,22,0.18)',
                              color: '#FB923C',
                              border: '1px solid rgba(249,115,22,0.45)',
                              boxShadow: '0 0 10px rgba(249,115,22,0.25)',
                            }}
                            title="Infekční pacient — zvýšený hygienický režim"
                          >
                            <Biohazard className="w-3 h-3" />
                            INFEKČNÍ
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
                  </div>

                  {/* Timeline section - Premium glass with grid */}
                  <div
                    className="relative flex-1 overflow-hidden"
                    style={{
                      background: 'transparent'
                    }}
                  >
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
                      <div className="locked-room-stripes absolute inset-0 z-10 rounded-lg" />
                    )}
                    
                    {/* Locked room overlay — jeden velký, centrovaný nápis přes celý řádek.
                        Žádné další statusové texty se u uzamčeného sálu nezobrazují. */}
                    {room.isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        {/* Outlined pill dle referenčního designu */}
                        <div
                          className="flex items-center gap-2.5 px-5 py-1.5 rounded-lg"
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
                              boxShadow: `0 0 10px ${ph.color}, 0 0 20px ${ph.color}66`,
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
                      const u = roomUtilization.rows.find((x) => x.id === room.id);
                      const uc = u ? utilColor(u.utilizationPct) : C.slate;
                      return (
                        <>
                          {segs.map((sg, i) => (
                            <div
                              key={`sum-${i}`}
                              className="absolute top-[20%] bottom-[20%] rounded-[4px]"
                              title={sg.name}
                              style={{
                                left: `${sg.l}%`,
                                width: `${Math.max(0.35, sg.w)}%`,
                                background: `linear-gradient(180deg, ${sg.color}cc 0%, ${sg.color}77 100%)`,
                                boxShadow: `0 0 10px ${sg.color}30, inset 0 1px 0 rgba(255,255,255,0.18)`,
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
                          <motion.div
                            key={`completed-${opIdx}`}
                            className="absolute top-1 bottom-1 overflow-hidden rounded-lg group"
                            style={{ 
                              left: `${position.left}%`, 
                              width: `${Math.max(0.5, position.width)}%`,
                              // Decentní, převážně průhledné pozadí — barvy již proběhlých
                              // statusů (segmenty uvnitř) zůstanou čitelné a nejsou
                              // překryté plnou netransparentní barvou.
                              background: isContinuingOp 
                                ? `linear-gradient(135deg, ${C.green}1f 0%, ${C.green}10 100%)`
                                : `linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)`,
                              border: `1px solid ${isContinuingOp ? `${C.green}55` : isRoomReady ? `${C.cyan}45` : `${C.slate}2e`}`,
                              boxShadow: isRoomReady 
                                ? `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 14px ${C.cyan}1f`
                                : isContinuingOp
                                  ? `inset 0 1px 0 rgba(255,255,255,0.10), 0 0 12px ${C.green}22`
                                  : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                            }}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: opIdx * 0.05 }}
                            onMouseEnter={(e) => setHoveredOp({ room, x: e.clientX, y: e.clientY, completed: { startedAt: operation.startedAt, endedAt: operation.endedAt, statusHistory: operation.statusHistory } })}
                            onMouseMove={(e) => setHoveredOp({ room, x: e.clientX, y: e.clientY, completed: { startedAt: operation.startedAt, endedAt: operation.endedAt, statusHistory: operation.statusHistory } })}
                            onMouseLeave={() => setHoveredOp(null)}
                          >
                              {/* Completed operation segments with colors from database context */}
                              {operation.statusHistory && operation.statusHistory.length > 0 && (
                                <div className="absolute inset-0 flex overflow-hidden rounded-lg">
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
                                        <motion.div
                                          key={`seg-${idx}`}
                                          className="absolute top-0 bottom-0 transition-all duration-300 hover:brightness-105"
                                          style={{
                                            left: `${Math.max(0, segLeftPct)}%`,
                                            width: `${Math.max(0.5, segWidthPct)}%`,
                                            // Stejná barva jako aktivní status (bez šrafování).
                                            background: `linear-gradient(180deg, ${phaseColor}66 0%, ${phaseColor}33 100%)`,
                                            borderRight: idx < operation.statusHistory.length - 1 ? `1px solid rgba(0,0,0,0.22)` : 'none',
                                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                                          }}
                                          title={entry.stepName || statusByOrderIndex[entry.stepIndex]?.title || ''}
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          transition={{ delay: 0.03 * idx }}
                                        />
                                      );
                                    }).filter(Boolean);
                                  })()}
                                </div>
                              )}
                              
                              {/* Label for operation — zarovnáno na PRAVOU stranu řádku.
                                  Po dokončení / při připraveném sále se zobrazí elegantní
                                  pill "Sál připraven". */}
                              <div className="absolute inset-0 flex items-center justify-end pr-2 pl-3 pointer-events-none">
                                {isContinuingOp && position.width > 6 && (
                                  <span className="text-[10px] font-semibold truncate uppercase tracking-wide text-white">
                                    POKRAČUJÍCÍ VÝKON
                                  </span>
                                )}
                                {!isContinuingOp && isRoomReady && position.width > 4 && (
                                  /* Hidden: Room ready pill */
                                  <></>
                                )}
                                {!isContinuingOp && !isRoomReady && position.width > 6 && (
                                  <span className="text-[10px] font-semibold truncate uppercase tracking-wide text-white/45">
                                    Dokončeno
                                  </span>
                                )}
                              </div>
                          </motion.div>
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
                    
                    {!showSummary && isActive && !room.isLocked && shouldShowBar && boxWidthPct > 0 && (
                      <motion.div
                        className="absolute top-1 bottom-1 overflow-hidden rounded-lg"
                        style={{
                          left: `${Math.max(0, boxLeftPct)}%`,
                          width: `${boxWidthPct}%`,
                          background: `linear-gradient(135deg, ${stepColor}2e 0%, ${stepColor}12 100%)`,
                          boxShadow: `0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 18px ${stepColor}26`,
                          border: `1px solid ${stepColor}66`,
                          backdropFilter: 'blur(3px)',
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
                            boxShadow: `0 0 10px ${stepColor}, inset 0 0 6px rgba(255,255,255,0.25)`,
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
                                        style={{
                                          position: 'absolute',
                                          top: 0,
                                          bottom: 0,
                                          left: `${Math.max(0, segLeftPct)}%`,
                                          width: `${Math.max(0.5, segWidthPct)}%`,
                                          // Proběhlé i aktuální fáze stejnou plnou barvou statusu (bez šrafování).
                                          background: `linear-gradient(180deg, ${phaseColor}66 0%, ${phaseColor}33 100%)`,
                                          borderRight: !isCurrentSegment ? `1px solid rgba(0,0,0,0.3)` : 'none',
                                          boxShadow: isCurrentSegment
                                            ? `inset 0 1px 0 rgba(255,255,255,0.15), inset -1px 0 0 ${phaseColor}80`
                                            : 'inset 0 1px 0 rgba(255,255,255,0.1)',
                                        }}
                                        title={entry.stepName || statusByOrderIndex[entry.stepIndex]?.title || ''}
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
                                          background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 5px, rgba(0,0,0,0.22) 5px, rgba(0,0,0,0.22) 10px)',
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
                                      background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 5px, rgba(0,0,0,0.22) 5px, rgba(0,0,0,0.22) 10px)',
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
                          return (
                            <div
                              className="absolute top-0 bottom-0 z-[6] pointer-events-none"
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
                          if (overrunMs < 60 * 1000) return null; // skluz < 1 min neřešíme
                          const startMs = startDate.getTime();
                          const span = Math.max(1, endDate.getTime() - startMs);
                          const leftPct = Math.max(0, Math.min(100, ((estMs - startMs) / span) * 100));
                          return (
                            <div
                              className="absolute top-0 bottom-0 right-0 z-[6] pointer-events-none rounded-r-lg overflow-hidden"
                              style={{
                                left: `${leftPct}%`,
                                background: `repeating-linear-gradient(135deg, ${C.red}30 0px, ${C.red}30 6px, ${C.red}12 6px, ${C.red}12 12px)`,
                                borderLeft: `1.5px dashed ${C.red}b0`,
                                boxShadow: `inset 0 0 12px ${C.red}25`,
                              }}
                            />
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
                                    <p className="text-xs font-semibold text-white/95 truncate">
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

                    {/* Free room indicator — kompaktní pill zarovnaný na PRAVOU stranu řádku.
                        Záměrně NEzabírá celou šířku, aby nepřekrýval barvy již proběhlých
                        statusů (dokončené operace) na levé ��ásti časové osy. */}
                    {!showSummary && isFree && !room.isLocked && (
                      <motion.div 
                        className="absolute inset-y-1.5 right-3 flex items-center gap-2.5 pl-2.5 pr-3 rounded-lg overflow-hidden"
                        style={{
                          // Outlined pilulka „Sál připraven" dle referenčního designu
                          background: `${C.green}0d`,
                          border: `1px solid ${C.green}55`,
                          boxShadow: `0 0 12px ${C.green}10`,
                        }}
                        initial={false}
                      >
                        <div className="relative flex-shrink-0">
                          <div 
                            className="relative w-6 h-6 rounded-lg flex items-center justify-center"
                            style={{ 
                              background: `linear-gradient(135deg, ${C.green}2e 0%, ${C.green}12 100%)`,
                              border: `1px solid ${C.green}45`,
                            }}
                          >
                            <CheckCircle className="w-3.5 h-3.5" style={{ color: C.green }} />
                          </div>
                        </div>
                        <p className="text-[11px] font-semibold text-white/90 leading-tight truncate">{stepName}</p>
                        <motion.div 
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: C.green, boxShadow: `0 0 6px ${C.green}` }}
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </motion.div>
                    )}

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
                          <div
                            className="absolute top-0.5 left-0 -translate-x-1/2 px-1 py-px rounded-[5px] text-[8px] font-semibold font-mono tabular-nums whitespace-nowrap leading-none opacity-90"
                            style={{
                              background: 'rgba(54, 217, 236, 0.10)',
                              border: '1px solid rgba(54, 217, 236, 0.30)',
                              color: 'rgba(178, 235, 244, 0.95)',
                            }}
                          >
                            {todaySchedule.endHour.toString().padStart(2, '0')}:{todaySchedule.endMinute.toString().padStart(2, '0')}
                          </div>
                        </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
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
