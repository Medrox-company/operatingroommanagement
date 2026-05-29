import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Grid3x3, List, ChevronDown, Eye, EyeOff } from 'lucide-react';

interface TopControlPanelProps {
  onSearchChange: (query: string) => void;
  onFilterChange: (filters: FilterState) => void;
  onViewModeChange: (mode: 'compact' | 'expanded') => void;
  onLegendToggle: () => void;
  viewMode: 'compact' | 'expanded';
  departments: string[];
  onDepartmentFilter: (dept: string | null) => void;
}

export interface FilterState {
  status: 'all' | 'active' | 'ready' | 'locked';
  department: string | null;
  search: string;
}

export default function TopControlPanel({
  onSearchChange,
  onFilterChange,
  onViewModeChange,
  onLegendToggle,
  viewMode,
  departments,
  onDepartmentFilter,
}: TopControlPanelProps) {
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    department: null,
    search: '',
  });
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);
  };

  return (
    <motion.div
      className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-slate-900/40 via-slate-800/30 to-slate-900/40 backdrop-blur-md"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/30 transition flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-white/50" />
          <input
            type="text"
            placeholder="Hledat..."
            className="bg-transparent text-sm text-white placeholder-white/40 outline-none flex-1"
            onChange={(e) => {
              handleFilterChange({ search: e.target.value });
              onSearchChange(e.target.value);
            }}
            value={filters.search}
          />
        </div>

        {/* Status Filter */}
        <select
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:border-cyan-500/30 transition cursor-pointer"
          onChange={(e) => handleFilterChange({ status: e.target.value as FilterState['status'] })}
          value={filters.status}
        >
          <option value="all">Všechny stavy</option>
          <option value="active">Aktivní</option>
          <option value="ready">Připraveno</option>
          <option value="locked">Uzamčeno</option>
        </select>

        {/* Department Filter */}
        <div className="relative">
          <button
            onClick={() => setShowDeptDropdown(!showDeptDropdown)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:border-cyan-500/30 transition flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Oddělení
            <ChevronDown className={`w-3 h-3 transition ${showDeptDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDeptDropdown && (
            <motion.div
              className="absolute top-full mt-2 left-0 bg-slate-900/95 border border-white/20 rounded-lg backdrop-blur-xl shadow-2xl z-50"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button
                onClick={() => {
                  onDepartmentFilter(null);
                  handleFilterChange({ department: null });
                  setShowDeptDropdown(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/5 transition first:rounded-t-lg"
              >
                Všechna oddělení
              </button>
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => {
                    onDepartmentFilter(dept);
                    handleFilterChange({ department: dept });
                    setShowDeptDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/5 transition border-t border-white/5 last:rounded-b-lg"
                >
                  {dept}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* View Mode Toggle */}
        <button
          onClick={() => onViewModeChange(viewMode === 'compact' ? 'expanded' : 'compact')}
          className={`p-2 rounded-lg border transition ${
            viewMode === 'compact'
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
              : 'bg-white/5 border-white/10 text-white/60'
          }`}
          title={viewMode === 'compact' ? 'Rozbalený pohled' : 'Kompaktní pohled'}
        >
          {viewMode === 'compact' ? (
            <Grid3x3 className="w-4 h-4" />
          ) : (
            <List className="w-4 h-4" />
          )}
        </button>

        {/* Legend Button */}
        <button 
          onClick={onLegendToggle}
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-cyan-500/30 transition" 
          title="Zobrazit legendu"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
