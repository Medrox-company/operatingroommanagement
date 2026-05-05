'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Only register in browser environment
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('[v0] Service Worker not supported');
      return;
    }

    // Register the service worker
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[v0] Service Worker registered successfully:', registration);
      })
      .catch((error) => {
        console.error('[v0] Service Worker registration failed:', error);
      });
  }, []);

  return null; // This component renders nothing
}
