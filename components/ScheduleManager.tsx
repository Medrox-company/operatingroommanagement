import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DEFAULT_DEPARTMENTS } from '../constants';

const ScheduleManager: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 4, 30)); // Květen 30, 2023
  const [schedule, setSchedule] = useState<Map<string, string>>(new Map([
    ['1', 'tra'],
    ['2', 'chir'],
    ['4', 'tra'],
    ['5', 'uro'],
    ['7', 'neurochir'],
    ['8', 'chir'],
    ['14', 'chir'],
    ['21', 'orl'],
    ['22', 'gyn'],
    ['26', 'tra'],
  ]));
  const [selectedCell, setSelectedCell] = useState<{ date: number; } | null>(null);
  const [showModal, setShowModal] = useState(false);

  const DAYS_OF_WEEK = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthName = currentDate.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' });
  const dateStr = `${currentDate.getDate()} ${currentDate.toLocaleString('cs-CZ', { month: 'short', year: 'numeric' })}`;
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  // Build calendar grid
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
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
      const key = `${selectedCell.date}`;
      setSchedule(new Map(schedule).set(key, deptId));
    }
    setShowModal(false);
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
    <div className="w-full">
      {/* Main Header */}
      <div className="mb-8">
        <p className="text-xs font-bold text-purple-400/60 uppercase tracking-[0.2em] mb-2">PLÁNOVÁNÍ</p>
        <h1 className="text-5xl font-black text-white">
          ROZPIS <span className="text-white/20">SÁLŮ</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Month Header & View Options */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white">{monthName}</h2>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={handlePreviousMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-white/60" />
              </button>
              <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5 text-white/60" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3 backdrop-blur-sm overflow-hidden">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="text-center pb-1.5 border-b border-white/5">
                  <p className="text-xs font-bold text-white/40 uppercase">{day}</p>
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((day, idx) => {
                const deptId = day ? schedule.get(String(day)) : null;
                const dept = deptId ? getDepartmentById(deptId) : null;

                return (
                  <div
                    key={idx}
                    className="aspect-square bg-white/[0.02] border border-white/8 rounded-lg p-1.5 flex flex-col"
                  >
                    {day ? (
                      <>
                        <p className="text-xs font-bold text-white/40 mb-1">{day}</p>
                        <div className="flex-1 flex items-center justify-center">
                          <button
                            onClick={() => handleCellClick(day)}
                            className="w-full h-full rounded-lg font-bold text-xs transition-all hover:scale-105 active:scale-95 border-1.5 flex items-center justify-center"
                            style={{
                              backgroundColor: dept ? `${dept.accentColor}80` : 'rgba(255,255,255,0.03)',
                              borderColor: dept ? dept.accentColor : 'rgba(255,255,255,0.08)',
                              color: dept ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                            }}
                          >
                            {dept ? dept.name.substring(0, 3).toUpperCase() : ''}
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Current Date Display */}
          <div className="text-right">
            <p className="text-2xl font-black text-white">{dateStr}</p>
          </div>

          {/* Mini Calendar */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-2.5 backdrop-blur-sm">
            <div className="grid grid-cols-7 gap-0.5 mb-1.5">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="text-center text-xs font-bold text-white/40">
                  {day[0]}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <div
                  key={day}
                  className={`aspect-square flex items-center justify-center text-xs font-bold rounded ${
                    day === currentDate.getDate()
                      ? 'bg-yellow-300 text-slate-900'
                      : 'text-white/40 hover:bg-white/10 cursor-pointer transition-colors'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Department Selection Modal */}
      {showModal && selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white/[0.06] border border-white/15 rounded-xl p-6 max-w-sm w-full backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-white">Vyberte oddělení</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => handleSelectDepartment(dept.id)}
                  className="w-full p-3 rounded-lg text-left font-bold text-sm transition-all hover:scale-105 border-2"
                  style={{
                    backgroundColor: `${dept.accentColor}30`,
                    borderColor: dept.accentColor,
                    color: '#FFFFFF',
                  }}
                >
                  {dept.name}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                if (selectedCell) {
                  const key = `${selectedCell.date}`;
                  setSchedule(new Map(schedule).set(key, ''));
                }
                setShowModal(false);
              }}
              className="w-full mt-4 p-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 font-bold text-sm hover:bg-red-500/30 transition-colors"
            >
              Vymazat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;
