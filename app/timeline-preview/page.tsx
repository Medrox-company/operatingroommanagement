'use client';

/** DOČASNÁ náhledová stránka časové osy. Po schválení designu se smaže. */

import React from 'react';
import TimelineModule from '../../components/TimelineModule';
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

const SALY = [
  { name: 'Traumatologie 1', dep: 'Traumatologie', step: 3, doctor: 'MUDr. Novák' },
  { name: 'Ortopedie 2', dep: 'Ortopedie', step: 0, doctor: 'MUDr. Beneš' },
  { name: 'Neurochirurgie 1', dep: 'Neurochirurgie', step: 5, doctor: 'MUDr. Dvořák' },
  { name: 'Kardiochirurgie', dep: 'Kardiochirurgie', step: 3, doctor: 'MUDr. Svoboda' },
  { name: 'Cévní chirurgie', dep: 'Cévní chirurgie', step: 2, doctor: 'MUDr. Horák' },
  { name: 'Urologie 1', dep: 'Urologie', step: 6, doctor: 'MUDr. Marek' },
  { name: 'Gynekologie 2', dep: 'Gynekologie', step: 4, doctor: 'MUDr. Pokorná' },
  { name: 'Plastická chirurgie', dep: 'Plastická chirurgie', step: 0, doctor: 'MUDr. Kolář' },
];

function mockRooms(): OperatingRoom[] {
  // Provozní den začíná v 7:00. Po půlnoci jsme pořád ve včerejším okně,
  // takže náhled musí sáhnout na předchozí ráno — jinak je osa prázdná.
  const rano = new Date();
  if (rano.getHours() < 7) rano.setDate(rano.getDate() - 1);
  rano.setHours(7, 30, 0, 0);

  return SALY.map((s, i) => {
    const start = new Date(rano.getTime() + i * 11 * 60 * 1000);
    const phaseStart = new Date(Date.now() - (12 + i * 3) * 60 * 1000);

    const completed = Array.from({ length: 2 + (i % 2) }, (_, k) => {
      const opStart = new Date(start.getTime() + k * 225 * 60 * 1000);
      // Fáze mají svoji skutečnou délku, ne všechny stejně — jinak vyjde jako
      // převažující ta poslední a náhled klame.
      let offset = 0;
      const statusHistory = FAZE.map((f, fi) => {
        const zaznam = {
          stepIndex: fi,
          startedAt: new Date(opStart.getTime() + offset * 60 * 1000).toISOString(),
        };
        offset += Math.round(f.dur * (0.8 + ((i * 5 + k * 3 + fi) % 7) / 12));
        return zaznam;
      });
      const opEnd = new Date(opStart.getTime() + offset * 60 * 1000);
      return { startedAt: opStart.toISOString(), endedAt: opEnd.toISOString(), statusHistory };
    });

    return {
      id: `sal-${i}`,
      name: s.name,
      department: s.dep,
      status: 'available',
      currentStepIndex: s.step,
      queueCount: 0,
      operations24h: completed.length,
      phaseStartedAt: phaseStart.toISOString(),
      operationStartedAt: phaseStart.toISOString(),
      estimatedEndTime: new Date(Date.now() + (40 + i * 12) * 60 * 1000).toISOString(),
      isEmergency: i === 3,
      isLocked: i === 7,
      isSeptic: i === 5,
      isEnhancedHygiene: i === 2,
      staff: { doctor: { name: s.doctor }, nurse: { name: 'Sestra Malá' } },
      statusHistory: [],
      completedOperations: completed,
    } as unknown as OperatingRoom;
  });
}

export default function TimelinePreview() {
  const rooms = React.useMemo(mockRooms, []);
  return (
    <AuthProvider>
      <HospitalProvider>
        <RealtimeProvider>
          <WorkflowStatusesContext.Provider value={statusesValue as never}>
            <div className="fixed inset-0 overflow-hidden bg-[#070b12]">
              <TimelineModule rooms={rooms} onRefresh={() => {}} />
            </div>
          </WorkflowStatusesContext.Provider>
        </RealtimeProvider>
      </HospitalProvider>
    </AuthProvider>
  );
}
