import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getDatabaseHospitalId } from '../lib/db';

/**
 * Role v systému, seřazené od nejvyšší úrovně přístupu.
 *
 * `superadmin` stojí nad administrátorem: vidí všechny moduly bez ohledu na
 * jejich nastavení a jako jediný smí měnit, které role ke kterému modulu mají
 * přístup. Vznikl přejmenováním původní role `user` (viz migrace
 * scripts/11-superadmin-role.sql).
 */
export type UserRole = 'superadmin' | 'admin' | 'aro' | 'cos' | 'management' | 'primar';

/** Role, kterým superadministrátor nastavuje přístup. Administrátor mezi ně
 *  patří — omezit lze i jeho. Superadmin ne, ten má přístup ke všemu vždy. */
export const ASSIGNABLE_ROLES: readonly UserRole[] = ['admin', 'aro', 'cos', 'management', 'primar'];

/** Lidsky čitelné názvy rolí pro rozhraní. */
export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Superadministrátor',
  admin: 'Administrátor',
  aro: 'ARO',
  cos: 'COS',
  management: 'Management',
  primar: 'Primariát',
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  hospitalId: string;
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

/** Část uvnitř modulu s vlastním oprávněním (např. panel v Nastavení). */
export interface AppSubmodule {
  id: string;
  module_id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  sort_order: number;
  allowed_roles?: string[] | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  /** Superadministrátor — nejvyšší úroveň, nad administrátorem. */
  isSuperAdmin: boolean;
  /** Smí měnit, které role vidí které moduly. Vyhrazeno superadminovi. */
  canManageModuleRoles: boolean;
  modules: AppModule[];
  submodules: AppSubmodule[];
  login: (email: string, password: string, hospitalId: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshModules: () => Promise<void>;
  toggleModule: (moduleId: string, enabled: boolean) => Promise<boolean>;
  toggleModuleRole: (moduleId: string, role: UserRole, enabled: boolean) => Promise<boolean>;
  toggleSubmoduleRole: (submoduleId: string, role: UserRole, enabled: boolean) => Promise<boolean>;
  hasModuleAccess: (moduleId: string) => boolean;
  hasSubmoduleAccess: (submoduleId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modules, setModules] = useState<AppModule[]>([]);
  const [submodules, setSubmodules] = useState<AppSubmodule[]>([]);

  const refreshModules = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setSubmodules([]);
      setModules([
        { id: 'dashboard',  name: 'Dashboard',  description: 'Operating rooms overview',     is_enabled: true, icon: 'LayoutGrid', accent_color: '#FBBF24', sort_order: 1, allowed_roles: ['aro','cos','management','primar'] },
        { id: 'timeline',   name: 'Timeline',   description: 'Operations timeline',          is_enabled: true, icon: 'Calendar',   accent_color: '#A855F7', sort_order: 2, allowed_roles: ['aro','cos','management','primar'] },
        { id: 'statistics', name: 'Statistics', description: 'Statistics and analytics',     is_enabled: true, icon: 'BarChart3',  accent_color: '#06B6D4', sort_order: 3, allowed_roles: ['management','primar','cos'] },
        { id: 'staff',      name: 'Staff',      description: 'Staff management',             is_enabled: true, icon: 'Users',      accent_color: '#10B981', sort_order: 4, allowed_roles: ['cos','management'] },
        { id: 'alerts',     name: 'Alerts',     description: 'Alert system',                 is_enabled: true, icon: 'Bell',       accent_color: '#EC4899', sort_order: 5, allowed_roles: ['aro','cos','management','primar'] },
        { id: 'settings',   name: 'Settings',   description: 'System configuration',         is_enabled: true, icon: 'Settings',   accent_color: '#64748B', sort_order: 6, allowed_roles: null },
      ]);
      return;
    }

    try {
      const hospitalId = getDatabaseHospitalId();
      const [modulesRes, submodulesRes] = await Promise.all([
        supabase
          .from('app_modules')
          .select('*')
          .eq('hospital_id', hospitalId)
          .order('sort_order', { ascending: true }),
        supabase
          .from('app_submodules')
          .select('*')
          .eq('hospital_id', hospitalId)
          .order('sort_order', { ascending: true }),
      ]);

      if (modulesRes.error) throw modulesRes.error;
      if (modulesRes.data) setModules(modulesRes.data);

      // Podmoduly jsou volitelné — na starší databázi bez migrace 12 tabulka
      // nemusí existovat a aplikace pak jede jen s moduly.
      if (submodulesRes.error) {
        console.warn('[Auth] Podmoduly se nenačetly:', submodulesRes.error.message);
        setSubmodules([]);
      } else {
        setSubmodules(submodulesRes.data ?? []);
      }
    } catch (error) {
      console.error('[Auth] Failed to fetch modules:', error);
    }
  }, []);

  useEffect(() => {
    const handleHospitalChange = () => { void refreshModules(); };
    window.addEventListener('activeHospitalChanged', handleHospitalChange);
    return () => window.removeEventListener('activeHospitalChanged', handleHospitalChange);
  }, [refreshModules]);

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
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string, hospitalId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, hospitalId }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.user) {
          return {
            success: false,
            error: (typeof json?.error === 'string' && json.error) || 'Přihlášení se nezdařilo',
          };
        }
        setUser(json.user as User);
        localStorage.setItem('orm-active-hospital', hospitalId);
        window.dispatchEvent(new Event('authenticationChanged'));
        return { success: true };
      } catch (error) {
        console.error('[Auth] Login failed:', error);
        return { success: false, error: 'Chyba při komunikaci se serverem' };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Ignore
    }
    setUser(null);
    setModules([]);
    window.dispatchEvent(new Event('authenticationChanged'));
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
          .eq('id', moduleId)
          .eq('hospital_id', getDatabaseHospitalId());

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
          .eq('id', moduleId)
          .eq('hospital_id', getDatabaseHospitalId());

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

  const toggleSubmoduleRole = useCallback(
    async (submoduleId: string, role: UserRole, enabled: boolean): Promise<boolean> => {
      const compute = (current: string[] | null | undefined): string[] => {
        const set = new Set(current ?? []);
        if (enabled) set.add(role); else set.delete(role);
        return Array.from(set);
      };

      if (!isSupabaseConfigured || !supabase) {
        setSubmodules(prev =>
          prev.map(s => (s.id === submoduleId ? { ...s, allowed_roles: compute(s.allowed_roles) } : s)),
        );
        return true;
      }

      try {
        const current = submodules.find(s => s.id === submoduleId)?.allowed_roles ?? [];
        const next = compute(current);
        const { error } = await supabase
          .from('app_submodules')
          .update({ allowed_roles: next, updated_at: new Date().toISOString() })
          .eq('id', submoduleId)
          .eq('hospital_id', getDatabaseHospitalId());

        if (error) throw error;
        setSubmodules(prev => prev.map(s => (s.id === submoduleId ? { ...s, allowed_roles: next } : s)));
        return true;
      } catch (error) {
        console.error('[Auth] Failed to toggle submodule role:', error);
        return false;
      }
    },
    [submodules],
  );

  const hasModuleAccess = useCallback(
    (moduleId: string): boolean => {
      if (!user) return false;
      // Superadministrátor vidí vše, a to i moduly vypnuté pro ostatní —
      // jinak by si mohl omylem odepřít přístup k nastavení, kterým je zpět
      // zapíná. Administrátor už výjimku nemá, jeho přístup řídí allowed_roles.
      if (user.role === 'superadmin') return true;
      const mod = modules.find(m => m.id === moduleId);
      if (!mod) return false;
      if (mod.is_enabled === false) return false;
      if (!mod.allowed_roles || mod.allowed_roles.length === 0) return false;
      return mod.allowed_roles.includes(user.role);
    },
    [user, modules],
  );

  const hasSubmoduleAccess = useCallback(
    (submoduleId: string): boolean => {
      if (!user) return false;
      if (user.role === 'superadmin') return true;

      const sub = submodules.find(s => s.id === submoduleId);
      // Neznámý podmodul = žádné omezení. Díky tomu funguje aplikace i tehdy,
      // když migrace 12 ještě neproběhla.
      if (!sub) return true;
      if (sub.is_enabled === false) return false;
      // Nadřazený modul musí být přístupný, jinak nemá smysl řešit část v něm.
      if (!hasModuleAccess(sub.module_id)) return false;
      if (!sub.allowed_roles || sub.allowed_roles.length === 0) return false;
      return sub.allowed_roles.includes(user.role);
    },
    [user, submodules, hasModuleAccess],
  );

  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      // Superadmin je nadmnožinou administrátora — všude, kde se dosud
      // kontrolovalo `isAdmin`, projde i on.
      isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
      isSuperAdmin: user?.role === 'superadmin',
      canManageModuleRoles: user?.role === 'superadmin',
      modules,
      submodules,
      login,
      logout,
      refreshModules,
      toggleModule,
      toggleModuleRole,
      toggleSubmoduleRole,
      hasModuleAccess,
      hasSubmoduleAccess,
    }),
    [user, isLoading, modules, submodules, login, logout, refreshModules, toggleModule, toggleModuleRole, toggleSubmoduleRole, hasModuleAccess, hasSubmoduleAccess],
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
