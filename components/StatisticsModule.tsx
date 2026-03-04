import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Calendar, TrendingUp, Clock, Building2, Activity, ChevronDown, Zap, Target, ArrowUpRight, Percent, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { OperatingRoom } from '../types';
import { MOCK_ROOMS } from '../constants';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, ComposedChart } from 'recharts';

interface StatisticsModuleProps {
  rooms?: OperatingRoom[];
}

type TimePeriod = 'day' | 'week' | 'month';

const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms = MOCK_ROOMS }) => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || '1');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  const timelineData = useMemo(() => {
    if (timePeriod === 'day') {
      return Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        utilization: Math.floor(Math.random() * 30) + 70,
        operations: Math.floor(Math.random() * 8) + 2,
      }));
    } else if (timePeriod === 'week') {
      return [
        { time: 'Po', utilization: 92, operations: 6 },
        { time: 'Út', utilization: 88, operations: 5 },
        { time: 'St', utilization: 95, operations: 7 },
        { time: 'Čt', utilization: 87, operations: 5 },
        { time: 'Pá', utilization: 79, operations: 4 },
        { time: 'So', utilization: 45, operations: 2 },
        { time: 'Ne', utilization: 30, operations: 1 },
      ];
    } else {
      return Array.from({ length: 30 }, (_, i) => ({
        time: `${i + 1}.`,
        utilization: Math.floor(Math.random() * 20) + 75,
        operations: Math.floor(Math.random() * 10) + 5,
      }));
    }
  }, [timePeriod]);

  const phaseData = [
    { phase: 'Přijezd→Anestezie', duration: 12, color: '#818CF8', label: 'Příprava', percent: 5.5 },
    { phase: 'Anestezie→Výkon', duration: 8, color: '#A855F7', label: 'Anestezie', percent: 3.7 },
    { phase: 'Chirurgický výkon', duration: 95, color: '#06B6D4', label: 'Výkon', percent: 43.8 },
    { phase: 'Výkon→Konec anestezie', duration: 15, color: '#10B981', label: 'Probuzení', percent: 6.9 },
    { phase: 'Anestezie→Úklid', duration: 10, color: '#F97316', label: 'Podchyt', percent: 4.6 },
    { phase: 'Úklid→Připraveno', duration: 20, color: '#FBBF24', label: 'Úklid', percent: 9.2 },
    { phase: 'Pauza mezi operacemi', duration: 47, color: '#94A3B8', label: 'Pauza', percent: 21.6 },
  ];

  // Advanced metrics data
  const advancedMetrics = useMemo(() => {
    return [
      { label: 'Čas přijezdu→Anestezie', value: '12m', trend: '-1m', status: 'optimal' },
      { label: 'Čas Anestezie→Výkon', value: '8m', trend: '-0.5m', status: 'optimal' },
      { label: 'Doba chirurgického výkonu', value: '95m', trend: '+2m', status: 'warning' },
      { label: 'Čas Výkon→Konec anestezie', value: '15m', trend: '-2m', status: 'optimal' },
      { label: 'Doba úklidu sálu', value: '20m', trend: '+1m', status: 'info' },
      { label: 'Pauza mezi operacemi', value: '47m', trend: '+5m', status: 'warning' },
    ];
  }, []);

  // Comparison data - all rooms
  const comparisonData = useMemo(() => {
    return rooms.map((room) => ({
      name: room.name,
      operations: room.operations24h,
      utilization: Math.floor(Math.random() * 25) + 75,
      efficiency: Math.floor(Math.random() * 15) + 85,
      avgCycle: Math.floor(Math.random() * 40) + 180,
    }));
  }, [rooms]);

  const totalDuration = phaseData.reduce((sum, p) => sum + p.duration, 0);

  const radarData = [
    { metric: 'Efektivita', value: 89 },
    { metric: 'Vytížení', value: 87 },
    { metric: 'Kvalita', value: 92 },
    { metric: 'Bezpečnost', value: 95 },
    { metric: 'Personál', value: 84 },
    { metric: 'Vybavení', value: 88 },
  ];

  const periodOptions = [
    { label: 'Dnes', value: 'day' as TimePeriod },
    { label: 'Tento týden', value: 'week' as TimePeriod },
    { label: 'Tento měsíc', value: 'month' as TimePeriod },
  ];

  const colors = {
    primary: '#0EA5E9',
    success: '#10B981',
    warning: '#F97316',
    secondary: '#A855F7',
    info: '#06B6D4',
  };

  const getHeatmapColor = (utilization: number): string => {
    if (utilization >= 90) return '#FF3B30';
    if (utilization >= 75) return '#F97316';
    if (utilization >= 60) return '#FBBF24';
    if (utilization >= 40) return '#10B981';
    return '#06B6D4';
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-shrink-0 px-8 py-8 border-b"
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3 opacity-70">
              <div className="p-2 rounded-lg" style={{ background: 'rgba(6, 182, 212, 0.1)', borderLeft: '3px solid #06B6D4' }}>
                <BarChart3 className="w-4 h-4" style={{ color: colors.info }} />
              </div>
              <p className="text-[10px] font-black text-white/60 tracking-[0.4em] uppercase">Pokročilé Analýzy</p>
            </div>
            <h1 className="text-6xl md:text-7xl font-black tracking-tighter uppercase leading-none mb-2">
              Statistiky <span className="text-white/20">sálů</span>
            </h1>
            <p className="text-sm text-white/50">Detailní metriky efektivnosti, vytížení a procesních fází</p>
          </div>

          {/* Time Period Selector */}
          <motion.div className="relative">
            <button
              onClick={() => setShowPeriodMenu(!showPeriodMenu)}
              className="px-4 py-3 rounded-xl border backdrop-blur-sm flex items-center gap-2 transition-all hover:bg-white/10 font-semibold"
              style={{ borderColor: 'rgba(255, 255, 255, 0.15)', background: 'rgba(255, 255, 255, 0.06)' }}
            >
              <Calendar className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white">
                {periodOptions.find(p => p.value === timePeriod)?.label}
              </span>
              <ChevronDown className="w-4 h-4 text-white/50" />
            </button>

            {showPeriodMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full mt-2 right-0 z-50 rounded-xl border backdrop-blur-md overflow-hidden shadow-2xl"
                style={{ borderColor: 'rgba(255, 255, 255, 0.15)', background: 'rgba(15, 23, 42, 0.9)' }}
              >
                {periodOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setTimePeriod(option.value);
                      setShowPeriodMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors text-sm border-b last:border-b-0 font-semibold"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                      background: timePeriod === option.value ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                      color: timePeriod === option.value ? colors.info : 'rgba(255, 255, 255, 0.8)',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Room Selector Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {rooms.map((room) => (
            <motion.button
              key={room.id}
              onClick={() => setSelectedRoomId(room.id)}
              className="px-5 py-2.5 rounded-lg border backdrop-blur-sm text-sm font-bold whitespace-nowrap transition-all"
              style={{
                borderColor: selectedRoomId === room.id ? colors.info : 'rgba(255, 255, 255, 0.1)',
                background: selectedRoomId === room.id ? `${colors.info}25` : 'rgba(255, 255, 255, 0.04)',
                color: selectedRoomId === room.id ? colors.info : 'rgba(255, 255, 255, 0.7)',
              }}
              whileHover={{ scale: 1.05 }}
            >
              {room.name}
            </motion.button>
          ))}
        </div>
      </motion.header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {selectedRoom && (
          <div className="space-y-6 p-8">
            {/* KPI Cards Grid */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              {[
                { label: 'Operace za periodu', value: String(selectedRoom.operations24h * 7), icon: Activity, color: colors.primary, trend: '+12%' },
                { label: 'Průměrné vytížení', value: '87%', icon: TrendingUp, color: colors.success, trend: '+2.3%' },
                { label: 'Cyklus (min)', value: '217', icon: Clock, color: colors.warning, trend: '-8m' },
                { label: 'Efektivita', value: '89%', icon: Zap, color: colors.secondary, trend: '+5%' },
              ].map((metric, idx) => {
                const Icon = metric.icon;
                return (
                  <motion.div
                    key={idx}
                    className="p-5 rounded-xl border backdrop-blur-sm overflow-hidden group cursor-pointer"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      background: 'rgba(15, 23, 42, 0.5)',
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * idx + 0.15, duration: 0.4 }}
                    whileHover={{ scale: 1.02, background: 'rgba(255, 255, 255, 0.08)' }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2.5 rounded-lg" style={{ background: `${metric.color}20` }}>
                        <Icon className="w-5 h-5" style={{ color: metric.color }} />
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold" style={{ color: metric.color }}>
                        <ArrowUpRight className="w-3 h-3" />
                        {metric.trend}
                      </div>
                    </div>
                    <p className="text-xs text-white/60 mb-1.5">{metric.label}</p>
                    <p className="text-3xl font-black text-white">{metric.value}</p>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Advanced Metrics - Detailed Timing */}
            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.6)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.4 }}
            >
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                <Clock className="w-6 h-6" style={{ color: colors.primary }} />
                Detailní metriky jednotlivých fází - Časový rozpis
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {advancedMetrics.map((metric, idx) => {
                  const statusColor = metric.status === 'optimal' ? colors.success : metric.status === 'warning' ? colors.warning : colors.info;
                  return (
                    <motion.div
                      key={idx}
                      className="p-4 rounded-lg border backdrop-blur-sm flex items-start justify-between"
                      style={{
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        background: 'rgba(15, 23, 42, 0.4)',
                      }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.22 + idx * 0.03, duration: 0.4 }}
                      whileHover={{ background: 'rgba(255, 255, 255, 0.08)' }}
                    >
                      <div className="flex-1">
                        <p className="text-xs text-white/60 mb-2">{metric.label}</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-white">{metric.value}</span>
                          <span className="text-xs font-bold" style={{ color: statusColor }}>
                            {metric.trend}
                          </span>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${statusColor}20` }}>
                        {metric.status === 'optimal' && <CheckCircle className="w-4 h-4" style={{ color: statusColor }} />}
                        {metric.status === 'warning' && <AlertCircle className="w-4 h-4" style={{ color: statusColor }} />}
                        {metric.status === 'info' && <Info className="w-4 h-4" style={{ color: statusColor }} />}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Rooms Comparison */}
            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.6)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-white flex items-center gap-3">
                  <Building2 className="w-6 h-6" style={{ color: colors.warning }} />
                  Srovnění všech operačních sálů
                </h2>
                <button
                  onClick={() => setComparisonMode(!comparisonMode)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-sm transition-all"
                  style={{
                    borderColor: comparisonMode ? colors.warning : 'rgba(255, 255, 255, 0.1)',
                    background: comparisonMode ? `${colors.warning}20` : 'rgba(15, 23, 42, 0.4)',
                    color: comparisonMode ? colors.warning : 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  {comparisonMode ? 'Tabulka' : 'Grafika'}
                </button>
              </div>
              
              {!comparisonMode ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                    <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.4)" fontSize={12} />
                    <YAxis stroke="rgba(255, 255, 255, 0.4)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(0, 0, 0, 0.95)',
                        border: `1px solid rgba(255, 255, 255, 0.15)`,
                        borderRadius: '12px',
                      }}
                      labelStyle={{ color: 'rgba(255, 255, 255, 0.9)' }}
                    />
                    <Bar dataKey="operations" fill={colors.primary} radius={[8, 8, 0, 0]} />
                    <Bar dataKey="utilization" fill={colors.secondary} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                        <th className="text-left px-4 py-3 text-white/70 font-bold">Sál</th>
                        <th className="text-left px-4 py-3 text-white/70 font-bold">Operace</th>
                        <th className="text-left px-4 py-3 text-white/70 font-bold">Vytížení</th>
                        <th className="text-left px-4 py-3 text-white/70 font-bold">Efektivita</th>
                        <th className="text-left px-4 py-3 text-white/70 font-bold">Cyklus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonData.map((room, idx) => (
                        <tr key={idx} className="border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                          <td className="px-4 py-4 font-bold text-white">{room.name}</td>
                          <td className="px-4 py-4 text-white/80">{room.operations}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 rounded-full overflow-hidden bg-white/10">
                                <div className="h-full bg-blue-500" style={{ width: `${room.utilization}%` }} />
                              </div>
                              <span className="text-white/80 text-xs">{room.utilization}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{ background: `${colors.success}20`, color: colors.success }}>
                              {room.efficiency}%
                            </span>
                          </td>
                          <td className="px-4 py-4 text-white/80">{room.avgCycle}m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.6)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                <TrendingUp className="w-6 h-6" style={{ color: colors.primary }} />
                Vytížení v čase
              </h2>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUtilization" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                  <XAxis dataKey="time" stroke="rgba(255, 255, 255, 0.4)" fontSize={12} />
                  <YAxis stroke="rgba(255, 255, 255, 0.4)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(0, 0, 0, 0.95)',
                      border: `1px solid rgba(255, 255, 255, 0.15)`,
                      borderRadius: '12px',
                    }}
                    labelStyle={{ color: 'rgba(255, 255, 255, 0.9)' }}
                  />
                  <Area type="monotone" dataKey="utilization" fill="url(#colorUtilization)" stroke={colors.primary} strokeWidth={3} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Phase Breakdown - Horizontal Timeline */}
            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.6)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                <Clock className="w-6 h-6" style={{ color: colors.info }} />
                Fáze operačního cyklu - Procentuální rozpis
              </h2>
              
              {/* Visual Timeline */}
              <div className="mb-8">
                <div className="flex h-12 rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                  {phaseData.map((phase, idx) => (
                    <motion.div
                      key={idx}
                      className="group relative transition-all hover:opacity-80 cursor-pointer"
                      style={{
                        width: `${phase.percent}%`,
                        background: phase.color,
                        opacity: 0.9,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${phase.percent}%` }}
                      transition={{ delay: 0.3 + idx * 0.05, duration: 0.6 }}
                      title={`${phase.label}: ${phase.duration}min (${phase.percent}%)`}
                    >
                      {phase.percent > 8 && (
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/80">
                          {phase.percent}%
                        </span>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Detailed Phase Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {phaseData.map((phase, idx) => (
                  <motion.div
                    key={idx}
                    className="p-4 rounded-lg border backdrop-blur-sm"
                    style={{
                      borderColor: `${phase.color}40`,
                      background: `${phase.color}10`,
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + idx * 0.05, duration: 0.4 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-black text-white/70">{phase.label}</span>
                      <span className="text-xs font-bold" style={{ color: phase.color }}>
                        {phase.percent}%
                      </span>
                    </div>
                    <p className="text-2xl font-black text-white mb-1">{phase.duration}</p>
                    <p className="text-xs text-white/50">minut</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Heatmap - Utilization by Hour and Day */}
            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.6)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                <Target className="w-6 h-6" style={{ color: colors.warning }} />
                Heatmapa vytížení - Denní a hodinový rozvrh
              </h2>
              <div className="overflow-x-auto pb-4">
                <div className="inline-block min-w-full">
                  {/* Time labels */}
                  <div className="flex mb-1">
                    <div className="w-12 flex-shrink-0" />
                    {Array.from({ length: 24 }, (_, i) => (
                      <div key={`h-${i}`} className="w-10 flex-shrink-0 text-center text-xs text-white/40 font-bold">
                        {i}h
                      </div>
                    ))}
                  </div>
                  {/* Heatmap rows */}
                  {['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'].map((day, dayIdx) => (
                    <div key={`row-${dayIdx}`} className="flex mb-2">
                      <div className="w-12 flex-shrink-0 flex items-center text-xs font-bold text-white/80">{day.slice(0, 2)}</div>
                      {Array.from({ length: 24 }, (_, hourIdx) => {
                        const utilization = Math.floor(Math.random() * 100);
                        return (
                          <motion.div
                            key={`cell-${dayIdx}-${hourIdx}`}
                            className="w-10 h-8 flex-shrink-0 rounded border border-white/10 transition-all hover:scale-110 hover:shadow-lg"
                            style={{ background: getHeatmapColor(utilization) }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.85 }}
                            transition={{ delay: dayIdx * 0.02 + hourIdx * 0.005 }}
                            title={`${utilization}%`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-6 mt-6 text-xs border-t pt-4" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-4 rounded" style={{ background: '#06B6D4' }} />
                  <span className="text-white/70">Nízké &lt;40%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-4 rounded" style={{ background: '#10B981' }} />
                  <span className="text-white/70">Normální 40-60%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-4 rounded" style={{ background: '#FBBF24' }} />
                  <span className="text-white/70">Vyšší 60-75%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-4 rounded" style={{ background: '#F97316' }} />
                  <span className="text-white/70">Vysoké 75-90%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-4 rounded" style={{ background: '#FF3B30' }} />
                  <span className="text-white/70">Kritické &gt;90%</span>
                </div>
              </div>
            </motion.div>

            {/* Efficiency Radar */}
            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.6)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                <Target className="w-6 h-6" style={{ color: colors.secondary }} />
                Profil efektivnosti
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
                  <PolarAngleAxis dataKey="metric" stroke="rgba(255, 255, 255, 0.4)" fontSize={12} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="rgba(255, 255, 255, 0.2)" />
                  <Radar name="Skóre" dataKey="value" stroke={colors.secondary} fill={colors.secondary} fillOpacity={0.25} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(0, 0, 0, 0.95)',
                      border: `1px solid rgba(255, 255, 255, 0.15)`,
                      borderRadius: '12px',
                    }}
                    labelStyle={{ color: 'rgba(255, 255, 255, 0.9)' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Room Comparison */}
            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm mb-16"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                <Building2 className="w-6 h-6" style={{ color: colors.warning }} />
                Srovnění všech sálů
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rooms.map(r => ({
                  name: r.name,
                  operations: r.operations24h * 7,
                  utilization: Math.floor(Math.random() * 25) + 75,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                  <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.4)" fontSize={12} />
                  <YAxis stroke="rgba(255, 255, 255, 0.4)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(0, 0, 0, 0.95)',
                      border: `1px solid rgba(255, 255, 255, 0.15)`,
                      borderRadius: '12px',
                    }}
                    labelStyle={{ color: 'rgba(255, 255, 255, 0.9)' }}
                  />
                  <Bar dataKey="operations" fill={colors.primary} radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsModule;
