'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useHospital } from '../contexts/HospitalContext';
import {
  createDefaultSiteProject,
  type SiteProject,
} from '../vendor/orms-spatial-editor/src/site-model.js';

export interface SiteProjectPayload {
  project: SiteProject | null;
  revision: number;
  updatedAt: string | null;
}

const ENDPOINT = '/api/spatial-site';

async function request(init?: RequestInit, fallbackError = 'Mapu areálu se nepodařilo načíst.'): Promise<SiteProjectPayload> {
  const response = await fetch(ENDPOINT, { credentials: 'include', cache: 'no-store', ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const conflict = response.status === 409 ? ' Mapu mezitím změnil jiný uživatel; načtěte ji znovu.' : '';
    throw new Error((payload.error || fallbackError) + conflict);
  }
  return payload as SiteProjectPayload;
}

const fetchSiteProject = () => request();

/** Mapa areálu aktivního zařízení. Zdrojem pravdy je databáze. */
export function useSiteProject() {
  const { activeHospitalId, activeHospital } = useHospital();
  const { data, error, isLoading, mutate } = useSWR<SiteProjectPayload>(
    activeHospitalId ? ['spatial-site', activeHospitalId] : null,
    fetchSiteProject,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60_000,
      shouldRetryOnError: false,
    },
  );

  const hospitalName = activeHospital?.hospital_name;
  const fallback = useMemo(
    () => createDefaultSiteProject(activeHospitalId, hospitalName),
    [activeHospitalId, hospitalName],
  );

  const write = useCallback(async (method: 'PUT' | 'DELETE', body: object, fallbackError: string) => {
    const payload = await request({
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, fallbackError);
    await mutate(payload, { revalidate: false });
    return payload;
  }, [mutate]);

  const save = useCallback(
    (project: SiteProject, expectedRevision: number) => write('PUT', { project, expectedRevision }, 'Mapu areálu se nepodařilo uložit.'),
    [write],
  );
  const remove = useCallback(
    (expectedRevision: number) => write('DELETE', { expectedRevision }, 'Mapu areálu se nepodařilo odstranit.'),
    [write],
  );

  return {
    project: data?.project ?? fallback,
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
