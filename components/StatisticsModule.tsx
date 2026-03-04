import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Calendar, TrendingUp, Clock, Building2, Activity,
  ChevronDown, Zap, Target, AlertCircle, CheckCircle, Info,
  Download, BarChart as BarChartIcon, Table,
} from 'lucide-react';
import { OperatingRoom } from '../types';
import { MOCK_ROOMS } from '../constants';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

interface StatisticsModuleProps {
  rooms?: OperatingRoom[];
}

type TimePeriod = 'day' | 'week' | 'month';

const HEATMAP_DATA: number[][] = Array.from({ length: 7 }, () =>
  Array.from({ length: 24 }, () => Math.floor(Math.random() * 100))
);

const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms = MOCK_ROOMS }) => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || '1');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  const colors = {
    primary: '#0EA5E9',
    success: '#10B981',
    warning: '#F97316',
    secondary: '#A855F7',
    info: '#06B6D4',
  };

  const periodOptions: { label: string; value: TimePeriod }[] = [
    { label: 'Dnes', value: 'day' },
    { label: 'Tento týden', value: 'week' },
    { label: 'Tento měsíc', value: 'month' },
  ];

  const timelineData = useMemo(() => {
    if (timePeriod === 'day') {
      return Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        utilization: Math.floor(Math.random() * 30) + 60,
      }));
    } else if (timePeriod === 'week') {
      return [
        { time: 'Po', utilization: 92 },
        { time: 'Út', utilization: 88 },
        { time: 'St', utilization: 95 },
        { time: 'Čt', utilization: 87 },
        { time: 'Pá', utilization: 79 },
        { time: 'So', utilization: 45 },
        { time: 'Ne', utilization: 30 },
      ];
    } else {
      return Array.from({ length: 30 }, (_, i) => ({
        time: `${i + 1}.`,
        utilization: Math.floor(Math.random() * 20) + 75,
      }));
    }
  }, [timePeriod]);

  const phaseData = [
    { phase: 'Přijezd → Anestezie', duration: 12, color: '#818CF8', label: 'Příprava', percent: 5.5 },
    { phase: 'Anestezie → Výkon', duration: 8, color: '#A855F7', label: 'Anestezie', percent: 3.7 },
    { phase: 'Chirurgický výkon', duration: 95, color: '#06B6D4', label: 'Výkon', percent: 43.8 },
    { phase: 'Výkon → Konec anestezie', duration: 15, color: '#10B981', label: 'Probuzení', percent: 6.9 },
    { phase: 'Anestezie → Úklid', duration: 10, color: '#F97316', label: 'Podchyt', percent: 4.6 },
    { phase: 'Úklid → Připraveno', duration: 20, color: '#FBBF24', label: 'Úklid', percent: 9.2 },
    { phase: 'Pauza mezi operacemi', duration: 47, color: '#94A3B8', label: 'Pauza', percent: 21.6 },
  ];

  const advancedMetrics = [
    { label: 'Přijezd → Anestezie', value: '12m', trend: '-1m', status: 'optimal' },
    { label: 'Anestezie → Výkon', value: '8m', trend: '-0.5m', status: 'optimal' },
    { label: 'Chirurgický výkon', value: '95m', trend: '+2m', status: 'warning' },
    { label: 'Výkon → Konec anestezie', value: '15m', trend: '-2m', status: 'optimal' },
    { label: 'Úklid sálu', value: '20m', trend: '+1m', status: 'info' },
    { label: 'Pauza mezi operacemi', value: '47m', trend: '+5m', status: 'warning' },
  ];

  const comparisonData = useMemo(() => {
    return rooms.map((room) => ({
      name: room.name,
      operations: room.operations24h,
      utilization: 75 + (parseInt(room.id) * 7 % 25),
      efficiency: 85 + (parseInt(room.id) * 3 % 15),
    }));
  }, [rooms]);

  const heatmapColor = (val: number): string => {
    if (val >= 90) return '#FF3B30';
    if (val >= 75) return '#F97316';
    if (val >= 60) return '#FBBF24';
    if (val >= 40) return '#10B981';
    return '#06B6D4';
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden text-white">

      {/* Header */}
      <header className="flex-shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-2 opacity-60">
          <BarChart3 className="w-4 h-4" style={{ color: colors.info }} />
          <p className="text-[10px] font-black tracking-[0.4em] uppercase" style={{ color: colors.info }}>
            Analýzy a Metriky
          </p>
        </div>
        <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
          Statistiky <span className="text-white/20">Operačních Sálů</span>
        </h1>
      </header>

      {/* Room tabs + controls */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 pb-4 border-b border-white/5">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar min-w-0 flex-1">
          {rooms.map((room) => (
            <motion.button
              key={room.id}
              onClick={() => setSelectedRoomId(room.id)}
              className="px-3 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap uppercase tracking-wider flex-shrink-0 transition-all"
              style={{
                borderColor: selectedRoomId === room.id ? colors.info : 'rgba(255,255,255,0.1)',
                background: selectedRoomId === room.id ? `${colors.info}18` : 'rgba(255,255,255,0.03)',
                color: selectedRoomId === room.id ? colors.info : 'rgba(255,255,255,0.45)',
              }}
              whileHover={{ scale: 1.04 }}
            >
              {room.name}
            </motion.button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className="flex gap-1 p-1 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {(['chart', 'table'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-2 py-1 rounded transition-all"
                style={{
                  background: viewMode === mode ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: viewMode === mode ? colors.info : 'rgba(255,255,255,0.4)',
                }}
              >
                {mode === 'chart' ? <BarChartIcon className="w-4 h-4" /> : <Table className="w-4 h-4" />}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              const a = document.createElement('a');
              a.href = 'data:text/csv;charset=utf-8,Sal,Operace,Vytizeni\n' +
                comparisonData.map(r => `${r.name},${r.operations},${r.utilization}`).join('\n');
              a.download = `statistiky_${selectedRoomId}_${timePeriod}.csv`;
              a.click();
            }}
            className="px-2 py-1.5 rounded-lg border transition-all hover:bg-white/10"
            style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)' }}
          >
            <Download className="w-4 h-4 text-white/60" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowPeriodMenu(!showPeriodMenu)}
              className="px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-all hover:bg-white/10 text-xs font-bold uppercase tracking-wider"
              style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)' }}
            >
              <Calendar className="w-3.5 h-3.5 text-white/60" />
              <span className="hidden sm:inline text-white/80">
                {periodOptions.find(p => p.value === timePeriod)?.label}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-white/40" />
            </button>

            {showPeriodMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full mt-2 right-0 z-50 rounded-lg border overflow-hidden"
                style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(5,10,25,0.97)', minWidth: '170px' }}
              >
                {periodOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setTimePeriod(opt.value); setShowPeriodMenu(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors text-xs font-bold border-b last:border-b-0"
                    style={{
                      borderColor: 'rgba(255,255,255,0.08)',
                      background: timePeriod === opt.value ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: timePeriod === opt.value ? colors.info : 'rgba(255,255,255,0.65)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5 pb-12">
        {selectedRoom && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Operace / den', value: selectedRoom.operations24h, icon: Activity, color: colors.primary, trend: '+2' },
                { label: 'Vytížení', value: '87%', icon: TrendingUp, color: colors.success, trend: '+1.2%' },
                { label: 'Prům. cyklus', value: '145m', icon: Clock, color: colors.warning, trend: '-3m' },
                { label: 'Efektivita', value: '89%', icon: Zap, color: colors.secondary, trend: '+0.5%' },
              ].map((m, idx) => {
                const Icon = m.icon;
                return (
                  <motion.div
                    key={idx}
                    className="p-4 rounded-xl border"
                    style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.5)' }}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06, duration: 0.35 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Icon className="w-5 h-5" style={{ color: m.color }} />
                      <span className="text-[10px] font-bold" style={{ color: colors.success }}>{m.trend}</span>
                    </div>
                    <p className="text-[9px] text-white/50 uppercase tracking-wider mb-1">{m.label}</p>
                    <p className="text-2xl font-black">{m.value}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Utilization chart */}
            <motion.div
              className="p-5 rounded-xl border"
              style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.55)' }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.35 }}
            >
              <h2 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: colors.primary }} />
                Vytížení v čase
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(5,10,25,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.8)' }}
                  />
                  <Area type="monotone" dataKey="utilization" stroke={colors.primary} fill="url(#areaGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Phase breakdown */}
            <motion.div
              className="p-5 rounded-xl border"
              style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.55)' }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.35 }}
            >
              <h2 className="text-sm font-black uppercase tracking-widest mb-5 flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: colors.info }} />
                Rozpis fází operačního cyklu
              </h2>
              <div className="space-y-3">
                {phaseData.map((ph, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ph.color }} />
                        <span className="text-xs font-bold text-white/80">{ph.phase}</span>
                        <span className="text-[10px] text-white/35">({ph.label})</span>
                      </div>
                      <div>
                        <span className="text-xs font-black text-white">{ph.duration} min</span>
                        <span className="text-[10px] text-white/40 ml-1.5">{ph.percent}%</span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: ph.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${ph.percent * 2}%` }}
                        transition={{ delay: 0.2 + idx * 0.04, duration: 0.55, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Advanced metrics */}
            <motion.div
              className="p-5 rounded-xl border"
              style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.55)' }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.35 }}
            >
              <h2 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <Target className="w-4 h-4" style={{ color: colors.primary }} />
                Detailní metriky fází
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {advancedMetrics.map((m, idx) => {
                  const sc = m.status === 'optimal' ? colors.success : m.status === 'warning' ? colors.warning : colors.info;
                  return (
                    <motion.div
                      key={idx}
                      className="p-4 rounded-lg border flex items-start justify-between"
                      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.4)' }}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + idx * 0.03, duration: 0.3 }}
                      whileHover={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex-1">
                        <p className="text-[9px] text-white/50 uppercase tracking-wider mb-2">{m.label}</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-black">{m.value}</span>
                          <span className="text-xs font-bold" style={{ color: sc }}>{m.trend}</span>
                        </div>
                      </div>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ml-2" style={{ background: `${sc}20` }}>
                        {m.status === 'optimal' && <CheckCircle className="w-4 h-4" style={{ color: sc }} />}
                        {m.status === 'warning' && <AlertCircle className="w-4 h-4" style={{ color: sc }} />}
                        {m.status === 'info' && <Info className="w-4 h-4" style={{ color: sc }} />}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Heatmap */}
            <motion.div
              className="p-5 rounded-xl border"
              style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.55)' }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.35 }}
            >
              <h2 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" style={{ color: colors.info }} />
                Heatmapa vytížení — den vs hodina
              </h2>
              <div className="overflow-x-auto">
                <div className="inline-block">
                  <div className="flex mb-1">
                    <div className="w-8 flex-shrink-0" />
                    {Array.from({ length: 24 }, (_, i) => (
                      <div key={i} className="w-6 text-center text-[8px] text-white/30 font-bold">
                        {i}
                      </div>
                    ))}
                  </div>
                  {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((day, di) => (
                    <div key={di} className="flex items-center mb-0.5">
                      <div className="w-8 flex-shrink-0 text-[10px] font-bold text-white/50">{day}</div>
                      {HEATMAP_DATA[di].map((val, hi) => (
                        <div
                          key={hi}
                          className="w-6 h-5 rounded-sm border border-white/5 flex-shrink-0"
                          style={{ background: heatmapColor(val), opacity: 0.75 }}
                          title={`${day} ${hi}:00 — ${val}%`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-4 mt-4 flex-wrap">
                {[
                  { color: '#06B6D4', label: '< 40% Nízké' },
                  { color: '#10B981', label: '40–60% Normální' },
                  { color: '#FBBF24', label: '60–75% Vyšší' },
                  { color: '#F97316', label: '75–90% Vysoké' },
                  { color: '#FF3B30', label: '> 90% Kritické' },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ background: l.color }} />
                    <span className="text-[10px] text-white/50">{l.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Rooms comparison */}
            <motion.div
              className="p-5 rounded-xl border"
              style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.55)' }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.35 }}
            >
              <h2 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4" style={{ color: colors.warning }} />
                Srovnání sálů
              </h2>

              {viewMode === 'chart' ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={comparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(5,10,25,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px' }}
                      labelStyle={{ color: 'rgba(255,255,255,0.8)' }}
                    />
                    <Bar dataKey="operations" name="Operace" fill={colors.primary} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="utilization" name="Vytížení %" fill={colors.secondary} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        {['Sál', 'Operace', 'Vytížení', 'Efektivita'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white/50">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonData.map((r, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-3 py-3 font-bold text-white/90 text-xs">{r.name}</td>
                          <td className="px-3 py-3 text-white/70 text-xs">{r.operations}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full overflow-hidden bg-white/10">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${r.utilization}%`, background: colors.primary }}
                                />
                              </div>
                              <span className="text-xs text-white/70">{r.utilization}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
                              style={{ background: `${colors.success}20`, color: colors.success }}
                            >
                              {r.efficiency}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>

            <div className="pb-6" />
          </>
        )}
      </div>
    </div>
  );
};

export default StatisticsModule;
