'use client';

import React, { useEffect, useId, useRef } from 'react';
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
  const closeRef = useRef(onClose);
  const titleId = useId();
  const phaseId = useId();
  closeRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
    };
    document.addEventListener('keydown', onKeyDown);
    // Fokus do dialogu, aby čtečka i klávesnice skončily uvnitř nabídky.
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const keepFocusInside = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
    if (buttons.length === 0) { event.preventDefault(); return; }
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  };

  return (
    <div className="mrq-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={phaseId}
        tabIndex={-1}
        className="mrq-dialog"
        onClick={event => event.stopPropagation()}
        onKeyDown={keepFocusInside}
      >
        <p className="mrq-kicker">Rychlé akce</p>
        <h2 id={titleId} className="mrq-title room-name-nobreak">{room.name}</h2>
        <p id={phaseId} className="mrq-phase">
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
