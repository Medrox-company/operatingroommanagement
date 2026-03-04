import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Clock, AlertCircle, CheckCircle } from 'lucide-react';

const StatisticsModule: React.FC = () => {
  // Mock data
  const stats = useMemo(() => ({
    totalOperations: 1247,
    avgOperationTime: '2h 34m',
    emergencyCases: 23,
    staffUtilization: 87,
    roomUtilization: 92,
    completedToday: 156,
    pendingToday: 34,
    cancellations: 5,
    avgWaitTime: '18m',
    patientSatisfaction: 4.7,
  }), []);

  const statCards = [
    {
      title: 'Celkové operace',
      value: stats.totalOperations,
      change: '+12%',
      icon: BarChart3,
      color: '#0EA5E9',
    },
    {
      title: 'Průměrná doba',
      value: stats.avgOperationTime,
      change: '-5m',
      icon: Clock,
      color: '#A855F7',
    },
    {
      title: 'Nouzové případy',
      value: stats.emergencyCases,
      change: '+3',
      icon: AlertCircle,
      color: '#FF3B30',
    },
    {
      title: 'Využití sálů',
      value: `${stats.roomUtilization}%`,
      change: '+8%',
      icon: TrendingUp,
      color: '#10B981',
    },
    {
      title: 'Využití personálu',
      value: `${stats.staffUtilization}%`,
      change: '+4%',
      icon: Users,
      color: '#F97316',
    },
    {
      title: 'Spokojitost pacientů',
      value: `${stats.patientSatisfaction}/5`,
      change: '+0.2',
      icon: CheckCircle,
      color: '#06B6D4',
    },
  ];

  const dailyStats = [
    { label: 'Dokončené', value: stats.completedToday, color: '#10B981' },
    { label: 'Čekající', value: stats.pendingToday, color: '#F97316' },
    { label: 'Zrušené', value: stats.cancellations, color: '#FF3B30' },
  ];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with title in app style */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex-shrink-0 pb-12 border-b"
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
          <BarChart3 className="w-4 h-4 text-[#06B6D4]" />
          <p className="text-[10px] font-black text-[#06B6D4] tracking-[0.4em] uppercase">Analytics & Metrics</p>
        </div>
        <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
          Statistiky <span className="text-white/20">systému</span>
        </h1>
        <p className="text-sm text-white/50 mt-4">Přehled výkonu a klíčových metrik operačních sálů v reálném čase</p>
      </motion.header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {/* Stat Cards Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={idx}
                className="p-6 rounded-2xl border backdrop-blur-md transition-all cursor-pointer"
                style={{
                  background: `${card.color}10`,
                  borderColor: `${card.color}40`,
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx, duration: 0.4, ease: 'easeOut' }}
                whileHover={{
                  scale: 1.05,
                  background: `${card.color}20`,
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="p-3 rounded-lg"
                    style={{
                      background: `${card.color}20`,
                      borderLeft: `4px solid ${card.color}`,
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: card.color }} />
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-full"
                    style={{
                      color: card.color,
                      background: `${card.color}20`,
                    }}
                  >
                    {card.change}
                  </span>
                </div>
                <p className="text-white/70 text-sm mb-1">{card.title}</p>
                <p className="text-2xl font-black text-white">{card.value}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Daily Summary Section */}
        <motion.div
          className="py-12 border-t"
          style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-3xl font-black text-white mb-8 tracking-tight">
            Dnešní <span className="text-white/20">přehled</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {dailyStats.map((stat, idx) => (
              <motion.div
                key={idx}
                className="p-6 rounded-2xl border backdrop-blur-md"
                style={{
                  background: `${stat.color}10`,
                  borderColor: `${stat.color}40`,
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx + 0.4, duration: 0.4 }}
              >
                <p className="text-white/70 text-sm mb-3">{stat.label}</p>
                <div className="flex items-end gap-4">
                  <p
                    className="text-4xl font-black"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </p>
                  <div className="flex-1 h-24 rounded-lg overflow-hidden" style={{ background: `${stat.color}15` }}>
                    <div
                      className="w-full h-full transition-all"
                      style={{
                        background: `${stat.color}`,
                        opacity: 0.6,
                        height: `${(stat.value / Math.max(...dailyStats.map(s => s.value))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Detailed Metrics Section */}
        <motion.div
          className="py-12 pb-16 border-t"
          style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h2 className="text-3xl font-black text-white mb-8 tracking-tight">
            Detailní <span className="text-white/20">metriky</span>
          </h2>
          <div className="space-y-4">
            {[
              { label: 'Průměrná čekací doba', value: stats.avgWaitTime, max: 30 },
              { label: 'Volné kapacity sálů', value: '8%', max: 100 },
              { label: 'Kvalita služby', value: '95%', max: 100 },
            ].map((metric, idx) => (
              <motion.div
                key={idx}
                className="p-6 rounded-xl border backdrop-blur-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx + 0.6, duration: 0.4 }}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-white/70">{metric.label}</span>
                  <span className="text-white font-bold">{metric.value}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StatisticsModule;
