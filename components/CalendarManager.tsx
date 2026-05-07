'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Trash2, X, Check,
  Palette, AlertCircle, Eraser, Undo2, Redo2, Copy, Download,
  Lock, Unlock, Eye, EyeOff, Search, Filter, MoreHorizontal,
  ChevronDown, MousePointer2, PaintBucket,
} from 'lucide-react';

// ─────────────────── Types ───────────────────
interface CellData {
  label: string;
  color: string;
  note?: string;
  locked?: boolean;
}

interface CalendarRow {
  id: string;
  name: string;
  color: string;
  order: number;
  hidden?: boolean;
}

interface SpecialDay {
  day: number;
  label: string;
  color: string;
}

interface HistorySnapshot {
  cells: Record<string, CellData>;
  rows: CalendarRow[];
  specialDays: SpecialDay[];
}

// ─────────────────── Constants ───────────────────
const MONTHS = [
  'Leden','Únor','Březen','Duben','Květen','Červen',
  'Červenec','Srpen','Září','Říjen','Listopad','Prosinec',
];
const DAY_NAMES = ['PO','ÚT','ST','ČT','PÁ','SO','NE'];

const PRESET_COLORS = [
  '#EF4444','#F97316','#EAB308','#84CC16','#22C55E',
  '#14B8A6','#06B6D4','#3B82F6','#6366F1','#8B5CF6',
  '#A855F7','#D946EF','#EC4899','#64748B','#FFFFFF',
];

const QUICK_VALUES: { label: string; color: string; desc: string }[] = [
  { label: 'X',   color: '#EF4444', desc: 'Zavřeno' },
  { label: 'G',   color: '#22C55E', desc: 'Gynekologie' },
  { label: 'CH',  color: '#3B82F6', desc: 'Chirurgie' },
  { label: 'U',   color: '#A855F7', desc: 'Urologie' },
  { label: '7',   color: '#EAB308', desc: 'Sál 7' },
  { label: '10',  color: '#F97316', desc: 'Sál 10' },
  { label: '1',   color: '#06B6D4', desc: 'Sál 1' },
  { label: '4',   color: '#EC4899', desc: 'Sál 4' },
];

const DEFAULT_ROWS: CalendarRow[] = [
  { id: 'tra1',     name: 'TRAUMATOLOGIE 1',   color: '#22C55E', order: 0 },
  { id: 'tra3',     name: 'TRAUMATOLOGIE 3',   color: '#22C55E', order: 1 },
  { id: 'chir1',    name: 'CHIRURGIE',          color: '#EAB308', order: 2 },
  { id: 'chir2',    name: 'CHIRURGIE',          color: '#EAB308', order: 3 },
  { id: 'davinci',  name: 'DaVinci (do 15:30)', color: '#A855F7', order: 4 },
  { id: 'uro',      name: 'UROLOGIE (č. sálu)', color: '#3B82F6', order: 5 },
  { id: 'nch',      name: 'NEUROCHIRURGIE',     color: '#06B6D4', order: 6 },
  { id: 'orto',     name: 'ORTOPEDIE',          color: '#14B8A6', order: 7 },
  { id: 'gyn',      name: 'GYNEKOLOGIE',        color: '#EC4899', order: 8 },
  { id: 'orl',      name: 'ORL / ÚČOCH/OČNÍ',  color: '#F97316', order: 9 },
  { id: 'sanace',   name: 'SANACE V CA',        color: '#EF4444', order: 10 },
  { id: 'akut',     name: 'AKUTNÍ',             color: '#DC2626', order: 11 },
  { id: 'turnov1',  name: 'TURNOV',             color: '#84CC16', order: 12 },
  { id: 'turnov2',  name: 'TURNOV',             color: '#84CC16', order: 13 },
  { id: 'fry1',     name: 'FRÝDLANT',           color: '#8B5CF6', order: 14 },
  { id: 'fry2',     name: 'FRÝDLANT',           color: '#8B5CF6', order: 15 },
  { id: 'aro_lbc',  name: 'ARO LÉKAŘI LBC',    color: '#06B6D4', order: 16 },
  { id: 'aro_fd',   name: 'ARO LÉKAŘI FD',     color: '#14B8A6', order: 17 },
];

// ─────────────────── Helpers ───────────────────
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getDayOfWeek(y: number, m: number, d: number) { return (new Date(y, m, d).getDay() + 6) % 7; }
function isWeekend(y: number, m: number, d: number) { const dw = getDayOfWeek(y, m, d); return dw === 5 || dw === 6; }
function cellKey(rowId: string, day: number) { return `${rowId}:${day}`; }

// ─────────────────── Color Picker ───────────────────
const ColorPicker: React.FC<{ value: string; onChange: (c: string) => void }> = ({ value, onChange }) => (
  <div className="grid grid-cols-5 gap-2">
    {PRESET_COLORS.map(c => (
      <button
        key={c}
        onClick={() => onChange(c)}
        style={{ backgroundColor: c }}
        className={`w-8 h-8 rounded-lg transition-all border-2 ${
          value === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
        }`}
      />
    ))}
  </div>
);

// ─────────────────── Cell Editor Modal ───────────────────
const CellEditorModal: React.FC<{
  cell: CellData | null;
  rowName: string;
  day: number;
  month: string;
  onSave: (data: CellData) => void;
  onDelete: () => void;
  onClose: () => void;
}> = ({ cell, rowName, day, month, onSave, onDelete, onClose }) => {
  const [label, setLabel] = useState(cell?.label || '');
  const [color, setColor] = useState(cell?.color || '#3B82F6');
  const [note,  setNote]  = useState(cell?.note  || '');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-[#13131f] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white">{cell ? 'Upravit buňku' : 'Nová buňka'}</h3>
            <p className="text-sm text-white/40 mt-0.5">{rowName} — {day}. {month}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Quick fill */}
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Rychlé hodnoty</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_VALUES.map(q => (
                <button key={q.label}
                  onClick={() => { setLabel(q.label); setColor(q.color); }}
                  style={{ backgroundColor: q.color }}
                  className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                    label === q.label && color === q.color ? 'ring-2 ring-white scale-105' : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  title={q.desc}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Label */}
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Vlastní text</p>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="např. X, G, CH, DOVOLENÁ..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-yellow-500/50 text-sm"
            />
          </div>

          {/* Color */}
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Barva</p>
            <ColorPicker value={color} onChange={setColor} />
            {/* Preview */}
            <div className="mt-3 flex items-center gap-3">
              <div style={{ backgroundColor: color }} className="w-12 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow">
                {label || '?'}
              </div>
              <span className="text-white/40 text-xs">Náhled buňky</span>
            </div>
          </div>

          {/* Note */}
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Poznámka</p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Volitelná poznámka..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-yellow-500/50 resize-none text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5 pt-4 border-t border-white/10">
          {cell && (
            <button onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-sm">
              <Trash2 className="w-4 h-4" /> Smazat
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors text-sm">
            Zrušit
          </button>
          <button onClick={() => onSave({ label, color, note })} disabled={!label.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 transition-colors text-sm disabled:opacity-40">
            <Check className="w-4 h-4" /> Uložit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─────────────────── Row Editor Modal ───────────────────
const RowEditorModal: React.FC<{
  row: CalendarRow | null;
  onSave: (data: Pick<CalendarRow, 'name' | 'color'>) => void;
  onDelete?: () => void;
  onClose: () => void;
}> = ({ row, onSave, onDelete, onClose }) => {
  const [name,  setName]  = useState(row?.name  || '');
  const [color, setColor] = useState(row?.color || '#3B82F6');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-[#13131f] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">{row ? 'Upravit řádek' : 'Nový řádek'}</h3>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Název oddělení</p>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="např. TRAUMATOLOGIE 1"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-yellow-500/50 text-sm" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Barva řádku</p>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
        <div className="flex gap-3 mt-5 pt-4 border-t border-white/10">
          {row && onDelete && (
            <button onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-sm">
              <Trash2 className="w-4 h-4" /> Smazat
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors text-sm">Zrušit</button>
          <button onClick={() => onSave({ name, color })} disabled={!name.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 transition-colors text-sm disabled:opacity-40">
            <Check className="w-4 h-4" /> Uložit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─────────────────── Special Day Modal ───────────────────
const SpecialDayModal: React.FC<{
  day: number; month: string; existing?: SpecialDay;
  onSave: (s: SpecialDay) => void;
  onDelete?: () => void;
  onClose: () => void;
}> = ({ day, month, existing, onSave, onDelete, onClose }) => {
  const [label, setLabel] = useState(existing?.label || '');
  const [color, setColor] = useState(existing?.color || '#EAB308');
  const presets = ['STÁTNÍ SVÁTEK', 'ASANAČNÍ DEN', 'CELOZÁVODNÍ DOVOLENÁ', 'UZAVŘENO', 'ŠKOLENÍ'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-[#13131f] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white">{existing ? 'Upravit speciální den' : 'Označit den'}</h3>
            <p className="text-sm text-white/40 mt-0.5">{day}. {month}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button key={p} onClick={() => setLabel(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  label === p ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/40' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                }`}>
                {p}
              </button>
            ))}
          </div>
          <input type="text" value={label} onChange={e => setLabel(e.target.value)}
            placeholder="Vlastní název..."
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-yellow-500/50 text-sm" />
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Barva sloupce</p>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
        <div className="flex gap-3 mt-5 pt-4 border-t border-white/10">
          {existing && onDelete && (
            <button onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-sm">
              <Trash2 className="w-4 h-4" /> Smazat
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors text-sm">Zrušit</button>
          <button onClick={() => onSave({ day, label, color })} disabled={!label.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 transition-colors text-sm disabled:opacity-40">
            <Check className="w-4 h-4" /> Uložit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─────────────────── Main Component ───────────────────
type ToolMode = 'select' | 'fill' | 'erase' | 'drag-fill';

const CalendarManager: React.FC = () => {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [rows,  setRows]  = useState<CalendarRow[]>(DEFAULT_ROWS);
  const [cells, setCells] = useState<Record<string, CellData>>({});
  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);

  // Tool
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [brush, setBrush] = useState<{ label: string; color: string }>(QUICK_VALUES[0]);

  // Drag-fill state: tracks the source cell being dragged FROM
  const [dragFillSource, setDragFillSource] = useState<CellData | null>(null);
  const [isDragging,     setIsDragging]     = useState(false);
  const [dragStart,      setDragStart]      = useState<{ rowId: string; rowIndex: number; day: number } | null>(null);
  const [dragCurrent,    setDragCurrent]    = useState<{ rowIndex: number; day: number } | null>(null);

  // Selection (for apply-to-many)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // History
  const historyRef = useRef<HistorySnapshot[]>([]);
  const histIdxRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Modals
  const [editCell,       setEditCell]       = useState<{ rowId: string; day: number } | null>(null);
  const [editRow,        setEditRow]        = useState<CalendarRow | null | 'new'>(null);
  const [editSpecialDay, setEditSpecialDay] = useState<{ day: number } | null>(null);

  // Search / filter
  const [search,      setSearch]      = useState('');
  const [showHidden,  setShowHidden]  = useState(false);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; rowId: string; day: number } | null>(null);

  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const monthName   = MONTHS[month];

  const sortedRows = useMemo(() =>
    [...rows]
      .filter(r => showHidden || !r.hidden)
      .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.order - b.order),
    [rows, showHidden, search]
  );

  // ── History helpers ──
  const snapshot = useCallback((): HistorySnapshot => ({
    cells: { ...cells },
    rows:  rows.map(r => ({ ...r })),
    specialDays: specialDays.map(s => ({ ...s })),
  }), [cells, rows, specialDays]);

  const pushHistory = useCallback(() => {
    const snap = snapshot();
    historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1);
    historyRef.current.push(snap);
    histIdxRef.current = historyRef.current.length - 1;
    setCanUndo(histIdxRef.current > 0);
    setCanRedo(false);
  }, [snapshot]);

  const undo = useCallback(() => {
    if (histIdxRef.current <= 0) return;
    histIdxRef.current--;
    const s = historyRef.current[histIdxRef.current];
    setCells(s.cells);
    setRows(s.rows);
    setSpecialDays(s.specialDays);
    setCanUndo(histIdxRef.current > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    if (histIdxRef.current >= historyRef.current.length - 1) return;
    histIdxRef.current++;
    const s = historyRef.current[histIdxRef.current];
    setCells(s.cells);
    setRows(s.rows);
    setSpecialDays(s.specialDays);
    setCanUndo(true);
    setCanRedo(histIdxRef.current < historyRef.current.length - 1);
  }, []);

  // Push initial snapshot
  useEffect(() => { pushHistory(); }, []); // eslint-disable-line

  // ── Drag range computation ──
  const dragRangeKeys = useMemo((): Set<string> => {
    if (!isDragging || !dragStart || !dragCurrent) return new Set();
    const minRow = Math.min(
      sortedRows.findIndex(r => r.id === dragStart.rowId),
      dragCurrent.rowIndex
    );
    const maxRow = Math.max(
      sortedRows.findIndex(r => r.id === dragStart.rowId),
      dragCurrent.rowIndex
    );
    const minDay = Math.min(dragStart.day, dragCurrent.day);
    const maxDay = Math.max(dragStart.day, dragCurrent.day);
    const keys = new Set<string>();
    for (let ri = minRow; ri <= maxRow; ri++) {
      for (let d = minDay; d <= maxDay; d++) {
        keys.add(cellKey(sortedRows[ri]?.id ?? '', d));
      }
    }
    return keys;
  }, [isDragging, dragStart, dragCurrent, sortedRows]);

  // ── Mouse events ──
  const handleCellMouseDown = useCallback((e: React.MouseEvent, rowId: string, rowIndex: number, day: number) => {
    e.preventDefault();
    const key  = cellKey(rowId, day);
    const data = cells[key] ?? null;

    if (e.button === 2) {
      // Right-click context menu
      setCtxMenu({ x: e.clientX, y: e.clientY, rowId, day });
      return;
    }

    if (toolMode === 'erase') {
      pushHistory();
      setCells(prev => { const n = { ...prev }; delete n[key]; return n; });
      setIsDragging(true);
      setDragStart({ rowId, rowIndex, day });
      setDragCurrent({ rowIndex, day });
      return;
    }

    if (toolMode === 'fill') {
      pushHistory();
      setCells(prev => ({ ...prev, [key]: { label: brush.label, color: brush.color } }));
      setIsDragging(true);
      setDragStart({ rowId, rowIndex, day });
      setDragCurrent({ rowIndex, day });
      return;
    }

    if (toolMode === 'drag-fill') {
      // Drag-fill: if source cell has data, start filling; else start from scratch with last brush
      const src = data ?? { label: brush.label, color: brush.color };
      setDragFillSource(src);
      pushHistory();
      setCells(prev => ({ ...prev, [key]: src }));
      setIsDragging(true);
      setDragStart({ rowId, rowIndex, day });
      setDragCurrent({ rowIndex, day });
      return;
    }

    // select mode
    setIsDragging(true);
    setDragStart({ rowId, rowIndex, day });
    setDragCurrent({ rowIndex, day });
    setSelectedKeys(new Set([key]));
  }, [toolMode, cells, brush, pushHistory]);

  const handleCellMouseEnter = useCallback((rowId: string, rowIndex: number, day: number) => {
    if (!isDragging || !dragStart) return;
    setDragCurrent({ rowIndex, day });

    const key = cellKey(rowId, day);

    if (toolMode === 'fill') {
      setCells(prev => ({ ...prev, [key]: { label: brush.label, color: brush.color } }));
    } else if (toolMode === 'erase') {
      setCells(prev => { const n = { ...prev }; delete n[key]; return n; });
    } else if (toolMode === 'drag-fill' && dragFillSource) {
      setCells(prev => ({ ...prev, [key]: { ...dragFillSource } }));
    }
  }, [isDragging, dragStart, toolMode, brush, dragFillSource]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && toolMode === 'select') {
      setSelectedKeys(dragRangeKeys);
    }
    setIsDragging(false);
    setDragFillSource(null);
  }, [isDragging, toolMode, dragRangeKeys]);

  useEffect(() => {
    const up = () => handleMouseUp();
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [handleMouseUp]);

  // Close context menu on click outside
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [ctxMenu]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'Delete' && selectedKeys.size > 0) {
        pushHistory();
        setCells(prev => {
          const n = { ...prev };
          selectedKeys.forEach(k => delete n[k]);
          return n;
        });
        setSelectedKeys(new Set());
      }
      if (e.key === 'Escape') { setSelectedKeys(new Set()); setCtxMenu(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, selectedKeys, pushHistory]);

  // ── Apply to selection ──
  const applyToSelection = useCallback((label: string, color: string) => {
    if (!selectedKeys.size) return;
    pushHistory();
    setCells(prev => {
      const n = { ...prev };
      selectedKeys.forEach(k => { n[k] = { label, color }; });
      return n;
    });
    setSelectedKeys(new Set());
  }, [selectedKeys, pushHistory]);

  const clearSelection = useCallback(() => {
    if (!selectedKeys.size) return;
    pushHistory();
    setCells(prev => {
      const n = { ...prev };
      selectedKeys.forEach(k => delete n[k]);
      return n;
    });
    setSelectedKeys(new Set());
  }, [selectedKeys, pushHistory]);

  // Copy row to clipboard
  const copyRow = useCallback((rowId: string) => {
    const rowCells: Record<number, CellData> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const k = cellKey(rowId, d);
      if (cells[k]) rowCells[d] = cells[k];
    }
    (window as typeof window & { _copiedRow?: typeof rowCells })._copiedRow = rowCells;
  }, [cells, daysInMonth]);

  const pasteRow = useCallback((targetRowId: string) => {
    const src = (window as typeof window & { _copiedRow?: Record<number, CellData> })._copiedRow;
    if (!src) return;
    pushHistory();
    setCells(prev => {
      const n = { ...prev };
      Object.entries(src).forEach(([d, data]) => {
        n[cellKey(targetRowId, Number(d))] = { ...data };
      });
      return n;
    });
  }, [pushHistory]);

  // Clear entire row
  const clearRow = useCallback((rowId: string) => {
    pushHistory();
    setCells(prev => {
      const n = { ...prev };
      for (let d = 1; d <= daysInMonth; d++) delete n[cellKey(rowId, d)];
      return n;
    });
  }, [pushHistory, daysInMonth]);

  // Clear entire month
  const clearMonth = useCallback(() => {
    pushHistory();
    setCells(prev => {
      const n = { ...prev };
      rows.forEach(r => {
        for (let d = 1; d <= daysInMonth; d++) delete n[cellKey(r.id, d)];
      });
      return n;
    });
  }, [pushHistory, rows, daysInMonth]);

  // Fill weekdays of a row
  const fillWeekdays = useCallback((rowId: string) => {
    pushHistory();
    setCells(prev => {
      const n = { ...prev };
      for (let d = 1; d <= daysInMonth; d++) {
        if (!isWeekend(year, month, d)) {
          const k = cellKey(rowId, d);
          if (!n[k]) n[k] = { label: brush.label, color: brush.color };
        }
      }
      return n;
    });
  }, [pushHistory, daysInMonth, year, month, brush]);

  // Export as CSV
  const exportCSV = useCallback(() => {
    const header = ['Oddělení', ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1))].join(';');
    const rowLines = rows.map(r =>
      [r.name, ...Array.from({ length: daysInMonth }, (_, i) => cells[cellKey(r.id, i + 1)]?.label ?? '')].join(';')
    );
    const csv = [header, ...rowLines].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kalendar-${monthName}-${year}.csv`;
    a.click();
  }, [cells, rows, daysInMonth, monthName, year]);

  // ── Drag range highlight ──
  const isInDragRange = (key: string) => dragRangeKeys.has(key);
  const isSelected    = (key: string) => selectedKeys.has(key);

  // ── Navigation ──
  const prevMonth = () => month === 0  ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1);
  const nextMonth = () => month === 11 ? (setMonth(0),  setYear(y => y + 1)) : setMonth(m => m + 1);

  // ── Cursor style per tool ──
  const cursors: Record<ToolMode, string> = {
    select:    'cursor-default',
    fill:      'cursor-crosshair',
    erase:     'cursor-cell',
    'drag-fill': 'cursor-copy',
  };

  return (
    <div className="w-full select-none" onContextMenu={e => e.preventDefault()}>

      {/* ── Header ── */}
      <motion.header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <div className="flex items-center gap-3 mb-2 opacity-60">
            <Calendar className="w-4 h-4 text-yellow-400" />
            <p className="text-[10px] font-bold text-yellow-400 tracking-[0.4em] uppercase">SPRÁVA KALENDÁŘE</p>
          </div>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold tracking-tight uppercase leading-none">
            KALENDÁŘ <span className="text-white/20">UDÁLOSTÍ</span>
          </h1>
        </div>

        {/* Month nav */}
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center min-w-[160px]">
            <div className="text-2xl font-bold text-white">{monthName}</div>
            <div className="text-sm text-white/40">{year}</div>
          </div>
          <button onClick={nextMonth} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </motion.header>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 mb-5 p-3 rounded-2xl bg-white/[0.02] border border-white/10">

        {/* Tool group */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/20 border border-white/5">
          {([
            { mode: 'select'    as ToolMode, icon: <MousePointer2 className="w-4 h-4" />, title: 'Výběr — tažením vyberete oblast' },
            { mode: 'fill'      as ToolMode, icon: <PaintBucket   className="w-4 h-4" />, title: 'Štětec — tažením malujete' },
            { mode: 'drag-fill' as ToolMode, icon: <Copy          className="w-4 h-4" />, title: 'Přetáhni hodnotu — tažením z buňky zkopíruje její obsah' },
            { mode: 'erase'     as ToolMode, icon: <Eraser        className="w-4 h-4" />, title: 'Guma — tažením mažete' },
          ]).map(t => (
            <button key={t.mode} title={t.title} onClick={() => setToolMode(t.mode)}
              className={`p-2.5 rounded-lg transition-all ${
                toolMode === t.mode ? 'bg-yellow-500/20 text-yellow-400' : 'text-white/40 hover:text-white hover:bg-white/10'
              }`}>
              {t.icon}
            </button>
          ))}
        </div>

        {/* Brush picker — shown for fill & drag-fill */}
        {(toolMode === 'fill' || toolMode === 'drag-fill') && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-white/40 uppercase tracking-widest">Štětec</span>
            <div className="flex gap-1.5 flex-wrap">
              {QUICK_VALUES.map(q => (
                <button key={q.label}
                  onClick={() => setBrush({ label: q.label, color: q.color })}
                  style={{ backgroundColor: q.color }}
                  title={q.desc}
                  className={`w-7 h-7 rounded-lg font-bold text-[11px] transition-all ${
                    brush.label === q.label && brush.color === q.color
                      ? 'ring-2 ring-white scale-110'
                      : 'opacity-70 hover:opacity-100 hover:scale-105'
                  }`}>
                  {q.label}
                </button>
              ))}
            </div>
            {/* Custom color for brush */}
            <input
              type="text"
              value={brush.label}
              onChange={e => setBrush(b => ({ ...b, label: e.target.value }))}
              placeholder="text"
              className="w-14 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-yellow-500/50"
            />
          </div>
        )}

        {/* Selection actions */}
        {toolMode === 'select' && selectedKeys.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
            <span className="text-xs text-yellow-400 font-medium">{selectedKeys.size}×</span>
            {QUICK_VALUES.slice(0, 6).map(q => (
              <button key={q.label}
                onClick={() => applyToSelection(q.label, q.color)}
                style={{ backgroundColor: q.color }}
                className="w-7 h-7 rounded-lg font-bold text-[11px] hover:scale-110 transition-all">
                {q.label}
              </button>
            ))}
            <button onClick={clearSelection}
              className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors" title="Smazat vybrané">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setSelectedKeys(new Set())}
              className="p-1.5 rounded-lg bg-white/10 text-white/50 hover:bg-white/20 hover:text-white transition-colors" title="Zrušit výběr">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
          <Search className="w-4 h-4 text-white/30" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Hledat řádek..."
            className="w-28 bg-transparent text-white text-xs placeholder-white/30 focus:outline-none" />
        </div>

        {/* Toggle hidden */}
        <button onClick={() => setShowHidden(v => !v)}
          className={`p-2.5 rounded-xl transition-all ${showHidden ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
          title={showHidden ? 'Skrýt skryté řádky' : 'Zobrazit skryté řádky'}>
          {showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <button onClick={undo} disabled={!canUndo}
            className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all" title="Zpět (Ctrl+Z)">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={redo} disabled={!canRedo}
            className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all" title="Vpřed (Ctrl+Y)">
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Export */}
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors text-xs font-medium"
          title="Export do CSV">
          <Download className="w-4 h-4" />
          Export
        </button>

        {/* Clear month */}
        <button onClick={() => { if (confirm('Smazat celý měsíc?')) clearMonth(); }}
          className="p-2.5 rounded-xl bg-white/5 text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Smazat celý měsíc">
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Add row */}
        <button onClick={() => setEditRow('new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> Řádek
        </button>
      </div>

      {/* ── Info bar ── */}
      <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-white/40">
        <AlertCircle className="w-4 h-4 text-blue-400/60 shrink-0" />
        {toolMode === 'select'    && <span><strong className="text-white/70">Výběr:</strong> Tažením vyberete oblast buněk a aplikujete hodnotu. Delete = smazat. Dvojklik = detail.</span>}
        {toolMode === 'fill'      && <span><strong className="text-yellow-400">Štětec:</strong> Tažením malujete zvolenou hodnotou do buněk.</span>}
        {toolMode === 'drag-fill' && <span><strong className="text-yellow-400">Přetáhni hodnotu:</strong> Tažením z vyplněné buňky zkopíruje její obsah do všech buněk které přetáhnete. Funguje do všech směrů.</span>}
        {toolMode === 'erase'     && <span><strong className="text-red-400">Guma:</strong> Tažením mažete obsah buněk. Pravý klik = kontextové menu.</span>}
        <span className="ml-auto opacity-60">Klikněte na záhlaví dne = svátek • Klikněte na název řádku = upravit • Pravý klik na buňku = menu</span>
      </div>

      {/* ── Table ── */}
      <div className={`overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] ${cursors[toolMode]}`}>
        <table className="border-collapse min-w-[1200px] w-full">
          <thead>
            <tr>
              {/* Month label */}
              <th className="sticky left-0 z-20 bg-[#0d0d18] p-3 text-left border-b border-r border-white/10 min-w-[180px]">
                <span className="font-black text-yellow-400 uppercase text-sm tracking-wider">{monthName.toUpperCase()}</span>
              </th>
              {/* Day headers */}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                const dow  = getDayOfWeek(year, month, d);
                const wknd = isWeekend(year, month, d);
                const sp   = specialDays.find(s => s.day === d);
                return (
                  <th key={d}
                    onClick={() => setEditSpecialDay({ day: d })}
                    style={sp ? { backgroundColor: `${sp.color}25` } : undefined}
                    className={`p-0.5 border-b border-r border-white/10 cursor-pointer hover:bg-white/10 transition-colors min-w-[34px] text-center ${wknd ? 'bg-white/[0.025]' : ''}`}>
                    <div className="text-[9px] text-white/30 font-medium">{DAY_NAMES[dow]}</div>
                    <div className={`text-[13px] font-bold ${wknd ? 'text-white/30' : 'text-white/60'}`}>{d}</div>
                    {sp && (
                      <div className="overflow-hidden" style={{ height: 56 }}>
                        <div className="text-[8px] font-bold"
                          style={{
                            color: sp.color,
                            writingMode: 'vertical-rl',
                            textOrientation: 'mixed',
                            transform: 'rotate(180deg)',
                            lineHeight: 1,
                          }}>
                          {sp.label}
                        </div>
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIndex) => (
              <tr key={row.id}
                className={`group transition-all ${row.hidden ? 'opacity-40' : ''}`}>
                {/* Row header */}
                <td className="sticky left-0 z-10 bg-[#0d0d18] border-b border-r border-white/10 min-w-[180px]">
                  <div className="flex items-center justify-between pr-2">
                    <button
                      onClick={() => setEditRow(row)}
                      className="flex items-center gap-2 px-3 py-2.5 w-full hover:bg-white/5 transition-colors text-left">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                      <span className="text-xs font-bold text-white/80 truncate">{row.name}</span>
                    </button>
                    {/* Row actions */}
                    <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                      <button onClick={() => copyRow(row.id)}
                        className="p-1 rounded text-white/30 hover:text-white hover:bg-white/10 transition-colors" title="Kopírovat řádek">
                        <Copy className="w-3 h-3" />
                      </button>
                      <button onClick={() => pasteRow(row.id)}
                        className="p-1 rounded text-white/30 hover:text-white hover:bg-white/10 transition-colors" title="Vložit řádek">
                        <Download className="w-3 h-3" />
                      </button>
                      <button onClick={() => fillWeekdays(row.id)}
                        className="p-1 rounded text-white/30 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors" title="Vyplnit pracovní dny">
                        <Filter className="w-3 h-3" />
                      </button>
                      <button onClick={() => clearRow(row.id)}
                        className="p-1 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Smazat řádek">
                        <Eraser className="w-3 h-3" />
                      </button>
                      <button onClick={() => {
                        setRows(prev => prev.map(r => r.id === row.id ? { ...r, hidden: !r.hidden } : r));
                      }}
                        className="p-1 rounded text-white/30 hover:text-white hover:bg-white/10 transition-colors" title="Skrýt/zobrazit">
                        {row.hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </td>
                {/* Day cells */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                  const key   = cellKey(row.id, d);
                  const data  = cells[key];
                  const wknd  = isWeekend(year, month, d);
                  const sp    = specialDays.find(s => s.day === d);
                  const inDrag = isInDragRange(key) && isDragging && toolMode === 'select';
                  const sel    = isSelected(key);

                  return (
                    <td key={d}
                      onMouseDown={e => handleCellMouseDown(e, row.id, rowIndex, d)}
                      onMouseEnter={() => handleCellMouseEnter(row.id, rowIndex, d)}
                      onDoubleClick={() => {
                        if (toolMode === 'select') setEditCell({ rowId: row.id, day: d });
                      }}
                      onContextMenu={e => {
                        e.preventDefault();
                        setCtxMenu({ x: e.clientX, y: e.clientY, rowId: row.id, day: d });
                      }}
                      style={sp && !data ? { backgroundColor: `${sp.color}10` } : undefined}
                      className={`p-0.5 border-b border-r border-white/5 transition-all ${
                        wknd ? 'bg-white/[0.015]' : ''
                      } ${sel || inDrag ? 'ring-2 ring-inset ring-yellow-400/80' : ''}`}>
                      {data ? (
                        <div
                          style={{ backgroundColor: data.color }}
                          title={data.note ? `${data.label}\n${data.note}` : data.label}
                          className="w-full h-7 rounded flex items-center justify-center font-bold text-[11px] text-white shadow-sm transition-transform hover:scale-105 relative">
                          {data.label}
                          {data.note && (
                            <span className="absolute top-0 right-0.5 w-1.5 h-1.5 rounded-full bg-white/60" />
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-7 rounded hover:bg-white/5 transition-colors" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Stats bar ── */}
      <div className="mt-4 flex flex-wrap items-center gap-4 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-white/40">
        <span>Řádků: <strong className="text-white/70">{sortedRows.length}</strong></span>
        <span>Buněk vyplněno: <strong className="text-white/70">{Object.keys(cells).length}</strong></span>
        <span>Speciálních dnů: <strong className="text-white/70">{specialDays.length}</strong></span>
        <div className="flex-1" />
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {QUICK_VALUES.map(q => (
            <div key={q.label} className="flex items-center gap-1.5">
              <div style={{ backgroundColor: q.color }} className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] text-white">{q.label}</div>
              <span>{q.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Context Menu ── */}
      <AnimatePresence>
        {ctxMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            style={{ top: ctxMenu.y, left: ctxMenu.x }}
            className="fixed z-50 bg-[#13131f] border border-white/10 rounded-xl shadow-2xl p-1 min-w-[180px]"
            onClick={e => e.stopPropagation()}>
            {([
              { label: 'Upravit buňku',        icon: <Palette className="w-3.5 h-3.5" />,  action: () => { setEditCell({ rowId: ctxMenu.rowId, day: ctxMenu.day }); setCtxMenu(null); } },
              { label: 'Smazat buňku',          icon: <Trash2 className="w-3.5 h-3.5" />,   action: () => { pushHistory(); setCells(p => { const n = {...p}; delete n[cellKey(ctxMenu.rowId, ctxMenu.day)]; return n; }); setCtxMenu(null); } },
              { label: 'Nastavit jako štětec',  icon: <PaintBucket className="w-3.5 h-3.5" />, action: () => { const d = cells[cellKey(ctxMenu.rowId, ctxMenu.day)]; if (d) { setBrush({ label: d.label, color: d.color }); setToolMode('fill'); } setCtxMenu(null); } },
              { label: 'Kopírovat řádek',       icon: <Copy className="w-3.5 h-3.5" />,    action: () => { copyRow(ctxMenu.rowId); setCtxMenu(null); } },
              { label: 'Vložit do řádku',       icon: <Download className="w-3.5 h-3.5" />, action: () => { pasteRow(ctxMenu.rowId); setCtxMenu(null); } },
              { label: 'Smazat celý řádek',     icon: <Eraser className="w-3.5 h-3.5" />,  action: () => { clearRow(ctxMenu.rowId); setCtxMenu(null); } },
            ]).map(item => (
              <button key={item.label} onClick={item.action}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                <span className="text-white/40">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modals ── */}
      <AnimatePresence>
        {editCell && (
          <CellEditorModal
            cell={cells[cellKey(editCell.rowId, editCell.day)] ?? null}
            rowName={rows.find(r => r.id === editCell.rowId)?.name ?? ''}
            day={editCell.day}
            month={monthName}
            onSave={data => {
              pushHistory();
              setCells(p => ({ ...p, [cellKey(editCell.rowId, editCell.day)]: data }));
              setEditCell(null);
            }}
            onDelete={() => {
              pushHistory();
              setCells(p => { const n = {...p}; delete n[cellKey(editCell.rowId, editCell.day)]; return n; });
              setEditCell(null);
            }}
            onClose={() => setEditCell(null)}
          />
        )}

        {editRow && (
          <RowEditorModal
            row={editRow === 'new' ? null : editRow}
            onSave={data => {
              pushHistory();
              if (editRow === 'new') {
                setRows(p => [...p, { id: crypto.randomUUID(), ...data, order: p.length }]);
              } else {
                setRows(p => p.map(r => r.id === editRow.id ? { ...r, ...data } : r));
              }
              setEditRow(null);
            }}
            onDelete={editRow !== 'new' ? () => {
              pushHistory();
              setRows(p => p.filter(r => r.id !== (editRow as CalendarRow).id));
              setCells(p => {
                const n = {...p};
                for (let d = 1; d <= daysInMonth; d++) delete n[cellKey((editRow as CalendarRow).id, d)];
                return n;
              });
              setEditRow(null);
            } : undefined}
            onClose={() => setEditRow(null)}
          />
        )}

        {editSpecialDay && (
          <SpecialDayModal
            day={editSpecialDay.day}
            month={monthName}
            existing={specialDays.find(s => s.day === editSpecialDay.day)}
            onSave={s => {
              pushHistory();
              setSpecialDays(p => {
                const idx = p.findIndex(x => x.day === s.day);
                return idx >= 0 ? p.map((x, i) => i === idx ? s : x) : [...p, s];
              });
              setEditSpecialDay(null);
            }}
            onDelete={() => {
              pushHistory();
              setSpecialDays(p => p.filter(s => s.day !== editSpecialDay.day));
              setEditSpecialDay(null);
            }}
            onClose={() => setEditSpecialDay(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarManager;
