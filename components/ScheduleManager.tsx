import React, { useState } from 'react';
import { GripVertical, X, ChevronDown } from 'lucide-react';
import { MOCK_ROOMS } from '../constants';
import { DEFAULT_DEPARTMENTS } from '../constants';

interface ScheduleEntry {
  roomId: string;
  roomName: string;
  department: string;
  schedule: {
    [key: string]: {
      deptId: string;
      weekType: 'even' | 'odd' | 'both';
    };
  };
}

type WeekType = 'even' | 'odd' | 'both';

const DAYS_OF_WEEK = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];

const ScheduleManager: React.FC = () => {
  const [scheduleData, setScheduleData] = useState<ScheduleEntry[]>(
    MOCK_ROOMS.map(room => ({
      roomId: room.id,
      roomName: room.name,
      department: room.department,
      schedule: {
        'Pondělí': { deptId: room.department, weekType: 'both' },
        'Úterý': { deptId: room.department, weekType: 'both' },
        'Středa': { deptId: room.department, weekType: 'both' },
        'Čtvrtek': { deptId: room.department, weekType: 'both' },
        'Pátek': { deptId: room.department, weekType: 'both' },
        'Sobota': { deptId: '', weekType: 'both' },
        'Neděle': { deptId: '', weekType: 'both' },
      },
    }))
  );

  const [editingCell, setEditingCell] = useState<{ roomId: string; day: string } | null>(null);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [currentWeekType, setCurrentWeekType] = useState<WeekType>('both');
  const [draggedItem, setDraggedItem] = useState<{ roomId: string; day: string } | null>(null);

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

  const getDepartmentName = (deptId: string) => {
    return departmentOptions.find(opt => opt.id === deptId)?.name || deptId;
  };

  const handleCellEdit = (roomId: string, day: string, deptId: string, weekType: WeekType = 'both') => {
    setScheduleData(prev =>
      prev.map(entry =>
        entry.roomId === roomId
          ? {
              ...entry,
              schedule: {
                ...entry.schedule,
                [day]: { deptId, weekType }
              }
            }
          : entry
      )
    );
    setEditingCell(null);
    setShowDeptModal(false);
  };

  const handleDragStart = (roomId: string, day: string) => {
    setDraggedItem({ roomId, day });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetRoomId: string, targetDay: string) => {
    if (!draggedItem) return;

    const sourceData = scheduleData.find(e => e.roomId === draggedItem.roomId)?.schedule[draggedItem.day];
    if (!sourceData) return;

    // Move from source to target
    setScheduleData(prev =>
      prev.map(entry => {
        if (entry.roomId === draggedItem.roomId) {
          return {
            ...entry,
            schedule: { ...entry.schedule, [draggedItem.day]: { deptId: '', weekType: 'both' } }
          };
        }
        if (entry.roomId === targetRoomId) {
          return {
            ...entry,
            schedule: { ...entry.schedule, [targetDay]: sourceData }
          };
        }
        return entry;
      })
    );

    setDraggedItem(null);
  };

  const shouldShowCell = (cellWeekType: WeekType) => {
    if (currentWeekType === 'both') return true;
    return cellWeekType === 'both' || cellWeekType === currentWeekType;
  };

  return (
    <div className="w-full">
      {/* Header */}
      <header className="flex flex-col items-center lg:items-start justify-between gap-6 mb-8 flex-shrink-0">
        <div>
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <div className="w-4 h-4 text-[#A855F7]">📅</div>
            <p className="text-[10px] font-black text-[#A855F7] tracking-[0.4em] uppercase">TÝDENNÍ OPERAČNÍ PLÁN</p>
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter uppercase leading-none">
            ROZPIS <span className="text-white/20">SÁLŮ</span>
          </h1>
        </div>

        {/* Week Type Selector */}
        <div className="flex gap-3">
          <button
            onClick={() => setCurrentWeekType('odd')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              currentWeekType === 'odd'
                ? 'bg-[#A855F7] text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/15'
            }`}
          >
            Lichý týden
          </button>
          <button
            onClick={() => setCurrentWeekType('both')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              currentWeekType === 'both'
                ? 'bg-[#A855F7] text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/15'
            }`}
          >
            Všechny
          </button>
          <button
            onClick={() => setCurrentWeekType('even')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              currentWeekType === 'even'
                ? 'bg-[#A855F7] text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/15'
            }`}
          >
            Sudý týden
          </button>
        </div>
      </header>

      {/* Schedule Table */}
      <div className="w-full overflow-x-auto">
        <div className="min-w-full">
          <div
            className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-3xl overflow-hidden"
            style={{
              boxShadow: `inset 0 1px 2px rgba(255,255,255,0.3), 0 25px 50px -12px rgba(0,0,0,0.25)`,
            }}
          >
            {/* Table Header */}
            <div
              className="grid gap-px bg-white/5"
              style={{
                gridTemplateColumns: `200px repeat(${DAYS_OF_WEEK.length}, 1fr)`,
              }}
            >
              {/* Room Names Column */}
              <div className="p-4 border-r border-white/10 bg-white/[0.05]">
                <p className="text-xs font-black text-white/60 tracking-widest uppercase">Sál / Oddělení</p>
              </div>

              {/* Days Header */}
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="p-4 text-center border-r border-white/10 bg-white/[0.05]">
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
                    gridTemplateColumns: `200px repeat(${DAYS_OF_WEEK.length}, 1fr)`,
                  }}
                >
                  {/* Room Name Cell */}
                  <div className="p-4 border-r border-white/10 flex items-center gap-3 bg-white/[0.02]">
                    <GripVertical className="w-4 h-4 text-white/30 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                    <div>
                      <p className="text-sm font-bold text-white">{entry.roomName}</p>
                      <p className="text-xs text-white/40">{entry.department}</p>
                    </div>
                  </div>

                  {/* Schedule Cells */}
                  {DAYS_OF_WEEK.map(day => {
                    const cellData = entry.schedule[day];
                    const deptColor = getDepartmentColor(cellData.deptId);
                    const isVisible = shouldShowCell(cellData.weekType);
                    const isDragging = draggedItem?.roomId === entry.roomId && draggedItem?.day === day;

                    return (
                      <button
                        key={`${entry.roomId}-${day}`}
                        draggable
                        onDragStart={() => handleDragStart(entry.roomId, day)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(entry.roomId, day)}
                        onClick={() => {
                          setEditingCell({ roomId: entry.roomId, day });
                          setShowDeptModal(true);
                        }}
                        className={`border-r border-white/10 flex items-center justify-center min-h-20 px-4 py-3 font-bold cursor-pointer hover:bg-white/5 transition-all text-sm w-full ${
                          isDragging ? 'opacity-50' : ''
                        }`}
                        style={{
                          backgroundColor: 'transparent',
                          border: `2px solid ${cellData.deptId ? deptColor : 'rgba(255,255,255,0.1)'}`,
                          color: cellData.deptId ? deptColor : 'rgba(255,255,255,0.3)',
                          opacity: isVisible ? 1 : 0.3,
                          pointerEvents: isVisible ? 'auto' : 'none',
                        }}
                      >
                        <div className="text-center">
                          {cellData.deptId ? (
                            <>
                              <p>{getDepartmentName(cellData.deptId)}</p>
                              {cellData.weekType !== 'both' && (
                                <p className="text-xs opacity-70">{cellData.weekType === 'odd' ? 'Lichý' : 'Sudý'}</p>
                              )}
                            </>
                          ) : (
                            '—'
                          )}
                        </div>
                      </button>
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
          💡 Klikněte na pole pro výběr oddělení. Táhněte pole pro přesunutí operací mezi sály. Zvolte typ týdne pro zobrazení specifických operací.
        </p>
      </div>

      {/* Department Selection Modal */}
      {showDeptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowDeptModal(false)}
        >
          <div
            className="relative rounded-xl w-full max-w-sm mx-4 bg-[#1a1a2e] border border-white/20 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5 flex-shrink-0">
              <h3 className="text-base font-bold text-white">Vyberte oddělení</h3>
              <button onClick={() => setShowDeptModal(false)} className="p-1 rounded hover:bg-white/10">
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>

            {/* Week Type Selector in Modal */}
            <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02] flex gap-2">
              <select
                onChange={(e) => {
                  if (editingCell) {
                    const deptId = scheduleData.find(e => e.roomId === editingCell.roomId)?.schedule[editingCell.day].deptId || '';
                    handleCellEdit(editingCell.roomId, editingCell.day, deptId, e.target.value as WeekType);
                  }
                }}
                className="flex-1 px-3 py-1.5 rounded bg-white/10 border border-white/20 text-white text-xs font-medium"
              >
                <option value="both">Každý týden</option>
                <option value="odd">Lichý týden</option>
                <option value="even">Sudý týden</option>
              </select>
            </div>

            {/* Department List */}
            <div className="overflow-y-auto p-4 space-y-2 flex-1">
              {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map((dept) => (
                <div key={dept.id} className="space-y-1">
                  <button
                    onClick={() => {
                      if (editingCell) {
                        handleCellEdit(editingCell.roomId, editingCell.day, dept.id);
                      }
                    }}
                    className="w-full p-3 rounded-lg border text-left flex items-center gap-2.5 hover:bg-white/5 transition-colors"
                    style={{
                      borderColor: `${dept.accentColor}60`,
                      backgroundColor: `${dept.accentColor}12`,
                    }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dept.accentColor }} />
                    <span className="font-semibold text-white text-sm">{dept.name}</span>
                  </button>

                  {dept.subDepartments.filter(s => s.isActive).map((subDept) => (
                    <button
                      key={subDept.id}
                      onClick={() => {
                        if (editingCell) {
                          handleCellEdit(editingCell.roomId, editingCell.day, subDept.id);
                        }
                      }}
                      className="w-full pl-6 pr-3 py-2.5 rounded-lg border text-left flex items-center gap-2 hover:bg-white/5 transition-colors"
                      style={{
                        borderColor: `${dept.accentColor}30`,
                        backgroundColor: `${dept.accentColor}06`,
                      }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dept.accentColor }} />
                      <span className="font-medium text-white/90 text-xs">{subDept.name}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;
