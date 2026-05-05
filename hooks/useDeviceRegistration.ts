'use client';

import { useEffect, useState, useCallback } from 'react';

interface DeviceInfo {
  device_id: string;
  device_name: string;
  device_type: string;
  platform: string;
  browser: string;
  is_pwa_installed: boolean;
}

interface RegistrationResult {
  isNew: boolean;
  isActive: boolean;
  device: DeviceInfo | null;
}

// Generate a unique device ID and store it in localStorage
function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  const STORAGE_KEY = 'orm_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  
  if (!deviceId) {
    // Generate a UUID-like ID
    deviceId = 'dev_' + crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  
  return deviceId;
}

// Detect device information
function detectDeviceInfo(): Omit<DeviceInfo, 'device_id' | 'is_pwa_installed'> {
  if (typeof window === 'undefined') {
    return {
      device_name: 'Unknown',
      device_type: 'unknown',
      platform: 'unknown',
      browser: 'unknown',
    };
  }

  const ua = navigator.userAgent;
  
  // Detect platform
  let platform = 'unknown';
  if (/Windows/i.test(ua)) platform = 'Windows';
  else if (/Mac/i.test(ua)) platform = 'macOS';
  else if (/Linux/i.test(ua)) platform = 'Linux';
  else if (/Android/i.test(ua)) platform = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) platform = 'iOS';
  
  // Detect browser
  let browser = 'unknown';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';
  
  // Detect device type
  let device_type = 'desktop';
  if (/Mobile/i.test(ua)) device_type = 'mobile';
  else if (/Tablet|iPad/i.test(ua)) device_type = 'tablet';
  
  // Generate a descriptive name
  const device_name = `${platform} ${browser} (${device_type})`;
  
  return { device_name, device_type, platform, browser };
}

// Check if running as installed PWA
function isRunningAsPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

export function useDeviceRegistration() {
  const [deviceId, setDeviceId] = useState<string>('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Register device with server
  const registerDevice = useCallback(async (isPWAInstalled: boolean = false) => {
    const id = getOrCreateDeviceId();
    if (!id) return null;
    
    const deviceInfo = detectDeviceInfo();
    
    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: id,
          ...deviceInfo,
          is_pwa_installed: isPWAInstalled || isRunningAsPWA(),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to register device');
      }
      
      const result: RegistrationResult = await response.json();
      setIsRegistered(true);
      setIsActive(result.isActive);
      setDeviceId(id);
      
      return result;
    } catch (error) {
      console.error('[Device] Registration failed:', error);
      return null;
    }
  }, []);

  // Mark device as PWA installed
  const markAsPWAInstalled = useCallback(async () => {
    const id = getOrCreateDeviceId();
    if (!id) return;
    
    try {
      await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: id,
          is_pwa_installed: true,
        }),
      });
    } catch (error) {
      console.error('[Device] Failed to mark as PWA installed:', error);
    }
  }, []);

  // Initial registration on mount
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const id = getOrCreateDeviceId();
      setDeviceId(id);
      
      if (id) {
        await registerDevice(isRunningAsPWA());
      }
      
      setIsLoading(false);
    };
    
    init();
  }, [registerDevice]);

  return {
    deviceId,
    isRegistered,
    isActive,
    isLoading,
    registerDevice,
    markAsPWAInstalled,
    isRunningAsPWA: isRunningAsPWA(),
  };
}
