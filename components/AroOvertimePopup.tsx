import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Stethoscope, User, AlertTriangle } from 'lucide-react';
import { OperatingRoom } from '../types';
import { C } from './timeline/constants';

/* ════════════════════════════════════════════════════════════════════════
   ARO Přesah — popup ve stejném čistém stylu jako detail sálu.
   Hlavní prvek: ANIMOVANÁ ČASOVÁ OSA PŘESAHŮ — pro každý sál jedna dráha,
   červená lišta roste od konce směny k odhadovanému konci operace.
   Plná část = už uplynulý přesah, šrafovaná část = očekávaný zbytek.
   ════════════════════════════════════════════════════════════════════════ */

interface AroOvertimeRoom {
  roomId: string;
  roomName: string;
  estimatedEndTime: Date;
  workingEndTime: Date;
  overtimeMinutes: number;
  enteredAt: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  overtimeRooms: AroOvertimeRoom[];
  roomsMap: Map<string, OperatingRoom>;
  currentTime: Date;
}

// Akcentní paleta (dle referenčního obrázku „Accent color")
const ACCENT_COLORS = [
  '#3B82F6', // modrá
  '#22C55E', // zelená
  '#FACC15', // žlutá
  '#F97316', // oranžová
  '#EF4444', // červená
  '#D946EF', // magenta
  '#8B5CF6', // fialová
  '#22D3EE', // cyan
];
const getColor = (i: number) => ACCENT_COLORS[i % ACCENT_COLORS.length];

const fmt = (d: Date) => d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
const fmtDur = (m: number) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
};

const AroOvertimePopup: React.FC<Props> = ({ isOpen, onClose, overtimeRooms, roomsMap, currentTime }) => {
  // Zavření klávesou Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const now = currentTime.getTime();

  // Okno osy: od nejdřívějšího konce směny po nejpozdější odhad konce (+ okraje)
  const { tStart, tEnd, markers, nowPos } = useMemo(() => {
    const ends = overtimeRooms.map((r) => r.workingEndTime.getTime());
    const ests = overtimeRooms.map((r) => r.estimatedEndTime.getTime());
    const minT = Math.min(...(ends.length ? ends : [now]), now);
    const maxT = Math.max(...(ests.length ? ests : [now]), now);
    const pad = Math.max(10 * 60 * 1000, (maxT - minT) * 0.06);
    const s = minT - pad;
    const e = maxT + pad;
    const range = Math.max(1, e - s);
    const pos = (t: number) => Math.max(0, Math.min(100, ((t - s) / range) * 100));

    // Půlhodinové značky
    const mk: { t: number; p: number }[] = [];
    const first = new Date(s);
    first.setMinutes(first.getMinutes() < 30 ? 30 : 60, 0, 0);
    for (let t = first.getTime(); t <= e; t += 30 * 60 * 1000) {
      mk.push({ t, p: pos(t) });
    }
    return { tStart: s, tEnd: e, markers: mk, nowPos: pos(now) };
  }, [overtimeRooms, now]);

  const pos = (t: number) => Math.max(0, Math.min(100, ((t - tStart) / Math.max(1, tEnd - tStart)) * 100));
  const totalOvertime = overtimeRooms.reduce((sum, r) => sum + r.overtimeMinutes, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="aro-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="ARO přesah"
        >
          <motion.div
            key="aro-panel"
            initial={{ scale: 0.94, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-3xl overflow-hidden w-[min(96vw,1280px)] relative"
            style={{
              background: `linear-gradient(180deg, ${C.bgElevated} 0%, ${C.bgSurface} 100%)`,
              border: `1px solid ${C.borderStrong}`,
              boxShadow: `0 30px 80px -15px rgba(0, 0, 0, 0.7), 0 0 60px ${C.red}10, inset 0 1px 0 rgba(255,255,255,0.06)`,
              maxHeight: '88vh',
            }}
          >
            {/* Ambient glow */}
            <div
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[200px] rounded-full pointer-events-none opacity-20"
              style={{ background: `radial-gradient(circle, ${C.red} 0%, transparent 70%)`, filter: 'blur(70px)' }}
            />

            {/* ── Header ── */}
            <div className="px-6 pt-5 pb-4 flex items-start justify-between relative z-10">
              <div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${C.red}18`, border: `1px solid ${C.red}40` }}
                  >
                    <AlertTriangle className="w-4 h-4" style={{ color: C.red }} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">ARO přesah</h2>
                  <span
                    className="px-3.5 py-1.5 rounded-full text-sm font-bold"
                    style={{ background: `${C.red}22`, color: C.red, border: `1px solid ${C.red}45` }}
                  >
                    {overtimeRooms.length} {overtimeRooms.length === 1 ? 'sál' : overtimeRooms.length < 5 ? 'sály' : 'sálů'} · +{fmtDur(totalOvertime)}
                  </span>
                </div>
                <p className="text-white/45 text-sm mt-1.5 uppercase tracking-[0.2em]">
                  Operace pokračující po konci provozní doby
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Zavřít"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ background: C.glass, border: `1px solid ${C.border}` }}
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="relative z-10 px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(88vh - 96px)' }}>
              {overtimeRooms.length === 0 ? (
                <div className="text-center py-10">
                  <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: C.green }} />
                  <p className="font-medium text-white/75">Žádný sál není v přesahu</p>
                </div>
              ) : (
                <>
                  {/* ── Animovaná časová osa přesahů ── */}
                  <div
                    className="rounded-2xl p-5 mb-5"
                    style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}
                  >
                    {/* Časové značky */}
                    <div className="relative h-5 mb-3" style={{ marginLeft: 190 }}>
                      {markers.map((m, i) => (
                        <span
                          key={i}
                          className="absolute -translate-x-1/2 text-[11px] font-mono tabular-nums text-white/45"
                          style={{ left: `${m.p}%` }}
                        >
                          {fmt(new Date(m.t))}
                        </span>
                      ))}
                    </div>

                    {/* Dráhy sálů */}
                    <div className="relative">
                      {/* Svislá mřížka značek + linka „nyní" přes všechny dráhy */}
                      <div className="absolute inset-y-0 pointer-events-none" style={{ left: 190, right: 0 }}>
                        {markers.map((m, i) => (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 w-px"
                            style={{ left: `${m.p}%`, background: 'rgba(255,255,255,0.05)' }}
                          />
                        ))}
                        {/* Nyní */}
                        <div className="absolute top-0 bottom-0 z-10" style={{ left: `${nowPos}%` }}>
                          <div className="absolute inset-y-0 w-[2px] -translate-x-1/2 rounded-full" style={{ background: C.accent }} />
                          <div
                            className="absolute -top-1 -translate-x-1/2 px-2 py-0.5 rounded-md text-[11px] font-bold"
                            style={{ background: C.accent, color: '#04222B' }}
                          >
                            {fmt(currentTime)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 pt-3">
                        {overtimeRooms.map((room, i) => {
                          const col = getColor(i);
                          const shiftEndP = pos(room.workingEndTime.getTime());
                          const estEndP = pos(room.estimatedEndTime.getTime());
                          const nowP = Math.max(shiftEndP, Math.min(nowPos, estEndP));
                          const elapsedW = Math.max(0, nowP - shiftEndP);
                          const futureW = Math.max(0, estEndP - nowP);
                          return (
                            <div key={room.roomId} className="flex items-center h-14">
                              {/* Štítek sálu */}
                              <div className="flex items-center gap-2.5 flex-shrink-0 pr-4" style={{ width: 190 }}>
                                <span
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                                  style={{ background: `${col}22`, color: col, border: `1.5px solid ${col}`, boxShadow: `0 0 8px ${col}50` }}
                                >
                                  {i + 1}
                                </span>
                                <span className="text-sm font-semibold text-white/90 truncate">{room.roomName}</span>
                              </div>
                              {/* Dráha */}
                              <div
                                className="relative flex-1 h-11 rounded-lg overflow-hidden"
                                style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.border}` }}
                              >
                                {/* Konec směny — přerušovaná značka */}
                                <div
                                  className="absolute top-0 bottom-0 w-px"
                                  style={{
                                    left: `${shiftEndP}%`,
                                    backgroundImage: `repeating-linear-gradient(to bottom, ${C.blue}90 0 3px, transparent 3px 6px)`,
                                  }}
                                  title={`Konec směny ${fmt(room.workingEndTime)}`}
                                />
                                {/* Uplynulý přesah — plná červená, roste animací */}
                                {elapsedW > 0 && (
                                  <motion.div
                                    className="absolute top-[22%] bottom-[22%] rounded-r-sm"
                                    style={{ left: `${shiftEndP}%`, background: `linear-gradient(180deg, ${col}e6 0%, ${col}99 100%)`, boxShadow: `0 0 10px ${col}40` }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${elapsedW}%` }}
                                    transition={{ duration: 0.7, delay: 0.25 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                                  />
                                )}
                                {/* Očekávaný zbytek — šrafovaný, navazuje animací */}
                                {futureW > 0 && (
                                  <motion.div
                                    className="absolute top-[22%] bottom-[22%] rounded-r-sm"
                                    style={{
                                      left: `${nowP}%`,
                                      background: `repeating-linear-gradient(135deg, ${col}55 0 5px, ${col}20 5px 10px)`,
                                      borderRight: `2px solid ${col}`,
                                    }}
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: `${futureW}%`, opacity: 1 }}
                                    transition={{ duration: 0.55, delay: 0.85 + i * 0.12, ease: 'easeOut' }}
                                  />
                                )}
                                {/* Štítek přesahu na konci lišty */}
                                <motion.span
                                  className="absolute top-1/2 -translate-y-1/2 text-xs font-bold font-mono tabular-nums px-1 rounded"
                                  style={{
                                    left: `calc(${estEndP}% + 6px)`,
                                    color: col,
                                  }}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 1.3 + i * 0.12 }}
                                >
                                  +{fmtDur(room.overtimeMinutes)}
                                </motion.span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Legenda */}
                    <div className="flex items-center gap-5 mt-4 text-[11px] text-white/50" style={{ marginLeft: 190 }}>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: C.accent }} /> Nyní
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-px" style={{ borderTop: `2px dashed ${C.blue}90` }} /> Konec směny
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2 rounded-sm" style={{ background: `linear-gradient(90deg, ${ACCENT_COLORS[0]}c0, ${ACCENT_COLORS[5]}c0)` }} /> Uplynulý přesah
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2 rounded-sm"
                          style={{ background: `repeating-linear-gradient(135deg, ${ACCENT_COLORS[0]}55 0 3px, ${ACCENT_COLORS[0]}20 3px 6px)` }}
                        /> Očekávaný zbytek (barva dle sálu)
                      </span>
                    </div>
                  </div>

                  {/* ── Kompaktní řádky detailů ── */}
                  <div className="flex flex-col gap-1.5">
                    {overtimeRooms.map((room, i) => {
                      const full = roomsMap.get(room.roomId);
                      const col = getColor(i);
                      const remaining = Math.max(0, Math.round((room.estimatedEndTime.getTime() - now) / 60000));
                      return (
                        <motion.div
                          key={room.roomId}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + i * 0.08 }}
                          className="flex items-center gap-4 rounded-xl px-4 py-3.5"
                          style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}
                        >
                          <span
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                            style={{ background: `${col}22`, color: col, border: `1.5px solid ${col}`, boxShadow: `0 0 8px ${col}50` }}
                          >
                            {i + 1}
                          </span>
                          <span className="text-base font-semibold text-white/95 flex-shrink-0 min-w-[130px] truncate">
                            {room.roomName}
                          </span>
                          <span className="text-sm font-mono tabular-nums text-white/55 flex-shrink-0">
                            směna {fmt(room.workingEndTime)} → odhad <span style={{ color: col }}>{fmt(room.estimatedEndTime)}</span>
                          </span>
                          <span className="flex-1" />
                          {full && (
                            <span className="hidden sm:flex items-center gap-4 text-xs text-white/60 min-w-0">
                              <span className="flex items-center gap-1 truncate">
                                <Stethoscope className="w-3 h-3 flex-shrink-0" style={{ color: C.purple }} />
                                {full.staff?.anesthesiologist?.name || full.staff?.doctor?.name || '—'}
                              </span>
                              <span className="flex items-center gap-1 truncate">
                                <User className="w-3 h-3 flex-shrink-0" style={{ color: C.green }} />
                                {full.staff?.nurse?.name || '—'}
                              </span>
                            </span>
                          )}
                          <span
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold flex-shrink-0"
                            style={{ background: `${col}15`, color: col, border: `1px solid ${col}35` }}
                          >
                            <Clock className="w-4 h-4" />
                            {remaining > 0 ? `ještě ${fmtDur(remaining)}` : 'dokončuje se'}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AroOvertimePopup;
