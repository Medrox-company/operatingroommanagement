'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, AlertCircle, Clock, Zap, MessageSquare, Loader2 } from 'lucide-react';

interface NotificationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSendNotification: (type: string, customReason?: string) => Promise<void>;
  roomName: string;
}

interface CustomReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  loading: boolean;
}

const CustomReasonModal: React.FC<CustomReasonModalProps> = ({ isOpen, onClose, onSubmit, loading }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (reason.trim()) {
      await onSubmit(reason.trim());
      setReason('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-black/95 border border-white/10 rounded-2xl p-6 max-w-md w-full backdrop-blur-md"
          >
            <h3 className="text-xl font-bold text-white mb-4">Zadejte důvod notifikace</h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Napište důvod..."
              className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-purple-500/50 transition-all resize-none mb-4"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
              >
                Zrušit
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason.trim() || loading}
                className="flex-1 px-4 py-3 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Poslat
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function NotificationOverlay({
  isOpen,
  onClose,
  onSendNotification,
  roomName,
}: NotificationOverlayProps) {
  const [loading, setLoading] = useState(false);
  const [customReasonOpen, setCustomReasonOpen] = useState(false);

  const notificationTypes = [
    {
      id: 'late_surgeon',
      key: 'notify_late_surgeon',
      label: 'Pozdní příchod operatéra',
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      borderColor: 'border-red-500/30',
      hoverColor: 'hover:border-red-500/50',
    },
    {
      id: 'late_anesthesiologist',
      key: 'notify_late_anesthesiologist',
      label: 'Pozdní příchod anesteziologa',
      icon: AlertTriangle,
      color: 'from-orange-500 to-orange-600',
      borderColor: 'border-orange-500/30',
      hoverColor: 'hover:border-orange-500/50',
    },
    {
      id: 'patient_not_ready',
      key: 'notify_patient_not_ready',
      label: 'Nepřipravený pacient',
      icon: AlertCircle,
      color: 'from-yellow-500 to-yellow-600',
      borderColor: 'border-yellow-500/30',
      hoverColor: 'hover:border-yellow-500/50',
    },
    {
      id: 'late_arrival',
      key: 'notify_late_arrival',
      label: 'Pozdní příjezd',
      icon: Clock,
      color: 'from-blue-500 to-blue-600',
      borderColor: 'border-blue-500/30',
      hoverColor: 'hover:border-blue-500/50',
    },
    {
      id: 'other_reason',
      key: 'notify_other',
      label: 'Jiný důvod',
      icon: Zap,
      color: 'from-purple-500 to-purple-600',
      borderColor: 'border-purple-500/30',
      hoverColor: 'hover:border-purple-500/50',
    },
  ];

  const handleSendNotification = async (typeKey: string, isOtherReason: boolean = false) => {
    if (isOtherReason) {
      setCustomReasonOpen(true);
    } else {
      setLoading(true);
      try {
        await onSendNotification(typeKey);
        onClose();
      } catch (error) {
        console.error('[v0] Error sending notification:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
          >
            {/* Background */}
            <div className="absolute inset-0 bg-black" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_transparent_25%,_rgba(0,0,0,0.95)_100%)]" />

            {/* Atmospheric Edge Glows */}
            <div 
              className="absolute -left-20 top-0 bottom-0 w-64 blur-[140px] z-10 opacity-25"
              style={{ backgroundColor: '#ef4444' }}
            />
            <div 
              className="absolute -right-20 top-0 bottom-0 w-64 blur-[140px] z-10 opacity-30"
              style={{ backgroundColor: '#10b981' }}
            />

            {/* Main content */}
            <div className="flex flex-col items-center relative z-10 px-4">
              
              {/* Title section */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
                className="text-center mb-12 md:mb-16"
              >
                <p className="text-[10px] sm:text-[11px] font-black text-white/30 tracking-[0.5em] uppercase mb-4">
                  POSLAT NOTIFIKACI
                </p>
                <motion.h2
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white"
                >
                  {roomName}
                </motion.h2>
              </motion.div>

              {/* Notifications Grid - 3 + 2 Layout */}
              <div className="flex flex-col items-center gap-12 md:gap-16">
                {/* First Row - 3 circles */}
                <div className="flex items-center gap-8 sm:gap-12 md:gap-20 lg:gap-32 justify-center flex-wrap">
                  {notificationTypes.slice(0, 3).map((notif, index) => {
                    const Icon = notif.icon;
                    return (
                      <motion.button
                        key={notif.id}
                        onClick={() => handleSendNotification(notif.key)}
                        disabled={loading}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        className="relative w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] md:w-[240px] md:h-[240px] lg:w-[300px] lg:h-[300px] flex items-center justify-center rounded-full group focus:outline-none cursor-pointer disabled:opacity-50"
                      >
                        {/* Primary Background Glow */}
                        <div 
                          className="absolute inset-0 rounded-full blur-[100px] transition-all duration-700 opacity-25 group-hover:opacity-40"
                          style={{ background: `linear-gradient(135deg, var(--glow-color))` }}
                        />

                        {/* SVG Circle */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 300 300">
                          <circle cx="150" cy="150" r="140" fill="none" stroke="white" strokeWidth="1" className="opacity-5" />
                          <motion.circle 
                            cx="150" cy="150" r="140" fill="none"
                            strokeWidth="6" strokeLinecap="round"
                            strokeDasharray="880"
                            initial={{ strokeDashoffset: 880 }}
                            animate={{ strokeDashoffset: 0 }}
                            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                            className="opacity-80"
                            style={{ 
                              stroke: notif.color === 'from-red-500 to-red-600' ? '#ef4444' : 
                                      notif.color === 'from-orange-500 to-orange-600' ? '#f97316' :
                                      notif.color === 'from-yellow-500 to-yellow-600' ? '#eab308' :
                                      notif.color === 'from-blue-500 to-blue-600' ? '#3b82f6' : '#a855f7',
                              filter: `drop-shadow(0 0 15px ${notif.color === 'from-red-500 to-red-600' ? 'rgba(239,68,68,0.5)' : 
                                                            notif.color === 'from-orange-500 to-orange-600' ? 'rgba(249,115,22,0.5)' :
                                                            notif.color === 'from-yellow-500 to-yellow-600' ? 'rgba(234,179,8,0.5)' :
                                                            notif.color === 'from-blue-500 to-blue-600' ? 'rgba(59,130,246,0.5)' : 'rgba(168,85,247,0.5)'})`
                            }}
                          />
                        </svg>

                        {/* Pulsing Animation Ring */}
                        <motion.div
                          className="absolute inset-0 rounded-full border-2"
                          style={{ borderColor: notif.color === 'from-red-500 to-red-600' ? '#ef4444' : 
                                               notif.color === 'from-orange-500 to-orange-600' ? '#f97316' :
                                               notif.color === 'from-yellow-500 to-yellow-600' ? '#eab308' :
                                               notif.color === 'from-blue-500 to-blue-600' ? '#3b82f6' : '#a855f7' }}
                          animate={{ 
                            scale: [1, 1.08, 1],
                            opacity: [0.4, 0.1, 0.4]
                          }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: 'easeInOut'
                          }}
                        />

                        {/* Center Content - Centered */}
                        <div className="text-center relative z-20 pointer-events-none flex flex-col items-center justify-center">
                          <motion.div
                            animate={{ scale: [1, 1.08, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          >
                            <Icon className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-white/90" />
                          </motion.div>
                          <p className="mt-3 sm:mt-4 text-[10px] sm:text-[11px] md:text-xs font-bold tracking-[0.15em] uppercase text-white/70 text-center leading-tight px-2">
                            {notif.label}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Second Row - 2 circles (centered) */}
                <div className="flex items-center gap-8 sm:gap-12 md:gap-20 lg:gap-32 justify-center">
                  {notificationTypes.slice(3).map((notif, index) => {
                    const Icon = notif.icon;
                    return (
                      <motion.button
                        key={notif.id}
                        onClick={() => handleSendNotification(notif.key, notif.id === 'other_reason')}
                        disabled={loading}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        className="relative w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] md:w-[240px] md:h-[240px] lg:w-[300px] lg:h-[300px] flex items-center justify-center rounded-full group focus:outline-none cursor-pointer disabled:opacity-50"
                      >
                        {/* Primary Background Glow */}
                        <div 
                          className="absolute inset-0 rounded-full blur-[100px] transition-all duration-700 opacity-30 group-hover:opacity-50"
                          style={{ background: `linear-gradient(135deg, var(--glow-color))` }}
                        />

                        {/* SVG Circle */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 300 300">
                          <circle cx="150" cy="150" r="140" fill="none" stroke="white" strokeWidth="1" className="opacity-5" />
                          <motion.circle 
                            cx="150" cy="150" r="140" fill="none"
                            strokeWidth="6" strokeLinecap="round"
                            strokeDasharray="880"
                            initial={{ strokeDashoffset: 880 }}
                            animate={{ strokeDashoffset: 0 }}
                            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                            className="opacity-90"
                            style={{ 
                              stroke: notif.color === 'from-red-500 to-red-600' ? '#ef4444' : 
                                      notif.color === 'from-orange-500 to-orange-600' ? '#f97316' :
                                      notif.color === 'from-yellow-500 to-yellow-600' ? '#eab308' :
                                      notif.color === 'from-blue-500 to-blue-600' ? '#3b82f6' : '#a855f7',
                              filter: `drop-shadow(0 0 15px ${notif.color === 'from-red-500 to-red-600' ? 'rgba(239,68,68,0.6)' : 
                                                            notif.color === 'from-orange-500 to-orange-600' ? 'rgba(249,115,22,0.6)' :
                                                            notif.color === 'from-yellow-500 to-yellow-600' ? 'rgba(234,179,8,0.6)' :
                                                            notif.color === 'from-blue-500 to-blue-600' ? 'rgba(59,130,246,0.6)' : 'rgba(168,85,247,0.6)'})`
                            }}
                          />
                        </svg>

                        {/* Pulsing Animation Rings */}
                        <motion.div
                          className="absolute inset-0 rounded-full border-2"
                          style={{ borderColor: notif.color === 'from-red-500 to-red-600' ? '#ef4444' : 
                                               notif.color === 'from-orange-500 to-orange-600' ? '#f97316' :
                                               notif.color === 'from-yellow-500 to-yellow-600' ? '#eab308' :
                                               notif.color === 'from-blue-500 to-blue-600' ? '#3b82f6' : '#a855f7' }}
                          animate={{ 
                            scale: [1, 1.08, 1],
                            opacity: [0.5, 0.15, 0.5]
                          }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: 'easeInOut'
                          }}
                        />

                        <motion.div
                          className="absolute inset-0 rounded-full border"
                          style={{ borderColor: notif.color === 'from-purple-500 to-purple-600' ? 'rgba(168,85,247,0.3)' : 'rgba(100,100,200,0.3)' }}
                          animate={{ 
                            scale: [1, 1.15, 1],
                            opacity: [0.3, 0, 0.3]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeOut',
                            delay: 0.5
                          }}
                        />

                        {/* Center Content - Centered */}
                        <div className="text-center relative z-20 pointer-events-none flex flex-col items-center justify-center">
                          <motion.div
                            animate={{ scale: [1, 1.08, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          >
                            <Icon className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-white/90" />
                          </motion.div>
                          <p className="mt-3 sm:mt-4 text-[10px] sm:text-[11px] md:text-xs font-bold tracking-[0.15em] uppercase text-white/70 text-center leading-tight px-2">
                            {notif.label}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Close Button */}
              <motion.button
                onClick={onClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-16 md:mt-24 p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Reason Modal */}
      <CustomReasonModal
        isOpen={customReasonOpen}
        onClose={() => setCustomReasonOpen(false)}
        onSubmit={async (reason) => {
          setLoading(true);
          try {
            await onSendNotification('notify_other', reason);
            setCustomReasonOpen(false);
            onClose();
          } catch (error) {
            console.error('[v0] Error sending custom notification:', error);
          } finally {
            setLoading(false);
          }
        }}
        loading={loading}
      />
    </>
  );
}
