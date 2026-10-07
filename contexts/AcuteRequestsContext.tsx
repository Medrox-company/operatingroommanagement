'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  DEFAULT_URGENCY_WINDOWS,
  moveRequest,
  nextOrder,
  setUrgency as applyUrgency,
  summarize,
  type AcuteRequest,
  type AcuteSummary,
  type AcuteUrgency,
  type MoveReasonId,
  type UrgencyWindows,
} from '../lib/acute-requests';

/**
 * Prozatímní úložiště akutních požadavků — drží stav v paměti.
 *
 * ZÁMĚRNĚ bez databáze: první krok staví jen rozhraní. Druhý krok vymění
 * vnitřek tohoto souboru za tabulku `acute_requests` a realtime; typy ani
 * komponenty se přitom nezmění, protože celý modul sahá jen na tohle rozhraní.
 *
 * Co z toho plyne dnes: po obnovení stránky je fronta zpátky na ukázkových
 * datech. Je to vidět i v rozhraní, aby si toho nikdo nevšiml až v provozu.
 */

export interface AcuteRequestDraft {
  urgency: AcuteUrgency;
  procedure: string;
  departmentId: string;
  patientSurname: string;
  patientWard: string;
  estimatedMinutes: number;
  note?: string;
}

interface AcuteRequestsContextValue {
  requests: AcuteRequest[];
  summary: AcuteSummary;
  windows: UrgencyWindows;
  /** Dokud data nejsou v databázi, rozhraní to musí přiznat. */
  isDemoData: boolean;
  createRequest: (draft: AcuteRequestDraft) => void;
  moveToPosition: (id: string, toPosition: number, reason: MoveReasonId) => void;
  changeUrgency: (id: string, urgency: AcuteUrgency) => void;
  assignRoom: (id: string, roomId: string, plannedStartAt?: string) => void;
  cancelRequest: (id: string, reason: MoveReasonId) => void;
}

const AcuteRequestsContext = createContext<AcuteRequestsContextValue | null>(null);

/** Ukázková fronta. Příjmení jsou vymyšlená, žádná vazba na reálné pacienty. */
function seedRequests(): AcuteRequest[] {
  const now = Date.now();
  const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
  return [
    {
      id: 'demo-1',
      urgency: 'neodkladny',
      procedure: 'Revize pro krvácení',
      departmentId: 'demo-chirurgie',
      patientSurname: 'Konečná',
      patientWard: 'JIP 2',
      estimatedMinutes: 75,
      createdAt: minutesAgo(12),
      state: 'zadan',
      order: 1,
    },
    {
      id: 'demo-2',
      urgency: 'urgentni',
      procedure: 'Apendektomie',
      departmentId: 'demo-chirurgie',
      patientSurname: 'Marek',
      patientWard: '3B',
      estimatedMinutes: 60,
      createdAt: minutesAgo(95),
      state: 'zadan',
      order: 3,
      move: { reason: 'sal-obsazen', fromPosition: 2, toPosition: 3, at: minutesAgo(20) },
    },
    {
      id: 'demo-3',
      urgency: 'urgentni',
      procedure: 'Osteosyntéza bérce',
      departmentId: 'demo-traumatologie',
      patientSurname: 'Šimek',
      patientWard: '1A',
      estimatedMinutes: 120,
      createdAt: minutesAgo(140),
      state: 'zadan',
      order: 2,
    },
    {
      id: 'demo-4',
      urgency: 'odkladny',
      procedure: 'Cholecystektomie',
      departmentId: 'demo-chirurgie',
      patientSurname: 'Hrubá',
      patientWard: '3B',
      estimatedMinutes: 90,
      createdAt: minutesAgo(300),
      state: 'zadan',
      order: 4,
    },
  ];
}

export function AcuteRequestsProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<AcuteRequest[]>(seedRequests);
  const windows = DEFAULT_URGENCY_WINDOWS;

  const createRequest = useCallback((draft: AcuteRequestDraft) => {
    setRequests(previous => [
      ...previous,
      {
        ...draft,
        id: `req-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
        state: 'zadan',
        order: nextOrder(previous),
      },
    ]);
  }, []);

  const moveToPosition = useCallback((id: string, toPosition: number, reason: MoveReasonId) => {
    setRequests(previous => moveRequest(previous, id, toPosition, reason));
  }, []);

  const changeUrgency = useCallback((id: string, urgency: AcuteUrgency) => {
    setRequests(previous => applyUrgency(previous, id, urgency));
  }, []);

  const assignRoom = useCallback((id: string, roomId: string, plannedStartAt?: string) => {
    setRequests(previous => previous.map(request => (
      request.id === id
        ? { ...request, roomId, plannedStartAt: plannedStartAt ?? null, state: 'prevzat' as const }
        : request
    )));
  }, []);

  const cancelRequest = useCallback((id: string, reason: MoveReasonId) => {
    setRequests(previous => previous.map(request => (
      request.id === id
        ? { ...request, state: 'zrusen' as const, move: { reason, fromPosition: request.order, toPosition: request.order, at: new Date().toISOString() } }
        : request
    )));
  }, []);

  const summary = useMemo(() => summarize(requests, windows), [requests, windows]);

  const value = useMemo<AcuteRequestsContextValue>(() => ({
    requests,
    summary,
    windows,
    isDemoData: true,
    createRequest,
    moveToPosition,
    changeUrgency,
    assignRoom,
    cancelRequest,
  }), [requests, summary, windows, createRequest, moveToPosition, changeUrgency, assignRoom, cancelRequest]);

  return <AcuteRequestsContext.Provider value={value}>{children}</AcuteRequestsContext.Provider>;
}

export function useAcuteRequests(): AcuteRequestsContextValue {
  const context = useContext(AcuteRequestsContext);
  if (!context) throw new Error('useAcuteRequests musí být uvnitř AcuteRequestsProvider');
  return context;
}
