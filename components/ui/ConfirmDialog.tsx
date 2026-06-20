'use client';

import * as React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Promise-based potvrzovací dialog (Radix). Nahrazuje nativní `confirm()`
 * hezčím, přístupným modálem sladěným s tmavým designem.
 *
 * Nastavení (jednou, v kořeni aplikace):
 *   <ConfirmProvider><App /></ConfirmProvider>
 *
 * Použití kdekoliv:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'Smazat sál?', danger: true }))) return;
 */
export interface ConfirmOptions {
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Červené potvrzovací tlačítko pro nevratné akce. */
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

export const useConfirm = (): ConfirmFn => {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    // Fallback na nativní confirm, kdyby provider chyběl (bezpečnostní síť).
    return async (o) => window.confirm(typeof o.title === 'string' ? o.title : 'Potvrdit akci?');
  }
  return ctx;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = React.useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <RadixDialog.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) settle(false);
        }}
      >
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" />
          <RadixDialog.Content
            className={cn(
              'fixed left-1/2 top-1/2 z-[201] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2',
              'rounded-2xl p-6 outline-none',
              'bg-[#0b1220]/98 border border-white/12 backdrop-blur-2xl',
              'shadow-[0_24px_64px_rgba(0,0,0,0.6)]',
            )}
          >
            <div className="flex items-start gap-3.5">
              {options?.danger && (
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
              )}
              <div className="flex-1">
                <RadixDialog.Title className="text-base font-bold text-white">
                  {options?.title}
                </RadixDialog.Title>
                {options?.description && (
                  <RadixDialog.Description className="mt-1.5 text-sm text-white/60 leading-relaxed">
                    {options.description}
                  </RadixDialog.Description>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => settle(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white/80 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 transition-colors"
              >
                {options?.cancelLabel ?? 'Zrušit'}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => settle(true)}
                className={cn(
                  'rounded-xl px-4 py-2.5 text-sm font-bold transition-colors',
                  options?.danger
                    ? 'text-white bg-red-500/90 hover:bg-red-500'
                    : 'text-black bg-[#FBBF24] hover:bg-[#F59E0B]',
                )}
              >
                {options?.confirmLabel ?? 'Potvrdit'}
              </button>
            </div>
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>
    </ConfirmContext.Provider>
  );
};
