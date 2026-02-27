import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Plus, Minus } from 'lucide-react';
import { DEFAULT_DEPARTMENTS } from '../constants';

interface GridConfig {
  cols: number;
  rows: number;
  roomAssignments: Map<string, string>;
}

type ScheduleGrid = Map<number, GridConfig>;

const ScheduleManager: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 4, 1));
  const [scheduleGrid, setScheduleGrid] = useState<ScheduleGrid>(new Map([
    [1, { cols: 1, rows: 1, roomAssignments: new Map([['1-1', 'tra']]) }],
    [2, { cols: 1, rows: 1, roomAssignments: new Map([['1-1', 'chir']]) }],
    [3, { cols: 1, rows: 1, roomAssignments: new Map() }],
    [5, { cols: 1, rows: 1, roomAssignments: new Map([['1-1', 'uro']]) }],
    [7, { cols: 1, rows: 1, roomAssignments: new Map([['1-1', 'neurochir']]) }],
    [8, { cols: 1, rows: 1, roomAssignments: new Map([['1-1', 'chir']]) }],
    [14, { cols: 1, rows: 1, roomAssignments: new Map([['1-1', 'chir']]) }],
    [21, { cols: 1, rows: 1, roomAssignments: new Map([['1-1', 'orl']]) }],
    [22, { cols: 1, rows: 1, roomAssignments: new Map([['1-1', 'gyn']]) }],
    [26, { cols: 1, rows: 1, roomAssignments: new Map([['1-1', 'tra']]) }],
  ]));
  
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedGridCell, setSelectedGridCell] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'layout' | 'department' | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const DAYS_OF_WEEK = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getDepartmentById = (deptId: string) => {
    return DEFAULT_DEPARTMENTS.find(d => d.id === deptId);
  };

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

  const handleDayClick = (day: number, e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setSelectedDay(day);
    setActiveMode('layout');
    setPopoverPos({ x: rect.left, y: rect.bottom + 8 });
  };

  const handleGridCellClick = (cellKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setSelectedGridCell(cellKey);
    setActiveMode('department');
    setPopoverPos({ x: rect.left, y: rect.bottom + 8 });
  };

  const updateGridLayout = (cols: number, rows: number) => {
    if (!selectedDay) return;
    const config = scheduleGrid.get(selectedDay) || { cols: 1, rows: 1, roomAssignments: new Map() };
    const newAssignments = new Map<string, string>();
    setScheduleGrid(new Map(scheduleGrid).set(selectedDay, { cols, rows, roomAssignments: newAssignments }));
  };

  const updateDepartment = (deptId: string) => {
    if (!selectedDay || !selectedGridCell) return;
    const config = scheduleGrid.get(selectedDay);
    if (!config) return;
    const newAssignments = new Map(config.roomAssignments);
    newAssignments.set(selectedGridCell, deptId);
    setScheduleGrid(new Map(scheduleGrid).set(selectedDay, { ...config, roomAssignments: newAssignments }));
    setActiveMode(null);
    setSelectedGridCell(null);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-slate-950">
      {/* Main Header */}
      <div className="pb-3 flex-shrink-0 px-4 pt-4">
        <p className="text-xs font-bold text-purple-400/60 uppercase tracking-[0.2em] mb-1">PLÁNOVÁNÍ</p>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-white">
            ROZPIS <span className="text-slate-700">SÁLŮ</span>
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={handlePreviousMonth} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-white/60" />
            </button>
            <p className="text-xl font-black text-white w-48 text-center">{monthName}</p>
            <button onClick={handleNextMonth} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        {/* Instructions - Minimal */}
        <div className="mt-2 flex gap-4 text-[11px] text-white/50">
          <p>Klikněte na den → nastavte mřížku → vyberte sály</p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div ref={calendarRef} className="flex-grow overflow-hidden flex flex-col px-4 pb-4">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 pb-2 flex-shrink-0">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="text-center">
              <p className="text-xs font-bold text-white/50 uppercase">{day}</p>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 flex-grow overflow-hidden">
          {calendarDays.map((day, idx) => {
            const config = day ? scheduleGrid.get(day) : null;

            return (
              <motion.div
                key={idx}
                onClick={(e) => day && handleDayClick(day, e)}
                className="rounded-lg cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden flex flex-col"
                style={{
                  background: selectedDay === day 
                    ? 'rgba(139, 92, 246, 0.15)' 
                    : 'rgba(255,255,255,0.02)',
                  border: selectedDay === day 
                    ? '1px solid rgba(139, 92, 246, 0.5)' 
                    : '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                }}
                whileHover={{ 
                  background: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.12)'
                }}
              >
                {day && config ? (
                  <div className="w-full h-full p-1.5 flex flex-col min-h-0">
                    <p className="text-xs font-bold text-white/60 mb-1">{day}</p>
                    
                    {/* Mini Grid Display */}
                    <div className="flex-1 flex overflow-hidden min-h-0" style={{ gap: '2px' }}>
                      {Array.from({ length: config.cols }).map((_, col) => (
                        <div key={col} className="flex-1 flex flex-col gap-0.5 min-w-0">
                          {Array.from({ length: config.rows }).map((_, row) => {
                            const cellKey = `${col + 1}-${row + 1}`;
                            const deptId = config.roomAssignments.get(cellKey) || '';
                            const dept = deptId ? getDepartmentById(deptId) : null;

                            return (
                              <motion.div
                                key={cellKey}
                                onClick={(e) => day && handleGridCellClick(cellKey, e)}
                                className="flex-1 rounded-sm font-bold flex items-center justify-center transition-all cursor-pointer min-h-0 text-[7px]"
                                style={{
                                  background: dept ? `${dept.accentColor}25` : 'rgba(255,255,255,0.05)',
                                  border: dept ? `1px solid ${dept.accentColor}40` : '0.5px solid rgba(255,255,255,0.1)',
                                  color: dept ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
                                }}
                                whileHover={{ scale: 1.1 }}
                              >
                                {dept ? dept.name.substring(0, 2) : '+'}
                              </motion.div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : day ? (
                  <div className="w-full h-full p-2 flex items-center justify-center">
                    <p className="text-sm font-bold text-white/40">{day}</p>
                  </div>
                ) : null}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Context Popover - Layout Mode */}
      <AnimatePresence>
        {activeMode === 'layout' && selectedDay && popoverPos && (
          <motion.div
            className="fixed z-50"
            style={{ left: popoverPos.x, top: popoverPos.y }}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <div
              className="rounded-lg border p-3 space-y-2 shadow-2xl"
              style={{
                background: 'rgba(20, 20, 30, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(16px)',
              }}
            >
              {/* Layout Title */}
              <p className="text-xs font-bold text-white/70">Struktura mřížky</p>

              {/* Quick Preset Buttons - Inline */}
              <div className="flex gap-1.5">
                {[
                  { cols: 1, rows: 1, label: '1×1' },
                  { cols: 2, rows: 1, label: '2×1' },
                  { cols: 1, rows: 2, label: '1×2' },
                  { cols: 2, rows: 2, label: '2×2' },
                ].map((preset) => {
                  const config = scheduleGrid.get(selectedDay);
                  const isActive = config?.cols === preset.cols && config?.rows === preset.rows;
                  
                  return (
                    <motion.button
                      key={`${preset.cols}-${preset.rows}`}
                      onClick={() => updateGridLayout(preset.cols, preset.rows)}
                      className="px-2 py-1 rounded text-xs font-bold transition-all border"
                      style={{
                        backgroundColor: isActive ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.08)',
                        borderColor: isActive ? 'rgba(139, 92, 246, 0.6)' : 'rgba(139, 92, 246, 0.2)',
                        color: '#FFFFFF',
                      }}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                    >
                      {preset.label}
                    </motion.button>
                  );
                })}
              </div>

              {/* Manual Controls */}
              <div className="space-y-1.5 pt-1 border-t border-white/10">
                {['cols', 'rows'].map((key) => {
                  const config = scheduleGrid.get(selectedDay);
                  const value = config?.[key as keyof GridConfig] as number || 1;
                  const label = key === 'cols' ? 'Sloupce' : 'Řádky';
                  
                  return (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-white/60">{label}:</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateGridLayout(
                            key === 'cols' ? Math.max(1, value - 1) : value,
                            key === 'rows' ? Math.max(1, value - 1) : value
                          )}
                          className="p-0.5 hover:bg-white/10 rounded transition-colors"
                        >
                          <Minus className="w-3 h-3 text-white/60" />
                        </button>
                        <span className="text-xs font-bold text-white min-w-[20px] text-center">{value}</span>
                        <button
                          onClick={() => updateGridLayout(
                            key === 'cols' ? Math.min(4, value + 1) : value,
                            key === 'rows' ? Math.min(4, value + 1) : value
                          )}
                          className="p-0.5 hover:bg-white/10 rounded transition-colors"
                        >
                          <Plus className="w-3 h-3 text-white/60" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setActiveMode(null)}
                className="w-full p-1.5 text-xs text-white/60 hover:text-white/90 transition-colors hover:bg-white/5 rounded"
              >
                ✕ Zavřít
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Popover - Department Mode */}
      <AnimatePresence>
        {activeMode === 'department' && selectedDay && selectedGridCell && popoverPos && (
          <motion.div
            className="fixed z-50"
            style={{ left: popoverPos.x, top: popoverPos.y }}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <div
              className="rounded-lg border p-2.5 space-y-1.5 shadow-2xl max-w-xs"
              style={{
                background: 'rgba(20, 20, 30, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(16px)',
              }}
            >
              {/* Departments Grid - Compact */}
              <div className="grid grid-cols-2 gap-1.5">
                {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map((dept) => {
                  const config = scheduleGrid.get(selectedDay);
                  const isSelected = config?.roomAssignments.get(selectedGridCell) === dept.id;
                  
                  return (
                    <motion.button
                      key={dept.id}
                      onClick={() => updateDepartment(dept.id)}
                      className="p-2 rounded text-xs font-bold transition-all border text-center"
                      style={{
                        backgroundColor: isSelected ? `${dept.accentColor}35` : `${dept.accentColor}12`,
                        borderColor: isSelected ? `${dept.accentColor}60` : `${dept.accentColor}25`,
                        color: '#FFFFFF',
                      }}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                    >
                      {dept.name.substring(0, 6)}
                    </motion.button>
                  );
                })}
              </div>

              {/* Clear & Close Buttons */}
              <div className="flex gap-1.5 pt-1 border-t border-white/10">
                <button
                  onClick={() => {
                    const config = scheduleGrid.get(selectedDay);
                    if (config) {
                      const newAssignments = new Map(config.roomAssignments);
                      newAssignments.delete(selectedGridCell);
                      setScheduleGrid(new Map(scheduleGrid).set(selectedDay, { ...config, roomAssignments: newAssignments }));
                    }
                    setActiveMode(null);
                    setSelectedGridCell(null);
                  }}
                  className="flex-1 p-1.5 text-xs text-red-400/60 hover:text-red-300 transition-colors hover:bg-red-400/10 rounded border border-red-400/20"
                >
                  Vymazat
                </button>
                <button
                  onClick={() => {
                    setActiveMode(null);
                    setSelectedGridCell(null);
                  }}
                  className="flex-1 p-1.5 text-xs text-white/60 hover:text-white/90 transition-colors hover:bg-white/5 rounded border border-white/10"
                >
                  Zavřít
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop - Dismiss on Click */}
      <AnimatePresence>
        {activeMode && (
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setActiveMode(null);
              setSelectedGridCell(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScheduleManager;
