'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Clock, 
  BarChart3,
  Eye,
  EyeOff,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useWorkflowStatuses } from '../hooks/useWorkflowStatuses';

const StatusesManager: React.FC = () => {
  const { statuses, loading, error, updateStatus } = useWorkflowStatuses();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          <p className="text-white/50">Nacitani statusu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-400 mb-1">Chyba</h3>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const toggleActive = (id: string, currentValue: boolean) => {
    updateStatus(id, { is_active: !currentValue });
  };

  const toggleStatistics = (id: string, currentValue: boolean) => {
    updateStatus(id, { count_in_statistics: !currentValue });
  };

  const updateDuration = (id: string, duration: number) => {
    updateStatus(id, { default_duration: duration });
  };

  const updateColor = (id: string, color: string) => {
    updateStatus(id, { color });
  };

  const activeCount = statuses.filter(s => s.is_active).length;
  const statisticsCount = statuses.filter(s => s.is_active && s.count_in_statistics).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white/90 mb-2">Sprava Statusu Workflow</h1>
        <p className="text-white/50">Konfigurujte workflow statusy operacnich vykonu</p>
      </div>

      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-300/90">
            <p className="font-semibold mb-1">Jak to funguje:</p>
            <ul className="space-y-1 text-xs">
              <li>Aktivujte statusy, ktere chcete zobrazovat v aplikaci</li>
              <li>Aktivni statusy se zobrazi v Timeline modulu a detailu salu</li>
              <li>Zaskrtnete Pocita do statistik pro zahrnuti do vypoctu vyuziti</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="text-white/50 text-sm">Aktivni Statusy</p>
              <p className="text-2xl font-bold text-white">{activeCount} / {statuses.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-white/50 text-sm">Pocita do Statistik</p>
              <p className="text-2xl font-bold text-white">{statisticsCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-white/50 text-sm">Celkem Statusu</p>
              <p className="text-2xl font-bold text-white">{statuses.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white/80">Dostupne Statusy</h2>
        
        <AnimatePresence>
          {statuses.map((status, idx) => (
            <motion.div
              key={status.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: idx * 0.05 }}
              className={`rounded-lg border p-4 transition-colors ${
                status.is_active
                  ? 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
                  : 'bg-white/[0.02] border-white/5 opacity-70'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-white/60">{status.order_index + 1}</span>
                </div>

                <div className="flex-shrink-0">
                  <input
                    type="color"
                    value={status.color}
                    onChange={(e) => updateColor(status.id, e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer"
                    title="Barva statusu"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white/90">{status.name}</h3>
                  {status.description && (
                    <p className="text-sm text-white/50 truncate">{status.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Clock className="w-4 h-4 text-white/40" />
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={status.default_duration}
                    onChange={(e) => updateDuration(status.id, parseInt(e.target.value) || 0)}
                    className="w-16 bg-white/10 border border-white/20 rounded px-2 py-1 text-white/90 text-sm text-center focus:outline-none focus:border-white/40"
                    title="Vychozi doba trvani v minutach"
                  />
                  <span className="text-white/50 text-sm">min</span>
                </div>

                <button
                  onClick={() => toggleActive(status.id, status.is_active)}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    status.is_active
                      ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                      : 'bg-white/10 text-white/40 hover:bg-white/20'
                  }`}
                  title={status.is_active ? 'Deaktivovat' : 'Aktivovat'}
                >
                  {status.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => toggleStatistics(status.id, status.count_in_statistics)}
                  disabled={!status.is_active}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    status.is_active
                      ? status.count_in_statistics
                        ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                        : 'bg-white/10 text-white/40 hover:bg-white/20'
                      : 'bg-white/5 text-white/20 cursor-not-allowed'
                  }`}
                  title={status.count_in_statistics ? 'Vyloucit ze statistik' : 'Zahrnout do statistik'}
                >
                  <BarChart3 className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setExpandedId(expandedId === status.id ? null : status.id)}
                  className="p-2 rounded-lg bg-white/10 text-white/40 hover:bg-white/20 transition-colors flex-shrink-0"
                  title="Vice moznosti"
                >
                  <Activity className="w-5 h-5" />
                </button>
              </div>

              <AnimatePresence>
                {expandedId === status.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 pt-4 border-t border-white/10 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-white/50 mb-2">ID</p>
                        <p className="font-mono text-white/70 text-xs">{status.id}</p>
                      </div>
                      <div>
                        <p className="text-white/50 mb-2">Poradi</p>
                        <p className="text-white/90">{status.order_index + 1}. pozice</p>
                      </div>
                      <div>
                        <p className="text-white/50 mb-2">Barva</p>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: status.color }}></div>
                          <span className="font-mono text-white/70">{status.color}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-white/50 mb-2">Stav</p>
                        <p className="text-white/90">{status.is_active ? 'Aktivni' : 'Neaktivni'}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StatusesManager;
</content>
</invoke>
