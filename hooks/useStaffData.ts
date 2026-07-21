'use client';

import useSWR from 'swr';
import { useHospital } from '../contexts/HospitalContext';
import { useHospitalRealtime } from '../contexts/RealtimeContext';
import { fetchAllStaff, type StaffRow } from '../lib/db';

export function useStaffData(enabled = true) {
  const { activeHospitalId } = useHospital();
  const hospitalId = enabled ? activeHospitalId : null;
  const { data, error, isLoading, mutate } = useSWR<StaffRow[]>(
    hospitalId ? ['hospital-staff', hospitalId] : null,
    async () => (await fetchAllStaff(hospitalId!)) ?? [],
    { revalidateOnFocus: false, dedupingInterval: 15_000 },
  );

  useHospitalRealtime('staff', (payload) => {
    const raw = payload.new ?? payload.old;
    const id = typeof raw?.id === 'string' ? raw.id : null;
    if (!id) return;

    if (payload.eventType === 'DELETE') {
      void mutate((current = []) => current.filter((staff) => staff.id !== id), { revalidate: false });
      return;
    }

    const nextStaff = payload.new as unknown as StaffRow;
    void mutate((current = []) => {
      const index = current.findIndex((staff) => staff.id === id);
      if (index === -1) return [...current, nextStaff].sort((a, b) => a.name.localeCompare(b.name, 'cs'));
      const next = [...current];
      next[index] = { ...next[index], ...nextStaff };
      return next;
    }, { revalidate: false });
  });

  return {
    staff: data ?? [],
    loading: isLoading,
    error,
    refresh: () => mutate(),
  };
}
