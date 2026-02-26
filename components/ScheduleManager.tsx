import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Play, Settings, Bell, Search, Table, List } from 'lucide-react';
import { DEFAULT_DEPARTMENTS } from '../constants';

const ScheduleManager: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 4, 30)); // May 30, 2023
  const [viewMode, setViewMode] = useState<'month' | 'table' | 'list'>('month');
  const [schedule, setSchedule] = useState<Map<string, string>>(new Map([
    ['1-0', 'tra'],
    ['2-0', 'chir'],
    ['4-0', 'tra'],
    ['5-0', 'uro'],
    ['7-0', 'ucoch'],
    ['8-0', 'chir'],
    ['14-0', 'chir'],
    ['21-0', 'nch'],
    ['22-0', 'gyn'],
    ['26-0', 'tra'],
  ]));
  const [selectedCell, setSelectedCell] = useState<{ date: number; } | null>(null);
  const [showModal, setShowModal] = useState(false);

  const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const departmentColors: { [key: string]: string } = {
    tra: '#7FD400',      // Lime green
    chir: '#4A7BA7',     // Blue
    uro: '#FFA500',      // Orange
    ucoch: '#8B0000',    // Dark red
    nch: '#0099FF',      // Bright blue
    gyn: '#FF00FF',      // Magenta
  };

  const departmentNames: { [key: string]: string } = {
    tra: 'TRA',
    chir: 'CHIR',
    uro: 'URO',
    ucoch: 'UCOCH',
    nch: 'NCH',
    gyn: 'GYN',
  };

  // Get days for current month
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
      const key = `${selectedCell.date}-0`;
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

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-8">
      {/* Main Header */}
      <div className="mb-12">
        <p className="text-xs font-bold text-purple-400/60 uppercase tracking-[0.2em] mb-2">PLÁNOVÁNÍ</p>
        <h1 className="text-6xl font-black text-white">
          ROZPIS <span className="text-slate-700">SÁLŮ</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Control Bar */}
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-300 rounded-xl flex items-center justify-center">
                  <div className="w-6 h-6 bg-slate-900 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-400 rounded-full" />
                  <div>
                    <p className="text-sm font-bold text-white">Camila Walker</p>
                    <p className="text-xs text-white/50">My schedule</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Settings className="w-5 h-5 text-white/60" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Bell className="w-5 h-5 text-white/60" />
                </button>
                <div className="w-6 h-6 rounded-full bg-white/20" />
              </div>

              <div className="flex-1 max-w-xs">
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Search className="w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search"
                    className="bg-transparent text-white placeholder-white/40 text-sm outline-none flex-1"
                  />
                </div>
              </div>

              <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <Play className="w-4 h-4" />
                <span className="text-sm">Quick tutorial</span>
              </button>
            </div>
          </div>

          {/* Month Header & View Options */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-black text-white">{monthName}</h2>
              <button className="bg-yellow-300 text-slate-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-yellow-400 transition-colors">
                + New event
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                  viewMode === 'month'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'table'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <Table className="w-4 h-4" /> Table
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'list'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <List className="w-4 h-4" /> List
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-6 backdrop-blur-xl overflow-hidden">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-3 mb-4">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="text-center">
                  <p className="text-sm font-bold text-white/50 uppercase">{day}</p>
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-3">
              {calendarDays.map((day, idx) => (
                <div
                  key={idx}
                  className="min-h-40 bg-gradient-to-br from-blue-900/30 to-slate-800/30 border border-white/15 rounded-3xl p-3 flex flex-col"
                >
                  {day ? (
                    <>
                      <p className="text-sm font-bold text-white/60 mb-2">{day}</p>
                      <div className="flex-1 flex items-center justify-center">
                        <button
                          onClick={() => handleCellClick(day)}
                          className="w-full h-24 rounded-2xl font-black text-2xl transition-all hover:scale-105 active:scale-95 border-2"
                          style={{
                            backgroundColor: schedule.has(`${day}-0`)
                              ? `${departmentColors[schedule.get(`${day}-0`) || 'tra']}80`
                              : 'rgba(255,255,255,0.08)',
                            borderColor: schedule.has(`${day}-0`)
                              ? departmentColors[schedule.get(`${day}-0`) || 'tra']
                              : 'rgba(255,255,255,0.2)',
                            color: schedule.has(`${day}-0`) ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                            textShadow: schedule.has(`${day}-0`)
                              ? `0 0 20px ${departmentColors[schedule.get(`${day}-0`) || 'tra']}40`
                              : 'none',
                          }}
                        >
                          {schedule.has(`${day}-0`)
                            ? departmentNames[schedule.get(`${day}-0`) || 'tra']
                            : ''}
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Current Date Display */}
          <div className="text-right">
            <p className="text-4xl font-black text-white">{dateStr}</p>
            <div className="flex gap-2 justify-end mt-2">
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
                  className={`aspect-square flex items-center justify-center text-xs font-bold rounded-lg ${
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

      {/* Event Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
          <div className="bg-white/[0.08] border border-white/20 rounded-3xl p-8 max-w-md w-full backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-white">English lesson</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-white/60 mb-2">Type</p>
                <div className="flex items-center gap-2 bg-white/5 rounded-lg px-4 py-3">
                  <div className="w-3 h-3 rounded-full bg-purple-400" />
                  <span className="text-white">Entertainment</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-white/60 mb-2">Hour</p>
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                    <button className="text-white/60 hover:text-white">‹</button>
                    <span className="text-white font-bold flex-1 text-center">20:00pm</span>
                    <button className="text-white/60 hover:text-white">›</button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-white/60 mb-2">Hour</p>
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                    <button className="text-white/60 hover:text-white">‹</button>
                    <span className="text-white font-bold flex-1 text-center">21:00pm</span>
                    <button className="text-white/60 hover:text-white">›</button>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-white/60 mb-2">Date</p>
                <p className="text-white font-bold">May 30,2023</p>
              </div>

              <div>
                <p className="text-sm text-white/60 mb-2">Note</p>
                <input
                  type="text"
                  placeholder="Add note"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 outline-none"
                />
              </div>

              <div>
                <p className="text-sm text-white/60 mb-3">Members</p>
                <div className="flex items-center gap-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 bg-white/20 rounded-full" />
                  ))}
                  <button className="w-8 h-8 rounded-full border-2 border-dashed border-white/30 text-white/60 hover:border-white hover:text-white transition-colors">
                    +
                  </button>
                </div>
              </div>

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
