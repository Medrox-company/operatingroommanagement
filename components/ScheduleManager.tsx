import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, X, Check, Edit2, ChevronDown } from 'lucide-react';
import { MOCK_ROOMS } from '../constants';
import { DEFAULT_DEPARTMENTS } from '../constants';

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
  const [showDeptModal, setShowDeptModal] = useState(false);

  // Flatten departments for display
  const getAllDepartmentOptions = () => {
    const options: Array<{ id: string; name: string; color: string }> = [];
    DEFAULT_DEPARTMENTS.forEach(dept => {
      if (dept.isActive) {
        options.push({ id: dept.id, name: dept.name, color: dept.accentColor });
        dept.subDepartments.forEach(subDept => {
          if (subDept.isActive) {
            options.push({ id: subDept.id, name: `${dept.name} - ${subDept.name}`, color: dept.accentColor });
          }
        });
      }
    });
    return options;
  };

  const departmentOptions = getAllDepartmentOptions();

  const getDepartmentColor = (deptId: string) => {
    for (const dept of DEFAULT_DEPARTMENTS) {
      if (dept.id === deptId) return dept.accentColor;
      for (const subDept of dept.subDepartments) {
        if (subDept.id === deptId) return dept.accentColor;
      }
    }
    return '#64748B';
  };

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
                            <motion.button
                              onClick={() => setShowDeptModal(true)}
                              className="flex-1 px-3 py-2 rounded bg-white/10 border border-white/30 text-white text-xs font-semibold focus:outline-none focus:border-blue-400 flex items-center justify-between"
                              style={{ 
                                borderColor: `${getDepartmentColor(editValue)}60`,
                                backgroundColor: `${getDepartmentColor(editValue)}15`,
                              }}
                            >
                              <span>{editValue || 'Vybrat oddělení'}</span>
                              <ChevronDown className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              onClick={() => handleCellEdit(editingCell!.roomId, editingCell!.day, editValue)}
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
                            className="w-full h-full flex items-center justify-center px-3 py-4 rounded-lg mx-1 text-sm font-semibold text-white transition-all cursor-pointer group"
                            style={{
                              backgroundColor: `${getDepartmentColor(cellValue)}15`,
                              border: `1.5px solid ${getDepartmentColor(cellValue)}40`,
                            }}
                            whileHover={{ 
                              backgroundColor: `${getDepartmentColor(cellValue)}25`,
                              borderColor: `${getDepartmentColor(cellValue)}80`,
                            }}
                          >
                            <div className="text-center">
                              {cellValue ? (
                                <p style={{ color: getDepartmentColor(cellValue) }}>
                                  {departmentOptions.find(opt => opt.id === cellValue)?.name || cellValue}
                                </p>
                              ) : (
                                <p className="text-white/40">-</p>
                              )}
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

      {/* Department Selection Modal */}
      <AnimatePresence>
        {showDeptModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeptModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Vybrat oddělení</h2>
                <motion.button
                  onClick={() => setShowDeptModal(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.1 }}
                >
                  <X className="w-6 h-6 text-white" />
                </motion.button>
              </div>

              {/* Department Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map((dept) => (
                  <div key={dept.id}>
                    {/* Main Department */}
                    <motion.button
                      onClick={() => {
                        setEditValue(dept.id);
                        setShowDeptModal(false);
                      }}
                      className="w-full p-4 rounded-lg border-2 text-left transition-all mb-2"
                      style={{
                        borderColor: editValue === dept.id ? dept.accentColor : 'rgba(255,255,255,0.2)',
                        backgroundColor: `${dept.accentColor}15`,
                      }}
                      whileHover={{
                        backgroundColor: `${dept.accentColor}25`,
                        scale: 1.02,
                      }}
                    >
                      <p className="font-bold text-white">{dept.name}</p>
                      <p className="text-xs text-white/50">{dept.description}</p>
                    </motion.button>

                    {/* Sub-departments */}
                    {dept.subDepartments.filter(s => s.isActive).length > 0 && (
                      <div className="pl-4 space-y-2">
                        {dept.subDepartments.filter(s => s.isActive).map((subDept) => (
                          <motion.button
                            key={subDept.id}
                            onClick={() => {
                              setEditValue(subDept.id);
                              setShowDeptModal(false);
                            }}
                            className="w-full p-3 rounded-lg border text-left text-sm transition-all"
                            style={{
                              borderColor: editValue === subDept.id ? dept.accentColor : 'rgba(255,255,255,0.1)',
                              backgroundColor: `${dept.accentColor}10`,
                            }}
                            whileHover={{
                              backgroundColor: `${dept.accentColor}20`,
                              scale: 1.02,
                            }}
                          >
                            <p className="font-semibold text-white/90">{subDept.name}</p>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <motion.button
                  onClick={() => setShowDeptModal(false)}
                  className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/[0.08] transition-all font-semibold"
                  whileHover={{ scale: 1.05 }}
                >
                  Zrušit
                </motion.button>
                <motion.button
                  onClick={() => setShowDeptModal(false)}
                  className="px-6 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-300 hover:bg-blue-500/30 transition-all font-semibold"
                  whileHover={{ scale: 1.05 }}
                >
                  Potvrdit
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
