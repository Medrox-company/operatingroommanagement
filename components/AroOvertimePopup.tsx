import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Stethoscope, User, AlertTriangle, TrendingUp, Timer } from 'lucide-react';
import { OperatingRoom } from '../types';

// Design tokens matching TimelineModule
const C = {
  accent:    '#06B6D4',
  cyan:      '#06B6D4',
  green:     '#10B981',
  yellow:    '#F59E0B',
  orange:    '#F97316',
  red:       '#EF4444',
  blue:      '#3B82F6',
  textHi:   'rgba(255,255,255,0.95)',
  text:     'rgba(255,255,255,0.78)',
  muted:    'rgba(255,255,255,0.42)',
  border:   'rgba(148,163,184,0.10)',
  borderHi: 'rgba(148,163,184,0.18)',
  bgDeep:   '#030712',
  bgCard:   'rgba(10,18,35,0.97)',
  bgSurface:'rgba(15,26,48,0.90)',
  bgRow:    'rgba(255,255,255,0.03)',
};

interface AroOvertimeRoom {
  roomId: string;
  roomName: string;
  estimatedEndTime: Date;
  workingEndTime: Date;
  overtimeMinutes: number;
  enteredAt: number;
}

interface AroOvertimePopupProps {
  isOpen: boolean;
  onClose: () => void;
  overtimeRooms: AroOvertimeRoom[];
  roomsMap: Map<string, OperatingRoom>;
  currentTime: Date;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (d: Date) =>
  d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

const fmtDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

/** Returns { minutes, label, urgent } remaining until estimatedEndTime */
const remaining = (endTime: Date, now: Date) => {
  const diff = endTime.getTime() - now.getTime();
  const minutes = Math.round(diff / 60000);
  return {
    minutes,
    label: diff <= 0
      ? 'Skončeno'
      : `${fmtDuration(minutes)}`,
    urgent: minutes <= 30,
    done: diff <= 0,
  };
};

/** 0–1 progress of the overtime bar: how far through the overtime window are we */
const overtimeProgress = (workEnd: Date, estEnd: Date, now: Date) => {
  const total = estEnd.getTime() - workEnd.getTime();
  if (total <= 0) return 0;
  const elapsed = now.getTime() - workEnd.getTime();
  return Math.max(0, Math.min(1, elapsed / total));
};

// ─── Position colours ────────────────────────────────────────────────────────
const positionGradient = (pos: number) => {
  const g = [
    [`#EF4444`, `#F97316`],  // 1 – red-orange
    [`#F59E0B`, `#F97316`],  // 2 – amber-orange
    [`#06B6D4`, `#3B82F6`],  // 3 – cyan-blue
    [`#8B5CF6`, `#06B6D4`],  // 4+
  ];
  const pair = g[Math.min(pos - 1, g.length - 1)];
  return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
};

const positionAccent = (pos: number) => {
  return [C.red, C.yellow, C.cyan, C.blue][Math.min(pos - 1, 3)];
};

// ─── OvertimeBar ─────────────────────────────────────────────────────────────
const OvertimeBar: React.FC<{
  workEnd: Date;
  estEnd: Date;
  now: Date;
  accent: string;
}> = ({ workEnd, estEnd, now, accent }) => {
  const progress = overtimeProgress(workEnd, estEnd, now);
  const totalMin = Math.round((estEnd.getTime() - workEnd.getTime()) / 60000);

  return (
    <div className="mt-3 mb-1">
      <div className="flex justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
          Průběh přesahu
        </span>
        <span className="text-[10px] font-bold" style={{ color: accent }}>
          +{fmtDuration(totalMin)}
        </span>
      </div>
      <div
        className="relative h-2 rounded-full overflow-hidden"
        style={{ background: `${accent}20` }}
      >
        {/* Tick at workEnd */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: `${accent}60` }} />
        {/* Animated fill */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 rounded-full"
          style={{ background: `linear-gradient(90deg, ${accent}80, ${accent})` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px]" style={{ color: C.muted }}>{fmt(workEnd)}</span>
        <span className="text-[9px]" style={{ color: C.muted }}>{fmt(estEnd)}</span>
      </div>
    </div>
  );
};

// ─── StaffPill ───────────────────────────────────────────────────────────────
const StaffPill: React.FC<{
  label: string;
  name: string | null | undefined;
  icon: React.ReactNode;
  color: string;
}> = ({ label, name, icon, color }) => (
  <div
    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 flex-1 min-w-0"
    style={{ background: `${color}12`, border: `1px solid ${color}28` }}
  >
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}22`, border: `1px solid ${color}40` }}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: C.muted }}>
        {label}
      </p>
      <p className="text-sm font-bold truncate leading-tight mt-0.5" style={{ color: C.textHi }}>
        {name || 'Neuvedeno'}
      </p>
    </div>
  </div>
);

// ─── RoomCard ────────────────────────────────────────────────────────────────
const RoomCard: React.FC<{
  room: AroOvertimeRoom;
  position: number;
  fullRoom: OperatingRoom | undefined;
  now: Date;
  index: number;
}> = ({ room, position, fullRoom, now, index }) => {
  const rem = remaining(room.estimatedEndTime, now);
  const accent = positionAccent(position);
  const gradient = positionGradient(position);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', damping: 22, stiffness: 280 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: C.bgSurface,
        border: `1px solid ${accent}28`,
        boxShadow: `0 4px 24px ${accent}18`,
      }}
    >
      {/* Top accent strip */}
      <div className="h-0.5 w-full" style={{ background: gradient }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Position badge */}
            <motion.div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black shadow-lg"
              style={{ background: gradient, color: '#fff' }}
              animate={{ boxShadow: [`0 0 0 0 ${accent}40`, `0 0 0 8px ${accent}00`] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              #{position}
            </motion.div>
            <div>
              <h3 className="text-base font-black tracking-tight leading-tight" style={{ color: C.textHi }}>
                {room.roomName}
              </h3>
              {fullRoom?.currentProcedure?.name && (
                <p className="text-xs mt-0.5 truncate max-w-[200px]" style={{ color: C.muted }}>
                  {fullRoom.currentProcedure.name}
                </p>
              )}
            </div>
          </div>

          {/* Countdown badge */}
          <motion.div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-shrink-0"
            style={{
              background: rem.done ? `${C.red}20` : rem.urgent ? `${C.orange}20` : `${accent}18`,
              border: `1px solid ${rem.done ? C.red : rem.urgent ? C.orange : accent}40`,
            }}
            animate={rem.urgent && !rem.done ? { scale: [1, 1.04, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Timer className="w-3.5 h-3.5 flex-shrink-0" style={{ color: rem.done ? C.red : rem.urgent ? C.orange : accent }} />
            <span
              className="text-sm font-black tabular-nums"
              style={{ color: rem.done ? C.red : rem.urgent ? C.orange : accent }}
            >
              {rem.done ? 'Hotovo' : rem.label}
            </span>
          </motion.div>
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: `${C.cyan}10`, border: `1px solid ${C.cyan}20` }}
          >
            <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: C.muted }}>
              Konec směny
            </p>
            <p className="text-base font-black tabular-nums" style={{ color: C.cyan }}>
              {fmt(room.workingEndTime)}
            </p>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: `${C.red}10`, border: `1px solid ${C.red}20` }}
          >
            <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: C.muted }}>
              Odhad konce
            </p>
            <p className="text-base font-black tabular-nums" style={{ color: C.red }}>
              {fmt(room.estimatedEndTime)}
            </p>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: `${C.yellow}10`, border: `1px solid ${C.yellow}20` }}
          >
            <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: C.muted }}>
              Přesah
            </p>
            <p className="text-base font-black" style={{ color: C.yellow }}>
              +{fmtDuration(room.overtimeMinutes)}
            </p>
          </div>
        </div>

        {/* Overtime progress bar */}
        <OvertimeBar
          workEnd={room.workingEndTime}
          estEnd={room.estimatedEndTime}
          now={now}
          accent={accent}
        />

        {/* Staff */}
        {fullRoom && (
          <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
            <StaffPill
              label="Anesteziolog"
              name={fullRoom.staff?.anesthesiologist?.name ?? fullRoom.staff?.doctor?.name}
              icon={<Stethoscope className="w-4 h-4" style={{ color: C.green }} />}
              color={C.green}
            />
            <StaffPill
              label="Sestra"
              name={fullRoom.staff?.nurse?.name}
              icon={<User className="w-4 h-4" style={{ color: C.cyan }} />}
              color={C.cyan}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const AroOvertimePopup: React.FC<AroOvertimePopupProps> = ({
  isOpen,
  onClose,
  overtimeRooms,
  roomsMap,
  currentTime,
}) => {
  const totalOvertime = overtimeRooms.reduce((s, r) => s + r.overtimeMinutes, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(2,6,18,0.75)', backdropFilter: 'blur(6px)' }}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.94, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -16 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            className="fixed z-50"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(96vw, 640px)',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 24,
              background: C.bgCard,
              border: `1px solid ${C.borderHi}`,
              boxShadow: `0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
              overflow: 'hidden',
            }}
          >
            {/* ── Header ── */}
            <div
              className="flex items-center justify-between px-7 py-5 flex-shrink-0"
              style={{ borderBottom: `1px solid ${C.border}` }}
            >
              <div className="flex items-center gap-3.5">
                <motion.div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${C.red}30, ${C.orange}20)`,
                    border: `2px solid ${C.red}50`,
                    boxShadow: `0 0 20px ${C.red}30`,
                  }}
                  animate={{ boxShadow: [`0 0 12px ${C.red}30`, `0 0 28px ${C.red}50`, `0 0 12px ${C.red}30`] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <AlertTriangle className="w-5 h-5" style={{ color: C.red }} />
                </motion.div>
                <div>
                  <h2 className="text-xl font-black tracking-tight" style={{ color: C.textHi }}>
                    ARO Přesah
                  </h2>
                  <p className="text-xs mt-0.5 flex items-center gap-2" style={{ color: C.muted }}>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold"
                      style={{ background: `${C.red}18`, color: C.red }}
                    >
                      {overtimeRooms.length} sálů
                    </span>
                    <span>&middot;</span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      celkem +{fmtDuration(totalOvertime)}
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                style={{ color: C.muted }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Order legend ── */}
            <div
              className="px-7 py-3 flex items-center gap-2 flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}
            >
              <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.muted }} />
              <p className="text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>
                Pořadí podle prvního vstupu do přesahu &mdash; #1 vstoupil nejdříve
              </p>
            </div>

            {/* ── Room cards ── */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              {overtimeRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: `${C.green}15`, border: `1px solid ${C.green}30` }}
                  >
                    <Clock className="w-7 h-7" style={{ color: C.green }} />
                  </div>
                  <p className="text-base font-semibold" style={{ color: C.text }}>Žádné sály v přesahu</p>
                  <p className="text-xs mt-1" style={{ color: C.muted }}>Všechny sály pracují v rámci pracovní doby</p>
                </div>
              ) : (
                overtimeRooms.map((room, i) => (
                  <RoomCard
                    key={room.roomId}
                    room={room}
                    position={i + 1}
                    fullRoom={roomsMap.get(room.roomId)}
                    now={currentTime}
                    index={i}
                  />
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AroOvertimePopup;
