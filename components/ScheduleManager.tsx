import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Grid3x3, Plus, Minus } from 'lucide-react';
import { DEFAULT_DEPARTMENTS } from '../constants';

interface DayGridConfig {
  cols: number;
  rows: number;
  rooms: string[]; // Array of room IDs in grid order
}

const ScheduleManager: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 4, 1));
  
  // Grid configs: { dateKey: { cols, rows, rooms: [] } }
  const [gridConfigs, setGridConfigs] = useState<Map<string, DayGridConfig>>(new Map([
    ['1', { cols: 1, rows: 1, rooms: ['tra'] }],
    ['2', { cols: 1, rows: 1, rooms: ['chir'] }],
    ['5', { cols: 1, rows: 1, rooms: ['uro'] }],
    ['7', { cols: 1, rows: 1, rooms: ['neurochir'] }],
    ['8', { cols: 1, rows: 1, rooms: ['chir'] }],
    ['14', { cols: 1, rows: 1, rooms: ['chir'] }],
    ['21', { cols: 1, rows: 1, rooms: ['orl'] }],
    ['22', { cols: 1, rows: 1, rooms: ['gyn'] }],
    ['26', { cols: 1, rows: 1, rooms: ['tra'] }],
  ]));
  
  const [selectedCell, setSelectedCell] = useState<{ date: number } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingGridCell, setEditingGridCell] = useState<number | null>(null);

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
    setShowModal(true);
    setEditingGridCell(null);
  };

  const handleConfigureGrid = (cellIdx: number) => {
    setEditingGridCell(cellIdx);
  };

  const handleUpdateGridConfig = (cols: number, rows: number, rooms: string[]) => {
    if (selectedCell) {
      const key = String(selectedCell.date);
      const newConfig = { cols, rows, rooms };
      setGridConfigs(new Map(gridConfigs).set(key, newConfig));
      setEditingGridCell(null);
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

  const getGridConfig = (date: number): DayGridConfig => {
    return gridConfigs.get(String(date)) || { cols: 1, rows: 1, rooms: [''] };
  };

  const selectedDept = selectedCell ? getDepartmentById(getGridConfig(selectedCell.date).rooms[0] || '') : null;
  const themeColor = selectedDept?.accentColor || '#9333EA';

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
            const config = day ? getGridConfig(day) : null;

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
                  <>
                    {/* Top section - day number */}
                    <div className="flex-1 p-2 flex flex-col border-b overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <p className="text-xs font-bold text-white/60 mb-1">{day}</p>
                    </div>

                    {/* Bottom section - grid of rooms */}
                    <div className="flex-1 p-1.5 grid gap-0.5 min-h-0 overflow-hidden" style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)`, gridTemplateRows: `repeat(${config.rows}, 1fr)` }}>
                      {config.rooms.map((roomId, cellIdx) => {
                        const dept = getDepartmentById(roomId);
                        return (
                          <div
                            key={cellIdx}
                            className="rounded text-xs font-bold flex items-center justify-center transition-all overflow-hidden"
                            style={{
                              background: dept ? dept.accentColor + '30' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${dept ? dept.accentColor + '60' : 'rgba(255,255,255,0.2)'}`,
                              color: '#FFFFFF',
                              fontSize: config.cols > 2 || config.rows > 2 ? '9px' : '11px',
                            }}
                          >
                            {dept ? dept.name.split(' ')[0].substring(0, 2).toUpperCase() : '+'}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal - Grid Editor */}
      <AnimatePresence>
        {showModal && selectedCell && editingGridCell === null && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-2xl"
              onClick={() => setShowModal(false)}
            />

            {/* Popup */}
            <motion.div
              className="relative w-full max-w-[500px] rounded-3xl border shadow-2xl overflow-hidden"
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
              <motion.div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${themeColor} 50%, transparent 100%)`,
                  filter: `drop-shadow(0 0 8px ${themeColor})`,
                }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />

              <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: themeColor }} />
              <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: themeColor }} />

              {/* Header */}
              <motion.div
                className="flex items-center justify-between px-7 py-5 border-b"
                style={{ borderColor: 'rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.2)' }}
              >
                <div className="flex items-center gap-3">
                  <Grid3x3 className="w-5 h-5" style={{ color: themeColor }} />
                  <h2 className="text-2xl font-black text-white">Nastavit rozpis</h2>
                </div>

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
                className="px-7 py-6 space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <GridConfigEditor 
                  config={getGridConfig(selectedCell.date)}
                  onConfigure={handleConfigureGrid}
                  themeColor={themeColor}
                  departments={DEFAULT_DEPARTMENTS}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}

        {showModal && selectedCell && editingGridCell !== null && (
          <GridEditorModal 
            config={getGridConfig(selectedCell.date)}
            cellIdx={editingGridCell}
            onUpdate={handleUpdateGridConfig}
            onBack={() => setEditingGridCell(null)}
            themeColor={themeColor}
            departments={DEFAULT_DEPARTMENTS}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Grid Configuration Quick Editor
const GridConfigEditor: React.FC<{
  config: { cols: number; rows: number; rooms: string[] };
  onConfigure: (cellIdx: number) => void;
  themeColor: string;
  departments: any[];
}> = ({ config, onConfigure, themeColor, departments }) => {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold text-white mb-3">Rozpis: {config.cols}×{config.rows}</p>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)`, gridTemplateRows: `repeat(${config.rows}, 1fr)` }}>
          {config.rooms.map((roomId, idx) => {
            const dept = departments.find(d => d.id === roomId);
            return (
              <motion.button
                key={idx}
                onClick={() => onConfigure(idx)}
                className="p-3 rounded-lg border transition-all text-xs font-bold"
                style={{
                  backgroundColor: dept ? `${dept.accentColor}20` : 'rgba(255,255,255,0.05)',
                  borderColor: dept ? `${dept.accentColor}40` : 'rgba(255,255,255,0.2)',
                  color: '#FFFFFF',
                  minHeight: '50px',
                }}
                whileHover={{ scale: 1.05 }}
              >
                {dept ? dept.name.substring(0, 8) : 'Prázdno'}
              </motion.button>
            );
          })}
        </div>
      </div>

      <motion.button
        onClick={() => {}} // Placeholder - would open settings for grid size
        className="w-full p-3 rounded-lg border transition-all font-bold text-sm"
        style={{
          backgroundColor: `${themeColor}20`,
          borderColor: `${themeColor}40`,
          color: '#FFFFFF',
        }}
        whileHover={{ scale: 1.02 }}
      >
        Změnit rozměry (sloupce × řádky)
      </motion.button>
    </div>
  );
};

// Grid Editor Modal for individual cell assignment
const GridEditorModal: React.FC<{
  config: { cols: number; rows: number; rooms: string[] };
  cellIdx: number;
  onUpdate: (cols: number, rows: number, rooms: string[]) => void;
  onBack: () => void;
  themeColor: string;
  departments: any[];
}> = ({ config, cellIdx, onUpdate, onBack, themeColor, departments }) => {
  return (
    <motion.div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-2xl"
        onClick={onBack}
      />

      <motion.div
        className="relative w-full max-w-[400px] rounded-3xl border shadow-2xl overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          backdropFilter: 'blur(40px) saturate(180%)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
        initial={{ scale: 0.9, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="flex items-center justify-between px-7 py-5 border-b"
          style={{ borderColor: 'rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.2)' }}
        >
          <h3 className="text-lg font-black text-white">Vybrat sál</h3>
          <motion.button onClick={onBack} whileHover={{ scale: 1.1 }}>
            <X className="w-5 h-5 text-white/50" />
          </motion.button>
        </motion.div>

        <motion.div className="px-7 py-6">
          <div className="grid grid-cols-2 gap-3">
            {departments.filter(d => d.isActive).map((dept, idx) => (
              <motion.button
                key={dept.id}
                onClick={() => {
                  const newRooms = [...config.rooms];
                  newRooms[cellIdx] = dept.id;
                  onUpdate(config.cols, config.rows, newRooms);
                  onBack();
                }}
                className="p-4 rounded-xl text-center font-bold text-sm border"
                style={{
                  backgroundColor: `${dept.accentColor}20`,
                  borderColor: `${dept.accentColor}40`,
                  color: '#FFFFFF',
                }}
                whileHover={{ scale: 1.05 }}
              >
                {dept.name}
              </motion.button>
            ))}
          </div>

          <motion.button
            onClick={() => {
              const newRooms = [...config.rooms];
              newRooms[cellIdx] = '';
              onUpdate(config.cols, config.rows, newRooms);
              onBack();
            }}
            className="w-full mt-4 p-3 rounded-lg border transition-all"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: '#FCA5A5',
            }}
          >
            Vymazat sál
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default ScheduleManager;

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
    setShowModal(true);
  };

  const handleSelectDepartment = (deptId: string) => {
    if (selectedCell) {
      const key = String(selectedCell.date);
      setSchedule(new Map(schedule).set(key, deptId));
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

  const selectedDept = selectedCell ? getDepartmentById(schedule.get(String(selectedCell.date)) || '') : null;
  const themeColor = selectedDept?.accentColor || '#9333EA';

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
            const deptId = day ? schedule.get(String(day)) : null;
            const dept = deptId ? getDepartmentById(deptId) : null;

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
                {day ? (
                  <>
                    {/* Top section - day number */}
                    <div className="flex-1 p-2 flex flex-col border-b overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <p className="text-xs font-bold text-white/60 mb-1">{day}</p>
                    </div>

                    {/* Bottom section - department box */}
                    <div className="flex-1 p-1.5 flex items-center justify-center min-h-0">
                      {dept ? (
                        <div
                          className="w-full h-full rounded-md font-black text-sm flex items-center justify-center transition-all"
                          style={{
                            background: dept.accentColor + '20',
                            border: `1px solid ${dept.accentColor}40`,
                            color: '#FFFFFF',
                            boxShadow: `0 0 16px ${dept.accentColor}20, 0 2px 8px ${dept.accentColor}10`,
                          }}
                        >
                          {dept.name.split(' ')[0].substring(0, 3).toUpperCase()}
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

      {/* Modal - TimelineModule Style */}
      <AnimatePresence>
        {showModal && selectedCell && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Glassmorph backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-2xl"
              onClick={() => setShowModal(false)}
              initial={{ backdropFilter: 'blur(0px)' }}
              animate={{ backdropFilter: 'blur(32px)' }}
              exit={{ backdropFilter: 'blur(0px)' }}
            />

            {/* Popup with glassmorph */}
            <motion.div
              className="relative w-full max-w-[500px] rounded-3xl border shadow-2xl overflow-hidden"
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
              {/* Animated top glow */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${themeColor} 50%, transparent 100%)`,
                  filter: `drop-shadow(0 0 8px ${themeColor})`,
                }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Ambient glow orbs */}
              <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: themeColor }} />
              <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: themeColor }} />

              {/* Header */}
              <motion.div
                className="flex items-center justify-between px-7 py-5 border-b relative"
                style={{ borderColor: 'rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.2)' }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <motion.h2
                  className="text-2xl font-black text-white"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  Vyberte sál
                </motion.h2>

                <motion.button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  <X className="w-5 h-5 text-white/50" />
                </motion.button>
              </motion.div>

              {/* Content - Department list */}
              <motion.div
                className="px-7 py-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <div className="grid grid-cols-2 gap-3">
                  {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map((dept, idx) => (
                    <motion.button
                      key={dept.id}
                      onClick={() => handleSelectDepartment(dept.id)}
                      className="p-4 rounded-xl text-center font-bold text-sm transition-all border relative overflow-hidden group"
                      style={{
                        backgroundColor: `${dept.accentColor}20`,
                        borderColor: `${dept.accentColor}40`,
                        color: '#FFFFFF',
                      }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + idx * 0.05, duration: 0.3 }}
                      whileHover={{
                        scale: 1.05,
                        borderColor: dept.accentColor,
                        backgroundColor: `${dept.accentColor}30`,
                        boxShadow: `0 0 20px ${dept.accentColor}40, inset 0 0 15px ${dept.accentColor}15`,
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {dept.name}
                    </motion.button>
                  ))}
                </div>

                {/* Clear button */}
                {schedule.get(String(selectedCell.date)) && (
                  <motion.button
                    onClick={() => {
                      const key = String(selectedCell.date);
                      setSchedule(new Map(schedule).set(key, ''));
                      setShowModal(false);
                    }}
                    className="w-full mt-4 p-3 rounded-lg border transition-all"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      color: '#FCA5A5',
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.3 }}
                    whileHover={{
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      borderColor: 'rgba(239, 68, 68, 0.5)',
                    }}
                  >
                    Vymazat sál
                  </motion.button>
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
