'use client';

import * as React from 'react';
import { Drawer as Vaul } from 'vaul';
import { cn } from '@/lib/utils';

/**
 * Mobilní bottom-sheet (vaul) — nativně působící vysouvací panel zdola s
 * táhnutím prstem k zavření. Ideální pro detail sálu na telefonu.
 *
 * @example
 *   <Drawer open={open} onOpenChange={setOpen} title="Sál 3">
 *     …obsah…
 *   </Drawer>
 */
interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  /** Výška panelu jako podíl výšky obrazovky (0–1). Výchozí auto dle obsahu. */
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onOpenChange,
  children,
  title,
  className,
}) => (
  <Vaul.Root open={open} onOpenChange={onOpenChange}>
    <Vaul.Portal>
      <Vaul.Overlay className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" />
      <Vaul.Content
        className={cn(
          'fixed bottom-0 left-0 right-0 z-[95] flex flex-col',
          'max-h-[92vh] rounded-t-3xl outline-none',
          'bg-[#0b1220]/98 border-t border-white/12 backdrop-blur-2xl',
          'shadow-[0_-12px_48px_rgba(0,0,0,0.6)]',
          className,
        )}
      >
        {/* úchyt pro táhnutí */}
        <div className="mx-auto mt-3 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-white/20" />
        {title && (
          <Vaul.Title className="px-5 pt-2 pb-3 text-lg font-bold text-white">
            {title}
          </Vaul.Title>
        )}
        <div className="overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
          {children}
        </div>
      </Vaul.Content>
    </Vaul.Portal>
  </Vaul.Root>
);
