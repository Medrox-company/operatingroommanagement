import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DEFAULT_DEPARTMENTS } from '../constants';

interface ScheduleEvent {
  id: string;
  date: Date;
  departmentId: string;
  title: string;
  startTime: string;
  endTime: string;
  members?: string[];
}

interface EditingEvent {
  date: Date;
  departmentId: string;
  title: string;
  startTime: string;
  endTime: string;
}

const ScheduleModule: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 4, 1)); // May 2023
  const [events, setEvents] = useState<ScheduleEvent[]>([
    {
      id: '1',
      date: new Date(2023, 4, 2),
      departmentId: 'TRA',
      title: 'Traumatologie',
      startTime: '8:00',
      endTime: '15:30',
    },
    {
      id: '2',
      date: new Date(2023, 4, 3),
      departmentId: 'CHIR',
      title: 'Chirurgie',
      startTime: '8:00',
      endTime: '15:30',
    },
    {
      id: '3',
      date: new Date(2023, 4, 7),
      departmentId: 'UCOCH',
      title: 'Urgentní část',
      startTime: '8:00',
      endTime: '16:00',
    },
    {
      id: '4',
      date: new Date(2023, 4, 8),
      departmentId: 'TRA',
      title: 'Traumatologie',
      startTime: '8:00',
      endTime: '15:30',
    },
    {
      id: '5',
      date: new Date(2023, 4, 11),
      departmentId: 'URO',
      title: 'Urologie',
      startTime: '8:00',
      endTime: '15:30',
    },
    {
      id: '6',
      date: new Date(2023, 4, 21),
      departmentId: 'NCH',
      title: 'Neurochirurgie',
      startTime: '8:00',
      endTime: '15:30',
    },
    {
      id: '7',
      date: new Date(2023, 4, 22),
      departmentId: 'GYN',
      title: 'Gynekologie',
      startTime: '8:00',
      endTime: '15:30',
    },
    {
      id: '8',
      date: new Date(2023, 4, 26),
      departmentId: 'TRA',
      title: 'Traumatologie',
      startTime: '8:00',
      endTime: '15:30',
    },
  ]);

  const [editingDate, setEditingDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EditingEvent>({
    date: new Date(),
    departmentId: '',
    title: '',
    startTime: '8:00',
    endTime: '15:30',
  });

  const getDepartmentColor = (deptId: string) => {
    const deptMap: { [key: string]: string } = {
      TRA: '#22c55e',
      CHIR: '#1e40af',
      UCOCH: '#dc2626',
      URO: '#f59e0b',
      NCH: '#06b6d4',
      GYN: '#d946ef',
    };
    return deptMap[deptId] || '#64748B';
  };

  const getDepartmentName = (deptId: string) => {
    const nameMap: { [key: string]: string } = {
      TRA: 'Traumatologie',
      CHIR: 'Chirurgie',
      UCOCH: 'Urgentní část',
      URO: 'Urologie',
      NCH: 'Neurochirurgie',
      GYN: 'Gynekologie',
    };
    return nameMap[deptId] || deptId;
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventForDate = (date: number) => {
    return events.find(
      e =>
        e.date.getDate() === date &&
        e.date.getMonth() === currentDate.getMonth() &&
        e.date.getFullYear() === currentDate.getFullYear()
    );
  };

  const handleDateClick = (day: number) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setEditingDate(selectedDate);
    setEditingEvent({
      date: selectedDate,
      departmentId: 'TRA',
      title: '',
      startTime: '8:00',
      endTime: '15:30',
    });
    setShowModal(true);
  };

  const handleSaveEvent = () => {
    const existingIndex = events.findIndex(
      e =>
        e.date.getDate() === editingEvent.date.getDate() &&
        e.date.getMonth() === editingEvent.date.getMonth() &&
        e.date.getFullYear() === editingEvent.date.getFullYear()
    );

    if (existingIndex >= 0) {
      const updated = [...events];
      updated[existingIndex] = {
        ...updated[existingIndex],
        departmentId: editingEvent.departmentId,
        title: editingEvent.title,
        startTime: editingEvent.startTime,
        endTime: editingEvent.endTime,
      };
      setEvents(updated);
    } else {
      setEvents([
        ...events,
        {
          id: Date.now().toString(),
          date: editingEvent.date,
          departmentId: editingEvent.departmentId,
          title: editingEvent.title,
          startTime: editingEvent.startTime,
          endTime: editingEvent.endTime,
        },
      ]);
    }

    setShowModal(false);
  };

  const monthName = currentDate.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="w-full">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
          <div className="w-4 h-4 text-emerald-400">📅</div>
          <p className="text-[10px] font-black text-emerald-400 tracking-[0.4em] uppercase">Plánování</p>
        </div>
        <h1 className="text-5xl lg:text-7xl font-black tracking-tighter uppercase leading-none">
          ROZPIS <span className="text-white/20">SÁLŮ</span>
        </h1>
      </header>

      {/* Calendar Container */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-3xl overflow-hidden p-6">
        {/* Month Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white capitalize">{monthName}</h2>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
              }
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white/60" />
            </button>
            <button
              onClick={() =>
                setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
              }
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        {/* Day Labels */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {dayLabels.map(label => (
            <div key={label} className="text-center">
              <p className="text-xs font-bold text-white/50 uppercase">{label}</p>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const event = day ? getEventForDate(day) : null;
            const color = event ? getDepartmentColor(event.departmentId) : 'rgba(255,255,255,0.03)';

            return (
              <motion.button
                key={idx}
                onClick={() => day && handleDateClick(day)}
                className={`aspect-square rounded-xl border-2 transition-all hover:scale-105 flex flex-col items-center justify-center p-2 ${
                  day ? 'cursor-pointer' : 'cursor-default'
                }`}
                style={{
                  backgroundColor: `${color}20`,
                  borderColor: color,
                  opacity: day ? 1 : 0.3,
                  pointerEvents: day ? 'auto' : 'none',
                }}
                whileHover={day ? { scale: 1.05 } : {}}
              >
                {day && (
                  <>
                    <span className="text-lg font-bold text-white">{day}</span>
                    {event && (
                      <>
                        <span
                          className="text-xs font-bold mt-1"
                          style={{ color }}
                        >
                          {event.departmentId}
                        </span>
                        <span className="text-[10px] text-white/50 mt-0.5">{event.startTime}</span>
                      </>
                    )}
                  </>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Naplánovat operaci</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Department Select */}
                <div>
                  <label className="text-xs font-bold text-white/60 uppercase mb-2 block">Oddělení</label>
                  <select
                    value={editingEvent.departmentId}
                    onChange={e => setEditingEvent({ ...editingEvent, departmentId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
                  >
                    <option value="TRA">Traumatologie</option>
                    <option value="CHIR">Chirurgie</option>
                    <option value="UCOCH">Urgentní část</option>
                    <option value="URO">Urologie</option>
                    <option value="NCH">Neurochirurgie</option>
                    <option value="GYN">Gynekologie</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-bold text-white/60 uppercase mb-2 block">Název</label>
                  <input
                    type="text"
                    value={editingEvent.title}
                    onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                    placeholder="Např. Operace"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40"
                  />
                </div>

                {/* Time Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-white/60 uppercase mb-2 block">Od</label>
                    <input
                      type="time"
                      value={editingEvent.startTime}
                      onChange={e => setEditingEvent({ ...editingEvent, startTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-white/60 uppercase mb-2 block">Do</label>
                    <input
                      type="time"
                      value={editingEvent.endTime}
                      onChange={e => setEditingEvent({ ...editingEvent, endTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveEvent}
                  className="w-full mt-6 px-4 py-2 rounded-lg bg-emerald-500 text-emerald-950 font-bold hover:bg-emerald-400 transition-colors"
                >
                  Uložit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScheduleModule;
