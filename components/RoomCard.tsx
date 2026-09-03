
import React, { memo, useMemo } from 'react';
import { OperatingRoom } from '../types';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { ArrowUpRight, Biohazard, Clock, AlertCircle, Lock, Phone, BedDouble, User, Megaphone, ChevronRight } from 'lucide-react';
import type { CurrentRoomSpecialty } from '../lib/room-specialty';
import { useOperationalDayWindow } from '../hooks/useOperationalDayWindow';

interface RoomCardProps {
  room: OperatingRoom;
  onClick?: () => void;
  onEmergency?: (e: React.MouseEvent) => void;
  onLock?: (e: React.MouseEvent) => void;
  /** Vyplní výšku buňky mřížky (desktop fit). Mobil = fixní výška. */
  fill?: boolean;
  specialties?: CurrentRoomSpecialty[];
}

const RoomCard: React.FC<RoomCardProps> = memo(({ room, onClick, onEmergency, onLock, fill, specialties }) => {
  // Get workflow statuses from database context - already filtered and sorted
  const { workflowStatuses } = useWorkflowStatusesContext();
  
  // workflowStatuses is already filtered (active, non-special) and sorted by context
  // Add null safety
  const activeStatuses = workflowStatuses || [];
  
  // Počet dokončených cyklů v aktuálním provozním dni (7:00 → 6:59).
  // Okno drží sdílený hook, takže se počty samy překlopí i na dashboardu, který
  // běží nepřetržitě přes noc — bez nutnosti obnovit stránku.
  const { start: startOfWindow, end: endOfWindow } = useOperationalDayWindow();
  const todayOperationCount = useMemo(() => {
    if (!room.completedOperations || room.completedOperations.length === 0) return 0;

    return room.completedOperations.filter(op => {
      if (!op.endedAt) return false; // Dokončený cyklus poznáme podle endedAt
      const opEnd = new Date(op.endedAt).getTime();
      return opEnd >= startOfWindow && opEnd <= endOfWindow;
    }).length;
  }, [room.completedOperations, startOfWindow, endOfWindow]);
  
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
  const scheduledSpecialties = useMemo(() => {
    const fullDay = specialties?.find(specialty => specialty.dayPart === 'FULL_DAY');
    return {
      morning: fullDay ?? specialties?.find(specialty => specialty.dayPart === 'AM'),
      afternoon: fullDay ?? specialties?.find(specialty => specialty.dayPart === 'PM'),
    };
  }, [specialties]);

  const specialtyDisplayName = (name: string | undefined) =>
    name?.trim().toLocaleLowerCase('cs-CZ') === 'ortopedická chirurgie'
      ? 'Ortopedie'
      : name;

  const specialtySlot = (specialty: CurrentRoomSpecialty | undefined, period: 'dopoledne' | 'odpoledne') => (
    <span
      className="flex min-w-0 flex-1 items-center justify-center overflow-hidden px-2 py-2 text-center text-[8px] font-bold uppercase tracking-[0.04em] text-white sm:text-[9px]"
      style={{
        background: 'rgba(255,255,255,0.035)',
        color: 'rgba(255,255,255,0.34)',
      }}
      title={specialty ? `${specialtyDisplayName(specialty.name)} · ${period}` : `Bez přiřazeného oboru · ${period}`}
    >
      <span className="truncate">{specialtyDisplayName(specialty?.name) || 'Bez oboru'}</span>
    </span>
  );

  return (
    <>
    {/* ===== MOBILE — prémiová karta sálu ===== */}
    <div
      onClick={onClick}
      className="room-card-shell mobile-dashboard-room-card md:hidden relative isolate w-full rounded-[24px] p-3.5 cursor-pointer active:scale-[0.98] transition-transform duration-200 select-none overflow-hidden"
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
        className="glow-soft absolute -right-9 -top-11 w-24 h-24 rounded-full pointer-events-none"
        style={{ ['--glow' as string]: themeColor, opacity: 0.11 }}
      />

      {/* Identita sálu */}
      <div className="relative z-10 flex items-start gap-3">
        <span
          className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 text-[13px] font-black tabular-nums"
          style={{
            color: themeColor,
            background: `${themeColor}1A`,
            border: `1px solid ${themeColor}2E`,
            boxShadow: `inset 0 1px 0 var(--m-card-highlight)`,
          }}
        >
          {mobileRoomNumber}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-[14px] font-black uppercase whitespace-normal break-words leading-tight tracking-[-0.02em]" style={{ color: 'var(--m-text-strong)' }}>
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

      {/* Dnešní obor podle dopoledního a odpoledního rozpisu + průběh */}
      <div
        className="relative z-10 mt-3 rounded-[16px] px-3 py-2.5 overflow-hidden"
        style={{ background: `${themeColor}0D` }}
      >
        <div
          className="flex overflow-hidden rounded-lg border border-white/[0.045]"
          aria-label={`Dnešní obory: ${specialtyDisplayName(scheduledSpecialties.morning?.name) || 'bez oboru'} dopoledne, ${specialtyDisplayName(scheduledSpecialties.afternoon?.name) || 'bez oboru'} odpoledne`}
        >
          {specialtySlot(scheduledSpecialties.morning, 'dopoledne')}
          <span className="w-px shrink-0 bg-white/20" aria-hidden="true" />
          {specialtySlot(scheduledSpecialties.afternoon, 'odpoledne')}
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

    {/* ===== DESKTOP — jemná provozní karta s centrálním počtem cyklů ===== */}
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
      className={`room-card-shell dashboard-workspace-card group relative hidden w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/55 md:block ${fill ? 'h-full min-h-[140px]' : 'h-[clamp(268px,28vw,320px)]'}`}
    >
      {/* Main Card Container */}
      <div className={`dashboard-workspace-card-surface absolute inset-0 z-0 overflow-hidden
        ${room.isEmergency
            ? 'dashboard-workspace-card-surface--emergency'
            : (room.isLocked
                ? 'dashboard-workspace-card-surface--locked'
                : '')}
      `}>
      </div>

      <svg
        className="dashboard-workspace-card-outline pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible"
        viewBox="0 0 980 750"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className={`dashboard-workspace-card-outline-path ${room.isEmergency
            ? 'dashboard-workspace-card-outline-path--emergency'
            : (room.isLocked ? 'dashboard-workspace-card-outline-path--locked' : '')}`}
          d="M 85 0 H 606 A 76 76 0 0 1 682 76 A 78 78 0 0 0 760 154 H 898 A 82 82 0 0 1 980 236 V 663 A 86 86 0 0 1 894 749 H 86 A 86 86 0 0 1 0 663 V 85 A 85 85 0 0 1 85 0 Z"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <span className="dashboard-workspace-card-corner-control dashboard-workspace-card-room-index absolute z-30 flex items-center justify-center text-[12px] font-semibold tabular-nums text-white/76" aria-hidden="true">
        {mobileRoomNumber}
      </span>

      <span className="dashboard-workspace-card-corner-control dashboard-workspace-card-open absolute z-30 flex items-center justify-center" aria-hidden="true">
        <ArrowUpRight className="dashboard-workspace-card-open-icon h-[18px] w-[18px] text-white/62" />
        {room.noticeMessage && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-400" />}
      </span>

      {/* Content Container */}
      <div className="relative z-10 flex h-full w-full flex-col p-[clamp(0.875rem,1.4vw,1.25rem)]">

        {/* Identita podle reference: kruhové číslo, výrazný název, drobný obor. */}
        <div className="dashboard-workspace-card-header flex max-w-[61.8%] min-w-0 items-center">
          <div className="min-w-0 w-full">
            <h3 className={`max-w-full whitespace-normal break-words text-[clamp(0.74rem,1.08vw,1.05rem)] font-semibold uppercase leading-[1.08] tracking-tight [overflow-wrap:anywhere]
              ${(room.isEmergency || room.isLocked) ? 'text-white' : 'text-white/92 group-hover:text-white'}
            `}>
              {room.name}
            </h3>
            <p className={`mt-1.5 max-w-full truncate text-[8px] font-semibold uppercase leading-none tracking-[0.13em] sm:text-[9px]
              ${room.isEmergency ? 'text-red-400' : (room.isLocked ? 'text-amber-400' : 'text-white/30')}
            `}>
              {room.department}
            </p>
          </div>
        </div>

        {/* Central Content Wrapper */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden">
            <div className="relative flex items-center justify-center">
                {/* Static glow behind the circle - replaced motion for performance */}
                <div
                  className="glow-core absolute rounded-full"
                  style={{ width: 72, height: 72, ['--glow' as string]: themeColor, opacity: 0.13 }}
                />
                <svg
                  viewBox="0 0 112 112"
                  className="dashboard-workspace-cycle-indicator h-[clamp(5.5rem,24cqw,8rem)] w-[clamp(5.5rem,24cqw,8rem)] flex-shrink-0 select-none overflow-visible"
                  style={{ transform: 'rotate(-90deg)' }}
                >
                    <circle 
                      cx={center} cy={center} r={radius} 
                      fill="rgba(255,255,255,0.012)"
                      stroke="white" 
                      strokeWidth="1.5" 
                      className="opacity-[0.055]"
                    />
                    <circle 
                      cx={center} cy={center} r={radius} 
                      fill="none"
                      stroke={themeColor} 
                      strokeWidth={5}
                      strokeLinecap="round"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={room.isPaused ? 0 : strokeDashoffset}
                      className="transition-[stroke-dashoffset,stroke] duration-300"
                      style={{ filter: `drop-shadow(0 0 2px ${themeColor}58)` }}
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
                        className={`text-[42px] font-semibold transition-colors ${(room.isEmergency || room.isLocked) ? 'fill-white' : 'fill-white/90'}`}
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
            <span className="mt-2.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/28 sm:text-[9px]">Dokončené cykly</span>
            
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
          <div
            className="dashboard-workspace-specialties flex w-full overflow-hidden border border-white/[0.045]"
            aria-label={`Dnešní obory: ${specialtyDisplayName(scheduledSpecialties.morning?.name) || 'bez oboru'} dopoledne, ${specialtyDisplayName(scheduledSpecialties.afternoon?.name) || 'bez oboru'} odpoledne`}
          >
            {specialtySlot(scheduledSpecialties.morning, 'dopoledne')}
            <span className="w-px shrink-0 bg-white/20" aria-hidden="true" />
            {specialtySlot(scheduledSpecialties.afternoon, 'odpoledne')}
          </div>
          
            <div className={`flex items-center justify-between pt-2 sm:pt-3 border-t gap-1.5 sm:gap-2 transition-colors
            ${room.isEmergency ? 'border-red-500/14' : (room.isLocked ? 'border-amber-500/14' : (room.isPaused ? 'border-cyan-500/14' : 'border-white/[0.035]'))}
          `}>
            {/* Left: avatar + names */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border sm:h-9 sm:w-9
                ${room.isEmergency ? 'border-red-500/20 bg-red-500/10' : (room.isLocked ? 'border-amber-500/20 bg-amber-500/10' : (room.isPaused ? 'border-cyan-500/20 bg-cyan-500/10' : 'border-white/[0.07] bg-white/5'))}
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
                <div className="rounded-lg border border-red-500/14 bg-red-500/10 p-1 sm:p-1.5">
                  <Biohazard className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500/70" />
                </div>
              )}

              {/* Patient called indicator */}
              {room.patientCalledAt && !room.patientArrivedAt && (
                <div className="rounded-lg border border-blue-400/16 bg-blue-500/10 p-1 sm:p-2">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                </div>
              )}

              {/* Patient arrived indicator */}
              {room.patientArrivedAt && (
                <div className="rounded-lg border border-green-400/16 bg-green-500/10 p-1 sm:p-2">
                  <BedDouble className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                </div>
              )}

              {/* Emergency button */}
              <button
                onClick={(e) => handleAction(e, onEmergency)}
                aria-label={room.isEmergency ? 'Zrušit stav nouze' : 'Vyhlásit stav nouze'}
                className={`rounded-lg border p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60 sm:p-2
                  ${room.isEmergency
                    ? 'border-red-500/26 bg-red-500/16 text-red-200'
                    : 'border-white/[0.04] bg-white/[0.025] text-white/35 hover:text-red-300'}
                `}
              >
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>

              {/* Lock button */}
              <button
                onClick={(e) => handleAction(e, onLock)}
                aria-label={room.isLocked ? 'Odemknout sál' : 'Uzamknout sál'}
                className={`rounded-lg border p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/60 sm:p-2
                  ${room.isLocked
                    ? 'border-amber-400/24 bg-amber-400/15 text-amber-100'
                    : 'border-white/[0.04] bg-white/[0.025] text-white/35 hover:text-amber-200'}
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
  const previousSpecialties = prev.specialties ?? [];
  const nextSpecialties = next.specialties ?? [];
  return prev.room === next.room
    && previousSpecialties.length === nextSpecialties.length
    && previousSpecialties.every((specialty, index) => (
      specialty.departmentId === nextSpecialties[index]?.departmentId
      && specialty.dayPart === nextSpecialties[index]?.dayPart
    ));
});

export default RoomCard;
