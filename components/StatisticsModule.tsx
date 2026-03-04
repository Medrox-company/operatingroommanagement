import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Calendar, TrendingUp, Clock, Building2, Activity, ChevronDown, Zap, Target, AlertCircle, CheckCircle, Info, Users } from 'lucide-react';
import { OperatingRoom } from '../types';
import { MOCK_ROOMS } from '../constants';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface StatisticsModuleProps {
  rooms?: OperatingRoom[];
}

type TimePeriod = 'day' | 'week' | 'month';

const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms = MOCK_ROOMS }) => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || '1');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  const colors = {
    primary: '#0EA5E9',
    success: '#10B981',
    warning: '#F97316',
    secondary: '#A855F7',
    info: '#06B6D4',
  };

  // Generate timeline data based on period
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

  // Phase data for selected room
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

  const periodOptions = [
    { label: 'Dnes', value: 'day' as TimePeriod },
    { label: 'Tento týden', value: 'week' as TimePeriod },
    { label: 'Tento měsíc', value: 'month' as TimePeriod },
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex-shrink-0">
        <p className="text-xs font-bold text-cyan-400/60 uppercase tracking-[0.2em] mb-2">Analýzy a Metriky</p>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-white">Statistiky Operačních Sálů</h1>
          
          <motion.div className="relative" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <button
              onClick={() => setShowPeriodMenu(!showPeriodMenu)}
              className="px-3 py-1.5 rounded-lg border backdrop-blur-md flex items-center gap-2 transition-all hover:bg-white/10 text-xs font-bold"
              style={{ borderColor: 'rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.05)' }}
            >
              <Calendar className="w-3.5 h-3.5 text-white/70" />
              <span className="text-white uppercase tracking-wider">
                {periodOptions.find(p => p.value === timePeriod)?.label}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-white/50" />
            </button>

            {showPeriodMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full mt-2 right-0 z-50 rounded-lg border backdrop-blur-md overflow-hidden"
                style={{ borderColor: 'rgba(255, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.95)', minWidth: '180px' }}
              >
                {periodOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setTimePeriod(option.value);
                      setShowPeriodMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors text-xs border-b last:border-b-0 font-bold"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      background: timePeriod === option.value ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                      color: timePeriod === option.value ? colors.info : 'rgba(255, 255, 255, 0.7)',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Room Selector Tabs */}
      <div className="flex-shrink-0 flex gap-2 overflow-x-auto px-6 py-3 border-b border-white/5 hide-scrollbar">
        {rooms.map((room) => (
          <motion.button
            key={room.id}
            onClick={() => setSelectedRoomId(room.id)}
            className="px-3 py-1.5 rounded-lg border backdrop-blur-sm text-xs font-bold whitespace-nowrap transition-all uppercase tracking-wider"
            style={{
              borderColor: selectedRoomId === room.id ? colors.info : 'rgba(255, 255, 255, 0.1)',
              background: selectedRoomId === room.id ? `${colors.info}15` : 'rgba(255, 255, 255, 0.03)',
              color: selectedRoomId === room.id ? colors.info : 'rgba(255, 255, 255, 0.5)',
            }}
            whileHover={{ scale: 1.05 }}
          >
            {room.name}
          </motion.button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">
        {selectedRoom && (
          <>
            {/* KPI Metrics */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              {[
                { label: 'Operace/den', value: selectedRoom.operations24h, icon: Activity, color: colors.primary },
                { label: 'Vytížení', value: '87%', icon: TrendingUp, color: colors.success },
                { label: 'Cyklus (min)', value: '145', icon: Clock, color: colors.warning },
                { label: 'Efektivita', value: '89%', icon: Zap, color: colors.secondary },
              ].map((metric, idx) => {
                const Icon = metric.icon;
                return (
                  <motion.div
                    key={idx}
                    className="p-4 rounded-xl border backdrop-blur-sm"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.5)' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * idx + 0.15, duration: 0.4 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Icon className="w-5 h-5" style={{ color: metric.color }} />
                      <span className="text-xs text-green-400 font-bold">+2.3%</span>
                    </div>
                    <p className="text-[9px] text-white/60 mb-1 uppercase tracking-wider">{metric.label}</p>
                    <p className="text-2xl font-black text-white">{metric.value}</p>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Utilization Timeline */}
            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.6)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                <TrendingUp className="w-5 h-5" style={{ color: colors.primary }} />
                Vytížení v čase
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey="time" stroke="rgba(255, 255, 255, 0.5)" fontSize={12} />
                  <YAxis stroke="rgba(255, 255, 255, 0.5)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(0, 0, 0, 0.9)',
                      border: `1px solid rgba(255, 255, 255, 0.1)`,
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
                  />
                  <Area type="monotone" dataKey="utilization" fill={colors.primary} stroke={colors.primary} fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Phase Duration Breakdown */}
            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.6)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              <h2 className="text-lg font-black text-white mb-6 flex items-center gap-2 uppercase tracking-wider">
                <Clock className="w-5 h-5" style={{ color: colors.info }} />
                Rozpis jednotlivých fází
              </h2>
              <div className="space-y-3">
                {phaseData.map((phase, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + idx * 0.05, duration: 0.4 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ background: phase.color }} />
                        <span className="text-sm font-bold text-white">{phase.phase}</span>
                        <span className="text-xs text-white/40">({phase.label})</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-white">{phase.duration} min</span>
                        <span className="text-xs text-white/50 ml-2">({phase.percent}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: phase.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${phase.percent}%` }}
                        transition={{ delay: 0.25 + idx * 0.05 + 0.2, duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Advanced Metrics */}
            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.6)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <h2 className="text-lg font-black text-white mb-6 flex items-center gap-3 uppercase tracking-wider">
                <Target className="w-5 h-5" style={{ color: colors.primary }} />
                Detailní metriky jednotlivých fází
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
                      transition={{ delay: 0.3 + idx * 0.03, duration: 0.4 }}
                      whileHover={{ background: 'rgba(255, 255, 255, 0.08)' }}
                    >
                      <div className="flex-1">
                        <p className="text-[9px] text-white/60 mb-2 uppercase tracking-wider">{metric.label}</p>
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

            {/* Heatmap - Utilization by Hour and Day */}
            <motion.div
              className="p-6 rounded-xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.5)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" style={{ color: colors.info }} />
                Heatmapa vytížení - Den vs Hodina
              </h2>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  {/* Day labels */}
                  <div className="flex">
                    <div className="w-12" />
                    {Array.from({ length: 24 }, (_, i) => (
                      <div key={`h-${i}`} className="w-6 text-center text-[9px] text-white/40 font-bold">
                        {i}h
                      </div>
                    ))}
                  </div>
                  {/* Heatmap cells */}
                  {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((day, dayIdx) => (
                    <div key={`row-${dayIdx}`} className="flex">
                      <div className="w-12 flex items-center text-xs font-bold text-white/70">{day}</div>
                      {Array.from({ length: 24 }, (_, hourIdx) => {
                        const utilization = Math.floor(Math.random() * 100);
                        const bgColor = utilization >= 90 ? '#FF3B30' : utilization >= 75 ? '#F97316' : utilization >= 60 ? '#FBBF24' : utilization >= 40 ? '#10B981' : '#06B6D4';
                        return (
                          <motion.div
                            key={`cell-${dayIdx}-${hourIdx}`}
                            className="w-6 h-6 rounded border border-white/10"
                            style={{ background: bgColor }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.8 }}
                            transition={{ delay: dayIdx * 0.01 + hourIdx * 0.002, duration: 0.3 }}
                            title={`${utilization}%`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              {/* Legend */}
              <div className="flex gap-3 mt-4 text-[9px] flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: '#06B6D4' }} />
                  <span className="text-white/60">Nízké &lt;40%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: '#10B981' }} />
                  <span className="text-white/60">Normální 40-60%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: '#FBBF24' }} />
                  <span className="text-white/60">Vyšší 60-75%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: '#F97316' }} />
                  <span className="text-white/60">Vysoké 75-90%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: '#FF3B30' }} />
                  <span className="text-white/60">Kritické &gt;90%</span>
                </div>
              </div>
            </motion.div>

            {/* Rooms Comparison */}
            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.6)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <h2 className="text-lg font-black text-white mb-4 flex items-center gap-3 uppercase tracking-wider">
                <Building2 className="w-5 h-5" style={{ color: colors.warning }} />
                Srovnění všech operačních sálů
              </h2>
              <ResponsiveContainer width="100%" height={250}>
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
            </motion.div>

            <div className="pb-8" />
          </>
        )}
      </div>
    </div>
  );
};

export default StatisticsModule;
