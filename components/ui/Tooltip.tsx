'use client';

import * as React from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

/**
 * Přístupný tooltip (Radix). Postará se o klávesnici, focus i pozicování.
 *
 * @example
 *   <Tooltip content="Smazat sál">
 *     <button>…</button>
 *   </Tooltip>
 *
 * Pro více tooltipů obalte aplikaci jednou do <TooltipProvider> (volitelné —
 * komponenta si provider vytvoří sama, pokud chybí).
 */
export const TooltipProvider = RadixTooltip.Provider;

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 200,
  className,
}) => {
  if (content == null || content === '') return <>{children}</>;
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            align={align}
            sideOffset={6}
            className={cn(
              'z-[100] max-w-xs rounded-lg px-2.5 py-1.5 text-xs font-medium text-white',
              'bg-[#0b1220]/95 border border-white/12 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
              'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out',
              className,
            )}
          >
            {content}
            <RadixTooltip.Arrow className="fill-[#0b1220]" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
};
