"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, AlertTriangle, Stethoscope, Building2, 
  Clock, ChevronRight, ChevronLeft, Check, Zap
} from 'lucide-react';
import type { OperatingRoom } from '../types';

// NCEPOD Classification - mezinárodní standard pro klasifikaci urgentnosti
// (National Confidential Enquiry into Patient Outcome and Death)
export type UrgencyLevel = 'immediate' | 'urgent' | 'expedited' | 'elective';

export interface AcuteCaseData {
  // Výkon
  procedureName: string;
  estimatedDuration: number; // minutes
  urgency: UrgencyLevel;
  
  // Sál
  selectedRoomId: string;
  
  // Dodatečné info
  notes?: string;
}

interface AcuteCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: OperatingRoom[];
  onSubmit: (data: AcuteCaseData) => void;
}

export const URGENCY_CONFIG: Record<UrgencyLevel, { 
  label: string; 
  description: string;
  timeWindow: string;
  color: string;
  bgColor: string;
}> = {
  immediate: {
    label: 'EMERGENTNÍ',
    description: 'Bezprostřední ohrožení života',
    timeWindow: '< 1 hod',
    color: '#ef4444',
    bgColor: 'rgba(239,68,68,0.15)',
  },
  urgent: {
    label: 'URGENTNÍ',
    description: 'Akutní stav, hrozba poškození',
    timeWindow: '< 6 hod',
    color: '#f97316',
    bgColor: 'rgba(249,115,22,0.15)',
  },
  expedited: {
    label: 'ODLOŽITELNÝ',
    description: 'Brzké řešení nezbytné',
    timeWindow: '< 24 hod',
    color: '#eab308',
    bgColor: 'rgba(234,179,8,0.15)',
  },
  elective: {
    label: 'ELEKTIVNÍ',
    description: 'Plánovaný výkon',
    timeWindow: '> 24 hod',
    color: '#3b82f6',
    bgColor: 'rgba(59,130,246,0.15)',
  },
};

const C = {
  glass: 'rgba(255,255,255,0.04)',
  glassHover: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.08)',
  borderActive: 'rgba(255,255,255,0.2)',
  red: '#ef4444',
};

const AcuteCaseModal: React.FC<AcuteCaseModalProps> = ({ isOpen, onClose, rooms, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<AcuteCaseData>({
    procedureName: '',
    estimatedDuration: 60,
    urgency: 'urgent',
    selectedRoomId: '',
    notes: '',
  });

  const updateData = <K extends keyof AcuteCaseData>(key: K, value: AcuteCaseData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  // Step validation
  const canProceedStep1 = data.procedureName.trim().length > 0 && data.estimatedDuration > 0;
  const canSubmit = data.selectedRoomId.length > 0;

  // Sort rooms by suitability for acute case
  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      // Free rooms first (status === 0 = "Volný" / not started)
      const aFree = a.currentStepIndex === 0;
      const bFree = b.currentStepIndex === 0;
      if (aFree && !bFree) return -1;
      if (!aFree && bFree) return 1;
      // Then non-locked
      if (!a.isLocked && b.isLocked) return -1;
      if (a.isLocked && !b.isLocked) return 1;
      // Then non-emergency
      if (!a.isEmergency && b.isEmergency) return -1;
      if (a.isEmergency && !b.isEmergency) return 1;
      return 0;
    });
  }, [rooms]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(data);
    // Reset form
    setStep(1);
    setData({
      procedureName: '',
      estimatedDuration: 60,
      urgency: 'urgent',
      selectedRoomId: '',
      notes: '',
    });
  };

  const handleClose = () => {
    setStep(1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col"
          style={{
            background: 'rgba(11,17,32,0.98)',
            border: `1px solid ${C.border}`,
            boxShadow: `0 25px 80px rgba(0,0,0,0.6), 0 0 60px ${C.red}20`,
          }}
        >
          {/* Top accent bar */}
          <div 
            className="absolute top-0 left-0 right-0 h-px opacity-60"
            style={{ background: `linear-gradient(90deg, transparent, ${C.red}, transparent)` }}
          />

          {/* Header */}
          <div 
            className="flex-shrink-0 px-6 py-5 flex items-center justify-between"
            style={{ borderBottom: `1px solid ${C.border}` }}
          >
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ 
                  background: `${C.red}20`, 
                  border: `1.5px solid ${C.red}50`,
                  boxShadow: `0 0 16px ${C.red}30`,
                }}
              >
                <Zap className="w-5 h-5" style={{ color: C.red }} />
              </motion.div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Akutní výkon</h2>
                <p className="text-xs text-white/50 mt-0.5">Registrace a přiřazení na operační sál</p>
              </div>
            </div>
            <motion.button
              onClick={handleClose}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: C.glass, border: `1px solid ${C.border}` }}
            >
              <X className="w-5 h-5 text-white/60" />
            </motion.button>
          </div>

          {/* Step indicator */}
          <div className="flex-shrink-0 px-6 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${C.border}` }}>
            {[1, 2].map((s) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300"
                    style={{
                      background: step >= s ? `${C.red}25` : C.glass,
                      border: `1.5px solid ${step >= s ? `${C.red}60` : C.border}`,
                      color: step >= s ? C.red : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                  </div>
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${step >= s ? 'text-white/70' : 'text-white/30'}`}>
                    {s === 1 ? 'Výkon' : 'Sál'}
                  </span>
                </div>
                {s < 2 && (
                  <div 
                    className="flex-1 h-px transition-all duration-300"
                    style={{ background: step > s ? `${C.red}40` : C.border }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Content - scrollable */}
          <div className="flex-1 overflow-y-auto hide-scrollbar px-6 py-5">
            <AnimatePresence mode="wait">
              {/* STEP 1: Procedure & Urgency */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Stethoscope className="w-4 h-4 text-white/40" />
                    <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wider">Výkon &amp; Urgentnost</h3>
                  </div>

                  <FormField label="Název výkonu" required>
                    <input
                      type="text"
                      value={data.procedureName}
                      onChange={(e) => updateData('procedureName', e.target.value)}
                      placeholder="např. Apendektomie"
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-all"
                      style={{ background: C.glass, border: `1px solid ${C.border}` }}
                      autoFocus
                    />
                  </FormField>

                  <FormField label="Odhad trvání (minuty)" icon={Clock} required>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="15"
                        max="600"
                        step="15"
                        value={data.estimatedDuration}
                        onChange={(e) => updateData('estimatedDuration', parseInt(e.target.value) || 0)}
                        className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-all"
                        style={{ background: C.glass, border: `1px solid ${C.border}` }}
                      />
                      <div className="flex gap-1">
                        {[30, 60, 90, 120].map((min) => (
                          <button
                            key={min}
                            type="button"
                            onClick={() => updateData('estimatedDuration', min)}
                            className="px-3 py-3 rounded-xl text-xs font-bold transition-all hover:scale-105"
                            style={{
                              background: data.estimatedDuration === min ? `${C.red}20` : C.glass,
                              border: `1px solid ${data.estimatedDuration === min ? `${C.red}50` : C.border}`,
                              color: data.estimatedDuration === min ? C.red : 'rgba(255,255,255,0.6)',
                            }}
                          >
                            {min}m
                          </button>
                        ))}
                      </div>
                    </div>
                  </FormField>

                  {/* NCEPOD Urgency */}
                  <FormField label="Urgentnost (NCEPOD klasifikace)" icon={AlertTriangle}>
                    <div className="grid grid-cols-1 gap-2">
                      {(Object.keys(URGENCY_CONFIG) as UrgencyLevel[]).map((level) => {
                        const cfg = URGENCY_CONFIG[level];
                        const active = data.urgency === level;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => updateData('urgency', level)}
                            className="px-4 py-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.01] text-left"
                            style={{
                              background: active ? cfg.bgColor : C.glass,
                              border: `1.5px solid ${active ? `${cfg.color}60` : C.border}`,
                            }}
                          >
                            <div 
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: cfg.color, boxShadow: active ? `0 0 8px ${cfg.color}` : 'none' }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold" style={{ color: active ? cfg.color : 'rgba(255,255,255,0.85)' }}>
                                  {cfg.label}
                                </span>
                                <span 
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider"
                                  style={{ background: `${cfg.color}15`, color: cfg.color }}
                                >
                                  {cfg.timeWindow}
                                </span>
                              </div>
                              <p className="text-xs text-white/50 mt-0.5">{cfg.description}</p>
                            </div>
                            {active && <Check className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />}
                          </button>
                        );
                      })}
                    </div>
                  </FormField>

                  <FormField label="Poznámky">
                    <textarea
                      value={data.notes}
                      onChange={(e) => updateData('notes', e.target.value)}
                      placeholder="Dodatečné informace, alergie, požadavky..."
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-all resize-none"
                      style={{ background: C.glass, border: `1px solid ${C.border}` }}
                    />
                  </FormField>
                </motion.div>
              )}

              {/* STEP 2: Room selection */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-white/40" />
                    <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wider">Výběr operačního sálu</h3>
                  </div>

                  <p className="text-xs text-white/50">
                    Sály jsou seřazeny dle dostupnosti. Volné sály mají nejvyšší prioritu.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    {sortedRooms.map((room) => {
                      const isFree = room.currentStepIndex === 0;
                      const isLocked = room.isLocked;
                      const isCurrentEmergency = room.isEmergency;
                      const isSelected = data.selectedRoomId === room.id;
                      const disabled = isLocked;

                      return (
                        <button
                          key={room.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => updateData('selectedRoomId', room.id)}
                          className="px-4 py-3 rounded-xl text-left transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{
                            background: isSelected 
                              ? `${C.red}15` 
                              : isFree && !disabled 
                                ? 'rgba(16,185,129,0.06)' 
                                : C.glass,
                            border: `1.5px solid ${isSelected 
                              ? `${C.red}60` 
                              : isFree && !disabled 
                                ? 'rgba(16,185,129,0.3)' 
                                : C.border}`,
                            transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                          }}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-bold text-white">{room.name}</span>
                            {isSelected && <Check className="w-4 h-4" style={{ color: C.red }} />}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isFree && !disabled && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider" 
                                style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                                Volný
                              </span>
                            )}
                            {!isFree && !isLocked && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
                                style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>
                                Obsazen
                              </span>
                            )}
                            {isLocked && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
                                style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>
                                Uzamčen
                              </span>
                            )}
                            {isCurrentEmergency && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
                                style={{ background: 'rgba(239,68,68,0.15)', color: C.red }}>
                                Emergency
                              </span>
                            )}
                            <span className="text-[10px] text-white/40">{room.department}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Summary */}
                  {data.selectedRoomId && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 rounded-xl"
                      style={{ background: `${C.red}08`, border: `1px solid ${C.red}30` }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4" style={{ color: C.red }} />
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.red }}>
                          Souhrn akutního výkonu
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <SummaryRow label="Výkon" value={data.procedureName} />
                        <SummaryRow label="Trvání" value={`${data.estimatedDuration} min`} />
                        <SummaryRow label="Urgentnost" value={URGENCY_CONFIG[data.urgency].label} valueColor={URGENCY_CONFIG[data.urgency].color} />
                        <SummaryRow label="Sál" value={rooms.find(r => r.id === data.selectedRoomId)?.name || ''} />
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer with actions */}
          <div 
            className="flex-shrink-0 px-6 py-4 flex items-center justify-between gap-3"
            style={{ borderTop: `1px solid ${C.border}` }}
          >
            <button
              onClick={() => step === 1 ? handleClose() : setStep(step - 1)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white transition-all flex items-center gap-2 hover:bg-white/[0.04]"
            >
              {step === 1 ? (
                <>Zrušit</>
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  Zpět
                </>
              )}
            </button>

            {step < 2 ? (
              <motion.button
                onClick={() => setStep(step + 1)}
                disabled={!canProceedStep1}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(135deg, ${C.red} 0%, ${C.red}dd 100%)`,
                  color: 'white',
                  boxShadow: `0 4px 16px ${C.red}40`,
                }}
              >
                Další
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.button
                onClick={handleSubmit}
                disabled={!canSubmit}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(135deg, ${C.red} 0%, ${C.red}dd 100%)`,
                  color: 'white',
                  boxShadow: `0 4px 20px ${C.red}50`,
                }}
              >
                <Zap className="w-4 h-4" />
                Aktivovat akutní výkon
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper components

const FormField: React.FC<{ 
  label: string; 
  required?: boolean; 
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}> = ({ label, required, icon: Icon, children }) => (
  <div>
    <label className="flex items-center gap-1.5 mb-1.5">
      {Icon && <Icon className="w-3 h-3 text-white/40" />}
      <span className="text-[10px] font-semibold text-white/60 uppercase tracking-[0.15em]">
        {label}
        {required && <span className="ml-1" style={{ color: C.red }}>*</span>}
      </span>
    </label>
    {children}
  </div>
);

const SummaryRow: React.FC<{ label: string; value: string; valueColor?: string }> = ({ label, value, valueColor }) => (
  <div className="flex items-center justify-between">
    <span className="text-white/50">{label}</span>
    <span className="font-semibold" style={{ color: valueColor || 'rgba(255,255,255,0.9)' }}>{value}</span>
  </div>
);

export default AcuteCaseModal;
