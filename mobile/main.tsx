import React from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import App from '../App';
import '../app/globals.css';
import { installNativeApiBridge } from './native-api';

installNativeApiBridge();

if (Capacitor.isNativePlatform()) {
  void StatusBar.setStyle({ style: Style.Light });
  void Keyboard.setAccessoryBarVisible({ isVisible: true });
  void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) window.dispatchEvent(new Event('nativeAppResumed'));
  });
  document.documentElement.classList.add('capacitor-native');
}

const root = document.getElementById('root');
if (!root) throw new Error('Kořen aplikace nebyl nalezen');
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
