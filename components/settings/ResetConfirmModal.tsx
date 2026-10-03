'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, Loader2, Trash2 } from 'lucide-react';
// ============================================================================
// Reset confirmation modal
// ============================================================================

export interface ResetConfirmModalProps {
  mode: 'operational' | 'full';
  confirmText: string;
  onConfirmTextChange: (v: string) => void;
  loading: boolean;
  result: { success: boolean; message: string } | null;
  onConfirm: () => void;
  onClose: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  mode,
  confirmText,
  onConfirmTextChange,
  loading,
  result,
  onConfirm,
  onClose,
}) => {
  const isFull = mode === 'full';
  const accent = isFull ? '#EF4444' : '#F59E0B';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="staff-picker-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="staff-picker-dialog w-full max-w-md rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `${accent}20` }}
          >
            <AlertTriangle className="w-6 h-6" style={{ color: accent }} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {isFull ? 'Kompletní reset databáze' : 'Smazání provozních dat'}
            </h3>
            <p className="text-xs text-white/40">Tuto akci nelze vrátit</p>
          </div>
        </div>

        <p className="text-sm text-white/60 leading-relaxed mb-4">
          {isFull
            ? 'Sma��ete veškerá data kromě uživatelských účtů. Opravdu pokračovat?'
            : 'Smažete historii, rozpisy a notifikace. Konfigurace zůstane zachována. Opravdu pokračovat?'}
        </p>

        <label className="mb-2 block text-[8px] font-bold uppercase tracking-[0.16em] text-white/38">
          Pro potvrzení zadejte přesně: <span className="text-white">SMAZAT DATA</span>
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={e => onConfirmTextChange(e.target.value)}
          disabled={loading || !!result?.success}
          placeholder="SMAZAT DATA"
          className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none transition-all disabled:opacity-50 font-mono tracking-widest"
          style={{ borderColor: confirmText === 'SMAZAT DATA' ? accent : undefined }}
        />

        {result && !result.success && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>{result.message}</span>
          </div>
        )}

        {result?.success && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
            <Check className="w-4 h-4" />
            <span>{result.message}</span>
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {result?.success ? 'Zavřít' : 'Zrušit'}
          </button>
          {!result?.success && (
            <button
              onClick={onConfirm}
              disabled={loading || confirmText !== 'SMAZAT DATA'}
              className="flex-1 py-3 rounded-xl text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: accent }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>Smazat nyní</span>
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
