'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

interface CalendarConfig {
  id: string;
  name: string;
  year: number;
  month: number;
  rows: CalendarRow[];
  events: CalendarEvent[];
  specialDays: { day: number; label: string; color: string }[];
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

// Get day of week for first day (0 = Monday, 6 = Sunday)
function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

// Check if day is weekend
function isWeekend(year: number, month: number, day: number): boolean {
  const date = new Date(year, month, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
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
  onSave: (event: CalendarEvent) => void;
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
        className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">
              {event ? 'Upravit událost' : 'Nová událost'}
            </h3>
            <p className="text-sm text-white/50 mt-1">
              {rowName} • {day}. {month}
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
              placeholder="Volitelná poznámka..."
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
            onClick={() => {
              onSave({
                id: event?.id || crypto.randomUUID(),
                rowId: event?.rowId || '',
                day: event?.day || day,
                label,
                color,
                note,
              });
            }}
            className="px-4 py-2.5 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 transition-colors text-sm font-medium"
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
  onSave: (row: CalendarRow) => void;
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
          {/* Name */}
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

          {/* Color */}
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-3">
              Barva řádku
            </label>
            <ColorPicker selectedColor={color} onSelect={setColor} />
          </div>
        </div>

        {/* Actions */}
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
            onClick={() => {
              onSave({
                id: row?.id || crypto.randomUUID(),
                name,
                color,
                order: row?.order ?? 999,
              });
            }}
            disabled={!name.trim()}
            className="px-4 py-2.5 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4 inline mr-2" />
            Uložit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Special day editor (for holidays, etc)
const SpecialDayEditorModal: React.FC<{
  day: number;
  month: string;
  specialDay?: { day: number; label: string; color: string };
  onSave: (specialDay: { day: number; label: string; color: string }) => void;
  onDelete?: () => void;
  onClose: () => void;
}> = ({ day, month, specialDay, onSave, onDelete, onClose }) => {
  const [label, setLabel] = useState(specialDay?.label || '');
  const [color, setColor] = useState(specialDay?.color || '#EAB308');

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
            <p className="text-sm text-white/50 mt-1">
              {day}. {month}
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
          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
              Název (např. STÁTNÍ SVÁTEK, ASANAČNÍ DEN)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="např. STÁTNÍ SVÁTEK"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/50"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-3">
              Barva sloupce
            </label>
            <ColorPicker selectedColor={color} onSelect={setColor} />
          </div>
        </div>

        {/* Actions */}
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
            onClick={() => {
              onSave({ day, label, color });
            }}
            disabled={!label.trim()}
            className="px-4 py-2.5 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
  const [specialDays, setSpecialDays] = useState<{ day: number; label: string; color: string }[]>([]);
  
  // Modals
  const [editingEvent, setEditingEvent] = useState<{ event: CalendarEvent | null; rowId: string; day: number } | null>(null);
  const [editingRow, setEditingRow] = useState<CalendarRow | null | 'new'>(null);
  const [editingSpecialDay, setEditingSpecialDay] = useState<{ day: number; specialDay?: { day: number; label: string; color: string } } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const monthName = MONTHS[month];

  // Get event for cell
  const getEvent = useCallback((rowId: string, day: number): CalendarEvent | undefined => {
    return events.find(e => e.rowId === rowId && e.day === day);
  }, [events]);

  // Get special day
  const getSpecialDay = useCallback((day: number) => {
    return specialDays.find(s => s.day === day);
  }, [specialDays]);

  // Handle event save
  const handleEventSave = useCallback((event: CalendarEvent) => {
    if (!editingEvent) return;
    
    const newEvent: CalendarEvent = {
      ...event,
      rowId: editingEvent.rowId,
      day: editingEvent.day,
    };

    setEvents(prev => {
      const existing = prev.findIndex(e => e.rowId === newEvent.rowId && e.day === newEvent.day);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newEvent;
        return updated;
      }
      return [...prev, newEvent];
    });
    setEditingEvent(null);
  }, [editingEvent]);

  // Handle event delete
  const handleEventDelete = useCallback(() => {
    if (!editingEvent) return;
    setEvents(prev => prev.filter(e => !(e.rowId === editingEvent.rowId && e.day === editingEvent.day)));
    setEditingEvent(null);
  }, [editingEvent]);

  // Handle row save
  const handleRowSave = useCallback((row: CalendarRow) => {
    setRows(prev => {
      const existing = prev.findIndex(r => r.id === row.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = row;
        return updated;
      }
      return [...prev, { ...row, order: prev.length }];
    });
    setEditingRow(null);
  }, []);

  // Handle row delete
  const handleRowDelete = useCallback((rowId: string) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
    setEvents(prev => prev.filter(e => e.rowId !== rowId));
    setEditingRow(null);
  }, []);

  // Handle special day save
  const handleSpecialDaySave = useCallback((specialDay: { day: number; label: string; color: string }) => {
    setSpecialDays(prev => {
      const existing = prev.findIndex(s => s.day === specialDay.day);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = specialDay;
        return updated;
      }
      return [...prev, specialDay];
    });
    setEditingSpecialDay(null);
  }, []);

  // Handle special day delete
  const handleSpecialDayDelete = useCallback(() => {
    if (!editingSpecialDay) return;
    setSpecialDays(prev => prev.filter(s => s.day !== editingSpecialDay.day));
    setEditingSpecialDay(null);
  }, [editingSpecialDay]);

  // Navigate months
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

  // Generate day columns
  const dayColumns = useMemo(() => {
    const cols = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dayOfWeek = date.getDay();
      const dayName = DAY_NAMES[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
      const weekend = dayOfWeek === 0 || dayOfWeek === 6;
      const special = getSpecialDay(d);
      
      cols.push({ day: d, dayName, weekend, special });
    }
    return cols;
  }, [year, month, daysInMonth, getSpecialDay]);

  return (
    <div className="w-full">
      {/* Header */}
      <motion.header 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditingRow('new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Přidat řádek
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </motion.header>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white uppercase tracking-wide">
            {monthName}
          </h2>
          <p className="text-sm text-white/50">{year}</p>
        </div>

        <button
          onClick={nextMonth}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <div className="min-w-[1200px]">
          {/* Header Row - Days */}
          <div className="flex bg-white/[0.03] border-b border-white/10">
            {/* Row name column */}
            <div className="w-48 shrink-0 p-3 border-r border-white/10">
              <span className="text-xs font-bold text-white/40 uppercase tracking-wider">
                {monthName.toUpperCase()}
              </span>
            </div>
            
            {/* Day columns */}
            {dayColumns.map(({ day, dayName, weekend, special }) => (
              <div
                key={day}
                className={`flex-1 min-w-[40px] p-2 text-center border-r border-white/5 last:border-r-0 cursor-pointer hover:bg-white/5 transition-colors ${
                  weekend ? 'bg-white/[0.02]' : ''
                }`}
                style={special ? { backgroundColor: `${special.color}20` } : undefined}
                onClick={() => setEditingSpecialDay({ day, specialDay: special })}
              >
                <div className="text-[10px] text-white/40 uppercase">{dayName}</div>
                <div className={`text-sm font-bold ${weekend ? 'text-white/40' : 'text-white/70'}`}>
                  {day}
                </div>
              </div>
            ))}
          </div>

          {/* Special Days Row (if any) */}
          {specialDays.length > 0 && (
            <div className="flex bg-white/[0.01] border-b border-white/10">
              <div className="w-48 shrink-0 p-2 border-r border-white/10" />
              {dayColumns.map(({ day, special }) => (
                <div
                  key={day}
                  className="flex-1 min-w-[40px] border-r border-white/5 last:border-r-0"
                >
                  {special && (
                    <div
                      className="h-full flex items-center justify-center p-1"
                      style={{ backgroundColor: `${special.color}30` }}
                    >
                      <span
                        className="text-[8px] font-bold uppercase tracking-wider writing-mode-vertical"
                        style={{ 
                          color: special.color,
                          writingMode: 'vertical-rl',
                          textOrientation: 'mixed',
                          transform: 'rotate(180deg)'
                        }}
                      >
                        {special.label}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Data Rows */}
          {rows.sort((a, b) => a.order - b.order).map((row) => (
            <div
              key={row.id}
              className="flex border-b border-white/5 last:border-b-0 hover:bg-white/[0.01] transition-colors"
            >
              {/* Row name */}
              <div
                className="w-48 shrink-0 p-2 border-r border-white/10 flex items-center gap-2 cursor-pointer hover:bg-white/5"
                onClick={() => setEditingRow(row)}
              >
                <div
                  className="w-1 h-8 rounded-full shrink-0"
                  style={{ backgroundColor: row.color }}
                />
                <span className="text-xs font-semibold text-white/80 truncate">
                  {row.name}
                </span>
              </div>

              {/* Event cells */}
              {dayColumns.map(({ day, weekend, special }) => {
                const event = getEvent(row.id, day);
                
                return (
                  <div
                    key={day}
                    className={`flex-1 min-w-[40px] min-h-[40px] border-r border-white/5 last:border-r-0 cursor-pointer transition-colors ${
                      weekend ? 'bg-white/[0.01]' : ''
                    } ${!event ? 'hover:bg-white/5' : ''}`}
                    style={special && !event ? { backgroundColor: `${special.color}10` } : undefined}
                    onClick={() => setEditingEvent({ event: event || null, rowId: row.id, day })}
                  >
                    {event && (
                      <div
                        className="w-full h-full flex items-center justify-center p-1"
                        style={{ backgroundColor: event.color }}
                      >
                        <span className="text-xs font-bold text-white drop-shadow-sm">
                          {event.label}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend / Info */}
      <div className="mt-6 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Nápověda</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-white/50">
          <div>
            <strong className="text-white/70">Klikněte na buňku</strong> pro přidání/úpravu události
          </div>
          <div>
            <strong className="text-white/70">Klikněte na název řádku</strong> pro úpravu oddělení
          </div>
          <div>
            <strong className="text-white/70">Klikněte na záhlaví dne</strong> pro označení speciálního dne
          </div>
          <div>
            <strong className="text-white/70">Šedé sloupce</strong> označují víkendy
          </div>
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
            onDelete={editingRow !== 'new' ? () => handleRowDelete(editingRow.id) : undefined}
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
