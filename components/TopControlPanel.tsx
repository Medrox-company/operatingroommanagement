import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Settings, Eye, EyeOff, Filter, Download } from 'lucide-react';

interface FilterState {
  search: string;
  status: 'all' | 'active' | 'ready' | 'locked' | 'emergency';
  department: string | null;
}

interface TopControlPanelProps {
  onFilterChange: (filters: FilterState) => void;
  onViewModeChange: (mode: 'compact' | 'standard' | 'expanded') => void;
  onShowLegend: () => void;
  viewMode: 'compact' | 'standard' | 'expanded';
  departments: string[];
}

export default function TopControlPanel({
  onFilterChange,
  onViewModeChange,
  onShowLegend,
  viewMode,
  departments,
}: TopControlPanelProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    department: null,
  });

  const handleSearch = (query: string) => {
    const newFilters = { ...filters, search: query };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleStatusFilter = (status: FilterState['status']) => {
    const newFilters = { ...filters, status };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDepartmentFilter = (dept: string | null) => {
    const newFilters = { ...filters, department: dept };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const statusButtons = [
    { id: 'all', label: 'Všechny', color: 'text-white/60' },
    { id: 'active', label: 'Aktivní', color: 'text-cyan-400' },
    { id: 'ready', label: 'Připravené', color: 'text-green-400' },
    { id: 'locked', label: 'Uzamčené', color: 'text-amber-400' },
    { id: 'emergency', label: 'Krize', color: 'text-red-400' },
  ];

  return (
    <motion.div
      className="md:flex hidden flex-col gap-3 px-6 py-4 bg-gradient-to-r from-slate-900/40 to-slate-800/30 border-b border-white/10 backdrop-blur-md"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Top Row: Search + View Mode + Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Hledat sál, oddělení..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 transition"
            />
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
          {['compact', 'standard', 'expanded'].map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode as any)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                viewMode === mode
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {mode === 'compact' ? 'Kompaktní' : mode === 'standard' ? 'Standardní' : 'Rozbalená'}
            </button>
          ))}
        </div>

        {/* Legend Button */}
        <button
          onClick={onShowLegend}
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-cyan-500/30 transition"
          title="Zobrazit legendu"
        >
          <Eye className="w-4 h-4" />
        </button>

        {/* Export Button */}
        <button
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-cyan-500/30 transition"
          title="Exportovat"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Settings Button */}
        <button
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-cyan-500/30 transition"
          title="Nastavení"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Row: Status Filters + Department Selector */}
      <div className="flex items-center gap-3">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-2">
          {statusButtons.map((btn) => (
            <motion.button
              key={btn.id}
              onClick={() => handleStatusFilter(btn.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filters.status === btn.id
                  ? `${btn.color} bg-white/10 border border-white/20`
                  : 'text-white/40 hover:text-white/60'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {btn.label}
            </motion.button>
          ))}
        </div>

        {/* Department Selector */}
        <div className="ml-auto">
          <select
            value={filters.department || ''}
            onChange={(e) => handleDepartmentFilter(e.target.value || null)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500/50 transition"
          >
            <option value="">Všechna oddělení</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>
    </motion.div>
  );
}

export type { FilterState };
