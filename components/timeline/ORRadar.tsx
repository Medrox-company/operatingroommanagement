import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Radar, Stethoscope, Users, Syringe, Clock, MapPin, Activity } from 'lucide-react';
import { OperatingRoom } from '../../types';
import { useWorkflowStatusesContext } from '../../contexts/WorkflowStatusesContext';
import { C } from './constants';

/* ════════════════════════════════════════════════════════════════════════
   KRUHOVÝ GRAF UVOLNĚNÍ — radiální přehled celého operačního traktu.

   Každý sál je bod rozmístěný kolem živých hodin. ČÍM BLÍŽ KE STŘEDU, tím
   dříve se sál uvolní; vnější prstenec = čerstvě začaté nebo volné sály.
   Po najetí myší se vpravo zobrazí kompletní detail sálu včetně personálu.
   (Bez pohyblivých animací — klidný, čitelný přehled.)
   ════════════════════════════════════════════════════════════════════════ */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rooms: OperatingRoom[];
  currentTime: Date;
}

const SIZE = 600;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_OUTER = 262;
const R_INNER = 76;

const fmtT = (d: Date) => d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

interface Node {
  id: string; name: string; room: OperatingRoom;
  color: string; active: boolean; emergency: boolean; paused: boolean;
  toFree: number | null; statusName: string;
  x: number; y: number;
}

const ORRadar: React.FC<Props> = ({ isOpen, onClose, rooms, currentTime }) => {
  const { workflowStatuses } = useWorkflowStatusesContext();
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const now = currentTime.getTime();

  const nodes = useMemo<Node[]>(() => {
    const visible = rooms.filter((r) => !r.isLocked);
    const total = visible.length || 1;
    const HORIZON = 180; // 3 h
    return visible.map((room, i) => {
      const active = room.currentStepIndex > 0 && !!room.operationStartedAt;
      const safeIdx = Math.max(0, Math.min(room.currentStepIndex, workflowStatuses.length - 1));
      const status = workflowStatuses[safeIdx];
      const color = room.isEmergency ? C.red
        : room.isPaused ? C.cyan
        : active ? (status?.accent_color || status?.color || C.slate)
        : C.green;
      let toFree: number | null = null;
      if (active && room.estimatedEndTime) {
        toFree = Math.max(0, (new Date(room.estimatedEndTime).getTime() - now) / 60000);
      }
      let radius: number;
      if (!active) radius = R_OUTER;
      else if (toFree === null) radius = R_OUTER - 30;
      else {
        const k = Math.min(1, toFree / HORIZON);
        radius = R_INNER + k * (R_OUTER - R_INNER);
      }
      const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
      return {
        id: room.id, name: room.name, room,
        color, active, emergency: !!room.isEmergency, paused: !!room.isPaused,
        toFree,
        statusName: room.isEmergency ? 'Stav nouze' : room.isPaused ? 'Pauza' : active ? (status?.name || 'Operace') : 'Volný',
        x: CX + radius * Math.cos(angle),
        y: CY + radius * Math.sin(angle),
      };
    });
  }, [rooms, workflowStatuses, now]);

  const counts = useMemo(() => {
    const active = nodes.filter((n) => n.active && !n.emergency && !n.paused).length;
    const free = nodes.filter((n) => !n.active && !n.emergency).length;
    const emerg = nodes.filter((n) => n.emergency).length;
    const soon = nodes.filter((n) => n.active && n.toFree !== null).sort((a, b) => (a.toFree as number) - (b.toFree as number))[0];
    return { active, free, emerg, soon };
  }, [nodes]);

  const sel = hover ? nodes.find((n) => n.id === hover) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="radar-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl"
          onClick={onClose} role="dialog" aria-modal="true" aria-label="Kruhový graf uvolnění"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-3xl overflow-hidden w-[min(97vw,1180px)] relative"
            style={{
              background: `radial-gradient(ellipse at 38% 42%, ${C.bgElevated} 0%, ${C.bgSurface} 70%, ${C.bgDeep} 100%)`,
              border: `1px solid ${C.borderStrong}`,
              boxShadow: `0 30px 80px -15px rgba(0,0,0,0.75), 0 0 70px ${C.accent}14, inset 0 1px 0 rgba(255,255,255,0.06)`,
              maxHeight: '94vh',
            }}
          >
            {/* Header */}
            <div className="px-7 pt-5 pb-2 flex items-start justify-between relative z-10">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${C.accent}18`, border: `1px solid ${C.accent}40` }}>
                    <Radar className="w-4 h-4" style={{ color: C.accent }} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Kruhový graf uvolnění</h2>
                </div>
                <p className="text-white/45 text-sm mt-1.5 uppercase tracking-[0.2em]">Blíž ke středu = dříve se uvolní · najeď myší pro detail</p>
              </div>
              <button onClick={onClose} aria-label="Zavřít" className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: C.glass, border: `1px solid ${C.border}` }}>
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-2 px-5 pb-6">
              {/* ── Graf ── */}
              <div className="flex-1 flex justify-center items-center min-w-0">
                <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[600px]" style={{ aspectRatio: '1' }}>
                  <defs>
                    <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor={C.accent} stopOpacity="0.08" />
                      <stop offset="100%" stopColor={C.accent} stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  <circle cx={CX} cy={CY} r={R_OUTER} fill="url(#radarGlow)" />

                  {/* Soustředné prstence */}
                  {[R_INNER, R_INNER + (R_OUTER - R_INNER) / 2, R_OUTER].map((r, i) => (
                    <circle key={i} cx={CX} cy={CY} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray={i === 2 ? '0' : '3 5'} />
                  ))}
                  {/* Radiální paprsky */}
                  {Array.from({ length: 12 }).map((_, i) => {
                    const a = (i / 12) * 2 * Math.PI;
                    return <line key={i} x1={CX} y1={CY} x2={CX + R_OUTER * Math.cos(a)} y2={CY + R_OUTER * Math.sin(a)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />;
                  })}
                  {/* Popisky prstenců */}
                  <text x={CX} y={CY - R_INNER - 5} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)" fontFamily="monospace">brzy</text>
                  <text x={CX} y={CY - R_OUTER + 14} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)" fontFamily="monospace">~3h / volné</text>

                  {/* Spojnice ke středu pro aktivní sály */}
                  {nodes.filter((n) => n.active).map((n) => (
                    <line key={`l-${n.id}`} x1={CX} y1={CY} x2={n.x} y2={n.y} stroke={hover === n.id ? `${n.color}66` : `${n.color}22`} strokeWidth={hover === n.id ? 1.6 : 1} />
                  ))}

                  {/* Orby sálů (statické) */}
                  {nodes.map((n) => {
                    const isH = hover === n.id;
                    return (
                      <g key={n.id} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
                        {n.emergency && (
                          <circle cx={n.x} cy={n.y} r={15} fill="none" stroke={n.color} strokeWidth="1.5" opacity="0.45" />
                        )}
                        {isH && (
                          <circle cx={n.x} cy={n.y} r={13} fill="none" stroke={n.color} strokeWidth="1.5" opacity="0.7" />
                        )}
                        <circle cx={n.x} cy={n.y} r={isH ? 9 : 6.5} fill={n.color} style={{ filter: `drop-shadow(0 0 6px ${n.color})` }} />
                        <circle cx={n.x} cy={n.y} r={isH ? 9 : 6.5} fill="none" stroke="rgba(255,255,255,0.88)" strokeWidth="1.5" />
                        <text x={n.x} y={n.y - 13} textAnchor="middle" fontSize="10" fontWeight="700" fill={isH ? '#fff' : 'rgba(255,255,255,0.82)'} style={{ pointerEvents: 'none' }}>
                          {n.name.length > 16 ? `${n.name.slice(0, 15)}…` : n.name}
                        </text>
                        {n.active && n.toFree !== null && (
                          <text x={n.x} y={n.y + 19} textAnchor="middle" fontSize="8.5" fill={n.color} fontFamily="monospace" style={{ pointerEvents: 'none' }}>
                            {Math.round(n.toFree)}m
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Středový hub */}
                  <circle cx={CX} cy={CY} r={R_INNER - 8} fill={C.bgDeep} stroke={`${C.accent}40`} strokeWidth="1.5" />
                  <text x={CX} y={CY - 5} textAnchor="middle" fontSize="24" fontWeight="900" fill={C.textHi} fontFamily="monospace">
                    {fmtT(currentTime)}
                  </text>
                  <text x={CX} y={CY + 14} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)" letterSpacing="2">VELÍN</text>
                </svg>
              </div>

              {/* ── Boční panel: detail / souhrn ── */}
              <div className="lg:w-[320px] flex-shrink-0 flex flex-col gap-3">
                {sel ? (
                  <div className="rounded-2xl p-5 flex-1" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${sel.color}35` }}>
                    {/* hlavička detailu */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: sel.color, boxShadow: `0 0 8px ${sel.color}` }} />
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-white truncate leading-tight">{sel.name}</p>
                        <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: sel.color }}>{sel.statusName}</p>
                      </div>
                    </div>

                    {/* příznaky */}
                    {(sel.room.isSeptic || sel.room.isEnhancedHygiene || sel.emergency || sel.paused) && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {sel.emergency && <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase" style={{ background: `${C.red}1f`, color: C.red, border: `1px solid ${C.red}40` }}>Nouze</span>}
                        {sel.paused && <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase" style={{ background: `${C.cyan}1f`, color: C.cyan, border: `1px solid ${C.cyan}40` }}>Pauza</span>}
                        {sel.room.isSeptic && <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase" style={{ background: `${C.purple}1f`, color: C.purple, border: `1px solid ${C.purple}40` }}>Septika</span>}
                        {sel.room.isEnhancedHygiene && <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase" style={{ background: `${C.blue}1f`, color: C.blue, border: `1px solid ${C.blue}40` }}>Zvýš. hygiena</span>}
                      </div>
                    )}

                    {/* časy */}
                    <div className="flex flex-col gap-2 mb-4">
                      <DetailRow icon={MapPin} label="Oddělení" value={sel.room.department || '—'} />
                      <DetailRow icon={Activity} label="Začátek" value={sel.room.operationStartedAt ? fmtT(new Date(sel.room.operationStartedAt)) : '—'} />
                      <DetailRow icon={Clock} label="Odhad konce" value={sel.room.estimatedEndTime ? fmtT(new Date(sel.room.estimatedEndTime)) : '—'} />
                      <DetailRow icon={Clock} label="Do uvolnění" value={sel.toFree !== null ? `${Math.round(sel.toFree)} min` : (sel.active ? '—' : 'volný')} valueColor={sel.toFree !== null && sel.toFree <= 15 ? C.green : undefined} />
                    </div>

                    {/* personál */}
                    <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-white/40 mb-2">Personál</p>
                    <div className="flex flex-col gap-2">
                      <StaffRow icon={Stethoscope} color={C.purple} role="Lékař" name={sel.room.staff?.doctor?.name} />
                      <StaffRow icon={Users} color={C.green} role="Sestra" name={sel.room.staff?.nurse?.name} />
                      <StaffRow icon={Syringe} color={C.blue} role="Anesteziolog" name={sel.room.staff?.anesthesiologist?.name} />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl p-5 flex-1 flex flex-col justify-center" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                    <p className="text-sm text-white/40 text-center mb-5">Najeď na sál pro kompletní detail.</p>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { label: 'Aktivní', value: counts.active, color: C.accent },
                        { label: 'Volné', value: counts.free, color: C.green },
                        { label: 'Nouze', value: counts.emerg, color: C.red },
                      ].map((m) => (
                        <div key={m.label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                          <p className="text-2xl font-black tabular-nums leading-none" style={{ color: m.color }}>{m.value}</p>
                          <p className="text-[9px] uppercase tracking-[0.18em] text-white/40 mt-1.5 font-semibold">{m.label}</p>
                        </div>
                      ))}
                    </div>
                    {counts.soon && (
                      <div className="rounded-xl p-3" style={{ background: `${C.green}10`, border: `1px solid ${C.green}28` }}>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-semibold mb-1">Příští uvolnění</p>
                        <p className="text-sm font-bold text-white">{counts.soon.name} · <span style={{ color: C.green }}>za {Math.round(counts.soon.toFree as number)} min</span></p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const DetailRow: React.FC<{ icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: string; valueColor?: string }> = ({ icon: Icon, label, value, valueColor }) => (
  <div className="flex items-center justify-between">
    <span className="flex items-center gap-2 text-[11px] text-white/45">
      <Icon className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
      {label}
    </span>
    <span className="text-sm font-semibold tabular-nums" style={{ color: valueColor || C.textHi }}>{value}</span>
  </div>
);

const StaffRow: React.FC<{ icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; role: string; name?: string }> = ({ icon: Icon, color, role, name }) => (
  <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}1c`, border: `1px solid ${color}35` }}>
      <Icon className="w-3.5 h-3.5" style={{ color }} />
    </div>
    <div className="min-w-0">
      <p className="text-[8px] uppercase tracking-[0.18em] text-white/40 font-semibold leading-none">{role}</p>
      <p className="text-xs font-semibold text-white truncate mt-0.5">{name || '—'}</p>
    </div>
  </div>
);

export default ORRadar;
