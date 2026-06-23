'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, X, Send, Loader2, Check } from 'lucide-react';
import { OperatingRoom } from '../types';

const ACCENT = '#22D3EE';

interface Props {
  rooms: OperatingRoom[];
  defaultRoomId?: string;
  onClose: () => void;
  onSend: (roomIds: string[], message: string) => Promise<void> | void;
}

const RoomNoticeComposer: React.FC<Props> = ({ rooms, defaultRoomId, onClose, onSend }) => {
  const sorted = [...rooms].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(defaultRoomId ? [defaultRoomId] : []));
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const allSelected = sorted.length > 0 && selected.size === sorted.length;
  const canSend = selected.size > 0 && message.trim().length > 0 && !sending;

  const toggleRoom = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => (prev.size === sorted.length ? new Set() : new Set(sorted.map((r) => r.id))));
  };

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await onSend([...selected], message.trim());
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-[calc(100vw-2rem)] max-w-lg rounded-3xl border border-white/10 p-6 overflow-hidden"
        style={{ background: 'rgba(13,19,32,0.98)', backdropFilter: 'blur(40px)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
      >
        <div aria-hidden className="absolute inset-x-10 top-0 h-[2px] rounded-full" style={{ background: `linear-gradient(to right, transparent, ${ACCENT}, transparent)` }} />
        <div aria-hidden className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full blur-[90px] pointer-events-none" style={{ backgroundColor: ACCENT, opacity: 0.14 }} />

        {/* Header */}
        <div className="relative flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="relative w-11 h-11 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}aa)`, boxShadow: `0 6px 16px -4px ${ACCENT}99` }}
            >
              <div aria-hidden className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 to-transparent opacity-50" />
              <Megaphone className="relative w-5 h-5 text-white drop-shadow" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">Zpráva na sál</h2>
              <p className="text-xs text-white/40 mt-0.5">Zobrazí se jako popup v detailu vybraných sálů</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative space-y-4">
          {/* Výběr sálů (více možností) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Operační sály {selected.size > 0 && <span style={{ color: ACCENT }}>· {selected.size}</span>}
              </label>
              <button
                onClick={toggleAll}
                className="text-[11px] font-semibold text-white/50 hover:text-white transition-colors"
              >
                {allSelected ? 'Zrušit výběr' : 'Vybrat vše'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-0.5">
              {sorted.map((r) => {
                const on = selected.has(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => toggleRoom(r.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-colors"
                    style={{
                      background: on ? `${ACCENT}1f` : 'rgba(255,255,255,0.04)',
                      borderColor: on ? `${ACCENT}55` : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: on ? ACCENT : 'transparent', border: on ? 'none' : '1px solid rgba(255,255,255,0.25)' }}
                    >
                      {on && <Check className="w-3 h-3 text-[#06121c]" strokeWidth={3} />}
                    </span>
                    <span className={`text-sm font-medium leading-tight break-words ${on ? 'text-white' : 'text-white/70'}`}>{r.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Zpráva */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-1.5">Zpráva</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Napište informační zprávu pro daný sál…"
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors resize-none leading-relaxed"
            />
            <div className="mt-1 text-right text-[10px] text-white/30 tabular-nums">{message.length}/500</div>
          </div>
        </div>

        {/* Patička */}
        <div className="relative mt-5 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white/80 transition-colors"
          >
            Zrušit
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="px-5 py-2.5 text-sm font-bold rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
            style={{ background: ACCENT, boxShadow: `0 8px 20px -6px ${ACCENT}88` }}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Odeslat
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default RoomNoticeComposer;
