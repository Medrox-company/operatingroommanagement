import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS } from '../constants';
import { Clock, CalendarDays, Lock, AlertTriangle, Stethoscope, Activity, Users } from 'lucide-react';

interface TimelineModuleProps {
  rooms: OperatingRoom[];
}

/* ─── Layout ─── */
const ROOM_LABEL_W = 200;
const TIME_MARKERS = [7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3,4,5,6,7];
const HOURS = 24;
const SHIFT_END_H = 12; // 12 hours from 7:00 = 19:00

const minFrom7 = (d: Date) => {
  const h = d.getHours(), m = d.getMinutes();
  return h >= 7 ? (h - 7) * 60 + m : (h + 17) * 60 + m;
};
const pct = (d: Date) => (minFrom7(d) / (HOURS * 60)) * 100;

const hLabel = (h: number) => `${h < 10 ? '0' : ''}${h}:00`;

/* ─── Color system ─── */
const PAL: Record<number, { bar: string; barFill: string; border: string; text: string }> = {
  0: { bar:'rgba(167,139,250,0.12)', barFill:'rgba(167,139,250,0.30)', border:'rgba(167,139,250,0.28)', text:'#A78BFA' },
  1: { bar:'rgba(45,212,191,0.12)',  barFill:'rgba(45,212,191,0.30)',  border:'rgba(45,212,191,0.28)',  text:'#2DD4BF' },
  2: { bar:'rgba(96,165,250,0.12)',  barFill:'rgba(96,165,250,0.30)',  border:'rgba(96,165,250,0.28)',  text:'#60A5FA' },
  3: { bar:'rgba(74,222,128,0.12)',  barFill:'rgba(74,222,128,0.30)',  border:'rgba(74,222,128,0.28)',  text:'#4ADE80' },
  4: { bar:'rgba(129,140,248,0.12)', barFill:'rgba(129,140,248,0.30)', border:'rgba(129,140,248,0.28)', text:'#818CF8' },
  5: { bar:'rgba(91,101,220,0.12)',  barFill:'rgba(91,101,220,0.30)',  border:'rgba(91,101,220,0.28)',  text:'#5B65DC' },
  6: { bar:'rgba(255,255,255,0.02)', barFill:'rgba(255,255,255,0.03)', border:'rgba(255,255,255,0.04)', text:'rgba(255,255,255,0.25)' },
};

const TimelineModule: React.FC<TimelineModuleProps> = ({ rooms }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 10_000); return () => clearInterval(t); }, []);

  const nowPct = pct(now);
  const timeFull = now.toLocaleTimeString('cs-CZ', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const timeShort = now.toLocaleTimeString('cs-CZ', { hour:'2-digit', minute:'2-digit' });

  const stats = useMemo(() => {
    const ops = rooms.filter(r => r.currentStepIndex >= 2 && r.currentStepIndex <= 3 && !r.isEmergency).length;
    const clean = rooms.filter(r => r.currentStepIndex === 5 && !r.isEmergency && !r.isLocked).length;
    const free = rooms.filter(r => r.currentStepIndex >= 6 && !r.isEmergency && !r.isLocked).length;
    const done = rooms.reduce((a, r) => r.currentStepIndex >= 6 ? a + r.operations24h : a, 0);
    const emg = rooms.filter(r => r.isEmergency).length;
    const docs = rooms.filter(r => r.currentStepIndex >= 1 && r.currentStepIndex <= 4 && !r.isEmergency).length;
    const nurses = rooms.filter(r => r.currentStepIndex >= 0 && r.currentStepIndex <= 5 && !r.isEmergency).length;
    return { ops, clean, free, done, emg, docs, nurses };
  }, [rooms]);

  const sorted = useMemo(() => [...rooms].sort((a, b) => {
    if (a.isEmergency && !b.isEmergency) return -1;
    if (!a.isEmergency && b.isEmergency) return 1;
    if (a.isLocked && !b.isLocked) return -1;
    if (!a.isLocked && b.isLocked) return 1;
    const aA = a.currentStepIndex < 6, bA = b.currentStepIndex < 6;
    if (aA && !bA) return -1;
    if (!aA && bA) return 1;
    return 0;
  }), [rooms]);

  const shiftEndPct = (SHIFT_END_H * 60 / (HOURS * 60)) * 100;

  return (
    <div className="w-full h-full text-white overflow-hidden flex flex-col relative">

      {/* ═══════ TOP STATS BAR ═══════ */}
      <div className="relative z-10 flex items-center gap-1 px-3 md:pl-28 md:pr-4 pt-2.5 pb-1 flex-shrink-0 flex-wrap">
        {[
          { v: stats.ops,   l: 'OPERACE',    c: '#4ADE80' },
          { v: stats.clean, l: 'UKLID',      c: '#FACC15' },
          { v: stats.free,  l: 'VOLNE',       c: '#00D8C1', accent: true },
          { v: stats.done,  l: 'DOKONCENO',  c: '#818CF8' },
        ].map(s => (
          <div key={s.l} className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider ${s.accent ? 'bg-[#00D8C1]/8 border border-[#00D8C1]/15' : 'bg-white/[0.02] border border-white/[0.05]'}`}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.c }} />
            <span className="font-mono font-black text-[10px]" style={{ color: s.c }}>{s.v}</span>
            <span className="text-white/30 tracking-widest text-[7px]">{s.l}</span>
          </div>
        ))}

        <div className="w-px h-4 bg-white/[0.05] mx-0.5" />

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.02] border border-white/[0.05] text-[8px]">
          <Stethoscope className="w-2.5 h-2.5 text-blue-400/60" />
          <span className="font-mono font-black text-[10px] text-blue-400">{stats.docs}</span>
          <span className="text-white/30 tracking-widest text-[7px]">LEKARI PRACUJI</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.02] border border-white/[0.05] text-[8px]">
          <Users className="w-2.5 h-2.5 text-pink-400/60" />
          <span className="font-mono font-black text-[10px] text-pink-400">{stats.nurses}</span>
          <span className="text-white/30 tracking-widest text-[7px]">SESTRY VOLNE</span>
        </div>

        <div className="w-px h-4 bg-white/[0.05] mx-0.5" />

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/8 border border-red-500/15 text-[8px]">
          <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
          <span className="font-mono font-black text-[10px] text-red-400">{stats.emg}</span>
          <span className="text-red-400/40 tracking-widest text-[7px]">EMERGENCY</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white/[0.02] border border-white/[0.05] rounded-full">
          <CalendarDays className="w-3 h-3 text-white/20" />
          <span className="text-[8px] font-bold text-white/30 uppercase tracking-wider">
            {now.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.03] border border-white/[0.06] rounded-full">
          <Clock className="w-3 h-3 text-[#00D8C1]" />
          <span className="text-[11px] font-mono font-black tracking-widest">{timeFull}</span>
        </div>
      </div>

      {/* ═══════ MAIN PANEL ═══════ */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-3 md:pl-28 md:pr-4 pb-1 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-black/20 backdrop-blur-sm">

          {/* ─── TIME AXIS HEADER ─── */}
          <div className="flex flex-shrink-0 h-8 border-b border-white/[0.08]" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)' }}>
            <div className="flex-shrink-0 flex items-center gap-2 px-3 border-r border-white/[0.08]" style={{ width: ROOM_LABEL_W }}>
              <Stethoscope className="w-3 h-3 text-[#00D8C1]/30" />
              <span className="text-[7px] font-black tracking-[0.2em] uppercase text-white/20">OPERACNI SALY</span>
            </div>
            <div className="flex-1 relative">
              {TIME_MARKERS.map((h, i) => {
                const isLast = i === TIME_MARKERS.length - 1;
                const w = 100 / HOURS;
                const l = i * w;
                const isWork = h >= 7 && h < 19;

                const isCurr = !isLast && (() => {
                  const hm = h >= 7 ? (h-7)*60 : (h+17)*60;
                  const nh = TIME_MARKERS[i+1];
                  const nm = nh >= 7 ? (nh-7)*60 : (nh+17)*60;
                  const n = minFrom7(now);
                  return n >= hm && n < nm;
                })();

                return (
                  <div key={`h-${h}-${i}`} className="absolute top-0 h-full flex items-center" style={{ left: `${l}%`, width: isLast ? 0 : `${w}%` }}>
                    <div className={`w-px h-full ${isWork ? 'bg-white/[0.07]' : 'bg-white/[0.03]'}`} />
                    {!isLast && (
                      <div className="absolute w-px h-2 bottom-0 bg-white/[0.04]" style={{ left: '50%' }} />
                    )}
                    {!isLast && (
                      isCurr ? (
                        <div className="ml-0.5 px-1.5 py-[1px] rounded bg-[#00D8C1] shadow-[0_0_10px_rgba(0,216,193,0.5)]">
                          <span className="text-[7px] font-mono font-black text-black tracking-wider">{timeShort}</span>
                        </div>
                      ) : (
                        <span className={`ml-0.5 text-[7px] font-mono ${isWork ? 'text-white/25' : 'text-white/12'}`}>{hLabel(h)}</span>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── ROWS ─── */}
          <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">

            {/* NOW LINE */}
            <AnimatePresence>
              {nowPct >= 0 && nowPct <= 100 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute top-0 bottom-0 z-40 pointer-events-none"
                  style={{ left: `calc(${ROOM_LABEL_W}px + (100% - ${ROOM_LABEL_W}px) * ${nowPct / 100})` }}
                >
                  <div className="absolute -left-6 top-0 bottom-0 w-12 bg-[#00D8C1] opacity-[0.03] blur-xl" />
                  <div className="absolute -left-px top-0 bottom-0 w-[2px]" style={{ background: 'linear-gradient(to bottom, #00D8C1, #00D8C1aa 40%, #00D8C155 80%, #00D8C122)' }} />
                  <div className="absolute -left-[3px] -top-[1px] w-2 h-2 rounded-full bg-[#00D8C1] shadow-[0_0_8px_#00D8C1,0_0_16px_rgba(0,216,193,0.3)]" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* SHIFT END LINE (19:00) */}
            <div
              className="absolute top-0 bottom-0 z-20 pointer-events-none"
              style={{ left: `calc(${ROOM_LABEL_W}px + (100% - ${ROOM_LABEL_W}px) * ${shiftEndPct / 100})` }}
            >
              <div className="absolute -left-px top-0 bottom-0 w-[1px] opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #FB923C 0px, #FB923C 3px, transparent 3px, transparent 7px)' }} />
            </div>

            {/* ─── ROOM ROWS ─── */}
            {sorted.map((room, ri) => {
              const si = Math.min(room.currentStepIndex, WORKFLOW_STEPS.length - 1);
              const step = WORKFLOW_STEPS[si];
              const active = si < 6;
              const free = si >= 6;
              const p = PAL[si] || PAL[6];

              const sp = room.currentProcedure?.startTime?.split(':');
              const sd = new Date();
              if (sp?.length === 2) sd.setHours(+sp[0], +sp[1], 0, 0);
              const bL = pct(sd);
              let bR: number;
              if (room.estimatedEndTime) bR = pct(new Date(room.estimatedEndTime));
              else if (room.currentProcedure?.estimatedDuration) bR = pct(new Date(sd.getTime() + room.currentProcedure.estimatedDuration * 60000));
              else bR = bL + 4;
              const bW = Math.max(1.5, bR - bL);
              const prog = Math.max(0, Math.min(100, ((nowPct - bL) / bW) * 100));

              /* ── EMERGENCY ── */
              if (room.isEmergency) return (
                <div key={room.id} className="flex items-stretch flex-1 min-h-0 border-b border-red-500/10">
                  <div className="flex-shrink-0 flex items-center gap-2 px-3 border-r border-red-500/10" style={{ width: ROOM_LABEL_W, background: 'linear-gradient(135deg, rgba(255,59,48,0.15) 0%, rgba(255,59,48,0.04) 100%)' }}>
                    <div className="relative flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                        <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
                      </div>
                      <motion.div className="absolute inset-[-2px] rounded-full border border-red-500/40" animate={{ scale:[1,1.5,1], opacity:[0.5,0,0.5] }} transition={{ duration:1.2, repeat:Infinity }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black tracking-wider uppercase text-red-400 leading-tight">EMERGENCY</p>
                      <p className="text-[7px] font-medium text-red-400/35 truncate">{room.name}</p>
                    </div>
                  </div>
                  <div className="relative flex-1 overflow-hidden">
                    {TIME_MARKERS.slice(0,-1).map((_,i) => <div key={i} className="absolute top-0 bottom-0 w-px bg-red-500/[0.03]" style={{ left:`${(i/HOURS)*100}%` }} />)}
                    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="absolute inset-y-[2px] left-0 right-0 rounded-md flex items-center justify-center overflow-hidden" style={{ background:'linear-gradient(90deg, rgba(255,59,48,0.20) 0%, rgba(255,59,48,0.10) 30%, rgba(255,59,48,0.10) 70%, rgba(255,59,48,0.20) 100%)', border:'1px solid rgba(255,59,48,0.18)' }}>
                      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage:'repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 8px), repeating-linear-gradient(-45deg, white 0px, white 1px, transparent 1px, transparent 8px)' }} />
                      <span className="relative text-[12px] font-black tracking-[0.5em] text-white/50 uppercase select-none">E M E R G E N C Y</span>
                    </motion.div>
                  </div>
                </div>
              );

              /* ── LOCKED ── */
              if (room.isLocked) return (
                <div key={room.id} className="flex items-stretch flex-1 min-h-0 border-b border-amber-500/[0.06]">
                  <div className="flex-shrink-0 flex items-center gap-2 px-3 border-r border-amber-500/10" style={{ width: ROOM_LABEL_W, background:'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(251,191,36,0.02) 100%)' }}>
                    <div className="w-6 h-6 rounded-full bg-amber-500/12 flex items-center justify-center border border-amber-500/20">
                      <Lock className="w-2.5 h-2.5 text-amber-400/70" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black tracking-wider uppercase text-amber-400 leading-tight">UZAMCENO</p>
                      <p className="text-[7px] font-medium text-amber-400/35 truncate">{room.name}</p>
                    </div>
                  </div>
                  <div className="relative flex-1 overflow-hidden">
                    {TIME_MARKERS.slice(0,-1).map((_,i) => <div key={i} className="absolute top-0 bottom-0 w-px bg-amber-500/[0.02]" style={{ left:`${(i/HOURS)*100}%` }} />)}
                    <div className="absolute inset-y-[2px] left-0 right-0 rounded-md flex items-center justify-center gap-2 overflow-hidden" style={{ background:'linear-gradient(90deg, rgba(251,191,36,0.06) 0%, rgba(251,191,36,0.03) 50%, rgba(251,191,36,0.06) 100%)', border:'1px solid rgba(251,191,36,0.08)' }}>
                      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage:'repeating-linear-gradient(90deg, rgba(251,191,36,1) 0px, rgba(251,191,36,1) 1px, transparent 1px, transparent 12px)' }} />
                      <Lock className="w-3 h-3 text-amber-400/25 relative" />
                      <span className="text-[10px] font-black tracking-[0.4em] text-amber-400/30 uppercase select-none relative">UZAMCENO</span>
                      <Lock className="w-3 h-3 text-amber-400/25 relative" />
                    </div>
                  </div>
                </div>
              );

              /* ── NORMAL / FREE ── */
              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity:0, y:2 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ delay: ri*0.012, duration:0.2 }}
                  className={`flex items-stretch flex-1 min-h-0 border-b border-white/[0.03] group transition-colors duration-150 ${active ? 'hover:bg-white/[0.015]' : ''}`}
                >
                  {/* Label */}
                  <div className="flex-shrink-0 flex items-center gap-2 px-3 border-r border-white/[0.05] transition-colors" style={{ width: ROOM_LABEL_W }}>
                    <div className="relative flex-shrink-0">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center border transition-all" style={{ backgroundColor: active ? `${p.text}10` : 'rgba(255,255,255,0.02)', borderColor: active ? `${p.text}25` : 'rgba(255,255,255,0.05)' }}>
                        {active ? <Activity className="w-2.5 h-2.5" style={{ color: p.text }} /> : <div className="w-1.5 h-1.5 rounded-full bg-white/8" />}
                      </div>
                      {active && (
                        <motion.div className="absolute inset-[-1px] rounded-full border" style={{ borderColor:`${p.text}30` }} animate={{ scale:[1,1.4,1], opacity:[0.3,0,0.3] }} transition={{ duration:2.5, repeat:Infinity }} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[10px] font-bold tracking-tight uppercase truncate leading-tight ${active ? 'text-white/80' : 'text-white/35'}`}>{room.name}</p>
                      {free ? (
                        <p className="text-[7px] text-white/15 flex items-center gap-0.5"><span className="inline-block w-1 h-1 rounded-full bg-white/10" /> Volny</p>
                      ) : (
                        <p className="text-[7px] truncate" style={{ color:`${p.text}50` }}>{room.department}</p>
                      )}
                    </div>
                    {active && (
                      <svg className="w-2.5 h-2.5 flex-shrink-0 text-white/8 group-hover:text-white/15 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="relative flex-1 overflow-hidden">
                    {/* Grid */}
                    {TIME_MARKERS.slice(0,-1).map((h,i) => (
                      <div key={i} className={`absolute top-0 bottom-0 w-px ${h >= 7 && h < 19 ? 'bg-white/[0.025]' : 'bg-white/[0.012]'}`} style={{ left:`${(i/HOURS)*100}%` }} />
                    ))}
                    {/* Night zone */}
                    <div className="absolute top-0 bottom-0 bg-[#060d18]/25 pointer-events-none" style={{ left:`${(12/HOURS)*100}%`, right:'0' }} />

                    {/* Procedure block */}
                    {active && (
                      <motion.div
                        initial={{ opacity:0, scaleX:0.9 }}
                        animate={{ opacity:1, scaleX:1 }}
                        transition={{ duration:0.5, delay: ri*0.02, ease:[0.22,1,0.36,1] }}
                        className="absolute top-[3px] bottom-[3px] rounded-md overflow-hidden cursor-default"
                        style={{ left:`${Math.max(0,bL)}%`, width:`${bW}%`, transformOrigin:'left center' }}
                      >
                        {/* Base */}
                        <div className="absolute inset-0 rounded-md" style={{ backgroundColor: p.bar, border:`1px solid ${p.border}` }} />
                        {/* Progress fill */}
                        <motion.div
                          className="absolute top-0 bottom-0 left-0 rounded-md"
                          initial={{ width:0 }}
                          animate={{ width:`${prog}%` }}
                          transition={{ duration:1, ease:'easeOut' }}
                          style={{ background:`linear-gradient(90deg, ${p.barFill}, ${p.bar})` }}
                        />
                        {/* Subtle diagonal stripes */}
                        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage:`repeating-linear-gradient(115deg, transparent, transparent 3px, ${p.text} 3px, ${p.text} 4px)` }} />
                        {/* Left accent */}
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-md" style={{ backgroundColor: p.text }} />
                        {/* Content */}
                        <div className="relative flex items-center h-full px-2 gap-1.5 z-10 min-w-0">
                          <span className="text-[7px] font-bold uppercase tracking-wide truncate flex-shrink-0" style={{ color: p.text }}>{step.title}</span>
                          {room.currentPatient && bW > 5 && (
                            <>
                              <div className="w-px h-2.5 flex-shrink-0" style={{ backgroundColor:`${p.text}15` }} />
                              <span className="text-[7px] text-white/25 truncate">{room.currentPatient.name}</span>
                            </>
                          )}
                          {bW > 6 && (
                            <span className="text-[6px] font-mono text-white/15 ml-auto flex-shrink-0">
                              {room.currentProcedure?.startTime}{' - '}
                              {room.estimatedEndTime
                                ? new Date(room.estimatedEndTime).toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'})
                                : room.currentProcedure?.estimatedDuration
                                  ? new Date(sd.getTime() + room.currentProcedure.estimatedDuration*60000).toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'})
                                  : ''
                              }
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Ghost block for free rooms */}
                    {free && room.currentProcedure && (
                      <div className="absolute top-[3px] bottom-[3px] rounded-md" style={{ left:`${Math.max(0,bL)}%`, width:`${bW}%`, backgroundColor:'rgba(255,255,255,0.012)', border:'1px dashed rgba(255,255,255,0.03)' }} />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════ BOTTOM LEGEND ═══════ */}
      <div className="relative z-10 flex items-center justify-between px-3 md:pl-28 md:pr-4 py-1 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-white/6 border border-white/8" />
            <span className="text-[7px] text-white/20 uppercase tracking-widest">Dokoncene</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-[2px] rounded-full bg-[#00D8C1]" />
            <span className="text-[7px] text-white/20 uppercase tracking-widest">Zacatek smeny</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-[1px]" style={{ backgroundImage:'repeating-linear-gradient(90deg, #FB923C 0px, #FB923C 2px, transparent 2px, transparent 5px)' }} />
            <span className="text-[7px] text-white/20 uppercase tracking-widest">Konec smeny</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-pink-500/15 border border-pink-500/20" />
            <span className="text-[7px] text-white/20 uppercase tracking-widest">Presah</span>
          </div>
        </div>
        <span className="text-[7px] text-white/12 tracking-wide">Kliknete na sal pro zobrazeni detailu</span>
      </div>
    </div>
  );
};

export default TimelineModule;
