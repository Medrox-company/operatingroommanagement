import React from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import App from '../App';
import '../app/globals.css';
import { installNativeApiBridge } from './native-api';

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
  void StatusBar.setStyle({ style: Style.Light });
  void Keyboard.setAccessoryBarVisible({ isVisible: true });
  void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) window.dispatchEvent(new Event('nativeAppResumed'));
  });
  document.documentElement.classList.add('capacitor-native');

  const platform = Capacitor.getPlatform();
  document.documentElement.classList.add(`platform-${platform}`);

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
