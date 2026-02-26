import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DEFAULT_DEPARTMENTS } from '../constants';

const ScheduleManager: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 4, 1));
  const [schedule, setSchedule] = useState<Map<string, string>>(new Map([
    ['1', 'tra'],
    ['2', 'chir'],
    ['3', ''],
    ['5', 'uro'],
    ['7', 'neurochir'],
    ['8', 'chir'],
    ['14', 'chir'],
    ['21', 'orl'],
    ['22', 'gyn'],
    ['26', 'tra'],
  ]));
  const [selectedCell, setSelectedCell] = useState<{ date: number } | null>(null);
  const [showModal, setShowModal] = useState(false);

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

  // Týden začíná pondělím (1 = Monday, 0 = Sunday)
  const DAYS_OF_WEEK = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    // Vrací 0-6, kde 0 je neděle
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthName = currentDate.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  // Přeuspořádej grid aby začínal pondělím
  const adjustedFirstDay = (firstDay + 6) % 7; // Posune neděli na konec

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
      const current = schedule.get(key) || { dept: '', events: [] };
      setSchedule(new Map(schedule).set(key, { ...current, dept: deptId }));
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
      <div className="pb-4 flex-shrink-0">
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

      {/* Calendar Grid - Flex-grow to fill space */}
      <div className="flex-grow overflow-hidden flex flex-col">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 pb-2 flex-shrink-0">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="text-center">
              <p className="text-xs font-bold text-white/50 uppercase">{day}</p>
            </div>
          ))}
        </div>

        {/* Calendar Grid - Fill available space */}
        <div className="grid grid-cols-7 gap-2 flex-grow overflow-hidden">
          {calendarDays.map((day, idx) => {
            const dayData = day ? schedule.get(String(day)) : null;
            const dept = dayData?.dept ? getDepartmentById(dayData.dept) : null;

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
                    {/* Top section - events and day number */}
                    <div className="flex-1 p-2 flex flex-col border-b overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <p className="text-xs font-bold text-white/60 mb-1">{day}</p>
                      <div className="flex-1 space-y-0.5 overflow-hidden">
                        {dayData?.events?.slice(0, 2).map((event, i) => (
                          <p key={i} className="text-xs text-white/50 truncate leading-tight">{event}</p>
                        ))}
                      </div>
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

      {/* Edit Event Modal */}
      {showModal && selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
          <div className="bg-white/[0.08] border border-white/20 rounded-3xl p-6 max-w-md w-full backdrop-blur-xl max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-white">{editingEvent}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Type selector */}
              <div>
                <p className="text-xs text-white/60 mb-1">Typ</p>
                <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10 text-sm">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-white font-medium">Zábava</span>
                </div>
              </div>

              {/* Time inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-white/60 mb-1">Od</p>
                  <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1.5 border border-white/10">
                    <button className="text-white/60 hover:text-white text-sm">‹</button>
                    <span className="text-white font-bold flex-1 text-center text-sm">20:00</span>
                    <button className="text-white/60 hover:text-white text-sm">›</button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/60 mb-1">Do</p>
                  <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1.5 border border-white/10">
                    <button className="text-white/60 hover:text-white text-sm">‹</button>
                    <span className="text-white font-bold flex-1 text-center text-sm">21:00</span>
                    <button className="text-white/60 hover:text-white text-sm">›</button>
                  </div>
                </div>
              </div>

              {/* Date */}
              <div>
                <p className="text-xs text-white/60 mb-1">Datum</p>
                <p className="text-white font-bold text-sm">30. května 2023</p>
              </div>

              {/* Note */}
              <div>
                <p className="text-xs text-white/60 mb-1">Poznámka</p>
                <input
                  type="text"
                  placeholder="Přidejte poznámku"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/40 outline-none text-xs"
                />
              </div>

              {/* Department selector */}
              <div>
                <p className="text-xs text-white/60 mb-2">Oddělení</p>
                <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto">
                  {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => handleSelectDepartment(dept.id)}
                      className="p-1.5 rounded-lg text-xs font-bold transition-all border"
                      style={{
                        backgroundColor: `${dept.accentColor}40`,
                        borderColor: dept.accentColor,
                        color: '#FFFFFF',
                      }}
                    >
                      {dept.name.substring(0, 6)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save button */}
              <button className="w-full bg-yellow-300 text-slate-900 font-bold py-2 rounded-lg hover:bg-yellow-400 transition-colors mt-4 text-sm">
                Uložit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;
