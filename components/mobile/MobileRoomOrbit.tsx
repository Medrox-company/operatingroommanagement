import React from 'react';
import {
  AlertTriangle, BedSingle, Broom, CircleHelp, ClipboardCheck, ClipboardList,
  HandHelping, HeartPulse, Lock, LogIn, LogOut, Pause, Syringe,
} from 'lucide-react';
import type { OperatingRoom } from '../../types';
import {
  mobileRoomPhaseVisual,
  type MobileRoomPhaseVisualKind,
  type MobileRoomPhaseVisualStatus,
} from '../../lib/mobile-room-phase-visual';
import './mobile-room-card-orbit.css';

interface MobileRoomOrbitProps {
  room: OperatingRoom;
  statuses: readonly MobileRoomPhaseVisualStatus[];
  /** The existing overview's clinical title, including emergency/lock/pause. */
  title: string;
}

const PHASE_ICONS = {
  arrival: BedSingle,
  anesthesia: Syringe,
  'anesthesia-end': HeartPulse,
  'surgery-end': ClipboardCheck,
  departure: BedSingle,
  handover: HandHelping,
  cleaning: Broom,
  documentation: ClipboardList,
  unknown: CircleHelp,
} satisfies Partial<Record<MobileRoomPhaseVisualKind, typeof BedSingle>>;

/** Passive phase icon and title inside the existing room-card button. */
export default function MobileRoomOrbit({ room, statuses, title }: MobileRoomOrbitProps) {
  const index = room.currentStepIndex;
  const indexedStatus = Number.isInteger(index) && index >= 0 && index < statuses.length
    ? statuses[index]
    : undefined;
  const hasCurrentPhase = Boolean(indexedStatus && (indexedStatus.title?.trim() || indexedStatus.name?.trim()));
  const phase = mobileRoomPhaseVisual(hasCurrentPhase ? indexedStatus : undefined);
  const PhaseIcon = PHASE_ICONS[phase.kind as keyof typeof PHASE_ICONS] ?? CircleHelp;
  // State precedence is separate from workflow identity, never a phase-name or
  // index mapping. Its configured color remains the actual phase.
  const StateIcon = room.isEmergency ? AlertTriangle : room.isLocked ? Lock : room.isPaused ? Pause : null;
  const state = room.isEmergency ? 'emergency' : room.isLocked ? 'locked' : room.isPaused ? 'paused' : 'phase';

  return (
    <span
      className="mro-orbit"
      style={{ '--mro-orbit-phase-color': phase.color } as React.CSSProperties}
      data-phase-icon={phase.kind}
      data-phase-count={statuses.length}
      data-phase-valid={hasCurrentPhase ? 'true' : 'false'}
      data-orbit-state={state}
    >
      <span className="mro-orbit-center">
        <span className="mro-orbit-icon" aria-hidden="true">
          {StateIcon ? <StateIcon /> : <>
            {phase.kind === 'ready' || phase.kind === 'preparation'
              ? <span className="mro-orbit-mask mro-orbit-mask--table" />
              : phase.kind === 'surgery'
                ? <span className="mro-orbit-mask mro-orbit-mask--scalpel" />
                : <PhaseIcon />}
            {phase.kind === 'arrival' && <LogIn className="mro-orbit-direction" />}
            {phase.kind === 'departure' && <LogOut className="mro-orbit-direction" />}
          </>}
        </span>
        <span className="mro-orbit-title">{title}</span>
      </span>
    </span>
  );
}
