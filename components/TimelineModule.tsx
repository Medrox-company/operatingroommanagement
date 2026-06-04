import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, WeeklySchedule, DEFAULT_WEEKLY_SCHEDULE, DEFAULT_DAILY_BREAK_MINUTES } from '../types';
import { STEP_DURATIONS, STEP_COLORS } from '../constants';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import MobileTimelineView from './mobile/MobileTimelineView';
import AroOvertimePopup from './AroOvertimePopup';
import { 
  Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe, 
  Settings, User, Sparkles, Info, ChevronRight, Loader2, Pause, Phone, BedDouble, AlertCircle, CheckCircle,
  Search, ZoomIn, ZoomOut, Maximize2,
  RefreshCw, ArrowUpDown, Crosshair, BarChart3, ChevronDown
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
  // --- Nové funkce: vyhledávání, filtr stavu, zoom časové osy, hover tooltip ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'free'>('all');
  const [zoom, setZoom] = useState(1); // 1 = výchozí (celá osa se vejde), >1 = horizontální zoom
  const [hoveredOp, setHoveredOp] = useState<{ room: OperatingRoom; x: number; y: number } | null>(null);
  // --- Další funkce: řazení, souhrn dne, živá data ---
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [statsRoomId, setStatsRoomId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const rowsContainerRef = useRef<HTMLDivElement>(null);

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
  // Výpočet: dostupná výška = výška kontejneru - padding - gap mezi řádky
  useEffect(() => {
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

    // V "Souhrn dne" zobrazujeme VŠECHNY sály, ne jen filtrované
    const roomsToProcess = showSummary ? allRoomsForStats : displayRooms;
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
      className="w-full h-full text-white overflow-hidden flex flex-col relative antialiased"
      style={{ WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', textRendering: 'optimizeLegibility' }}
    >

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
                <div className="grid grid-cols-5 gap-2 px-5 pt-4">
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

      {/* Hover tooltip pro probíhající operace — fixed pozice u kurzoru, mimo overflow clip */}
      <AnimatePresence>
        {hoveredOp && (() => {
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
      <div className="hidden md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">

      {/* ======== Header with Title and Stats ======== */}
      <div 
        className="sticky top-0 z-40 flex-shrink-0"
        style={{ 
          background: 'linear-gradient(180deg, #000a14 0%, #00060f 100%)',
          borderBottom: `1px solid ${C.borderStrong}`,
        }}
      >
        <div className="px-8 md:pl-32 md:pr-10 py-4">

          {/* Header Row - Live stats (left) · Time (center) · ARO (right) */}
          <div className="flex items-center justify-between gap-4">

            {/* Left: Live operations stats — control-center cluster */}
            <div className="flex-1 flex items-center justify-start min-w-0">
              <div className="hidden lg:flex items-center gap-2">
                {[
                  { icon: Activity, label: 'Operace', value: stats.operations, color: C.cyan },
                  { icon: Sparkles, label: 'Úklid', value: stats.cleaning, color: C.yellow },
                  { icon: CheckCircle, label: 'Volné', value: stats.free, color: C.green },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2.5 h-14 rounded-2xl px-4"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
                      border: `1px solid ${C.borderStrong}`,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}1a`, border: `1px solid ${color}33` }}
                    >
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="leading-none">
                      <p className="text-[9px] uppercase tracking-[0.2em] font-medium text-white/40 mb-1">{label}</p>
                      <p className="text-lg font-bold tabular-nums leading-none" style={{ color: C.textHi }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Center: Current Time (no box, just prominent display) */}
            <div className="flex flex-col items-center justify-center flex-shrink-0">
              <p className="text-[10px] uppercase tracking-[0.4em] font-medium text-white/30 mb-1">
                {formatDate(currentTime)}
              </p>
              <motion.p 
                className="text-3xl font-bold tabular-nums tracking-tight flex items-baseline gap-1"
                style={{ 
                  color: C.textHi,
                  textShadow: `0 0 40px ${C.cyan}40`,
                }}
                animate={{ opacity: [0.9, 1, 0.9] }}
                transition={{ duration: 2, repeat: Infinity }}
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

              {/* Souhrn dne */}
              <button
                onClick={() => setShowSummary((v) => !v)}
                aria-label="Souhrn dne"
                aria-pressed={showSummary}
                title="Souhrn dne"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                style={showSummary ? { background: `${C.cyan}1f`, color: C.cyan } : undefined}
              >
                <BarChart3 className={`w-4 h-4 ${showSummary ? '' : 'text-white/60'}`} />
              </button>

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

            {/* Zoom controls — horizontální zoom časové osy */}
            <div
              className="hidden lg:flex items-center h-14 rounded-2xl px-2 gap-1"
              style={{ background: C.glass, border: `1px solid ${C.borderStrong}` }}
            >
              <button
                onClick={() => setZoom((z) => Math.max(1, Math.round((z - 0.5) * 2) / 2))}
                disabled={zoom <= 1}
                aria-label="Oddálit časovou osu"
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
                    title="Skočit na aktuální čas"
                    className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl transition-colors hover:bg-white/5"
                    style={{ color: C.cyan }}
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Teď</span>
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

      {/* ======== Statistiky vytížení — nahrazují časovou osu (na celé obrazovce, bez rolování) ======== */}
      {showSummary && (
        <motion.div
          key="stats-fullscreen"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="hidden lg:flex flex-1 min-h-0 flex-col gap-2 relative z-10 overflow-hidden px-8 md:pl-32 md:pr-10 pb-4"
        >
          {/* ── Header řádku: Názvy sloupců ── */}
          <div className="flex-shrink-0 flex items-center gap-2 p-2 rounded-lg text-[10px] uppercase tracking-wide font-semibold text-white/40" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingLeft: '11px' }}>
            <div style={{ width: 200, flexShrink: 0 }}>Sál</div>
            <div style={{ width: 80, flexShrink: 0 }}>Využití</div>
            <div style={{ width: 100, flexShrink: 0 }}>Operační čas</div>
            <div style={{ width: 80, flexShrink: 0 }}>ARO</div>
            <div style={{ width: 80, flexShrink: 0 }}>Úklid</div>
            <div style={{ width: 80, flexShrink: 0 }}>Pauza</div>
            <div className="flex-1">Timeline</div>
          </div>

          {/* ── Řádky sálů ── */}
          <div className="flex-1 min-h-0 flex flex-col gap-1 overflow-hidden">
            {roomUtilization.rows.map((r) => {
              const closed = r.workingMinutes === 0;
              const col = utilColor(r.utilizationPct);
              // Vypočítat časy jednotlivých fází
              const aroPhase = r.phases.find(p => p.name.includes('ARO') || p.name.includes('Příjezd'));
              const cleaningPhase = r.phases.find(p => p.name.includes('Úklid'));
              const pausePhase = r.phases.find(p => p.name.includes('Pauza') || p.name.includes('pauza'));
              const operatingPhase = r.phases.find(p => p.name.includes('Chirurgický') || p.name.includes('operace'));

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setStatsRoomId(r.id)}
                  className="w-full flex-1 min-h-0 flex items-center gap-1.5 rounded-lg px-3 transition-colors hover:bg-white/[0.04] text-left cursor-pointer text-sm"
                  style={{ background: 'rgba(255,255,255,0.02)', borderLeft: `3px solid ${col}` }}
                >
                  {/* Jméno sálu */}
                  <div style={{ width: 200, flexShrink: 0 }}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col }} />
                      <div className="flex flex-col min-w-0 leading-tight">
                        <span className="text-xs font-semibold truncate" style={{ color: C.textHi }}>
                          {r.name}
                          {r.isEmergency && <span className="ml-1 text-[7px] font-bold uppercase" style={{ color: C.red }}>NOUZE</span>}
                        </span>
                        {r.department && <span className="text-[8px] text-white/35 truncate">{r.department}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Využití % — v jemném boxu */}
                  <div style={{ width: 80, flexShrink: 0 }}>
                    <div className="flex items-center justify-center rounded py-1 px-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span className="font-semibold tabular-nums text-[11px]" style={{ color: col }}>{r.utilizationPct}%</span>
                    </div>
                  </div>

                  {/* Operační čas — v jemném boxu */}
                  <div style={{ width: 100, flexShrink: 0 }}>
                    <div className="flex items-center justify-center rounded py-1 px-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span className="font-semibold tabular-nums text-[11px]" style={{ color: r.occupiedMinutes > 0 ? C.red : 'rgba(255,255,255,0.4)' }}>{r.occupiedMinutes > 0 ? `${r.occupiedMinutes}m` : '—'}</span>
                    </div>
                  </div>

                  {/* ARO — v jemném boxu */}
                  <div style={{ width: 80, flexShrink: 0 }}>
                    <div className="flex items-center justify-center rounded py-1 px-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span className="font-semibold tabular-nums text-[11px] text-white/70">{aroPhase ? `${aroPhase.minutes}m` : '—'}</span>
                    </div>
                  </div>

                  {/* Úklid — v jemném boxu */}
                  <div style={{ width: 80, flexShrink: 0 }}>
                    <div className="flex items-center justify-center rounded py-1 px-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span className="font-semibold tabular-nums text-[11px] text-white/70">{cleaningPhase ? `${cleaningPhase.minutes}m` : '—'}</span>
                    </div>
                  </div>

                  {/* Pauza — v jemném boxu */}
                  <div style={{ width: 80, flexShrink: 0 }}>
                    <div className="flex items-center justify-center rounded py-1 px-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span className="font-semibold tabular-nums text-[11px]" style={{ color: pausePhase ? C.yellow : 'rgba(255,255,255,0.4)' }}>{pausePhase ? `${pausePhase.minutes}m` : '—'}</span>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="flex-1 min-w-0 flex items-center h-6 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {r.phases.length > 0 ? (
                      r.phases.map((p, pi) => {
                        const w = r.phaseTotalMs > 0 ? (p.ms / r.phaseTotalMs) * 100 : 0;
                        return (
                          <div
                            key={pi}
                            className="relative h-full group flex items-center justify-center transition-all hover:brightness-110"
                            style={{ width: `${w}%`, minWidth: w > 0 ? 3 : 0, background: `linear-gradient(180deg, ${p.color} 0%, ${p.color}cc 100%)`, borderRight: pi < r.phases.length - 1 ? '1px solid rgba(0,0,0,0.25)' : 'none' }}
                          >
                            {w > 12 && <span className="text-[8px] font-bold text-white/95 tabular-nums px-0.5 truncate">{p.minutes}m</span>}
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-[10px] text-white/30 px-2">Bez operací</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ======== Main Timeline - Premium Glass Container ======== */}
      {!showSummary && (
      <div className="flex-1 min-h-0 flex flex-col relative z-10 overflow-hidden px-8 md:pl-32 md:pr-10">
        
        {/* Time Axis Header - Premium Glass */}
        <div 
          className="flex flex-shrink-0 rounded-t-2xl relative overflow-hidden" 
          style={{ 
            background: 'linear-gradient(180deg, #0f172a 0%, #0b1120 100%)', 
            borderBottom: `1px solid ${C.borderStrong}`,
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Subtle top gradient line */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${C.cyan}30, transparent)` }} />
          
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
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Hledat sál…"
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
            <div className="flex items-center h-12 relative" style={{ width: `${zoom * 100}%` }}>
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
                    className="absolute top-0 h-full flex items-center justify-center" 
                    style={{ left: `${leftPct}%`, width: isLast ? 0 : `${widthPct}%` }}
                  >
                    {/* Vertical grid line with gradient */}
                    <div 
                      className="absolute left-0 w-px h-full"
                      style={{ 
                        background: isMajorHour 
                          ? `linear-gradient(to bottom, ${C.cyan}20, ${C.cyan}08, transparent)` 
                          : `linear-gradient(to bottom, ${C.border}, transparent)` 
                      }} 
                    />
                    {!isLast && (
                      isCurrentHour ? (
                        /* Current hour - Glowing pill */
                        <motion.span 
                          className="text-[10px] font-mono font-bold px-3 py-1 rounded-full relative"
                          style={{ 
                            background: `linear-gradient(135deg, ${C.cyan} 0%, ${C.blue} 100%)`,
                            color: '#000',
                            boxShadow: C.glowCyan,
                          }}
                          animate={{ scale: [1, 1.02, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {currentHour}:{currentMin < 10 ? '0' : ''}{currentMin}
                        </motion.span>
                      ) : (
                        /* Other hours */
                        <span className={`text-[9px] font-mono font-medium tabular-nums transition-colors ${
                          isNightHour ? 'text-white/20' : isMajorHour ? 'text-white/60' : 'text-white/35'
                        }`}>
                          {hourLabelCompact(hour)}
                        </span>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Room Rows Container - Premium Glass */}
        <div 
          className="flex-1 min-h-0 overflow-y-hidden overflow-x-auto rounded-b-2xl timeline-scroll" 
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
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%)',
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {/* Glow effect — sladěno do tyrkysové (medical accent),
                      konzistentní s časovou osou nahoře. Červená je vyhrazena
                      pro stavy nouze, ne pro běžnou značku „teď". */}
                  <div 
                    className="absolute -left-4 top-0 bottom-0 w-8"
                    style={{ 
                      background: `linear-gradient(90deg, transparent, ${C.cyan}1f, transparent)`,
                    }}
                  />
                  {/* Main line */}
                  <motion.div 
                    className="absolute -left-[1px] top-0 bottom-0 w-[2px] rounded-full"
                    style={{ 
                      background: `linear-gradient(to bottom, ${C.cyan}, ${C.cyan}70)`,
                      boxShadow: `0 0 8px ${C.cyan}, 0 0 18px ${C.cyan}55`,
                    }}
                    animate={{ opacity: [0.85, 1, 0.85] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  {/* Floating time pill on the line */}
                  <div 
                    className="absolute -left-[1px] -top-[9px] -translate-x-1/2 px-1.5 py-[2px] rounded-md whitespace-nowrap"
                    style={{ 
                      background: `linear-gradient(135deg, ${C.cyan} 0%, ${C.blue} 100%)`,
                      boxShadow: `0 0 10px ${C.cyan}80`,
                    }}
                  >
                    <span className="text-[8px] font-bold font-mono tabular-nums leading-none" style={{ color: '#001018' }}>
                      {currentHour}:{currentMin < 10 ? '0' : ''}{currentMin}
                    </span>
                  </div>
                  {/* Pulsing halo behind pill */}
                  <motion.div 
                    className="absolute -left-1 -top-1 w-2 h-2 rounded-full"
                    style={{ background: C.cyan, boxShadow: `0 0 10px ${C.cyan}` }}
                    animate={{ scale: [1, 1.6, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
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
                const isNightHour = displayHour >= 19 || displayHour < 7;
                const isMajorHour = displayHour % 3 === 0;
                return (
                  <div
                    key={`grid-${hour}-${i}`}
                    className="absolute top-0 bottom-0"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  >
                    {isNightHour && (
                      <div className="absolute inset-0" style={{ background: 'rgba(2, 6, 23, 0.18)' }} />
                    )}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-px"
                      style={{
                        background: isMajorHour
                          ? `linear-gradient(to bottom, ${C.cyan}18, ${C.cyan}08)`
                          : 'rgba(148, 163, 184, 0.06)',
                      }}
                    />
                  </div>
                );
              })}
            </div>

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
                <motion.div
                  key={room.id}
                  className={`relative flex items-stretch group cursor-pointer rounded-xl overflow-hidden ${room.isLocked ? 'locked-room-glow' : ''}`}
                  style={{
                    height: rowHeight,
                    background: isActive 
                      ? `linear-gradient(135deg, ${stepColor}12 0%, ${stepColor}04 100%)`
                      : `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)`,
                    border: room.isLocked 
                      ? `1.5px solid rgba(6, 182, 212, 0.4)`
                      : `1px solid ${isActive ? `${stepColor}30` : C.border}`,
                    boxShadow: isActive 
                      ? `inset 0 1px 0 rgba(255,255,255,0.05), 0 0 16px ${stepColor}08` 
                      : 'inset 0 1px 0 rgba(255,255,255,0.02)',
                  }}
                  onClick={() => setSelectedRoom(room)}
                  whileHover={{ scale: 1.008, translateY: -1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  {/* Colored left accent bar */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                    style={{ 
                      background: isActive 
                        ? `linear-gradient(to bottom, ${stepColor}, ${stepColor}80)`
                        : `linear-gradient(to bottom, ${C.slate}40, transparent)`,
                      boxShadow: isActive ? `0 0 8px ${stepColor}40` : 'none',
                    }}
                  />
                  
                  {/* Room Label - Premium glass panel (sticky při zoomu, aby zůstal vlevo) */}
                  <div 
                    className="flex-shrink-0 flex items-center gap-3 pl-4 pr-3 min-h-0 overflow-hidden transition-all duration-200 sticky left-0 z-20" 
                    style={{ 
                      width: ROOM_LABEL_WIDTH, 
                      minWidth: ROOM_LABEL_WIDTH, 
                      borderRight: `1px solid ${C.border}`,
                      background: zoom > 1 ? C.bgPanel : 'transparent',
                    }}
                  >
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
                            animate={{ scale: [1, 1.02, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
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
                          animate={{ scale: [1, 1.4, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}

                      {/* Room name and details */}
                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <p className="text-sm font-semibold tracking-tight text-white truncate leading-tight">
                          {room.name}
                        </p>
                        {room.department && rowHeight >= 42 && (
                          <p className="text-[10px] text-white/40 truncate leading-tight mt-0.5">
                            {room.department}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
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
                    {/* Locked room diagonal stripes overlay */}
                    {room.isLocked && (
                      <div className="locked-room-stripes absolute inset-0 z-10 rounded-lg" />
                    )}
                    
                    {/* Locked room overlay — jeden velký, centrovaný nápis přes celý řádek.
                        Žádné další statusové texty se u uzamčeného sálu nezobrazují. */}
                    {room.isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center gap-3 z-20 pointer-events-none">
                        <Lock className="w-6 h-6 flex-shrink-0" style={{ color: C.cyan, opacity: 0.9, filter: 'drop-shadow(0 0 8px rgba(6,182,212,0.6))' }} />
                        <span 
                          className="text-lg font-bold uppercase tracking-[0.3em] whitespace-nowrap"
                          style={{ color: 'rgba(255,255,255,0.95)', textShadow: `0 0 24px ${C.cyan}66` }}
                        >
                          SÁL UZAVŘEN
                        </span>
                      </div>
                    )}
                    {/* Hodinová mřížka se kreslí globálně přes všechny řádky
                        (viz „Hour grid overlay" výše), proto ji zde záměrně
                        NEopakujeme — eliminuje duplicitní DOM a nekonzistentní
                        noční výpo��et. */}

                    {/* Waiting bar — Shows patient waiting in operating tract before operation starts */}
                    {!room.isLocked && room.patientArrivedAt && (() => {
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
                            className="absolute top-0.5 bottom-0.5 overflow-hidden rounded-sm group"
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
                          >
                              {/* Completed operation segments with colors from database context */}
                              {operation.statusHistory && operation.statusHistory.length > 0 && (
                                <div className="absolute inset-0 flex overflow-hidden rounded-sm">
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
                                      const phaseColor =
                                        stepColorMap[entry.stepIndex]
                                        || entry.color
                                        || '#6b7280';

                                      return (
                                        <motion.div
                                          key={`seg-${idx}`}
                                          className="absolute top-0 bottom-0 transition-all duration-300 hover:brightness-105"
                                          style={{
                                            left: `${Math.max(0, segLeftPct)}%`,
                                            width: `${Math.max(0.5, segWidthPct)}%`,
                                            // Jemnější (průhlednější) barva pro již proběhlé fáze —
                                            // zůstávají rozpoznatelné, ale nepůsobí tak agresivně jako
                                            // aktivní výkon.
                                            background: `linear-gradient(180deg, ${phaseColor}99 0%, ${phaseColor}66 100%)`,
                                            borderRight: idx < operation.statusHistory.length - 1 ? `1px solid rgba(0,0,0,0.28)` : 'none',
                                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 0 6px ${phaseColor}40`,
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
                    
                    {isActive && !room.isLocked && shouldShowBar && boxWidthPct > 0 && (
                      <motion.div
                        className="absolute top-0.5 bottom-0.5 overflow-hidden"
                        style={{ 
                          left: `${Math.max(0, boxLeftPct)}%`, 
                          width: `${boxWidthPct}%`,
                          background: `linear-gradient(135deg, ${C.bgElevated} 0%, ${C.bgSurface} 100%)`,
                          boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 20px ${stepColor}15, inset 0 1px 0 rgba(255,255,255,0.05)`,
                          border: `1px solid ${stepColor}30`,
                        }}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        onMouseEnter={(e) => setHoveredOp({ room, x: e.clientX, y: e.clientY })}
                        onMouseMove={(e) => setHoveredOp({ room, x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setHoveredOp(null)}
                      >
                        {/* Animated colored left border with glow */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1"
                          style={{ 
                            background: `linear-gradient(to bottom, ${stepColor}, ${stepColor}cc)`,
                            boxShadow: `0 0 12px ${stepColor}60, 0 0 24px ${stepColor}30`,
                          }}
                        />
                        
                        {/* Premium progress bar with gradient */}
                        <div className="absolute left-1 right-0 top-0 bottom-0 overflow-hidden">
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
                                          background: `linear-gradient(180deg, ${phaseColor}50 0%, ${phaseColor}25 100%)`,
                                          borderRight: !isCurrentSegment ? `1px solid rgba(0,0,0,0.3)` : 'none',
                                          boxShadow: isCurrentSegment 
                                            ? `inset 0 1px 0 rgba(255,255,255,0.15), inset -1px 0 0 ${phaseColor}80`
                                            : 'inset 0 1px 0 rgba(255,255,255,0.1)',
                                        }}
                                        title={entry.stepName || statusByOrderIndex[entry.stepIndex]?.title || ''}
                                      />
                                    );
                                  })}
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
                              
                              {/* Time info on right - Premium pill */}
                              {showRightBadge && (
                                <motion.div 
                                  className="flex-shrink-0 px-3 py-1.5 rounded-lg"
                                  style={{
                                    background: `linear-gradient(135deg, ${C.bgSurface} 0%, rgba(0,0,0,0.3) 100%)`,
                                    border: `1px solid ${C.border}`,
                                  }}
                                >
                                  <p className="text-[11px] text-white/80 font-mono font-medium">
                                    {remainingTime}
                                  </p>
                                </motion.div>
                              )}
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
                    {isFree && !room.isLocked && (
                      <motion.div 
                        className="absolute inset-y-1.5 right-3 flex items-center gap-2.5 pl-2.5 pr-3 rounded-xl overflow-hidden"
                        style={{ 
                          background: `linear-gradient(135deg, ${C.green}26 0%, ${C.green}12 100%)`,
                          border: `1px solid ${C.green}3a`,
                          boxShadow: `0 0 16px ${C.green}12, inset 0 1px 0 rgba(255,255,255,0.05)`,
                        }}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Ikona s jemnou pulzující svatozáří */}
                        <div className="relative flex-shrink-0">
                          <motion.div
                            className="absolute inset-0 rounded-lg"
                            style={{ background: C.green }}
                            animate={{ opacity: [0, 0.18, 0], scale: [0.9, 1.25, 0.9] }}
                            transition={{ duration: 2.4, repeat: Infinity }}
                          />
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
                        <div
                          className="absolute top-0 bottom-0 z-20 group/eohours"
                          style={{ left: `${endPercent}%` }}
                        >
                          {/* Jemná přerušovaná čára — značka konce provozní doby sálu.
                              Decentní amber, aby nepřebíjela statusy ani časovou osu. */}
                          <div
                            className="absolute inset-y-0 left-0 w-px"
                            style={{
                              backgroundImage: 'repeating-linear-gradient(to bottom, rgba(249,115,22,0.55) 0px, rgba(249,115,22,0.55) 4px, transparent 4px, transparent 9px)',
                            }}
                          />
                          {/* Kompaktní amber chip s časem.
                              Aby nevznikal sloupec identických chipů přes všechny
                              řádky, zobrazujeme čas trvale jen na PRVNÍM řádku;
                              na ostatních se odhalí při najetí myší na čáru
                              (čára „konec provozní doby" zůstává na každém řádku). */}
                          <div
                            className={`absolute top-0.5 left-0 -translate-x-1/2 px-1 py-px rounded-[5px] text-[8px] font-semibold font-mono tabular-nums whitespace-nowrap leading-none transition-opacity duration-150 ${
                              roomIndex === 0 ? 'opacity-100' : 'opacity-0 group-hover/eohours:opacity-100'
                            }`}
                            style={{
                              background: 'rgba(249, 115, 22, 0.12)',
                              border: '1px solid rgba(249, 115, 22, 0.28)',
                              color: 'rgba(251, 191, 132, 0.95)',
                            }}
                          >
                            {todaySchedule.endHour.toString().padStart(2, '0')}:{todaySchedule.endMinute.toString().padStart(2, '0')}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              );
            })}
            </div>
          </div>
        </div>
      </div>
      )}

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
