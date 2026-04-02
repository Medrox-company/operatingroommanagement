import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
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
}

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
      // Default modules if no Supabase
      setModules([
        { id: 'dashboard', name: 'Dashboard', description: 'Operating rooms overview', is_enabled: true, icon: 'LayoutGrid', accent_color: '#00D8C1', sort_order: 1 },
        { id: 'timeline', name: 'Timeline', description: 'Operations timeline', is_enabled: true, icon: 'Calendar', accent_color: '#A855F7', sort_order: 2 },
        { id: 'statistics', name: 'Statistics', description: 'Statistics and analytics', is_enabled: true, icon: 'BarChart3', accent_color: '#06B6D4', sort_order: 3 },
        { id: 'staff', name: 'Staff', description: 'Staff management', is_enabled: true, icon: 'Users', accent_color: '#10B981', sort_order: 4 },
        { id: 'alerts', name: 'Alerts', description: 'Alert system', is_enabled: true, icon: 'Bell', accent_color: '#EC4899', sort_order: 5 },
        { id: 'settings', name: 'Settings', description: 'System configuration', is_enabled: true, icon: 'Settings', accent_color: '#64748B', sort_order: 6 },
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
    // For demo purposes, allow simple password check
    // In production, use proper bcrypt comparison on server side
    
    if (!isSupabaseConfigured || !supabase) {
      // Demo mode - allow admin/user login
      if (email === 'admin@nemocnice.cz' && password === 'admin123') {
        const demoUser: User = { id: '1', email, name: 'Administrator', role: 'admin', is_active: true };
        setUser(demoUser);
        localStorage.setItem('app_user', JSON.stringify(demoUser));
        return { success: true };
      }
      if (email === 'user@nemocnice.cz' && password === 'user123') {
        const demoUser: User = { id: '2', email, name: 'User', role: 'user', is_active: true };
        setUser(demoUser);
        localStorage.setItem('app_user', JSON.stringify(demoUser));
        return { success: true };
      }
      return { success: false, error: 'Invalid credentials' };
    }

    try {
      // Fetch user from database
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return { success: false, error: 'Invalid credentials' };
      }

      // For demo, accept any password that matches the simple check
      // In production, implement proper bcrypt comparison
      if (password === 'admin123' || password === 'user123') {
        const loggedInUser: User = {
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role,
          is_active: data.is_active,
        };
        setUser(loggedInUser);
        localStorage.setItem('app_user', JSON.stringify(loggedInUser));
        await refreshModules();
        return { success: true };
      }

      return { success: false, error: 'Invalid credentials' };
    } catch (error) {
      console.error('[Auth] Login error:', error);
      return { success: false, error: 'Login error' };
    }
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
  }), [user, isLoading, modules, login, logout, refreshModules, toggleModule]);

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
