import { useEffect, useRef } from 'react';
import type { OperatingRoom } from '../types';
import { sendEmailNotification, generateEmailTemplate } from '../lib/email';

interface NotificationSettings {
  emergencyEnabled: boolean;
  statusChangeEnabled: boolean;
  queueUpdateEnabled: boolean;
  recipientEmail?: string;
}

/**
 * Hook for automatic email notifications on operating room changes
 */
export function useEmailNotifications(
  rooms: OperatingRoom[],
  settings: NotificationSettings
) {
  const previousStates = useRef<Map<string, Partial<OperatingRoom>>>(new Map());
  const isInitialized = useRef(false);
  const lastEmergencyEmailTime = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    // Skip initialization - just store initial states
    if (!isInitialized.current) {
      for (const room of rooms) {
        previousStates.current.set(room.id, {
          isEmergency: room.isEmergency,
          status: room.status,
          queueCount: room.queueCount,
          isLocked: room.isLocked,
          isPaused: room.isPaused,
        });
      }
      isInitialized.current = true;
      return;
    }

    // Check for changes in rooms
    for (const room of rooms) {
      const previousState = previousStates.current.get(room.id);
      if (!previousState) continue;

      // Emergency Alert
      if (
        settings.emergencyEnabled &&
        settings.recipientEmail &&
        previousState.isEmergency === false &&
        room.isEmergency === true
      ) {
        // Throttle emergency emails - max 1 per 5 minutes per room
        const lastTime = lastEmergencyEmailTime.current.get(room.id) || 0;
        const now = Date.now();
        if (now - lastTime > 5 * 60 * 1000) {
          sendEmergencyEmailNotification(room, settings.recipientEmail);
          lastEmergencyEmailTime.current.set(room.id, now);
        }
      }

      // Status Change Notification
      if (
        settings.statusChangeEnabled &&
        settings.recipientEmail &&
        previousState.status !== room.status
      ) {
        sendStatusChangeEmailNotification(room, previousState.status || '', settings.recipientEmail);
      }

      // Queue Update Notification
      if (
        settings.queueUpdateEnabled &&
        settings.recipientEmail &&
        previousState.queueCount !== room.queueCount &&
        room.queueCount > 0
      ) {
        sendQueueUpdateEmailNotification(room, previousState.queueCount || 0, settings.recipientEmail);
      }

      // Update stored state
      previousStates.current.set(room.id, {
        isEmergency: room.isEmergency,
        status: room.status,
        queueCount: room.queueCount,
        isLocked: room.isLocked,
        isPaused: room.isPaused,
      });
    }
  }, [rooms, settings]);
}

async function sendEmergencyEmailNotification(
  room: OperatingRoom,
  recipientEmail: string
): Promise<void> {
  try {
    const html = generateEmailTemplate({
      type: 'emergency_alert',
      roomName: room.name,
      message: '🚨 V tomto operačním sále byla aktivována pohotovost v nouzi!',
      details: {
        'Oddělení': room.department,
        'Čas': new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' }),
        'Stav': room.status,
        'Septický': room.isSeptic ? 'Ano' : 'Ne',
      },
    });

    await sendEmailNotification({
      to: recipientEmail,
      subject: `🚨 POHOTOVOST: ${room.name} - Vyžaduje se okamžité jednání`,
      html,
    });

    console.log('[EmailNotifications] Emergency email sent for room:', room.name);
  } catch (error) {
    console.error('[EmailNotifications] Failed to send emergency email:', error);
  }
}

async function sendStatusChangeEmailNotification(
  room: OperatingRoom,
  previousStatus: string,
  recipientEmail: string
): Promise<void> {
  try {
    const html = generateEmailTemplate({
      type: 'status_change',
      roomName: room.name,
      message: `Stav operačního sálu se změnil z ${previousStatus} na ${room.status}`,
      details: {
        'Předchozí stav': previousStatus,
        'Nový stav': room.status,
        'Oddělení': room.department,
        'Čas': new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' }),
      },
    });

    await sendEmailNotification({
      to: recipientEmail,
      subject: `Aktualizace stavu: ${room.name} - ${previousStatus} → ${room.status}`,
      html,
    });

    console.log('[EmailNotifications] Status change email sent for room:', room.name);
  } catch (error) {
    console.error('[EmailNotifications] Failed to send status change email:', error);
  }
}

async function sendQueueUpdateEmailNotification(
  room: OperatingRoom,
  previousQueueCount: number,
  recipientEmail: string
): Promise<void> {
  try {
    const html = generateEmailTemplate({
      type: 'queue_update',
      roomName: room.name,
      message: `Fronta byla aktualizována v operačním sále`,
      details: {
        'Předchozí fronta': previousQueueCount.toString(),
        'Nová fronta': room.queueCount.toString(),
        'Změna': (room.queueCount - previousQueueCount > 0 ? '+' : '') + (room.queueCount - previousQueueCount),
        'Oddělení': room.department,
        'Čas': new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' }),
      },
    });

    await sendEmailNotification({
      to: recipientEmail,
      subject: `Aktualizace fronty: ${room.name} - ${previousQueueCount} → ${room.queueCount} pacientů`,
      html,
    });

    console.log('[EmailNotifications] Queue update email sent for room:', room.name);
  } catch (error) {
    console.error('[EmailNotifications] Failed to send queue update email:', error);
  }
}
