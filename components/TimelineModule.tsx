import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

const HOUR_WIDTH = 80;
const ROOM_LABEL_WIDTH = 180;
const TIME_MARKERS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7];
const TOTAL_WIDTH = 24 * HOUR_WIDTH;

const getMinutesFrom7 = (date: Date) => {
  const h = date.getHours();
  const m = date.getMinutes();
  return h >= 7 ? (h - 7) * 60 + m : (h + 17) * 60 + m;
};

const getTimePosition = (date: Date) => (getMinutesFrom7(date) / (24 * 60)) * TOTAL_WIDTH;

const hourLabel = (h: number) => {
  const display = h === 0 ? '24' : h < 10 ? `0${h}` : `${h}`;
  return `${display}:00`;
};

const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const nowPosition = getTimePosition(currentTime);

  // Auto-scroll to "now" on first render
  useEffect(() => {
    if (scrollContainerRef.current && !hasScrolledRef.current) {
      const container = scrollContainerRef.current;
      const scrollTarget = nowPosition - container.clientWidth / 3;
      container.scrollLeft = Math.max(0, scrollTarget);
      hasScrolledRef.current = true;
    }
  }, [nowPosition]);

  // Determine which hours are "work hours" (7-19) vs night
  const isWorkHour = (h: number) => h >= 7 && h < 19;

  return (
    <div className="w-full h-full text-white overflow-hidden flex flex-col relative">
      {/* Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=2000"
          alt=""
          className="w-full h-full object-cover opacity-10 grayscale scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_transparent_15%,_rgba(0,0,0,0.92)_80%)]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex flex-col lg:flex-row items-center lg:items-end justify-between gap-6 px-8 md:pl-32 md:pr-10 py-8 flex-shrink-0">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <CalendarDays className="w-4 h-4 text-[#00D8C1]" />
            <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">OPERATINGROOM CONTROL</p>
          </div>
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
            TIMELINE <span className="text-white/20">• AKTUALNI STAVY SALU</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="hidden xl:flex items-center gap-2">
            {WORKFLOW_STEPS.map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
                style={{ backgroundColor: `${step.color}15` }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: step.color }} />
                <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: `${step.color}cc` }}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
          {/* Clock */}
          <div className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] border border-white/10 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl">
            <Clock className="w-4 h-4 text-[#00D8C1]" />
            <span className="text-sm font-mono font-bold tracking-widest text-white">
              {currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </header>

      {/* Timeline Content */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-8 md:pl-32 md:pr-10 pb-4 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          {/* Scrollable container */}
          <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden relative">
            <div className="min-w-max h-full flex flex-col">
              
              {/* Time axis header */}
              <div className="flex flex-shrink-0 sticky top-0 z-20 bg-black/60 backdrop-blur-xl border-b border-white/[0.08]">
                {/* Empty label column */}
                <div className="flex-shrink-0 sticky left-0 z-30 bg-black/80 backdrop-blur-xl" style={{ width: ROOM_LABEL_WIDTH }}>
                  <div className="h-10 flex items-center px-4">
                    <span className="text-[9px] font-black tracking-[0.2em] uppercase text-white/30">SAL / CAS</span>
                  </div>
                </div>
                {/* Hour markers */}
                <div className="relative h-10" style={{ width: TOTAL_WIDTH }}>
                  {TIME_MARKERS.map((hour, i) => {
                    const isLast = i === TIME_MARKERS.length - 1;
                    const work = isWorkHour(hour);
                    return (
                      <div
                        key={`header-${hour}-${i}`}
                        className="absolute top-0 h-full flex flex-col justify-end"
                        style={{ left: i * HOUR_WIDTH, width: isLast ? 0 : HOUR_WIDTH }}
                      >
                        {/* Hour background tint for work/night */}
                        {!isLast && (
                          <div
                            className="absolute inset-0"
                            style={{ backgroundColor: work ? 'rgba(0,216,193,0.03)' : 'rgba(91,101,220,0.03)' }}
                          />
                        )}
                        {/* Hour label */}
                        <div className="relative flex items-center h-full">
                          <div className={`w-px h-full ${work ? 'bg-white/[0.08]' : 'bg-white/[0.04]'}`} />
                          <span className={`text-[9px] font-mono font-semibold pl-1.5 ${work ? 'text-white/50' : 'text-white/25'}`}>
                            {hourLabel(hour)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {/* 30-minute sub-markers */}
                  {TIME_MARKERS.slice(0, -1).map((_, i) => (
                    <div
                      key={`half-${i}`}
                      className="absolute top-1/2 bottom-0 w-px bg-white/[0.04]"
                      style={{ left: i * HOUR_WIDTH + HOUR_WIDTH / 2 }}
                    />
                  ))}
                </div>
              </div>

              {/* Room rows */}
              <div className="flex-1 min-h-0 flex flex-col relative">
                {/* Now line */}
                <AnimatePresence>
                  {nowPosition >= 0 && nowPosition <= TOTAL_WIDTH && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute top-0 bottom-0 z-30 pointer-events-none"
                      style={{ left: ROOM_LABEL_WIDTH + nowPosition }}
                    >
                      {/* Glow line */}
                      <div className="absolute -left-px top-0 bottom-0 w-[2px]" style={{ background: 'linear-gradient(to bottom, #00D8C1, #00D8C180, #00D8C140)' }} />
                      {/* Glow spread */}
                      <div className="absolute -left-3 top-0 bottom-0 w-6 bg-[#00D8C1] opacity-[0.06] blur-md" />
                      {/* Top indicator with current time */}
                      <div className="absolute -top-[1px] left-1/2 -translate-x-1/2">
                        <div className="relative flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-[#00D8C1] shadow-[0_0_12px_#00D8C1,0_0_24px_#00D8C160]" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Room rows content */}
                {rooms.map((room, roomIndex) => {
                  const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
                  const step = WORKFLOW_STEPS[stepIndex];
                  const themeColor = room.isEmergency ? '#FF3B30' : (room.isLocked ? '#FBBF24' : step.color);

                  // Box start
                  const startTimeParts = room.currentProcedure?.startTime?.split(':');
                  const startDate = new Date();
                  if (startTimeParts && startTimeParts.length === 2) {
                    startDate.setHours(parseInt(startTimeParts[0], 10), parseInt(startTimeParts[1], 10), 0, 0);
                  }
                  const boxLeft = getTimePosition(startDate);

                  // Box end
                  let boxRight: number;
                  if (room.estimatedEndTime) {
                    boxRight = getTimePosition(new Date(room.estimatedEndTime));
                  } else if (room.currentProcedure?.estimatedDuration) {
                    const endDate = new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000);
                    boxRight = getTimePosition(endDate);
                  } else {
                    boxRight = boxLeft + 120;
                  }
                  const boxWidth = Math.max(48, boxRight - boxLeft);

                  // Progress within box (how far is "now" between start and end)
                  const progressRatio = Math.max(0, Math.min(1, (nowPosition - boxLeft) / boxWidth));

                  return (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: roomIndex * 0.02, duration: 0.3 }}
                      className="flex items-stretch flex-1 min-h-[32px] border-b border-white/[0.04] last:border-b-0 group hover:bg-white/[0.02] transition-colors duration-200"
                    >
                      {/* Room label - sticky */}
                      <div
                        className="flex-shrink-0 px-4 flex items-center gap-3 border-r border-white/[0.06] min-w-0 sticky left-0 z-20 bg-black/60 backdrop-blur-xl group-hover:bg-white/[0.03] transition-colors"
                        style={{ width: ROOM_LABEL_WIDTH }}
                      >
                        {/* Status dot */}
                        <div className="relative flex-shrink-0">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColor }} />
                          {(room.isEmergency || stepIndex < 6) && (
                            <motion.div
                              className="absolute inset-0 rounded-full"
                              style={{ backgroundColor: themeColor }}
                              animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold tracking-tight uppercase text-white/80 truncate leading-tight">{room.name}</p>
                          <p className="text-[8px] font-medium tracking-wider uppercase text-white/30 truncate">{room.department}</p>
                        </div>
                        {(room.isEmergency || room.isLocked) && (
                          <span
                            className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                              room.isEmergency ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {room.isEmergency ? 'SOS' : 'LOCK'}
                          </span>
                        )}
                      </div>

                      {/* Timeline area */}
                      <div className="relative flex-grow min-w-0" style={{ width: TOTAL_WIDTH }}>
                        {/* Hour grid lines */}
                        {TIME_MARKERS.slice(0, -1).map((hour, i) => (
                          <div
                            key={i}
                            className={`absolute top-0 bottom-0 w-px ${isWorkHour(hour) ? 'bg-white/[0.04]' : 'bg-white/[0.02]'}`}
                            style={{ left: i * HOUR_WIDTH }}
                          />
                        ))}
                        {/* Half-hour grid lines */}
                        {TIME_MARKERS.slice(0, -1).map((_, i) => (
                          <div
                            key={`sub-${i}`}
                            className="absolute top-0 bottom-0 w-px bg-white/[0.015]"
                            style={{ left: i * HOUR_WIDTH + HOUR_WIDTH / 2 }}
                          />
                        ))}

                        {/* Procedure block */}
                        <motion.div
                          initial={{ opacity: 0, scaleX: 0.9 }}
                          animate={{ opacity: 1, scaleX: 1 }}
                          transition={{ duration: 0.4, delay: roomIndex * 0.02 }}
                          className="absolute top-1 bottom-1 rounded-lg overflow-hidden flex items-center cursor-default"
                          style={{
                            left: Math.max(0, boxLeft),
                            width: boxWidth,
                            transformOrigin: 'left center',
                          }}
                        >
                          {/* Background */}
                          <div
                            className="absolute inset-0 rounded-lg"
                            style={{ backgroundColor: `${themeColor}18`, border: `1px solid ${themeColor}30` }}
                          />
                          {/* Progress fill */}
                          <motion.div
                            className="absolute top-0 bottom-0 left-0 rounded-lg"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressRatio * 100}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            style={{ backgroundColor: `${themeColor}25` }}
                          />
                          {/* Left accent bar */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
                            style={{ backgroundColor: themeColor }}
                          />
                          {/* Content */}
                          <div className="relative flex items-center gap-2 px-3 min-w-0 flex-1 z-10">
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-[9px] font-bold uppercase tracking-wide truncate leading-tight" style={{ color: themeColor }}>
                                {room.isEmergency ? 'Nouzovy' : (room.isLocked ? 'Uzamceno' : step.title)}
                              </span>
                              {room.currentPatient && !room.isEmergency && !room.isLocked && (
                                <span className="text-[8px] text-white/40 truncate">{room.currentPatient.name}</span>
                              )}
                            </div>
                            {/* Time labels at edges */}
                            {boxWidth > 100 && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-[8px] font-mono text-white/30">
                                  {room.currentProcedure?.startTime}
                                </span>
                                <span className="text-[7px] text-white/20">-</span>
                                <span className="text-[8px] font-mono" style={{ color: `${themeColor}90` }}>
                                  {room.estimatedEndTime
                                    ? new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                                    : room.currentProcedure?.estimatedDuration
                                      ? new Date(startDate.getTime() + room.currentProcedure.estimatedDuration * 60 * 1000).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
                                      : ''
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineModule;
