import React, { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react';
import dynamic from 'next/dynamic';
import { Activity, Clock, Layers, BarChart3, Printer, FileDown, Sheet, ChevronLeft } from 'lucide-react';
import { OperatingRoom, RoomStatus } from '../types';
// Step durations now calculated from real database history
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { useIsMobileDark } from '../hooks/useIsMobileDark';
import { aggregateRoomStatistics, useStatisticsData } from '../hooks/useStatisticsData';
import { useStatisticsPerformance } from '../hooks/useStatisticsPerformance';
import { scopeStatisticsRooms, statisticsDayWindow, statisticsPeriodWindow, STATISTICS_ROOM_SCOPE_NOTE } from '../lib/statistics-room-scope';
import { useMediaQuery } from '../hooks/useMediaQuery';
import {
  MobileCard,
  MobileHeaderMetrics,
  MobileModuleHeader,
  MobilePillTabs,
  MobileSectionLabel,
} from './mobile/MobileShell';
// Čitelné grafy v jazyce aplikace (náhrada nečitelných recharts vizualizací)
import { BarList, ColumnChart, ScatterGrid, GaugeRing, RingRow, InsightPanel, StatSectionLabel, DayNavigator, OrbitRings, GlassCalendar, PhasePanel } from './statistics/AppCharts';
import type { InsightItem, OrbitItem } from './statistics/AppCharts';
import ModulePageHeading from './ModulePageHeading';
import { StatisticsNavigation, type StatisticsTab } from './statistics/StatisticsNavigation';
import { StatisticsReportContext } from './statistics/StatisticsReportContext';
import { openStatisticsPrintReport, type StatisticsReport } from '../lib/statistics-print';
import { downloadStatisticsCsv } from '../lib/statistics-csv';
import StatisticsTrendStrip from './StatisticsTrendStrip';
import { useHospital } from '../contexts/HospitalContext';
import './mobile/mobile-statistics.css';
import { Period, getRoomWorkingHours, getRoomWorkingMinutes, calculateAvgStepDurations, calculateWorkflowDistribution, calculateRoomWorkflowDistribution, getRoomTotalWorkingMinutes, countOperationsInWorkingHours, calculateRoomUtilization, dayBounds, operationalToday, operationalDayKey, weekdayIndex, getRoomWorkingMinutesForDate, calculateActiveMinutesForDay, countOperationsForDay, calculateRoomUtilizationForDay, calculatePausedMinutesForDay, calculateOvertimeMinutesForDay, isIdleStatusName, fmtDurationMin, formatDayLabel, formatRoomWorkingHours, Seg } from '../lib/statistics-room-activity';
import { C, DEPT_COLORS } from './statistics/statistics-theme';
import { roomStatusColor, roomStatusLabel, Card, SectionLabel, EmptyState } from './statistics/StatisticsPrimitives';
import { RoomDetailPanel } from './statistics/RoomActivityPanels';
const FinanceTab = dynamic(() => import('./statistics/FinanceTab').then((module) => module.FinanceTab), { ssr: false });
const RoomsTab = dynamic(() => import('./statistics/RoomsTab').then((module) => module.RoomsTab), { ssr: false });
const PhasesTab = dynamic(() => import('./statistics/PhasesTab').then((module) => module.PhasesTab), { ssr: false });
const PerformanceTab = dynamic(() => import('./statistics/PerformanceTab').then((module) => module.PerformanceTab), { ssr: false });
const NotificationsTab = dynamic(() => import('./statistics/NotificationsTab').then((module) => module.NotificationsTab), { ssr: false });
const DevicesTab = dynamic(() => import('./statistics/DevicesTab').then((module) => module.DevicesTab), { ssr: false });

interface StatisticsModuleProps { rooms?: OperatingRoom[]; }
const EMPTY_ROOMS: OperatingRoom[] = [];

type Tab = StatisticsTab;

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MODULE
// ══════════════════════════════════════════════════════════════════════════════
const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms: propRooms }) => {
  const isMobileDark = useIsMobileDark();
  const { activeHospital, activeHospitalId } = useHospital();
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
  
  const allRooms = propRooms ?? EMPTY_ROOMS;
  const [period, setPeriod] = useState<Period>('den');
  const [tab,    setTab]    = useState<Tab>('prehled');
  const [roomSelection, setRoomSelection] = useState<{ id: string; day: Date | null; hospitalId: string | null } | null>(null);
  const selectedRoom = roomSelection?.hospitalId === activeHospitalId
    ? allRooms.find(room => room.id === roomSelection?.id) : undefined;
  const selectRoom = useCallback((room: OperatingRoom, day: Date | null) => {
    setRoomSelection({ id: room.id, day, hospitalId: activeHospitalId });
  }, [activeHospitalId]);
  const performance = useStatisticsPerformance(tab === 'vykonnost');
  const { statusHistory: allStatusHistory, dayHistory: allDayHistory, notifications, devices, isReportLoading: isStatisticsLoading, reportSourceErrors, dayHistoryCoverageStart } = useStatisticsData(period);
  const periodScope = useMemo(() => scopeStatisticsRooms(allRooms, allStatusHistory, statisticsPeriodWindow(period)), [allRooms, allStatusHistory, period]);
  const rooms = periodScope.rooms;
  const performanceRooms = useMemo(
    () => scopeStatisticsRooms(allRooms, performance.history, statisticsPeriodWindow('rok')).rooms,
    [allRooms, performance.history],
  );
  const statusHistory = periodScope.history;
  const dbStats = useMemo(() => aggregateRoomStatistics(statusHistory), [statusHistory]);
  // A failure in a module the user is not printing must not block an otherwise
  // complete report (e.g. a missing Devices permission must not block Rates).
  const reportSources: Record<Tab, Array<keyof typeof reportSourceErrors>> = {
    prehled: ['statusHistory', 'dayHistory'],
    finance: ['statusHistory', 'dayHistory', 'notifications'],
    sazby: [],
    saly: ['statusHistory', 'dayHistory'],
    faze: ['statusHistory'],
    vykonnost: [],
    notifikace: ['notifications', 'statusHistory'],
    zarizeni: ['devices'],
  };
  const statisticsError = reportSources[tab].map(source => reportSourceErrors[source]).find(Boolean);

  /* ── Provozní metriky sálů po dnech ────────────────────────────────────────
     Sekce „Jednotlivé sály" umí listovat po dnech dozadu, proto potřebuje
     vlastní 30denní historii (hlavní `statusHistory` sleduje jen zvolené
     období, u „den" tedy pouhých 24 h). */
  // Výchozí den = aktuálně běžící PROVOZNÍ den (před 7:00 ještě včerejšek)
  const [metricsDay, setMetricsDay] = useState<Date>(() => operationalToday());
  const dayScope = useMemo(() => scopeStatisticsRooms(allRooms, allDayHistory, statisticsDayWindow(metricsDay)), [allRooms, allDayHistory, metricsDay]);
  const dayRooms = dayScope.rooms;
  const dayHistory = dayScope.history;
  /** Režim hero panelu: primárně orbitální rozpad po sálech, souhrn dne na klik */
  const [heroMode, setHeroMode] = useState<'summary' | 'orbit'>('orbit');
  // Each mounted tab publishes its own already-filtered data. A report is a
  // frozen snapshot, independent of the app's dark, scroll-clipped DOM.
  const reportData = useRef<Partial<Record<Tab, StatisticsReport | null>>>({});
  const [printError, setPrintError] = useState<string | null>(null);
  const registerReport = useCallback((reportTab: Tab, report: StatisticsReport | null) => {
    reportData.current[reportTab] = report;
    return () => {
      if (reportData.current[reportTab] === report) delete reportData.current[reportTab];
    };
  }, []);

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
'sazby':      'Sazby',
'saly':       'Sály',
'faze':       'Fáze',
'vykonnost':  'Výkonnost',
'notifikace': 'Notifikace',
'zarizeni':   'Zařízení',
  };

  // Per-room utilization calculated from measured operation intervals and configured schedules.
  const utilData = useMemo(() => {
    return rooms.map(room => ({
      t: room.name.replace('Sál č. ', 'S'),
      // Plný název pro čitelné žebříčky (zkratka `t` zůstává pro kompaktní osy)
      full: room.name,
      v: calculateRoomUtilization(room, statusHistory, period),
      hasCapacity: getRoomTotalWorkingMinutes(room, period) > 0,
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
    const capacityRooms = rooms.filter(room => getRoomTotalWorkingMinutes(room, period) > 0);
    if (capacityRooms.length === 0) return 0;
    const totalUtil = capacityRooms.reduce((sum, r) => sum + calculateRoomUtilization(r, statusHistory, period), 0);
    return Math.round(totalUtil / capacityRooms.length);
  }, [rooms, statusHistory, period]);
  
  const avgUtil   = avgUtilFromWorkingHours;
  const hasPeriodCapacity = rooms.some(room => getRoomTotalWorkingMinutes(room, period) > 0);
  const utilValues = hasPeriodCapacity ? utilData.filter(d => d.hasCapacity).map(d => d.v) : [0];
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

  /* ── Hero panel pracuje s VYBRANÝM DNEM (listování kalendářem) ────────────
     Používá 30denní `dayHistory`, takže lze procházet i minulé dny. */
  const dayStats = useMemo(() => {
    if (dayRooms.length === 0) {
      return { avgUtil: 0, totalOps: 0, activeRooms: 0, openRooms: 0 };
    }
    let utilSum = 0;
    let openRooms = 0;
    let ops = 0;
    let activeRooms = 0;
    dayRooms.forEach(r => {
      const capacity = getRoomWorkingMinutesForDate(r, metricsDay);
      const roomOps = countOperationsForDay(r, dayHistory, metricsDay);
      const util = calculateRoomUtilizationForDay(r, dayHistory, metricsDay);
      ops += roomOps;
      if (capacity > 0) { openRooms++; utilSum += util; }
      if (roomOps > 0 || util > 0) activeRooms++;
    });
    return {
      avgUtil: openRooms > 0 ? Math.round(utilSum / openRooms) : 0,
      totalOps: ops,
      activeRooms,
      openRooms,
    };
  }, [dayRooms, dayHistory, metricsDay]);

  /** Intenzita provozu po dnech pro kalendář (0–1 dle počtu zahájených výkonů). */
  const dayActivityHeat = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    allDayHistory.forEach(e => {
      if (e.event_type !== 'operation_start' || !e.timestamp) return;
      const d = new Date(e.timestamp);
      if (Number.isNaN(d.getTime())) return;
      // Noční výkony patří do provozního dne, ve kterém začaly (7:00–7:00)
      const k = operationalDayKey(d);
      counts[k] = (counts[k] || 0) + 1;
    });
    const max = Math.max(1, ...Object.values(counts));
    const out: Record<string, number> = {};
    Object.entries(counts).forEach(([k, v]) => { out[k] = v / max; });
    return out;
  }, [allDayHistory]);

  /* ── Drill-down: kliknutím na sál se orbit přepne na jeho výkony ──────────
     Každý satelit = jeden operační výkon, jeho prstenec = fáze cyklu
     (bez klidového stavu „Sál připraven"). */
  const [orbitRoomId, setOrbitRoomId] = useState<string | null>(null);
  /** Vybraný výkon v drill-downu (pro panel s rozpadem fází vpravo) */
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const orbitRoom = useMemo(
    () => (orbitRoomId ? dayRooms.find(r => r.id === orbitRoomId) ?? null : null),
    [orbitRoomId, dayRooms],
  );
  // Při změně dne se vracíme na přehled sálů
  useEffect(() => { setOrbitRoomId(null); setSelectedOpId(null); }, [metricsDay]);
  useEffect(() => { setSelectedOpId(null); }, [orbitRoomId]);

  /**
   * Výkony vybraného sálu v daném dni rozpadlé na fáze cyklu.
   *
   * Zdrojem je `dayHistory` (stejná data, ze kterých se počítá i počet výkonů
   * na prstenci sálu) — `room.completedOperations` obsahuje jen dnešní den
   * a nemusí být naplněné, což vedlo k „žádný výkon" u sálu s výkony.
   *
   * POZOR na sémantiku `step_change`: `step_name` je fáze, která právě
   * SKONČILA, a `duration_seconds` je její trvání (`step_index` je už nová
   * fáze). Barvu proto hledáme podle názvu, ne podle indexu.
   */
  const roomOperationRings = useMemo<OrbitItem[]>(() => {
    if (!orbitRoom) return [];
    const { start, end } = dayBounds(metricsDay);
    const now = Date.now();
    const isCurrentDay = metricsDay.getTime() === operationalToday().getTime();

    const colorByName = (name: string) =>
      WORKFLOW_STEPS.find(s => s.title === name)?.color || C.accent;

    type Seg = { value: number; color: string; label: string };
    type Acc = { startMs: number; endMs: number | null; segs: Seg[] };

    /* Události sálu se NEOŘEZÁVAJÍ na okno dne — výkon zahájený večer může
       skončit až po 7:00 druhého dne a jeho `operation_end` by se ztratil,
       což se dřív projevilo jako falešné „probíhá". Filtr na den se aplikuje
       až na hotové výkony podle času ZAHÁJENÍ. */
    const rawEvents = dayHistory
      .filter(e => e.operating_room_id === orbitRoom.id && e.timestamp)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const lastLifecycleEvent = new Map<string, number>();
    const evts = rawEvents.filter((event) => {
      if (
        event.event_type !== 'operation_start'
        && event.event_type !== 'operation_end'
        && event.event_type !== 'step_change'
      ) {
        return true;
      }
      const timestamp = new Date(event.timestamp).getTime();
      const signature = `${event.event_type}:${event.step_index ?? 'none'}`;
      const previous = lastLifecycleEvent.get(signature);
      lastLifecycleEvent.set(signature, timestamp);
      return previous === undefined || timestamp - previous > 2_000;
    });

    const ops: Acc[] = [];
    let cur: Acc | null = null;

    for (const e of evts) {
      const t = new Date(e.timestamp).getTime();
      if (!Number.isFinite(t)) continue;

      if (e.event_type === 'operation_start') {
        if (cur && Math.abs(t - cur.startMs) <= 120_000) continue;
        if (cur) ops.push(cur); // předchozí zůstal bez `operation_end`
        cur = { startMs: t, endMs: null, segs: [] };
        continue;
      }

      if (e.event_type === 'operation_end') {
        if (cur) { cur.endMs = t; ops.push(cur); cur = null; }
        continue;
      }

      if (e.event_type === 'step_change' && e.duration_seconds) {
        const name = e.step_name || '';
        if (!name || isIdleStatusName(name)) continue; // klidový stav vynecháváme
        const ms = e.duration_seconds * 1000;
        const seg: Seg = { value: ms, color: colorByName(name), label: `${name} · ${fmtDurationMin(ms / 60000)}` };

        if (cur) {
          cur.segs.push(seg);
        } else {
          // Fáze dokončená těsně po `operation_end` patří k právě uzavřenému
          // výkonu; jinak zakládáme výkon zpětně (chybí `operation_start`).
          const last = ops[ops.length - 1];
          if (last && last.endMs !== null && t - last.endMs <= 120_000) {
            last.segs.push(seg);
            last.endMs = Math.max(last.endMs, t);
          } else {
            ops.push({ startMs: t - ms, endMs: t, segs: [seg] });
          }
        }
      }
    }
    if (cur) ops.push(cur); // stále otevřený výkon

    const fmtT = (ms: number) => new Date(ms).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
    const fmtD = (ms: number) => new Date(ms).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });

    return ops
      // Do dne patří výkony ZAHÁJENÉ v jeho okně (7:00–7:00)
      .filter(op => op.startMs >= start.getTime() && op.startMs < end.getTime())
      .filter(op => op.segs.length > 0 || op.endMs !== null)
      .map((op, i, arr) => {
        const segTotal = op.segs.reduce((a, x) => a + x.value, 0);
        // Skutečně běžící výkon = otevřený, poslední v pořadí, dnešní provozní
        // den a sál je reálně v nějaké fázi cyklu.
        const isRunning = op.endMs === null
          && i === arr.length - 1
          && isCurrentDay
          && orbitRoom.currentStepIndex > 0;
        // Neukončený záznam (chybí `operation_end`) — délku odvodíme z fází
        const isUnterminated = op.endMs === null && !isRunning;
        const endMs = op.endMs ?? (isRunning ? now : op.startMs + Math.max(segTotal, 60_000));
        const crossesDay = endMs >= end.getTime();

        const segs = op.segs.length > 0
          ? op.segs
          : [{ value: Math.max(1, endMs - op.startMs), color: C.accent, label: 'Výkon' }];
        const totalMs = segs.reduce((a, x) => a + x.value, 0);

        const label = isRunning
          ? `${fmtT(op.startMs)} – probíhá`
          : crossesDay
            ? `${fmtT(op.startMs)} → ${fmtD(endMs)} ${fmtT(endMs)}`
            : `${fmtT(op.startMs)}–${fmtT(endMs)}`;

        const detail = isRunning
          ? 'právě běží'
          : isUnterminated
            ? 'neukončeno v datech'
            : crossesDay
              ? 'přesah do dalšího dne'
              : `${segs.length} ${segs.length === 1 ? 'fáze' : segs.length <= 4 ? 'fáze' : 'fází'}`;

        return {
          id: `op-${i}-${op.startMs}`,
          label,
          percent: 100,
          detail,
          color: isUnterminated ? C.faint : crossesDay ? C.orange : (segs[0]?.color || C.accent),
          segments: segs,
          centerLabel: fmtDurationMin(totalMs / 60000),
          dimmed: isUnterminated,
          startMs: op.startMs,
          endMs,
        } satisfies OrbitItem;
      });
  }, [orbitRoom, metricsDay, dayHistory, WORKFLOW_STEPS]);

  /** Vybraný výkon v drill-downu (fallback = nejdelší výkon dne). */
  const selectedOp = useMemo(() => {
    if (roomOperationRings.length === 0) return null;
    if (selectedOpId) {
      const found = roomOperationRings.find(o => o.id === selectedOpId);
      if (found) return found;
    }
    return null;
  }, [roomOperationRings, selectedOpId]);

  /** Fáze vybraného výkonu pro panel vpravo (název, čas, barva) + pauza. */
  const selectedOpPhases = useMemo(() => {
    if (!selectedOp) return [];

    const phases = (selectedOp.segments || []).map(sgm => ({
      label: (sgm.label || '').split(' · ')[0] || 'Fáze',
      ms: sgm.value,
      color: sgm.color,
    }));

    // Pauza není `step_change`, ale samostatné události pause/resume —
    // spočítáme její překryv s časovým oknem vybraného výkonu.
    if (orbitRoom && selectedOp.startMs !== undefined && selectedOp.endMs !== undefined) {
      const winStart = selectedOp.startMs;
      const winEnd = selectedOp.endMs;
      const now = Date.now();

      const evts = dayHistory
        .filter(e => e.operating_room_id === orbitRoom.id
          && (e.event_type === 'pause' || e.event_type === 'resume')
          && e.timestamp)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      let pausedMs = 0;
      let open: number | null = null;
      for (const e of evts) {
        const t = new Date(e.timestamp).getTime();
        if (!Number.isFinite(t)) continue;
        if (e.event_type === 'pause') {
          if (open === null) open = t;
        } else if (open !== null) {
          const s = Math.max(open, winStart);
          const x = Math.min(t, winEnd);
          if (x > s) pausedMs += x - s;
          open = null;
        }
      }
      if (open !== null) {
        const s = Math.max(open, winStart);
        const x = Math.min(now, winEnd);
        if (x > s) pausedMs += x - s;
      }

      if (pausedMs > 0) phases.push({ label: 'Pauza', ms: pausedMs, color: C.yellow });
    }

    return phases;
  }, [selectedOp, orbitRoom, dayHistory]);

  /** Legenda fází pro drill-down (barvy + souhrnný čas napříč výkony). */
  const roomPhaseLegend = useMemo(() => {
    const agg: Record<string, { ms: number; color: string }> = {};
    roomOperationRings.forEach(op => {
      (op.segments || []).forEach(sgm => {
        const name = (sgm.label || '').split(' · ')[0];
        if (!name) return;
        if (!agg[name]) agg[name] = { ms: 0, color: sgm.color };
        agg[name].ms += sgm.value;
      });
    });
    return Object.entries(agg)
      .map(([name, v]) => ({ name, ms: v.ms, color: v.color }))
      .sort((a, b) => b.ms - a.ms);
  }, [roomOperationRings]);

  /** Sály pro orbitální zobrazení — vytížení a počet výkonů ve vybraném dni. */
  const orbitRooms = useMemo<OrbitItem[]>(() => {
    return dayRooms.map(r => {
      const util = calculateRoomUtilizationForDay(r, dayHistory, metricsDay);
      const ops = countOperationsForDay(r, dayHistory, metricsDay);
      const closed = getRoomWorkingMinutesForDate(r, metricsDay) === 0;
      const color = r.isEmergency ? C.red
        : closed ? C.faint
        : util >= 80 ? C.green
        : util >= 50 ? C.yellow
        : util > 0 ? C.orange
        : C.muted;
      return {
        id: r.id,
        label: r.name,
        percent: util,
        centerLabel: closed ? '—' : undefined,
        detail: closed && ops === 0 ? 'bez plánované kapacity' : `${ops} ${ops === 1 ? 'výkon' : ops >= 2 && ops <= 4 ? 'výkony' : 'výkonů'}`,
        color,
        dimmed: closed,
      };
    });
  }, [dayRooms, dayHistory, metricsDay]);

  /** Fáze operačního cyklu pro vybraný den (podíl času jednotlivých statusů). */
  const dayPhaseRings = useMemo(() => {
    const { start, end } = dayBounds(metricsDay);
    const totals: Record<string, { ms: number; color: string }> = {};
    WORKFLOW_STEPS.forEach(s => { totals[s.title] = { ms: 0, color: s.color }; });

    dayHistory
      .filter(e => e.event_type === 'step_change' && e.duration_seconds && e.timestamp)
      .forEach(e => {
        const t = new Date(e.timestamp).getTime();
        if (t < start.getTime() || t >= end.getTime()) return;
        if (e.step_name && totals[e.step_name]) {
          totals[e.step_name].ms += (e.duration_seconds || 0) * 1000;
        }
      });

    const total = Object.values(totals).reduce((a, b) => a + b.ms, 0);
    if (total === 0) return [];
    return Object.entries(totals)
      .filter(([name, v]) => v.ms > 0 && !isIdleStatusName(name))
      .map(([name, v]) => ({
        label: name,
        percent: (v.ms / total) * 100,
        detail: fmtDurationMin(v.ms / 60000),
        color: v.color,
      }))
      .sort((a, b) => b.percent - a.percent);
  }, [dayHistory, metricsDay, WORKFLOW_STEPS]);

  /** Doporučení pro hero panel Přehledu — odvozená z reálných čísel. */
  const overviewInsights = useMemo<InsightItem[]>(() => {
    const out: InsightItem[] = [];
    if (dayRooms.length === 0) return [{ tone: 'info', title: 'Žádné sály v provozu', text: 'Ve vybraném dni není plánovaný ani doložený provoz operačních sálů.' }];
    if (dayStats.openRooms === 0) return [{ tone: 'info', title: 'Kapacita není určena', text: 'Skutečný provoz je zachován. Bez nastavené provozní doby nelze určit vytížení ani doporučovat změny kapacity.' }];

    const util = dayStats.avgUtil;
    const dayLabel = formatDayLabel(metricsDay).toLowerCase();

    if (util >= 85) {
      out.push({ tone: 'warn', title: 'Kapacita na hraně',
        text: `Průměrné vytížení ${util} % (${dayLabel}). Hlídej přesčasy a zvaž rozšíření provozní doby.` });
    } else if (util >= 60) {
      out.push({ tone: 'good', title: 'Vysoké vytížení',
        text: `Průměr ${util} % (${dayLabel}). Provoz je dobře využitý — udrž tempo a sleduj mezičasy.` });
    } else if (util >= 40) {
      out.push({ tone: 'info', title: 'Dobré vytížení',
        text: `Průměr ${util} % (${dayLabel}). Stále je prostor zařadit kratší výkon na sály pod průměrem.` });
    } else if (dayStats.openRooms === 0) {
      out.push({ tone: 'info', title: 'Sály mimo provoz',
        text: `Pro ${dayLabel} nemá žádný sál naplánovanou provozní dobu.` });
    } else {
      out.push({ tone: 'warn', title: 'Nízké vytížení',
        text: `Průměr ${util} % (${dayLabel}). Sály zůstávají dlouho volné — prověř plánování programu.` });
    }

    // Nejdelší fáze dne — kandidát na zkrácení
    const longest = dayPhaseRings[0];
    if (longest && longest.percent >= 10) {
      out.push({ tone: 'info', title: `Zkrať: ${longest.label}`,
        text: `Status „${longest.label}" zabral ${longest.detail} (${Math.round(longest.percent)} % dne). Standardizace tohoto kroku přinese nejrychlejší zlepšení.` });
    }

    if (emergCnt > 0) {
      out.push({ tone: 'warn', title: `Nouzový režim: ${emergCnt} ${emergCnt === 1 ? 'sál' : 'sály'}`,
        text: 'Nouzové sály mají přednost — ověř, že navazující program počítá se zpožděním.' });
    } else if (out.length < 2) {
      out.push({ tone: 'good', title: 'Bez mimořádností',
        text: `Žádný sál není v nouzovém režimu. Evidováno ${dayStats.totalOps} výkonů.` });
    }

    return out.slice(0, 3);
  }, [dayRooms.length, dayStats, dayPhaseRings, metricsDay, emergCnt]);


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

  const buildOverviewReport = (): StatisticsReport => {
    const dayLabel = metricsDay.toLocaleDateString('cs-CZ', { dateStyle: 'long' });
    return {
      requiredHistoryFrom: dayBounds(metricsDay).start.toISOString(),
      context: `Vybraný provozní den: ${dayLabel}, 07:00 až 06:59 následujícího dne. Souhrn dne a denní metriky respektují kalendář. Samostatná tabulka za období používá filtr ${periodLabelMap[period].toLowerCase()}.${orbitRoom ? ` Detail sálu: ${orbitRoom.name}.` : ''} ${STATISTICS_ROOM_SCOPE_NOTE}`,
      metrics: [
        { label: 'Výkony ve vybraném dni', value: dayStats.totalOps },
        { label: 'Průměrné vytížení dne', value: dayStats.openRooms > 0 ? `${dayStats.avgUtil} %` : '—', detail: 'Z provozně otevřených sálů' },
        { label: 'Sály s provozem', value: `${dayStats.activeRooms} / ${dayRooms.length}` },
        { label: 'Plánovaně otevřeno', value: dayStats.openRooms, detail: dayLabel },
      ],
      sections: [
        {
          title: 'Provozní metriky jednotlivých sálů',
          description: `Provozní den ${dayLabel}. Časy jsou uvedeny v minutách; kapacita vychází z nastavené pracovní doby.`,
          columns: [{ label: 'Operační sál' }, { label: 'Pracovní doba' }, { label: 'Využití', align: 'right' }, { label: 'Výkony', align: 'right' }, { label: 'Aktivní / kapacita (min)', align: 'right' }, { label: 'Pauza (min)', align: 'right' }, { label: 'Přesah (min)', align: 'right' }],
          rows: dayRooms.map(room => [
            room.name,
            formatRoomWorkingHours(room, weekdayIndex(metricsDay)),
            getRoomWorkingMinutesForDate(room, metricsDay) > 0 ? `${calculateRoomUtilizationForDay(room, dayHistory, metricsDay)} %` : '—',
            countOperationsForDay(room, dayHistory, metricsDay),
            `${Math.round(calculateActiveMinutesForDay(room, dayHistory, metricsDay))} / ${getRoomWorkingMinutesForDate(room, metricsDay) > 0 ? Math.round(getRoomWorkingMinutesForDate(room, metricsDay)) : '—'}`,
            Math.round(calculatePausedMinutesForDay(room, dayHistory, metricsDay)),
            getRoomWorkingMinutesForDate(room, metricsDay) > 0 ? Math.round(calculateOvertimeMinutesForDay(room, dayHistory, metricsDay)) : '—',
          ]),
        },
        {
          title: 'Fáze operačního cyklu ve vybraném dni',
          description: 'Stejný rozpad jako v souhrnu dne. Klidové fáze nejsou uvedeny; podíly jsou vůči všem naměřeným fázím, a nemusí proto dát součet 100 %.',
          columns: [{ label: 'Fáze' }, { label: 'Naměřený čas', align: 'right' }, { label: 'Podíl času', align: 'right' }],
          rows: dayPhaseRings.map(phase => [phase.label, phase.detail, `${phase.percent.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} %`]),
        },
        ...(orbitRoom ? [{
          title: `Výkony vybraného sálu: ${orbitRoom.name}`,
          description: `Detail pro provozní den ${dayLabel}. Rozpracované a neukončené výkony jsou výslovně označeny.`,
          columns: [{ label: 'Čas výkonu' }, { label: 'Naměřená délka' }, { label: 'Stav záznamu' }],
          rows: roomOperationRings.map(operation => [operation.label, operation.centerLabel ?? '', operation.detail ?? '']),
        }] : []),
        ...(selectedOp ? [{
          title: `Fáze vybraného výkonu: ${selectedOp.label}`,
          columns: [{ label: 'Fáze' }, { label: 'Doba trvání' }],
          rows: selectedOpPhases.map(phase => [phase.label, fmtDurationMin(phase.ms / 60000)]),
        }] : []),
        {
          title: `Souhrn za období: ${periodLabelMap[period]}`,
          description: `Výkony v pracovní době za zvolené období. ${period === 'den' ? 'Využití v denním režimu se vztahuje k aktuálnímu provoznímu dni od 07:00, nikoli k posuvným 24 hodinám.' : 'Využití odpovídá zvolenému období.'} Stav sálu je aktuální v okamžiku exportu, nikoli historický.`,
          columns: [{ label: 'Operační sál' }, { label: 'Výkony', align: 'right' }, { label: 'Využití', align: 'right' }, { label: 'Aktuální stav' }],
          rows: rooms.map(room => [room.name, countOperationsInWorkingHours(room, statusHistory, period), getRoomTotalWorkingMinutes(room, period) > 0 ? `${calculateRoomUtilization(room, statusHistory, period)} %` : '—', roomStatusLabel(room)]),
        },
        {
          title: 'Výkony podle oddělení',
          description: `Součet výkonů v pracovní době za období ${periodLabelMap[period].toLowerCase()}. Zahrnuta jsou všechna oddělení.`,
          columns: [{ label: 'Oddělení' }, { label: 'Výkony', align: 'right' }],
          rows: deptMap,
        },
        {
          title: 'Dokončené výkony podle dne',
          description: 'Všechna dostupná denní měření v načteném období; stejně jako zdroj trendového grafu.',
          columns: [{ label: 'Datum' }, { label: 'Dokončené výkony', align: 'right' }],
          rows: Object.entries(dbStats.operationsByDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => [new Date(`${day}T12:00:00`).toLocaleDateString('cs-CZ'), count]),
        },
        {
          title: 'Průměrný počet výkonů podle dne v týdnu',
          description: 'Z dostupných denních měření v načteném období, shodně s grafem v přehledu.',
          columns: [{ label: 'Den v týdnu' }, { label: 'Průměr výkonů', align: 'right' }],
          rows: intervalCompare.map(day => [day.t, day.v]),
        },
        {
          title: 'Provozní doporučení',
          columns: [{ label: 'Zjištění' }, { label: 'Doporučení pro vybraný den' }],
          rows: [
            ...overviewInsights.filter(insight => !insight.title.startsWith('Nouzový režim:') && insight.title !== 'Bez mimořádností').map(insight => [insight.title, insight.text]),
            ['Aktuální nouzový režim', `${rooms.filter(room => room.isEmergency).length} sálů v nouzovém režimu v okamžiku vytvoření reportu; nejde o počet historických událostí.`],
          ],
        },
      ],
    };
  };

  // Připravenost dat řeší tisk i export stejně — jedna kontrola pro obojí.
  const resolveReport = (action: 'tisk' | 'export'): StatisticsReport | null => {
    const reportLoading = tab === 'vykonnost' ? performance.isLoading || performance.isRefreshing : isStatisticsLoading;
    const reportError = tab === 'vykonnost' ? performance.error : statisticsError;
    if (reportLoading || reportError) {
      setPrintError(reportError
        ? 'Data se nepodařilo úplně načíst. Report nelze bezpečně vytvořit; zkuste načtení opakovat.'
        : `Statistiky se ještě načítají. Počkejte na dokončení načítání a zkuste ${action} znovu.`);
      return null;
    }
    const report = tab === 'prehled' ? buildOverviewReport() : reportData.current[tab];
    if (!report) {
      setPrintError('Data vybrané záložky ještě nejsou připravena. Počkejte na jejich načtení, případně zkontrolujte zvolený filtr.');
      return null;
    }
    if (report.requiredHistoryFrom && (!dayHistoryCoverageStart || new Date(report.requiredHistoryFrom).getTime() < new Date(dayHistoryCoverageStart).getTime())) {
      setPrintError('Vybraný den leží mimo úplně načtenou historii. Vyberte novější den; chybějící data nelze vykázat jako nulové hodnoty.');
      return null;
    }
    setPrintError(null);
    return report;
  };

  const reportMetadata = (generatedAt: Date) => ({
    tabLabel: tabLabelMap[tab],
    periodLabel: tab === 'vykonnost' ? 'Posledních 12 kalendářních měsíců' : periodLabelMap[period],
    hospitalName: activeHospital?.hospital_name ?? activeHospital?.hospital_short_name ?? undefined,
    generatedAt,
    filename: `Statistiky_${tab}_${generatedAt.toISOString().slice(0, 10)}`,
  });

  const handleExportCsv = () => {
    const report = resolveReport('export');
    if (!report) return;
    try {
      downloadStatisticsCsv(report, reportMetadata(new Date()));
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : 'Export se nepodařilo vytvořit.');
    }
  };

  const handlePrint = () => {
    const report = resolveReport('tisk');
    if (!report) return;
    const generatedAt = new Date();
    try {
      openStatisticsPrintReport(report, reportMetadata(generatedAt));
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : 'Report se nepodařilo otevřít. Zkuste tisk znovu.');
    }
  };
  const handleExportPdf = handlePrint;

  const printHandlerRef = useRef(handlePrint);
  useEffect(() => { printHandlerRef.current = handlePrint; });
  useEffect(() => {
    const onPrintShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        printHandlerRef.current();
      }
    };
    window.addEventListener('keydown', onPrintShortcut);
    return () => window.removeEventListener('keydown', onPrintShortcut);
  }, []);

  return(
    <StatisticsReportContext.Provider value={registerReport}>
      {printError && <div role="alert" className="fixed bottom-20 right-6 z-50 max-w-md rounded-xl border border-red-300/30 bg-slate-900 p-4 text-sm text-white shadow-xl"><p>{printError}</p><button type="button" onClick={() => setPrintError(null)} className="mt-2 underline">Zavřít upozornění</button></div>}
      {/* Mobile background — unified with RoomDetail / Timeline / Staff */}
      <div
        aria-hidden
        className="mobile-theme-surface fixed inset-0 md:hidden pointer-events-none"
        style={{
          zIndex: 0,
        }}
      />

      {/* ========== MOBILE (md:hidden) ========== */}
      {isMobileViewport && (
      <div
        className={`statistics-module statistics-settings mobile-statistics mobile-unified-statistics ${isMobileDark ? 'is-dark' : 'is-light'} md:hidden w-full relative`}
        style={{ zIndex: 1 }}
        data-print-area="statistics"
      >
        <div className="flex flex-col gap-3 print-section">
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
              title={`Vytisknout report záložky ${tabLabelMap[tab]} v novém okně`}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest"
              style={{
                background: C.surface,
                color: C.text,
                border: `1px solid ${C.border}`,
              }}>
              <Printer className="w-4 h-4" />
              Tisk
            </button>
            <button
              onClick={handleExportPdf}
              title={`PDF report záložky ${tabLabelMap[tab]} – v dialogu zvolte Uložit jako PDF`}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest"
              style={{
                background: C.surface,
                color: C.text,
                border: `1px solid ${C.border}`,
              }}>
              <FileDown className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={handleExportCsv}
              title={`Stáhnout data záložky ${tabLabelMap[tab]} jako CSV`}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest"
              style={{
                background: C.surface,
                color: C.text,
                border: `1px solid ${C.border}`,
              }}>
              <Sheet className="w-4 h-4" />
              CSV
            </button>
          </div>

          {/* Period toggle */}
          {tab !== 'vykonnost' && <div className="print-hide">
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
          </div>}

          {/* Tab toggle */}
          <div className="print-hide">
            <StatisticsNavigation value={tab} onChange={setTab} compact />
          </div>

          <div id={`statistics-panel-${tab}`} role="tabpanel" aria-labelledby={`statistics-tab-${tab}`} tabIndex={0} className="stats-tab-panel min-w-0">
          {/* ── Přehled ── (vždy renderováno při tisku, bez page-breaks) */}
          {(tab === 'prehled') && (
            <div className="flex flex-col gap-3 print-section">

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { l: 'Obsazeno', v: `${busyCount}/${rooms.length}`, c: C.orange },
                  { l: 'Volno', v: `${freeCount}/${rooms.length}`, c: C.green },
                  { l: `Výkony (${period})`, v: totalOps, c: C.accent },
                  { l: `Využití (${period})`, v: hasPeriodCapacity ? `${avgUtil}%` : '—', c: C.text },
                ].map(k => (
                  <div
                    key={k.l}
                    className="statistics-kpi-card m-unified-card p-4"
                  >
                    <p className="m-unified-card-title stats-card-title">
                      {k.l}
                    </p>
                    <p className="text-2xl font-semibold mt-2 tabular-nums" style={{ color: k.c }}>
                      {k.v}
                    </p>
                  </div>
                ))}
              </div>

              {/* Srovnání období */}
              <MobileCard className="m-unified-card">
                <div className="m-unified-card-header mb-3">
                  <h2 className="m-unified-card-title stats-card-title">Srovnání období</h2>
                </div>
                <StatisticsTrendStrip period={period} palette={C} />
              </MobileCard>

              {/* Mini trend chart */}
              <MobileCard className="m-unified-card">
                <div className="m-unified-card-header mb-3">
                  <h2 className="m-unified-card-title stats-card-title">Využití jednotlivých sálů</h2>
                </div>
                <BarList
                  max={100}
                  barHeight={7}
                  items={utilData.map(d => ({
                    label: d.full,
                    value: d.v,
                    display: `${d.v}%`,
                    color: d.v >= 80 ? C.green : d.v >= 50 ? C.yellow : d.v > 0 ? C.orange : C.red,
                  }))}
                  emptyText="Žádné sály k zobrazení."
                />
                <div className="flex items-center justify-between text-[11px] mt-3 px-1" style={{ color: C.muted }}>
                  <span>Nejvyšší: <span className="font-semibold" style={{ color: C.text }}>{hasPeriodCapacity ? `${peakUtil}%` : '—'}</span></span>
                  <span>Nejnižší: <span className="font-semibold" style={{ color: C.text }}>{hasPeriodCapacity ? `${minUtil}%` : '—'}</span></span>
                </div>
              </MobileCard>
            </div>
          )}

          {/* ── Sály ── (propracovaný RoomsTab) */}
          {(tab === 'saly') && (
            <div className="flex flex-col gap-3 print-section">

              <RoomsTab
                rooms={allRooms}
                statusHistory={allStatusHistory}
                calendarHistory={allDayHistory}
                periodLabel={period}
                onRoomSelect={selectRoom}
                calculateRoomUtilization={calculateRoomUtilization}
                countOperationsInWorkingHours={countOperationsInWorkingHours}
                calculateRoomUtilizationForDay={calculateRoomUtilizationForDay}
                countOperationsForDay={countOperationsForDay}
                workflowSteps={WORKFLOW_STEPS}
              />
            </div>
          )}

          {/* ── Fáze — propracovaný PhasesTab ── */}
          {(tab === 'faze') && (
            <div className="flex flex-col gap-3 print-section">

              <PhasesTab
                rooms={allRooms}
                statusHistory={allStatusHistory}
                calendarHistory={allDayHistory}
                periodLabel={period}
                workflowSteps={WORKFLOW_STEPS}
                avgStepDurations={avgStepDurations}
                workflowAgg={workflowAgg}
              />
            </div>
          )}

          {(tab === 'vykonnost') && (
            <div className="flex flex-col gap-3 print-section">
              <PerformanceTab
                rooms={performanceRooms}
                history={performance.history}
                isLoading={performance.isLoading || performance.isRefreshing}
                error={performance.error}
                loadedAt={performance.loadedAt}
                loadingProgress={performance.progress}
                onRefresh={() => { void performance.refresh(); }}
              />
            </div>
          )}

          {/* ── Finance & náklady (z hourly_operating_cost × historie) ── */}
          {(tab === 'finance') && (
            <div className="flex flex-col gap-3 print-section">

              <FinanceTab
                rooms={allRooms}
                totalOps={totalOps}
                avgUtilization={avgUtil}
                periodLabel={period}
                statusHistory={allStatusHistory}
                calendarHistory={allDayHistory}
                notifications={notifications}
              />
            </div>
          )}

          {/* ── Hodinové sazby — samostatná správa nákladových sazeb ── */}
          {(tab === 'sazby') && (
            <div className="flex flex-col gap-3 print-section">

              <FinanceTab
                rooms={allRooms}
                totalOps={totalOps}
                avgUtilization={avgUtil}
                periodLabel={period}
                statusHistory={allStatusHistory}
                notifications={notifications}
                view="rates"
              />
            </div>
          )}

          {/* ── Notifikace ── */}
          {(tab === 'notifikace') && (
            <div className="flex flex-col gap-3 print-section">

              <MobileSectionLabel>Přehled notifikací</MobileSectionLabel>
              <NotificationsTab
                notifications={notifications}
                statusHistory={allStatusHistory}
                calendarHistory={allDayHistory}
                rooms={allRooms}
                periodLabel={periodLabelMap[period]}
              />
            </div>
          )}


          {/* ── Zařízení ── */}
          {(tab === 'zarizeni') && (
            <div className="flex flex-col gap-3 print-section">

              <MobileSectionLabel>Připojená zařízení</MobileSectionLabel>
              <DevicesTab
                devices={devices}
                periodLabel={periodLabelMap[period]}
              />
            </div>
          )}
          </div>
        </div>
      </div>
      )}

      {/* ========== DESKTOP (hidden md:block) ========== */}
      {!isMobileViewport && (
      <div className="statistics-module statistics-settings statistics-desktop hidden md:block w-full" data-print-area="statistics">
      {/* ── Module header — stejný vzor jako ostatní desktopové moduly ── */}
      <header className="mb-7 print-hide">
        <ModulePageHeading
          icon={BarChart3}
          kicker="OPERATINGROOM CONTROL"
          title="STATISTIKY"
        />
      </header>

      {/* Sdílená ovládací lišta ve stylu Nastavení; na menší šířce se zalomí. */}
      <div
        className="statistics-tabs stats-commandbar print-hide mb-4"
        style={{ border: `1px solid ${C.border}` }}
      >
        {/* Záložky */}
        <div className="stats-commandbar-nav">
          <StatisticsNavigation value={tab} onChange={setTab} />
        </div>

        {/* Období a export vpravo, oddělené svislou linkou */}
        <div className="stats-commandbar-actions">
          <span aria-hidden className="h-6 w-px" style={{ background: C.border }} />

          <div className="stats-commandbar-period">
          {tab === 'vykonnost' ? (
            <span className="px-3 py-1.5 text-[12px] font-medium whitespace-nowrap" style={{ color: C.muted }}>
              12 kalendářních měsíců
            </span>
          ) : <div className="flex items-center gap-1 p-1 rounded-lg"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            {(['den','týden','měsíc','rok'] as Period[]).map(p=>(
              <button key={p} onClick={()=>setPeriod(p)} aria-pressed={period === p}
                className="px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap"
                style={{
                  background: period === p ? C.surfaceActive : 'transparent',
                  color: period === p ? C.text : C.muted,
                }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>}
          </div>

          <span aria-hidden className="h-6 w-px" style={{ background: C.border }} />

          <button
            onClick={handlePrint}
            title={`Vytisknout report záložky ${tabLabelMap[tab]} v novém okně`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap"
            style={{ color: C.muted, border: `1px solid ${C.border}` }}>
            <Printer className="w-4 h-4" />
            Tisk
          </button>
          <button
            onClick={handleExportPdf}
            title={`PDF report záložky ${tabLabelMap[tab]} – v dialogu zvolte Uložit jako PDF`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap"
            style={{ color: C.muted, border: `1px solid ${C.border}` }}>
            <FileDown className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handleExportCsv}
            title={`Stáhnout data záložky ${tabLabelMap[tab]} jako CSV pro tabulkový procesor`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap"
            style={{ color: C.muted, border: `1px solid ${C.border}` }}>
            <Sheet className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {/* ── Tab content ──
          Obrazovka zůstává nezávislá na samostatném tiskovém reportu. */}
      <div id={`statistics-panel-${tab}`} role="tabpanel" aria-labelledby={`statistics-tab-${tab}`} tabIndex={0} className="stats-tab-panel min-w-0">
        {(tab==='prehled') && (
          <div key="prehled" className="space-y-5 print-section">

            {/* ── Hero panel — velký prstenec vytížení, doporučení a stavy sálů.
                   Stejný vizuální jazyk jako režim „Fáze" v Toku pacienta. ── */}
            <Card className="p-4 sm:p-6">
              {/* Listování po dnech / kalendář — stejný styl jako v Toku pacienta */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-7 print-hide">
                <div>
                  <p className="text-lg font-semibold" style={{ color: C.text }}>
                    {formatDayLabel(metricsDay)}
                  </p>
                  <p className="text-[12px] capitalize" style={{ color: C.muted }}>
                    {metricsDay.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: C.faint }}>
                    Provozní den 7:00 – 6:59 (noční výkony patří do dne zahájení)
                  </p>
                </div>
                {/* Přepínač: souhrn dne ↔ rozpad po sálech (orbit).
                    Výběr data řeší glassmorph kalendář pod panelem doporučení. */}
                <button
                  onClick={() => setHeroMode(m => (m === 'orbit' ? 'summary' : 'orbit'))}
                  aria-pressed={heroMode === 'summary'}
                  title={heroMode === 'orbit'
                    ? 'Přepnout na souhrn dne (fáze operačního cyklu)'
                    : 'Přepnout na rozpad po sálech'}
                  className="h-10 px-4 rounded-lg text-xs font-semibold flex items-center gap-2"
                  style={heroMode === 'summary'
                    ? { background: C.surfaceActive, color: C.accent, border: `1px solid ${C.border}` }
                    : { background: C.surface, color: C.text, border: `1px solid ${C.border}` }}
                >
                  {heroMode === 'orbit'
                    ? <BarChart3 className="w-4 h-4" />
                    : <Layers className="w-4 h-4" />}
                  {heroMode === 'orbit' ? 'Souhrn dne' : 'Rozpad po sálech'}
                </button>
              </div>

              {/* Mřížka: vlevo prstenec + fáze pod ním (společně vycentrované),
                  vpravo panel doporučení. Malé prstence tak sedí přesně
                  pod středem velkého grafu. */}
              {/* V rozpadu po sálech přibývá prostřední sloupec s fázemi
                  vybraného výkonu — vlevo od doporučení a kalendáře. */}
              <div
                className={`grid grid-cols-1 gap-8 items-start ${
                  heroMode === 'orbit' && orbitRoom
                    ? '2xl:grid-cols-[minmax(0,1fr)_minmax(0,260px)_minmax(0,300px)]'
                    : 'xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]'
                }`}
              >
                <div className="flex flex-col items-center">
                  {heroMode === 'orbit' ? (
                    /* Orbit — sály, po kliknutí rozpad výkonů vybraného sálu */
                    orbitRoom ? (
                      <>
                        {/* Drobečková navigace zpět na přehled sálů */}
                        <div className="w-full flex items-center justify-between gap-3 mb-4">
                          <button
                            onClick={() => setOrbitRoomId(null)}
                            className="h-9 px-3 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 transition-colors"
                            style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}` }}
                          >
                            <ChevronLeft className="w-4 h-4" /> Všechny sály
                          </button>
                          <p className="text-[13px] font-bold truncate" style={{ color: C.text }}>
                            {orbitRoom.name}
                            <span className="font-medium" style={{ color: C.muted }}> · výkony dne</span>
                          </p>
                        </div>

                        <OrbitRings
                          center={{
                            value: calculateRoomUtilizationForDay(orbitRoom, dayHistory, metricsDay),
                            color: C.accent,
                            kicker: 'Vytížení sálu',
                          }}
                          items={roomOperationRings}
                          onSelect={(id) => setSelectedOpId(cur => (cur === id ? null : id))}
                          selectedId={selectedOpId}
                          emptyText="V tento den nemá sál žádný zaznamenaný výkon."
                        />

                        {/* Legenda fází cyklu */}
                        {roomPhaseLegend.length > 0 && (
                          <div className="w-full mt-5 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                            <StatSectionLabel className="mb-3">Fáze cyklu</StatSectionLabel>
                            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
                              {roomPhaseLegend.map(p => (
                                <span key={p.name} className="flex items-center gap-1.5 text-[12px]" style={{ color: C.muted }}>
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                                  {p.name}
                                  <span className="font-bold tabular-nums" style={{ color: C.text }}>
                                    {fmtDurationMin(p.ms / 60000)}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {roomOperationRings.length > 0 && (
                          <p className="text-[12px] mt-4 text-center" style={{ color: C.muted }}>
                            {roomOperationRings.length}{' '}
                            {roomOperationRings.length === 1
                              ? 'výkon'
                              : roomOperationRings.length <= 4 ? 'výkony' : 'výkonů'} ·
                            <span style={{ color: C.faint }}> každý prstenec je jeden operační cyklus</span>
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <OrbitRings
                          center={{
                            value: dayStats.avgUtil,
                            valueLabel: dayStats.openRooms > 0 ? undefined : '—',
                            color: dayStats.avgUtil >= 80 ? C.green : dayStats.avgUtil >= 50 ? C.accent : dayStats.avgUtil > 0 ? C.orange : C.red,
                            kicker: 'Průměr',
                          }}
                          items={orbitRooms}
                          onSelect={(id) => setOrbitRoomId(id)}
                        />
                        <p className="text-[12px] mt-4 text-center" style={{ color: C.muted }}>
                          Vytížení jednotlivých sálů · {dayStats.totalOps} výkonů celkem ·
                          <span style={{ color: C.faint }}> klikni na sál pro rozpad výkonů</span>
                        </p>
                      </>
                    )
                  ) : (
                    <>
                      <GaugeRing
                        value={dayStats.avgUtil}
                        valueLabel={dayStats.openRooms > 0 ? undefined : '—'}
                        size={340}
                        color={dayStats.avgUtil >= 80 ? C.green : dayStats.avgUtil >= 50 ? C.accent : dayStats.avgUtil > 0 ? C.orange : C.red}
                        kicker="Vytížení sálů"
                        sublabel={`${dayStats.totalOps} výkonů · ${dayStats.activeRooms}/${dayRooms.length} sálů v provozu`}
                      />

                      {/* Fáze operačního cyklu — podíl času jednotlivých statusů */}
                      <div className="w-full mt-8 pt-7" style={{ borderTop: `1px solid ${C.border}` }}>
                        <StatSectionLabel className="mb-6">Fáze operačního cyklu</StatSectionLabel>
                        <RingRow
                          items={dayPhaseRings}
                          emptyText="Pro vybraný den nejsou zaznamenané fáze."
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Prostřední sloupec — fáze vybraného výkonu (jen v rozpadu) */}
                {heroMode === 'orbit' && orbitRoom && (
                  <PhasePanel
                    title="Fáze výkonu"
                    subtitle={selectedOp?.label}
                    items={selectedOpPhases}
                    emptyText="Klikni na výkon v grafu a zobrazí se rozpad jeho fází."
                  />
                )}

                {/* Pravý sloupec — doporučení a kalendář */}
                <div className="flex flex-col gap-4">
                  <InsightPanel
                    accent={dayStats.avgUtil >= 80 ? C.green : C.accent}
                    items={overviewInsights}
                  />

                  <div className="print-hide">
                    <GlassCalendar
                      value={metricsDay}
                      onChange={setMetricsDay}
                      heat={dayActivityHeat}
                      accent={C.accent}
                      today={operationalToday()}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* KPI strip */}
            <div className="stats-overview-metrics"
              style={{border:`1px solid ${C.border}`}}>
              {[
                {l:'Sálů celkem',      v:rooms.length,                          c:C.text},
                {l:'Obsazeno',         v:`${busyCount} / ${rooms.length}`,       c:C.orange},
                {l:'Volno',            v:`${freeCount} / ${rooms.length}`,       c:C.green},
                {l:'Úklid + Údržba',  v:`${cleanCount+maintCount}`,             c:C.accent},
                {l:`Využití (${period})`,v:hasPeriodCapacity ? `${avgUtil}%` : '—', c:C.text},
                {l:'Nejvyšší využití sálu', v:hasPeriodCapacity ? `${peakUtil}%` : '—', c:peakUtil>90?C.red:C.orange},
                {l:'Nejnižší využití sálu', v:hasPeriodCapacity ? `${minUtil}%` : '—', c:C.muted},
                {l:`Výkony (${period})`,v:totalOps,                             c:C.accent},
              ].map((k,i)=>(
                <div key={i} className="flex flex-col justify-between px-4 py-3"
                  style={{background:C.surface,borderRight:i<7?`1px solid ${C.border}`:undefined}}>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] mb-2.5" style={{color:C.muted}}>{k.l}</p>
                  <p className="text-2xl font-light leading-none" style={{color:k.c}}>{k.v}</p>
                </div>
              ))}
            </div>

            {/* Srovnání období — trend klíčových metrik proti minulému období a loňsku */}
            <div className="space-y-2">
              <SectionLabel>Srovnání období</SectionLabel>
              <StatisticsTrendStrip period={period} palette={C} />
            </div>

            {/* Per-room KPI strips — provozní metriky s listováním po dnech */}
            <div className="space-y-3">
              {/* Hlavička sekce + navigace po dnech */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionLabel>
                  Jednotlivé sály — provozní metriky ({formatDayLabel(metricsDay)})
                </SectionLabel>
                <div className="print-hide">
                  <DayNavigator value={metricsDay} onChange={setMetricsDay} today={operationalToday()} />
                </div>
              </div>

              <div className="stats-room-metrics" role="region" aria-label="Provozní metriky jednotlivých sálů" tabIndex={0}>
              {dayRooms.map(r => {
                const dayIdx = weekdayIndex(metricsDay);
                const opsInHours = countOperationsForDay(r, dayHistory, metricsDay);
                const util = calculateRoomUtilizationForDay(r, dayHistory, metricsDay);
                const activeMins = Math.round(calculateActiveMinutesForDay(r, dayHistory, metricsDay));
                const totalMins = Math.round(getRoomWorkingMinutesForDate(r, metricsDay));
                const dayHoursLabel = formatRoomWorkingHours(r, dayIdx);
                const dayHours = getRoomWorkingHours(r, dayIdx);
                // Skutečně odpauzovaný čas sálu (události pause/resume), ne
                // plánovaná přestávka z rozvrhu.
                const pausedMins = calculatePausedMinutesForDay(r, dayHistory, metricsDay);
                const closed = !dayHours.enabled;
                // Přesah = odoperováno nad rámec plánované kapacity dne
                const overtimeMins = calculateOvertimeMinutesForDay(r, dayHistory, metricsDay);
                const utilColor = util >= 80 ? C.green
                  : util >= 50 ? C.yellow
                  : util > 0 ? C.orange : C.muted;

                const flags: string[] = [];
                if (r.isEmergency) flags.push('EMERG');
                if (r.isSeptic)    flags.push('SEPT');
                const flagsLabel = flags.length > 0 ? flags.join(' · ') : '—';
                const flagsColor = r.isEmergency ? C.orange : r.isSeptic ? C.red : C.faint;

                const cells = [
                  { l: 'Sál',                  v: r.name,                                   c: C.text },
                  // Stav + příznaky (nouze / septický) v jedné buňce
                  { l: 'Stav',                 v: flags.length > 0 ? `${roomStatusLabel(r)} · ${flagsLabel}` : roomStatusLabel(r), c: flags.length > 0 ? flagsColor : roomStatusColor(r) },
                  // Vytížení — barevné procento + barevná linka pod hodnotou
                  { l: 'Využití kapacity',     v: totalMins > 0 ? `${util}%` : '—',         c: utilColor, bar: totalMins > 0 ? Math.min(100, util) : undefined },
                  { l: 'Výkony',               v: String(opsInHours),                       c: opsInHours > 0 ? C.accent : C.muted },
                  { l: 'Pracovní doba',        v: dayHoursLabel,                            c: closed ? C.faint : C.text },
                  { l: 'Pauza',                v: pausedMins > 0 ? `${pausedMins} m` : '—', c: pausedMins > 0 ? C.yellow : C.faint },
                  { l: 'Aktivní / Kap.',       v: `${activeMins} / ${totalMins > 0 ? totalMins : '—'} m`, c: C.text },
                  { l: 'Přesah',               v: totalMins > 0 && overtimeMins > 0 ? `+${overtimeMins} m` : '—', c: totalMins > 0 && overtimeMins > 0 ? C.red : C.faint },
                ];

                return (
                  <div
                    key={r.id}
                    className="stats-room-metrics-row">
                    {cells.map((k, i) => (
                      <div
                        key={i}
                        className="flex flex-col justify-between px-4 py-3"
                        style={{
                          background: C.surface,
                          borderRight: i < cells.length - 1 ? `1px solid ${C.border}` : undefined,
                        }}>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.1em] mb-2" style={{color: C.muted}}>
                          {k.l}
                        </p>
                        {/* Delší názvy a stavy se zalomí bez ztráty informace. */}
                        <p
                          className="text-xs font-medium leading-snug whitespace-normal break-words"
                          style={{ color: k.c }}
                          title={String(k.v)}
                        >
                          {k.v}
                        </p>
                        {/* Barevná linka vytížení pod procentem */}
                        {k.bar !== undefined && (
                          <div
                            className="mt-2 h-1.5 rounded-full overflow-hidden"
                            style={{ background: 'var(--stats-ghost)' }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${k.bar}%`,
                                background: k.c,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
              {dayRooms.length === 0 && (
                <p className="text-xs py-4 text-center" style={{color: C.faint}}>
                  Žádné sály k zobrazení.
                </p>
              )}
              </div>
            </div>

            {/* Row 1 odstraněna — „Využití jednotlivých sálů" i „Stav sálů — podíl"
                duplikovaly údaje z KPI pásu a provozních metrik sálů výše. */}

            {/* Row 2: Ops per room + Dept + 7-day trend */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card className="p-5">
                <SectionLabel>Výkony / sál (24 h)</SectionLabel>
                <BarList
                  ranked
                  items={[...roomBarData]
                    .sort((a, b) => b.ops - a.ops)
                    .slice(0, 8)
                    .map(d => ({ label: d.name, value: d.ops, color: d.color }))}
                  emptyText="Za posledních 24 h bez výkonů."
                />
              </Card>
              <Card className="p-5">
                <SectionLabel>Oddělení — výkony / 24 h</SectionLabel>
                <BarList
                  items={deptMap.slice(0, 7).map(([dept, count]) => ({
                    label: dept,
                    value: count,
                    color: DEPT_COLORS[dept] ?? C.accent,
                  }))}
                  emptyText="Za posledních 24 h bez výkonů."
                />
              </Card>
              <Card className="p-5">
                <SectionLabel>Trend výkonů — 7 dní</SectionLabel>
                {opsTrend.length > 0 ? (
                  <ColumnChart
                    items={opsTrend.map((d, i) => ({
                      label: d.t,
                      value: d.v,
                      color: C.accent,
                      highlight: i === opsTrend.length - 1,
                    }))}
                    height={140}
                  />
                ) : <EmptyState title="Bez historických dat" desc="Pro zvolené období nejsou zaznamenané výkony." />}
              </Card>
            </div>

            {/* Row 3: Scatter + Interval compare + Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card className="p-5">
                <SectionLabel>Výkony vs. využití — srovnání sálů</SectionLabel>
                <ScatterGrid
                  xLabel="Výkony / 24 h"
                  yLabel="Využití %"
                  points={scatterData.map(d => ({
                    label: d.name ?? '—',
                    x: d.ops,
                    y: d.util,
                    size: d.queue,
                    color: d.util >= 80 ? C.green : d.util >= 50 ? C.yellow : d.util > 0 ? C.orange : C.red,
                  }))}
                />
              </Card>
              <Card className="p-5">
                <SectionLabel>Průměrný počet výkonů dle dne v týdnu</SectionLabel>
                {intervalCompare.length > 0 ? (
                  <ColumnChart
                    items={intervalCompare.map(d => ({
                      label: d.t,
                      value: d.v,
                      color: d.v >= 80 ? C.green : d.v >= 60 ? C.accent : d.v >= 40 ? C.yellow : C.orange,
                    }))}
                    height={140}
                  />
                ) : <EmptyState title="Bez historických dat" desc="Pro zvolené období nejsou zaznamenané výkony." />}
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
                          <p className="text-sm font-bold" style={{ color: util >= 80 ? C.green : util >= 50 ? C.yellow : C.orange }}>{getRoomTotalWorkingMinutes(r, period) > 0 ? `${util}%` : '—'}</p>
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

        {/* ── Finance & náklady (z hourly_operating_cost × historie) ── */}
        {(tab==='finance') && (
          <div key="finance" className="space-y-5 print-section">
          <FinanceTab
              rooms={allRooms}
              totalOps={totalOps}
              avgUtilization={avgUtil}
              periodLabel={period}
              statusHistory={allStatusHistory}
              calendarHistory={allDayHistory}
              notifications={notifications}
            />
          </div>
        )}

        {/* ── Hodinové sazby — samostatná záložka ── */}
        {(tab==='sazby') && (
          <div key="sazby" className="space-y-5 print-section">
            <FinanceTab
              rooms={allRooms}
              totalOps={totalOps}
              avgUtilization={avgUtil}
              periodLabel={period}
              statusHistory={allStatusHistory}
              notifications={notifications}
              view="rates"
            />
          </div>
        )}

        {/* ── Sály — propracovaný RoomsTab ── */}
        {(tab==='saly') && (
          <div key="saly" className="space-y-5 print-section">
            <RoomsTab
              rooms={allRooms}
              statusHistory={allStatusHistory}
              calendarHistory={allDayHistory}
              periodLabel={period}
              onRoomSelect={selectRoom}
              calculateRoomUtilization={calculateRoomUtilization}
              countOperationsInWorkingHours={countOperationsInWorkingHours}
              calculateRoomUtilizationForDay={calculateRoomUtilizationForDay}
              countOperationsForDay={countOperationsForDay}
              workflowSteps={WORKFLOW_STEPS}
            />
          </div>
        )}

        {/* ── Fáze — propracovaný PhasesTab ── */}
        {(tab==='faze') && (
          <div key="faze" className="space-y-5 print-section">
            <PhasesTab
              rooms={allRooms}
              statusHistory={allStatusHistory}
              calendarHistory={allDayHistory}
              periodLabel={period}
              workflowSteps={WORKFLOW_STEPS}
              avgStepDurations={avgStepDurations}
              workflowAgg={workflowAgg}
            />
          </div>
        )}

        {(tab==='vykonnost') && (
          <div key="vykonnost" className="space-y-5 print-section">
            <PerformanceTab
              rooms={performanceRooms}
              history={performance.history}
              isLoading={performance.isLoading || performance.isRefreshing}
              error={performance.error}
              loadedAt={performance.loadedAt}
              loadingProgress={performance.progress}
              onRefresh={() => { void performance.refresh(); }}
            />
          </div>
        )}

        {/* ── Notifikace ── (nový tab) */}
        {(tab==='notifikace') && (
        <div key="notifikace" className="flex flex-col gap-5 print-section">
          <NotificationsTab
            notifications={notifications}
            statusHistory={allStatusHistory}
            calendarHistory={allDayHistory}
            rooms={allRooms}
            periodLabel={periodLabelMap[period]}
          />
        </div>
        )}

        {/* ── Zařízení ── (nový tab) */}
        {(tab==='zarizeni') && (
        <div key="zarizeni" className="flex flex-col gap-5 print-section">
          <DevicesTab
            devices={devices}
            periodLabel={periodLabelMap[period]}
          />
        </div>
        )}

        </div>

      </div>
      )}
      {/* ── Room detail panel (shared mobile + desktop) �����─ */}
      {selectedRoom&&(
        <RoomDetailPanel
          room={selectedRoom}
          onClose={() => setRoomSelection(null)}
          workflowSteps={WORKFLOW_STEPS}
          period={period}
          selectedDay={roomSelection?.day ?? null}
          history={roomSelection?.day ? allDayHistory : allStatusHistory}
          trendHistory={allDayHistory}
          loading={isStatisticsLoading}
          error={reportSourceErrors.statusHistory || reportSourceErrors.dayHistory}
        />
      )}
    </StatisticsReportContext.Provider>
  );
};

export default memo(StatisticsModule);
