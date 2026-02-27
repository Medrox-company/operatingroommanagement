import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Grid3x3, Maximize2 } from 'lucide-react';
import { DEFAULT_DEPARTMENTS } from '../constants';

interface GridConfig {
  cols: number;
  rows: number;
  departments: string[];
  displaySize?: 'half' | 'full'; // 'half' for half-width, 'full' for full-width
}

const ScheduleManager: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 4, 1));
  const [schedule, setSchedule] = useState<Map<string, GridConfig>>(new Map([
    ['1', { cols: 1, rows: 1, departments: ['tra'] }],
    ['2', { cols: 1, rows: 1, departments: ['chir'] }],
    ['5', { cols: 1, rows: 1, departments: ['uro'] }],
    ['7', { cols: 2, rows: 2, departments: ['neurochir', '', '', 'chir'] }],
    ['8', { cols: 1, rows: 1, departments: ['chir'] }],
  ]));
  
  const [selectedCell, setSelectedCell] = useState<{ date: number } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<'size-select' | 'grid-select' | 'grid-config'>('size-select');
  const [tempGridConfig, setTempGridConfig] = useState<GridConfig>({ cols: 1, rows: 1, departments: [''], displaySize: 'full' });

  const DAYS_OF_WEEK = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];
  const GRID_PRESETS = [
    { cols: 1, rows: 1, label: '1×1' },
    { cols: 2, rows: 1, label: '2×1' },
    { cols: 1, rows: 2, label: '1×2' },
    { cols: 2, rows: 2, label: '2×2' },
    { cols: 3, rows: 1, label: '3×1' },
    { cols: 3, rows: 2, label: '3×2' },
    { cols: 3, rows: 3, label: '3×3' },
  ];

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
    const existing = schedule.get(String(date));
    setTempGridConfig(existing || { cols: 1, rows: 1, departments: [''], displaySize: 'full' });
    setSelectedCell({ date });
    setModalStep('size-select');
    setShowModal(true);
  };

  const handleSizeSelect = (displaySize: 'half' | 'full') => {
    setTempGridConfig({ ...tempGridConfig, displaySize });
    setModalStep('grid-select');
  };

  const handleGridSelect = (cols: number, rows: number) => {
    const size = cols * rows;
    setTempGridConfig({
      ...tempGridConfig,
      cols,
      rows,
      departments: Array(size).fill(''),
    });
    setModalStep('grid-config');
  };

  const handleDepartmentChange = (index: number, deptId: string) => {
    const updated = [...tempGridConfig.departments];
    updated[index] = deptId;
    setTempGridConfig({ ...tempGridConfig, departments: updated });
  };

  const handleSaveGridConfig = () => {
    if (selectedCell) {
      const key = String(selectedCell.date);
      setSchedule(new Map(schedule).set(key, tempGridConfig));
      setShowModal(false);
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

  const getMainDept = () => {
    const config = selectedCell ? schedule.get(String(selectedCell.date)) : null;
    const firstDept = config?.departments?.[0];
    return firstDept ? getDepartmentById(firstDept) : null;
  };

  const mainDept = getMainDept();
  const themeColor = mainDept?.accentColor || '#9333EA';

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
            const config = day ? schedule.get(String(day)) : null;
            const isFullWidth = config?.displaySize === 'full';

            return (
              <div
                key={idx}
                className={`rounded-lg overflow-hidden flex flex-col cursor-pointer hover:shadow-lg transition-all group min-h-0 ${isFullWidth ? 'col-span-7' : ''}`}
                onClick={() => day && handleCellClick(day)}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {day ? (
                  <>
                    {/* Day number */}
                    <div className="p-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <p className="text-xs font-bold text-white/60">{day}</p>
                    </div>

                    {/* Grid of departments */}
                    <div className={`${isFullWidth ? 'p-3 h-48' : 'flex-1 p-1'} overflow-hidden`}>
                      {config ? (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
                            gridTemplateRows: `repeat(${config.rows}, 1fr)`,
                            gap: isFullWidth ? '0.5rem' : '0.25rem',
                            height: '100%',
                          }}
                        >
                          {config.departments.map((deptId, cellIdx) => {
                            const dept = deptId ? getDepartmentById(deptId) : null;
                            return (
                              <div
                                key={cellIdx}
                                className={`rounded-${isFullWidth ? 'lg' : 'sm'} flex items-center justify-center ${isFullWidth ? 'text-sm' : 'text-xs'} font-bold transition-all`}
                                style={{
                                  background: dept ? `${dept.accentColor}20` : 'rgba(255,255,255,0.05)',
                                  border: dept ? `1px solid ${dept.accentColor}40` : '1px solid rgba(255,255,255,0.1)',
                                  color: '#FFFFFF',
                                  boxShadow: dept ? `0 0 8px ${dept.accentColor}15` : 'none',
                                }}
                              >
                                {dept ? dept.name.split(' ')[0].substring(0, isFullWidth ? 4 : 2).toUpperCase() : ''}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal - Grid Configuration */}
      <AnimatePresence>
        {showModal && selectedCell && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-2xl"
              onClick={() => setShowModal(false)}
              initial={{ backdropFilter: 'blur(0px)' }}
              animate={{ backdropFilter: 'blur(32px)' }}
              exit={{ backdropFilter: 'blur(0px)' }}
            />

            <motion.div
              className="relative w-full max-w-[600px] rounded-3xl border shadow-2xl overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 0 80px ${themeColor}15`,
              }}
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Header */}
              <motion.div
                className="flex items-center justify-between px-7 py-5 border-b relative"
                style={{ borderColor: 'rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.2)' }}
              >
                <motion.h2 className="text-2xl font-black text-white flex items-center gap-2">
                  {modalStep === 'size-select' && (
                    <>
                      <Maximize2 className="w-6 h-6" />
                      Výběr zobrazení
                    </>
                  )}
                  {modalStep === 'grid-select' && (
                    <>
                      <Grid3x3 className="w-6 h-6" />
                      Vyberte rozložení
                    </>
                  )}
                  {modalStep === 'grid-config' && (
                    <>
                      <Maximize2 className="w-6 h-6" />
                      Nastavte sály
                    </>
                  )}
                </motion.h2>

                <motion.button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-5 h-5 text-white/50" />
                </motion.button>
              </motion.div>

              {/* Content */}
              <motion.div
                className="px-7 py-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                {modalStep === 'size-select' ? (
                  // Display Size Selection
                  <div className="space-y-4">
                    <p className="text-sm text-white/70 mb-4">Zvolte, jak se má sál zobrazovat v kalendáři</p>
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        onClick={() => handleSizeSelect('half')}
                        className="p-6 rounded-xl border transition-all group"
                        style={{
                          backgroundColor: 'rgba(147, 51, 234, 0.15)',
                          borderColor: tempGridConfig.displaySize === 'half' ? '#9333EA' : 'rgba(147, 51, 234, 0.4)',
                        }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        whileHover={{
                          scale: 1.05,
                          borderColor: '#9333EA',
                          backgroundColor: 'rgba(147, 51, 234, 0.3)',
                        }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="space-y-2">
                          <div className="text-center">
                            <div className="text-2xl font-black text-white mb-1">½</div>
                            <p className="text-sm font-bold text-white">Půl šířky</p>
                          </div>
                          <p className="text-xs text-white/60">Zobrazit v jedné polovině pole</p>
                        </div>
                      </motion.button>

                      <motion.button
                        onClick={() => handleSizeSelect('full')}
                        className="p-6 rounded-xl border transition-all group"
                        style={{
                          backgroundColor: 'rgba(147, 51, 234, 0.15)',
                          borderColor: tempGridConfig.displaySize === 'full' ? '#9333EA' : 'rgba(147, 51, 234, 0.4)',
                        }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        whileHover={{
                          scale: 1.05,
                          borderColor: '#9333EA',
                          backgroundColor: 'rgba(147, 51, 234, 0.3)',
                        }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="space-y-2">
                          <div className="text-center">
                            <div className="text-2xl font-black text-white mb-1">⬜</div>
                            <p className="text-sm font-bold text-white">Celá šířka</p>
                          </div>
                          <p className="text-xs text-white/60">Rozšířit přes celý řádek</p>
                        </div>
                      </motion.button>
                    </div>
                  </div>
                ) : modalStep === 'grid-select' ? (
                  // Grid Selection
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                      {GRID_PRESETS.map((preset) => (
                        <motion.button
                          key={`${preset.cols}x${preset.rows}`}
                          onClick={() => handleGridSelect(preset.cols, preset.rows)}
                          className="p-3 rounded-xl text-center font-bold text-sm transition-all border relative overflow-hidden group"
                          style={{
                            backgroundColor: 'rgba(147, 51, 234, 0.2)',
                            borderColor: 'rgba(147, 51, 234, 0.4)',
                            color: '#FFFFFF',
                          }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 }}
                          whileHover={{
                            scale: 1.05,
                            borderColor: '#9333EA',
                            backgroundColor: 'rgba(147, 51, 234, 0.3)',
                            boxShadow: `0 0 20px rgba(147, 51, 234, 0.4)`,
                          }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {preset.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Grid Configuration
                  <div className="space-y-4">
                    {/* Preview */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <p className="text-xs text-white/60 mb-3 uppercase font-bold">Náhled</p>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${tempGridConfig.cols}, 1fr)`,
                          gridTemplateRows: `repeat(${tempGridConfig.rows}, 1fr)`,
                          gap: '0.5rem',
                          height: `${tempGridConfig.rows * 60}px`,
                        }}
                      >
                        {tempGridConfig.departments.map((deptId, cellIdx) => {
                          const dept = deptId ? getDepartmentById(deptId) : null;
                          return (
                            <div
                              key={cellIdx}
                              className="rounded-lg flex items-center justify-center text-sm font-bold border transition-all"
                              style={{
                                background: dept ? `${dept.accentColor}20` : 'rgba(255,255,255,0.05)',
                                border: dept ? `2px solid ${dept.accentColor}40` : '2px dashed rgba(255,255,255,0.2)',
                                color: '#FFFFFF',
                              }}
                            >
                              {dept ? dept.name.split(' ')[0] : '+'}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Grid Editor */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <p className="text-xs text-white/60 mb-3 uppercase font-bold">Nastavení sálů ({tempGridConfig.cols}×{tempGridConfig.rows})</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {tempGridConfig.departments.map((deptId, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs text-white/60 w-8">
                              [{Math.floor(idx / tempGridConfig.cols) + 1},{(idx % tempGridConfig.cols) + 1}]
                            </span>
                            <select
                              value={deptId || ''}
                              onChange={(e) => handleDepartmentChange(idx, e.target.value)}
                              className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm transition-all hover:bg-white/10 focus:outline-none focus:border-white/40"
                            >
                              <option value="">Prázdné</option>
                              {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map((dept) => (
                                <option key={dept.id} value={dept.id}>
                                  {dept.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => setModalStep('grid-select')}
                        className="flex-1 p-3 rounded-lg border transition-all"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          borderColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                        }}
                        whileHover={{
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          borderColor: 'rgba(255,255,255,0.2)',
                        }}
                      >
                        Zpět
                      </motion.button>
                      <motion.button
                        onClick={handleSaveGridConfig}
                        className="flex-1 p-3 rounded-lg font-bold transition-all"
                        style={{
                          backgroundColor: `${themeColor}40`,
                          borderColor: themeColor,
                          color: '#FFFFFF',
                          border: `2px solid ${themeColor}`,
                        }}
                        whileHover={{
                          backgroundColor: `${themeColor}60`,
                          boxShadow: `0 0 20px ${themeColor}40`,
                        }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Uložit
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScheduleManager;
