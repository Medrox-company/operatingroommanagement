import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Calendar, TrendingUp, Clock, Building2, Activity, ChevronDown, Zap, Target } from 'lucide-react';
import { OperatingRoom } from '../types';
import { WORKFLOW_STEPS, MOCK_ROOMS } from '../constants';
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
    { phase: 'Přijezd→Anestezie', duration: 12, color: '#818CF8', label: 'Příprava' },
    { phase: 'Anestezie→Výkon', duration: 8, color: '#A855F7', label: 'Anestezie' },
    { phase: 'Chirurgický výkon', duration: 95, color: '#06B6D4', label: 'Výkon' },
    { phase: 'Výkon→Konec anestezie', duration: 15, color: '#10B981', label: 'Probuzení' },
    { phase: 'Anestezie→Úklid', duration: 10, color: '#F97316', label: 'Podchyt' },
    { phase: 'Úklid→Připraveno', duration: 20, color: '#FBBF24', label: 'Úklid' },
  ];

  const totalDuration = phaseData.reduce((sum, p) => sum + p.duration, 0);

  const radarData = [
    { metric: 'Časová efektivita', value: 89 },
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
    <div className="w-full h-full flex flex-col">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-shrink-0 pb-12 border-b"
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2 opacity-60">
              <BarChart3 className="w-4 h-4" style={{ color: colors.info }} />
              <p className="text-[10px] font-black text-white/60 tracking-[0.4em] uppercase">Pokročilé Analýzy</p>
            </div>
            <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
              Statistiky <span className="text-white/20">operačních sálů</span>
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
              <ChevronDown className="w-4 h-4 text-white/50" />
            </button>

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
          </motion.div>
        </div>

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

      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {selectedRoom && (
          <div className="space-y-8 py-8 px-2">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-4 gap-4"
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
                    style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * idx + 0.15, duration: 0.4 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Icon className="w-5 h-5" style={{ color: metric.color }} />
                      <span className="text-xs text-green-400 font-bold">+2.3%</span>
                    </div>
                    <p className="text-xs text-white/60 mb-1">{metric.label}</p>
                    <p className="text-2xl font-black text-white">{metric.value}</p>
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" style={{ color: colors.primary }} />
                Vytížení v čase
              </h2>
              <ResponsiveContainer width="100%" height={300}>
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

            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" style={{ color: colors.info }} />
                Heatmapa vytížení
              </h2>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="flex">
                    <div className="w-16" />
                    {Array.from({ length: 24 }, (_, i) => (
                      <div key={`h-${i}`} className="w-8 text-center text-xs text-white/40">
                        {i}h
                      </div>
                    ))}
                  </div>
                  {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((day, dayIdx) => (
                    <div key={`row-${dayIdx}`} className="flex">
                      <div className="w-16 flex items-center text-sm font-bold text-white">{day}</div>
                      {Array.from({ length: 24 }, (_, hourIdx) => {
                        const utilization = Math.floor(Math.random() * 100);
                        return (
                          <motion.div
                            key={`cell-${dayIdx}-${hourIdx}`}
                            className="w-8 h-8 rounded border border-white/10"
                            style={{ background: getHeatmapColor(utilization) }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.8 }}
                            transition={{ delay: dayIdx * 0.02 + hourIdx * 0.005 }}
                            title={`${utilization}%`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-4 mt-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: '#06B6D4' }} />
                  <span className="text-white/60">Nízké &lt;40%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: '#10B981' }} />
                  <span className="text-white/60">Normální 40-60%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: '#FBBF24' }} />
                  <span className="text-white/60">Vyšší 60-75%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: '#F97316' }} />
                  <span className="text-white/60">Vysoké 75-90%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: '#FF3B30' }} />
                  <span className="text-white/60">Kritické &gt;90%</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <h2 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5" style={{ color: colors.info }} />
                Rozpis fází operačního cyklu
              </h2>
              <div className="space-y-3">
                {phaseData.map((phase, idx) => {
                  const percentage = ((phase.duration / totalDuration) * 100).toFixed(1);
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.05, duration: 0.4 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ background: phase.color }} />
                          <span className="text-sm font-bold text-white">{phase.phase}</span>
                          <span className="text-xs text-white/40">({phase.label})</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-white">{phase.duration} min</span>
                          <span className="text-xs text-white/50 ml-2">({percentage}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: phase.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: 0.3 + idx * 0.05 + 0.2, duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" style={{ color: colors.secondary }} />
                Profil efektivnosti
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
                  <PolarAngleAxis dataKey="metric" stroke="rgba(255, 255, 255, 0.5)" fontSize={12} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="rgba(255, 255, 255, 0.3)" />
                  <Radar name="Efektivita" dataKey="value" stroke={colors.secondary} fill={colors.secondary} fillOpacity={0.3} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(0, 0, 0, 0.9)',
                      border: `1px solid rgba(255, 255, 255, 0.1)`,
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div
              className="p-6 rounded-2xl border backdrop-blur-sm"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" style={{ color: colors.warning }} />
                Srovnění sálů
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rooms.map(r => ({
                  name: r.name,
                  operations: r.operations24h,
                  utilization: Math.floor(Math.random() * 25) + 75,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.5)" fontSize={12} />
                  <YAxis stroke="rgba(255, 255, 255, 0.5)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(0, 0, 0, 0.9)',
                      border: `1px solid rgba(255, 255, 255, 0.1)`,
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
                  />
                  <Bar dataKey="operations" fill={colors.primary} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            <div className="pb-16" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsModule;
