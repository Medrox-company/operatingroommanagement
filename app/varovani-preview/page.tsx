'use client';

/** DOČASNÁ náhledová stránka upozornění na krátký interval. Po schválení se smaže. */

import React from 'react';
import { RapidSurgeryWarning } from '../../components/room/RapidSurgeryWarning';
import type { OperatingRoom } from '../../types';

const statuses = [
  { id: '1', name: 'Sál připraven', title: 'Sál připraven', color: '#22D3EE', accent_color: '#22D3EE', order_index: 0, sort_order: 0 },
  { id: '2', name: 'Příjezd na sál', title: 'Příjezd na sál', color: '#7C3AED', accent_color: '#7C3AED', order_index: 1, sort_order: 1 },
  { id: '3', name: 'Chirurgický výkon', title: 'Chirurgický výkon', color: '#B3004D', accent_color: '#B3004D', order_index: 2, sort_order: 2 },
] as never[];

export default function VarovaniPreview() {
  const ted = Date.now();
  const room = {
    id: 'nahled',
    name: 'Traumatologie 1',
    currentStepIndex: 2,
    phaseStartedAt: new Date(ted).toISOString(),
    operationStartedAt: new Date(ted - 158 * 1000).toISOString(),
    statusHistory: [
      { stepIndex: 1, startedAt: new Date(ted - 158 * 1000).toISOString() },
      { stepIndex: 2, startedAt: new Date(ted).toISOString() },
    ],
    completedOperations: [],
  } as unknown as OperatingRoom;

  return (
    <div className="fixed inset-0 overflow-auto bg-[#05070c] p-10">
      <RapidSurgeryWarning room={room} statuses={statuses} variant="mobile" />
      <div className="mx-auto mt-6 max-w-[560px]">
        <RapidSurgeryWarning room={room} statuses={statuses} variant="desktop" />
      </div>
    </div>
  );
}
