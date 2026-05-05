'use client';

import { useEffect, useState, useCallback } from 'react';

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

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
  else if (/Linux/i.test(ua)) platform = 'Linux';
  else if (/Android/i.test(ua)) platform = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) platform = 'iOS';
  
  let browser = 'unknown';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  
  let device_type = 'desktop';
  if (/Mobile/i.test(ua)) device_type = 'mobile';
  else if (/Tablet|iPad/i.test(ua)) device_type = 'tablet';
  
  return { device_name: `${platform} ${browser} (${device_type})`, device_type, platform, browser };
}

// Check if running as PWA
function isRunningAsApp(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as NavigatorWithStandalone;
  return nav.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches;
}

// Register device with server
async function registerDevice(isPWAInstalled: boolean = false) {
  try {
    const device_id = getOrCreateDeviceId();
    if (!device_id) return;
    const info = detectDeviceInfo();
    await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id, ...info, is_pwa_installed: isPWAInstalled || isRunningAsApp() }),
    });
  } catch (error) {
    // Silent fail - device registration is not critical
  }
}

export const usePWAInstall = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    // Get device ID
    const id = getOrCreateDeviceId();
    setDeviceId(id);

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }

    // Check if already installed as PWA
    const isPWA = isRunningAsApp();
    if (isPWA) {
      setIsInstalled(true);
    }

    // Register this device
    registerDevice(isPWA);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      // Update device as PWA installed
      registerDevice(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
    if (outcome === 'accepted') {
      registerDevice(true);
    }
    return outcome === 'accepted';
  }, [deferredPrompt]);

  return { isInstallable, isInstalled, handleInstall, deviceId };
};

export const PWAInstaller = () => {
  const { isInstallable, isInstalled, handleInstall } = usePWAInstall();

  // Don't show anything if already installed or not installable
  if (isInstalled || !isInstallable) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-xs">
      <button
        onClick={handleInstall}
        className="flex items-center gap-3 px-5 py-3 rounded-xl glass border-blue-500/40 text-foreground hover:border-blue-500/60 hover:bg-blue-500/10 transition-all shadow-lg glow-blue"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span className="text-sm font-semibold">Nainstalovat aplikaci</span>
      </button>
      <p className="text-xs text-muted-foreground mt-2 text-right">
        Kliknutím nainstalujete aplikaci na domovskou obrazovku
      </p>
    </div>
  );
};

export default PWAInstaller;
