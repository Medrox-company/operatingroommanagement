import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, TrendingUp, TrendingDown, Minus, X, Activity,
  ChevronRight, Clock, Users, AlertTriangle, CheckCircle2,
  Layers, Thermometer, Zap, Shield,
} from 'lucide-react';
import { OperatingRoom, RoomStatus } from '../types';
import { MOCK_ROOMS, WORKFLOW_STEPS, STEP_DURATIONS } from '../constants';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, ComposedChart, Legend,
} from 'recharts';

interface StatisticsModuleProps {
  rooms?: OperatingRoom[];
}

type Tab = 'prehled' | 'saly' | 'faze' | 'heatmapa';
type Period = 'den' | 'týden' | 'měsíc';

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  accent:      '#06B6D4',
  green:       '#10B981',
  orange:      '#F97316',
  yellow:      '#FBBF24',
  red:         '#EF4444',
  purple:      '#A78BFA',
  border:      'rgba(255,255,255,0.07)',
  surface:     'rgba(255,255,255,0.025)',
  surfaceHigh: 'rgba(255,255,255,0.04)',
  muted:       'rgba(255,255,255,0.30)',
  faint:       'rgba(255,255,255,0.15)',
  ghost:       'rgba(255,255,255,0.07)',
};

const DEPT_COLORS: Record<string, string> = {
  TRA: '#06B6D4', CHIR: '#F97316', ROBOT: '#A78BFA',
  URO: '#EC4899', ORL: '#3B82F6', CÉVNÍ: '#14B8A6',
  'HPB + PLICNÍ': '#FBBF24', DĚTSKÉ: '#10B981', MAMMO: '#818CF8',
};

// ── Mock data ─────────────────────────────────────────────────────────────────
const weekData   = [{ t:'Po',v:92},{t:'Út',v:88},{t:'St',v:95},{t:'Čt',v:87},{t:'Pá',v:79},{t:'So',v:45},{t:'Ne',v:30}];
const dayData    = [{ t:'7',v:62},{t:'8',v:78},{t:'9',v:89},{t:'10',v:94},{t:'11',v:91},{t:'12',v:82},{t:'13',v:76},{t:'14',v:88},{t:'15',v:85},{t:'16',v:70},{t:'17',v:55},{t:'18',v:38}];
const monthData  = Array.from({length:30},(_,i)=>({t:`${i+1}`,v:[88,82,90,74,85,91,78,72,86,93,89,84,77,88,92,70,83,87,79,91,85,74,88,93,80,76,89,82,91,86][i]}));

const HEATMAP: number[][] = [
  [5,5,5,5,5,5,5,10,45,80,95,90,88,85,90,92,88,75,60,40,20,10,5,5],
  [5,5,5,5,5,5,5,12,50,82,96,91,89,86,91,93,89,76,61,41,21,10,5,5],
  [5,5,5,5,5,5,5,10,48,79,94,90,88,85,90,92,88,74,59,39,20,9,5,5],
  [5,5,5,5,5,5,5,11,47,81,93,89,87,84,89,91,87,73,58,38,19,9,5,5],
  [5,5,5,5,5,5,5,9,40,72,86,82,80,77,82,84,80,66,51,32,15,7,5,5],
  [5,5,5,5,5,5,5,5,15,30,45,52,48,44,48,50,44,32,22,14,8,5,5,5],
  [5,5,5,5,5,5,5,5,5,10,18,22,20,18,20,22,18,12,8,5,5,5,5,5],
];
const DAYS = ['Po','Út','St','Čt','Pá','So','Ne'];

const phaseRows = [
  { label:'Příjezd na sál',     min:12, pct:5.5,  trend:-1   },
  { label:'Začátek anestezie',  min:8,  pct:3.7,  trend:-0.5 },
  { label:'Chirurgický výkon',  min:95, pct:43.8, trend:+2   },
  { label:'Ukončení výkonu',    min:15, pct:6.9,  trend:-2   },
  { label:'Ukončení anestezie', min:10, pct:4.6,  trend:0    },
  { label:'Úklid sálu',         min:20, pct:9.2,  trend:+1   },
  { label:'Sál připraven',      min:47, pct:21.6, trend:+5   },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusLabel(s: RoomStatus) {
  if (s === RoomStatus.BUSY)        return 'Obsazeno';
  if (s === RoomStatus.FREE)        return 'Volno';
  if (s === RoomStatus.CLEANING)    return 'Úklid';
  return 'Údržba';
}
function statusColor(s: RoomStatus) {
  if (s === RoomStatus.BUSY)        return C.orange;
  if (s === RoomStatus.FREE)        return C.green;
  if (s === RoomStatus.CLEANING)    return C.accent;
  return 'rgba(255,255,255,0.3)';
}
function heatColor(v: number) {
  if (v >= 90) return 'rgba(255,59,48,0.85)';
  if (v >= 70) return 'rgba(249,115,22,0.75)';
  if (v >= 50) return 'rgba(251,191,36,0.65)';
  if (v >= 25) return 'rgba(16,185,129,0.60)';
  return 'rgba(30,41,59,0.5)';
}

const UPS_DEPARTMENTS = ['EMERGENCY','CÉVNÍ','ROBOT'];
function isUPS(room: OperatingRoom) { return room.isEmergency || UPS_DEPARTMENTS.includes(room.department); }
function scheduleDayMin(room: OperatingRoom) { return isUPS(room) ? 1440 : 720; }

type Segment = { color: string; title: string; pct: number; min: number };
function buildTimeline(room: OperatingRoom): Segment[] {
  const dayMin   = scheduleDayMin(room);
  const passCount = Math.max(1, Math.floor(room.operations24h * (dayMin / 1440)));
  const cycleDurations = WORKFLOW_STEPS.map((_,i) => i===2 && room.currentProcedure ? room.currentProcedure.estimatedDuration : STEP_DURATIONS[i]);
  const cycleTotal = cycleDurations.reduce((s,d) => s+d, 0);
  const mpp = Math.floor(dayMin / passCount);
  const raw: Segment[] = [];
  for (let pass=0; pass<passCount; pass++) {
    WORKFLOW_STEPS.forEach((step,si) => {
      const scaledMin = Math.round((cycleDurations[si]/cycleTotal)*mpp);
      if (scaledMin>0) raw.push({color:step.color,title:step.title,pct:(scaledMin/dayMin)*100,min:scaledMin});
    });
    if (pass<passCount-1) raw.push({color:'rgba(255,255,255,0.05)',title:'Pauza',pct:(5/dayMin)*100,min:5});
  }
  const total = raw.reduce((s,seg)=>s+seg.pct,0);
  return raw.map(seg=>({...seg,pct:(seg.pct/total)*100}));
}
function buildStatusDist(room: OperatingRoom): Segment[] {
  const durations = WORKFLOW_STEPS.map((_,i) => i===2 && room.currentProcedure ? room.currentProcedure.estimatedDuration : STEP_DURATIONS[i]);
  const total = durations.reduce((s,d)=>s+d,0);
  return WORKFLOW_STEPS.map((step,i) => ({color:step.color,title:step.title,pct:Math.round((durations[i]/total)*100),min:durations[i]}));
}
function mergeSegments(segs: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const seg of segs) {
    const last = out[out.length-1];
    if (last && last.title===seg.title) { last.pct+=seg.pct; last.min+=seg.min; }
    else out.push({...seg});
  }
  return out;
}

const TIP = {
  contentStyle: { background:'rgba(2,8,23,0.97)', border:`1px solid ${C.border}`, borderRadius:6, fontSize:12 },
  labelStyle:   { color:'rgba(255,255,255,0.45)' },
  itemStyle:    { color: C.accent },
};

function TrendIcon({ v }: { v: number }) {
  if (v > 0) return <TrendingUp  className="w-3.5 h-3.5" style={{ color: C.orange }} />;
  if (v < 0) return <TrendingDown className="w-3.5 h-3.5" style={{ color: C.green }} />;
  return <Minus className="w-3.5 h-3.5" style={{ color: C.ghost }} />;
}

// ── Small card ────────────────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl ${className}`} style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-4" style={{ color: C.muted }}>{children}</p>;
}

// ── Room status badge ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: RoomStatus }) {
  const sc = statusColor(status);
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider"
      style={{ background: `${sc}18`, color: sc }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc }} />
      {statusLabel(status)}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: PŘEHLED
// ══════════════════════════════════════════════════════════════════════════════
interface OverviewTabProps {
  rooms: OperatingRoom[];
  period: Period;
  onPeriodChange: (p: Period) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ rooms, period, onPeriodChange }) => {
  const utilData  = period === 'den' ? dayData : period === 'týden' ? weekData : monthData;
  const totalOps  = rooms.reduce((s,r) => s+r.operations24h, 0);
  const busyRooms = rooms.filter(r => r.status === RoomStatus.BUSY).length;
  const freeRooms = rooms.filter(r => r.status === RoomStatus.FREE).length;
  const cleanRooms= rooms.filter(r => r.status === RoomStatus.CLEANING).length;
  const maintRooms= rooms.filter(r => r.status === RoomStatus.MAINTENANCE).length;
  const avgUtil   = Math.round(utilData.reduce((s,d) => s+d.v, 0) / utilData.length);
  const totalQueue= rooms.reduce((s,r) => s+r.queueCount, 0);
  const septicCount = rooms.filter(r => r.isSeptic).length;
  const emergencyCount = rooms.filter(r => r.isEmergency).length;

  const deptMap = useMemo(() => {
    const m: Record<string, number> = {};
    rooms.forEach(r => { m[r.department] = (m[r.department]||0) + r.operations24h; });
    return Object.entries(m).sort((a,b) => b[1]-a[1]);
  }, [rooms]);

  const opsTrend = [
    {t:'T-6',v:198},{t:'T-5',v:212},{t:'T-4',v:205},
    {t:'T-3',v:221},{t:'T-2',v:215},{t:'T-1',v:228},{t:'Dnes',v:totalOps},
  ];

  const roomBarData = rooms.map(r => ({
    name: r.name.replace('Sál č. ','S'),
    ops: r.operations24h,
    color: statusColor(r.status),
  }));

  // Per-status counts for the donut-like visual
  const statusSegments = [
    { label:'Obsazeno',  count: busyRooms,  color: C.orange },
    { label:'Volno',     count: freeRooms,  color: C.green  },
    { label:'Úklid',     count: cleanRooms, color: C.accent },
    { label:'Údržba',    count: maintRooms, color: C.faint  },
  ];

  return (
    <div className="space-y-5">

      {/* Period switcher */}
      <div className="flex items-center gap-1.5">
        {(['den','týden','měsíc'] as Period[]).map(p => (
          <button key={p} onClick={() => onPeriodChange(p)}
            className="px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded transition-all"
            style={{
              background: period===p ? `${C.accent}18` : 'transparent',
              color:      period===p ? C.accent : 'rgba(255,255,255,0.3)',
              border:     `1px solid ${period===p ? C.accent : C.border}`,
            }}>
            {p}
          </button>
        ))}
      </div>

      {/* KPI strip — 8 cells */}
      <div className="grid grid-cols-4 lg:grid-cols-8 rounded-xl overflow-hidden"
        style={{ border: `1px solid ${C.border}` }}>
        {[
          { l:'Sálů celkem',   v: rooms.length,             c: 'white' },
          { l:'Aktivních',     v: busyRooms,                c: C.orange },
          { l:'Volných',       v: freeRooms,                c: C.green  },
          { l:'Úklid / Údržba',v: cleanRooms+maintRooms,   c: C.accent },
          { l:'Operace / 24h', v: totalOps,                 c: C.accent },
          { l:'Fronta celkem', v: totalQueue,               c: totalQueue>0?C.yellow:'white' },
          { l:'Septické sály', v: septicCount,              c: septicCount>0?C.red:C.faint },
          { l:`Využití (${period})`,v:`${avgUtil}%`,        c: 'white' },
        ].map((k,i) => (
          <div key={i} className="flex flex-col justify-between px-4 py-4"
            style={{ background: C.surface, borderRight: i<7 ? `1px solid ${C.border}` : undefined }}>
            <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: C.muted }}>{k.l}</p>
            <p className="text-2xl font-black leading-none" style={{ color: k.c }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Row 1: Area + Status live panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Area chart */}
        <Card className="lg:col-span-2 p-5">
          <CardLabel>Vytížení operačních sálů — {period}</CardLabel>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={utilData} margin={{top:4,right:0,bottom:0,left:-24}}>
              <defs>
                <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.accent} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" stroke={C.ghost} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={C.ghost} fontSize={11} tickLine={false} axisLine={false} domain={[0,100]} />
              <Tooltip {...TIP} formatter={(v:number) => [`${v}%`,'Využití']} />
              <Area type="monotone" dataKey="v" stroke={C.accent} fill="url(#ug)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Live status panel */}
        <Card className="p-5 flex flex-col">
          <CardLabel>Stav sálů — živě</CardLabel>
          <div className="flex-1 flex flex-col gap-4">
            {statusSegments.map(s => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-xs font-bold" style={{ color: C.muted }}>{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black leading-none" style={{ color: s.color }}>{s.count}</span>
                    <span className="text-xs" style={{ color: C.faint }}>/ {rooms.length}</span>
                  </div>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: C.ghost }}>
                  <motion.div className="h-full rounded-full" style={{ background: s.color, opacity: 0.8 }}
                    initial={{ width:0 }} animate={{ width:`${(s.count/rooms.length)*100}%` }}
                    transition={{ duration:0.7, ease:'easeOut' }} />
                </div>
              </div>
            ))}
          </div>
          {/* Emergency / Septic flags */}
          {(emergencyCount > 0 || septicCount > 0) && (
            <div className="mt-4 pt-4 flex flex-wrap gap-2" style={{ borderTop: `1px solid ${C.border}` }}>
              {emergencyCount > 0 && (
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded"
                  style={{ background:`${C.orange}18`, color: C.orange }}>
                  <AlertTriangle className="w-3 h-3" />
                  {emergencyCount} Emergency
                </span>
              )}
              {septicCount > 0 && (
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded"
                  style={{ background:`${C.red}18`, color: C.red }}>
                  <Shield className="w-3 h-3" />
                  {septicCount} Septické
                </span>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Row 2: Ops per room bar + Dept + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Ops per room */}
        <Card className="p-5">
          <CardLabel>Operace / sál — 24 h</CardLabel>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={roomBarData} margin={{top:0,right:0,bottom:0,left:-24}} barSize={9}>
              <XAxis dataKey="name" stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false} />
              <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip {...TIP} formatter={(v:number) => [v,'Operace']} />
              <Bar dataKey="ops" radius={[2,2,0,0]}>
                {roomBarData.map((entry,i) => (
                  <Cell key={i} fill={entry.color} opacity={0.75} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Dept breakdown */}
        <Card className="p-5">
          <CardLabel>Výkony dle oddělení</CardLabel>
          <div className="space-y-2.5">
            {deptMap.slice(0,7).map(([dept, count], i) => {
              const color = DEPT_COLORS[dept] ?? C.accent;
              return (
                <div key={dept}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-[2px]" style={{ background: color }} />
                      <span className="text-xs" style={{ color: C.muted }}>{dept}</span>
                    </div>
                    <span className="text-xs font-black" style={{ color: 'rgba(255,255,255,0.75)' }}>{count}</span>
                  </div>
                  <div className="h-0.5 rounded-full overflow-hidden" style={{ background: C.ghost }}>
                    <motion.div className="h-full rounded-full" style={{ background: color, opacity:0.8 }}
                      initial={{width:0}} animate={{width:`${(count/deptMap[0][1])*100}%`}}
                      transition={{duration:0.6, delay:i*0.04, ease:'easeOut'}} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Ops trend */}
        <Card className="p-5">
          <CardLabel>Trend operací — 7 dní</CardLabel>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={opsTrend} margin={{top:4,right:4,bottom:0,left:-24}}>
              <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip {...TIP} formatter={(v:number) => [v,'Operace']} />
              <Bar dataKey="v" fill={C.accent} opacity={0.25} radius={[2,2,0,0]} />
              <Line type="monotone" dataKey="v" stroke={C.green} strokeWidth={2}
                dot={{ fill:C.green, strokeWidth:0, r:3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Row 3: Queue list + Fronta / Čekající + Ops 30 days */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Current active procedures */}
        <Card className="p-5 lg:col-span-2">
          <CardLabel>Aktivní výkony — právě nyní</CardLabel>
          <div className="space-y-2">
            {rooms.filter(r => r.status === RoomStatus.BUSY).length === 0 && (
              <p className="text-sm" style={{ color: C.faint }}>Žádný aktivní výkon</p>
            )}
            {rooms.filter(r => r.status === RoomStatus.BUSY).map(r => (
              <div key={r.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg"
                style={{ background: `${C.orange}08`, border: `1px solid ${C.orange}20` }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.orange, boxShadow: `0 0 5px ${C.orange}` }} />
                  <div className="min-w-0">
                    <p className="text-sm font-black truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{r.name}</p>
                    <p className="text-xs truncate" style={{ color: C.muted }}>
                      {r.currentProcedure?.name ?? '—'} · {r.staff.doctor.name ?? '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  {r.currentProcedure && r.currentProcedure.progress > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: C.ghost }}>
                        <div className="h-full rounded-full" style={{ background: C.orange, width: `${r.currentProcedure.progress}%` }} />
                      </div>
                      <span className="text-xs font-black" style={{ color: C.orange }}>{r.currentProcedure.progress}%</span>
                    </div>
                  )}
                  <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: `${DEPT_COLORS[r.department] ?? C.accent}18`, color: DEPT_COLORS[r.department] ?? C.accent }}>
                    {r.department}
                  </span>
                </div>
              </div>
            ))}

            {/* Rooms in cleaning */}
            {rooms.filter(r => r.status === RoomStatus.CLEANING).map(r => (
              <div key={r.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg"
                style={{ background: `${C.accent}08`, border: `1px solid ${C.accent}20` }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.accent }} />
                  <div className="min-w-0">
                    <p className="text-sm font-black truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{r.name}</p>
                    <p className="text-xs" style={{ color: C.muted }}>Probíhá úklid</p>
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </Card>

        {/* Queue + special flags */}
        <Card className="p-5 flex flex-col gap-5">
          <div>
            <CardLabel>Fronta pacientů</CardLabel>
            <div className="space-y-2">
              {rooms.filter(r => r.queueCount > 0).length === 0
                ? <p className="text-sm" style={{ color: C.faint }}>Žádná fronta</p>
                : rooms.filter(r => r.queueCount > 0).map(r => (
                  <div key={r.id} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: C.muted }}>{r.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {Array.from({length: Math.min(r.queueCount, 8)}).map((_,i) => (
                          <div key={i} className="w-1.5 h-4 rounded-sm" style={{ background: C.yellow, opacity: 0.7 }} />
                        ))}
                      </div>
                      <span className="text-sm font-black" style={{ color: C.yellow }}>{r.queueCount}</span>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${C.border}` }} className="pt-4">
            <CardLabel>Speciální označení</CardLabel>
            <div className="space-y-2">
              {rooms.filter(r => r.isSeptic).map(r => (
                <div key={r.id} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: C.muted }}>{r.name}</span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background:`${C.red}15`, color: C.red }}>SEPTICKÝ</span>
                </div>
              ))}
              {rooms.filter(r => r.isEmergency).map(r => (
                <div key={r.id} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: C.muted }}>{r.name}</span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background:`${C.orange}15`, color: C.orange }}>EMERGENCY</span>
                </div>
              ))}
              {rooms.filter(r => r.isSeptic || r.isEmergency).length === 0 && (
                <p className="text-xs" style={{ color: C.faint }}>Bez speciálních označení</p>
              )}
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB: SÁLY — rozšířená tabulka se statusy
// ══════════════════════════════════════════════════════════════════════════════
interface RoomsTabProps {
  rooms: OperatingRoom[];
  onRoomClick: (room: OperatingRoom) => void;
}

const RoomsTab: React.FC<RoomsTabProps> = ({ rooms, onRoomClick }) => {
  const [sortBy, setSortBy] = useState<'name'|'ops'|'status'|'queue'>('status');
  const [filterStatus, setFilterStatus] = useState<RoomStatus | 'all'>('all');

  const filtered = useMemo(() => {
    const f = filterStatus === 'all' ? rooms : rooms.filter(r => r.status === filterStatus);
    return [...f].sort((a,b) => {
      if (sortBy === 'ops')    return b.operations24h - a.operations24h;
      if (sortBy === 'queue')  return b.queueCount - a.queueCount;
      if (sortBy === 'status') {
        const order = [RoomStatus.BUSY, RoomStatus.CLEANING, RoomStatus.FREE, RoomStatus.MAINTENANCE];
        return order.indexOf(a.status) - order.indexOf(b.status);
      }
      return a.name.localeCompare(b.name);
    });
  }, [rooms, sortBy, filterStatus]);

  return (
    <div className="space-y-4">

      {/* Filter + Sort */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {(['all', RoomStatus.BUSY, RoomStatus.FREE, RoomStatus.CLEANING, RoomStatus.MAINTENANCE] as const).map(s => {
            const isActive = filterStatus === s;
            const color = s === 'all' ? C.accent : statusColor(s as RoomStatus);
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-all"
                style={{
                  background: isActive ? `${color}18` : 'transparent',
                  color:      isActive ? color : 'rgba(255,255,255,0.3)',
                  border:     `1px solid ${isActive ? color : C.border}`,
                }}>
                {s === 'all' ? 'Vše' : statusLabel(s as RoomStatus)}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: C.muted }}>Řadit:</span>
          {[{k:'status',l:'Stav'},{k:'ops',l:'Operace'},{k:'queue',l:'Fronta'},{k:'name',l:'Název'}].map(o => (
            <button key={o.k} onClick={() => setSortBy(o.k as any)}
              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded transition-all"
              style={{
                background: sortBy===o.k ? `${C.accent}18` : 'transparent',
                color:      sortBy===o.k ? C.accent : 'rgba(255,255,255,0.3)',
                border:     `1px solid ${sortBy===o.k ? C.accent : C.border}`,
              }}>
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Sál','Oddělení','Status','Aktuální výkon','Chirurg / Sestra','Ops/24h','Fronta','Fáze','Flags'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest"
                    style={{ color: C.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const sc = statusColor(r.status);
                const deptColor = DEPT_COLORS[r.department] ?? C.accent;
                const currentStep = WORKFLOW_STEPS[r.currentStepIndex];
                return (
                  <motion.tr key={r.id}
                    initial={{ opacity:0, y:6 }}
                    animate={{ opacity:1, y:0 }}
                    transition={{ duration:0.15, delay: i*0.02 }}
                    className="cursor-pointer group transition-colors"
                    style={{ borderBottom: i < filtered.length-1 ? `1px solid ${C.border}` : undefined }}
                    onClick={() => onRoomClick(r)}>

                    {/* Sál */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: sc, boxShadow: r.status===RoomStatus.BUSY ? `0 0 6px ${sc}80` : undefined }} />
                        <span className="text-sm font-black" style={{ color: 'rgba(255,255,255,0.85)' }}>{r.name}</span>
                      </div>
                    </td>

                    {/* Oddělení */}
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                        style={{ background:`${deptColor}15`, color: deptColor }}>
                        {r.department}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>

                    {/* Výkon */}
                    <td className="px-4 py-3">
                      <div className="min-w-0 max-w-[200px]">
                        <p className="text-xs font-bold truncate" style={{ color: 'rgba(255,255,255,0.70)' }}>
                          {r.currentProcedure?.name ?? '—'}
                        </p>
                        {r.currentProcedure && r.currentProcedure.progress > 0 && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: C.ghost }}>
                              <div className="h-full rounded-full" style={{ background: sc, width:`${r.currentProcedure.progress}%` }} />
                            </div>
                            <span className="text-[9px] font-black shrink-0" style={{ color: sc }}>
                              {r.currentProcedure.progress}%
                            </span>
                          </div>
                        )}
                        {r.currentProcedure && (
                          <p className="text-[9px] mt-0.5" style={{ color: C.faint }}>
                            {r.currentProcedure.estimatedDuration} min · zahájení {r.currentProcedure.startTime}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Personál */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.60)' }}>{r.staff.doctor.name ?? '—'}</p>
                        <p className="text-[10px]" style={{ color: C.faint }}>{r.staff.nurse.name ?? '—'}</p>
                      </div>
                    </td>

                    {/* Ops */}
                    <td className="px-4 py-3">
                      <span className="text-base font-black" style={{ color: C.accent }}>{r.operations24h}</span>
                    </td>

                    {/* Fronta */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-black"
                        style={{ color: r.queueCount > 0 ? C.yellow : C.faint }}>
                        {r.queueCount > 0 ? r.queueCount : '—'}
                      </span>
                    </td>

                    {/* Fáze */}
                    <td className="px-4 py-3">
                      {currentStep && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                          style={{ background:`${currentStep.color}18`, color: currentStep.color }}>
                          {currentStep.title.split(' ').slice(-1)[0]}
                        </span>
                      )}
                    </td>

                    {/* Flags */}
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {r.isSeptic && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                            style={{ background:`${C.red}15`, color: C.red }}>SEP</span>
                        )}
                        {r.isEmergency && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                            style={{ background:`${C.orange}15`, color: C.orange }}>EMG</span>
                        )}
                        {isUPS(r) && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                            style={{ background:`${C.accent}15`, color: C.accent }}>ÚPS</span>
                        )}
                        {r.isLocked && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                            style={{ background:`${C.faint}`, color: 'rgba(255,255,255,0.4)' }}>LCK</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mini status summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([RoomStatus.BUSY, RoomStatus.FREE, RoomStatus.CLEANING, RoomStatus.MAINTENANCE] as RoomStatus[]).map(s => {
          const count = rooms.filter(r => r.status === s).length;
          const sc = statusColor(s);
          const ops  = rooms.filter(r => r.status === s).reduce((a,r) => a+r.operations24h, 0);
          return (
            <Card key={s} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: sc }}>{statusLabel(s)}</span>
                <div className="w-2 h-2 rounded-full" style={{ background: sc, boxShadow: `0 0 6px ${sc}80` }} />
              </div>
              <p className="text-3xl font-black leading-none mb-1" style={{ color: sc }}>{count}</p>
              <p className="text-xs" style={{ color: C.faint }}>sálů · {ops} ops</p>
            </Card>
          );
        })}
      </div>

    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB: FÁZE
// ══════════════════════════════════════════════════════════════════════════════
interface PhaseTabProps { rooms: OperatingRoom[]; }

const PhaseTab: React.FC<PhaseTabProps> = ({ rooms }) => {

  const workflowTotals = useMemo(() => {
    const totals = WORKFLOW_STEPS.map(step => ({ color:step.color, title:step.title, totalMin:0 }));
    rooms.forEach(room => {
      WORKFLOW_STEPS.forEach((_,i) => {
        totals[i].totalMin += (i===2 && room.currentProcedure) ? room.currentProcedure.estimatedDuration : STEP_DURATIONS[i];
      });
    });
    const grand = totals.reduce((s,t) => s+t.totalMin, 0);
    return totals.map(t => ({ ...t, pct: Math.round((t.totalMin/grand)*100) }));
  }, [rooms]);

  // Current step distribution
  const stepDist = useMemo(() => {
    const counts: Record<number, number> = {};
    rooms.forEach(r => { counts[r.currentStepIndex] = (counts[r.currentStepIndex]||0)+1; });
    return WORKFLOW_STEPS.map((step,i) => ({ ...step, count: counts[i]??0, index: i }));
  }, [rooms]);

  const phaseBarData = WORKFLOW_STEPS.map((step,i) => ({
    name: step.title.split(' ').slice(-1)[0],
    min:  STEP_DURATIONS[i],
    color: step.color,
  }));

  // Weekly simulation
  const weeklyPhaseData = ['Po','Út','St','Čt','Pá','So','Ne'].map((day,di) => {
    const base: Record<string,number|string> = { day };
    WORKFLOW_STEPS.forEach((step,si) => {
      const dur = STEP_DURATIONS[si];
      base[step.title] = di>=5 ? Math.floor(dur*0.3) : dur + (di*si)%8;
    });
    return base;
  });

  return (
    <div className="space-y-5">

      {/* Aggregate bar */}
      <Card className="p-5">
        <CardLabel>Souhrnné rozložení workflow — všechny sály</CardLabel>
        <div className="flex h-6 w-full rounded-lg overflow-hidden gap-[1px] mb-5">
          {workflowTotals.map((seg,i) => (
            <motion.div key={i} className="h-full relative" style={{ background: seg.color, opacity:0.88 }}
              initial={{ width:0 }} animate={{ width:`${seg.pct}%` }}
              transition={{ duration:0.7, delay:i*0.07, ease:'easeOut' }}
              title={`${seg.title} — ${seg.pct}%`}>
              {seg.pct >= 7 && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-black/60 pointer-events-none">
                  {seg.pct}%
                </span>
              )}
            </motion.div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {workflowTotals.map((seg,i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-[2px]" style={{ background: seg.color }} />
                  <span className="text-xs" style={{ color: C.muted }}>{seg.title}</span>
                </div>
                <span className="text-xs font-black" style={{ color: seg.color }}>{seg.pct}%</span>
              </div>
              <div className="h-0.5 rounded-full overflow-hidden" style={{ background: C.ghost }}>
                <motion.div className="h-full" style={{ background: seg.color, opacity:0.7 }}
                  initial={{width:0}} animate={{width:`${seg.pct}%`}}
                  transition={{duration:0.5, delay:i*0.06, ease:'easeOut'}} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Aktuální fáze sálů */}
      <Card className="p-5">
        <CardLabel>Rozložení sálů dle aktuální fáze</CardLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {stepDist.map((step, i) => (
            <div key={i} className="rounded-lg p-3 text-center"
              style={{ background: step.count>0 ? `${step.color}12` : C.ghost, border: `1px solid ${step.count>0 ? step.color+'30' : C.border}` }}>
              <div className="text-2xl font-black mb-1" style={{ color: step.count>0 ? step.color : C.faint }}>
                {step.count}
              </div>
              <div className="text-[9px] font-black uppercase tracking-wider leading-tight" style={{ color: step.count>0 ? step.color : C.faint }}>
                {step.title.split(' ').slice(-1)[0]}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Phase duration bars */}
        <Card className="p-5">
          <CardLabel>Délka fází — průměrné trvání (min)</CardLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {phaseRows.map((ph,i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs flex items-center gap-1.5" style={{ color: C.muted }}>
                    <TrendIcon v={ph.trend} />
                    {ph.label}
                  </span>
                  <span className="text-sm font-black" style={{ color: 'rgba(255,255,255,0.8)' }}>{ph.min} min</span>
                </div>
                <div className="h-0.5 rounded-full overflow-hidden" style={{ background: C.ghost }}>
                  <motion.div className="h-full"
                    style={{ background: ph.pct>20 ? C.accent : 'rgba(255,255,255,0.2)' }}
                    initial={{width:0}} animate={{width:`${Math.min(ph.pct*2,100)}%`}}
                    transition={{duration:0.6, delay:i*0.04, ease:'easeOut'}} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Phase bar chart */}
        <Card className="p-5">
          <CardLabel>Délka fází — vizualizace (min)</CardLabel>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={phaseBarData} layout="vertical" margin={{top:0,right:20,bottom:0,left:0}} barSize={8}>
              <XAxis type="number" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} width={56} />
              <Tooltip {...TIP} formatter={(v:number) => [`${v} min`,'Trvání']} />
              <Bar dataKey="min" radius={[0,2,2,0]}>
                {phaseBarData.map((entry,i) => <Cell key={i} fill={entry.color} opacity={0.82} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Weekly stacked bar */}
      <Card className="p-5">
        <CardLabel>Týdenní rozložení workflow fází — minuty / den</CardLabel>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyPhaseData} margin={{top:4,right:0,bottom:0,left:-24}} barSize={20}>
            <XAxis dataKey="day" stroke={C.ghost} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip {...TIP} />
            {WORKFLOW_STEPS.map(step => (
              <Bar key={step.title} dataKey={step.title} stackId="w" fill={step.color} opacity={0.8} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
          {WORKFLOW_STEPS.map(s => (
            <div key={s.title} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-[2px]" style={{ background: s.color }} />
              <span className="text-[9px]" style={{ color: C.muted }}>{s.title.split(' ').slice(-1)[0]}</span>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB: HEATMAPA
// ══════════════════════════════════════════════════════════════════════════════
interface HeatmapTabProps { rooms: OperatingRoom[]; }

const HeatmapTab: React.FC<HeatmapTabProps> = ({ rooms }) => {
  const dayAvgs   = HEATMAP.map(row => Math.round(row.reduce((s,v) => s+v, 0)/row.length));
  const dayPeaks  = HEATMAP.map(row => Math.max(...row));
  const hourAvgs  = Array.from({length:24},(_,h) => Math.round(HEATMAP.reduce((s,row) => s+row[h], 0)/HEATMAP.length));
  const peakHour  = hourAvgs.indexOf(Math.max(...hourAvgs));

  const hourBarData = Array.from({length:24},(_,h) => ({ h:`${h}`, avg: hourAvgs[h] }));

  return (
    <div className="space-y-5">

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l:'Nejrušnější hodina',  v:`${peakHour}:00`,                 c: C.red   },
          { l:'Peak vytížení',       v:`${Math.max(...hourAvgs)}%`,       c: C.orange},
          { l:'Prům. vytížení (po)', v:`${dayAvgs[0]}%`,                  c: C.accent},
          { l:'Slabý den',           v: DAYS[dayAvgs.indexOf(Math.min(...dayAvgs))], c: C.green },
        ].map((k,i) => (
          <Card key={i} className="p-4">
            <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: C.muted }}>{k.l}</p>
            <p className="text-2xl font-black" style={{ color: k.c }}>{k.v}</p>
          </Card>
        ))}
      </div>

      {/* Main heatmap */}
      <Card className="p-5">
        <CardLabel>Heatmapa vytížení — den × hodina</CardLabel>
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-1" style={{ minWidth: 580 }}>
            {/* Hour labels */}
            <div className="flex gap-0.5 pl-8">
              {Array.from({length:24},(_,h) => (
                <div key={h} className="w-5 text-center text-[8px] font-bold shrink-0" style={{ color: C.faint }}>{h}</div>
              ))}
            </div>
            {/* Rows */}
            {DAYS.map((day,di) => (
              <div key={di} className="flex items-center gap-0.5">
                <span className="w-7 text-[10px] font-black shrink-0" style={{ color: C.muted }}>{day}</span>
                {HEATMAP[di].map((val,hi) => (
                  <div key={hi} className="w-5 h-5 rounded-[3px] shrink-0 transition-opacity hover:opacity-100"
                    style={{ background: heatColor(val), opacity: 0.9 }}
                    title={`${day} ${hi}:00 — ${val}%`} />
                ))}
                <div className="ml-2 flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] font-black" style={{ color: C.muted }}>avg</span>
                  <span className="text-[10px] font-black" style={{ color: heatColor(dayAvgs[di]).startsWith('rgba(30') ? C.faint : 'rgba(255,255,255,0.6)' }}>
                    {dayAvgs[di]}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex gap-4 mt-5 flex-wrap items-center">
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: C.muted }}>Legenda:</span>
          {[
            { c:'rgba(30,41,59,0.5)',    l:'< 25%'  },
            { c:'rgba(16,185,129,0.60)', l:'25–50%' },
            { c:'rgba(251,191,36,0.65)', l:'50–70%' },
            { c:'rgba(249,115,22,0.75)', l:'70–90%' },
            { c:'rgba(255,59,48,0.85)',  l:'> 90%'  },
          ].map(l => (
            <div key={l.l} className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-[3px]" style={{ background: l.c }} />
              <span className="text-xs" style={{ color: C.muted }}>{l.l}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Hourly average bar chart */}
      <Card className="p-5">
        <CardLabel>Průměrné vytížení dle hodiny</CardLabel>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={hourBarData} margin={{top:4,right:0,bottom:0,left:-24}} barSize={12}>
            <XAxis dataKey="h" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}
              ticks={['0','3','6','9','12','15','18','21']} />
            <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} domain={[0,100]} />
            <Tooltip {...TIP} formatter={(v:number) => [`${v}%`,'Průměr']} />
            <Bar dataKey="avg" radius={[2,2,0,0]}>
              {hourBarData.map((entry,i) => (
                <Cell key={i}
                  fill={entry.avg >= 90 ? C.red : entry.avg >= 70 ? C.orange : entry.avg >= 50 ? C.yellow : entry.avg >= 25 ? C.green : C.faint}
                  opacity={0.82} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Daily summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {DAYS.map((day,di) => (
          <Card key={day} className="p-4 text-center">
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: C.muted }}>{day}</p>
            <p className="text-2xl font-black mb-0.5" style={{ color: heatColor(dayPeaks[di]) }}>{dayPeaks[di]}%</p>
            <p className="text-[9px]" style={{ color: C.faint }}>peak</p>
            <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
              <p className="text-base font-black" style={{ color: 'rgba(255,255,255,0.5)' }}>{dayAvgs[di]}%</p>
              <p className="text-[9px]" style={{ color: C.faint }}>průměr</p>
            </div>
          </Card>
        ))}
      </div>

    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ROOM DETAIL PANEL
// ══════════════════════════════════════════════════════════════════════════════
interface RoomDetailPanelProps { room: OperatingRoom; onClose: () => void; }

const RoomDetailPanel: React.FC<RoomDetailPanelProps> = ({ room, onClose }) => {
  const sc     = statusColor(room.status);
  const ups    = isUPS(room);
  const dist   = useMemo(() => buildStatusDist(room), [room]);
  const timeline = useMemo(() => mergeSegments(buildTimeline(room)), [room]);
  const dayMin = scheduleDayMin(room);
  const opsDay = Math.max(1, Math.floor(room.operations24h * (dayMin/1440)));
  const utilPct = dist.find(d => d.title==='Chirurgický výkon')?.pct ?? 0;

  const dayCurve = useMemo(() => {
    const seed  = parseInt(room.id)||1;
    const start = ups ? 0 : 7;
    const end   = ups ? 24 : 19;
    return Array.from({length: end-start},(_,i) => {
      const h = start+i;
      return { t:`${h}`, v: Math.max(10, Math.min(100, 55+((seed*(i+2)*3)%45))) };
    });
  }, [room, ups]);

  const radarData = useMemo(() => {
    const seed = parseInt(room.id)||1;
    return [
      { subject:'Využití',   A: Math.min(100, 50+(seed*7)%50) },
      { subject:'Výkony',    A: Math.min(100, room.operations24h*10) },
      { subject:'Efektivita',A: Math.min(100, 60+(seed*11)%40) },
      { subject:'Personál',  A: Math.min(100, 70+(seed*3)%30) },
      { subject:'Čistota',   A: Math.min(100, 75+(seed*5)%25) },
    ];
  }, [room]);

  const weeklyStack = useMemo(() => {
    return ['Po','Út','St','Čt','Pá','So','Ne'].map((day,di) => {
      const base: Record<string,number|string> = { day };
      WORKFLOW_STEPS.forEach((step,si) => {
        const seed = parseInt(room.id)+di+si;
        const dur  = (si===2 && room.currentProcedure) ? room.currentProcedure.estimatedDuration : STEP_DURATIONS[si];
        base[step.title] = di>=5 ? Math.floor(dur*0.3) : Math.max(1, dur+(seed%10)-5);
      });
      return base;
    });
  }, [room]);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-6 px-4"
      style={{ background:'rgba(0,0,0,0.80)', backdropFilter:'blur(8px)' }}
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={e => { if (e.target===e.currentTarget) onClose(); }}>

      <motion.div className="w-full max-w-5xl rounded-2xl overflow-hidden mb-6"
        style={{ background:'rgb(4,11,28)', border:`1px solid ${sc}35` }}
        initial={{ opacity:0, y:24, scale:0.97 }}
        animate={{ opacity:1, y:0, scale:1 }}
        exit={{ opacity:0, y:16, scale:0.98 }}
        transition={{ duration:0.22 }}>

        {/* Header */}
        <div className="flex items-center gap-4 px-7 py-5" style={{ borderBottom:`1px solid ${C.border}` }}>
          <div className="w-3 h-3 rounded-full" style={{ background:sc, boxShadow:`0 0 10px ${sc}` }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-black" style={{ color:'rgba(255,255,255,0.95)' }}>{room.name}</h2>
              <StatusBadge status={room.status} />
              {ups && <span className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded"
                style={{ background:`${C.accent}12`, color: C.accent }}>ÚPS — 24 h</span>}
              {room.isSeptic && <span className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded"
                style={{ background:`${C.red}12`, color: C.red }}>SEPTICKÝ</span>}
              {room.isEmergency && <span className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded"
                style={{ background:`${C.orange}12`, color: C.orange }}>EMERGENCY</span>}
            </div>
            <p className="text-sm mt-1" style={{ color: C.muted }}>
              {room.department} — {room.currentProcedure?.name ?? 'Žádný aktivní výkon'}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 p-2 rounded-lg transition-colors hover:bg-white/10"
            style={{ color:'rgba(255,255,255,0.4)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-7 space-y-7">

          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-px rounded-xl overflow-hidden"
            style={{ border:`1px solid ${C.border}` }}>
            {[
              { l:'Výkony / den',     v: opsDay,                      hi:true   },
              { l:'Využití výkonem',  v:`${utilPct}%`,                hi:false  },
              { l:'Fronta',           v: room.queueCount,             hi:room.queueCount>0 },
              { l:'Provoz',           v: ups?'24 h':'12 h',           hi:ups    },
              { l:'Aktuální fáze',    v: WORKFLOW_STEPS[room.currentStepIndex]?.title.split(' ').slice(-1)[0] ?? '—', hi:false },
            ].map((k,i) => (
              <div key={i} className="px-4 py-4"
                style={{ background:C.surface, borderRight:i<4?`1px solid ${C.border}`:undefined }}>
                <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color:C.muted }}>{k.l}</p>
                <p className="text-2xl font-black" style={{ color:k.hi?C.accent:'rgba(255,255,255,0.82)' }}>{k.v}</p>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color:C.muted }}>
                Časová osa — {ups?'00:00–24:00':'07:00–19:00'}
              </p>
            </div>
            <div className="flex h-7 w-full rounded-lg overflow-hidden gap-[1px]">
              {timeline.map((seg,i) => (
                <motion.div key={i} className="h-full shrink-0 relative"
                  style={{ width:`${seg.pct}%`, background:seg.color, opacity:0.88 }}
                  initial={{opacity:0}} animate={{opacity:0.88}}
                  transition={{duration:0.4, delay:i*0.03}}
                  title={`${seg.title} — ${seg.min} min (${seg.pct.toFixed(1)}%)`}>
                  {seg.pct>=8 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-black/65 pointer-events-none">
                      {Math.round(seg.pct)}%
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-2.5 mt-4">
              {WORKFLOW_STEPS.map((step,si) => {
                const match = timeline.filter(s => s.title===step.title);
                const pct  = match.reduce((a,s) => a+s.pct, 0);
                const min  = match.reduce((a,s) => a+s.min, 0);
                if (!min) return null;
                return (
                  <div key={si} className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-[2px] shrink-0" style={{ background:step.color }} />
                    <div className="min-w-0">
                      <p className="text-xs truncate" style={{ color:C.muted }}>{step.title}</p>
                      <p className="text-sm font-black" style={{ color:step.color }}>
                        {Math.round(pct)}%<span className="text-white/25 font-normal ml-1">{min} min</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Charts row 1: Day curve + Status dist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="p-5">
              <CardLabel>Vytížení v průběhu dne</CardLabel>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={dayCurve} margin={{top:4,right:0,bottom:0,left:-24}}>
                  <defs>
                    <linearGradient id={`rg-${room.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={sc} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={sc} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} domain={[0,100]} />
                  <Tooltip {...TIP} formatter={(v:number) => [`${v}%`,'Vytížení']} />
                  <Area type="monotone" dataKey="v" stroke={sc} fill={`url(#rg-${room.id})`} strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5">
              <CardLabel>Rozložení statusů — cyklus</CardLabel>
              <div className="space-y-2.5">
                {dist.map((d,i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-[2px]" style={{ background:d.color }} />
                        <span className="text-xs" style={{ color:C.muted }}>{d.title}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs" style={{ color:C.faint }}>{d.min} min</span>
                        <span className="text-sm font-black w-8 text-right" style={{ color:d.color }}>{d.pct}%</span>
                      </div>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background:C.ghost }}>
                      <motion.div className="h-full rounded-full" style={{ background:d.color, opacity:0.85 }}
                        initial={{width:0}} animate={{width:`${d.pct}%`}}
                        transition={{duration:0.5, delay:i*0.05, ease:'easeOut'}} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Charts row 2: Weekly stacked + Radar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="p-5">
              <CardLabel>Týdenní rozložení workflow — min / den</CardLabel>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyStack} margin={{top:4,right:0,bottom:0,left:-24}} barSize={16}>
                  <XAxis dataKey="day" stroke={C.ghost} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip {...TIP} />
                  {WORKFLOW_STEPS.map(step => (
                    <Bar key={step.title} dataKey={step.title} stackId="w" fill={step.color} opacity={0.82} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5">
              <CardLabel>Výkonnostní profil sálu</CardLabel>
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={radarData} margin={{top:10,right:20,bottom:10,left:20}}>
                  <PolarGrid stroke="rgba(255,255,255,0.07)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill:'rgba(255,255,255,0.4)', fontSize:10, fontWeight:700 }} />
                  <Radar dataKey="A" stroke={sc} fill={sc} fillOpacity={0.15} strokeWidth={1.5} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Workflow fáze indicator */}
          <div className="pt-2" style={{ borderTop:`1px solid ${C.border}` }}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color:C.muted }}>Aktuální fáze workflow</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {WORKFLOW_STEPS.map((step,i) => {
                const isCurrent = i===room.currentStepIndex;
                const isDone    = i<room.currentStepIndex;
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-black uppercase tracking-wider"
                      style={{
                        background: isCurrent?`${step.color}20`:isDone?C.ghost:'transparent',
                        color:      isCurrent?step.color:isDone?'rgba(255,255,255,0.4)':'rgba(255,255,255,0.15)',
                        border:     `1px solid ${isCurrent?step.color:C.border}`,
                      }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background:step.color, opacity:isCurrent?1:0.3 }} />
                      {step.title.split(' ').slice(-1)[0]}
                    </div>
                    {i<WORKFLOW_STEPS.length-1 && <div className="w-2 h-px" style={{ background:C.border }} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Personnel + Patient */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2" style={{ borderTop:`1px solid ${C.border}` }}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color:C.muted }}>Personál</p>
              <div className="space-y-3">
                {[
                  { role:'Chirurg',       name:room.staff.doctor.name },
                  { role:'Sestra',        name:room.staff.nurse.name },
                  { role:'Anesteziolog',  name:room.staff.anesthesiologist?.name ?? null },
                ].map(p => (
                  <div key={p.role} className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider" style={{ color:C.faint }}>{p.role}</span>
                    <span className="text-sm font-bold" style={{ color:'rgba(255,255,255,0.70)' }}>{p.name ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              {room.currentPatient && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color:C.muted }}>Aktuální pacient</p>
                  <div className="space-y-3">
                    {[
                      { l:'Jméno',          v:room.currentPatient.name },
                      { l:'Věk',            v:`${room.currentPatient.age} let` },
                      { l:'Krevní skupina', v:room.currentPatient.bloodType ?? '—' },
                    ].map(row => (
                      <div key={row.l} className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider" style={{ color:C.faint }}>{row.l}</span>
                        <span className="text-sm font-bold" style={{ color:'rgba(255,255,255,0.70)' }}>{row.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {room.currentProcedure && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color:C.muted }}>Aktuální výkon</p>
                  <div className="space-y-3">
                    {[
                      { l:'Výkon',   v:room.currentProcedure.name },
                      { l:'Trvání',  v:`${room.currentProcedure.estimatedDuration} min` },
                      { l:'Zahájení',v:room.currentProcedure.startTime },
                    ].map(row => (
                      <div key={row.l} className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider" style={{ color:C.faint }}>{row.l}</span>
                        <span className="text-sm font-bold truncate max-w-[200px]" style={{ color:'rgba(255,255,255,0.70)' }}>{row.v}</span>
                      </div>
                    ))}
                    {room.currentProcedure.progress > 0 && (
                      <div className="mt-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs uppercase tracking-wider" style={{ color:C.faint }}>Průběh</span>
                          <span className="text-base font-black" style={{ color: C.accent }}>{room.currentProcedure.progress}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background:C.ghost }}>
                          <motion.div className="h-full rounded-full" style={{ background: C.accent }}
                            initial={{width:0}} animate={{width:`${room.currentProcedure.progress}%`}}
                            transition={{duration:0.6, ease:'easeOut'}} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const TABS: { id: Tab; label: string }[] = [
  { id:'prehled',   label:'Přehled'  },
  { id:'saly',      label:'Sály'     },
  { id:'faze',      label:'Fáze'     },
  { id:'heatmapa',  label:'Heatmapa' },
];

const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms = MOCK_ROOMS }) => {
  const [tab, setTab]       = useState<Tab>('prehled');
  const [period, setPeriod] = useState<Period>('týden');
  const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);

  return (
    <div className="w-full min-h-screen flex flex-col text-white">

      {/* Header */}
      <header className="flex flex-col items-start justify-between gap-4 mb-12 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-2 opacity-60">
            <BarChart3 className="w-3.5 h-3.5" style={{ color: C.accent }} />
            <p className="text-[10px] font-black tracking-[0.4em] uppercase" style={{ color: C.accent }}>
              ANALÝZY A METRIKY
            </p>
          </div>
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
            STATISTIKY <span style={{ color:'rgba(255,255,255,0.18)' }}>SYSTÉMU</span>
          </h1>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-0 rounded-xl overflow-hidden"
          style={{ border:`1px solid ${C.border}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-6 py-3 text-xs font-black uppercase tracking-widest transition-all"
              style={{
                background: tab===t.id ? `${C.accent}18` : C.surface,
                color:      tab===t.id ? C.accent : 'rgba(255,255,255,0.35)',
                borderRight: `1px solid ${C.border}`,
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab}
          initial={{ opacity:0, y:8 }}
          animate={{ opacity:1, y:0 }}
          exit={{ opacity:0, y:-4 }}
          transition={{ duration:0.18 }}>
          {tab === 'prehled'  && <OverviewTab rooms={rooms} period={period} onPeriodChange={setPeriod} />}
          {tab === 'saly'     && <RoomsTab rooms={rooms} onRoomClick={setSelectedRoom} />}
          {tab === 'faze'     && <PhaseTab rooms={rooms} />}
          {tab === 'heatmapa' && <HeatmapTab rooms={rooms} />}
        </motion.div>
      </AnimatePresence>

      {/* Room detail overlay */}
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPanel room={selectedRoom} onClose={() => setSelectedRoom(null)} />
        )}
      </AnimatePresence>

    </div>
  );
};

export default StatisticsModule;
