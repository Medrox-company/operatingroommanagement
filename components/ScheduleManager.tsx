import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Grid3x3, Plus, Minus } from 'lucide-react';
import { DEFAULT_DEPARTMENTS } from '../constants';

type GridCell = { deptId: string; };
type GridConfig = { cols: number; rows: number; cells: Map<string, GridCell> };
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
  const [configMode, setConfigMode] = useState(false);

  const DAYS_OF_WEEK = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const monthName = currentDate.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const adjustedFirstDay = (firstDay + 6) % 7;

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < adjustedFirstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const getDepartmentById = (id: string) => DEFAULT_DEPARTMENTS.find(d => d.id === id);

  const handleUpdateGridConfig = (day: number, cols: number, rows: number) => {
    const config = scheduleGrid.get(day);
    if (config) {
      const newCells = new Map<string, GridCell>();
      for (let c = 1; c <= cols; c++) {
        for (let r = 1; r <= rows; r++) {
          const key = `${c}-${r}`;
          newCells.set(key, config.cells.get(key) || { deptId: '' });
        }
      }
      setScheduleGrid(new Map(scheduleGrid).set(day, { cols, rows, cells: newCells }));
    }
  };

  const handleSetDepartment = (day: number, cellKey: string, deptId: string) => {
    const config = scheduleGrid.get(day);
    if (config) {
      const newCells = new Map(config.cells);
      newCells.set(cellKey, { deptId });
      setScheduleGrid(new Map(scheduleGrid).set(day, { ...config, cells: newCells }));
    }
  };

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
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

      {/* Calendar Grid */}
      <div className="flex-grow overflow-hidden flex flex-col px-6 py-4 gap-3">
        {/* Days Header */}
        <div className="grid grid-cols-7 gap-2">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="text-center">
              <p className="text-xs font-bold text-white/40 uppercase">{day}</p>
            </div>
          ))}
        </div>

        {/* Calendar Cells */}
        <div className="grid grid-cols-7 gap-2 flex-grow overflow-hidden">
          {calendarDays.map((day, idx) => {
            const config = day ? scheduleGrid.get(day) : null;
            const isActive = activeDay === day;

            return (
              <div key={idx} className="relative group min-h-0">
                {day && config ? (
                  <motion.div
                    onClick={() => setActiveDay(isActive ? null : day)}
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
                    {/* Day Number */}
                    <div className="px-2 py-1.5 border-b border-white/5 flex items-center justify-between bg-black/20">
                      <span className="text-xs font-bold text-white/70">{day}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                        {config.cols}×{config.rows}
                      </span>
                    </div>

                    {/* Grid Content */}
                    <div className="flex-grow flex overflow-hidden gap-0.5 p-1" style={{ display: 'grid', gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}>
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
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Inline Controls - Compact Popovers */}
      <AnimatePresence>
        {activeDay && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 px-6 py-4 border-t border-white/10 bg-slate-900/95 backdrop-blur-xl flex gap-8"
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            {/* Grid Configuration */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-white/60 uppercase">Mřížka:</span>
              
              {/* Rows */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60">Řádky:</span>
                <div className="flex items-center gap-1 bg-white/5 rounded-md border border-white/10 px-2 py-1">
                  <button
                    onClick={() => handleUpdateGridConfig(activeDay, scheduleGrid.get(activeDay)?.cols || 1, Math.max(1, (scheduleGrid.get(activeDay)?.rows || 1) - 1))}
                    className="p-0.5 hover:bg-white/10 rounded transition-colors"
                  >
                    <Minus className="w-3 h-3 text-white/60" />
                  </button>
                  <span className="text-xs font-bold text-white min-w-6 text-center">{scheduleGrid.get(activeDay)?.rows || 1}</span>
                  <button
                    onClick={() => handleUpdateGridConfig(activeDay, scheduleGrid.get(activeDay)?.cols || 1, Math.min(4, (scheduleGrid.get(activeDay)?.rows || 1) + 1))}
                    className="p-0.5 hover:bg-white/10 rounded transition-colors"
                  >
                    <Plus className="w-3 h-3 text-white/60" />
                  </button>
                </div>
              </div>

              {/* Columns */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60">Sloupce:</span>
                <div className="flex items-center gap-1 bg-white/5 rounded-md border border-white/10 px-2 py-1">
                  <button
                    onClick={() => handleUpdateGridConfig(activeDay, Math.max(1, (scheduleGrid.get(activeDay)?.cols || 1) - 1), scheduleGrid.get(activeDay)?.rows || 1)}
                    className="p-0.5 hover:bg-white/10 rounded transition-colors"
                  >
                    <Minus className="w-3 h-3 text-white/60" />
                  </button>
                  <span className="text-xs font-bold text-white min-w-6 text-center">{scheduleGrid.get(activeDay)?.cols || 1}</span>
                  <button
                    onClick={() => handleUpdateGridConfig(activeDay, Math.min(4, (scheduleGrid.get(activeDay)?.cols || 1) + 1), scheduleGrid.get(activeDay)?.rows || 1)}
                    className="p-0.5 hover:bg-white/10 rounded transition-colors"
                  >
                    <Plus className="w-3 h-3 text-white/60" />
                  </button>
                </div>
              </div>
            </div>

            {/* Department Selection */}
            {activeCell && (
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <span className="text-xs font-bold text-white/60 uppercase">Oddělení:</span>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map((dept) => (
                    <motion.button
                      key={dept.id}
                      onClick={() => handleSetDepartment(activeDay, activeCell, dept.id)}
                      className="px-3 py-1.5 rounded-md text-xs font-bold border transition-all whitespace-nowrap flex-shrink-0"
                      style={{
                        background: `${dept.accentColor}15`,
                        borderColor: `${dept.accentColor}40`,
                        color: '#FFF',
                      }}
                      whileHover={{ scale: 1.05, background: `${dept.accentColor}25` }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {dept.name}
                    </motion.button>
                  ))}
                  
                  {/* Clear */}
                  <motion.button
                    onClick={() => handleSetDepartment(activeDay, activeCell, '')}
                    className="px-3 py-1.5 rounded-md text-xs font-bold border transition-all whitespace-nowrap flex-shrink-0"
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScheduleManager;
