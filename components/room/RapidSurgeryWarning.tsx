import React, { memo, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { WorkflowStatus } from '../../contexts/WorkflowStatusesContext';
import { OperatingRoom } from '../../types';

const RAPID_SURGERY_THRESHOLD_MS = 5 * 60 * 1000;

const normalize = (value: string): string => value
  .toLocaleLowerCase('cs-CZ')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const findWorkflowIndex = (
  statuses: WorkflowStatus[],
  predicate: (normalizedName: string) => boolean,
): number => statuses.findIndex(status => predicate(normalize(status.name || status.title || '')));

interface RapidTransition {
  formattedDuration: string;
  eventKey: string;
}

const resolveRapidTransition = (
  room: OperatingRoom,
  statuses: WorkflowStatus[],
): RapidTransition | null => {
  const arrivalIndex = findWorkflowIndex(statuses, name =>
    name.includes('prijezd na sal') || (name.includes('prijezd') && name.includes('sal'))
  );
  const surgeryIndex = findWorkflowIndex(statuses, name =>
    (name.includes('chirurg') && name.includes('vykon')) || name.includes('operacni vykon')
  );
  if (arrivalIndex < 0 || surgeryIndex < 0) return null;

  const history = (room.statusHistory || [])
    .map(entry => ({ ...entry, timestamp: new Date(entry.startedAt).getTime() }))
    .filter(entry => Number.isFinite(entry.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  const surgeryEntry = [...history].reverse().find(entry => entry.stepIndex === surgeryIndex);
  const surgeryStartedAt = surgeryEntry?.timestamp
    ?? (room.currentStepIndex === surgeryIndex && room.phaseStartedAt
      ? new Date(room.phaseStartedAt).getTime()
      : Number.NaN);
  if (!Number.isFinite(surgeryStartedAt)) return null;

  const arrivalEntry = [...history]
    .reverse()
    .find(entry => entry.stepIndex === arrivalIndex && entry.timestamp <= surgeryStartedAt);
  const arrivalStartedAt = arrivalEntry?.timestamp
    ?? (room.operationStartedAt ? new Date(room.operationStartedAt).getTime() : Number.NaN);
  if (!Number.isFinite(arrivalStartedAt)) return null;

  const durationMs = surgeryStartedAt - arrivalStartedAt;
  if (durationMs < 0 || durationMs >= RAPID_SURGERY_THRESHOLD_MS) return null;

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return {
    formattedDuration: `${minutes}:${String(seconds).padStart(2, '0')}`,
    eventKey: String(surgeryStartedAt),
  };
};

interface RapidSurgeryWarningProps {
  room: OperatingRoom;
  statuses: WorkflowStatus[];
  variant?: 'mobile' | 'desktop';
  className?: string;
}

const RapidSurgeryWarningComponent = ({
  room,
  statuses,
  variant = 'mobile',
  className = '',
}: RapidSurgeryWarningProps) => {
  const transition = useMemo(
    () => resolveRapidTransition(room, statuses),
    [room.currentStepIndex, room.operationStartedAt, room.phaseStartedAt, room.statusHistory, statuses],
  );
  const [dismissedEventKey, setDismissedEventKey] = useState<string | null>(null);

  const isMobile = variant === 'mobile';
  const isMobilePopupOpen = Boolean(
    isMobile && transition && dismissedEventKey !== transition.eventKey,
  );

  useEffect(() => {
    if (!isMobilePopupOpen || !transition) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDismissedEventKey(transition.eventKey);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isMobilePopupOpen, transition]);

  if (!transition) return null;

  if (isMobile) {
    if (!isMobilePopupOpen) return null;

    return (
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-[#030712]/75 p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rapid-surgery-warning-title"
        aria-describedby="rapid-surgery-warning-description"
      >
        <section
          className="relative w-full max-w-[360px] overflow-hidden rounded-[28px] p-5"
          style={{
            background: 'var(--m-card-solid)',
            border: '1px solid rgba(245,158,11,0.30)',
            boxShadow: '0 24px 70px rgba(3,7,18,0.42)',
          }}
        >
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1"
            style={{ background: 'linear-gradient(90deg, #F59E0B, #FB7185)' }}
          />

          <button
            type="button"
            onClick={() => setDismissedEventKey(transition.eventKey)}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full active:scale-95"
            style={{ background: 'var(--m-card-2)', color: 'var(--m-muted)' }}
            aria-label="Zavřít upozornění"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>

          <div
            className="grid h-12 w-12 place-items-center rounded-[16px]"
            style={{ background: 'rgba(245,158,11,0.14)', color: '#F59E0B' }}
          >
            <AlertTriangle className="h-6 w-6" strokeWidth={2.1} />
          </div>

          <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: '#F59E0B' }}>
            Upozornění na časový interval
          </p>
          <h2
            id="rapid-surgery-warning-title"
            className="mt-2 pr-8 text-[21px] font-extrabold leading-tight"
            style={{ color: 'var(--m-text-strong)' }}
          >
            Interval kratší než 5 minut
          </h2>
          <p
            id="rapid-surgery-warning-description"
            className="mt-3 text-[13px] leading-relaxed"
            style={{ color: 'var(--m-muted)' }}
          >
            Od příjezdu pacienta na sál do zahájení chirurgického výkonu uplynulo pouze
          </p>

          <div
            className="mt-4 flex items-baseline justify-center rounded-[18px] py-4"
            style={{ background: 'rgba(245,158,11,0.10)' }}
            aria-label={`Naměřený interval ${transition.formattedDuration}`}
          >
            <strong className="text-[34px] font-black tabular-nums leading-none" style={{ color: '#F59E0B' }}>
              {transition.formattedDuration}
            </strong>
            <span className="ml-2 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--m-muted)' }}>
              min
            </span>
          </div>

          <button
            type="button"
            autoFocus
            onClick={() => setDismissedEventKey(transition.eventKey)}
            className="mt-5 h-12 w-full rounded-[16px] text-[13px] font-extrabold active:scale-[0.98]"
            style={{ background: '#F59E0B', color: '#111827' }}
          >
            Rozumím, zavřít
          </button>
        </section>
      </div>
    );
  }

  return (
    <section
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 rounded-[18px] px-4 py-3.5 ${className}`}
      style={{
        background: isMobile
          ? 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(239,68,68,0.10)), var(--m-card-solid)'
          : 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(239,68,68,0.08)), rgba(12,18,31,0.96)',
        border: '1px solid rgba(245,158,11,0.42)',
        boxShadow: '0 12px 30px rgba(120,53,15,0.16)',
      }}
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px]"
        style={{ background: 'rgba(245,158,11,0.16)', color: '#F59E0B' }}
      >
        <AlertTriangle className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <strong
          className="block text-[12px] font-extrabold leading-tight"
          style={{ color: isMobile ? 'var(--m-text-strong)' : '#FFFFFF' }}
        >
          Interval kratší než 5 minut
        </strong>
        <span
          className="mt-1 block text-[10px] leading-relaxed"
          style={{ color: isMobile ? 'var(--m-muted)' : 'rgba(255,255,255,0.55)' }}
        >
          Od příjezdu pacienta na sál do zahájení chirurgického výkonu uplynulo pouze {transition.formattedDuration}.
        </span>
      </span>
      <span
        className="shrink-0 rounded-xl px-2.5 py-2 text-[13px] font-black tabular-nums"
        style={{ background: 'rgba(245,158,11,0.14)', color: '#FBBF24' }}
        aria-label={`Naměřený interval ${transition.formattedDuration}`}
      >
        {transition.formattedDuration}
      </span>
    </section>
  );
};

export const RapidSurgeryWarning = memo(RapidSurgeryWarningComponent);
