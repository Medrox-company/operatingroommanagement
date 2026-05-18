'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { C } from './shared';

interface FilterOption {
  id: string;
  label: string;
  count: number;
}

interface AdvancedFilterProps {
  onFilterChange?: (filters: Record<string, string[]>) => void;
  roomOptions?: FilterOption[];
  typeOptions?: FilterOption[];
  statusOptions?: FilterOption[];
  departmentOptions?: FilterOption[];
  className?: string;
}

export const AdvancedFilter: React.FC<AdvancedFilterProps> = ({
  onFilterChange,
  roomOptions = [],
  typeOptions = [],
  statusOptions = [],
  departmentOptions = [],
  className = '',
}) => {
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, Set<string>>>({
    rooms: new Set(),
    types: new Set(),
    statuses: new Set(),
    departments: new Set(),
  });
  const [expandedSections, setExpandedSections] = useState({
    rooms: false,
    types: false,
    statuses: false,
    departments: false,
  });

  const handleFilterToggle = (category: string, value: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      const newSet = new Set(newFilters[category] || []);
      
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      
      newFilters[category] = newSet;
      
      // Notify parent
      if (onFilterChange) {
        const result: Record<string, string[]> = {};
        Object.entries(newFilters).forEach(([k, v]) => {
          result[k] = Array.from(v);
        });
        onFilterChange(result);
      }
      
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setActiveFilters({
      rooms: new Set(),
      types: new Set(),
      statuses: new Set(),
      departments: new Set(),
    });
    onFilterChange?.({
      rooms: [],
      types: [],
      statuses: [],
      departments: [],
    });
  };

  const totalActiveFilters = Object.values(activeFilters).reduce((sum, set) => sum + set.size, 0);

  const FilterSection = ({ 
    title, 
    id, 
    options 
  }: { 
    title: string; 
    id: keyof typeof expandedSections; 
    options: FilterOption[] 
  }) => {
    const isExpanded = expandedSections[id];
    const activeCount = activeFilters[id]?.size || 0;

    return (
      <motion.div 
        className="border-b"
        style={{ borderColor: C.border }}>
        <button
          onClick={() => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }))}
          className="w-full py-2.5 px-3 flex items-center justify-between hover:opacity-80 transition-opacity"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: C.textHi }}>
            {title}
            {activeCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                style={{ background: `${C.accent}30`, color: C.accent }}>
                {activeCount}
              </span>
            )}
          </span>
          <ChevronDown 
            size={14} 
            style={{ color: C.muted, transform: isExpanded ? 'rotate(180deg)' : 'none' }}
            className="transition-transform"
          />
        </button>

        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-3 pb-2 space-y-1.5"
          >
            {options.map(option => (
              <label key={option.id} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={activeFilters[id]?.has(option.id) || false}
                  onChange={() => handleFilterToggle(id, option.id)}
                  className="w-4 h-4 rounded accent-current"
                  style={{ accentColor: C.accent }}
                />
                <span className="text-[10px] flex-1 group-hover:opacity-80" style={{ color: C.text }}>
                  {option.label}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded" 
                  style={{ background: C.surface, color: C.muted }}>
                  {option.count}
                </span>
              </label>
            ))}
          </motion.div>
        )}
      </motion.div>
    );
  };

  return (
    <div className={`rounded-xl border p-3 ${className}`}
      style={{ 
        background: C.surface, 
        borderColor: C.border,
      }}>
      {/* Search box */}
      <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg mb-3"
        style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
        <Search size={14} style={{ color: C.muted }} />
        <input
          type="text"
          placeholder="Hledat..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="flex-1 bg-transparent text-[11px] outline-none"
          style={{ color: C.text }}
        />
        {searchText && (
          <button
            onClick={() => setSearchText('')}
            className="p-1 hover:opacity-80 transition-opacity"
          >
            <X size={12} style={{ color: C.muted }} />
          </button>
        )}
      </div>

      {/* Filter sections */}
      <div className="space-y-1">
        {roomOptions.length > 0 && (
          <FilterSection title="Sály" id="rooms" options={roomOptions} />
        )}
        {typeOptions.length > 0 && (
          <FilterSection title="Typ" id="types" options={typeOptions} />
        )}
        {statusOptions.length > 0 && (
          <FilterSection title="Stav" id="statuses" options={statusOptions} />
        )}
        {departmentOptions.length > 0 && (
          <FilterSection title="Oddělení" id="departments" options={departmentOptions} />
        )}
      </div>

      {/* Clear filters button */}
      {totalActiveFilters > 0 && (
        <button
          onClick={clearAllFilters}
          className="w-full mt-3 py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
          style={{
            background: `${C.orange}20`,
            color: C.orange,
            border: `1px solid ${C.orange}40`,
          }}
        >
          Vymazat všechny ({totalActiveFilters})
        </button>
      )}

      <p className="text-[9px] mt-3 px-1" style={{ color: C.faint }}>
        <Filter size={10} className="inline mr-1" />
        {totalActiveFilters} aktivních filtrů
      </p>
    </div>
  );
};

export default AdvancedFilter;
