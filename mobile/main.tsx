import React from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import App from '../App';
import '../app/globals.css';
import { installNativeApiBridge } from './native-api';
import { captureNativeGoogleCallback } from '../lib/auth/native-google-client';

// Tmavý motiv je výchozí. Výslovná uživatelská volba světlého režimu
// zůstává zachována i při dalším spuštění nativní aplikace.
try {
  if (localStorage.getItem('or-mobile-theme') !== 'light') {
    document.documentElement.classList.add('m-dark');
  }
} catch {
  document.documentElement.classList.add('m-dark');
}

installNativeApiBridge();

if (Capacitor.isNativePlatform()) {
  const syncStatusBarStyle = () => {
    // Capacitor's enum describes the background: Dark renders light system
    // icons, while Light renders dark system icons.
    const darkMode = document.documentElement.classList.contains('m-dark');
    void StatusBar.setStyle({ style: darkMode ? Style.Dark : Style.Light });
  };

  syncStatusBarStyle();
  const themeObserver = new MutationObserver(syncStatusBarStyle);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  void Keyboard.setAccessoryBarVisible({ isVisible: true });
  void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      syncStatusBarStyle();
      window.dispatchEvent(new Event('nativeAppResumed'));
    }
  });
  document.documentElement.classList.add('capacitor-native');

  const platform = Capacitor.getPlatform();
  document.documentElement.classList.add(`platform-${platform}`);

  if (platform === 'ios') {
    // Google returns to the application through its registered custom scheme.
    // Register before React mounts so even a cold-start callback is retained.
    void CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      captureNativeGoogleCallback(url);
    });
    void CapacitorApp.getLaunchUrl().then((launch) => {
      if (launch?.url) captureNativeGoogleCallback(launch.url);
    });
  }

  if (platform === 'android') {
    /* Hardwarové tlačítko Zpět: nejdřív zavře otevřený detail/overlay
       (komponenty na `nativeBackButton` reagují voláním preventDefault),
       teprve pak jde o krok zpět v historii; na kořeni aplikaci ukončí. */
    void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      const handled = !window.dispatchEvent(
        new CustomEvent('nativeBackButton', { cancelable: true }),
      );
      if (handled) return;
      if (canGoBack) window.history.back();
      else void CapacitorApp.exitApp();
    });
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('Kořen aplikace nebyl nalezen');
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
