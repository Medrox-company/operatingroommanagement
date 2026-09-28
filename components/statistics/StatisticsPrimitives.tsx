'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { OperatingRoom, RoomStatus } from '../../types';
import '../mobile/mobile-statistics.css';
import { isRoomBusyByStep } from '../../lib/statistics-room-activity';
import { C } from './statistics-theme';

// Get status color based on currentStepIndex (primary) or fallback to RoomStatus for cleaning/maintenance
export function roomStatusColor(r: OperatingRoom): string {
  if (r.status === RoomStatus.CLEANING) return C.accent;
  if (r.status === RoomStatus.MAINTENANCE) return C.faint;
  return isRoomBusyByStep(r) ? C.orange : C.green;
}

// Get status label based on currentStepIndex (primary) or fallback to RoomStatus for cleaning/maintenance
export function roomStatusLabel(r: OperatingRoom): string {
  if (r.status === RoomStatus.CLEANING) return 'Úklid';
  if (r.status === RoomStatus.MAINTENANCE) return 'Údržba';
  return isRoomBusyByStep(r) ? 'Obsazeno' : 'Volné';
}

// Legacy functions for backwards compatibility (some places still use RoomStatus enum directly)
export function statusColor(s:RoomStatus){
  if(s===RoomStatus.BUSY)     return C.orange;
  if(s===RoomStatus.FREE)     return C.green;
  if(s===RoomStatus.CLEANING) return C.accent;
  return C.faint;
}

export function statusLabel(s:RoomStatus){
  if(s===RoomStatus.BUSY)     return 'Obsazeno';
  if(s===RoomStatus.FREE)     return 'Volné';
  if(s===RoomStatus.CLEANING) return 'Úklid';
  return 'Údržba';
}

// ── Card primitive ────────────────────────────────────────────────────────────
export function Card({children,className='',style={}}:{children:React.ReactNode;className?:string;style?:React.CSSProperties}){
  return(
    <div className={`statistics-card rounded-xl ${className}`} style={{background:C.surface,border:`1px solid ${C.border}`,...style}}>
      {children}
    </div>
  );
}

export function SectionLabel({children}:{children:React.ReactNode}){
  return <p className="statistics-section-label text-[11px] font-semibold uppercase tracking-[0.1em] mb-4" style={{color:C.muted}}>{children}</p>;
}

export function EmptyState({title,desc}:{title:string;desc:string}){
  return (
    <div className="h-40 flex flex-col items-center justify-center text-center px-4">
      <p className="text-sm font-semibold" style={{color:C.text}}>{title}</p>
      <p className="text-xs mt-1" style={{color:C.muted}}>{desc}</p>
    </div>
  );
}

export function TrendBadge({v}:{v:number}){
  if(v>0) return(
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:`${C.green}18`,color:C.green}}>
      <TrendingUp className="w-3 h-3"/>+{v}%
    </span>
  );
  if(v<0) return(
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:`${C.red}18`,color:C.red}}>
      <TrendingDown className="w-3 h-3"/>{v}%
    </span>
  );
  return <span className="text-[10px]" style={{color:C.ghost}}>—</span>;
}
