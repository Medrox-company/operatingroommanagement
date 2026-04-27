"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  ClipboardList,
  Stethoscope,
  Activity,
  Bed,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  ChevronRight,
  MapPin,
  ArrowRight,
  Zap,
  ShieldAlert,
  Heart,
} from 'lucide-react';
import { OperatingRoom } from '../types';

// Premium color palette (matches global app theme)
const C = {
  bg: '#0B1120',
  glass: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.08)',
  accent: '#FBBF24',
  green: '#10B981',
  blue: '#3B82F6',
  red: '#EF4444',
  purple: '#A855F7',
  cyan: '#06B6D4',
  orange: '#F97316',
};

// Patient journey stages — modeled after Epic OpTime / Cerner SurgiNet / SIS workflow
type StageId = 'check_in' | 'pre_op' | 'in_or' | 'pacu' | 'discharge';
type Priority = 'routine' | 'urgent' | 'emergency';

interface PatientRecord {
  id: string;
  initials: string;
  age: number;
  sex: 'M' | 'F';
  procedure: string;
  surgeon: string;
  anesthesiologist?: string;
  stage: StageId;
  priority: Priority;
  roomId?: string;
  roomName?: string;
  arrivedAt: string;
  stageStartedAt: string;
  estimatedDuration: number;
  allergies?: string[];
  bloodType?: string;
  notes?: string;
  asaScore?: 1 | 2 | 3 | 4 | 5;
  npoStatus?: boolean;
  consentSigned?: boolean;
}

interface StageDefinition {
  id: StageId;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  icon: typeof Users;
  bgGradient: string;
}

const STAGES: StageDefinition[] = [
  {
    id: 'check_in',
    label: 'Příjem',
    shortLabel: 'CHECK-IN',
    description: 'Pacient přijat a zaregistrován',
    color: C.cyan,
    icon: ClipboardList,
    bgGradient: 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.02) 100%)',
  },
  {
    id: 'pre_op',
    label: 'Předoperační příprava',
    shortLabel: 'PRE-OP',
    description: 'Příprava před operací',
    color: C.blue,
    icon: Stethoscope,
    bgGradient: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.02) 100%)',
  },
  {
    id: 'in_or',
    label: 'Operační sál',
    shortLabel: 'OR',
    description: 'Probíhá operace',
    color: C.purple,
    icon: Activity,
    bgGradient: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(168,85,247,0.02) 100%)',
  },
  {
    id: 'pacu',
    label: 'Zotavovna (PACU)',
    shortLabel: 'PACU',
    description: 'Pooperační zotavení',
    color: C.accent,
    icon: Bed,
    bgGradient: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.02) 100%)',
  },
  {
    id: 'discharge',
    label: 'Propuštěn',
    shortLabel: 'DISCHARGE',
    description: 'Připraven k propuštění',
    color: C.green,
    icon: CheckCircle2,
    bgGradient: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.02) 100%)',
  },
];

const generateMockPatients = (rooms: OperatingRoom[]): PatientRecord[] => {
  const now = Date.now();
  const baseList: PatientRecord[] = [
    {
      id: 'p-001',
      initials: 'J.N.',
      age: 54,
      sex: 'M',
      procedure: 'Cholecystektomie laparoskopická',
      surgeon: 'MUDr. Procházka',
      stage: 'check_in',
      priority: 'routine',
      arrivedAt: new Date(now - 25 * 60 * 1000).toISOString(),
      stageStartedAt: new Date(now - 25 * 60 * 1000).toISOString(),
      estimatedDuration: 90,
      bloodType: 'A+',
      allergies: ['Penicilin'],
      asaScore: 2,
      consentSigned: true,
    },
    {
      id: 'p-002',
      initials: 'M.K.',
      age: 38,
      sex: 'F',
      procedure: 'Tonsilektomie',
      surgeon: 'MUDr. Svobodová',
      stage: 'check_in',
      priority: 'routine',
      arrivedAt: new Date(now - 12 * 60 * 1000).toISOString(),
      stageStartedAt: new Date(now - 12 * 60 * 1000).toISOString(),
      estimatedDuration: 45,
      bloodType: 'O+',
      asaScore: 1,
      consentSigned: true,
    },
    {
      id: 'p-003',
      initials: 'P.S.',
      age: 67,
      sex: 'M',
      procedure: 'Náhrada kyčelního kloubu',
      surgeon: 'MUDr. Novák',
      anesthesiologist: 'MUDr. Jelínek',
      stage: 'pre_op',
      priority: 'routine',
      arrivedAt: new Date(now - 75 * 60 * 1000).toISOString(),
      stageStartedAt: new Date(now - 35 * 60 * 1000).toISOString(),
      estimatedDuration: 60,
      bloodType: 'B+',
      allergies: ['Latex', 'Jód'],
      asaScore: 3,
      npoStatus: true,
      consentSigned: true,
    },
    {
      id: 'p-004',
      initials: 'A.D.',
      age: 29,
      sex: 'F',
      procedure: 'Apendektomie',
      surgeon: 'MUDr. Procházka',
      anesthesiologist: 'MUDr. Černá',
      stage: 'pre_op',
      priority: 'urgent',
      arrivedAt: new Date(now - 50 * 60 * 1000).toISOString(),
      stageStartedAt: new Date(now - 18 * 60 * 1000).toISOString(),
      estimatedDuration: 60,
      bloodType: 'AB+',
      asaScore: 2,
      npoStatus: true,
      consentSigned: true,
    },
    ...rooms
      .filter((r) => !r.isLocked && !r.isEmergency && r.currentPatient && r.currentStepIndex >= 2 && r.currentStepIndex <= 5)
      .slice(0, 3)
      .map((room, idx): PatientRecord => {
        const initials =
          room.currentPatient!.name
            .split(' ')
            .map((n) => n[0])
            .join('.')
            .toUpperCase() + '.';
        return {
          id: `p-or-${room.id}`,
          initials,
          age: room.currentPatient!.age,
          sex: idx % 2 === 0 ? 'F' : 'M',
          procedure: room.currentProcedure?.name || 'Chirurgický zákrok',
          surgeon: room.staff?.doctor?.name || 'MUDr. --',
          anesthesiologist: room.staff?.anesthesiologist?.name,
          stage: 'in_or',
          priority: 'routine',
          roomId: room.id,
          roomName: room.name,
          arrivedAt: new Date(now - 120 * 60 * 1000).toISOString(),
          stageStartedAt: room.operationStartedAt || new Date(now - 60 * 60 * 1000).toISOString(),
          estimatedDuration: room.currentProcedure?.estimatedDuration || 90,
          bloodType: room.currentPatient!.bloodType,
          asaScore: 2,
          npoStatus: true,
          consentSigned: true,
        };
      }),
    ...rooms
      .filter((r) => r.isEmergency && r.currentPatient)
      .slice(0, 1)
      .map((room): PatientRecord => ({
        id: `p-em-${room.id}`,
        initials:
          room.currentPatient!.name
            .split(' ')
            .map((n) => n[0])
            .join('.')
            .toUpperCase() + '.',
        age: room.currentPatient!.age,
        sex: 'M',
        procedure: 'EMERGENCY: Akutní výkon',
        surgeon: room.staff?.doctor?.name || 'Tým EMERGENCY',
        stage: 'in_or',
        priority: 'emergency',
        roomId: room.id,
        roomName: room.name,
        arrivedAt: new Date(now - 25 * 60 * 1000).toISOString(),
        stageStartedAt: new Date(now - 8 * 60 * 1000).toISOString(),
        estimatedDuration: 120,
        bloodType: room.currentPatient!.bloodType,
        asaScore: 4,
        npoStatus: false,
        consentSigned: true,
      })),
    {
      id: 'p-005',
      initials: 'V.H.',
      age: 45,
      sex: 'F',
      procedure: 'Hysterektomie',
      surgeon: 'MUDr. Dvořáková',
      anesthesiologist: 'MUDr. Jelínek',
      stage: 'pacu',
      priority: 'routine',
      arrivedAt: new Date(now - 240 * 60 * 1000).toISOString(),
      stageStartedAt: new Date(now - 35 * 60 * 1000).toISOString(),
      estimatedDuration: 60,
      bloodType: 'A+',
      asaScore: 2,
      npoStatus: true,
      consentSigned: true,
    },
    {
      id: 'p-006',
      initials: 'L.B.',
      age: 71,
      sex: 'M',
      procedure: 'Operace katarakty',
      surgeon: 'MUDr. Horák',
      anesthesiologist: 'MUDr. Černá',
      stage: 'pacu',
      priority: 'routine',
      arrivedAt: new Date(now - 180 * 60 * 1000).toISOString(),
      stageStartedAt: new Date(now - 20 * 60 * 1000).toISOString(),
      estimatedDuration: 30,
      bloodType: 'O-',
      asaScore: 3,
      npoStatus: true,
      consentSigned: true,
    },
    {
      id: 'p-007',
      initials: 'R.M.',
      age: 33,
      sex: 'M',
      procedure: 'Artroskopie kolene',
      surgeon: 'MUDr. Novák',
      stage: 'discharge',
      priority: 'routine',
      arrivedAt: new Date(now - 360 * 60 * 1000).toISOString(),
      stageStartedAt: new Date(now - 15 * 60 * 1000).toISOString(),
      estimatedDuration: 0,
      bloodType: 'A+',
      asaScore: 1,
      consentSigned: true,
    },
  ];
  return baseList;
};

const getElapsedTime = (timestamp: string): { text: string; minutes: number } => {
  const now = Date.now();
  const start = new Date(timestamp).getTime();
  const diffMin = Math.floor((now - start) / 60000);
  if (diffMin < 1) return { text: 'právě teď', minutes: 0 };
  if (diffMin < 60) return { text: `${diffMin} min`, minutes: diffMin };
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return { text: `${hours}h ${mins}m`, minutes: diffMin };
};

const getPriorityColor = (priority: Priority): string => {
  if (priority === 'emergency') return C.red;
  if (priority === 'urgent') return C.orange;
  return C.green;
};

const getPriorityLabel = (priority: Priority): string => {
  if (priority === 'emergency') return 'EMERGENCY';
  if (priority === 'urgent') return 'URGENT';
  return 'RUTINA';
};

const getAsaColor = (score?: number): string => {
  if (!score) return C.green;
  if (score <= 2) return C.green;
  if (score === 3) return C.accent;
  return C.red;
};

interface PatientCardProps {
  patient: PatientRecord;
  onClick: () => void;
  isSelected: boolean;
}

const PatientCard: React.FC<PatientCardProps> = ({ patient, onClick, isSelected }) => {
  const elapsed = getElapsedTime(patient.stageStartedAt);
  const priorityColor = getPriorityColor(patient.priority);
  const stage = STAGES.find((s) => s.id === patient.stage)!;
  const isOverdue = elapsed.minutes > patient.estimatedDuration && patient.estimatedDuration > 0;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="relative w-full text-left rounded-2xl p-3 backdrop-blur-md overflow-hidden group"
      style={{
        background: isSelected
          ? `linear-gradient(135deg, ${stage.color}20 0%, ${stage.color}05 100%)`
          : C.glass,
        border: isSelected ? `1.5px solid ${stage.color}55` : `1px solid ${C.border}`,
        boxShadow: isSelected
          ? `0 8px 24px ${stage.color}25, inset 0 1px 0 rgba(255,255,255,0.05)`
          : 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div
        className="absolute top-0 left-3 right-3 h-px opacity-50"
        style={{ background: `linear-gradient(90deg, transparent, ${priorityColor}, transparent)` }}
      />

      {patient.priority !== 'routine' && (
        <div
          className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider flex items-center gap-1"
          style={{
            background: `${priorityColor}20`,
            color: priorityColor,
            border: `1px solid ${priorityColor}40`,
          }}
        >
          {patient.priority === 'emergency' ? <Zap className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
          {getPriorityLabel(patient.priority)}
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm"
          style={{
            background: `${stage.color}20`,
            border: `1px solid ${stage.color}35`,
            color: stage.color,
          }}
        >
          {patient.initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-bold text-white tracking-tight">{patient.initials}</span>
            <span className="text-[10px] font-semibold text-white/40">
              {patient.age}
              {patient.sex === 'M' ? 'M' : 'Ž'}
            </span>
          </div>

          <p className="text-[11px] text-white/60 leading-tight line-clamp-1 mb-1.5">{patient.procedure}</p>

          <div className="flex items-center gap-1 mb-2">
            <Stethoscope className="w-3 h-3 text-white/30 shrink-0" />
            <span className="text-[10px] text-white/40 font-medium truncate">{patient.surgeon}</span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
            <div
              className="flex items-center gap-1 text-[10px] font-mono font-bold"
              style={{ color: isOverdue ? C.red : stage.color }}
            >
              <Clock className="w-2.5 h-2.5" />
              {elapsed.text}
            </div>
            <div className="flex items-center gap-1.5">
              {patient.roomName && (
                <div
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}
                >
                  <MapPin className="w-2.5 h-2.5" />
                  {patient.roomName}
                </div>
              )}
              {patient.asaScore && (
                <div
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                  style={{
                    background: `${getAsaColor(patient.asaScore)}18`,
                    color: getAsaColor(patient.asaScore),
                    border: `1px solid ${getAsaColor(patient.asaScore)}30`,
                  }}
                  title={`ASA Physical Status ${patient.asaScore}`}
                >
                  ASA {patient.asaScore}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
};

interface PatientDetailModalProps {
  patient: PatientRecord;
  onClose: () => void;
  onAdvance: () => void;
}

const PatientDetailModal: React.FC<PatientDetailModalProps> = ({ patient, onClose, onAdvance }) => {
  const stage = STAGES.find((s) => s.id === patient.stage)!;
  const stageIdx = STAGES.findIndex((s) => s.id === patient.stage);
  const nextStage = STAGES[stageIdx + 1];
  const elapsed = getElapsedTime(patient.stageStartedAt);
  const totalElapsed = getElapsedTime(patient.arrivedAt);
  const priorityColor = getPriorityColor(patient.priority);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl backdrop-blur-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(11,17,32,0.98) 0%, rgba(20,30,55,0.95) 100%)',
          border: `1px solid ${stage.color}30`,
          boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 32px ${stage.color}20, inset 0 1px 0 rgba(255,255,255,0.1)`,
        }}
      >
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base"
              style={{
                background: `${stage.color}20`,
                border: `1px solid ${stage.color}40`,
                color: stage.color,
              }}
            >
              {patient.initials}
            </div>
            <div>
              <p className="text-lg font-bold text-white">{patient.initials}</p>
              <p className="text-[11px] text-white/50">
                {patient.age} let &bull; {patient.sex === 'M' ? 'Muž' : 'Žena'} &bull; {patient.bloodType || '?'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label="Zavřít"
          >
            <ChevronRight className="w-5 h-5 text-white/60 rotate-90" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto hide-scrollbar">
          <div
            className="rounded-2xl p-4"
            style={{
              background: stage.bgGradient,
              border: `1px solid ${stage.color}30`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <stage.icon className="w-4 h-4" style={{ color: stage.color }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: stage.color }}>
                  AKTUÁLNÍ FÁZE
                </span>
              </div>
              <div
                className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                style={{
                  background: `${priorityColor}25`,
                  color: priorityColor,
                  border: `1px solid ${priorityColor}40`,
                }}
              >
                {getPriorityLabel(patient.priority)}
              </div>
            </div>
            <p className="text-base font-bold text-white">{stage.label}</p>
            <p className="text-[11px] text-white/50 mt-0.5">{stage.description}</p>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/40 mb-0.5">V této fázi</p>
                <p className="text-sm font-mono font-bold text-white">{elapsed.text}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/40 mb-0.5">Celkem v systému</p>
                <p className="text-sm font-mono font-bold text-white/70">{totalElapsed.text}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background: C.glass, border: `1px solid ${C.border}` }}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mb-2">VÝKON</p>
            <p className="text-sm font-semibold text-white mb-3">{patient.procedure}</p>

            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg" style={{ background: 'rgba(168,85,247,0.08)' }}>
                <Stethoscope className="w-3.5 h-3.5 text-purple-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] uppercase tracking-wider text-white/40">Chirurg</p>
                  <p className="text-xs font-semibold text-white truncate">{patient.surgeon}</p>
                </div>
              </div>
              {patient.anesthesiologist && (
                <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.08)' }}>
                  <Heart className="w-3.5 h-3.5 text-blue-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] uppercase tracking-wider text-white/40">Anesteziolog</p>
                    <p className="text-xs font-semibold text-white truncate">{patient.anesthesiologist}</p>
                  </div>
                </div>
              )}
              {patient.roomName && (
                <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)' }}>
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] uppercase tracking-wider text-white/40">Lokace</p>
                    <p className="text-xs font-semibold text-white truncate">{patient.roomName}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div
              className="rounded-xl p-3 text-center"
              style={{
                background: `${getAsaColor(patient.asaScore)}10`,
                border: `1px solid ${getAsaColor(patient.asaScore)}25`,
              }}
            >
              <p className="text-[8px] uppercase tracking-wider font-bold mb-1" style={{ color: `${getAsaColor(patient.asaScore)}99` }}>
                ASA SKÓRE
              </p>
              <p className="text-lg font-bold" style={{ color: getAsaColor(patient.asaScore) }}>
                {patient.asaScore || '?'}
              </p>
            </div>
            <div
              className="rounded-xl p-3 text-center"
              style={{
                background: patient.npoStatus ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                border: patient.npoStatus ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(245,158,11,0.25)',
              }}
            >
              <p
                className="text-[8px] uppercase tracking-wider font-bold mb-1"
                style={{ color: patient.npoStatus ? 'rgba(16,185,129,0.7)' : 'rgba(245,158,11,0.7)' }}
              >
                NPO
              </p>
              <p className="text-xs font-bold" style={{ color: patient.npoStatus ? C.green : C.accent }}>
                {patient.npoStatus ? 'OK' : '!'}
              </p>
            </div>
            <div
              className="rounded-xl p-3 text-center"
              style={{
                background: patient.consentSigned ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: patient.consentSigned ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(239,68,68,0.25)',
              }}
            >
              <p
                className="text-[8px] uppercase tracking-wider font-bold mb-1"
                style={{ color: patient.consentSigned ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)' }}
              >
                SOUHLAS
              </p>
              <p className="text-xs font-bold" style={{ color: patient.consentSigned ? C.green : C.red }}>
                {patient.consentSigned ? 'OK' : '!'}
              </p>
            </div>
          </div>

          {patient.allergies && patient.allergies.length > 0 && (
            <div
              className="rounded-2xl p-3"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-red-400">ALERGIE</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {patient.allergies.map((a) => (
                  <span
                    key={a}
                    className="px-2 py-1 rounded-md text-[10px] font-semibold"
                    style={{
                      background: 'rgba(239,68,68,0.18)',
                      color: '#FCA5A5',
                      border: '1px solid rgba(239,68,68,0.35)',
                    }}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {nextStage && (
            <button
              onClick={onAdvance}
              className="w-full rounded-2xl py-3.5 px-4 font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01]"
              style={{
                background: `linear-gradient(135deg, ${nextStage.color}30 0%, ${nextStage.color}15 100%)`,
                border: `1px solid ${nextStage.color}45`,
                color: nextStage.color,
                boxShadow: `0 4px 16px ${nextStage.color}25`,
              }}
            >
              <span>Posunout do fáze</span>
              <span className="font-bold">{nextStage.label}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

interface StageColumnProps {
  stage: StageDefinition;
  patients: PatientRecord[];
  selectedId: string | null;
  onPatientClick: (p: PatientRecord) => void;
}

const StageColumn: React.FC<StageColumnProps> = ({ stage, patients, selectedId, onPatientClick }) => {
  const Icon = stage.icon;
  const overdueCount = patients.filter(
    (p) => getElapsedTime(p.stageStartedAt).minutes > p.estimatedDuration && p.estimatedDuration > 0,
  ).length;

  return (
    <div
      className="flex flex-col rounded-2xl backdrop-blur-md flex-shrink-0 w-[300px] md:w-auto md:flex-1 md:min-w-[260px] h-full"
      style={{
        background: stage.bgGradient,
        border: `1px solid ${stage.color}25`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${stage.color}20` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${stage.color}25`, border: `1px solid ${stage.color}40` }}
          >
            <Icon className="w-4 h-4" style={{ color: stage.color }} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: `${stage.color}cc` }}>
              {stage.shortLabel}
            </p>
            <p className="text-xs font-semibold text-white truncate">{stage.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {overdueCount > 0 && (
            <div
              className="px-1.5 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-1"
              style={{
                background: 'rgba(239,68,68,0.18)',
                color: '#FCA5A5',
                border: '1px solid rgba(239,68,68,0.3)',
              }}
              title={`${overdueCount} pacientů přes čas`}
            >
              <AlertCircle className="w-2.5 h-2.5" />
              {overdueCount}
            </div>
          )}
          <div
            className="px-2 py-1 rounded-lg text-xs font-bold tabular-nums"
            style={{
              background: `${stage.color}20`,
              color: stage.color,
              border: `1px solid ${stage.color}35`,
              minWidth: '28px',
              textAlign: 'center',
            }}
          >
            {patients.length}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-3 space-y-2 min-h-[200px]">
        <AnimatePresence mode="popLayout">
          {patients.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 px-3"
            >
              <div
                className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)' }}
              >
                <Icon className="w-5 h-5 text-white/20" />
              </div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Žádní pacienti</p>
            </motion.div>
          ) : (
            patients.map((p) => (
              <PatientCard
                key={p.id}
                patient={p}
                isSelected={selectedId === p.id}
                onClick={() => onPatientClick(p)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: typeof Users;
  label: string;
  value: number;
  color: string;
  highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color, highlight }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2, scale: 1.01 }}
    className="rounded-2xl p-3 backdrop-blur-md flex items-center gap-3"
    style={{
      background: highlight
        ? `linear-gradient(135deg, ${color}18 0%, ${color}05 100%)`
        : C.glass,
      border: `1px solid ${highlight ? `${color}35` : C.border}`,
      boxShadow: highlight
        ? `0 4px 20px ${color}20, inset 0 1px 0 rgba(255,255,255,0.05)`
        : 'inset 0 1px 0 rgba(255,255,255,0.03)',
    }}
  >
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}20`, border: `1px solid ${color}30` }}
    >
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/45 leading-tight">{label}</p>
      <p className="text-xl font-bold tabular-nums leading-tight" style={{ color }}>
        {value}
      </p>
    </div>
  </motion.div>
);

interface PatientTrackingBoardProps {
  rooms: OperatingRoom[];
}

const PatientTrackingBoard: React.FC<PatientTrackingBoardProps> = ({ rooms }) => {
  const [patients, setPatients] = useState<PatientRecord[]>(() => generateMockPatients(rooms));
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);

  useEffect(() => {
    setPatients((prev) => {
      const fresh = generateMockPatients(rooms);
      const manualPatients = prev.filter((p) => !p.id.startsWith('p-or-') && !p.id.startsWith('p-em-'));
      const orPatients = fresh.filter((p) => p.id.startsWith('p-or-') || p.id.startsWith('p-em-'));
      const manualIds = new Set(manualPatients.map((p) => p.id));
      return [...manualPatients, ...orPatients.filter((p) => !manualIds.has(p.id))];
    });
  }, [rooms]);

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter((p) => {
      if (priorityFilter !== 'all' && p.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        p.initials.toLowerCase().includes(q) ||
        p.procedure.toLowerCase().includes(q) ||
        p.surgeon.toLowerCase().includes(q) ||
        (p.roomName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [patients, search, priorityFilter]);

  const stats = useMemo(() => {
    const now = Date.now();
    const totalActive = filteredPatients.filter((p) => p.stage !== 'discharge').length;
    const emergencies = filteredPatients.filter((p) => p.priority === 'emergency').length;
    const inOr = filteredPatients.filter((p) => p.stage === 'in_or').length;
    const overdue = filteredPatients.filter((p) => {
      const elapsed = (now - new Date(p.stageStartedAt).getTime()) / 60000;
      return elapsed > p.estimatedDuration && p.estimatedDuration > 0;
    }).length;
    return { totalActive, emergencies, inOr, overdue };
  }, [filteredPatients]);

  const handleAdvancePatient = () => {
    if (!selectedPatient) return;
    const currentIdx = STAGES.findIndex((s) => s.id === selectedPatient.stage);
    const nextStage = STAGES[currentIdx + 1];
    if (!nextStage) return;
    setPatients((prev) =>
      prev.map((p) =>
        p.id === selectedPatient.id
          ? { ...p, stage: nextStage.id, stageStartedAt: new Date().toISOString() }
          : p,
      ),
    );
    setSelectedPatient(null);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="px-4 sm:px-6 md:pl-32 md:pr-10 pt-6 md:pt-10 pb-4 flex-shrink-0">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-1">
              PATIENT TRACKING BOARD
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Sledování pacientů v reálném čase
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Centrální přehled cesty pacienta &mdash; Příjem &rarr; Pre-op &rarr; OR &rarr; PACU &rarr; Propuštění
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard icon={Users} label="AKTIVNÍ PACIENTI" value={stats.totalActive} color={C.cyan} />
          <StatCard icon={Activity} label="NA SÁLE" value={stats.inOr} color={C.purple} />
          <StatCard
            icon={AlertCircle}
            label="PŘES ČAS"
            value={stats.overdue}
            color={stats.overdue > 0 ? C.red : C.green}
            highlight={stats.overdue > 0}
          />
          <StatCard
            icon={Zap}
            label="EMERGENCY"
            value={stats.emergencies}
            color={stats.emergencies > 0 ? C.red : C.green}
            highlight={stats.emergencies > 0}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hledat pacienta, výkon, chirurga..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm text-white placeholder:text-white/30 backdrop-blur-md focus:outline-none"
              style={{
                background: C.glass,
                border: `1px solid ${C.border}`,
              }}
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-4 h-4 text-white/40" />
            {(['all', 'routine', 'urgent', 'emergency'] as const).map((p) => {
              const isActive = priorityFilter === p;
              const labels = { all: 'Vše', routine: 'Rutina', urgent: 'Urgent', emergency: 'Emergency' };
              const colors = { all: C.cyan, routine: C.green, urgent: C.orange, emergency: C.red };
              return (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all"
                  style={{
                    background: isActive ? `${colors[p]}20` : C.glass,
                    color: isActive ? colors[p] : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${isActive ? `${colors[p]}40` : C.border}`,
                  }}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden hide-scrollbar px-4 sm:px-6 md:pl-32 md:pr-10 pb-mobile-nav md:pb-10">
        <div className="flex md:grid md:grid-cols-5 gap-3 h-full pb-4 md:pb-0">
          {STAGES.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              patients={filteredPatients.filter((p) => p.stage === stage.id)}
              selectedId={selectedPatient?.id || null}
              onPatientClick={setSelectedPatient}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedPatient && (
          <PatientDetailModal
            patient={selectedPatient}
            onClose={() => setSelectedPatient(null)}
            onAdvance={handleAdvancePatient}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PatientTrackingBoard;
