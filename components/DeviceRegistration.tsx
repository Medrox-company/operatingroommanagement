'use client';

import { useEffect, useRef } from 'react';

// Generate or get device ID from localStorage
function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  const STORAGE_KEY = 'orm_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    deviceId = 'dev_' + crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  return deviceId;
}

// Detect device info
function detectDeviceInfo() {
  if (typeof window === 'undefined') {
    return { device_name: 'Unknown', device_type: 'unknown', platform: 'unknown', browser: 'unknown' };
  }
  const ua = navigator.userAgent;
  
  let platform = 'unknown';
  if (/Windows/i.test(ua)) platform = 'Windows';
  else if (/Mac/i.test(ua)) platform = 'macOS';
  else if (/Linux/i.test(ua) && !/Android/i.test(ua)) platform = 'Linux';
  else if (/Android/i.test(ua)) platform = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) platform = 'iOS';
  
  let browser = 'unknown';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  
  let device_type = 'desktop';
  if (/Mobile/i.test(ua) && !/iPad/i.test(ua)) device_type = 'mobile';
  else if (/Tablet|iPad/i.test(ua)) device_type = 'tablet';
  
  return { 
    device_name: `${platform} ${browser} (${device_type})`, 
    device_type, 
    platform, 
    browser 
  };
}

// Check if running as PWA
function isRunningAsPWA(): boolean {
  if (typeof window === 'undefined') return false;
  interface NavigatorWithStandalone extends Navigator {
    standalone?: boolean;
  }
  const nav = navigator as NavigatorWithStandalone;
  return nav.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches;
}

// Register device with server
async function registerDevice() {
  try {
    const device_id = getOrCreateDeviceId();
    console.log('[v0] DeviceRegistration - device_id:', device_id);
    if (!device_id) {
      console.log('[v0] DeviceRegistration - no device_id, skipping');
      return;
    }
    
    const info = detectDeviceInfo();
    const is_pwa_installed = isRunningAsPWA();
    
    console.log('[v0] DeviceRegistration - registering device:', { device_id, ...info, is_pwa_installed });
    
    const response = await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        device_id, 
        ...info, 
        is_pwa_installed 
      }),
    });
    
    console.log('[v0] DeviceRegistration - response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('[v0] DeviceRegistration - success:', data);
      // Store active status for blocking if deactivated
      if (data.isActive === false) {
        console.warn('[Device] This device has been deactivated');
      }
    } else {
      const errorText = await response.text();
      console.error('[v0] DeviceRegistration - error response:', errorText);
    }
  } catch (error) {
    console.error('[v0] DeviceRegistration - failed:', error);
  }
}

// Heartbeat to update last_seen_at
async function sendHeartbeat() {
  try {
    const device_id = getOrCreateDeviceId();
    if (!device_id) return;
    
    await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        device_id,
        // Just update last_seen_at
      }),
    });
  } catch (error) {
    // Silent fail
  }
}

/**
 * DeviceRegistration - Invisible component that registers the device
 * and sends periodic heartbeats to track online status
 */
export const DeviceRegistration: React.FC = () => {
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const registeredRef = useRef(false);

  useEffect(() => {
    console.log('[v0] DeviceRegistration component mounted');
    
    // Register device on mount (only once)
    if (!registeredRef.current) {
      registeredRef.current = true;
      console.log('[v0] DeviceRegistration - calling registerDevice()');
      registerDevice();
    }

    // Send heartbeat every 2 minutes to keep device "online" status
    heartbeatRef.current = setInterval(() => {
      sendHeartbeat();
    }, 2 * 60 * 1000); // 2 minutes

    // Send heartbeat when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // This component renders nothing
  return null;
};

export default DeviceRegistration;
