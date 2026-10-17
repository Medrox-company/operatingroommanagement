import React from 'react';
import type { StatusHistoryProgress } from '../../lib/db';
import { statisticsProgressPercent } from '../../lib/statistics-loading-progress';
import './performance-preloader.css';
import './statistics-preloader.css';

export interface StatisticsPreloaderProps {
  progress?: StatusHistoryProgress;
  label?: string;
  compact?: boolean;
  hint?: string;
  unitName?: string;
}

const formatter = new Intl.NumberFormat('cs-CZ');

/** Record-based progress shared by statistics tabs and explicit report loading. */
export function StatisticsPreloader({ progress, label = 'Načítám statistiky…', compact = false, hint, unitName = 'záznamů' }: StatisticsPreloaderProps) {
  const loaded = progress && Number.isFinite(progress.loaded) ? Math.max(0, Math.floor(progress.loaded)) : 0;
  const total = progress?.total !== null && progress?.total !== undefined && Number.isFinite(progress.total) && progress.total >= 0
    ? Math.floor(progress.total) : null;
  const percent = statisticsProgressPercent(progress);
  const phase = progress?.complete ? 'Data načtena.' : label;
  const records = total !== null && (total > 0 || progress?.complete)
    ? `${formatter.format(loaded)} z ${formatter.format(total)} ${unitName}`
    : loaded > 0 ? `${formatter.format(loaded)} načtených ${unitName}` : `Zjišťuji počet ${unitName}…`;
  return <div className={`stats-performance-loader stats-statistics-loader${compact ? ' stats-performance-loader--compact' : ''}`}
    role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100}
    aria-valuenow={percent ?? undefined} aria-valuetext={[percent !== null ? `${percent} %` : null, phase, records].filter(Boolean).join(' · ')}>
    <div className="stats-performance-loader-ring">
      <span className={`stats-performance-loader-orbit${percent === null ? ' stats-performance-loader-orbit--indeterminate' : ''}`} aria-hidden="true">
        <svg viewBox="0 0 128 128" focusable="false">
          <circle className="stats-performance-loader-track" cx="64" cy="64" r="56" fill="none" strokeWidth="3" />
          <circle className="stats-performance-loader-arc" cx="64" cy="64" r="56" fill="none" strokeWidth="3.5" strokeLinecap="round"
            pathLength="100" strokeDasharray="100" strokeDashoffset={100 - (percent ?? 24)} transform="rotate(-90 64 64)" />
        </svg>
      </span>
      <span className="stats-performance-loader-value" aria-hidden="true">{percent !== null
        ? <>{percent}<span className="stats-performance-loader-percent">%</span></> : '…'}</span>
    </div>
    <div className="stats-performance-loader-copy">
      <p className="stats-performance-loader-phase">{phase}</p>
      <p className="stats-performance-loader-records">{records}</p>
      {hint ? <p className="stats-performance-loader-hint">{hint}</p> : null}
    </div>
  </div>;
}
