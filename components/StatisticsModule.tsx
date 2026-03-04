import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Calendar, TrendingUp, Users, Clock, Building2, Activity, ChevronDown, Zap, Pause, Hourglass, AlertTriangle, CheckCircle } from 'lucide-react';
import { OperatingRoom } from '../types';
import { LineChart, Line, BarChart, Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, Treemap } from 'recharts';

interface StatisticsModuleProps {
  rooms?: OperatingRoom[];
}

type TimePeriod = 'day' | 'week' | 'month' | 'year';

interface PhaseMetrics {
  name: string;
  duration: number;
  color: string;
  percentage: number;
}

interface OperationCycle {
  patientCallToArrival: number;
  arrivalToAnesthesia: number;
  anesthesiaToStart: number;
  surgicalTime: number;
  endToAnesthesiaEnd: number;
  anesthesiaEndToCleanup: number;
  cleanupToReady: number;
  pauseDuration: number;
}

const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms = [] }) => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(rooms[0]?.id || null);
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  // Generuj detailní data
  const generateTimelineData = () => {
    const baseData = Array.from({ length: timePeriod === 'day' ? 24 : timePeriod === 'week' ? 7 : timePeriod === 'month' ? 30 : 12 }, (_, i) => {
      const timeLabel = timePeriod === 'day' ? `${i}:00` : timePeriod === 'week' ? ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'][i] : timePeriod === 'month' ? `${i + 1}.` : ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'][i];
      return {
        time: timeLabel,
        totalOperations: Math.floor(Math.random() * 20) + 5,
        utilization: Math.floor(Math.random() * 35) + 65,
        avgCycleTime: Math.floor(Math.random() * 60) + 120,
        pauseTime: Math.floor(Math.random() * 30) + 10,
        completed: Math.floor(Math.random() * 15) + 3,
        cancelled: Math.floor(Math.random() * 3),
      };
    });
    return baseData;
  };

  const timelineData = useMemo(() => generateTimelineData(), [timePeriod]);

  // Detailní metriky jednotlivého sálu
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  
  const generateRoomOperationCycles = (): OperationCycle[] => [
    {
      patientCallToArrival: Math.floor(Math.random() * 10) + 5,
      arrivalToAnesthesia: Math.floor(Math.random() * 15) + 10,
      anesthesiaToStart: Math.floor(Math.random() * 20) + 15,
      surgicalTime: Math.floor(Math.random() * 120) + 60,
      endToAnesthesiaEnd: Math.floor(Math.random() * 15) + 10,
      anesthesiaEndToCleanup: Math.floor(Math.random() * 10) + 5,
      cleanupToReady: Math.floor(Math.random() * 15) + 10,
      pauseDuration: Math.floor(Math.random() * 30),
    },
    {
      patientCallToArrival: Math.floor(Math.random() * 10) + 5,
      arrivalToAnesthesia: Math.floor(Math.random() * 15) + 10,
      anesthesiaToStart: Math.floor(Math.random() * 20) + 15,
      surgicalTime: Math.floor(Math.random() * 120) + 60,
      endToAnesthesiaEnd: Math.floor(Math.random() * 15) + 10,
      anesthesiaEndToCleanup: Math.floor(Math.random() * 10) + 5,
      cleanupToReady: Math.floor(Math.random() * 15) + 10,
      pauseDuration: 0,
    },
  ];

  const operationCycles = useMemo(() => generateRoomOperationCycles(), [selectedRoomId]);

  const calculatePhaseMetrics = (cycle: OperationCycle): PhaseMetrics[] => {
    const total = Object.values(cycle).reduce((a, b) => a + b, 0);
    return [
      { name: 'Volání → Příjezd', duration: cycle.patientCallToArrival, color: '#A78BFA', percentage: (cycle.patientCallToArrival / total) * 100 },
      { name: 'Příjezd → Anestezie', duration: cycle.arrivalToAnesthesia, color: '#818CF8', percentage: (cycle.arrivalToAnesthesia / total) * 100 },
      { name: 'Anestezie → Start', duration: cycle.anesthesiaToStart, color: '#06B6D4', percentage: (cycle.anesthesiaToStart / total) * 100 },
      { name: 'Chirurgický čas', duration: cycle.surgicalTime, color: '#FF3B30', percentage: (cycle.surgicalTime / total) * 100 },
      { name: 'Konec → Anestezie end', duration: cycle.endToAnesthesiaEnd, color: '#FBBF24', percentage: (cycle.endToAnesthesiaEnd / total) * 100 },
      { name: 'Anestezie end → Úklid', duration: cycle.anesthesiaEndToCleanup, color: '#34C759', percentage: (cycle.anesthesiaEndToCleanup / total) * 100 },
      { name: 'Úklid → Připraveno', duration: cycle.cleanupToReady, color: '#5B65DC', percentage: (cycle.cleanupToReady / total) * 100 },
      ...(cycle.pauseDuration > 0 ? [{ name: 'Pauza', duration: cycle.pauseDuration, color: '#64748B', percentage: (cycle.pauseDuration / total) * 100 }] : []),
    ];
  };

  const periodOptions: { label: string; value: TimePeriod }[] = [
    { label: 'Dnes', value: 'day' },
    { label: 'Tento týden', value: 'week' },
    { label: 'Tento měsíc', value: 'month' },
    { label: 'Tento rok', value: 'year' },
  ];

  const colors = {
    primary: '#0EA5E9',
    success: '#10B981',
    warning: '#F97316',
    danger: '#FF3B30',
    info: '#06B6D4',
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
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
              Statistiky operačních sálů <span className="text-white/20">& analýzy</span>
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
                  style={{ borderColor: 'rgba(255, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.8)', minWidth: '200px' }}
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
      </motion.header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {/* Overview Charts */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Total Operations Timeline */}
          <motion.div
            className="p-8 rounded-2xl border backdrop-blur-md"
            style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: colors.primary }} />
              Počet operací v čase
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="time" stroke="rgba(255, 255, 255, 0.5)" style={{ fontSize: '12px' }} />
                <YAxis stroke="rgba(255, 255, 255, 0.5)" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ background: 'rgba(0, 0, 0, 0.9)', border: `1px solid rgba(255, 255, 255, 0.1)`, borderRadius: '8px' }} />
                <Area type="monotone" dataKey="totalOperations" fill={colors.primary} stroke={colors.primary} fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Utilization Heatmap */}
          <motion.div
            className="p-8 rounded-2xl border backdrop-blur-md"
            style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" style={{ color: colors.success }} />
              Průměrné využití kapacity
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="time" stroke="rgba(255, 255, 255, 0.5)" style={{ fontSize: '12px' }} />
                <YAxis stroke="rgba(255, 255, 255, 0.5)" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ background: 'rgba(0, 0, 0, 0.9)', border: `1px solid rgba(255, 255, 255, 0.1)`, borderRadius: '8px' }} />
                <Bar dataKey="utilization" fill={colors.success} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Completed vs Cancelled */}
          <motion.div
            className="p-8 rounded-2xl border backdrop-blur-md"
            style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" style={{ color: colors.success }} />
              Dokončené vs Zrušené operace
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="time" stroke="rgba(255, 255, 255, 0.5)" style={{ fontSize: '12px' }} />
                <YAxis stroke="rgba(255, 255, 255, 0.5)" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ background: 'rgba(0, 0, 0, 0.9)', border: `1px solid rgba(255, 255, 255, 0.1)`, borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="completed" fill={colors.success} radius={[8, 8, 0, 0]} name="Dokončené" />
                <Bar dataKey="cancelled" fill={colors.danger} radius={[8, 8, 0, 0]} name="Zrušené" />
              </ComposedChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Pause Duration */}
          <motion.div
            className="p-8 rounded-2xl border backdrop-blur-md"
            style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <Pause className="w-5 h-5" style={{ color: colors.warning }} />
              Doba pauzy v sálech
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="time" stroke="rgba(255, 255, 255, 0.5)" style={{ fontSize: '12px' }} />
                <YAxis stroke="rgba(255, 255, 255, 0.5)" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ background: 'rgba(0, 0, 0, 0.9)', border: `1px solid rgba(255, 255, 255, 0.1)`, borderRadius: '8px' }} />
                <Line type="monotone" dataKey="pauseTime" stroke={colors.warning} strokeWidth={3} dot={false} name="Minuity pauzy" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>

        {/* Room Selection & Detailed Metrics */}
        <motion.div
          className="py-12 border-t"
          style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <h2 className="text-2xl font-black text-white mb-6">Detailní analýza jednotlivých sálů</h2>
          
          {/* Room Selector */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
            {rooms.map((room) => (
              <motion.button
                key={room.id}
                onClick={() => setSelectedRoomId(room.id)}
                className="p-4 rounded-xl border transition-all"
                style={{
                  borderColor: selectedRoomId === room.id ? colors.info : 'rgba(255, 255, 255, 0.1)',
                  background: selectedRoomId === room.id ? `${colors.info}20` : 'rgba(255, 255, 255, 0.04)',
                  boxShadow: selectedRoomId === room.id ? `0 0 20px ${colors.info}30` : 'none',
                }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="flex flex-col items-center gap-2">
                  <Building2 className="w-5 h-5" style={{ color: colors.primary }} />
                  <span className="text-sm font-bold text-white">{room.name}</span>
                  <span className="text-xs text-white/50">{room.department}</span>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Operation Cycles Detail */}
          {operationCycles.map((cycle, cycleIdx) => {
            const phases = calculatePhaseMetrics(cycle);
            const totalTime = Object.values(cycle).reduce((a, b) => a + b, 0);
            
            return (
              <motion.div
                key={cycleIdx}
                className="p-8 rounded-2xl border backdrop-blur-md mb-8"
                style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + cycleIdx * 0.1, duration: 0.4 }}
              >
                <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                  <Hourglass className="w-5 h-5" style={{ color: colors.primary }} />
                  Operační cyklus #{cycleIdx + 1} - Celkový čas: {Math.round(totalTime)} minut
                </h3>

                {/* Phase Breakdown Timeline */}
                <div className="space-y-3 mb-8">
                  {phases.map((phase, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + cycleIdx * 0.1 + idx * 0.05, duration: 0.3 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ background: phase.color }}
                          />
                          <span className="text-sm font-bold text-white">{phase.name}</span>
                        </div>
                        <div className="flex gap-4">
                          <span className="text-sm text-white/70">{phase.duration} min</span>
                          <span className="text-sm font-bold text-white/50" style={{ color: phase.color }}>
                            {phase.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: phase.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${phase.percentage}%` }}
                          transition={{ delay: 0.5 + cycleIdx * 0.1 + idx * 0.05 + 0.2, duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Volání → Příjezd', value: `${cycle.patientCallToArrival} min`, icon: Clock, color: '#A78BFA' },
                    { label: 'Příprava (Anestezie)', value: `${cycle.arrivalToAnesthesia + cycle.anesthesiaToStart} min`, icon: Zap, color: '#06B6D4' },
                    { label: 'Chirurgický čas', value: `${cycle.surgicalTime} min`, icon: AlertTriangle, color: '#FF3B30' },
                    { label: 'Ukončení & Úklid', value: `${cycle.endToAnesthesiaEnd + cycle.anesthesiaEndToCleanup + cycle.cleanupToReady} min`, icon: CheckCircle, color: '#34C759' },
                  ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                      <motion.div
                        key={idx}
                        className="p-4 rounded-xl border backdrop-blur-sm"
                        style={{
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          background: `${stat.color}10`,
                        }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 + cycleIdx * 0.1 + idx * 0.05, duration: 0.3 }}
                      >
                        <Icon className="w-4 h-4 mb-2" style={{ color: stat.color }} />
                        <p className="text-xs text-white/60 mb-1">{stat.label}</p>
                        <p className="text-lg font-black text-white">{stat.value}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Footer spacing */}
        <div className="pb-16" />
      </div>
    </div>
  );
};

export default StatisticsModule;
