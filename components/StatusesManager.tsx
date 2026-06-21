'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Clock, BarChart3, Info, CheckCircle2, Edit3, Save, X, 
  GripVertical, Plus, Trash2, ToggleLeft, ToggleRight, Loader2
} from 'lucide-react';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';

interface EditingStatus {
  id: string;
  name: string;
  description: string;
  accent_color: string;
  default_duration_minutes: number;
  include_in_statistics: boolean;
  is_active: boolean;
}

const StatusesManager: React.FC = () => {
  // Use 'statuses' (all statuses) and 'updateStatus' for optimistic updates
  const { statuses, loading, updateStatus } = useWorkflowStatusesContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get all main workflow statuses (both active and inactive), sorted by sort_order
  // Special statuses are shown separately
  const mainStatuses = statuses
    .filter(s => !s.is_special)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  
  const specialStatuses = statuses
    .filter(s => s.is_special)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const handleEdit = (status: typeof statuses[0]) => {
    setEditingId(status.id);
    setEditingData({
      id: status.id,
      name: status.name,
      description: status.description || '',
      accent_color: status.accent_color,
      default_duration_minutes: status.default_duration_minutes || 0,
      include_in_statistics: status.include_in_statistics ?? true,
      is_active: status.is_active
    });
    setError(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingData(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!editingData) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Close editor immediately
      setEditingId(null);
      setEditingData(null);
      
      // Optimistic update via context (updates UI immediately)
      await updateStatus(editingData.id, {
        name: editingData.name,
        description: editingData.description,
        color: editingData.accent_color,
        default_duration: editingData.default_duration_minutes,
        count_in_statistics: editingData.include_in_statistics,
        is_active: editingData.is_active,
      });
    } catch (err) {
      setError('Nepodařilo se uložit změny');
      console.error('Error saving status:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (status: typeof statuses[0]) => {
    // Optimistic update via context - no API call needed, context handles it
    try {
      await updateStatus(status.id, { is_active: !status.is_active });
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleToggleStatistics = async (status: typeof statuses[0]) => {
    // Optimistic update via context
    try {
      await updateStatus(status.id, { count_in_statistics: !status.include_in_statistics });
    } catch (err) {
      console.error('Error toggling statistics:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <>
      {/* Mobile background — unified with RoomDetail / Timeline / Staff */}
      <div
        aria-hidden
        className="fixed inset-0 md:hidden pointer-events-none"
        style={{
          zIndex: 0,
          background:
            'radial-gradient(120% 80% at 50% 0%, #0f1f3a 0%, #0a1528 45%, #050d18 100%)',
        }}
      />
      <div
        aria-hidden
        className="fixed inset-0 md:hidden pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #00d4ff 0%, transparent 65%)' }}
        />
      </div>

      <div className="max-w-[2400px] mx-auto w-full relative" style={{ zIndex: 1 }}>
      {/* Header — sjednocený s dashboardem (stejná pozice i velikost) */}
      <header className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-3 md:gap-6 mb-4 md:mb-10 lg:mb-12 flex-shrink-0">
        <div className="text-center lg:text-left min-w-0 w-full lg:w-auto">
          <div className="flex items-center justify-center lg:justify-start gap-2 sm:gap-3 mb-1 sm:mb-2 opacity-60">
            <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-[#A78BFA]" />
            <p className="text-[9px] sm:text-[10px] font-bold text-[#A78BFA] tracking-[0.3em] sm:tracking-[0.4em] uppercase">KONFIGURACE WORKFLOW STATUSŮ</p>
          </div>
          <h1 className="text-[clamp(1.75rem,7vw,4.5rem)] font-bold tracking-tight uppercase leading-none truncate flex items-center gap-3 sm:gap-4 justify-center lg:justify-start">
            <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: '#A78BFA' }} />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3" style={{ background: '#A78BFA', boxShadow: '0 0 10px #A78BFA88' }} />
            </span>
            <span>SPRÁVA <span className="text-white/20">STATUSŮ</span></span>
          </h1>
        </div>
      </header>

      <div className="space-y-6 md:space-y-8">

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-300/90">{error}</div>
          </div>
        </div>
      )}

      {/* Status List — boxy v mřížce */}
      <div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-3 sm:gap-x-5 md:gap-x-6 gap-y-4 sm:gap-y-6 md:gap-y-8">
        <AnimatePresence>
          {mainStatuses.map((status, idx) => {
            const isEditing = editingId === status.id;
            const accent = status.accent_color || '#22D3EE';

            return (
              <motion.div
                key={status.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: idx * 0.04 }}
                className={`group relative w-full transition-all duration-300 ${
                  isEditing
                    ? 'col-span-full rounded-[1.75rem] sm:rounded-[2.5rem] bg-white/[0.06] border border-cyan-500/40 backdrop-blur-[60px] p-5 overflow-hidden'
                    : status.is_active
                      ? 'h-[260px] sm:h-[340px] hover:-translate-y-1.5'
                      : 'h-[260px] sm:h-[340px] opacity-50 hover:opacity-80'
                }`}
              >
                {isEditing && editingData ? (
                  /* Edit Mode */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-cyan-400">Úprava statusu</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCancel}
                          className="px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
                        >
                          Zrušit
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-3 py-1.5 text-sm rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Uložit
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name */}
                      <div>
                        <label className="block text-sm text-white/50 mb-1">Název</label>
                        <input
                          type="text"
                          value={editingData.name}
                          onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      
                      {/* Color */}
                      <div>
                        <label className="block text-sm text-white/50 mb-1">Barva</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={editingData.accent_color}
                            onChange={(e) => setEditingData({ ...editingData, accent_color: e.target.value })}
                            className="w-12 h-10 rounded-lg cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={editingData.accent_color}
                            onChange={(e) => setEditingData({ ...editingData, accent_color: e.target.value })}
                            className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                      
                      {/* Duration */}
                      <div>
                        <label className="block text-sm text-white/50 mb-1">Trvání (minuty)</label>
                        <input
                          type="number"
                          min="0"
                          value={editingData.default_duration_minutes}
                          onChange={(e) => setEditingData({ ...editingData, default_duration_minutes: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      
                      {/* Description */}
                      <div>
                        <label className="block text-sm text-white/50 mb-1">Popis</label>
                        <input
                          type="text"
                          value={editingData.description}
                          onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500"
                          placeholder="Volitelný popis..."
                        />
                      </div>
                    </div>
                    
                    {/* Toggles */}
                    <div className="flex gap-6 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingData.is_active}
                          onChange={(e) => setEditingData({ ...editingData, is_active: e.target.checked })}
                          className="w-4 h-4 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500"
                        />
                        <span className="text-sm text-white/70">Aktivní</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingData.include_in_statistics}
                          onChange={(e) => setEditingData({ ...editingData, include_in_statistics: e.target.checked })}
                          className="w-4 h-4 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500"
                        />
                        <span className="text-sm text-white/70">Započítat do statistik</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  /* View Mode — stejné jako karty na dashboardu */
                  <>
                    {/* Hlavní kontejner karty */}
                    <div className="absolute inset-0 z-0 rounded-[1.75rem] sm:rounded-[2.5rem] border border-white/5 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-[60px] transition-all duration-500 bg-white/[0.03] group-hover:bg-white/[0.06] group-hover:border-white/10 group-hover:shadow-[0_28px_55px_-12px_rgba(0,0,0,0.65)]">
                      <div
                        className="absolute inset-x-10 top-0 h-[2px] rounded-full transition-opacity duration-500 opacity-60 group-hover:opacity-100"
                        style={{ background: `linear-gradient(to right, transparent, ${accent}, transparent)` }}
                      />
                      <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] pointer-events-none"
                        style={{ backgroundColor: accent, opacity: 0.15 }}
                      />
                    </div>

                    {/* Obsah */}
                    <div className="relative h-full w-full z-10 p-3 sm:p-6 flex flex-col">
                      {/* Header — vystředěný */}
                      <div className="w-full flex flex-col items-center text-center shrink-0">
                        <p className="text-[8px] sm:text-[9px] font-bold tracking-[0.2em] sm:tracking-[0.3em] uppercase leading-none mb-1 sm:mb-2 truncate max-w-full text-white/30">
                          {status.default_duration_minutes || 0} MIN
                        </p>
                        <h3 className="text-sm sm:text-xl font-bold tracking-tight uppercase leading-none truncate max-w-full text-white/90 group-hover:text-white transition-colors">
                          {status.name}
                        </h3>
                      </div>

                      {/* Střed — kruhový indikátor s pořadím */}
                      <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden">
                        <div className="relative flex items-center justify-center">
                          <div className="absolute rounded-full blur-[40px]" style={{ width: 80, height: 80, backgroundColor: accent, opacity: 0.25 }} />
                          <svg viewBox="0 0 112 112" className="w-20 h-20 sm:w-28 sm:h-28 overflow-visible select-none flex-shrink-0">
                            <circle cx="56" cy="56" r="48" fill="none" stroke="white" strokeWidth="1.5" className="opacity-[0.03]" />
                            <circle cx="56" cy="56" r="48" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${accent}99)` }} />
                          </svg>
                          <span className="absolute text-3xl sm:text-4xl font-bold text-white/90" style={{ letterSpacing: '-0.05em' }}>
                            {status.sort_order + 1}
                          </span>
                        </div>
                        {status.description && (
                          <p className="mt-2 text-[10px] sm:text-xs text-white/40 text-center line-clamp-2 px-2">
                            {status.description}
                          </p>
                        )}
                      </div>

                      {/* Spodní info */}
                      <div className="w-full space-y-2 sm:space-y-3 shrink-0">
                        <div className="w-full text-center">
                          <p
                            className="text-[9px] sm:text-[10px] font-bold tracking-[0.15em] sm:tracking-[0.2em] truncate uppercase py-1.5 sm:py-2 px-2 sm:px-4 rounded-full border inline-block w-full text-white"
                            style={{ backgroundColor: `${accent}1a`, borderColor: `${accent}40` }}
                          >
                            {status.is_active ? 'AKTIVNÍ' : 'NEAKTIVNÍ'}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-white/5 gap-1.5">
                          <button
                            onClick={() => handleToggleStatistics(status)}
                            disabled={saving}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-colors ${
                              status.include_in_statistics
                                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                : 'bg-white/5 text-white/40 hover:bg-white/10'
                            }`}
                            title={status.include_in_statistics ? 'Započítáno do statistik' : 'Nezapočítáno do statistik'}
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Stat</span>
                          </button>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleActive(status)}
                              disabled={saving}
                              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                                status.is_active
                                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                  : 'bg-white/5 text-white/40 hover:bg-white/10'
                              }`}
                              title={status.is_active ? 'Aktivní' : 'Neaktivní'}
                            >
                              {status.is_active ? <ToggleRight className="w-4 h-4 sm:w-5 sm:h-5" /> : <ToggleLeft className="w-4 h-4 sm:w-5 sm:h-5" />}
                            </button>
                            <button
                              onClick={() => handleEdit(status)}
                              className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                              title="Upravit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        </div>
      </div>

      {/* Special Statuses (Button-activated) */}
      {specialStatuses.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-white/80">Speciální Statusy (Tlačítka)</h2>
            <span className="text-xs font-semibold text-white/35 tabular-nums px-2 py-0.5 rounded-full bg-white/5">{specialStatuses.length}</span>
          </div>
          <p className="text-sm text-white/50 mb-4">Tyto statusy se aktivují pomocí tlačítek v detailu sálu</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-3 sm:gap-x-5 md:gap-x-6 gap-y-4 sm:gap-y-6 md:gap-y-8">
          <AnimatePresence>
            {specialStatuses.map((status, idx) => {
              const isEditing = editingId === status.id;
              const accent = status.accent_color || '#FBBF24';

              return (
                <motion.div
                  key={status.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`group relative w-full transition-all duration-300 ${
                    isEditing
                      ? 'col-span-full rounded-[1.75rem] sm:rounded-[2.5rem] bg-white/[0.06] border border-amber-500/40 backdrop-blur-[60px] p-5 overflow-hidden'
                      : status.is_active
                        ? 'h-[260px] sm:h-[340px] hover:-translate-y-1.5'
                        : 'h-[260px] sm:h-[340px] opacity-50 hover:opacity-80'
                  }`}
                >
                  {isEditing && editingData ? (
                    /* Edit Mode for special statuses */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-amber-400">Úprava speciálního statusu</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={handleCancel}
                            className="px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
                          >
                            Zrušit
                          </button>
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-3 py-1.5 text-sm rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Uložit
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Name */}
                        <div>
                          <label className="block text-sm text-white/50 mb-1">Název</label>
                          <input
                            type="text"
                            value={editingData.name}
                            onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        
                        {/* Color */}
                        <div>
                          <label className="block text-sm text-white/50 mb-1">Barva</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={editingData.accent_color}
                              onChange={(e) => setEditingData({ ...editingData, accent_color: e.target.value })}
                              className="w-12 h-10 rounded-lg cursor-pointer bg-transparent"
                            />
                            <input
                              type="text"
                              value={editingData.accent_color}
                              onChange={(e) => setEditingData({ ...editingData, accent_color: e.target.value })}
                              className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Toggles */}
                      <div className="flex gap-6 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingData.is_active}
                            onChange={(e) => setEditingData({ ...editingData, is_active: e.target.checked })}
                            className="w-4 h-4 rounded bg-white/10 border-white/20 text-amber-500 focus:ring-amber-500"
                          />
                          <span className="text-sm text-white/70">Aktivní</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingData.include_in_statistics}
                            onChange={(e) => setEditingData({ ...editingData, include_in_statistics: e.target.checked })}
                            className="w-4 h-4 rounded bg-white/10 border-white/20 text-amber-500 focus:ring-amber-500"
                          />
                          <span className="text-sm text-white/70">Započítat do statistik</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    /* View Mode for special statuses — stejné jako karty na dashboardu */
                    <>
                      {/* Hlavní kontejner karty */}
                      <div className="absolute inset-0 z-0 rounded-[1.75rem] sm:rounded-[2.5rem] border border-white/5 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-[60px] transition-all duration-500 bg-white/[0.03] group-hover:bg-white/[0.06] group-hover:border-white/10 group-hover:shadow-[0_28px_55px_-12px_rgba(0,0,0,0.65)]">
                        <div
                          className="absolute inset-x-10 top-0 h-[2px] rounded-full transition-opacity duration-500 opacity-60 group-hover:opacity-100"
                          style={{ background: `linear-gradient(to right, transparent, ${accent}, transparent)` }}
                        />
                        <div
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] pointer-events-none"
                          style={{ backgroundColor: accent, opacity: 0.15 }}
                        />
                      </div>

                      {/* Obsah */}
                      <div className="relative h-full w-full z-10 p-3 sm:p-6 flex flex-col">
                        {/* Header — vystředěný */}
                        <div className="w-full flex flex-col items-center text-center shrink-0">
                          <p className="text-[8px] sm:text-[9px] font-bold tracking-[0.2em] sm:tracking-[0.3em] uppercase leading-none mb-1 sm:mb-2 truncate max-w-full text-white/30">
                            TLAČÍTKO
                          </p>
                          <h3 className={`text-sm sm:text-xl font-bold tracking-tight uppercase leading-none truncate max-w-full transition-colors ${status.is_active ? 'text-white/90 group-hover:text-white' : 'text-white/50'}`}>
                            {status.name}
                          </h3>
                        </div>

                        {/* Střed — kruhový indikátor s ikonou */}
                        <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden">
                          <div className="relative flex items-center justify-center">
                            <div className="absolute rounded-full blur-[40px]" style={{ width: 80, height: 80, backgroundColor: accent, opacity: 0.25 }} />
                            <svg viewBox="0 0 112 112" className="w-20 h-20 sm:w-28 sm:h-28 overflow-visible select-none flex-shrink-0">
                              <circle cx="56" cy="56" r="48" fill="none" stroke="white" strokeWidth="1.5" className="opacity-[0.03]" />
                              <circle cx="56" cy="56" r="48" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${accent}99)` }} />
                            </svg>
                            <Activity className="absolute w-8 h-8 sm:w-10 sm:h-10" style={{ color: accent }} />
                          </div>
                          <p className="mt-2 text-[10px] sm:text-xs text-white/40 text-center px-2">
                            {status.special_type === 'pause' && 'Pauza'}
                            {status.special_type === 'hygiene' && 'Hygiena'}
                            {status.special_type === 'patient_called' && 'Volání'}
                            {status.special_type === 'patient_arrived_tract' && 'Příjezd'}
                          </p>
                        </div>

                        {/* Spodní info */}
                        <div className="w-full space-y-2 sm:space-y-3 shrink-0">
                          <div className="w-full text-center">
                            <p
                              className="text-[9px] sm:text-[10px] font-bold tracking-[0.15em] sm:tracking-[0.2em] truncate uppercase py-1.5 sm:py-2 px-2 sm:px-4 rounded-full border inline-block w-full text-white"
                              style={{ backgroundColor: `${accent}1a`, borderColor: `${accent}40` }}
                            >
                              {status.is_active ? 'AKTIVNÍ' : 'NEAKTIVNÍ'}
                            </p>
                          </div>
                          <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-white/5 gap-1.5">
                            <button
                              onClick={() => handleToggleStatistics(status)}
                              disabled={saving}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-colors ${
                                status.include_in_statistics
                                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                  : 'bg-white/5 text-white/40 hover:bg-white/10'
                              }`}
                              title={status.include_in_statistics ? 'Započítáno do statistik' : 'Nezapočítáno do statistik'}
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Stat</span>
                            </button>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleToggleActive(status)}
                                disabled={saving}
                                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                                  status.is_active
                                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                                }`}
                                title={status.is_active ? 'Aktivní' : 'Neaktivní'}
                              >
                                {status.is_active ? <ToggleRight className="w-4 h-4 sm:w-5 sm:h-5" /> : <ToggleLeft className="w-4 h-4 sm:w-5 sm:h-5" />}
                              </button>
                              <button
                                onClick={() => handleEdit(status)}
                                className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                title="Upravit"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          </div>
        </div>
      )}

      </div>
      </div>
    </>
  );
};

export default StatusesManager;
