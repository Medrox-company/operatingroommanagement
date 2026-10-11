import React from 'react';
import type { StatusHistoryProgress } from '../../lib/db';

export interface PerformancePreloaderProps {
  progress?: StatusHistoryProgress;
  workflowLoading?: boolean;
  compact?: boolean;
}

const recordsFormatter = new Intl.NumberFormat('cs-CZ');

/** Observes the paginated history load; never advances by an elapsed-time estimate. */
export function PerformancePreloader({ progress, workflowLoading = false, compact = false }: PerformancePreloaderProps) {
  const loaded = progress && Number.isFinite(progress.loaded) ? Math.max(0, Math.floor(progress.loaded)) : 0;
  const total = progress?.total != null && Number.isFinite(progress.total) && progress.total >= 0
    ? Math.floor(progress.total) : null;
  const complete = progress?.complete === true;
  // A full last page can still require one more request. Only completion confirms 100%.
  const percent = complete ? 100 : total && total > 0
    ? Math.min(99, Math.max(0, Math.floor(loaded / total * 100))) : null;
  const phase = complete
    ? workflowLoading ? 'Historie načtena · čekám na nastavení fází…' : 'Historie načtena · připravuji statistiky…'
    : percent === null ? 'Zjišťuji počet záznamů…' : compact ? 'Obnovuji historii…' : 'Načítám data výkonnosti…';
  const recordLabel = total !== null && (total > 0 || complete)
    ? `${recordsFormatter.format(loaded)} z ${recordsFormatter.format(total)} záznamů`
    : loaded > 0 ? `${recordsFormatter.format(loaded)} načtených záznamů` : null;

  return (
    <div
      className={`stats-performance-loader${compact ? ' stats-performance-loader--compact' : ''}`}
      role="progressbar"
      aria-label="Načítání historie výkonů"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent ?? undefined}
      aria-valuetext={[percent !== null ? `${percent} %` : null, phase, recordLabel].filter(Boolean).join(' · ')}
    >
      <div className="stats-performance-loader-ring">
        <span className={`stats-performance-loader-orbit${percent === null ? ' stats-performance-loader-orbit--indeterminate' : ''}`} aria-hidden="true">
          <svg viewBox="0 0 128 128" focusable="false">
            <circle className="stats-performance-loader-track" cx="64" cy="64" r="56" fill="none" strokeWidth="3" />
            <circle
              className="stats-performance-loader-arc"
              cx="64" cy="64" r="56" fill="none" strokeWidth="3.5" strokeLinecap="round"
              pathLength="100" strokeDasharray="100" strokeDashoffset={100 - (percent ?? 24)}
              transform="rotate(-90 64 64)"
            />
          </svg>
        </span>
        <span className="stats-performance-loader-value" aria-hidden="true">
          {percent !== null ? <>{percent}<span className="stats-performance-loader-percent">%</span></> : '…'}
        </span>
      </div>
      <div className="stats-performance-loader-copy">
        <p className="stats-performance-loader-phase">{phase}</p>
        {recordLabel ? <p className="stats-performance-loader-records">{recordLabel}</p> : null}
        {!compact ? <p className="stats-performance-loader-hint">Historie událostí · posledních 12 kalendářních měsíců</p> : null}
      </div>
    </div>
  );
}
