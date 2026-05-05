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

// Register device with server (one-time)
async function registerDevice() {
  try {
    const device_id = getOrCreateDeviceId();
    if (!device_id) return;
    
    const info = detectDeviceInfo();
    const is_pwa_installed = isRunningAsPWA();
    
    await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        device_id, 
        ...info, 
        is_pwa_installed 
      }),
    });
  } catch {
    // Silent fail - device registration is not critical
  }
}

/**
 * DeviceRegistration - Invisible component that registers the device once on mount.
 * No polling - just one-time registration when the app loads.
 */
export const DeviceRegistration: React.FC = () => {
  const registeredRef = useRef(false);

  useEffect(() => {
    // Register device on mount (only once per session)
    if (!registeredRef.current) {
      registeredRef.current = true;
      registerDevice();
    }
  }, []);

  return null;
};

export default DeviceRegistration;
