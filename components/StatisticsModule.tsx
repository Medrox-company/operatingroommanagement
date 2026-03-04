import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Calendar, TrendingUp, Users, Clock, Building2, Activity, ChevronDown } from 'lucide-react';
import { OperatingRoom } from '../types';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface StatisticsModuleProps {
  rooms?: OperatingRoom[];
}

type TimePeriod = 'day' | 'week' | 'month' | 'year';

const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms = [] }) => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  // Generuj mock data pro různé časové období
  const generateChartData = (period: TimePeriod) => {
    if (period === 'day') {
      return Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        operations: Math.floor(Math.random() * 12) + 2,
        utilization: Math.floor(Math.random() * 40) + 60,
        staff: Math.floor(Math.random() * 20) + 15,
      }));
    } else if (period === 'week') {
      const days = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
      return days.map((day, i) => ({
        time: day,
        operations: Math.floor(Math.random() * 80) + 20,
        utilization: Math.floor(Math.random() * 40) + 60,
        staff: Math.floor(Math.random() * 30) + 40,
      }));
    } else if (period === 'month') {
      return Array.from({ length: 30 }, (_, i) => ({
        time: `${i + 1}`,
        operations: Math.floor(Math.random() * 150) + 50,
        utilization: Math.floor(Math.random() * 40) + 60,
        staff: Math.floor(Math.random() * 40) + 60,
      }));
    } else {
      const months = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];
      return months.map(month => ({
        time: month,
        operations: Math.floor(Math.random() * 2000) + 1000,
        utilization: Math.floor(Math.random() * 30) + 65,
        staff: Math.floor(Math.random() * 200) + 800,
      }));
    }
  };

  const chartData = useMemo(() => generateChartData(timePeriod), [timePeriod]);

  // Department breakdown
  const departmentData = [
    { name: 'Chirurgie', value: 35, color: '#818CF8' },
    { name: 'Traumatologie', value: 25, color: '#06B6D4' },
    { name: 'Ortopedie', value: 20, color: '#10B981' },
    { name: 'Neurochirurgie', value: 15, color: '#F97316' },
    { name: 'Jiné', value: 5, color: '#64748B' },
  ];

  // Room statistics
  const roomStats = [
    { name: 'Sál 1', operations: 245, utilization: 92, status: 'active', department: 'Chirurgie' },
    { name: 'Sál 2', operations: 198, utilization: 88, status: 'active', department: 'Traumatologie' },
    { name: 'Sál 3', operations: 167, utilization: 78, status: 'paused', department: 'Ortopedie' },
    { name: 'Sál 4', operations: 134, utilization: 65, status: 'idle', department: 'Chirurgie' },
    { name: 'Sál 5', operations: 89, utilization: 45, status: 'idle', department: 'Neurochirurgie' },
    { name: 'Sál 6', operations: 256, utilization: 98, status: 'active', department: 'Chirurgie' },
  ];

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
    { label: 'Tento rok', value: 'year' },
  ];

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
              <p className="text-[10px] font-black text-white/60 tracking-[0.4em] uppercase">Analýzy a Metriky</p>
            </div>
            <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
              Statistiky <span className="text-white/20">operačních sálů</span>
            </h1>
          </div>

          {/* Time Period Selector */}
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
        {/* Main Charts Grid */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Operations Over Time */}
          <motion.div
            className="p-8 rounded-2xl border backdrop-blur-md"
            style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: colors.primary }} />
              Operace v čase
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="time" stroke="rgba(255, 255, 255, 0.5)" />
                <YAxis stroke="rgba(255, 255, 255, 0.5)" />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0, 0, 0, 0.9)',
                    border: `1px solid rgba(255, 255, 255, 0.1)`,
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
                />
                <Area type="monotone" dataKey="operations" fill={colors.primary} stroke={colors.primary} fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Utilization Rate */}
          <motion.div
            className="p-8 rounded-2xl border backdrop-blur-md"
            style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" style={{ color: colors.success }} />
              Využití kapacity
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="time" stroke="rgba(255, 255, 255, 0.5)" />
                <YAxis stroke="rgba(255, 255, 255, 0.5)" />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0, 0, 0, 0.9)',
                    border: `1px solid rgba(255, 255, 255, 0.1)`,
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
                />
                <Line type="monotone" dataKey="utilization" stroke={colors.success} strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Department Breakdown */}
          <motion.div
            className="p-8 rounded-2xl border backdrop-blur-md"
            style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" style={{ color: colors.warning }} />
              Rozdělení dle oborů
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={departmentData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0, 0, 0, 0.9)',
                    border: `1px solid rgba(255, 255, 255, 0.1)`,
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Staff Utilization */}
          <motion.div
            className="p-8 rounded-2xl border backdrop-blur-md"
            style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.04)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: colors.secondary }} />
              Personál v čase
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="time" stroke="rgba(255, 255, 255, 0.5)" />
                <YAxis stroke="rgba(255, 255, 255, 0.5)" />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0, 0, 0, 0.9)',
                    border: `1px solid rgba(255, 255, 255, 0.1)`,
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
                />
                <Bar dataKey="staff" fill={colors.secondary} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>

        {/* Department Legend */}
        <motion.div
          className="py-8 px-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <h3 className="text-lg font-black text-white mb-4">Operační obory</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {departmentData.map((dept, idx) => (
              <motion.button
                key={idx}
                onClick={() => setSelectedDepartment(dept.name)}
                className="p-3 rounded-lg border backdrop-blur-sm transition-all hover:scale-105"
                style={{
                  borderColor: selectedDepartment === dept.name ? dept.color : 'rgba(255, 255, 255, 0.1)',
                  background: selectedDepartment === dept.name ? `${dept.color}20` : 'rgba(255, 255, 255, 0.04)',
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: dept.color }} />
                  <span className="text-sm font-bold text-white">{dept.name}</span>
                </div>
                <span className="text-xs text-white/60 mt-1">{dept.value}%</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Room Details Table */}
        <motion.div
          className="py-12 border-t"
          style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <h2 className="text-2xl font-black text-white mb-6">Detailní přehled jednotlivých sálů</h2>
          <div className="space-y-3">
            {roomStats.map((room, idx) => (
              <motion.div
                key={idx}
                className="p-4 rounded-xl border backdrop-blur-sm"
                style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.05)' }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.05, duration: 0.4 }}
                whileHover={{ scale: 1.01, background: 'rgba(255, 255, 255, 0.08)' }}
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <div>
                    <span className="font-black text-white">{room.name}</span>
                    <span className="text-xs text-white/50 ml-2">{room.department}</span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-white/60">Operace</p>
                    <p className="text-lg font-black text-white">{room.operations}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-white/60">Využití</p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full" style={{ width: `${room.utilization}%`, background: colors.success, transition: 'width 0.3s' }} />
                      </div>
                      <span className="text-xs font-bold text-white">{room.utilization}%</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-white/60">Stav</p>
                    <span
                      className="text-xs font-bold px-2 py-1 rounded-full"
                      style={{
                        background: room.status === 'active' ? `${colors.success}20` : room.status === 'paused' ? `${colors.warning}20` : `rgba(255, 255, 255, 0.1)`,
                        color: room.status === 'active' ? colors.success : room.status === 'paused' ? colors.warning : 'rgba(255, 255, 255, 0.7)',
                      }}
                    >
                      {room.status === 'active' ? 'Aktivní' : room.status === 'paused' ? 'Pozastaveno' : 'Volné'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer spacing */}
        <div className="pb-16" />
      </div>
    </div>
  );
};

export default StatisticsModule;
