import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, User, Zap } from 'lucide-react';
import { OperatingRoom } from '../types';

// Design colors - Medical theme
const COLORS = {
  cyan: '#06B6D4',
  green: '#10B981',
  slate: '#64748B',
};

interface HoverInfoPanelProps {
  room: OperatingRoom | null;
  isVisible: boolean;
}

export default function HoverInfoPanel({ room, isVisible }: HoverInfoPanelProps) {
  if (!room || !isVisible) return null;

  // Mock data — v budoucnu nahradit skutečnými daty
  const mockMetrics = {
    davinci: {
      label: 'DaVinci',
      values: {
        RRO: '120/np',
        BRO: '120/np',
        UVA: '78/nm',
        BIM: '3h 1m',
        ARO: '16.8',
        ROBUS: '+54',
      },
    },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed top-20 right-6 w-80 rounded-2xl overflow-hidden pointer-events-auto z-50"
          style={{
            background: `linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)`,
            border: `1.5px solid ${COLORS.cyan}30`,
            boxShadow: `0 10px 40px rgba(6, 182, 212, 0.2), inset 0 1px 0 rgba(255,255,255,0.05)`,
            backdropFilter: 'blur(20px)',
          }}
          initial={{ opacity: 0, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.95 }}
          transition={{ duration: 0.2, type: 'spring', stiffness: 300 }}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  background: room.currentStepIndex === 0 || room.currentStepIndex === 7
                    ? COLORS.green
                    : room.isActive ? COLORS.cyan : COLORS.slate,
                  boxShadow: `0 0 8px ${room.currentStepIndex === 0 || room.currentStepIndex === 7
                    ? COLORS.green : room.isActive ? COLORS.cyan : COLORS.slate}`,
                }}
              />
              <h3 className="text-sm font-bold text-white">{room.name}</h3>
            </div>
            <p className="text-xs text-white/40">{room.department}</p>
          </div>

          {/* Metrics Grid */}
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-white/60 mb-3 uppercase tracking-wider">
              {mockMetrics.davinci.label}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(mockMetrics.davinci.values).map(([key, value]) => (
                <div
                  key={key}
                  className="px-3 py-2 rounded-lg"
                  style={{
                    background: `${COLORS.cyan}08`,
                    border: `1px solid ${COLORS.cyan}20`,
                  }}
                >
                  <p className="text-[9px] font-bold text-white/60 mb-1">{key}</p>
                  <p className="text-xs font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Info Section */}
          <div className="px-5 pb-4 space-y-2">
            {room.patientArrivedAt && (
              <div className="flex items-center gap-2 text-[11px] text-white/70">
                <User className="w-3.5 h-3.5" style={{ color: COLORS.green }} />
                <span>Pacient na sále</span>
              </div>
            )}
            {room.currentStepIndex === 0 || room.currentStepIndex === 7 ? (
              <div className="flex items-center gap-2 text-[11px] text-white/70">
                <Activity className="w-3.5 h-3.5" style={{ color: COLORS.green }} />
                <span>Sál připraven</span>
              </div>
            ) : room.isActive ? (
              <div className="flex items-center gap-2 text-[11px] text-white/70">
                <Zap className="w-3.5 h-3.5" style={{ color: COLORS.cyan }} />
                <span>Operace probíhá</span>
              </div>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
