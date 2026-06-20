import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Spojí podmíněné Tailwind třídy a chytře vyřeší konflikty
 * (např. `cn('p-2', condition && 'p-4')` → `p-4`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
