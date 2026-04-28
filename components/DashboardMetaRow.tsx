/**
 * DashboardMetaRow — Quarn-style top metadata row.
 *
 * Renderuje "control center" hlavičku, která dodává aplikaci pocit
 * průmyslového kontrolního panelu:
 *
 *   • LIVE   OR.CTL // SYS-001 // 06.04.2026          14:32:11
 *   ─────────────────────────────────────────────────────────────
 *
 * - LIVE pulzující dot (lime) = systém běží, real-time data tečou
 * - Mono code-tag (OR.CTL // SYS-001 // [datum]) = "system console" feel
 * - Mono hodiny vpravo s tabulárními číslicemi = časový údaj nikdy
 *   "neskáče" (pevná šířka znaků)
 *
 * Komponenta je samostatně memoizovaná a interní `setInterval` updatuje
 * pouze tento blok, takže se zbytek dashboardu zbytečně nererenderuje.
 */
import React, { memo, useEffect, useState } from 'react';
import { OperatingRoom } from '../types';

interface DashboardMetaRowProps {
  rooms: OperatingRoom[];
}

const DashboardMetaRow: React.FC<DashboardMetaRowProps> = memo(({ rooms }) => {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Detekce libovolného sálu ve stavu nouze — pokud existuje, LIVE dot
  // přepneme na červenou s rychlejším pulzem (důležitý vizuální signál).
  const hasEmergency = rooms.some(r => r.isEmergency);

  // Locale-stable formátování — pevné cs-CZ + 24h
  const dateStr = time.toLocaleDateString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = time.toLocaleTimeString('cs-CZ', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
      {/* LEFT: live indicator + system tag */}
      <div className="flex items-center gap-2.5 md:gap-3.5 min-w-0">
        <span className="flex items-center gap-2 shrink-0">
          <span
            className="live-dot"
            style={hasEmergency ? { background: 'rgb(var(--danger))' } : undefined}
            aria-hidden
          />
          <span
            className="font-semibold"
            style={{ color: hasEmergency ? 'rgb(var(--danger))' : 'rgb(var(--signal))' }}
          >
            {hasEmergency ? 'ALERT' : 'LIVE'}
          </span>
        </span>

        <span className="text-faint-foreground hidden sm:inline" aria-hidden>//</span>

        <span className="hidden sm:flex items-center gap-1.5 truncate">
          <span className="text-foreground/70">OR.CTL</span>
          <span className="text-faint-foreground" aria-hidden>::</span>
          <span className="text-muted-foreground">SYS-001</span>
        </span>

        <span className="text-faint-foreground hidden md:inline" aria-hidden>//</span>

        <span className="hidden md:inline tabular-mono text-muted-foreground tracking-widest">
          {dateStr}
        </span>
      </div>

      {/* RIGHT: live clock + status counter */}
      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        <span className="hidden md:inline text-[10px] tracking-[0.22em] text-faint-foreground">
          {rooms.length.toString().padStart(2, '0')} units online
        </span>
        <span className="text-faint-foreground hidden md:inline" aria-hidden>//</span>
        <span className="tabular-mono text-foreground text-sm md:text-base font-semibold tracking-[0.08em]">
          {timeStr}
        </span>
      </div>
    </div>
  );
});

DashboardMetaRow.displayName = 'DashboardMetaRow';

export default DashboardMetaRow;
