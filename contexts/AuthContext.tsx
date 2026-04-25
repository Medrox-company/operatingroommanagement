import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type UserRole = 'admin' | 'user' | 'aro' | 'cos' | 'management' | 'primar';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
}

export interface AppModule {
  id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  icon: string | null;
  accent_color: string | null;
  sort_order: number;
  allowed_roles?: string[] | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  modules: AppModule[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshModules: () => Promise<void>;
  toggleModule: (moduleId: string, enabled: boolean) => Promise<boolean>;
  toggleModuleRole: (moduleId: string, role: UserRole, enabled: boolean) => Promise<boolean>;
  hasModuleAccess: (moduleId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modules, setModules] = useState<AppModule[]>([]);

  const refreshModules = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setModules([
        { id: 'dashboard',  name: 'Dashboard',  description: 'Operating rooms overview',     is_enabled: true, icon: 'LayoutGrid', accent_color: '#FBBF24', sort_order: 1, allowed_roles: ['aro','cos','management','primar','user'] },
        { id: 'timeline',   name: 'Timeline',   description: 'Operations timeline',          is_enabled: true, icon: 'Calendar',   accent_color: '#A855F7', sort_order: 2, allowed_roles: ['aro','cos','management','primar','user'] },
        { id: 'statistics', name: 'Statistics', description: 'Statistics and analytics',     is_enabled: true, icon: 'BarChart3',  accent_color: '#06B6D4', sort_order: 3, allowed_roles: ['management','primar','cos','user'] },
        { id: 'staff',      name: 'Staff',      description: 'Staff management',             is_enabled: true, icon: 'Users',      accent_color: '#10B981', sort_order: 4, allowed_roles: ['cos','management','user'] },
        { id: 'alerts',     name: 'Alerts',     description: 'Alert system',                 is_enabled: true, icon: 'Bell',       accent_color: '#EC4899', sort_order: 5, allowed_roles: ['aro','cos','management','primar','user'] },
        { id: 'settings',   name: 'Settings',   description: 'System configuration',         is_enabled: true, icon: 'Settings',   accent_color: '#64748B', sort_order: 6, allowed_roles: null },
      ]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('app_modules')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      if (data) setModules(data);
    } catch (error) {
      console.error('[Auth] Failed to fetch modules:', error);
    }
  }, []);

  // Bootstrap: obnov session z HttpOnly cookie přes /api/auth/me
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json.user) {
            setUser(json.user as User);
          }
        }
      } catch {
        // Ignore — žádná session
      } finally {
        if (!cancelled) setIsLoading(false);
        refreshModules();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshModules]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.user) {
          return {
            success: false,
            error: (typeof json?.error === 'string' && json.error) || 'Přihlášení se nezdařilo',
          };
        }
        setUser(json.user as User);
        await refreshModules();
        return { success: true };
      } catch (error) {
        console.error('[Auth] Login failed:', error);
        return { success: false, error: 'Chyba při komunikaci se serverem' };
      }
    },
    [refreshModules],
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Ignore
    }
    setUser(null);
  }, []);

  const toggleModule = useCallback(
    async (moduleId: string, enabled: boolean): Promise<boolean> => {
      if (!isSupabaseConfigured || !supabase) {
        setModules(prev => prev.map(m => (m.id === moduleId ? { ...m, is_enabled: enabled } : m)));
        return true;
      }
      try {
        const { error } = await supabase
          .from('app_modules')
          .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
          .eq('id', moduleId);

        if (error) throw error;
        await refreshModules();
        return true;
      } catch (error) {
        console.error('[Auth] Failed to toggle module:', error);
        return false;
      }
    },
    [refreshModules],
  );

  const toggleModuleRole = useCallback(
    async (moduleId: string, role: UserRole, enabled: boolean): Promise<boolean> => {
      const compute = (current: string[] | null | undefined): string[] => {
        const set = new Set(current ?? []);
        if (enabled) set.add(role); else set.delete(role);
        return Array.from(set);
      };

      if (!isSupabaseConfigured || !supabase) {
        setModules(prev =>
          prev.map(m => (m.id === moduleId ? { ...m, allowed_roles: compute(m.allowed_roles) } : m)),
        );
        return true;
      }

      try {
        const current = modules.find(m => m.id === moduleId)?.allowed_roles ?? [];
        const next = compute(current);
        const { error } = await supabase
          .from('app_modules')
          .update({ allowed_roles: next, updated_at: new Date().toISOString() })
          .eq('id', moduleId);

        if (error) throw error;
        setModules(prev => prev.map(m => (m.id === moduleId ? { ...m, allowed_roles: next } : m)));
        return true;
      } catch (error) {
        console.error('[Auth] Failed to toggle module role:', error);
        return false;
      }
    },
    [modules],
  );

  const hasModuleAccess = useCallback(
    (moduleId: string): boolean => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      const mod = modules.find(m => m.id === moduleId);
      if (!mod) return false;
      if (mod.is_enabled === false) return false;
      if (!mod.allowed_roles || mod.allowed_roles.length === 0) return false;
      return mod.allowed_roles.includes(user.role);
    },
    [user, modules],
  );

  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      modules,
      login,
      logout,
      refreshModules,
      toggleModule,
      toggleModuleRole,
      hasModuleAccess,
    }),
    [user, isLoading, modules, login, logout, refreshModules, toggleModule, toggleModuleRole, hasModuleAccess],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
