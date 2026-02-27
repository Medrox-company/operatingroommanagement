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

type ScheduleGrid = Map<number, GridConfig>;

const ScheduleManager: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 4, 1));
  const [scheduleGrid, setScheduleGrid] = useState<ScheduleGrid>(new Map([
    [1, { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'tra' }]]) }],
    [2, { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'chir' }]]) }],
    [3, { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: '' }]]) }],
    [5, { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'uro' }]]) }],
    [7, { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'neurochir' }]]) }],
    [8, { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'chir' }]]) }],
    [14, { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'chir' }]]) }],
    [21, { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'orl' }]]) }],
    [22, { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'gyn' }]]) }],
    [26, { cols: 1, rows: 1, cells: new Map([['1-1', { deptId: 'tra' }]]) }],
  ]));

  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [tempCols, setTempCols] = useState(1);
  const [tempRows, setTempRows] = useState(1);

  const DAYS_OF_WEEK = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const monthName = currentDate.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const adjustedFirstDay = (firstDay + 6) % 7;

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < adjustedFirstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const getDepartmentById = (id: string) => DEFAULT_DEPARTMENTS.find(d => d.id === id);

  const handleActiveDay = (day: number) => {
    if (activeDay === day) {
      setActiveDay(null);
      setActiveCell(null);
    } else {
      const config = scheduleGrid.get(day);
      if (config) {
        setTempCols(config.cols);
        setTempRows(config.rows);
      }
      setActiveDay(day);
      setActiveCell(null);
    }
  };

  const handleUpdateGrid = (cols: number, rows: number) => {
    if (!activeDay) return;
    const config = scheduleGrid.get(activeDay);
    if (config) {
      setTempCols(cols);
      setTempRows(rows);
      const newCells = new Map<string, GridCell>();
      for (let c = 1; c <= cols; c++) {
        for (let r = 1; r <= rows; r++) {
          const key = `${c}-${r}`;
          newCells.set(key, config.cells.get(key) || { deptId: '' });
        }
      }
      setScheduleGrid(new Map(scheduleGrid).set(activeDay, { cols, rows, cells: newCells }));
    }
  };

  const handleSetDepartment = (cellKey: string, deptId: string) => {
    if (!activeDay) return;
    const config = scheduleGrid.get(activeDay);
    if (config) {
      const newCells = new Map(config.cells);
      newCells.set(cellKey, { deptId });
      setScheduleGrid(new Map(scheduleGrid).set(activeDay, { ...config, cells: newCells }));
    }
  };

  const activeConfig = activeDay ? scheduleGrid.get(activeDay) : null;

  return (
    <div className="w-full h-screen flex overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Main Content Area */}
      <div className="flex-grow flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex-shrink-0 border-b border-white/5">
          <p className="text-xs font-bold text-purple-400/60 uppercase tracking-[0.2em] mb-2">PLÁNOVÁNÍ</p>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black text-white">ROZPIS SÁLŮ</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white/60" />
              </button>
              <p className="text-xl font-black text-white min-w-48 text-center">{monthName}</p>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white/60" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Area */}
        <div className="flex-grow overflow-hidden flex flex-col px-6 py-4 gap-3">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="text-center">
                <p className="text-xs font-bold text-white/40 uppercase">{day}</p>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 flex-grow overflow-hidden">
            {calendarDays.map((day, idx) => {
              const config = day ? scheduleGrid.get(day) : null;
              const isActive = activeDay === day;

              return (
                <div key={idx} className="min-h-0 flex flex-col">
                  {day && config ? (
                    <motion.div
                      onClick={() => handleActiveDay(day)}
                      className="w-full h-full rounded-xl border cursor-pointer transition-all overflow-hidden flex flex-col"
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
                      {/* Day Header */}
                      <div className="px-2 py-1.5 border-b border-white/5 flex items-center justify-between bg-black/20">
                        <span className="text-xs font-bold text-white/70">{day}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          {config.cols}×{config.rows}
                        </span>
                      </div>

                      {/* Grid Display */}
                      <div className="flex-grow flex overflow-hidden gap-0.5 p-1" style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
                        gridTemplateRows: `repeat(${config.rows}, 1fr)`,
                      }}>
                        {Array.from({ length: config.cols * config.rows }).map((_, i) => {
                          const col = (i % config.cols) + 1;
                          const row = Math.floor(i / config.cols) + 1;
                          const cellKey = `${col}-${row}`;
                          const cell = config.cells.get(cellKey);
                          const dept = cell?.deptId ? getDepartmentById(cell.deptId) : null;

                          return (
                            <motion.button
                              key={cellKey}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isActive) {
                                  setActiveCell(activeCell === cellKey ? null : cellKey);
                                }
                              }}
                              className="flex-1 rounded-md border text-[10px] font-bold flex items-center justify-center transition-all"
                              style={{
                                background: dept ? `${dept.accentColor}20` : 'rgba(255,255,255,0.03)',
                                borderColor: dept ? `${dept.accentColor}40` : 'rgba(255,255,255,0.1)',
                                color: dept ? '#FFF' : 'rgba(255,255,255,0.2)',
                              }}
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.92 }}
                            >
                              {dept ? dept.name.substring(0, 2) : '+'}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="w-full h-full rounded-xl border" style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.04)' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <AnimatePresence>
        {activeDay && (
          <motion.div
            className="w-72 bg-gradient-to-b from-slate-900/80 to-slate-950 border-l border-white/10 backdrop-blur-xl flex flex-col overflow-hidden"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            {/* Panel Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-black text-white">Sál {activeDay}</h3>
              <button
                onClick={() => setActiveDay(null)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-grow overflow-y-auto px-4 py-4 space-y-4">
              {/* Grid Preview */}
              <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <p className="text-xs font-bold text-white/60 uppercase">Náhled</p>
                <div className="p-3 rounded-lg border border-white/10 bg-black/20">
                  <div className="flex gap-1" style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${tempCols}, 1fr)`,
                    gridTemplateRows: `repeat(${tempRows}, 1fr)`,
                    aspectRatio: `${tempCols} / ${tempRows}`,
                  }}>
                    {Array.from({ length: tempCols * tempRows }).map((_, i) => {
                      const col = (i % tempCols) + 1;
                      const row = Math.floor(i / tempCols) + 1;
                      const cellKey = `${col}-${row}`;
                      const cell = activeConfig?.cells.get(cellKey);
                      const dept = cell?.deptId ? getDepartmentById(cell.deptId) : null;

                      return (
                        <motion.div
                          key={cellKey}
                          className="rounded border text-[9px] font-bold flex items-center justify-center"
                          style={{
                            background: dept ? `${dept.accentColor}25` : 'rgba(255,255,255,0.05)',
                            borderColor: dept ? `${dept.accentColor}50` : 'rgba(255,255,255,0.15)',
                            color: dept ? '#FFF' : 'rgba(255,255,255,0.3)',
                          }}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          {dept ? dept.name.substring(0, 1) : '·'}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>

              {/* Grid Controls */}
              <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                <p className="text-xs font-bold text-white/60 uppercase">Struktura</p>

                {/* Rows Control */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/70">Řádky</span>
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg border border-white/10 px-2 py-1">
                    <button
                      onClick={() => handleUpdateGrid(tempCols, Math.max(1, tempRows - 1))}
                      className="p-0.5 hover:bg-white/10 rounded transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5 text-white/60" />
                    </button>
                    <span className="text-xs font-bold text-white min-w-5 text-center">{tempRows}</span>
                    <button
                      onClick={() => handleUpdateGrid(tempCols, Math.min(4, tempRows + 1))}
                      className="p-0.5 hover:bg-white/10 rounded transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-white/60" />
                    </button>
                  </div>
                </div>

                {/* Columns Control */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/70">Sloupce</span>
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg border border-white/10 px-2 py-1">
                    <button
                      onClick={() => handleUpdateGrid(Math.max(1, tempCols - 1), tempRows)}
                      className="p-0.5 hover:bg-white/10 rounded transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5 text-white/60" />
                    </button>
                    <span className="text-xs font-bold text-white min-w-5 text-center">{tempCols}</span>
                    <button
                      onClick={() => handleUpdateGrid(Math.min(4, tempCols + 1), tempRows)}
                      className="p-0.5 hover:bg-white/10 rounded transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-white/60" />
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Quick Presets */}
              <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <p className="text-xs font-bold text-white/60 uppercase">Předvolby</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { c: 1, r: 1, label: '1×1' },
                    { c: 2, r: 1, label: '2×1' },
                    { c: 1, r: 2, label: '1×2' },
                    { c: 2, r: 2, label: '2×2' },
                  ].map((preset) => (
                    <motion.button
                      key={`${preset.c}-${preset.r}`}
                      onClick={() => handleUpdateGrid(preset.c, preset.r)}
                      className="px-3 py-2 rounded-lg text-xs font-bold border transition-all"
                      style={{
                        background: tempCols === preset.c && tempRows === preset.r ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.08)',
                        borderColor: tempCols === preset.c && tempRows === preset.r ? 'rgba(139, 92, 246, 0.6)' : 'rgba(139, 92, 246, 0.2)',
                        color: '#FFF',
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {preset.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Department Selection */}
              {activeCell && (
                <motion.div className="space-y-2 pt-2 border-t border-white/5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-xs font-bold text-white/60 uppercase">Oddělení</p>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map((dept) => (
                      <motion.button
                        key={dept.id}
                        onClick={() => handleSetDepartment(activeCell, dept.id)}
                        className="px-2 py-2 rounded-lg text-xs font-bold border transition-all"
                        style={{
                          background: `${dept.accentColor}15`,
                          borderColor: `${dept.accentColor}40`,
                          color: '#FFF',
                        }}
                        whileHover={{ scale: 1.05, background: `${dept.accentColor}25` }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {dept.name.substring(0, 8)}
                      </motion.button>
                    ))}
                    <motion.button
                      onClick={() => handleSetDepartment(activeCell, '')}
                      className="col-span-2 px-2 py-2 rounded-lg text-xs font-bold border transition-all"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        color: '#FCA5A5',
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Vymazat
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScheduleManager;
