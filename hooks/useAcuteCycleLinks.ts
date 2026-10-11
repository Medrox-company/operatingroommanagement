'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import useSWR from 'swr';
import { useHospital } from '../contexts/HospitalContext';
import { useAuth } from '../contexts/AuthContext';
import { useHospitalRealtime } from '../contexts/RealtimeContext';
import type { AcuteCycleLink } from '../lib/acute-cycle-links';

const EMPTY_LINKS: AcuteCycleLink[] = [];
const CYCLE_EVENTS = new Set(['operation_start', 'operation_end', 'operation_completed', 'step_change']);
export interface AcuteCycleWindow { startMs: number; endMs: number }

/** Calendar arithmetic retains the actual 07:00 day boundary through DST. */
export function acuteCycleQueryWindow(now = new Date()): AcuteCycleWindow {
  const start = new Date(now);
  if (start.getHours() < 7) start.setDate(start.getDate() - 1);
  start.setHours(7, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  start.setDate(start.getDate() - 1);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

/** Only durable server links, never matching a request to a guessed nearby cycle. */
export function useAcuteCycleLinks(shouldLoad = true, windowRange?: AcuteCycleWindow) {
  const { activeHospitalId, loading: hospitalLoading } = useHospital();
  const { user, modules, permissionsLoading, hasModuleAccess } = useAuth();
  const enabled = Boolean(shouldLoad && user && activeHospitalId && !hospitalLoading && !permissionsLoading
    && modules.some(module => module.id === 'acute-requests' && module.is_enabled)
    && hasModuleAccess('acute-requests'));
  const defaultRange = acuteCycleQueryWindow();
  const startMs = windowRange?.startMs ?? defaultRange.startMs;
  const endMs = windowRange?.endMs ?? defaultRange.endMs;
  const validRange = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs;
  const range = useMemo(() => validRange
    ? { from: new Date(startMs).toISOString(), to: new Date(endMs).toISOString() }
    : null, [startMs, endMs, validRange]);
  const currentScope = useRef<string | null>(null);
  currentScope.current = enabled ? `${activeHospitalId}:${user!.id}` : null;
  const { data, error, isLoading, mutate } = useSWR<AcuteCycleLink[]>(
    enabled && range ? ['acute-cycle-links', activeHospitalId, user?.id, user?.role, range.from, range.to] : null,
    async ([, hospitalId, userId, , from, to]: [string, string, string, string, string, string]) => {
      const response = await fetch(`/api/acute-requests/cycles?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
        credentials: 'include', cache: 'no-store', headers: { 'X-Acute-Hospital-Id': hospitalId },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Označení akutních cyklů se nepodařilo načíst.');
      if (!Array.isArray(payload.links) || payload.links.some((link: AcuteCycleLink) => link.hospitalId !== hospitalId)) {
        throw new Error('Označení akutních výkonů nepatří vybranému zařízení. Obnovte stránku.');
      }
      if (currentScope.current !== `${hospitalId}:${userId}`) throw new Error('Aktivní zařízení nebo účet se změnil.');
      return payload.links as AcuteCycleLink[];
    },
    { refreshInterval: 30_000, revalidateOnFocus: true, revalidateOnReconnect: true,
      shouldRetryOnError: false, keepPreviousData: false },
  );

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshSoon = useCallback(() => {
    if (!enabled || !range || refreshTimer.current !== null) return;
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      void mutate();
    }, 150);
  }, [enabled, range, mutate]);
  useHospitalRealtime('operating_rooms', payload => {
    const row = payload.new ?? payload.old;
    if (row?.hospital_id === activeHospitalId) refreshSoon();
  });
  useHospitalRealtime('room_status_history', payload => {
    const row = payload.new ?? payload.old;
    if (row?.hospital_id === activeHospitalId && CYCLE_EVENTS.has(String(row?.event_type))) refreshSoon();
  });
  useEffect(() => {
    if (!enabled) return;
    const onLinked = (event: Event) => {
      const detail = (event as CustomEvent<{ hospitalId?: string }>).detail;
      if (detail?.hospitalId === activeHospitalId) refreshSoon();
    };
    window.addEventListener('acuteCycleLinked', onLinked);
    return () => {
      window.removeEventListener('acuteCycleLinked', onLinked);
      if (refreshTimer.current !== null) clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    };
  }, [activeHospitalId, enabled, refreshSoon]);
  const refresh = useCallback(() => mutate(), [mutate]);

  return {
    links: enabled && range ? data ?? EMPTY_LINKS : EMPTY_LINKS,
    loading: enabled && Boolean(isLoading || permissionsLoading || hospitalLoading),
    error: enabled && error instanceof Error ? error.message : null,
    refresh,
  };
}
