'use client';

import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

interface WorkflowStatus {
  id: string;
  name: string;
  color: string;
  order_index: number;
  default_duration?: number;
  default_duration_minutes?: number;
}

interface StepConfirmationOverlayProps {
  pendingStepIndex: number | null;
  activeDbStatuses: WorkflowStatus[];
  safeStepIndex: number;
  validStepCount: number;
  elapsedSeconds: number | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/* Barvy tlačítek. Potvrzení zelené, zrušení červené — pevně, nezávisle na
   barvě fáze, aby význam zůstal čitelný na první pohled.

   Disk je vyplněný (žádný prázdný černý střed), ale barva v něm sedí v
   hloubce: světlo vychází ze středu, na povrchu je jen odlesk shora a
   barevný prstenec po obvodu. Sytá plocha přes celý kruh působila lacině. */
function disk(r: number, g: number, b: number) {
  const c = (a: number) => `rgba(${r},${g},${b},${a})`;
  return {
    fill: [
      `radial-gradient(circle at 50% 52%, ${c(0.38)} 0%, ${c(0.2)} 58%, ${c(0.1)} 100%)`,
      `linear-gradient(145deg, ${c(0.18)}, rgba(7,10,13,0.98))`,
    ].join(', '),
    /* Okamžitý hover bez přechodu nebo pohybové animace. */
    hover: `radial-gradient(circle at 50% 52%, ${c(0.54)} 0%, ${c(0.3)} 60%, ${c(0.14)} 100%)`,
    shadow: [
      `inset 0 0 0 5px ${c(0.94)}`,
      `inset 0 0 0 7px ${c(0.18)}`,
      `0 0 54px ${c(0.3)}`,
      `0 22px 64px ${c(0.22)}`,
    ].join(', '),
  };
}

const POTVRDIT = { ...disk(16, 185, 129), glow: '#10b981' };
const ZRUSIT = { ...disk(229, 72, 77), glow: '#ef4444' };

const StepConfirmationOverlay: React.FC<StepConfirmationOverlayProps> = ({
  pendingStepIndex,
  activeDbStatuses,
  safeStepIndex,
  validStepCount,
  elapsedSeconds,
  onConfirm,
  onCancel,
}) => {
  if (pendingStepIndex === null) return null;

  const pendingStep = activeDbStatuses[Math.min(pendingStepIndex, activeDbStatuses.length - 1)];
  const isReset = pendingStepIndex === 0 && safeStepIndex === validStepCount - 1;
  const currentStep = activeDbStatuses[Math.min(safeStepIndex, activeDbStatuses.length - 1)];
  const averageMinutes = Math.max(
    1,
    currentStep?.default_duration_minutes || currentStep?.default_duration || 5,
  );
  const isShortInterval = elapsedSeconds !== null && elapsedSeconds < 5 * 60;
  const elapsedLabel = elapsedSeconds === null
    ? '—'
    : elapsedSeconds < 60
      ? `${elapsedSeconds} s`
      : `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`;

  return (
    <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="step-confirm-title"
        aria-describedby={isShortInterval ? 'step-short-interval-warning' : undefined}
        className="absolute inset-0 z-[200] flex items-center justify-center overflow-hidden"
      >
        {/* Průsvitné sklo ponechá čitelnou atmosféru detailu sálu pod dialogem. */}
        <div className="absolute inset-0 step-confirm-bg" />
        <div className="absolute inset-0 hidden md:block bg-[radial-gradient(circle_at_50%_42%,_rgba(255,255,255,0.035)_0%,_transparent_38%,_rgba(1,10,19,0.34)_100%)]" />

        {/* Statická atmosféra podle pozadí notifikací, pouze v červené a zelené. */}
        <div
          className="glow-soft absolute -left-28 top-0 bottom-0 w-[34%] z-10 opacity-[0.12] md:opacity-25"
          style={{ '--glow': ZRUSIT.glow, '--glow-strength': '68%' } as React.CSSProperties}
        />
        <div
          className="glow-soft absolute -right-28 top-0 bottom-0 w-[34%] z-10 opacity-[0.12] md:opacity-25"
          style={{ '--glow': POTVRDIT.glow, '--glow-strength': '68%' } as React.CSSProperties}
        />

        <div className="flex flex-col items-center relative z-10 px-4 w-full">

          {/* Záhlaví */}
          <div className="text-center">
            <p className="text-[9px] sm:text-[10px] font-semibold step-confirm-muted tracking-[0.42em] uppercase">
              Potvrzení přechodu
            </p>
            <h2
              id="step-confirm-title"
              className="mt-3.5 text-3xl sm:text-5xl md:text-6xl font-bold tracking-[-0.035em] step-confirm-text"
            >
              {isReset ? 'Nový cyklus' : pendingStep?.name || 'Další fáze'}
            </h2>
          </div>

          {/* Upozornění na neobvykle krátký interval */}
          {isShortInterval && (
            <div
              id="step-short-interval-warning"
              className="mt-6 w-full max-w-xl rounded-2xl px-4 py-3.5 flex items-start gap-3.5 step-confirm-warn"
              role="alert"
            >
              <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-400/12 border border-amber-300/25">
                <AlertTriangle className="w-4 h-4 text-amber-500 md:text-amber-300" />
              </span>
              <p className="text-[12.5px] leading-relaxed step-confirm-muted min-w-0">
                Fáze <span className="font-medium step-confirm-text">{currentStep?.name || 'aktuální krok'}</span>{' '}
                trvá pouze <span className="font-semibold text-amber-600 md:text-amber-300">{elapsedLabel}</span> —
                méně než 5 minut a kratší než nastavený průměr tohoto kroku ({averageMinutes} min).
                Opravdu chcete přejít dál?
              </p>
            </div>
          )}

          {/* Tlačítka */}
          <div className={`flex items-center gap-[clamp(2rem,8vw,7rem)] ${isShortInterval ? 'mt-9 md:mt-11' : 'mt-12 md:mt-16'}`}>

            {/* ZRUŠIT */}
            <button
              onClick={onCancel}
              aria-label="Zrušit změnu fáze"
              className="group flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300/80 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent cursor-pointer"
            >
              <span
                className="step-confirm-action-disc relative flex flex-col items-center justify-center rounded-full"
                style={{
                  backgroundImage: ZRUSIT.fill,
                  boxShadow: ZRUSIT.shadow,
                  '--confirm-color': ZRUSIT.glow,
                } as React.CSSProperties}
              >
                {/* Okamžité zesytění bez animace. */}
                <span
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
                  style={{ backgroundImage: ZRUSIT.hover }}
                />
                <X className="relative w-10 h-10 sm:w-14 sm:h-14 md:w-[64px] md:h-[64px] text-white" strokeWidth={1.65} />
                <span className="relative mt-4 text-[10px] sm:text-xs md:text-sm font-bold tracking-[0.22em] uppercase text-white/40 group-hover:text-white/65">
                  Zrušit
                </span>
              </span>
            </button>

            {/* POTVRDIT */}
            <button
              onClick={onConfirm}
              aria-label="Potvrdit změnu fáze"
              className="group flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/80 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent cursor-pointer"
            >
              <span
                className="step-confirm-action-disc relative flex flex-col items-center justify-center rounded-full"
                style={{
                  backgroundImage: POTVRDIT.fill,
                  boxShadow: POTVRDIT.shadow,
                  '--confirm-color': POTVRDIT.glow,
                } as React.CSSProperties}
              >
                <span
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
                  style={{ backgroundImage: POTVRDIT.hover }}
                />
                <Check className="relative w-11 h-11 sm:w-16 sm:h-16 md:w-[70px] md:h-[70px] text-white" strokeWidth={1.7} />
                <span className="relative mt-4 text-[10px] sm:text-xs md:text-sm font-bold tracking-[0.22em] uppercase text-white/40 group-hover:text-white/65">
                  Potvrdit
                </span>
              </span>
            </button>

          </div>
        </div>
    </div>
  );
};

export default StepConfirmationOverlay;
