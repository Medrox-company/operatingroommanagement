import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  // The existing Android package and OAuth callback scheme use this ID.
  // The iOS target intentionally overrides PRODUCT_BUNDLE_IDENTIFIER with
  // `operatingroom.eu` to match the pre-existing App Store Connect record.
  appId: 'com.operatingroom.app',
  appName: 'Operatingroom Manager',
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
    // Obsah sahá přes celou obrazovku (pod stavový řádek i lištu domovské
    // obrazovky) stejně jako na webu; odsazení řeší styly přes
    // env(safe-area-inset-*). Při 'automatic' iOS odsadil celé zobrazení
    // a nahoře i dole zůstaly pruhy v barvě backgroundColor.
    contentInset: 'never',
    preferredContentMode: 'mobile',
    backgroundColor: '#07183F',
  },
  android: {
    backgroundColor: '#07183F',
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
      backgroundColor: '#07183F',
      showSpinner: false,
    },
    StatusBar: {
      // Capacitor uses DARK for light foreground content on a dark background.
      style: 'DARK',
      backgroundColor: '#07183F',
      // Android: obsah kreslíme až pod stavový řádek (safe-area řeší CSS)
      overlaysWebView: true,
    },
  },
};

export default config;
