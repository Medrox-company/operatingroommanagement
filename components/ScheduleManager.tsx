import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DEFAULT_DEPARTMENTS } from '../constants';

interface ScheduleCell {
  date: number;
  roomId: string;
  deptId: string;
}

const ScheduleManager: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 4, 1)); // May 2024
  const [schedule, setSchedule] = useState<Map<string, string>>(new Map());
  const [selectedCell, setSelectedCell] = useState<{ date: number; roomId: string } | null>(null);
  const [showModal, setShowModal] = useState(false);

  const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const rooms = [
    { id: 'room1', name: 'Sál 1' },
    { id: 'room2', name: 'Sál 2' },
    { id: 'room3', name: 'Sál 3' },
  ];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getDepartmentColor = (deptId: string) => {
    for (const dept of DEFAULT_DEPARTMENTS) {
      if (dept.id === deptId) return dept.accentColor;
    }
    return '#64748B';
  };

  const getDepartmentCode = (deptId: string) => {
    for (const dept of DEFAULT_DEPARTMENTS) {
      if (dept.id === deptId) return dept.name;
    }
    return '';
  };

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const handleCellClick = (date: number, roomId: string) => {
    setSelectedCell({ date, roomId });
    setShowModal(true);
  };

  const handleSelectDepartment = (deptId: string) => {
    if (selectedCell) {
      const key = `${selectedCell.date}-${selectedCell.roomId}`;
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
    <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2">PLÁNOVÁNÍ</p>
        <h1 className="text-5xl font-black text-white">
          ROZPIS <span className="text-white/30">SÁLŮ</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Calendar */}
        <div className="xl:col-span-3 bg-white/[0.03] border border-white/10 rounded-3xl backdrop-blur-3xl p-8">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-white">{monthName}</h2>
            <div className="flex gap-3">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white/70" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-white/70" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="text-center text-xs font-bold text-white/50 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-3">
            {calendarDays.map((day, index) => (
              <div key={index} className="aspect-square">
                {day ? (
                  <div className="h-full bg-white/[0.02] border border-white/10 rounded-2xl p-3 flex flex-col">
                    <span className="text-sm font-bold text-white/70 mb-2">{day}</span>
                    <div className="flex-1 space-y-1.5 overflow-y-auto">
                      {rooms.map(room => {
                        const cellKey = `${day}-${room.id}`;
                        const deptId = schedule.get(cellKey);
                        const deptColor = deptId ? getDepartmentColor(deptId) : null;
                        const deptCode = deptId ? getDepartmentCode(deptId) : '';

                        return (
                          <button
                            key={room.id}
                            onClick={() => handleCellClick(day, room.id)}
                            className="w-full text-xs font-black py-2 rounded-xl transition-all hover:scale-105 border-2 uppercase tracking-wider"
                            style={{
                              backgroundColor: deptId ? `${deptColor}40` : 'rgba(255,255,255,0.05)',
                              borderColor: deptColor || 'rgba(255,255,255,0.1)',
                              color: deptColor || 'rgba(255,255,255,0.3)',
                            }}
                          >
                            {deptCode || '-'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-full" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Mini Calendar */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-3xl p-4">
            <div className="grid grid-cols-7 gap-1.5 mb-3">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="text-center text-xs font-bold text-white/40">
                  {day[0]}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`aspect-square flex items-center justify-center text-xs font-bold rounded ${
                    day === currentDate.getDate()
                      ? 'bg-lime-400 text-black'
                      : 'text-white/50'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          {/* Resource Consumption */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-3xl p-6">
            <h3 className="text-sm font-bold text-white mb-6">Resource consumption</h3>
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#BFFF00"
                    strokeWidth="2"
                    strokeDasharray="50.3 251.3"
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-black text-white">20%</span>
                </div>
              </div>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-white/70">
                <span>25 Total tasks</span>
                <span>📋</span>
              </div>
              <div className="flex items-center justify-between text-white/70">
                <span>2 In progress</span>
                <span>⚙️</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Department Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Vyberte oddělení</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>

            {/* Department List */}
            <div className="max-h-96 overflow-y-auto p-4 space-y-2">
              {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map(dept => (
                <button
                  key={dept.id}
                  onClick={() => handleSelectDepartment(dept.id)}
                  className="w-full p-4 rounded-xl text-left font-bold text-white transition-all hover:scale-105 border-2"
                  style={{
                    backgroundColor: `${dept.accentColor}25`,
                    borderColor: `${dept.accentColor}60`,
                  }}
                >
                  <span style={{ color: dept.accentColor }}>{dept.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;
