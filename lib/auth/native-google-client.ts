'use client';

import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { getGoogleAuthClient } from './google-client';

/**
 * iOS OAuth callback. The same value must be registered in Info.plist and in
 * Supabase Authentication -> URL Configuration -> Redirect URLs.
 */
export const NATIVE_GOOGLE_REDIRECT_URL = 'com.operatingroom.app://auth/callback';
export const NATIVE_GOOGLE_CALLBACK_EVENT = 'ormNativeGoogleCallback';

const PENDING_CALLBACK_KEY = 'orm-native-google-callback';
// Capacitor getLaunchUrl() keeps returning the last deep link for the lifetime
// of the native process, including after window.location.reload(). Remember
// the last captured URL so a consumed, single-use PKCE code is not replayed.
const LAST_CAPTURED_CALLBACK_KEY = 'orm-native-google-last-callback';
const ACTIVE_HOSPITAL_KEY = 'orm-active-hospital';
// Supabase PKCE authorization codes expire after five minutes.
const CALLBACK_MAX_AGE_MS = 5 * 60 * 1000;

interface StoredCallback {
  url: string;
  receivedAt: number;
}

function parseStoredCallback(raw: string | null): StoredCallback | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredCallback>;
    if (
      typeof parsed.url !== 'string'
      || typeof parsed.receivedAt !== 'number'
      || Date.now() - parsed.receivedAt > CALLBACK_MAX_AGE_MS
      || !isNativeGoogleCallbackUrl(parsed.url)
    ) {
      return null;
    }
    return { url: parsed.url, receivedAt: parsed.receivedAt };
  } catch {
    return null;
  }
}

/** Only iOS uses the native OAuth route; web and Android retain their current flow. */
export function isNativeGoogleAuthPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

/** Strictly accepts only this application's OAuth callback URL. */
export function isNativeGoogleCallbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'com.operatingroom.app:'
      && parsed.hostname === 'auth'
      && (parsed.pathname === '/callback' || parsed.pathname === '/callback/');
  } catch {
    return false;
  }
}

/**
 * Stores the one-time callback briefly before notifying React. Persistence
 * makes the flow survive iOS reclaiming the WebView while Safari is open.
 */
export function captureNativeGoogleCallback(url: string): boolean {
  if (!isNativeGoogleCallbackUrl(url)) return false;

  try {
    if (window.localStorage.getItem(LAST_CAPTURED_CALLBACK_KEY) === url) {
      return true;
    }

    const value: StoredCallback = { url, receivedAt: Date.now() };
    window.localStorage.setItem(PENDING_CALLBACK_KEY, JSON.stringify(value));
    window.localStorage.setItem(LAST_CAPTURED_CALLBACK_KEY, url);
  } catch {
    // The live DOM event below is sufficient when storage is unavailable.
  }

  window.dispatchEvent(new CustomEvent<string>(NATIVE_GOOGLE_CALLBACK_EVENT, {
    detail: url,
  }));

  // On iOS this dismisses SFSafariViewController. Ignore a harmless failure
  // when the callback arrived after the browser was already dismissed.
  void Browser.close().catch(() => undefined);
  return true;
}

/** Returns a fresh callback once and removes it from local storage. */
export function consumePendingNativeGoogleCallback(): string | null {
  try {
    const raw = window.localStorage.getItem(PENDING_CALLBACK_KEY);
    window.localStorage.removeItem(PENDING_CALLBACK_KEY);
    return parseStoredCallback(raw)?.url ?? null;
  } catch {
    return null;
  }
}

/** Lets the login screen resume a cold-start callback without consuming it. */
export function hasPendingNativeGoogleCallback(): boolean {
  try {
    const raw = window.localStorage.getItem(PENDING_CALLBACK_KEY);
    const pending = parseStoredCallback(raw);
    if (!pending && raw) window.localStorage.removeItem(PENDING_CALLBACK_KEY);
    return pending !== null;
  } catch {
    return false;
  }
}

export function clearPendingNativeGoogleCallback(): void {
  try {
    window.localStorage.removeItem(PENDING_CALLBACK_KEY);
  } catch {
    // Storage may be unavailable in hardened WebViews.
  }
}

/**
 * Persists the hospital chosen before leaving the WebView for Google. iOS can
 * terminate the application while the system browser is open, so React state
 * alone is not sufficient for completing a cold-start callback.
 */
export function rememberNativeGoogleHospitalId(hospitalId: string): void {
  const normalized = hospitalId.trim();
  if (!normalized) return;

  try {
    window.localStorage.setItem(ACTIVE_HOSPITAL_KEY, normalized);
  } catch {
    // The live React state is still sufficient when storage is unavailable.
  }
}

/** Prefer current React state, then fall back to the pre-redirect selection. */
export function resolveNativeGoogleHospitalId(hospitalId: string): string {
  const current = hospitalId.trim();
  if (current) return current;

  try {
    return window.localStorage.getItem(ACTIVE_HOSPITAL_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

/**
 * Starts Google OAuth with PKCE in the iOS system browser. Supabase stores the
 * PKCE verifier in this application's own storage; the returned code is then
 * exchanged by the same client after the deep link reopens the app.
 */
export async function openNativeGoogleLogin(): Promise<void> {
  if (!isNativeGoogleAuthPlatform()) {
    throw new Error('Nativní přihlášení je dostupné pouze v iOS aplikaci.');
  }

  const supabase = getGoogleAuthClient();
  if (!supabase) {
    throw new Error('Přihlášení přes Google není dostupné.');
  }

  clearPendingNativeGoogleCallback();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: NATIVE_GOOGLE_REDIRECT_URL,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error || !data.url) {
    throw new Error('Přesměrování na Google se nezdařilo.');
  }

  await Browser.open({
    url: data.url,
    presentationStyle: 'fullscreen',
    toolbarColor: '#07162B',
  });
}

export async function closeNativeGoogleBrowser(): Promise<void> {
  await Browser.close().catch(() => undefined);
}
