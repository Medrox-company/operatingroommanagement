import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { OperatingRoom, RoomStatus } from '../types';
import { MOCK_ROOMS } from '../constants';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer,
  XAxis, YAxis, Tooltip,
} from 'recharts';

interface StatisticsModuleProps {
  rooms?: OperatingRoom[];
}

type Period = 'den' | 'týden' | 'měsíc';

const accent = '#06B6D4';

const weekData = [
  { t: 'Po', v: 92 }, { t: 'Út', v: 88 }, { t: 'St', v: 95 },
  { t: 'Čt', v: 87 }, { t: 'Pá', v: 79 }, { t: 'So', v: 45 }, { t: 'Ne', v: 30 },
];
const dayData = Array.from({ length: 12 }, (_, i) => ({
  t: `${(i + 7)}:00`, v: Math.floor(60 + Math.random() * 35),
}));
const monthData = Array.from({ length: 30 }, (_, i) => ({
  t: `${i + 1}`, v: Math.floor(70 + Math.random() * 28),
}));

const phaseRows = [
  { label: 'Příjezd → Anestezie',      min: 12, pct: 5.5,  trend: -1  },
  { label: 'Anestezie → Výkon',         min: 8,  pct: 3.7,  trend: -0.5},
  { label: 'Chirurgický výkon',         min: 95, pct: 43.8, trend: +2  },
  { label: 'Výkon → Konec anestezie',   min: 15, pct: 6.9,  trend: -2  },
  { label: 'Anestezie → Úklid',         min: 10, pct: 4.6,  trend: +0  },
  { label: 'Úklid sálu',               min: 20, pct: 9.2,  trend: +1  },
  { label: 'Pauza mezi operacemi',      min: 47, pct: 21.6, trend: +5  },
  { label: 'Administrativa',            min: 10, pct: 4.7,  trend: +0  },
];

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

function heatColor(v: number) {
  if (v >= 90) return 'rgba(255,59,48,0.85)';
  if (v >= 70) return 'rgba(249,115,22,0.75)';
  if (v >= 50) return 'rgba(251,191,36,0.65)';
  if (v >= 25) return 'rgba(16,185,129,0.60)';
  return 'rgba(30,41,59,0.6)';
}

function TrendIcon({ v }: { v: number }) {
  if (v > 0) return <TrendingUp className="w-3 h-3" style={{ color: '#F97316' }} />;
  if (v < 0) return <TrendingDown className="w-3 h-3" style={{ color: '#10B981' }} />;
  return <Minus className="w-3 h-3 opacity-30" />;
}

const TooltipStyle = {
  contentStyle: {
    background: 'rgba(2,8,23,0.96)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    fontSize: 11,
  },
  labelStyle: { color: 'rgba(255,255,255,0.5)' },
  itemStyle: { color: accent },
};

const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms = MOCK_ROOMS }) => {
  const [period, setPeriod] = useState<Period>('týden');

  const utilData = period === 'den' ? dayData : period === 'týden' ? weekData : monthData;

  const totalOps = useMemo(() => rooms.reduce((s, r) => s + r.operations24h, 0), [rooms]);
  const busyRooms = useMemo(() => rooms.filter(r => r.status === RoomStatus.BUSY).length, [rooms]);
  const freeRooms = useMemo(() => rooms.filter(r => r.status === RoomStatus.FREE).length, [rooms]);
  const avgOps = useMemo(() => (totalOps / rooms.length).toFixed(1), [totalOps, rooms]);
  const avgUtil = useMemo(() => Math.round(utilData.reduce((s, d) => s + d.v, 0) / utilData.length), [utilData]);

  const roomBarData = useMemo(() =>
    rooms.map(r => ({ name: r.name.replace('Sál č. ', 'S'), ops: r.operations24h })),
    [rooms]
  );

  const deptMap = useMemo(() => {
    const m: Record<string, number> = {};
    rooms.forEach(r => { m[r.department] = (m[r.department] || 0) + r.operations24h; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [rooms]);

  const statusPct = useMemo(() => ({
    busy: Math.round((busyRooms / rooms.length) * 100),
    free: Math.round((freeRooms / rooms.length) * 100),
    other: Math.round(((rooms.length - busyRooms - freeRooms) / rooms.length) * 100),
  }), [busyRooms, freeRooms, rooms.length]);

  return (
    <div className="w-full min-h-screen flex flex-col text-white">

      {/* ── Header – stejná pozice a velikost jako SettingsPage ── */}
      <header className="flex flex-col items-center lg:items-start justify-between gap-6 mb-16 flex-shrink-0">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <BarChart3 className="w-4 h-4" style={{ color: accent }} />
            <p className="text-[10px] font-black tracking-[0.4em] uppercase" style={{ color: accent }}>
              ANALÝZY A METRIKY
            </p>
          </div>
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
            STATISTIKY <span className="text-white/20">SYSTÉMU</span>
          </h1>
        </div>
      </header>

      {/* ── Period switcher ── */}
      <div className="flex items-center gap-1 mb-10">
        {(['den','týden','měsíc'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded transition-all"
            style={{
              background: period === p ? `${accent}18` : 'transparent',
              color: period === p ? accent : 'rgba(255,255,255,0.3)',
              border: `1px solid ${period === p ? accent : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px mb-10"
           style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
        {[
          { label: 'Sálů celkem',       value: rooms.length },
          { label: 'Aktivních',         value: busyRooms,   hi: busyRooms > 0 },
          { label: 'Volných',           value: freeRooms },
          { label: 'Operací / 24 h',    value: totalOps,    hi: true },
          { label: 'Průměr / sál',      value: `${avgOps}` },
          { label: `Využití (${period})`, value: `${avgUtil}%` },
        ].map((k, i) => (
          <div key={i}
               className="flex flex-col justify-between px-4 py-4"
               style={{ background: 'rgba(255,255,255,0.02)', borderRight: i < 5 ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">{k.label}</p>
            <p className="text-3xl font-black leading-none" style={{ color: k.hi ? accent : 'white' }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Utilization area chart – 2 cols */}
        <motion.section
          className="lg:col-span-2 rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        >
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-4">Vytížení v čase — {period}</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={utilData} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
              <defs>
                <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={accent} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip {...TooltipStyle} formatter={(v: number) => [`${v}%`, 'Využití']} />
              <Area type="monotone" dataKey="v" stroke={accent} fill="url(#ug)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.section>

        {/* Status breakdown */}
        <motion.section
          className="rounded-xl p-5 flex flex-col"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}
        >
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-6">Stav sálů</p>
          <div className="flex-1 flex flex-col justify-center gap-5">
            {[
              { label: 'Obsazeno', pct: statusPct.busy,  color: '#F97316' },
              { label: 'Volno',    pct: statusPct.free,  color: '#10B981' },
              { label: 'Ostatní', pct: statusPct.other, color: 'rgba(255,255,255,0.2)' },
            ].map(s => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/50">{s.label}</span>
                  <span className="text-sm font-black" style={{ color: s.color }}>{s.pct}%</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background: s.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${s.pct}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-3">Fronta / sál</p>
            <div className="space-y-1">
              {rooms.filter(r => r.queueCount > 0).slice(0, 4).map(r => (
                <div key={r.id} className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40">{r.name}</span>
                  <span className="text-[10px] font-black text-white/70">{r.queueCount}</span>
                </div>
              ))}
              {rooms.filter(r => r.queueCount > 0).length === 0 && (
                <p className="text-[10px] text-white/25">Žádná fronta</p>
              )}
            </div>
          </div>
        </motion.section>
      </div>

      {/* ── Row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Ops per room bar */}
        <motion.section
          className="rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }}
        >
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-4">Operace / sál (24 h)</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={roomBarData} margin={{ top: 0, right: 0, bottom: 0, left: -24 }} barSize={10}>
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.15)" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip {...TooltipStyle} formatter={(v: number) => [v, 'Operace']} />
              <Bar dataKey="ops" fill={accent} opacity={0.75} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.section>

        {/* Ops by department */}
        <motion.section
          className="rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}
        >
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-4">Výkony dle oddělení</p>
          <div className="space-y-2.5">
            {deptMap.map(([dept, count], i) => {
              const max = deptMap[0][1];
              return (
                <div key={dept}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-white/60">{dept}</span>
                    <span className="text-[10px] font-black text-white/80">{count}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: i === 0 ? accent : 'rgba(255,255,255,0.2)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / max) * 100}%` }}
                      transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      </div>

      {/* ── Phase breakdown ── */}
      <motion.section
        className="rounded-xl p-5 mb-6"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.12 }}
      >
        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-5">Fáze operačního cyklu — průměrné trvání</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
          {phaseRows.map((ph, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/55 flex items-center gap-1.5">
                  <TrendIcon v={ph.trend} />
                  {ph.label}
                </span>
                <span className="text-[10px] font-black text-white/80">{ph.min} min</span>
              </div>
              <div className="h-px rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <motion.div
                  className="h-full"
                  style={{ background: ph.pct > 20 ? accent : 'rgba(255,255,255,0.25)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(ph.pct * 2, 100)}%` }}
                  transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Heatmap ── */}
      <motion.section
        className="rounded-xl p-5 mb-12"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.14 }}
      >
        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-5">Heatmapa vytížení — den × hodina</p>
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-0.5" style={{ minWidth: 520 }}>
            {/* Hour labels */}
            <div className="flex gap-0.5 pl-7">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="w-5 text-center text-[7px] text-white/20 font-bold shrink-0">{h}</div>
              ))}
            </div>
            {DAYS.map((day, di) => (
              <div key={di} className="flex items-center gap-0.5">
                <span className="w-6 text-[9px] font-black text-white/30 shrink-0">{day}</span>
                {HEATMAP[di].map((val, hi) => (
                  <div
                    key={hi}
                    className="w-5 h-4 rounded-[2px] shrink-0"
                    style={{ background: heatColor(val) }}
                    title={`${day} ${hi}:00 — ${val}%`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex gap-4 mt-4 flex-wrap">
          {[
            { c: 'rgba(30,41,59,0.6)',       l: '< 25%' },
            { c: 'rgba(16,185,129,0.60)',     l: '25–50%' },
            { c: 'rgba(251,191,36,0.65)',     l: '50–70%' },
            { c: 'rgba(249,115,22,0.75)',     l: '70–90%' },
            { c: 'rgba(255,59,48,0.85)',      l: '> 90%' },
          ].map(l => (
            <div key={l.l} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-[2px]" style={{ background: l.c }} />
              <span className="text-[9px] text-white/30">{l.l}</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Staff & throughput table ── */}
      <motion.section
        className="rounded-xl mb-16"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.16 }}
      >
        <div className="px-5 pt-5 pb-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Přehled sálů</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Sál','Oddělení','Chirurg','Operace / 24h','Stav'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-black uppercase tracking-widest text-white/25 text-[9px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.map((r, i) => (
                <tr
                  key={r.id}
                  style={{ borderBottom: i < rooms.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
                >
                  <td className="px-5 py-2.5 font-bold text-white/80">{r.name}</td>
                  <td className="px-5 py-2.5 text-white/40">{r.department}</td>
                  <td className="px-5 py-2.5 text-white/40">{r.staff.doctor.name ?? '—'}</td>
                  <td className="px-5 py-2.5 font-black" style={{ color: accent }}>{r.operations24h}</td>
                  <td className="px-5 py-2.5">
                    <span
                      className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{
                        background: r.status === RoomStatus.BUSY ? 'rgba(249,115,22,0.12)'
                          : r.status === RoomStatus.FREE ? 'rgba(16,185,129,0.12)'
                          : 'rgba(255,255,255,0.06)',
                        color: r.status === RoomStatus.BUSY ? '#F97316'
                          : r.status === RoomStatus.FREE ? '#10B981'
                          : 'rgba(255,255,255,0.4)',
                      }}
                    >
                      {r.status === RoomStatus.BUSY ? 'Obsazeno'
                        : r.status === RoomStatus.FREE ? 'Volno'
                        : r.status === RoomStatus.CLEANING ? 'Úklid'
                        : 'Údržba'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>

    </div>
  );
};

export default StatisticsModule;
