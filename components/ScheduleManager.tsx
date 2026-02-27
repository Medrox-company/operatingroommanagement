import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
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
    [2, { cols: 2, rows: 2, roomAssignments: new Map([['1-1', 'chir'], ['1-2', 'uro']]) }],
  ]));
  const [selectedCell, setSelectedCell] = useState<{ date: number; gridCell?: string } | null>(null);
  const [showGridModal, setShowGridModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [tempGridConfig, setTempGridConfig] = useState<{ cols: number; rows: number }>({ cols: 1, rows: 1 });

  const DAYS_OF_WEEK = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
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

  const handleCellClick = (date: number) => {
    setSelectedCell({ date });
    setTempGridConfig(scheduleGrid.get(date) || { cols: 1, rows: 1 });
    setShowGridModal(true);
  };

  const handleGridCellClick = (gridCell: string) => {
    setSelectedCell(prev => prev ? { ...prev, gridCell } : null);
    setShowRoomModal(true);
  };

  const handleSelectDepartment = (deptId: string) => {
    if (selectedCell && selectedCell.gridCell) {
      const date = selectedCell.date;
      const gridConfig = scheduleGrid.get(date);
      if (gridConfig) {
        const newAssignments = new Map(gridConfig.roomAssignments);
        newAssignments.set(selectedCell.gridCell, deptId);
        const updatedConfig = { ...gridConfig, roomAssignments: newAssignments };
        setScheduleGrid(new Map(scheduleGrid).set(date, updatedConfig));
        setShowRoomModal(false);
      }
    }
  };

  const handleGridSave = (cols: number, rows: number) => {
    if (selectedCell) {
      const date = selectedCell.date;
      const newAssignments = new Map<string, string>();
      const oldConfig = scheduleGrid.get(date);
      
      if (oldConfig) {
        for (let c = 1; c <= cols; c++) {
          for (let r = 1; r <= rows; r++) {
            const cellKey = `${c}-${r}`;
            newAssignments.set(cellKey, oldConfig.roomAssignments.get(cellKey) || '');
          }
        }
      } else {
        for (let c = 1; c <= cols; c++) {
          for (let r = 1; r <= rows; r++) {
            newAssignments.set(`${c}-${r}`, '');
          }
        }
      }

      const updatedConfig = { cols, rows, roomAssignments: newAssignments };
      setScheduleGrid(new Map(scheduleGrid).set(date, updatedConfig));
      setShowGridModal(false);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getDepartmentById = (deptId: string) => {
    return DEFAULT_DEPARTMENTS.find(d => d.id === deptId);
  };

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      {/* Main Header */}
      <div className="pb-4 flex-shrink-0 px-4">
        <p className="text-xs font-bold text-purple-400/60 uppercase tracking-[0.2em] mb-1">PLÁNOVÁNÍ</p>
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-black text-white">
            ROZPIS <span className="text-slate-700">SÁLŮ</span>
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={handlePreviousMonth} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-white/60" />
            </button>
            <p className="text-2xl font-black text-white w-64 text-center">{monthName}</p>
            <button onClick={handleNextMonth} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-grow overflow-hidden flex flex-col px-4">
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
              <div
                key={idx}
                className="rounded-lg overflow-hidden flex flex-col cursor-pointer hover:shadow-lg transition-all group min-h-0"
                onClick={() => day && handleCellClick(day)}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {day && config ? (
                  <div className="w-full h-full p-1.5 flex flex-col">
                    {/* Day number */}
                    <p className="text-xs font-bold text-white/60 mb-1">{day}</p>
                    
                    {/* Grid cells */}
                    <div className="flex-1 flex overflow-hidden min-h-0" style={{ gap: '2px' }}>
                      {Array.from({ length: config.cols }).map((_, col) => (
                        <div key={col} className="flex-1 flex flex-col gap-0.5 min-w-0">
                          {Array.from({ length: config.rows }).map((_, row) => {
                            const cellKey = `${col + 1}-${row + 1}`;
                            const deptId = config.roomAssignments.get(cellKey) || '';
                            const dept = deptId ? getDepartmentById(deptId) : null;
                            const fontSize = config.cols > 2 || config.rows > 2 ? 'text-[8px]' : 'text-xs';

                            return (
                              <div
                                key={cellKey}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGridCellClick(cellKey);
                                }}
                                className={`flex-1 rounded-md font-black flex items-center justify-center transition-all cursor-pointer min-h-0 ${fontSize}`}
                                style={{
                                  background: dept ? `${dept.accentColor}20` : 'rgba(255,255,255,0.05)',
                                  border: dept ? `1px solid ${dept.accentColor}40` : '1px solid rgba(255,255,255,0.1)',
                                  color: dept ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                                  boxShadow: dept ? `0 0 12px ${dept.accentColor}20` : 'none',
                                }}
                              >
                                {dept ? dept.name.split(' ')[0].substring(0, 2).toUpperCase() : '+'}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : day ? (
                  <div className="w-full h-full p-2 flex items-center justify-center">
                    <p className="text-xs font-bold text-white/60">{day}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid Configuration Modal */}
      <AnimatePresence>
        {showGridModal && selectedCell && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-2xl"
              onClick={() => setShowGridModal(false)}
            />

            <motion.div
              className="relative w-full max-w-[500px] rounded-3xl border shadow-2xl overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(40px) saturate(180%)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-7 py-5 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                <h2 className="text-2xl font-black text-white">Nastavit mřížku</h2>
                <button
                  onClick={() => setShowGridModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/50" />
                </button>
              </div>

              {/* Content */}
              <div className="px-7 py-6 space-y-6">
                {/* Grid Configuration */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-bold text-white mb-2 block">Sloupce: {tempGridConfig.cols}</label>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      value={tempGridConfig.cols}
                      onChange={(e) => setTempGridConfig({ ...tempGridConfig, cols: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-bold text-white mb-2 block">Řádky: {tempGridConfig.rows}</label>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      value={tempGridConfig.rows}
                      onChange={(e) => setTempGridConfig({ ...tempGridConfig, rows: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 rounded-lg border" style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(0, 0, 0, 0.2)' }}>
                  <p className="text-xs text-white/60 mb-3 uppercase">Náhled mřížky</p>
                  <div className="flex gap-1">
                    {Array.from({ length: tempGridConfig.cols }).map((_, col) => (
                      <div key={col} className="flex-1 flex flex-col gap-1">
                        {Array.from({ length: tempGridConfig.rows }).map((_, row) => (
                          <div key={`${col}-${row}`} className="aspect-square rounded bg-white/10" />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={() => handleGridSave(tempGridConfig.cols, tempGridConfig.rows)}
                  className="w-full p-3 rounded-lg font-bold transition-all"
                  style={{
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    borderColor: 'rgba(139, 92, 246, 0.4)',
                    color: '#FFFFFF',
                    border: '1px solid',
                  }}
                >
                  Uložit mřížku
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Room Selection Modal */}
      <AnimatePresence>
        {showRoomModal && selectedCell && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-2xl"
              onClick={() => setShowRoomModal(false)}
            />

            <motion.div
              className="relative w-full max-w-[500px] rounded-3xl border shadow-2xl overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(40px) saturate(180%)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-7 py-5 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                <h2 className="text-2xl font-black text-white">Vyberte sál</h2>
                <button
                  onClick={() => setShowRoomModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/50" />
                </button>
              </div>

              {/* Content */}
              <div className="px-7 py-6">
                <div className="grid grid-cols-2 gap-3">
                  {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => handleSelectDepartment(dept.id)}
                      className="p-4 rounded-xl text-center font-bold text-sm transition-all border"
                      style={{
                        backgroundColor: `${dept.accentColor}20`,
                        borderColor: `${dept.accentColor}40`,
                        color: '#FFFFFF',
                      }}
                    >
                      {dept.name}
                    </button>
                  ))}
                </div>

                {/* Clear button */}
                <button
                  onClick={() => {
                    if (selectedCell && selectedCell.gridCell) {
                      const date = selectedCell.date;
                      const gridConfig = scheduleGrid.get(date);
                      if (gridConfig) {
                        const newAssignments = new Map(gridConfig.roomAssignments);
                        newAssignments.set(selectedCell.gridCell, '');
                        const updatedConfig = { ...gridConfig, roomAssignments: newAssignments };
                        setScheduleGrid(new Map(scheduleGrid).set(date, updatedConfig));
                        setShowRoomModal(false);
                      }
                    }
                  }}
                  className="w-full mt-4 p-3 rounded-lg border transition-all"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    color: '#FCA5A5',
                  }}
                >
                  Vymazat sál
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScheduleManager;
