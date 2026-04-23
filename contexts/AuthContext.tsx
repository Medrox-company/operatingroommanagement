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
  logout: () => void;
  refreshModules: () => Promise<void>;
  toggleModule: (moduleId: string, enabled: boolean) => Promise<boolean>;
  hasModuleAccess: (moduleId: string) => boolean;
}

// Demo credentials — works both with and without Supabase. In production use bcrypt server-side.
const DEMO_CREDENTIALS: Record<string, { password: string; role: UserRole; name: string; id: string }> = {
  'admin@nemocnice.cz':      { password: 'admin123',  role: 'admin',      name: 'Administrátor',          id: 'demo-admin' },
  'user@nemocnice.cz':       { password: 'user123',   role: 'user',       name: 'Uživatel',               id: 'demo-user' },
  'aro@nemocnice.cz':        { password: 'aro123',    role: 'aro',        name: 'ARO oddělení',           id: 'demo-aro' },
  'cos@nemocnice.cz':        { password: 'cos123',    role: 'cos',        name: 'Centrální operační sály', id: 'demo-cos' },
  'management@nemocnice.cz': { password: 'mgmt123',   role: 'management', name: 'Management',             id: 'demo-mgmt' },
  'primar@nemocnice.cz':     { password: 'primar123', role: 'primar',     name: 'Primariát',              id: 'demo-primar' },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modules, setModules] = useState<AppModule[]>([]);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('app_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
      } catch {
        localStorage.removeItem('app_user');
      }
    }
    setIsLoading(false);
    refreshModules();
  }, []);

  const refreshModules = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      // Default modules if no Supabase (mirrors DB defaults seeded in scripts/09-add-hospital-roles.sql)
      setModules([
        { id: 'dashboard',  name: 'Dashboard',  description: 'Operating rooms overview',     is_enabled: true, icon: 'LayoutGrid', accent_color: '#00D8C1', sort_order: 1, allowed_roles: ['aro','cos','management','primar','user'] },
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

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Demo auth: compare against DEMO_CREDENTIALS map (client-side).
    // In production use bcrypt comparison on server side via Supabase Auth or an API route.
    const normalizedEmail = email.trim().toLowerCase();
    const creds = DEMO_CREDENTIALS[normalizedEmail];

    if (!creds || creds.password !== password) {
      return { success: false, error: 'Neplatný email nebo heslo' };
    }

    // If Supabase is configured, try to fetch the real user record so we get the DB id + active flag.
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('app_users')
          .select('id, email, name, role, is_active')
          .eq('email', normalizedEmail)
          .eq('is_active', true)
          .maybeSingle();

        if (data) {
          const loggedInUser: User = {
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role as UserRole,
            is_active: data.is_active,
          };
          setUser(loggedInUser);
          localStorage.setItem('app_user', JSON.stringify(loggedInUser));
          await refreshModules();
          return { success: true };
        }
      } catch (error) {
        console.error('[Auth] Supabase lookup failed, falling back to demo user:', error);
      }
    }

    // Fallback / pure demo mode
    const demoUser: User = {
      id: creds.id,
      email: normalizedEmail,
      name: creds.name,
      role: creds.role,
      is_active: true,
    };
    setUser(demoUser);
    localStorage.setItem('app_user', JSON.stringify(demoUser));
    await refreshModules();
    return { success: true };
  }, [refreshModules]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('app_user');
  }, []);

  const toggleModule = useCallback(async (moduleId: string, enabled: boolean): Promise<boolean> => {
    if (!isSupabaseConfigured || !supabase) {
      // Demo mode - update local state
      setModules(prev => prev.map(m => m.id === moduleId ? { ...m, is_enabled: enabled } : m));
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
  }, [refreshModules]);

  // Determine whether the current user can see a given module
  const hasModuleAccess = useCallback((moduleId: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true; // admin vidí vše
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return false;
    if (mod.is_enabled === false) return false;
    // allowed_roles NULL / [] => admin-only
    if (!mod.allowed_roles || mod.allowed_roles.length === 0) return false;
    return mod.allowed_roles.includes(user.role);
  }, [user, modules]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    modules,
    login,
    logout,
    refreshModules,
    toggleModule,
    hasModuleAccess,
  }), [user, isLoading, modules, login, logout, refreshModules, toggleModule, hasModuleAccess]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
