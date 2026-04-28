import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, WeeklySchedule, DEFAULT_WEEKLY_SCHEDULE } from '../types';
import { STEP_DURATIONS, STEP_COLORS } from '../constants';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import MobileTimelineView from './mobile/MobileTimelineView';
import { 
  Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe, 
  Settings, User, Sparkles, Info, ChevronRight, Loader2, Pause, Phone, BedDouble, AlertCircle
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
const ROW_GAP_PX = 4;      // gap-1 mezi řádky (Tailwind: 0.25rem) — musí korespondovat s `gap-1` v JSX
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

  // NCEPOD urgency theme — synchronizováno s RoomCard / RoomDetail / AcuteCaseModal.
  // Tintuje řádek sálu na timeline po registraci akutního výkonu.
  const URGENCY_THEME: Record<'immediate' | 'urgent' | 'expedited' | 'elective', {
    label: string;
    color: string;        // hlavní barva
    bgSoft: string;       // jemné pozadí (např. řádek)
    border: string;       // border tone
  }> = {
    immediate: { label: 'EMERGENTNÍ',  color: '#ef4444', bgSoft: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.35)' },
    urgent:    { label: 'URGENTNÍ',    color: '#f97316', bgSoft: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.35)' },
    expedited: { label: 'ODLOŽITELNÝ', color: '#eab308', bgSoft: 'rgba(234,179,8,0.07)',  border: 'rgba(234,179,8,0.30)' },
    elective:  { label: 'ELEKTIVNÍ',   color: '#3b82f6', bgSoft: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.30)' },
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
  // Mobilní přepínač: list = karty se statusem a progressem; axis = horizontální 24h osa
  const [mobileView, setMobileView] = useState<'list' | 'axis'>('list');
  const [rowHeight, setRowHeight] = useState<number>(MAX_ROW_HEIGHT);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const rowsContainerRef = useRef<HTMLDivElement>(null);



  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Calculate responsive row height — všechny sály se MUS�� vejít bez scrollování.
  // Předtím výpočet ignoroval `gap` mezi řádky (8px × N-1) → součet všech řádků
  // přesáhl výšku kontejneru a vznikal scroll. Nyní gap odečteme PŘED dělením.
  useEffect(() => {
    const calculateRowHeight = () => {
      if (rowsContainerRef.current && rooms.length > 0) {
        const containerHeight = rowsContainerRef.current.clientHeight;
        const totalGapPx = (rooms.length - 1) * ROW_GAP_PX;
        const availableHeight = Math.max(0, containerHeight - totalGapPx);
        // Math.floor → zaokrouhli dolů, aby ani 1px subpixel rounding nezpůsobil overflow
        const calculatedHeight = Math.floor(availableHeight / rooms.length);
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
  }, [rooms.length]);

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

  /* --- Rooms in original order - emergency/locked stay on their position --- */
  const sortedRooms = useMemo(() => {
    return [...rooms];
  }, [rooms]);

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
    <div className="w-full h-full text-white overflow-hidden flex flex-col relative">

      {/* Room Detail Popup */}
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPopup room={selectedRoom} onClose={() => setSelectedRoom(null)} currentTime={currentTime} />
        )}
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
        className="sticky top-0 z-40 backdrop-blur-xl flex-shrink-0"
        style={{ 
          background: 'linear-gradient(180deg, rgba(5,13,24,0.95) 0%, rgba(5,13,24,0.85) 100%)',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {/* Top highlight line (LoginPage style) */}
        <div 
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent 0%, ${C.accent}20 50%, transparent 100%)` }}
        />
        <div className="px-8 md:pl-32 md:pr-10 py-6">


          {/* Stats Boxes Row */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 hide-scrollbar">
            <StatBox 
              icon={Activity} 
              label="Aktivní" 
              value={`${stats.operations} operací`} 
              color="#22C55E" 
            />
            <StatBox 
              icon={Loader2} 
              label="Úklid" 
              value={`${stats.cleaning} sálů`} 
              color="#F97316" 
            />
            <StatBox 
              icon={Stethoscope} 
              label="Volné" 
              value={`${stats.free} sálů`} 
              color="#22D3EE" 
            />
            <StatBox 
              icon={Shield} 
              label="Dokončeno" 
              value={`${stats.completed} dnes`} 
              color="#22D3EE" 
            />

            {stats.emergencyCount > 0 && (
              <StatBox 
                icon={AlertTriangle} 
                label="Emergency" 
                value={`${stats.emergencyCount} sálů`} 
                color="#EF4444" 
                glow 
              />
            )}

            {/* ARO Overtime indicator - LoginPage glassmorph with red accent */}
            {aroOvertimeRooms.length > 0 && (
              <motion.div
                className="relative flex-shrink-0 h-14 rounded-2xl px-4 py-2.5 overflow-hidden backdrop-blur-md transition-all duration-300 hover:scale-105"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  background: `${C.red}15`,
                  border: `2px solid ${C.red}40`,
                  boxShadow: `0 0 24px ${C.red}25, inset 0 1px 0 rgba(255,255,255,0.05), 0 0 16px ${C.red}15`,
                }}
              >
                {/* Animated gradient border effect */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${C.red}20, transparent)`,
                    animation: 'shimmer 2s infinite',
                  }}
                />
                {/* Top highlight line with accent */}
                <div 
                  className="absolute top-0 left-4 right-4 h-px opacity-60"
                  style={{ background: `linear-gradient(90deg, transparent, ${C.red}80, transparent)` }}
                />
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    background: `radial-gradient(ellipse at 50% 0%, ${C.red}30 0%, transparent 70%)`,
                  }}
                />
                <div className="relative flex items-center gap-3 h-full">
                  <motion.div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      background: `${C.red}25`,
                      border: `1.5px solid ${C.red}50`,
                    }}
                  >
                    <AlertTriangle className="w-4 h-4" style={{ color: C.red }} />
                  </motion.div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.3em] font-semibold" style={{ color: `${C.red}a0` }}>ARO PŘESAH</p>
                    <p className="text-sm font-bold leading-tight" style={{ color: C.red }}>{aroOvertimeRooms.length} sálů</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Spacer */}
            <div className="flex-1 min-w-4" />

            {/* Date Box */}
            <StatBox 
              icon={CalendarDays} 
              label="Datum" 
              value={formatDate(currentTime)} 
              color="#6366F1" 
            />

            {/* Time Box - LoginPage glassmorph style */}
            <div
              className="relative flex-shrink-0 h-14 rounded-2xl px-4 py-2.5 overflow-hidden backdrop-blur-md transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: C.glass,
                border: `1px solid ${C.border}`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              {/* Top highlight line */}
              <div 
                className="absolute top-0 left-4 right-4 h-px opacity-30"
                style={{ background: `linear-gradient(90deg, transparent, ${C.accent}60, transparent)` }}
              />
              <div className="relative flex items-center gap-3 h-full">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: `${C.accent}15`,
                    border: `1px solid ${C.accent}25`,
                  }}
                >
                  <Clock className="w-4 h-4" style={{ color: C.accent }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-white/40 uppercase tracking-[0.3em] font-semibold">Čas</p>
                  <p className="text-sm font-bold leading-tight tabular-nums" style={{ color: C.accent }}>
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
        </div>
      </div>

      {/* ======== Main Timeline ======== */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 overflow-hidden px-8 md:pl-32 md:pr-10">
        
        {/* Time Axis Header - Fixed, LoginPage glassmorph */}
        <div 
          className="flex flex-shrink-0 rounded-t-2xl backdrop-blur-md" 
          style={{ 
            background: C.glass, 
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          {/* Room label header - fixed */}
          <div 
            className="flex-shrink-0 flex items-center px-4 gap-2" 
            style={{ 
              width: ROOM_LABEL_WIDTH, 
              minWidth: ROOM_LABEL_WIDTH, 
              borderRight: `1px solid ${C.border}`,
            }}
          >
            <div 
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: `${C.accent}15`, border: `1px solid ${C.accent}25` }}
            >
              <Activity className="w-3.5 h-3.5" style={{ color: C.accent }} />
            </div>
            <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-white/40">OPERAČNÍ SÁLY</span>
          </div>
          
          {/* Time markers - no scroll, full width for 24h */}
          <div className="flex-1 overflow-hidden" ref={timelineRef}>
            <div className="flex items-center h-12 relative w-full">
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
                          ? 'linear-gradient(to bottom, rgba(255,255,255,0.02), rgba(255,255,255,0.04), rgba(255,255,255,0.02))'
                          : 'linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
                      }} 
                    />
                    {!isLast && (
                      isCurrentHour ? (
                        <div 
                          className="ml-2 px-2.5 py-1 rounded-lg"
                          style={{ 
                            background: C.accent, 
                            boxShadow: `0 2px 8px ${C.accent}40` 
                          }}
                        >
                          <span className="text-[10px] font-mono font-bold text-slate-900 tracking-wide">
                            {`${currentHour < 10 ? '0' : ''}${currentHour}:${currentMin < 10 ? '0' : ''}${currentMin}`}
                          </span>
                        </div>
                      ) : (
                        <div className="ml-2 flex items-center gap-1">
                          <span className={`text-[11px] font-mono font-semibold ${isNightHour ? 'text-white/20' : 'text-white/40'}`}>
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

        {/* Room Rows - Responsive height, no scroll */}
        <div className="flex-1 min-h-0 overflow-hidden" ref={rowsContainerRef}>
          <div className="relative w-full h-full" ref={scrollContainerRef}>
            {/* Now indicator - LoginPage accent yellow */}
            <AnimatePresence>
              {nowPercent >= 0 && nowPercent <= 100 && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="absolute top-0 bottom-0 z-30 pointer-events-none" 
                  style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${nowPercent / 100})` }}
                >
                  {/* Ambient glow */}
                  <div className="absolute -left-4 top-0 bottom-0 w-8 opacity-15 blur-lg" style={{ background: C.accent }} />
                  {/* Main line */}
                  <div 
                    className="absolute -left-px top-0 bottom-0 w-[2px]" 
                    style={{ background: `linear-gradient(to bottom, ${C.accent} 0%, ${C.accent}80 50%, ${C.accent}30 100%)` }} 
                  />
                  {/* Top dot */}
                  <div 
                    className="absolute -left-1.5 -top-0.5 w-3 h-3 rounded-full"
                    style={{ background: C.accent, boxShadow: `0 0 8px ${C.accent}80` }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Room Rows - Flex container. gap-1 (4px) — minimální mezera, aby se vešlo
               co nejvíce sálů bez scrollu. Kontejner i výpočet rowHeight používá ROW_GAP_PX=4. */}
            <div className="flex flex-col gap-1 px-1">
            {sortedRooms.map((room, roomIndex) => {
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
              
              // Get status from database context - použít lookup mapu podle order_index
              const currentStep = statusByOrderIndex[room.currentStepIndex];
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

              /* Urgency row — full-banner pro immediate/urgent (isEmergency aktivní);
                 tintuje se podle NCEPOD úrovně, fallback red pro legacy emergency bez urgencyLevel */
              if (room.isEmergency) {
                const urgencyTheme = room.urgencyLevel ? URGENCY_THEME[room.urgencyLevel] : null;
                const bannerColor = urgencyTheme ? urgencyTheme.color : C.red;
                const bannerLabel = urgencyTheme ? urgencyTheme.label : 'EMERGENCY';
                const shouldPulse = !urgencyTheme || room.urgencyLevel === 'immediate' || room.urgencyLevel === 'urgent';
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
                    {/* Urgency timeline box - tinted glassmorph */}
                    <div className="relative flex-1 overflow-hidden rounded-r-lg">
                      <div className={`absolute inset-y-2 left-2 right-2 rounded-xl overflow-hidden ${shouldPulse ? 'animate-pulse' : ''}`}>
                        {/* Main background */}
                        <div 
                          className="absolute inset-0 rounded-xl backdrop-blur-md"
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
                  </div>
                );
              }

              /* Locked row - LoginPage style with accent yellow */
              if (room.isLocked) {
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
                        style={{ background: `${C.accent}15`, border: `1px solid ${C.accent}30` }}
                      >
                        <Lock className="w-3.5 h-3.5" style={{ color: C.accent }} />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="text-sm font-semibold tracking-tight truncate" style={{ color: `${C.accent}cc` }}>{room.name}</p>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] truncate" style={{ color: `${C.accent}80` }}>UZAMCENO</p>
                      </div>
                    </div>
                    {/* Locked timeline box - LoginPage glassmorph */}
                    <div className="relative flex-1 overflow-hidden rounded-r-lg">
                      <div className="absolute inset-y-2 left-2 right-2 rounded-xl overflow-hidden">
                        {/* Main background */}
                        <div 
                          className="absolute inset-0 rounded-xl backdrop-blur-md"
                          style={{ 
                            background: `linear-gradient(135deg, ${C.accent}15 0%, ${C.accent}05 100%)`,
                            border: `1px solid ${C.accent}25`,
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05)`,
                          }}
                        />
                        {/* Content */}
                        <div className="absolute inset-0 flex items-center justify-center gap-2">
                          <Lock className="w-4 h-4" style={{ color: `${C.accent}99` }} />
                          <span className="text-xs font-bold tracking-[0.2em] uppercase select-none" style={{ color: `${C.accent}bb` }}>
                            UZAMCENO
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              /* Active / Free row */
              const softUrgency = (room.urgencyLevel === 'expedited' || room.urgencyLevel === 'elective')
                ? URGENCY_THEME[room.urgencyLevel]
                : null;
              return (
                <div
                  key={room.id}
                  className="relative flex items-stretch group cursor-pointer transition-all duration-200 hover:bg-white/[0.04]"
                  style={{
                    height: rowHeight,
                    borderBottom: `1px solid ${C.border}`,
                    background: softUrgency ? softUrgency.bgSoft : undefined,
                  }}
                  onClick={() => setSelectedRoom(room)}
                >
                  {/* Side-stripe marker pro registrovaný akutní výkon — viditelný při scrollování */}
                  {softUrgency && (
                    <div
                      className="absolute left-0 top-0 bottom-0 z-30 pointer-events-none"
                      style={{
                        width: 3,
                        background: softUrgency.color,
                        boxShadow: `0 0 12px ${softUrgency.color}aa`,
                      }}
                    />
                  )}
                  {/* Room Label - Sticky LEFT column. Used `min-h-0 overflow-hidden`
                     a `py-1` aby se obsah karty nepřekrýval s vedlejším řádkem
                     při sníženém rowHeight (responzivní dělení container_height / rooms.length). */}
                  <div 
                    className="flex-shrink-0 flex items-center gap-2 px-2 py-1 min-h-0 overflow-hidden transition-all duration-200 group-hover:bg-white/[0.03] sticky left-0 z-20" 
                    style={{ 
                      width: ROOM_LABEL_WIDTH, 
                      minWidth: ROOM_LABEL_WIDTH, 
                      background: 'rgba(11,17,32,0.98)',
                      backdropFilter: 'blur(8px)',
                      borderRight: `1px solid ${C.border}`,
                    }}
                  >
                    {/* ARO Overtime Badge - softer */}
                    {(() => {
                      const aroPosition = getAroPosition(room.id);
                      const overtimeInfo = getOvertimeInfo(room.id);
                      
                      if (aroPosition && overtimeInfo) {
  return (
  <div
className="flex-shrink-0 flex flex-col items-center justify-center px-1.5 py-0.5 rounded-md"
style={{
  background: 'rgba(132, 255, 0, 0.1)',
  border: '1px solid rgba(132, 255, 0, 0.96)'
}}
                          >
                            <span className="text-[7px] font-medium tracking-wider" style={{ color: 'rgba(132, 255, 0, 0.96)' }}>ARO</span>
                            <span className="text-xs font-bold text-white/80">{aroPosition}</span>
                            <span className="text-[6px] font-normal" style={{ color: 'rgba(132, 255, 0, 0.96)' }}>+{overtimeInfo.overtimeMinutes}m</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* Numbered badge for active rooms - softer */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isActive && !getAroPosition(room.id) && (
                        <div 
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white/90"
                          style={{ background: `${roomColor.bg}90`, boxShadow: `0 1px 4px ${roomColor.glow}` }}
                        >
                          {currentRoomNumber}
                        </div>
                      )}
                    </div>

                    {/* Room info - Rounded glassmorph card IN LEFT COLUMN, always visible.
                       Padding adaptivní: kompaktní (rowHeight < 44) → minimum, jinak komfortní. */}
                    <div 
                      className={`flex-shrink-0 flex-1 min-w-0 max-w-xs rounded-xl ${rowHeight < 44 ? 'py-0.5 px-2' : 'py-1.5 px-2.5'} backdrop-blur-md transition-all duration-200 overflow-hidden`}
                      style={{ 
                        background: C.glass, 
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold tracking-tight text-white truncate">
                          {room.name}
                        </p>
                        {room.isSeptic && (
                          <span className="text-[8px] font-semibold px-2 py-1 rounded-lg" style={{ background: 'rgba(168,85,247,0.15)', color: 'rgba(216,180,254,0.9)', textTransform: 'uppercase' }}>SEPTIKA</span>
                        )}
                        {room.isPaused && !room.isEmergency && !room.isLocked && (
                          <span className="text-[8px] font-semibold px-2 py-1 rounded-lg uppercase flex-shrink-0 flex items-center gap-1" style={{ background: 'rgba(6,182,212,0.15)', color: 'rgba(34,211,238,0.9)' }}>
                            <Pause className="w-2.5 h-2.5" />
                            PAUZA
                          </span>
                        )}
                        {/* Urgency badge — pro expedited / elective (immediate/urgent jsou v Emergency rowu) */}
                        {room.urgencyLevel && (room.urgencyLevel === 'expedited' || room.urgencyLevel === 'elective') && (
                          <motion.span
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-[8px] font-semibold px-2 py-1 rounded-lg uppercase flex-shrink-0 flex items-center gap-1"
                            style={{
                              background: URGENCY_THEME[room.urgencyLevel].bgSoft,
                              color: URGENCY_THEME[room.urgencyLevel].color,
                              border: `1px solid ${URGENCY_THEME[room.urgencyLevel].border}`,
                            }}
                            title={`Akutní výkon — ${URGENCY_THEME[room.urgencyLevel].label}`}
                          >
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {URGENCY_THEME[room.urgencyLevel].label}
                          </motion.span>
                        )}
                        {/* Patient called indicator — adaptivní: w-6 h-6 při kompakt. řádku (<44),
                            jinak w-9 h-9. Zaručuje, že se vejde i do MIN_ROW_HEIGHT=24. */}
                        {room.patientCalledAt && !room.patientArrivedAt && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`${rowHeight < 44 ? 'w-6 h-6' : 'w-9 h-9'} rounded-xl flex items-center justify-center flex-shrink-0`}
                            style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(96,165,250,0.3)' }}
                            title="Pacient volán"
                          >
                            <Phone className={`${rowHeight < 44 ? 'w-3 h-3' : 'w-4 h-4'} text-blue-400`} />
                          </motion.div>
                        )}
                        {/* Patient arrived indicator */}
                        {room.patientArrivedAt && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`${rowHeight < 44 ? 'w-6 h-6' : 'w-9 h-9'} rounded-xl flex items-center justify-center flex-shrink-0`}
                            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(52,211,153,0.3)' }}
                            title="Pacient v operačním traktu"
                          >
                            <BedDouble className={`${rowHeight < 44 ? 'w-3 h-3' : 'w-4 h-4'} text-green-400`} />
                          </motion.div>
                        )}
                      </div>
                      {/* Sekundární řádek (department / remainingTime) — skryt při velmi malé
                          výšce řádku (>=12 sálů na bežném FullHD), aby se vše vešlo bez scrollu.
                          Klíčové info (room.name, badges) zůstává v primárním řádku. */}
                      <div className={`mt-0.5 ${rowHeight < 44 ? 'hidden' : ''}`}>
                        {isFree ? (
                          <p className="text-[8px] font-semibold text-white/40 flex items-center gap-2 uppercase tracking-[0.2em] truncate">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'rgba(16,185,129,0.4)' }} />
                            VOLNÝ
                          </p>
                        ) : remainingTime && stepIndex !== 0 ? (
                          <p className="text-[8px] font-semibold text-white/50 uppercase tracking-[0.2em] truncate">
                            {remainingTime}
                          </p>
                        ) : (
                          <p className="text-[8px] font-semibold text-white/40 uppercase tracking-[0.2em] truncate">{room.department}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Timeline section - RIGHT side, scrollable with rounded-r corners */}
                  <div className="relative flex-1 overflow-hidden rounded-r-lg">
                    {/* Hour grid lines */}
                    {TIME_MARKERS.slice(0, -1).map((hour, i) => {
                      const displayHour = hour % 24;
                      const isNight = displayHour >= 19 || displayHour < 7;
                      return (
                        <div 
                          key={i} 
                          className="absolute top-0 bottom-0 w-px" 
                          style={{ 
                            left: `${(i / TIMELINE_HOURS) * 100}%`,
                            background: isNight ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)'
                          }} 
                        />
                      );
                    })}

                    {/* Completed operations - soft gray inactive bars */}
                    {(() => {
                      // Use completedOperations from room data
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
                        
                        // Get single continuous position (even if crossing 7:00)
                        const position = getOperationPosition(opStartDate, opEndDate, currentTime);
                        
                        // Skip if width is 0
                        if (position.width <= 0) return null;
                        
                        // Check if this is a continuing operation (started before 7:00)
                        const isContinuingOp = position.isContinuing;
                        
                        return (
                          <div
                            key={`completed-${opIdx}`}
                            className="absolute top-1.5 bottom-1.5 overflow-hidden rounded-xl"
                            style={{ 
                              left: `${position.left}%`, 
                              width: `${Math.max(0.3, position.width)}%`,
                              // Green background for continuing operations, LoginPage glass for completed
                              background: isContinuingOp ? `${C.green}30` : C.glass,
                              border: `1px solid ${isContinuingOp ? `${C.green}40` : C.border}`,
                            }}
                          >
                              {/* Completed operation segments with colors from database context */}
                              {!isContinuingOp && operation.statusHistory && operation.statusHistory.length > 0 && (
                                <div className="absolute inset-0 flex overflow-hidden rounded-md">
                                  {(() => {
                                    // Build color lookup from activeStatuses
                                    // Používáme order_index (tj. sort_order) jako klíč, ne pozici v poli
                                    const stepColorMap: Record<number, string> = {};
                                    activeStatuses.forEach((s) => {
                                      stepColorMap[s.order_index] = s.accent_color || s.color || STEP_INDEX_COLORS[s.order_index] || '#6b7280';
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
                                      // Preferujeme AKTUÁLNÍ barvu ze Statusů (live z DB),
                                      // aby byla časová osa vždy konzistentní s modulem Statusy.
                                      // entry.color je jen fallback pro stavy, které už v DB neexistují.
                                      const phaseColor = stepColorMap[entry.stepIndex]
                                        || entry.color
                                        || STEP_INDEX_COLORS[entry.stepIndex]
                                        || '#6b7280';

                                      return (
                                        <motion.div
                                          key={`seg-${idx}`}
                                          className="absolute top-0 bottom-0 transition-all duration-300 hover:brightness-105"
                                          style={{
                                            left: `${Math.max(0, segLeftPct)}%`,
                                            width: `${Math.max(0.5, segWidthPct)}%`,
                                            background: `linear-gradient(90deg, ${phaseColor}70 0%, ${phaseColor}50 100%)`,
                                            borderRight: idx < operation.statusHistory.length - 1 ? `1px solid rgba(0,0,0,0.3)` : 'none',
                                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.2)`,
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
                              
                              {/* Label for operation */}
                              <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                {position.width > 6 && (
                                  <span className={`text-[10px] font-semibold truncate uppercase tracking-wide ${
                                    isContinuingOp ? 'text-white' : 'text-white/50'
                                  }`}>
                                    {isContinuingOp ? 'POKRAČUJÍCÍ VÝKON' : 'Dokončeno'}
                                  </span>
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
                    {isActive && room.operationStartedAt && room.estimatedEndTime && (() => {
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
                          className="absolute top-1.5 bottom-1.5 rounded-xl flex items-center justify-between px-3"
                          style={{
                            left: '0%',
                            width: `${displayWidthPct}%`,
                            background: `linear-gradient(90deg, ${C.green}35 0%, ${C.green}20 100%)`,
                            borderRight: `2px solid ${C.green}`,
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08)`,
                            zIndex: 1,
                          }}
                        >
                          <span className="text-[11px] font-semibold text-white uppercase tracking-[0.15em] truncate">
                            POKRAČUJÍCÍ VÝKON
                          </span>
                          <span className="text-[10px] font-bold ml-2 whitespace-nowrap" style={{ color: C.green }}>
                            do {endHours}:{endMinutes}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Active operation bar - LoginPage rounded style.
                       Vstupní animace (scaleX 0→1 zleva doprava + delay per row) odstraněna,
                       aby se modul při otevření nerozjížděl jako "vlna". Bar se vykreslí
                       okamžitě v plné šíři. */}
                    {isActive && shouldShowBar && boxWidthPct > 0 && (
                      <div
                        className="absolute top-1.5 bottom-1.5 overflow-hidden rounded-xl"
                        style={{ 
                          left: `${Math.max(0, boxLeftPct)}%`, 
                          width: `${boxWidthPct}%`,
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                        }}
                      >
                        {/* Multi-segment colored bar: one full cycle = all phases colored by status */}
                        <div className="absolute inset-0 flex overflow-hidden rounded-xl">
                          {(() => {
                            const history = room.statusHistory || [];
                            const operationStart = room.operationStartedAt
                              ? new Date(room.operationStartedAt).getTime()
                              : room.phaseStartedAt
                                ? new Date(room.phaseStartedAt).getTime()
                                : Date.now() - 30 * 60 * 1000;
                            const estimatedEndTime = room.estimatedEndTime
                              ? new Date(room.estimatedEndTime).getTime()
                              : operationStart + 120 * 60 * 1000;
                            const now = Date.now();
                            // Pokud operace přesáhla odhadovaný čas, použijeme aktuální čas jako koncový bod
                            const effectiveEndTime = Math.max(estimatedEndTime, now);
                            const totalDuration = Math.max(1, effectiveEndTime - operationStart);

                            // Build color lookup from activeStatuses (database-driven)
                            // Používáme order_index (tj. sort_order) jako klíč, ne pozici v poli
                            const stepColorMap: Record<number, string> = {};
                            activeStatuses.forEach((s) => {
                              stepColorMap[s.order_index] = s.accent_color || s.color || STEP_INDEX_COLORS[s.order_index] || '#6b7280';
                            });

                            // If we have real status history → render exact segments
                            if (history.length > 0) {
                              return history.map((entry, idx) => {
                                const segStart = new Date(entry.startedAt).getTime();
                                const nextEntry = history[idx + 1];
                                const isCurrentSeg = idx === history.length - 1;
                                
                                // Pro aktuální segment: prodloužit na aktuální čas pokud přesahuje odhadovaný konec
                                const segEnd = nextEntry
                                  ? new Date(nextEntry.startedAt).getTime()
                                  : effectiveEndTime; // Prodloužit na aktuální čas pokud operace stále běží
                                
                                const segDuration = Math.max(0, segEnd - segStart);
                                const segWidthPct = (segDuration / totalDuration) * 100;
                                const segLeftPct = ((segStart - operationStart) / totalDuration) * 100;
                                if (segWidthPct <= 0) return null;
                                
                                // Preferujeme AKTUÁLNÍ barvu ze Statusů (live z DB),
                                // aby byla časová osa vždy konzistentní s modulem Statusy.
                                const phaseColor = stepColorMap[entry.stepIndex]
                                  || entry.color
                                  || STEP_INDEX_COLORS[entry.stepIndex]
                                  || '#6b7280';

                                // For current segment, calculate progress within the segment
                                const progressWithinSeg = isCurrentSeg 
                                  ? Math.max(0, Math.min(100, ((now - segStart) / (segEnd - segStart)) * 100))
                                  : 100;

                                return (
                                  <motion.div
                                    key={`seg-${idx}`}
                                    className="absolute top-0 bottom-0 overflow-hidden transition-all duration-300 hover:brightness-110"
                                    style={{
                                      left: `${Math.max(0, segLeftPct)}%`,
                                      width: `${Math.max(0.5, segWidthPct)}%`,
                                      background: isCurrentSeg
                                        ? `linear-gradient(90deg, ${phaseColor}40 0%, ${phaseColor}20 100%)`
                                        : `linear-gradient(90deg, ${phaseColor}dd 0%, ${phaseColor}aa 100%)`,
                                      boxShadow: isCurrentSeg 
                                        ? 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.2)'
                                        : `inset 0 1px 0 rgba(255,255,255,0.15), 0 0 12px ${phaseColor}30`,
                                    }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.04 * idx }}
                                  >
                                    {/* For current segment: show completed portion with full color and glow */}
                                    {isCurrentSeg && (
                                      <motion.div 
                                        className="absolute top-0 bottom-0 left-0 transition-all duration-300"
                                        style={{
                                          width: `${progressWithinSeg}%`,
                                          background: `linear-gradient(90deg, ${phaseColor} 0%, ${phaseColor}e0 100%)`,
                                          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 0 8px ${phaseColor}50`,
                                        }}
                                      />
                                    )}
                                    {/* Subtle separator between segments */}
                                    {idx < history.length - 1 && (
                                      <div className="absolute top-0 right-0 bottom-0 w-px bg-black/50 z-10" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.5), rgba(0,0,0,0))` }} />
                                    )}
                                    {/* Show phase label if segment is wide enough */}
                                    {segWidthPct > 8 && (
                                      <div className="absolute inset-0 flex items-end justify-start px-1.5 pb-0.5 pointer-events-none z-[5]">
                                        <span className="text-[7px] font-semibold text-white/80 truncate uppercase tracking-wide leading-none drop-shadow">
                                          {statusByOrderIndex[entry.stepIndex]?.title || ''}
                                        </span>
                                      </div>
                                    )}
                                  </motion.div>
                                );
                              });
                            }

                            // Fallback: no history → show estimated future segments
                            // Split total duration proportionally by default step durations
                            const stepDurations = activeStatuses.map((_, i) => STEP_DURATIONS[i] || 15);
                            const completedDuration = stepDurations
                              .slice(0, stepIndex)
                              .reduce((a, b) => a + b, 0);
                            const remainingDuration = stepDurations
                              .slice(stepIndex)
                              .reduce((a, b) => a + b, 0);
                            const scaleFactor = totalDuration / Math.max(1, (completedDuration + remainingDuration) * 60 * 1000);

                            let cursor = 0;
                            return activeStatuses.map((step, i) => {
                              const rawDur = (STEP_DURATIONS[step.order_index] || 15) * 60 * 1000 * scaleFactor;
                              const segWidthPct = (rawDur / totalDuration) * 100;
                              const segLeftPct = cursor;
                              cursor += segWidthPct;
                              const isPast = step.order_index < stepIndex;
                              const isCurrent = step.order_index === stepIndex;
                              const phaseColor = stepColorMap[step.order_index] || '#6b7280';

                              return (
                                <motion.div
                                  key={`est-${i}`}
                                  className="absolute top-0 bottom-0"
                                  style={{
                                    left: `${Math.max(0, segLeftPct)}%`,
                                    width: `${Math.max(0.5, segWidthPct)}%`,
                                    background: isCurrent
                                      ? phaseColor
                                      : isPast
                                        ? `${phaseColor}bb`
                                        : `${phaseColor}33`,
                                  }}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.03 * i }}
                                >
                                  {i < activeStatuses.length - 1 && (
                                    <div className="absolute top-0 right-0 bottom-0 w-[1.5px] bg-black/35 z-10" />
                                  )}
                                  {segWidthPct > 7 && (
                                    <div className="absolute inset-0 flex items-end justify-start px-1.5 pb-0.5 pointer-events-none">
                                      <span className="text-[7px] font-semibold text-white/70 truncate uppercase tracking-wide leading-none">
                                        {step.title || step.name}
                                      </span>
                                    </div>
                                  )}
                                </motion.div>
                              );
                            });
                          })()}
                        </div>

                        {/* Current position indicator */}
                        {progressPct > 0 && progressPct < 100 && !room.isPaused && (
                          <>
                            <div 
                              className="absolute top-0 bottom-0 w-[2px] -translate-x-1/2"
                              style={{ 
                                left: `${progressPct}%`,
                                background: 'rgba(255,255,255,0.9)'
                              }}
                            />
                            <div 
                              className="absolute -top-0.5 w-2 h-2 -translate-x-1/2 rounded-full"
                              style={{ 
                                left: `${progressPct}%`,
                                background: 'white'
                              }}
                            />
                          </>
                        )}



                        {/* Content overlay - refined typography */}
                        <div className="absolute inset-0 flex items-center px-4 pointer-events-none gap-3 z-10">
                          {room.isPaused ? (
                            /* Pause state - elegant pause display */
                            <div className="min-w-0 flex-1 flex items-center gap-2">
                              {boxWidthPct > 5 && (
                                <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                  <Pause className="w-3 h-3 text-white" />
                                </div>
                              )}
                              {boxWidthPct > 12 && (
                                <div>
                                  <p className="text-[11px] font-semibold text-white uppercase tracking-[0.3em]">
                                    PAUZA
                                  </p>
                                  {boxWidthPct > 20 && (
                                    <p className="text-[8px] text-white/60">
                                      Operace pozastavena
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Normal state - jen jméno lékaře (status odstraněn na přání uživatele;
                               status už je vyjádřen barvou samotného baru). */
                            <>
                              {boxWidthPct > 8 && (
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-semibold text-white truncate drop-shadow-sm">
                                    {room.staff?.doctor?.name || ''}
                                  </p>
                                </div>
                              )}
                              {boxWidthPct > 18 && remainingTime && stepIndex !== 0 && (
                                <div
                                  className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-bold text-white/90 backdrop-blur-md"
                                  style={{ 
                                    background: C.glass,
                                    border: `1px solid ${C.border}`,
                                  }}
                                >
                                  {remainingTime}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Free room indicator - LoginPage glass style */}
                    {isFree && (
                      <div 
                        className="absolute inset-y-2 left-2 right-2 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:bg-white/[0.02]"
                        style={{ 
                          background: C.glass,
                          border: `1px dashed ${C.border}`,
                          backdropFilter: 'blur(4px)'
                        }}
                      >
                        <div className="text-center px-3">
                          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-[0.2em]">{stepName}</p>
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
                      
                      return (
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 z-20"
                          style={{ 
                            left: `${endPercent}%`,
                            background: 'linear-gradient(180deg, transparent 0%, #F97316 20%, #F97316 80%, transparent 100%)'
                          }}
                        >
                          {/* End time label */}
                          <div 
                            className="absolute -top-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap flex items-center gap-1"
                            style={{ 
                              background: 'rgba(249, 115, 22, 0.2)',
                              border: '1px solid rgba(249, 115, 22, 0.4)',
                              color: '#F97316'
                            }}
                          >
                            {todaySchedule.endHour.toString().padStart(2, '0')}:{todaySchedule.endMinute.toString().padStart(2, '0')}
                          </div>
                        </div>
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
// TimelineModule re-render přeskočí. Re-renderne se jen když se reálně změní `rooms`.
const TimelineModule = React.memo(TimelineModuleImpl);
export default TimelineModule;

// Helper Component - Stat Box
interface StatBoxProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
  glow?: boolean;
}

const StatBox: React.FC<StatBoxProps> = ({ icon: Icon, label, value, color, glow }) => (
  <div
    className={`relative flex-shrink-0 h-14 rounded-2xl px-4 py-2.5 overflow-hidden backdrop-blur-md transition-all duration-200 hover:scale-[1.02] ${glow ? 'shadow-lg' : ''}`}
    style={{
      background: glow
        ? `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)`
        : C.glass,
      border: glow ? `1px solid ${color}40` : `1px solid ${C.border}`,
      boxShadow: glow ? `0 0 24px ${color}25, inset 0 1px 0 rgba(255,255,255,0.05)` : 'inset 0 1px 0 rgba(255,255,255,0.03)',
    }}
  >
    {/* Ambient glow for emergency/special states */}
    {glow && (
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${color}25 0%, transparent 70%)`,
        }}
      />
    )}
    {/* Top highlight line (LoginPage style) */}
    <div 
      className="absolute top-0 left-4 right-4 h-px opacity-30"
      style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }}
    />
    <div className="relative flex items-center gap-3 h-full">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: `${color}15`,
          border: `1px solid ${color}30`,
        }}
      >
        <span style={{ color }}><Icon className="w-4 h-4" /></span>
      </div>
      <div className="min-w-0">
        <p className="text-[9px] text-white/40 uppercase tracking-[0.3em] font-semibold">{label}</p>
        <p className="text-sm font-bold text-white leading-tight">{value}</p>
      </div>
    </div>
  </div>
);

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
  
  // Použít lookup mapu pro správné mapování barvy a statusu
  const currentStatus = statusByOrderIndex[stepIndex] || null;
  const nextStatus = statusByOrderIndex[nextStepIndex] || null;
  
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="rounded-3xl overflow-hidden max-w-2xl w-full relative"
        style={{
          background: 'linear-gradient(180deg, rgba(15,31,58,0.98) 0%, rgba(10,21,40,0.98) 100%)',
          border: `1px solid ${C.border}`,
          boxShadow: `0 25px 60px -12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.05)`,
        }}
      >
        {/* Ambient glow at top */}
        <div 
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full pointer-events-none opacity-20"
          style={{ background: `radial-gradient(circle, ${C.accent} 0%, transparent 70%)`, filter: 'blur(60px)' }}
        />
        {/* Top highlight line */}
        <div 
          className="absolute top-0 left-8 right-8 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${C.accent}30, transparent)` }}
        />
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between">
          {/* Left side - Progress circle and room info */}
          <div className="flex items-center gap-4">
            {/* Progress circle */}
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-14 h-14 -rotate-90">
                <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                <circle 
                  cx="28" cy="28" r="24" fill="none" stroke={stepColor} strokeWidth="4"
                  strokeDasharray={`${progressPercent * 1.5} 150`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-bold text-white">{progressPercent}%</span>
            </div>
            
            {/* Room name and status */}
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{room.name}</h2>
                <span 
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: `${stepColor}30`, color: stepColor }}
                >
                  {currentStatus?.name || 'Status'}
                </span>
              </div>
              <p className="text-white/50 text-sm mt-0.5">
                {room.department} · KROK {stepIndex + 1} Z {totalSteps}
              </p>
            </div>
          </div>
          
          {/* Right side - Step dots, time display and close */}
          <div className="flex items-center gap-6">
            {/* Step progress dots */}
            <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-semibold text-right mb-1">DOBA OPERACE</p>
              <div className="flex items-center gap-1">
                {activeStatuses.map((_, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: idx <= stepIndex ? stepColor : 'rgba(255,255,255,0.2)' }}
                    />
                    <div
                      className="w-0.5 h-2"
                      style={{ backgroundColor: idx <= stepIndex ? stepColor : 'rgba(255,255,255,0.2)' }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
              style={{
                background: C.glass,
                border: `1px solid ${C.border}`,
              }}
            >
              <X className="w-5 h-5 text-white/50 hover:text-white/80 transition-colors" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-5">
          {/* Operation progress section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-white/40" />
                  <p className="text-[11px] text-white/40 uppercase tracking-[0.3em] font-semibold">POSTUP OPERACE</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Current step */}
              <div 
                className="flex-1 rounded-2xl p-4 border"
                style={{ 
                  backgroundColor: `${stepColor}15`,
                  borderColor: `${stepColor}40`
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stepColor }} />
                          <span className="text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: stepColor }}>
                            PRÁVĚ PROBÍHÁ
                          </span>
                  </div>
                  <span 
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: `${stepColor}30`, color: stepColor }}
                  >
                    Krok {stepIndex + 1}/{totalSteps}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${stepColor}20` }}
                  >
                    <span style={{ color: stepColor }}><Stethoscope className="w-5 h-5" /></span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">{currentStatus?.name || 'Status'}</p>
                    <p className="text-white/40 text-xs flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {getElapsedTime()} --:--
                    </p>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${stepColor}30` }}
              >
                <span style={{ color: stepColor }}><ChevronRight className="w-5 h-5" /></span>
              </div>

              {/* Next step - LoginPage glass with gradient accent */}
              <div 
                className="flex-1 rounded-2xl p-4 backdrop-blur-md transition-all duration-200 hover:scale-[1.02]"
                style={{ 
                  background: `linear-gradient(135deg, ${stepColor}12 0%, ${stepColor}05 100%)`,
                  border: `1px solid ${stepColor}25`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 0 16px ${stepColor}15`,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: stepColor }} />
                          <span className="text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: `${stepColor}99` }}>
                            NÁSLEDUJÍCÍ
                          </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white/40" style={{ background: `${stepColor}15`, border: `1px solid ${stepColor}25` }}>
                    Krok {nextStepIndex + 1}/{totalSteps}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${stepColor}20`, border: `1px solid ${stepColor}30` }}>
                    <Sparkles className="w-5 h-5" style={{ color: stepColor }} />
                  </div>
                  <div>
                    <p className="text-white/80 font-semibold">{nextStatus?.name || 'Další krok'}</p>
                          <p className="text-white/30 text-xs mt-0.5">Čeká na zahájení</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row - Team and Times */}
          <div className="grid grid-cols-2 gap-4">
            {/* Team section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-white/40" />
                        <p className="text-[11px] text-white/40 uppercase tracking-[0.3em] font-semibold">TÝM</p>
              </div>
              <div className="flex gap-3">
                {/* Doctor - LoginPage glass with hover effect */}
                <div 
                  className="flex-1 rounded-xl p-3 backdrop-blur-md transition-all duration-200 hover:scale-105"
                  style={{ background: C.glass, border: `1px solid ${C.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200" style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.3)' }}>
                      <Stethoscope className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                          <p className="text-[9px] text-white/40 uppercase tracking-[0.3em] font-semibold">ANESTEZIOLOG</p>
                      <p className="text-sm font-semibold text-white">{room.staff?.doctor?.name || 'MUDr. --'}</p>
                    </div>
                  </div>
                </div>
                {/* Nurse - LoginPage glass with hover effect */}
                <div 
                  className="flex-1 rounded-xl p-3 backdrop-blur-md transition-all duration-200 hover:scale-105"
                  style={{ background: C.glass, border: `1px solid ${C.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)' }}>
                      <Users className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                          <p className="text-[9px] text-white/40 uppercase tracking-[0.3em] font-semibold">SESTRA</p>
                      <p className="text-sm font-semibold text-white">{room.staff?.nurse?.name || 'Bc. --'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Times section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-white/40" />
                        <p className="text-[11px] text-white/40 uppercase tracking-[0.3em] font-semibold">ČASY</p>
              </div>
              <div className="flex gap-3">
                {/* Start time - LoginPage glass with glow on hover */}
                <div 
                  className="flex-1 rounded-xl p-3 backdrop-blur-md text-center transition-all duration-200 hover:scale-105"
                  style={{ 
                    background: C.glass, 
                    border: `1px solid ${C.border}`,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}
                >
                  <p className="text-[9px] text-white/40 uppercase tracking-[0.3em] font-semibold mb-1">ZAČÁTEK</p>
                  <p className="text-xl font-mono font-bold text-white/60">--:--</p>
                </div>
                {/* Estimated end - gradient with accent and glow */}
                <motion.div 
                  className="flex-1 rounded-xl p-3 backdrop-blur-md text-center transition-all duration-200 hover:scale-105"
                  whileHover={{ boxShadow: `0 0 16px ${stepColor}40` }}
                  style={{ 
                    background: `linear-gradient(135deg, ${stepColor}15 0%, ${stepColor}05 100%)`,
                    border: `1.5px solid ${stepColor}30`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 12px ${stepColor}20`,
                  }}
                >
                  <p className="text-[9px] uppercase tracking-[0.3em] font-semibold mb-1" style={{ color: `${stepColor}99` }}>ODHAD</p>
                  <p className="text-xl font-mono font-bold" style={{ color: stepColor }}>
                    {room.estimatedEndTime 
                      ? new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                      : '--:--'
                    }
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

