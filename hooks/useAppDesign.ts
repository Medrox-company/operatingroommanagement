
'use client';
import { useCallback, useEffect, useState } from 'react';
export type AppDesign = 'classic' | 'cliniq';
export function useAppDesign() {
  const [design, setDesign] = useState<AppDesign>('classic');
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDesign(root.dataset.appDesign === 'cliniq' ? 'cliniq' : 'classic');
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-app-design'] });
    return () => observer.disconnect();
  }, []);
  const chooseDesign = useCallback((value: AppDesign) => {
    document.documentElement.dataset.appDesign = value;
    setDesign(value);
    try { localStorage.setItem('or-app-design', value); } catch { /* The visible choice still works. */ }
  }, []);
  return { design, chooseDesign };
}
