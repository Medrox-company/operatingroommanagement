import React from 'react';
import type { CurrentRoomSpecialty } from '../lib/room-specialty';

function dayPartLabel(dayPart: CurrentRoomSpecialty['dayPart']) {
  if (dayPart === 'FULL_DAY') return 'CELÝ DEN';
  return dayPart === 'AM' ? 'DOP' : 'ODP';
}

function dayPartTitle(dayPart: CurrentRoomSpecialty['dayPart']) {
  if (dayPart === 'FULL_DAY') return 'celý den';
  return dayPart === 'AM' ? 'dopoledne' : 'odpoledne';
}

export function RoomSpecialtyBadge({
  specialty,
  compact = false,
  className = '',
}: {
  specialty: CurrentRoomSpecialty;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex min-w-0 items-stretch overflow-hidden rounded-[5px] border border-white/[0.08] bg-white/[0.035] text-white/80 transition-colors hover:border-white/[0.13] hover:bg-white/[0.055] motion-reduce:transition-none ${compact ? 'h-[19px] max-w-[148px] text-[7px]' : 'h-7 max-w-full text-[8px]'} ${className}`}
      style={{
        backgroundColor: `color-mix(in srgb, ${specialty.color} 7%, var(--color-surface))`,
      }}
      title={`${specialty.name} · ${dayPartTitle(specialty.dayPart)}`}
      aria-label={`${specialty.name}, ${dayPartTitle(specialty.dayPart)}`}
    >
      <span
        aria-hidden="true"
        className="w-0.5 shrink-0 self-stretch"
        style={{ backgroundColor: specialty.color }}
      />
      <span className={`min-w-0 flex-1 truncate self-center font-semibold uppercase ${compact ? 'px-1.5 tracking-[0.08em]' : 'px-2 tracking-[0.09em]'}`}>
        {specialty.name}
      </span>
      <span
        className={`shrink-0 self-stretch border-l border-white/[0.07] font-bold uppercase tracking-[0.08em] ${compact ? 'grid place-items-center px-1.5 text-[6px]' : 'grid place-items-center px-2 text-[7px]'}`}
        style={{
          color: `color-mix(in srgb, ${specialty.color} 62%, white)`,
          backgroundColor: `color-mix(in srgb, ${specialty.color} 9%, transparent)`,
        }}
      >
        {dayPartLabel(specialty.dayPart)}
      </span>
    </span>
  );
}

export function RoomSpecialtyBadges({
  specialties,
  compact = false,
  className = '',
}: {
  specialties: CurrentRoomSpecialty[];
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={`flex min-w-0 flex-wrap items-center gap-1 ${className}`}>
      {specialties.map(specialty => (
        <RoomSpecialtyBadge
          key={`${specialty.departmentId}-${specialty.dayPart}`}
          specialty={specialty}
          compact={compact}
        />
      ))}
    </span>
  );
}
