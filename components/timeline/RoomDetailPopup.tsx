import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { OperatingRoom } from '../../types';
import { useWorkflowStatusesContext } from '../../contexts/WorkflowStatusesContext';
import { Clock, Stethoscope, Activity, Users, X, Sparkles, ChevronRight } from 'lucide-react';
import { C } from './constants';

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

export default RoomDetailPopup;
