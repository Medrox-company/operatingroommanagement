import React, { useState, useEffect } from 'react';

/**
 * LiveClock — samostatná komponenta s vlastním stavem, aby se aktualizace času
 * (každou sekundu) NEpropisovala do re-renderu celého AppContentu ani karet sálů.
 * Zobrazuje aktuální čas (HH:MM:SS) a datum v češtině.
 */
const LiveClock: React.FC = () => {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'long' });

  return (
    <div className="hidden sm:flex flex-col items-end leading-none select-none">
      <span className="text-xl md:text-2xl font-mono font-bold tabular-nums text-white/90 tracking-tight">
        {time}
      </span>
      <span className="mt-1 text-[9px] md:text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
        {date}
      </span>
    </div>
  );
};

export default LiveClock;
