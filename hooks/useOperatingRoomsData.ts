'use client';

import { useCallback, useEffect, useRef } from 'react';
import useSWR from 'swr';
import type { OperatingRoom } from '../types';
import {
  fetchOperatingRoomById,
  fetchOperatingRooms,
  fetchOperatingRoomsLight,
  transformSingleRoom,
  type DBOperatingRoom,
} from '../lib/db';
import { useHospital } from '../contexts/HospitalContext';
import { useHospitalRealtime } from '../contexts/RealtimeContext';

const LOCAL_ECHO_WINDOW_MS = 2_000;

function sortRooms(rooms: OperatingRoom[]) {
  return [...rooms].sort((a, b) =>
    (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER)
    || a.name.localeCompare(b.name, 'cs'),
  );
}

function upsertRoom(rooms: OperatingRoom[], nextRoom: OperatingRoom) {
  const index = rooms.findIndex((room) => room.id === nextRoom.id);
  if (index === -1) return sortRooms([...rooms, nextRoom]);
  const next = [...rooms];
  next[index] = nextRoom;
  return sortRooms(next);
}

export function useOperatingRoomsData({
  enabled,
  loadAllDetails,
}: {
  enabled: boolean;
  loadAllDetails: boolean;
}) {
  const { activeHospitalId } = useHospital();
  const hospitalId = enabled ? activeHospitalId : null;
  const upgradedHospitalRef = useRef<string | null>(null);
  const loadedRoomDetailsRef = useRef(new Set<string>());
  const recentLocalUpdatesRef = useRef(new Map<string, number>());

  const { data, error, isLoading, mutate } = useSWR<OperatingRoom[]>(
    hospitalId ? ['operating-rooms', hospitalId] : null,
    async () => {
      const lightRooms = await fetchOperatingRoomsLight(hospitalId!);
      if (lightRooms) return lightRooms;
      return (await fetchOperatingRooms(hospitalId!)) ?? [];
    },
    {
      keepPreviousData: false,
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    },
  );

  useEffect(() => {
    upgradedHospitalRef.current = null;
    loadedRoomDetailsRef.current.clear();
    recentLocalUpdatesRef.current.clear();
  }, [hospitalId]);

  const setRooms = useCallback((update: React.SetStateAction<OperatingRoom[]>) => {
    void mutate((current = []) => (
      typeof update === 'function'
        ? update(current)
        : update
    ), { revalidate: false });
  }, [mutate]);

  const markRoomLocallyUpdated = useCallback((roomId: string) => {
    recentLocalUpdatesRef.current.set(roomId, Date.now());
  }, []);

  const ensureRoomDetails = useCallback(async (roomId: string) => {
    if (!hospitalId) return;
    const detailKey = `${hospitalId}:${roomId}`;
    if (loadedRoomDetailsRef.current.has(detailKey)) return;
    loadedRoomDetailsRef.current.add(detailKey);

    const fullRoom = await fetchOperatingRoomById(roomId, hospitalId);
    if (!fullRoom) {
      loadedRoomDetailsRef.current.delete(detailKey);
      return;
    }
    await mutate((current = []) => upsertRoom(current, fullRoom), { revalidate: false });
  }, [hospitalId, mutate]);

  const refreshRooms = useCallback(async () => {
    if (!hospitalId) return;
    const fullRooms = await fetchOperatingRooms(hospitalId);
    if (fullRooms) {
      upgradedHospitalRef.current = hospitalId;
      await mutate(fullRooms, { revalidate: false });
    }
  }, [hospitalId, mutate]);

  // Těžká historie se načte až při otevření Timeline / Statistik, nikoliv při
  // prvním dashboardu. SWR výsledek drží ve společné cache i po návratu.
  useEffect(() => {
    if (!loadAllDetails || !hospitalId || upgradedHospitalRef.current === hospitalId) return;
    upgradedHospitalRef.current = hospitalId;
    void fetchOperatingRooms(hospitalId).then((fullRooms) => {
      if (!fullRooms) {
        upgradedHospitalRef.current = null;
        return;
      }
      void mutate(fullRooms, { revalidate: false });
    });
  }, [hospitalId, loadAllDetails, mutate]);

  useHospitalRealtime('operating_rooms', (payload) => {
    if (!hospitalId) return;
    const raw = (payload.new ?? payload.old) as Partial<DBOperatingRoom> | null;
    const roomId = raw?.id;
    if (!roomId) return;

    const lastLocalUpdate = recentLocalUpdatesRef.current.get(roomId);
    if (lastLocalUpdate && Date.now() - lastLocalUpdate < LOCAL_ECHO_WINDOW_MS) return;
    recentLocalUpdatesRef.current.delete(roomId);

    if (payload.eventType === 'DELETE') {
      void mutate((current = []) => current.filter((room) => room.id !== roomId), { revalidate: false });
      return;
    }

    if (payload.eventType === 'INSERT') {
      void fetchOperatingRoomById(roomId, hospitalId).then((room) => {
        if (room) void mutate((current = []) => upsertRoom(current, room), { revalidate: false });
      });
      return;
    }

    const currentRoom = data?.find((room) => room.id === roomId);
    const staffAssignmentChanged = Boolean(currentRoom) && (
      (raw.doctor_id !== undefined && raw.doctor_id !== (currentRoom?.staff.doctor.id ?? null))
      || (raw.nurse_id !== undefined && raw.nurse_id !== (currentRoom?.staff.nurse.id ?? null))
      || (raw.anesthesiologist_id !== undefined
        && raw.anesthesiologist_id !== (currentRoom?.staff.anesthesiologist?.id ?? null))
    );
    if (staffAssignmentChanged) {
      void fetchOperatingRoomById(roomId, hospitalId).then((room) => {
        if (room) void mutate((current = []) => upsertRoom(current, room), { revalidate: false });
      });
      return;
    }

    const changes = transformSingleRoom(raw);
    void mutate((current = []) => current.map((room) => (
      room.id === roomId ? { ...room, ...changes } : room
    )), { revalidate: false });
  });

  // Změna jména/parametrů člena týmu se promítne jen do sálů, kde je přiřazen.
  // Nevzniká kvůli ní nový dotaz na operating_rooms ani na celý personál.
  useHospitalRealtime('staff', (payload) => {
    if (payload.eventType === 'DELETE' || !payload.new) return;
    const staff = payload.new;
    const staffId = typeof staff.id === 'string' ? staff.id : null;
    if (!staffId) return;
    const staffName = typeof staff.name === 'string' ? staff.name : null;

    void mutate((current = []) => current.map((room) => {
      let changed = false;
      const nextStaff = { ...room.staff };
      (['doctor', 'nurse', 'anesthesiologist'] as const).forEach((role) => {
        const assigned = room.staff[role];
        if (assigned?.id !== staffId) return;
        changed = true;
        nextStaff[role] = { ...assigned, ...staff, id: staffId, name: staffName };
      });
      return changed ? { ...room, staff: nextStaff } : room;
    }), { revalidate: false });
  });

  return {
    rooms: data ?? [],
    roomsLoaded: Boolean(hospitalId) && !isLoading && data !== undefined,
    isDbConnected: Boolean(hospitalId) && data !== undefined && !error,
    setRooms,
    refreshRooms,
    ensureRoomDetails,
    markRoomLocallyUpdated,
  };
}
