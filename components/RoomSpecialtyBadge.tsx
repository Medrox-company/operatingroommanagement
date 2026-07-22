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
      className={`inline-flex min-w-0 items-center gap-1.5 rounded-md font-bold text-white ${compact ? 'max-w-[120px] px-1.5 py-0.5 text-[7px]' : 'max-w-full px-2 py-1 text-[8px]'} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${specialty.color}d8, ${specialty.color}9f)`,
        boxShadow: `inset 0 0 0 1px ${specialty.color}ee`,
      }}
      title={`${specialty.name} · ${dayPartTitle(specialty.dayPart)}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/85" />
      <span className="truncate uppercase tracking-[0.06em]">{specialty.name}</span>
      <span className="shrink-0 text-[0.85em] text-white/70">{dayPartLabel(specialty.dayPart)}</span>
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
