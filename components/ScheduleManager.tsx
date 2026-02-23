import React, { useState } from 'react';
import { GripVertical, X } from 'lucide-react';
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
    setShowDeptModal(false);
  };

  const handleStartEdit = (roomId: string, day: string) => {
    setEditingCell({ roomId, day });
    setShowDeptModal(true);
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
        <div className="min-w-full">
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
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day}
                  className="p-4 text-center border-r border-white/10 bg-white/[0.05] border-b"
                >
                  <p className="text-xs font-black text-[#A855F7] tracking-widest uppercase">{day}</p>
                </div>
              ))}
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-white/10">
              {scheduleData.map((entry) => (
                <div
                  key={entry.roomId}
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
                    const cellValue = entry.schedule[day];

                    return (
                      <div
                        key={`${entry.roomId}-${day}`}
                        className="border-r border-white/10 flex items-center justify-center min-h-20"
                      >
                        <button
                          onClick={() => handleStartEdit(entry.roomId, day)}
                          className="w-full h-full flex items-center justify-center px-3 py-4 rounded-lg mx-1 text-sm font-semibold text-white transition-all cursor-pointer hover:scale-[1.02]"
                          style={{
                            backgroundColor: `${getDepartmentColor(cellValue)}30`,
                            border: `2px solid ${getDepartmentColor(cellValue)}70`,
                          }}
                        >
                          <div className="text-center">
                            {cellValue ? (
                              <p style={{ color: getDepartmentColor(cellValue) }} className="font-bold">
                                {departmentOptions.find(opt => opt.id === cellValue)?.name || cellValue}
                              </p>
                            ) : (
                              <p className="text-white/40">-</p>
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-8 p-4 rounded-lg bg-white/[0.03] border border-white/10">
        <p className="text-xs text-white/50">
          Klikněte na libovolné pole v tabulce pro úpravu rozvrhu oddělení pro daný den. Změny se automaticky uloží.
        </p>
      </div>

      {/* Department Selection Modal - Compact Design */}
      {showDeptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDeptModal(false)}
        >
          <div
            className="relative overflow-hidden rounded-2xl w-full max-w-md mx-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background */}
            <div className="absolute inset-0 backdrop-blur-3xl" style={{
              background: `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)`,
              border: `1px solid rgba(255,255,255,0.2)`,
              boxShadow: `0 25px 50px -12px rgba(0,0,0,0.5)`,
            }} />

            {/* Content */}
            <div className="relative z-10 p-6 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                <h2 className="text-xl font-bold text-white">Vybrat oddělení</h2>
                <button
                  onClick={() => setShowDeptModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-all flex-shrink-0"
                >
                  <X className="w-5 h-5 text-white/80 hover:text-white" />
                </button>
              </div>

              {/* Department Grid - Show all without scrolling */}
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
                  {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map((dept) => (
                    <div key={dept.id}>
                      {/* Main Department Button */}
                      <button
                        onClick={() => {
                          if (editingCell) {
                            handleCellEdit(editingCell.roomId, editingCell.day, dept.id);
                          }
                        }}
                        className="w-full p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                        style={{
                          borderColor: `${dept.accentColor}60`,
                          backgroundColor: `${dept.accentColor}15`,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: dept.accentColor }}
                          />
                          <p className="font-bold text-white">{dept.name}</p>
                        </div>
                      </button>

                      {/* Sub-departments */}
                      {dept.subDepartments.filter(s => s.isActive).length > 0 && (
                        <div className="pl-4 space-y-1.5 mt-1.5">
                          {dept.subDepartments.filter(s => s.isActive).map((subDept) => (
                            <button
                              key={subDept.id}
                              onClick={() => {
                                if (editingCell) {
                                  handleCellEdit(editingCell.roomId, editingCell.day, subDept.id);
                                }
                              }}
                              className="w-full p-3 rounded-lg border text-left transition-all hover:scale-[1.005] active:scale-[0.995]"
                              style={{
                                borderColor: `${dept.accentColor}40`,
                                backgroundColor: `${dept.accentColor}08`,
                              }}
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: dept.accentColor }}
                                />
                                <p className="font-semibold text-white/90 text-sm">{subDept.name}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleManager;
