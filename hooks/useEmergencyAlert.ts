import { useEffect, useRef, useCallback } from 'react';
import type { OperatingRoom } from '../types';

// Shared AudioContext - created once and reused
let sharedAudioContext: AudioContext | null = null;
let isAudioUnlocked = false;

// Unlock audio on mobile devices - must be called from user interaction
function unlockAudio() {
  if (isAudioUnlocked) return;
  
  try {
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume();
    }
    
    // Play a silent sound to unlock audio on iOS/mobile
    const buffer = sharedAudioContext.createBuffer(1, 1, 22050);
    const source = sharedAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(sharedAudioContext.destination);
    source.start(0);
    
    isAudioUnlocked = true;
  } catch (e) {
    console.error('[EmergencyAlert] Failed to unlock audio:', e);
  }
}

// Setup global unlock listeners
if (typeof window !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'mousedown', 'keydown', 'click'];
  
  const handleUnlock = () => {
    unlockAudio();
    // Remove listeners after unlock
    unlockEvents.forEach(event => {
      document.removeEventListener(event, handleUnlock, true);
    });
  };
  
  unlockEvents.forEach(event => {
    document.addEventListener(event, handleUnlock, true);
  });
}

// Play emergency alert sound
function playEmergencyAlert(): void {
  try {
    // Create AudioContext if not exists
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    
    // Resume if suspended (mobile browsers)
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume();
    }

    const audioContext = sharedAudioContext;

    // Čistý nemocniční alarm: měkký náběh, krátké třípulzní upozornění
    // a jemná harmonická vrstva. Je výrazný, ale nepůsobí jako agresivní siréna.
    const masterGain = audioContext.createGain();
    const compressor = audioContext.createDynamicsCompressor();
    masterGain.gain.setValueAtTime(0.32, audioContext.currentTime);
    compressor.threshold.setValueAtTime(-18, audioContext.currentTime);
    compressor.knee.setValueAtTime(12, audioContext.currentTime);
    compressor.ratio.setValueAtTime(5, audioContext.currentTime);
    masterGain.connect(compressor);
    compressor.connect(audioContext.destination);

    const playTone = (startTime: number, frequency: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const harmonic = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      harmonic.connect(gainNode);
      gainNode.connect(masterGain);

      oscillator.type = 'sine';
      harmonic.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, startTime);
      harmonic.frequency.setValueAtTime(frequency * 2, startTime);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.72, startTime + 0.035);
      gainNode.gain.setValueAtTime(0.62, startTime + duration * 0.58);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

      oscillator.start(startTime);
      harmonic.start(startTime);
      oscillator.stop(startTime + duration);
      harmonic.stop(startTime + duration);
    };

    const now = audioContext.currentTime + 0.02;
    playTone(now, 659.25, 0.2);        // E5
    playTone(now + 0.29, 783.99, 0.2); // G5
    playTone(now + 0.58, 987.77, 0.34);// B5 — delší potvrzovací pulz
  } catch (error) {
    console.error('[EmergencyAlert] Failed to play sound:', error);
  }
}

export function useEmergencyAlert(rooms: OperatingRoom[], openedRoomId: string | null) {
  const previousEmergencyStates = useRef<Map<string, boolean>>(new Map());
  const isInitialized = useRef(false);

  const checkForNewEmergency = useCallback((updatedRooms: OperatingRoom[]) => {
    // Skip first render to avoid playing sound on page load for existing emergencies
    if (!isInitialized.current) {
      // Initialize previous states without playing sound
      for (const room of updatedRooms) {
        previousEmergencyStates.current.set(room.id, room.isEmergency || false);
      }
      isInitialized.current = true;
      return;
    }

    for (const room of updatedRooms) {
      const wasEmergency = previousEmergencyStates.current.get(room.id) || false;
      const isNowEmergency = room.isEmergency || false;

      // Zvuk je lokální alarm konkrétního sálu: zazní pouze na klientovi,
      // který má v okamžiku aktivace otevřený právě tento sál. Ostatní
      // stanice dál obdrží a zobrazí vizuální nouzový stav, ale zůstanou tiché.
      if (!wasEmergency && isNowEmergency && room.id === openedRoomId) {
        playEmergencyAlert();
      }

      // Update stored state
      previousEmergencyStates.current.set(room.id, isNowEmergency);
    }
  }, [openedRoomId]);

  // Check for emergency changes whenever rooms update
  useEffect(() => {
    checkForNewEmergency(rooms);
  }, [rooms, checkForNewEmergency]);

  // Return function to manually trigger alert if needed
  return {
    playEmergencyAlert
  };
}
