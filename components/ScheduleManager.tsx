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

interface ScheduleWeek {
  [pavilion: string]: GridConfig[];
}

const ScheduleManager: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 4, 1));
  const [selectedPavilion, setSelectedPavilion] = useState('pavilion-a');
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
  
  // Store schedules per week and pavilion - days 1-7 only
  const [schedules, setSchedules] = useState<ScheduleWeek>({
    'pavilion-a': [
      { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'tra' }]]) },
      { cols: 2, rows: 1, cells: new Map([['1-1', { deptId: 'chir' }], ['2-1', { deptId: 'uro' }]]) },
      { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: '' }]]) },
      { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'neuro' }]]) },
      { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'uro' }]]) },
      { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: '' }]]) },
      { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'orl' }]]) },
    ],
    'pavilion-b': [
      { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'chir' }]]) },
      { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'gyn' }]]) },
      { cols: 2, rows: 2, cells: new Map([['1-1', { deptId: 'tra' }], ['2-1', { deptId: 'neurochir' }], ['1-2', { deptId: 'uro' }], ['2-2', { deptId: '' }]]) },
      { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'orl' }]]) },
      { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'chir' }]]) },
      { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'gyn' }]]) },
      { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'tra' }]]) },
    ],
  });

  const DAYS_OF_WEEK = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];
  const monthName = currentDate.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' });
  
  const currentSchedule = schedules[selectedPavilion];
  const activeConfig = activeDay ? currentSchedule[activeDay - 1] : null;

  const getDepartmentById = (id: string) => DEFAULT_DEPARTMENTS.find(d => d.id === id);

  const handleUpdateGridSize = (cols: number, rows: number) => {
    if (!activeDay) return;
    
    const newCells = new Map<string, GridCell>();
    for (let c = 1; c <= cols; c++) {
      for (let r = 1; r <= rows; r++) {
        const key = `${c}-${r}`;
        const existing = activeConfig?.cells.get(key);
        newCells.set(key, existing || { deptId: '' });
      }
    }

    const newSchedules = { ...schedules };
    if (!newSchedules[selectedPavilion]) newSchedules[selectedPavilion] = [];
    
    const newConfig = { cols, rows, cells: newCells };
    const scheduleArray = [...currentSchedule];
    scheduleArray[activeDay - 1] = newConfig;
    newSchedules[selectedPavilion] = scheduleArray;
    setSchedules(newSchedules);
  };

  const handleSetDepartment = (cellKey: string, deptId: string) => {
    if (!activeDay || !activeConfig) return;

    const newCells = new Map(activeConfig.cells);
    newCells.set(cellKey, { deptId });

    const newSchedules = { ...schedules };
    const scheduleArray = [...currentSchedule];
    scheduleArray[activeDay - 1] = { ...activeConfig, cells: newCells };
    newSchedules[selectedPavilion] = scheduleArray;
    setSchedules(newSchedules);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex-shrink-0">
        <p className="text-xs font-bold text-purple-400/60 uppercase tracking-[0.2em] mb-3">PLÁNOVÁNÍ</p>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-white">ROZPIS SÁLŮ</h1>
          
          <div className="flex items-center gap-6">
            {/* Pavilion Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-white/60 uppercase">Pavilon:</label>
              <select
                value={selectedPavilion}
                onChange={(e) => {
                  setSelectedPavilion(e.target.value);
                  setActiveDay(null);
                  setSelectedCellKey(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs font-bold text-white cursor-pointer hover:bg-white/15 transition-colors"
              >
                <option value="pavilion-a">Pavilon A</option>
                <option value="pavilion-b">Pavilon B</option>
              </select>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Předchozí měsíc"
              >
                <ChevronLeft className="w-5 h-5 text-white/60" />
              </button>
              <p className="text-lg font-black text-white min-w-48 text-center">{monthName}</p>
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
      </div>

      {/* Main Grid */}
      <div className="flex-grow flex overflow-hidden px-6 py-4 gap-4">
        {/* Calendar Grid */}
        <div className="flex-grow flex flex-col overflow-hidden gap-3">
          {/* Days Header */}
          <div className="grid grid-cols-7 gap-2 flex-shrink-0">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="text-center">
                <p className="text-xs font-bold text-white/50 uppercase">{day}</p>
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2 flex-grow overflow-hidden">
            {currentSchedule.map((config, dayIndex) => {
              const dayNum = dayIndex + 1;
              const isActive = activeDay === dayNum;

              return (
                <motion.div
                  key={dayIndex}
                  onClick={() => {
                    setActiveDay(isActive ? null : dayNum);
                    setSelectedCellKey(null);
                  }}
                  className="rounded-xl border cursor-pointer overflow-hidden flex flex-col transition-all"
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
                  {/* Day Number & Grid Info */}
                  <div className="px-2 py-1.5 border-b border-white/5 bg-black/20 flex items-center justify-between flex-shrink-0">
                    <span className="text-xs font-bold text-white/70">Den {dayNum}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      {config.cols}×{config.rows}
                    </span>
                  </div>

                  {/* Grid Display */}
                  <div className="flex-grow p-1 overflow-hidden" style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
                    gridTemplateRows: `repeat(${config.rows}, 1fr)`,
                    gap: '2px',
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
                          className="flex-1 rounded-md border text-[9px] font-bold flex items-center justify-center transition-all"
                          style={{
                            background: dept ? `${dept.accentColor}20` : isCellActive ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                            borderColor: dept ? `${dept.accentColor}40` : isCellActive ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255,255,255,0.1)',
                            color: dept ? '#FFF' : 'rgba(255,255,255,0.2)',
                          }}
                          whileHover={{ scale: 1.05 }}
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
        </div>

        {/* Side Panel */}
        <AnimatePresence>
          {activeDay && activeConfig && (
            <motion.div
              className="w-80 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col overflow-hidden"
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
            >
              {/* Panel Header */}
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                <h3 className="text-sm font-black text-white">Den {activeDay}</h3>
                <button
                  onClick={() => setActiveDay(null)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-grow overflow-y-auto px-4 py-4 space-y-4">
                {/* Grid Structure */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-white/60 uppercase">Struktura mřížky</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/70">Sloupce:</span>
                      <div className="flex items-center gap-2 bg-white/10 rounded px-2 py-1 border border-white/20">
                        <button
                          onClick={() => handleUpdateGridSize(Math.max(1, activeConfig.cols - 1), activeConfig.rows)}
                          className="p-0.5 hover:bg-white/10 rounded"
                        >
                          <Minus className="w-3 h-3 text-white/60" />
                        </button>
                        <span className="text-xs font-bold text-white w-6 text-center">{activeConfig.cols}</span>
                        <button
                          onClick={() => handleUpdateGridSize(Math.min(4, activeConfig.cols + 1), activeConfig.rows)}
                          className="p-0.5 hover:bg-white/10 rounded"
                        >
                          <Plus className="w-3 h-3 text-white/60" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/70">Řádky:</span>
                      <div className="flex items-center gap-2 bg-white/10 rounded px-2 py-1 border border-white/20">
                        <button
                          onClick={() => handleUpdateGridSize(activeConfig.cols, Math.max(1, activeConfig.rows - 1))}
                          className="p-0.5 hover:bg-white/10 rounded"
                        >
                          <Minus className="w-3 h-3 text-white/60" />
                        </button>
                        <span className="text-xs font-bold text-white w-6 text-center">{activeConfig.rows}</span>
                        <button
                          onClick={() => handleUpdateGridSize(activeConfig.cols, Math.min(4, activeConfig.rows + 1))}
                          className="p-0.5 hover:bg-white/10 rounded"
                        >
                          <Plus className="w-3 h-3 text-white/60" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Presets */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-white/60 uppercase">Předvolby</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { cols: 1, rows: 1, label: '1×1' },
                      { cols: 2, rows: 1, label: '2×1' },
                      { cols: 1, rows: 2, label: '1×2' },
                      { cols: 2, rows: 2, label: '2×2' },
                    ].map(preset => (
                      <button
                        key={`${preset.cols}-${preset.rows}`}
                        onClick={() => handleUpdateGridSize(preset.cols, preset.rows)}
                        className="px-2 py-1.5 rounded-md text-xs font-bold border transition-all"
                        style={{
                          background: activeConfig.cols === preset.cols && activeConfig.rows === preset.rows ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                          borderColor: activeConfig.cols === preset.cols && activeConfig.rows === preset.rows ? 'rgba(139, 92, 246, 0.6)' : 'rgba(255,255,255,0.1)',
                          color: '#FFF',
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Department Assignment */}
                {selectedCellKey && (
                  <div className="space-y-2 border-t border-white/10 pt-4">
                    <p className="text-xs font-bold text-white/60 uppercase">Oddělení - Buňka {selectedCellKey}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map(dept => {
                        const isSelected = activeConfig.cells.get(selectedCellKey)?.deptId === dept.id;
                        return (
                          <button
                            key={dept.id}
                            onClick={() => handleSetDepartment(selectedCellKey, isSelected ? '' : dept.id)}
                            className="px-2 py-1.5 rounded-md text-xs font-bold border transition-all"
                            style={{
                              background: isSelected ? `${dept.accentColor}30` : `${dept.accentColor}10`,
                              borderColor: isSelected ? `${dept.accentColor}60` : `${dept.accentColor}30`,
                              color: '#FFF',
                            }}
                          >
                            {dept.name.substring(0, 3)}
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
    </div>
  );
};

export default ScheduleManager;
