import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Plus, Minus } from 'lucide-react';
import { DEFAULT_DEPARTMENTS } from '../constants';

interface GridCell {
  deptId: string;
}

interface GridConfig {
  cols: number;
  rows: number;
  cells: Map<string, GridCell>;
}

interface PavilionSchedule {
  [pavilion: string]: GridConfig[];
}

const ScheduleManager: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 4, 1));
  const [activeDay, setActiveDay] = useState<{ pavilion: string; dayIndex: number } | null>(null);
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
  
  const PAVILIONS = Array.from({ length: 10 }, (_, i) => `pavilion-${i + 1}`);
  const DAYS_OF_WEEK = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];
  const monthName = currentDate.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' });

  // Initialize schedules for all 10 pavilions
  const initializeSchedules = () => {
    const result: PavilionSchedule = {};
    PAVILIONS.forEach(pavilion => {
      result[pavilion] = Array.from({ length: 7 }, () => ({
        cols: 1,
        rows: 1,
        cells: new Map([['1-1', { deptId: '' }]]),
      }));
    });
    return result;
  };

  const [schedules, setSchedules] = useState<PavilionSchedule>(initializeSchedules());

  const getDepartmentById = (id: string) => DEFAULT_DEPARTMENTS.find(d => d.id === id);

  const handleUpdateGridSize = (pavilion: string, dayIndex: number, cols: number, rows: number) => {
    setSchedules(prev => {
      const newSchedules = { ...prev };
      const config = newSchedules[pavilion][dayIndex];
      const newCells = new Map<string, GridCell>();

      for (let c = 1; c <= cols; c++) {
        for (let r = 1; r <= rows; r++) {
          const key = `${c}-${r}`;
          newCells.set(key, config.cells.get(key) || { deptId: '' });
        }
      }

      const scheduleArray = [...newSchedules[pavilion]];
      scheduleArray[dayIndex] = { cols, rows, cells: newCells };
      newSchedules[pavilion] = scheduleArray;
      return newSchedules;
    });
  };

  const handleSetDepartment = (pavilion: string, dayIndex: number, cellKey: string, deptId: string) => {
    setSchedules(prev => {
      const newSchedules = { ...prev };
      const config = newSchedules[pavilion][dayIndex];
      const newCells = new Map(config.cells);
      newCells.set(cellKey, { deptId });

      const scheduleArray = [...newSchedules[pavilion]];
      scheduleArray[dayIndex] = { ...config, cells: newCells };
      newSchedules[pavilion] = scheduleArray;
      return newSchedules;
    });
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex-shrink-0">
        <p className="text-xs font-bold text-purple-400/60 uppercase tracking-[0.2em] mb-3">PLÁNOVÁNÍ</p>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">ROZPIS SÁLŮ - VŠECHNY PAVILONY</h1>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Předchozí měsíc"
            >
              <ChevronLeft className="w-5 h-5 text-white/60" />
            </button>
            <p className="text-lg font-bold text-white min-w-48 text-center">{monthName}</p>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Příští měsíc"
            >
              <ChevronRight className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-grow overflow-auto px-6 py-4">
        {/* Days Header - Sticky */}
        <div className="sticky top-0 grid gap-2 mb-4 z-10" style={{ gridTemplateColumns: 'minmax(120px, 1fr) repeat(7, 1fr)' }}>
          <div className="h-12" />
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="text-center h-12 flex items-center justify-center">
              <p className="text-xs font-bold text-purple-300 uppercase">{day}</p>
            </div>
          ))}
        </div>

        {/* Pavilions Grid */}
        <div className="space-y-4">
          {PAVILIONS.map((pavilion, pavilionIdx) => {
            const pavilionSchedule = schedules[pavilion];

            return (
              <div key={pavilion} className="grid gap-2" style={{ gridTemplateColumns: 'minmax(120px, 1fr) repeat(7, 1fr)' }}>
                {/* Pavilion Name */}
                <div className="flex items-center justify-center bg-white/5 rounded-lg border border-white/10 px-3 py-2 min-h-24">
                  <span className="text-sm font-bold text-white text-center">Pavilon {pavilionIdx + 1}</span>
                </div>

                {/* Days for this Pavilion */}
                {pavilionSchedule.map((config, dayIndex) => {
                  const isActive = activeDay?.pavilion === pavilion && activeDay?.dayIndex === dayIndex;

                  return (
                    <motion.div
                      key={`${pavilion}-day-${dayIndex}`}
                      onClick={() => {
                        setActiveDay(isActive ? null : { pavilion, dayIndex });
                        setSelectedCellKey(null);
                      }}
                      className="rounded-lg border cursor-pointer overflow-hidden flex flex-col transition-all min-h-24"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderColor: isActive ? 'rgba(139, 92, 246, 0.5)' : 'rgba(255,255,255,0.08)',
                        boxShadow: isActive ? '0 0 20px rgba(139, 92, 246, 0.2)' : 'none',
                      }}
                      whileHover={{
                        background: 'rgba(255,255,255,0.04)',
                        borderColor: 'rgba(139, 92, 246, 0.3)',
                      }}
                    >
                      {/* Grid Info Bar */}
                      <div className="px-2 py-1 border-b border-white/5 bg-black/20 flex items-center justify-between flex-shrink-0">
                        <span className="text-[10px] font-bold text-white/50">D{dayIndex + 1}</span>
                        <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          {config.cols}×{config.rows}
                        </span>
                      </div>

                      {/* Grid Display */}
                      <div className="flex-grow p-1 overflow-hidden" style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
                        gridTemplateRows: `repeat(${config.rows}, 1fr)`,
                        gap: '1px',
                      }}>
                        {Array.from({ length: config.cols * config.rows }).map((_, i) => {
                          const col = (i % config.cols) + 1;
                          const row = Math.floor(i / config.cols) + 1;
                          const cellKey = `${col}-${row}`;
                          const cell = config.cells.get(cellKey);
                          const dept = cell?.deptId ? getDepartmentById(cell.deptId) : null;
                          const isCellActive = selectedCellKey === cellKey && isActive;

                          return (
                            <motion.button
                              key={cellKey}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isActive) {
                                  setSelectedCellKey(isCellActive ? null : cellKey);
                                }
                              }}
                              className="flex-1 rounded-sm border text-[8px] font-bold flex items-center justify-center transition-all"
                              style={{
                                background: dept ? `${dept.accentColor}25` : isCellActive ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                                borderColor: dept ? `${dept.accentColor}50` : isCellActive ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255,255,255,0.08)',
                                color: dept ? '#FFF' : 'rgba(255,255,255,0.2)',
                                fontSize: '7px',
                              }}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              {dept ? dept.name.substring(0, 2).toUpperCase() : '+'}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Side Panel */}
      <AnimatePresence>
        {activeDay && (
          <motion.div
            className="fixed right-0 top-0 bottom-0 w-96 bg-black/60 backdrop-blur-xl border-l border-white/10 flex flex-col overflow-hidden z-50"
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            {/* Panel Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0 bg-black/40">
              <h3 className="text-lg font-bold text-white">
                {activeDay.pavilion.replace('-', ' ').toUpperCase()} - Den {activeDay.dayIndex + 1}
              </h3>
              <button
                onClick={() => setActiveDay(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-grow overflow-y-auto px-6 py-4 space-y-6">
              {/* Grid Structure */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-white/60 uppercase tracking-wide">Struktura mřížky</p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/80 font-medium">Sloupce:</span>
                    <div className="flex items-center gap-3 bg-white/10 rounded-lg px-3 py-2 border border-white/20">
                      <button
                        onClick={() => handleUpdateGridSize(activeDay.pavilion, activeDay.dayIndex, Math.max(1, schedules[activeDay.pavilion][activeDay.dayIndex].cols - 1), schedules[activeDay.pavilion][activeDay.dayIndex].rows)}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                      >
                        <Minus className="w-4 h-4 text-white/70" />
                      </button>
                      <span className="text-sm font-bold text-white w-8 text-center">{schedules[activeDay.pavilion][activeDay.dayIndex].cols}</span>
                      <button
                        onClick={() => handleUpdateGridSize(activeDay.pavilion, activeDay.dayIndex, Math.min(4, schedules[activeDay.pavilion][activeDay.dayIndex].cols + 1), schedules[activeDay.pavilion][activeDay.dayIndex].rows)}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                      >
                        <Plus className="w-4 h-4 text-white/70" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/80 font-medium">Řádky:</span>
                    <div className="flex items-center gap-3 bg-white/10 rounded-lg px-3 py-2 border border-white/20">
                      <button
                        onClick={() => handleUpdateGridSize(activeDay.pavilion, activeDay.dayIndex, schedules[activeDay.pavilion][activeDay.dayIndex].cols, Math.max(1, schedules[activeDay.pavilion][activeDay.dayIndex].rows - 1))}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                      >
                        <Minus className="w-4 h-4 text-white/70" />
                      </button>
                      <span className="text-sm font-bold text-white w-8 text-center">{schedules[activeDay.pavilion][activeDay.dayIndex].rows}</span>
                      <button
                        onClick={() => handleUpdateGridSize(activeDay.pavilion, activeDay.dayIndex, schedules[activeDay.pavilion][activeDay.dayIndex].cols, Math.min(4, schedules[activeDay.pavilion][activeDay.dayIndex].rows + 1))}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                      >
                        <Plus className="w-4 h-4 text-white/70" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Presets */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-white/60 uppercase tracking-wide">Předvolby</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { cols: 1, rows: 1, label: '1×1' },
                    { cols: 2, rows: 1, label: '2×1' },
                    { cols: 1, rows: 2, label: '1×2' },
                    { cols: 2, rows: 2, label: '2×2' },
                  ].map(preset => {
                    const config = schedules[activeDay.pavilion][activeDay.dayIndex];
                    const isActive = config.cols === preset.cols && config.rows === preset.rows;
                    return (
                      <button
                        key={`${preset.cols}-${preset.rows}`}
                        onClick={() => handleUpdateGridSize(activeDay.pavilion, activeDay.dayIndex, preset.cols, preset.rows)}
                        className="px-4 py-3 rounded-lg font-bold border transition-all text-sm"
                        style={{
                          background: isActive ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                          borderColor: isActive ? 'rgba(139, 92, 246, 0.6)' : 'rgba(255,255,255,0.1)',
                          color: '#FFF',
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Department Assignment */}
              {selectedCellKey && (
                <div className="space-y-3 border-t border-white/10 pt-6">
                  <p className="text-xs font-bold text-white/60 uppercase tracking-wide">Oddělení - Buňka {selectedCellKey}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map(dept => {
                      const config = schedules[activeDay.pavilion][activeDay.dayIndex];
                      const isSelected = config.cells.get(selectedCellKey)?.deptId === dept.id;
                      return (
                        <button
                          key={dept.id}
                          onClick={() => handleSetDepartment(activeDay.pavilion, activeDay.dayIndex, selectedCellKey, isSelected ? '' : dept.id)}
                          className="px-3 py-2 rounded-lg font-bold border transition-all text-xs"
                          style={{
                            background: isSelected ? `${dept.accentColor}30` : `${dept.accentColor}12`,
                            borderColor: isSelected ? `${dept.accentColor}60` : `${dept.accentColor}30`,
                            color: '#FFF',
                          }}
                        >
                          {dept.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScheduleManager;
