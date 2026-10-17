
'use client';
import { useEffect } from 'react';
export type AppDesign = 'cliniq';
export function useAppDesign() {
  useEffect(() => {
    document.documentElement.dataset.appDesign = 'cliniq';
  }, []);
  return { design: 'cliniq' as const };
}
