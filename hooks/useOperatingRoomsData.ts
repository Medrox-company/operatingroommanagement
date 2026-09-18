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
import { useHospitalRealtime, useRealtimeContext } from '../contexts/RealtimeContext';

function sortRooms(rooms: OperatingRoom[]) {
  return [...rooms].sort((a, b) =>
    (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER)
    || a.name.localeCompare(b.name, 'cs'),
  );
}

/**
 * Jak dlouho po lokální změně ještě nedůvěřujeme odpovědi, která mohla
 * odejít z databáze dřív, než tam náš zápis dorazil.
 *
 * SWR neruší běžící dotazy. Když personál přepne status ve chvíli, kdy je na
 * cestě pravidelné nebo focus obnovení, dorazí odpověď se starým stavem až po
 * optimistické změně a přepíše ji — status na displeji „skočí zpátky“.
 */
const LOCAL_UPDATE_GRACE_MS = 15_000;

/**
 * Sloučí čerstvě načtená data s lokálním stavem. Sál, u kterého jsme právě
 * zapisovali a databáze ho ještě nepotvrdila vyšší revizí, zůstane v lokální
 * podobě; jakmile revize stoupne, bere se verze z databáze.
 */
function mergeFetchedRooms(
  current: OperatingRoom[],
  incoming: OperatingRoom[],
  pendingLocalWrites: Map<string, number>,
) {
  if (pendingLocalWrites.size === 0) return incoming;
  const now = Date.now();
  const currentById = new Map(current.map((room) => [room.id, room]));

  return incoming.map((room) => {
    const markedAt = pendingLocalWrites.get(room.id);
    if (markedAt === undefined) return room;

    if (now - markedAt > LOCAL_UPDATE_GRACE_MS) {
      pendingLocalWrites.delete(room.id);
      return room;
    }

    const local = currentById.get(room.id);
    if (!local) return room;

    const incomingRevision = typeof room.stateRevision === 'number' ? room.stateRevision : null;
    const localRevision = typeof local.stateRevision === 'number' ? local.stateRevision : null;

    // Databáze už náš zápis vidí — od té chvíle je autoritou ona.
    if (incomingRevision !== null && localRevision !== null && incomingRevision > localRevision) {
      pendingLocalWrites.delete(room.id);
      return room;
    }

    return local;
  });
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
  const { connected: realtimeConnected } = useRealtimeContext();
  const hospitalId = enabled ? activeHospitalId : null;
  const upgradedHospitalRef = useRef<string | null>(null);
  const loadedRoomDetailsRef = useRef(new Set<string>());
  const recentLocalUpdatesRef = useRef(new Map<string, number>());
  const wasRealtimeConnectedRef = useRef(false);
  const roomsRef = useRef<OperatingRoom[]>([]);

  const { data, error, isLoading, mutate } = useSWR<OperatingRoom[]>(
    hospitalId ? ['operating-rooms', hospitalId] : null,
    async () => {
      const fetched = (loadAllDetails || upgradedHospitalRef.current === hospitalId)
        ? (await fetchOperatingRooms(hospitalId!)) ?? []
        : (await fetchOperatingRoomsLight(hospitalId!)) ?? (await fetchOperatingRooms(hospitalId!)) ?? [];
      return mergeFetchedRooms(roomsRef.current, fetched, recentLocalUpdatesRef.current);
    },
    {
      keepPreviousData: false,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: realtimeConnected ? 120_000 : 15_000,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      dedupingInterval: 10_000,
      errorRetryCount: 4,
    },
  );

  useEffect(() => {
    roomsRef.current = data ?? [];
  }, [data]);

  useEffect(() => {
    upgradedHospitalRef.current = null;
    loadedRoomDetailsRef.current.clear();
    recentLocalUpdatesRef.current.clear();
    wasRealtimeConnectedRef.current = false;
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

  const reconcileRoom = useCallback(async (roomId: string) => {
    if (!hospitalId) return;
    const fullRoom = await fetchOperatingRoomById(roomId, hospitalId);
    recentLocalUpdatesRef.current.delete(roomId);
    loadedRoomDetailsRef.current.delete(`${hospitalId}:${roomId}`);
    await mutate((current = []) => (
      fullRoom
        ? upsertRoom(current, fullRoom)
        : current.filter((room) => room.id !== roomId)
    ), { revalidate: false });
  }, [hospitalId, mutate]);

  const refreshRooms = useCallback(async () => {
    if (!hospitalId) return;
    const fullRooms = await fetchOperatingRooms(hospitalId);
    if (fullRooms) {
      upgradedHospitalRef.current = hospitalId;
      await mutate(
        (current = []) => mergeFetchedRooms(current, fullRooms, recentLocalUpdatesRef.current),
        { revalidate: false },
      );
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
      void mutate(
        (current = []) => mergeFetchedRooms(current, fullRooms, recentLocalUpdatesRef.current),
        { revalidate: false },
      );
    });
  }, [hospitalId, loadAllDetails, mutate]);

  // Po obnovení websocketu proveď jeden kontrolní dotaz. Tím se zacelí mezera
  // událostí, které mohly vzniknout během spánku počítače nebo výpadku sítě.
  useEffect(() => {
    const wasConnected = wasRealtimeConnectedRef.current;
    wasRealtimeConnectedRef.current = realtimeConnected;
    if (realtimeConnected && !wasConnected && data !== undefined) {
      void mutate();
    }
  }, [data, mutate, realtimeConnected]);

  // Když databáze nepotvrdí optimistický zápis ani po retry, vrať konkrétní sál
  // k autoritativnímu databázovému stavu. Ostatní sály se znovu nenačítají.
  useEffect(() => {
    const handleWriteFailure = (event: Event) => {
      const detail = (event as CustomEvent<{
        roomId?: string;
        hospitalId?: string;
      }>).detail;
      if (!detail?.roomId || detail.hospitalId !== hospitalId) return;
      void reconcileRoom(detail.roomId);
    };
    window.addEventListener('operatingRoomWriteFailed', handleWriteFailure);
    return () => window.removeEventListener('operatingRoomWriteFailed', handleWriteFailure);
  }, [hospitalId, reconcileRoom]);

  useHospitalRealtime('operating_rooms', (payload) => {
    if (!hospitalId) return;
    const raw = (payload.new ?? payload.old) as Partial<DBOperatingRoom> | null;
    const roomId = raw?.id;
    if (!roomId) return;

    if (payload.eventType === 'DELETE') {
      recentLocalUpdatesRef.current.delete(roomId);
      void mutate((current = []) => current.filter((room) => room.id !== roomId), { revalidate: false });
      return;
    }

    if (payload.eventType === 'INSERT') {
      void reconcileRoom(roomId);
      return;
    }

    const currentRoom = data?.find((room) => room.id === roomId);
    const incomingRevision = typeof raw.state_revision === 'number' ? raw.state_revision : null;
    if (
      incomingRevision !== null
      && typeof currentRoom?.stateRevision === 'number'
      && incomingRevision < currentRoom.stateRevision
    ) {
      // Zastaralá událost. Značku nemažeme — pořád čekáme na potvrzení
      // vlastního zápisu.
      return;
    }

    // Od téhle chvíle je databáze napřed, lokální ochrana může skončit.
    recentLocalUpdatesRef.current.delete(roomId);
    const staffAssignmentChanged = Boolean(currentRoom) && (
      (raw.doctor_id !== undefined && raw.doctor_id !== (currentRoom?.staff.doctor.id ?? null))
      || (raw.nurse_id !== undefined && raw.nurse_id !== (currentRoom?.staff.nurse.id ?? null))
      || (raw.anesthesiologist_id !== undefined
        && raw.anesthesiologist_id !== (currentRoom?.staff.anesthesiologist?.id ?? null))
    );
    if (staffAssignmentChanged) {
      void reconcileRoom(roomId);
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
