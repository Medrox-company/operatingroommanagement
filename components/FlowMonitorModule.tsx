'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play, ChevronDown, RefreshCw, FolderOpen, Save, Plus, Minus,
  Search, Eye, EyeOff, Activity, Cpu, Server, Maximize2, ExternalLink,
  Radio, History as HistoryIcon, Clock, Layers, ChevronLeft, ChevronRight,
  TrendingUp, Lightbulb, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { OperatingRoom, DEFAULT_WEEKLY_SCHEDULE, DEFAULT_DAILY_BREAK_MINUTES } from '../types';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';

/* ────────────────────────────────────────────────────────────────────────────
   TOK PACIENTA — živý monitorovací modul.
   • Sály jako uzly obarvené dle aktuálního statusu, animovaný tok mezi nimi.
   • Každý sál lze zobrazit/skrýt.
   • Živé animace právě probíhajícího statusu (pulz + odpočet).
   • Režim „Historie": animovaný rozpad, jak dlouho trvaly jednotlivé statusy
     u sálů i celkově (vč. dokončených výkonů).
   ──────────────────────────────────────────────────────────────────────────── */

interface Props {
  rooms: OperatingRoom[];
}
type WStatus = { name?: string; color?: string; accent_color?: string };

const colorFor = (room: OperatingRoom, statuses: WStatus[]) => {
  if (room.isEmergency) return '#FF3B30';
  if (room.isLocked) return '#FBBF24';
  if (room.isPaused) return '#22D3EE';
  const idx = Math.min(Math.max(0, room.currentStepIndex || 0), Math.max(0, statuses.length - 1));
  const s = statuses[idx];
  return s?.accent_color || s?.color || '#34D399';
};
const nameFor = (room: OperatingRoom, statuses: WStatus[]) => {
  if (room.isEmergency) return 'Nouze';
  if (room.isLocked) return 'Uzamčeno';
  if (room.isPaused) return 'Pauza';
  const idx = Math.min(Math.max(0, room.currentStepIndex || 0), Math.max(0, statuses.length - 1));
  return statuses[idx]?.name || 'Volný';
};
const colorByIndex = (idx: number, statuses: WStatus[]) => {
  const s = statuses[Math.min(Math.max(0, idx), Math.max(0, statuses.length - 1))];
  return s?.accent_color || s?.color || '#6B7280';
};
const nameByIndex = (idx: number, statuses: WStatus[]) =>
  statuses[Math.min(Math.max(0, idx), Math.max(0, statuses.length - 1))]?.name || `Status ${idx + 1}`;

const fmtDur = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${ss.toString().padStart(2, '0')}s`;
  return `${ss}s`;
};
const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
};
const localDate = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/* Posun data ve formátu YYYY-MM-DD o n dní. */
const addDays = (dateStr: string, n: number) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return localDate(d.getTime());
};
/* Barva míry vytížení: <50 červená, 50–60 oranžová, 60–80 modrá, ≥80 zelená. */
const utilColorFor = (pct: number) =>
  pct < 50 ? '#EF4444' : pct < 60 ? '#F59E0B' : pct < 80 ? '#22D3EE' : '#34D399';
const elbow = (x1: number, y1: number, x2: number, y2: number) => {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
};

/* Doba běhu aktuálního statusu sálu (z phaseStartedAt / poslední změny). */
const currentStatusStart = (room: OperatingRoom): number | null => {
  const segs = room.statusHistory || [];
  if (segs.length > 0) return new Date(segs[segs.length - 1].startedAt).getTime();
  if (room.phaseStartedAt) return new Date(room.phaseStartedAt).getTime();
  return null;
};

/* Segmenty trvání statusů sálu z aktuální historie. */
const roomSegments = (room: OperatingRoom, now: number) => {
  const segs = room.statusHistory || [];
  return segs.map((s, i) => {
    const start = new Date(s.startedAt).getTime();
    const end = i < segs.length - 1 ? new Date(segs[i + 1].startedAt).getTime() : now;
    return { stepIndex: s.stepIndex, color: s.color, ms: Math.max(0, end - start) };
  });
};

const FlowMonitorModule: React.FC<Props> = ({ rooms }) => {
  const { workflowStatuses } = useWorkflowStatusesContext();
  const statuses = (workflowStatuses || []) as WStatus[];

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const [mode, setMode] = useState<'live' | 'board' | 'history'>('live');
  const [boardRoomId, setBoardRoomId] = useState<string>('');
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const [boardDate, setBoardDate] = useState<string>(todayStr);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState(100);

  // Listování mezi dny klávesami ← / → (v režimu Fáze s vybraným sálem).
  useEffect(() => {
    if (mode !== 'board' || !boardRoomId) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') setBoardDate((d) => addDays(d, -1));
      else if (e.key === 'ArrowRight') setBoardDate((d) => (d >= todayStr ? d : addDays(d, 1)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, boardRoomId, todayStr]);

  // Drag & drop uzlů sálů myší
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const dragRef = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const zoomRef = useRef(100);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  const onMove = useCallback((e: MouseEvent) => {
    const d = dragRef.current; if (!d) return;
    const k = zoomRef.current / 100;
    setPositions((p) => ({ ...p, [d.id]: { x: d.ox + (e.clientX - d.sx) / k, y: d.oy + (e.clientY - d.sy) / k } }));
  }, []);
  const onUp = useCallback(() => {
    dragRef.current = null;
    setDragId(null);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  }, [onMove]);
  const onNodeDown = useCallback((e: React.MouseEvent, id: string, cur: { x: number; y: number }) => {
    e.preventDefault();
    dragRef.current = { id, sx: e.clientX, sy: e.clientY, ox: cur.x, oy: cur.y };
    setDragId(id);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onMove, onUp]);

  const sorted = useMemo(() => [...rooms].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [rooms]);
  const visible = useMemo(() => sorted.filter((r) => !hidden.has(r.id)), [sorted, hidden]);
  const listed = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? sorted.filter((r) => r.name.toLowerCase().includes(q) || r.department.toLowerCase().includes(q)) : sorted;
  }, [sorted, search]);

  const toggleRoom = (id: string) =>
    setHidden((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const nowDate = new Date(now);
  const fmt = (d: Date) => d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  const ticks = Array.from({ length: 13 }, (_, i) => new Date(now + (i - 6) * 5 * 60 * 1000));

  const groupL = visible.slice(0, 2);
  const centerNodes = visible.slice(2, 4);
  const groupR1 = visible.slice(4, 6);
  const groupR2 = visible.slice(6, 8);
  const activeCount = visible.filter((r) => !r.isLocked && (r.currentStepIndex ?? 0) !== 0).length;
  const emergencyCount = visible.filter((r) => r.isEmergency).length;

  // Agregace: celková doba podle statusu (aktuální historie + dokončené výkony).
  const aggregate = useMemo(() => {
    const totals = new Map<number, number>();
    visible.forEach((r) => {
      roomSegments(r, now).forEach((s) => totals.set(s.stepIndex, (totals.get(s.stepIndex) || 0) + s.ms));
      (r.completedOperations || []).forEach((op) => {
        const segs = op.statusHistory || [];
        segs.forEach((s, i) => {
          const start = new Date(s.startedAt).getTime();
          const end = i < segs.length - 1 ? new Date(segs[i + 1].startedAt).getTime() : new Date(op.endedAt).getTime();
          totals.set(s.stepIndex, (totals.get(s.stepIndex) || 0) + Math.max(0, end - start));
        });
      });
    });
    const arr = [...totals.entries()].map(([idx, ms]) => ({ idx, ms })).sort((a, b) => b.ms - a.ms);
    const max = arr.reduce((m, x) => Math.max(m, x.ms), 1);
    return { arr, max };
  }, [visible, now, statuses]);

  // Přehledné rozmístění VŠECH viditelných sálů do mřížky (bez překryvu).
  const NODE_W = 204, NODE_H = 64, GAP_X = 36, GAP_Y = 66, START_Y = 172;
  const cols = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(visible.length || 1))));
  const gridRows = Math.ceil((visible.length || 1) / cols);
  const gridW = cols * NODE_W + (cols - 1) * GAP_X;
  const canvasW = Math.max(960, gridW + 80);
  const canvasH = START_Y + gridRows * (NODE_H + GAP_Y) + 40;
  const gridStartX = (canvasW - gridW) / 2;
  const defaultPos = (i: number) => ({ x: gridStartX + (i % cols) * (NODE_W + GAP_X), y: START_Y + Math.floor(i / cols) * (NODE_H + GAP_Y) });
  const getPos = (room: OperatingRoom, i: number) => positions[room.id] ?? defaultPos(i);

  return (
    <div className="w-full h-full overflow-hidden">
      <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/10"
        style={{ background: 'radial-gradient(120% 90% at 50% 38%, #241b4f 0%, #140f2e 38%, #0a0a18 70%, #07070f 100%)' }}>
        <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.12]"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />

        <div className="relative h-full flex flex-col">
          {/* ── Horní lišta ── */}
          <div className="flex items-center gap-3 px-5 pt-4 pb-3 flex-wrap">
            <div className="flex items-center gap-3 pr-2">
              <div className="leading-tight">
                <p className="text-[11px] font-bold text-white">Interval</p>
                <p className="text-[10px] text-white/45">posledních 5 min</p>
              </div>
              <div className="leading-tight">
                <p className="text-[11px] font-semibold text-white/80">{nowDate.toLocaleDateString('cs-CZ')}</p>
                <p className="text-[10px] text-white/45 tabular-nums">{fmt(ticks[2])} – {fmt(ticks[8])}</p>
              </div>
            </div>

            {/* Režim Živě / Historie */}
            <div className="flex p-1 rounded-xl bg-white/[0.04] border border-white/10">
              {([['live', 'Živě', Radio], ['board', 'Fáze', Layers], ['history', 'Historie', HistoryIcon]] as const).map(([m, label, Icon]) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${mode === m ? 'bg-cyan-500/25 text-cyan-200' : 'text-white/55 hover:text-white'}`}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-3">
              {[['Sály', visible.length], ['Oddělení', new Set(visible.map((r) => r.department)).size], ['Nouze', emergencyCount]].map(([label, n], i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <p className="text-[11px] font-semibold text-white/85">{label}</p>
                  <span className="text-[10px] font-bold text-white/90 px-1.5 py-0.5 rounded-md bg-white/10 tabular-nums">{n as number}</span>
                </div>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"><RefreshCw className="w-4 h-4" /></button>
              <button className="px-3.5 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors text-sm font-semibold"><FolderOpen className="w-4 h-4" /> Načíst</button>
              <button className="px-3.5 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors text-sm font-semibold"><Save className="w-4 h-4" /> Uložit</button>
            </div>
          </div>

          {/* ── Časová osa ── */}
          <div className="px-5 pb-3 flex items-center gap-3">
            <div className="flex rounded-xl overflow-hidden border border-white/10">
              <button onClick={() => setZoom((z) => Math.min(200, z + 10))} className="w-9 h-9 bg-white/[0.04] text-white/60 hover:text-white flex items-center justify-center border-r border-white/10"><Plus className="w-4 h-4" /></button>
              <button onClick={() => setZoom((z) => Math.max(20, z - 10))} className="w-9 h-9 bg-white/[0.04] text-white/60 hover:text-white flex items-center justify-center"><Minus className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 relative h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center px-4">
              <div className="flex-1 flex items-center justify-between">
                {ticks.map((t, i) => (
                  <div key={i} className="relative flex flex-col items-center gap-1">
                    <span className="w-1 h-1 rounded-full" style={{ background: i % 3 === 0 ? '#34D399' : i % 4 === 0 ? '#F87171' : 'rgba(255,255,255,0.3)' }} />
                    <span className={`text-[10px] tabular-nums ${i >= 5 && i <= 8 ? 'text-white' : 'text-white/40'}`}>{fmt(t)}</span>
                  </div>
                ))}
              </div>
              <div className="absolute top-1 bottom-1 rounded-xl border border-cyan-400/40 bg-cyan-400/[0.06] pointer-events-none" style={{ left: '40%', width: '24%' }}>
                {activeCount > 0 && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: '#F43F5E' }}>{activeCount}+</span>}
              </div>
            </div>
          </div>

          {/* ── Hlavní oblast ── */}
          <div className="flex-1 min-h-0 flex">
            {/* Levý panel: hledání + seznam sálů (zobrazit/skrýt) */}
            <div className="w-64 shrink-0 px-5 py-2 flex flex-col gap-3 min-h-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Hledat sál…" className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25" />
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] uppercase tracking-wider text-white/40">Sály ({visible.length}/{sorted.length})</span>
                <button onClick={() => setHidden(hidden.size ? new Set() : new Set(sorted.map((r) => r.id)))} className="text-[11px] font-semibold text-white/50 hover:text-white">{hidden.size ? 'Zobrazit vše' : 'Skrýt vše'}</button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-1.5 pr-0.5">
                {listed.map((r) => {
                  const on = !hidden.has(r.id);
                  const c = colorFor(r, statuses);
                  const start = currentStatusStart(r);
                  const elapsed = start ? now - start : 0;
                  return (
                    <button key={r.id} onClick={() => toggleRoom(r.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border text-left transition-colors ${on ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07]' : 'bg-transparent border-white/5 opacity-45'}`}>
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        {on && <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ background: c, opacity: 0.5 }} />}
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: on ? c : 'rgba(255,255,255,0.25)' }} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-semibold text-white/90 truncate">{r.name}</span>
                        <span className="block text-[10px] truncate" style={{ color: on ? c : 'rgba(255,255,255,0.35)' }}>{nameFor(r, statuses)}{on && start ? ` · ${fmtClock(elapsed)}` : ''}</span>
                      </span>
                      {on ? <Eye className="w-4 h-4 text-white/40 shrink-0" /> : <EyeOff className="w-4 h-4 text-white/25 shrink-0" />}
                    </button>
                  );
                })}
                {listed.length === 0 && <p className="text-[11px] text-white/30 text-center py-6">Žádný sál</p>}
              </div>

              {mode === 'live' && (
                <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] border border-white/10 px-3 py-2 shrink-0">
                  <button onClick={() => setZoom((z) => Math.max(20, z - 10))} className="w-7 h-7 rounded-lg bg-white/[0.06] text-white/60 flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                  <span className="text-sm font-bold text-white tabular-nums">{zoom}%</span>
                  <button onClick={() => setZoom((z) => Math.min(200, z + 10))} className="w-7 h-7 rounded-lg bg-white/[0.06] text-white/60 flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>

            {/* Pravá oblast: živý graf nebo historie */}
            {mode === 'live' ? (
              <div className="flex-1 min-w-0 relative overflow-auto">
                <div className="relative mx-auto" style={{ width: canvasW, height: canvasH, transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
                  {/* Spojnice hub → sál + animovaný tok */}
                  <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${canvasW} ${canvasH}`} fill="none">
                    <defs>
                      {visible.map((r, i) => {
                        const p = getPos(r, i);
                        return <path key={r.id} id={`edge-${r.id}`} d={elbow(canvasW / 2, 80, p.x + NODE_W / 2, p.y)} />;
                      })}
                    </defs>
                    {visible.map((r) => (
                      <use key={r.id} href={`#edge-${r.id}`} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
                    ))}
                    {visible.map((r, i) => {
                      const active = !r.isLocked && (r.currentStepIndex ?? 0) !== 0;
                      if (!active) return null;
                      const c = colorFor(r, statuses);
                      const dur = 2.4 + ((i % 5) * 0.45);
                      return (
                        <circle key={r.id} r="3.5" fill={c} style={{ filter: `drop-shadow(0 0 5px ${c})` }}>
                          <animateMotion dur={`${dur}s`} repeatCount="indefinite" rotate="auto"><mpath xlinkHref={`#edge-${r.id}`} /></animateMotion>
                        </circle>
                      );
                    })}
                  </svg>

                  {/* Centrální hub */}
                  <div className="absolute" style={{ left: canvasW / 2 - 26, top: 26 }}>
                    <div className="rounded-2xl flex items-center justify-center" style={{ width: 52, height: 52, background: 'linear-gradient(135deg,#6D5DF6,#3B2E9E)', boxShadow: '0 0 30px rgba(109,93,246,0.6)' }}>
                      <span className="grid grid-cols-3 gap-0.5">{Array.from({ length: 9 }).map((_, i) => <span key={i} className="w-1 h-1 rounded-full bg-white/85" />)}</span>
                    </div>
                  </div>

                  {/* Uzly sálů — přesouvatelné myší */}
                  {visible.map((r, i) => {
                    const p = getPos(r, i);
                    const c = colorFor(r, statuses);
                    const start = currentStatusStart(r);
                    const active = !r.isLocked && (r.currentStepIndex ?? 0) !== 0;
                    const dragging = dragId === r.id;
                    return (
                      <div
                        key={r.id}
                        onMouseDown={(e) => onNodeDown(e, r.id, p)}
                        className={`absolute rounded-2xl px-3 py-2.5 border flex items-center gap-2.5 overflow-hidden select-none ${dragging ? 'z-30 cursor-grabbing' : 'z-10 cursor-grab'}`}
                        style={{ left: p.x, top: p.y, width: NODE_W, background: `${c}1f`, borderColor: `${c}55`, boxShadow: active ? `0 0 22px -6px ${c}` : '0 14px 36px -18px rgba(0,0,0,0.7)', transition: dragging ? 'none' : 'box-shadow 0.2s' }}
                      >
                        {active && <span className="absolute inset-0 rounded-2xl border-2 animate-pulse pointer-events-none" style={{ borderColor: `${c}66` }} />}
                        <div className="relative w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 text-[11px] font-bold tabular-nums" style={{ background: c }}>{(r.sort_order ?? i) + 1}</div>
                        <div className="relative min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{r.name}</p>
                          <p className="text-[10px] tabular-nums flex items-center gap-1.5"><span className="truncate" style={{ color: c }}>{nameFor(r, statuses)}</span>{start && <span className="text-white/50">{fmtClock(now - start)}</span>}</p>
                        </div>
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                          {active && <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ background: c, opacity: 0.6 }} />}
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
                        </span>
                      </div>
                    );
                  })}

                  {visible.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">Všechny sály jsou skryté — zapni je v levém panelu.</div>
                  )}
                </div>
              </div>
            ) : mode === 'board' ? (
              <div className="flex-1 min-w-0 flex flex-col min-h-0">
                {/* Výběr sálu + data pro rozpad statusů */}
                <div className="px-4 pt-1 pb-2 flex items-center gap-2 flex-wrap shrink-0">
                  <div className="relative">
                    <select
                      value={boardRoomId}
                      onChange={(e) => setBoardRoomId(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-white/[0.05] border border-white/12 text-sm text-white focus:outline-none focus:border-white/30"
                    >
                      <option value="" className="bg-[#0d1320]">Přehled — všechny sály (sloupce)</option>
                      {sorted.map((r) => <option key={r.id} value={r.id} className="bg-[#0d1320]">{r.name} · {r.department}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  </div>
                  {boardRoomId && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setBoardDate((d) => addDays(d, -1))}
                          title="Předchozí den (←)"
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.05] border border-white/12 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/12">
                          <Clock className="w-4 h-4 text-white/40" />
                          <input type="date" value={boardDate} max={todayStr} onChange={(e) => setBoardDate(e.target.value)} className="bg-transparent text-sm text-white focus:outline-none [color-scheme:dark]" />
                        </div>
                        <button
                          onClick={() => setBoardDate((d) => (d >= todayStr ? d : addDays(d, 1)))}
                          disabled={boardDate >= todayStr}
                          title="Další den (→)"
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.05] border border-white/12 text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/[0.05] disabled:hover:text-white/70"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                      <button onClick={() => setBoardDate(todayStr)} disabled={boardDate >= todayStr} className="px-3 py-2 rounded-xl bg-white/[0.05] border border-white/12 text-sm text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">Dnes</button>
                      <button onClick={() => { setBoardRoomId(''); setBoardDate(todayStr); }} className="px-3 py-2 rounded-xl bg-white/[0.05] border border-white/12 text-sm text-white/60 hover:text-white">Zrušit výběr</button>
                    </>
                  )}
                </div>
                {boardRoomId
                  ? <StatusBreakdown key={`${boardRoomId}-${boardDate}`} room={sorted.find((r) => r.id === boardRoomId)!} dateStr={boardDate} statuses={statuses} now={now} todayStr={todayStr} />
                  : <StatusBoard rooms={visible} statuses={statuses} now={now} />}
              </div>
            ) : (
              /* ── Režim Historie ── */
              <div className="flex-1 min-w-0 overflow-y-auto hide-scrollbar px-5 py-2 space-y-5">
                <section>
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-white/60" /> Doba trvání statusů — podle sálu</h3>
                  <div className="space-y-2.5">
                    {visible.map((r) => {
                      const segs = roomSegments(r, now);
                      const total = segs.reduce((a, s) => a + s.ms, 0) || 1;
                      return (
                        <div key={r.id} className="rounded-2xl bg-white/[0.03] border border-white/10 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-white/90 truncate flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: colorFor(r, statuses) }} /> {r.name}</span>
                            <span className="text-[10px] text-white/40 tabular-nums">{r.department} · {fmtDur(total)}</span>
                          </div>
                          {segs.length > 0 ? (
                            <GrowBar>
                              <div className="flex h-6 rounded-lg overflow-hidden">
                                {segs.map((s, i) => (
                                  <div key={i} title={`${nameByIndex(s.stepIndex, statuses)} · ${fmtDur(s.ms)}`}
                                    className="h-full flex items-center justify-center min-w-[2px] transition-[flex-grow] duration-700"
                                    style={{ flexGrow: s.ms / total, flexBasis: 0, background: `${(s.color || colorByIndex(s.stepIndex, statuses))}` }}>
                                    {s.ms / total > 0.14 && <span className="text-[9px] font-bold text-black/70 px-1 truncate">{fmtDur(s.ms)}</span>}
                                  </div>
                                ))}
                              </div>
                            </GrowBar>
                          ) : (
                            <p className="text-[11px] text-white/30 py-1">Zatím žádná historie statusů.</p>
                          )}
                        </div>
                      );
                    })}
                    {visible.length === 0 && <p className="text-[11px] text-white/30 text-center py-6">Žádný viditelný sál.</p>}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-white/60" /> Statusy celkem (vč. dokončených výkonů)</h3>
                  <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-2.5">
                    {aggregate.arr.length > 0 ? aggregate.arr.map(({ idx, ms }) => {
                      const c = colorByIndex(idx, statuses);
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="w-40 shrink-0 text-xs text-white/80 truncate flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} /> {nameByIndex(idx, statuses)}</span>
                          <div className="flex-1 h-3 rounded-full bg-white/[0.05] overflow-hidden">
                            <GrowBar>
                              <div className="h-full rounded-full" style={{ width: `${(ms / aggregate.max) * 100}%`, background: c, boxShadow: `0 0 10px ${c}88` }} />
                            </GrowBar>
                          </div>
                          <span className="w-20 shrink-0 text-right text-xs font-semibold text-white tabular-nums">{fmtDur(ms)}</span>
                        </div>
                      );
                    }) : <p className="text-[11px] text-white/30 text-center py-4">Zatím žádná data o trvání statusů.</p>}
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* ── Spodní dok ── */}
          <div className="mx-4 mb-4 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl flex">
            <div className="flex-1 p-4 border-r border-white/10 min-w-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center"><Server className="w-4 h-4 text-white/70" /></div><h3 className="text-sm font-bold text-white">Průchodnost sálů</h3></div>
                <div className="flex items-center gap-4">
                  {[['Aktivní', '#A78BFA', activeCount], ['Pauza', '#F59E0B', visible.filter(r=>r.isPaused).length], ['Volné', '#60A5FA', visible.filter(r=>(r.currentStepIndex??0)===0).length]].map(([l, c, n], i) => (
                    <div key={i} className="text-right"><div className="flex items-center gap-1.5 justify-end"><span className="w-2 h-2 rounded-full" style={{ background: c as string }} /><span className="text-[10px] text-white/50">{l}</span></div><p className="text-sm font-bold text-white tabular-nums">{n as number}</p></div>
                  ))}
                </div>
              </div>
              <div className="relative flex items-end gap-2 h-28">
                <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-10 px-3 py-2 rounded-xl bg-[#101a3a]/90 border border-white/10 text-center shadow-xl">
                  <div className="flex items-center gap-1 justify-center text-white/50"><Activity className="w-3 h-3" /><span className="text-[9px]">Stav</span></div>
                  <p className="text-xl font-black text-white leading-none">{Math.max(0, 100 - emergencyCount * 12)}</p>
                  <p className="text-[9px] text-emerald-300">Výborný</p>
                </div>
                {ticks.map((t, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5 h-full">
                    <div className="w-2.5 rounded-t-sm transition-all duration-500" style={{ height: `${25 + ((i * 37) % 60)}%`, background: 'linear-gradient(180deg,#A78BFA,#7C3AED)' }} />
                    <div className="w-2.5 rounded-sm transition-all duration-500" style={{ height: `${15 + ((i * 53) % 45)}%`, background: 'linear-gradient(180deg,#F59E0B,#B45309)' }} />
                    <span className="text-[8px] text-white/35 tabular-nums">{fmt(t)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 p-4 min-w-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center"><Cpu className="w-4 h-4 text-white/70" /></div><h3 className="text-sm font-bold text-white">Přehled sálů</h3></div>
                <div className="flex gap-1.5"><button className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/50"><ExternalLink className="w-3.5 h-3.5" /></button><button className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/50"><Maximize2 className="w-3.5 h-3.5" /></button></div>
              </div>
              <div className="grid grid-cols-[1.4fr_1fr_auto_auto] gap-x-3 gap-y-1 text-[11px]">
                <span className="text-white/40">Sál</span><span className="text-white/40">Oddělení</span><span className="text-white/40">Status</span><span className="text-white/40 text-right">Trvání</span>
                {visible.slice(0, 4).map((r) => {
                  const c = colorFor(r, statuses);
                  const start = currentStatusStart(r);
                  return (
                    <React.Fragment key={r.id}>
                      <span className="flex items-center gap-2 text-white/85 truncate"><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} /> {r.name}</span>
                      <span className="text-white/55 truncate">{r.department}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit" style={{ background: `${c}22`, color: c, border: `1px solid ${c}55` }}>{nameFor(r, statuses)}</span>
                      <span className="text-white/80 text-right tabular-nums">{start ? fmtClock(now - start) : '—'}</span>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* Animovaný „nárůst" obsahu (scaleX 0→1 zleva) při montáži. */
const GrowBar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [on, setOn] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(id); }, []);
  return (
    <div className="origin-left transition-transform duration-700 ease-out" style={{ transform: on ? 'scaleX(1)' : 'scaleX(0)' }}>
      {children}
    </div>
  );
};

const GroupBox: React.FC<{ title: string; x: number; y: number; rooms: OperatingRoom[]; statuses: WStatus[]; now: number; compact?: boolean }> = ({ title, x, y, rooms, statuses, now, compact }) => (
  <div className="absolute rounded-3xl border border-white/10 backdrop-blur-md" style={{ left: x, top: y, width: compact ? 200 : 230, background: 'linear-gradient(160deg, rgba(40,55,120,0.45), rgba(20,28,70,0.35))', boxShadow: '0 20px 50px -20px rgba(0,0,0,0.7)' }}>
    <div className="flex items-center justify-between px-3 py-2.5">
      <div className="w-7 h-7 rounded-xl bg-[#3B82F6] flex items-center justify-center text-white"><Minus className="w-4 h-4" /></div>
      <span className="text-sm font-semibold text-white/90 truncate">{title}</span>
      <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
    </div>
    <div className="px-3 pb-3 space-y-2.5">
      {rooms.map((r) => {
        const c = colorFor(r, statuses);
        const start = currentStatusStart(r);
        const active = !r.isLocked && (r.currentStepIndex ?? 0) !== 0;
        return (
          <div key={r.id} className="relative rounded-2xl p-2.5 border overflow-hidden" style={{ background: `${c}14`, borderColor: `${c}33` }}>
            {active && <span className="absolute inset-0 rounded-2xl border-2 animate-pulse pointer-events-none" style={{ borderColor: `${c}55` }} />}
            <div className="relative pl-1">
              <p className="text-xs font-semibold text-white truncate">{r.name}</p>
              <p className="text-[10px] tabular-nums flex items-center gap-1.5" style={{ color: c }}>
                <span className="truncate">{nameFor(r, statuses)}</span>
                {start && <span className="text-white/45">{fmtClock(now - start)}</span>}
              </p>
            </div>
            <span className="absolute -right-1 top-1/2 -translate-y-1/2 flex h-2.5 w-2.5">
              {active && <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ background: c, opacity: 0.6 }} />}
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
            </span>
          </div>
        );
      })}
      {rooms.length === 0 && <p className="text-[11px] text-white/30 px-1 py-3 text-center">Žádné sály</p>}
    </div>
  </div>
);

const FlowNode: React.FC<{ x: number; y: number; room: OperatingRoom; statuses: WStatus[]; now: number; highlight?: boolean }> = ({ x, y, room, statuses, now, highlight }) => {
  const c = colorFor(room, statuses);
  const start = currentStatusStart(room);
  const active = !room.isLocked && (room.currentStepIndex ?? 0) !== 0;
  return (
    <div className="absolute rounded-2xl px-3 py-2.5 border flex items-center gap-2.5 overflow-hidden" style={{ left: x, top: y, width: 180, background: highlight ? `${c}26` : 'rgba(30,40,90,0.5)', borderColor: highlight ? `${c}77` : 'rgba(255,255,255,0.12)', boxShadow: highlight ? `0 0 26px -4px ${c}` : '0 16px 40px -18px rgba(0,0,0,0.7)' }}>
      {active && <span className="absolute inset-0 rounded-2xl border-2 animate-pulse pointer-events-none" style={{ borderColor: `${c}66` }} />}
      <div className="relative w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: c }}><Plus className="w-4 h-4" /></div>
      <div className="relative min-w-0">
        <p className="text-xs font-bold text-white truncate">{room.name}</p>
        <p className="text-[10px] tabular-nums flex items-center gap-1.5" style={{ color: c }}><span className="truncate">{nameFor(room, statuses)}</span>{start && <span className="text-white/50">{fmtClock(now - start)}</span>}</p>
      </div>
    </div>
  );
};

/* ── Režim „Fáze": kanbanové sloupce podle statusů + živý % ukazatel ── */
const StatusBoard: React.FC<{ rooms: OperatingRoom[]; statuses: WStatus[]; now: number }> = ({ rooms, statuses, now }) => {
  const cols = statuses.length > 0 ? statuses : [{ name: 'Status' } as WStatus];
  const byCol: OperatingRoom[][] = cols.map(() => []);
  rooms.forEach((r) => {
    const idx = Math.min(Math.max(0, r.currentStepIndex || 0), cols.length - 1);
    byCol[idx].push(r);
  });
  return (
    <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden hide-scrollbar px-4 py-2">
      <div className="flex gap-3 h-full min-h-0">
        {cols.map((s, ci) => {
          const c = s.accent_color || s.color || colorByIndex(ci, statuses);
          const list = byCol[ci];
          return (
            <div key={ci} className="w-[250px] shrink-0 flex flex-col min-h-0">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl mb-2 shrink-0" style={{ background: `${c}1a`, border: `1px solid ${c}33` }}>
                <span className="flex items-center gap-2 text-sm font-semibold text-white truncate">
                  <span className="relative flex h-2 w-2">
                    {list.length > 0 && <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ background: c, opacity: 0.6 }} />}
                    <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: c }} />
                  </span>
                  <span className="truncate">{s.name || `Status ${ci + 1}`}</span>
                </span>
                <span className="text-xs font-bold text-white/90 px-2 py-0.5 rounded-md bg-white/10 tabular-nums">{list.length}</span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-2 pr-0.5">
                {list.map((r) => <RoomRing key={r.id} room={r} color={c} now={now} />)}
                {list.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/10 text-white/25 text-[11px] text-center py-6">Žádný sál</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* Karta sálu s živým kruhovým % (podíl času operace v aktuálním statusu). */
const RoomRing: React.FC<{ room: OperatingRoom; color: string; now: number }> = ({ room, color, now }) => {
  const segs = roomSegments(room, now);
  const total = segs.reduce((a, s) => a + s.ms, 0);
  const start = currentStatusStart(room);
  const current = start ? now - start : 0;
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 100;
  const R = 26, CIRC = 2 * Math.PI * R, off = CIRC * (1 - pct / 100);
  return (
    <div className="relative rounded-2xl p-3 border flex items-center gap-3 overflow-hidden" style={{ background: `${color}14`, borderColor: `${color}33` }}>
      <span className="absolute inset-0 rounded-2xl border animate-pulse pointer-events-none" style={{ borderColor: `${color}22` }} />
      <div className="relative w-16 h-16 shrink-0">
        <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
          <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
          <circle cx="32" cy="32" r={R} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={off}
            style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 4px ${color}99)` }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-black text-white leading-none tabular-nums">{Math.round(pct)}%</span>
        </div>
      </div>
      <div className="relative min-w-0 flex-1">
        <p className="text-sm font-bold text-white truncate">{room.name}</p>
        <p className="text-[11px] text-white/45 truncate">{room.department}</p>
        <p className="text-[11px] tabular-nums mt-0.5" style={{ color }}>{fmtClock(current)} <span className="text-white/35">/ {fmtDur(total)}</span></p>
      </div>
    </div>
  );
};

/* Plynulé „naskočení" čísla z 0 na cíl (ease-out cubic). */
const useCountUp = (target: number, on: boolean, dur = 1000) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!on) { setV(0); return; }
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => { const k = Math.min(1, (t - t0) / dur); setV(target * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, on, dur]);
  return v;
};

/* ── Animovaný rozpad statusů vybraného sálu za den (donut + legenda) ── */
const StatusBreakdown: React.FC<{ room: OperatingRoom; dateStr: string; statuses: WStatus[]; now: number; todayStr: string }> = ({ room, dateStr, statuses, now, todayStr }) => {
  const [on, setOn] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(id); }, []);

  const data = useMemo(() => {
    const totals = new Map<number, number>();
    const add = (idx: number, ms: number) => { if (ms > 0) totals.set(idx, (totals.get(idx) || 0) + ms); };
    (room.completedOperations || []).forEach((op) => {
      if (localDate(new Date(op.startedAt).getTime()) !== dateStr) return;
      const segs = op.statusHistory || [];
      segs.forEach((s, i) => {
        const st = new Date(s.startedAt).getTime();
        const en = i < segs.length - 1 ? new Date(segs[i + 1].startedAt).getTime() : new Date(op.endedAt).getTime();
        add(s.stepIndex, en - st);
      });
    });
    if (dateStr === todayStr) roomSegments(room, now).forEach((s) => add(s.stepIndex, s.ms));
    const arr = [...totals.entries()]
      .map(([idx, ms]) => ({ idx, ms, c: colorByIndex(idx, statuses), name: nameByIndex(idx, statuses) }))
      .sort((a, b) => b.ms - a.ms);
    const total = arr.reduce((a, x) => a + x.ms, 0);
    let acc = 0;
    const R = 130, CIRC = 2 * Math.PI * R;
    const segs = arr.map((s) => { const len = total > 0 ? (s.ms / total) * CIRC : 0; const start = acc; acc += len; return { ...s, len, start, frac: total > 0 ? s.ms / total : 0 }; });

    // Pracovní kapacita dne (ms) podle rozvrhu sálu pro daný den v týdnu.
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const sched = room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
    const day = sched[dayKeys[new Date(dateStr + 'T00:00:00').getDay()]];
    let workingMs = 0;
    if (day?.enabled) {
      const startM = day.startHour * 60 + day.startMinute;
      const endM = day.endHour * 60 + day.endMinute;
      const breakM = day.breakMinutes ?? DEFAULT_DAILY_BREAK_MINUTES;
      workingMs = Math.max(0, endM - startM - breakM) * 60000;
    }
    // Vytížení = obsazený čas / pracovní kapacita. Pokud je sál dnes zavřený, ale
    // má odpracovaný čas, počítáme z 8h baseline (stejně jako modul Timeline).
    const utilPct = workingMs > 0
      ? (total / workingMs) * 100
      : (total > 0 ? (total / (480 * 60000)) * 100 : 0);

    return { segs, total, R, CIRC, workingMs, utilPct };
  }, [room, dateStr, statuses, now, todayStr]);

  const utilColor = utilColorFor(data.utilPct);
  const countPct = useCountUp(data.utilPct, on, 1100);

  // Textová doporučení „co zlepšit / urychlit" odvozená z dat dne.
  const tips = useMemo(() => {
    const out: { tone: 'warn' | 'info' | 'good'; title: string; text: string }[] = [];
    const pct = data.utilPct;
    const idleMs = data.workingMs > 0 ? Math.max(0, data.workingMs - data.total) : 0;
    // 1) Vytížení
    if (pct > 100) {
      out.push({ tone: 'warn', title: 'Překročená kapacita', text: `Sál běžel ${fmtDur(data.total)}, tj. ${Math.round(pct)} % plánu. Riziko přesčasů — naplánuj realističtější program nebo přesuň výkon na jiný sál.` });
    } else if (pct < 50) {
      out.push({ tone: 'warn', title: 'Nízké vytížení', text: `Využito jen ${Math.round(pct)} % pracovní doby${data.workingMs > 0 ? `, volných ${fmtDur(idleMs)}` : ''}. Doplň program nebo sem přesuň výkony z přetížených sálů.` });
    } else if (pct < 60) {
      out.push({ tone: 'info', title: 'Podprůměrné vytížení', text: `Vytížení ${Math.round(pct)} %. Zrychlením přípravy a úklidu lze uvolnit čas na další výkon${data.workingMs > 0 ? ` (volných ${fmtDur(idleMs)})` : ''}.` });
    } else if (pct < 80) {
      out.push({ tone: 'info', title: 'Dobré vytížení', text: `Vytížení ${Math.round(pct)} %. Stále je prostor zařadit kratší výkon${data.workingMs > 0 ? ` (volných ${fmtDur(idleMs)})` : ''}.` });
    } else {
      out.push({ tone: 'good', title: 'Vysoké vytížení', text: `Sál je velmi dobře využit (${Math.round(pct)} %). Udrž tempo a hlídej přesčasy.` });
    }
    // 2) Režijní (nechirurgické) časy — předpoklad: největší blok = hlavní výkon.
    const overhead = data.segs.slice(1);
    const overheadMs = overhead.reduce((a, s) => a + s.ms, 0);
    const overheadPct = data.total > 0 ? (overheadMs / data.total) * 100 : 0;
    const biggest = overhead.slice().sort((a, b) => b.ms - a.ms)[0];
    if (biggest && data.total > 0 && (biggest.ms / data.total) * 100 >= 10) {
      out.push({ tone: 'info', title: `Zkrať: ${biggest.name}`, text: `Status „${biggest.name}" zabral ${fmtDur(biggest.ms)} (${Math.round((biggest.ms / data.total) * 100)} % dne). Standardizace tohoto kroku přinese nejrychlejší zlepšení.` });
    }
    if (overheadPct >= 35) {
      out.push({ tone: 'warn', title: 'Vysoká režie', text: `Nechirurgické statusy tvoří ${Math.round(overheadPct)} % času (${fmtDur(overheadMs)}). Zaměř se na zkrácení mezičasů mezi výkony (úklid, příjezd/odjezd, příprava).` });
    } else if (out.length < 2) {
      out.push({ tone: 'good', title: 'Nízká režie', text: `Mezičasy mezi výkony jsou pod kontrolou (${Math.round(overheadPct)} % času).` });
    }
    return out;
  }, [data]);

  if (data.total === 0) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center gap-2 px-6">
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/15 flex items-center justify-center"><Clock className="w-7 h-7 text-white/25" /></div>
        <p className="text-white/60 font-medium">Žádná data pro vybrané datum</p>
        <p className="text-sm text-white/30">Pro {new Date(dateStr).toLocaleDateString('cs-CZ')} nemá sál {room.name} žádnou historii statusů.</p>
      </div>
    );
  }

  const toneColor = (t: 'warn' | 'info' | 'good') => t === 'warn' ? '#FB7185' : t === 'good' ? '#34D399' : '#22D3EE';
  const ToneIcon = (t: 'warn' | 'info' | 'good') => t === 'warn' ? AlertTriangle : t === 'good' ? CheckCircle2 : Lightbulb;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar flex flex-col items-center px-6 py-4 gap-7">
      {/* Hlavička */}
      <div className="text-center">
        <h3 className="text-lg font-bold text-white">{room.name} <span className="text-white/40 font-medium">· {room.department}</span></h3>
        <p className="text-xs text-white/45 mt-0.5 capitalize">{new Date(dateStr).toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{dateStr === todayStr ? ' · živě' : ''}</p>
      </div>

      {/* Graf vytížení + panel doporučení vpravo */}
      <div className="flex flex-col lg:flex-row items-center lg:items-center justify-center gap-8 w-full max-w-5xl">
        {/* Velký donut — VYTÍŽENÍ SÁLU */}
        <div className="relative shrink-0" style={{ width: 380, height: 380 }}>
          <div className="absolute inset-8 rounded-full blur-[60px]" style={{ background: utilColor, opacity: 0.22 }} />
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 360 360" style={{ animation: 'spin 32s linear infinite' }}>
            <circle cx="180" cy="180" r="166" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" strokeDasharray="2 10" />
          </svg>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 360 360" style={{ animation: 'spin 60s linear infinite reverse' }}>
            <circle cx="180" cy="180" r="150" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="1 14" />
          </svg>
          <svg viewBox="0 0 360 360" className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="180" cy="180" r={data.R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="36" />
            <circle cx="180" cy="180" r={data.R} fill="none" stroke={utilColor} strokeWidth="36" strokeLinecap="round"
              strokeDasharray={`${(on ? Math.min(100, data.utilPct) : 0) / 100 * data.CIRC} ${data.CIRC}`}
              style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(.22,1,.36,1)', filter: `drop-shadow(0 0 8px ${utilColor}99)` }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-10">
            <span className="text-[10px] uppercase tracking-[0.25em] text-white/45 mb-1.5">Vytížení sálu</span>
            <span className="text-[64px] font-black text-white tabular-nums leading-none" style={{ textShadow: `0 0 28px ${utilColor}77` }}>{Math.round(countPct)}<span className="text-2xl align-top text-white/70">%</span></span>
            <span className="text-xs text-white/45 tabular-nums mt-2">Obsazeno {fmtDur(data.total)}{data.workingMs > 0 ? ` / ${fmtDur(data.workingMs)}` : ''}</span>
          </div>
        </div>

        {/* Panel doporučení */}
        <div className="w-full lg:w-[360px] shrink-0 rounded-2xl bg-white/[0.03] border border-white/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/50 font-bold flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" style={{ color: utilColor }} /> Co zlepšit a urychlit
          </p>
          <div className="flex flex-col gap-2.5">
            {tips.map((t, i) => {
              const col = toneColor(t.tone);
              const Icon = ToneIcon(t.tone);
              return (
                <div key={i} className="flex items-start gap-2.5 rounded-xl p-2.5" style={{ background: `${col}10`, border: `1px solid ${col}33` }}>
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: col }} />
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-white leading-tight">{t.title}</p>
                    <p className="text-[11px] text-white/60 leading-snug mt-0.5">{t.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mini donuty jednotlivých statusů — % zastoupení v daném dni.
          Flex se zalamováním: v jednom řádku, když je místo, jinak responzivně
          přetečou na další řádek a nikdy se nepřekrývají. */}
      <div className="w-full">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/45 text-center mb-5">Zastoupení statusů v dni</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-8">
          {data.segs.map((s, i) => {
            const pct = data.total > 0 ? (s.ms / data.total) * 100 : 0;
            const r = 46, circ = 2 * Math.PI * r;
            return (
              <div key={s.idx} className="flex flex-col items-center gap-2.5 w-[136px] shrink-0">
                <div className="relative" style={{ width: 120, height: 120 }}>
                  <div className="absolute inset-4 rounded-full blur-xl" style={{ background: s.c, opacity: 0.18 }} />
                  <svg viewBox="0 0 108 108" className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="54" cy="54" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="11" />
                    <circle cx="54" cy="54" r={r} fill="none" stroke={s.c} strokeWidth="11" strokeLinecap="round"
                      strokeDasharray={`${(on ? pct : 0) / 100 * circ} ${circ}`}
                      style={{ transition: `stroke-dasharray 0.9s cubic-bezier(.22,1,.36,1) ${0.2 + i * 0.07}s`, filter: `drop-shadow(0 0 6px ${s.c}88)` }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-black text-white tabular-nums">{pct.toFixed(0)}<span className="text-xs align-top text-white/60">%</span></span>
                  </div>
                </div>
                <div className="text-center leading-tight">
                  <p className="text-[13px] font-semibold text-white/90 truncate max-w-[140px] flex items-center justify-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.c, boxShadow: `0 0 6px ${s.c}` }} /> {s.name}
                  </p>
                  <p className="text-[11px] text-white/45 tabular-nums mt-0.5">{fmtDur(s.ms)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FlowMonitorModule;
