'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Sleduje třídu `.m-dark` na <html> (přepíná ji přepínač v App).
 * Komponenty s odlišným tmavým layoutem podle ní přepnou strukturu.
 */
export function useIsMobileDark(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const el = document.documentElement;
    const update = () => setDark(el.classList.contains('m-dark'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  return dark;
}

export function useMobileTheme() {
  const isDark = useIsMobileDark();

  const toggle = useCallback(() => {
    const root = document.documentElement;
    const nextDark = !root.classList.contains('m-dark');
    root.classList.toggle('m-dark', nextDark);
    try {
      localStorage.setItem('or-mobile-theme', nextDark ? 'dark' : 'light');
    } catch {
      // Motiv se přepne i bez dostupného localStorage, pouze se neuloží.
    }
  }, []);

  return { theme: isDark ? 'dark' as const : 'light' as const, isDark, toggle };
}
