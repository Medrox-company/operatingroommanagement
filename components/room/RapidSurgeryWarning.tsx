import React, { memo, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
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

  if (!transition) return null;

  const isMobile = variant === 'mobile';
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
