'use client';

import React, { memo, useMemo } from 'react';
import { Activity, Bell, LayoutGrid, Shield } from 'lucide-react';
import type { OperatingRoom } from '../types';
import LiveClock from './LiveClock';
import RoomCard from './RoomCard';
import { MobileHeaderMetrics, MobileModuleHeader } from './mobile/MobileShell';
import { useCurrentRoomSpecialties } from '../hooks/useCurrentRoomSpecialties';
import { useTimelineCompletedOperations } from '../hooks/useTimelineCompletedOperations';
import { mergeCompletedOperations } from '../lib/completed-operations';
import ModulePageHeading from './ModulePageHeading';

interface DashboardModuleProps {
  rooms: OperatingRoom[];
  roomsLoaded: boolean;
  onSelectRoom: (roomId: string) => void;
  onEmergency: (roomId: string) => void;
  onLock: (roomId: string) => void;
}

const DashboardModule: React.FC<DashboardModuleProps> = ({
  rooms: sourceRooms,
  roomsLoaded,
  onSelectRoom,
  onEmergency,
  onLock,
}) => {
  const { currentByRoom } = useCurrentRoomSpecialties();

  // Číslo uprostřed karty = počet dokončených cyklů provozního dne. Samotný
  // archiv u sálu na to nestačí: zapisuje ho klient jen při vlastním přechodu
  // do „Sál připraven", takže výkony ukončené z jiného zařízení nebo databázovým
  // triggerem v něm chybí. Log událostí je úplný a chodí realtime, proto ho sem
  // přimícháváme stejně jako v Timeline (SWR cache je pro oba moduly společná).
  const { completedOperationsByRoom } = useTimelineCompletedOperations();
  const rooms = useMemo(() => sourceRooms.map((room) => {
    const eventOperations = completedOperationsByRoom.get(room.id) ?? [];
    if (eventOperations.length === 0) return room;
    return {
      ...room,
      completedOperations: mergeCompletedOperations(room.completedOperations ?? [], eventOperations),
    };
  }), [completedOperationsByRoom, sourceRooms]);
  const metrics = useMemo(() => {
    const isReady = (room: OperatingRoom) => room.currentStepIndex === 0 || room.currentStepIndex === 7;
    const emergencyRooms = rooms.filter((room) => room.isEmergency);
    const lockedRooms = rooms.filter((room) => room.isLocked && !room.isEmergency);
    const readyRooms = rooms.filter((room) => isReady(room) && !room.isEmergency && !room.isLocked);
    const activeRooms = rooms.filter((room) => !isReady(room) && !room.isEmergency && !room.isLocked);
    return {
      emergencyRooms,
      lockedRooms,
      readyRooms,
      activeRooms,
      noticeCount: rooms.filter((room) => room.noticeMessage).length + emergencyRooms.length,
    };
  }, [rooms]);

  return (
    <div className="statistics-module h-full w-full overflow-y-auto px-4 py-6 pb-mobile-nav sm:px-6 md:py-10 md:pb-10 md:pl-32 md:pr-10 mobile-safe-top">
      <div aria-hidden className="mobile-theme-surface fixed inset-0 -z-10 md:hidden" />
      <div className="max-w-[2400px] mx-auto w-full">
        <div className="md:hidden mb-4">
          <MobileModuleHeader
            kicker="Živý operační program"
            title="Operační sály"
            right={(
              <span
                className="relative w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: 'var(--m-card-2)', border: '1px solid var(--m-border)' }}
              >
                <Bell className="w-[19px] h-[19px]" style={{ color: 'var(--m-text-strong)' }} strokeWidth={2} />
                {metrics.noticeCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: 'var(--m-accent)', border: '2px solid var(--m-bg)' }}
                  >
                    {metrics.noticeCount}
                  </span>
                )}
              </span>
            )}
          >
            <MobileHeaderMetrics items={[
              {
                label: 'Aktivní',
                value: metrics.activeRooms.length,
                suffix: 'v provozu',
                color: '#9A6CFF',
                icon: <Activity className="w-5 h-5" strokeWidth={2} />,
              },
              {
                label: 'Připraveno',
                value: metrics.readyRooms.length,
                suffix: 'sálů',
                color: '#10B981',
                icon: <LayoutGrid className="w-5 h-5" strokeWidth={2} />,
              },
            ]} />
          </MobileModuleHeader>
        </div>

        {/* Nadpis a čas zůstávají od tabletového breakpointu v jediném řádku.
            Obě části používají fluidní typografii app-module-title, takže se
            na užších monitorech zmenší, aniž by čas spadl pod nadpis. */}
        <header className="mb-7 hidden min-w-0 flex-shrink-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-[clamp(1rem,3vw,3rem)] md:grid md:pr-2">
          <ModulePageHeading
            icon={Shield}
            kicker="APLIKACE PRO ŘÍZENÍ OPERAČNÍCH SÁLŮ"
            title="OPERAČNÍ"
            mutedTitle="SÁLY"
            titleClassName="truncate"
          />
          <LiveClock />
        </header>

        <div className="px-0 pb-20 sm:px-2">
          {!roomsLoaded ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
              <div className="w-7 h-7 border-2 border-[#C7D4E8] border-t-[#2952C8] md:border-white/20 md:border-t-white/70 rounded-full animate-spin" />
              <p className="text-sm text-[#7C8AA5] md:text-white/40">Načítám operační sály…</p>
            </div>
          ) : (
            /* Tablet na šířku zůstává ve čtyřech sloupcích. Pátý sloupec se
               zapíná až tam, kde karta bezpečně udrží všechny popisky v řádku. */
            <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 min-[2200px]:grid-cols-6">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  specialties={currentByRoom.get(room.id)}
                  onClick={() => onSelectRoom(room.id)}
                  onEmergency={() => onEmergency(room.id)}
                  onLock={() => onLock(room.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(DashboardModule);
