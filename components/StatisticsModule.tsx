import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import {
  TrendingUp, TrendingDown, Activity,
  AlertTriangle, Shield, Clock, Layers, X, BarChart3,
  Printer, FileDown,
} from 'lucide-react';
import { OperatingRoom, RoomStatus, DayWorkingHours } from '../types';
// Step durations now calculated from real database history
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { useIsMobileDark } from '../hooks/useIsMobileDark';
import {
  fetchStatusHistory,
  type StatusHistoryRow,
} from '../lib/db';
import { useStaffData } from '../hooks/useStaffData';
import { useStatisticsData } from '../hooks/useStatisticsData';
import { useMediaQuery } from '../hooks/useMediaQuery';
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, ComposedChart,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import {
  MobileCard,
  MobileHeaderMetrics,
  MobileModuleHeader,
  MobilePillTabs,
  MobileSectionLabel,
} from './mobile/MobileShell';
const StaffTab = dynamic(() => import('./statistics/StaffTab').then((module) => module.StaffTab), { ssr: false });
const FinanceTab = dynamic(() => import('./statistics/FinanceTab').then((module) => module.FinanceTab), { ssr: false });
const RoomsTab = dynamic(() => import('./statistics/RoomsTab').then((module) => module.RoomsTab), { ssr: false });
const PhasesTab = dynamic(() => import('./statistics/PhasesTab').then((module) => module.PhasesTab), { ssr: false });
const NotificationsTab = dynamic(() => import('./statistics/NotificationsTab').then((module) => module.NotificationsTab), { ssr: false });
const DevicesTab = dynamic(() => import('./statistics/DevicesTab').then((module) => module.DevicesTab), { ssr: false });

interface StatisticsModuleProps { rooms?: OperatingRoom[]; }

type Period = 'den' | 'týden' | 'měsíc' | 'rok';
type Tab    = 'prehled' | 'finance' | 'personal'
            | 'saly' | 'faze' | 'notifikace' | 'zarizeni';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  accent:  '#06B6D4',
  green:   '#10B981',
  orange:  '#F97316',
  yellow:  '#FBBF24',
  red:     '#EF4444',
  border:  'var(--stats-border)',
  borderHover: 'var(--stats-border-hover)',
  surface: 'var(--stats-surface)',
  surfaceActive: 'var(--stats-surface-active)',
  muted:   'var(--stats-muted)',
  faint:   'var(--stats-faint)',
  ghost:   'var(--stats-ghost)',
  text:    'var(--stats-text)',
};

const DEPT_COLORS: Record<string,string> = {
  TRA:'#06B6D4', CHIR:'#F97316', ROBOT:'#A78BFA',
  URO:'#EC4899', ORL:'#3B82F6', CÉVNÍ:'#14B8A6',
  'HPB + PLICNÍ':'#FBBF24', DĚTSKÉ:'#10B981', MAMMO:'#818CF8',
};

const DAYS = ['Po','Út','St','Čt','Pá','So','Ne'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

// ── Helper: Get working hours for a specific day from room schedule ────────────
function getRoomWorkingHours(room: OperatingRoom, dayIndex: number): DayWorkingHours {
  const dayKey = DAY_KEYS[dayIndex];
  return room.weeklySchedule?.[dayKey] ?? {
    enabled: false,
    startHour: 0,
    startMinute: 0,
    endHour: 0,
    endMinute: 0,
    breakMinutes: 0,
  };
}

// ── Helper: Get only an explicitly configured break duration ─────────────────
function getDayBreakMinutes(hours: DayWorkingHours): number {
  const raw = hours.breakMinutes;
  if (typeof raw !== 'number' || isNaN(raw) || raw < 0) return 0;
  return Math.min(raw, Number.MAX_SAFE_INTEGER);
}

// ── Helper: Calculate net working minutes (gross - break) for a room on a day ──
function getRoomWorkingMinutes(room: OperatingRoom, dayIndex: number): number {
  const hours = getRoomWorkingHours(room, dayIndex);
  if (!hours.enabled) return 0;
  const startMins = hours.startHour * 60 + hours.startMinute;
  const endMins = hours.endHour * 60 + hours.endMinute;
  const gross = Math.max(0, endMins - startMins);
  const breakMins = Math.min(getDayBreakMinutes(hours), gross);
  return Math.max(0, gross - breakMins);
}

// ── Helper: Check if a timestamp falls within room's working hours ─────────────
function isWithinWorkingHours(room: OperatingRoom, timestamp: string): boolean {
  const date = new Date(timestamp);
  const dayOfWeek = date.getDay();
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday=0 format
  const hours = getRoomWorkingHours(room, dayIndex);
  
  if (!hours.enabled) return false;
  
  const currentMins = date.getHours() * 60 + date.getMinutes();
  const startMins = hours.startHour * 60 + hours.startMinute;
  const endMins = hours.endHour * 60 + hours.endMinute;
  
  return currentMins >= startMins && currentMins <= endMins;
}

// ── Helper: Calculate average step durations from status history ───────────────
function calculateAvgStepDurations(
  history: StatusHistoryRow[], 
  workflowSteps: { title: string }[]
): number[] {
  if (!history || history.length === 0) {
    // Return default durations if no history
    return workflowSteps.map(() => 0);
  }

  const stepDurations: Record<string, number[]> = {};
  workflowSteps.forEach(step => {
    stepDurations[step.title] = [];
  });

  // Collect durations for each step
  history.filter(e => e.event_type === 'step_change' && e.duration_seconds).forEach(e => {
    if (e.step_name && stepDurations[e.step_name]) {
      stepDurations[e.step_name].push(e.duration_seconds || 0);
    }
  });

  // Calculate averages in minutes
  return workflowSteps.map(step => {
    const durations = stepDurations[step.title];
    if (durations.length === 0) return 0;
    const avgSeconds = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    return Math.round(avgSeconds / 60);
  });
}

// ── Helper: Calculate workflow distribution from status history ────────────────
function calculateWorkflowDistribution(
  history: StatusHistoryRow[],
  workflowSteps: { title: string; color: string }[]
): { title: string; color: string; pct: number; totalMinutes: number }[] {
  if (!history || history.length === 0) {
    return workflowSteps.map(step => ({ title: step.title, color: step.color, pct: 0, totalMinutes: 0 }));
  }

  const stepTotals: Record<string, number> = {};
  workflowSteps.forEach(step => {
    stepTotals[step.title] = 0;
  });

  // Sum up all durations for each step
  history.filter(e => e.event_type === 'step_change' && e.duration_seconds).forEach(e => {
    if (e.step_name && stepTotals[e.step_name] !== undefined) {
      stepTotals[e.step_name] += e.duration_seconds || 0;
    }
  });

  const totalSeconds = Object.values(stepTotals).reduce((sum, v) => sum + v, 0);
  
  return workflowSteps.map(step => ({
    title: step.title,
    color: step.color,
    pct: totalSeconds > 0 ? Math.round((stepTotals[step.title] / totalSeconds) * 100) : 0,
    totalMinutes: Math.round(stepTotals[step.title] / 60),
  }));
}

// ── Helper: Calculate per-room workflow distribution from status history ───────
function calculateRoomWorkflowDistribution(
  history: StatusHistoryRow[],
  rooms: OperatingRoom[],
  workflowSteps: { title: string }[]
): Record<string, Record<string, number>> {
  const roomDistributions: Record<string, Record<string, number>> = {};
  
  rooms.forEach(room => {
    const roomHistory = history.filter(e => e.operating_room_id === room.id && e.event_type === 'step_change');
    const stepTotals: Record<string, number> = {};
    
    workflowSteps.forEach(step => {
      stepTotals[step.title] = 0;
    });
    
    roomHistory.forEach(e => {
      if (e.step_name && stepTotals[e.step_name] !== undefined) {
        stepTotals[e.step_name] += e.duration_seconds || 0;
      }
    });
    
    const totalSeconds = Object.values(stepTotals).reduce((sum, v) => sum + v, 0);
    
    roomDistributions[room.id] = {};
    workflowSteps.forEach(step => {
      roomDistributions[room.id][step.title] = totalSeconds > 0 
        ? Math.round((stepTotals[step.title] / totalSeconds) * 100) 
        : 0;
    });
  });
  
  return roomDistributions;
}

// ── Helper: Calculate total working minutes for a room across a period ─────────
function getRoomTotalWorkingMinutes(room: OperatingRoom, period: Period): number {
  if (period === 'den') {
    const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    return getRoomWorkingMinutes(room, todayIndex);
  }
  
  if (period === 'týden') {
    // Sum working minutes for all 7 days
    return Array.from({ length: 7 }, (_, i) => getRoomWorkingMinutes(room, i)).reduce((a, b) => a + b, 0);
  }
  
  if (period === 'měsíc') {
    // Approximate: 4 weeks of working days
    const weeklyMinutes = Array.from({ length: 7 }, (_, i) => getRoomWorkingMinutes(room, i)).reduce((a, b) => a + b, 0);
    return weeklyMinutes * 4.3; // ~30 days / 7 = 4.3 weeks
  }
  
  // Year: 52 weeks
  const weeklyMinutes = Array.from({ length: 7 }, (_, i) => getRoomWorkingMinutes(room, i)).reduce((a, b) => a + b, 0);
  return weeklyMinutes * 52;
}

// ── Helper: Count operations within working hours for a room from history ──────
function countOperationsInWorkingHours(
  room: OperatingRoom,
  history: StatusHistoryRow[],
  period: Period
): number {
  if (!room || !history || history.length === 0) return 0;
  
  const roomHistory = history.filter(e => e.operating_room_id === room.id);
  const operationStarts = roomHistory.filter(e => e.event_type === 'operation_start');
  
  // Filter operations that fall within the room's working hours
  return operationStarts.filter(e => {
    if (!e.timestamp) return false;
    const date = new Date(e.timestamp);
    const dayOfWeek = date.getDay();
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const hours = getRoomWorkingHours(room, dayIndex);
    
    if (!hours.enabled) return false;
    
    const eventMins = date.getHours() * 60 + date.getMinutes();
    const startMins = hours.startHour * 60 + hours.startMinute;
    const endMins = hours.endHour * 60 + hours.endMinute;
    
    return eventMins >= startMins && eventMins <= endMins;
  }).length;
}

// ── Helper: Get period start date (matches loadStats fetch window) ─────────────
function getPeriodStart(period: Period, now: Date = new Date()): Date {
  switch (period) {
    case 'den':    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'týden':  return new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);
    case 'měsíc':  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'rok':    return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  }
}

// ── Helper: Build active operation intervals for a room from history ───────────
// Pairs operation_start with next operation_end; if the room is currently in an
// operation (operationStartedAt set) and has no matching end, the interval is
// left open to `now`. This is critical because ongoing operations don't yet
// have `duration_seconds` recorded on step_change events.
function buildRoomOperationIntervals(
  room: OperatingRoom,
  history: StatusHistoryRow[],
  now: Date = new Date()
): { start: Date; end: Date }[] {
  const events = history
    .filter(e =>
      e.operating_room_id === room.id &&
      (e.event_type === 'operation_start' || e.event_type === 'operation_end')
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const intervals: { start: Date; end: Date }[] = [];
  let currentStart: Date | null = null;

  for (const e of events) {
    if (e.event_type === 'operation_start') {
      // If we already had an open start, treat previous as open-ended (shouldn't happen normally)
      currentStart = new Date(e.timestamp);
    } else if (e.event_type === 'operation_end' && currentStart) {
      intervals.push({ start: currentStart, end: new Date(e.timestamp) });
      currentStart = null;
    }
  }

  // Handle currently running operation
  if (currentStart) {
    intervals.push({ start: currentStart, end: now });
  } else if (room.operationStartedAt) {
    // Fallback: room marked as running but no operation_start event in fetched window
    const opStart = new Date(room.operationStartedAt);
    if (!isNaN(opStart.getTime())) {
      intervals.push({ start: opStart, end: now });
    }
  }

  return intervals;
}

// ── Helper: Calculate active time in minutes within working hours ──────────────
// Sums the overlap between each operation interval and the room's working hours
// for every day within the selected period.
function calculateActiveTimeInWorkingHours(
  room: OperatingRoom,
  history: StatusHistoryRow[],
  period: Period = 'den'
): number {
  if (!room) return 0;

  const now = new Date();
  const periodStart = getPeriodStart(period, now);
  const intervals = buildRoomOperationIntervals(room, history || [], now);
  if (intervals.length === 0) return 0;

  let totalMins = 0;

  for (const interval of intervals) {
    // Clip interval to period window
    const clippedStart = new Date(Math.max(interval.start.getTime(), periodStart.getTime()));
    const clippedEnd   = new Date(Math.min(interval.end.getTime(),   now.getTime()));
    if (clippedEnd.getTime() <= clippedStart.getTime()) continue;

    // Walk day-by-day and intersect with each day's working hours
    const dayCursor = new Date(clippedStart);
    dayCursor.setHours(0, 0, 0, 0);
    const lastDay = new Date(clippedEnd);
    lastDay.setHours(0, 0, 0, 0);

    while (dayCursor.getTime() <= lastDay.getTime()) {
      const dayOfWeek = dayCursor.getDay();
      const dayIndex  = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const hours     = getRoomWorkingHours(room, dayIndex);

      if (hours.enabled) {
        const whStart = new Date(dayCursor);
        whStart.setHours(hours.startHour, hours.startMinute, 0, 0);
        const whEnd = new Date(dayCursor);
        whEnd.setHours(hours.endHour, hours.endMinute, 0, 0);

        const overlapStart = Math.max(clippedStart.getTime(), whStart.getTime());
        const overlapEnd   = Math.min(clippedEnd.getTime(),   whEnd.getTime());
        if (overlapEnd > overlapStart) {
          const rawOverlapMins = (overlapEnd - overlapStart) / 60000;
          // Pro-rata break deduction: scale active time by (net / gross) so the
          // configurable daily break is consistently reflected in utilization.
          const grossMins  = Math.max(0, (whEnd.getTime() - whStart.getTime()) / 60000);
          const breakMins  = Math.min(getDayBreakMinutes(hours), grossMins);
          const netMins    = Math.max(0, grossMins - breakMins);
          const scale      = grossMins > 0 ? netMins / grossMins : 0;
          const adjusted   = Math.min(rawOverlapMins * scale, netMins);
          totalMins += adjusted;
        }
      }

      dayCursor.setDate(dayCursor.getDate() + 1);
    }
  }

  return totalMins;
}

// ── Helper: Calculate utilization percentage based on working hours ────────────
function calculateRoomUtilization(
  room: OperatingRoom,
  history: StatusHistoryRow[],
  period: Period
): number {
  const totalWorkingMinutes = getRoomTotalWorkingMinutes(room, period);
  if (totalWorkingMinutes === 0) return 0;

  const activeMinutes = calculateActiveTimeInWorkingHours(room, history, period);
  return Math.min(100, Math.round((activeMinutes / totalWorkingMinutes) * 100));
}

// ── Helper: Get formatted working hours string for a room ─────────���──────����─────
function formatRoomWorkingHours(room: OperatingRoom, dayIndex: number): string {
  const hours = getRoomWorkingHours(room, dayIndex);
  if (!hours.enabled) return 'Zavřeno';
  
  const formatTime = (h: number, m: number) => 
    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  
  return `${formatTime(hours.startHour, hours.startMinute)}–${formatTime(hours.endHour, hours.endMinute)}`;
}

// ── Tooltip shared style ─────────�����─��������──────────────────────────────────────────
const TIP = {
  contentStyle:{
    background:'rgba(2,8,23,0.97)',
    border:`1px solid ${C.border}`,
    borderRadius:10,
    fontSize:12,
    fontFamily:'var(--font-sans)',
    boxShadow:'0 16px 36px rgba(0,0,0,0.28)',
  },
  labelStyle:  { color:C.muted },
  itemStyle:   { color:C.accent },
};

// ── Helper fns ────────────────────────────────────────────────────────────────
// Determine if room is busy based on currentStepIndex (0 or 7 = ready/free, anything else = busy)
function isRoomBusyByStep(r: OperatingRoom): boolean {
  return r.currentStepIndex !== 0 && r.currentStepIndex !== 7;
}

// Get status color based on currentStepIndex (primary) or fallback to RoomStatus for cleaning/maintenance
function roomStatusColor(r: OperatingRoom): string {
  if (r.status === RoomStatus.CLEANING) return C.accent;
  if (r.status === RoomStatus.MAINTENANCE) return C.faint;
  return isRoomBusyByStep(r) ? C.orange : C.green;
}

// Get status label based on currentStepIndex (primary) or fallback to RoomStatus for cleaning/maintenance
function roomStatusLabel(r: OperatingRoom): string {
  if (r.status === RoomStatus.CLEANING) return 'Úklid';
  if (r.status === RoomStatus.MAINTENANCE) return 'Údržba';
  return isRoomBusyByStep(r) ? 'Obsazeno' : 'Volné';
}

// Legacy functions for backwards compatibility (some places still use RoomStatus enum directly)
function statusColor(s:RoomStatus){
  if(s===RoomStatus.BUSY)     return C.orange;
  if(s===RoomStatus.FREE)     return C.green;
  if(s===RoomStatus.CLEANING) return C.accent;
  return C.faint;
}
function statusLabel(s:RoomStatus){
  if(s===RoomStatus.BUSY)     return 'Obsazeno';
  if(s===RoomStatus.FREE)     return 'Volné';
  if(s===RoomStatus.CLEANING) return 'Úklid';
  return 'Údržba';
}
// Calculate working minutes for today based on room's schedule
function dayMinutes(r:OperatingRoom){ 
  // Get today's day index (Monday=0)
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  return getRoomWorkingMinutes(r, todayIndex);
}

type Seg={color:string;title:string;pct:number;min:number};
type WorkflowStep={name:string;title:string;color:string;organizer:string;status:string};

// Build a phase distribution exclusively from measured durations.
function buildTimeline(r:OperatingRoom,workflowSteps:WorkflowStep[], stepDurations?: number[]):Seg[]{
  const dm=dayMinutes(r);
  const durs=workflowSteps.map((_,i)=>Math.max(0, stepDurations?.[i] ?? 0));
  const total=durs.reduce((sum,duration)=>sum+duration,0);
  if (dm <= 0 || total <= 0) return [];
  return workflowSteps.flatMap((step,index) => {
    const duration = durs[index];
    return duration > 0
      ? [{ color: step.color, title: step.title, pct: (duration / total) * 100, min: duration }]
      : [];
  });
}

// Build distribution using actual step durations from real data
function buildDist(r:OperatingRoom,workflowSteps:WorkflowStep[], stepDurations?: number[]):Seg[]{
  // Use provided step durations from real data
  const durs=workflowSteps.map((_,i)=> stepDurations?.[i] || 0);
  const tot=durs.reduce((s,d)=>s+d,0) || 1;
  return workflowSteps.map((step,i)=>({color:step.color,title:step.title,pct:tot > 0 ? Math.round((durs[i]/tot)*100) : 0,min:durs[i]}));
}
function mergeSeg(segs:Seg[]):Seg[]{
  const out:Seg[]=[];
  for(const s of segs){
    const l=out[out.length-1];
    if(l&&l.title===s.title){l.pct+=s.pct;l.min+=s.min;}
    else out.push({...s});
  }
  return out;
}

// ── Room mini card (extracted so hooks are always called at component level) ──
interface RoomMiniCardProps { 
  r: OperatingRoom; 
  onClick: () => void; 
  workflowSteps: WorkflowStep[]; 
  stepDurations: number[];
  opsCount: number;
  utilization: number;
  /** Pokud true, vyrenderuje rozšířenou kartu s detail daty pro tisk/PDF */
  isPrinting?: boolean;
}
const RoomMiniCard: React.FC<RoomMiniCardProps> = memo(({ r, onClick, workflowSteps, stepDurations, opsCount, utilization, isPrinting }) => {
  const sc2   = roomStatusColor(r);
  const isBusy = isRoomBusyByStep(r);
  const tl2   = useMemo(() => mergeSeg(buildTimeline(r, workflowSteps, stepDurations)), [r, workflowSteps, stepDurations]);
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const workingHoursStr = formatRoomWorkingHours(r, todayIndex);
  const workingMinutes = getRoomWorkingMinutes(r, todayIndex);
  // Aktuální fáze workflow + její barva (pro Detail v tisku)
  const currentPhase = workflowSteps[r.currentStepIndex];
  const phaseLabel = currentPhase?.title ?? '—';
  const phaseColor = currentPhase?.color ?? sc2;
  // Doktor/sestra/anesteziolog jména pro print detail
  const doctorName = r.staff?.doctor?.name ?? '—';
  const nurseName  = r.staff?.nurse?.name  ?? '—';
  const anesthName = r.staff?.anesthesiologist?.name ?? '—';
  // Časy
  const fmtTime = (iso?: string | null) => iso ? new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '—';
  
  return (
    <button onClick={onClick}
      className="text-left rounded-lg p-3 w-full group"
      style={{
        background: isBusy ? `${sc2}08` : C.surface,
        border: `1px solid ${isBusy ? `${sc2}30` : C.border}`,
      }}>
      <div className="flex items-center justify-between mb-1.5 gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc2, boxShadow: `0 0 5px ${sc2}` }} />
          {/* Název sálu na JEDNOM řádku — `whitespace-nowrap` + `overflow-hidden`
              + `text-ellipsis`. Používáme adaptivní velikost fontu přes clamp,
              aby se i delší názvy ("Sál č. 1 - Traumatologie") vešly bez wrapu.
              Plný název je vždy dostupný v tooltipu. */}
          <span
            className="font-bold whitespace-nowrap overflow-hidden text-ellipsis min-w-0"
            style={{ color: C.text, fontSize: 'clamp(9px, 0.78vw, 12px)' }}
            title={r.name}
          >
            {r.name}
          </span>
        </div>
      </div>
      <p className="text-[10px] mb-1 whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: C.faint }} title={r.department}>{r.department}</p>
      {/* Working hours indicator */}
      <div className="flex items-center gap-1 mb-2">
        <Clock className="w-2.5 h-2.5" style={{ color: C.muted }} />
        <span className="text-[9px]" style={{ color: C.muted }}>
          {workingHoursStr} ({Math.round(workingMinutes / 60)}h)
        </span>
      </div>
      {/* Micro timeline */}
      <div className="flex h-1.5 w-full rounded overflow-hidden gap-px mb-2">
        {tl2.map((seg, si) => (
          <div key={si} className="h-full shrink-0" style={{ width: `${seg.pct}%`, background: seg.color, opacity: 0.85 }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <p className="text-[8px]" style={{ color: C.ghost }}>Ops (prac.)</p>
            <p className="text-sm font-bold leading-none" style={{ color: C.accent }}>{opsCount}</p>
          </div>
          <div>
            <p className="text-[8px]" style={{ color: C.ghost }}>Využití</p>
            <p className="text-sm font-bold leading-none" style={{ color: C.text }}>{utilization}%</p>
          </div>
        </div>
        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: `${sc2}14`, color: sc2 }}>
          {roomStatusLabel(r).slice(0, 3)}
        </span>
      </div>

      {/* ── Print-only rozšířený detail sálu ────���──────────────────────����───
          Při tisku ukážeme všechna důležitá data jako v RoomDetail panelu:
          aktuální fáze, personál, časy pacienta, příznaky (UPS/septický/atd.). */}
      {isPrinting && (
        <div className="mt-2 pt-2" style={{ borderTop: `1px dashed ${C.border}` }}>
          {/* Aktuální fáze */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: phaseColor }} />
            <p className="text-[9px] uppercase font-bold tracking-wider" style={{ color: C.muted }}>Fáze:</p>
            <p className="text-[10px] font-bold flex-1" style={{ color: phaseColor }}>{phaseLabel}</p>
          </div>

          {/* Personál — 3 řádky kompaktně */}
          <div className="grid grid-cols-1 gap-0.5 mb-1.5">
            <div className="flex items-center gap-1.5 text-[9px]">
              <span style={{ color: C.ghost }} className="w-12 shrink-0">Lékař:</span>
              <span style={{ color: C.text }} className="font-medium truncate">{doctorName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px]">
              <span style={{ color: C.ghost }} className="w-12 shrink-0">Sestra:</span>
              <span style={{ color: C.text }} className="font-medium truncate">{nurseName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px]">
              <span style={{ color: C.ghost }} className="w-12 shrink-0">Anest.:</span>
              <span style={{ color: C.text }} className="font-medium truncate">{anesthName}</span>
            </div>
          </div>

          {/* Časy pacienta */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mb-1.5">
            <div className="flex items-center gap-1 text-[9px]">
              <span style={{ color: C.ghost }}>Volán:</span>
              <span style={{ color: C.text }} className="font-mono">{fmtTime(r.patientCalledAt)}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px]">
              <span style={{ color: C.ghost }}>Přijel:</span>
              <span style={{ color: C.text }} className="font-mono">{fmtTime(r.patientArrivedAt)}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px]">
              <span style={{ color: C.ghost }}>Start:</span>
              <span style={{ color: C.text }} className="font-mono">{fmtTime(r.operationStartedAt)}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px]">
              <span style={{ color: C.ghost }}>Konec:</span>
              <span style={{ color: C.text }} className="font-mono">{fmtTime(r.estimatedEndTime)}</span>
            </div>
          </div>

          {/* Indikátory & příznaky */}
          <div className="flex flex-wrap gap-1">
            {r.queueCount > 0 && (
              <span className="text-[8px] font-bold px-1 py-px rounded" style={{ background: `${C.accent}15`, color: C.accent }}>
                Fronta: {r.queueCount}
              </span>
            )}
            <span className="text-[8px] font-bold px-1 py-px rounded" style={{ background: `${C.text}10`, color: C.text }}>
              24h: {r.operations24h}
            </span>
            {r.isSeptic && <span className="text-[8px] font-bold px-1 py-px rounded" style={{ background: `${C.red}20`, color: C.red }}>SEPTICKÝ</span>}
            {r.isEmergency && <span className="text-[8px] font-bold px-1 py-px rounded" style={{ background: `${C.red}20`, color: C.red }}>POHOT.</span>}
            {r.isLocked && <span className="text-[8px] font-bold px-1 py-px rounded" style={{ background: `${C.muted}20`, color: C.muted }}>UZAMČEN</span>}
            {r.isPaused && <span className="text-[8px] font-bold px-1 py-px rounded" style={{ background: `${C.yellow}20`, color: C.yellow }}>PAUZA</span>}
            {r.isEnhancedHygiene && <span className="text-[8px] font-bold px-1 py-px rounded" style={{ background: `${C.accent}20`, color: C.accent }}>HYG+</span>}
          </div>
        </div>
      )}
    </button>
  );
});

// ── Card primitive ────────────────────────────────────────────────────────────
function Card({children,className='',style={}}:{children:React.ReactNode;className?:string;style?:React.CSSProperties}){
  return(
    <div className={`statistics-card rounded-xl ${className}`} style={{background:C.surface,border:`1px solid ${C.border}`,...style}}>
      {children}
    </div>
  );
}
function SectionLabel({children}:{children:React.ReactNode}){
  return <p className="statistics-section-label text-[11px] font-semibold uppercase tracking-[0.1em] mb-4" style={{color:C.muted}}>{children}</p>;
}
function EmptyState({title,desc}:{title:string;desc:string}){
  return (
    <div className="h-40 flex flex-col items-center justify-center text-center px-4">
      <p className="text-sm font-semibold" style={{color:C.text}}>{title}</p>
      <p className="text-xs mt-1" style={{color:C.muted}}>{desc}</p>
    </div>
  );
}
function TrendBadge({v}:{v:number}){
  if(v>0) return(
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:`${C.green}18`,color:C.green}}>
      <TrendingUp className="w-3 h-3"/>+{v}%
    </span>
  );
  if(v<0) return(
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:`${C.red}18`,color:C.red}}>
      <TrendingDown className="w-3 h-3"/>{v}%
    </span>
  );
  return <span className="text-[10px]" style={{color:C.ghost}}>—</span>;
}

// ══════������═══════════════════════════════════════�����══════════════════════════════
// ROOM DETAIL PANEL
// ══════════════════════════════════════════════════════�������═���════════════════════
interface RoomPanelProps{ room:OperatingRoom; onClose:()=>void; workflowSteps:WorkflowStep[]; }

const RoomDetailPanel:React.FC<RoomPanelProps> = ({room,onClose,workflowSteps})=>{
  const sc     = roomStatusColor(room);
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const todayWorkingHours = getRoomWorkingHours(room, todayIndex);
  const todayWorkingHoursLabel = formatRoomWorkingHours(room, todayIndex);

  // State must be declared first - before any useMemo that depends on it
  const [roomHistory, setRoomHistory] = useState<StatusHistoryRow[]>([]);
  
  // Load room-specific history
  useEffect(() => {
    const loadRoomHistory = async () => {
      const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const history = await fetchStatusHistory({ 
        roomId: room.id, 
        fromDate, 
        toDate: new Date(),
        limit: 1000 
      });
      if (history) setRoomHistory(history);
    };
    loadRoomHistory();
  }, [room.id]);

  // Calculate room-specific step durations from history
  const roomStepDurationsForCalc = useMemo(() => {
    return calculateAvgStepDurations(roomHistory, workflowSteps);
  }, [roomHistory, workflowSteps]);
  
  const tl     = useMemo(()=>mergeSeg(buildTimeline(room,workflowSteps, roomStepDurationsForCalc)),[room,workflowSteps, roomStepDurationsForCalc]);
  const dist   = useMemo(()=>buildDist(room,workflowSteps, roomStepDurationsForCalc),[room,workflowSteps, roomStepDurationsForCalc]);
  const opsDay = room.operations24h;
  const utilPct= dist.find(d=>d.title==='Chirurgický výkon')?.pct??0;

  // Day utilisation curve from real data using room's weekly schedule
  const dayCurve=useMemo(()=>{
    // Get today's day index (Monday=0)
    if (!todayWorkingHours.enabled) return [];
    const start = todayWorkingHours.startHour;
    const end = todayWorkingHours.endHour + (todayWorkingHours.endMinute > 0 ? 1 : 0);
    
    const hourCounts: Record<number, number> = {};
    for (let h = start; h < end; h++) hourCounts[h] = 0;
    
    roomHistory.filter(e => e.event_type === 'step_change' || e.event_type === 'operation_start')
      .forEach(e => {
        const hour = new Date(e.timestamp).getHours();
        if (hour >= start && hour < end) {
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      });
    
    return Array.from({length:end-start},(_,i)=>({
      t:`${start+i}`,
      v: hourCounts[start+i],
    }));
  },[roomHistory,todayWorkingHours]);

  // Weekly stacked data from real data, respecting room's schedule
  const weeklyStacked=useMemo(()=>DAYS.map((day,di)=>{
    const base:Record<string,number|string>={day};
    const dayHours = getRoomWorkingHours(room, di);
    
    // If room doesn't operate this day, return zeros
    if (!dayHours.enabled) {
      workflowSteps.forEach((step) => {
        base[step.title] = 0;
      });
      return base;
    }
    
    // Count events for this day of week
    const dayEvents = roomHistory.filter(e => {
      const eventDay = new Date(e.timestamp).getDay();
      const adjustedDay = eventDay === 0 ? 6 : eventDay - 1;
      return adjustedDay === di && e.event_type === 'step_change';
    });
    
    workflowSteps.forEach((step) => {
      const stepEvents = dayEvents.filter(e => e.step_name === step.title);
      const totalDuration = stepEvents.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
      base[step.title] = Math.round(totalDuration / 60); // Convert to minutes
    });
    return base;
  }),[roomHistory,workflowSteps,room]);

  // Hourly event counts from recorded history
  const hourlyEvents=useMemo(()=>dayCurve.map(d=>({
    t:d.t,
    events:d.v,
  })),[dayCurve]);

  // Phase bar - using room step durations calculated earlier
  const phaseBar=useMemo(()=>workflowSteps.map((step,i)=>({
    name:step.title.split(' ').slice(-1)[0],
    pct:dist.find(d=>d.title===step.title)?.pct??0,
    min:roomStepDurationsForCalc[i] || 0,
    color:step.color,
  })),[dist,roomStepDurationsForCalc,workflowSteps]);

  // Pie from dist
  const pieData=dist.filter(d=>d.min>0);

  // 30-day cumulative from real data
  const cumulData=useMemo(()=>{
    const last30Days: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
      last30Days[date.toISOString().split('T')[0]] = 0;
    }
    
    roomHistory.filter(e => e.event_type === 'operation_end').forEach(e => {
      const day = e.timestamp.split('T')[0];
      if (last30Days[day] !== undefined) {
        last30Days[day] = (last30Days[day] || 0) + 1;
      }
    });
    
    let cum = 0;
    return Object.entries(last30Days).map(([_, daily], i) => {
      cum += daily;
      return { d: `${i + 1}`, daily, cum };
    });
  },[roomHistory]);

  // Utilisation per status (time-based %)
  const statusUtil=[
    {label:'Výkon',      pct:utilPct,                         color:workflowSteps[3]?.color || '#FCA5A5'},
    {label:'Anestezie',  pct:(dist.find(d=>d.title==='Začátek anestezie')?.pct??0)+(dist.find(d=>d.title==='Ukončení anestezie')?.pct??0), color:workflowSteps[2]?.color || '#C4B5FD'},
    {label:'Příprava',   pct:(dist.find(d=>d.title==='Příjezd na sál')?.pct??0)+(dist.find(d=>d.title==='Ukončení výkonu')?.pct??0),       color:workflowSteps[1]?.color || '#5EEAD4'},
    {label:'Úklid',      pct:dist.find(d=>d.title==='Ukončení anestezie')?.pct??0,                                                         color:workflowSteps[5]?.color || '#A5B4FC'},
    {label:'Volno',      pct:dist.find(d=>d.title==='Sál připraven')?.pct??0,                                                               color:workflowSteps[0]?.color || '#34D399'},
  ];

  return(
    <div className="statistics-module fixed inset-0 z-50 flex justify-end" style={{background:'rgba(0,0,0,0.7)'}} onClick={onClose}>
      <div className="h-full overflow-y-auto hide-scrollbar w-full max-w-3xl"
        style={{background:'#020B17',borderLeft:`1px solid ${C.border}`}}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-7 py-5"
          style={{background:'rgba(2,8,23,0.96)',borderBottom:`1px solid ${C.border}`,backdropFilter:'blur(8px)'}}>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full" style={{background:sc,boxShadow:`0 0 8px ${sc}`}}/>
            <div>
              <p className="text-base font-bold" style={{color:C.text}}>{room.name}</p>
              <p className="text-xs mt-0.5" style={{color:C.muted}}>
                {room.department}
                {room.isSeptic&&<span className="ml-2 font-bold" style={{color:C.red}}>· SEPTICKÝ</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors"
            style={{background:C.ghost,color:C.muted}}>
            <X className="w-4 h-4"/>
          </button>
        </div>

        <div className="p-7 space-y-7">

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              {l:'Výkony / den',v:opsDay,       c:C.accent},
              {l:'Využití výkonem',v:`${utilPct}%`, c:C.text},
              {l:'Provoz',v:todayWorkingHoursLabel, c:C.muted},
              {l:'Fronta',v:room.queueCount,    c:room.queueCount>0?C.yellow:C.muted},
            ].map(k=>(
              <Card key={k.l} className="p-4 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{color:C.muted}}>{k.l}</p>
                <p className="text-2xl font-bold leading-none" style={{color:k.c}}>{k.v}</p>
              </Card>
            ))}
          </div>

          {/* Timeline bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>Rozložení naměřených fází — {todayWorkingHoursLabel}</SectionLabel>
            </div>
            <div className="flex h-7 w-full rounded-lg overflow-hidden gap-px">
              {tl.map((seg,i)=>(
                <div key={i} className="h-full relative"
                  style={{background:seg.color,opacity:0.88,width:`${seg.pct}%`}}
                  title={`${seg.title} — ${seg.min} min (${seg.pct.toFixed(1)}%)`}>
                  {seg.pct>=9&&(
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-black/60 pointer-events-none">
                      {Math.round(seg.pct)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-2 mt-3">
              {tl.filter(s=>s.pct>1).map((seg,i)=>(
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{background:seg.color}}/>
                  <div>
                    <p className="text-[10px] leading-tight" style={{color:C.muted}}>{seg.title}</p>
                    <p className="text-xs font-bold leading-tight" style={{color:seg.color}}>
                      {Math.round(seg.pct)}%
                      <span className="font-normal ml-1" style={{color:C.faint}}>{seg.min} min</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row: Day curve + Status distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="p-5">
              <SectionLabel>Zaznamenané události v průběhu dne</SectionLabel>
              <ResponsiveContainer width="100%" height={140} minWidth={0} minHeight={0}>
                <AreaChart data={dayCurve} margin={{top:4,right:0,bottom:0,left:-24}}>
                  <defs>
                    <linearGradient id={`rg${room.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={sc} stopOpacity={0.28}/>
                      <stop offset="95%" stopColor={sc} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" stroke={C.ghost} fontSize={11} tickLine={false} axisLine={false}/>
                  <YAxis stroke={C.ghost} fontSize={11} tickLine={false} axisLine={false} domain={[0,100]}/>
                  <Tooltip {...TIP} formatter={(v:number)=>[`${v}%`,'Využití']}/>
                  <Area type="monotone" dataKey="v" stroke={sc} fill={`url(#rg${room.id})`} strokeWidth={1.5} dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-5">
              <SectionLabel>Procentuální využití statusů</SectionLabel>
              <div className="space-y-3">
                {statusUtil.map((s,i)=>(
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-[2px] shrink-0" style={{background:s.color}}/>
                        <span className="text-xs" style={{color:C.muted}}>{s.label}</span>
                      </div>
                      <span className="text-sm font-bold" style={{color:s.color}}>{s.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{background:C.ghost}}>
                      <div className="h-full rounded-full" style={{background:s.color,opacity:0.85,width:`${s.pct}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Row: Hourly stacked + Weekly stacked */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="p-5">
              <SectionLabel>Počet zaznamenaných událostí za hodinu</SectionLabel>
              <ResponsiveContainer width="100%" height={150} minWidth={0} minHeight={0}>
                <BarChart data={hourlyEvents} margin={{top:4,right:0,bottom:0,left:-24}} barSize={12}>
                  <XAxis dataKey="t" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                  <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                  <Tooltip {...TIP}/>
                  <Bar dataKey="events" fill={sc} opacity={0.78} radius={[2,2,0,0]} name="Události"/>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-5">
              <SectionLabel>Týdenní workflow fáze — min/den</SectionLabel>
              <ResponsiveContainer width="100%" height={150} minWidth={0} minHeight={0}>
                <BarChart data={weeklyStacked} margin={{top:4,right:0,bottom:0,left:-24}} barSize={16}>
                  <XAxis dataKey="day" stroke={C.ghost} fontSize={11} tickLine={false} axisLine={false}/>
                  <YAxis stroke={C.ghost} fontSize={10}  tickLine={false} axisLine={false}/>
                  <Tooltip {...TIP}/>
                  {workflowSteps.map(step=>(
                    <Bar key={step.title} dataKey={step.title} stackId="w" fill={step.color} opacity={0.8}/>
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {workflowSteps.map(s=>(
                  <div key={s.title} className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-[2px]" style={{background:s.color}}/>
                    <span className="text-[9px]" style={{color:C.faint}}>{s.title.split(' ').slice(-1)[0]}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Row: measured phase duration + cycle structure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="p-5">
              <SectionLabel>Délka fází ��� minuty</SectionLabel>
              <ResponsiveContainer width="100%" height={160} minWidth={0} minHeight={0}>
                <BarChart data={phaseBar} layout="vertical" margin={{top:0,right:16,bottom:0,left:0}} barSize={8}>
                  <XAxis type="number" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                  <YAxis type="category" dataKey="name" stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false} width={52}/>
                  <Tooltip {...TIP} formatter={(v:number)=>[`${v} min`,'Trvání']}/>
                  <Bar dataKey="min" radius={[0,2,2,0]}>
                    {phaseBar.map((e,i)=><Cell key={i} fill={e.color} opacity={0.82}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-5">
              <SectionLabel>Struktura cyklu (%)</SectionLabel>
              <ResponsiveContainer width="100%" height={140} minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie data={pieData} dataKey="pct" nameKey="title" cx="50%" cy="50%"
                    innerRadius={34} outerRadius={56} paddingAngle={2} strokeWidth={0}>
                    {pieData.map((_,i)=><Cell key={i} fill={pieData[i].color} opacity={0.85}/>)}
                  </Pie>
                  <Tooltip contentStyle={TIP.contentStyle} formatter={(v:number,name:string)=>[`${v}%`,name]}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {pieData.map((d,i)=>(
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-[2px]" style={{background:d.color}}/>
                    <span className="text-[10px]" style={{color:C.faint}}>{d.title.split(' ').slice(-1)[0]}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Cumulative 30-day */}
          <Card className="p-5">
            <SectionLabel>Kumulativní počet výkonů — 30 dní</SectionLabel>
            <ResponsiveContainer width="100%" height={120} minWidth={0} minHeight={0}>
              <ComposedChart data={cumulData} margin={{top:4,right:4,bottom:0,left:-16}}>
                <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3"/>
                <XAxis dataKey="d" stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false}
                  ticks={['1','5','10','15','20','25','30']}/>
                <YAxis yAxisId="l" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                <YAxis yAxisId="r" orientation="right" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                <Tooltip {...TIP}/>
                <Bar yAxisId="l" dataKey="daily" fill={sc} opacity={0.35} radius={[1,1,0,0]} name="Denní výkony"/>
                <Line yAxisId="r" type="monotone" dataKey="cum" stroke={C.green} strokeWidth={2} dot={false} name="Kumulativní"/>
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex gap-5 mt-2">
              {[{c:sc,l:'Denní výkony'},{c:C.green,l:'Kumulativní součet'}].map(x=>(
                <div key={x.l} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-[2px]" style={{background:x.c}}/>
                  <span className="text-[10px]" style={{color:C.muted}}>{x.l}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Workflow step badges */}
          <div>
            <SectionLabel>Aktuální fáze workflow</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {workflowSteps.map((step,i)=>{
                const cur=i===room.currentStepIndex;
                const done=i<room.currentStepIndex;
                return(
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        background:cur?`${step.color}20`:done?'rgba(255,255,255,0.04)':'transparent',
                        color:cur?step.color:done?'rgba(255,255,255,0.45)':'rgba(255,255,255,0.18)',
                        border:`1px solid ${cur?step.color:'rgba(255,255,255,0.07)'}`,
                      }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{background:step.color,opacity:cur?1:0.3}}/>
                      {step.title}
                    </div>
                    {i<workflowSteps.length-1&&(
                      <div className="w-2 h-px" style={{background:'rgba(255,255,255,0.08)'}}/>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MODULE
// ══════════════════════════════════════════════════════════════════════════════
const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms: propRooms }) => {
  const isMobileDark = useIsMobileDark();
  const isMobileViewport = useMediaQuery('(max-width: 767px)');
  // Get workflow statuses from database context - already filtered and sorted
  const { workflowStatuses } = useWorkflowStatusesContext();
  
  // workflowStatuses is already filtered (active, non-special) and sorted by context
  // Map to WORKFLOW_STEPS format
  const WORKFLOW_STEPS = useMemo(() => 
    workflowStatuses.map(s => ({
      name: s.name,
      title: s.title || s.name,
      color: s.accent_color || s.color,
      organizer: s.name,
      status: s.is_active ? 'Active' : 'Inactive',
    })),
    [workflowStatuses]
  );
  
  const rooms  = propRooms ?? [];
  const [period, setPeriod] = useState<Period>('den');
  const [tab,    setTab]    = useState<Tab>('prehled');
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom|null>(null);
  const { staff, loading: staffLoading } = useStaffData();
  const staffList = staffLoading ? null : staff;
  const { dbStats, statusHistory, notifications, devices } = useStatisticsData(period);

  // ── Export do tisku / PDF ─��─────────────────────────────────────────────────
  // Obě funkce volají `window.print()`. Prohlížeč zobrazí systémový dialog,
  // ve kterém uživatel může:
  //   • vybrat tiskárnu a vytisknout (varianta "Tisk")
  //   • zvolit "Uložit jako PDF" / "Microsoft Print to PDF" jako tiskárnu
  //     (varianta "PDF")
  // Před tiskem dočasně přepíšeme `document.title`, aby uložený PDF soubor
  // dostal přímo smysluplný název.
  // `isPrinting` flag během tisku zforsuje vyrenderování VŠECH záložek
  // (Přehled + Sály + Fáze + Heatmapa) najednou — bez něj by se exportovala
  // pouze aktuálně aktivní záložka. Po zavření print dialogu se flag vrátí
  // na false a zobrazení se vrátí do normálního stavu.
  const [isPrinting, setIsPrinting] = useState(false);

  const triggerPrint = useCallback((filename: string) => {
    if (typeof window === 'undefined') return;
    const original = document.title;
    document.title = filename;
    // Aktivujeme print režim — všechny záložky se vyrenderují
    setIsPrinting(true);

    // Sled timeoutů — postupně:
    //   1× requestAnimationFrame  → React si stihne připravit nový state
    //   2× requestAnimationFrame  → DOM commit + layout
    //   1200 ms timeout           → Recharts ResponsiveContainery změří
    //                               viewport, Framer Motion staggered animace
    //                               (max ~600 ms s delay i*0.04 + 0.3 dur)
    //                               doběhnou, line/area charty doanimují.
    // Bez tohoto by graf zůstal prázdný a část karet by byla mid-fade.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            window.print();
          } finally {
            // Robust cleanup — po zavření print dialogu nebo chybě
            setTimeout(() => {
              setIsPrinting(false);
              document.title = original;
            }, 500);
          }
        }, 1200);
      });
    });
  }, []);

  const handlePrint = useCallback(() => {
    const dateStr = new Date().toLocaleDateString('cs-CZ');
    triggerPrint(`Statistiky - ${period} - ${dateStr}`);
  }, [period, triggerPrint]);

  const handleExportPdf = useCallback(() => {
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerPrint(`Statistiky_${period}_${dateStr}.pdf`);
  }, [period, triggerPrint]);

  // Lokalizovaný popis aktuálního období pro print-only hlavičku reportu
  const periodLabelMap: Record<Period, string> = {
    'den':   'Posledních 24 hodin',
    'týden': 'Posledních 7 dní',
    'měsíc': 'Posledních 30 dní',
    'rok':   'Posledních 365 dní',
  };
  const tabLabelMap: Record<Tab, string> = {
'prehled':    'Přehled',
'finance':    'Finance',
'personal':   'Personál',
'saly':       'Sály',
'faze':       'Fáze',
'notifikace': 'Notifikace',
'zarizeni':   'Zařízení',
  };

  // Per-room utilization calculated from measured operation intervals and configured schedules.
  const utilData = useMemo(() => {
    return rooms.map(room => ({
      t: room.name.replace('Sál č. ', 'S'),
      v: calculateRoomUtilization(room, statusHistory, period),
      cap: 100,
    }));
  }, [statusHistory, period, rooms]);

  // Calculate average step durations from real history data
  const avgStepDurations = useMemo(() => {
    return calculateAvgStepDurations(statusHistory, WORKFLOW_STEPS);
  }, [statusHistory, WORKFLOW_STEPS]);

  // Calculate total operations within working hours across all rooms
  const totalOpsInWorkingHours = useMemo(() => {
    return rooms.reduce((sum, r) => sum + countOperationsInWorkingHours(r, statusHistory, period), 0);
  }, [rooms, statusHistory, period]);
  
  // Calculate average utilization based on working hours
  const avgUtilFromWorkingHours = useMemo(() => {
    if (rooms.length === 0) return 0;
    const totalUtil = rooms.reduce((sum, r) => sum + calculateRoomUtilization(r, statusHistory, period), 0);
    return Math.round(totalUtil / rooms.length);
  }, [rooms, statusHistory, period]);
  
  const avgUtil   = avgUtilFromWorkingHours;
  const utilValues = utilData.length > 0 ? utilData.map(d=>d.v) : [0];
  const peakUtil  = Math.max(...utilValues);
  const minUtil   = Math.min(...utilValues);
  const totalOps  = totalOpsInWorkingHours;
  // Determine busy/free based on currentStepIndex (0 or 7 = ready/free, anything else = busy)
  // This matches the logic in App.tsx header stats
  const isRoomBusy = (r: OperatingRoom) => r.currentStepIndex !== 0 && r.currentStepIndex !== 7;
  const busyCount = rooms.filter(isRoomBusy).length;
  const freeCount = rooms.filter(r => !isRoomBusy(r)).length;
  const cleanCount= rooms.filter(r=>r.status===RoomStatus.CLEANING).length;
  const maintCount= rooms.filter(r=>r.status===RoomStatus.MAINTENANCE).length;
  const totalQueue= rooms.reduce((s,r)=>s+r.queueCount,0);
  const septicCnt = rooms.filter(r=>r.isSeptic).length;
  const emergCnt  = dbStats?.emergencyCount ?? rooms.filter(r=>r.isEmergency).length;

  const deptMap = useMemo(()=>{
    const m:Record<string,number>={};
    rooms.forEach(r=>{
      const operations = countOperationsInWorkingHours(r, statusHistory, period);
      m[r.department]=(m[r.department]??0)+operations;
    });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[rooms,statusHistory,period]);

  // Per-room status utilisation from real status history (must be defined before roomBarData)
  const roomDistributions = useMemo(() => {
    return calculateRoomWorkflowDistribution(statusHistory, rooms, WORKFLOW_STEPS);
  }, [statusHistory, rooms, WORKFLOW_STEPS]);

  // Room bar data using real status history for utilization within working hours
  const roomBarData = useMemo(() => rooms.map(r => {
    // Calculate operations count within working hours
    const opsInWorkingHours = countOperationsInWorkingHours(r, statusHistory, period);
    // Calculate utilization based on working hours
    const utilPct = calculateRoomUtilization(r, statusHistory, period);
    // Get today's working hours for display
    const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    const workingHoursStr = formatRoomWorkingHours(r, todayIndex);
    
    return {
      name: r.name.replace('Sál č. ', 'S'),
      ops: opsInWorkingHours,
      util: utilPct,
      color: roomStatusColor(r),
      workingHours: workingHoursStr,
      totalWorkingMinutes: getRoomTotalWorkingMinutes(r, period),
    };
  }), [rooms, statusHistory, period]);

  // Generate opsTrend from real DB data only
  const opsTrend = useMemo(() => {
    if (dbStats?.operationsByDay && Object.keys(dbStats.operationsByDay).length > 0) {
      const days = Object.entries(dbStats.operationsByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7);
      return days.map(([date, count], i) => ({
        t: i === days.length - 1 ? 'Dnes' : `T-${days.length - 1 - i}`,
        v: count,
      }));
    }
    return [];
  }, [dbStats]);

  // Status pie data
  const statusPie=[
    {name:'Obsazeno',value:busyCount, color:C.orange},
    {name:'Volno',   value:freeCount, color:C.green},
    {name:'Úklid',   value:cleanCount,color:C.accent},
    {name:'Údržba',  value:maintCount,color:C.faint},
  ].filter(s=>s.value>0);

  // Aggregate workflow utilisation from real status history data
  const workflowAgg = useMemo(() => {
    return calculateWorkflowDistribution(statusHistory, WORKFLOW_STEPS);
  }, [statusHistory, WORKFLOW_STEPS]);

  // Utilisation per interval for comparison bar - use real data if available
  const intervalCompare = useMemo(() => {
    const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
    const dayOrder = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];
    
    if (dbStats?.operationsByDay && Object.keys(dbStats.operationsByDay).length > 0) {
      const byDay: Record<string, number[]> = {};
      Object.entries(dbStats.operationsByDay).forEach(([date, count]) => {
        const d = new Date(date);
        const dayName = dayNames[d.getDay()];
        if (!byDay[dayName]) byDay[dayName] = [];
        byDay[dayName].push(count);
      });
      
      return dayOrder.map(t => ({
        t,
        v: byDay[t]?.length > 0 
          ? Math.round(byDay[t].reduce((a, b) => a + b, 0) / byDay[t].length)
          : 0,
      }));
    }
    
    return [];
  }, [dbStats]);

  // Scatter: ops vs utilPct per room using real data within working hours
  const scatterData = useMemo(() => rooms.map(r => {
    const opsInWorkingHours = countOperationsInWorkingHours(r, statusHistory, period);
    const utilPct = calculateRoomUtilization(r, statusHistory, period);
    const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    
    return {
      ops: opsInWorkingHours,
      util: utilPct,
      queue: r.queueCount,
      name: r.name,
      workingHours: formatRoomWorkingHours(r, todayIndex),
      workingMinutes: getRoomWorkingMinutes(r, todayIndex),
    };
  }), [rooms, statusHistory, period]);

  // Per-room status bar (stacked bar) using roomDistributions defined above
  const roomStatusBar = useMemo(() => rooms.map((r, i) => {
    const dist = roomDistributions[r.id] || {};
    const base: Record<string, number | string> = { name: `S${i + 1}` };
    WORKFLOW_STEPS.forEach(step => {
      base[step.title] = dist[step.title] ?? 0;
    });
    return base;
  }), [rooms, roomDistributions, WORKFLOW_STEPS]);

const TABS:{ id:Tab; label:string }[]=[
{id:'prehled',    label:'Přehled'},
{id:'finance',    label:'Finance'},
{id:'personal',   label:'Personál'},
{id:'saly',       label:'Sály'},
{id:'faze',       label:'Fáze'},
{id:'notifikace', label:'Notifikace'},
{id:'zarizeni',   label:'Zařízení'},
  ];

  return(
    <>
      {/* ── Print loading overlay ─────────────────────────────────────────────
          Během 1200 ms wait okna mezi `setIsPrinting(true)` a `window.print()`
          uživatel vidí, že export běží. Bez tohoto by mu UI vypadalo jako
          zaseknuté nebo se náhle zdvojnásobilo (mobilní section + offscreen
          desktop). Overlay je pomocí `print-hide` v print režimu skrytý. */}
      {isPrinting && (
        <div
          className="print-hide fixed inset-0 flex items-center justify-center"
          style={{
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex flex-col items-center gap-4 px-8 py-6 rounded-xl"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${C.border}`,
            }}>
            <div className="w-10 h-10 rounded-full animate-spin"
              style={{
                border: `3px solid ${C.border}`,
                borderTopColor: C.accent,
              }} />
            <p className="text-sm font-bold uppercase tracking-widest" style={{ color: C.text }}>
              Připravuji export...
            </p>
            <p className="text-xs" style={{ color: C.muted }}>
              Vykreslují se grafy a všechny záložky včetně detailů
            </p>
          </div>
        </div>
      )}

      {/* Mobile background — unified with RoomDetail / Timeline / Staff */}
      <div
        aria-hidden
        className="mobile-theme-surface fixed inset-0 md:hidden pointer-events-none"
        style={{
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        className="fixed inset-0 md:hidden pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, var(--m-accent) 0%, transparent 65%)' }}
        />
      </div>

      {/* ========== MOBILE (md:hidden) ========== */}
      {isMobileViewport && !isPrinting && (
      <div
        className={`statistics-module mobile-statistics ${isMobileDark ? 'is-dark' : 'is-light'} md:hidden w-full relative`}
        style={{
          zIndex: 1,
          ...(!isMobileDark ? {
            '--stats-bg': '#EDF1F8',
            '--stats-surface': 'rgba(255, 255, 255, 0.94)',
            '--stats-surface-2': '#F5F7FB',
            '--stats-surface-3': '#FFFFFF',
            '--stats-surface-hover': '#F1F5FA',
            '--stats-surface-active': '#E8EEF7',
            '--stats-border': '#D7E1EE',
            '--stats-border-hover': '#C5D3E4',
            '--stats-border-active': '#AFC1D8',
            '--stats-text': '#33415F',
            '--stats-text-strong': '#17233F',
            '--stats-muted': '#687792',
            '--stats-faint': '#8795AB',
            '--stats-ghost': '#E5EBF3',
          } as React.CSSProperties : {}),
        }}
        data-print-area="statistics"
      >
        {/* ── Print-only hlavička pro mobilní export ── */}
        <div className="print-only mb-4" style={{ pageBreakAfter: 'avoid' }}>
          <div className="flex items-baseline justify-between border-b-2 border-black pb-2 mb-2">
            <h1 className="text-xl font-bold uppercase tracking-tight">
              Statistiky operačních sálů
            </h1>
            <p className="text-xs font-mono">
              {new Date().toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </div>
          <p className="text-xs">
            <strong>Záložka:</strong> {tabLabelMap[tab]} · <strong>Období:</strong> {periodLabelMap[period]} · <strong>Sály:</strong> {rooms.length}
          </p>
        </div>

        <div className="flex flex-col gap-5 print-section">
          <div className="print-hide">
            <MobileModuleHeader kicker="Statistiky" title="Provozní přehled">
              <MobileHeaderMetrics
                items={[
                  {
                    label: 'Využití',
                    value: avgUtil,
                    suffix: '%',
                    color: C.green,
                    icon: <Activity className="w-5 h-5" strokeWidth={2.2} />,
                  },
                  {
                    label: 'Výkony',
                    value: totalOps,
                    suffix: 'celkem',
                    color: C.accent,
                    icon: <BarChart3 className="w-5 h-5" strokeWidth={2.2} />,
                  },
                ]}
              />
            </MobileModuleHeader>
          </div>

          {/* Export buttons (mobile) */}
          <div className="flex items-center gap-2 print-hide">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest"
              style={{
                background: `${C.accent}14`,
                color: C.accent,
                border: `1px solid ${C.accent}40`,
              }}>
              <Printer className="w-4 h-4" />
              Tisk
            </button>
            <button
              onClick={handleExportPdf}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest"
              style={{
                background: `${C.yellow}14`,
                color: C.yellow,
                border: `1px solid ${C.yellow}40`,
              }}>
              <FileDown className="w-4 h-4" />
              PDF
            </button>
          </div>

          {/* Period toggle */}
          <div className="print-hide">
            <MobileSectionLabel className="mb-2">Období</MobileSectionLabel>
            <MobilePillTabs<Period>
              tabs={[
                { id: 'den', label: 'Den' },
                { id: 'týden', label: 'Týden' },
                { id: 'měsíc', label: 'Měsíc' },
                { id: 'rok', label: 'Rok' },
              ]}
              value={period}
              onChange={setPeriod}
            />
          </div>

          {/* Tab toggle */}
          <div className="print-hide">
            <MobilePillTabs<Tab>
tabs={[
{ id: 'prehled', label: 'Přehled' },
{ id: 'finance', label: 'Finance' },
{ id: 'personal', label: 'Personál' },
{ id: 'saly', label: 'Sály' },
{ id: 'faze', label: 'Fáze' },
{ id: 'notifikace', label: 'Notifikace' },
{ id: 'zarizeni', label: 'Zařízení' },
  ]}
              value={tab}
              onChange={setTab}
            />
          </div>

          {/* ── Přehled ── (vždy renderováno při tisku, bez page-breaks) */}
          {(tab === 'prehled' || isPrinting) && (
            <div className="flex flex-col gap-3 print-section">
              {isPrinting && <h2 className="print-tab-header print-only">Přehled</h2>}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { l: 'Obsazeno', v: `${busyCount}/${rooms.length}`, c: C.orange },
                  { l: 'Volno', v: `${freeCount}/${rooms.length}`, c: C.green },
                  { l: `Výkony (${period})`, v: totalOps, c: C.accent },
                  { l: `Využití (${period})`, v: `${avgUtil}%`, c: C.text },
                ].map(k => (
                  <div
                    key={k.l}
                    className="statistics-kpi-card rounded-2xl p-4"
                    style={{
                      background: `linear-gradient(135deg, ${k.c}12 0%, var(--stats-surface) 78%)`,
                      border: `1px solid ${k.c}2b`,
                    }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] leading-none" style={{ color: C.muted }}>
                      {k.l}
                    </p>
                    <p className="text-2xl font-semibold mt-2 tabular-nums" style={{ color: k.c }}>
                      {k.v}
                    </p>
                  </div>
                ))}
              </div>

              {/* Mini trend chart */}
              <MobileCard>
                <MobileSectionLabel className="mb-3">Využití jednotlivých sálů</MobileSectionLabel>
                <div style={{ width: '100%', height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={utilData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <defs>
                        <linearGradient id="mobile-util-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.accent} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="t"
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(10,10,18,0.95)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 12,
                          fontSize: 11,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke={C.accent}
                        strokeWidth={2}
                        fill="url(#mobile-util-grad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between text-[11px] text-white/50 mt-2 px-1">
                  <span>Nejvyšší: <span className="text-white/80 font-semibold">{peakUtil}%</span></span>
                  <span>Nejnižší: <span className="text-white/80 font-semibold">{minUtil}%</span></span>
                </div>
              </MobileCard>
            </div>
          )}

          {/* ── Sály ── (propracovaný RoomsTab) */}
          {(tab === 'saly' || isPrinting) && (
            <div className="flex flex-col gap-3 print-section">
              {isPrinting && <h2 className="print-tab-header print-only">Sály</h2>}
              <RoomsTab
                rooms={rooms}
                statusHistory={statusHistory}
                periodLabel={period}
                onRoomSelect={setSelectedRoom}
                calculateRoomUtilization={calculateRoomUtilization}
                countOperationsInWorkingHours={countOperationsInWorkingHours}
                workflowSteps={WORKFLOW_STEPS}
              />
            </div>
          )}

          {/* ── Fáze — propracovaný PhasesTab ── */}
          {(tab === 'faze' || isPrinting) && (
            <div className="flex flex-col gap-3 print-section">
              {isPrinting && <h2 className="print-tab-header print-only">Fáze</h2>}
              <PhasesTab
                rooms={rooms}
                statusHistory={statusHistory}
                periodLabel={period}
                workflowSteps={WORKFLOW_STEPS}
                avgStepDurations={avgStepDurations}
                workflowAgg={workflowAgg}
              />
            </div>
          )}

          {/* ── Personál & týmy ── */}
          {(tab === 'personal' || isPrinting) && (
            <div className="flex flex-col gap-3 print-section">
              {isPrinting && <h2 className="print-tab-header print-only">Personál</h2>}
              <StaffTab
                staff={staffList}
                rooms={rooms}
                periodLabel={period}
              />
            </div>
          )}
          
          {/* ── Finance & náklady (z hourly_operating_cost × historie) ── */}
          {(tab === 'finance' || isPrinting) && (
            <div className="flex flex-col gap-3 print-section">
              {isPrinting && <h2 className="print-tab-header print-only">Finance</h2>}
              <FinanceTab
                rooms={rooms}
                totalOps={totalOps}
                avgUtilization={avgUtil}
                periodLabel={period}
                statusHistory={statusHistory}
              />
            </div>
          )}

          {/* ── Notifikace ── */}
          {(tab === 'notifikace' || isPrinting) && (
            <div className="flex flex-col gap-3 print-section">
              {isPrinting && <h2 className="print-tab-header print-only">Notifikace</h2>}
              <MobileSectionLabel>Přehled notifikací</MobileSectionLabel>
              <NotificationsTab
                notifications={notifications}
                rooms={rooms}
                periodLabel={periodLabelMap[period]}
              />
            </div>
          )}


          {/* ── Zařízení ── */}
          {(tab === 'zarizeni' || isPrinting) && (
            <div className="flex flex-col gap-3 print-section">
              {isPrinting && <h2 className="print-tab-header print-only">Zařízení</h2>}
              <MobileSectionLabel>Připojená zařízení</MobileSectionLabel>
              <DevicesTab
                devices={devices}
                periodLabel={periodLabelMap[period]}
              />
            </div>
          )}
        </div>
      </div>
      )}

      {/* ========== DESKTOP (hidden md:block) ========== */}
      {/* `data-print-area="statistics"` označuje sekci, která se vytiskne /
          uloží do PDF. Zbytek stránky (sidebar atd.) se v print režimu skryje
          přes globální `@media print` pravidla v `app/globals.css`.
          
          Při `isPrinting` (i na mobilním zařízení) potřebujeme, aby desktop
          sekce byla v DOM a měla měřitelnou šířku — jinak Recharts
          ResponsiveContainery uvnitř měří 0×0 a grafy v PDF zůstanou prázdné.
          Dáme ji proto fixed offscreen pozici se šířkou 1024 px (typický
          desktop layout) — uživatel ji nevidí, ale Recharts ji změří. Print
          CSS pak při window.print() přemístí na origin a zviditelní. */}
      {(!isMobileViewport || isPrinting) && (
      <div
        className="statistics-module statistics-desktop hidden md:block w-full"
        data-print-area="statistics"
        style={isPrinting ? {
          display: 'block',
          position: 'fixed',
          top: 0,
          left: '-99999px',
          width: '1024px',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        } : undefined}
      >

      {/* ── Print-only hlavička reportu (minimalistická, černý text na bílém) ── */}
      <div className="print-only mb-3 px-3 pt-2" style={{ pageBreakAfter: 'avoid' }}>
        <div className="flex items-baseline justify-between pb-1.5 mb-1.5"
          style={{ borderBottom: '1px solid #cbd5e1' }}>
          <h1 className="text-base font-bold uppercase tracking-tight" style={{ color: '#0f172a' }}>
            Statistiky operačních sálů
          </h1>
          <p className="text-[9px] font-mono" style={{ color: '#475569' }}>
            {new Date().toLocaleString('cs-CZ', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[9px]" style={{ color: '#0f172a' }}>
          <span><span style={{ color: '#475569' }}>Období:</span> <strong>{periodLabelMap[period]}</strong></span>
          <span><span style={{ color: '#475569' }}>Počet sálů:</span> <strong>{rooms.length}</strong></span>
        </div>
      </div>

      {/* ── Module header — stejný vzor jako ostatní desktopové moduly ── */}
      <header className="mb-8 print-hide">
        <div className="mb-2 flex items-center gap-3 opacity-60">
          <BarChart3 className="h-4 w-4 text-[#FBBF24]" />
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#FBBF24]">
            OPERATINGROOM CONTROL
          </p>
        </div>
        <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-bold uppercase leading-none tracking-tight">
          STATISTIKY
        </h1>
      </header>

      {/* ── Row 1: Tab navigation ── */}
      <div className="statistics-tabs print-hide flex items-center gap-1 overflow-x-auto rounded-xl p-1"
        style={{
          border: `1px solid ${C.border}`,
          scrollbarWidth: 'thin',
          scrollbarColor: `${C.faint} transparent`,
        }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="rounded-lg px-4 py-2 text-[12px] font-medium whitespace-nowrap shrink-0"
            style={{
              color: tab === t.id ? C.text : C.muted,
              background: tab === t.id ? C.surfaceActive : 'transparent',
              border: `1px solid ${tab === t.id ? C.borderHover : 'transparent'}`,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Row 2: Period selector + Export ── */}
      <div className="print-hide flex items-center justify-between gap-4 py-4 mb-2">
        {/* Period pills */}
        <div className="flex items-center gap-1 p-1 rounded-lg"
          style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          {(['den','týden','měsíc','rok'] as Period[]).map(p=>(
            <button key={p} onClick={()=>setPeriod(p)}
              className="px-3 py-1.5 rounded-md text-[12px] font-medium"
              style={{
                background: period === p ? C.surface : 'transparent',
                color: period === p ? C.text : C.muted,
              }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        
        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            title="Vytisknout aktuální zobrazení"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{
              color: C.muted,
              border: `1px solid ${C.border}`,
            }}>
            <Printer className="w-4 h-4" />
            Tisk
          </button>
          <button
            onClick={handleExportPdf}
            title='Uložit aktuální zobrazení jako PDF (zvolte v dialogu „Uložit jako PDF")'
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{
              color: C.muted,
              border: `1px solid ${C.border}`,
            }}>
            <FileDown className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* ── Tab content ──
          Obsah záložek se přepíná bez vstupních animací. Při tisku se všechny
          sekce vyrenderují současně a prohlížeč je přirozeně stránkuje. */}
      <>
        {(tab==='prehled' || isPrinting) && (
          <div key="prehled" className="space-y-5 print-section">
            {isPrinting && (
              <h2 className="print-only text-sm font-bold uppercase tracking-tight mb-2 px-3" style={{ color: '#0f172a', borderLeft: '3px solid #0f172a', paddingLeft: '8px' }}>
                Přehled
              </h2>
            )}

            {/* KPI strip */}
            <div className="grid grid-cols-4 lg:grid-cols-8 rounded-xl overflow-hidden"
              style={{border:`1px solid ${C.border}`}}>
              {[
                {l:'Sálů celkem',      v:rooms.length,                          c:C.text},
                {l:'Obsazeno',         v:`${busyCount} / ${rooms.length}`,       c:C.orange},
                {l:'Volno',            v:`${freeCount} / ${rooms.length}`,       c:C.green},
                {l:'Úklid + Údržba',  v:`${cleanCount+maintCount}`,             c:C.accent},
                {l:`Využití (${period})`,v:`${avgUtil}%`,                        c:C.text},
                {l:'Nejvyšší využití sálu', v:`${peakUtil}%`,                    c:peakUtil>90?C.red:C.orange},
                {l:'Nejnižší využití sálu', v:`${minUtil}%`,                     c:C.muted},
                {l:`Výkony (${period})`,v:totalOps,                             c:C.accent},
              ].map((k,i)=>(
                <div key={i} className="flex flex-col justify-between px-4 py-4"
                  style={{background:C.surface,borderRight:i<7?`1px solid ${C.border}`:undefined}}>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-2.5" style={{color:C.muted}}>{k.l}</p>
                  <p className="text-2xl font-bold leading-none" style={{color:k.c}}>{k.v}</p>
                </div>
              ))}
            </div>

            {/* Per-room KPI strips — real operational data per room */}
            <div className="space-y-3">
              <SectionLabel>Jednotlivé sály — provozní metriky ({period})</SectionLabel>
              {rooms.map(r => {
                const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
                const opsInHours = countOperationsInWorkingHours(r, statusHistory, period);
                const util = calculateRoomUtilization(r, statusHistory, period);
                const activeMins = Math.round(calculateActiveTimeInWorkingHours(r, statusHistory, period));
                const totalMins = getRoomTotalWorkingMinutes(r, period);
                const workingHoursToday = formatRoomWorkingHours(r, todayIndex);
                const todayHours = getRoomWorkingHours(r, todayIndex);
                const todayBreak = todayHours.enabled ? getDayBreakMinutes(todayHours) : 0;
                const flags: string[] = [];
                if (r.isEmergency) flags.push('EMERG');
                if (r.isSeptic)    flags.push('SEPT');
                const flagsLabel = flags.length > 0 ? flags.join(' · ') : '—';
                const flagsColor = r.isEmergency ? C.orange : r.isSeptic ? C.red : C.faint;

                const cells = [
                  // Plný název sálu (bez zkrácení "Sál č. " → "S") — uživatel
                  // chce vidět kompletní označení sálu i v KPI stripu.
                  { l: 'Sál',                   v: r.name,                         c: C.text },
                  { l: 'Stav',                  v: roomStatusLabel(r),             c: roomStatusColor(r) },
                  { l: 'Využití v prac. době',  v: `${util}%`,                     c: util >= 80 ? C.green : util >= 50 ? C.yellow : util > 0 ? C.orange : C.muted },
                  { l: `Výkony (${period})`,    v: opsInHours,                     c: C.accent },
                  { l: 'Pracovní doba',         v: workingHoursToday,              c: workingHoursToday === 'Zavřeno' ? C.faint : C.text },
                  { l: 'Přestávka',             v: todayHours.enabled ? `${todayBreak} m` : '—', c: todayHours.enabled ? C.text : C.faint },
                  { l: 'Aktivní / Kap.',        v: `${activeMins} / ${Math.round(totalMins)} m`, c: C.text },
                  { l: 'Příznaky',              v: flagsLabel,                     c: flagsColor },
                ];

                return (
                  <div
                    key={r.id}
                    className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 rounded-xl overflow-hidden"
                    style={{border:`1px solid ${C.border}`}}>
                    {cells.map((k, i) => (
                      <div
                        key={i}
                        className="flex flex-col justify-between px-4 py-3"
                        style={{
                          background: C.surface,
                          borderRight: i < cells.length - 1 ? `1px solid ${C.border}` : undefined,
                        }}>
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{color: C.muted}}>
                          {k.l}
                        </p>
                        {/* Hodnota buňky — JEDEN řádek (`whitespace-nowrap`)
                            s adaptivní velikostí písma přes clamp. Pokud se
                            název nevejde, zobrazí se ellipsis a plný text
                            zůstává v `title` tooltipu. */}
                        <p
                          className="font-bold leading-none whitespace-nowrap overflow-hidden text-ellipsis"
                          style={{ color: k.c, fontSize: 'clamp(11px, 0.95vw, 16px)' }}
                          title={String(k.v)}
                        >
                          {k.v}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })}
              {rooms.length === 0 && (
                <p className="text-xs py-4 text-center" style={{color: C.faint}}>
                  Žádné sály k zobrazení.
                </p>
              )}
            </div>

            {/* Row 1: Main area + Status pie */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card className="lg:col-span-2 p-5">
                <SectionLabel>Využití jednotlivých sálů — {period}</SectionLabel>
                <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={0}>
                  <ComposedChart data={utilData} margin={{top:4,right:4,bottom:0,left:-24}}>
                    <defs>
                      <linearGradient id="ugrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.accent} stopOpacity={0.20}/>
                        <stop offset="95%" stopColor={C.accent} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3"/>
                    <XAxis dataKey="t" stroke={C.ghost} fontSize={11} tickLine={false} axisLine={false}/>
                    <YAxis stroke={C.ghost} fontSize={11} tickLine={false} axisLine={false} domain={[0,100]} tickFormatter={(v:number)=>`${v}%`}/>
                    <Tooltip {...TIP} formatter={(v:number)=>[`${v}%`,'Využití']}/>
                    {/* Capacity line */}
                    <Line type="monotone" dataKey="cap" stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Kapacita"/>
                    <Area type="monotone" dataKey="v" stroke={C.accent} fill="url(#ugrad)" strokeWidth={2} dot={false} name="Využití"/>
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-5">
                <SectionLabel>Stav sálů — podíl</SectionLabel>
                <ResponsiveContainer width="100%" height={160} minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie data={statusPie} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" innerRadius={42} outerRadius={66} paddingAngle={3} strokeWidth={0}>
                      {statusPie.map((_,i)=><Cell key={i} fill={statusPie[i].color} opacity={0.85}/>)}
                    </Pie>
                    <Tooltip contentStyle={TIP.contentStyle} formatter={(v:number,name:string)=>[`${v} sálů`,name]}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                  {statusPie.map(s=>(
                    <div key={s.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{background:s.color}}/>
                      <span className="text-xs" style={{color:C.muted}}>{s.name}</span>
                      <span className="text-xs font-bold ml-auto" style={{color:s.color}}>{s.value}</span>
                    </div>
                  ))}
                </div>
                {/* Flags */}
                {(emergCnt>0||septicCnt>0)&&(
                  <div className="mt-4 pt-3 flex flex-wrap gap-2" style={{borderTop:`1px solid ${C.border}`}}>
                    {emergCnt>0&&(
                      <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider"
                        style={{background:`${C.orange}18`,color:C.orange}}>
                        <AlertTriangle className="w-3 h-3"/>{emergCnt} Emerg.
                      </span>
                    )}
                    {septicCnt>0&&(
                      <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider"
                        style={{background:`${C.red}18`,color:C.red}}>
                        <Shield className="w-3 h-3"/>{septicCnt} Septické
                      </span>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* Row 2: Ops per room + Dept + 7-day trend */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card className="p-5">
                <SectionLabel>Výkony / sál (24 h)</SectionLabel>
                <ResponsiveContainer width="100%" height={160} minWidth={0} minHeight={0}>
                  <BarChart data={roomBarData} margin={{top:0,right:0,bottom:0,left:-24}} barSize={9}>
                    <XAxis dataKey="name" stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false}/>
                    <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                    <Tooltip {...TIP} formatter={(v:number)=>[v,'Výkony']}/>
                    <Bar dataKey="ops" radius={[2,2,0,0]}>
                      {roomBarData.map((e,i)=><Cell key={i} fill={e.color} opacity={0.75}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-5">
                <SectionLabel>Oddělení — výkony / 24 h</SectionLabel>
                <div className="space-y-2.5">
                  {deptMap.slice(0,7).map(([dept,count],i)=>{
                    const color=DEPT_COLORS[dept]??C.accent;
                    return(
                      <div key={dept}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-[2px]" style={{background:color}}/>
                            <span className="text-xs" style={{color:C.muted}}>{dept}</span>
                          </div>
                          <span className="text-xs font-bold" style={{color:C.text}}>{count}</span>
                        </div>
                        <div className="h-0.5 rounded-full overflow-hidden" style={{background:C.ghost}}>
                          <div className="h-full rounded-full" style={{
                            background:color,
                            opacity:0.8,
                            width:`${(count/deptMap[0][1])*100}%`,
                          }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
              <Card className="p-5">
                <SectionLabel>Trend výkonů — 7 dní</SectionLabel>
                {opsTrend.length > 0 ? <ResponsiveContainer width="100%" height={160} minWidth={0} minHeight={0}>
                  <ComposedChart data={opsTrend} margin={{top:4,right:4,bottom:0,left:-24}}>
                    <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3"/>
                    <XAxis dataKey="t" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                    <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                    <Tooltip {...TIP} formatter={(v:number)=>[v,'Operace']}/>
                    <Bar dataKey="v" fill={C.accent} opacity={0.2} radius={[2,2,0,0]}/>
                    <Line type="monotone" dataKey="v" stroke={C.green} strokeWidth={2}
                      dot={{fill:C.green,strokeWidth:0,r:3}}/>
                  </ComposedChart>
                </ResponsiveContainer> : <EmptyState title="Bez historických dat" desc="Pro zvolené období nejsou zaznamenané výkony." />}
              </Card>
            </div>

            {/* Row 3: Scatter + Interval compare + Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card className="p-5">
                <SectionLabel>Výkony vs. využití — srovnání sálů</SectionLabel>
                <ResponsiveContainer width="100%" height={160} minWidth={0} minHeight={0}>
                  <ScatterChart margin={{top:4,right:10,bottom:0,left:-20}}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3"/>
                    <XAxis dataKey="ops" name="Výkony/24h" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                    <YAxis dataKey="util" name="Využití %" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                    <ZAxis dataKey="queue" range={[30,120]}/>
                    <Tooltip contentStyle={TIP.contentStyle}
                      formatter={(v:number,name:string)=>[name==='Výkony/24h'?`${v} op.`:`${v}%`,name]}/>
                    <Scatter data={scatterData} fill={C.accent} opacity={0.72}/>
                  </ScatterChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-5">
                <SectionLabel>Průměrný počet výkonů dle dne v týdnu</SectionLabel>
                {intervalCompare.length > 0 ? <ResponsiveContainer width="100%" height={160} minWidth={0} minHeight={0}>
                  <BarChart data={intervalCompare} margin={{top:0,right:0,bottom:0,left:-24}} barSize={16}>
                    <XAxis dataKey="t" stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false}/>
                    <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                    <Tooltip {...TIP} formatter={(v:number)=>[v,'Průměr výkonů']}/>
                    <Bar dataKey="v" radius={[2,2,0,0]}>
                      {intervalCompare.map((e,i)=>(
                        <Cell key={i} fill={e.v>=80?C.green:e.v>=60?C.accent:e.v>=40?C.yellow:C.orange} opacity={0.75}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer> : <EmptyState title="Bez historických dat" desc="Pro zvolené období nejsou zaznamenané výkony." />}
              </Card>
              <Card className="p-5">
                <SectionLabel>Fronta a kapacita</SectionLabel>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{color:C.muted}}>Celková fronta</p>
                    <p className="text-3xl font-bold" style={{color:totalQueue>0?C.yellow:C.green}}>{totalQueue}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{color:C.muted}}>Zaplněnost</p>
                    <p className="text-3xl font-bold" style={{color:C.text}}>{Math.round((busyCount/Math.max(1,rooms.length))*100)}%</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {rooms.filter(r=>r.queueCount>0).slice(0,5).map(r=>(
                    <div key={r.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{background:roomStatusColor(r)}}/>
                        <span className="text-xs" style={{color:C.muted}}>{r.name}</span>
                      </div>
                      <span className="text-xs font-bold" style={{color:C.yellow}}>{r.queueCount} pac.</span>
                    </div>
                  ))}
                  {totalQueue===0&&<p className="text-xs" style={{color:C.faint}}>Žádná fronta</p>}
                </div>
              </Card>
            </div>

            {/* Row 4: Working hours overview per room */}
            <Card className="p-5">
              <SectionLabel>Přehled pracovních dob sálů (dnešní den)</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-4">
                {rooms.map(r => {
                  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
                  const hours = getRoomWorkingHours(r, todayIndex);
                  const workingMins = getRoomWorkingMinutes(r, todayIndex);
                  const opsInHours = countOperationsInWorkingHours(r, statusHistory, period);
                  const util = calculateRoomUtilization(r, statusHistory, period);
                  
                  return (
                    <div key={r.id} className="p-3 rounded-lg" style={{ background: C.ghost, border: `1px solid ${C.border}` }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: roomStatusColor(r) }} />
                          <span className="text-xs font-bold" style={{ color: C.text }}>{r.name}</span>
                        </div>
                      </div>
                      <p className="text-[10px] mb-2" style={{ color: C.faint }}>{r.department}</p>
                      
                      {/* Working hours */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <Clock className="w-3 h-3" style={{ color: hours.enabled ? C.accent : C.faint }} />
                        <span className="text-xs font-bold" style={{ color: hours.enabled ? C.text : C.faint }}>
                          {hours.enabled 
                            ? `${hours.startHour.toString().padStart(2,'0')}:${hours.startMinute.toString().padStart(2,'0')} – ${hours.endHour.toString().padStart(2,'0')}:${hours.endMinute.toString().padStart(2,'0')}`
                            : 'Zavřeno'}
                        </span>
                        {hours.enabled && (
                          <span className="text-[10px] ml-auto" style={{ color: C.muted }}>
                            ({Math.round(workingMins / 60)}h {workingMins % 60}m)
                          </span>
                        )}
                      </div>
                      
                      {/* Stats row */}
                      <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
                        <div>
                          <p className="text-[8px]" style={{ color: C.ghost }}>Operace</p>
                          <p className="text-sm font-bold" style={{ color: C.accent }}>{opsInHours}</p>
                        </div>
                        <div>
                          <p className="text-[8px]" style={{ color: C.ghost }}>Využití</p>
                          <p className="text-sm font-bold" style={{ color: util >= 80 ? C.green : util >= 50 ? C.yellow : C.orange }}>{util}%</p>
                        </div>
                        <div>
                          <p className="text-[8px]" style={{ color: C.ghost }}>Fronta</p>
                          <p className="text-sm font-bold" style={{ color: r.queueCount > 0 ? C.yellow : C.green }}>{r.queueCount}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

          </div>
        )}

        {/* ── Personál & týmy ── (nová záložka) */}
        {(tab==='personal' || isPrinting) && (
          <div key="personal" className="space-y-5 print-section">
            {isPrinting && (
              <h2 className="print-only text-sm font-bold uppercase tracking-tight mb-2 mt-4 px-3" style={{ color: '#0f172a', borderLeft: '3px solid #0f172a', paddingLeft: '8px' }}>
                Personál & týmy
              </h2>
            )}
            <StaffTab
              staff={staffList}
              rooms={rooms}
              periodLabel={period}
            />
          </div>
        )}

        {/* ── Finance & náklady (z hourly_operating_cost × historie) ── */}
        {(tab==='finance' || isPrinting) && (
          <div key="finance" className="space-y-5 print-section">
            {isPrinting && (
              <h2 className="print-only text-sm font-bold uppercase tracking-tight mb-2 mt-4 px-3" style={{ color: '#0f172a', borderLeft: '3px solid #0f172a', paddingLeft: '8px' }}>
                Finance & náklady provozu
              </h2>
            )}
            <FinanceTab
              rooms={rooms}
              totalOps={totalOps}
              avgUtilization={avgUtil}
              periodLabel={period}
              statusHistory={statusHistory}
            />
          </div>
        )}

        {/* ── Sály — propracovaný RoomsTab ── */}
        {(tab==='saly' || isPrinting) && (
          <div key="saly" className="space-y-5 print-section">
            {isPrinting && (
              <h2 className="print-only text-sm font-bold uppercase tracking-tight mb-2 mt-4 px-3" style={{ color: '#0f172a', borderLeft: '3px solid #0f172a', paddingLeft: '8px' }}>
                Operační sály — detailní přehled
              </h2>
            )}
            <RoomsTab
              rooms={rooms}
              statusHistory={statusHistory}
              periodLabel={period}
              onRoomSelect={setSelectedRoom}
              calculateRoomUtilization={calculateRoomUtilization}
              countOperationsInWorkingHours={countOperationsInWorkingHours}
              workflowSteps={WORKFLOW_STEPS}
            />
          </div>
        )}

        {/* ── Fáze — propracovaný PhasesTab ── */}
        {(tab==='faze' || isPrinting) && (
          <div key="faze" className="space-y-5 print-section">
            {isPrinting && (
              <h2 className="print-only text-sm font-bold uppercase tracking-tight mb-2 mt-4 px-3" style={{ color: '#0f172a', borderLeft: '3px solid #0f172a', paddingLeft: '8px' }}>
                Workflow fáze �� detailní analýza
              </h2>
            )}
            <PhasesTab
              rooms={rooms}
              statusHistory={statusHistory}
              periodLabel={period}
              workflowSteps={WORKFLOW_STEPS}
              avgStepDurations={avgStepDurations}
              workflowAgg={workflowAgg}
            />
          </div>
        )}

        {/* ── Notifikace ── (nový tab) */}
        {(tab==='notifikace' || isPrinting) && (
        <div key="notifikace" className="flex flex-col gap-5 print-section">
          <NotificationsTab
            notifications={notifications}
            rooms={rooms}
            periodLabel={periodLabelMap[period]}
          />
        </div>
        )}

        {/* ── Zařízení ── (nový tab) */}
        {(tab==='zarizeni' || isPrinting) && (
        <div key="zarizeni" className="flex flex-col gap-5 print-section">
          <DevicesTab
            devices={devices}
            periodLabel={periodLabelMap[period]}
          />
        </div>
        )}

        </>

      </div>
      )}
      {/* ── Room detail panel (shared mobile + desktop) �����─ */}
      {selectedRoom&&(
        <RoomDetailPanel room={selectedRoom} onClose={()=>setSelectedRoom(null)} workflowSteps={WORKFLOW_STEPS}/>
      )}
    </>
  );
};

export default memo(StatisticsModule);
