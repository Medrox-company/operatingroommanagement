'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Settings,
  Download,
  Upload,
  Palette,
  AlertCircle,
  GripVertical,
  Copy,
  MoreHorizontal,
  Maximize2,
  Grid3X3,
  Move,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  MousePointer2,
  Square,
  Eraser,
  Undo2,
  Redo2,
  Save,
  FileDown,
  Printer,
} from 'lucide-react';

// Types
interface CalendarEvent {
  id: string;
  rowId: string;
  day: number;
  label: string;
  color: string;
  note?: string;
}

interface CalendarRow {
  id: string;
  name: string;
  color: string;
  order: number;
}

interface HistoryState {
  events: CalendarEvent[];
  rows: CalendarRow[];
  specialDays: SpecialDay[];
}

interface SpecialDay {
  day: number;
  label: string;
  color: string;
}

// Predefined colors
const PRESET_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#64748B', // Slate
  '#FFFFFF', // White
];

// Quick fill options
const QUICK_FILL_OPTIONS = [
  { label: 'X', color: '#EF4444' },
  { label: 'G', color: '#22C55E' },
  { label: 'CH', color: '#3B82F6' },
  { label: 'U', color: '#A855F7' },
  { label: '7', color: '#EAB308' },
  { label: '10', color: '#F97316' },
  { label: '1', color: '#06B6D4' },
  { label: '4', color: '#EC4899' },
];

// Month names
const MONTHS = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
];

const DAY_NAMES = ['PO', 'ÚT', 'ST', 'ČT', 'PÁ', 'SO', 'NE'];

// Get days in month
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Get day of week (0 = Monday, 6 = Sunday)
function getDayOfWeek(year: number, month: number, day: number): number {
  const date = new Date(year, month, day);
  return (date.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
}

// Check if day is weekend
function isWeekend(year: number, month: number, day: number): boolean {
  const dayOfWeek = getDayOfWeek(year, month, day);
  return dayOfWeek === 5 || dayOfWeek === 6; // Saturday or Sunday
}

// Default rows for hospital calendar
const DEFAULT_ROWS: CalendarRow[] = [
  { id: 'tra1', name: 'TRAUMATOLOGIE 1', color: '#22C55E', order: 0 },
  { id: 'tra3', name: 'TRAUMATOLOGIE 3', color: '#22C55E', order: 1 },
  { id: 'chir1', name: 'CHIRURGIE', color: '#EAB308', order: 2 },
  { id: 'chir2', name: 'CHIRURGIE', color: '#EAB308', order: 3 },
  { id: 'davinci', name: 'DaVinci (do 15:30)', color: '#A855F7', order: 4 },
  { id: 'uro', name: 'UROLOGIE (č. sálu)', color: '#3B82F6', order: 5 },
  { id: 'nch', name: 'NEUROCHIRURGIE', color: '#06B6D4', order: 6 },
  { id: 'orto', name: 'ORTOPEDIE', color: '#14B8A6', order: 7 },
  { id: 'gyn', name: 'GYNEKOLOGIE', color: '#EC4899', order: 8 },
  { id: 'orl', name: 'ORL / ÚČOCH/OČNÍ', color: '#F97316', order: 9 },
  { id: 'sanace', name: 'SANACE V CA', color: '#EF4444', order: 10 },
  { id: 'akut', name: 'AKUTNÍ', color: '#DC2626', order: 11 },
  { id: 'turnov1', name: 'TURNOV', color: '#84CC16', order: 12 },
  { id: 'turnov2', name: 'TURNOV', color: '#84CC16', order: 13 },
  { id: 'frydlant1', name: 'FRÝDLANT', color: '#8B5CF6', order: 14 },
  { id: 'frydlant2', name: 'FRÝDLANT', color: '#8B5CF6', order: 15 },
  { id: 'aro_lbc', name: 'ARO LÉKAŘI LBC', color: '#06B6D4', order: 16 },
  { id: 'aro_fd', name: 'ARO LÉKAŘI FD', color: '#14B8A6', order: 17 },
];

// Color picker component
const ColorPicker: React.FC<{
  selectedColor: string;
  onSelect: (color: string) => void;
}> = ({ selectedColor, onSelect }) => (
  <div className="grid grid-cols-5 gap-2">
    {PRESET_COLORS.map((color) => (
      <button
        key={color}
        onClick={() => onSelect(color)}
        className={`w-8 h-8 rounded-lg transition-all ${
          selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : 'hover:scale-105'
        }`}
        style={{ backgroundColor: color }}
      />
    ))}
  </div>
);

// Event cell editor modal
const EventEditorModal: React.FC<{
  event: CalendarEvent | null;
  rowName: string;
  day: number;
  month: string;
  onSave: (event: Omit<CalendarEvent, 'id' | 'rowId' | 'day'>) => void;
  onDelete: () => void;
  onClose: () => void;
}> = ({ event, rowName, day, month, onSave, onDelete, onClose }) => {
  const [label, setLabel] = useState(event?.label || '');
  const [color, setColor] = useState(event?.color || '#3B82F6');
  const [note, setNote] = useState(event?.note || '');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">
              {event ? 'Upravit událost' : 'Nová událost'}
            </h3>
            <p className="text-sm text-white/50 mt-1">
              {rowName} - {day}. {month}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Quick Fill */}
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
              Rychlé vyplnění
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_FILL_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => { setLabel(opt.label); setColor(opt.color); }}
                  className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                    label === opt.label && color === opt.color
                      ? 'ring-2 ring-white/50 scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: opt.color }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
              Text / Označení
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="např. X, G, CH, 7, 10..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/50"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-3">
              Barva
            </label>
            <ColorPicker selectedColor={color} onSelect={setColor} />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
              Poznámka
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Volitelná poznámka (např. CELOZÁVODNÍ DOVOLENÁ)..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/50 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
          {event && (
            <button
              onClick={onDelete}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4 inline mr-2" />
              Smazat
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
          >
            Zrušit
          </button>
          <button
            onClick={() => onSave({ label, color, note })}
            disabled={!label.trim()}
            className="px-4 py-2.5 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Check className="w-4 h-4 inline mr-2" />
            Uložit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Row editor modal
const RowEditorModal: React.FC<{
  row: CalendarRow | null;
  onSave: (row: Omit<CalendarRow, 'id' | 'order'>) => void;
  onDelete?: () => void;
  onClose: () => void;
}> = ({ row, onSave, onDelete, onClose }) => {
  const [name, setName] = useState(row?.name || '');
  const [color, setColor] = useState(row?.color || '#3B82F6');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">
            {row ? 'Upravit řádek' : 'Nový řádek'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
              Název oddělení / řádku
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="např. TRAUMATOLOGIE 1"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-3">
              Barva řádku
            </label>
            <ColorPicker selectedColor={color} onSelect={setColor} />
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
          {row && onDelete && (
            <button
              onClick={onDelete}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4 inline mr-2" />
              Smazat
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
          >
            Zrušit
          </button>
          <button
            onClick={() => onSave({ name, color })}
            disabled={!name.trim()}
            className="px-4 py-2.5 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Check className="w-4 h-4 inline mr-2" />
            Uložit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Special day editor
const SpecialDayEditorModal: React.FC<{
  day: number;
  month: string;
  specialDay?: SpecialDay;
  onSave: (specialDay: SpecialDay) => void;
  onDelete?: () => void;
  onClose: () => void;
}> = ({ day, month, specialDay, onSave, onDelete, onClose }) => {
  const [label, setLabel] = useState(specialDay?.label || '');
  const [color, setColor] = useState(specialDay?.color || '#EAB308');

  const presetLabels = ['STÁTNÍ SVÁTEK', 'ASANAČNÍ DEN', 'CELOZÁVODNÍ DOVOLENÁ', 'UZAVŘENO'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">
              {specialDay ? 'Upravit speciální den' : 'Nový speciální den'}
            </h3>
            <p className="text-sm text-white/50 mt-1">{day}. {month}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
              Rychlý výběr
            </label>
            <div className="flex flex-wrap gap-2">
              {presetLabels.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setLabel(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    label === preset
                      ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
              Vlastní název
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="např. STÁTNÍ SVÁTEK"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-3">
              Barva sloupce
            </label>
            <ColorPicker selectedColor={color} onSelect={setColor} />
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
          {specialDay && onDelete && (
            <button
              onClick={onDelete}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4 inline mr-2" />
              Smazat
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
          >
            Zrušit
          </button>
          <button
            onClick={() => onSave({ day, label, color })}
            disabled={!label.trim()}
            className="px-4 py-2.5 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Check className="w-4 h-4 inline mr-2" />
            Uložit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Main CalendarManager component
const CalendarManager: React.FC = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [rows, setRows] = useState<CalendarRow[]>(DEFAULT_ROWS);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);
  
  // Tool mode: 'select' | 'paint' | 'erase'
  const [toolMode, setToolMode] = useState<'select' | 'paint' | 'erase'>('select');
  const [paintBrush, setPaintBrush] = useState({ label: 'X', color: '#EF4444' });
  
  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ rowIndex: number; day: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ rowIndex: number; day: number } | null>(null);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  
  // History for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Modals
  const [editingEvent, setEditingEvent] = useState<{ rowId: string; day: number; event: CalendarEvent | null } | null>(null);
  const [editingRow, setEditingRow] = useState<CalendarRow | null | 'new'>(null);
  const [editingSpecialDay, setEditingSpecialDay] = useState<{ day: number; specialDay?: SpecialDay } | null>(null);
  
  // Refs
  const tableRef = useRef<HTMLDivElement>(null);

  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const monthName = MONTHS[month];
  const sortedRows = useMemo(() => [...rows].sort((a, b) => a.order - b.order), [rows]);

  // Save state to history
  const saveToHistory = useCallback(() => {
    const newState: HistoryState = {
      events: [...events],
      rows: [...rows],
      specialDays: [...specialDays],
    };
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newState]);
    setHistoryIndex(prev => prev + 1);
  }, [events, rows, specialDays, historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setEvents(prevState.events);
      setRows(prevState.rows);
      setSpecialDays(prevState.specialDays);
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setEvents(nextState.events);
      setRows(nextState.rows);
      setSpecialDays(nextState.specialDays);
      setHistoryIndex(prev => prev + 1);
    }
  }, [history, historyIndex]);

  // Get event for cell
  const getEvent = useCallback((rowId: string, day: number): CalendarEvent | undefined => {
    return events.find(e => e.rowId === rowId && e.day === day);
  }, [events]);

  // Get special day
  const getSpecialDay = useCallback((day: number) => {
    return specialDays.find(s => s.day === day);
  }, [specialDays]);

  // Cell key helper
  const getCellKey = (rowIndex: number, day: number) => `${rowIndex}-${day}`;

  // Get selected range cells
  const getSelectedRangeCells = useCallback(() => {
    if (!dragStart || !dragEnd) return new Set<string>();
    
    const minRow = Math.min(dragStart.rowIndex, dragEnd.rowIndex);
    const maxRow = Math.max(dragStart.rowIndex, dragEnd.rowIndex);
    const minDay = Math.min(dragStart.day, dragEnd.day);
    const maxDay = Math.max(dragStart.day, dragEnd.day);
    
    const cells = new Set<string>();
    for (let r = minRow; r <= maxRow; r++) {
      for (let d = minDay; d <= maxDay; d++) {
        cells.add(getCellKey(r, d));
      }
    }
    return cells;
  }, [dragStart, dragEnd]);

  // Handle mouse down on cell
  const handleCellMouseDown = (rowIndex: number, day: number, e: React.MouseEvent) => {
    e.preventDefault();
    
    if (toolMode === 'select') {
      setIsDragging(true);
      setDragStart({ rowIndex, day });
      setDragEnd({ rowIndex, day });
      setSelectedCells(new Set([getCellKey(rowIndex, day)]));
    } else if (toolMode === 'paint') {
      saveToHistory();
      const row = sortedRows[rowIndex];
      const existingEvent = getEvent(row.id, day);
      if (existingEvent) {
        setEvents(prev => prev.map(e => 
          e.id === existingEvent.id 
            ? { ...e, label: paintBrush.label, color: paintBrush.color }
            : e
        ));
      } else {
        setEvents(prev => [...prev, {
          id: crypto.randomUUID(),
          rowId: row.id,
          day,
          label: paintBrush.label,
          color: paintBrush.color,
        }]);
      }
      setIsDragging(true);
      setDragStart({ rowIndex, day });
    } else if (toolMode === 'erase') {
      saveToHistory();
      const row = sortedRows[rowIndex];
      setEvents(prev => prev.filter(e => !(e.rowId === row.id && e.day === day)));
      setIsDragging(true);
      setDragStart({ rowIndex, day });
    }
  };

  // Handle mouse enter on cell (during drag)
  const handleCellMouseEnter = (rowIndex: number, day: number) => {
    if (!isDragging) return;
    
    if (toolMode === 'select') {
      setDragEnd({ rowIndex, day });
    } else if (toolMode === 'paint') {
      const row = sortedRows[rowIndex];
      const existingEvent = getEvent(row.id, day);
      if (existingEvent) {
        setEvents(prev => prev.map(e => 
          e.id === existingEvent.id 
            ? { ...e, label: paintBrush.label, color: paintBrush.color }
            : e
        ));
      } else {
        setEvents(prev => [...prev, {
          id: crypto.randomUUID(),
          rowId: row.id,
          day,
          label: paintBrush.label,
          color: paintBrush.color,
        }]);
      }
    } else if (toolMode === 'erase') {
      const row = sortedRows[rowIndex];
      setEvents(prev => prev.filter(e => !(e.rowId === row.id && e.day === day)));
    }
  };

  // Handle mouse up
  const handleMouseUp = () => {
    if (isDragging && toolMode === 'select' && dragStart && dragEnd) {
      setSelectedCells(getSelectedRangeCells());
    }
    setIsDragging(false);
  };

  // Apply value to selected cells
  const applyToSelectedCells = (label: string, color: string) => {
    if (selectedCells.size === 0) return;
    
    saveToHistory();
    const newEvents = [...events];
    
    selectedCells.forEach(key => {
      const [rowIndexStr, dayStr] = key.split('-');
      const rowIndex = parseInt(rowIndexStr);
      const day = parseInt(dayStr);
      const row = sortedRows[rowIndex];
      
      const existingIndex = newEvents.findIndex(e => e.rowId === row.id && e.day === day);
      if (existingIndex >= 0) {
        newEvents[existingIndex] = { ...newEvents[existingIndex], label, color };
      } else {
        newEvents.push({
          id: crypto.randomUUID(),
          rowId: row.id,
          day,
          label,
          color,
        });
      }
    });
    
    setEvents(newEvents);
    setSelectedCells(new Set());
  };

  // Clear selected cells
  const clearSelectedCells = () => {
    if (selectedCells.size === 0) return;
    
    saveToHistory();
    const cellsToRemove = new Set<string>();
    
    selectedCells.forEach(key => {
      const [rowIndexStr, dayStr] = key.split('-');
      const rowIndex = parseInt(rowIndexStr);
      const day = parseInt(dayStr);
      const row = sortedRows[rowIndex];
      cellsToRemove.add(`${row.id}-${day}`);
    });
    
    setEvents(prev => prev.filter(e => !cellsToRemove.has(`${e.rowId}-${e.day}`)));
    setSelectedCells(new Set());
  };

  // Add global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => handleMouseUp();
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, dragStart, dragEnd, toolMode]);

  // Navigation
  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  };

  // Handle event save
  const handleEventSave = (data: Omit<CalendarEvent, 'id' | 'rowId' | 'day'>) => {
    if (!editingEvent) return;
    
    saveToHistory();
    const { rowId, day, event } = editingEvent;
    
    if (event) {
      setEvents(prev => prev.map(e => 
        e.id === event.id ? { ...e, ...data } : e
      ));
    } else {
      setEvents(prev => [...prev, {
        id: crypto.randomUUID(),
        rowId,
        day,
        ...data,
      }]);
    }
    setEditingEvent(null);
  };

  // Handle event delete
  const handleEventDelete = () => {
    if (!editingEvent?.event) return;
    saveToHistory();
    setEvents(prev => prev.filter(e => e.id !== editingEvent.event!.id));
    setEditingEvent(null);
  };

  // Handle row save
  const handleRowSave = (data: Omit<CalendarRow, 'id' | 'order'>) => {
    saveToHistory();
    if (editingRow === 'new') {
      setRows(prev => [...prev, {
        id: crypto.randomUUID(),
        ...data,
        order: prev.length,
      }]);
    } else if (editingRow) {
      setRows(prev => prev.map(r => 
        r.id === editingRow.id ? { ...r, ...data } : r
      ));
    }
    setEditingRow(null);
  };

  // Handle row delete
  const handleRowDelete = () => {
    if (!editingRow || editingRow === 'new') return;
    saveToHistory();
    setRows(prev => prev.filter(r => r.id !== editingRow.id));
    setEvents(prev => prev.filter(e => e.rowId !== editingRow.id));
    setEditingRow(null);
  };

  // Handle special day save
  const handleSpecialDaySave = (data: SpecialDay) => {
    saveToHistory();
    setSpecialDays(prev => {
      const existing = prev.findIndex(s => s.day === data.day);
      if (existing >= 0) {
        return prev.map((s, i) => i === existing ? data : s);
      }
      return [...prev, data];
    });
    setEditingSpecialDay(null);
  };

  // Handle special day delete
  const handleSpecialDayDelete = () => {
    if (!editingSpecialDay) return;
    saveToHistory();
    setSpecialDays(prev => prev.filter(s => s.day !== editingSpecialDay.day));
    setEditingSpecialDay(null);
  };

  // Selected range for visual feedback during drag
  const dragSelectedCells = useMemo(() => {
    if (!isDragging || toolMode !== 'select') return new Set<string>();
    return getSelectedRangeCells();
  }, [isDragging, toolMode, getSelectedRangeCells]);

  return (
    <div className="w-full select-none">
      {/* Header */}
      <motion.header 
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 flex-shrink-0"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <div className="flex items-center gap-3 mb-2 opacity-60">
            <Calendar className="w-4 h-4 text-yellow-400" />
            <p className="text-[10px] font-bold text-yellow-400 tracking-[0.4em] uppercase">SPRÁVA KALENDÁŘE</p>
          </div>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold tracking-tight uppercase leading-none">
            KALENDÁŘ <span className="text-white/20">UDÁLOSTÍ</span>
          </h1>
        </div>
        
        {/* Month navigation */}
        <div className="flex items-center gap-4">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center min-w-[180px]">
            <h2 className="text-2xl font-bold text-white">{monthName}</h2>
            <p className="text-sm text-white/50">{year}</p>
          </div>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </motion.header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
        {/* Tool modes */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5">
          <button
            onClick={() => setToolMode('select')}
            className={`p-2.5 rounded-lg transition-all ${
              toolMode === 'select'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
            title="Výběr (tažením vybere oblast)"
          >
            <MousePointer2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setToolMode('paint')}
            className={`p-2.5 rounded-lg transition-all ${
              toolMode === 'paint'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
            title="Štětec (tažením maluje)"
          >
            <Palette className="w-4 h-4" />
          </button>
          <button
            onClick={() => setToolMode('erase')}
            className={`p-2.5 rounded-lg transition-all ${
              toolMode === 'erase'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
            title="Guma (tažením maže)"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        {/* Paint brush picker (when paint mode) */}
        {toolMode === 'paint' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-xs text-white/50">Štětec:</span>
            {QUICK_FILL_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setPaintBrush(opt)}
                className={`w-7 h-7 rounded-lg font-bold text-xs transition-all ${
                  paintBrush.label === opt.label && paintBrush.color === opt.color
                    ? 'ring-2 ring-yellow-400 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: opt.color }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Quick fill for selection */}
        {toolMode === 'select' && selectedCells.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
            <span className="text-xs text-yellow-400 font-medium">{selectedCells.size} vybráno:</span>
            {QUICK_FILL_OPTIONS.slice(0, 6).map((opt) => (
              <button
                key={opt.label}
                onClick={() => applyToSelectedCells(opt.label, opt.color)}
                className="w-7 h-7 rounded-lg font-bold text-xs hover:scale-110 transition-all"
                style={{ backgroundColor: opt.color }}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={clearSelectedCells}
              className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
              title="Smazat vybrané"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Zpět"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Vpřed"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Add row */}
        <button
          onClick={() => setEditingRow('new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Přidat řádek
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-white/70">
          <strong className="text-white">Jak používat:</strong>{' '}
          <span className="text-yellow-400">Výběr</span> = tažením myší vyberte oblast a aplikujte hodnotu.{' '}
          <span className="text-yellow-400">Štětec</span> = tažením malujte hodnotu.{' '}
          <span className="text-yellow-400">Guma</span> = tažením mažte.{' '}
          Klikněte na <span className="text-blue-400">záhlaví dne</span> pro speciální den (svátek).{' '}
          Klikněte na <span className="text-green-400">název řádku</span> pro úpravu.
        </div>
      </div>

      {/* Calendar Table */}
      <div 
        ref={tableRef}
        className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]"
      >
        <table className="w-full border-collapse min-w-[1200px]">
          <thead>
            <tr>
              {/* Month header */}
              <th className="sticky left-0 z-20 bg-[#0d0d15] p-3 text-left border-b border-r border-white/10">
                <div className="font-bold text-yellow-400 uppercase text-sm">
                  {monthName.toUpperCase()}
                </div>
              </th>
              {/* Day headers */}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const dayOfWeek = getDayOfWeek(year, month, day);
                const weekend = isWeekend(year, month, day);
                const special = getSpecialDay(day);
                
                return (
                  <th
                    key={day}
                    onClick={() => setEditingSpecialDay({ day, specialDay: special })}
                    className={`p-1 border-b border-r border-white/10 cursor-pointer hover:bg-white/10 transition-colors min-w-[36px] ${
                      weekend ? 'bg-white/[0.03]' : ''
                    }`}
                    style={special ? { backgroundColor: `${special.color}30` } : undefined}
                  >
                    <div className="text-[10px] text-white/40 font-medium">
                      {DAY_NAMES[dayOfWeek]}
                    </div>
                    <div className={`text-sm font-bold ${weekend ? 'text-white/40' : 'text-white/70'}`}>
                      {day}
                    </div>
                    {special && (
                      <div 
                        className="text-[8px] font-bold mt-1 writing-mode-vertical"
                        style={{ 
                          color: special.color,
                          writingMode: 'vertical-rl',
                          textOrientation: 'mixed',
                          transform: 'rotate(180deg)',
                          height: '60px',
                          overflow: 'hidden',
                        }}
                      >
                        {special.label}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIndex) => (
              <tr key={row.id} className="group">
                {/* Row header */}
                <td
                  onClick={() => setEditingRow(row)}
                  className="sticky left-0 z-10 bg-[#0d0d15] p-2 border-b border-r border-white/10 cursor-pointer hover:bg-white/10 transition-colors min-w-[160px] max-w-[200px]"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="text-xs font-bold text-white/80 truncate">
                      {row.name}
                    </span>
                  </div>
                </td>
                {/* Day cells */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const event = getEvent(row.id, day);
                  const weekend = isWeekend(year, month, day);
                  const special = getSpecialDay(day);
                  const cellKey = getCellKey(rowIndex, day);
                  const isSelected = selectedCells.has(cellKey) || dragSelectedCells.has(cellKey);
                  
                  return (
                    <td
                      key={day}
                      onMouseDown={(e) => handleCellMouseDown(rowIndex, day, e)}
                      onMouseEnter={() => handleCellMouseEnter(rowIndex, day)}
                      onDoubleClick={() => {
                        if (toolMode === 'select') {
                          setEditingEvent({ rowId: row.id, day, event: event || null });
                        }
                      }}
                      className={`p-0.5 border-b border-r border-white/10 cursor-pointer transition-all ${
                        weekend ? 'bg-white/[0.03]' : ''
                      } ${isSelected ? 'ring-2 ring-inset ring-yellow-400' : ''}`}
                      style={special ? { backgroundColor: `${special.color}15` } : undefined}
                    >
                      {event ? (
                        <div
                          className="w-full h-8 rounded flex items-center justify-center font-bold text-xs transition-transform hover:scale-105"
                          style={{ backgroundColor: event.color }}
                          title={event.note || event.label}
                        >
                          {event.label}
                        </div>
                      ) : (
                        <div className="w-full h-8 rounded bg-transparent hover:bg-white/5 transition-colors" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/10">
        <h3 className="text-sm font-bold text-white/60 mb-3 uppercase tracking-wider">Legenda</h3>
        <div className="flex flex-wrap gap-3">
          {QUICK_FILL_OPTIONS.map((opt) => (
            <div key={opt.label} className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs"
                style={{ backgroundColor: opt.color }}
              >
                {opt.label}
              </div>
              <span className="text-xs text-white/50">
                {opt.label === 'X' && 'Zavřeno'}
                {opt.label === 'G' && 'Gynekologie'}
                {opt.label === 'CH' && 'Chirurgie'}
                {opt.label === 'U' && 'Urologie'}
                {opt.label === '7' && 'Sál 7'}
                {opt.label === '10' && 'Sál 10'}
                {opt.label === '1' && 'Sál 1'}
                {opt.label === '4' && 'Sál 4'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {editingEvent && (
          <EventEditorModal
            event={editingEvent.event}
            rowName={rows.find(r => r.id === editingEvent.rowId)?.name || ''}
            day={editingEvent.day}
            month={monthName}
            onSave={handleEventSave}
            onDelete={handleEventDelete}
            onClose={() => setEditingEvent(null)}
          />
        )}
        
        {editingRow && (
          <RowEditorModal
            row={editingRow === 'new' ? null : editingRow}
            onSave={handleRowSave}
            onDelete={editingRow !== 'new' ? handleRowDelete : undefined}
            onClose={() => setEditingRow(null)}
          />
        )}
        
        {editingSpecialDay && (
          <SpecialDayEditorModal
            day={editingSpecialDay.day}
            month={monthName}
            specialDay={editingSpecialDay.specialDay}
            onSave={handleSpecialDaySave}
            onDelete={editingSpecialDay.specialDay ? handleSpecialDayDelete : undefined}
            onClose={() => setEditingSpecialDay(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarManager;
