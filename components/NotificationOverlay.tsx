'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  Activity,
  BedDouble,
  Truck,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

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
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[300] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-black border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-white mb-2">Zadejte důvod</h3>
            <p className="text-white/40 text-sm mb-6">Popište důvod notifikace pro management</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Napište důvod notifikace..."
              className="w-full px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 transition-all resize-none mb-6 text-lg"
              rows={4}
              autoFocus
            />
            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all"
              >
                Zrušit
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason.trim() || loading}
                className="flex-1 px-6 py-4 bg-purple-500 text-white font-bold rounded-2xl hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Odeslat
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const NOTIFICATION_TYPES = [
  {
    id: 'notify_late_surgeon',
    label: 'Pozdní \npříchod \noperatéra',
    color: '#ef4444',
  },
  {
    id: 'notify_late_anesthesiologist',
    label: 'Pozdní \npříchod \nARO',
    color: '#f97316',
  },
  {
    id: 'notify_patient_not_ready',
    label: 'Nepřipravený\npacient',
    color: '#eab308',
  },
  {
    id: 'notify_late_arrival',
    label: 'Pozdní \npříjezd z oddělení',
    color: '#3b82f6',
  },
  {
    id: 'notify_other',
    label: 'Jiný důvod',
    color: '#a855f7',
  },
];

// Ikony používané v mobilní variantě (karty se seznamem akcí)
const MOBILE_ICON_MAP: Record<string, LucideIcon> = {
  notify_late_surgeon: Stethoscope,
  notify_late_anesthesiologist: Activity,
  notify_patient_not_ready: BedDouble,
  notify_late_arrival: Truck,
  notify_other: MessageSquare,
};

export default function NotificationOverlay({
  isOpen,
  onClose,
  onSendNotification,
  roomName,
}: NotificationOverlayProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [customReasonOpen, setCustomReasonOpen] = useState(false);

  const handleSendNotification = async (typeId: string) => {
    if (typeId === 'notify_other') {
      setCustomReasonOpen(true);
    } else {
      setLoading(typeId);
      try {
        await onSendNotification(typeId);
        onClose();
      } catch (error) {
        console.error('Error sending notification:', error);
      } finally {
        setLoading(null);
      }
    }
  };

  const firstRow = NOTIFICATION_TYPES.slice(0, 3);
  const secondRow = NOTIFICATION_TYPES.slice(3);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="notif-mobile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden fixed inset-0 z-[200] flex flex-col overflow-hidden"
            style={{
              background:
                'radial-gradient(120% 80% at 50% 0%, #0f1f3a 0%, #0a1528 45%, #050d18 100%)',
            }}
          >
            {/* Ambient glow — matching RoomDetail mobile */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                className="absolute -top-40 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full opacity-25"
                style={{ background: 'radial-gradient(circle, #00d4ff 0%, transparent 65%)' }}
              />
            </div>

            {/* Content */}
            <div
              className="relative z-10 flex flex-col h-full px-5 pt-4 overflow-y-auto hide-scrollbar"
              style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
            >
              {/* Header — ChevronLeft + centered title (same pattern as RoomDetail) */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={onClose}
                  className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 outline-none select-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <ChevronLeft className="w-[18px] h-[18px] text-white/70" strokeWidth={2} />
                </button>
                <div className="flex flex-col items-center flex-1 min-w-0 px-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/40 leading-none">
                    Poslat notifikaci
                  </p>
                  <h1 className="text-lg font-semibold text-white truncate mt-1.5 leading-none">
                    {roomName}
                  </h1>
                </div>
                {/* Spacer to keep title perfectly centered */}
                <div className="w-11 h-11 shrink-0" aria-hidden="true" />
              </div>

              {/* Section label */}
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40 mb-3 px-1">
                Typ notifikace
              </p>

              {/* List of notification actions — full-width cards */}
              <div className="flex flex-col gap-3">
                {NOTIFICATION_TYPES.map((notif, index) => {
                  const isLoading = loading === notif.id;
                  const Icon = MOBILE_ICON_MAP[notif.id] ?? MessageSquare;
                  const label = notif.label.replace(/\s+/g, ' ').trim();
                  const isDisabled = loading !== null && !isLoading;

                  return (
                    <motion.button
                      key={notif.id}
                      onClick={() => handleSendNotification(notif.id)}
                      disabled={loading !== null}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * index, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center gap-4 rounded-3xl p-5 outline-none select-none transition-all disabled:opacity-60"
                      style={{
                        background: `linear-gradient(135deg, ${notif.color}14 0%, rgba(255,255,255,0.02) 100%)`,
                        border: `1px solid ${notif.color}33`,
                        backdropFilter: 'blur(16px)',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {/* Colored icon tile */}
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${notif.color} 0%, ${notif.color}cc 100%)`,
                          boxShadow: `0 8px 24px -6px ${notif.color}55`,
                        }}
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 text-black/80 animate-spin" strokeWidth={2.25} />
                        ) : (
                          <Icon className="w-5 h-5 text-black/80" strokeWidth={2} />
                        )}
                      </div>

                      {/* Label */}
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[15px] font-semibold text-white leading-tight text-balance">
                          {label}
                        </p>
                      </div>

                      <ChevronRight
                        className="w-5 h-5 text-white/30 shrink-0"
                        strokeWidth={2}
                      />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="notif-desktop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="hidden md:flex fixed inset-0 z-[200] items-center justify-center overflow-hidden"
          >
            {/* Background - same style as main app */}
            <div className="absolute inset-0 bg-black" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_transparent_25%,_rgba(0,0,0,0.95)_100%)]" />

            {/* Atmospheric Edge Glows - matching main circle style */}
            <div 
              className="absolute -left-20 top-0 bottom-0 w-64 blur-[140px] z-10 opacity-20"
              style={{ backgroundColor: '#ef4444' }}
            />
            <div 
              className="absolute -right-20 top-0 bottom-0 w-64 blur-[140px] z-10 opacity-20"
              style={{ backgroundColor: '#a855f7' }}
            />

            {/* Central glow */}
            <div 
              className="absolute w-[800px] h-[800px] rounded-full blur-[200px] opacity-10"
              style={{ backgroundColor: '#3b82f6' }}
            />

            {/* Close button - top right */}
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8 h-10 w-10 sm:h-14 sm:w-14 md:h-20 md:w-20 lg:h-24 lg:w-24 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 opacity-40 hover:opacity-100 active:scale-95 transition-all z-20 outline-none select-none"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-white/60" />
            </button>

            {/* Main content */}
            <div className="flex flex-col items-center relative z-10 px-4">
              
              {/* Title section - matching app typography */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="text-center mb-8 md:mb-12"
              >
                <p className="text-[10px] sm:text-[11px] font-bold text-white/30 tracking-[0.5em] uppercase mb-4">
                  POSLAT NOTIFIKACI
                </p>
                <AnimatePresence mode="wait">
                  <motion.h2
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white"
                  >
                    {roomName}
                  </motion.h2>
                </AnimatePresence>
              </motion.div>

              {/* First Row - 3 circles */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-10 lg:gap-16 mb-4 sm:mb-6 md:mb-10 lg:mb-16">
                {firstRow.map((notif, index) => {
                  const isLoading = loading === notif.id;
                  return (
                    <motion.button
                      key={notif.id}
                      onClick={() => handleSendNotification(notif.id)}
                      disabled={loading !== null}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + index * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      className="relative w-[100px] h-[100px] sm:w-[140px] sm:h-[140px] md:w-[180px] md:h-[180px] lg:w-[220px] lg:h-[220px] flex items-center justify-center rounded-full group focus:outline-none cursor-pointer disabled:opacity-50"
                    >
                      {/* Primary Background Glow - matching main circle */}
                      <div 
                        className="absolute inset-0 rounded-full blur-[100px] transition-all duration-700 opacity-25 group-hover:opacity-40"
                        style={{ backgroundColor: notif.color }}
                      />

                      {/* Inner Glow Core */}
                      <div 
                        className="absolute inset-8 sm:inset-10 rounded-full blur-[80px] opacity-20 group-hover:opacity-35 transition-all duration-500"
                        style={{ backgroundColor: notif.color }}
                      />

                      {/* Animated Ring - matching main circle SVG style */}
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 220 220" preserveAspectRatio="xMidYMid meet">
                        <circle cx="110" cy="110" r="100" fill="none" stroke="white" strokeWidth="1" className="opacity-5" />
                        <motion.circle 
                          cx="110" cy="110" r="100" fill="none"
                          stroke={notif.color} strokeWidth="4" strokeLinecap="round"
                          strokeDasharray="628"
                          initial={{ strokeDashoffset: 628 }}
                          animate={{ strokeDashoffset: 0 }}
                          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                          style={{ filter: `drop-shadow(0 0 15px ${notif.color}80)` }}
                          className="opacity-80"
                        />
                      </svg>

                      {/* Pulsing Animation Ring - matching main circle */}
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

                      {/* Center Content - Text only, centered */}
                      <div className="absolute inset-0 flex items-center justify-center px-3 sm:px-4 md:px-5">
                        {isLoading ? (
                          <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white/90 animate-spin" />
                        ) : (
                          <span className="text-sm sm:text-base md:text-lg lg:text-xl font-bold tracking-wide uppercase text-white/80 group-hover:text-white transition-colors duration-300 text-center leading-tight whitespace-pre-line">
                            {notif.label}
                          </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Second Row - 2 circles (centered) */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-10 lg:gap-16">
                {secondRow.map((notif, index) => {
                  const isLoading = loading === notif.id;
                  return (
                    <motion.button
                      key={notif.id}
                      onClick={() => handleSendNotification(notif.id)}
                      disabled={loading !== null}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      className="relative w-[100px] h-[100px] sm:w-[140px] sm:h-[140px] md:w-[180px] md:h-[180px] lg:w-[220px] lg:h-[220px] flex items-center justify-center rounded-full group focus:outline-none cursor-pointer disabled:opacity-50"
                    >
                      {/* Primary Background Glow - matching main circle */}
                      <div 
                        className="absolute inset-0 rounded-full blur-[100px] transition-all duration-700 opacity-30 group-hover:opacity-50"
                        style={{ backgroundColor: notif.color }}
                      />

                      {/* Inner Glow Core */}
                      <div 
                        className="absolute inset-8 sm:inset-10 rounded-full blur-[80px] opacity-25 group-hover:opacity-40 transition-all duration-500"
                        style={{ backgroundColor: notif.color }}
                      />

                      {/* Animated Ring - matching main circle SVG style */}
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 220 220" preserveAspectRatio="xMidYMid meet">
                        <circle cx="110" cy="110" r="100" fill="none" stroke="white" strokeWidth="1" className="opacity-5" />
                        <motion.circle 
                          cx="110" cy="110" r="100" fill="none"
                          stroke={notif.color} strokeWidth="4" strokeLinecap="round"
                          strokeDasharray="628"
                          initial={{ strokeDashoffset: 628 }}
                          animate={{ strokeDashoffset: 0 }}
                          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                          style={{ filter: `drop-shadow(0 0 15px ${notif.color}99)` }}
                          className="opacity-90"
                        />
                      </svg>

                      {/* Pulsing Animation Ring - matching main circle */}
                      <motion.div
                        className="absolute inset-0 rounded-full border-2"
                        style={{ borderColor: notif.color }}
                        animate={{ 
                          scale: [1, 1.08, 1],
                          opacity: [0.5, 0.15, 0.5]
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />

                      {/* Second pulsing ring */}
                      <motion.div
                        className="absolute inset-0 rounded-full border"
                        style={{ borderColor: `${notif.color}50` }}
                        animate={{ 
                          scale: [1, 1.15, 1],
                          opacity: [0.3, 0, 0.3]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeOut",
                          delay: 0.5
                        }}
                      />

                      {/* Center Content - Text only, centered */}
                      <div className="absolute inset-0 flex items-center justify-center px-3 sm:px-4 md:px-5">
                        {isLoading ? (
                          <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white/90 animate-spin" />
                        ) : (
                          <span className="text-sm sm:text-base md:text-lg lg:text-xl font-bold tracking-wide uppercase text-white/80 group-hover:text-white transition-colors duration-300 text-center leading-tight whitespace-pre-line">
                            {notif.label}
                          </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Reason Modal */}
      <CustomReasonModal
        isOpen={customReasonOpen}
        onClose={() => setCustomReasonOpen(false)}
        onSubmit={async (reason) => {
          setLoading('notify_other');
          try {
            await onSendNotification('notify_other', reason);
            setCustomReasonOpen(false);
            onClose();
          } catch (error) {
            console.error('Error sending custom notification:', error);
          } finally {
            setLoading(null);
          }
        }}
        loading={loading === 'notify_other'}
      />
    </>
  );
}
