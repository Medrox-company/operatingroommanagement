import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Activity,
  AlertTriangle, Shield, Clock, Layers, Zap, X, BarChart3,
} from 'lucide-react';
import { OperatingRoom, RoomStatus } from '../types';
import { STEP_DURATIONS } from '../constants';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { fetchRoomStatistics, RoomStatistics } from '../lib/db';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, ComposedChart,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';

interface StatisticsModuleProps { rooms?: OperatingRoom[]; }

type Period = 'den' | 'týden' | 'měsíc' | 'rok';
type Tab    = 'prehled' | 'saly' | 'faze' | 'heatmapa';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  accent:  '#06B6D4',
  green:   '#10B981',
  orange:  '#F97316',
  yellow:  '#FBBF24',
  red:     '#EF4444',
  border:  'rgba(255,255,255,0.07)',
  surface: 'rgba(255,255,255,0.025)',
  muted:   'rgba(255,255,255,0.35)',
  faint:   'rgba(255,255,255,0.15)',
  ghost:   'rgba(255,255,255,0.07)',
  text:    'rgba(255,255,255,0.85)',
};

const DEPT_COLORS: Record<string,string> = {
  TRA:'#06B6D4', CHIR:'#F97316', ROBOT:'#A78BFA',
  URO:'#EC4899', ORL:'#3B82F6', CÉVNÍ:'#14B8A6',
  'HPB + PLICNÍ':'#FBBF24', DĚTSKÉ:'#10B981', MAMMO:'#818CF8',
};

const DAYS = ['Po','Út','St','Čt','Pá','So','Ne'];

// ── Tooltip shared style ───────────────────────────────────────────────────────
const TIP = {
  contentStyle:{ background:'rgba(2,8,23,0.97)', border:`1px solid ${C.border}`, borderRadius:6, fontSize:12 },
  labelStyle:  { color:C.muted },
  itemStyle:   { color:C.accent },
};

// Mock funkce byly odstraněny - veškerá data se načítají z databáze

// ── Helper fns ────────────────────────────────────────────────────────────────
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
function heatColor(v:number){
  if(v>=90) return 'rgba(255,59,48,0.88)';
  if(v>=70) return 'rgba(249,115,22,0.78)';
  if(v>=50) return 'rgba(251,191,36,0.68)';
  if(v>=25) return 'rgba(16,185,129,0.62)';
  return 'rgba(30,41,59,0.45)';
}
const UPS_DEPTS=['EMERGENCY','CÉVNÍ','ROBOT'];
function isUPS(r:OperatingRoom){ return r.isEmergency||UPS_DEPTS.includes(r.department); }
function dayMinutes(r:OperatingRoom){ return isUPS(r)?1440:720; }

type Seg={color:string;title:string;pct:number;min:number};
type WorkflowStep={name:string;title:string;color:string;organizer:string;status:string};
function buildTimeline(r:OperatingRoom,workflowSteps:WorkflowStep[]):Seg[]{
  const dm=dayMinutes(r);
  const passes=Math.max(1,Math.floor(r.operations24h*(dm/1440)));
  const durs=workflowSteps.map((_,i)=>i===2&&r.currentProcedure?r.currentProcedure.estimatedDuration:STEP_DURATIONS[i]);
  const ct=durs.reduce((s,d)=>s+d,0);
  const mpp=Math.floor(dm/passes);
  const raw:Seg[]=[];
  for(let p=0;p<passes;p++){
    workflowSteps.forEach((step,si)=>{
      const m=Math.round((durs[si]/ct)*mpp);
      if(m>0) raw.push({color:step.color,title:step.title,pct:(m/dm)*100,min:m});
    });
    if(p<passes-1) raw.push({color:'rgba(255,255,255,0.04)',title:'Pauza',pct:(5/dm)*100,min:5});
  }
  const tot=raw.reduce((s,sg)=>s+sg.pct,0);
  return raw.map(sg=>({...sg,pct:(sg.pct/tot)*100}));
}
function buildDist(r:OperatingRoom,workflowSteps:WorkflowStep[]):Seg[]{
  const durs=workflowSteps.map((_,i)=>i===2&&r.currentProcedure?r.currentProcedure.estimatedDuration:STEP_DURATIONS[i]);
  const tot=durs.reduce((s,d)=>s+d,0);
  return workflowSteps.map((step,i)=>({color:step.color,title:step.title,pct:Math.round((durs[i]/tot)*100),min:durs[i]}));
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
interface RoomMiniCardProps { r: OperatingRoom; index: number; onClick: () => void; workflowSteps: WorkflowStep[]; }
const RoomMiniCard: React.FC<RoomMiniCardProps> = memo(({ r, index, onClick, workflowSteps }) => {
  const sc2   = statusColor(r.status);
  const tl2   = useMemo(() => mergeSeg(buildTimeline(r, workflowSteps)), [r, workflowSteps]);
  const utilP = buildDist(r, workflowSteps).find(d => d.title === 'Chirurgický výkon')?.pct ?? 0;
  const ups2  = isUPS(r);
  return (
    <motion.button onClick={onClick}
      className="text-left rounded-lg p-3 w-full group"
      style={{
        background: r.status === RoomStatus.BUSY ? `${sc2}08` : C.surface,
        border: `1px solid ${r.status === RoomStatus.BUSY ? `${sc2}30` : C.border}`,
      }}
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, delay: index * 0.025 }}
      whileHover={{ scale: 1.03 } as any}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc2, boxShadow: `0 0 5px ${sc2}` }} />
          <span className="text-xs font-black truncate" style={{ color: C.text }}>{r.name}</span>
        </div>
        {ups2 && <span className="text-[8px] font-black px-1 py-px rounded shrink-0" style={{ background: `${C.accent}15`, color: C.accent }}>ÚPS</span>}
      </div>
      <p className="text-[10px] mb-2 truncate" style={{ color: C.faint }}>{r.department}</p>
      {/* Micro timeline */}
      <div className="flex h-1.5 w-full rounded overflow-hidden gap-px mb-2">
        {tl2.map((seg, si) => (
          <div key={si} className="h-full shrink-0" style={{ width: `${seg.pct}%`, background: seg.color, opacity: 0.85 }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <p className="text-[8px]" style={{ color: C.ghost }}>Ops</p>
            <p className="text-sm font-black leading-none" style={{ color: C.accent }}>{r.operations24h}</p>
          </div>
          <div>
            <p className="text-[8px]" style={{ color: C.ghost }}>Výk%</p>
            <p className="text-sm font-black leading-none" style={{ color: C.text }}>{utilP}%</p>
          </div>
        </div>
        <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: `${sc2}14`, color: sc2 }}>
          {statusLabel(r.status).slice(0, 3)}
        </span>
      </div>
    </motion.button>
  );
});

// ── Card primitive ────────────────────────────────────────────────────────────
function Card({children,className='',style={}}:{children:React.ReactNode;className?:string;style?:React.CSSProperties}){
  return(
    <div className={`rounded-xl ${className}`} style={{background:C.surface,border:`1px solid ${C.border}`,...style}}>
      {children}
    </div>
  );
}
function SectionLabel({children}:{children:React.ReactNode}){
  return <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-4" style={{color:C.muted}}>{children}</p>;
}
function TrendBadge({v}:{v:number}){
  if(v>0) return(
    <span className="inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded" style={{background:`${C.green}18`,color:C.green}}>
      <TrendingUp className="w-3 h-3"/>+{v}%
    </span>
  );
  if(v<0) return(
    <span className="inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded" style={{background:`${C.red}18`,color:C.red}}>
      <TrendingDown className="w-3 h-3"/>{v}%
    </span>
  );
  return <span className="text-[10px]" style={{color:C.ghost}}>—</span>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOM DETAIL PANEL
// ══════════════════════════════════════════════════════════════════════════════
interface RoomPanelProps{ 
  room:OperatingRoom; 
  onClose:()=>void; 
  workflowSteps:WorkflowStep[]; 
  dbStats?: RoomStatistics | null;
}

const RoomDetailPanel:React.FC<RoomPanelProps> = ({room,onClose,workflowSteps,dbStats})=>{
  const sc     = statusColor(room.status);
  const ups    = isUPS(room);
  const dm     = dayMinutes(room);
  const tl     = useMemo(()=>mergeSeg(buildTimeline(room,workflowSteps)),[room,workflowSteps]);
  const dist   = useMemo(()=>buildDist(room,workflowSteps),[room,workflowSteps]);
  const opsDay = Math.max(1,Math.floor(room.operations24h*(dm/1440)));
  const utilPct= dist.find(d=>d.title==='Chirurgický výkon')?.pct??0;

  // Day utilisation curve - use real DB data if available
  const dayCurve=useMemo(()=>{
    const start=ups?0:7; const end=ups?24:19;
    if (dbStats?.hourlyUtilization) {
      return dbStats.hourlyUtilization
        .filter(h => h.hour >= start && h.hour < end)
        .map(h => ({ t: `${h.hour}`, v: h.utilization }));
    }
    // Fallback - show zeros if no data
    return Array.from({length:end-start},(_,i)=>({
      t:`${start+i}`,
      v: 0,
    }));
  },[ups,dbStats]);

  // Weekly stacked data - use real averageStepDurations if available
  const weeklyStacked=useMemo(()=>DAYS.map((day,di)=>{
    const base:Record<string,number|string>={day};
    const isWeekend = di >= 5;
    workflowSteps.forEach((step,si)=>{
      // Use real average step durations from DB if available
      const realDur = dbStats?.averageStepDurations?.[step.title];
      const defaultDur = si===2&&room.currentProcedure?room.currentProcedure.estimatedDuration:STEP_DURATIONS[si];
      const dur = realDur ?? defaultDur;
      // Reduce weekend durations
      base[step.title] = isWeekend ? Math.floor(dur * 0.3) : dur;
    });
    return base;
  }),[room,workflowSteps,dbStats]);

  // Hourly bar — utilisation %
  const hourlyUtil=useMemo(()=>dayCurve.map(d=>({
    t:d.t,
    util:d.v,
    idle:100-d.v,
  })),[dayCurve]);

  // Phase bar - use real average step durations
  const phaseBar=useMemo(()=>workflowSteps.map((step,i)=>{
    const realDur = dbStats?.averageStepDurations?.[step.title];
    const defaultDur = i===2&&room.currentProcedure?room.currentProcedure.estimatedDuration:STEP_DURATIONS[i];
    return {
      name:step.title.split(' ').slice(-1)[0],
      pct:dist.find(d=>d.title===step.title)?.pct??0,
      min: realDur ?? defaultDur,
      color:step.color,
    };
  }),[dist,room,workflowSteps,dbStats]);

  // Pie from dist
  const pieData=dist.filter(d=>d.min>0);

  // Radar - use real data
  const roomOps = dbStats?.operationsByRoom?.[room.id] || 0;
  const radarData=[
    {subject:'Využití',   A:utilPct},
    {subject:'Operace',   A:Math.min(100, roomOps * 5)},
    {subject:'Průchodnost',A: dbStats?.utilizationRate || 0},
    {subject:'Plán. plnění',A: Math.min(100, (roomOps / Math.max(1, opsDay)) * 100)},
    {subject:'Efektivita', A: dbStats?.averageOperationDuration ? Math.min(100, 100 - Math.abs(dbStats.averageOperationDuration - 60) / 0.6) : 0},
  ];

  // 30-day cumulative - use real data from operationsByDay
  const cumulData = useMemo(() => {
    if (dbStats?.operationsByDay) {
      const days = Object.entries(dbStats.operationsByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-30);
      
      let cum = 0;
      if (days.length > 0) {
        return days.map(([, count], i) => {
          cum += count;
          return { d: `${i + 1}`, daily: count, cum };
        });
      }
    }
    // Empty data
    return Array.from({ length: 30 }, (_, i) => ({
      d: `${i + 1}`,
      daily: 0,
      cum: 0,
    }));
  }, [dbStats]);

  // Utilisation per status (time-based %)
  const statusUtil=[
    {label:'Výkon',      pct:utilPct,                         color:workflowSteps[3]?.color || '#FCA5A5'},
    {label:'Anestezie',  pct:(dist.find(d=>d.title==='Začátek anestezie')?.pct??0)+(dist.find(d=>d.title==='Ukončení anestezie')?.pct??0), color:workflowSteps[2]?.color || '#C4B5FD'},
    {label:'Příprava',   pct:(dist.find(d=>d.title==='Příjezd na sál')?.pct??0)+(dist.find(d=>d.title==='Ukončení výkonu')?.pct??0),       color:workflowSteps[1]?.color || '#5EEAD4'},
    {label:'Úklid',      pct:dist.find(d=>d.title==='Ukončení anestezie')?.pct??0,                                                         color:workflowSteps[5]?.color || '#A5B4FC'},
    {label:'Volno',      pct:dist.find(d=>d.title==='Sál připraven')?.pct??0,                                                               color:workflowSteps[0]?.color || '#34D399'},
  ];

  return(
    <motion.div className="fixed inset-0 z-50 flex justify-end" style={{background:'rgba(0,0,0,0.7)'}}
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}>
      <motion.div className="h-full overflow-y-auto hide-scrollbar w-full max-w-3xl"
        style={{background:'#020B17',borderLeft:`1px solid ${C.border}`}}
        initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}}
        transition={{type:'spring',damping:28,stiffness:260}}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-7 py-5"
          style={{background:'rgba(2,8,23,0.96)',borderBottom:`1px solid ${C.border}`,backdropFilter:'blur(8px)'}}>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full" style={{background:sc,boxShadow:`0 0 8px ${sc}`}}/>
            <div>
              <p className="text-base font-black" style={{color:C.text}}>{room.name}</p>
              <p className="text-xs mt-0.5" style={{color:C.muted}}>
                {room.department}
                {ups&&<span className="ml-2 font-black" style={{color:C.accent}}>· ÚPS 24 h</span>}
                {room.isSeptic&&<span className="ml-2 font-black" style={{color:C.red}}>· SEPTICKÝ</span>}
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
              {l:'Provoz',v:ups?'24 h':'12 h',  c:ups?C.accent:C.muted},
              {l:'Fronta',v:room.queueCount,    c:room.queueCount>0?C.yellow:C.muted},
            ].map(k=>(
              <Card key={k.l} className="p-4 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{color:C.muted}}>{k.l}</p>
                <p className="text-2xl font-black leading-none" style={{color:k.c}}>{k.v}</p>
              </Card>
            ))}
          </div>

          {/* Timeline bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>Časová osa — {ups?'00:00–24:00':'07:00–19:00'}</SectionLabel>
            </div>
            <div className="flex h-7 w-full rounded-lg overflow-hidden gap-px">
              {tl.map((seg,i)=>(
                <motion.div key={i} className="h-full relative"
                  style={{background:seg.color,opacity:0.88}}
                  initial={{width:0}} animate={{width:`${seg.pct}%`}}
                  transition={{duration:0.5,delay:i*0.02,ease:'easeOut'}}
                  title={`${seg.title} — ${seg.min} min (${seg.pct.toFixed(1)}%)`}>
                  {seg.pct>=9&&(
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-black/60 pointer-events-none">
                      {Math.round(seg.pct)}%
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
            {/* Legend */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-2 mt-3">
              {tl.filter(s=>s.pct>1).map((seg,i)=>(
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{background:seg.color}}/>
                  <div>
                    <p className="text-[10px] leading-tight" style={{color:C.muted}}>{seg.title}</p>
                    <p className="text-xs font-black leading-tight" style={{color:seg.color}}>
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
              <SectionLabel>Vytížení v průběhu dne (%)</SectionLabel>
              <ResponsiveContainer width="100%" height={140}>
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
                      <span className="text-sm font-black" style={{color:s.color}}>{s.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{background:C.ghost}}>
                      <motion.div className="h-full rounded-full" style={{background:s.color,opacity:0.85}}
                        initial={{width:0}} animate={{width:`${s.pct}%`}}
                        transition={{duration:0.55,delay:i*0.06,ease:'easeOut'}}/>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Row: Hourly stacked + Weekly stacked */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="p-5">
              <SectionLabel>Hodinové vytížení vs. prodlevy (%)</SectionLabel>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={hourlyUtil} margin={{top:4,right:0,bottom:0,left:-24}} barSize={12}>
                  <XAxis dataKey="t" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                  <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                  <Tooltip {...TIP}/>
                  <Bar dataKey="util" stackId="a" fill={sc}      opacity={0.78} radius={[0,0,0,0]} name="Výkon %"/>
                  <Bar dataKey="idle" stackId="a" fill={C.ghost} opacity={0.9}  radius={[2,2,0,0]} name="Prodleva %"/>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                {[{c:sc,l:'Výkon'},{c:'rgba(255,255,255,0.15)',l:'Prodleva'}].map(x=>(
                  <div key={x.l} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-[2px]" style={{background:x.c}}/>
                    <span className="text-[10px]" style={{color:C.muted}}>{x.l}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <SectionLabel>Týdenní workflow fáze — min/den</SectionLabel>
              <ResponsiveContainer width="100%" height={150}>
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

          {/* Row: Phase bar + Radar + Pie */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="p-5">
              <SectionLabel>Délka fází ��� minuty</SectionLabel>
              <ResponsiveContainer width="100%" height={160}>
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
              <SectionLabel>Výkonnostní profil</SectionLabel>
              <ResponsiveContainer width="100%" height={170}>
                <RadarChart data={radarData} margin={{top:10,right:20,bottom:10,left:20}}>
                  <PolarGrid stroke={C.ghost}/>
                  <PolarAngleAxis dataKey="subject" tick={{fill:C.muted,fontSize:9,fontWeight:700}}/>
                  <Radar dataKey="A" stroke={sc} fill={sc} fillOpacity={0.14} strokeWidth={1.5}/>
                </RadarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-5">
              <SectionLabel>Struktura cyklu (%)</SectionLabel>
              <ResponsiveContainer width="100%" height={140}>
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
            <ResponsiveContainer width="100%" height={120}>
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
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider"
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
      </motion.div>
    </motion.div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MODULE
// ══════════════════════════════════════════════════════════════════════════════
const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms: propRooms }) => {
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
  const [dbStats, setDbStats] = useState<RoomStatistics | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Load statistics from database
  useEffect(() => {
    const loadStats = async () => {
      setIsLoadingStats(true);
      
      // Calculate date range based on period
      const now = new Date();
      let fromDate: Date;
      switch (period) {
        case 'den':
          fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'týden':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'měsíc':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'rok':
          fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }

      const stats = await fetchRoomStatistics(fromDate, now);
      if (stats) setDbStats(stats);
      setIsLoadingStats(false);
    };

    loadStats();
  }, [period]);

  // Build utilization data from real DB stats
  const utilData = useMemo(() => {
    if (!dbStats?.hourlyUtilization) {
      // Return empty data while loading
      return Array.from({ length: 12 }, (_, i) => ({ t: `${7 + i}h`, v: 0, cap: 100 }));
    }

    if (period === 'den') {
      // Hourly data (7:00 - 19:00)
      return dbStats.hourlyUtilization
        .filter(h => h.hour >= 7 && h.hour < 19)
        .map(h => ({ t: `${h.hour}h`, v: h.utilization, cap: 100 }));
    }
    
    if (period === 'týden') {
      // Weekly data from weekdayUtilization
      const dayOrder = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
      return dayOrder.map(t => ({ 
        t, 
        v: dbStats.weekdayUtilization?.[t] || 0, 
        cap: 100 
      }));
    }
    
    if (period === 'měsíc') {
      // Monthly - show last 30 days from operationsByDay
      const days = Object.entries(dbStats.operationsByDay || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-30);
      
      if (days.length === 0) {
        return Array.from({ length: 30 }, (_, i) => ({ t: `${i + 1}`, v: 0, cap: 100 }));
      }
      
      const maxOps = Math.max(...days.map(([, c]) => c), 1);
      return days.map(([date, count], i) => ({
        t: `${i + 1}`,
        v: Math.round((count / maxOps) * 100),
        cap: 100
      }));
    }
    
    // Year - aggregate by month
    const months = ['Led', 'Únr', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Září', 'Říj', 'Lis', 'Pro'];
    const monthlyOps: Record<number, number> = {};
    
    Object.entries(dbStats.operationsByDay || {}).forEach(([date, count]) => {
      const month = new Date(date).getMonth();
      monthlyOps[month] = (monthlyOps[month] || 0) + count;
    });
    
    const maxMonthOps = Math.max(...Object.values(monthlyOps), 1);
    return months.map((t, i) => ({
      t,
      v: Math.round(((monthlyOps[i] || 0) / maxMonthOps) * 100),
      cap: 100
    }));
  }, [period, dbStats]);

  const avgUtil   = dbStats?.utilizationRate ?? Math.round(utilData.reduce((s,d)=>s+d.v,0)/Math.max(1, utilData.length));
  const peakUtil  = dbStats?.peakUtilization?.value ?? Math.max(...utilData.map(d=>d.v), 0);
  const minUtil   = dbStats?.minUtilization?.value ?? Math.min(...utilData.map(d=>d.v).filter(v => v > 0), 0);
  const totalOps  = dbStats?.totalOperations ?? rooms.reduce((s,r)=>s+r.operations24h,0);
  const busyCount = rooms.filter(r=>r.status===RoomStatus.BUSY).length;
  const freeCount = rooms.filter(r=>r.status===RoomStatus.FREE).length;
  const cleanCount= rooms.filter(r=>r.status===RoomStatus.CLEANING).length;
  const maintCount= rooms.filter(r=>r.status===RoomStatus.MAINTENANCE).length;
  const totalQueue= rooms.reduce((s,r)=>s+r.queueCount,0);
  const septicCnt = rooms.filter(r=>r.isSeptic).length;
  const emergCnt  = dbStats?.emergencyCount ?? rooms.filter(r=>r.isEmergency).length;
  const upsCnt    = rooms.filter(isUPS).length;

  const deptMap = useMemo(()=>{
    const m:Record<string,number>={};
    rooms.forEach(r=>{ m[r.department]=(m[r.department]??0)+r.operations24h; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[rooms]);

  const roomBarData = rooms.map(r=>({
    name:r.name.replace('Sál č. ','S'),
    ops:r.operations24h,
    util:Math.round(buildDist(r,WORKFLOW_STEPS).find(d=>d.title==='Chirurgický výkon')?.pct??0),
    color:statusColor(r.status),
  }));

  // Generate opsTrend from real DB data or fallback to rooms data
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
    // Fallback to calculated from rooms
    return [
      {t:'T-6',v:totalOps},{t:'T-5',v:totalOps},{t:'T-4',v:totalOps},
      {t:'T-3',v:totalOps},{t:'T-2',v:totalOps},{t:'T-1',v:totalOps},{t:'Dnes',v:totalOps},
    ];
  }, [dbStats, totalOps]);

  // Status pie data
  const statusPie=[
    {name:'Obsazeno',value:busyCount, color:C.orange},
    {name:'Volno',   value:freeCount, color:C.green},
    {name:'Úklid',   value:cleanCount,color:C.accent},
    {name:'Údržba',  value:maintCount,color:C.faint},
  ].filter(s=>s.value>0);

  // Aggregate workflow utilisation across all rooms
  const workflowAgg=useMemo(()=>WORKFLOW_STEPS.map(step=>{
    const avg=Math.round(rooms.reduce((s,r)=>{
      const d=buildDist(r,WORKFLOW_STEPS).find(d=>d.title===step.title);
      return s+(d?.pct??0);
    },0)/Math.max(1,rooms.length));
    return{title:step.title,color:step.color,pct:avg};
  }),[rooms,WORKFLOW_STEPS]);

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
    
    // Fallback
    return [
      {t:'Pondělí', v:0},{t:'Úterý',  v:0},{t:'Středa',  v:0},
      {t:'Čtvrtek', v:0},{t:'Pátek',  v:0},{t:'Sobota',  v:0},{t:'Neděle', v:0},
    ];
  }, [dbStats]);

  // Scatter: ops24h vs utilPct per room
  const scatterData=rooms.map(r=>({
    ops:r.operations24h,
    util:Math.round(buildDist(r,WORKFLOW_STEPS).find(d=>d.title==='Chirurgický výkon')?.pct??0),
    queue:r.queueCount,
    name:r.name,
  }));

  // Per-room status utilisation (stacked bar, no names, index only)
  const roomStatusBar=rooms.map((r,i)=>{
    const dist=buildDist(r,WORKFLOW_STEPS);
    const base:Record<string,number|string>={name:`S${i+1}`};
    WORKFLOW_STEPS.forEach(step=>{
      base[step.title]=dist.find(d=>d.title===step.title)?.pct??0;
    });
    return base;
  });

  const TABS:{ id:Tab; label:string }[]=[
    {id:'prehled', label:'Přehled'},
    {id:'saly',    label:'Sály'},
    {id:'faze',    label:'Fáze'},
    {id:'heatmapa',label:'Heatmapa'},
  ];

  return(
    <div className="w-full">

      {/* ── Module header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2 opacity-60">
          <BarChart3 className="w-4 h-4 text-[#00D8C1]" />
          <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">OPERATINGROOM CONTROL</p>
        </div>
        <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
          STATISTIKY
        </h1>
      </div>

      {/* ── Period + Tab navigation ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-7">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{background:C.surface,border:`1px solid ${C.border}`}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className="px-4 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-all"
              style={{
                background:tab===t.id?'rgba(255,255,255,0.07)':'transparent',
                color:tab===t.id?C.text:C.muted,
              }}>
              {t.label}
            </button>
          ))}
        </div>
        {/* Period switcher */}
        <div className="flex items-center gap-1.5">
          {(['den','týden','měsíc','rok'] as Period[]).map(p=>(
            <button key={p} onClick={()=>setPeriod(p)}
              className="px-3.5 py-1.5 rounded text-xs font-black uppercase tracking-widest transition-all"
              style={{
                background:period===p?`${C.accent}18`:'transparent',
                color:period===p?C.accent:C.muted,
                border:`1px solid ${period===p?C.accent:C.border}`,
              }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        {tab==='prehled'&&(
          <motion.div key="prehled"
            initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
            transition={{duration:0.22}} className="space-y-5">

            {/* KPI strip */}
            <div className="grid grid-cols-4 lg:grid-cols-8 rounded-xl overflow-hidden"
              style={{border:`1px solid ${C.border}`}}>
              {[
                {l:'Sálů celkem',      v:rooms.length,                          c:C.text},
                {l:'Obsazeno',         v:`${busyCount} / ${rooms.length}`,       c:C.orange},
                {l:'Volno',            v:`${freeCount} / ${rooms.length}`,       c:C.green},
                {l:'Úklid + Údržba',  v:`${cleanCount+maintCount}`,             c:C.accent},
                {l:`Průměr (${period})`,v:`${avgUtil}%`,                         c:C.text},
                {l:'Peak využití',     v:`${peakUtil}%`,                         c:peakUtil>90?C.red:C.orange},
                {l:'Min využití',      v:`${minUtil}%`,                          c:C.muted},
                {l:'Výkony / 24 h',   v:totalOps,                              c:C.accent},
              ].map((k,i)=>(
                <motion.div key={i} className="flex flex-col justify-between px-4 py-4"
                  style={{background:C.surface,borderRight:i<7?`1px solid ${C.border}`:undefined}}
                  initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                  transition={{duration:0.3,delay:i*0.04}}>
                  <p className="text-[9px] font-black uppercase tracking-widest mb-2.5" style={{color:C.muted}}>{k.l}</p>
                  <p className="text-2xl font-black leading-none" style={{color:k.c}}>{k.v}</p>
                </motion.div>
              ))}
            </div>

            {/* Row 1: Main area + Status pie */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card className="lg:col-span-2 p-5">
                <SectionLabel>Procentuální vytížení — {period}</SectionLabel>
                <ResponsiveContainer width="100%" height={200}>
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
                <ResponsiveContainer width="100%" height={160}>
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
                      <span className="text-xs font-black ml-auto" style={{color:s.color}}>{s.value}</span>
                    </div>
                  ))}
                </div>
                {/* Flags */}
                {(emergCnt>0||septicCnt>0)&&(
                  <div className="mt-4 pt-3 flex flex-wrap gap-2" style={{borderTop:`1px solid ${C.border}`}}>
                    {emergCnt>0&&(
                      <span className="flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider"
                        style={{background:`${C.orange}18`,color:C.orange}}>
                        <AlertTriangle className="w-3 h-3"/>{emergCnt} Emerg.
                      </span>
                    )}
                    {septicCnt>0&&(
                      <span className="flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider"
                        style={{background:`${C.red}18`,color:C.red}}>
                        <Shield className="w-3 h-3"/>{septicCnt} Septické
                      </span>
                    )}
                    {upsCnt>0&&(
                      <span className="flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider"
                        style={{background:`${C.accent}18`,color:C.accent}}>
                        <Zap className="w-3 h-3"/>{upsCnt} ÚPS
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
                <ResponsiveContainer width="100%" height={160}>
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
                          <span className="text-xs font-black" style={{color:C.text}}>{count}</span>
                        </div>
                        <div className="h-0.5 rounded-full overflow-hidden" style={{background:C.ghost}}>
                          <motion.div className="h-full rounded-full" style={{background:color,opacity:0.8}}
                            initial={{width:0}} animate={{width:`${(count/deptMap[0][1])*100}%`}}
                            transition={{duration:0.55,delay:i*0.04,ease:'easeOut'}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
              <Card className="p-5">
                <SectionLabel>Trend výkonů — 7 dní</SectionLabel>
                <ResponsiveContainer width="100%" height={160}>
                  <ComposedChart data={opsTrend} margin={{top:4,right:4,bottom:0,left:-24}}>
                    <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3"/>
                    <XAxis dataKey="t" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                    <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                    <Tooltip {...TIP} formatter={(v:number)=>[v,'Operace']}/>
                    <Bar dataKey="v" fill={C.accent} opacity={0.2} radius={[2,2,0,0]}/>
                    <Line type="monotone" dataKey="v" stroke={C.green} strokeWidth={2}
                      dot={{fill:C.green,strokeWidth:0,r:3}}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Row 3: Scatter + Interval compare + Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card className="p-5">
                <SectionLabel>Výkony vs. využití — srovnání sálů</SectionLabel>
                <ResponsiveContainer width="100%" height={160}>
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
                <SectionLabel>Využití dle dne v týdnu (%)</SectionLabel>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={intervalCompare} margin={{top:0,right:0,bottom:0,left:-24}} barSize={16}>
                    <XAxis dataKey="t" stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false}/>
                    <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v:number)=>`${v}%`}/>
                    <Tooltip {...TIP} formatter={(v:number)=>[`${v}%`,'Využití']}/>
                    <Bar dataKey="v" radius={[2,2,0,0]}>
                      {intervalCompare.map((e,i)=>(
                        <Cell key={i} fill={e.v>=80?C.green:e.v>=60?C.accent:e.v>=40?C.yellow:C.orange} opacity={0.75}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-5">
                <SectionLabel>Fronta a kapacita</SectionLabel>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{color:C.muted}}>Celková fronta</p>
                    <p className="text-3xl font-black" style={{color:totalQueue>0?C.yellow:C.green}}>{totalQueue}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{color:C.muted}}>ÚPS sálů</p>
                    <p className="text-3xl font-black" style={{color:C.accent}}>{upsCnt}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{color:C.muted}}>Zaplněnost</p>
                    <p className="text-3xl font-black" style={{color:C.text}}>{Math.round((busyCount/Math.max(1,rooms.length))*100)}%</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {rooms.filter(r=>r.queueCount>0).slice(0,5).map(r=>(
                    <div key={r.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{background:statusColor(r.status)}}/>
                        <span className="text-xs" style={{color:C.muted}}>{r.name}</span>
                      </div>
                      <span className="text-xs font-black" style={{color:C.yellow}}>{r.queueCount} pac.</span>
                    </div>
                  ))}
                  {totalQueue===0&&<p className="text-xs" style={{color:C.faint}}>Žádná fronta</p>}
                </div>
              </Card>
            </div>

          </motion.div>
        )}

        {tab==='saly'&&(
          <motion.div key="saly"
            initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
            transition={{duration:0.22}} className="space-y-5">

            {/* Status summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {l:'Obsazeno', v:busyCount,  c:C.orange, sub:`${Math.round((busyCount/Math.max(1,rooms.length))*100)}% kapacity`},
                {l:'Volno',    v:freeCount,  c:C.green,  sub:`${Math.round((freeCount/Math.max(1,rooms.length))*100)}% kapacity`},
                {l:'Úklid',    v:cleanCount, c:C.accent, sub:'V sanitaci'},
                {l:'Údržba',   v:maintCount, c:C.faint,  sub:'Mimo provoz'},
              ].map(k=>(
                <motion.div key={k.l} initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}}
                  transition={{duration:0.2}}>
                  <Card className="p-5">
                    <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{color:C.muted}}>{k.l}</p>
                    <p className="text-4xl font-black leading-none mb-1.5" style={{color:k.c}}>{k.v}</p>
                    <p className="text-[10px]" style={{color:C.faint}}>{k.sub}</p>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Room status stacked bar */}
            <Card className="p-5">
              <SectionLabel>Procentuální využití workflow fází — jednotlivé sály</SectionLabel>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={roomStatusBar} margin={{top:4,right:0,bottom:0,left:-24}} barSize={24}>
                  <XAxis dataKey="name" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                  <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v:number)=>`${v}%`}/>
                  <Tooltip {...TIP}/>
                  {WORKFLOW_STEPS.map(step=>(
                    <Bar key={step.title} dataKey={step.title} stackId="r" fill={step.color} opacity={0.82} name={step.title}/>
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                {WORKFLOW_STEPS.map(s=>(
                  <div key={s.title} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-[2px]" style={{background:s.color}}/>
                    <span className="text-[10px]" style={{color:C.faint}}>{s.title}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Room cards grid */}
            <div>
              <SectionLabel>Sály — kliknutím zobrazíte podrobné statistiky</SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {rooms.map((r, i) => (
                  <RoomMiniCard key={r.id} r={r} index={i} onClick={() => setSelectedRoom(r)} workflowSteps={WORKFLOW_STEPS} />
                ))}
              </div>
            </div>

            {/* Utilisation per room line chart */}
            <Card className="p-5">
              <SectionLabel>Procentuální využití výkonem — porovnání sálů</SectionLabel>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={roomBarData} margin={{top:0,right:0,bottom:0,left:-24}} barSize={18}>
                  <XAxis dataKey="name" stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false}/>
                  <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v:number)=>`${v}%`}/>
                  <Tooltip {...TIP} formatter={(v:number)=>[`${v}%`,'Využití výkonem']}/>
                  <Bar dataKey="util" radius={[2,2,0,0]}>
                    {roomBarData.map((e,i)=><Cell key={i} fill={e.color} opacity={0.78}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

          </motion.div>
        )}

        {tab==='faze'&&(
          <motion.div key="faze"
            initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
            transition={{duration:0.22}} className="space-y-5">

            {/* Workflow aggregate bar */}
            <Card className="p-5">
              <SectionLabel>Průměrné procentuální zastoupení workflow fází — všechny sály</SectionLabel>
              <div className="flex h-8 w-full rounded-lg overflow-hidden gap-px mb-4">
                {workflowAgg.map((seg,i)=>(
                  <motion.div key={i} className="h-full relative"
                    style={{background:seg.color,opacity:0.85}}
                    initial={{width:0}} animate={{width:`${seg.pct}%`}}
                    transition={{duration:0.6,delay:i*0.07,ease:'easeOut'}}
                    title={`${seg.title} — ${seg.pct}%`}>
                    {seg.pct>=8&&(
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-black/65 pointer-events-none">
                        {seg.pct}%
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3">
                {workflowAgg.map((seg,i)=>(
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-[2px]" style={{background:seg.color}}/>
                        <span className="text-xs" style={{color:C.muted}}>{seg.title}</span>
                      </div>
                      <span className="text-sm font-black" style={{color:seg.color}}>{seg.pct}%</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{background:C.ghost}}>
                      <motion.div className="h-full rounded-full" style={{background:seg.color,opacity:0.8}}
                        initial={{width:0}} animate={{width:`${seg.pct}%`}}
                        transition={{duration:0.5,delay:i*0.06,ease:'easeOut'}}/>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Row: Phase durations + radar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card className="p-5">
                <SectionLabel>Průměrné trvání fází — minuty (z DB)</SectionLabel>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={WORKFLOW_STEPS.map((step,i)=>({
                    name:step.title.split(' ').slice(-1)[0],
                    min: dbStats?.averageStepDurations?.[step.title] ?? STEP_DURATIONS[i],
                    color:step.color,
                  }))} layout="vertical" margin={{top:0,right:24,bottom:0,left:0}} barSize={10}>
                    <XAxis type="number" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                    <YAxis type="category" dataKey="name" stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false} width={52}/>
                    <Tooltip {...TIP} formatter={(v:number)=>[`${v} min`,'Trvání']}/>
                    <Bar dataKey="min" radius={[0,2,2,0]}>
                      {WORKFLOW_STEPS.map((_,i)=><Cell key={i} fill={WORKFLOW_STEPS[i].color} opacity={0.82}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-5">
                <SectionLabel>Distribuce fází — % z celkového cyklu (z DB)</SectionLabel>
                <div className="space-y-3 mt-2">
                  {workflowAgg.map((seg,i)=>{
                    const realMin = dbStats?.averageStepDurations?.[seg.title] ?? STEP_DURATIONS[i];
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-[2px]" style={{background:seg.color}}/>
                            <span className="text-xs" style={{color:C.muted}}>{seg.title}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs" style={{color:C.faint}}>{realMin} min</span>
                            <span className="text-sm font-black w-9 text-right" style={{color:seg.color}}>{seg.pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{background:C.ghost}}>
                          <motion.div className="h-full rounded-full" style={{background:seg.color,opacity:0.82}}
                            initial={{width:0}} animate={{width:`${seg.pct}%`}}
                            transition={{duration:0.55,delay:i*0.06,ease:'easeOut'}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Row: Room current step distribution */}
            <Card className="p-5">
              <SectionLabel>Aktuální workflow fáze — počet sálů na každém kroku</SectionLabel>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={WORKFLOW_STEPS.map((step,i)=>({
                  name:step.title.split(' ').slice(-1)[0],
                  count:rooms.filter(r=>r.currentStepIndex===i).length,
                  color:step.color,
                }))} margin={{top:0,right:0,bottom:0,left:-24}} barSize={24}>
                  <XAxis dataKey="name" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                  <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} allowDecimals={false}/>
                  <Tooltip {...TIP} formatter={(v:number)=>[`${v} sálů`,'Počet']}/>
                  <Bar dataKey="count" radius={[3,3,0,0]}>
                    {WORKFLOW_STEPS.map((_,i)=><Cell key={i} fill={WORKFLOW_STEPS[i].color} opacity={0.8}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Phase cycle pie */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card className="p-5">
                <SectionLabel>Pie — struktura operačního cyklu</SectionLabel>
                <div className="flex items-center gap-5">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie data={workflowAgg.filter(s=>s.pct>0)} dataKey="pct" nameKey="title"
                        cx="50%" cy="50%" innerRadius={44} outerRadius={70} paddingAngle={2} strokeWidth={0}>
                        {workflowAgg.filter(s=>s.pct>0).map((_,i)=>(
                          <Cell key={i} fill={workflowAgg.filter(s=>s.pct>0)[i].color} opacity={0.85}/>
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TIP.contentStyle} formatter={(v:number,name:string)=>[`${v}%`,name]}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {workflowAgg.filter(s=>s.pct>0).map((seg,i)=>(
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-[2px]" style={{background:seg.color}}/>
                          <span className="text-xs" style={{color:C.muted}}>{seg.title.split(' ').slice(-1)[0]}</span>
                        </div>
                        <span className="text-xs font-black" style={{color:seg.color}}>{seg.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
              <Card className="p-5">
                <SectionLabel>Line — průběh fází (kumulativní trvání z DB)</SectionLabel>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={WORKFLOW_STEPS.map((step,i)=>{
                    const realDurations = WORKFLOW_STEPS.map((s, idx) => 
                      dbStats?.averageStepDurations?.[s.title] ?? STEP_DURATIONS[idx]
                    );
                    const cum = realDurations.slice(0, i + 1).reduce((s, d) => s + d, 0);
                    const min = dbStats?.averageStepDurations?.[step.title] ?? STEP_DURATIONS[i];
                    return { name: step.title.split(' ').slice(-1)[0], min, cum };
                  })} margin={{top:4,right:10,bottom:0,left:-16}}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3"/>
                    <XAxis dataKey="name" stroke={C.ghost} fontSize={9} tickLine={false} axisLine={false}/>
                    <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                    <Tooltip {...TIP} formatter={(v:number,name:string)=>[`${v} min`,name==='cum'?'Kumulativní':'Fáze']}/>
                    <Bar dataKey="min" fill={C.accent} opacity={0.25} radius={[1,1,0,0]} name="Fáze"/>
                    <Line type="monotone" dataKey="cum" stroke={C.green} strokeWidth={2}
                      dot={{fill:C.green,strokeWidth:0,r:3}} name="Kumulativní"/>
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>

          </motion.div>
        )}

        {tab==='heatmapa'&&(
          <motion.div key="heatmapa"
            initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
            transition={{duration:0.22}} className="space-y-5">

            {/* Peak cards - real data from DB */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  l:'Nejvyšší vytížení',
                  v:`${dbStats?.peakUtilization?.value ?? 0}%`,
                  sub: dbStats?.peakUtilization ? `${dbStats.peakUtilization.day} ${dbStats.peakUtilization.hour}:00` : 'Žádná data',
                  c:C.red
                },
                {l:'Průměrné vytížení',     v:`${avgUtil}%`, sub:'Pracovní dny', c:C.accent},
                {
                  l:'Nejnižší vytížení',
                  v:`${dbStats?.minUtilization?.value ?? 0}%`,
                  sub: dbStats?.minUtilization ? `${dbStats.minUtilization.day} ${dbStats.minUtilization.hour}:00` : 'Žádná data',
                  c:C.green
                },
                {l:'Operační hodiny / den', v:'12 h', sub:'07:00–19:00',        c:C.muted},
              ].map(k=>(
                <Card key={k.l} className="p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{color:C.muted}}>{k.l}</p>
                  <p className="text-3xl font-black leading-none mb-1" style={{color:k.c}}>{k.v}</p>
                  <p className="text-[10px]" style={{color:C.faint}}>{k.sub}</p>
                </Card>
              ))}
            </div>

            {/* Heatmap grid - real data from DB */}
            <Card className="p-5">
              <SectionLabel>Heatmapa vytížení — den × hodina (%)</SectionLabel>
              {dbStats?.heatmapData && dbStats.heatmapData.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="inline-flex flex-col gap-1" style={{minWidth:560}}>
                    <div className="flex gap-1 pl-8">
                      {Array.from({length:24},(_,h)=>(
                        <div key={h} className="w-5 text-center text-[9px] font-bold shrink-0" style={{color:C.faint}}>{h}</div>
                      ))}
                    </div>
                    {DAYS.map((day,di)=>(
                      <div key={di} className="flex items-center gap-1">
                        <span className="w-7 text-xs font-black shrink-0 text-right pr-1" style={{color:C.muted}}>{day}</span>
                        {(dbStats.heatmapData[di] || Array(24).fill(0)).map((v,hi)=>(
                          <motion.div key={hi} className="w-5 h-5 rounded-[3px] shrink-0"
                            style={{background:heatColor(v)}}
                            initial={{opacity:0,scale:0.5}}
                            animate={{opacity:1,scale:1}}
                            transition={{duration:0.2,delay:(di*24+hi)*0.003}}
                            title={`${day} ${hi}:00 — ${v}%`}/>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-sm" style={{color:C.muted}}>
                  {isLoadingStats ? 'Načítání dat...' : 'Žádná data za vybrané období'}
                </div>
              )}
              <div className="flex items-center gap-4 mt-4">
                <span className="text-[10px] font-black uppercase tracking-wider" style={{color:C.muted}}>Legenda</span>
                {[
                  {c:'rgba(30,41,59,0.45)',l:'< 25%'},
                  {c:'rgba(16,185,129,0.62)',l:'25–50%'},
                  {c:'rgba(251,191,36,0.68)',l:'50–70%'},
                  {c:'rgba(249,115,22,0.78)',l:'70–90%'},
                  {c:'rgba(255,59,48,0.88)', l:'> 90%'},
                ].map(l=>(
                  <div key={l.l} className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-[2px]" style={{background:l.c}}/>
                    <span className="text-xs" style={{color:C.muted}}>{l.l}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Hourly avg line across week - real data from DB */}
            <Card className="p-5">
              <SectionLabel>Průměrné hodinové vytížení — pracovní týden (%)</SectionLabel>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart
                  data={Array.from({length:24},(_,h)=>{
                    const heatmap = dbStats?.heatmapData || [];
                    // Days 0-4 are Mon-Fri, 5-6 are Sat-Sun
                    const pracDays = heatmap.slice(0,5);
                    const vikendDays = heatmap.slice(5);
                    return {
                      h:`${h}`,
                      prac: pracDays.length > 0 ? Math.round(pracDays.reduce((s,d)=>s+(d[h]||0),0)/Math.max(1,pracDays.length)) : 0,
                      vikend: vikendDays.length > 0 ? Math.round(vikendDays.reduce((s,d)=>s+(d[h]||0),0)/Math.max(1,vikendDays.length)) : 0,
                    };
                  })}
                  margin={{top:4,right:0,bottom:0,left:-24}}>
                  <defs>
                    <linearGradient id="hg1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.accent} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={C.accent} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="hg2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.muted} stopOpacity={0.12}/>
                      <stop offset="95%" stopColor={C.muted} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3"/>
                  <XAxis dataKey="h" stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false}/>
                  <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} domain={[0,100]} tickFormatter={(v:number)=>`${v}%`}/>
                  <Tooltip {...TIP} formatter={(v:number,name:string)=>[`${v}%`,name==='prac'?'Pracovní dny':'Víkend']}/>
                  <Area type="monotone" dataKey="prac"   stroke={C.accent} fill="url(#hg1)" strokeWidth={1.5} dot={false} name="prac"/>
                  <Area type="monotone" dataKey="vikend" stroke={C.muted}  fill="url(#hg2)" strokeWidth={1}   dot={false} name="vikend"/>
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex gap-5 mt-2">
                {[{c:C.accent,l:'Pracovní dny'},{c:C.muted,l:'Víkend'}].map(x=>(
                  <div key={x.l} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-1 rounded-full" style={{background:x.c}}/>
                    <span className="text-[10px]" style={{color:C.muted}}>{x.l}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Daily peak bar - real data from DB */}
            <Card className="p-5">
              <SectionLabel>Denní průměrné vytížení dle dne v týdnu (%)</SectionLabel>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart
                  data={DAYS.map((day,di)=>{
                    const heatmap = dbStats?.heatmapData || [];
                    const dayData = heatmap[di] || Array(24).fill(0);
                    return {
                      day,
                      avg: Math.round(dayData.reduce((s,v)=>s+v,0)/24),
                      peak: Math.max(...dayData, 0),
                    };
                  })}
                  margin={{top:4,right:0,bottom:0,left:-24}} barSize={20}>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3"/>
                  <XAxis dataKey="day" stroke={C.ghost} fontSize={11} tickLine={false} axisLine={false}/>
                  <YAxis stroke={C.ghost} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v:number)=>`${v}%`}/>
                  <Tooltip {...TIP} formatter={(v:number,name:string)=>[`${v}%`,name==='avg'?'Průměr':'Peak']}/>
                  <Bar dataKey="avg"  fill={C.accent} opacity={0.5}  radius={[2,2,0,0]} name="avg"/>
                  <Bar dataKey="peak" fill={C.orange} opacity={0.65} radius={[2,2,0,0]} name="peak"/>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-5 mt-2">
                {[{c:C.accent,l:'Průměrné využití'},{c:C.orange,l:'Peak využití'}].map(x=>(
                  <div key={x.l} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-[2px]" style={{background:x.c}}/>
                    <span className="text-[10px]" style={{color:C.muted}}>{x.l}</span>
                  </div>
                ))}
              </div>
            </Card>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Room detail panel ── */}
      <AnimatePresence>
        {selectedRoom&&(
          <RoomDetailPanel room={selectedRoom} onClose={()=>setSelectedRoom(null)} workflowSteps={WORKFLOW_STEPS} dbStats={dbStats}/>
        )}
      </AnimatePresence>

    </div>
  );
};

export default memo(StatisticsModule);
