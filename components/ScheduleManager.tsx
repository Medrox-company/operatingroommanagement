import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Calendar } from 'lucide-react';
import { DEFAULT_DEPARTMENTS } from '../constants';

// --- Types ---
type WeekType = 'even' | 'odd' | 'both';

interface DayEntry {
  deptId: string;
  deptName: string;
  color: string;
  weekType: WeekType;
  note?: string;
  roomName?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  entries: DayEntry[];
}

// --- Helpers ---
function getDaysInMonth(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: CalendarDay[] = [];

  // Leading days from previous month (week starts Monday)
  let startDow = firstDay.getDay(); // 0=Sun
  if (startDow === 0) startDow = 7; // treat Sunday as 7
  for (let i = startDow - 2; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, isCurrentMonth: false, entries: [] });
  }

  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true, entries: [] });
  }

  // Trailing days to fill 6 rows x 7 cols = 42
  while (days.length < 42) {
    const last = days[days.length - 1].date;
    const next = new Date(last);
    next.setDate(last.getDate() + 1);
    days.push({ date: next, isCurrentMonth: false, entries: [] });
  }

  return days;
}

const CZECH_MONTHS = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
];

const DAY_HEADERS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getDeptById(id: string) {
  for (const dept of DEFAULT_DEPARTMENTS) {
    if (dept.id === id) return dept;
    for (const sub of dept.subDepartments) {
      if (sub.id === id) return { ...dept, name: sub.name };
    }
  }
  return null;
}

// Mini calendar for right sidebar
function MiniCalendar({ year, month, today, selectedDate, onSelect }: {
  year: number; month: number; today: Date; selectedDate: Date | null; onSelect: (d: Date) => void;
}) {
  const [viewYear, setViewYear] = useState(year);
  const [viewMonth, setViewMonth] = useState(month);
  const days = getDaysInMonth(viewYear, viewMonth);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-white">{CZECH_MONTHS[viewMonth]} {viewYear}</span>
        <div className="flex gap-1">
          <button
            onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1); } else setViewMonth(v => v - 1); }}
            className="p-1 hover:bg-white/10 rounded"
          >
            <ChevronLeft className="w-3 h-3 text-white/60" />
          </button>
          <button
            onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1); } else setViewMonth(v => v + 1); }}
            className="p-1 hover:bg-white/10 rounded"
          >
            <ChevronRight className="w-3 h-3 text-white/60" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-white/40 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const isToday = day.date.toDateString() === today.toDateString();
          const isSelected = selectedDate && day.date.toDateString() === selectedDate.toDateString();
          return (
            <button
              key={i}
              onClick={() => onSelect(day.date)}
              className={`text-center text-[11px] py-1 rounded-full transition-all
                ${!day.isCurrentMonth ? 'text-white/20' : 'text-white/80 hover:bg-white/10'}
                ${isToday ? 'bg-[#C3E84A] text-black font-bold' : ''}
                ${isSelected && !isToday ? 'bg-white/20 font-bold' : ''}
              `}
            >
              {day.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Main Component ---
const ScheduleManager: React.FC = () => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [weekTypeFilter, setWeekTypeFilter] = useState<WeekType>('both');

  // calendarData: key = "YYYY-MM-DD" -> DayEntry[]
  const [calendarData, setCalendarData] = useState<Record<string, DayEntry[]>>({});

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [modalEditIndex, setModalEditIndex] = useState<number | null>(null);
  const [modalDeptId, setModalDeptId] = useState('');
  const [modalWeekType, setModalWeekType] = useState<WeekType>('both');
  const [modalNote, setModalNote] = useState('');
  const [modalRoom, setModalRoom] = useState('');

  const dateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const days = getDaysInMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const openAdd = (date: Date) => {
    setModalDate(date);
    setModalEditIndex(null);
    setModalDeptId('');
    setModalWeekType('both');
    setModalNote('');
    setModalRoom('');
    setModalOpen(true);
  };

  const openEdit = (date: Date, idx: number, entry: DayEntry) => {
    setModalDate(date);
    setModalEditIndex(idx);
    setModalDeptId(entry.deptId);
    setModalWeekType(entry.weekType);
    setModalNote(entry.note || '');
    setModalRoom(entry.roomName || '');
    setModalOpen(true);
  };

  const saveModal = () => {
    if (!modalDate || !modalDeptId) return;
    const dept = getDeptById(modalDeptId);
    if (!dept) return;
    const entry: DayEntry = {
      deptId: modalDeptId,
      deptName: dept.name,
      color: dept.accentColor,
      weekType: modalWeekType,
      note: modalNote,
      roomName: modalRoom,
    };
    const key = dateKey(modalDate);
    setCalendarData(prev => {
      const existing = prev[key] ? [...prev[key]] : [];
      if (modalEditIndex !== null) {
        existing[modalEditIndex] = entry;
      } else {
        existing.push(entry);
      }
      return { ...prev, [key]: existing };
    });
    setModalOpen(false);
  };

  const deleteEntry = (key: string, idx: number) => {
    setCalendarData(prev => {
      const arr = [...(prev[key] || [])];
      arr.splice(idx, 1);
      return { ...prev, [key]: arr };
    });
    setModalOpen(false);
  };

  const weekNum = getWeekNumber(new Date(viewYear, viewMonth, 15));
  const currentWeekEvenOdd = weekNum % 2 === 0 ? 'even' : 'odd';

  const entriesForDay = (day: CalendarDay): DayEntry[] => {
    const all = calendarData[dateKey(day.date)] || [];
    if (weekTypeFilter === 'both') return all;
    return all.filter(e => e.weekType === 'both' || e.weekType === weekTypeFilter);
  };

  // Stats for sidebar
  const allEntries = Object.values(calendarData).flat();
  const deptCounts: Record<string, number> = {};
  allEntries.forEach(e => { deptCounts[e.deptId] = (deptCounts[e.deptId] || 0) + 1; });
  const topDepts = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="flex h-full w-full bg-[#0f1117] text-white overflow-hidden">
      {/* ===== MAIN AREA ===== */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Calendar className="w-3 h-3 text-[#C3E84A]" />
                <span className="text-[10px] font-bold text-[#C3E84A] tracking-widest uppercase">PLÁNOVÁNÍ</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight leading-none">
                ROZPIS <span className="text-white/25">SÁLŮ</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Week type filter */}
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {(['odd', 'both', 'even'] as WeekType[]).map(wt => (
                <button
                  key={wt}
                  onClick={() => setWeekTypeFilter(wt)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    weekTypeFilter === wt
                      ? 'bg-[#C3E84A] text-black'
                      : 'text-white/50 hover:text-white hover:bg-white/8'
                  }`}
                >
                  {wt === 'odd' ? 'Lichý' : wt === 'even' ? 'Sudý' : 'Vše'}
                </button>
              ))}
            </div>
            <button
              onClick={() => selectedDate && openAdd(selectedDate)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C3E84A] text-black text-sm font-bold hover:bg-[#d4f55c] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nová operace
            </button>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-white/8 flex-shrink-0">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-4 h-4 text-white/70" />
          </button>
          <h2 className="text-xl font-black min-w-[180px]">
            {CZECH_MONTHS[viewMonth]} {viewYear}
          </h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <ChevronRight className="w-4 h-4 text-white/70" />
          </button>
          <span className="text-xs text-white/30 ml-2">
            Týden {weekNum} &mdash; {currentWeekEvenOdd === 'even' ? 'sudý' : 'lichý'}
          </span>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-white/8 flex-shrink-0">
          {DAY_HEADERS.map(d => (
            <div key={d} className="text-center py-2 text-xs font-bold text-white/40 uppercase tracking-widest border-r border-white/8 last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-7 h-full" style={{ minHeight: '480px' }}>
            {days.map((day, i) => {
              const isToday = day.date.toDateString() === today.toDateString();
              const isSelected = selectedDate && day.date.toDateString() === selectedDate.toDateString();
              const entries = entriesForDay(day);
              const key = dateKey(day.date);

              return (
                <div
                  key={i}
                  onClick={() => { setSelectedDate(day.date); }}
                  className={`relative min-h-[100px] border-r border-b border-white/8 last:border-r-0 cursor-pointer transition-colors group
                    ${!day.isCurrentMonth ? 'bg-[#0a0c10]' : 'bg-[#0f1117] hover:bg-white/[0.02]'}
                    ${isSelected && day.isCurrentMonth ? 'ring-1 ring-inset ring-[#C3E84A]/40' : ''}
                  `}
                >
                  {/* Date number */}
                  <div className="flex items-start justify-between p-2">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                        ${isToday ? 'bg-[#C3E84A] text-black' : day.isCurrentMonth ? 'text-white/70' : 'text-white/20'}
                      `}
                    >
                      {day.date.getDate()}
                    </span>
                    {day.isCurrentMonth && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openAdd(day.date); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition-all"
                      >
                        <Plus className="w-3 h-3 text-white/50" />
                      </button>
                    )}
                  </div>

                  {/* Entries */}
                  <div className="px-1 pb-1 space-y-0.5">
                    {entries.slice(0, 2).map((entry, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); openEdit(day.date, idx, entry); }}
                        className="w-full rounded font-black text-sm flex items-center justify-center py-3 transition-all hover:brightness-110 active:scale-95"
                        style={{ backgroundColor: entry.color, color: '#fff' }}
                        title={entry.deptName + (entry.note ? ` — ${entry.note}` : '')}
                      >
                        {entry.deptName.length > 8 ? entry.deptName.substring(0, 8) : entry.deptName}
                      </button>
                    ))}
                    {entries.length > 2 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openAdd(day.date); }}
                        className="w-full text-center text-[10px] text-white/40 hover:text-white/60 py-0.5"
                      >
                        +{entries.length - 2} více
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== RIGHT SIDEBAR ===== */}
      <div className="w-64 flex-shrink-0 border-l border-white/8 flex flex-col overflow-y-auto bg-[#0b0d12]">

        {/* Mini calendar */}
        <div className="p-4 border-b border-white/8">
          <MiniCalendar
            year={viewYear}
            month={viewMonth}
            today={today}
            selectedDate={selectedDate}
            onSelect={(d) => {
              setSelectedDate(d);
              setViewYear(d.getFullYear());
              setViewMonth(d.getMonth());
            }}
          />
        </div>

        {/* Oddělení stats */}
        <div className="p-4 border-b border-white/8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Oddělení</h3>
            <span className="text-xs text-white/30">{allEntries.length} celkem</span>
          </div>
          {topDepts.length === 0 ? (
            <p className="text-xs text-white/30">Žádné záznamy</p>
          ) : (
            <div className="space-y-2">
              {topDepts.map(([deptId, count]) => {
                const dept = getDeptById(deptId);
                if (!dept) return null;
                return (
                  <div key={deptId} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dept.accentColor }} />
                    <span className="text-xs text-white/70 flex-1 truncate">{dept.name}</span>
                    <span className="text-xs font-bold" style={{ color: dept.accentColor }}>{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected day detail */}
        {selectedDate && (
          <div className="p-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">
                {selectedDate.getDate()}. {CZECH_MONTHS[selectedDate.getMonth()]}
              </h3>
              <button
                onClick={() => openAdd(selectedDate)}
                className="text-[10px] text-[#C3E84A] font-bold hover:underline"
              >
                + Přidat
              </button>
            </div>
            {(calendarData[dateKey(selectedDate)] || []).length === 0 ? (
              <p className="text-xs text-white/30">Žádné operace</p>
            ) : (
              <div className="space-y-2">
                {(calendarData[dateKey(selectedDate)] || []).map((entry, idx) => (
                  <button
                    key={idx}
                    onClick={() => openEdit(selectedDate, idx, entry)}
                    className="w-full text-left rounded-lg p-2.5 border transition-colors hover:bg-white/5"
                    style={{ borderColor: `${entry.color}40`, backgroundColor: `${entry.color}12` }}
                  >
                    <p className="text-xs font-bold" style={{ color: entry.color }}>{entry.deptName}</p>
                    {entry.roomName && <p className="text-[10px] text-white/50 mt-0.5">{entry.roomName}</p>}
                    {entry.note && <p className="text-[10px] text-white/40 mt-0.5 truncate">{entry.note}</p>}
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {entry.weekType === 'odd' ? 'Lichý týden' : entry.weekType === 'even' ? 'Sudý týden' : 'Každý týden'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== EDIT / ADD MODAL ===== */}
      {modalOpen && modalDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-[#1a1d27] border border-white/15 rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">
                {modalEditIndex !== null ? 'Upravit operaci' : 'Nová operace'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-4">
              {/* Date display */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-white/50 w-16">Datum</span>
                <span className="text-sm text-white font-medium">
                  {modalDate.getDate()}. {CZECH_MONTHS[modalDate.getMonth()]} {modalDate.getFullYear()}
                </span>
              </div>

              {/* Department */}
              <div className="flex items-start gap-3">
                <span className="text-xs font-semibold text-white/50 w-16 pt-2">Oddělení</span>
                <div className="flex-1 max-h-48 overflow-y-auto space-y-1 pr-1">
                  {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map(dept => (
                    <div key={dept.id}>
                      <button
                        onClick={() => setModalDeptId(dept.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border ${
                          modalDeptId === dept.id ? 'border-current' : 'border-transparent hover:border-white/10'
                        }`}
                        style={{
                          color: dept.accentColor,
                          backgroundColor: modalDeptId === dept.id ? `${dept.accentColor}20` : `${dept.accentColor}08`,
                        }}
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dept.accentColor }} />
                        {dept.name}
                      </button>
                      {dept.subDepartments.filter(s => s.isActive).map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => setModalDeptId(sub.id)}
                          className={`w-full text-left pl-7 pr-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                            modalDeptId === sub.id ? 'border-current' : 'border-transparent hover:border-white/10'
                          }`}
                          style={{
                            color: `${dept.accentColor}cc`,
                            backgroundColor: modalDeptId === sub.id ? `${dept.accentColor}15` : 'transparent',
                          }}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Week type */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-white/50 w-16">Týden</span>
                <div className="flex rounded-lg overflow-hidden border border-white/10 flex-1">
                  {(['both', 'odd', 'even'] as WeekType[]).map(wt => (
                    <button
                      key={wt}
                      onClick={() => setModalWeekType(wt)}
                      className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
                        modalWeekType === wt ? 'bg-[#C3E84A] text-black' : 'text-white/50 hover:text-white hover:bg-white/8'
                      }`}
                    >
                      {wt === 'both' ? 'Každý' : wt === 'odd' ? 'Lichý' : 'Sudý'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Room */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-white/50 w-16">Sál</span>
                <input
                  type="text"
                  value={modalRoom}
                  onChange={e => setModalRoom(e.target.value)}
                  placeholder="např. Sál č. 1"
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-white/25"
                />
              </div>

              {/* Note */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-white/50 w-16">Poznámka</span>
                <input
                  type="text"
                  value={modalNote}
                  onChange={e => setModalNote(e.target.value)}
                  placeholder="Přidat poznámku..."
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-white/25"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-white/10">
              {modalEditIndex !== null ? (
                <button
                  onClick={() => modalDate && deleteEntry(dateKey(modalDate), modalEditIndex)}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold"
                >
                  Smazat
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={saveModal}
                disabled={!modalDeptId}
                className="px-5 py-2 rounded-lg bg-[#C3E84A] text-black text-sm font-bold hover:bg-[#d4f55c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Uložit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;
