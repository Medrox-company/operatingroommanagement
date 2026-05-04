import React from 'react';
import { Activity, LayoutGrid, Clock, AlertTriangle } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';
import { OperatingRoom } from '../types';

interface DashboardHeaderProps {
  rooms: OperatingRoom[];
}

export default function DashboardHeader({ rooms }: DashboardHeaderProps) {
  const isRoomReady = (room: OperatingRoom) => room.currentStepIndex === 0 || room.currentStepIndex === 7;
  const readyRooms = rooms.filter(isRoomReady);
  const activeRooms = rooms.filter(r => !isRoomReady(r));
  const emergencyRooms = rooms.filter(r => r.isEmergency);
  const lockedRooms = rooms.filter(r => r.isLocked);

  const stats = [
    { label: 'AKTIVNÍ', value: activeRooms.length, icon: Activity, color: 'from-red-500 to-red-600', lightColor: 'text-red-400' },
    { label: 'PŘIPRAVENO', value: readyRooms.length, icon: LayoutGrid, color: 'from-blue-500 to-blue-600', lightColor: 'text-blue-400' },
    { label: 'NOUZE', value: emergencyRooms.length, icon: AlertTriangle, color: 'from-orange-500 to-orange-600', lightColor: 'text-orange-400' },
    { label: 'UZAMČENO', value: lockedRooms.length, icon: Clock, color: 'from-amber-500 to-amber-600', lightColor: 'text-amber-400' },
  ];

  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-4 md:gap-8 mb-8 md:mb-16 flex-shrink-0">
      {/* Title Section */}
      <div className="text-center lg:text-left min-w-0 w-full lg:w-auto">
        <div className="flex items-center justify-center lg:justify-start gap-2 mb-2 opacity-70">
          <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
          <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground tracking-[0.3em] uppercase">
            OPERAČNÍ CENTRUM
          </p>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight uppercase leading-tight">
          OPERAČNÍ <span className="text-primary">SÁLY</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground/70 mt-2">Správa a monitoring operačních sálů v reálném čase</p>
      </div>

      {/* Stats Cards */}
      <div className="w-full lg:w-auto grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`glass border-blue-500/20 rounded-xl p-4 relative overflow-hidden group hover:border-blue-500/40 transition-all`}
          >
            {/* Gradient background on hover */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${stat.color}`} />
            
            <div className="relative z-10 flex flex-col items-start gap-2">
              <div className="flex items-center gap-2">
                <stat.icon className={`w-4 h-4 ${stat.lightColor}`} />
                <p className="text-[8px] font-bold text-muted-foreground/70 uppercase tracking-widest">{stat.label}</p>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground">
                <AnimatedCounter to={stat.value} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
