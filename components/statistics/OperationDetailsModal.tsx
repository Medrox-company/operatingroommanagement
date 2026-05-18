'use client';
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, User, Stethoscope, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { C, Card, KPIBlock, formatMinutes, formatPercent, formatNumber } from './shared';

interface OperationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation: any | null;
  room?: string;
}

export const OperationDetailsModal: React.FC<OperationDetailsModalProps> = ({
  isOpen,
  onClose,
  operation,
  room = 'Unknown',
}) => {
  if (!operation) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="max-h-[85vh] overflow-y-auto rounded-3xl max-w-xl w-full"
            style={{
              background: `linear-gradient(180deg, ${C.surface3} 0%, ${C.surface2} 100%)`,
              border: `1px solid ${C.borderActive}`,
              boxShadow: `0 20px 60px rgba(0,217,255,0.1)`,
            }}
          >
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 border-b" style={{ borderColor: C.border }}>
              <div>
                <h2 className="text-lg font-bold" style={{ color: C.textHi }}>Operation Details</h2>
                <p className="text-xs mt-1" style={{ color: C.muted }}>Room: {room}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ background: C.surfaceHover }}
              >
                <X size={18} color={C.text} />
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <Card title="Overview" accent={C.accent} className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: C.surface }}>
                    <span style={{ color: C.muted }}>Procedure</span>
                    <span className="font-semibold" style={{ color: C.text }}>
                      {operation.name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: C.surface }}>
                    <span style={{ color: C.muted }}>Patient</span>
                    <span className="font-semibold" style={{ color: C.text }}>
                      {operation.patientId || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: C.surface }}>
                    <span style={{ color: C.muted }}>Status</span>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: operation.status === 'completed' ? `${C.green}20` : `${C.orange}20`,
                        color: operation.status === 'completed' ? C.green : C.orange,
                      }}
                    >
                      {operation.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                </div>
              </Card>

              <Card title="Timing" accent={C.blue} className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: C.surface }}>
                    <span style={{ color: C.muted }}>Start Time</span>
                    <span className="font-semibold font-mono" style={{ color: C.text }}>
                      {operation.startTime || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: C.surface }}>
                    <span style={{ color: C.muted }}>Duration</span>
                    <span className="font-semibold" style={{ color: C.blue }}>
                      {formatMinutes(operation.duration || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: C.surface }}>
                    <span style={{ color: C.muted }}>End Time</span>
                    <span className="font-semibold font-mono" style={{ color: C.text }}>
                      {operation.endTime || 'N/A'}
                    </span>
                  </div>
                </div>
              </Card>

              <Card title="Staff & Equipment" accent={C.green} className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: C.surface }}>
                    <span style={{ color: C.muted }}>Lead Surgeon</span>
                    <span className="font-semibold" style={{ color: C.text }}>
                      {operation.surgeon || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: C.surface }}>
                    <span style={{ color: C.muted }}>Anesthetist</span>
                    <span className="font-semibold" style={{ color: C.text }}>
                      {operation.anesthetist || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: C.surface }}>
                    <span style={{ color: C.muted }}>Staff Count</span>
                    <span className="font-semibold" style={{ color: C.text }}>
                      {operation.staffCount || 0}
                    </span>
                  </div>
                </div>
              </Card>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="w-full py-3 rounded-xl font-semibold transition-all"
                style={{
                  background: C.accent,
                  color: C.bg,
                }}
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OperationDetailsModal;
