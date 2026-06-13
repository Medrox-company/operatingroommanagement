import React, { memo, useMemo, useCallback } from 'react';
import { SIDEBAR_ITEMS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

interface MobileNavProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
}

/* Plovoucí skleněná navigace ve stylu moderních mobilních aplikací —
   zaoblená teal „pill" lišta odsazená od okrajů, aktivní položka má
   gradientní teal podsvícení s jemnou září. */
const MobileNav: React.FC<MobileNavProps> = memo(({ currentView, onNavigate }) => {
  const { isAdmin, hasModuleAccess, logout } = useAuth();

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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] pointer-events-none pb-[max(env(safe-area-inset-bottom),0.75rem)] px-4">
      <nav
        className="pointer-events-auto mx-auto flex items-center justify-around gap-1 max-w-md rounded-[26px] px-2 py-2 relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(13,42,46,0.82) 0%, rgba(8,26,30,0.9) 100%)',
          border: '1px solid rgba(45,212,191,0.18)',
          boxShadow: '0 16px 40px -12px rgba(0,0,0,0.7), 0 0 30px rgba(45,212,191,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
        aria-label="Hlavní navigace"
      >
        {/* jemný horní světelný akcent lišty */}
        <div className="absolute inset-x-10 top-0 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(45,212,191,0.4), transparent)' }} />

        {enabledItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className="relative flex flex-col items-center justify-center gap-1 flex-1 min-w-0 py-2 rounded-2xl transition-all duration-300 focus:outline-none"
              style={isActive ? {
                background: 'linear-gradient(180deg, rgba(45,212,191,0.22) 0%, rgba(34,211,238,0.10) 100%)',
                boxShadow: '0 0 18px -2px rgba(45,212,191,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
                border: '1px solid rgba(45,212,191,0.4)',
              } : { border: '1px solid transparent' }}
            >
              <item.icon
                className="w-[22px] h-[22px] transition-colors duration-300"
                strokeWidth={isActive ? 2.5 : 2}
                style={{ color: isActive ? '#5EEAD4' : 'rgba(255,255,255,0.5)' }}
                aria-hidden
              />
              <span
                className="text-[8px] font-bold uppercase tracking-wider truncate max-w-[60px] transition-colors duration-300"
                style={{ color: isActive ? '#99F6E4' : 'rgba(255,255,255,0.4)' }}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Odhlášení */}
        <button
          onClick={handleLogout}
          aria-label="Odhlásit se"
          className="relative flex flex-col items-center justify-center gap-1 flex-1 min-w-0 py-2 rounded-2xl transition-all duration-200 active:bg-red-500/15"
          style={{ border: '1px solid transparent' }}
        >
          <LogOut className="w-[22px] h-[22px]" strokeWidth={2} style={{ color: 'rgba(255,255,255,0.5)' }} aria-hidden />
          <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Odhlásit</span>
        </button>
      </nav>
    </div>
  );
});

export default MobileNav;
