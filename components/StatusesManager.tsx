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
  const { workflowStatuses, loading, refreshStatuses } = useWorkflowStatusesContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter to get only active main workflow statuses (sorted by sort_order)
  const activeStatuses = workflowStatuses
    .filter(s => !s.is_special)
    .sort((a, b) => a.sort_order - b.sort_order);

  const handleEdit = (status: typeof workflowStatuses[0]) => {
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
      const response = await fetch('/api/workflow-statuses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save status');
      }
      
      await refreshStatuses();
      setEditingId(null);
      setEditingData(null);
    } catch (err) {
      setError('Nepodařilo se uložit změny');
      console.error('Error saving status:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (status: typeof workflowStatuses[0]) => {
    setSaving(true);
    try {
      const response = await fetch('/api/workflow-statuses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: status.id,
          is_active: !status.is_active
        })
      });
      
      if (!response.ok) throw new Error('Failed to toggle status');
      await refreshStatuses();
    } catch (err) {
      console.error('Error toggling status:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatistics = async (status: typeof workflowStatuses[0]) => {
    setSaving(true);
    try {
      const response = await fetch('/api/workflow-statuses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: status.id,
          include_in_statistics: !status.include_in_statistics
        })
      });
      
      if (!response.ok) throw new Error('Failed to toggle statistics');
      await refreshStatuses();
    } catch (err) {
      console.error('Error toggling statistics:', err);
    } finally {
      setSaving(false);
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
    <div className="space-y-8">
      {/* Header */}
      <header className="mb-8">
        <div className="mb-4">
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
            SPRÁVA <span className="text-white/20">STATUSŮ</span>
          </h1>
        </div>
        <p className="text-white/40 text-sm max-w-xl">
          Správa workflow statusů operačních výkonů. Můžete upravovat názvy, barvy, časy a nastavení statistik.
        </p>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-300/90">{error}</div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="text-white/50 text-sm">Aktivní Statusy</p>
              <p className="text-2xl font-bold text-white">
                {activeStatuses.filter(s => s.is_active).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-white/50 text-sm">Ve Statistikách</p>
              <p className="text-2xl font-bold text-white">
                {activeStatuses.filter(s => s.include_in_statistics).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-white/50 text-sm">Celkem Statusů</p>
              <p className="text-2xl font-bold text-white">{activeStatuses.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white/80">Workflow Statusy</h2>
        
        <AnimatePresence>
          {activeStatuses.map((status, idx) => {
            const isEditing = editingId === status.id;
            
            return (
              <motion.div
                key={status.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: idx * 0.05 }}
                className={`rounded-lg border p-4 transition-colors ${
                  isEditing 
                    ? 'bg-white/10 border-cyan-500/50' 
                    : status.is_active 
                      ? 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
                      : 'bg-white/[0.02] border-white/5 opacity-50'
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
                  /* View Mode */
                  <div className="flex items-center gap-4">
                    {/* Sort Order */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-white/60">{status.sort_order + 1}</span>
                    </div>

                    {/* Color Preview */}
                    <div 
                      className="flex-shrink-0 w-10 h-10 rounded-lg shadow-lg"
                      style={{ backgroundColor: status.accent_color }}
                    />

                    {/* Name & Description */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white/90">{status.name}</h3>
                      <p className="text-sm text-white/50 truncate">
                        {status.description || 'Bez popisu'}
                      </p>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-2 flex-shrink-0 min-w-[80px]">
                      <Clock className="w-4 h-4 text-white/40" />
                      <span className="text-white/90 text-sm font-medium">
                        {status.default_duration_minutes || 0} min
                      </span>
                    </div>

                    {/* Statistics Toggle */}
                    <button
                      onClick={() => handleToggleStatistics(status)}
                      disabled={saving}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        status.include_in_statistics
                          ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                          : 'bg-white/5 text-white/40 hover:bg-white/10'
                      }`}
                      title={status.include_in_statistics ? 'Započítáno do statistik' : 'Nezapočítáno do statistik'}
                    >
                      <BarChart3 className="w-4 h-4" />
                      {status.include_in_statistics ? 'Statistiky' : 'Bez stat.'}
                    </button>

                    {/* Active Toggle */}
                    <button
                      onClick={() => handleToggleActive(status)}
                      disabled={saving}
                      className={`p-2 rounded-lg transition-colors ${
                        status.is_active
                          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                          : 'bg-white/5 text-white/40 hover:bg-white/10'
                      }`}
                      title={status.is_active ? 'Aktivní' : 'Neaktivní'}
                    >
                      {status.is_active ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleEdit(status)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                      title="Upravit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300/90">
            <p className="font-semibold mb-1">Tip:</p>
            <p className="text-xs">
              Klikněte na ikonu tužky pro úpravu statusu. Můžete měnit název, barvu, dobu trvání a nastavení statistik.
              Přepínač statistik určuje, zda se daný status započítává do přehledů a grafů.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusesManager;
