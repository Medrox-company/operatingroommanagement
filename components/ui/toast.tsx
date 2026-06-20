'use client';

import * as React from 'react';
import { Toaster as SonnerToaster, toast } from 'sonner';

/**
 * Toast notifikace (Sonner) sladěné s tmavým glass designem aplikace.
 *
 * Použití:
 *   1. Jednou vlož <AppToaster /> do kořene aplikace (App.tsx).
 *   2. Kdekoliv volej:
 *        import { toast } from '@/components/ui/toast';
 *        toast.success('Sál uložen');
 *        toast.error('Nepodařilo se uložit');
 */
export const AppToaster: React.FC = () => (
  <SonnerToaster
    position="top-center"
    theme="dark"
    richColors
    closeButton
    toastOptions={{
      style: {
        background: 'rgba(11,18,32,0.95)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: '#fff',
        backdropFilter: 'blur(16px)',
      },
    }}
  />
);

export { toast };
