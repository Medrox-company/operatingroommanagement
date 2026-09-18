'use client';
import React from 'react';
import '../globals.css';
import '../../components/mobile/mobile-shell.css';
import '../../components/mobile/mobile-overview.css';
import '../../components/mobile/mobile-room-detail.css';
import StepConfirmationOverlay from '../../components/StepConfirmationOverlay';
const STATUSES = [
  { id: '1', name: 'Sál připraven', color: '#22D3EE', order_index: 0, default_duration_minutes: 10 },
  { id: '4', name: 'Ukončení výkonu', color: '#F59E0B', order_index: 3, default_duration_minutes: 10 },
  { id: '5', name: 'Odjezd ze sálu', color: '#10B981', order_index: 4, default_duration_minutes: 10 },
];
export default function P() {
  return (
    <div className="m-dark" style={{ display: 'flex', gap: 16, padding: 16, background: '#02061a', minHeight: '100vh' }}>
      {/* vlevo: běžná obrazovka aplikace pro porovnání pozadí */}
      <div className="mobile-theme-surface" style={{ width: 226, height: 600, borderRadius: 18, border: '1px solid rgba(255,255,255,.12)', padding: 14 }}>
        <p style={{ color: '#9fb3d9', fontSize: 11, margin: 0 }}>běžná obrazovka</p>
        <div className="m-unified-card" style={{ marginTop: 12, padding: 14 }}>
          <strong className="m-unified-card-title">TRAUMATOLOGIE - 1</strong>
        </div>
      </div>
      {[{ el: 0, label: 's varováním' }, { el: 900, label: 'bez varování' }].map(v => (
        <div key={v.label} className="mobile-room-detail mobile-room-reference"
          style={{ position: 'relative', width: 226, height: 600, overflow: 'hidden', borderRadius: 18, border: '1px solid rgba(255,255,255,.12)' }}>
          <StepConfirmationOverlay pendingStepIndex={2} activeDbStatuses={STATUSES} safeStepIndex={1} validStepCount={3}
            elapsedSeconds={v.el} onConfirm={() => {}} onCancel={() => {}} />
        </div>
      ))}
    </div>
  );
}
