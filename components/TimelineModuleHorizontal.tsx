import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import MobileTimelineView from './mobile/MobileTimelineView';
import { 
  Clock, AlertTriangle, Activity, Lock, Info, X, ChevronRight, 
  Pause, AlertCircle, CheckCircle, Loader2
} from 'lucide-react';

// ========== DESIGN TOKENS ==========
const C = {
  accent: '#00D9FF',
  green: '#00F5A0',
  orange: '#FF9F43',
  red: '#FF6B6B',
  purple: '#A78BFA',
  yellow: '#FFE66D',
  
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.15)',
  surface: 'rgba(255,255,255,0.03)',
  surface2: 'rgba(255,255,255,0.06)',
  glass: 'rgba(255,255,255,0.04)',
  glassHover: 'rgba(255,255,255,0.08)',
  
  muted: 'rgba(255,255,255,0.45)',
  text: 'rgba(255,255,255,0.85)',
  textHi: 'rgba(255,255,255,0.95)',
};

// ========== CONSTANTS ==========
const TIMELINE_START_HOUR = 7;
const TIMELINE_END_HOUR = 31;
const TIMELINE_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR;
const SIDEBAR_WIDTH = 240;

const ROOM_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  orange: { bg: '#FF9F43', border: '#FFB76B', text: '#FFF' },
  purple: { bg: '#A78BFA', border: '#C4B5FD', text: '#FFF' },
  pink: { bg: '#F472B6', border: '#F9A8D4', text: '#FFF' },
  blue: { bg: '#60A5FA', border: '#93C5FD', text: '#FFF' },
  green: { bg: '#00F5A0', border: '#5FFFC1', text: '#000' },
  red: { bg: '#FF6B6B', border: '#FF9999', text: '#FFF' },
  cyan: { bg: '#00D9FF', border: '#5AE8FF', text: '#000' },
};

const ROOM_COLOR_ORDER = ['orange', 'purple', 'pink', 'blue', 'green', 'red', 'cyan'] as const;

// ========== HELPER FUNCTIONS ==========
const hourLabel = (hour: number): string => {
  const actualHour = TIMELINE_START_HOUR + hour;
  const displayHour = actualHour % 24;
  return `${displayHour < 10 ? '0' : ''}${displayHour}:00`;
};

const getTimePercent = (date: Date): number => {
  const hours = date.getHours() + date.getMinutes() / 60;
  let percent = ((hours - TIMELINE_START_HOUR) / TIMELINE_HOURS) * 100;
  if (percent < 0) percent += (24 / TIMELINE_HOURS) * 100;
  return Math.max(0, Math.min(100, percent));
};

const getOperationPosition = (startDate: Date, endDate: Date, currentTime: Date) => {
  const windowStart = new Date(currentTime);
  windowStart.setHours(TIMELINE_START_HOUR, 0, 0, 0);
  
  if (currentTime.getHours() < TIMELINE_START_HOUR) {
    windowStart.setDate(windowStart.getDate() - 1);
  }
  
  const diffMsStart = startDate.getTime() - windowStart.getTime();
  const diffMsEnd = endDate.getTime() - windowStart.getTime();
  
  let leftPct = (diffMsStart / (1000 * 60 * 60 * TIMELINE_HOURS)) * 100;
  let endPct = (diffMsEnd / (1000 * 60 * 60 * TIMELINE_HOURS)) * 100;
  
  const isContinuing = leftPct < 0;
  if (leftPct < 0) leftPct = 0;
  
  const exceedsBoundary = endPct > 100;
  if (endPct > 100) endPct = 100;
  
  return {
    left: leftPct,
    width: Math.max(0.5, endPct - leftPct),
    exceedsBoundary,
    isContinuing
  };
};

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

function TimelineModuleImpl({ rooms }: TimelineModuleProps) {
  const { workflowStatuses } = useWorkflowStatusesContext();
  const activeStatuses = workflowStatuses;
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const statusByRoom = useMemo(() => {
    const map: Record<string, typeof activeStatuses[number]> = {};
    activeStatuses.forEach((status) => {
      if (status.operating_room_id) {
        map[status.operating_room_id] = status;
      }
    });
    return map;
  }, [activeStatuses]);

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      const aNum = parseInt(a.id.replace(/\D/g, ''));
      const bNum = parseInt(b.id.replace(/\D/g, ''));
      return aNum - bNum;
    });
  }, [rooms]);

  const getRoomColor = (index: number) => {
    const colorKey = ROOM_COLOR_ORDER[index % ROOM_COLOR_ORDER.length];
    return ROOM_COLORS[colorKey];
  };

  const currentTimePercent = getTimePercent(currentTime);

  return (
    <div className="w-full h-full text-white overflow-hidden flex flex-col relative" style={{ background: 'linear-gradient(135deg, rgba(0,10,20,0.98) 0%, rgba(0,20,40,0.92) 100%)' }}>
      
      {/* ======== MOBILE VIEW ======== */}
      <div className="md:hidden flex-1">
        <MobileTimelineView
          rooms={sortedRooms}
          statusByOrderIndex={{}}
          activeStatuses={activeStatuses}
          currentTime={currentTime}
          stats={{ operations: 0, cleaning: 0, free: 0, completed: 0 }}
          mobileView="list"
          onViewChange={() => {}}
          onSelectRoom={() => {}}
          getRemainingTime={() => ''}
        />
      </div>

      {/* ======== DESKTOP HORIZONTAL TIMELINE ======== */}
      <div className="hidden md:flex md:flex-1 md:flex-col md:overflow-hidden">
        
        {/* Time header with current time indicator */}
        <div className="flex-shrink-0 flex items-stretch border-b" style={{ borderBottomColor: C.border }}>
          
          {/* Sidebar placeholder */}
          <div style={{ width: SIDEBAR_WIDTH }} className="border-r flex-shrink-0" style={{ borderRightColor: C.border }} />
          
          {/* Time markers */}
          <div className="flex-1 flex relative h-16 px-4 items-end overflow-hidden">
            {Array.from({ length: 25 }).map((_, i) => (
              <div 
                key={i}
                className="flex-1 border-r pb-3 text-center text-xs"
                style={{ borderRightColor: C.border }}
              >
                <span style={{ color: C.muted }}>{hourLabel(i)}</span>
              </div>
            ))}
            
            {/* Current time indicator */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-red-500 to-transparent"
              style={{ left: `calc(${SIDEBAR_WIDTH}px + ${currentTimePercent}% * (100% - ${SIDEBAR_WIDTH}px) / 100)` }}
            />
          </div>
        </div>

      {/* Rooms timeline */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" ref={scrollContainerRef}>
        <div className="flex">
          
          {/* Left Sidebar - Room labels */}
          <div style={{ width: SIDEBAR_WIDTH }} className="flex-shrink-0 border-r" style={{ borderRightColor: C.border }}>
            <div className="space-y-1 p-3">
              {sortedRooms.map((room, idx) => {
                const status = statusByRoom[room.id];
                const roomColor = getRoomColor(idx);
                const isActive = status?.status === 'active';
                
                return (
                  <motion.div 
                    key={room.id}
                    className="px-3 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer"
                    style={{
                      background: `${roomColor.bg}20`,
                      border: `1px solid ${roomColor.bg}${isActive ? '80' : '40'}`,
                    }}
                    whileHover={{ scale: 1.02, borderColor: roomColor.bg }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <motion.div 
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: isActive ? C.green : C.muted }}
                        animate={isActive ? { scale: [1, 1.3, 1] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <span className="font-semibold">{room.id}</span>
                      {isActive && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${C.green}30`, color: C.green }}>
                          LIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: C.muted }}>
                      {room.specialization}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Timeline bars */}
          <div className="flex-1 px-4 space-y-1 py-3 overflow-x-auto">
            {sortedRooms.map((room, idx) => {
              const status = statusByRoom[room.id];
              const roomColor = getRoomColor(idx);
              const isActive = status?.status === 'active';
              
              if (!status) return (
                <div key={room.id} className="relative h-12 flex items-center">
                  <div className="absolute inset-0 rounded-lg" style={{ background: `${roomColor.bg}05` }} />
                </div>
              );
              
              const position = getOperationPosition(
                new Date(status.start_datetime || Date.now()),
                new Date(status.end_datetime || Date.now()),
                currentTime
              );
              
              return (
                <div key={room.id} className="relative h-12 flex items-center group">
                  {/* Operation bar */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 rounded-lg border transition-all duration-200 group cursor-pointer overflow-hidden"
                    style={{
                      backgroundColor: isActive ? `${roomColor.bg}A0` : `${roomColor.bg}60`,
                      borderColor: roomColor.border,
                      height: '32px',
                      left: `${position.left}%`,
                      width: `${position.width}%`,
                      minWidth: '16px',
                    }}
                    whileHover={{ scale: 1.08, boxShadow: `0 0 24px ${roomColor.bg}80` }}
                  >
                    {/* LIVE indicator - pulsing dot */}
                    {isActive && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-green-300"
                        style={{ backgroundColor: C.green }}
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                    
                    {/* Status indicator bar on left edge */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: isActive ? C.green : C.yellow }}
                    />
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default TimelineModuleImpl;
