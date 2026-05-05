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
          console.log('[v0] Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('[v0] Service Worker registration failed:', error);
        });
    }

    // Check if already installed as PWA
    const isRunningAsApp = () => {
      const nav = navigator as NavigatorWithStandalone;
      const result = (
        nav.standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches
      );
      console.log('[v0] isRunningAsApp:', result);
      return result;
    };

    if (isRunningAsApp()) {
      setIsInstalled(true);
      console.log('[v0] App already running as standalone PWA');
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[v0] beforeinstallprompt event received');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      console.log('[v0] App installed successfully');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    console.log('[v0] PWA event listeners registered');

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      console.log('[v0] No deferred prompt available');
      return false;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[v0] User PWA install response: ${outcome}`);

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
