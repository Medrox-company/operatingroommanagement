'use client';

import { useEffect, useState } from 'react';

/**
 * Sleduje uložený vzhled reprezentovaný třídou `.m-dark` na <html>.
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
