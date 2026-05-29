import React, { useMemo } from 'react';
import { OperatingRoom } from '../types';
import type { WorkflowStatus } from '../hooks/useWorkflowStatuses';
import {
  Activity, Brush, DoorOpen, CheckCircle2, AlertTriangle, Stethoscope,
  HeartPulse, ChevronRight, Clock, Layers,
} from 'lucide-react';

/* ==========================================================================
   TimelineSidePanel — pravý informační panel pro desktopovou časovou osu.

   Čistě "čtecí" komponenta: nepočítá nic, co by ovlivnilo timeline. Dostává
   už hotová data (stats, aktivní statusy, ARO přesahy) a vykresluje 5 sekcí:
     1) Živé KPI dlaždice
     2) Probíhající operace (klik → detail sálu)
     3) ARO přesahy (klik → ARO popup)
     4) Personál ve službě
     5) Legenda fází

   Interaktivita se děje přes callbacky (onSelectRoom / onOpenAro), které
   znovupoužívají existující popupy v TimelineModule.
   ========================================================================== */

// Lokální paleta sladěná s TimelineModule (C), aby panel ladil se zbytkem osy.
const P = {
  accent: '#06B6D4',
  green: '#10B981',
  yellow: '#F59E0B',
  orange: '#F97316',
  red: '#EF4444',
  blue: '#3B82F6',
  pink: '#EC4899',
  slate: '#64748B',
  textHi: '#F1F5F9',
  textMid: 'rgba(226, 232, 240, 0.75)',
  muted: 'rgba(148, 163, 184, 0.65)',
  bgSurface: 'rgba(13, 19, 31, 0.6)',
  bgElevated: 'rgba(30, 41, 59, 0.55)',
  border: 'rgba(148, 163, 184, 0.12)',
};

export interface TimelineStats {
  operations: number;
  cleaning: number;
  free: number;
  completed: number;
  doctorsWorking: number;
  doctorsFree: number;
  nursesWorking: number;
  nursesFree: number;
  emergencyCount: number;
}

export interface AroOvertimeItem {
  roomId: string;
  roomName: string;
  estimatedEndTime: Date;
  workingEndTime: Date;
  overtimeMinutes: number;
  enteredAt: number;
}

interface TimelineSidePanelProps {
  rooms: OperatingRoom[];
  activeStatuses: WorkflowStatus[];
  stats: TimelineStats;
  aroOvertimeRooms: AroOvertimeItem[];
  currentTime: Date;
  onSelectRoom: (room: OperatingRoom) => void;
  onOpenAro: () => void;
}

// Drobný pomocník: minuty → "Xh Ym" / "Ym"
const formatMinutes = (mins: number): string => {
  const m = Math.max(0, Math.round(mins));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${r} m`;
};

const SectionHeading: React.FC<{ icon: React.ReactNode; title: string; badge?: string | number; badgeColor?: string }> = ({
  icon, title, badge, badgeColor,
}) => (
  <div className="flex items-center justify-between mb-2.5">
    <div className="flex items-center gap-2">
      <span style={{ color: P.muted }}>{icon}</span>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: P.textMid }}>
        {title}
      </h3>
    </div>
    {badge !== undefined && badge !== '' && (
      <span
        className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md"
        style={{ background: `${badgeColor || P.accent}1f`, color: badgeColor || P.accent }}
      >
        {badge}
      </span>
    )}
  </div>
);

const KpiTile: React.FC<{ label: string; value: number; color: string; icon: React.ReactNode }> = ({
  label, value, color, icon,
}) => (
  <div
    className="rounded-xl p-3 flex flex-col gap-1.5"
    style={{ background: P.bgElevated, border: `1px solid ${P.border}` }}
  >
    <div className="flex items-center justify-between">
      <span style={{ color }}>{icon}</span>
      <span className="text-xl font-bold tabular-nums leading-none" style={{ color: P.textHi }}>{value}</span>
    </div>
    <span className="text-[10px] font-medium uppercase tracking-wider leading-none" style={{ color: P.muted }}>
      {label}
    </span>
  </div>
);

const TimelineSidePanel: React.FC<TimelineSidePanelProps> = ({
  rooms, activeStatuses, stats, aroOvertimeRooms, currentTime, onSelectRoom, onOpenAro,
}) => {
  // Mapa: order_index → barva fáze (pro legendu i tečky u operací)
  const colorByIndex = useMemo(() => {
    const map: Record<number, string> = {};
    activeStatuses.forEach((s) => { map[s.order_index] = s.color || P.slate; });
    return map;
  }, [activeStatuses]);

  const nameByIndex = useMemo(() => {
    const map: Record<number, string> = {};
    activeStatuses.forEach((s) => { map[s.order_index] = s.name; });
    return map;
  }, [activeStatuses]);

  // Probíhající operace = aktivní fáze (0–5), nezahrnuje volné sály (>=6).
  const activeOps = useMemo(() => {
    const now = currentTime.getTime();
    return rooms
      .filter((r) => r.currentStepIndex >= 0 && r.currentStepIndex <= 5)
      .map((r) => {
        const startIso = r.operationStartedAt || r.phaseStartedAt;
        const start = startIso ? new Date(startIso).getTime() : now - 30 * 60 * 1000;
        const end = r.estimatedEndTime ? new Date(r.estimatedEndTime).getTime() : start + 120 * 60 * 1000;
        const total = Math.max(1, end - start);
        const progress = Math.max(0, Math.min(100, ((now - start) / total) * 100));
        const remainingMin = (end - now) / 60000;
        return { room: r, progress, remainingMin };
      })
      .sort((a, b) => a.remainingMin - b.remainingMin);
  }, [rooms, currentTime]);

  return (
    <div className="flex flex-col h-full overflow-y-auto px-3 py-3 gap-4 timeline-panel-scroll">
      {/* ============ 1) KPI dlaždice ============ */}
      <section>
        <SectionHeading icon={<Activity className="w-3.5 h-3.5" />} title="Přehled provozu" />
        <div className="grid grid-cols-2 gap-2">
          <KpiTile label="Probíhá" value={stats.operations} color={P.green} icon={<Activity className="w-4 h-4" />} />
          <KpiTile label="Úklid" value={stats.cleaning} color={P.yellow} icon={<Brush className="w-4 h-4" />} />
          <KpiTile label="Volné" value={stats.free} color={P.blue} icon={<DoorOpen className="w-4 h-4" />} />
          <KpiTile label="Dokončeno" value={stats.completed} color={P.slate} icon={<CheckCircle2 className="w-4 h-4" />} />
        </div>
        {stats.emergencyCount > 0 && (
          <div
            className="mt-2 rounded-xl px-3 py-2 flex items-center gap-2.5"
            style={{ background: `${P.red}14`, border: `1px solid ${P.red}33` }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: P.red }} />
            <span className="text-xs font-semibold" style={{ color: P.red }}>
              {stats.emergencyCount} akutní {stats.emergencyCount === 1 ? 'sál' : 'sály'}
            </span>
          </div>
        )}
      </section>

      {/* ============ 2) Probíhající operace ============ */}
      <section>
        <SectionHeading
          icon={<HeartPulse className="w-3.5 h-3.5" />}
          title="Probíhající operace"
          badge={activeOps.length}
          badgeColor={P.green}
        />
        {activeOps.length === 0 ? (
          <p className="text-xs italic px-1 py-3" style={{ color: P.muted }}>Žádné aktivní operace.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {activeOps.map(({ room, progress, remainingMin }) => {
              const phaseColor = colorByIndex[room.currentStepIndex] || P.slate;
              const phaseName = nameByIndex[room.currentStepIndex] || 'Probíhá';
              const overdue = remainingMin < 0;
              return (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room)}
                  className="group w-full text-left rounded-xl p-2.5 transition-colors"
                  style={{ background: P.bgElevated, border: `1px solid ${P.border}` }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: phaseColor }} />
                      <span className="text-xs font-semibold truncate" style={{ color: P.textHi }}>{room.name}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-40 group-hover:opacity-90 transition-opacity" style={{ color: P.textMid }} />
                  </div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] truncate" style={{ color: phaseColor }}>{phaseName}</span>
                    <span
                      className="text-[10px] font-semibold tabular-nums flex items-center gap-1 flex-shrink-0"
                      style={{ color: overdue ? P.red : P.textMid }}
                    >
                      <Clock className="w-3 h-3" />
                      {overdue ? `+${formatMinutes(-remainingMin)}` : formatMinutes(remainingMin)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.15)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${progress}%`, background: overdue ? P.red : phaseColor }}
                    />
                  </div>
                  {room.currentPatient?.name && (
                    <p className="text-[10px] mt-1.5 truncate" style={{ color: P.muted }}>
                      {room.currentPatient.name}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ============ 3) ARO přesahy ============ */}
      <section>
        <SectionHeading
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          title="ARO přesahy"
          badge={aroOvertimeRooms.length}
          badgeColor={aroOvertimeRooms.length > 0 ? P.red : P.green}
        />
        {aroOvertimeRooms.length === 0 ? (
          <div
            className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
            style={{ background: `${P.green}10`, border: `1px solid ${P.green}2e` }}
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: P.green }} />
            <span className="text-xs font-medium" style={{ color: P.green }}>Vše v rámci provozní doby.</span>
          </div>
        ) : (
          <button
            onClick={onOpenAro}
            className="w-full flex flex-col gap-1.5"
          >
            {aroOvertimeRooms.slice(0, 4).map((aro) => (
              <div
                key={aro.roomId}
                className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 transition-colors"
                style={{ background: `${P.red}10`, border: `1px solid ${P.red}2e` }}
              >
                <span className="text-xs font-semibold truncate" style={{ color: P.textHi }}>{aro.roomName}</span>
                <span className="text-[10px] font-bold tabular-nums flex-shrink-0" style={{ color: P.red }}>
                  +{formatMinutes(aro.overtimeMinutes)}
                </span>
              </div>
            ))}
            {aroOvertimeRooms.length > 4 && (
              <span className="text-[10px] text-center py-1" style={{ color: P.muted }}>
                + další {aroOvertimeRooms.length - 4} · zobrazit detail
              </span>
            )}
          </button>
        )}
      </section>

      {/* ============ 4) Personál ve službě ============ */}
      <section>
        <SectionHeading icon={<Stethoscope className="w-3.5 h-3.5" />} title="Personál ve službě" />
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-3" style={{ background: P.bgElevated, border: `1px solid ${P.border}` }}>
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="w-3.5 h-3.5" style={{ color: P.accent }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textMid }}>Lékaři</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold tabular-nums" style={{ color: P.green }}>{stats.doctorsWorking}</span>
              <span className="text-[10px]" style={{ color: P.muted }}>operuje</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold tabular-nums" style={{ color: P.textMid }}>{stats.doctorsFree}</span>
              <span className="text-[10px]" style={{ color: P.muted }}>volných</span>
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ background: P.bgElevated, border: `1px solid ${P.border}` }}>
            <div className="flex items-center gap-2 mb-2">
              <HeartPulse className="w-3.5 h-3.5" style={{ color: P.pink }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.textMid }}>Sestry</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold tabular-nums" style={{ color: P.green }}>{stats.nursesWorking}</span>
              <span className="text-[10px]" style={{ color: P.muted }}>operuje</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold tabular-nums" style={{ color: P.textMid }}>{stats.nursesFree}</span>
              <span className="text-[10px]" style={{ color: P.muted }}>volných</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 5) Legenda fází ============ */}
      <section>
        <SectionHeading icon={<Layers className="w-3.5 h-3.5" />} title="Legenda fází" />
        <div className="flex flex-col gap-1">
          {activeStatuses.map((s) => (
            <div key={s.id} className="flex items-center gap-2.5 px-1 py-1">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color || P.slate }} />
              <span className="text-[11px]" style={{ color: P.textMid }}>{s.name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TimelineSidePanel;
