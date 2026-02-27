import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, GripHorizontal } from 'lucide-react';
import { DEFAULT_DEPARTMENTS } from '../constants';

interface GridConfig {
  cols: number;
  rows: number;
  roomAssignments: Map<string, string>;
}

interface BoxDimensions {
  width: number;
  height: number;
}

type ScheduleGrid = Map<number, GridConfig>;
type BoxSizes = Map<number, BoxDimensions>;

const ScheduleManager: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 4, 1));
  const [scheduleGrid, setScheduleGrid] = useState<ScheduleGrid>(new Map([
    [1, { cols: 1, rows: 1, roomAssignments: new Map([['1-1', 'tra']]) }],
    [2, { cols: 2, rows: 2, roomAssignments: new Map([['1-1', 'chir'], ['1-2', 'uro']]) }],
  ]));
  const [boxSizes, setBoxSizes] = useState<BoxSizes>(new Map());
  const [selectedCell, setSelectedCell] = useState<{ date: number; gridCell?: string } | null>(null);
  const [showGridModal, setShowGridModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [tempGridConfig, setTempGridConfig] = useState<{ cols: number; rows: number }>({ cols: 1, rows: 1 });
  const [draggingBox, setDraggingBox] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const boxRefs = useRef<Map<number, HTMLDivElement>>(new Map());

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

  const handleMouseDown = (date: number, e: React.MouseEvent, target: 'corner' | 'edge') => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setDraggingBox(date);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  React.useEffect(() => {
    if (!draggingBox || !dragStart) return;

    const handleMouseMove = (e: MouseEvent) => {
      const box = boxRefs.current.get(draggingBox);
      if (!box) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const currentDims = boxSizes.get(draggingBox) || { width: 0, height: 0 };
      const minSize = 80;

      const newWidth = Math.max(minSize, currentDims.width + deltaX);
      const newHeight = Math.max(minSize, currentDims.height + deltaY);

      setBoxSizes(new Map(boxSizes).set(draggingBox, { width: newWidth, height: newHeight }));
      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setDraggingBox(null);
      setDragStart(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingBox, dragStart, boxSizes]);

  const getBoxStyle = (day: number) => {
    const dims = boxSizes.get(day);
    if (!dims) return {};
    return {
      width: `${dims.width}px`,
      height: `${dims.height}px`,
    };
  };

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
        
        {/* Instructions */}
        <div className="mt-2 flex gap-4 text-xs text-white/50">
          <p>👆 Klikněte na den pro nastavení mřížky</p>
          <p>🖱️ Táhněte za roh pro změnu velikosti</p>
          <p>➕ Klikněte na buňku pro výběr sálu</p>
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
                ref={(el) => {
                  if (el && day) boxRefs.current.set(day, el);
                }}
                className="rounded-lg overflow-hidden flex flex-col cursor-pointer hover:shadow-lg transition-all group min-h-0 relative"
                onClick={() => day && handleCellClick(day)}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                  ...getBoxStyle(day || 0),
                  position: draggingBox === day ? 'relative' : 'relative',
                }}
              >
                {day && config ? (
                  <div className="w-full h-full p-1.5 flex flex-col">
                    {/* Day number */}
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-white/60">{day}</p>
                      <div 
                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-nwse-resize p-1 hover:bg-white/10 rounded"
                        onMouseDown={(e) => handleMouseDown(day, e, 'corner')}
                      >
                        <GripHorizontal className="w-3 h-3 text-white/50" />
                      </div>
                    </div>
                    
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
                              <motion.div
                                key={cellKey}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGridCellClick(cellKey);
                                }}
                                className={`flex-1 rounded-md font-black flex items-center justify-center transition-all cursor-pointer min-h-0 ${fontSize} group/cell`}
                                style={{
                                  background: dept ? `${dept.accentColor}20` : 'rgba(255,255,255,0.05)',
                                  border: dept ? `1px solid ${dept.accentColor}40` : '1px solid rgba(255,255,255,0.1)',
                                  color: dept ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                                  boxShadow: dept ? `0 0 12px ${dept.accentColor}20` : 'none',
                                }}
                                whileHover={{ 
                                  scale: 1.08,
                                  boxShadow: dept ? `0 0 20px ${dept.accentColor}40` : '0 0 12px rgba(255,255,255,0.2)',
                                }}
                                whileTap={{ scale: 0.95 }}
                              >
                                {dept ? dept.name.split(' ')[0].substring(0, 2).toUpperCase() : '+'}
                              </motion.div>
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

                {/* Resize handle indicator */}
                {day && (
                  <motion.div 
                    className="absolute bottom-0 right-0 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity cursor-nwse-resize flex items-center justify-center"
                    onMouseDown={(e) => handleMouseDown(day, e, 'corner')}
                    whileHover={{ scale: 1.2 }}
                    style={{
                      background: 'linear-gradient(135deg, transparent 50%, rgba(147, 51, 234, 0.5) 50%)',
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-purple-400 opacity-60" />
                  </motion.div>
                )}
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
                {/* Preset Grid Buttons */}
                <div>
                  <p className="text-xs text-white/60 uppercase font-bold mb-3">Předvolby</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { cols: 1, rows: 1, label: '1x1' },
                      { cols: 2, rows: 2, label: '2x2' },
                      { cols: 2, rows: 3, label: '2x3' },
                      { cols: 3, rows: 3, label: '3x3' },
                      { cols: 4, rows: 4, label: '4x4' },
                      { cols: 3, rows: 2, label: '3x2' },
                      { cols: 2, rows: 1, label: '2x1' },
                      { cols: 1, rows: 4, label: '1x4' },
                    ].map((preset) => (
                      <motion.button
                        key={`${preset.cols}-${preset.rows}`}
                        onClick={() => setTempGridConfig({ cols: preset.cols, rows: preset.rows })}
                        className="p-3 rounded-lg font-bold text-sm transition-all border"
                        style={{
                          backgroundColor:
                            tempGridConfig.cols === preset.cols && tempGridConfig.rows === preset.rows
                              ? 'rgba(139, 92, 246, 0.4)'
                              : 'rgba(139, 92, 246, 0.1)',
                          borderColor:
                            tempGridConfig.cols === preset.cols && tempGridConfig.rows === preset.rows
                              ? 'rgba(139, 92, 246, 0.8)'
                              : 'rgba(139, 92, 246, 0.2)',
                          color: '#FFFFFF',
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {preset.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Manual Configuration */}
                <div className="space-y-4 pt-2 border-t border-white/10">
                  <p className="text-xs text-white/60 uppercase font-bold">Ruční nastavení</p>
                  <div>
                    <label className="text-sm font-bold text-white mb-2 block">Sloupce: {tempGridConfig.cols}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="4"
                        value={tempGridConfig.cols}
                        onChange={(e) => setTempGridConfig({ ...tempGridConfig, cols: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-sm font-bold text-white/60 min-w-fit">{tempGridConfig.cols}/4</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-bold text-white mb-2 block">Řádky: {tempGridConfig.rows}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="4"
                        value={tempGridConfig.rows}
                        onChange={(e) => setTempGridConfig({ ...tempGridConfig, rows: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-sm font-bold text-white/60 min-w-fit">{tempGridConfig.rows}/4</span>
                    </div>
                  </div>
                </div>

                {/* Animated Preview with Color-Coded Cells */}
                <motion.div 
                  className="p-4 rounded-lg border" 
                  style={{ borderColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(0, 0, 0, 0.2)' }}
                  layout
                >
                  <p className="text-xs text-white/60 mb-3 uppercase font-bold">Náhled mřížky ({tempGridConfig.cols}x{tempGridConfig.rows})</p>
                  <motion.div className="flex gap-2" layout>
                    {Array.from({ length: tempGridConfig.cols }).map((_, col) => (
                      <motion.div 
                        key={col} 
                        className="flex-1 flex flex-col gap-2"
                        layout
                      >
                        {Array.from({ length: tempGridConfig.rows }).map((_, row) => {
                          const colorOptions = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#6366F1'];
                          const colorIndex = (col + row * tempGridConfig.cols) % colorOptions.length;
                          const color = colorOptions[colorIndex];
                          
                          return (
                            <motion.div 
                              key={`${col}-${row}`} 
                              className="aspect-square rounded border transition-all"
                              style={{
                                background: `${color}25`,
                                borderColor: `${color}60`,
                                boxShadow: `0 0 12px ${color}30`,
                              }}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: (col + row * tempGridConfig.cols) * 0.05 }}
                              whileHover={{ scale: 1.08 }}
                            />
                          );
                        })}
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>

                {/* Save Button */}
                <motion.button
                  onClick={() => handleGridSave(tempGridConfig.cols, tempGridConfig.rows)}
                  className="w-full p-3 rounded-lg font-bold transition-all border"
                  style={{
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    borderColor: 'rgba(139, 92, 246, 0.4)',
                    color: '#FFFFFF',
                  }}
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(139, 92, 246, 0.3)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Uložit mřížku ({tempGridConfig.cols}x{tempGridConfig.rows})
                </motion.button>
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
              <div className="flex items-center justify-between px-7 py-5 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.2)' }}>
                <div>
                  <h2 className="text-2xl font-black text-white">Vyberte sál</h2>
                  {selectedCell && selectedCell.gridCell && (
                    <p className="text-xs text-white/60 mt-1">Buňka: {selectedCell.gridCell}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowRoomModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/50" />
                </button>
              </div>

              {/* Grid Position Indicator */}
              {selectedCell && selectedCell.gridCell && scheduleGrid.get(selectedCell.date) && (
                <motion.div 
                  className="px-7 pt-6 pb-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-xs text-white/60 uppercase font-bold mb-3">Pozice v mřížce</p>
                  <div className="flex gap-2">
                    {(() => {
                      const config = scheduleGrid.get(selectedCell.date);
                      if (!config) return null;
                      
                      return Array.from({ length: config.cols }).map((_, col) => (
                        <div key={col} className="flex-1 flex flex-col gap-1">
                          {Array.from({ length: config.rows }).map((_, row) => {
                            const cellKey = `${col + 1}-${row + 1}`;
                            const isSelected = cellKey === selectedCell.gridCell;
                            const deptId = config.roomAssignments.get(cellKey) || '';
                            const dept = deptId ? DEFAULT_DEPARTMENTS.find(d => d.id === deptId) : null;
                            
                            return (
                              <motion.div
                                key={cellKey}
                                className="aspect-square rounded-md border transition-all"
                                style={{
                                  background: isSelected ? 'rgba(139, 92, 246, 0.4)' : dept ? `${dept.accentColor}25` : 'rgba(255,255,255,0.05)',
                                  borderColor: isSelected ? 'rgba(139, 92, 246, 0.8)' : dept ? `${dept.accentColor}60` : 'rgba(255,255,255,0.1)',
                                  boxShadow: isSelected ? '0 0 16px rgba(139, 92, 246, 0.4)' : 'none',
                                }}
                                whileHover={{ scale: 1.1 }}
                              />
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </div>
                </motion.div>
              )}

              {/* Content */}
              <div className="px-7 py-6 space-y-4">
                <div>
                  <p className="text-xs text-white/60 uppercase font-bold mb-3">Vyberte oddělení</p>
                  <div className="grid grid-cols-2 gap-3">
                    {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map((dept) => (
                      <motion.button
                        key={dept.id}
                        onClick={() => handleSelectDepartment(dept.id)}
                        className="p-4 rounded-xl text-center font-bold text-sm transition-all border"
                        style={{
                          backgroundColor: `${dept.accentColor}20`,
                          borderColor: `${dept.accentColor}40`,
                          color: '#FFFFFF',
                        }}
                        whileHover={{ scale: 1.05, backgroundColor: `${dept.accentColor}30` }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {dept.name}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Clear button */}
                <motion.button
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
                  className="w-full p-3 rounded-lg border transition-all"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    color: '#FCA5A5',
                  }}
                  whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Vymazat sál
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScheduleManager;
