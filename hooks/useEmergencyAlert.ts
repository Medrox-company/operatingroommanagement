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
    console.log('[EmergencyAlert] Audio unlocked for mobile');
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

    // Create a more urgent alarm sound pattern
    const playTone = (startTime: number, frequency: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(frequency, startTime);
      
      // Quick attack, sustain, quick release
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
      gainNode.gain.setValueAtTime(0.4, startTime + duration - 0.02);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = audioContext.currentTime;
    
    // Play alternating high-low emergency pattern (5 cycles for more urgency)
    for (let i = 0; i < 5; i++) {
      const cycleStart = now + i * 0.35;
      playTone(cycleStart, 880, 0.12);        // High tone (A5)
      playTone(cycleStart + 0.17, 440, 0.12); // Low tone (A4)
    }

    console.log('[EmergencyAlert] Sound played');

  } catch (error) {
    console.error('[EmergencyAlert] Failed to play sound:', error);
  }
}

export function useEmergencyAlert(rooms: OperatingRoom[], selectedRoomId: string | null) {
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

      // If emergency was just activated (changed from false to true)
      if (!wasEmergency && isNowEmergency) {
        // Skip harsh siren for 'urgent' level — useUrgencyAlert přehraje jemný chime.
        // Harsh alarm zazní pouze pro 'immediate' (EMERGENTNÍ) nebo legacy emergency
        // bez urgencyLevel (zpětná kompatibilita).
        if (room.urgencyLevel === 'urgent') {
          console.log('[EmergencyAlert] Skipping harsh siren for URGENTNÍ — gentle chime handled separately');
        } else {
          console.log('[EmergencyAlert] Emergency activated for room:', room.name);
          // Play sound on all devices where this room is visible
          playEmergencyAlert();
        }
      }

      // Update stored state
      previousEmergencyStates.current.set(room.id, isNowEmergency);
    }
  }, []);

  // Check for emergency changes whenever rooms update
  useEffect(() => {
    checkForNewEmergency(rooms);
  }, [rooms, checkForNewEmergency]);

  // Return function to manually trigger alert if needed
  return {
    playEmergencyAlert
  };
}
