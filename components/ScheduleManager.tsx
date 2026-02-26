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

  const DAYS_OF_WEEK = ['Sun', 'Tue', 'Mon', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const dateStr = `${currentDate.getDate()} ${currentDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`;
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
          ROZPIS <span className="text-slate-700">SÁLŮ</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Month Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-white">{monthName}</h2>
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
          <div className="space-y-3">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-3">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="text-center">
                  <p className="text-sm font-bold text-white/50 uppercase">{day}</p>
                </div>
              ))}
            </div>

            {/* Calendar Grid - Large Month View */}
            <div className="grid grid-cols-7 gap-3">
              {calendarDays.map((day, idx) => {
                const deptId = day ? schedule.get(String(day)) : null;
                const dept = deptId ? getDepartmentById(deptId) : null;

                return (
                  <div
                    key={idx}
                    className="min-h-32 bg-gradient-to-b from-slate-800/40 to-slate-900/40 border border-white/15 rounded-2xl p-4 flex flex-col cursor-pointer hover:border-white/30 transition-all"
                    onClick={() => day && handleCellClick(day)}
                  >
                    {day ? (
                      <>
                        <p className="text-sm font-bold text-white/70 mb-3">{day}</p>
                        <div className="flex-1 flex items-center justify-center">
                          {dept ? (
                            <div
                              className="w-full h-full rounded-xl font-black text-2xl flex items-center justify-center border-2 transition-all hover:scale-105"
                              style={{
                                backgroundColor: dept.accentColor,
                                borderColor: dept.accentColor,
                                color: '#FFFFFF',
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
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Current Date Display */}
          <div className="text-right">
            <p className="text-4xl font-black text-white">{dateStr}</p>
            <div className="flex gap-1 justify-end mt-2">
              <button onClick={handlePreviousMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronLeft className="w-4 h-4 text-white/60" />
              </button>
              <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronRight className="w-4 h-4 text-white/60" />
              </button>
            </div>
          </div>

          {/* Mini Calendar */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 backdrop-blur-xl">
            <div className="grid grid-cols-7 gap-1.5 mb-3">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="text-center text-xs font-bold text-white/40">
                  {day[0]}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <div
                  key={day}
                  className={`aspect-square flex items-center justify-center text-xs font-bold rounded ${
                    day === currentDate.getDate()
                      ? 'bg-yellow-300 text-slate-900'
                      : 'text-white/50 hover:bg-white/10 cursor-pointer transition-colors'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          {/* Resource Consumption */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="text-lg font-black text-white mb-6">Resource consumption</h3>
            <div className="flex items-center justify-center mb-8">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#BFFF00"
                    strokeWidth="3"
                    strokeDasharray="31.4 157"
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-black text-white">20%</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-white/70">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  <span className="text-sm font-bold">25 Total tasks</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-white/70">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚙️</span>
                  <span className="text-sm font-bold">2 In progress</span>
                </div>
              </div>
            </div>
          </div>

          {/* My Events */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white">My events</h3>
              <button className="text-white/40 hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                'Work at office',
                'Family',
                'Meeting with friends',
                'Entertainment',
                'Hobbies',
              ].map((event, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input type="checkbox" className="w-4 h-4 rounded" />
                  <span className="text-white/70 text-sm">{event}</span>
                </div>
              ))}
              <button className="text-purple-400 text-sm font-bold hover:text-purple-300 transition-colors mt-2">
                + Add events
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Department Selection Modal */}
      {showModal && selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
          <div className="bg-white/[0.08] border border-white/20 rounded-3xl p-8 max-w-md w-full backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-white">Vyberte oddělení</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => handleSelectDepartment(dept.id)}
                  className="w-full p-4 rounded-xl text-left font-bold text-base transition-all hover:scale-105 border-2"
                  style={{
                    backgroundColor: `${dept.accentColor}40`,
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
              className="w-full mt-6 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 font-bold hover:bg-red-500/30 transition-colors"
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
