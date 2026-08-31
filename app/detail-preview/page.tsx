'use client';

/**
 * DOČASNÁ náhledová stránka — slouží jen k odsouhlasení vzhledu detailu sálu.
 * Po schválení se smaže.
 *
 * Fázi lze přepnout adresou: /detail-preview?f=3
 */

import React from 'react';
import { useSearchParams } from 'next/navigation';
import RoomDetail from '../../components/RoomDetail';
import { WorkflowStatusesProvider } from '../../contexts/WorkflowStatusesContext';
import { HospitalProvider } from '../../contexts/HospitalContext';
import { RealtimeProvider } from '../../contexts/RealtimeContext';
import { AuthProvider } from '../../contexts/AuthContext';
import type { OperatingRoom } from '../../types';

function Nahled() {
  const params = useSearchParams();
  const faze = Number(params.get('f') ?? 0);

  // ?w=1 vyvolá upozornění na krátký interval: příjezd na sál (krok 1)
  // a zahájení výkonu (krok 2) 2:38 od sebe.
  const chceVarovani = params.get('w') === '1';
  const ted = Date.now();

  const room = {
    id: 'nahled',
    name: 'Traumatologie - 1',
    department: 'Hlavní sál traumatologie',
    status: 'available',
    currentStepIndex: chceVarovani ? 2 : faze,
    queueCount: 0,
    operations24h: 0,
    phaseStartedAt: new Date(ted - 5 * 60 * 1000).toISOString(),
    operationStartedAt: chceVarovani ? new Date(ted - 158 * 1000).toISOString() : undefined,
    statusHistory: chceVarovani
      ? [
          { stepIndex: 1, startedAt: new Date(ted - 158 * 1000).toISOString() },
          { stepIndex: 2, startedAt: new Date(ted).toISOString() },
        ]
      : [],
    completedOperations: [],
  } as unknown as OperatingRoom;

  return (
    <RoomDetail
      room={room}
      allRooms={[room]}
      onClose={() => {}}
      onStepChange={() => {}}
      onEndTimeChange={() => {}}
    />
  );
}

export default function DetailPreviewPage() {
  return (
    <AuthProvider>
      <HospitalProvider>
        <RealtimeProvider>
          <WorkflowStatusesProvider>
            <React.Suspense fallback={null}>
              <Nahled />
            </React.Suspense>
          </WorkflowStatusesProvider>
        </RealtimeProvider>
      </HospitalProvider>
    </AuthProvider>
  );
}
