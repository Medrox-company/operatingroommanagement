'use client';

/** DOČASNÁ náhledová stránka potvrzovacího okna. Po schválení se smaže. */

import React from 'react';
import StepConfirmationOverlay from '../../components/StepConfirmationOverlay';
import '../../components/mobile/mobile-room-detail.css';

const statuses = [
  { id: '1', name: 'Sál připraven', color: '#3b82f6', order_index: 0, default_duration_minutes: 10 },
  { id: '2', name: 'Příjezd na sál', color: '#7c3aed', order_index: 1, default_duration_minutes: 12 },
  { id: '3', name: 'Chirurgický výkon', color: '#b3004d', order_index: 2, default_duration_minutes: 90 },
  { id: '4', name: 'Úklid sálu', color: '#f59e0b', order_index: 3, default_duration_minutes: 15 },
];

export default function Nahled() {
  // ?svetla=1 přepne náhled do světlého motivu (kontrola čitelnosti popisků).
  React.useEffect(() => {
    if (new URLSearchParams(window.location.search).has('svetla')) {
      document.documentElement.classList.remove('m-dark');
    }
  }, []);

  return (
    <div className="mobile-room-detail mobile-room-reference fixed inset-0 overflow-hidden">
      <StepConfirmationOverlay
        pendingStepIndex={3}
        activeDbStatuses={statuses}
        safeStepIndex={1}
        validStepCount={4}
        elapsedSeconds={600}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    </div>
  );
}
