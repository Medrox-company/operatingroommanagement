import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Calendar, TrendingUp, Users, Clock, Building2, Activity, ChevronDown, Pause, Hourglass, CheckCircle } from 'lucide-react';
import { OperatingRoom } from '../types';
import { LineChart, Line, BarChart, Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';

interface StatisticsModuleProps {
  rooms?: OperatingRoom[];
}

type TimePeriod = 'day' | 'week' | 'month' | 'year';

interface Phase {
  name: string;
  duration: number;
  color: string;
}

const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms = [] }) => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(rooms[0]?.id || null);
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  // Barvy
  const colors = {
    primary: '#0EA5E9',
    secondary: '#A855F7',
    success: '#10B981',
    warning: '#F97316',
    danger: '#FF3B30',
    info: '#06B6D4',
  };

  // Generuj časovou osu dat
  const timelineData = useMemo(() => {
    const length = timePeriod === 'day' ? 24 : timePeriod === 'week' ? 7 : timePeriod === 'month' ? 30 : 12;
    const labels = timePeriod === 'day' ? Array.from({length}, (_, i) => `${i}:00`) 
                   : timePeriod === 'week' ? ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
                   : timePeriod === 'month' ? Array.from({length}, (_, i) => `${i+1}.`)
                   : ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];
    
    return labels.slice(0, length).map((label, i) => ({
      time: label,
      operations: Math.floor(Math.random() * 25) + 5,
      utilization: Math.floor(Math.random() * 40) + 60,
      completed: Math.floor(Math.random() * 20) + 5,
      cancelled: Math.floor(Math.random() * 3),
      pauseTime: Math.floor(Math.random() * 40) + 10,
    }));
  }, [timePeriod]);

  // Fáze operačního cyklu
  const phases: Phase[] = [
    { name: 'Volání → Příjezd', duration: Math.floor(Math.random() * 10) + 5, color: '#A78BFA' },
    { name: 'Příjezd → Anestezia', duration: Math.floor(Math.random() * 15) + 10, color: '#818CF8' },
    { name: 'Anestezia → Start', duration: Math.floor(Math.random() * 20) + 15, color: '#06B6D4' },
    { name: 'Chirurgický čas', duration: Math.floor(Math.random() * 120) + 60, color: '#FF3B30' },
    { name: 'Konec → Anestezia konec', duration: Math.floor(Math.random() * 15) + 10, color: '#FBBF24' },
    { name: 'Anestezia konec → Úklid', duration: Math.floor(Math.random() * 10) + 5, color: '#34C759' },
    { name: 'Úklid → Připraveno', duration: Math.floor(Math.random() * 15) + 10, color: '#5B65DC' },
  ];

  const totalCycleTime = phases.reduce((sum, p) => sum + p.duration, 0);
  const periodOptions: { label: string; value: TimePeriod }[] = [
    { label: 'Dnes', value: 'day' },
    { label: 'Tento týden', value: 'week' },
    { label: 'Tento měsíc', value: 'month' },
    { label: 'Tento rok', value: 'year' },
  ];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 pb-12 border-b"
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2 opacity-60">
              <BarChart3 className="w-4 h-4" style={{ color: colors.info }} />
              <p className="text-[10px] font-black text-white/60 tracking-[0.4em] uppercase">Detailní Analýzy</p>
            </div>
            <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
              Statistiky <span className="text-white/20">jednotlivých sálů</span>
            </h1>
          </div>

          {/* Period Selector */}
          <motion.div className="relative">
            <button
              onClick={() => setShowPeriodMenu(!showPeriodMenu)}
              className="px-4 py-2 rounded-lg border backdrop-blur-md flex items-center gap-2 transition-all hover:bg-white/10"
              style={{ borderColor: 'rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.05)' }}
            >
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-bold">{periodOptions.find(p => p.value === timePeriod)?.label}</span>
              <ChevronDown className="w-4 h-4" style={{ transform: showPeriodMenu ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>
            <AnimatePresence>
              {showPeriodMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full mt-2 right-0 z-50 rounded-lg border backdrop-blur-md overflow-hidden"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.8)', minWidth: '200px' }}
                >
                  {periodOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTimePeriod(option.value);
                        setShowPeriodMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-white/10 border-b last:border-b-0 text-sm"
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
      </motion.header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {/* Main Charts Grid */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {/* Počet operací */}
          <motion.div
            className="p-8 rounded-2xl border backdrop-blur-md"
            style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: colors.primary }} />
              Počet operací v čase
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="time" stroke="rgba(255, 255, 255, 0.5)" style={{ fontSize: '12px' }} />
                <YAxis stroke="rgba(255, 255, 255, 0.5)" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ background: 'rgba(0, 0, 0, 0.9)', border: `1px solid rgba(255, 255, 255, 0.1)` }} />
                <Area type="monotone" dataKey="operations" fill={colors.primary} stroke={colors.primary} fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Využití kapacity */}
          <motion.div
            className="p-8 rounded-2xl border backdrop-blur-md"
            style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" style={{ color: colors.success }} />
              Procentuální využití kapacity
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="time" stroke="rgba(255, 255, 255, 0.5)" style={{ fontSize: '12px' }} />
                <YAxis stroke="rgba(255, 255, 255, 0.5)" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ background: 'rgba(0, 0, 0, 0.9)', border: `1px solid rgba(255, 255, 255, 0.1)` }} />
                <Bar dataKey="utilization" fill={colors.success} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Dokončené vs Zrušené */}
          <motion.div
            className="p-8 rounded-2xl border backdrop-blur-md"
            style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" style={{ color: colors.success }} />
              Stav operací
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="time" stroke="rgba(255, 255, 255, 0.5)" style={{ fontSize: '12px' }} />
                <YAxis stroke="rgba(255, 255, 255, 0.5)" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ background: 'rgba(0, 0, 0, 0.9)', border: `1px solid rgba(255, 255, 255, 0.1)` }} />
                <Bar dataKey="completed" fill={colors.success} radius={[8, 8, 0, 0]} />
                <Bar dataKey="cancelled" fill={colors.danger} radius={[8, 8, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Pauzy */}
          <motion.div
            className="p-8 rounded-2xl border backdrop-blur-md"
            style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Pause className="w-5 h-5" style={{ color: colors.warning }} />
              Doba pauzy v sálech
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="time" stroke="rgba(255, 255, 255, 0.5)" style={{ fontSize: '12px' }} />
                <YAxis stroke="rgba(255, 255, 255, 0.5)" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ background: 'rgba(0, 0, 0, 0.9)', border: `1px solid rgba(255, 255, 255, 0.1)` }} />
                <Line type="monotone" dataKey="pauseTime" stroke={colors.warning} strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>

        {/* Selekce sálů */}
        <motion.div
          className="py-12 border-t"
          style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <h2 className="text-2xl font-black text-white mb-8">Detailní fáze operačních cyklů</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-12">
            {rooms.map((room) => (
              <motion.button
                key={room.id}
                onClick={() => setSelectedRoomId(room.id)}
                className="p-4 rounded-xl border transition-all"
                style={{
                  borderColor: selectedRoomId === room.id ? colors.primary : 'rgba(255, 255, 255, 0.1)',
                  background: selectedRoomId === room.id ? `${colors.primary}20` : 'rgba(255, 255, 255, 0.04)',
                }}
              >
                <p className="font-black text-white">{room.name}</p>
                <p className="text-xs text-white/60">{room.department}</p>
              </motion.button>
            ))}
          </div>

          {/* Phase Timeline */}
          <motion.div
            className="p-8 rounded-2xl border backdrop-blur-md"
            style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
              <Hourglass className="w-5 h-5" style={{ color: colors.primary }} />
              Operační cyklus — Celkový čas: {totalCycleTime} minut
            </h3>

            {/* Phases */}
            <div className="space-y-6">
              {phases.map((phase, idx) => {
                const percentage = (phase.duration / totalCycleTime) * 100;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + idx * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: phase.color }} />
                        <span className="font-bold text-white">{phase.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-white/70">{phase.duration} min</span>
                        <span className="text-sm font-bold text-white/60 ml-4">{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: phase.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.5 + idx * 0.05, duration: 0.8 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Timeline Visual */}
            <div className="mt-10 pt-8 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
              <p className="text-xs text-white/60 mb-4">Vizuální rozložení fází na časové ose</p>
              <div className="flex h-12 rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                {phases.map((phase, idx) => {
                  const percentage = (phase.duration / totalCycleTime) * 100;
                  return (
                    <motion.div
                      key={idx}
                      className="flex items-center justify-center text-[10px] font-bold text-white"
                      style={{
                        flex: percentage,
                        background: phase.color,
                        opacity: 0.8,
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.8 }}
                      transition={{ delay: 0.6 + idx * 0.05 }}
                      title={`${phase.name}: ${percentage.toFixed(1)}%`}
                    >
                      {percentage > 8 && `${percentage.toFixed(0)}%`}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <div className="pb-16" />
      </div>
    </div>
  );
};

export default StatisticsModule;
