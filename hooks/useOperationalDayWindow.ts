'use client';

import { useEffect, useState } from 'react';

/**
 * Okno provozního dne: 7:00 → 6:59 následujícího dne.
 *
 * Karty sálů z něj počítají počet dnešních cyklů. Dřív se okno spočítalo jednou
 * při renderu, takže dashboard běžící přes noc ukazoval po sedmé ráno pořád
 * ještě včerejší počty, dokud se stránka neobnovila.
 *
 * Časovač je jeden pro celou aplikaci (modulová proměnná) a odběratele budí jen
 * ve chvíli, kdy se okno opravdu překlopí — ne každou minutu.
 */

export const OPERATIONAL_DAY_START_HOUR = 7;

export interface OperationalDayWindow {
  start: number;
  end: number;
}

export function operationalDayWindow(now: Date = new Date()): OperationalDayWindow {
  const start = new Date(now);
  if (now.getHours() < OPERATIONAL_DAY_START_HOUR) {
    start.setDate(start.getDate() - 1);
  }
  start.setHours(OPERATIONAL_DAY_START_HOUR, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);

  return { start: start.getTime(), end: end.getTime() };
}

type Listener = (window: OperationalDayWindow) => void;

let current: OperationalDayWindow = operationalDayWindow();
const listeners = new Set<Listener>();
let timer: ReturnType<typeof setInterval> | null = null;

function tick() {
  const next = operationalDayWindow();
  if (next.start === current.start) return;
  current = next;
  listeners.forEach((listener) => listener(current));
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  if (!timer) {
    // Stačí minutová granularita — okno se mění jednou za 24 h.
    timer = setInterval(tick, 60_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useOperationalDayWindow(): OperationalDayWindow {
  const [window_, setWindow] = useState<OperationalDayWindow>(current);

  useEffect(() => {
    // Mezi renderem a připojením mohlo okno přeskočit (např. probuzení notebooku).
    tick();
    setWindow(current);
    return subscribe(setWindow);
  }, []);

  return window_;
}
