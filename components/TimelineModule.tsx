import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, WeeklySchedule, DEFAULT_WEEKLY_SCHEDULE } from '../types';
import { STEP_DURATIONS, STEP_COLORS } from '../constants';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import MobileTimelineView from './mobile/MobileTimelineView';
import AroOvertimePopup from './AroOvertimePopup';
import { 
  Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users, Shield, X, Syringe, 
  Settings, User, Sparkles, Info, ChevronRight, Loader2, Pause, Phone, BedDouble, AlertCircle, CheckCircle
} from 'lucide-react';

// ========== DESIGN TOKENS (Premium Medical Dashboard - Futuristic Control Center) ==========
const C = {
  // Primary accent - Medical Cyan
  accent: '#06B6D4',
  cyan: '#06B6D4',
  
  // Status colors - Vivid & Professional
  green: '#10B981',       // Active/Success - Emerald
  yellow: '#F59E0B',      // Preparation/Warning - Amber  
  orange: '#F97316',      // Alert - Orange
  red: '#EF4444',         // Delayed/Critical - Red
  purple: '#8B5CF6',      // Planning - Violet
  pink: '#EC4899',        // Special - Pink
  blue: '#3B82F6',        // Info - Blue
  slate: '#64748B',       // Completed - Slate
  
  // Surface & Glass Effects
  bgDeep: '#030712',                        // Deep space black
  bgSurface: 'rgb(0 9 29 / 85%)',           // Glass surface
  bgElevated: 'rgba(30, 41, 59, 0.9)',      // Elevated cards
  bgCard: 'rgba(15, 23, 42, 0.95)',         // Card background
  
  // Borders & Lines
  border: 'rgba(148, 163, 184, 0.08)',      // Subtle border
  borderHover: 'rgba(6, 182, 212, 0.3)',    // Cyan hover
  borderActive: 'rgba(6, 182, 212, 0.5)',   // Active state
  gridLine: 'rgba(148, 163, 184, 0.06)',    // Timeline grid
  
  // Glass & Glow
  glass: 'rgba(255, 255, 255, 0.02)',
  glassHover: 'rgba(6, 182, 212, 0.08)',
  glowCyan: '0 0 20px rgba(6, 182, 212, 0.4)',
  glowGreen: '0 0 16px rgba(16, 185, 129, 0.4)',
  glowRed: '0 0 16px rgba(239, 68, 68, 0.5)',
  
  // Text
  textHi: 'rgba(255, 255, 255, 0.95)',
  text: 'rgba(255, 255, 255, 0.80)',
  muted: 'rgba(255, 255, 255, 0.45)',
  faint: 'rgba(255, 255, 255, 0.25)',
};

// ========== CONSTANTS ==========
const TIMELINE_START_HOUR = 7;
const TIMELINE_END_HOUR = 31; // 7:00 next day (7 + 24 = 31)
const TIMELINE_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR; // 24 hours
const ROOM_LABEL_WIDTH = 320;
const MIN_ROW_HEIGHT = 24; // Absolutní spodní hranice — pod tím už není čitelné (1 line truncate)
const MAX_ROW_HEIGHT = 72; // Maximum row height (when few rooms)
const ROW_GAP_PX = 6;      // gap-1.5 mezi řádky (Tailwind: 0.375rem = 6px) — musí korespondovat s `gap-1.5` v JSX
const ROW_PADDING_PX = 8;  // py-2 vertikální padding kolem všech řádků (Tailwind: 0.5rem = 8px)
const TIME_MARKERS = Array.from({ length: 25 }, (_, i) => i); // 0-24 for 24 hour markers

const ROOM_COLOR_ORDER = ['orange', 'purple', 'pink', 'blue', 'green', 'red', 'cyan'] as const;

const ROOM_COLORS: Record<string, { bg: string; border: string; stripe: string; text: string; glow: string }> = {
  orange: { bg: '#F97316', border: '#FB923C', stripe: '#FDBA74', text: '#FFF', glow: '0 0 20px rgba(249, 115, 22, 0.4)' },
  purple: { bg: '#8B5CF6', border: '#A78BFA', stripe: '#C4B5FD', text: '#FFF', glow: '0 0 20px rgba(139, 92, 246, 0.4)' },
  pink: { bg: '#EC4899', border: '#F472B6', stripe: '#F9A8D4', text: '#FFF', glow: '0 0 20px rgba(236, 72, 153, 0.4)' },
  blue: { bg: '#3B82F6', border: '#60A5FA', stripe: '#93C5FD', text: '#FFF', glow: '0 0 20px rgba(59, 130, 246, 0.4)' },
  green: { bg: '#10B981', border: '#34D399', stripe: '#6EE7B7', text: '#FFF', glow: '0 0 20px rgba(16, 185, 129, 0.4)' },
  red: { bg: '#EF4444', border: '#F87171', stripe: '#FCA5A5', text: '#FFF', glow: '0 0 20px rgba(239, 68, 68, 0.4)' },
  cyan: { bg: '#06B6D4', border: '#22D3EE', stripe: '#67E8F9', text: '#FFF', glow: '0 0 20px rgba(6, 182, 212, 0.4)' },
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
  const [showAroPopup, setShowAroPopup] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const rowsContainerRef = useRef<HTMLDivElement>(null);



  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Calculate responsive row height — všechny sály se MUSÍ vejít bez scrollování.
  // Výpočet: dostupná výška = výška kontejneru - padding - gap mezi řádky
  useEffect(() => {
    const calculateRowHeight = () => {
      if (rowsContainerRef.current && rooms.length > 0) {
        const containerHeight = rowsContainerRef.current.clientHeight;
        const totalGapPx = (rooms.length - 1) * ROW_GAP_PX;
        const totalPaddingPx = ROW_PADDING_PX * 2; // top + bottom
        const availableHeight = Math.max(0, containerHeight - totalGapPx - totalPaddingPx);
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
        {showAroPopup && (
          <AroOvertimePopup 
            isOpen={showAroPopup}
            onClose={() => setShowAroPopup(false)}
            overtimeRooms={aroOvertimeRooms}
            roomsMap={new Map(rooms.map(r => [r.id, r]))}
            currentTime={currentTime}
          />
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
        <div className="px-8 md:pl-32 md:pr-10 py-4">

          {/* Header Row - Time Center, ARO Right */}
          <div className="flex items-center justify-between gap-4">

            {/* Center: Current Time (no box, just prominent display) */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <p className="text-[10px] uppercase tracking-[0.4em] font-medium text-white/30 mb-1">
                {formatDate(currentTime)}
              </p>
              <motion.p 
                className="text-3xl font-bold tabular-nums tracking-tight"
                style={{ 
                  color: C.textHi,
                  textShadow: `0 0 40px ${C.cyan}40`,
                }}
                animate={{ opacity: [0.9, 1, 0.9] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {currentTime.toLocaleTimeString("cs-CZ", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </motion.p>
            </div>

            {/* Right: ARO Overtime indicator */}
            <div className="flex items-center gap-3 flex-shrink-0">
            {aroOvertimeRooms.length > 0 ? (
              <motion.button
                onClick={() => setShowAroPopup(true)}
                className="relative flex-shrink-0 h-14 rounded-2xl px-5 py-2.5 overflow-hidden backdrop-blur-md transition-all duration-300 hover:scale-105 cursor-pointer"
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

      {/* ======== Main Timeline - Premium Glass Container ======== */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 overflow-hidden px-8 md:pl-32 md:pr-10">
        
        {/* Ambient Glow Effects */}
        <div className="absolute top-0 left-1/4 w-96 h-64 rounded-full blur-3xl opacity-[0.03] pointer-events-none" style={{ background: C.cyan }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-48 rounded-full blur-3xl opacity-[0.02] pointer-events-none" style={{ background: C.purple }} />
        
        {/* Time Axis Header - Premium Glass */}
        <div 
          className="flex flex-shrink-0 rounded-t-2xl backdrop-blur-xl relative overflow-hidden" 
          style={{ 
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.7) 100%)', 
            borderBottom: `1px solid ${C.border}`,
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
          }}
        >
          {/* Subtle top gradient line */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${C.cyan}30, transparent)` }} />
          
          {/* Room label header */}
          <div 
            className="flex-shrink-0 flex items-center px-5 gap-3" 
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
          
          {/* Time markers - Premium style with elegant grid */}
          <div className="flex-1 overflow-hidden" ref={timelineRef}>
            <div className="flex items-center h-12 relative w-full">
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
        <div className="flex-1 min-h-0 overflow-hidden rounded-b-2xl" ref={rowsContainerRef}>
          <div 
            className="relative w-full h-full"
            ref={scrollContainerRef}
            style={{
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
                  {/* Glow effect */}
                  <div 
                    className="absolute -left-3 top-0 bottom-0 w-6"
                    style={{ 
                      background: `linear-gradient(90deg, transparent, ${C.red}15, transparent)`,
                    }}
                  />
                  {/* Main line */}
                  <motion.div 
                    className="absolute -left-[1px] top-0 bottom-0 w-[2px] rounded-full"
                    style={{ 
                      background: `linear-gradient(to bottom, ${C.red}, ${C.red}80)`,
                      boxShadow: `0 0 8px ${C.red}, 0 0 16px ${C.red}50`,
                    }}
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  {/* Top dot */}
                  <motion.div 
                    className="absolute -left-1 -top-1 w-2 h-2 rounded-full"
                    style={{ 
                      background: C.red,
                      boxShadow: `0 0 8px ${C.red}`,
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Room Rows */}
            <div className="flex flex-col gap-1.5 py-2">
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
                      ? `linear-gradient(135deg, ${stepColor}08 0%, transparent 100%)`
                      : C.bgSurface,
                    border: room.isLocked 
                      ? `1.5px solid rgba(6, 182, 212, 0.4)`
                      : `1px solid ${isActive ? `${stepColor}20` : C.border}`,
                    boxShadow: isActive ? `inset 0 1px 0 rgba(255,255,255,0.03)` : 'none',
                  }}
                  onClick={() => setSelectedRoom(room)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: roomIndex * 0.03 }}
                  whileHover={{ 
                    borderColor: isActive ? `${stepColor}40` : C.borderHover,
                    boxShadow: isActive ? `0 0 20px ${stepColor}15` : '0 4px 20px rgba(0,0,0,0.2)',
                  }}
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
                  
                  {/* Room Label - Premium glass panel */}
                  <div 
                    className="flex-shrink-0 flex items-center gap-3 pl-4 pr-3 min-h-0 overflow-hidden transition-all duration-200" 
                    style={{ 
                      width: ROOM_LABEL_WIDTH, 
                      minWidth: ROOM_LABEL_WIDTH, 
                      borderRight: `1px solid ${C.border}`,
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
                        <span className="text-[7px] font-bold tracking-wider" style={{ color: C.green }}>NA SÁLE</span>
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
                          className="flex-shrink-0 w-2 h-2 rounded-full"
                          style={{ 
                            background: stepColor,
                            boxShadow: `0 0 8px ${stepColor}`,
                          }}
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}

                      {/* Room name and details */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-sm font-semibold tracking-tight text-white truncate">
                            {room.name}
                          </p>
                        </div>
                        {room.department && (
                          <p className="text-[10px] text-white/40 truncate mt-0.5">
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
                    
                    {/* Locked room overlay with icon */}
                    {room.isLocked && (
                      <div className="absolute inset-0 flex items-center justify-end pr-8 z-20 pointer-events-none">
                        <span className="text-sm font-bold uppercase tracking-widest text-white opacity-75">
                          UZAMČENO
                        </span>
                      </div>
                    )}
                    {/* Hour grid lines - Premium gradient */}
                    {TIME_MARKERS.slice(0, -1).map((hour, i) => {
                      const displayHour = hour % 24;
                      const isNight = displayHour >= 19 || displayHour < 7;
                      const isMajor = displayHour % 3 === 0;
                      return (
                        <div 
                          key={i} 
                          className="absolute top-0 bottom-0 w-px" 
                          style={{ 
                            left: `${(i / TIMELINE_HOURS) * 100}%`,
                            background: isMajor 
                              ? `linear-gradient(to bottom, ${C.cyan}15, transparent)`
                              : isNight 
                                ? 'rgba(255,255,255,0.02)' 
                                : 'rgba(255,255,255,0.04)'
                          }} 
                        />
                      );
                    })}

                    {/* Completed operations - Premium glass cards */}
                    {(() => {
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
                              background: isContinuingOp 
                                ? `linear-gradient(135deg, ${C.green}45 0%, ${C.green}30 100%)`
                                : isRoomReady
                                  ? `linear-gradient(135deg, ${C.blue}55 0%, ${C.cyan}35 100%)`
                                  : `linear-gradient(135deg, ${C.slate}25 0%, ${C.slate}15 100%)`,
                              border: `2px solid ${isContinuingOp ? `${C.green}60` : isRoomReady ? `${C.blue}70` : `${C.slate}35`}`,
                              boxShadow: isRoomReady 
                                ? `inset 0 1px 0 rgba(255,255,255,0.15), 0 0 16px ${C.blue}40, 0 0 32px ${C.blue}20`
                                : isContinuingOp
                                  ? `inset 0 1px 0 rgba(255,255,255,0.12), 0 0 12px ${C.green}30`
                                  : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                            }}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: opIdx * 0.05 }}
                          >
                              {/* Completed operation segments with colors from database context */}
                              {operation.statusHistory && operation.statusHistory.length > 0 && (
                                <div className="absolute inset-0 flex overflow-hidden rounded-md">
                                  {(() => {
                                    // KLÍČOVÉ: `stepIndex` v room_status_history se ukládá jako
                                    // POZICE v poli `activeDbStatuses` (kompaktní 0..N po vyfiltrování
                                    // neaktivních statusů) — viz RoomDetail.changeStep → App.updateRoomStep.
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
                                          className="absolute top-0 bottom-0 transition-all duration-300 hover:brightness-110"
                                          style={{
                                            left: `${Math.max(0, segLeftPct)}%`,
                                            width: `${Math.max(0.5, segWidthPct)}%`,
                                            background: `linear-gradient(180deg, ${phaseColor}cc 0%, ${phaseColor}88 100%)`,
                                            borderRight: idx < operation.statusHistory.length - 1 ? `1px solid rgba(0,0,0,0.35)` : 'none',
                                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.22), 0 0 12px ${phaseColor}40`,
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
                              
                              {/* Label for operation - RESTORED per Medrox design */}
                              <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                {position.width > 6 && (
                                  <span className={`text-[10px] font-semibold truncate uppercase tracking-wide ${
                                    isContinuingOp ? 'text-white' : 'text-white/50'
                                  }`}>
                                    {isContinuingOp ? 'POKRAČUJÍCÍ VÝKON' : 'Dokončeno'}
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
                          className="absolute top-1 bottom-1 rounded-md flex items-center justify-between px-3"
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
                    {isActive && shouldShowBar && boxWidthPct > 0 && (
                      <motion.div
                        className="absolute top-1.5 bottom-1.5 overflow-hidden rounded-xl"
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
                      >
                        {/* Animated colored left border with glow */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                          style={{ 
                            background: `linear-gradient(to bottom, ${stepColor}, ${stepColor}cc)`,
                            boxShadow: `0 0 12px ${stepColor}60, 0 0 24px ${stepColor}30`,
                          }}
                        />
                        
                        {/* Premium progress bar with gradient */}
                        <div className="absolute left-1 right-0 top-0 bottom-0 overflow-hidden rounded-r-xl">
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
                                className="h-full relative"
                                style={{
                                  width: `${progressPct}%`,
                                  background: `linear-gradient(180deg, ${stepColor}50 0%, ${stepColor}25 100%)`,
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
                            );
                          })()}
                        </div>

                        {/* "Prepared" Badge - Shows when room has status history (is in operation or completed) */}
                        {(() => {
                          const hasStatusHistory = room.statusHistory && room.statusHistory.length > 0;
                          const isPrepared = hasStatusHistory || (room.currentStepIndex && room.currentStepIndex > 0);
                          
                          if (isPrepared && !isActive && !isFree) {
                            return (
                              <motion.div
                                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                                style={{
                                  background: `linear-gradient(135deg, ${C.green}25 0%, ${C.green}12 100%)`,
                                  border: `1px solid ${C.green}40`,
                                  boxShadow: `0 0 12px ${C.green}20, inset 0 1px 2px rgba(255,255,255,0.1)`,
                                }}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                                whileHover={{ 
                                  boxShadow: `0 0 16px ${C.green}40, inset 0 1px 2px rgba(255,255,255,0.1)`
                                }}
                              >
                                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.green }} />
                                <span className="text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: C.green }}>
                                  Připraven
                                </span>
                              </motion.div>
                            );
                          }
                          return null;
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

                    {/* Free room indicator - Premium glass card */}
                    {isFree && (
                      <motion.div 
                        className="absolute inset-y-1.5 left-3 right-3 rounded-xl flex items-center overflow-hidden"
                        style={{ 
                          background: `linear-gradient(135deg, ${C.bgSurface} 0%, ${C.bgCard} 100%)`,
                          border: `1px solid ${C.green}20`,
                          boxShadow: `0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)`,
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {/* Green glowing left border */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                          style={{ 
                            background: `linear-gradient(to bottom, ${C.green}, ${C.green}80)`,
                            boxShadow: `0 0 8px ${C.green}40`,
                          }}
                        />
                        <div className="flex items-center gap-4 pl-5 pr-4">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ 
                              background: `linear-gradient(135deg, ${C.green}25 0%, ${C.green}10 100%)`,
                              border: `1px solid ${C.green}30`,
                            }}
                          >
                            <CheckCircle className="w-4 h-4" style={{ color: C.green }} />
                          </div>
                          <div className="flex flex-col">
                            <p className="text-xs font-semibold text-white/85">{stepName}</p>
                            <p className="text-[9px] text-white/40">Ready for operation</p>
                          </div>
                        </div>
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
                          className="absolute top-0 bottom-0 w-0.5 z-20"
                          style={{
                            left: `${endPercent}%`,
                            background: 'linear-gradient(180deg, transparent 0%, #F97316 20%, #F97316 80%, transparent 100%)',
                          }}
                        >
                          {/* End time label */}
                          <div
                            className="absolute -top-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap flex items-center gap-1"
                            style={{
                              background: 'rgba(249, 115, 22, 0.2)',
                              border: '1px solid rgba(249, 115, 22, 0.4)',
                              color: '#F97316',
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
    className={`relative flex-shrink-0 h-14 rounded-2xl px-4 py-2.5 overflow-hidden backdrop-blur-xl cursor-pointer`}
    style={{
      background: glow
        ? `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)`
        : `linear-gradient(135deg, ${C.bgElevated} 0%, ${C.bgSurface} 100%)`,
      border: glow ? `1px solid ${color}40` : `1px solid ${C.border}`,
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

