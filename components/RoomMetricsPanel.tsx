import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { OperatingRoom } from '../types';
import { TrendingUp, Clock, Zap, Activity, Users, AlertCircle } from 'lucide-react';

interface RoomMetricsPanelProps {
  room: OperatingRoom;
  currentTime: Date;
  allRooms?: OperatingRoom[];
}

const RoomMetricsPanel: React.FC<RoomMetricsPanelProps> = ({ room, currentTime, allRooms = [] }) => {
  // Vypočítej metriky efektivity
  const metrics = useMemo(() => {
    // Operace za den
    const operationsToday = room.operations24h || 0;
    
    // Průměrná doba operace (minuty)
    const avgOperationTime = operationsToday > 0 ? Math.round(540 / operationsToday) : 0; // 540 = 9 hodin pracovní doby
    
    // Efektivita sálu (%)
    const efficiency = Math.round((operationsToday / 12) * 100); // 12 = max operací za den
    
    // Turnover time (minuty) - čas mezi operacemi
    const turnoverTime = 15; // Standard turnover time
    
    // Stav připravenosti (0-100%)
    let readinessScore = 100;
    if (room.currentStepIndex > 0) {
      readinessScore = Math.max(0, 100 - (room.currentStepIndex * 15));
    }
    
    // Staff dostupnost
    const staffCount = (room.staff?.doctor ? 1 : 0) + (room.staff?.nurse ? 1 : 0) + (room.staff?.anesthesiologist ? 1 : 0);
    
    return {
      operationsToday,
      avgOperationTime,
      efficiency,
      turnoverTime,
      readinessScore,
      staffCount,
    };
  }, [room]);

  const metricItems = [
    {
      icon: Activity,
      label: 'Operace dnes',
      value: metrics.operationsToday.toString(),
      unit: 'ks',
      color: '#06B6D4',
    },
    {
      icon: Clock,
      label: 'Průměr operace',
      value: metrics.avgOperationTime.toString(),
      unit: 'min',
      color: '#8B5CF6',
    },
    {
      icon: TrendingUp,
      label: 'Efektivita',
      value: metrics.efficiency.toString(),
      unit: '%',
      color: '#10B981',
    },
    {
      icon: Zap,
      label: 'Turnover čas',
      value: metrics.turnoverTime.toString(),
      unit: 'min',
      color: '#F59E0B',
    },
    {
      icon: AlertCircle,
      label: 'Připravenost',
      value: metrics.readinessScore.toString(),
      unit: '%',
      color: metrics.readinessScore > 75 ? '#10B981' : metrics.readinessScore > 50 ? '#F59E0B' : '#EF4444',
    },
    {
      icon: Users,
      label: 'Personál',
      value: metrics.staffCount.toString(),
      unit: 'osob',
      color: '#EC4899',
    },
  ];

  return (
    <motion.div
      className="p-4 space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h3 className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-4">Metriky efektivity</h3>
      
      <div className="grid grid-cols-2 gap-3">
        {metricItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={idx}
              className="p-3 rounded-lg border border-white/10 hover:border-white/20 transition-all"
              style={{
                background: `${item.color}08`,
              }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="flex items-start gap-2 mb-2">
                <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: item.color }} />
                <span className="text-[10px] text-white/60 font-medium leading-tight">{item.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-white">{item.value}</span>
                <span className="text-[10px] text-white/50">{item.unit}</span>
              </div>
              
              {/* Progress bar pro percentuální metriky */}
              {item.unit === '%' && (
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full"
                    style={{ background: item.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${parseInt(item.value)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Doporučení */}
      <motion.div
        className="mt-4 p-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-[10px] text-cyan-400 font-semibold mb-2">Doporučení</p>
        {metrics.efficiency < 50 && (
          <p className="text-[10px] text-white/70">Zvážit optimalizaci plánu operací pro zvýšení efektivity sálu.</p>
        )}
        {metrics.readinessScore < 50 && (
          <p className="text-[10px] text-white/70">Sál je zaneprázdněn. Očekávejte uvolnění za ~{Math.round((6 - metrics.readinessScore / 20) * 20)} minut.</p>
        )}
        {metrics.staffCount < 3 && (
          <p className="text-[10px] text-white/70">Chybí personál. Zvážit přivolání dalšího lékaře nebo sestry.</p>
        )}
        {metrics.efficiency >= 75 && metrics.readinessScore > 75 && metrics.staffCount === 3 && (
          <p className="text-[10px] text-white/70">Sál je optimálně využíván. Pokračujte v aktuálním plánu.</p>
        )}
      </motion.div>
    </motion.div>
  );
};

export default RoomMetricsPanel;
