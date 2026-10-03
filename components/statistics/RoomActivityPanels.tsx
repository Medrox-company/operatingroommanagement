'use client';

import React, { useMemo, memo } from 'react';
import { Clock, X } from 'lucide-react';
import { OperatingRoom } from '../../types';
import { type StatusHistoryRow } from '../../lib/db';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Line, CartesianGrid, ComposedChart } from 'recharts';
import '../mobile/mobile-statistics.css';
import { getRoomWorkingMinutes, formatRoomWorkingHours, isRoomBusyByStep, WorkflowStep, buildTimeline, mergeSeg, type Period, weekdayIndex, operationalToday, operationalDayKey, countOperationsForDay, countOperationsInWorkingHours, calculateRoomUtilizationForDay, calculateRoomUtilization } from '../../lib/statistics-room-activity';
import { statisticsDayWindow, statisticsPeriodWindow, hasStatisticsRoomCapacity } from '../../lib/statistics-room-scope';
import { roomDetailPhaseDistribution, roomDetailHourlyEvents } from '../../lib/statistics-room-detail';
import { C, TIP } from './statistics-theme';
import { roomStatusColor, roomStatusLabel, Card, SectionLabel } from './StatisticsPrimitives';

// ── Room mini card (extracted so hooks are always called at component level) ──
export interface RoomMiniCardProps { 
  r: OperatingRoom; 
  onClick: () => void; 
  workflowSteps: WorkflowStep[]; 
  stepDurations: number[];
  opsCount: number;
  utilization: number;
  /** Pokud true, vyrenderuje rozšířenou kartu s detail daty pro tisk/PDF */
  isPrinting?: boolean;
}

export const RoomMiniCard: React.FC<RoomMiniCardProps> = memo(({ r, onClick, workflowSteps, stepDurations, opsCount, utilization, isPrinting }) => {
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

// ══════������═══════════════════════════════════════�����══════════════════════════════
// ROOM DETAIL PANEL
// ══════════════════════════════════════════════════════�������═���════════════════════
export interface RoomPanelProps {
  room: OperatingRoom;
  onClose: () => void;
  workflowSteps: WorkflowStep[];
  period: Period;
  selectedDay: Date | null;
  history: StatusHistoryRow[];
  trendHistory: StatusHistoryRow[];
  loading: boolean;
  error: string | null;
}

export const RoomDetailPanel: React.FC<RoomPanelProps> = ({
  room, onClose, workflowSteps, period, selectedDay, history, trendHistory, loading, error,
}) => {
  const sc = roomStatusColor(room);
  const now = new Date();
  const window = useMemo(() => selectedDay ? statisticsDayWindow(selectedDay) : statisticsPeriodWindow(period),
    [selectedDay, period, history]);
  const periodLabels: Record<Period, string> = {
    den: 'Posledních 24 hodin', týden: 'Posledních 7 dní', měsíc: 'Posledních 30 dní', rok: 'Posledních 365 dní',
  };
  const selectionLabel = selectedDay
    ? selectedDay.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' }) + ' · 7:00–6:59'
    : periodLabels[period];
  const todayWorkingHoursLabel = formatRoomWorkingHours(room, weekdayIndex(selectedDay ?? operationalToday(now)));
  const ready = !loading && !error;
  const opsDay = selectedDay ? countOperationsForDay(room, history, selectedDay)
    : countOperationsInWorkingHours(room, history, period);
  const hasCapacity = hasStatisticsRoomCapacity(room, window);
  const utilPct = selectedDay ? calculateRoomUtilizationForDay(room, history, selectedDay)
    : calculateRoomUtilization(room, history, period);

  // The parent owns the complete, hospital-scoped, realtime history. No second
  // capped query, room counter snapshot, or schedule gate in the detail.
  const dist = useMemo(() => roomDetailPhaseDistribution(history, room.id, workflowSteps, window),
    [history, room.id, workflowSteps, window]);
  const tl = dist.filter(phase => phase.min > 0);
  const dayCurve = useMemo(() => roomDetailHourlyEvents(history, room.id, window),
    [history, room.id, window]);
  const hourlyEvents = dayCurve.map(d => ({ t: d.t, events: d.v }));
  const phaseBar = dist.map(phase => ({ name: phase.title, ...phase }));
  const pieData = tl;
  const statusUtil = dist.map(phase => ({ label: phase.title, pct: phase.pct, color: phase.color }));

  // Context charts intentionally retain their explicit trailing-day windows,
  // independent of the selected reporting period above.
  const todayKey = operationalDayKey(now);
  const weeklyStacked = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const day = operationalToday();
    day.setDate(day.getDate() - 6 + i);
    const phases = roomDetailPhaseDistribution(trendHistory, room.id, workflowSteps, statisticsDayWindow(day));
    return { day: day.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }),
      ...Object.fromEntries(phases.map(phase => [phase.title, phase.min])) };
  }), [trendHistory, room.id, workflowSteps, todayKey]);
  const cumulData = useMemo(() => {
    let cum = 0;
    return Array.from({ length: 30 }, (_, i) => {
      const day = operationalToday();
      day.setDate(day.getDate() - 29 + i);
      const daily = countOperationsForDay(room, trendHistory, day);
      cum += daily;
      return { d: day.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }), daily, cum };
    });
  }, [room, trendHistory, todayKey]);
  return(
    <div className="statistics-module statistics-settings fixed inset-0 z-50 flex justify-end" style={{background:'rgba(0,0,0,0.7)'}}>
      <button
        type="button"
        aria-label="Zavřít detail operačního sálu"
        className="absolute inset-0 cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300/45"
        onClick={onClose}
      />
      <div className="relative z-10 h-full w-full max-w-3xl overflow-y-auto hide-scrollbar"
        style={{background:'var(--stats-modal-bg)',borderLeft:`1px solid ${C.border}`}}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-7 py-5"
          style={{background:'var(--stats-modal-bg)',borderBottom:`1px solid ${C.border}`}}>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full" style={{background:sc}}/>
            <div>
              <p className="text-base font-bold" style={{color:C.text}}>{room.name}</p>
              <p className="text-xs mt-0.5" style={{color:C.muted}}>
                {room.department}
                {room.isSeptic&&<span className="ml-2 font-bold" style={{color:C.red}}>· SEPTICKÝ</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Zavřít detail sálu" className="p-2 rounded-lg transition-colors"
            style={{background:C.ghost,color:C.muted}}>
            <X className="w-4 h-4"/>
          </button>
        </div>

        <div className="p-7 space-y-7">
          <p className="text-xs" style={{ color: C.muted }}>{selectionLabel}</p>
          {!ready ? (
            <p role={error ? 'alert' : 'status'} style={{ color: error ? C.red : C.muted }}>
              {error || 'Načítání statistik sálu…'}
            </p>
          ) : <>

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              {l:'Výkony ve výběru',v:opsDay, c:C.accent},
              {l:'Vytížení sálu',v:hasCapacity ? `${utilPct}%` : '—', c:C.text},
              {l:selectedDay ? 'Rozvrh dne' : 'Rozvrh dnes',v:todayWorkingHoursLabel, c:C.muted},
              {l:'Fronta nyní',v:room.queueCount, c:room.queueCount>0?C.yellow:C.muted},
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
              <SectionLabel>Rozložení naměřených fází — vybrané období</SectionLabel>
            </div>
            {!hasCapacity && <p className="mb-3 text-xs" style={{ color: C.muted }}>Bez nastavené kapacity nelze určit vytížení. Skutečné výkony a naměřené časy jsou zachovány.</p>}
            {tl.length === 0 && <p className="mb-3 text-xs" style={{ color: C.muted }}>Ve vybraném období nejsou doložené délky dokončených fází. Chybějící čas se neodhaduje.</p>}
            <div className="flex h-7 w-full rounded-lg overflow-hidden gap-px">
              {tl.map((seg,i)=>(
                <div key={i} className="h-full relative"
                  style={{background:seg.color,opacity:0.88,width:`${seg.pct}%`}}
                  title={`${seg.title} — ${Math.round(seg.min)} min (${seg.pct.toFixed(1)}%)`}>
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
                      <span className="font-normal ml-1" style={{color:C.faint}}>{Math.round(seg.min)} min</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row: Day curve + Status distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="p-5">
              <SectionLabel>Události podle hodin — vybrané období</SectionLabel>
              <ResponsiveContainer width="100%" height={140} minWidth={0} minHeight={0}>
                <AreaChart data={dayCurve} margin={{top:4,right:0,bottom:0,left:-24}}>
                  <defs>
                    <linearGradient id={`rg${room.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={sc} stopOpacity={0.28}/>
                      <stop offset="95%" stopColor={sc} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" stroke={C.ghost} fontSize={11} tickLine={false} axisLine={false}/>
                  <YAxis stroke={C.ghost} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false}/>
                  <Tooltip {...TIP} formatter={(v:number)=>[v,'Události']}/>
                  <Area type="monotone" dataKey="v" stroke={sc} fill={`url(#rg${room.id})`} strokeWidth={1.5} dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-5">
              <SectionLabel>Podíl naměřeného času fází</SectionLabel>
              <div className="space-y-3">
                {statusUtil.map((s,i)=>(
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-[2px] shrink-0" style={{background:s.color}}/>
                        <span className="text-xs" style={{color:C.muted}}>{s.label}</span>
                      </div>
                      <span className="text-sm font-bold" style={{color:s.color}}>{Math.round(s.pct)}%</span>
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
              <SectionLabel>Fáze — posledních 7 provozních dní</SectionLabel>
              <ResponsiveContainer width="100%" height={150} minWidth={0} minHeight={0}>
                <BarChart data={weeklyStacked} margin={{top:4,right:0,bottom:0,left:-24}} barSize={16}>
                  <XAxis dataKey="day" stroke={C.ghost} fontSize={11} tickLine={false} axisLine={false}/>
                  <YAxis stroke={C.ghost} fontSize={10}  tickLine={false} axisLine={false}/>
                  <Tooltip {...TIP} formatter={(v:number)=>[`${Math.round(v)} min`]}/>
                  {dist.map(step=>(
                    <Bar key={step.title} dataKey={step.title} stackId="w" fill={step.color} opacity={0.8}/>
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {dist.map(s=>(
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
              <SectionLabel>Součet délek fází — minuty</SectionLabel>
              <ResponsiveContainer width="100%" height={160} minWidth={0} minHeight={0}>
                <BarChart data={phaseBar} layout="vertical" margin={{top:0,right:16,bottom:0,left:0}} barSize={8}>
                  <XAxis type="number" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                  <YAxis type="category" dataKey="name" stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false} width={52}/>
                  <Tooltip {...TIP} formatter={(v:number)=>[`${Math.round(v)} min`,'Trvání']}/>
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
                  <Tooltip contentStyle={TIP.contentStyle} formatter={(v:number,name:string)=>[`${Math.round(v)}%`,name]}/>
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
            <SectionLabel>Zahájené výkony — posledních 30 provozních dní</SectionLabel>
            <ResponsiveContainer width="100%" height={120} minWidth={0} minHeight={0}>
              <ComposedChart data={cumulData} margin={{top:4,right:4,bottom:0,left:-16}}>
                <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3"/>
                <XAxis dataKey="d" stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false}/>
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

          </>}
        </div>
      </div>
    </div>
  );
};
