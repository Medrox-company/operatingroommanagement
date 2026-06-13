import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BellRing, AlertTriangle, Clock, Pause, Phone, Biohazard, Lock, CheckCircle2, Timer } from 'lucide-react';
import { OperatingRoom, DEFAULT_WEEKLY_SCHEDULE } from '../../types';
import { C } from './constants';

/* ════════════════════════════════════════════════════════════════════════
   TRIÁŽ POZORNOSTI — jeden panel se vším, co teď vyžaduje pozornost.

   Projde všechny sály a vyhodnotí akční podmínky (nouze, přesah, dlouhá
   pauza, pacient dlouho volaný, infekční režim, zámek…), seřadí je podle
   naléhavosti a zobrazí jako animovaný prioritizovaný feed. Kritické
   položky pulzují. Velínský přehled „co řešit teď".
   ════════════════════════════════════════════════════════════════════════ */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rooms: OperatingRoom[];
  currentTime: Date;
  onSelectRoom?: (id: string) => void;
}

type Severity = 'critical' | 'warning' | 'info';
interface Item {
  roomId: string; roomName: string;
  severity: Severity;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  detail: string;
  sortKey: number; // vyšší = naléhavější
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const SEV_COLOR: Record<Severity, string> = { critical: C.red, warning: C.yellow, info: C.blue };
const SEV_RANK: Record<Severity, number> = { critical: 3, warning: 2, info: 1 };

const CALLED_THRESHOLD_MIN = 10;  // pacient volaný a nedorazil
const PAUSE_THRESHOLD_MIN = 15;   // dlouhá pauza

const AttentionFeed: React.FC<Props> = ({ isOpen, onClose, rooms, currentTime, onSelectRoom }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const now = currentTime.getTime();

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const todayKey = DAY_KEYS[currentTime.getDay()];
    const minAgo = (iso?: string | null) => (iso ? Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000)) : null);
    const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m} min`);

    rooms.forEach((r) => {
      // 1) Nouze — kritická
      if (r.isEmergency) {
        out.push({ roomId: r.id, roomName: r.name, severity: 'critical', icon: AlertTriangle, title: 'Stav nouze', detail: 'Vyhlášen stav nouze na sále', sortKey: 1000 });
      }
      // 2) Přesah — operace pokračuje po konci provozní doby
      if (r.currentStepIndex > 0 && !r.isLocked && r.estimatedEndTime) {
        const sch = (r.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE)[todayKey];
        if (sch?.enabled) {
          const end = new Date(currentTime); end.setHours(sch.endHour, sch.endMinute, 0, 0);
          if (sch.endHour < 7) end.setDate(end.getDate() + 1);
          const estEnd = new Date(r.estimatedEndTime).getTime();
          if (estEnd > end.getTime()) {
            const over = Math.round((estEnd - end.getTime()) / 60000);
            out.push({ roomId: r.id, roomName: r.name, severity: 'warning', icon: Timer, title: 'Přesah provozní doby', detail: `Odhad konce přesahuje směnu o ${fmtMin(over)}`, sortKey: 700 + over });
          }
        }
        // skluz proti odhadu
        const estEnd = new Date(r.estimatedEndTime).getTime();
        if (now > estEnd) {
          const slip = Math.round((now - estEnd) / 60000);
          if (slip >= 5) out.push({ roomId: r.id, roomName: r.name, severity: 'warning', icon: Clock, title: 'Operace ve skluzu', detail: `Překračuje odhad o ${fmtMin(slip)}`, sortKey: 600 + slip });
        }
      }
      // 3) Pacient volaný a nedorazil
      if (r.patientCalledAt && !r.patientArrivedAt) {
        const m = minAgo(r.patientCalledAt);
        if (m !== null && m >= CALLED_THRESHOLD_MIN) {
          out.push({ roomId: r.id, roomName: r.name, severity: 'warning', icon: Phone, title: 'Pacient stále nedorazil', detail: `Volán před ${fmtMin(m)}`, sortKey: 500 + m });
        }
      }
      // 4) Dlouhá pauza
      if (r.isPaused) {
        const m = minAgo(r.phaseStartedAt);
        const detail = m !== null ? `Pauza trvá ${fmtMin(m)}` : 'Operace pozastavena';
        const long = m !== null && m >= PAUSE_THRESHOLD_MIN;
        out.push({ roomId: r.id, roomName: r.name, severity: long ? 'warning' : 'info', icon: Pause, title: 'Pozastavená operace', detail, sortKey: (long ? 450 : 200) + (m ?? 0) });
      }
      // 5) Infekční pacient / zvýšená hygiena
      if (r.isEnhancedHygiene) {
        out.push({ roomId: r.id, roomName: r.name, severity: 'info', icon: Biohazard, title: 'Infekční pacient', detail: 'Aktivní zvýšený hygienický režim', sortKey: 180 });
      }
      // 6) Uzamčený sál
      if (r.isLocked) {
        out.push({ roomId: r.id, roomName: r.name, severity: 'info', icon: Lock, title: 'Uzamčený sál', detail: 'Sál je mimo provoz', sortKey: 150 });
      }
    });

    return out.sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity] || b.sortKey - a.sortKey);
  }, [rooms, currentTime, now]);

  const counts = useMemo(() => ({
    critical: items.filter((i) => i.severity === 'critical').length,
    warning: items.filter((i) => i.severity === 'warning').length,
    info: items.filter((i) => i.severity === 'info').length,
  }), [items]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="af-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl"
          onClick={onClose} role="dialog" aria-modal="true" aria-label="Triáž pozornosti"
        >
          <motion.div
            key="af-panel"
            initial={{ scale: 0.94, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-3xl overflow-hidden w-[min(96vw,820px)] relative"
            style={{
              background: `linear-gradient(180deg, ${C.bgElevated} 0%, ${C.bgSurface} 100%)`,
              border: `1px solid ${C.borderStrong}`,
              boxShadow: `0 30px 80px -15px rgba(0,0,0,0.7), 0 0 60px ${counts.critical ? C.red : C.accent}10, inset 0 1px 0 rgba(255,255,255,0.06)`,
              maxHeight: '92vh',
            }}
          >
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[200px] rounded-full pointer-events-none opacity-20"
              style={{ background: `radial-gradient(circle, ${counts.critical ? C.red : C.accent} 0%, transparent 70%)`, filter: 'blur(70px)' }} />

            {/* Header */}
            <div className="px-6 pt-5 pb-4 flex items-start justify-between relative z-10">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${C.accent}18`, border: `1px solid ${C.accent}40` }}>
                    <BellRing className="w-4 h-4" style={{ color: C.accent }} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Triáž pozornosti</h2>
                  <div className="flex items-center gap-1.5">
                    {counts.critical > 0 && <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: `${C.red}1c`, color: C.red, border: `1px solid ${C.red}40` }}>{counts.critical} kritické</span>}
                    {counts.warning > 0 && <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: `${C.yellow}1c`, color: C.yellow, border: `1px solid ${C.yellow}40` }}>{counts.warning} varování</span>}
                    {counts.info > 0 && <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: `${C.blue}1c`, color: C.blue, border: `1px solid ${C.blue}40` }}>{counts.info} info</span>}
                  </div>
                </div>
                <p className="text-white/45 text-sm mt-1.5 uppercase tracking-[0.2em]">Co vyžaduje pozornost právě teď</p>
              </div>
              <button onClick={onClose} aria-label="Zavřít" className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: C.glass, border: `1px solid ${C.border}` }}>
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="relative z-10 px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 96px)' }}>
              {items.length === 0 ? (
                <div className="text-center py-14">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: C.green }} />
                  <p className="text-lg font-bold text-white">Vše v pořádku</p>
                  <p className="text-sm text-white/45 mt-1">Žádný sál právě nevyžaduje pozornost.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {items.map((it, i) => {
                    const col = SEV_COLOR[it.severity];
                    return (
                      <motion.button
                        type="button"
                        key={`${it.roomId}-${it.title}-${i}`}
                        onClick={() => onSelectRoom?.(it.roomId)}
                        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3.5 rounded-2xl px-4 py-3 text-left group relative overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${col}28` }}
                      >
                        {/* levý barevný pruh dle naléhavosti */}
                        <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: col }} />
                        {/* ikona */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${it.severity === 'critical' ? 'animate-pulse' : ''}`} style={{ background: `${col}1a`, border: `1px solid ${col}40` }}>
                          <it.icon className="w-5 h-5" style={{ color: col }} />
                        </div>
                        {/* text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate">{it.title}</span>
                            {it.severity === 'critical' && (
                              <span className="relative flex h-2 w-2 flex-shrink-0">
                                <span className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping" style={{ background: col }} />
                                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: col }} />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/50 truncate mt-0.5">{it.detail}</p>
                        </div>
                        {/* sál */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-white/90 truncate max-w-[160px]">{it.roomName}</p>
                          <p className="text-[10px] uppercase tracking-wider text-white/35 group-hover:text-white/55 transition-colors">otevřít detail →</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AttentionFeed;
