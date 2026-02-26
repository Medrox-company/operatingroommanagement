import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DEFAULT_DEPARTMENTS } from '../constants';

const ScheduleManager: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 4, 1));
  const [schedule, setSchedule] = useState<Map<string, { dept: string; events: string[] }>>(new Map([
    ['1', { dept: 'tra', events: ['Work at office 9:00', 'Lunch'] }],
    ['2', { dept: 'chir', events: ['Work at office 8:00'] }],
    ['3', { dept: '', events: [] }],
    ['5', { dept: 'uro', events: [] }],
    ['7', { dept: 'neurochir', events: ['Play tennis 17:00'] }],
    ['8', { dept: 'chir', events: [] }],
    ['14', { dept: 'chir', events: ['Play the guitar 15:00', 'English lesson 19:00'] }],
    ['21', { dept: 'orl', events: [] }],
    ['22', { dept: 'gyn', events: [] }],
    ['26', { dept: 'tra', events: [] }],
  ]));
  const [selectedCell, setSelectedCell] = useState<{ date: number } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState('English lesson');

  const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
          {/* Month Header with Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-black text-white">{monthName}</h2>
              <button className="bg-yellow-300 text-slate-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-yellow-400 transition-colors flex items-center gap-2">
                <span>+</span> New event
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button className="px-4 py-2 rounded-lg bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-colors">
                Month
              </button>
              <button className="px-4 py-2 rounded-lg bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-colors">
                Table
              </button>
              <button className="px-4 py-2 rounded-lg bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-colors">
                List
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

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-3">
              {calendarDays.map((day, idx) => {
                const dayData = day ? schedule.get(String(day)) : null;
                const dept = dayData?.dept ? getDepartmentById(dayData.dept) : null;

                return (
                  <div
                    key={idx}
                    className="min-h-40 bg-slate-900/50 border border-white/15 rounded-2xl overflow-hidden flex flex-col cursor-pointer hover:border-white/30 transition-all"
                    onClick={() => day && handleCellClick(day)}
                  >
                    {day ? (
                      <>
                        {/* Top section - events and day number */}
                        <div className="flex-1 p-3 flex flex-col border-b border-white/10 bg-gradient-to-b from-slate-800/40 to-slate-900/20">
                          <p className="text-xs font-bold text-white/60 mb-2">{day}</p>
                          <div className="flex-1 space-y-1 overflow-hidden">
                            {dayData?.events?.map((event, i) => (
                              <p key={i} className="text-xs text-white/50 truncate">{event}</p>
                            ))}
                          </div>
                        </div>

                        {/* Bottom section - department box */}
                        <div className="flex-1 p-2 flex items-center justify-center">
                          {dept ? (
                            <div
                              className="w-full h-full rounded-lg font-black text-xl flex items-center justify-center"
                              style={{
                                backgroundColor: dept.accentColor,
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
            <div className="flex gap-1 justify-end mt-3">
              <button onClick={handlePreviousMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-white/60" />
              </button>
              <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5 text-white/60" />
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
              <div className="text-white/70 text-sm">
                <span className="text-2xl">📋</span>
                <span className="font-bold ml-2">25 Total tasks</span>
              </div>
              <div className="text-white/70 text-sm">
                <span className="text-2xl">⚙️</span>
                <span className="font-bold ml-2">2 In progress</span>
              </div>
            </div>
          </div>

          {/* My Events */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="text-lg font-black text-white mb-4">My events</h3>
            <div className="space-y-3">
              {['Work at office', 'Family', 'Meeting with friends', 'Entertainment', 'Hobbies'].map((event, i) => (
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

      {/* Edit Event Modal */}
      {showModal && selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
          <div className="bg-white/[0.08] border border-white/20 rounded-3xl p-8 max-w-md w-full backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-white">{editingEvent}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type selector */}
              <div>
                <p className="text-sm text-white/60 mb-2">Type</p>
                <div className="flex items-center gap-2 bg-white/5 rounded-lg px-4 py-3 border border-white/10">
                  <div className="w-3 h-3 rounded-full bg-purple-400" />
                  <span className="text-white font-medium">Entertainment</span>
                </div>
              </div>

              {/* Time inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-white/60 mb-2">Hour</p>
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-2 border border-white/10">
                    <button className="text-white/60 hover:text-white text-lg">‹</button>
                    <span className="text-white font-bold flex-1 text-center">20:00pm</span>
                    <button className="text-white/60 hover:text-white text-lg">›</button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-white/60 mb-2">Hour</p>
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-2 border border-white/10">
                    <button className="text-white/60 hover:text-white text-lg">‹</button>
                    <span className="text-white font-bold flex-1 text-center">21:00pm</span>
                    <button className="text-white/60 hover:text-white text-lg">›</button>
                  </div>
                </div>
              </div>

              {/* Date */}
              <div>
                <p className="text-sm text-white/60 mb-2">Date</p>
                <p className="text-white font-bold">May 30,2023</p>
              </div>

              {/* Note */}
              <div>
                <p className="text-sm text-white/60 mb-2">Note</p>
                <input
                  type="text"
                  placeholder="Add note"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 outline-none text-sm"
                />
              </div>

              {/* Members */}
              <div>
                <p className="text-sm text-white/60 mb-3">Members</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 bg-white/20 rounded-full" />
                  ))}
                  <button className="w-8 h-8 rounded-full border-2 border-dashed border-white/30 text-white/60 hover:border-white hover:text-white transition-colors text-sm">
                    +
                  </button>
                </div>
              </div>

              {/* Department selector */}
              <div>
                <p className="text-sm text-white/60 mb-2">Oddělení</p>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => handleSelectDepartment(dept.id)}
                      className="p-2 rounded-lg text-xs font-bold transition-all border"
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
              <button className="w-full bg-yellow-300 text-slate-900 font-bold py-3 rounded-lg hover:bg-yellow-400 transition-colors mt-6">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;
