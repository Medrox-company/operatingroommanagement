import React from 'react';
import { useNowDate } from '../hooks/useSharedClock';

/**
 * LiveClock — samostatná komponenta s vlastním stavem, aby se aktualizace času
 * (každou sekundu) NEpropisovala do re-renderu celého AppContentu ani karet sálů.
 * Zobrazuje aktuální čas (HH:MM:SS) a datum v češtině.
 */
const LiveClock: React.FC = () => {
  // Sdílený tik celé aplikace — jeden interval místo vlastního,
  // a na skryté záložce se zastaví úplně.
  const now = useNowDate();

  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(value => String(value).padStart(2, '0'))
    .join(':');
  const date = now.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'long' });

  return (
    <div className="hidden md:flex min-w-0 flex-col items-center justify-end leading-none select-none">
      <span className="app-module-kicker mb-2 whitespace-nowrap opacity-60">
        {date}
      </span>
      <span className="app-module-title whitespace-nowrap tabular-nums">
        {time}
      </span>
    </div>
  );
};

export default LiveClock;
