import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { OperatingRoom, WeeklySchedule, DEFAULT_WEEKLY_SCHEDULE } from '../types';
import { STEP_DURATIONS, STEP_COLORS } from '../constants';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import MobileTimelineView from './mobile/MobileTimelineView';
import { 
  Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe, 
  Settings, User, Sparkles, Info, ChevronRight, Loader2, Pause, Phone, BedDouble, AlertCircle,
  Plus, Minus, RotateCcw
} from 'lucide-react';

// ========== DESIGN TOKENS (LoginPage style) ==========
const C = {
  accent: '#FBBF24',
  cyan: '#06B6D4',
  yellow: '#FBBF24',
  green: '#10B981',
  orange: '#F97316',
  red: '#EF4444',
  purple: '#A78BFA',
  pink: '#EC4899',
  border: 'rgba(255,255,255,0.07)',
  surface: 'rgba(255,255,255,0.025)',
  glass: 'rgba(255,255,255,0.04)',
  muted: 'rgba(255,255,255,0.35)',
  text: 'rgba(255,255,255,0.85)',
};

// ========== CONSTANTS ==========
const TIMELINE_START_HOUR = 7;
const TIMELINE_END_HOUR = 31; // 7:00 next day (7 + 24 = 31)
const TIMELINE_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR; // 24 hours
const ROOM_LABEL_WIDTH = 320;
const MIN_ROW_HEIGHT = 24; // Absolutní spodní hranice — pod tím už není čitelné (1 line truncate)
const MAX_ROW_HEIGHT = 72; // Maximum row height (when few rooms)
const ROW_GAP_PX = 6;      // gap-1.5 mezi řádky (6px) — musí korespondovat s `gap-[6px]` v JSX
const TIME_MARKERS = Array.from({ length: 25 }, (_, i) => i); // 0-24 for 24 hour markers

const ROOM_COLOR_ORDER = ['orange', 'purple', 'pink', 'blue', 'green', 'red', 'cyan'] as const;

const ROOM_COLORS: Record<string, { bg: string; border: string; stripe: string; text: string; glow: string }> = {
  orange: { bg: '#FB923C', border: '#FDBA74', stripe: '#FED7AA', text: '#FFF', glow: 'rgba(251,146,60,0.2)' },
  purple: { bg: '#C084FC', border: '#D8B4FE', stripe: '#E9D5FF', text: '#FFF', glow: 'rgba(192,132,252,0.2)' },
  pink: { bg: '#F472B6', border: '#F9A8D4', stripe: '#FBCFE8', text: '#FFF', glow: 'rgba(244,114,182,0.2)' },
  blue: { bg: '#60A5FA', border: '#93C5FD', stripe: '#BFDBFE', text: '#FFF', glow: 'rgba(96,165,250,0.2)' },
  green: { bg: '#4ADE80', border: '#86EFAC', stripe: '#BBF7D0', text: '#FFF', glow: 'rgba(74,222,128,0.2)' },
  red: { bg: '#F87171', border: '#FCA5A5', stripe: '#FECACA', text: '#FFF', glow: 'rgba(248,113,113,0.2)' },
  cyan: { bg: '#22D3EE', border: '#67E8F9', stripe: '#A5F3FC', text: '#FFF', glow: 'rgba(34,211,238,0.2)' },
};

  // Step colors podle step_index z databáze - dynamicky přepsáno z kontextu v renderování
  const STEP_INDEX_COLORS: Record<number, string> = {
  0: '#6b7280',
  1: '#8b5cf6',
  2: '#ec4899',
  3: '#ef4444',
  4: '#f59e0b',
  5: '#a855f7',
  6: '#10b981',
  7: '#f97316',
};

// ========== HELPER FUNCTIONS ==========
const getTimePercent = (date: Date): number => {
  const hours = date.getHours() + date.getMinutes() / 60;
  let percent = ((hours - TIMELINE_START_HOUR) / TIMELINE_HOURS) * 100;
  if (percent < 0) percent += (24 / TIMELINE_HOURS) * 100;
  // Return percent clamped to valid timeline range
  return Math.max(0, Math.min(100, percent));
};

const parseTimeToDate = (timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const hourLabel = (hour: number): string => {
  // Convert timeline hour (0-24) to actual 24-hour format (7:00 to 7:00 next day)
  const actualHour = TIMELINE_START_HOUR + hour; // 7 + (0-24) = 7-31
  const displayHour = actualHour % 24; // Display as 7-23, 0-6
  return `${displayHour < 10 ? '0' : ''}${displayHour}:00`;
};

const isNextDayHour = (hour: number): boolean => hour >= 24;

// Check if operation should be displayed in current 24-hour window (7:00 today to 7:00 tomorrow)
// Rules:
// - SHOW operations that started OR ended within the current 24h window (7:00 - 7:00)
// - SHOW continuing operations that started before 7:00 but end after 7:00 (still running)
// - DO NOT show operations that fully ended before the window start (yesterday's old ops)
const isOperationInWindow = (startDate: Date, endDate: Date, currentTime: Date): boolean => {
  // Get current window start: 7:00 of the current day
  const windowStart = new Date(currentTime);
  windowStart.setHours(TIMELINE_START_HOUR, 0, 0, 0);
  // If current time is before 7:00, window started yesterday
  if (currentTime.getHours() < TIMELINE_START_HOUR) {
    windowStart.setDate(windowStart.getDate() - 1);
  }
  // Window ends at 7:00 next day
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 1);

  // Show if operation overlaps with the 24h window at all
  // (operation ends after window start AND starts before window end)
  return endDate > windowStart && startDate < windowEnd;
};

// Check if operation exceeds 24 hours
const exceedsT24Hours = (startDate: Date, endDate: Date): boolean => {
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  return durationHours > 24;
};

// Get time percent for timeline display
// Timeline runs from 7:00 (0%) to 7:00 next day (100%)
// Operations that cross 7:00 will extend beyond 100%
const getTimePercentForTimeline = (date: Date, referenceStart: Date): number => {
  const diffMs = date.getTime() - referenceStart.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return (diffHours / TIMELINE_HOURS) * 100;
};

// Get operation position on timeline (single continuous bar, even if crossing 7:00)
const getOperationPosition = (startDate: Date, endDate: Date, currentTime: Date): {
  left: number, 
  width: number, 
  exceedsBoundary: boolean,
  isContinuing: boolean  // True if operation started before 7:00 (from previous day)
} => {
  // Calculate window start (7:00 of the current day)
  const windowStart = new Date(currentTime);
  windowStart.setHours(TIMELINE_START_HOUR, 0, 0, 0);
  
  // If current time is before 7:00, window started yesterday
  if (currentTime.getHours() < TIMELINE_START_HOUR) {
    windowStart.setDate(windowStart.getDate() - 1);
  }
  
  // Calculate position relative to window start
  let leftPct = getTimePercentForTimeline(startDate, windowStart);
  let endPct = getTimePercentForTimeline(endDate, windowStart);
  
  // Check if operation started before window (continuing from previous day)
  const isContinuing = leftPct < 0;
  
  // Clamp left to 0 if operation started before window
  if (leftPct < 0) leftPct = 0;
  
  // Check if operation exceeds timeline boundary (past 7:00 next day = 100%)
  const exceedsBoundary = endPct > 100;
  
  // Clamp end to 100 for display (but track if it exceeds)
  if (endPct > 100) endPct = 100;
  
  const width = Math.max(0, endPct - leftPct);
  
  return {
    left: leftPct,
    width: width,
    exceedsBoundary: exceedsBoundary,
    isContinuing: isContinuing
  };
};

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

function TimelineModuleImpl({ rooms }: TimelineModuleProps) {
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
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1 = 100%, 5 = 500%
  // Mobilní přepínač: list = karty se statusem a progressem; axis = horizontální 24h osa
  const [mobileView, setMobileView] = useState<'list' | 'axis'>('list');
  const [rowHeight, setRowHeight] = useState<number>(MAX_ROW_HEIGHT);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const rowsContainerRef = useRef<HTMLDivElement>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  const [densityMode, setDensityMode] = useState<'normal' | 'compact'>('normal');

  // Load departments dynamically from rooms list
  const departments = useMemo(() => {
    const deps = new Set<string>();
    rooms.forEach((r) => {
      if (r.department) deps.add(r.department);
    });
    return Array.from(deps);
  }, [rooms]);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  
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
    const activeRooms = rooms.filter(r => !r.isLocked);
    const operations = activeRooms.filter(r => r.currentStepIndex >= 0 && r.currentStepIndex <= 4 && !r.isEmergency).length;
    const cleaning = activeRooms.filter(r => r.currentStepIndex === 5 && !r.isEmergency).length;
    const free = activeRooms.filter(r => r.currentStepIndex >= 6 && !r.isEmergency).length;
    const completed = rooms.reduce((acc, r) => acc + (r.completedOperations?.length || 0), 0);
    const emergencyCount = rooms.filter(r => r.isEmergency).length;
    return { operations, cleaning, free, completed, emergencyCount };
  }, [rooms]);

  const pctStats = useMemo(() => {
    const activeRoomsCount = rooms.filter(r => !r.isLocked).length;
    const pctOperations = activeRoomsCount > 0 ? Math.round((stats.operations / activeRoomsCount) * 100) : 0;
    const pctCleaning = activeRoomsCount > 0 ? Math.round((stats.cleaning / activeRoomsCount) * 100) : 0;
    const pctFree = activeRoomsCount > 0 ? Math.round((stats.free / activeRoomsCount) * 100) : 0;
    return { pctOperations, pctCleaning, pctFree };
  }, [rooms, stats]);

  /* --- Rooms in original order - now stateful for reordering --- */
  const [orderedRoomIds, setOrderedRoomIds] = useState<string[]>([]);

  useEffect(() => {
    // Initial and dynamic synchronization of room order
    if (rooms.length > 0 && (orderedRoomIds.length === 0 || rooms.length !== orderedRoomIds.length)) {
      setOrderedRoomIds(rooms.map(r => r.id));
    }
  }, [rooms.length]);

  const sortedRooms = useMemo(() => {
    if (orderedRoomIds.length === 0) return rooms;
    return orderedRoomIds.map(id => rooms.find(r => r.id === id)).filter((r): r is OperatingRoom => !!r);
  }, [orderedRoomIds, rooms]);

  // Filter sortedRooms based on search inputs
  const filteredRooms = useMemo(() => {
    return sortedRooms.filter((room) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesRoom = room.name.toLowerCase().includes(q);
        const matchesDept = room.department?.toLowerCase().includes(q) || false;
        const matchesProc = room.currentProcedure?.name?.toLowerCase().includes(q) || false;
        const matchesDoctor = room.staff?.doctor?.name?.toLowerCase().includes(q) || false;
        const matchesNurse = room.staff?.nurse?.name?.toLowerCase().includes(q) || false;
        const matchesAnesthesiologist = room.staff?.anesthesiologist?.name?.toLowerCase().includes(q) || false;
        
        if (!matchesRoom && !matchesDept && !matchesProc && !matchesDoctor && !matchesNurse && !matchesAnesthesiologist) {
          return false;
        }
      }
      
      if (filterDepartment !== 'ALL' && room.department !== filterDepartment) {
        return false;
      }
      
      if (filterStatus !== null && room.currentStepIndex !== filterStatus) {
        return false;
      }
      
      return true;
    });
  }, [sortedRooms, searchQuery, filterDepartment, filterStatus]);

  // Calculate responsive row height based on filtered list size
  useEffect(() => {
    const calculateRowHeight = () => {
      if (rowsContainerRef.current && filteredRooms.length > 0) {
        const containerHeight = rowsContainerRef.current.clientHeight;
        const totalGapPx = (filteredRooms.length - 1) * ROW_GAP_PX;
        // Odečteme 6px safety buffer, aby subpixel zaokrouhlení prohlížečů nezpůsobilo zobrazení scrollbaru
        const availableHeight = Math.max(0, containerHeight - totalGapPx - 6);
        // Math.floor → zaokrouhli dolů, aby ani 1px subpixel rounding nezpůsobil overflow
        const calculatedHeight = Math.floor(availableHeight / filteredRooms.length);
        const maxH = densityMode === 'compact' ? 44 : MAX_ROW_HEIGHT;
        const minH = densityMode === 'compact' ? 24 : MIN_ROW_HEIGHT;
        const clampedHeight = Math.max(minH, Math.min(maxH, calculatedHeight));
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
  }, [filteredRooms.length, densityMode]);

  /* --- ARO Overtime Tracking - rooms that exceed working hours --- */
  const aroOvertimeRooms = useMemo(() => {
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const todayKey = dayKeys[currentTime.getDay()];
    
    const overtimeList: Array<{
      roomId: string;
      roomName: string;
      estimatedEndTime: Date;
      workingEndTime: Date;
      overtimeMinutes: number;
    }> = [];
    
    rooms.forEach(room => {
      // Skip non-active, emergency, or locked rooms
      if (room.currentStepIndex >= 6 || room.isEmergency || room.isLocked) return;
      
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
        overtimeList.push({
          roomId: room.id,
          roomName: room.name,
          estimatedEndTime: endTime,
          workingEndTime,
          overtimeMinutes
        });
      }
    });
    
    // Sort by estimated end time (who finishes first has priority to be relieved first)
    return overtimeList.sort((a, b) => a.estimatedEndTime.getTime() - b.estimatedEndTime.getTime());
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
      className="w-full h-full text-white overflow-hidden flex flex-col relative"
      style={{
        background: 'radial-gradient(circle at 50% 50%, #0f1d35 0%, #050a15 40%, #020408 75%, #000000 100%)',
      }}
    >
 
      {/* Ambient background glows - enhanced technical depth with multiple accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute -top-[15%] left-[15%] w-[55%] h-[55%] rounded-full opacity-[0.28]"
          style={{ 
            background: `radial-gradient(circle, ${C.accent} 0%, transparent 70%)`, 
            filter: 'blur(140px)' 
          }}
        />
        <div 
          className="absolute bottom-[-5%] -right-[5%] w-[45%] h-[45%] rounded-full opacity-[0.22]"
          style={{ 
            background: `radial-gradient(circle, ${C.purple} 0%, transparent 70%)`, 
            filter: 'blur(140px)' 
          }}
        />
        <div 
          className="absolute top-[40%] right-[10%] w-[35%] h-[35%] rounded-full opacity-[0.15]"
          style={{ 
            background: `radial-gradient(circle, ${C.cyan} 0%, transparent 70%)`, 
            filter: 'blur(120px)' 
          }}
        />
        {/* Subtle grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.05]" 
          style={{ backgroundImage: `radial-gradient(${C.accent} 1px, transparent 0)`, backgroundSize: '40px 40px' }} 
        />
      </div>
 
      {/* Room Detail Popup */}
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPopup room={selectedRoom} onClose={() => setSelectedRoom(null)} currentTime={currentTime} />
        )}
      </AnimatePresence>
 
      {/* ======== MOBILE VIEW (md:hidden) — redesigned ======== */}
      <MobileTimelineView
        rooms={filteredRooms}
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
      <div className="hidden md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden relative z-10">

      {/* ======== Header with Title and Stats ======== */}
      <div 
        className="sticky top-0 z-50 transition-all duration-200"
        style={{ 
          background: 'linear-gradient(180deg, rgba(5,10,20,0.98) 0%, rgba(5,10,20,0.75) 100%)',
          backdropFilter: 'blur(50px)',
          borderBottom: `1px solid rgba(255,255,255,0.08)`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Top accent glow (enhanced) */}
        <div 
          className="absolute top-0 left-0 right-0 h-px pointer-events-none opacity-60"
          style={{ background: `linear-gradient(90deg, transparent 0%, ${C.accent}40 50%, transparent 100%)` }}
        />
        <div className="px-10 py-3.5 flex items-center justify-between gap-4 w-full overflow-hidden">
          {/* Left Side: Welcoming Title & Stats Box items */}
          <div className="flex items-center gap-4 overflow-hidden min-w-0 flex-1">
            {/* Welcoming Text styled styled like screenshot */}
            <div className="flex flex-col flex-shrink-0 mr-2">
              <span className="text-[10px] font-black uppercase text-white/35 tracking-[0.25em] mb-1">Dobrý den 👋</span>
              <h2 className="text-[17px] font-black text-white leading-none whitespace-nowrap tracking-tight">Přehled Sálů</h2>
            </div>

            {/* Logo */}
            <div 
              className="w-12 h-12 rounded-[16px] flex items-center justify-center relative group overflow-hidden flex-shrink-0"
              style={{ 
                background: `linear-gradient(135deg, ${C.accent}15 0%, ${C.accent}05 100%)`,
                border: `1px solid ${C.accent}30`,
                boxShadow: `0 8px 30px -8px ${C.accent}20, inset 0 1px 1px rgba(255,255,255,0.1)`,
              }}
            >
              <div className="absolute inset-0 bg-white opacity-[0.03] shadow-inner" />
              <Activity className="w-5 h-5 transition-all duration-200 group-hover:scale-110 group-hover:rotate-12" style={{ color: C.accent }} />
              
              {/* Technical corner markers */}
              <div className="absolute top-1.5 left-1.5 w-1 h-1 border-t border-l border-white/20" />
              <div className="absolute bottom-1.5 right-1.5 w-1 h-1 border-b border-r border-white/20" />
            </div>

            {/* Stats row items with circular progress indicators */}
            <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar py-1.5 min-w-0">
              <StatBox 
                icon={Activity} 
                label="Centrální Trakt" 
                value={`${stats.operations} sálů`} 
                color={C.green} 
                glow
                progress={pctStats.pctOperations}
              />
              <StatBox 
                icon={Loader2} 
                label="Sanitace" 
                value={`${stats.cleaning} v procesu`} 
                color={C.orange} 
                progress={pctStats.pctCleaning}
              />
              <StatBox 
                icon={Stethoscope} 
                label="Pohotovost" 
                value={`${stats.free} volných`} 
                color={C.cyan} 
                progress={pctStats.pctFree}
              />
              <StatBox 
                icon={Shield} 
                label="Dokončeno" 
                value={`${stats.completed} výkonů`} 
                color={C.purple} 
                progress={stats.completed > 0 ? 100 : 0}
              />

              {stats.emergencyCount > 0 && (
                <StatBox 
                  icon={AlertTriangle} 
                  label="Emergency" 
                  value={`${stats.emergencyCount} sálů`} 
                  color={C.red} 
                  glow 
                  progress={100}
                />
              )}

              {/* ARO Overtime indicator Refined */}
              {aroOvertimeRooms.length > 0 && (
                <motion.div
                  className="relative flex-shrink-0 h-[68px] rounded-[22px] px-5 py-3 overflow-hidden backdrop-blur-2xl transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl flex flex-col justify-center"
                  animate={{ opacity: [1, 0.8, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{
                    background: `${C.red}12`,
                    border: `1px solid ${C.red}35`,
                    boxShadow: `0 12px 30px -8px ${C.red}25, inset 0 1px 0 rgba(255,255,255,0.05)`,
                  }}
                >
                  <div 
                    className="absolute top-0 left-5 right-5 h-px opacity-40"
                    style={{ background: `linear-gradient(90deg, transparent, ${C.red}80, transparent)` }}
                  />
                  
                  <div className="relative flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ 
                        background: `${C.red}20`, 
                        border: `1px solid ${C.red}25`,
                        boxShadow: `0 0 15px ${C.red}25`
                      }}
                    >
                      <AlertTriangle className="w-4 h-4" style={{ color: C.red }} />
                    </div>
                    <div className="flex flex-col flex-shrink-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-red-400/60 leading-none mb-1">ARO PŘESAH</p>
                      <span className="text-[14px] font-black leading-none text-white">{aroOvertimeRooms.length}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Right Side: Zoom Controls & Clock */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* DateTime Box Refined */}
            <div
              className="relative flex-shrink-0 h-[68px] rounded-[22px] px-5 py-3 flex items-center gap-4 bg-white/[0.03] border border-white/[0.1] backdrop-blur-3xl transition-all duration-200 hover:bg-white/[0.05] hover:border-white/[0.15] hover:shadow-lg"
              style={{
                boxShadow: '0 12px 40px -8px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex flex-col items-end border-r border-white/10 pr-3 flex-shrink-0">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 leading-none mb-1">Datum</p>
                <span className="text-xs font-bold text-white/80 leading-none whitespace-nowrap">{formatDate(currentTime)}</span>
              </div>

              {/* Time Box - LoginPage glassmorph style */}
              <div
                className="relative flex-shrink-0 h-11 rounded-xl px-3 py-1.5 overflow-hidden backdrop-blur-md transition-all duration-200 hover:scale-[1.02] flex items-center"
                style={{
                  background: C.glass,
                  border: `1px solid ${C.border}`,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                }}
              >
                <div className="relative flex items-center gap-2 h-full">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: `${C.accent}15`,
                      border: `1px solid ${C.accent}25`,
                    }}
                  >
                    <Clock className="w-3.5 h-3.5" style={{ color: C.accent }} />
                  </div>
                  <div className="min-w-[64px]">
                    <p className="text-[8px] text-white/40 uppercase tracking-[0.3em] font-semibold leading-none mb-0.5">Čas</p>
                    <p className="text-xs font-bold leading-none tabular-nums" style={{ color: C.accent }}>
                      {currentTime.toLocaleTimeString("cs-CZ", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Zoom Controls refined for hardware feel */}
            <div className="flex items-center p-1.5 bg-white/[0.04] border border-white/[0.1] rounded-[16px] backdrop-blur-3xl shadow-2xl flex-shrink-0 transition-all hover:bg-white/[0.06]">
              <button 
                onClick={() => setZoomLevel(prev => Math.max(1, prev - 1))}
                className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/[0.1] transition-all text-white/50 hover:text-white/80 active:scale-90 group"
                title="Zmenšit"
              >
                <Minus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
              
              <div className="flex flex-col items-center justify-center min-w-[60px] h-10 border-x border-white/[0.08] bg-white/[0.02] mx-2 rounded-lg">
                <span className="text-[11px] font-black text-amber-400 tracking-widest leading-none mb-0.5">{(zoomLevel * 100).toFixed(0)}%</span>
                <span className="text-[6px] uppercase tracking-[0.15em] opacity-40 font-black leading-none">MĚŘÍTKO</span>
              </div>
              
              <button 
                onClick={() => setZoomLevel(prev => Math.min(5, prev + 1))}
                className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/[0.1] transition-all text-white/50 hover:text-white/80 active:scale-90 group"
                title="Zvětšit"
              >
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {zoomLevel !== 1 && (
              <button 
                onClick={() => setZoomLevel(1)}
                className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.07] transition-all text-white/40 hover:text-white active:scale-95 flex-shrink-0"
                title="Resetovat měřítko"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Secondary Header Row: Dynamic Interactive Search, Filters, Stage Legend & Density */}
        <div className="px-10 pb-4 pt-1 border-t border-white/[0.04] flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
          {/* Left: Search Input & Department Selector */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap min-w-0">
            {/* Search Input */}
            <div 
              className="relative rounded-[14px] h-10 px-4 flex items-center bg-white/[0.03] border border-white/[0.1] focus-within:border-amber-400/50 focus-within:bg-white/[0.06] transition-all min-w-[240px] hover:bg-white/[0.04]"
              style={{
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
              }}
            >
              <Activity className="w-4 h-4 text-white/40 mr-2.5 shrink-0" />
              <input
                type="text"
                placeholder="Hledat sál, lékaře, výkon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white placeholder-white/25 w-full h-full font-medium"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="w-5 h-5 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/25 text-white/60 hover:text-white/80 ml-2 shrink-0 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
                </button>
              )}
            </div>

            {/* Department Filter Dropdown */}
            <div className="relative flex items-center">
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="appearance-none bg-[#090d16] hover:bg-white/[0.05] border border-white/[0.08] rounded-xl h-9 pl-3.5 pr-8 text-xs font-bold text-white/80 outline-none cursor-pointer transition-all focus:border-amber-400/40"
              >
                <option value="ALL">Všechna oddělení</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 select-none text-[8px]">
                ▼
              </div>
            </div>

            {/* Density switch toggles (Normal / Compact) */}
            <div className="flex items-center p-0.5 bg-white/[0.03] border border-white/[0.08] rounded-xl flex-shrink-0 h-9">
              <button
                onClick={() => setDensityMode('normal')}
                className={`px-3 h-full rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center ${
                  densityMode === 'normal'
                    ? 'bg-white/10 text-white/90 shadow'
                    : 'text-white/30 hover:text-white/60'
                }`}
                title="Sál s detaily"
              >
                Normální
              </button>
              <button
                onClick={() => setDensityMode('compact')}
                className={`px-3 h-full rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center ${
                  densityMode === 'compact'
                    ? 'bg-white/10 text-white/90 shadow'
                    : 'text-white/30 hover:text-white/60'
                }`}
                title="Kompaktní přehled"
              >
                Kompaktní
              </button>
            </div>

            {/* Clear All Filters Button */}
            {(searchQuery || filterDepartment !== 'ALL' || filterStatus !== null) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterDepartment('ALL');
                  setFilterStatus(null);
                }}
                className="h-9 px-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs tracking-wide transition-all uppercase flex items-center gap-1.5 shrink-0"
                title="Resetovat všechny filtry"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          {/* Right: Live Interactive Phase Highlighter Legend */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar max-w-full py-1">
            <span className="text-[10px] text-white/30 font-black uppercase tracking-widest shrink-0 mr-1">Zvýraznit fázi:</span>
            {activeStatuses.map((status) => {
              const isActive = filterStatus === status.order_index;
              const statusColor = STEP_INDEX_COLORS[status.order_index] || status.color || '#3b82f6';
              return (
                <button
                  key={status.id}
                  onClick={() => setFilterStatus(isActive ? null : status.order_index)}
                  className="px-3.5 h-[34px] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
                  style={{
                    background: isActive ? `linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%)` : 'rgba(255,255,255,0.02)',
                    color: isActive ? '#050a17' : 'rgba(255,255,255,0.55)',
                    border: isActive ? `1px solid ${statusColor}` : '1px solid rgba(255,255,255,0.04)',
                    boxShadow: isActive ? `0 8px 16px -4px ${statusColor}50, inset 0 1px 0 rgba(255,255,255,0.2)` : 'none',
                  }}
                >
                  <span 
                    className="w-1.5 h-1.5 rounded-full" 
                    style={{ backgroundColor: isActive ? '#050a17' : statusColor }} 
                  />
                  {status.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======== Main Timeline ======== */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 overflow-hidden px-10 md:px-10 pb-6">
        <div className="flex-1 flex flex-col overflow-x-auto overflow-y-hidden hide-scrollbar">
          <div style={{ 
            width: zoomLevel > 1 ? `calc(${ROOM_LABEL_WIDTH}px + ${zoomLevel * 100}%)` : '100%', 
            minWidth: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            flex: 1 
          }}>
        
        {/* Time Axis Header - Fixed, Glassmorphic */}
        <div 
          className="flex flex-shrink-0 rounded-t-3xl backdrop-blur-3xl overflow-hidden shadow-2xl" 
          style={{ 
            background: 'rgba(255,255,255,0.02)', 
            border: `1px solid rgba(255,255,255,0.06)`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 40px -10px rgba(0,0,0,0.5)',
          }}
        >
          {/* Room label header - fixed */}
          <div 
            className="flex-shrink-0 flex items-center px-4 gap-2" 
            style={{ 
              width: ROOM_LABEL_WIDTH, 
              minWidth: ROOM_LABEL_WIDTH, 
              borderRight: `1px solid rgba(255,255,255,0.08)`,
              background: '#030611',
            }}
          >
            <div 
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: `${C.accent}15`, border: `1px solid ${C.accent}25` }}
            >
              <Activity className="w-3.5 h-3.5" style={{ color: C.accent }} />
            </div>
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50">OPERAČNÍ SÁLY</span>
          </div>
          
          {/* Time markers - zoomable width */}
          <div className="flex-1 overflow-hidden" ref={timelineRef}>
            <div className="flex items-center h-12 relative" style={{ width: `${100 * zoomLevel}%` }}>
              {/* Shift Indicators Ribbons at the bottom edge of the timeline header */}
              <div className="absolute bottom-0 left-0 right-0 h-[3px] flex pointer-events-none opacity-40">
                {/* Ranní / Morning shift: 07:00 to 15:30 (8.5 Hours) */}
                <div className="h-full border-r border-slate-900/60" style={{ width: `${(8.5 / TIMELINE_HOURS) * 100}%`, backgroundColor: C.accent }} title="Ranní směna (07:00 - 15:30)" />
                {/* Odpolední / Afternoon shift: 15:30 to 22:00 (6.5 Hours) */}
                <div className="h-full border-r border-slate-900/60" style={{ width: `${(6.5 / TIMELINE_HOURS) * 100}%`, backgroundColor: C.cyan }} title="Odpolední směna (15:30 - 22:00)" />
                {/* Noční / Night shift: 22:00 to 07:00 next day (9.0 Hours) */}
                <div className="h-full" style={{ width: `${(9.0 / TIMELINE_HOURS) * 100}%`, backgroundColor: C.purple }} title="Noční pohotovost (22:00 - 07:00)" />
              </div>

              {TIME_MARKERS.map((hour, i) => {
                const isLast = i === TIME_MARKERS.length - 1;
                const widthPct = 100 / TIMELINE_HOURS;
                const leftPct = i * widthPct;
                // Convert timeline hour (0-24) to actual 24-hour format (7-31 represents 7:00 to 7:00 next day)
                const actualHour = TIMELINE_START_HOUR + hour; // 7 + (0-24) = 7-31
                const displayHour = actualHour % 24; // 7-23, 0-6 for next day hours
                const isNightHour = displayHour >= 19 || displayHour < 7;
                const isNextDay = actualHour >= 24;
                const isCurrentHour = displayHour === currentHour && !isLast;
                
                return (
                  <div 
                    key={`h-${hour}-${i}`} 
                    className="absolute top-0 h-full flex items-center" 
                    style={{ left: `${leftPct}%`, width: isLast ? 0 : `${widthPct}%` }}
                  >
                    <div 
                      className={`w-px h-full transition-all duration-300`}
                      style={{ 
                        background: isNightHour 
                          ? 'linear-gradient(to bottom, rgba(255,255,255,0.01), rgba(255,255,255,0.03), rgba(255,255,255,0.01))'
                          : 'linear-gradient(to bottom, rgba(255,255,255,0.04), rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
                      }} 
                    />
                    {!isLast && (
                      isCurrentHour ? (
                        <div 
                          className="ml-2 px-3 py-1 rounded-xl backdrop-blur-md"
                          style={{ 
                            background: `${C.accent}dd`, 
                            boxShadow: `0 0 20px ${C.accent}40`,
                            border: `1px solid rgba(255,255,255,0.2)`
                          }}
                        >
                          <span className="text-[10px] font-mono font-black text-slate-900 tracking-tighter">
                            {`${currentHour < 10 ? '0' : ''}${currentHour}:${currentMin < 10 ? '0' : ''}${currentMin}`}
                          </span>
                        </div>
                      ) : (
                        <div className="ml-2 flex items-center gap-1">
                          <span className={`text-[11px] font-mono font-bold tracking-tight ${isNightHour ? 'text-white/20' : 'text-white/40'}`}>
                            {hourLabel(hour)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Room Rows - Responsive height, vertical scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" ref={rowsContainerRef}>
          <div className="relative h-full" style={{ width: '100%' }} ref={scrollContainerRef}>
            {/* Now indicator - position fixed */}
            <AnimatePresence>
              {nowPercent >= 0 && nowPercent <= 100 && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="absolute top-0 bottom-0 z-30 pointer-events-none" 
                  style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${nowPercent / 100})` }}
                >
                  {/* Ambient static glow column */}
                  <div className="absolute -left-5 top-0 bottom-0 w-10 opacity-20 blur-lg" style={{ background: C.accent }} />
                  {/* Technical glowing neon indicator line */}
                  <div 
                    className="absolute -left-px top-0 bottom-0 w-[2px]" 
                    style={{ background: `linear-gradient(to bottom, ${C.accent} 0%, ${C.accent}aa 40%, ${C.accent}30 80%, transparent 100%)` }} 
                  />
                  {/* Top static tag with active timestamp */}
                  <div className="absolute -left-[54px] -top-1 px-2.5 py-0.5 rounded-full flex items-center gap-1 bg-slate-950 border border-amber-400 text-[8px] font-mono font-semibold text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.35)] whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>TEĎ {currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Room Rows content container with zoomable width */}
            <Reorder.Group 
              axis="y" 
              values={orderedRoomIds} 
              onReorder={setOrderedRoomIds}
              className="flex flex-col gap-[6px] px-2 pb-0" 
              style={{ width: '100%' }}
            >
            {filteredRooms.map((room) => {
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
              const stepName = room.isPaused 
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
                  <Reorder.Item
                    key={room.id}
                    value={room.id}
                    className="flex items-stretch cursor-grab active:cursor-grabbing transition-all duration-200 group rounded-lg"
                    style={{ height: rowHeight }}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <div 
                      className="flex-shrink-0 flex items-center gap-2 px-3 py-1 min-h-0 overflow-hidden sticky left-0 z-20 transition-all duration-200 group-hover:bg-white/[0.03] rounded-l-lg" 
                      style={{ 
                        width: ROOM_LABEL_WIDTH, 
                        minWidth: ROOM_LABEL_WIDTH, 
                        background: '#030611',
                        backdropFilter: 'blur(16px)',
                        borderRight: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '20px 0 40px -10px rgba(0,0,0,0.5)',
                      }}
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
                    <div className={`absolute inset-y-1 left-2 right-2 rounded-md overflow-hidden ${shouldPulse ? 'animate-pulse' : ''}`}>
                      <div 
                        className="absolute inset-0 rounded-md backdrop-blur-md"
                          style={{ 
                            background: `linear-gradient(135deg, ${bannerColor}20 0%, ${bannerColor}08 100%)`,
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
                  </Reorder.Item>
                );
              }

              if (room.isLocked) {
                return (
                  <Reorder.Item
                    key={room.id}
                    value={room.id}
                    className="flex items-stretch cursor-grab active:cursor-grabbing transition-all duration-200 group rounded-[24px] overflow-hidden"
                    style={{ 
                      height: rowHeight,
                      background: 'rgba(255,255,255,0.01)',
                      border: `1px solid rgba(255,255,255,0.04)`,
                    }}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <div 
                      className="flex-shrink-0 flex items-center gap-4 px-6 py-2.5 min-h-0 overflow-hidden sticky left-0 z-20 transition-all duration-200 group-hover:bg-white/[0.03]" 
                      style={{ 
                        width: ROOM_LABEL_WIDTH, 
                        minWidth: ROOM_LABEL_WIDTH, 
                        background: '#030611',
                        backdropFilter: 'blur(16px)',
                        borderRight: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '20px 0 40px -10px rgba(0,0,0,0.5)',
                      }}
                    >
                      <div 
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${C.accent}10`, border: `1px solid ${C.accent}20` }}
                      >
                        <Lock className="w-3.5 h-3.5" style={{ color: `${C.accent}80` }} />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="text-sm font-black tracking-tight truncate text-white/40 uppercase">{room.name}</p>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] truncate text-white/10">LOCKED</p>
                      </div>
                    </div>
                    {/* Locked timeline box - position adjusted for zoom */}
                    <div className="relative flex-1 overflow-hidden" style={{ width: `${100 * zoomLevel}%` }}>
                      <div className="absolute inset-y-1.5 left-2 right-2 rounded-[14px] overflow-hidden">
                        <div 
                          className="absolute inset-0 rounded-[14px] backdrop-blur-sm"
                          style={{ 
                            background: `linear-gradient(135deg, ${C.accent}08 0%, ${C.accent}03 100%)`,
                            border: `1px solid ${C.accent}15`,
                          }}
                        />
                        {/* Content */}
                        <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-20">
                          <Lock className="w-4 h-4" />
                          <span className="text-[10px] font-black tracking-[0.5em] uppercase select-none">
                            UZAMCENO
                          </span>
                        </div>
                      </div>
                    </div>
                  </Reorder.Item>
                );
              }

              /* Active / Free row */
              return (
                  <Reorder.Item
                    key={room.id}
                    value={room.id}
                    className="relative flex items-stretch group cursor-grab active:cursor-grabbing transition-all duration-300 rounded-[24px] overflow-hidden hover:border-white/10"
                    style={{
                      height: rowHeight,
                      background: 'linear-gradient(135deg, rgba(20, 22, 37, 0.45) 0%, rgba(10, 11, 18, 0.55) 100%)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      boxShadow: isActive 
                        ? `0 12px 30px rgba(0,0,0,0.45), 0 0 25px -10px ${stepColor}33, inset 0 1px 0 rgba(255,255,255,0.03)`
                        : 'inset 0 1px 0 rgba(255,255,255,0.03), 0 12px 30px rgba(0,0,0,0.3)',
                    }}
                    onClick={() => setSelectedRoom(room)}
                  >
                    {/* Room Label - Sticky LEFT column with Neo-Medical focus */}
                    <div 
                      className="flex-shrink-0 flex items-center gap-4 px-5 py-2.5 min-h-0 overflow-hidden transition-all duration-300 sticky left-0 z-20 group-hover:bg-white/[0.01]" 
                      style={{ 
                        width: ROOM_LABEL_WIDTH, 
                        minWidth: ROOM_LABEL_WIDTH, 
                        background: '#030611',
                        backdropFilter: 'blur(16px)',
                        borderRight: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '20px 0 40px -10px rgba(0,0,0,0.5)',
                      }}
                    >
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className={`w-2 h-2 rounded-full ring-4 ring-opacity-10 transition-all duration-1000 ${isActive ? 'animate-pulse' : 'opacity-[0.15]'}`} 
                            style={{ 
                              backgroundColor: isActive ? roomColor.bg : 'white',
                              boxShadow: isActive ? `0 0 12px ${roomColor.bg}` : 'none',
                              borderColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                            }} 
                          />
                          <h3 className="text-sm font-black tracking-tight text-white uppercase leading-none truncate group-hover:text-amber-400 transition-colors duration-500">
                            {room.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9.5px] font-bold text-white/40 uppercase tracking-[0.2em]">{room.department}</span>
                          {room.isSeptic && (
                            <div className="bg-rose-500/10 border border-rose-500/20 px-1 py-0.25 rounded-[3px]">
                              <span className="text-[7.5px] font-black text-rose-400 tracking-widest uppercase">septic</span>
                            </div>
                          )}
                          {room.isEnhancedHygiene && (
                            <div className="bg-cyan-500/10 border border-cyan-500/20 px-1 py-0.25 rounded-[3px]">
                              <span className="text-[7.5px] font-black text-cyan-400 tracking-widest uppercase">hygiene+</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Dynamic Active Staff Signature on room list */}
                        {isActive && room.currentProcedure?.name && (
                          <div className="flex items-center gap-1 text-white/30 truncate text-[9.5px] mt-0.5">
                            <span className="truncate">{room.currentProcedure.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Precision Status Indicators */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {room.patientCalledAt && !room.patientArrivedAt && (
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" title="Pacient byl volán" />
                        )}
                        {room.patientArrivedAt && (
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" title="Pacient je na sále" />
                        )}
                        {(() => {
                          const aroPosition = getAroPosition(room.id);
                          const overtimeInfo = getOvertimeInfo(room.id);
                          if (aroPosition && overtimeInfo) {
                            return (
                              <div className="flex items-center bg-lime-500/10 border border-lime-500/30 rounded-lg px-1.5 py-0.5 gap-1" title={`ARO ${aroPosition}`}>
                                <Activity className="w-2.5 h-2.5 text-lime-400" />
                                <span className="text-[9px] font-black text-lime-400">{aroPosition}</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>

                    {/* Timeline section - RIGHT side, scrollable with high-precision grid */}
                    <div className="relative flex-1 overflow-hidden h-full">
                      <div className="absolute inset-0 bg-white/[0.045]" />
                      
                      {/* Hour grid lines - ultra subtle precision markers */}
                      {TIME_MARKERS.slice(0, -1).map((hour, i) => (
                        <div 
                          key={i} 
                          className="absolute top-0 bottom-0 w-px" 
                          style={{ 
                            left: `${(i / TIMELINE_HOURS) * 100}%`,
                            background: 'rgba(255,255,255,0.06)',
                          }} 
                        />
                      ))}

                      {/* Completed operations - minimalist clinical bars */}
                      {(() => {
                        const opsToRender = room.completedOperations || [];
                        const filteredOps = opsToRender.filter(operation => {
                          const opStartDate = new Date(operation.startedAt);
                          const opEndDate = new Date(operation.endedAt);
                          return isOperationInWindow(opStartDate, opEndDate, currentTime);
                        });
                        
                        return filteredOps.map((operation, opIdx) => {
                          const opStartDate = new Date(operation.startedAt);
                          const opEndDate = new Date(operation.endedAt);
                          const position = getOperationPosition(opStartDate, opEndDate, currentTime);
                          if (position.width <= 0) return null;
                          
                          return (
                            <div
                              key={`completed-${opIdx}`}
                              className="absolute top-2 bottom-2 overflow-hidden rounded-[10px] transition-all duration-500 hover:scale-[1.01] group cursor-pointer"
                              style={{ 
                                left: `${position.left}%`, 
                                width: `${Math.max(0.5, position.width)}%`,
                                background: 'rgba(255,255,255,0.02)',
                                border: `1px solid rgba(255,255,255,0.05)`,
                                boxShadow: '0 4px 15px -3px rgba(0,0,0,0.3)',
                              }}
                              title="Dokončený výkon"
                            >
                              {/* Linear background stripes pattern */}
                              <div 
                                className="absolute inset-0 opacity-[0.04]" 
                                style={{ 
                                  backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 2px, transparent 0, transparent 8px)',
                                  backgroundSize: '12px 12px'
                                }} 
                              />
                              
                              <div className="absolute inset-0 flex overflow-hidden opacity-30 grayscale-[0.6]">
                                {operation.statusHistory?.map((entry, idx) => {
                                  const opStart = new Date(operation.startedAt).getTime();
                                  const opEnd = operation.endedAt ? new Date(operation.endedAt).getTime() : opStart;
                                  const opDuration = Math.max(1, opEnd - opStart);
                                  const segStart = new Date(entry.startedAt).getTime();
                                  const nextEntry = operation.statusHistory?.[idx + 1];
                                  const segEnd = nextEntry ? new Date(nextEntry.startedAt).getTime() : opEnd;
                                  const segWidthPct = ((segEnd - segStart) / opDuration) * 100;
                                  const segLeftPct = ((segStart - opStart) / opDuration) * 100;
                                  const phaseColor = STEP_INDEX_COLORS[entry.stepIndex] || '#6b7280';
                                  
                                  return (
                                    <div 
                                      key={idx} 
                                      className="absolute top-0 bottom-0"
                                      style={{ 
                                        left: `${segLeftPct}%`, 
                                        width: `${segWidthPct}%`, 
                                        background: phaseColor,
                                        opacity: 0.4
                                      }} 
                                    />
                                  );
                                })}
                              </div>

                              {/* Highlight completion border on top */}
                              <div className="absolute top-0 inset-x-0 h-[2px] bg-emerald-500/40 opacity-40 group-hover:opacity-100 transition-opacity" />
                            </div>
                          );
                        });
                      })()}

                      {/* Continuing operation bar (green) - refined medical look */}
                      {isActive && room.operationStartedAt && room.estimatedEndTime && (() => {
                        const opStart = new Date(room.operationStartedAt);
                        const opEnd   = new Date(room.estimatedEndTime);
                        const windowStart = new Date(currentTime);
                        windowStart.setHours(TIMELINE_START_HOUR, 0, 0, 0);
                        if (opStart >= windowStart) return null;

                        const endPct = getTimePercentForTimeline(opEnd, windowStart);
                        const displayWidthPct = Math.max(2, Math.min(endPct, 100));

                        return (
                          <div
                            className="absolute top-1.5 bottom-1.5 rounded-r-[12px] flex items-center justify-between px-4 group"
                            style={{
                              left: '0%',
                              width: `${displayWidthPct}%`,
                              background: `linear-gradient(90deg, ${C.green}30 0%, ${C.green}15 100%)`,
                              borderRight: `3px solid ${C.green}`,
                              boxShadow: `0 10px 25px -5px ${C.green}20, inset 0 1px 1px rgba(255,255,255,0.1)`,
                              zIndex: 1,
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-white/90 uppercase tracking-[0.2em] leading-none mb-1">POKRAČUJÍCÍ</span>
                              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest leading-none">OVERNIGHT CASE</span>
                            </div>
                            <span className="text-sm font-mono font-black text-white/80 tabular-nums">
                              {opEnd.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Active operation bar — Neo-Medical High Precision Redesign */}
                      {isActive && shouldShowBar && boxWidthPct > 0 && (
                        <div
                          className="absolute top-1.5 bottom-1.5 overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:brightness-110"
                          style={{ 
                            left: `${Math.max(0, boxLeftPct)}%`, 
                            width: `${boxWidthPct}%`,
                            borderRadius: '16px',
                            boxShadow: `0 12px 30px -8px rgba(0,0,0,0.5), 0 0 15px -4px ${stepColor}44, inset 0 1px 1px rgba(255,255,255,0.15)`,
                            border: `1px solid ${stepColor}55`,
                            background: `linear-gradient(135deg, rgba(8,12,24,0.88) 0%, rgba(13,20,38,0.75) 100%)`,
                            backdropFilter: 'blur(16px)',
                          }}
                        >
                          {/* Animated heartbeat wave inside background */}
                          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-400 via-transparent to-transparent" />
                          
                          {/* Left high-tech color accents */}
                          <div className="absolute top-0 bottom-0 left-0 w-1.5" style={{ backgroundColor: stepColor }} />

                          {/* Multi-segment technical segments */}
                          <div className="absolute inset-x-1.5 top-0 bottom-0 flex overflow-hidden">
                            {(() => {
                              const history = room.statusHistory || [];
                              const operationStart = room.operationStartedAt ? new Date(room.operationStartedAt).getTime() : Date.now();
                              const estimatedEndTime = room.estimatedEndTime ? new Date(room.estimatedEndTime).getTime() : operationStart + 60*60*1000;
                              const now = Date.now();
                              const effectiveEndTime = Math.max(estimatedEndTime, now);
                              const totalDuration = Math.max(1, effectiveEndTime - operationStart);

                              return history.map((entry, idx) => {
                                const segStart = new Date(entry.startedAt).getTime();
                                const nextEntry = history[idx + 1];
                                const isCurrentSeg = idx === history.length - 1;
                                const segEnd = nextEntry ? new Date(nextEntry.startedAt).getTime() : effectiveEndTime;
                                const segWidthPct = ((segEnd - segStart) / totalDuration) * 100;
                                const segLeftPct = ((segStart - operationStart) / totalDuration) * 100;
                                const phaseColor = STEP_INDEX_COLORS[entry.stepIndex] || '#6b7280';
                                
                                const progressWithinSeg = isCurrentSeg ? Math.max(0, Math.min(100, ((now - segStart) / (segEnd - segStart)) * 100)) : 100;

                                return (
                                  <div
                                    key={idx}
                                    className="absolute top-0 bottom-0 overflow-hidden"
                                    style={{
                                      left: `${segLeftPct}%`,
                                      width: `${segWidthPct}%`,
                                      background: isCurrentSeg ? `${phaseColor}20` : `${phaseColor}45`,
                                      borderRight: '1px solid rgba(0,0,0,0.4)',
                                    }}
                                  >
                                    {isCurrentSeg && (
                                      <motion.div 
                                        className="absolute top-0 bottom-0 left-0"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressWithinSeg}%` }}
                                        style={{
                                          background: `linear-gradient(90deg, ${phaseColor}bf 0%, ${phaseColor}cc 100%)`,
                                          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 0 15px ${phaseColor}40`,
                                        }}
                                      />
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>

                          {/* Top Highlight border */}
                          <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />

                          {/* Technical Grid/Corner Marks */}
                          <div className="absolute top-1 right-2 w-1.5 h-1.5 border-t border-r border-white/20" />
                          <div className="absolute bottom-1.5 right-2 w-1.5 h-1.5 border-b border-r border-white/20" />

                          {/* Content Overlay */}
                          <div className="absolute inset-0 flex items-center justify-between pointer-events-none px-6 py-2">
                            {/* Left part: Procedure & Patient Information */}
                            <div className="flex flex-col justify-center min-w-0 flex-1 pr-4">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white text-[12px] font-bold leading-tight truncate tracking-wide filter drop-shadow-md">
                                  {room.currentProcedure?.name || 'VÝKON V PROCESU'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                {room.currentPatient ? (
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-white/40 shrink-0" />
                                    <span className="text-[10px] text-white/50 font-bold truncate tracking-tight">
                                      ID: {room.currentPatient.id} ({room.currentPatient.age || 'N/A'} let{room.currentPatient.bloodType ? `, ${room.currentPatient.bloodType}` : ''})
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            {/* Center/Right alignment: Phase Badge with pulsing state, Doctor, and micro stats */}
                            <div className="flex items-center gap-5 shrink-0">
                              {/* Workflow Phase Badge */}
                              <div className="flex flex-col items-end gap-1">
                                <div 
                                  className="px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 backdrop-blur-md shrink-0"
                                  style={{ 
                                    backgroundColor: `${stepColor}20`, 
                                    borderColor: `${stepColor}55`,
                                    color: stepColor,
                                    boxShadow: `0 0 10px ${stepColor}15`
                                  }}
                                >
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: stepColor }} />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: stepColor }} />
                                  </span>
                                  {stepName}
                                </div>
                              </div>

                              {/* Time Details - tabular font */}
                              <div className="flex flex-col items-end border-l border-white/5 pl-4 justify-center">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-xs font-mono font-bold text-white/95 leading-none tracking-tight">
                                    {startDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <span className="text-[9px] text-white/30 font-medium">příj.</span>
                                </div>
                                {room.estimatedEndTime && (
                                  <div className="flex items-baseline gap-1 mt-0.5" title="Odhad konce">
                                    <span className="text-xs font-mono font-black text-amber-400 leading-none tracking-tight">
                                      {new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-[9px] text-amber-500/50 font-bold">odh.</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Glowing interactive mouse flare backplate */}
                          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          
                          {/* Elegant linear progress indicator at the very bottom */}
                          {isActive && (
                            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/5">
                              <motion.div 
                                className="h-full" 
                                style={{ 
                                  width: `${progressPct}%`, 
                                  backgroundColor: stepColor,
                                  boxShadow: `0 -1px 8px ${stepColor}`
                                }}
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPct}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Free room indicator - LoginPage glass style */}
                      {isFree && (
                        <div 
                          className="absolute inset-y-1.5 left-2 right-2 rounded-[16px] flex items-center justify-between px-6 overflow-hidden transition-all duration-300 hover:bg-slate-500/[0.02] border border-dashed border-white/[0.04]"
                          style={{ 
                            background: 'rgba(255,255,255,0.005)',
                          }}
                        >
                          <div className="flex items-center gap-2 opacity-[0.12] transition-opacity duration-300 group-hover:opacity-[0.25]">
                            <BedDouble className="w-4 h-4 text-white" />
                            <span className="text-[10px] font-mono uppercase tracking-[0.25em] font-black">SÁL K DISPOZICI</span>
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-[0.08] transition-opacity duration-300 group-hover:opacity-[0.15]">
                            <span className="text-[8px] font-mono tracking-widest uppercase">STANDBY READY</span>
                          </div>
                        </div>
                      )}

                      {/* Room-specific end of working hours indicator */}
                      {(() => {
                        const schedule = room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
                        const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
                        const todayKey = dayKeys[currentTime.getDay()];
                        const todaySchedule = schedule[todayKey];
                        if (!todaySchedule.enabled) return null;
                        let minutesFromTimelineStart = (todaySchedule.endHour * 60 + todaySchedule.endMinute) - (TIMELINE_START_HOUR * 60);
                        if (minutesFromTimelineStart < 0) minutesFromTimelineStart += 24 * 60;
                        const endPercent = (minutesFromTimelineStart / (TIMELINE_HOURS * 60)) * 100;
                        return (
                          <div 
                            className="absolute top-0 bottom-0 w-0.5 z-20"
                            style={{ 
                              left: `${endPercent}%`,
                              background: 'linear-gradient(180deg, transparent 0%, #F97316 20%, #F97316 80%, transparent 100%)'
                            }}
                          >
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-black whitespace-nowrap bg-orange-500/20 border border-orange-500/40 text-orange-400">
                              {todaySchedule.endHour.toString().padStart(2, '0')}:{todaySchedule.endMinute.toString().padStart(2, '0')}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</div>
);
}

// Memoized export — TimelineModule je drahý (1500+ řádků s framer-motion animacemi
// a iterací nad rooms × hours). Default shallow compare zajistí, že když App.tsx
// re-renderuje z nesouvisejícího důvodu (otevření modalu, změna current view),
// TimelineModule re-render přeskočí. Re-renderne se jen když se reálně změní `rooms`.
const TimelineModule = React.memo(TimelineModuleImpl);
export default TimelineModule;

// Helper Component - Stat Box
interface StatBoxProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  color: string;
  glow?: boolean;
  progress?: number;
}

const StatBox: React.FC<StatBoxProps> = ({ icon: Icon, label, value, color, glow, progress }) => {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const validProgress = progress !== undefined ? Math.max(0, Math.min(100, progress)) : 0;
  const strokeDashoffset = circumference - (validProgress / 100) * circumference;

  return (
    <div
      className={`relative flex-shrink-0 h-[68px] rounded-[22px] px-5 py-3 overflow-hidden backdrop-blur-3xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl flex flex-col justify-center group ${
        glow ? 'shadow-lg shadow-black/40' : ''
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(23, 24, 38, 0.7) 0%, rgba(14, 15, 23, 0.8) 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: glow 
          ? `0 15px 35px -10px ${color}1a, 0 0 20px -5px ${color}22, inset 0 1px 0 rgba(255,255,255,0.03)` 
          : 'inset 0 1px 0 rgba(255,255,255,0.03), 0 10px 30px rgba(0,0,0,0.3)',
      }}
    >
      {/* Top micro light line */}
      <div 
        className="absolute top-0 inset-x-5 h-px opacity-30 group-hover:opacity-70 transition-opacity duration-500"
        style={{ background: `linear-gradient(90deg, transparent, ${color}55, transparent)` }}
      />
      
      {/* Glow aura */}
      <div 
        className="absolute -bottom-10 -right-10 w-20 h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-15 transition-opacity duration-500"
        style={{ background: color }}
      />

      <div className="relative flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500"
            style={{ 
              background: `linear-gradient(135deg, ${color}1a 0%, ${color}08 100%)`, 
              border: `1px solid ${color}25`,
            }}
          >
            <Icon className="w-4.5 h-4.5 group-hover:rotate-6 transition-transform" style={{ color: color }} />
          </div>
          <div className="flex flex-col">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/35 leading-none mb-1 text-left">{label}</p>
            <h4 className="text-[15px] font-black text-white/90 leading-none tracking-tight">{value}</h4>
          </div>
        </div>

        {/* Circular gauge progress / micro-chart element like bills card (Image 2) */}
        {progress !== undefined && (
          <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="18"
                cy="18"
                r={radius}
                className="stroke-white/[0.04]"
                strokeWidth="2.5"
                fill="transparent"
              />
              {/* Foreground circle */}
              <circle
                cx="18"
                cy="18"
                r={radius}
                stroke={color}
                strokeWidth="2.5"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{
                  filter: `drop-shadow(0 0 2px ${color}55)`,
                }}
              />
            </svg>
            <span className="absolute text-[8px] font-mono font-black text-white/70">
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Component - Room Detail Popup (Design matching screenshot)
interface RoomDetailPopupProps {
  room: OperatingRoom;
  onClose: () => void;
  currentTime: Date;
}

const RoomDetailPopup: React.FC<RoomDetailPopupProps> = ({ room, onClose, currentTime }) => {
  // Get workflow statuses from database context - already filtered and sorted
  const { workflowStatuses } = useWorkflowStatusesContext();
  
  // workflowStatuses is already filtered (active, non-special) and sorted by context
  const activeStatuses = workflowStatuses;
  
  // Lookup mapa pro správné mapování podle order_index
  const statusByOrderIndex = useMemo(() => {
    const map: Record<number, typeof activeStatuses[number]> = {};
    activeStatuses.forEach((s) => {
      map[s.order_index] = s;
    });
    return map;
  }, [activeStatuses]);
  
  const totalSteps = activeStatuses.length > 0 ? activeStatuses.length : 1;
  const stepIndex = room.currentStepIndex;
  const nextStepIndex = stepIndex + 1;
  
  // Použít lookup mapu pro správné mapování barvy a statusu.
  const safeIdx = Math.max(0, Math.min(stepIndex, activeStatuses.length - 1));
  const safeNextIdx = Math.max(0, Math.min(nextStepIndex, activeStatuses.length - 1));
  const currentStatus = activeStatuses[safeIdx] || statusByOrderIndex[stepIndex] || null;
  const nextStatus = activeStatuses[safeNextIdx] || statusByOrderIndex[nextStepIndex] || null;
  
  const stepColor = currentStatus?.accent_color || currentStatus?.color || '#6B7280';
  const progressPercent = totalSteps > 1 ? Math.round((stepIndex / (totalSteps - 1)) * 100) : 0;

  // Calculate elapsed time from phaseStartedAt
  const getElapsedTime = (): string => {
    if (!room.phaseStartedAt) return '--:--';
    const phaseStartTime = new Date(room.phaseStartedAt);
    const elapsedMs = currentTime.getTime() - phaseStartTime.getTime();
    if (elapsedMs < 0) return '--:--';
    
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours === 0) {
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  };

  // Get initials for profile avatars
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return '??';
    const parts = name.replace(/MUDr\.|Ph\.D\.|Bc\.|Mgr\./gi, '').trim().split(' ');
    const cleanParts = parts.filter(p => p.length > 0);
    if (cleanParts.length === 0) return '??';
    if (cleanParts.length === 1) return cleanParts[0].substring(0, 2).toUpperCase();
    return (cleanParts[0][0] + cleanParts[1][0]).toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 25 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="rounded-[32px] overflow-hidden max-w-4xl w-full relative flex flex-col max-h-[90vh]"
        style={{
          background: 'linear-gradient(165deg, rgba(10,18,34,0.97) 0%, rgba(4,7,14,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 50px 100px -20px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Ambient glow top */}
        <div 
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full pointer-events-none opacity-20"
          style={{ background: `radial-gradient(circle, ${stepColor} 0%, transparent 70%)`, filter: 'blur(70px)' }}
        />
        {/* Top interactive sensor strip decoration */}
        <div 
          className="absolute top-0 left-0 right-0 h-[3px] pointer-events-none transition-colors duration-1000"
          style={{ backgroundColor: stepColor }}
        />

        {/* Header containing name & closing controls */}
        <div className="px-8 py-6 flex items-center justify-between border-b border-white/[0.06] relative z-10">
          <div className="flex items-center gap-5">
            {/* Visual Arc circle */}
            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
              <svg className="w-14 h-14 -rotate-90">
                <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
                <motion.circle 
                  cx="28" cy="28" r="24" fill="none" stroke={stepColor} strokeWidth="3.5"
                  strokeDasharray="150"
                  initial={{ strokeDashoffset: 150 }}
                  animate={{ strokeDashoffset: 150 - (progressPercent / 100) * 150 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-xs font-mono font-black text-white/90">{progressPercent}%</span>
            </div>
            
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-black text-white tracking-tight">{room.name}</h2>
                <div 
                  className="px-3 py-1 rounded-full border text-[10px] uppercase font-black tracking-widest flex items-center gap-1.5"
                  style={{ backgroundColor: `${stepColor}15`, borderColor: `${stepColor}35`, color: stepColor }}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: stepColor }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: stepColor }} />
                  </span>
                  {currentStatus?.name || 'V provozu'}
                </div>
              </div>
              <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.2em] mt-1.5">
                {room.department} · Krok {stepIndex + 1} z {totalSteps}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] transition-all duration-200 active:scale-95 text-white/40 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Container Content */}
        <div className="px-8 py-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)] hide-scrollbar relative z-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. SECTION: PERFORMANCE & PATIENT DETAILS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-white/30" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">VÝKON A PACIENT</h3>
              </div>

              <div className="rounded-2xl p-5 bg-white/[0.02] border border-white/[0.06] space-y-4 shadow-xl">
                {/* Active Procedure details */}
                <div className="pb-4 border-b border-white/[0.05]">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold mb-1">PLÁNOVANÝ VÝKON</p>
                  <p className="text-base font-black text-amber-400 tracking-tight">
                    {room.currentProcedure?.name || 'NENÍ PLÁNOVÁN ŽÁDNÝ VÝKON'}
                  </p>
                </div>

                {/* Patient particulars */}
                {room.currentPatient ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold mb-1">REGISTRAČNÍ ID</p>
                      <p className="text-xs font-mono font-bold text-white/80">{room.currentPatient.id}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold mb-1">VĚK PACIENTA</p>
                      <p className="text-xs font-bold text-white/80">{room.currentPatient.age} let</p>
                    </div>
                    {room.currentPatient.bloodType && (
                      <div className="col-span-2">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold mb-1">KREVNÍ SKUPINA</p>
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-xs font-bold">
                          {room.currentPatient.bloodType}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 py-2 text-white/35">
                    <User className="w-4 h-4" />
                    <p className="text-xs">Informace o pacientovi nejsou zavedeny.</p>
                  </div>
                )}

                {/* Environmental Badges */}
                <div className="flex items-center gap-2 flex-wrap pt-2">
                  {room.isSeptic && (
                    <span className="px-3 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-wider">
                      ☢️ SEPTICKÝ VÝKON
                    </span>
                  )}
                  {room.isEnhancedHygiene && (
                    <span className="px-3 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px] font-black uppercase tracking-wider">
                      ✨ ZVÝŠENÁ HYGIENA+
                    </span>
                  )}
                  {!room.isSeptic && !room.isEnhancedHygiene && (
                    <span className="px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/40 text-[9px] font-bold uppercase tracking-widest">
                      Standardní režim sálu
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. SECTION: SURGICAL TEAM */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-white/30" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">OPERAČNÍ TÝM</h3>
              </div>

              <div className="rounded-2xl p-4 bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.05] shadow-xl">
                {/* Doctor */}
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center font-bold text-orange-400 text-xs shrink-0">
                      {getInitials(room.staff.doctor.name)}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white/90 leading-none">{room.staff.doctor.name || "Lékař nepřiřazen"}</h4>
                      <p className="text-[9px] uppercase tracking-widest text-white/35 font-bold mt-1">OPERATÉR</p>
                    </div>
                  </div>
                  {room.staff.doctor.skill_level && (
                    <span className="px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[9px] font-mono font-black shadow-inner">
                      {room.staff.doctor.skill_level}
                    </span>
                  )}
                </div>

                {/* Anesthesiologist */}
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-bold text-purple-400 text-xs shrink-0">
                      {getInitials(room.staff.anesthesiologist?.name)}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white/90 leading-none">{room.staff.anesthesiologist?.name || "Anesteziolog nepřiřazen"}</h4>
                      <p className="text-[9px] uppercase tracking-widest text-white/35 font-bold mt-1">ANESTEZIOLOG</p>
                    </div>
                  </div>
                  {room.staff.anesthesiologist?.skill_level && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-mono font-black shadow-inner">
                      {room.staff.anesthesiologist.skill_level}
                    </span>
                  )}
                </div>

                {/* Nurse */}
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-bold text-cyan-400 text-xs shrink-0">
                      {getInitials(room.staff.nurse.name)}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white/90 leading-none">{room.staff.nurse.name || "Instrumentářka nepřiřazená"}</h4>
                      <p className="text-[9px] uppercase tracking-widest text-white/35 font-bold mt-1">INSTRUMENTACE / SESTRA</p>
                    </div>
                  </div>
                  {room.staff.nurse.skill_level && (
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-mono font-black shadow-inner">
                      {room.staff.nurse.skill_level}
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* 3. SECTION: DYNAMIC STEP TRANSITION WIDGET */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white/30" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">FÁZE OPERAČNÍHO CYKLU</h3>
            </div>

            <div className="flex flex-col md:flex-row items-stretch gap-4">
              {/* CURRENT STEP CARD */}
              <div 
                className="flex-1 rounded-[20px] p-5 border relative overflow-hidden flex flex-col justify-between"
                style={{ 
                  backgroundColor: `${stepColor}0c`,
                  borderColor: `${stepColor}35`
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/45">PRÁVĚ PROBÍHÁ</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black" style={{ backgroundColor: `${stepColor}1a`, color: stepColor }}>
                      KROK {stepIndex + 1} Z {totalSteps}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg" style={{ backgroundColor: `${stepColor}15`, border: `1px solid ${stepColor}30` }}>
                      <Activity className="w-5 h-5" style={{ color: stepColor }} />
                    </div>
                    <div>
                      <p className="text-base font-black text-white leading-tight">{currentStatus?.name || 'Status'}</p>
                      <div className="flex items-center gap-1.5 text-white/40 text-[11px] mt-1">
                        <Clock className="w-3.5 h-3.5 text-white/20" />
                        <span>Trvání fáze:</span>
                        <span className="font-mono font-bold text-white/60">{getElapsedTime()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action timing log details */}
                <div className="mt-4 pt-3.5 border-t border-white/[0.04] grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-[0.15em] text-white/25">Spuštěno</span>
                    <p className="text-xs font-mono font-bold text-white/50 mt-0.5">
                      {room.phaseStartedAt ? new Date(room.phaseStartedAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-[0.15em] text-white/25">Začátek pr.</span>
                    <p className="text-xs font-mono font-bold text-white/50 mt-0.5">
                      {room.operationStartedAt ? new Date(room.operationStartedAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </p>
                  </div>
                </div>
              </div>

              {/* TRANSITION CONNECTOR */}
              <div className="hidden md:flex flex-col items-center justify-center shrink-0 px-2">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center border shadow-xl"
                  style={{ backgroundColor: `${stepColor}15`, borderColor: `${stepColor}30` }}
                >
                  <ChevronRight className="w-5 h-5" style={{ color: stepColor }} />
                </div>
              </div>

              {/* NEXT STEP CARD */}
              <div 
                className="flex-1 rounded-[20px] p-5 bg-white/[0.01] border border-white/[0.06] relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">NÁSLEDUJÍCÍ FÁZE</span>
                    {nextStepIndex < totalSteps && (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-white/[0.03] border border-white/[0.05] text-white/40">
                        KROK {nextStepIndex + 1} Z {totalSteps}
                      </span>
                    )}
                  </div>

                  {nextStatus ? (
                    <div className="flex items-center gap-4 mt-2">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-white/35" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-white/70 leading-tight">{nextStatus.name}</p>
                        <p className="text-[10px] uppercase tracking-widest text-white/30 mt-1">ČEKÁ NA AKTIVACI</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 mt-2">
                      <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5 text-teal-400" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-teal-400 leading-tight">Ukončení cyklu</p>
                        <p className="text-[10px] uppercase tracking-widest text-teal-400/40 mt-1">Poslední fáze dokončena</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Empty details aligner */}
                <div className="mt-4 pt-3.5 border-t border-white/[0.04] flex items-center text-white/20 text-[10px]">
                  <span>Příprava personálu k přechodu</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. SECTION: TIMELINE STEPPER CHIPS ROAD */}
          <div className="space-y-3.5">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/35">PŘEHLED KROKŮ WORKFLOW</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 relative">
              {activeStatuses.map((status, idx) => {
                const isCurrent = idx === stepIndex;
                const isPast = idx < stepIndex;
                const statusColor = STEP_INDEX_COLORS[idx] || status.color || '#60a5fa';
                
                return (
                  <div
                    key={idx}
                    className="rounded-xl p-2.5 flex flex-col justify-between h-20 border transition-all duration-300 relative overflow-hidden"
                    style={{
                      backgroundColor: isCurrent ? `${statusColor}1c` : isPast ? `${statusColor}08` : 'rgba(255,255,255,0.01)',
                      borderColor: isCurrent ? statusColor : isPast ? `${statusColor}35` : 'rgba(255,255,255,0.04)',
                      boxShadow: isCurrent ? `0 0 15px -4px ${statusColor}40` : 'none',
                    }}
                    title={status.name}
                  >
                    {/* Glowing progress underline inside item */}
                    {isCurrent && (
                      <div className="absolute top-0 left-0 right-0 h-[2.5px]" style={{ backgroundColor: statusColor }} />
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-white/30">{(idx + 1).toString().padStart(2, '0')}</span>
                      <span 
                        className="w-2 h-2 rounded-full"
                        style={{ 
                          backgroundColor: isCurrent ? statusColor : isPast ? `${statusColor}70` : 'rgba(255,255,255,0.08)',
                          boxShadow: isCurrent ? `0 0 8px ${statusColor}` : 'none'
                        }}
                      />
                    </div>
                    <p className="text-[9.5px] font-bold tracking-tight text-white/70 leading-tight truncate-two-lines text-left mt-2" style={{ color: isCurrent ? '#FFF' : isPast ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)' }}>
                      {status.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. SECTION: TIMINGS COUNTERS & PROGRESS METRICS */}
          <div className="pt-2">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/35 block mb-3 leading-none">ČASOVÉ PLÁNOVÁNÍ (ESTIMATIONS)</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="rounded-xl p-4 bg-white/[0.01] border border-white/[0.05] flex flex-col justify-center">
                <span className="text-[9px] uppercase tracking-[0.15em] text-white/30 font-black mb-1">ODHADOVANÝ KONEC VÝKONU</span>
                <p className="text-xl font-mono font-black text-amber-500">
                  {room.estimatedEndTime ? new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </p>
              </div>

              <div className="rounded-xl p-4 bg-white/[0.01] border border-white/[0.05] flex flex-col justify-center relative overflow-hidden">
                <div className="flex items-center justify-between pointer-events-none z-10">
                  <div>
                    <span className="text-[9px] uppercase tracking-[0.15em] text-white/30 font-black mb-1 block leading-none">CELKOVÝ PRŮBĚH CYKLU</span>
                    <span className="text-xl font-mono font-black text-white/80">{progressPercent}%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-white/30 uppercase tracking-widest font-bold">KROK</span>
                    <p className="text-xs font-mono font-bold text-white/60">{stepIndex + 1} / {totalSteps}</p>
                  </div>
                </div>
                {/* Micro mini progress line inside */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/[0.02]">
                  <div className="h-full transition-all duration-500" style={{ width: `${progressPercent}%`, backgroundColor: stepColor }} />
                </div>
              </div>

            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
};

