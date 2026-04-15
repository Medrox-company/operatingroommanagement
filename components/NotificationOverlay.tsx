'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserX, Clock, Bed, Car, Lightbulb } from 'lucide-react';

interface NotificationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSendNotification: (type: string) => void;
  roomName: string;
}

const notificationTypes = [
  {
    id: 'late_surgeon',
    label: 'Pozdní příchod operatéra',
    icon: UserX,
    color: '#ef4444',
  },
  {
    id: 'late_anesthesiologist',
    label: 'Pozdní příchod anesteziologa',
    icon: UserX,
    color: '#f97316',
  },
  {
    id: 'patient_not_ready',
    label: 'Nepřipravený pacient',
    icon: Bed,
    color: '#eab308',
  },
  {
    id: 'late_arrival',
    label: 'Pozdní příjezd',
    icon: Car,
    color: '#8b5cf6',
  },
  {
    id: 'suggest_solution',
    label: 'Navrhni řešení',
    icon: Lightbulb,
    color: '#10b981',
  },
];

const NotificationOverlay: React.FC<NotificationOverlayProps> = ({
  isOpen,
  onClose,
  onSendNotification,
  roomName,
}) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (typeId: string) => {
    setSelectedType(typeId);
    setIsSending(true);
    
    // Simulate sending notification
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onSendNotification(typeId);
    setIsSending(false);
    setSelectedType(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="notification-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 z-[200] flex items-center justify-center overflow-hidden"
      >
        {/* Background - same style as main app */}
        <div className="absolute inset-0 bg-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_transparent_25%,_rgba(0,0,0,0.95)_100%)]" />

        {/* Atmospheric Edge Glows */}
        <div 
          className="absolute -left-20 top-0 bottom-0 w-64 blur-[140px] z-10 opacity-20"
          style={{ backgroundColor: '#f97316' }}
        />
        <div 
          className="absolute -right-20 top-0 bottom-0 w-64 blur-[140px] z-10 opacity-20"
          style={{ backgroundColor: '#8b5cf6' }}
        />

        {/* Central glow */}
        <div 
          className="absolute w-[600px] h-[600px] rounded-full blur-[150px] opacity-10"
          style={{ backgroundColor: '#f97316' }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-8 sm:right-8 p-3 sm:p-4 hover:bg-white/10 rounded-2xl transition-all bg-white/5 border border-white/10 backdrop-blur-md z-50"
        >
          <X className="w-6 h-6 sm:w-8 sm:h-8 text-white/60" />
        </button>

        {/* Main content */}
        <div className="flex flex-col items-center relative z-10 px-4 w-full max-w-5xl">
          
          {/* Title section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-8 sm:mb-12 md:mb-16"
          >
            <p className="text-[10px] sm:text-[11px] font-black text-white/30 tracking-[0.5em] uppercase mb-4">
              ODESLAT NOTIFIKACI
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white">
              {roomName}
            </h2>
          </motion.div>

          {/* Notification circles */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-10">
            {notificationTypes.map((type, index) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              
              return (
                <motion.button
                  key={type.id}
                  onClick={() => handleSend(type.id)}
                  disabled={isSending}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative w-[100px] h-[100px] sm:w-[130px] sm:h-[130px] md:w-[160px] md:h-[160px] lg:w-[180px] lg:h-[180px] flex items-center justify-center rounded-full group focus:outline-none cursor-pointer disabled:cursor-wait"
                >
                  {/* Primary Background Glow */}
                  <div 
                    className="absolute inset-0 rounded-full blur-[60px] sm:blur-[80px] transition-all duration-700 opacity-20 group-hover:opacity-40"
                    style={{ backgroundColor: type.color }}
                  />

                  {/* Inner Glow Core */}
                  <div 
                    className="absolute inset-6 sm:inset-8 rounded-full blur-[40px] sm:blur-[60px] opacity-15 group-hover:opacity-30 transition-all duration-500"
                    style={{ backgroundColor: type.color }}
                  />

                  {/* Animated Ring */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 180 180" preserveAspectRatio="xMidYMid meet">
                    <circle cx="90" cy="90" r="85" fill="none" stroke="white" strokeWidth="1" className="opacity-5" />
                    <motion.circle 
                      cx="90" cy="90" r="85" fill="none"
                      stroke={type.color} strokeWidth="4" strokeLinecap="round"
                      strokeDasharray="534"
                      initial={{ strokeDashoffset: 534 }}
                      animate={{ strokeDashoffset: isSelected ? 0 : 534 * 0.15 }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      style={{ filter: `drop-shadow(0 0 10px ${type.color}80)` }}
                      className="opacity-70"
                    />
                  </svg>

                  {/* Pulsing Animation Ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-2"
                    style={{ borderColor: type.color }}
                    animate={{ 
                      scale: [1, 1.08, 1],
                      opacity: [0.3, 0.1, 0.3]
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.2
                    }}
                  />

                  {/* Center Content */}
                  <div className="text-center relative z-20 pointer-events-none flex flex-col items-center px-2">
                    <Icon 
                      className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white/80 group-hover:text-white transition-colors duration-300 mb-1 sm:mb-2" 
                      strokeWidth={1.5} 
                    />
                    <span className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-bold tracking-wide uppercase text-white/60 group-hover:text-white transition-colors duration-300 leading-tight text-center">
                      {type.label}
                    </span>
                  </div>

                  {/* Loading indicator */}
                  {isSelected && isSending && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-t-transparent"
                      style={{ borderColor: type.color }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Helper text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 sm:mt-12 text-[10px] sm:text-xs text-white/30 tracking-wider uppercase"
          >
            Vyberte typ notifikace pro odeslání managementu
          </motion.p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationOverlay;
