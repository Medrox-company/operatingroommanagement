'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * Jeden časovač pro celou aplikaci.
 *
 * Původně si každá komponenta s živým časem zakládala vlastní `setInterval`
 * (hodiny v hlavičce, hodiny v Timeline, tři čítače v detailu sálu, čítač
 * v Toku pacienta, tik ve statistikách…). Osm nezávislých intervalů znamená
 * osm probuzení hlavního vlákna za sekundu a osm samostatných překreslení —
 * na sálové stanici, kde aplikace běží nepřetržitě, je to zbytečná zátěž
 * i spotřeba.
 *
 * Tady běží jeden interval, který:
 *   • se spustí až s prvním odběratelem a po posledním se zase zruší,
 *   • se uspí, když je záložka skrytá (žádné překreslování na pozadí),
 *   • po probuzení okamžitě dorovná čas, aby hodiny nepřeskakovaly.
 */

type Listener = (now: number) => void;

const listeners = new Set<Listener>();
let alignTimeout: ReturnType<typeof setTimeout> | null = null;
let interval: ReturnType<typeof setInterval> | null = null;
let now = Date.now();
let visibilityBound = false;

function emit() {
  now = Date.now();
  listeners.forEach((listener) => listener(now));
}

function start() {
  if (interval !== null || alignTimeout !== null) return;
  // Zarovnání na celou sekundu — hodiny pak netikají o zlomek pozadu.
  alignTimeout = setTimeout(() => {
    alignTimeout = null;
    emit();
    interval = setInterval(emit, 1_000);
  }, 1_000 - (Date.now() % 1_000));
}

function stop() {
  if (alignTimeout !== null) {
    clearTimeout(alignTimeout);
    alignTimeout = null;
  }
  if (interval !== null) {
    clearInterval(interval);
    interval = null;
  }
}

function handleVisibility() {
  // Třída na <html> zastaví i dekorativní CSS smyčky (viz .app-idle v globals.css).
  document.documentElement.classList.toggle('app-idle', document.hidden);

  if (document.hidden) {
    stop();
    return;
  }
  if (listeners.size > 0) {
    emit(); // dorovnání času po návratu k záložce
    start();
  }
}

function subscribe(listener: Listener) {
  listeners.add(listener);

  if (!visibilityBound && typeof document !== 'undefined') {
    visibilityBound = true;
    document.addEventListener('visibilitychange', handleVisibility);
  }
  if (typeof document === 'undefined' || !document.hidden) start();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

/** Aktuální čas v ms, aktualizovaný jednou za sekundu. */
export function useNowMs(): number {
  const [value, setValue] = useState(now);
  useEffect(() => {
    setValue(Date.now());
    return subscribe(setValue);
  }, []);
  return value;
}

/** Aktuální čas jako Date. Nová instance vzniká jen při skutečné změně sekundy. */
export function useNowDate(): Date {
  const ms = useNowMs();
  return useMemo(() => new Date(ms), [ms]);
}

/** Čítač pro komponenty, které si čas počítají samy a potřebují jen impuls. */
export function useSecondTick(): number {
  return useNowMs();
}
