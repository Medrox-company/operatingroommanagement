'use client';

import { useCallback, useMemo } from 'react';
import useSWR, { preload } from 'swr';
import type { OperatingRoom } from '../types';
import { useHospital } from '../contexts/HospitalContext';
import {
  createDefaultSpatialProject,
  type BuildingProject,
  type SpatialProjectPayload,
} from '../lib/spatial-project';

async function fetchSpatialProject(): Promise<SpatialProjectPayload> {
  const response = await fetch('/api/spatial-project', { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || '3D dispozici se nepodařilo načíst.');
  return payload as SpatialProjectPayload;
}

const spatialProjectKey = (hospitalId: string) => ['spatial-project', hospitalId] as const;

export function preloadSpatialProject(hospitalId: string) {
  return preload(spatialProjectKey(hospitalId), fetchSpatialProject);
}

export function useSpatialProject(rooms: OperatingRoom[]) {
  const { activeHospitalId, activeHospital } = useHospital();
  const { data, error, isLoading, mutate } = useSWR<SpatialProjectPayload>(
    activeHospitalId ? spatialProjectKey(activeHospitalId) : null,
    fetchSpatialProject,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60_000,
      shouldRetryOnError: false,
    },
  );

  // Živý stav sálu se mění často. Výchozí geometrii proto odvozujeme pouze
  // z identity a názvu sálů, aby aktualizace výkonu nerušila práci v editoru.
  const roomIdentity = JSON.stringify(rooms.map(({ id, name }) => ({ id, name })));
  const fallback = useMemo(() => {
    const roomSources = JSON.parse(roomIdentity) as Array<{ id: string; name: string }>;
    return createDefaultSpatialProject(roomSources, activeHospitalId, activeHospital?.hospital_name);
  }, [activeHospital?.hospital_name, activeHospitalId, roomIdentity]);
  const project = data?.project ?? fallback;

  const save = useCallback(async (nextProject: BuildingProject, expectedRevision: number) => {
    const response = await fetch('/api/spatial-project', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: nextProject, expectedRevision }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const conflict = response.status === 409 ? ' Dispozici mezitím změnil jiný uživatel; načtěte ji znovu.' : '';
      throw new Error((payload.error || '3D dispozici se nepodařilo uložit.') + conflict);
    }
    await mutate(payload as SpatialProjectPayload, { revalidate: false });
    return payload as SpatialProjectPayload;
  }, [mutate]);

  const remove = useCallback(async (expectedRevision: number) => {
    const response = await fetch('/api/spatial-project', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedRevision }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const conflict = response.status === 409 ? ' Dispozici mezitím změnil jiný uživatel; načtěte ji znovu.' : '';
      throw new Error((payload.error || 'Operační blok se nepodařilo odstranit.') + conflict);
    }
    await mutate(payload as SpatialProjectPayload, { revalidate: false });
    return payload as SpatialProjectPayload;
  }, [mutate]);

  return {
    project,
    storedProject: data?.project ?? null,
    revision: data?.revision ?? 0,
    updatedAt: data?.updatedAt ?? null,
    isLoading,
    error: error instanceof Error ? error : null,
    save,
    remove,
    reload: () => mutate(),
  };
}
