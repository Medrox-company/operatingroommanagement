'use client';

/** DOČASNÁ náhledová stránka popupu detailu sálu. Po schválení se smaže. */

import React from 'react';
import RoomDetailPopup from '../../components/timeline/RoomDetailPopup';
import WorkflowStatusesContext from '../../contexts/WorkflowStatusesContext';
import { HospitalProvider } from '../../contexts/HospitalContext';
import { RealtimeProvider } from '../../contexts/RealtimeContext';
import { AuthProvider } from '../../contexts/AuthContext';
import type { OperatingRoom } from '../../types';

const FAZE = [
  { name: 'Sál připraven', color: '#22D3EE', dur: 10 },
  { name: 'Příjezd na sál', color: '#7C3AED', dur: 12 },
  { name: 'Příprava pacienta', color: '#3B82F6', dur: 18 },
  { name: 'Chirurgický výkon', color: '#B3004D', dur: 95 },
  { name: 'Probuzení', color: '#10B981', dur: 20 },
  { name: 'Odjezd ze sálu', color: '#F59E0B', dur: 10 },
  { name: 'Úklid sálu', color: '#94A3B8', dur: 16 },
];

const statuses = FAZE.map((f, i) => ({
  id: String(i + 1),
  name: f.name,
  title: f.name,
  description: null,
  order_index: i,
  sort_order: i,
  color: f.color,
  accent_color: f.color,
  is_active: true,
  count_in_statistics: true,
  include_in_statistics: true,
  default_duration: f.dur,
  default_duration_minutes: f.dur,
  show_in_timeline: true,
  show_in_room_detail: true,
  is_special: false,
  special_type: null,
  organizer: '',
  status: 'active',
}));

const statusesValue = {
  statuses,
  activeStatuses: statuses,
  workflowStatuses: statuses,
  statisticsStatuses: statuses,
  loading: false,
  error: null,
  updateStatus: async () => {},
  getStatusByIndex: (i: number) => statuses[i],
  getStatusColor: (i: number) => statuses[i]?.color ?? '#6B7280',
  refreshStatuses: async () => {},
};

function mockRoom(): OperatingRoom {
  const ted = Date.now();
  let offset = 0;
  const opStart = new Date(ted - 175 * 60 * 1000);
  const statusHistory = FAZE.slice(0, 4).map((f, fi) => {
    const zaznam = {
      stepIndex: fi,
      startedAt: new Date(opStart.getTime() + offset * 60 * 1000).toISOString(),
    };
    offset += f.dur;
    return zaznam;
  });

  return {
    id: 'sal-nahled',
    name: 'Traumatologie 1',
    department: 'Traumatologie',
    status: 'active',
    currentStepIndex: 3,
    queueCount: 0,
    operations24h: 3,
    phaseStartedAt: new Date(ted - 135 * 60 * 1000).toISOString(),
    operationStartedAt: opStart.toISOString(),
    estimatedEndTime: new Date(ted + 55 * 60 * 1000).toISOString(),
    staff: { doctor: { name: 'MUDr. Novák' }, nurse: { name: 'Sestra Malá' } },
    statusHistory,
    completedOperations: [],
  } as unknown as OperatingRoom;
}

export default function PopupPreview() {
  const room = React.useMemo(mockRoom, []);
  return (
    <AuthProvider>
      <HospitalProvider>
        <RealtimeProvider>
          <WorkflowStatusesContext.Provider value={statusesValue as never}>
            <div className="fixed inset-0 overflow-hidden bg-[#05070c]">
              <RoomDetailPopup room={room} onClose={() => {}} currentTime={new Date()} />
            </div>
          </WorkflowStatusesContext.Provider>
        </RealtimeProvider>
      </HospitalProvider>
    </AuthProvider>
  );
}
