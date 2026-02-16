import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, X, Check, Edit2 } from 'lucide-react';
import { MOCK_ROOMS } from '../constants';

interface ScheduleEntry {
  roomId: string;
  roomName: string;
  department: string;
  schedule: {
    [key: string]: string; // day -> department/type
  };
}

const DAYS_OF_WEEK = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];

const ScheduleManager: React.FC = () => {
  const [scheduleData, setScheduleData] = useState<ScheduleEntry[]>(
    MOCK_ROOMS.map(room => ({
      roomId: room.id,
      roomName: room.name,
      department: room.department,
      schedule: {
        'Pondělí': room.department,
        'Úterý': room.department,
        'Středa': room.department,
        'Čtvrtek': room.department,
        'Pátek': room.department,
        'Sobota': room.department,
        'Neděle': room.department,
      },
    }))
  );

  const [editingCell, setEditingCell] = useState<{ roomId: string; day: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleCellEdit = (roomId: string, day: string, value: string) => {
    setScheduleData(prev =>
      prev.map(entry =>
        entry.roomId === roomId
          ? { ...entry, schedule: { ...entry.schedule, [day]: value } }
          : entry
      )
    );
    setEditingCell(null);
  };

  const handleStartEdit = (roomId: string, day: string, currentValue: string) => {
    setEditingCell({ roomId, day });
    setEditValue(currentValue);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <header className="flex flex-col items-center lg:items-start justify-between gap-6 mb-16 flex-shrink-0">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <div className="w-4 h-4 text-[#A855F7]">📅</div>
            <p className="text-[10px] font-black text-[#A855F7] tracking-[0.4em] uppercase">WEEKLY SCHEDULE</p>
          </div>
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
            ROZPIS <span className="text-white/20">SÁLŮ</span>
          </h1>
        </div>
      </header>

      {/* Schedule Table */}
      <div className="w-full overflow-x-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-w-full"
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-3xl overflow-hidden"
            style={{
              boxShadow: `inset 0 1px 2px rgba(255,255,255,0.3), 0 25px 50px -12px rgba(0,0,0,0.25)`,
            }}
          >
            {/* Table Header */}
            <div className="grid gap-px bg-white/5" style={{
              gridTemplateColumns: `180px repeat(${DAYS_OF_WEEK.length}, 1fr)`,
            }}>
              {/* Room Names Column */}
              <div className="p-4 border-r border-white/10 bg-white/[0.05]">
                <p className="text-xs font-black text-white/60 tracking-widest uppercase">Sál</p>
              </div>

              {/* Days Header */}
              {DAYS_OF_WEEK.map((day, index) => (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 text-center border-r border-white/10 bg-white/[0.05] border-b"
                >
                  <p className="text-xs font-black text-[#A855F7] tracking-widest uppercase">{day}</p>
                </motion.div>
              ))}
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-white/10">
              {scheduleData.map((entry, rowIndex) => (
                <motion.div
                  key={entry.roomId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: rowIndex * 0.05 }}
                  className="grid gap-px hover:bg-white/[0.02] transition-colors"
                  style={{
                    gridTemplateColumns: `180px repeat(${DAYS_OF_WEEK.length}, 1fr)`,
                  }}
                >
                  {/* Room Name Cell */}
                  <div className="p-4 border-r border-white/10 flex items-center gap-3 bg-white/[0.02]">
                    <GripVertical className="w-4 h-4 text-white/30 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-white">{entry.roomName}</p>
                      <p className="text-xs text-white/40">{entry.department}</p>
                    </div>
                  </div>

                  {/* Schedule Cells */}
                  {DAYS_OF_WEEK.map(day => {
                    const isEditing = editingCell?.roomId === entry.roomId && editingCell?.day === day;
                    const cellValue = entry.schedule[day];

                    return (
                      <motion.div
                        key={`${entry.roomId}-${day}`}
                        className="border-r border-white/10 flex items-center justify-center min-h-20"
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                        transition={{ duration: 0.2 }}
                      >
                        {isEditing ? (
                          <div className="w-full h-full flex items-center justify-center gap-2 p-2">
                            <input
                              autoFocus
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="flex-1 px-2 py-1 rounded bg-white/10 border border-white/30 text-white text-xs text-center focus:outline-none focus:border-[#A855F7]"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCellEdit(entry.roomId, day, editValue);
                                } else if (e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                              }}
                            />
                            <motion.button
                              onClick={() => handleCellEdit(entry.roomId, day, editValue)}
                              className="p-1.5 rounded hover:bg-green-500/20 text-green-400"
                              whileHover={{ scale: 1.1 }}
                            >
                              <Check className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              onClick={() => setEditingCell(null)}
                              className="p-1.5 rounded hover:bg-red-500/20 text-red-400"
                              whileHover={{ scale: 1.1 }}
                            >
                              <X className="w-4 h-4" />
                            </motion.button>
                          </div>
                        ) : (
                          <motion.button
                            onClick={() => handleStartEdit(entry.roomId, day, cellValue)}
                            className="w-full h-full flex items-center justify-center text-sm font-semibold text-white/70 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer group"
                            whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                          >
                            <div className="text-center">
                              <p className="text-xs text-white/50 group-hover:text-white/70 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 text-[10px]">Edit</p>
                              <p>{cellValue || '-'}</p>
                            </div>
                          </motion.button>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/10"
      >
        <p className="text-xs text-white/50">
          Klikněte na libovolné pole v tabulce pro úpravu rozvrhu oddělení pro daný den. Změny se automaticky uloží.
        </p>
      </motion.div>
    </div>
  );
};

export default ScheduleManager;
