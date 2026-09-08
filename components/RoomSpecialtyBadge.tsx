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

/** Kompaktní dvousloupcová tabulka rozpisu v pravé části názvu sálu. */
export function TimelineRoomSpecialtyStrip({
  specialties,
  className = '',
}: {
  specialties?: CurrentRoomSpecialty[];
  className?: string;
}) {
  const fullDay = specialties?.find(item => item.dayPart === 'FULL_DAY');
  const morning = fullDay ?? specialties?.find(item => item.dayPart === 'AM');
  const afternoon = fullDay ?? specialties?.find(item => item.dayPart === 'PM');
  // Sál bez přiřazeného oboru nekreslí prázdnou dvojici polí s pomlčkami —
  // zabírala 92 px jmenného sloupce a neříkala nic.
  if (!morning && !afternoon) return null;

  // Sál bez přiřazeného oboru nekreslí prázdnou dvojici polí s pomlčkami.
  // Brala 92 px jmenného sloupce a neříkala nic — a právě o ně se název sálu
  // nevešel na dva řádky. Že obor přiřazený není, je vidět z toho, že tam
  // pruh není.
  if (!morning && !afternoon) return null;

  const slots = [
    { part: 'DOPOL.', title: 'Dopoledne', specialty: morning },
    { part: 'ODPOL.', title: 'Odpoledne', specialty: afternoon },
  ];

  return (
    <span
      className={`grid h-9 w-[92px] shrink-0 grid-cols-2 overflow-hidden rounded-[5px] border border-white/[0.09] bg-white/[0.014] ${className}`}
      aria-label="Rozdělení operačních oborů během dne"
    >
      {slots.map(({ part, title, specialty }, index) => (
        <span
          key={part}
          className={`relative flex min-w-0 flex-col overflow-hidden transition-colors duration-150 hover:bg-white/[0.025] motion-reduce:transition-none ${index ? 'border-l border-white/[0.08]' : ''}`}
          title={specialty ? `${specialty.name}, ${title.toLocaleLowerCase('cs-CZ')}` : `${title} bez oboru`}
          aria-label={specialty ? `${specialty.name}, ${title.toLocaleLowerCase('cs-CZ')}` : `${title} bez oboru`}
        >
          <span className="grid h-3 shrink-0 place-items-center border-b border-white/[0.07] text-[5px] font-semibold uppercase tracking-[0.12em] text-white/32">
            {part}
          </span>
          <span
            className={`relative grid min-h-0 flex-1 place-items-center px-1 text-[8px] font-extrabold uppercase tracking-[0.06em] ${specialty ? 'text-white/82' : 'text-white/22'}`}
            style={specialty ? {
              backgroundColor: `color-mix(in srgb, ${specialty.color} 6%, transparent)`,
              boxShadow: `inset 0 -2px 0 color-mix(in srgb, ${specialty.color} 62%, transparent)`,
            } : undefined}
          >
            <span className="max-w-full truncate">{specialty?.shortCode || '—'}</span>
          </span>
        </span>
      ))}
    </span>
  );
}
