import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Activity, 
  GripVertical, 
  Clock, 
  BarChart3,
  Eye,
  EyeOff,
  Info,
  Palette,
  Timer,
  CheckCircle2
} from 'lucide-react';
import { WORKFLOW_STEPS, STEP_DURATIONS } from '../constants';

export interface WorkflowStatus {
  id: number;
  title: string;
  organizer: string;
  status: string;
  color: string;
  defaultDuration: number;
  isActive: boolean;
  showInTimeline: boolean;
  showInStatistics: boolean;
  showInRoomDetail: boolean;
}

interface StatusesManagerProps {
  onStatusesChange?: (statuses: WorkflowStatus[]) => void;
}

const StatusesManager: React.FC<StatusesManagerProps> = ({ onStatusesChange }) => {
  // Initialize statuses from WORKFLOW_STEPS
  const [statuses, setStatuses] = useState<WorkflowStatus[]>(() => {
    // Try to load from localStorage first
    const saved = localStorage.getItem('workflowStatuses');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fall through to default
      }
    }
    
    // Create default statuses from WORKFLOW_STEPS
    return WORKFLOW_STEPS.map((step, index) => ({
      id: index,
      title: step.title,
      organizer: step.organizer,
      status: step.status,
      color: step.color,
      defaultDuration: STEP_DURATIONS[index] || 0,
      isActive: true,
      showInTimeline: true,
      showInStatistics: true,
      showInRoomDetail: true,
    }));
  });

  const [expandedStatus, setExpandedStatus] = useState<number | null>(null);

  // Save to localStorage and notify parent when statuses change
  useEffect(() => {
    localStorage.setItem('workflowStatuses', JSON.stringify(statuses));
    onStatusesChange?.(statuses);
  }, [statuses, onStatusesChange]);

  const toggleStatusActive = (id: number) => {
    setStatuses(prev => prev.map(s => 
      s.id === id ? { ...s, isActive: !s.isActive } : s
    ));
  };

  const toggleVisibility = (id: number, field: 'showInTimeline' | 'showInStatistics' | 'showInRoomDetail') => {
    setStatuses(prev => prev.map(s => 
      s.id === id ? { ...s, [field]: !s[field] } : s
    ));
  };

  const updateDuration = (id: number, duration: number) => {
    setStatuses(prev => prev.map(s => 
      s.id === id ? { ...s, defaultDuration: duration } : s
    ));
  };

  const activeCount = statuses.filter(s => s.isActive).length;
  const totalDuration = statuses.filter(s => s.isActive).reduce((sum, s) => sum + s.defaultDuration, 0);

  return (
    <div className="w-full">
      {/* Header */}
      <header className="flex flex-col items-center lg:items-start justify-between gap-6 mb-12">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <Activity className="w-4 h-4 text-[#A78BFA]" />
            <p className="text-[10px] font-black text-[#A78BFA] tracking-[0.4em] uppercase">STATUS MANAGEMENT</p>
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter uppercase leading-none">
            STATUSY <span className="text-white/20">WORKFLOW</span>
          </h1>
        </div>
        
        {/* Summary Stats */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <span className="text-xs text-white/40 mr-2">Aktivni statusy:</span>
            <span className="text-sm font-bold text-white">{activeCount} / {statuses.length}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <span className="text-xs text-white/40 mr-2">Celkova doba cyklu:</span>
            <span className="text-sm font-bold text-white">{totalDuration} min</span>
          </div>
        </div>
      </header>

      {/* Info Box */}
      <div className="mb-8 p-4 rounded-xl bg-[#A78BFA]/10 border border-[#A78BFA]/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#A78BFA] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-white/70">
              Aktivujte nebo deaktivujte jednotlive statusy workflow. Pouze aktivni statusy se budou zobrazovat 
              v detailu salu, na casove ose a budou zahrnuty do statistik vyuziti operacnich salu.
            </p>
          </div>
        </div>
      </div>

      {/* Status List */}
      <Reorder.Group 
        axis="y" 
        values={statuses} 
        onReorder={setStatuses}
        className="space-y-3"
      >
        {statuses.map((status) => (
          <Reorder.Item
            key={status.id}
            value={status}
            className="cursor-grab active:cursor-grabbing"
          >
            <motion.div
              layout
              className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                status.isActive 
                  ? 'bg-white/[0.04] border-white/10 hover:border-white/20' 
                  : 'bg-white/[0.02] border-white/5 opacity-60'
              }`}
            >
              {/* Main Row */}
              <div 
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => setExpandedStatus(expandedStatus === status.id ? null : status.id)}
              >
                {/* Drag Handle */}
                <div className="flex-shrink-0 text-white/20 hover:text-white/40 transition-colors">
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Color Indicator */}
                <div 
                  className="w-3 h-12 rounded-full flex-shrink-0"
                  style={{ backgroundColor: status.color }}
                />

                {/* Status Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`text-base font-bold truncate ${status.isActive ? 'text-white' : 'text-white/50'}`}>
                      {status.title}
                    </h3>
                    <span 
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: `${status.color}20`,
                        color: status.color
                      }}
                    >
                      {status.status}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 truncate">{status.organizer}</p>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-2 text-white/40">
                  <Timer className="w-4 h-4" />
                  <span className="text-sm font-medium">{status.defaultDuration} min</span>
                </div>

                {/* Active Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStatusActive(status.id);
                  }}
                  className={`w-12 h-7 rounded-full relative transition-all duration-300 ${
                    status.isActive 
                      ? 'bg-[#A78BFA]' 
                      : 'bg-white/10'
                  }`}
                >
                  <motion.div
                    className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
                    animate={{ left: status.isActive ? 'calc(100% - 24px)' : '4px' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              {/* Expanded Settings */}
              <AnimatePresence>
                {expandedStatus === status.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 border-t border-white/5">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        
                        {/* Duration Setting */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            Vychozi doba trvani
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="480"
                              value={status.defaultDuration}
                              onChange={(e) => updateDuration(status.id, parseInt(e.target.value) || 0)}
                              className="w-20 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#A78BFA]/50"
                            />
                            <span className="text-xs text-white/40">minut</span>
                          </div>
                        </div>

                        {/* Visibility Settings */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-2">
                            <Eye className="w-3 h-3" />
                            Viditelnost
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => toggleVisibility(status.id, 'showInTimeline')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                status.showInTimeline 
                                  ? 'bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30' 
                                  : 'bg-white/5 text-white/40 border border-white/10'
                              }`}
                            >
                              {status.showInTimeline ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              Timeline
                            </button>
                            <button
                              onClick={() => toggleVisibility(status.id, 'showInRoomDetail')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                status.showInRoomDetail 
                                  ? 'bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30' 
                                  : 'bg-white/5 text-white/40 border border-white/10'
                              }`}
                            >
                              {status.showInRoomDetail ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              Detail
                            </button>
                          </div>
                        </div>

                        {/* Statistics Toggle */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-2">
                            <BarChart3 className="w-3 h-3" />
                            Statistiky
                          </label>
                          <button
                            onClick={() => toggleVisibility(status.id, 'showInStatistics')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              status.showInStatistics 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-white/5 text-white/40 border border-white/10'
                            }`}
                          >
                            {status.showInStatistics ? <CheckCircle2 className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {status.showInStatistics ? 'Zahrnuto' : 'Vynechano'}
                          </button>
                        </div>

                        {/* Color Preview */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-2">
                            <Palette className="w-3 h-3" />
                            Barva statusu
                          </label>
                          <div 
                            className="flex items-center gap-3 px-3 py-2 rounded-lg border border-white/10"
                            style={{ backgroundColor: `${status.color}10` }}
                          >
                            <div 
                              className="w-6 h-6 rounded-lg"
                              style={{ backgroundColor: status.color }}
                            />
                            <span className="text-xs font-mono text-white/60">{status.color}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* Quick Actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={() => setStatuses(prev => prev.map(s => ({ ...s, isActive: true })))}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-white/60 hover:text-white hover:border-white/20 transition-all"
        >
          Aktivovat vse
        </button>
        <button
          onClick={() => setStatuses(prev => prev.map(s => ({ ...s, isActive: false })))}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-white/60 hover:text-white hover:border-white/20 transition-all"
        >
          Deaktivovat vse
        </button>
        <button
          onClick={() => {
            const defaultStatuses = WORKFLOW_STEPS.map((step, index) => ({
              id: index,
              title: step.title,
              organizer: step.organizer,
              status: step.status,
              color: step.color,
              defaultDuration: STEP_DURATIONS[index] || 0,
              isActive: true,
              showInTimeline: true,
              showInStatistics: true,
              showInRoomDetail: true,
            }));
            setStatuses(defaultStatuses);
          }}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-white/60 hover:text-white hover:border-white/20 transition-all"
        >
          Obnovit vychozi
        </button>
      </div>
    </div>
  );
};

export default StatusesManager;
