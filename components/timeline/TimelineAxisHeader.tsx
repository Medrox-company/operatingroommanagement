'use client';

import React from 'react';
import { C, ROOM_LABEL_WIDTH, TIMELINE_START_HOUR } from './constants';
import { hourLabelCompact } from './utils';
import type { StatusFilter } from './row-types';

export interface TimelineAxisHeaderProps {
  zoom: number;
  TIME_MARKERS: number[];
  TIMELINE_HOURS: number;
  axisWidth: number;
  currentHour: number;
  statusFilter: StatusFilter;
  setStatusFilter: React.Dispatch<React.SetStateAction<StatusFilter>>;
  timelineRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Hodinová osa nad rozvrhem, včetně filtru sálů v levém sloupci.
 *
 * Vyjmuto z TimelineModule bez změny značkování; komponenta nemá vlastní stav,
 * takže se překresluje stejně často jako dřív.
 */
export function TimelineAxisHeader({
  zoom,
  TIME_MARKERS,
  TIMELINE_HOURS,
  axisWidth,
  currentHour,
  statusFilter,
  setStatusFilter,
  timelineRef,
}: TimelineAxisHeaderProps) {
  return (
  <div
    className="timeline-axis-header flex flex-shrink-0 relative overflow-hidden"
  >
    {/* Jemná cyan hrana jako na časové liště modulu Tok pacienta. */}
    <div className="absolute top-0 left-12 right-12 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(54,217,236,0.42), transparent)' }} />
    
    {/* Room label header — filtr stavu přes celou šířku sloupce */}
    <div 
      className="timeline-room-rail-header flex-shrink-0 flex items-center px-4 py-1.5"
      style={{ 
        width: ROOM_LABEL_WIDTH, 
        minWidth: ROOM_LABEL_WIDTH, 
        borderRight: '1px solid rgba(160,174,220,0.09)',
      }}
    >
      <div className="flex w-full items-center">
        <div
          className="timeline-field-soft flex h-9 w-full items-center rounded-lg p-0.5"
        >
          {([
            { key: 'all', label: 'Vše' },
            { key: 'active', label: 'Akt.' },
            { key: 'free', label: 'Vol.' },
            { key: 'attention', label: 'Poz.' },
          ] as const).map(({ key, label }) => {
            const active = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                aria-pressed={active}
                title={key === 'attention' ? 'Sály vyžadující pozornost' : undefined}
                className="h-8 min-w-0 flex-1 rounded-md px-1 text-[10px] font-semibold transition-colors"
                style={active ? {
                  background: `${key === 'attention' ? C.orange : C.cyan}20`,
                  color: key === 'attention' ? C.orange : C.cyan,
                  boxShadow: `inset 0 0 0 1px ${key === 'attention' ? C.orange : C.cyan}40`,
                } : { color: 'rgba(255,255,255,0.45)' }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
    
    {/* Time markers - Premium style with elegant grid.
        Na úzké ose (tablet na výšku) by se popisky slily do „101112",
        proto se podle šířky buňky zmenší písmo a vypisuje se jen
        každá druhá / třetí hodina. */}
    <div className="flex-1 overflow-hidden" ref={timelineRef}>
      <div className="flex items-center h-[58px] relative" style={{ width: `${zoom * 100}%`, transition: 'width 0.25s ease' }}>
        {/* Pásy RÁNO/DEN/VEČER/NOC odstraněny — jednotný vzhled celé osy */}
        {TIME_MARKERS.map((hour, i) => {
          const isLast = i === TIME_MARKERS.length - 1;
          const widthPct = 100 / TIMELINE_HOURS;
          const leftPct = i * widthPct;
          const actualHour = TIMELINE_START_HOUR + hour;
          const displayHour = actualHour % 24;
          const isNextDay = actualHour >= 24;
          const isCurrentHour = displayHour === currentHour && !isLast;
          const isMajorHour = displayHour % 3 === 0; // Every 3 hours is major

          /* Kolik pixelů připadá na hodinu → podle toho krok popisků
             a velikost písma. Aktuální hodina se vypíše vždy. */
          const cellPx = axisWidth > 0 ? (axisWidth * zoom) / TIMELINE_HOURS : 999;
          const labelStep = cellPx >= 34 ? 1 : cellPx >= 22 ? 2 : 3;
          const labelFont = cellPx >= 34 ? 13 : cellPx >= 26 ? 12 : 10;
          const showLabel = isCurrentHour || displayHour % labelStep === 0;

          return (
            <div
              key={`h-${hour}-${i}`}
              className="absolute top-0 h-full flex items-center justify-center pt-3"
              aria-current={isCurrentHour ? 'time' : undefined}
              style={{
                left: `${leftPct}%`,
                width: isLast ? 0 : `${widthPct}%`,
                // Plocha zůstává bez výplně; aktuální čas vyznačuje svislá linka.
                background: 'transparent',
              }}
            >
              {/* Svislá hodinová značka */}
              <div
                className="absolute left-0 top-0 bottom-0 w-px"
                style={{
                  background: isMajorHour
                    ? 'rgba(148,180,196,0.13)'
                    : 'rgba(148,180,196,0.05)',
                }}
              />
              {!isLast && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-px"
                  style={{
                    height: isMajorHour ? 8 : 5,
                  background: isCurrentHour ? C.now : isMajorHour ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.16)',
                  }}
                />
              )}
              {!isLast && showLabel && (
                <div className="flex flex-col items-center gap-0.5">
                  <span
                    className={`rounded-lg px-1 py-0.5 font-mono tabular-nums leading-none transition-colors ${
                      isCurrentHour ? 'font-semibold text-cyan-100 bg-cyan-300/10' : isMajorHour ? 'font-semibold text-white/75' : 'font-medium text-white/40'
                    }`}
                    style={{ fontSize: labelFont }}
                  >
                    {hourLabelCompact(hour)}
                  </span>
                  {isNextDay && displayHour === 0 && cellPx >= 34 && (
                    <span className="text-[7px] font-bold uppercase tracking-[0.16em] text-white/28">další den</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </div>
  );
}
