
import React, { memo, useMemo } from 'react';
import { OperatingRoom } from '../types';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { Biohazard, Clock, AlertCircle, Lock, Phone, BedDouble, User, Megaphone, ChevronRight } from 'lucide-react';

interface RoomCardProps {
  room: OperatingRoom;
  onClick?: () => void;
  onEmergency?: (e: React.MouseEvent) => void;
  onLock?: (e: React.MouseEvent) => void;
  /** Vyplní výšku buňky mřížky (desktop fit). Mobil = fixní výška. */
  fill?: boolean;
}

const RoomCard: React.FC<RoomCardProps> = memo(({ room, onClick, onEmergency, onLock, fill }) => {
  // Get workflow statuses from database context - already filtered and sorted
  const { workflowStatuses } = useWorkflowStatusesContext();
  
  // workflowStatuses is already filtered (active, non-special) and sorted by context
  // Add null safety
  const activeStatuses = workflowStatuses || [];
  
  // Filter completed operations for today (7:00 yesterday/today to 6:59 today/tomorrow)
  // The window is: if current time >= 7:00, count from 7:00 today to 6:59 tomorrow
  //                if current time < 7:00, count from 7:00 yesterday to 6:59 today
  const todayOperationCount = useMemo(() => {
    if (!room.completedOperations || room.completedOperations.length === 0) return 0;
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // Determine the start of the 24h window based on current time
    const startOfWindow = new Date(now);
    if (currentHour >= 7) {
      // After 7 AM - window starts at 7:00 today
      startOfWindow.setHours(7, 0, 0, 0);
    } else {
      // Before 7 AM - window starts at 7:00 yesterday
      startOfWindow.setDate(startOfWindow.getDate() - 1);
      startOfWindow.setHours(7, 0, 0, 0);
    }
    
    // End of window is 24h after start (6:59:59 next day)
    const endOfWindow = new Date(startOfWindow);
    endOfWindow.setDate(endOfWindow.getDate() + 1);
    endOfWindow.setHours(6, 59, 59, 999);
    
    const count = room.completedOperations.filter(op => {
      if (!op.endedAt) return false; // Use endedAt for completed operations
      const opEnd = new Date(op.endedAt);
      return opEnd >= startOfWindow && opEnd <= endOfWindow;
    }).length;
    
    return count;
  }, [room.completedOperations]);
  
  // Memoize computed values using database statuses
  const { currentStep, themeColor, shouldShowTime, strokeDasharray, strokeDashoffset } = useMemo(() => {
    const totalSteps = activeStatuses.length > 0 ? activeStatuses.length : 1;
    const safeIndex = Math.min(Math.max(0, room.currentStepIndex || 0), totalSteps - 1);
    const step = activeStatuses[safeIndex] || null;
    
    const currentStep = {
      title: step?.title || step?.name || 'Status',
      color: step?.accent_color || step?.color || '#6B7280',
    };
    
    const themeColor = room.isEmergency
      ? '#FF3B30'
      : (room.isLocked ? '#FBBF24' : (room.isPaused ? '#22D3EE' : currentStep.color));
    const progressPercent = ((safeIndex + 1) / totalSteps);
    
    // Don't show time for "Sal priprav*" and "Uklid" statuses (ASCII-safe)
    const statusName = (step?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isReadyStatus = statusName.includes('priprav');
    const isCleaningStatus = statusName.includes('uklid');
    const shouldShowTime = !isReadyStatus && !isCleaningStatus;
    
    const radius = 38;
    const strokeDasharray = 2 * Math.PI * radius;
    const strokeDashoffset = strokeDasharray * (1 - progressPercent);
    
    return { currentStep, themeColor, shouldShowTime, strokeDasharray, strokeDashoffset };
  }, [activeStatuses, room.currentStepIndex, room.isEmergency, room.isLocked, room.isPaused]);
  
  const radius = 38;
  const strokeWidth = 4;

  const center = 56;

  const handleAction = (e: React.MouseEvent, action?: (e: React.MouseEvent) => void) => {
    e.stopPropagation();
    if (action) action(e);
  };

  // Průběh kroků pro mobilní progress bar (místo středového čísla)
  const totalStepsAll = activeStatuses.length > 0 ? activeStatuses.length : 1;
  const safeIdxMobile = Math.min(Math.max(0, room.currentStepIndex || 0), totalStepsAll - 1);
  const progressPct = ((safeIdxMobile + 1) / totalStepsAll) * 100;
  const mobileRoomNumber = room.name.match(/\d+/)?.[0] || room.name.slice(0, 2).toUpperCase();

  return (
    <>
    {/* ===== MOBILE — prémiová karta sálu ===== */}
    <div
      onClick={onClick}
      className="mobile-dashboard-room-card md:hidden relative isolate w-full rounded-[24px] p-3.5 cursor-pointer active:scale-[0.98] transition-all duration-200 select-none overflow-hidden"
      style={{
        boxShadow: room.isEmergency ? '0 12px 28px rgba(229,72,77,0.18)' : 'var(--m-card-shadow-strong)',
        border: room.isEmergency
          ? '1.5px solid rgba(229,72,77,0.55)'
          : room.isLocked
          ? '1.5px solid rgba(245,158,11,0.5)'
          : '1px solid var(--m-border)',
      }}
    >
      <div
        aria-hidden
        className="absolute inset-x-8 top-0 h-[2px] rounded-full"
        style={{ background: `linear-gradient(90deg, transparent, ${themeColor}CC, transparent)` }}
      />
      <div
        aria-hidden
        className="absolute inset-y-5 left-0 w-[3px] rounded-r-full"
        style={{ background: themeColor, boxShadow: `0 0 16px ${themeColor}80` }}
      />
      <div
        aria-hidden
        className="absolute -right-9 -top-11 w-24 h-24 rounded-full blur-2xl pointer-events-none"
        style={{ background: themeColor, opacity: 0.11 }}
      />

      {/* Identita sálu */}
      <div className="relative z-10 flex items-start gap-3">
        <span
          className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 text-[13px] font-black tabular-nums"
          style={{
            color: themeColor,
            background: `${themeColor}1A`,
            border: `1px solid ${themeColor}42`,
            boxShadow: `inset 0 1px 0 var(--m-card-highlight)`,
          }}
        >
          {mobileRoomNumber}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-[14px] font-black uppercase truncate leading-tight tracking-[-0.02em]" style={{ color: 'var(--m-text-strong)' }}>
            {room.name}
          </h3>
          <p className="text-[9px] font-bold uppercase tracking-[0.13em] truncate mt-1" style={{ color: 'var(--m-muted)' }}>
            {room.department || 'Bez oddělení'}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {room.noticeMessage && (
          <span
            className="relative w-6 h-6 rounded-[9px] flex items-center justify-center shrink-0"
            style={{ background: 'rgba(var(--m-accent-rgb),0.10)' }}
            title="Čeká zpráva — otevři detail sálu"
          >
            <Megaphone className="w-3 h-3" style={{ color: 'var(--m-accent)' }} />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: '#E5484D' }} />
          </span>
          )}
          <ChevronRight className="w-4 h-4" style={{ color: 'var(--m-faint)' }} strokeWidth={2.2} />
        </div>
      </div>

      {/* Stav + průběh */}
      <div
        className="relative z-10 mt-3 rounded-[16px] px-3 py-2.5 overflow-hidden"
        style={{ background: `${themeColor}10`, border: `1px solid ${themeColor}30` }}
      >
        <div aria-hidden className="absolute inset-y-0 left-0 w-[2px]" style={{ background: themeColor }} />
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-2 text-[9.5px] font-extrabold uppercase tracking-[0.09em]" style={{ color: room.isEmergency || room.isLocked ? themeColor : 'var(--m-text-strong)' }}>
            <span className="relative flex w-2 h-2 shrink-0">
              {(room.isEmergency || (!room.isLocked && safeIdxMobile > 0)) && (
                <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: themeColor }} />
              )}
              <span className="relative w-2 h-2 rounded-full" style={{ background: themeColor }} />
            </span>
            <span className="truncate">
              {room.isEmergency
                ? 'Stav nouze'
                : room.isLocked
                ? 'Sál uzamčen'
                : room.isPaused
                ? `${currentStep.title} · Pauza`
                : currentStep.title}
            </span>
          </span>
          <span
            className="min-w-[38px] h-6 px-1.5 rounded-[9px] inline-flex items-center justify-center text-[10px] font-black tabular-nums shrink-0"
            style={{ color: themeColor, background: `${themeColor}18`, border: `1px solid ${themeColor}2E` }}
          >
            {Math.round(progressPct)}%
          </span>
        </div>

        <div className="mt-2 flex gap-1" aria-label={`Průběh ${Math.round(progressPct)} %`}>
          {Array.from({ length: totalStepsAll }, (_, index) => (
            <span
              key={index}
              className="h-1 flex-1 rounded-full transition-colors duration-300"
              style={{ background: index <= safeIdxMobile ? themeColor : 'var(--m-track)' }}
            />
          ))}
        </div>
      </div>

      {/* Personál, čas a rychlé akce */}
      <div className="relative z-10 mt-3 pt-2.5 flex items-center justify-between gap-2 border-t" style={{ borderColor: 'var(--m-border)' }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <User className="w-3 h-3 shrink-0" style={{ color: 'var(--m-muted)' }} strokeWidth={2.1} />
            <span className="text-[9.5px] font-bold uppercase tracking-[0.06em] truncate" style={{ color: 'var(--m-muted)' }}>
              {room?.staff?.doctor?.name?.split(' ').pop() || 'Neurčen'}
            </span>
          </div>
          {room.estimatedEndTime && shouldShowTime && (
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" style={{ color: themeColor }} strokeWidth={2.2} />
              <span className="text-[11px] font-extrabold tabular-nums" style={{ color: themeColor }}>
                {new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {room.isSeptic && <Biohazard className="w-3.5 h-3.5" style={{ color: '#E5484D' }} />}
          {room.patientCalledAt && !room.patientArrivedAt && <Phone className="w-3.5 h-3.5" style={{ color: 'var(--m-accent)' }} />}
          {room.patientArrivedAt && <BedDouble className="w-3.5 h-3.5" style={{ color: '#10B981' }} />}
          <button
            onClick={(e) => handleAction(e, onEmergency)}
            aria-label={room.isEmergency ? 'Zrušit stav nouze' : 'Vyhlásit stav nouze'}
            className="w-8 h-8 rounded-[11px] flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: room.isEmergency ? 'rgba(229,72,77,0.14)' : 'var(--m-card-2)', border: `1px solid ${room.isEmergency ? 'rgba(229,72,77,0.3)' : 'var(--m-border)'}` }}
          >
            <AlertCircle className="w-4 h-4" strokeWidth={2} style={{ color: room.isEmergency ? '#E5484D' : 'var(--m-muted)' }} />
          </button>
          <button
            onClick={(e) => handleAction(e, onLock)}
            aria-label={room.isLocked ? 'Odemknout sál' : 'Uzamknout sál'}
            className="w-8 h-8 rounded-[11px] flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: room.isLocked ? 'rgba(245,158,11,0.14)' : 'var(--m-card-2)', border: `1px solid ${room.isLocked ? 'rgba(245,158,11,0.3)' : 'var(--m-border)'}` }}
          >
            <Lock className="w-4 h-4" strokeWidth={2} style={{ color: room.isLocked ? '#F59E0B' : 'var(--m-muted)' }} />
          </button>
        </div>
      </div>
    </div>

    {/* ===== DESKTOP — původní karta ===== */}
    <div
      onClick={onClick}
      className={`hidden md:block relative group cursor-pointer w-full transition-transform duration-300 ease-out hover:-translate-y-1.5 active:scale-[0.99] ${fill ? 'h-full min-h-[140px]' : 'h-[260px] sm:h-[340px]'}`}
    >
      {/* Subtle State Pulse Aura (Emergency or Locked) */}
      {(room.isEmergency || room.isLocked) && (
        <div 
          className={`absolute -inset-1 z-0 rounded-[1.85rem] sm:rounded-[2.6rem] blur-xl pointer-events-none ${room.isEmergency ? 'bg-red-500/20' : 'bg-amber-500/10'}`}
        />
      )}

      {/* Main Card Container */}
      <div className={`absolute inset-0 z-0 rounded-[1.75rem] sm:rounded-[2.5rem] border shadow-[0_15px_35px_-10px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-[60px] transition-all duration-500 group-hover:shadow-[0_28px_55px_-12px_rgba(0,0,0,0.65)]
        ${room.isEmergency 
            ? 'bg-red-950/20 border-red-500/40' 
            : (room.isLocked 
                ? 'bg-amber-950/15 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)]' 
                : 'bg-white/[0.03] border-white/5 group-hover:bg-white/[0.06] group-hover:border-white/10')}
      `}>
        {/* Horní akcentní linka v barvě aktuálního stavu — jemný vizuální podpis sálu */}
        <div
          className="absolute inset-x-10 top-0 h-[2px] rounded-full transition-opacity duration-500 opacity-60 group-hover:opacity-100"
          style={{ background: `linear-gradient(to right, transparent, ${themeColor}, transparent)` }}
        />
        {room.isEmergency && (
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 via-transparent to-red-600/5 pointer-events-none" />
        )}
        {room.isLocked && (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/5 pointer-events-none" />
        )}
        
        {/* Static Glow Layer */}
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] pointer-events-none transition-opacity duration-1000"
          style={{ 
            backgroundColor: themeColor,
            opacity: (room.isEmergency || room.isLocked) ? 0.3 : 0.15 
          }}
        />
      </div>

      {/* Indikátor čekající zprávy od administrátora */}
      {room.noticeMessage && (
        <div className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 z-30" title="Čeká zpráva — otevři detail sálu">
          <span className="relative flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ background: 'rgba(34,211,238,0.35)' }} />
            <span className="relative inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full" style={{ background: 'rgba(34,211,238,0.18)', border: '1px solid rgba(34,211,238,0.5)' }}>
              <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#22D3EE' }} />
            </span>
          </span>
        </div>
      )}

      {/* Content Container */}
      <div className="relative h-full w-full z-10 p-3 sm:p-6 flex flex-col">

        {/* Header — centered */}
        <div className="w-full flex flex-col items-center text-center shrink-0">
          <p className={`text-[8px] sm:text-[9px] font-bold tracking-[0.2em] sm:tracking-[0.3em] uppercase leading-none mb-1 sm:mb-2 truncate max-w-full transition-colors
            ${room.isEmergency ? 'text-red-400' : (room.isLocked ? 'text-amber-400' : 'text-white/30')}
          `}>
            {room.department}
          </p>
          <h3 className={`text-sm sm:text-xl font-bold tracking-tight uppercase leading-none truncate max-w-full transition-colors
            ${(room.isEmergency || room.isLocked) ? 'text-white' : 'text-white/90 group-hover:text-white'}
          `}>
            {room.name}
          </h3>
        </div>

        {/* Central Content Wrapper */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden">
            <div className="relative flex items-center justify-center">
                {/* Static glow behind the circle - replaced motion for performance */}
                <div
                  className="absolute rounded-full blur-[40px] transition-all duration-500"
                  style={{ width: 80, height: 80, backgroundColor: themeColor, opacity: 0.25 }}
                />
                <svg
                  viewBox="0 0 112 112"
                  className="w-20 h-20 sm:w-28 sm:h-28 overflow-visible select-none flex-shrink-0"
                  style={{ transform: 'rotate(-90deg)' }}
                >
                    <circle 
                      cx={center} cy={center} r={radius} 
                      fill="none" 
                      stroke="white" 
                      strokeWidth="1.5" 
                      className="opacity-[0.03]" 
                    />
                    <circle 
                      cx={center} cy={center} r={radius} 
                      fill="none"
                      stroke={themeColor} 
                      strokeWidth={strokeWidth} 
                      strokeLinecap="round"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={room.isPaused ? 0 : strokeDashoffset}
                      className="transition-all duration-500"
                      style={{ filter: `drop-shadow(0 0 6px ${themeColor}99)` }}
                    />
                    {room.isPaused ? (
                      <text
                        x={center}
                        y={center}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#22D3EE"
                        className="text-4xl font-bold"
                        style={{ 
                          transform: 'rotate(90deg)', 
                          transformOrigin: `${center}px ${center}px`,
                          fontSize: '28px',
                          fontWeight: 900,
                          letterSpacing: '-0.05em'
                        }}
                      >
                        P
                      </text>
                    ) : (
                      <text
                        x={center}
                        y={center}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className={`text-4xl font-bold transition-colors ${(room.isEmergency || room.isLocked) ? 'fill-white' : 'fill-white/90'}`}
                        style={{ 
                            transform: 'rotate(90deg)', 
                            transformOrigin: `${center}px ${center}px`,
                            letterSpacing: '-0.05em'
                        }}
                      >
                        {todayOperationCount}
                      </text>
                    )}
                </svg>
            </div>
            
            {room.estimatedEndTime && shouldShowTime && (
                <div className="-mt-1 text-center">
                    <div className="flex items-center gap-1 sm:gap-1.5 justify-center">
                      <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: themeColor }} />
                      <span className="text-sm sm:text-lg font-mono font-bold tracking-tight" style={{ color: themeColor }}>
                          {new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                </div>
            )}
        </div>

        {/* Bottom Info */}
        <div className="w-full space-y-2 sm:space-y-3 shrink-0">
          <div className="w-full text-center">
            <p
              className={`text-[9px] sm:text-[10px] font-bold tracking-[0.15em] sm:tracking-[0.2em] truncate uppercase py-1.5 sm:py-2 px-2 sm:px-4 rounded-full border transition-all inline-block w-full
              ${room.isEmergency 
                  ? 'bg-red-600 text-white border-red-500' 
                  : (room.isLocked 
                      ? 'bg-amber-500 text-white border-amber-600' 
                      : '')}
            `}
              // Normální stav: jemný odstín barvy aktuálního statusu v pozadí,
              // text bílý pro maximální čitelnost.
              style={(!room.isEmergency && !room.isLocked) ? {
                backgroundColor: `${themeColor}1a`,
                borderColor: `${themeColor}40`,
                color: '#FFFFFF',
              } : undefined}
            >
              {room.isEmergency ? 'STAV NOUZE' : (room.isLocked ? 'SÁL UZAMČEN' : currentStep.title)}
            </p>
          </div>
          
            <div className={`flex items-center justify-between pt-2 sm:pt-3 border-t gap-1.5 sm:gap-2 transition-colors
            ${room.isEmergency ? 'border-red-500/20' : (room.isLocked ? 'border-amber-500/20' : (room.isPaused ? 'border-cyan-500/20' : 'border-white/5'))}
          `}>
            {/* Left: avatar + names */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl border shrink-0 flex items-center justify-center
                ${room.isEmergency ? 'border-red-500/30 bg-red-500/10' : (room.isLocked ? 'border-amber-500/30 bg-amber-500/10' : (room.isPaused ? 'border-cyan-500/30 bg-cyan-500/10' : 'border-white/10 bg-white/5'))}
              `}>
                <User className={`w-3 h-3 sm:w-4 sm:h-4 transition-opacity
                  ${room.isEmergency ? 'text-red-400' : (room.isLocked ? 'text-amber-400' : (room.isPaused ? 'text-cyan-400' : 'text-white/40 group-hover:text-white/60'))}
                `} />
              </div>
              <div className="min-w-0 flex flex-col gap-0.5">
                <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-tight truncate transition-colors
                  ${room.isEmergency ? 'text-red-200' : (room.isLocked ? 'text-amber-200' : (room.isPaused ? 'text-cyan-200' : 'text-white/40 group-hover:text-white/60'))}
                `}>
                  {room?.staff?.doctor?.name?.split(' ').pop() || 'Neurčen'}
                </span>
                {room?.staff?.nurse?.name && (
                  <span className={`hidden sm:inline text-[9px] font-medium uppercase tracking-tight truncate transition-colors
                    ${room.isEmergency ? 'text-red-300/60' : (room.isLocked ? 'text-amber-300/60' : (room.isPaused ? 'text-cyan-300/60' : 'text-white/25 group-hover:text-white/40'))}
                  `}>
                    {room?.staff?.nurse?.name?.split(' ').pop()}
                  </span>
                )}
              </div>
            </div>

            {/* Right: action buttons / status badges */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {room.isSeptic && (
                <div className="p-1 sm:p-1.5 bg-red-500/10 rounded-lg sm:rounded-xl border border-red-500/20 backdrop-blur-md">
                  <Biohazard className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500/70" />
                </div>
              )}

              {/* Patient called indicator */}
              {room.patientCalledAt && !room.patientArrivedAt && (
                <div className="p-1 sm:p-2 rounded-lg sm:rounded-xl border transition-all backdrop-blur-md bg-blue-500/20 border-blue-400/40">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                </div>
              )}

              {/* Patient arrived indicator */}
              {room.patientArrivedAt && (
                <div className="p-1 sm:p-2 rounded-lg sm:rounded-xl border transition-all backdrop-blur-md bg-green-500/20 border-green-400/40">
                  <BedDouble className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                </div>
              )}

              {/* Emergency button */}
              <button
                onClick={(e) => handleAction(e, onEmergency)}
                aria-label={room.isEmergency ? 'Zrušit stav nouze' : 'Vyhlásit stav nouze'}
                className={`p-1 sm:p-2 rounded-lg sm:rounded-xl border transition-all backdrop-blur-md
                  ${room.isEmergency
                    ? 'bg-red-600 text-white border-red-500 shadow-[0_0_16px_rgba(239,68,68,0.4)]'
                    : 'bg-white/5 hover:bg-red-500/20 border-white/10 text-white/40 hover:text-red-400'}
                `}
              >
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>

              {/* Lock button */}
              <button
                onClick={(e) => handleAction(e, onLock)}
                aria-label={room.isLocked ? 'Odemknout sál' : 'Uzamknout sál'}
                className={`p-1 sm:p-2 rounded-lg sm:rounded-xl border transition-all backdrop-blur-md
                  ${room.isLocked
                    ? 'bg-amber-500 text-white border-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.4)]'
                    : 'bg-white/5 hover:bg-amber-500/20 border-white/10 text-white/40 hover:text-amber-400'}
                `}
              >
                <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}, (prev, next) => {
  // Custom comparator — re-renderuj pouze když se změní DATA sálu, nikoli callbacky.
  // Inline arrow funkce z parenta (() => setSelectedRoomId(room.id) atd.) se vždy
  // recreatují, což jinak invaliduje React.memo a způsobuje, že se VŠECHNY karty
  // re-renderují při jakékoli změně v rooms[]. Tohle je kritická perf optimalizace
  // pro dashboard se 6+ kartami obsahujícími drahá SVG / glassmorph efekty.
  // Callbacky jsou de facto pure (jen volají setRooms s room.id), takže stale
  // closure neničí logiku.
  return prev.room === next.room;
});

export default RoomCard;
