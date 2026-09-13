'use client';

import React, { useEffect, useState } from 'react';

export default function SpatialLoadingBar({
  label,
  progress,
  initial = 8,
  ceiling = 92,
  overlay = false,
}: {
  label: string;
  progress?: number;
  initial?: number;
  ceiling?: number;
  overlay?: boolean;
}) {
  const [simulatedProgress, setSimulatedProgress] = useState(initial);

  useEffect(() => {
    if (progress !== undefined) return;
    const timer = window.setInterval(() => {
      setSimulatedProgress((current) => {
        const remaining = ceiling - current;
        if (remaining <= 0) return ceiling;
        return Math.min(ceiling, current + Math.max(1, Math.ceil(remaining * 0.12)));
      });
    }, 140);
    return () => window.clearInterval(timer);
  }, [ceiling, progress]);

  const displayedProgress = Math.max(0, Math.min(100, Math.round(progress ?? simulatedProgress)));

  return (
    <div className={`spatial-load-state${overlay ? ' is-overlay' : ''}`} aria-live="polite">
      <div className="spatial-load-content">
        <div className="spatial-load-heading">
          <span>{label}</span>
          <strong>{displayedProgress}%</strong>
        </div>
        <div
          className="spatial-load-track"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={displayedProgress}
        >
          <span style={{ width: `${displayedProgress}%` }} />
        </div>
        <p>Optimalizuji geometrii a připravuji živá data sálů</p>
      </div>
    </div>
  );
}
