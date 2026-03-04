import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Calendar, TrendingUp, Users, Clock, Building2, Activity, ChevronDown, Zap, Pause, Hourglass, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS, MOCK_ROOMS } from '../constants';
import { LineChart, Line, BarChart, Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';

interface StatisticsModuleProps {
  rooms?: OperatingRoom[];
}

type TimePeriod = 'day' | 'week' | 'month';

const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms = MOCK_ROOMS }) => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || '1');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  // Generuj detailní data pro jednotlivé fáze
  const generateRoomPhaseData = (roomId: string) => {
    const phaseNames = [
      'Přijezd→Anestezie',
      'Anestezie→Výkon',
      'Chirurgický výkon',
      'Výkon→Konec anestezie',
      'Anestezie→Úklid',
      'Úklid→Připraveno'
    ];

    return phaseNames.map((name, idx) => ({
      phase: name,
      duration: Math.floor(Math.random() * 45) + 15,
      avgDuration: Math.floor(Math.random() * 50) + 20,
      color: WORKFLOW_STEPS[idx]?.color || '#818CF8',
    }));
  };

  // Timeline data pro vybraný sál
  const timelineData = useMemo(() => {
    const periods = {
      day: Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        utilisationPercent: Math.floor(Math.random() * 30) + 70,
        operations: Math.floor(Math.random() * 8) + 2,
        pauseTime: Math.floor(Math.random() * 20) + 5,
        efficiency: Math.floor(Math.random() * 20) + 80,
      })),
      week: [
        { time: 'Po', utilisationPercent: 92, operations: 6, pauseTime: 18, efficiency: 88 },
        { time: 'Út', utilisationPercent: 88, operations: 5, pauseTime: 22, efficiency: 85 },
        { time: 'St', utilisationPercent: 95, operations: 7, pauseTime: 15, efficiency: 91 },
        { time: 'Čt', utilisationPercent: 87, operations: 5, pauseTime: 25, efficiency: 82 },
        { time: 'Pá', utilisationPercent: 79, operations: 4, pauseTime: 30, efficiency: 75 },
        { time: 'So', utilisationPercent: 45, operations: 2, pauseTime: 40, efficiency: 50 },
        { time: 'Ne', utilisationPercent: 30, operations: 1, pauseTime: 50, efficiency: 35 },
      ],
      month: Array.from({ length: 30 }, (_, i) => ({
        time: `${i + 1}.`,
        utilisationPercent: Math.floor(Math.random() * 20) + 75,
        operations: Math.floor(Math.random() * 10) + 5,
        pauseTime: Math.floor(Math.random() * 25) + 15,
        efficiency: Math.floor(Math.random() * 15) + 80,
      })),
    };
    return periods[timePeriod];
  }, [timePeriod]);

  // Phase duration distribution
  const phaseData = useMemo(() => generateRoomPhaseData(selectedRoomId || '1'), [selectedRoomId]);

  // Heatmap data - hodiny vs dny
  const heatmapData = [
    { day: 'Pondělí', '06-08': 45, '08-10': 92, '10-12': 88, '12-14': 75, '14-16': 85, '16-18': 92 },
    { day: 'Úterý', '06-08': 52, '08-10': 88, '10-12': 91, '12-14': 78, '14-16': 88, '16-18': 85 },
    { day: 'Středa', '06-08': 58, '08-10': 95, '10-12': 94, '12-14': 82, '14-16': 91, '16-18': 88 },
    { day: 'Čtvrtek', '06-08': 48, '08-10': 87, '10-12': 89, '12-14': 80, '14-16': 86, '16-18': 82 },
    { day: 'Pátek', '06-08': 35, '08-10': 79, '10-12': 81, '12-14': 72, '14-16': 75, '16-18': 68 },
  ];

  // Room comparison data
  const roomComparisonData = rooms.map(r => ({
    name: r.name,
    utilization: Math.floor(Math.random() * 25) + 75,
    operations24h: r.operations24h,
    efficiency: Math.floor(Math.random() * 20) + 75,
  }));

  const colors = {
    primary: '#0EA5E9',
    secondary: '#A855F7',
    success: '#10B981',
    warning: '#F97316',
    danger: '#FF3B30',
    info: '#06B6D4',
  };

  const periodOptions: { label: string; value: TimePeriod }[] = [
    { label: 'Dnes', value: 'day' },
    { label: 'Tento týden', value: 'week' },
    { label: 'Tento měsíc', value: 'month' },
  ];

  const getUtilizationColor = (value: number) => {
    if (value >= 85) return colors.success;
    if (value >= 70) return colors.info;
    if (value >= 55) return colors.warning;
    return colors.danger;
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-shrink-0 pb-8 border-b"
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2 opacity-60">
              <BarChart3 className="w-4 h-4" style={{ color: colors.info }} />
              <p className="text-[10px] font-black text-white/60 tracking-[0.4em] uppercase">Podrobné Analýzy</p>
            </div>
            <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">
              Detailní Statistiky <span className="text-white/20">sálů</span>
            </h1>
          </div>

          <motion.div className="relative">
            <button
              onClick={() => setShowPeriodMenu(!showPeriodMenu)}
              className="px-4 py-2 rounded-lg border backdrop-blur-md flex items-center gap-2 transition-all hover:bg-white/10"
              style={{ borderColor: 'rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.05)' }}
            >
              <Calendar className="w-4 h-4 text-white/70" />
              <span className="text-sm font-bold text-white">
                {periodOptions.find(p => p.value === timePeriod)?.label}
              </span>
              <ChevronDown className="w-4 h-4 text-white/50" style={{ transform: showPeriodMenu ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
            </button>

            <AnimatePresence>
              {showPeriodMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full mt-2 right-0 z-50 rounded-lg border backdrop-blur-md overflow-hidden"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.8)', minWidth: '180px' }}
                >
                  {periodOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTimePeriod(option.value);
                        setShowPeriodMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors text-sm border-b last:border-b-0"
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
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Room Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {rooms.map((room) => (
            <motion.button
              key={room.id}
              onClick={() => setSelectedRoomId(room.id)}
              className="px-4 py-2 rounded-lg border backdrop-blur-sm text-sm font-bold whitespace-nowrap transition-all"
              style={{
                borderColor: selectedRoomId === room.id ? colors.info : 'rgba(255, 255, 255, 0.1)',
                background: selectedRoomId === room.id ? `${colors.info}20` : 'rgba(255, 255, 255, 0.04)',
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
          <div className="space-y-8 py-8">
            {/* Key Metrics Cards */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              {[
                { label: 'Dnešní operace', value: selectedRoom.operations24h, icon: Activity, color: colors.primary },
                { label: 'Vytížení', value: `${Math.floor(Math.random() * 25) + 75}%`, icon: TrendingUp, color: colors.success },
                { label: 'Průměrná cyklus', value: '145 min', icon: Clock, color: colors.warning },
                { label: 'Efektivita', value: `${Math.floor(Math.random() * 15) + 80}%`, icon: Zap, color: colors.secondary },
              ].map((metric, idx) => {
                const Icon = metric.icon;
                return (
                  <motion.div
                    key={idx}
                    className="p-4 rounded-xl border backdrop-blur-sm"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * idx + 0.15, duration: 0.4 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Icon className="w-5 h-5" style={{ color: metric.color }} />
                    </div>
                    <p className="text-xs text-white/60 mb-1">{metric.label}</p>
                    <p className="text-2xl font-black text-white">{metric.value}</p>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Utilization Timeline */}
            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" style={{ color: colors.primary }} />
                Vytížení v čase - {timePeriod === 'day' ? 'Hodinově' : timePeriod === 'week' ? 'Denně' : 'Denně'}
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey="time" stroke="rgba(255, 255, 255, 0.5)" />
                  <YAxis stroke="rgba(255, 255, 255, 0.5)" />
                  <Tooltip
                    contentStyle={{ background: 'rgba(0, 0, 0, 0.9)', border: `1px solid rgba(255, 255, 255, 0.1)`, borderRadius: '8px' }}
                    labelStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="utilisationPercent" fill={colors.primary} stroke={colors.primary} fillOpacity={0.2} name="Vytížení %" />
                  <Bar dataKey="operations" fill={colors.secondary} name="Operace" yAxisId="right" />
                  <YAxis yAxisId="right" orientation="right" stroke="rgba(255, 255, 255, 0.5)" />
                </ComposedChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Phase Duration Analysis */}
            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <Hourglass className="w-5 h-5" style={{ color: colors.warning }} />
                Trvání jednotlivých fází operačního cyklu
              </h2>
              <div className="space-y-3">
                {phaseData.map((phase, idx) => (
                  <motion.div
                    key={idx}
                    className="p-3 rounded-lg border backdrop-blur-sm"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + idx * 0.05, duration: 0.4 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white text-sm">{phase.phase}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-white/70">
                          <span className="font-black text-white">{phase.duration} min</span> / průměr: {phase.avgDuration} min
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: phase.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(phase.duration / 180) * 100}%` }}
                        transition={{ delay: 0.3 + idx * 0.05, duration: 0.8 }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Heatmap Section */}
            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" style={{ color: colors.info }} />
                Heatmapa vytížení - Den vs Čas
              </h2>
              <div className="overflow-x-auto">
                <div className="min-w-max">
                  <div className="flex">
                    <div className="w-24 pt-8" />
                    <div className="flex gap-2">
                      {['06-08', '08-10', '10-12', '12-14', '14-16', '16-18'].map((time) => (
                        <div key={time} className="w-16 text-center">
                          <span className="text-[10px] text-white/60 font-bold">{time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {heatmapData.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex gap-2 mb-2">
                      <div className="w-24 text-right pr-2">
                        <span className="text-[11px] font-bold text-white/80">{row.day}</span>
                      </div>
                      <div className="flex gap-2">
                        {(['06-08', '08-10', '10-12', '12-14', '14-16', '16-18'] as const).map((time) => {
                          const value = row[time];
                          const intensity = value / 100;
                          return (
                            <motion.div
                              key={time}
                              className="w-16 h-10 rounded-lg border cursor-pointer transition-all hover:scale-110"
                              style={{
                                background: getUtilizationColor(value),
                                opacity: 0.3 + intensity * 0.7,
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                              }}
                              title={`${time}: ${value}%`}
                              whileHover={{ scale: 1.1 }}
                            >
                              <div className="flex items-center justify-center h-full">
                                <span className="text-[10px] font-bold text-white/80">{value}%</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Room Comparison */}
            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" style={{ color: colors.success }} />
                Porovnání sálů
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={roomComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.5)" />
                  <YAxis stroke="rgba(255, 255, 255, 0.5)" />
                  <Tooltip
                    contentStyle={{ background: 'rgba(0, 0, 0, 0.9)', border: `1px solid rgba(255, 255, 255, 0.1)`, borderRadius: '8px' }}
                    labelStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
                  />
                  <Legend />
                  <Bar dataKey="utilization" fill={colors.info} name="Vytížení %" />
                  <Bar dataKey="efficiency" fill={colors.success} name="Efektivita %" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Detailed Phase Breakdown */}
            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <h2 className="text-lg font-black text-white mb-6">Podrobný rozpis jednotlivých statusů</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {WORKFLOW_STEPS.map((step, idx) => {
                  const Icon = step.Icon;
                  return (
                    <motion.div
                      key={idx}
                      className="p-4 rounded-lg border backdrop-blur-sm group cursor-pointer transition-all"
                      style={{
                        borderColor: `${step.color}40`,
                        background: `${step.color}10`,
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + idx * 0.05, duration: 0.4 }}
                      whileHover={{ scale: 1.05, background: `${step.color}20` }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ background: `${step.color}30` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: step.color }} />
                        </div>
                        <span
                          className="text-[11px] font-black px-2 py-1 rounded-full"
                          style={{
                            background: `${step.color}30`,
                            color: step.color,
                          }}
                        >
                          {(Math.random() * 25 + 15).toFixed(1)} min
                        </span>
                      </div>
                      <h3 className="font-black text-white text-sm mb-1">{step.title}</h3>
                      <p className="text-xs text-white/60 mb-3">{step.organizer}</p>
                      <div className="space-y-1 text-[11px] text-white/50">
                        <div className="flex justify-between">
                          <span>Dnešní: <span className="text-white/80 font-bold">{Math.floor(Math.random() * 15) + 5}x</span></span>
                        </div>
                        <div className="flex justify-between">
                          <span>Týden: <span className="text-white/80 font-bold">{Math.floor(Math.random() * 80) + 30}x</span></span>
                        </div>
                        <div className="flex justify-between">
                          <span>Efektivita: <span className="text-white/80 font-bold">{Math.floor(Math.random() * 20) + 80}%</span></span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            <div className="pb-16" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsModule;
  );
};

export default StatisticsModule;
