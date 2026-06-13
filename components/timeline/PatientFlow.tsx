import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Workflow, Phone, BedDouble, Activity, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { OperatingRoom } from '../../types';
import { useWorkflowStatusesContext } from '../../contexts/WorkflowStatusesContext';
import { C } from './constants';

/* ════════════════════════════════════════════════════════════════════════
   TOK PACIENTA — pipeline napříč celým operačním traktem.

   Sleduje, KDE se pacienti právě nacházejí na cestě výkonem:
   Volán → V op. traktu → Operace → Úklid/závěr → Sál volný.
   Mezi fázemi proudí animovaná spojnice. Okamžitě odhalí, kde tok vázne
   (např. hodně „Volán", ale málo „V traktu" = problém s transportem).
   ════════════════════════════════════════════════════════════════════════ */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rooms: OperatingRoom[];
  onSelectRoom?: (id: string) => void;
}

type StageKey = 'called' | 'inTract' | 'operating' | 'closing' | 'free';
interface StageDef { key: StageKey; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; hint: string; }

const STAGES: StageDef[] = [
  { key: 'called',    label: 'Volán',       icon: Phone,        color: '#38BDF8', hint: 'Pacient zavolán, ještě nedorazil' },
  { key: 'inTract',   label: 'V traktu',    icon: BedDouble,    color: '#22D3EE', hint: 'Pacient v operačním traktu, čeká na sál' },
  { key: 'operating', label: 'Operace',     icon: Activity,     color: '#A78BFA', hint: 'Probíhá výkon na sále' },
  { key: 'closing',   label: 'Závěr/úklid', icon: Sparkles,     color: '#FBBF24', hint: 'Dokončování a úklid sálu' },
  { key: 'free',      label: 'Sál volný',   icon: CheckCircle2, color: '#34D399', hint: 'Sál je připraven pro dalšího pacienta' },
];

const PatientFlow: React.FC<Props> = ({ isOpen, onClose, rooms, onSelectRoom }) => {
  const { workflowStatuses } = useWorkflowStatusesContext();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const buckets = useMemo(() => {
    const total = workflowStatuses.length || 1;
    const map: Record<StageKey, { id: string; name: string }[]> = {
      called: [], inTract: [], operating: [], closing: [], free: [],
    };
    rooms.filter((r) => !r.isLocked).forEach((r) => {
      const idx = r.currentStepIndex;
      const isFree = idx <= 0 || idx >= total - 1;
      const isClosing = total >= 2 && idx === total - 2;
      const isOperating = idx > 0 && !!r.operationStartedAt && !isClosing;
      let key: StageKey;
      if (r.patientCalledAt && !r.patientArrivedAt) key = 'called';
      else if (r.patientArrivedAt && !r.operationStartedAt) key = 'inTract';
      else if (isOperating) key = 'operating';
      else if (isClosing) key = 'closing';
      else if (isFree) key = 'free';
      else key = 'operating';
      map[key].push({ id: r.id, name: r.name });
    });
    return map;
  }, [rooms, workflowStatuses]);

  const inFlow = buckets.called.length + buckets.inTract.length + buckets.operating.length + buckets.closing.length;
  // Úzké hrdlo: stupeň (mimo „volný") s nejvíc sály
  const bottleneck = useMemo(() => {
    const flowStages = STAGES.filter((s) => s.key !== 'free');
    let best: StageDef | null = null; let bestN = 1;
    flowStages.forEach((s) => { const n = buckets[s.key].length; if (n > bestN) { bestN = n; best = s; } });
    return best;
  }, [buckets]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="pf-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl"
          onClick={onClose} role="dialog" aria-modal="true" aria-label="Tok pacienta"
        >
          <motion.div
            key="pf-panel"
            initial={{ scale: 0.94, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-3xl overflow-hidden w-[min(97vw,1200px)] relative"
            style={{
              background: `linear-gradient(180deg, ${C.bgElevated} 0%, ${C.bgSurface} 100%)`,
              border: `1px solid ${C.borderStrong}`,
              boxShadow: `0 30px 80px -15px rgba(0,0,0,0.7), 0 0 60px ${C.accent}10, inset 0 1px 0 rgba(255,255,255,0.06)`,
              maxHeight: '92vh',
            }}
          >
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[440px] h-[200px] rounded-full pointer-events-none opacity-20"
              style={{ background: `radial-gradient(circle, ${C.accent} 0%, transparent 70%)`, filter: 'blur(70px)' }} />

            {/* Header */}
            <div className="px-6 pt-5 pb-4 flex items-start justify-between relative z-10">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${C.accent}18`, border: `1px solid ${C.accent}40` }}>
                    <Workflow className="w-4 h-4" style={{ color: C.accent }} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Tok pacienta</h2>
                  <span className="px-3.5 py-1.5 rounded-full text-sm font-bold" style={{ background: `${C.accent}1c`, color: C.accent, border: `1px solid ${C.accent}40` }}>
                    {inFlow} {inFlow === 1 ? 'pacient' : inFlow >= 2 && inFlow <= 4 ? 'pacienti' : 'pacientů'} v traktu
                  </span>
                </div>
                <p className="text-white/45 text-sm mt-1.5 uppercase tracking-[0.2em]">Cesta výkonem napříč celým traktem</p>
              </div>
              <button onClick={onClose} aria-label="Zavřít" className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: C.glass, border: `1px solid ${C.border}` }}>
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="relative z-10 px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 96px)' }}>
              {/* Pipeline */}
              <div className="flex items-stretch gap-0 mb-4">
                {STAGES.map((stage, si) => {
                  const list = buckets[stage.key];
                  const isBottleneck = bottleneck?.key === stage.key;
                  return (
                    <React.Fragment key={stage.key}>
                      {/* Stupeň */}
                      <motion.div
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.08 }}
                        className="flex-1 min-w-0 rounded-2xl p-4 flex flex-col"
                        style={{
                          background: isBottleneck ? `${stage.color}12` : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isBottleneck ? `${stage.color}45` : C.border}`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${stage.color}1c`, border: `1px solid ${stage.color}40` }} title={stage.hint}>
                            <stage.icon className="w-4 h-4" style={{ color: stage.color }} />
                          </div>
                          <motion.span
                            key={list.length}
                            initial={{ scale: 1.3, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }}
                            className="text-2xl font-black tabular-nums leading-none"
                            style={{ color: list.length ? stage.color : 'rgba(255,255,255,0.25)' }}
                          >
                            {list.length}
                          </motion.span>
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/45 mb-3">{stage.label}</p>
                        <div className="flex flex-col gap-1.5">
                          {list.map((r) => (
                            <button
                              key={r.id}
                              onClick={() => onSelectRoom?.(r.id)}
                              className="text-left text-[11px] font-semibold text-white/80 truncate rounded-lg px-2 py-1.5 transition-colors hover:text-white"
                              style={{ background: `${stage.color}10`, border: `1px solid ${stage.color}22` }}
                            >
                              {r.name}
                            </button>
                          ))}
                          {list.length === 0 && (
                            <span className="text-[10px] text-white/20 px-1">—</span>
                          )}
                        </div>
                      </motion.div>

                      {/* Spojnice mezi stupni — animovaný proud */}
                      {si < STAGES.length - 1 && (
                        <div className="flex items-center justify-center px-1.5 flex-shrink-0" style={{ width: 28 }}>
                          <svg width="28" height="14" viewBox="0 0 28 14" className="overflow-visible">
                            <line x1="0" y1="7" x2="22" y2="7" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
                            <line x1="0" y1="7" x2="22" y2="7" stroke={stage.color} strokeWidth="2" className="pf-flow-line" opacity="0.8" />
                            <path d="M21 3 L27 7 L21 11" fill="none" stroke={STAGES[si + 1].color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Vyhodnocení toku */}
              <div className="rounded-2xl p-4 flex items-center gap-3"
                style={{
                  background: bottleneck ? `${bottleneck.color}0e` : `${C.green}10`,
                  border: `1px solid ${bottleneck ? `${bottleneck.color}30` : `${C.green}30`}`,
                }}
              >
                {bottleneck
                  ? <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: bottleneck.color }} />
                  : <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: C.green }} />}
                <p className="text-sm text-white/85">
                  {inFlow === 0
                    ? 'V traktu nejsou žádní pacienti — tok je prázdný.'
                    : bottleneck
                      ? <>Nejvíc pacientů uvízlo ve fázi <span className="font-bold" style={{ color: bottleneck.color }}>{bottleneck.label}</span> ({buckets[bottleneck.key].length}). {bottleneck.key === 'called' ? 'Zkontroluj transport pacientů.' : bottleneck.key === 'inTract' ? 'Sály se možná neuvolňují dost rychle.' : bottleneck.key === 'closing' ? 'Možný nápor na úklidové kapacity.' : 'Sleduj průběh operací.'}</>
                      : 'Tok pacientů je rovnoměrný — bez výrazného hrdla.'}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PatientFlow;
