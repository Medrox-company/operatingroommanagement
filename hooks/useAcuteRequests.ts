'use client';

import { useCallback, useRef, useState } from 'react';
import useSWR from 'swr';
import { useHospital } from '../contexts/HospitalContext';
import { useAuth } from '../contexts/AuthContext';
import type { AcuteRequest, AcuteRequestInput, AcuteRequestEvent } from '../lib/acute-requests';
export type { AcuteRequestEvent } from '../lib/acute-requests';

export interface AcuteRequestsSnapshot {
  requests: AcuteRequest[];
  events: AcuteRequestEvent[];
  revision: number;
  canManage: boolean;
  historyLimited: boolean;
}

export type AcuteRequestCommand =
  | { action: 'create'; input: AcuteRequestInput }
  | { action: 'update'; requestId: string; input: AcuteRequestInput; reason: string }
  | { action: 'acknowledge'; requestId: string }
  | { action: 'reorder'; orderedIds: string[]; reason: string }
  | { action: 'cancel' | 'complete'; requestId: string; reason: string };

export interface AcuteRequestsController extends AcuteRequestsSnapshot {
  /** Changes remount open dialogs so a draft cannot be submitted to another facility. */
  scopeId?: string;
  loading: boolean;
  busy: boolean;
  error: string | null;
  errorCode: string | null;
  refresh: () => Promise<unknown>;
  execute: (command: AcuteRequestCommand, expectedRevision?: number) => Promise<AcuteRequestsSnapshot>;
}

class AcuteApiError extends Error {
  constructor(message: string, public code: string | null, public status: number) { super(message); }
}

async function readResponse(response: Response, expectedHospitalId: string): Promise<AcuteRequestsSnapshot> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new AcuteApiError(payload.error || 'Akutní požadavky se nepodařilo načíst.', payload.code ?? null, response.status);
  if (!Array.isArray(payload.requests) || !Array.isArray(payload.events) || !Number.isSafeInteger(payload.revision)) {
    throw new AcuteApiError('Server nevrátil platný přehled akutních požadavků.', 'INVALID_RESPONSE', response.status);
  }
  if (payload.requests.some((request: AcuteRequest) => request.hospitalId !== expectedHospitalId)) {
    throw new AcuteApiError('Přehled nepatří vybranému zařízení. Obnovte stránku.', 'ACUTE_SCOPE_CHANGED', 409);
  }
  return payload as AcuteRequestsSnapshot;
}

/** No demo data or optimistic clinical changes: only an acknowledged server snapshot is displayed. */
export function useAcuteRequests(shouldLoad = true): AcuteRequestsController {
  const { activeHospitalId } = useHospital();
  const { user, permissionsLoading, hasModuleAccess } = useAuth();
  const enabled = Boolean(shouldLoad && user && activeHospitalId && !permissionsLoading && hasModuleAccess('acute-requests'));
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const currentHospital = useRef(activeHospitalId);
  currentHospital.current = activeHospitalId;
  const { data, error, isLoading, mutate } = useSWR<AcuteRequestsSnapshot>(
    enabled ? ['acute-requests', activeHospitalId, user?.id, user?.role] : null,
    async ([, hospitalId]: [string, string, string, string]) => readResponse(await fetch('/api/acute-requests', {
      credentials: 'include', cache: 'no-store', headers: { 'X-Acute-Hospital-Id': hospitalId },
    }), hospitalId),
    { refreshInterval: 30_000, revalidateOnFocus: true, revalidateOnReconnect: true, shouldRetryOnError: false, keepPreviousData: false },
  );

  const execute = useCallback(async (command: AcuteRequestCommand, expectedRevision = data?.revision) => {
    if (!enabled || !data?.canManage || expectedRevision === undefined) throw new Error('K úpravě akutních požadavků nemáte oprávnění nebo přehled ještě není načten.');
    if (error) throw new Error('Nejdříve obnovte přehled akutních požadavků.');
    if (inFlight.current) throw new Error('Předchozí změna se ještě ukládá.');
    const hospitalAtStart = activeHospitalId;
    inFlight.current = true;
    setBusy(true);
    try {
      const snapshot = await readResponse(await fetch('/api/acute-requests', {
        method: 'POST', credentials: 'include', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-Acute-Hospital-Id': hospitalAtStart },
        body: JSON.stringify({ ...command, expectedRevision }),
      }), hospitalAtStart);
      if (hospitalAtStart !== currentHospital.current) throw new Error('Aktivní zařízení se změnilo. Otevřete požadavek znovu v jeho zařízení.');
      await mutate(snapshot, { revalidate: false });
      return snapshot;
    } catch (caught) {
      if (caught instanceof AcuteApiError && caught.status === 409 && hospitalAtStart === currentHospital.current) await mutate();
      throw caught;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [activeHospitalId, data?.canManage, data?.revision, enabled, error, mutate]);

  return {
    scopeId: `${activeHospitalId ?? 'none'}:${user?.id ?? 'anonymous'}`,
    requests: data?.requests ?? [], events: data?.events ?? [], revision: data?.revision ?? 0,
    canManage: Boolean(enabled && data?.canManage && !error), historyLimited: data?.historyLimited ?? false,
    loading: isLoading || permissionsLoading, busy,
    error: error instanceof Error ? error.message : error ? 'Přehled se nepodařilo načíst.' : null,
    errorCode: error instanceof AcuteApiError ? error.code : null,
    refresh: () => mutate(), execute,
  };
}
