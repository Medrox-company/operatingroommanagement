'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useHospital } from '../contexts/HospitalContext';
import { useHospitalRealtime } from '../contexts/RealtimeContext';
import {
  ROOM_SCHEDULE_SYSTEM_OPTIONS,
  localScheduleDateKey,
  roomSpecialtyColor,
  type CurrentRoomSpecialty,
  type RoomScheduleAllocationKind,
  type RoomScheduleDayPart,
} from '../lib/room-specialty';

interface SpecialtyResponse {
  allocations?: Array<{
    id: string;
    operating_room_id: string;
    department_id: string | null;
    allocation_date: string;
    day_part: RoomScheduleDayPart;
    allocation_kind: RoomScheduleAllocationKind;
  }>;
  departments?: Array<{
    id: string;
    name: string;
  }>;
}

const fetcher = async ([url]: [string, string]): Promise<SpecialtyResponse> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  if (!response.ok) throw new Error('Dnešní rozpis oborů se nepodařilo načíst.');
  return response.json();
};

export function useCurrentRoomSpecialties() {
  const { activeHospitalId } = useHospital();
  const [clock, setClock] = useState(() => new Date());
  const date = localScheduleDateKey(clock);
  const key: [string, string] | null = activeHospitalId
    ? [`/api/room-specialty-allocations?date=${date}`, activeHospitalId]
    : null;
  const { data, mutate } = useSWR<SpecialtyResponse>(key, fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    keepPreviousData: false,
  });

  useHospitalRealtime('room_specialty_allocations', (payload) => {
    const record = (payload.new ?? payload.old) as Record<string, unknown> | null;
    const id = typeof record?.id === 'string' ? record.id : null;
    if (!id) return;

    void mutate((current) => {
      if (!current) return current;
      const withoutChanged = (current.allocations ?? []).filter(allocation => allocation.id !== id);
      if (payload.eventType === 'DELETE' || payload.new === null) {
        return { ...current, allocations: withoutChanged };
      }

      const next = payload.new;
      if (
        next?.allocation_date !== date
        || typeof next.operating_room_id !== 'string'
        || (next.day_part !== 'AM' && next.day_part !== 'PM')
        || (next.allocation_kind !== 'SPECIALTY' && next.allocation_kind !== 'CLOSED' && next.allocation_kind !== 'SERVICE')
        || (next.allocation_kind === 'SPECIALTY' && typeof next.department_id !== 'string')
      ) {
        return { ...current, allocations: withoutChanged };
      }

      return {
        ...current,
        allocations: [...withoutChanged, {
          id,
          operating_room_id: next.operating_room_id,
          department_id: typeof next.department_id === 'string' ? next.department_id : null,
          allocation_date: next.allocation_date,
          day_part: next.day_part,
          allocation_kind: next.allocation_kind,
        }],
      };
    }, { revalidate: false });
  });

  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 60_000);
    const refresh = () => { void mutate(); };
    window.addEventListener('roomSpecialtyScheduleChanged', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('roomSpecialtyScheduleChanged', refresh);
    };
  }, [mutate]);

  const currentByRoom = useMemo(() => {
    const departments = data?.departments ?? [];
    const departmentMap = new Map(departments.map((department, index) => [department.id, {
      ...department,
      color: roomSpecialtyColor(index),
    }]));
    const slotsByRoom = new Map<string, Partial<Record<RoomScheduleDayPart, CurrentRoomSpecialty>>>();
    for (const allocation of data?.allocations ?? []) {
      const display = allocation.allocation_kind === 'SPECIALTY'
        ? allocation.department_id ? departmentMap.get(allocation.department_id) : null
        : ROOM_SCHEDULE_SYSTEM_OPTIONS[allocation.allocation_kind];
      if (!display) continue;
      const roomSlots = slotsByRoom.get(allocation.operating_room_id) ?? {};
      roomSlots[allocation.day_part] = {
        departmentId: display.id,
        name: display.name,
        color: display.color,
        dayPart: allocation.day_part,
      };
      slotsByRoom.set(allocation.operating_room_id, roomSlots);
    }

    const result = new Map<string, CurrentRoomSpecialty[]>();
    slotsByRoom.forEach((slots, roomId) => {
      if (slots.AM && slots.PM && slots.AM.departmentId === slots.PM.departmentId) {
        result.set(roomId, [{ ...slots.AM, dayPart: 'FULL_DAY' }]);
        return;
      }
      result.set(roomId, [slots.AM, slots.PM].filter((item): item is CurrentRoomSpecialty => Boolean(item)));
    });
    return result;
  }, [data]);

  return { currentByRoom };
}
