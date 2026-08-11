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

  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(value => String(value).padStart(2, '0'))
    .join(':');
  const date = now.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'long' });

  return (
    <div className="hidden md:flex min-w-0 flex-col items-center justify-end leading-none select-none">
      <span className="mb-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.3em] text-[#FBBF24] opacity-60 sm:mb-2 sm:text-[10px] sm:tracking-[0.4em]">
        {date}
      </span>
      {/* Menší základ (4vw) — se 7vw se hodiny na tabletu překrývaly s titulkem */}
      <span className="whitespace-nowrap text-[clamp(1.75rem,4vw,4.5rem)] font-bold tabular-nums tracking-tight text-white/90">
        {time}
      </span>
    </div>
  );
};

export default LiveClock;
