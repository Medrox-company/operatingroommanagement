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
  /**
   * `rail` je svislá karta do pravého sloupce mezi horní a spodní ikony
   * v detailu sálu. Drží stejný tvar jako tlačítka kolem — zaoblení, vlasový
   * rámeček, průsvitná výplň a rozostřené pozadí — jen v jantarové barvě,
   * aby zůstala čitelná při kterékoli barvě fáze.
   */
  variant?: 'mobile' | 'desktop' | 'rail';
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

  if (variant === 'rail') {
    if (dismissedEventKey === transition.eventKey) return null;

    return (
      <section
        role="status"
        aria-live="polite"
        className={`relative overflow-hidden rounded-2xl border border-amber-300/25 bg-white/[0.05] p-3 text-center backdrop-blur-md ${className}`}
        style={{ boxShadow: '0 16px 40px rgba(0,0,0,0.28)' }}
      >
        {/* Vlasová linka nahoře — stejný prvek jako u ostatních karet aplikace. */}
        <span
          aria-hidden
          className="absolute inset-x-6 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, #FBBF24, transparent)' }}
        />

        <button
          type="button"
          onClick={() => setDismissedEventKey(transition.eventKey)}
          aria-label="Skrýt upozornění"
          className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-lg text-white/30 transition-colors hover:bg-white/10 hover:text-white/70"
        >
          <X className="h-3 w-3" strokeWidth={2.2} />
        </button>

        <span
          className="mx-auto grid h-9 w-9 place-items-center rounded-xl"
          style={{ background: 'rgba(251,191,36,0.14)', color: '#FBBF24' }}
        >
          <AlertTriangle className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </span>

        <p
          className="mt-2.5 text-[8px] font-medium uppercase tracking-[0.18em]"
          style={{ color: 'rgba(251,191,36,0.75)' }}
        >
          Krátký interval
        </p>

        <p className="mt-1.5 text-[10px] font-normal leading-snug text-white/70">
          Od příjezdu na sál<br />do výkonu uplynulo
        </p>

        <p
          className="mt-2 text-[26px] font-normal leading-none tabular-nums"
          style={{ color: '#FBBF24' }}
          aria-label={`Naměřený interval ${transition.formattedDuration}`}
        >
          {transition.formattedDuration}
        </p>
        <p className="mt-1 text-[8px] font-medium uppercase tracking-[0.16em] text-white/30">
          minut
        </p>
      </section>
    );
  }

  if (isMobile) {
    if (!isMobilePopupOpen) return null;

    return (
      /* Stejný jazyk jako popup detailu sálu: skoro černý podklad se světelným
         pruhem zleva shora, panel jako sklo s velkým zaoblením a hranou
         nasvícenou shora, uvnitř karty s rádiusem 16. Jantarová zůstává, ale
         nese ji ikona, popisek a číslo — ne barevný pruh přes celou hlavu. */
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rapid-surgery-warning-title"
        aria-describedby="rapid-surgery-warning-description"
        style={{
          background: [
            'linear-gradient(118deg, rgba(72,132,255,0.34) 0%, rgba(84,66,226,0.18) 24%, transparent 54%)',
            'radial-gradient(58% 50% at 6% 0%, rgba(120,168,255,0.26), transparent 68%)',
            'rgba(3,5,11,0.90)',
          ].join(', '),
          backdropFilter: 'blur(16px) brightness(0.5) saturate(0.9)',
          WebkitBackdropFilter: 'blur(16px) brightness(0.5) saturate(0.9)',
        }}
      >
        <section
          className="relative w-full max-w-[380px] overflow-hidden rounded-[30px] p-6"
          style={{
            background: 'linear-gradient(160deg, rgba(108,132,236,0.20) 0%, rgba(58,66,138,0.11) 34%, rgba(14,18,34,0.62) 72%, rgba(9,11,21,0.72) 100%)',
            border: '1px solid rgba(190,206,255,0.10)',
            boxShadow: '0 40px 110px rgba(0,0,0,0.68), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(255,255,255,0.03)',
          }}
        >
          <button
            type="button"
            onClick={() => setDismissedEventKey(transition.eventKey)}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-[13px] transition-colors active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.5)',
            }}
            aria-label="Zavřít upozornění"
          >
            <X className="h-4 w-4" strokeWidth={2.1} />
          </button>

          <div
            className="grid h-12 w-12 place-items-center rounded-[16px]"
            style={{
              background: 'rgba(245,158,11,0.13)',
              border: '1px solid rgba(245,158,11,0.22)',
              color: '#F59E0B',
            }}
          >
            <AlertTriangle className="h-6 w-6" strokeWidth={1.9} />
          </div>

          <p
            className="mt-5 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: 'rgba(245,158,11,0.80)' }}
          >
            Upozornění na časový interval
          </p>
          <h2
            id="rapid-surgery-warning-title"
            className="mt-2.5 pr-10 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-white"
          >
            Interval kratší než 5 minut
          </h2>
          <p
            id="rapid-surgery-warning-description"
            className="mt-3 text-[13px] leading-relaxed text-white/50"
          >
            Od příjezdu pacienta na sál do zahájení chirurgického výkonu uplynulo pouze
          </p>

          <div
            className="mt-5 flex items-baseline justify-center rounded-[16px] py-5"
            style={{
              background: 'rgba(245,158,11,0.07)',
              border: '1px solid rgba(245,158,11,0.16)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
            aria-label={`Naměřený interval ${transition.formattedDuration}`}
          >
            <strong className="text-[38px] font-light tabular-nums leading-none tracking-[-0.04em]" style={{ color: '#FBBF24' }}>
              {transition.formattedDuration}
            </strong>
            <span className="ml-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              min
            </span>
          </div>

          <button
            type="button"
            autoFocus
            onClick={() => setDismissedEventKey(transition.eventKey)}
            className="mt-5 h-12 w-full rounded-[16px] text-[13px] font-semibold tracking-[0.01em] transition-colors active:scale-[0.98]"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.88)',
            }}
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
      /* Stejná karta jako uvnitř popupu — rádius 16, tichý rámeček, odlesk po
         horní hraně. Dřív to byl jantarový pruh s rámečkem 0.42, který v
         klidném rozhraní působil jako poplach. */
      className={`flex items-center gap-3.5 rounded-[16px] px-4 py-3.5 ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.075), rgba(245,158,11,0.02))',
        border: '1px solid rgba(245,158,11,0.18)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px]"
        style={{
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.2)',
          color: '#F59E0B',
        }}
      >
        <AlertTriangle className="h-5 w-5" strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <strong
          className="block text-[12.5px] font-semibold leading-tight tracking-[-0.01em]"
          style={{ color: isMobile ? 'var(--m-text-strong)' : '#FFFFFF' }}
        >
          Interval kratší než 5 minut
        </strong>
        <span
          className="mt-1 block text-[10.5px] leading-relaxed"
          style={{ color: isMobile ? 'var(--m-muted)' : 'rgba(255,255,255,0.48)' }}
        >
          Od příjezdu pacienta na sál do zahájení chirurgického výkonu uplynulo pouze {transition.formattedDuration}.
        </span>
      </span>
      <span
        className="shrink-0 rounded-[13px] px-3 py-2 text-[15px] font-light tabular-nums tracking-[-0.02em]"
        style={{
          background: 'rgba(245,158,11,0.09)',
          border: '1px solid rgba(245,158,11,0.16)',
          color: '#FBBF24',
        }}
        aria-label={`Naměřený interval ${transition.formattedDuration}`}
      >
        {transition.formattedDuration}
      </span>
    </section>
  );
};

export const RapidSurgeryWarning = memo(RapidSurgeryWarningComponent);
