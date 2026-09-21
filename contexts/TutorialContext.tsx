'use client';

import { createContext, useContext } from 'react';

/**
 * Příznak, že běží interaktivní nápověda.
 *
 * Nápověda používá stejné komponenty jako ostrý provoz — detail sálu, výběr
 * personálu, notifikace — jen nad vymyšleným sálem. Tenhle příznak je pojistka,
 * aby se z výuky nikdy nic nezapsalo do databáze: komponenty podle něj přeskočí
 * zápis události i odeslání notifikace.
 */
export interface TutorialState {
  isTutorial: boolean;
}

const TutorialContext = createContext<TutorialState>({ isTutorial: false });

export const TutorialProvider = TutorialContext.Provider;

export function useTutorial(): TutorialState {
  return useContext(TutorialContext);
}
