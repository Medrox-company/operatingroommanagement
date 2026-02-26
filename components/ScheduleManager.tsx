import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
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

  const shouldShowCell = (cellWeekType: WeekType) => {
    if (currentWeekType === 'both') return true;
    return cellWeekType === 'both' || cellWeekType === currentWeekType;
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Main Container */}
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="px-8 py-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">OPERAČNÍ PLÁN</p>
              <h1 className="text-2xl font-black text-white">Rozpis sálů</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentWeekType('odd')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  currentWeekType === 'odd'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                }`}
              >
                Lichý
              </button>
              <button
                onClick={() => setCurrentWeekType('both')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  currentWeekType === 'both'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                }`}
              >
                Všechny
              </button>
              <button
                onClick={() => setCurrentWeekType('even')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  currentWeekType === 'even'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                }`}
              >
                Sudý
              </button>
            </div>
          </div>
        </header>

        {/* Schedule Grid */}
        <div className="flex-1 overflow-auto px-8 py-6">
          <div className="space-y-4">
            {/* Days Header */}
            <div className="grid gap-3" style={{ gridTemplateColumns: `160px repeat(7, 1fr)` }}>
              <div />
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="text-center">
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">{day.slice(0, 3)}</p>
                </div>
              ))}
            </div>

            {/* Room Rows */}
            {scheduleData.map(entry => (
              <div key={entry.roomId} className="space-y-2">
                <div className="px-4 py-3 rounded-lg bg-white/[0.04] border border-white/10">
                  <p className="text-sm font-bold text-white">{entry.roomName}</p>
                  <p className="text-xs text-white/40">{entry.department}</p>
                </div>

                <div className="grid gap-3" style={{ gridTemplateColumns: `160px repeat(7, 1fr)` }}>
                  <div />
                  {DAYS_OF_WEEK.map(day => {
                    const cellData = entry.schedule[day];
                    const deptColor = getDepartmentColor(cellData.deptId);
                    const isVisible = shouldShowCell(cellData.weekType);

                    return (
                      <button
                        key={`${entry.roomId}-${day}`}
                        onClick={() => {
                          setEditingCell({ roomId: entry.roomId, day });
                          setShowDeptModal(true);
                        }}
                        className="aspect-square rounded-lg border-2 transition-all hover:scale-105 flex items-center justify-center p-2 text-center text-xs font-semibold"
                        style={{
                          backgroundColor: cellData.deptId ? `${deptColor}15` : 'transparent',
                          borderColor: cellData.deptId ? deptColor : 'rgba(255,255,255,0.1)',
                          color: cellData.deptId ? deptColor : 'rgba(255,255,255,0.3)',
                          opacity: isVisible ? 1 : 0.4,
                          pointerEvents: isVisible ? 'auto' : 'none',
                        }}
                      >
                        {cellData.deptId ? getDepartmentName(cellData.deptId) : '—'}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department Selection Modal */}
      {showDeptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
          onClick={() => setShowDeptModal(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-slate-800/50 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Vyberte oddělení</h3>
              <button onClick={() => setShowDeptModal(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>

            {/* Week Type Selector */}
            <div className="px-6 py-3 border-b border-white/10 bg-slate-800/30">
              <select
                onChange={(e) => {
                  if (editingCell) {
                    const deptId = scheduleData.find(entry => entry.roomId === editingCell.roomId)?.schedule[editingCell.day].deptId || '';
                    handleCellEdit(editingCell.roomId, editingCell.day, deptId, e.target.value as WeekType);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium"
              >
                <option value="both">Každý týden</option>
                <option value="odd">Lichý týden</option>
                <option value="even">Sudý týden</option>
              </select>
            </div>

            {/* Department List */}
            <div className="max-h-96 overflow-y-auto p-4 space-y-2">
              {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map((dept) => (
                <div key={dept.id} className="space-y-1">
                  <button
                    onClick={() => {
                      if (editingCell) {
                        handleCellEdit(editingCell.roomId, editingCell.day, dept.id);
                      }
                    }}
                    className="w-full p-3 rounded-lg border transition-all hover:bg-white/5"
                    style={{
                      borderColor: `${dept.accentColor}40`,
                      backgroundColor: `${dept.accentColor}08`,
                    }}
                  >
                    <p className="text-sm font-semibold text-white text-left">{dept.name}</p>
                  </button>

                  {dept.subDepartments.filter(s => s.isActive).map((subDept) => (
                    <button
                      key={subDept.id}
                      onClick={() => {
                        if (editingCell) {
                          handleCellEdit(editingCell.roomId, editingCell.day, subDept.id);
                        }
                      }}
                      className="w-full pl-6 pr-3 py-2 rounded-lg border text-left text-xs transition-all hover:bg-white/5"
                      style={{
                        borderColor: `${dept.accentColor}30`,
                        backgroundColor: `${dept.accentColor}04`,
                      }}
                    >
                      <p className="text-white/80">{subDept.name}</p>
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
