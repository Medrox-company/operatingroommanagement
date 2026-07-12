import { Capacitor } from '@capacitor/core';

const DEFAULT_API_BASE = 'https://www.operatingroom.eu';

/** Keep UI assets local and send only privileged API calls to the backend. */
export function installNativeApiBridge() {
  if (!Capacitor.isNativePlatform()) return;
  const apiBase = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE).replace(/\/$/, '');
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    let nextInput: RequestInfo | URL = input;
    if (typeof input === 'string' && input.startsWith('/api/')) {
      nextInput = `${apiBase}${input}`;
    } else if (input instanceof URL && input.pathname.startsWith('/api/')) {
      nextInput = new URL(`${input.pathname}${input.search}`, apiBase);
    } else if (input instanceof Request && new URL(input.url).pathname.startsWith('/api/')) {
      const source = new URL(input.url);
      nextInput = new Request(`${apiBase}${source.pathname}${source.search}`, input);
    }
    return originalFetch(nextInput, { ...init, credentials: 'include' });
  };
}
