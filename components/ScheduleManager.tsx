import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DEFAULT_DEPARTMENTS } from '../constants';

const ScheduleManager: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 4, 1)); // Květen 2023
  const [selectedDay, setSelectedDay] = useState<{ date: Date; dept: string } | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Týdenní data - den jako klíč "YYYY-MM-DD"
  const [schedule, setSchedule] = useState<Map<string, string>>(new Map([
    ['2023-05-01', 'tra'],
    ['2023-05-02', 'chir'],
    ['2023-05-03', 'chir'],
    ['2023-05-04', 'uro'],
    ['2023-05-05', 'neurochir'],
  ]));

  // Česká jména dní
  const DAYS_CZ = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];
  const MONTHS_CZ = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];

  // Vrátí pondělí aktuálního týdne
  const getMonday = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const monday = getMonday(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });

  const getDayKey = (date: Date) => date.toISOString().split('T')[0];

  const getDepartmentById = (deptId: string) => {
    return DEFAULT_DEPARTMENTS.find(d => d.id === deptId);
  };

  const handleDayClick = (date: Date) => {
    const key = getDayKey(date);
    const dept = schedule.get(key) || '';
    setSelectedDay({ date, dept });
    setShowModal(true);
  };

  const handleSelectDepartment = (deptId: string) => {
    if (selectedDay) {
      const key = getDayKey(selectedDay.date);
      setSchedule(new Map(schedule).set(key, deptId));
      setShowModal(false);
    }
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const mondayFormatted = `${monday.getDate()}. ${MONTHS_CZ[monday.getMonth()]}`;
  const themeColor = selectedDay ? (getDepartmentById(selectedDay.dept)?.accentColor || '#A78BFA') : '#A78BFA';

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex-shrink-0 px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-purple-400/60 uppercase tracking-[0.2em] mb-1">PLÁNOVÁNÍ</p>
            <h1 className="text-4xl font-black text-white">
              ROZPIS <span className="text-slate-700">SÁLŮ</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handlePreviousWeek}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white/60" />
            </button>
            <div className="text-center min-w-48">
              <p className="text-sm text-white/50 mb-1">TÝDEN OD</p>
              <p className="text-xl font-black text-white">{mondayFormatted}</p>
            </div>
            <button 
              onClick={handleNextWeek}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-white/60" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="flex-grow px-8 pb-8 overflow-hidden">
        <div className="grid grid-cols-7 gap-3 h-full">
          {weekDays.map((date, idx) => {
            const dayKey = getDayKey(date);
            const deptId = schedule.get(dayKey);
            const dept = deptId ? getDepartmentById(deptId) : null;
            const dayNum = date.getDate();
            const dayName = DAYS_CZ[idx];

            return (
              <motion.div
                key={dayKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleDayClick(date)}
                className="rounded-2xl overflow-hidden flex flex-col cursor-pointer group h-full"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {/* Day Header */}
                <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <p className="text-xs font-bold text-white/40 uppercase mb-2">{dayName}</p>
                  <p className="text-2xl font-black text-white">{dayNum}</p>
                </div>

                {/* Department Box */}
                <div className="flex-grow flex items-center justify-center p-3 group-hover:bg-white/[0.01] transition-colors">
                  {dept ? (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-full h-full rounded-lg font-black text-2xl flex items-center justify-center transition-all"
                      style={{
                        background: dept.accentColor + '20',
                        border: `2px solid ${dept.accentColor}50`,
                        color: '#FFFFFF',
                        boxShadow: `0 0 20px ${dept.accentColor}25, inset 0 0 20px ${dept.accentColor}10`,
                      }}
                      whileHover={{
                        boxShadow: `0 0 30px ${dept.accentColor}40, inset 0 0 30px ${dept.accentColor}15, 0 8px 32px rgba(0,0,0,0.3)`,
                      }}
                    >
                      {dept.name.split(' ')[0].substring(0, 3).toUpperCase()}
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center"
                    >
                      <p className="text-xs text-white/30">Volný den</p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Department Selection Modal - TimelineModule Style */}
      <AnimatePresence>
        {showModal && selectedDay && (
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

            {/* Modal Content */}
            <motion.div
              className="relative w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden"
              style={{ 
                background: 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 0 80px ${themeColor}15`
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
                  filter: `drop-shadow(0 0 8px ${themeColor})`
                }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Ambient glow orbs */}
              <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: themeColor }} />
              <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: themeColor }} />

              {/* Header */}
              <motion.div 
                className="flex items-center justify-between px-8 py-6 border-b relative"
                style={{ borderColor: 'rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.2)' }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <motion.h2 
                  className="text-2xl font-black tracking-tight text-white"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  {DAYS_CZ[selectedDay.date.getDay() === 0 ? 6 : selectedDay.date.getDay() - 1]} {selectedDay.date.getDate()}. {MONTHS_CZ[selectedDay.date.getMonth()]}
                </motion.h2>

                <motion.button
                  onClick={() => setShowModal(false)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all"
                  style={{ 
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  }}
                  whileHover={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  <X className="w-5 h-5 text-white" />
                </motion.button>
              </motion.div>

              {/* Content */}
              <div className="p-8">
                <motion.p 
                  className="text-sm text-white/60 mb-6 font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  Vyberte oddělení pro tento den
                </motion.p>

                {/* Department Grid */}
                <motion.div 
                  className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map((dept, idx) => (
                    <motion.button
                      key={dept.id}
                      onClick={() => handleSelectDepartment(dept.id)}
                      className="p-4 rounded-xl font-bold text-sm transition-all border-2"
                      style={{
                        backgroundColor: `${dept.accentColor}25`,
                        borderColor: dept.accentColor,
                        color: '#FFFFFF',
                      }}
                      whileHover={{
                        backgroundColor: `${dept.accentColor}40`,
                        boxShadow: `0 0 20px ${dept.accentColor}40, inset 0 0 15px ${dept.accentColor}15`,
                      }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 + idx * 0.05, duration: 0.3 }}
                    >
                      {dept.name}
                    </motion.button>
                  ))}
                </motion.div>

                {/* Clear Button */}
                <motion.button
                  onClick={() => {
                    const key = getDayKey(selectedDay.date);
                    setSchedule(new Map(schedule).set(key, ''));
                    setShowModal(false);
                  }}
                  className="w-full p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 font-bold hover:bg-red-500/30 transition-all"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                >
                  Vymazat přiřazení
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
