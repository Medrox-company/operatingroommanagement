import { useEffect, useRef, useCallback } from 'react';
import type { OperatingRoom } from '../types';

// Create emergency alert sound using Web Audio API
function createEmergencySound(): () => void {
  let audioContext: AudioContext | null = null;
  let isPlaying = false;

  return () => {
    // Prevent multiple simultaneous plays
    if (isPlaying) return;
    
    try {
      // Create or resume AudioContext (needed for browsers that require user interaction)
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      isPlaying = true;

      // Create a more urgent alarm sound pattern
      const playTone = (startTime: number, frequency: number, duration: number) => {
        const oscillator = audioContext!.createOscillator();
        const gainNode = audioContext!.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext!.destination);
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(frequency, startTime);
        
        // Quick attack, sustain, quick release
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
        gainNode.gain.setValueAtTime(0.3, startTime + duration - 0.02);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioContext.currentTime;
      
      // Play alternating high-low emergency pattern (3 cycles)
      for (let i = 0; i < 3; i++) {
        const cycleStart = now + i * 0.4;
        playTone(cycleStart, 880, 0.15);        // High tone (A5)
        playTone(cycleStart + 0.2, 440, 0.15);  // Low tone (A4)
      }

      // Reset isPlaying after sound completes
      setTimeout(() => {
        isPlaying = false;
      }, 1500);

    } catch (error) {
      console.error('[EmergencyAlert] Failed to play sound:', error);
      isPlaying = false;
    }
  };
}

export function useEmergencyAlert(rooms: OperatingRoom[], selectedRoomId: string | null) {
  const previousEmergencyStates = useRef<Map<string, boolean>>(new Map());
  const playEmergencySound = useRef(createEmergencySound());

  const checkForNewEmergency = useCallback((updatedRooms: OperatingRoom[]) => {
    for (const room of updatedRooms) {
      const wasEmergency = previousEmergencyStates.current.get(room.id) || false;
      const isNowEmergency = room.isEmergency || false;

      // If emergency was just activated (changed from false to true)
      if (!wasEmergency && isNowEmergency) {
        console.log('[EmergencyAlert] Emergency activated for room:', room.name);
        
        // Play sound - especially if this room is currently selected/visible
        playEmergencySound.current();
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
    playEmergencySound: playEmergencySound.current
  };
}
