'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  loading: boolean;
  selectHospital: (id: string) => void;
  refreshHospitals: () => Promise<void>;
}

const HospitalContext = createContext<HospitalContextValue | undefined>(undefined);
const STORAGE_KEY = 'orm-active-hospital';
const persistHospital = (id: string) => {
  localStorage.setItem(STORAGE_KEY, id);
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `or_hospital=${encodeURIComponent(id)}; Path=/; SameSite=Lax${secure}`;
};
const activateHospitalAccess = async (id: string) => {
  const response = await fetch('/api/auth/hospital-token', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hospitalId: id }),
  });
  if (!response.ok) {
    await setSupabaseHospitalToken(null);
    return false;
  }
  const json = await response.json();
  await setSupabaseHospitalToken(typeof json.token === 'string' ? json.token : null);
  return typeof json.token === 'string';
};

export function HospitalProvider({ children }: { children: React.ReactNode }) {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [activeHospitalId, setActiveHospitalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshHospitals = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/hospital', { credentials: 'include', cache: 'no-store' });
      if (!response.ok) {
        if (response.status === 401) {
          await setSupabaseHospitalToken(null);
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
      setDatabaseHospitalId(resolved);
      if (resolved) {
        persistHospital(resolved);
        const allowed = await activateHospitalAccess(resolved);
        if (allowed) {
          setActiveHospitalId(resolved);
          window.dispatchEvent(new CustomEvent('activeHospitalChanged', { detail: resolved }));
        }
      } else {
        setActiveHospitalId(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refreshHospitals(); }, [refreshHospitals]);

  useEffect(() => {
    const refresh = () => { void refreshHospitals(); };
    window.addEventListener('authenticationChanged', refresh);
    return () => window.removeEventListener('authenticationChanged', refresh);
  }, [refreshHospitals]);

  const selectHospital = useCallback((id: string) => {
    if (!hospitals.some(item => item.id === id)) return;
    persistHospital(id);
    setDatabaseHospitalId(id);
    setLoading(true);
    void activateHospitalAccess(id).then(allowed => {
      if (allowed) {
        setActiveHospitalId(id);
        window.dispatchEvent(new CustomEvent('activeHospitalChanged', { detail: id }));
      }
    }).finally(() => setLoading(false));
  }, [hospitals]);

  useEffect(() => {
    if (activeHospitalId) persistHospital(activeHospitalId);
  }, [activeHospitalId]);

  useEffect(() => {
    if (!activeHospitalId) return;
    const interval = window.setInterval(() => { void activateHospitalAccess(activeHospitalId); }, 50 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [activeHospitalId]);

  const value = useMemo(() => ({
    hospitals,
    activeHospitalId,
    activeHospital: hospitals.find(item => item.id === activeHospitalId) ?? null,
    loading,
    selectHospital,
    refreshHospitals,
  }), [hospitals, activeHospitalId, loading, selectHospital, refreshHospitals]);

  return <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>;
}

export function useHospital() {
  const context = useContext(HospitalContext);
  if (!context) throw new Error('useHospital must be used within HospitalProvider');
  return context;
}
