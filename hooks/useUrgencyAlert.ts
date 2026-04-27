import { useEffect, useRef, useCallback } from 'react';
import type { OperatingRoom } from '../types';

/**
 * Jemná zvuková notifikace pro registraci akutního výkonu úrovní:
 *  - urgent     (URGENTNÍ)
 *  - expedited  (ODLOŽITELNÝ)
 *  - elective   (ELEKTIVNÍ)
 *
 * Zvuk je příjemný dvoutónový chime (sine wave) s pomalým attackem
 * a delším release — záměrně NE-rušivý, na rozdíl od immediate/EMERGENTNÍ
 * alarmu v useEmergencyAlert.
 */

// Sdílený AudioContext napříč hooky (kompatibilní s useEmergencyAlert)
let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume();
    }
    return sharedAudioContext;
  } catch (e) {
    console.error('[UrgencyAlert] AudioContext init failed:', e);
    return null;
  }
}

type GentleLevel = 'urgent' | 'expedited' | 'elective';

// Tónové sady pro jednotlivé úrovně — všechny příjemné intervaly v durovém ladění.
// Frekvence v Hz; hlasitost (gain) jemná, aby zvuk nerušil personál.
const URGENCY_TONES: Record<GentleLevel, { notes: number[]; gain: number; spacing: number }> = {
  // URGENTNÍ — výrazněji slyšitelný, tří­tónový vzestupný akord (C5 → E5 → G5)
  urgent:    { notes: [523.25, 659.25, 783.99], gain: 0.18, spacing: 0.18 },
  // ODLOŽITELNÝ — středně klidný, dvoutónový (C5 → G5, kvinta)
  expedited: { notes: [523.25, 783.99],          gain: 0.14, spacing: 0.20 },
  // ELEKTIVNÍ — nejjemnější, dvoutónový (E5 → G5, malá tercie)
  elective:  { notes: [659.25, 783.99],          gain: 0.12, spacing: 0.22 },
};

function playGentleChime(level: GentleLevel): void {
  const audioContext = getAudioContext();
  if (!audioContext) return;

  const config = URGENCY_TONES[level];
  const now = audioContext.currentTime;

  config.notes.forEach((freq, idx) => {
    const startTime = now + idx * config.spacing;
    const duration = 0.55; // delší release pro plynulé doznívání

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Sine wave — měkký, čistý tón bez harmonického ostří
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, startTime);

    // Envelope: pomalý attack (15ms), krátké sustain, dlouhý release
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(config.gain, startTime + 0.015);
    gainNode.gain.setValueAtTime(config.gain, startTime + 0.08);
    // Exponenciální release — přirozenější doznívání než lineární
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.05);
  });

  console.log(`[UrgencyAlert] Gentle chime played for level: ${level}`);
}

/**
 * Hook detekuje přechod urgencyLevel z žádné/jiné hodnoty
 * na 'urgent' | 'expedited' | 'elective' a spustí jemnou notifikaci.
 *
 * Nepřehrává se při prvním renderu (page load) ani pro level 'immediate'
 * (ten má vlastní harsh alarm v useEmergencyAlert).
 */
export function useUrgencyAlert(rooms: OperatingRoom[]) {
  const previousUrgencyLevels = useRef<Map<string, OperatingRoom['urgencyLevel']>>(new Map());
  const isInitialized = useRef(false);

  const checkForNewUrgency = useCallback((updatedRooms: OperatingRoom[]) => {
    if (!isInitialized.current) {
      // Iniciální stav — neaktivovat zvuk pro existující urgency
      for (const room of updatedRooms) {
        previousUrgencyLevels.current.set(room.id, room.urgencyLevel);
      }
      isInitialized.current = true;
      return;
    }

    for (const room of updatedRooms) {
      const previousLevel = previousUrgencyLevels.current.get(room.id);
      const currentLevel = room.urgencyLevel;

      // Detekuj přechod na jeden z jemných urgency levelů
      const isNewGentleUrgency =
        previousLevel !== currentLevel &&
        (currentLevel === 'urgent' || currentLevel === 'expedited' || currentLevel === 'elective');

      if (isNewGentleUrgency && currentLevel) {
        console.log(`[UrgencyAlert] New ${currentLevel} case for room: ${room.name}`);
        playGentleChime(currentLevel as GentleLevel);
      }

      previousUrgencyLevels.current.set(room.id, currentLevel);
    }
  }, []);

  useEffect(() => {
    checkForNewUrgency(rooms);
  }, [rooms, checkForNewUrgency]);

  return {
    playGentleChime: (level: GentleLevel) => playGentleChime(level),
  };
}
