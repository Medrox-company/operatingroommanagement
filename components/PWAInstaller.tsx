'use client';

import { useEffect, useState } from 'react';

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export const usePWAInstall = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    }

    // Check if already installed as PWA
    const isRunningAsApp = () => {
      const nav = navigator as NavigatorWithStandalone;
      return (
        nav.standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches
      );
    };

    if (isRunningAsApp()) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return false;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response: ${outcome}`);

    setDeferredPrompt(null);
    setIsInstallable(false);
    
    return outcome === 'accepted';
  };

  return { isInstallable, isInstalled, handleInstall };
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
