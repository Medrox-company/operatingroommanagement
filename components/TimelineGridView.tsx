'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom } from '../types';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface TimelineGridViewProps {
  rooms: OperatingRoom[];
  currentTime: Date;
}

// Operation type colors (left border color)
const OPERATION_TYPE_COLORS: Record<string, string> = {
  Functional: '#3B82F6',      // Blue
  Safety: '#F97316',          // Orange
  Training: '#8B5CF6',        // Purple
  Physical: '#EF4444',        // Red
  Technical: '#06B6D4',       // Cyan
  Operational: '#10B981',     // Green
  Closedescence: '#EC4899',   // Pink
};

const TimelineGridView: React.FC<TimelineGridViewProps> = ({ rooms, currentTime }) => {
  // Flatten all operations from all rooms for grid display
  const allOperations = useMemo(() => {
    const ops: any[] = [];
    
    rooms.forEach((room) => {
      if (room.schedule?.length) {
        room.schedule.forEach((schedule) => {
          if (schedule.steps?.length) {
            schedule.steps.forEach((step, stepIndex) => {
              ops.push({
                id: `${room.id}-${schedule.id}-${step.id}`,
                roomId: room.id,
                roomName: room.name,
                scheduleId: schedule.id,
                stepId: step.id,
                stepIndex,
                title: step.title || step.name || 'Operation',
                startTime: step.start_time,
                endTime: step.end_time,
                status: schedule.status,
                operationType: step.operationType || 'Operational',
                personnel: room.staff,
                emergencyFlag: room.emergencyFlag,
                locked: room.isLocked,
              });
            });
          }
        });
      }
    });
    
    return ops;
  }, [rooms]);

  // Format time string
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes}`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      active: '#10B981',
      pending: '#F59E0B',
      completed: '#6B7280',
      delayed: '#EF4444',
    };
    return statusMap[status?.toLowerCase()] || '#6B7280';
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Time header - Minimal */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-slate-900 to-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            All Operations {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </h2>
          <div className="flex gap-2">
            <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
              {allOperations.length} operations
            </span>
          </div>
        </div>
      </div>

      {/* Grid of operation cards */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {allOperations.map((op, idx) => {
            const typeColor = OPERATION_TYPE_COLORS[op.operationType] || OPERATION_TYPE_COLORS.Operational;
            const statusColor = getStatusColor(op.status);

            return (
              <motion.div
                key={op.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative overflow-hidden rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-all duration-200 cursor-pointer hover:shadow-lg"
                style={{
                  borderLeft: `4px solid ${typeColor}`,
                }}
                whileHover={{ y: -2, boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)' }}
              >
                {/* Emergency flag overlay */}
                {op.emergencyFlag && (
                  <div className="absolute top-2 right-2 z-10">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                )}

                {/* Card content */}
                <div className="p-4 flex flex-col h-full">
                  {/* Header: Type and Room */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                        {op.operationType}
                      </div>
                      <div className="text-xs text-slate-500">
                        {op.roomName}
                      </div>
                    </div>
                    {op.locked && (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>

                  {/* Operation title */}
                  <h3 className="text-sm font-medium text-slate-100 mb-3 line-clamp-2 group-hover:text-white transition-colors">
                    {op.title}
                  </h3>

                  {/* Time information */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                    <Clock className="w-3 h-3" />
                    <span>
                      {formatTime(op.startTime)} - {formatTime(op.endTime)}
                    </span>
                  </div>

                  {/* ID and Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-700/50 px-2 py-1 rounded">
                      {op.scheduleId}
                    </span>
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: statusColor }}
                      title={op.status}
                    />
                  </div>

                  {/* Personnel avatars */}
                  {op.personnel && (
                    <div className="flex gap-1 mt-3 pt-3 border-t border-slate-700">
                      {op.personnel.doctor?.name && (
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
                          <span className="text-[10px] font-semibold text-blue-400">D</span>
                        </div>
                      )}
                      {op.personnel.nurse?.name && (
                        <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                          <span className="text-[10px] font-semibold text-green-400">N</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {allOperations.length === 0 && (
          <div className="col-span-full flex items-center justify-center py-12">
            <p className="text-slate-400">No operations scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineGridView;
