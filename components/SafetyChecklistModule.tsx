"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ClipboardCheck,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  User,
  Activity,
  ChevronRight,
  ChevronDown,
  FileCheck,
  Search,
  Plus,
  X,
  TrendingUp,
} from 'lucide-react';
import { OperatingRoom } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Premium color palette matching app theme
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
};

// WHO Surgical Safety Checklist - 3 phases (official 2009 specification)
const CHECKLIST_PHASES = [
  {
    id: 'sign_in',
    name: 'SIGN IN',
    title: 'Před úvodem do anestezie',
    subtitle: 'Před aplikací anestezie',
    color: C.blue,
    icon: User,
    items: [
      { id: 'patient_confirmed', label: 'Pacient potvrdil identitu, lokalizaci, výkon a souhlas' },
      { id: 'site_marked', label: 'Operační místo je označeno' },
      { id: 'anesthesia_check', label: 'Bezpečnostní kontrola anesteziologického přístroje a léků dokončena' },
      { id: 'pulse_oximeter', label: 'Pulzní oxymetr je na pacientovi a funkční' },
      { id: 'allergies_known', label: 'Má pacient známou alergii?' },
      { id: 'difficult_airway', label: 'Riziko obtížné intubace nebo aspirace?' },
      { id: 'blood_loss_risk', label: 'Riziko krevní ztráty > 500 ml (7 ml/kg u dětí)?' },
    ],
  },
  {
    id: 'time_out',
    name: 'TIME OUT',
    title: 'Před chirurgickým řezem',
    subtitle: 'Před započetím operace',
    color: C.accent,
    icon: Clock,
    items: [
      { id: 'team_introduced', label: 'Všichni členové týmu se představili jménem a funkcí' },
      { id: 'patient_procedure_confirmed', label: 'Chirurg, anesteziolog a sestra potvrdili pacienta, lokalitu a výkon' },
      { id: 'antibiotic_prophylaxis', label: 'Antibiotická profylaxe podána v posledních 60 minutách?' },
      { id: 'critical_events_surgeon', label: 'Chirurg: kritické nebo neočekávané kroky, délka operace, předpokládaná krevní ztráta' },
      { id: 'critical_events_anesthesia', label: 'Anesteziolog: pacient-specifické obavy?' },
      { id: 'critical_events_nursing', label: 'Sestra: sterilita potvrzena (včetně výsledků indikátoru), problémy s vybavením?' },
      { id: 'imaging_displayed', label: 'Je zobrazen relevantní zobrazovací materiál?' },
    ],
  },
  {
    id: 'sign_out',
    name: 'SIGN OUT',
    title: 'Před opuštěním sálu',
    subtitle: 'Před odjezdem pacienta z OS',
    color: C.green,
    icon: FileCheck,
    items: [
      { id: 'procedure_recorded', label: 'Sestra ústně potvrdila název provedeného výkonu' },
      { id: 'instrument_count', label: 'Počítání nástrojů, jehel a roušek je úplné' },
      { id: 'specimen_labeled', label: 'Vzorky správně označeny (včetně jména pacienta)' },
      { id: 'equipment_problems', label: 'Jsou problémy s vybavením, které je třeba řešit?' },
      { id: 'recovery_concerns', label: 'Chirurg, anesteziolog a sestra: klíčové obavy pro zotavení a péči o pacienta' },
    ],
  },
] as const;

type PhaseId = typeof CHECKLIST_PHASES[number]['id'];

interface ChecklistItemState {
  [itemId: string]: boolean;
}

interface SafetyChecklist {
  id: string;
  room_id: string;
  patient_id: string | null;
  patient_name: string | null;
  procedure_name: string | null;
  surgeon_name: string | null;
  anesthesiologist_name: string | null;
  sign_in: ChecklistItemState;
  time_out: ChecklistItemState;
  sign_out: ChecklistItemState;
  sign_in_completed_at: string | null;
  time_out_completed_at: string | null;
  sign_out_completed_at: string | null;
  status: 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

interface SafetyChecklistModuleProps {
  rooms: OperatingRoom[];
}

const SafetyChecklistModule: React.FC<SafetyChecklistModuleProps> = ({ rooms }) => {
  const [checklists, setChecklists] = useState<SafetyChecklist[]>([]);
  const [selectedChecklist, setSelectedChecklist] = useState<SafetyChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_progress' | 'completed'>('all');

  // Load checklists from Supabase
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    const loadChecklists = async () => {
      const { data, error } = await supabase
        .from('safety_checklists')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setChecklists(data as SafetyChecklist[]);
      }
      setLoading(false);
    };

    loadChecklists();

    // Realtime subscription
    const channel = supabase
      .channel('safety_checklists_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'safety_checklists' },
        () => loadChecklists()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter checklists
  const filteredChecklists = useMemo(() => {
    return checklists.filter((c) => {
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          c.patient_name?.toLowerCase().includes(q) ||
          c.procedure_name?.toLowerCase().includes(q) ||
          c.surgeon_name?.toLowerCase().includes(q) ||
          rooms.find((r) => r.id === c.room_id)?.name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [checklists, searchQuery, filterStatus, rooms]);

  // Stats
  const stats = useMemo(() => {
    const total = checklists.length;
    const completed = checklists.filter((c) => c.status === 'completed').length;
    const inProgress = checklists.filter((c) => c.status === 'in_progress').length;
    const today = checklists.filter((c) => {
      const date = new Date(c.created_at);
      const now = new Date();
      return date.toDateString() === now.toDateString();
    }).length;
    const compliance = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, today, compliance };
  }, [checklists]);

  // Calculate phase completion
  const getPhaseCompletion = (checklist: SafetyChecklist, phaseId: PhaseId) => {
    const phase = CHECKLIST_PHASES.find((p) => p.id === phaseId);
    if (!phase) return { done: 0, total: 0 };
    const state = checklist[phaseId] || {};
    const done = phase.items.filter((item) => state[item.id]).length;
    return { done, total: phase.items.length };
  };

  // Update checklist item
  const toggleItem = async (checklistId: string, phaseId: PhaseId, itemId: string) => {
    const checklist = checklists.find((c) => c.id === checklistId);
    if (!checklist) return;

    const currentState = checklist[phaseId] || {};
    const newState = { ...currentState, [itemId]: !currentState[itemId] };

    // Check if phase is now complete
    const phase = CHECKLIST_PHASES.find((p) => p.id === phaseId);
    const isPhaseComplete = phase?.items.every((item) => newState[item.id]) ?? false;
    const completionField = `${phaseId}_completed_at`;

    const updates: Partial<SafetyChecklist> = {
      [phaseId]: newState,
    };

    if (isPhaseComplete && !checklist[completionField as keyof SafetyChecklist]) {
      (updates as any)[completionField] = new Date().toISOString();
    } else if (!isPhaseComplete && checklist[completionField as keyof SafetyChecklist]) {
      (updates as any)[completionField] = null;
    }

    // Check overall status
    const allPhasesComplete = CHECKLIST_PHASES.every((p) => {
      const state = p.id === phaseId ? newState : checklist[p.id];
      return p.items.every((item) => state?.[item.id]);
    });
    if (allPhasesComplete && checklist.status !== 'completed') {
      updates.status = 'completed';
    } else if (!allPhasesComplete && checklist.status === 'completed') {
      updates.status = 'in_progress';
    }

    if (!supabase) return;
    const { error } = await supabase
      .from('safety_checklists')
      .update(updates)
      .eq('id', checklistId);

    if (!error) {
      setChecklists((prev) =>
        prev.map((c) => (c.id === checklistId ? { ...c, ...updates } : c))
      );
      if (selectedChecklist?.id === checklistId) {
        setSelectedChecklist((prev) => (prev ? { ...prev, ...updates } : prev));
      }
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto hide-scrollbar" style={{ background: C.bg }}>
      <div className="w-full px-4 sm:px-6 md:pl-32 md:pr-10 py-6 md:py-10 pb-mobile-nav md:pb-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md"
              style={{
                background: `linear-gradient(135deg, ${C.green}25 0%, ${C.green}10 100%)`,
                border: `1px solid ${C.green}40`,
                boxShadow: `0 0 16px ${C.green}20`,
              }}
            >
              <ShieldCheck className="w-5 h-5" style={{ color: C.green }} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                WHO Bezpečnostní Checklist
              </h1>
              <p className="text-sm text-white/50 font-medium">
                Surgical Safety Checklist · Standard WHO 2009
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <StatCard
            icon={ClipboardCheck}
            label="Celkem dnes"
            value={stats.today.toString()}
            color={C.blue}
          />
          <StatCard
            icon={CheckCircle2}
            label="Dokončené"
            value={stats.completed.toString()}
            color={C.green}
          />
          <StatCard
            icon={Activity}
            label="Probíhající"
            value={stats.inProgress.toString()}
            color={C.accent}
          />
          <StatCard
            icon={TrendingUp}
            label="Compliance"
            value={`${stats.compliance}%`}
            color={C.purple}
            highlight
          />
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          {/* Search */}
          <div
            className="relative flex-1 rounded-xl backdrop-blur-md"
            style={{ background: C.glass, border: `1px solid ${C.border}` }}
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hledat pacienta, výkon, sál..."
              className="w-full bg-transparent pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-2">
            {(['all', 'in_progress', 'completed'] as const).map((status) => {
              const labels = { all: 'Vše', in_progress: 'Probíhá', completed: 'Hotovo' };
              const isActive = filterStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className="px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 backdrop-blur-md"
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, ${C.green}25 0%, ${C.green}10 100%)`
                      : C.glass,
                    border: isActive ? `1px solid ${C.green}40` : `1px solid ${C.border}`,
                    color: isActive ? C.green : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {labels[status]}
                </button>
              );
            })}
          </div>

          {/* New checklist button */}
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${C.green}30 0%, ${C.green}15 100%)`,
              border: `1px solid ${C.green}50`,
              color: C.green,
              boxShadow: `0 0 16px ${C.green}25`,
            }}
          >
            <Plus className="w-4 h-4" />
            Nový Checklist
          </button>
        </div>

        {/* Checklists List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-white/40 text-sm">Načítání checklistů...</div>
          </div>
        ) : !isSupabaseConfigured ? (
          <ConfigWarning />
        ) : filteredChecklists.length === 0 ? (
          <EmptyState onCreate={() => setShowCreateForm(true)} />
        ) : (
          <div className="grid gap-3">
            {filteredChecklists.map((checklist) => (
              <ChecklistRow
                key={checklist.id}
                checklist={checklist}
                room={rooms.find((r) => r.id === checklist.room_id)}
                onClick={() => setSelectedChecklist(checklist)}
                getPhaseCompletion={getPhaseCompletion}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selectedChecklist && (
          <ChecklistDetailModal
            checklist={selectedChecklist}
            room={rooms.find((r) => r.id === selectedChecklist.room_id)}
            onClose={() => setSelectedChecklist(null)}
            onToggleItem={toggleItem}
            getPhaseCompletion={getPhaseCompletion}
          />
        )}
      </AnimatePresence>

      {/* Create form modal */}
      <AnimatePresence>
        {showCreateForm && (
          <CreateChecklistModal
            rooms={rooms}
            onClose={() => setShowCreateForm(false)}
            onCreated={(newChecklist) => {
              setChecklists((prev) => [newChecklist, ...prev]);
              setShowCreateForm(false);
              setSelectedChecklist(newChecklist);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ===== STAT CARD =====
const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  highlight?: boolean;
}> = ({ icon: Icon, label, value, color, highlight }) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    className="relative rounded-2xl p-4 backdrop-blur-md overflow-hidden"
    style={{
      background: highlight
        ? `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)`
        : C.glass,
      border: highlight ? `1px solid ${color}40` : `1px solid ${C.border}`,
      boxShadow: highlight
        ? `0 0 24px ${color}25, inset 0 1px 0 rgba(255,255,255,0.05)`
        : 'inset 0 1px 0 rgba(255,255,255,0.03)',
    }}
  >
    <div className="flex items-center justify-between mb-2">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{
          background: `${color}18`,
          border: `1px solid ${color}30`,
        }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
    </div>
    <p className="text-[9px] text-white/40 uppercase tracking-[0.3em] font-semibold mb-1">
      {label}
    </p>
    <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
  </motion.div>
);

// ===== CHECKLIST ROW =====
const ChecklistRow: React.FC<{
  checklist: SafetyChecklist;
  room: OperatingRoom | undefined;
  onClick: () => void;
  getPhaseCompletion: (c: SafetyChecklist, p: PhaseId) => { done: number; total: number };
}> = ({ checklist, room, onClick, getPhaseCompletion }) => {
  const isCompleted = checklist.status === 'completed';
  const totalCompleted = CHECKLIST_PHASES.reduce(
    (sum, p) => sum + getPhaseCompletion(checklist, p.id).done,
    0
  );
  const totalItems = CHECKLIST_PHASES.reduce((sum, p) => sum + p.items.length, 0);
  const progressPercent = Math.round((totalCompleted / totalItems) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.005 }}
      onClick={onClick}
      className="relative rounded-2xl p-4 md:p-5 backdrop-blur-md cursor-pointer overflow-hidden transition-all duration-200"
      style={{
        background: isCompleted
          ? `linear-gradient(135deg, ${C.green}10 0%, ${C.green}03 100%)`
          : C.glass,
        border: isCompleted ? `1px solid ${C.green}30` : `1px solid ${C.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <div className="flex items-center gap-4">
        {/* Status icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: isCompleted ? `${C.green}20` : `${C.accent}15`,
            border: isCompleted ? `1px solid ${C.green}40` : `1px solid ${C.accent}30`,
          }}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5" style={{ color: C.green }} />
          ) : (
            <Activity className="w-5 h-5" style={{ color: C.accent }} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-base md:text-lg font-bold text-white truncate">
              {checklist.patient_name || 'Bez pacienta'}
            </h3>
            {room && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
                style={{ background: `${C.blue}20`, color: C.blue }}
              >
                {room.name}
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-white/50 truncate">
            {checklist.procedure_name || 'Bez výkonu'}
            {checklist.surgeon_name && (
              <>
                <span className="mx-2 text-white/20">·</span>
                {checklist.surgeon_name}
              </>
            )}
          </p>
        </div>

        {/* Phase progress */}
        <div className="hidden md:flex items-center gap-2">
          {CHECKLIST_PHASES.map((phase) => {
            const { done, total } = getPhaseCompletion(checklist, phase.id);
            const phaseComplete = done === total;
            return (
              <div
                key={phase.id}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{
                  background: phaseComplete ? `${phase.color}20` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${phaseComplete ? phase.color + '40' : C.border}`,
                }}
              >
                <span
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: phaseComplete ? phase.color : 'rgba(255,255,255,0.5)' }}
                >
                  {phase.name}
                </span>
                <span
                  className="text-[10px] font-mono font-bold"
                  style={{ color: phaseComplete ? phase.color : 'rgba(255,255,255,0.4)' }}
                >
                  {done}/{total}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress percent */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className="text-2xl font-bold font-mono tracking-tight"
            style={{ color: isCompleted ? C.green : 'rgba(255,255,255,0.85)' }}
          >
            {progressPercent}%
          </span>
          <ChevronRight className="w-4 h-4 text-white/30" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full"
          style={{
            background: isCompleted
              ? `linear-gradient(90deg, ${C.green}, ${C.green}cc)`
              : `linear-gradient(90deg, ${C.accent}, ${C.accent}cc)`,
            boxShadow: `0 0 8px ${isCompleted ? C.green : C.accent}50`,
          }}
        />
      </div>
    </motion.div>
  );
};

// ===== CHECKLIST DETAIL MODAL =====
const ChecklistDetailModal: React.FC<{
  checklist: SafetyChecklist;
  room: OperatingRoom | undefined;
  onClose: () => void;
  onToggleItem: (id: string, phase: PhaseId, item: string) => void;
  getPhaseCompletion: (c: SafetyChecklist, p: PhaseId) => { done: number; total: number };
}> = ({ checklist, room, onClose, onToggleItem, getPhaseCompletion }) => {
  const [expandedPhase, setExpandedPhase] = useState<PhaseId>('sign_in');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl backdrop-blur-2xl flex flex-col"
        style={{
          background: 'rgba(11,17,32,0.95)',
          border: `1px solid ${C.border}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${C.green}20`, border: `1px solid ${C.green}40` }}
            >
              <ShieldCheck className="w-5 h-5" style={{ color: C.green }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {checklist.patient_name || 'Checklist'}
              </h2>
              <p className="text-xs text-white/50">
                {checklist.procedure_name}
                {room && (
                  <>
                    <span className="mx-1.5 text-white/20">·</span>
                    {room.name}
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
            style={{ background: C.glass, border: `1px solid ${C.border}` }}
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Phases */}
        <div className="flex-1 overflow-y-auto hide-scrollbar p-4 md:p-6">
          <div className="space-y-3">
            {CHECKLIST_PHASES.map((phase) => {
              const { done, total } = getPhaseCompletion(checklist, phase.id);
              const isComplete = done === total;
              const isExpanded = expandedPhase === phase.id;
              const PhaseIcon = phase.icon;
              const state = checklist[phase.id] || {};

              return (
                <div
                  key={phase.id}
                  className="rounded-2xl overflow-hidden backdrop-blur-md"
                  style={{
                    background: isComplete
                      ? `linear-gradient(135deg, ${phase.color}10 0%, ${phase.color}03 100%)`
                      : C.glass,
                    border: isComplete
                      ? `1px solid ${phase.color}30`
                      : `1px solid ${C.border}`,
                  }}
                >
                  {/* Phase header */}
                  <button
                    onClick={() => setExpandedPhase(isExpanded ? ('' as PhaseId) : phase.id)}
                    className="w-full p-4 flex items-center gap-3 transition-colors duration-200 hover:bg-white/[0.02]"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `${phase.color}20`,
                        border: `1px solid ${phase.color}40`,
                      }}
                    >
                      <PhaseIcon className="w-5 h-5" style={{ color: phase.color }} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-bold uppercase tracking-[0.2em]"
                          style={{ color: phase.color }}
                        >
                          {phase.name}
                        </span>
                        {isComplete && (
                          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: C.green }} />
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white truncate">{phase.title}</h3>
                      <p className="text-xs text-white/40 truncate">{phase.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className="text-sm font-mono font-bold"
                        style={{ color: isComplete ? phase.color : 'rgba(255,255,255,0.5)' }}
                      >
                        {done}/{total}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-white/40" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-white/40" />
                      )}
                    </div>
                  </button>

                  {/* Items */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="p-4 pt-0 space-y-2"
                          style={{ borderTop: `1px solid ${C.border}` }}
                        >
                          <div className="pt-3" />
                          {phase.items.map((item) => {
                            const checked = !!state[item.id];
                            return (
                              <button
                                key={item.id}
                                onClick={() => onToggleItem(checklist.id, phase.id, item.id)}
                                className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-150 hover:bg-white/[0.03]"
                                style={{
                                  background: checked ? `${phase.color}08` : 'transparent',
                                  border: `1px solid ${checked ? phase.color + '20' : 'transparent'}`,
                                }}
                              >
                                <div
                                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-150"
                                  style={{
                                    background: checked ? phase.color : 'transparent',
                                    border: `1.5px solid ${checked ? phase.color : 'rgba(255,255,255,0.2)'}`,
                                  }}
                                >
                                  {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                </div>
                                <span
                                  className={`text-sm leading-relaxed transition-colors duration-150 ${
                                    checked ? 'text-white' : 'text-white/70'
                                  }`}
                                >
                                  {item.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ===== CREATE CHECKLIST MODAL =====
const CreateChecklistModal: React.FC<{
  rooms: OperatingRoom[];
  onClose: () => void;
  onCreated: (checklist: SafetyChecklist) => void;
}> = ({ rooms, onClose, onCreated }) => {
  const [roomId, setRoomId] = useState(rooms[0]?.id || '');
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [procedureName, setProcedureName] = useState('');
  const [surgeonName, setSurgeonName] = useState('');
  const [anesthesiologistName, setAnesthesiologistName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!supabase || !roomId || !patientName) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from('safety_checklists')
      .insert({
        room_id: roomId,
        patient_id: patientId || null,
        patient_name: patientName,
        procedure_name: procedureName || null,
        surgeon_name: surgeonName || null,
        anesthesiologist_name: anesthesiologistName || null,
        sign_in: {},
        time_out: {},
        sign_out: {},
        status: 'in_progress',
      })
      .select()
      .single();

    setSubmitting(false);
    if (!error && data) {
      onCreated(data as SafetyChecklist);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl backdrop-blur-2xl overflow-hidden"
        style={{
          background: 'rgba(11,17,32,0.95)',
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <h2 className="text-lg font-bold text-white">Nový Bezpečnostní Checklist</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: C.glass, border: `1px solid ${C.border}` }}
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <Field label="Operační sál" required>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full bg-transparent px-4 py-3 text-sm text-white rounded-xl focus:outline-none"
              style={{ background: C.glass, border: `1px solid ${C.border}` }}
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id} style={{ background: C.bg }}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Jméno pacienta" required>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Jan Novák"
              className="w-full px-4 py-3 text-sm text-white placeholder:text-white/30 rounded-xl focus:outline-none"
              style={{ background: C.glass, border: `1px solid ${C.border}` }}
            />
          </Field>

          <Field label="Rodné číslo / ID pacienta">
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="800101/1234"
              className="w-full px-4 py-3 text-sm text-white placeholder:text-white/30 rounded-xl focus:outline-none"
              style={{ background: C.glass, border: `1px solid ${C.border}` }}
            />
          </Field>

          <Field label="Plánovaný výkon">
            <input
              type="text"
              value={procedureName}
              onChange={(e) => setProcedureName(e.target.value)}
              placeholder="Cholecystektomie"
              className="w-full px-4 py-3 text-sm text-white placeholder:text-white/30 rounded-xl focus:outline-none"
              style={{ background: C.glass, border: `1px solid ${C.border}` }}
            />
          </Field>

          <Field label="Operatér">
            <input
              type="text"
              value={surgeonName}
              onChange={(e) => setSurgeonName(e.target.value)}
              placeholder="MUDr. Procházka"
              className="w-full px-4 py-3 text-sm text-white placeholder:text-white/30 rounded-xl focus:outline-none"
              style={{ background: C.glass, border: `1px solid ${C.border}` }}
            />
          </Field>

          <Field label="Anesteziolog">
            <input
              type="text"
              value={anesthesiologistName}
              onChange={(e) => setAnesthesiologistName(e.target.value)}
              placeholder="MUDr. Jelínek"
              className="w-full px-4 py-3 text-sm text-white placeholder:text-white/30 rounded-xl focus:outline-none"
              style={{ background: C.glass, border: `1px solid ${C.border}` }}
            />
          </Field>
        </div>

        <div
          className="px-6 py-4 flex items-center justify-end gap-3"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/70 transition-all duration-200 hover:bg-white/5"
          >
            Zrušit
          </button>
          <button
            onClick={handleSubmit}
            disabled={!patientName || !roomId || submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(135deg, ${C.green}30 0%, ${C.green}15 100%)`,
              border: `1px solid ${C.green}50`,
              color: C.green,
            }}
          >
            {submitting ? 'Vytvářím...' : 'Vytvořit Checklist'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({
  label,
  required,
  children,
}) => (
  <div>
    <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-white/50 mb-1.5">
      {label} {required && <span style={{ color: C.red }}>*</span>}
    </label>
    {children}
  </div>
);

// ===== EMPTY STATE =====
const EmptyState: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <div
    className="rounded-2xl p-12 text-center backdrop-blur-md"
    style={{ background: C.glass, border: `1px solid ${C.border}` }}
  >
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
      style={{ background: `${C.green}10`, border: `1px solid ${C.green}25` }}
    >
      <ShieldCheck className="w-7 h-7" style={{ color: C.green }} />
    </div>
    <h3 className="text-lg font-bold text-white mb-2">Žádné checklisty</h3>
    <p className="text-sm text-white/40 mb-5 max-w-sm mx-auto">
      Vytvořte nový bezpečnostní checklist WHO pro plánovanou operaci.
    </p>
    <button
      onClick={onCreate}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
      style={{
        background: `linear-gradient(135deg, ${C.green}30 0%, ${C.green}15 100%)`,
        border: `1px solid ${C.green}50`,
        color: C.green,
      }}
    >
      <Plus className="w-4 h-4" />
      Nový Checklist
    </button>
  </div>
);

// ===== CONFIG WARNING =====
const ConfigWarning: React.FC = () => (
  <div
    className="rounded-2xl p-8 backdrop-blur-md"
    style={{
      background: `linear-gradient(135deg, ${C.accent}10 0%, ${C.accent}03 100%)`,
      border: `1px solid ${C.accent}30`,
    }}
  >
    <div className="flex items-start gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${C.accent}20`, border: `1px solid ${C.accent}40` }}
      >
        <AlertTriangle className="w-5 h-5" style={{ color: C.accent }} />
      </div>
      <div>
        <h3 className="text-base font-bold text-white mb-1">Supabase není nakonfigurováno</h3>
        <p className="text-sm text-white/50">
          Pro využití WHO Bezpečnostního Checklistu připojte Supabase integraci v nastavení projektu.
        </p>
      </div>
    </div>
  </div>
);

export default SafetyChecklistModule;
