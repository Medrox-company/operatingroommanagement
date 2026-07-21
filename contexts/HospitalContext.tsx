'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { setDatabaseHospitalId } from '../lib/db';
import { setSupabaseHospitalToken } from '../lib/supabase';

export interface Hospital {
  id: string;
  hospital_name: string | null;
  hospital_short_name: string | null;
  hospital_address: string | null;
  hospital_city: string | null;
  hospital_zip: string | null;
  hospital_country: string | null;
  hospital_ico: string | null;
  hospital_contact_phone: string | null;
  hospital_contact_email: string | null;
  hospital_notes: string | null;
}

interface HospitalContextValue {
  hospitals: Hospital[];
  activeHospital: Hospital | null;
  activeHospitalId: string | null;
  tokenRevision: number;
  loading: boolean;
  selectHospital: (id: string) => void;
  refreshHospitals: () => Promise<void>;
}

const HospitalContext = createContext<HospitalContextValue | undefined>(undefined);
const STORAGE_KEY = 'orm-active-hospital';
const TOKEN_REFRESH_SAFETY_MS = 10 * 60 * 1000;
const TOKEN_HEALTH_CHECK_MS = 60 * 1000;
const FORCED_REFRESH_COOLDOWN_MS = 60 * 1000;

const persistHospital = (id: string) => {
  localStorage.setItem(STORAGE_KEY, id);
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `or_hospital=${encodeURIComponent(id)}; Path=/; SameSite=Lax${secure}`;
};
interface HospitalTokenResponse {
  ok: boolean;
  token: string | null;
  expiresInSeconds: number;
  status: number;
}

const requestHospitalAccessToken = async (id: string, signal: AbortSignal): Promise<HospitalTokenResponse> => {
  try {
    const response = await fetch('/api/auth/hospital-token', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hospitalId: id }),
      signal,
    });
    if (!response.ok) {
      return { ok: false, token: null, expiresInSeconds: 0, status: response.status };
    }
    const json = await response.json();
    const token = typeof json.token === 'string' ? json.token : null;
    const expiresInSeconds = Number.isFinite(json.expiresIn)
      ? Math.max(60, Number(json.expiresIn))
      : 3600;
    return { ok: Boolean(token), token, expiresInSeconds, status: response.status };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, token: null, expiresInSeconds: 0, status: 0 };
    }
    return { ok: false, token: null, expiresInSeconds: 0, status: 0 };
  }
};

export function HospitalProvider({ children }: { children: React.ReactNode }) {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [activeHospitalId, setActiveHospitalId] = useState<string | null>(null);
  const [tokenRevision, setTokenRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const desiredHospitalIdRef = useRef<string | null>(null);
  const tokenExpiresAtRef = useRef(0);
  const tokenRequestSequenceRef = useRef(0);
  const tokenRequestAbortRef = useRef<AbortController | null>(null);
  const tokenRefreshInFlightRef = useRef<{ hospitalId: string; promise: Promise<boolean> } | null>(null);
  const lastForcedRefreshAtRef = useRef(0);

  const clearHospitalAccess = useCallback(async () => {
    tokenRequestSequenceRef.current += 1;
    tokenRequestAbortRef.current?.abort();
    tokenRequestAbortRef.current = null;
    tokenRefreshInFlightRef.current = null;
    tokenExpiresAtRef.current = 0;
    await setSupabaseHospitalToken(null);
    setTokenRevision(current => current + 1);
  }, []);

  const renewHospitalAccess = useCallback((hospitalId: string): Promise<boolean> => {
    const existing = tokenRefreshInFlightRef.current;
    if (existing?.hospitalId === hospitalId) return existing.promise;

    tokenRequestAbortRef.current?.abort();
    const controller = new AbortController();
    tokenRequestAbortRef.current = controller;
    const requestSequence = ++tokenRequestSequenceRef.current;

    let promise: Promise<boolean>;
    promise = (async () => {
      const result = await requestHospitalAccessToken(hospitalId, controller.signal);
      const isCurrentRequest = requestSequence === tokenRequestSequenceRef.current
        && desiredHospitalIdRef.current === hospitalId;
      if (!isCurrentRequest) return false;

      if (!result.ok || !result.token) {
        // 401/403 means that the browser session or hospital membership is no
        // longer valid. Network and server failures keep the current token so
        // a short outage cannot log a running operating room out.
        if (result.status === 401 || result.status === 403) {
          desiredHospitalIdRef.current = null;
          tokenExpiresAtRef.current = 0;
          await setSupabaseHospitalToken(null);
          setTokenRevision(current => current + 1);
          setDatabaseHospitalId(null);
          setActiveHospitalId(null);
        }
        return false;
      }

      await setSupabaseHospitalToken(result.token);
      if (requestSequence !== tokenRequestSequenceRef.current) return false;
      tokenExpiresAtRef.current = Date.now() + result.expiresInSeconds * 1000;
      setTokenRevision(current => current + 1);
      return true;
    })().finally(() => {
      if (tokenRefreshInFlightRef.current?.promise === promise) {
        tokenRefreshInFlightRef.current = null;
      }
      if (tokenRequestAbortRef.current === controller) {
        tokenRequestAbortRef.current = null;
      }
    });

    tokenRefreshInFlightRef.current = { hospitalId, promise };
    return promise;
  }, []);

  const refreshHospitals = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/hospital', { credentials: 'include', cache: 'no-store' });
      if (!response.ok) {
        if (response.status === 401) {
          desiredHospitalIdRef.current = null;
          await clearHospitalAccess();
          setDatabaseHospitalId(null);
          setActiveHospitalId(null);
          setHospitals([]);
        }
        return;
      }
      const json = await response.json();
      const next: Hospital[] = Array.isArray(json.hospitals) ? json.hospitals : [];
      setHospitals(next);
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      const resolved = next.some(item => item.id === stored) ? stored : (next[0]?.id ?? null);
      desiredHospitalIdRef.current = resolved;
      setDatabaseHospitalId(resolved);
      if (resolved) {
        persistHospital(resolved);
        const allowed = await renewHospitalAccess(resolved);
        if (allowed && desiredHospitalIdRef.current === resolved) {
          setActiveHospitalId(resolved);
          window.dispatchEvent(new CustomEvent('activeHospitalChanged', { detail: resolved }));
        }
      } else {
        await clearHospitalAccess();
        setActiveHospitalId(null);
      }
    } catch {
      // Keep the current hospital and token during a transient network outage.
      // The online/focus/visibility handlers below retry automatically.
    } finally {
      setLoading(false);
    }
  }, [clearHospitalAccess, renewHospitalAccess]);

  useEffect(() => { void refreshHospitals(); }, [refreshHospitals]);

  useEffect(() => {
    const refresh = () => { void refreshHospitals(); };
    window.addEventListener('authenticationChanged', refresh);
    return () => window.removeEventListener('authenticationChanged', refresh);
  }, [refreshHospitals]);

  const selectHospital = useCallback((id: string) => {
    if (!hospitals.some(item => item.id === id)) return;
    desiredHospitalIdRef.current = id;
    persistHospital(id);
    setDatabaseHospitalId(id);
    setLoading(true);
    void renewHospitalAccess(id).then(allowed => {
      if (allowed && desiredHospitalIdRef.current === id) {
        setActiveHospitalId(id);
        window.dispatchEvent(new CustomEvent('activeHospitalChanged', { detail: id }));
      }
    }).finally(() => setLoading(false));
  }, [hospitals, renewHospitalAccess]);

  useEffect(() => {
    if (activeHospitalId) persistHospital(activeHospitalId);
  }, [activeHospitalId]);

  useEffect(() => {
    if (!activeHospitalId) return;
    let disposed = false;

    const refreshIfNeeded = (force = false) => {
      if (disposed || desiredHospitalIdRef.current !== activeHospitalId) return;
      const now = Date.now();
      const expiresAt = tokenExpiresAtRef.current;
      const tokenNeedsRefresh = !expiresAt || now >= expiresAt - TOKEN_REFRESH_SAFETY_MS;
      if (force && !tokenNeedsRefresh) {
        if (now - lastForcedRefreshAtRef.current < FORCED_REFRESH_COOLDOWN_MS) return;
        lastForcedRefreshAtRef.current = now;
      }
      if (force || tokenNeedsRefresh) {
        void renewHospitalAccess(activeHospitalId);
      }
    };

    const refreshAt = Math.max(
      1000,
      tokenExpiresAtRef.current - Date.now() - TOKEN_REFRESH_SAFETY_MS,
    );
    const expiryTimer = window.setTimeout(() => refreshIfNeeded(true), refreshAt);
    const healthCheck = window.setInterval(() => refreshIfNeeded(false), TOKEN_HEALTH_CHECK_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshIfNeeded(false);
    };
    const onFocus = () => refreshIfNeeded(false);
    const onOnline = () => refreshIfNeeded(true);
    const onPageShow = () => refreshIfNeeded(false);
    const onRealtimeRecoveryRequest = () => refreshIfNeeded(true);

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('hospitalAccessRefreshRequested', onRealtimeRecoveryRequest);

    return () => {
      disposed = true;
      window.clearTimeout(expiryTimer);
      window.clearInterval(healthCheck);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('hospitalAccessRefreshRequested', onRealtimeRecoveryRequest);
    };
  }, [activeHospitalId, renewHospitalAccess, tokenRevision]);

  useEffect(() => () => {
    tokenRequestAbortRef.current?.abort();
  }, []);

  const value = useMemo(() => ({
    hospitals,
    activeHospitalId,
    tokenRevision,
    activeHospital: hospitals.find(item => item.id === activeHospitalId) ?? null,
    loading,
    selectHospital,
    refreshHospitals,
  }), [hospitals, activeHospitalId, tokenRevision, loading, selectHospital, refreshHospitals]);

  return <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>;
}

export function useHospital() {
  const context = useContext(HospitalContext);
  if (!context) throw new Error('useHospital must be used within HospitalProvider');
  return context;
}
