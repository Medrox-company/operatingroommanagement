'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Smartphone, FileText } from 'lucide-react';

interface NotificationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSendNotification: (type: string, customReason?: string) => Promise<void>;
  roomName: string;
}

const notifications = [
  {
    id: 'late_surgeon',
    label: 'Pozdní příchod operatéra',
    color: '#EF4444',
    icon: '👨‍⚕️',
  },
  {
    id: 'late_anesthesiologist',
    label: 'Pozdní příchod anesteziologa',
    color: '#F97316',
    icon: '💉',
  },
  {
    id: 'patient_not_ready',
    label: 'Nepřipravený pacient',
    color: '#EAB308',
    icon: '🏥',
  },
  {
    id: 'late_arrival',
    label: 'Pozdní příjezd',
    color: '#06B6D4',
    icon: '🚑',
  },
  {
    id: 'other_reason',
    label: 'Jiný důvod',
    color: '#8B5CF6',
    icon: '📝',
  },
];

export default function NotificationOverlay({ isOpen, onClose, onSendNotification, roomName }: NotificationOverlayProps) {
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomReasonModal, setShowCustomReasonModal] = useState(false);
  const [customReason, setCustomReason] = useState('');

  const handleNotificationClick = async (notificationId: string) => {
    if (notificationId === 'other_reason') {
      setShowCustomReasonModal(true);
      return;
    }

    setSelectedNotification(notificationId);
    setIsLoading(true);

    try {
      await onSendNotification(notificationId);
      setTimeout(() => {
        setSelectedNotification(null);
        onClose();
      }, 600);
    } catch (error) {
      console.error('Error sending notification:', error);
      setSelectedNotification(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomReasonSubmit = async () => {
    if (customReason.trim()) {
      setIsLoading(true);
      try {
        await onSendNotification('other_reason', customReason);
        setTimeout(() => {
          setCustomReason('');
          setShowCustomReasonModal(false);
          onClose();
        }, 600);
      } catch (error) {
        console.error('Error sending custom notification:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      {/* Main Notification Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="notification-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 z-[200] flex items-center justify-center overflow-hidden"
          >
            {/* Background */}
            <div className="absolute inset-0 bg-black" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_transparent_25%,_rgba(0,0,0,0.95)_100%)]" />

            {/* Atmospheric Edge Glows */}
            <div 
              className="absolute -left-20 top-0 bottom-0 w-64 blur-[140px] z-10 opacity-25"
              style={{ backgroundColor: '#8B5CF6' }}
            />
            <div 
              className="absolute -right-20 top-0 bottom-0 w-64 blur-[140px] z-10 opacity-30"
              style={{ backgroundColor: '#06B6D4' }}
            />

            {/* Main content */}
            <div className="flex flex-col items-center relative z-10 px-4">
              
              {/* Title section */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="text-center mb-12 md:mb-16"
              >
                <p className="text-[10px] sm:text-[11px] font-black text-white/30 tracking-[0.5em] uppercase mb-4">
                  ODESLAT NOTIFIKACI
                </p>
                <AnimatePresence mode="wait">
                  <motion.h2
                    key={roomName}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white"
                  >
                    {roomName}
                  </motion.h2>
                </AnimatePresence>
              </motion.div>

              {/* Notification Circles - 3 top, 2 bottom */}
              <div className="flex flex-col items-center gap-12 md:gap-16">
                {/* Top row - 3 circles */}
                <div className="flex items-center justify-center gap-8 sm:gap-12 md:gap-20">
                  {notifications.slice(0, 3).map((notif, idx) => (
                    <motion.button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif.id)}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + idx * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      disabled={isLoading}
                      className="relative w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] md:w-[200px] md:h-[200px] lg:w-[240px] lg:h-[240px] flex items-center justify-center rounded-full group focus:outline-none cursor-pointer disabled:opacity-50"
                    >
                      {/* Primary Background Glow */}
                      <div 
                        className="absolute inset-0 rounded-full blur-[100px] transition-all duration-700 opacity-25 group-hover:opacity-40"
                        style={{ backgroundColor: notif.color }}
                      />

                      {/* Inner Glow Core */}
                      <div 
                        className="absolute inset-10 rounded-full blur-[80px] opacity-20 group-hover:opacity-35 transition-all duration-500"
                        style={{ backgroundColor: notif.color }}
                      />

                      {/* Animated Ring */}
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
                        <circle cx="150" cy="150" r="140" fill="none" stroke="white" strokeWidth="1" className="opacity-5" />
                        <motion.circle 
                          cx="150" cy="150" r="140" fill="none"
                          stroke={notif.color} strokeWidth="6" strokeLinecap="round"
                          strokeDasharray="880"
                          initial={{ strokeDashoffset: 880 }}
                          animate={{ strokeDashoffset: selectedNotification === notif.id ? 0 : 880 }}
                          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                          style={{ filter: `drop-shadow(0 0 15px ${notif.color}40)` }}
                          className="opacity-80"
                        />
                      </svg>

                      {/* Pulsing Animation Ring */}
                      <motion.div
                        className="absolute inset-0 rounded-full border-2"
                        style={{ borderColor: notif.color }}
                        animate={{ 
                          scale: [1, 1.08, 1],
                          opacity: [0.4, 0.1, 0.4]
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />

                      {/* Center Content - Centered */}
                      <div className="text-center relative z-20 pointer-events-none flex flex-col items-center justify-center h-full">
                        <div className="text-2xl sm:text-3xl md:text-4xl mb-2">
                          {notif.icon}
                        </div>
                        <p className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] font-bold tracking-[0.15em] uppercase text-white/80 px-2 leading-tight">
                          {notif.label}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Bottom row - 2 circles centered */}
                <div className="flex items-center justify-center gap-8 sm:gap-12 md:gap-20">
                  {notifications.slice(3, 5).map((notif, idx) => (
                    <motion.button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif.id)}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + idx * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      disabled={isLoading}
                      className="relative w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] md:w-[200px] md:h-[200px] lg:w-[240px] lg:h-[240px] flex items-center justify-center rounded-full group focus:outline-none cursor-pointer disabled:opacity-50"
                    >
                      {/* Primary Background Glow */}
                      <div 
                        className="absolute inset-0 rounded-full blur-[100px] transition-all duration-700 opacity-25 group-hover:opacity-40"
                        style={{ backgroundColor: notif.color }}
                      />

                      {/* Inner Glow Core */}
                      <div 
                        className="absolute inset-10 rounded-full blur-[80px] opacity-20 group-hover:opacity-35 transition-all duration-500"
                        style={{ backgroundColor: notif.color }}
                      />

                      {/* Animated Ring */}
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
                        <circle cx="150" cy="150" r="140" fill="none" stroke="white" strokeWidth="1" className="opacity-5" />
                        <motion.circle 
                          cx="150" cy="150" r="140" fill="none"
                          stroke={notif.color} strokeWidth="6" strokeLinecap="round"
                          strokeDasharray="880"
                          initial={{ strokeDashoffset: 880 }}
                          animate={{ strokeDashoffset: selectedNotification === notif.id ? 0 : 880 }}
                          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                          style={{ filter: `drop-shadow(0 0 15px ${notif.color}40)` }}
                          className="opacity-80"
                        />
                      </svg>

                      {/* Pulsing Animation Ring */}
                      <motion.div
                        className="absolute inset-0 rounded-full border-2"
                        style={{ borderColor: notif.color }}
                        animate={{ 
                          scale: [1, 1.08, 1],
                          opacity: [0.4, 0.1, 0.4]
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />

                      {/* Center Content - Centered */}
                      <div className="text-center relative z-20 pointer-events-none flex flex-col items-center justify-center h-full">
                        <div className="text-2xl sm:text-3xl md:text-4xl mb-2">
                          {notif.icon}
                        </div>
                        <p className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] font-bold tracking-[0.15em] uppercase text-white/80 px-2 leading-tight">
                          {notif.label}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Reason Modal */}
      <AnimatePresence>
        {showCustomReasonModal && (
          <motion.div
            key="custom-reason-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-[300] flex items-center justify-center overflow-hidden"
            onClick={() => !isLoading && setShowCustomReasonModal(false)}
          >
            {/* Background */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 md:p-10 w-[90%] max-w-md"
            >
              {/* Close Button */}
              <button
                onClick={() => !isLoading && setShowCustomReasonModal(false)}
                disabled={isLoading}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-all disabled:opacity-50"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>

              {/* Title */}
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-6 mt-4">
                Zadejte důvod
              </h3>

              {/* Text Input */}
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Napište zde důvod notifikace..."
                disabled={isLoading}
                className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all resize-none disabled:opacity-50"
              />

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => !isLoading && setShowCustomReasonModal(false)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl transition-all disabled:opacity-50"
                >
                  Zrušit
                </button>
                <button
                  onClick={handleCustomReasonSubmit}
                  disabled={isLoading || !customReason.trim()}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all disabled:opacity-50 font-semibold"
                >
                  {isLoading ? 'Odesílám...' : 'Odeslat'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
