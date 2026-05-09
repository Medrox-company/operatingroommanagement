'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Trash2, X, Check,
  Palette, AlertCircle, Eraser, Undo2, Redo2, Copy, Download,
  Eye, EyeOff, Search, MousePointer2, PaintBucket, Flag, Settings,
  GripVertical, Printer, FileText, Save, RefreshCw, Type, AlignLeft,
  AlignCenter, AlignRight, Merge, ChevronDown,
} from 'lucide-react';

// ─────────────────── Types ───────────────────
type FontSize = 'xs' | 'sm' | 'base' | 'lg';

interface CellData {
  label: string;
  color: string;
  note?: string;
  locked?: boolean;
  // New features
  colspan?: number;      // Span across multiple days horizontally (1 = normal, 2+ = merged)
  rowspan?: number;      // Span across multiple rows vertically (1 = normal, 2+ = merged)
  fontSize?: FontSize;   // Text size: xs, sm, base, lg
  textColor?: string;    // Custom text color (default white)
  textAlign?: 'left' | 'center' | 'right';
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

type ToolMode = 'select' | 'fill' | 'drag-fill' | 'erase';

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

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; class: string }[] = [
  { value: 'xs', label: 'Malé', class: 'text-[8px]' },
  { value: 'sm', label: 'Střední', class: 'text-[10px]' },
  { value: 'base', label: 'Velké', class: 'text-xs' },
  { value: 'lg', label: 'Extra', class: 'text-sm' },
];

const TEXT_COLORS = ['#FFFFFF', '#000000', '#FDE047', '#86EFAC', '#93C5FD', '#FCA5A5'];

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

// České státní svátky (fixní datumy)
const CZECH_HOLIDAYS: { month: number; day: number; name: string }[] = [
  { month: 0, day: 1, name: 'Nový rok' },
  { month: 4, day: 1, name: 'Svátek práce' },
  { month: 4, day: 8, name: 'Den vítězství' },
  { month: 6, day: 5, name: 'Cyril a Metoděj' },
  { month: 6, day: 6, name: 'Mistr Jan Hus' },
  { month: 8, day: 28, name: 'Den české státnosti' },
  { month: 9, day: 28, name: 'Den vzniku ČSR' },
  { month: 10, day: 17, name: 'Den boje za svobodu' },
  { month: 11, day: 24, name: 'Štědrý den' },
  { month: 11, day: 25, name: '1. svátek vánoční' },
  { month: 11, day: 26, name: '2. svátek vánoční' },
];

// Výpočet Velikonoc (Gaussův algoritmus)
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function getCzechHolidays(year: number): { month: number; day: number; name: string }[] {
  const holidays = [...CZECH_HOLIDAYS];
  
  // Velikonoce - pohyblivé svátky
  const easter = getEasterDate(year);
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  
  holidays.push({ month: goodFriday.getMonth(), day: goodFriday.getDate(), name: 'Velký pátek' });
  holidays.push({ month: easterMonday.getMonth(), day: easterMonday.getDate(), name: 'Velikonoční pondělí' });
  
  return holidays;
}

// ─────────────────── Helpers ───────────────────
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getDayOfWeek(y: number, m: number, d: number) { return (new Date(y, m, d).getDay() + 6) % 7; }
function isWeekend(y: number, m: number, d: number) { const dw = getDayOfWeek(y, m, d); return dw === 5 || dw === 6; }
function cellKey(rowId: string, day: number, year: number, month: number) { return `${year}:${month}:${rowId}:${day}`; }

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
  maxColspan: number;
  maxRowspan: number;
  quickValues: QuickValue[];
  onSave: (data: CellData) => void;
  onDelete: () => void;
  onClose: () => void;
}> = ({ cell, rowName, day, month, maxColspan, maxRowspan, quickValues, onSave, onDelete, onClose }) => {
  const [label, setLabel] = useState(cell?.label || '');
  const [color, setColor] = useState(cell?.color || '#3B82F6');
  const [note,  setNote]  = useState(cell?.note  || '');
  const [colspan, setColspan] = useState(cell?.colspan || 1);
  const [rowspan, setRowspan] = useState(cell?.rowspan || 1);
  const [fontSize, setFontSize] = useState<FontSize>(cell?.fontSize || 'sm');
  const [textColor, setTextColor] = useState(cell?.textColor || '#FFFFFF');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>(cell?.textAlign || 'center');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fontSizeClass = FONT_SIZE_OPTIONS.find(f => f.value === fontSize)?.class || 'text-[10px]';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-[#13131f] border border-white/10 rounded-2xl p-6 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white">{cell ? 'Upravit buňku' : 'Nová buňka'}</h3>
            <p className="text-sm text-white/40 mt-0.5">{rowName} — {day}. {month}{colspan > 1 || rowspan > 1 ? ` (${colspan}x${rowspan})` : ''}</p>
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
              {quickValues.map(q => (
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
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Text buňky</p>
            <textarea
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="např. X, G, CH, DOVOLENÁ, TRA LA+CA (ARO SDÍLENO)..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-yellow-500/50 text-sm resize-none"
            />
          </div>

          {/* Color */}
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Barva pozadí</p>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          {/* Preview */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Náhled</p>
            <div 
              style={{ 
                backgroundColor: color,
                width: colspan > 1 ? `${Math.min(colspan * 40, 200)}px` : '60px',
              }} 
              className={`h-10 rounded-lg flex items-center justify-${textAlign === 'left' ? 'start' : textAlign === 'right' ? 'end' : 'center'} px-2 font-bold shadow ${fontSizeClass}`}
            >
              <span style={{ color: textColor }} className={`${textAlign === 'center' ? 'text-center w-full' : ''} leading-tight`}>
                {label || '?'}
              </span>
            </div>
          </div>

          {/* Advanced options toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            Pokročilé možnosti
          </button>

          {showAdvanced && (
            <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/10">
              {/* Merge cells section */}
              <div className="grid grid-cols-2 gap-4">
                {/* Colspan - horizontal merge */}
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Merge className="w-3 h-3" /> Vodorovně (dnů)
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={Math.min(maxColspan, 14)}
                      value={colspan}
                      onChange={e => setColspan(Number(e.target.value))}
                      className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-yellow-400"
                    />
                    <span className="text-white font-bold w-8 text-center">{colspan}</span>
                  </div>
                </div>
                
                {/* Rowspan - vertical merge */}
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Merge className="w-3 h-3 rotate-90" /> Svisle (řádků)
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={Math.min(maxRowspan, 10)}
                      value={rowspan}
                      onChange={e => setRowspan(Number(e.target.value))}
                      className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-400"
                    />
                    <span className="text-white font-bold w-8 text-center">{rowspan}</span>
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-white/30">Buňka zabere {colspan} {colspan === 1 ? 'den' : colspan < 5 ? 'dny' : 'dní'} x {rowspan} {rowspan === 1 ? 'řádek' : rowspan < 5 ? 'řádky' : 'řádků'}</p>

              {/* Font size */}
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Type className="w-3 h-3" /> Velikost textu
                </p>
                <div className="flex gap-2">
                  {FONT_SIZE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFontSize(opt.value)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        fontSize === opt.value 
                          ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400' 
                          : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text color */}
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Barva textu</p>
                <div className="flex gap-2">
                  {TEXT_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setTextColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        textColor === c ? 'border-yellow-400 scale-110' : 'border-white/20 hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Text alignment */}
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Zarovnání textu</p>
                <div className="flex gap-2">
                  {[
                    { value: 'left', icon: <AlignLeft className="w-4 h-4" /> },
                    { value: 'center', icon: <AlignCenter className="w-4 h-4" /> },
                    { value: 'right', icon: <AlignRight className="w-4 h-4" /> },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTextAlign(opt.value as 'left' | 'center' | 'right')}
                      className={`flex-1 px-3 py-2 rounded-lg flex items-center justify-center transition-colors ${
                        textAlign === opt.value 
                          ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400' 
                          : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {opt.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Poznámka</p>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Volitelná poznámka (zobrazí se při najetí myší)..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-yellow-500/50 resize-none text-sm"
                />
              </div>
            </div>
          )}
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
          <button onClick={() => onSave({ label, color, note, colspan, rowspan, fontSize, textColor, textAlign })} disabled={!label.trim()}
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
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  label === p ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/50' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}>
                {p}
              </button>
            ))}
          </div>
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Vlastní popis</p>
            <input type="text" value={label} onChange={e => setLabel(e.target.value)}
              placeholder="např. CELOZÁVODNÍ DOVOLENÁ"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-yellow-500/50 text-sm" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Barva</p>
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

// ─────────────────── Czech Holidays Modal ───────────────────
const CzechHolidaysModal: React.FC<{
  year: number;
  month: number;
  onAddHoliday: (day: number, name: string) => void;
  onClose: () => void;
}> = ({ year, month, onAddHoliday, onClose }) => {
  const holidays = getCzechHolidays(year).filter(h => h.month === month);
  const allHolidays = getCzechHolidays(year);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-[#13131f] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white">České státní svátky {year}</h3>
            <p className="text-sm text-white/40 mt-0.5">Klikněte pro přidání do kalendáře</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current month holidays */}
        {holidays.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] font-bold text-yellow-400/60 uppercase tracking-widest mb-3">Tento měsíc ({MONTHS[month]})</p>
            <div className="space-y-2">
              {holidays.map((h, i) => (
                <button key={i}
                  onClick={() => { onAddHoliday(h.day, h.name); }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors text-left">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <span className="text-yellow-400 font-bold">{h.day}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{h.name}</p>
                    <p className="text-white/40 text-xs">{h.day}. {MONTHS[h.month]}</p>
                  </div>
                  <Plus className="w-4 h-4 text-yellow-400 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All holidays */}
        <div>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Všechny svátky v roce {year}</p>
          <div className="space-y-1.5">
            {allHolidays.sort((a, b) => a.month * 100 + a.day - (b.month * 100 + b.day)).map((h, i) => (
              <div key={i}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  h.month === month ? 'bg-yellow-500/10' : 'bg-white/[0.02] hover:bg-white/5'
                }`}>
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <span className="text-white/60 font-medium text-xs">{h.day}</span>
                </div>
                <div className="flex-1">
                  <p className="text-white/80 text-sm">{h.name}</p>
                  <p className="text-white/30 text-xs">{MONTHS[h.month]}</p>
                </div>
                {h.month === month && (
                  <button onClick={() => onAddHoliday(h.day, h.name)}
                    className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end mt-5 pt-4 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors text-sm">
            Zavřít
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─────────────────── Quick Values Editor Modal ───────────────────
interface QuickValue { label: string; color: string; desc: string; }

const QuickValuesEditorModal: React.FC<{
  values: QuickValue[];
  onSave: (values: QuickValue[]) => void;
  onClose: () => void;
}> = ({ values, onSave, onClose }) => {
  const [list, setList] = useState<QuickValue[]>(values.map(v => ({ ...v })));
  const [editing, setEditing] = useState<number | null>(null);

  const updateItem = (i: number, field: keyof QuickValue, val: string) => {
    setList(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: val } : v));
  };
  const deleteItem = (i: number) => setList(prev => prev.filter((_, idx) => idx !== i));
  const addItem = () => {
    setList(prev => [...prev, { label: '', color: '#3B82F6', desc: '' }]);
    setEditing(list.length);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-[#13131f] border border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">Rychlé hodnoty</h3>
            <p className="text-sm text-white/40 mt-0.5">Přidejte, upravte nebo odstraňte rychlé hodnoty pro vyplňování</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
          {list.map((item, i) => (
            <div key={i} className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors">
              {/* Color preview */}
              <div style={{ backgroundColor: item.color }} className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm text-white flex-shrink-0 shadow">
                {item.label || '?'}
              </div>

              {editing === i ? (
                /* Expanded edit */
                <div className="flex-1 grid grid-cols-1 gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      autoFocus
                      value={item.label}
                      onChange={e => updateItem(i, 'label', e.target.value)}
                      placeholder="Zkratka (X, G, CH...)"
                      className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-500/50"
                    />
                    <input
                      value={item.desc}
                      onChange={e => updateItem(i, 'desc', e.target.value)}
                      placeholder="Popis (volitelný)"
                      className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-500/50"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map(c => (
                      <button key={c} onClick={() => updateItem(i, 'color', c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-md transition-all border-2 ${item.color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                      />
                    ))}
                  </div>
                  <button onClick={() => setEditing(null)} className="self-start flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs font-medium hover:bg-yellow-500/30 transition-colors">
                    <Check className="w-3 h-3" /> Hotovo
                  </button>
                </div>
              ) : (
                /* Collapsed view */
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1">
                    <span className="text-white font-bold text-sm">{item.label || '—'}</span>
                    {item.desc && <span className="text-white/40 text-xs ml-2">{item.desc}</span>}
                  </div>
                  <button onClick={() => setEditing(i)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all">
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button onClick={() => deleteItem(i)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <button onClick={addItem}
            className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-white/20 text-white/40 hover:text-white hover:border-white/40 transition-colors text-sm">
            <Plus className="w-4 h-4" /> Přidat hodnotu
          </button>
        </div>

        <div className="flex gap-3 mt-5 pt-4 border-t border-white/10 flex-shrink-0">
          <button onClick={() => setList(QUICK_VALUES.map(v => ({ ...v })))}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors text-sm">
            <RefreshCw className="w-4 h-4" /> Výchozí
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors text-sm">
            Zrušit
          </button>
          <button onClick={() => { onSave(list.filter(v => v.label.trim())); onClose(); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 transition-colors text-sm">
            <Check className="w-4 h-4" /> Uložit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─────────────────── Main Component ───────────────────
const CalendarManager: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rows, setRows] = useState<CalendarRow[]>(DEFAULT_ROWS);
  const [cells, setCells] = useState<Record<string, CellData>>({});
  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);
  const [quickValues, setQuickValues] = useState<QuickValue[]>(QUICK_VALUES.map(v => ({ ...v })));

  // Month-aware cell key helper (data je oddělená pro každý měsíc a rok)
  const ck = useCallback((rowId: string, day: number) => cellKey(rowId, day, year, month), [year, month]);

  // UI states
  const [editCell, setEditCell] = useState<{ rowId: string; day: number } | null>(null);
  const [editRow, setEditRow] = useState<CalendarRow | 'new' | null>(null);
  const [editSpecialDay, setEditSpecialDay] = useState<{ day: number } | null>(null);
  const [showHolidays, setShowHolidays] = useState(false);
  const [showQuickValuesEditor, setShowQuickValuesEditor] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; rowId: string; day: number } | null>(null);

  // Tool states
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [brush, setBrush] = useState<{ label: string; color: string }>({ label: 'X', color: '#EF4444' });
  const [search, setSearch] = useState('');
  const [showHidden, setShowHidden] = useState(false);

  // Selection & drag
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ rowId: string; rowIdx: number; day: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ rowId: string; rowIdx: number; day: number } | null>(null);
  const [dragSourceCell, setDragSourceCell] = useState<CellData | null>(null);

  // Row clipboard
  const [rowClipboard, setRowClipboard] = useState<Record<number, CellData>>({});

  // History for undo/redo
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const canUndo = historyIdx >= 0;
  const canRedo = historyIdx < history.length - 1;

  // Derived
  const daysInMonth = getDaysInMonth(year, month);
  const monthName = MONTHS[month];
  const sortedRows = useMemo(() => {
    let r = [...rows].sort((a, b) => a.order - b.order);
    if (search) r = r.filter(row => row.name.toLowerCase().includes(search.toLowerCase()));
    if (!showHidden) r = r.filter(row => !row.hidden);
    return r;
  }, [rows, search, showHidden]);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => setCtxMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undo(); }
      if (e.key === 'y' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); redo(); }
      if (e.key === 'Delete' && selectedKeys.size > 0) { clearSelection(); }
      if (e.key === 'Escape') { setSelectedKeys(new Set()); setIsDragging(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedKeys, historyIdx, history]);

  // ─── History ───
  const pushHistory = useCallback(() => {
    const snapshot: HistorySnapshot = { cells: { ...cells }, rows: [...rows], specialDays: [...specialDays] };
    setHistory(prev => [...prev.slice(0, historyIdx + 1), snapshot]);
    setHistoryIdx(prev => prev + 1);
  }, [cells, rows, specialDays, historyIdx]);

  const undo = useCallback(() => {
    if (!canUndo) return;
    const snap = history[historyIdx];
    setCells(snap.cells);
    setRows(snap.rows);
    setSpecialDays(snap.specialDays);
    setHistoryIdx(prev => prev - 1);
  }, [canUndo, history, historyIdx]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const snap = history[historyIdx + 1];
    setCells(snap.cells);
    setRows(snap.rows);
    setSpecialDays(snap.specialDays);
    setHistoryIdx(prev => prev + 1);
  }, [canRedo, history, historyIdx]);

  // ─── Actions ───
  const applyToSelection = (label: string, color: string) => {
    if (selectedKeys.size === 0) return;
    pushHistory();
    setCells(prev => {
      const next = { ...prev };
      selectedKeys.forEach(k => { next[k] = { label, color }; });
      return next;
    });
    setSelectedKeys(new Set());
  };

  const clearSelection = () => {
    if (selectedKeys.size === 0) return;
    pushHistory();
    setCells(prev => {
      const next = { ...prev };
      selectedKeys.forEach(k => delete next[k]);
      return next;
    });
    setSelectedKeys(new Set());
  };

  const copyRow = (rowId: string) => {
    const clip: Record<number, CellData> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const k = ck(rowId, d);
      if (cells[k]) clip[d] = cells[k];
    }
    setRowClipboard(clip);
  };

  const pasteRow = (rowId: string) => {
    if (Object.keys(rowClipboard).length === 0) return;
    pushHistory();
    setCells(prev => {
      const next = { ...prev };
      Object.entries(rowClipboard).forEach(([d, data]) => {
        next[ck(rowId, Number(d))] = data;
      });
      return next;
    });
  };

  const clearRow = (rowId: string) => {
    pushHistory();
    setCells(prev => {
      const next = { ...prev };
      for (let d = 1; d <= daysInMonth; d++) delete next[ck(rowId, d)];
      return next;
    });
  };

  const fillWeekdays = (rowId: string) => {
    pushHistory();
    setCells(prev => {
      const next = { ...prev };
      for (let d = 1; d <= daysInMonth; d++) {
        if (!isWeekend(year, month, d)) {
          next[ck(rowId, d)] = { ...brush };
        }
      }
      return next;
    });
  };

  const clearMonth = () => {
    pushHistory();
    setCells({});
    setSpecialDays([]);
  };

  const printCalendar = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const DAY_SHORT = ['PO','ÚT','ST','ČT','PÁ','SO','NE'];

    const headerCells = days.map(d => {
      const dw = getDayOfWeek(year, month, d);
      const weekend = dw === 5 || dw === 6;
      const special = specialDays.find(s => s.day === d);
      const isHoliday = getCzechHolidays(year).some(h => h.month === month && h.day === d);
      const bg = special ? special.color : isHoliday ? '#EAB308' : weekend ? '#374151' : '#1f2937';
      return `<th style="background:${bg};color:${weekend||special||isHoliday?'#fff':'#9ca3af'};padding:4px 2px;text-align:center;font-size:9px;min-width:28px;border:1px solid #374151;">
        <div>${DAY_SHORT[dw]}</div><div style="font-weight:bold;color:${weekend?'#f97316':'#fff'}">${d}</div>
        ${special ? `<div style="font-size:7px;writing-mode:vertical-lr;transform:rotate(180deg);max-height:50px;overflow:hidden">${special.label}</div>` : ''}
      </th>`;
    }).join('');

    const bodyRows = sortedRows.map(row => {
      let skipUntil = 0;
      const tds: string[] = [];
      
      for (let d = 1; d <= daysInMonth; d++) {
        if (d < skipUntil) continue;
        
        const cell = cells[ck(row.id, d)];
        const weekend = isWeekend(year, month, d);
        const bg = cell ? cell.color : weekend ? '#1a1a2e' : 'transparent';
        const text = cell?.label || '';
        const textColor = cell?.textColor || '#fff';
        const colspan = cell?.colspan || 1;
        const fontSize = cell?.fontSize === 'xs' ? '8px' : cell?.fontSize === 'lg' ? '12px' : cell?.fontSize === 'base' ? '11px' : '10px';
        
        if (colspan > 1) skipUntil = d + colspan;
        
        tds.push(`<td ${colspan > 1 ? `colspan="${colspan}"` : ''} style="background:${bg};color:${textColor};text-align:center;font-size:${fontSize};font-weight:bold;padding:3px 1px;border:1px solid #2d3748;">${text}</td>`);
      }
      
      return `<tr>
        <td style="padding:4px 8px;font-size:10px;font-weight:600;color:#e2e8f0;border:1px solid #2d3748;white-space:nowrap;background:#111827;">${row.name}</td>
        ${tds.join('')}
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Kalendář — ${monthName} ${year}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #0a0a14; color: #fff; margin: 0; padding: 10px; }
    h1 { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 4px; color: #fff; }
    .subtitle { font-size: 10px; color: #6b7280; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 12px; }
    table { border-collapse: collapse; width: 100%; table-layout: fixed; font-size: 9px; }
    th { padding: 4px 2px; border: 1px solid #374151; }
    td { padding: 3px 1px; border: 1px solid #2d3748; }
    .legend { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .legend-item { display: flex; align-items: center; gap: 4px; font-size: 9px; color: #9ca3af; }
    .legend-dot { width: 14px; height: 14px; border-radius: 3px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="subtitle">SPRÁVA KALENDÁŘE</div>
  <h1>KALENDÁŘ <span style="color:#374151">${monthName.toUpperCase()}</span> ${year}</h1>
  <table>
    <colgroup>
      <col style="width:140px">
      ${days.map(() => '<col style="width:auto">').join('')}
    </colgroup>
    <thead>
      <tr>
        <th style="background:#111827;color:#6b7280;text-align:left;padding:4px 8px;border:1px solid #374151;font-size:9px;">ODDĚLENÍ</th>
        ${headerCells}
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>
  ${quickValues.length > 0 ? `
  <div class="legend">
    ${quickValues.map(q => `<div class="legend-item"><div class="legend-dot" style="background:${q.color}"></div><strong style="color:${q.color}">${q.label}</strong>${q.desc ? ` — ${q.desc}` : ''}</div>`).join('')}
  </div>` : ''}
  <div style="margin-top:8px;font-size:8px;color:#4b5563;">Vytištěno: ${new Date().toLocaleString('cs-CZ')}</div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const exportCSV = () => {
    let csv = `${monthName} ${year},${Array.from({ length: daysInMonth }, (_, i) => i + 1).join(',')}\n`;
    sortedRows.forEach(row => {
      const vals = Array.from({ length: daysInMonth }, (_, i) => cells[ck(row.id, i + 1)]?.label || '');
      csv += `${row.name},${vals.join(',')}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kalendar-${year}-${String(month + 1).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addCzechHoliday = (day: number, name: string) => {
    pushHistory();
    setSpecialDays(prev => {
      const existing = prev.findIndex(s => s.day === day);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = { day, label: name, color: '#EAB308' };
        return next;
      }
      return [...prev, { day, label: name, color: '#EAB308' }];
    });
  };

  const addAllCzechHolidays = () => {
    pushHistory();
    const holidays = getCzechHolidays(year).filter(h => h.month === month);
    setSpecialDays(prev => {
      const next = [...prev];
      holidays.forEach(h => {
        const existing = next.findIndex(s => s.day === h.day);
        if (existing >= 0) {
          next[existing] = { day: h.day, label: h.name, color: '#EAB308' };
        } else {
          next.push({ day: h.day, label: h.name, color: '#EAB308' });
        }
      });
      return next;
    });
  };

  // ─── Drag handling ───
  const handleCellMouseDown = (e: React.MouseEvent, rowId: string, rowIdx: number, day: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    
    const key = ck(rowId, day);
    const existingCell = cells[key];
    
    if (toolMode === 'drag-fill' && existingCell) {
      setDragSourceCell(existingCell);
      setIsDragging(true);
      setDragStart({ rowId, rowIdx, day });
      setDragEnd({ rowId, rowIdx, day });
    } else if (toolMode === 'select') {
      setIsDragging(true);
      setDragStart({ rowId, rowIdx, day });
      setDragEnd({ rowId, rowIdx, day });
      setSelectedKeys(new Set([key]));
    } else if (toolMode === 'fill') {
      pushHistory();
      setCells(prev => ({ ...prev, [key]: { ...brush } }));
      setIsDragging(true);
      setDragStart({ rowId, rowIdx, day });
    } else if (toolMode === 'erase') {
      pushHistory();
      setCells(prev => { const n = { ...prev }; delete n[key]; return n; });
      setIsDragging(true);
      setDragStart({ rowId, rowIdx, day });
    }
  };

  const handleCellMouseEnter = (rowId: string, rowIdx: number, day: number) => {
    if (!isDragging || !dragStart) return;
    
    const key = ck(rowId, day);
    
    if (toolMode === 'drag-fill' && dragSourceCell) {
      setDragEnd({ rowId, rowIdx, day });
    } else if (toolMode === 'select') {
      setDragEnd({ rowId, rowIdx, day });
      const minRow = Math.min(dragStart.rowIdx, rowIdx);
      const maxRow = Math.max(dragStart.rowIdx, rowIdx);
      const minDay = Math.min(dragStart.day, day);
      const maxDay = Math.max(dragStart.day, day);
      const keys = new Set<string>();
      for (let r = minRow; r <= maxRow; r++) {
        const row = sortedRows[r];
        if (!row) continue;
        for (let d = minDay; d <= maxDay; d++) {
          keys.add(ck(row.id, d));
        }
      }
      setSelectedKeys(keys);
    } else if (toolMode === 'fill') {
      setCells(prev => ({ ...prev, [key]: { ...brush } }));
    } else if (toolMode === 'erase') {
      setCells(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
  };

  const handleMouseUp = () => {
    if (isDragging && toolMode === 'drag-fill' && dragSourceCell && dragStart && dragEnd) {
      pushHistory();
      const minRow = Math.min(dragStart.rowIdx, dragEnd.rowIdx);
      const maxRow = Math.max(dragStart.rowIdx, dragEnd.rowIdx);
      const minDay = Math.min(dragStart.day, dragEnd.day);
      const maxDay = Math.max(dragStart.day, dragEnd.day);
      
      setCells(prev => {
        const next = { ...prev };
        for (let r = minRow; r <= maxRow; r++) {
          const row = sortedRows[r];
          if (!row) continue;
          for (let d = minDay; d <= maxDay; d++) {
            next[ck(row.id, d)] = { ...dragSourceCell };
          }
        }
        return next;
      });
    }
    
    setIsDragging(false);
    setDragSourceCell(null);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isDragging, toolMode, dragSourceCell, dragStart, dragEnd, sortedRows]);

  const isInDragRange = (key: string) => {
    if (!dragStart || !dragEnd) return false;
    // Key format: year:month:rowId:day
    const parts = key.split(':');
    const rowId = parts[2];
    const day = Number(parts[3]);
    const rowIdx = sortedRows.findIndex(r => r.id === rowId);
    if (rowIdx < 0) return false;
    const minRow = Math.min(dragStart.rowIdx, dragEnd.rowIdx);
    const maxRow = Math.max(dragStart.rowIdx, dragEnd.rowIdx);
    const minDay = Math.min(dragStart.day, dragEnd.day);
    const maxDay = Math.max(dragStart.day, dragEnd.day);
    return rowIdx >= minRow && rowIdx <= maxRow && day >= minDay && day <= maxDay;
  };

  const isSelected = (key: string) => selectedKeys.has(key);

  // Cursor styles
  const cursors: Record<ToolMode, string> = {
    select: 'cursor-crosshair',
    fill: 'cursor-cell',
    'drag-fill': 'cursor-grab',
    erase: 'cursor-cell',
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden select-none" onMouseLeave={() => { if (isDragging) handleMouseUp(); }}>
  {/* Header */}
  <header className="flex items-start justify-between gap-6 mb-4 flex-shrink-0">
    <div className="text-left">
      <div className="flex items-center gap-3 mb-2 opacity-60">
        <Calendar className="w-4 h-4 text-[#FBBF24]" />
        <p className="text-[10px] font-bold text-[#FBBF24] tracking-[0.4em] uppercase">SPRÁVA KALENDÁŘE</p>
      </div>
      <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-bold tracking-tight uppercase leading-none">
        KALENDÁŘ <span className="text-white/20">UDÁLOSTÍ</span>
      </h1>
    </div>

    {/* Month navigation - Right side */}
    <div className="flex items-center gap-2 mt-2">
      <button
        onClick={prevMonth}
        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        title="Předchozí měsíc"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div className="min-w-[140px] text-center">
        <span className="text-lg font-bold text-white">{monthName}</span>
        <span className="text-lg font-bold text-white/30 ml-2">{year}</span>
      </div>
      <button
        onClick={nextMonth}
        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        title="Další měsíc"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  </header>

      {/* Main content: toolbar + table on left, right panel on right */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* Left content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-8 p-3 rounded-2xl bg-white/[0.02] border border-white/10">
        {/* Tool group */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/20 border border-white/5">
          {([
            { mode: 'select'    as ToolMode, icon: <MousePointer2 className="w-4 h-4" />, title: 'Výběr — tažením vyberete oblast' },
            { mode: 'fill'      as ToolMode, icon: <PaintBucket   className="w-4 h-4" />, title: 'Štětec — tažením malujete' },
            { mode: 'drag-fill' as ToolMode, icon: <GripVertical  className="w-4 h-4" />, title: 'Protáhnout — tažením z vyplněné buňky zkopíruje její hodnotu' },
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

        {/* Brush picker */}
        {toolMode === 'fill' && (
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
          </div>
        )}

        {/* Selection actions */}
        {toolMode === 'select' && selectedKeys.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
            <span className="text-xs text-yellow-400 font-medium">{selectedKeys.size}x</span>
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
            placeholder="Hledat..."
            className="w-24 bg-transparent text-white text-xs placeholder-white/30 focus:outline-none" />
        </div>

        {/* Czech holidays */}
        <button onClick={() => setShowHolidays(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-colors text-xs font-medium">
          <Flag className="w-4 h-4" />
          Svátky CZ
        </button>

        {/* Add all holidays for current month */}
        <button onClick={addAllCzechHolidays}
          className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
          title="Přidat všechny svátky tohoto měsíce">
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Toggle hidden */}
        <button onClick={() => setShowHidden(v => !v)}
          className={`p-2 rounded-xl transition-all ${showHidden ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
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

  {/* Quick values editor */}
  <button onClick={() => setShowQuickValuesEditor(true)}
  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-yellow-400 hover:border-yellow-500/30 hover:bg-yellow-500/10 transition-colors text-xs font-medium">
  <Palette className="w-4 h-4" />
  Rychlé hodnoty
  </button>

  {/* Print */}
  <button onClick={printCalendar}
  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/10 transition-colors text-xs font-medium">
  <Printer className="w-4 h-4" />
  Tisk
  </button>

  {/* Export */}
  <button onClick={exportCSV}
  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors text-xs font-medium">
  <Download className="w-4 h-4" />
  CSV
  </button>
  
  {/* Add row */}
  <button onClick={() => setEditRow('new')}
  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-colors text-sm font-medium">
  <Plus className="w-4 h-4" /> Řádek
  </button>
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-white/40">
        <AlertCircle className="w-4 h-4 text-blue-400/60 shrink-0" />
        {toolMode === 'select'    && <span><strong className="text-white/70">Výběr:</strong> Tažením vyberete oblast buněk a aplikujete hodnotu. Delete = smazat. Dvojklik = detail.</span>}
        {toolMode === 'fill'      && <span><strong className="text-yellow-400">Štětec:</strong> Tažením malujete zvolenou hodnotou do buněk.</span>}
        {toolMode === 'drag-fill' && <span><strong className="text-yellow-400">Protáhnout:</strong> Klikněte na vyplněnou buňku a tažením zkopírujte její hodnotu do okolních buněk (všemi směry).</span>}
        {toolMode === 'erase'     && <span><strong className="text-red-400">Guma:</strong> Tažen����m mažete obsah buněk.</span>}
      </div>

      {/* Table */}
      <div className={`overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] ${cursors[toolMode]}`}>
        <table className="border-collapse w-full" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} />
            {Array.from({ length: daysInMonth }).map((_, i) => (
              <col key={i} style={{ width: '36px', minWidth: '36px' }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {/* Month label */}
              <th className="sticky left-0 z-20 bg-[#0d0d18] p-3 text-left border-b border-r border-white/10">
                <span className="font-medium text-yellow-400 uppercase text-2xl tracking-wider">{monthName.toUpperCase()}</span>
              </th>
              {/* Day headers */}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                const dow  = getDayOfWeek(year, month, d);
                const wknd = isWeekend(year, month, d);
                const sp   = specialDays.find(s => s.day === d);
                const holiday = getCzechHolidays(year).find(h => h.month === month && h.day === d);
                return (
                  <th key={d}
                    onClick={() => setEditSpecialDay({ day: d })}
                    style={sp ? { backgroundColor: `${sp.color}25` } : undefined}
                    className={`p-0.5 border-b border-r border-white/10 cursor-pointer hover:bg-white/10 transition-colors text-center ${wknd ? 'bg-white/[0.025]' : ''}`}>
                    <div className="text-[9px] text-white/30 font-medium">{DAY_NAMES[dow]}</div>
                    <div className={`text-[13px] font-bold ${wknd ? 'text-white/30' : 'text-white/60'} ${holiday ? 'text-yellow-400' : ''}`}>{d}</div>
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
  {(() => {
    // Track cells covered by rowspan from previous rows
    // Key: "rowIndex:day" -> true if covered
    const coveredCells = new Map<string, boolean>();
    
    // Pre-calculate rowspan coverage
    sortedRows.forEach((row, rIdx) => {
      for (let d = 1; d <= daysInMonth; d++) {
        const cellData = cells[ck(row.id, d)];
        if (cellData?.rowspan && cellData.rowspan > 1) {
          // Mark cells below as covered
          for (let r = 1; r < cellData.rowspan; r++) {
            const colspanRange = cellData.colspan || 1;
            for (let c = 0; c < colspanRange; c++) {
              coveredCells.set(`${rIdx + r}:${d + c}`, true);
            }
          }
        }
        if (cellData?.colspan && cellData.colspan > 1) {
          // Mark horizontal cells as covered (for same row)
          for (let c = 1; c < cellData.colspan; c++) {
            coveredCells.set(`${rIdx}:${d + c}`, true);
          }
        }
      }
    });
    
    return sortedRows.map((row, rowIndex) => (
  <tr key={row.id}
  className={`group transition-all ${row.hidden ? 'opacity-40' : ''}`}>
  {/* Row header - FIXED WIDTH */}
  <td className="sticky left-0 z-10 bg-[#0d0d18] border-b border-r border-white/10">
                  <div className="flex items-center h-9">
                    <button
                      onClick={() => setEditRow(row)}
                      className="flex items-center gap-2 px-3 py-2 flex-1 min-w-0 hover:bg-white/5 transition-colors text-left">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                      <span className="text-xs font-bold text-white/80 truncate">{row.name}</span>
                    </button>
                    {/* Row actions - always visible but subtle */}
                    <div className="flex items-center gap-0.5 pr-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => copyRow(row.id)}
                        className="p-1 rounded text-white/30 hover:text-white hover:bg-white/10 transition-colors" title="Kopírovat">
                        <Copy className="w-3 h-3" />
                      </button>
                      <button onClick={() => pasteRow(row.id)}
                        className="p-1 rounded text-white/30 hover:text-white hover:bg-white/10 transition-colors" title="Vložit">
                        <Download className="w-3 h-3" />
                      </button>
                      <button onClick={() => fillWeekdays(row.id)}
                        className="p-1 rounded text-white/30 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors" title="Vyplnit pracovní dny">
                        <PaintBucket className="w-3 h-3" />
                      </button>
                      <button onClick={() => clearRow(row.id)}
                        className="p-1 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Smazat">
                        <Eraser className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </td>
  {/* Day cells with colspan and rowspan support */}
  {(() => {
    const cellElements: React.ReactNode[] = [];
    
    for (let d = 1; d <= daysInMonth; d++) {
      // Skip cells covered by colspan or rowspan
      if (coveredCells.has(`${rowIndex}:${d}`)) continue;
      
      const key   = ck(row.id, d);
      const data  = cells[key];
      const wknd  = isWeekend(year, month, d);
      const sp    = specialDays.find(s => s.day === d);
      const inDrag = isInDragRange(key) && isDragging && (toolMode === 'select' || toolMode === 'drag-fill');
      const sel    = isSelected(key);
      
      const colspan = data?.colspan || 1;
      const rowspan = data?.rowspan || 1;
      
      // Font size class
      const fontSizeClass = data?.fontSize 
        ? FONT_SIZE_OPTIONS.find(f => f.value === data.fontSize)?.class || 'text-[11px]'
        : 'text-[11px]';
      
      // Text alignment
      const alignClass = data?.textAlign === 'left' ? 'justify-start pl-1' 
        : data?.textAlign === 'right' ? 'justify-end pr-1' 
        : 'justify-center';
      
      // Calculate height based on rowspan
      const cellHeight = rowspan > 1 ? `${rowspan * 36 - 4}px` : 'h-7';
      
      cellElements.push(
        <td 
          key={d}
          colSpan={colspan > 1 ? colspan : undefined}
          rowSpan={rowspan > 1 ? rowspan : undefined}
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
            wknd && !data ? 'bg-white/[0.015]' : ''
          } ${sel || inDrag ? 'ring-2 ring-inset ring-yellow-400/80' : ''} ${rowspan > 1 ? 'align-top' : ''}`}
        >
          {data ? (
            <div
              style={{ 
                backgroundColor: data.color,
                height: rowspan > 1 ? cellHeight : undefined,
              }}
              title={data.note ? `${data.label}\n${data.note}` : data.label}
              className={`w-full ${rowspan > 1 ? '' : 'h-7'} rounded flex items-center ${alignClass} font-bold ${fontSizeClass} shadow-sm transition-transform hover:scale-[1.01] relative px-1 overflow-hidden`}
            >
              <span 
                style={{ color: data.textColor || '#FFFFFF' }}
                className="leading-tight line-clamp-3 text-center"
              >
                {data.label}
              </span>
              {data.note && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white/60" />
              )}
              {(colspan > 1 || rowspan > 1) && (
                <span className="absolute bottom-0.5 right-0.5 text-[7px] text-white/40">{colspan}x{rowspan}</span>
              )}
            </div>
          ) : (
            <div className="w-full h-7 rounded hover:bg-white/5 transition-colors" />
          )}
        </td>
      );
    }
    
    return cellElements;
  })()}
  </tr>
  ));
  })()}
  </tbody>
        </table>
      </div>
        </div>

        {/* Right panel - Mini calendar and stats */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-80 flex flex-col gap-4 pb-4 overflow-y-auto pl-4 border-l border-white/10 flex-shrink-0"
        >
          {/* Quick preview section */}
          <div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Rychlý náhled</p>
            
            {/* Mini Calendar */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAY_NAMES.map(day => (
                  <div key={day} className="text-center text-[9px] font-bold text-white/40 py-1">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const firstDayOfMonth = new Date(year, month, 1).getDay();
                  const firstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
                  const days = [];
                  
                  for (let i = 0; i < firstDay; i++) days.push(null);
                  for (let i = 1; i <= daysInMonth; i++) days.push(i);
                  
                  return days.map((day, i) => (
                    <div
                      key={i}
                      className={`text-xs py-1.5 rounded-lg text-center font-semibold transition-colors ${
                        !day ? 'text-transparent' :
                        isWeekend(year, month, day) ? 'bg-white/10 text-white/50' :
                        specialDays.some(s => s.day === day) ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50' :
                        'text-white/60 hover:bg-white/5'
                      }`}
                    >
                      {day}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-white/0 via-white/10 to-white/0" />

          {/* Stats section */}
          <div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Přehled</p>
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Řádky</p>
                <p className="text-2xl font-bold text-white">{sortedRows.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest mb-1">Vyplněno</p>
                <p className="text-2xl font-bold text-white">{Object.keys(cells).length}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">Svátky</p>
                <p className="text-2xl font-bold text-white">{specialDays.length}</p>
              </div>
            </div>
          </div>

          {/* Legend section */}
          <div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Legenda</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {quickValues.map(q => (
                <div key={q.label} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] transition-colors">
                  <div style={{ backgroundColor: q.color }} className="w-4 h-4 rounded flex items-center justify-center font-bold text-[9px] text-white flex-shrink-0">{q.label}</div>
                  <span className="text-white/70 text-xs truncate">{q.desc || q.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {ctxMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            style={{ top: ctxMenu.y, left: ctxMenu.x }}
            className="fixed z-50 bg-[#13131f] border border-white/10 rounded-xl shadow-2xl p-1 min-w-[180px]"
            onClick={e => e.stopPropagation()}>
            {([
              { label: 'Upravit bunku',        icon: <Palette className="w-3.5 h-3.5" />,  action: () => { setEditCell({ rowId: ctxMenu.rowId, day: ctxMenu.day }); setCtxMenu(null); } },
              { label: 'Smazat bunku',          icon: <Trash2 className="w-3.5 h-3.5" />,   action: () => { pushHistory(); setCells(p => { const n = {...p}; delete n[ck(ctxMenu.rowId, ctxMenu.day)]; return n; }); setCtxMenu(null); } },
              { label: 'Nastavit jako stetec',  icon: <PaintBucket className="w-3.5 h-3.5" />, action: () => { const d = cells[ck(ctxMenu.rowId, ctxMenu.day)]; if (d) { setBrush({ label: d.label, color: d.color }); setToolMode('fill'); } setCtxMenu(null); } },
              { label: 'Kopirovat radek',       icon: <Copy className="w-3.5 h-3.5" />,    action: () => { copyRow(ctxMenu.rowId); setCtxMenu(null); } },
              { label: 'Vlozit do radku',       icon: <Download className="w-3.5 h-3.5" />, action: () => { pasteRow(ctxMenu.rowId); setCtxMenu(null); } },
              { label: 'Smazat cely radek',     icon: <Eraser className="w-3.5 h-3.5" />,  action: () => { clearRow(ctxMenu.rowId); setCtxMenu(null); } },
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

      {/* Modals */}
      <AnimatePresence>
  {editCell && (
  <CellEditorModal
  cell={cells[ck(editCell.rowId, editCell.day)] ?? null}
  rowName={rows.find(r => r.id === editCell.rowId)?.name ?? ''}
  day={editCell.day}
  month={monthName}
  maxColspan={daysInMonth - editCell.day + 1}
  maxRowspan={sortedRows.length - sortedRows.findIndex(r => r.id === editCell.rowId)}
  quickValues={quickValues}
  onSave={data => {
              pushHistory();
              setCells(p => ({ ...p, [ck(editCell.rowId, editCell.day)]: data }));
              setEditCell(null);
            }}
            onDelete={() => {
              pushHistory();
              setCells(p => { const n = {...p}; delete n[ck(editCell.rowId, editCell.day)]; return n; });
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
                for (let d = 1; d <= daysInMonth; d++) delete n[ck((editRow as CalendarRow).id, d)];
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
                if (idx >= 0) { const n = [...p]; n[idx] = s; return n; }
                return [...p, s];
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

  {showHolidays && (
  <CzechHolidaysModal
  year={year}
  month={month}
  onAddHoliday={addCzechHoliday}
  onClose={() => setShowHolidays(false)}
  />
  )}
  {showQuickValuesEditor && (
  <QuickValuesEditorModal
  values={quickValues}
  onSave={setQuickValues}
  onClose={() => setShowQuickValuesEditor(false)}
  />
  )}
  </AnimatePresence>
    </div>
  );
};

export default CalendarManager;
