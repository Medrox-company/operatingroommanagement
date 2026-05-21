import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, WeeklySchedule, DEFAULT_WEEKLY_SCHEDULE } from '../types';
import { STEP_DURATIONS, STEP_COLORS } from '../constants';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import MobileTimelineView from './mobile/MobileTimelineView';
import TimelineGridView from './TimelineGridView';
import { 
  Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe, 
  Settings, User, Sparkles, Info, ChevronRight, Loader2, Pause, Phone, BedDouble, AlertCircle, CheckCircle
} from 'lucide-react';

// ========== DESIGN TOKENS (Modern glass-morphism style) ==========
const C = {
  // Primary colors
  accent: '#00D9FF',    // Vivid cyan
  cyan: '#00D9FF',
  yellow: '#FFE66D',
  green: '#00F5A0',
  orange: '#FF9F43',
  red: '#FF6B6B',
  purple: '#A78BFA',
  pink: '#F472B6',
  blue: '#60A5FA',
  
  // Surface & backgrounds
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.15)',
  surface: 'rgba(255,255,255,0.03)',
  surface2: 'rgba(255,255,255,0.06)',
  glass: 'rgba(255,255,255,0.04)',
  glassHover: 'rgba(255,255,255,0.08)',
  
  // Text
  muted: 'rgba(255,255,255,0.45)',
  text: 'rgba(255,255,255,0.85)',
  textHi: 'rgba(255,255,255,0.95)',
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
  orange: { bg: '#FF9F43', border: '#FFB76B', stripe: '#FFD1A3', text: '#FFF', glow: 'rgba(255,159,67,0.25)' },
  purple: { bg: '#A78BFA', border: '#C4B5FD', stripe: '#DDD6FE', text: '#FFF', glow: 'rgba(167,139,250,0.25)' },
  pink: { bg: '#F472B6', border: '#F9A8D4', stripe: '#FBCFE8', text: '#FFF', glow: 'rgba(244,114,182,0.25)' },
  blue: { bg: '#60A5FA', border: '#93C5FD', stripe: '#BFDBFE', text: '#FFF', glow: 'rgba(96,165,250,0.25)' },
  green: { bg: '#00F5A0', border: '#5FFFC1', stripe: '#B8FFE0', text: '#000', glow: 'rgba(0,245,160,0.25)' },
  red: { bg: '#FF6B6B', border: '#FF9999', stripe: '#FFC7C7', text: '#FFF', glow: 'rgba(255,107,107,0.25)' },
  cyan: { bg: '#00D9FF', border: '#5AE8FF', stripe: '#B0F4FF', text: '#000', glow: 'rgba(0,217,255,0.25)' },
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

// Compact label for smaller screens - just the hour number
const hourLabelCompact = (hour: number): string => {
  const actualHour = TIMELINE_START_HOUR + hour;
  const displayHour = actualHour % 24;
  return `${displayHour}`;
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
        // Math.floor → zaokrouhli dolů, aby ani 1px subpixel rounding nezp��sobil overflow
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
        className="sticky top-0 z-40 backdrop-blur-2xl flex-shrink-0"
        style={{ 
          background: 'linear-gradient(180deg, rgba(0,10,20,0.98) 0%, rgba(0,10,20,0.92) 100%)',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {/* Ambient glow */}
        <div 
          className="absolute top-0 left-1/4 w-96 h-32 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: C.accent }}
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
                    className="absolute top-0 h-full flex items-center justify-center" 
                    style={{ left: `${leftPct}%`, width: isLast ? 0 : `${widthPct}%` }}
                  >
                    <div 
                      className={`absolute left-0 w-px h-full transition-all duration-300`}
                      style={{ 
                        background: isNightHour 
                          ? 'linear-gradient(to bottom, rgba(255,255,255,0.02), rgba(255,255,255,0.04), rgba(255,255,255,0.02))'
                          : 'linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
                      }} 
                    />
                    {!isLast && (
                      isCurrentHour ? (
                        /* Current hour - yellow highlighted, compact, centered */
                        <span 
                          className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{ 
                            background: '#f1ff00', 
                            color: '#000',
                          }}
                        >
                          {currentHour}:{currentMin < 10 ? '0' : ''}{currentMin}
                        </span>
                      ) : (
                        /* Other hours - simple number only, no box, centered */
                        <span className={`text-[9px] font-mono font-medium tabular-nums ${isNightHour ? 'text-white/20' : 'text-white/45'}`}>
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

        {/* Room Rows - Responsive height, no scroll */}
        <div className="flex-1 min-h-0 overflow-hidden" ref={rowsContainerRef}>
          <div className="relative w-full h-full" ref={scrollContainerRef}>
            {/* Now indicator - Simple line without glow */}
            <AnimatePresence>
              {nowPercent >= 0 && nowPercent <= 100 && (
                <div 
                  className="absolute top-0 bottom-0 z-30 pointer-events-none" 
                  style={{ left: `calc(${ROOM_LABEL_WIDTH}px + (100% - ${ROOM_LABEL_WIDTH}px) * ${nowPercent / 100})` }}
                >
                  {/* Main line - clean and simple */}
                  <div 
                    className="absolute -left-px top-0 bottom-0 w-[2px]" 
                    style={{ background: '#73ff00' }}
                  />
                </div>
              )}
            </AnimatePresence>

            {/* Grid View - New compact card-based layout */}
            <TimelineGridView rooms={sortedRooms} currentTime={currentTime} />
            </div>
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

// Helper Component - Stat Box (Modern glass-morphism)
interface StatBoxProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
  glow?: boolean;
}

const StatBox: React.FC<StatBoxProps> = ({ icon: Icon, label, value, color, glow }) => (
  <motion.div
    whileHover={{ scale: 1.03, y: -2 }}
    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    className={`relative flex-shrink-0 h-14 rounded-2xl px-4 py-2.5 overflow-hidden backdrop-blur-xl cursor-pointer ${glow ? 'shadow-lg' : ''}`}
    style={{
      background: glow
        ? `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`
        : `linear-gradient(135deg, ${C.surface2} 0%, ${C.surface} 100%)`,
      border: glow ? `1px solid ${color}50` : `1px solid ${C.border}`,
      boxShadow: glow 
        ? `0 0 30px ${color}20, 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)` 
        : '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
    }}
  >
    {/* Ambient glow for emergency/special states */}
    {glow && (
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: `radial-gradient(ellipse at 50% -20%, ${color}30 0%, transparent 60%)`,
        }}
      />
    )}
    {/* Top accent line */}
    <div 
      className="absolute top-0 left-0 right-0 h-[2px]"
      style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: glow ? 0.8 : 0.4 }}
    />
    <div className="relative flex items-center gap-3 h-full">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: `${color}20`,
          border: `1px solid ${color}40`,
          boxShadow: `0 0 12px ${color}20`,
        }}
      >
        <span style={{ color }}><Icon className="w-4 h-4" /></span>
      </div>
      <div className="min-w-0">
        <p className="text-[9px] text-white/50 uppercase tracking-[0.25em] font-semibold">{label}</p>
        <p className="text-sm font-bold leading-tight" style={{ color: glow ? color : C.textHi }}>{value}</p>
      </div>
    </div>
  </motion.div>
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
  
  // Použít lookup mapu pro správné mapování barvy a statusu.
  // FIX: stepIndex/nextStepIndex jsou pozice v POLI activeStatuses (0-based), ne DB
  // `order_index`. Primárně použijeme přímou indexaci, fallback na order_index lookup
  // pro starší rooms s legacy daty.
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="rounded-3xl overflow-hidden max-w-2xl w-full relative"
        style={{
          background: 'linear-gradient(180deg, rgba(10,20,35,0.98) 0%, rgba(5,12,25,0.98) 100%)',
          border: `1px solid ${C.borderHover}`,
          boxShadow: `0 30px 80px -15px rgba(0, 0, 0, 0.7), 0 0 60px ${stepColor}15, inset 0 1px 0 rgba(255,255,255,0.08)`,
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

