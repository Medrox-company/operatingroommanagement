import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.operatingroom.app',
  appName: 'Operating Room Management',
  // Complete local application bundle; this must never point at a hosted URL.
  webDir: 'mobile-dist',
  server: {
    // For development: use local server
    // url: 'https://operatingroom.eu',
    // cleartext: true,
    androidScheme: 'https',
    iosScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#000000',
  },
  android: {
    backgroundColor: '#000000',
    // Ladění WebView jen ve vývoji — v release buildu zůstává vypnuté.
    webContentsDebuggingEnabled: process.env.NODE_ENV !== 'production',
    // Aplikace nesmí zpracovávat externí odkazy jako vlastní obsah.
    allowMixedContent: false,
  },
  plugins: {
    // Use URLSession for fetch and keep HttpOnly sessions in the native jar.
    CapacitorHttp: {
      enabled: true,
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      style: KeyboardStyle.Dark,
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#000000',
      // Android: obsah kreslíme až pod stavový řádek (safe-area řeší CSS)
      overlaysWebView: true,
    },
  },
};

export default config;
