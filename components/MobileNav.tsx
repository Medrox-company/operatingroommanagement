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
/* Krátké popisky pro úzkou mobilní lištu — plné názvy se nevejdou. */
const MOBILE_LABELS: Record<string, string> = {
  dashboard: 'Přehled',
  flow: 'Tok',
  timeline: 'Timeline',
  statistics: 'Statistiky',
  staff: 'Personál',
  'staff-overview': 'Personál',
  settings: 'Nastavení',
};

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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] pointer-events-none">
      {/* Plná tmavě modrá lišta dle prototypu — přes celou šířku, ke spodní hraně */}
      <nav
        className="pointer-events-auto flex items-start justify-around gap-0.5 px-2 pt-2.5 relative"
        style={{
          background: 'var(--m-nav-bg)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
          boxShadow: '0 -12px 34px rgba(0,0,0,0.28), inset 0 1px 0 var(--m-card-highlight)',
          borderTop: '1px solid var(--m-border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
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
              className="relative flex flex-col items-center justify-center gap-1.5 flex-1 min-w-0 py-1 transition-all duration-300 focus:outline-none"
            >
              <item.icon
                className="w-[21px] h-[21px] transition-colors duration-300"
                strokeWidth={isActive ? 2.5 : 2}
                style={{ color: isActive ? 'var(--m-nav-active)' : 'var(--m-nav-fg)' }}
                aria-hidden
              />
              <span
                className="text-[8px] font-bold uppercase tracking-wider truncate max-w-[64px] transition-colors duration-300"
                style={{ color: isActive ? 'var(--m-nav-active)' : 'var(--m-nav-fg)' }}
              >
                {MOBILE_LABELS[item.id] || item.label}
              </span>
              {/* Aktivní indikátor — krátká linka pod položkou */}
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-[3px] rounded-full" style={{ background: 'var(--m-nav-active)' }} />
              )}
            </button>
          );
        })}

        {/* Odhlášení */}
        <button
          onClick={handleLogout}
          aria-label="Odhlásit se"
          className="relative flex flex-col items-center justify-center gap-1.5 flex-1 min-w-0 py-1 transition-all duration-200"
        >
          <LogOut className="w-[21px] h-[21px]" strokeWidth={2} style={{ color: 'var(--m-nav-fg)' }} aria-hidden />
          <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: 'var(--m-nav-fg)' }}>Odhlásit</span>
        </button>
      </nav>
    </div>
  );
});

export default MobileNav;
