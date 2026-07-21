'use client';

import React, { memo, useMemo } from 'react';
import { Activity, AlertTriangle, Bell, LayoutGrid, Lock, Shield } from 'lucide-react';
import type { OperatingRoom } from '../types';
import AnimatedCounter from './AnimatedCounter';
import LiveClock from './LiveClock';
import RoomCard from './RoomCard';
import { MobileHeaderMetrics, MobileModuleHeader } from './mobile/MobileShell';

interface DashboardModuleProps {
  rooms: OperatingRoom[];
  roomsLoaded: boolean;
  onSelectRoom: (roomId: string) => void;
  onEmergency: (roomId: string) => void;
  onLock: (roomId: string) => void;
}

const DashboardModule: React.FC<DashboardModuleProps> = ({
  rooms,
  roomsLoaded,
  onSelectRoom,
  onEmergency,
  onLock,
}) => {
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

  const desktopMetrics = [
    { label: 'AKTIVNÍ', value: metrics.activeRooms.length, icon: Activity, color: 'text-[#22D3EE]', valueColor: '#22D3EE', show: true, pulse: false },
    { label: 'PŘIPRAVENO', value: metrics.readyRooms.length, icon: LayoutGrid, color: 'text-[#34D399]', valueColor: '#34D399', show: true, pulse: false },
    { label: 'NOUZE', value: metrics.emergencyRooms.length, icon: AlertTriangle, color: 'text-[#FF453A]', valueColor: '#FF453A', show: metrics.emergencyRooms.length > 0, pulse: true },
    { label: 'UZAMČENO', value: metrics.lockedRooms.length, icon: Lock, color: 'text-[#FBBF24]', valueColor: '#FBBF24', show: metrics.lockedRooms.length > 0, pulse: false },
  ].filter((metric) => metric.show);

  return (
    <div className="w-full h-full overflow-y-auto hide-scrollbar px-4 sm:px-6 md:pl-32 md:pr-10 py-6 md:py-10 pb-mobile-nav md:pb-10 mobile-safe-top">
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

        <header className="hidden md:flex flex-col lg:flex-row items-center lg:items-end justify-between gap-3 md:gap-6 mb-4 md:mb-10 lg:mb-12 flex-shrink-0">
          <div className="text-center lg:text-left min-w-0 w-full lg:w-auto">
            <div className="flex items-center justify-center lg:justify-start gap-2 sm:gap-3 mb-1 sm:mb-2 opacity-60">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-[#FBBF24]" />
              <p className="text-[9px] sm:text-[10px] font-bold text-[#FBBF24] tracking-[0.3em] sm:tracking-[0.4em] uppercase">APLIKACE PRO ŘÍZENÍ OPERAČNÍCH SÁLŮ</p>
            </div>
            <h1 className="text-[clamp(1.75rem,7vw,4.5rem)] font-bold tracking-tight uppercase leading-none truncate flex items-center gap-3 sm:gap-4 justify-center lg:justify-start">
              <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: '#34D399' }} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3" style={{ background: '#34D399', boxShadow: '0 0 10px #34D39988' }} />
              </span>
              <span>OPERAČNÍ <span className="text-white/20">SÁLY</span></span>
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-5">
            <LiveClock />
            <div className="flex items-stretch gap-1 md:gap-2 p-1.5 md:p-2 bg-white/[0.04] border border-white/10 backdrop-blur-3xl rounded-3xl md:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              {desktopMetrics.map((stat, index) => (
                <React.Fragment key={stat.label}>
                  {index > 0 && <div className="w-px self-stretch my-2 bg-gradient-to-b from-transparent via-white/10 to-transparent" />}
                  <div className={`flex flex-col items-center justify-center px-3 sm:px-6 md:px-9 py-2 sm:py-3 md:py-4 rounded-2xl md:rounded-3xl hover:bg-white/5 transition-all min-w-[90px] sm:min-w-[120px] md:min-w-[140px] z-10 ${stat.pulse ? 'animate-pulse' : ''}`}>
                    <div className="flex items-center gap-1.5 sm:gap-2.5 mb-1 sm:mb-2">
                      <stat.icon className={`w-3 h-3 sm:w-4 sm:h-4 ${stat.color}`} />
                      <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white/45">{stat.label}</p>
                    </div>
                    <div style={{ color: stat.valueColor }}><AnimatedCounter to={stat.value} /></div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </header>

        <div className="pb-20 px-0 sm:px-2">
          {!roomsLoaded ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
              <div className="w-7 h-7 border-2 border-[#C7D4E8] border-t-[#2952C8] md:border-white/20 md:border-t-white/70 rounded-full animate-spin" />
              <p className="text-sm text-[#7C8AA5] md:text-white/40">Načítám operační sály…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-x-5 md:gap-x-6 sm:gap-y-6 md:gap-y-8">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
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
