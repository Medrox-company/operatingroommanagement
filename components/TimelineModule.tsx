import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

const HOUR_WIDTH = 60;
const ROOM_LABEL_WIDTH = 200;
// Časová osa 7:00 → 7:00 (24 h); hodiny v pořadí 7,8,...,23,0,1,...,6,7
const TIME_MARKERS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7];
const TOTAL_WIDTH = 24 * HOUR_WIDTH;

const getNowPosition = (date: Date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const minutesFrom7 = hours >= 7 ? (hours - 7) * 60 + minutes : (hours + 17) * 60 + minutes;
  return (minutesFrom7 / (24 * 60)) * TOTAL_WIDTH;
};

const hourLabel = (h: number) => (h === 0 ? '24' : h < 10 ? `0${h}` : `${h}`) + ':00';

const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const nowPosition = getNowPosition(currentTime);

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
        <div className="absolute -left-20 top-0 bottom-0 w-[400px] bg-[#5B65DC] blur-[120px] opacity-20" />
        <div className="absolute -right-20 top-0 bottom-0 w-[400px] bg-[#00D8C1] blur-[120px] opacity-15" />
      </div>

      {/* Hlavička — stejná pozice a grafika jako na dashboardu (px-8 md:pl-32 md:pr-10) */}
      <header className="relative z-10 flex flex-col lg:flex-row items-center lg:items-end justify-between gap-6 px-8 md:pl-32 md:pr-10 py-10 flex-shrink-0">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <CalendarDays className="w-4 h-4 text-[#00D8C1]" />
            <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">OPERATINGROOM CONTROL</p>
          </div>
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
            TIMELINE <span className="text-white/20">• AKTUÁLNÍ STAVY SÁLŮ</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] border border-white/10 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl">
          <Clock className="w-4 h-4 text-[#00D8C1]" />
          <span className="text-sm font-mono font-bold tracking-widest text-white">
            {currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </header>

      {/* Legenda — jeden řádek, drobná */}
      <div className="relative z-10 flex items-center gap-3 px-8 md:pl-32 md:pr-10 py-2 flex-shrink-0">
        <span className="text-[9px] font-black text-white/40 tracking-widest uppercase shrink-0">Statusy</span>
        {WORKFLOW_STEPS.map((step, i) => (
          <div
            key={i}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md border bg-black/20 shrink-0"
            style={{ borderColor: `${step.color}40`, backgroundColor: `${step.color}12` }}
          >
            <step.Icon className="w-3 h-3" style={{ color: step.color }} />
            <span className="text-[8px] font-bold uppercase tracking-wider truncate max-w-[72px]" style={{ color: step.color }}>
              {step.title}
            </span>
          </div>
        ))}
      </div>

      {/* Timeline — bez rolování, všechny sály se vejdou */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-8 md:pl-32 md:pr-10 pb-4 overflow-hidden">
        {/* Časová osa 7:00–7:00 */}
        <div
          className="flex border-b border-white/10 pb-1.5 mb-1 flex-shrink-0"
          style={{ paddingLeft: ROOM_LABEL_WIDTH }}
        >
          <div className="relative h-6" style={{ width: TOTAL_WIDTH }}>
            {TIME_MARKERS.map((hour, i) => (
              <div
                key={`${hour}-${i}`}
                className="absolute top-0 text-[8px] font-mono font-medium text-white/40 border-l border-white/10 pl-0.5 h-full flex items-end"
                style={{ left: i * HOUR_WIDTH }}
              >
                {hourLabel(hour)}
              </div>
            ))}
          </div>
        </div>

        {/* Čára „teď“ */}
        {nowPosition >= 0 && nowPosition <= TOTAL_WIDTH && (
          <div
            className="absolute top-0 bottom-0 w-0.5 z-30 pointer-events-none"
            style={{
              left: ROOM_LABEL_WIDTH + nowPosition,
              background: '#00D8C1',
              boxShadow: '0 0 16px #00D8C1',
            }}
          >
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#00D8C1]" />
          </div>
        )}

        {/* Řádky sálů — flex-1 aby se vešly všechny bez scrollu */}
        <div className="flex-1 min-h-0 flex flex-col gap-1 overflow-hidden">
          {rooms.map((room, roomIndex) => {
            const stepIndex = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
            const step = WORKFLOW_STEPS[stepIndex];
            const themeColor = room.isEmergency ? '#FF3B30' : (room.isLocked ? '#FBBF24' : step.color);

            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: roomIndex * 0.01 }}
                className="flex items-stretch flex-1 min-h-[28px] rounded-lg overflow-hidden border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200"
              >
                <div
                  className="flex-shrink-0 px-3 flex flex-col justify-center border-r border-white/10 min-w-0"
                  style={{ width: ROOM_LABEL_WIDTH }}
                >
                  <p className="text-[8px] font-black tracking-wider uppercase text-white/40 truncate">{room.department}</p>
                  <p className="text-xs font-bold tracking-tight uppercase text-white/90 truncate">{room.name}</p>
                  {(room.isEmergency || room.isLocked) && (
                    <span
                      className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded mt-0.5 inline-block w-fit ${
                        room.isEmergency ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {room.isEmergency ? 'Nouzový' : 'Uzamčeno'}
                    </span>
                  )}
                </div>

                <div
                  className="relative flex-grow py-1 pr-2 min-w-0"
                  style={{ width: TOTAL_WIDTH }}
                >
                  {TIME_MARKERS.slice(0, -1).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-r border-white/5"
                      style={{ left: i * HOUR_WIDTH }}
                    />
                  ))}
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0.95 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-0.5 bottom-0.5 rounded-md border overflow-hidden backdrop-blur-md flex items-center gap-2 px-2 min-w-[120px]"
                    style={{
                      left: Math.max(4, nowPosition - 50),
                      width: 120,
                      backgroundColor: `${themeColor}28`,
                      borderColor: `${themeColor}60`,
                      boxShadow: `0 0 12px ${themeColor}25`,
                    }}
                  >
                    <step.Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: themeColor }} />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[8px] font-black uppercase tracking-wider truncate leading-tight" style={{ color: themeColor }}>
                        {room.isEmergency ? 'Nouzový' : (room.isLocked ? 'Uzamčeno' : step.title)}
                      </span>
                      {room.currentPatient && !room.isEmergency && !room.isLocked && (
                        <span className="text-[7px] text-white/50 truncate">{room.currentPatient.name}</span>
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
  );
};

export default TimelineModule;
