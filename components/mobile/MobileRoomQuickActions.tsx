'use client';

import React, { useEffect, useRef } from 'react';
import { AlertCircle, ArrowRight, Lock, Unlock } from 'lucide-react';
import type { OperatingRoom } from '../../types';

interface MobileRoomQuickActionsProps {
  room: OperatingRoom;
  phaseTitle: string;
  phaseColor: string;
  onEmergency: () => void;
  onLock: () => void;
  onOpenDetail: () => void;
  onClose: () => void;
}

/**
 * Nabídka po dlouhém stisku karty sálu. Nahradila dvě ikony přímo v kartě —
 * na dlaždici širokou 145 px zabíraly místo, které patří názvu a fázi, a daly
 * se snadno trefit omylem. Dlouhý stisk je navíc pojistka: stav nouze ani
 * uzamčení sálu se nedají vyvolat jedním nechtěným ťuknutím.
 */
export default function MobileRoomQuickActions({
  room,
  phaseTitle,
  phaseColor,
  onEmergency,
  onLock,
  onOpenDetail,
  onClose,
}: MobileRoomQuickActionsProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    // Fokus do dialogu, aby čtečka i klávesnice skončily uvnitř nabídky.
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="mrq-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mrq-title"
        tabIndex={-1}
        className="mrq-dialog"
        onClick={event => event.stopPropagation()}
      >
        <p className="mrq-kicker">Rychlé akce</p>
        <h2 id="mrq-title" className="mrq-title room-name-nobreak">{room.name}</h2>
        <p className="mrq-phase">
          <i style={{ background: phaseColor }} aria-hidden />
          {phaseTitle}
        </p>

        <div className="mrq-actions">
          <button
            type="button"
            className="mrq-box mrq-box--emergency"
            data-active={room.isEmergency || undefined}
            onClick={() => { onEmergency(); onClose(); }}
          >
            <span className="mrq-box-icon" aria-hidden><AlertCircle /></span>
            <span className="mrq-box-label">{room.isEmergency ? 'Zrušit stav nouze' : 'Stav nouze'}</span>
          </button>
          <button
            type="button"
            className="mrq-box mrq-box--lock"
            data-active={room.isLocked || undefined}
            onClick={() => { onLock(); onClose(); }}
          >
            <span className="mrq-box-icon" aria-hidden>{room.isLocked ? <Unlock /> : <Lock />}</span>
            <span className="mrq-box-label">{room.isLocked ? 'Odemknout sál' : 'Uzamknout sál'}</span>
          </button>
        </div>

        <button type="button" className="mrq-detail" onClick={() => { onOpenDetail(); onClose(); }}>
          Otevřít detail sálu
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </button>
        <button type="button" className="mrq-close" onClick={onClose}>Zavřít</button>
      </div>
    </div>
  );
}
