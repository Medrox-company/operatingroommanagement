import React, { memo, useMemo, useCallback } from 'react';
import { SIDEBAR_ITEMS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

interface MobileNavProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
}

const MobileNav: React.FC<MobileNavProps> = memo(({ currentView, onNavigate }) => {
  const { isAdmin, hasModuleAccess, logout } = useAuth();

  // Filter sidebar items based on role + module access - memoized for performance
  // Admins keep all 5 items; logout button replaces the Admin tab.
  const enabledItems = useMemo(() => SIDEBAR_ITEMS.filter(item => {
    if (item.id === 'dashboard') return true;
    if (isAdmin) return true;
    return hasModuleAccess(item.id);
  }).slice(0, 5), [isAdmin, hasModuleAccess]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (err) {
      console.error('[v0] Mobile logout failed', err);
    }
  }, [logout]);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around py-2 px-2 pb-[env(safe-area-inset-bottom)] bg-black/80 backdrop-blur-xl border-t border-white/10 safe-area-pb"
      aria-label="Hlavní navigace"
    >
      {enabledItems.map((item) => {
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            className={`
              relative flex flex-col items-center justify-center gap-1 min-w-[56px] py-2 px-3 rounded-xl transition-all duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black
              ${isActive ? 'text-white bg-white/15' : 'text-white/50 active:bg-white/10'}
            `}
          >
            <item.icon
              className="w-6 h-6"
              strokeWidth={isActive ? 2.5 : 2}
              aria-hidden
            />
            <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-[64px]">
              {item.label}
            </span>
          </button>
        );
      })}

      {/* Logout Button — visible to every authenticated user */}
      <button
        onClick={handleLogout}
        aria-label="Odhlásit se"
        className="
          relative flex flex-col items-center justify-center gap-1 min-w-[56px] py-2 px-3 rounded-xl transition-all duration-200
          text-white/50 active:bg-red-500/15 active:text-red-300
          focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black
        "
      >
        <LogOut className="w-6 h-6" strokeWidth={2} aria-hidden />
        <span className="text-[9px] font-bold uppercase tracking-wider">Odhlásit</span>
      </button>
    </nav>
  );
});

export default MobileNav;
