import React, { memo, useMemo } from 'react';
import { SIDEBAR_ITEMS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { Shield } from 'lucide-react';

interface MobileNavProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
}

const MobileNav: React.FC<MobileNavProps> = memo(({ currentView, onNavigate }) => {
  const { isAdmin, modules } = useAuth();

  const enabledItems = useMemo(() => SIDEBAR_ITEMS.filter(item => {
    if (item.id === 'dashboard') return true;
    if (isAdmin) return true;
    const module = modules.find(m => m.id === item.id);
    return module?.is_enabled !== false;
  }).slice(0, isAdmin ? 4 : 5), [isAdmin, modules]);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around py-2 px-3 pb-[env(safe-area-inset-bottom)] bg-surface-1/95 backdrop-blur-xl border-t border-border-subtle"
      aria-label="Hlavni navigace"
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
              relative flex flex-col items-center justify-center gap-0.5 min-w-[52px] py-2 px-2 rounded-xl transition-all duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
              ${isActive 
                ? 'text-text-primary bg-surface-3' 
                : 'text-text-muted active:bg-surface-2'}
            `}
          >
            <item.icon
              className="w-5 h-5"
              strokeWidth={isActive ? 2 : 1.5}
              aria-hidden
            />
            <span className="text-[8px] font-medium uppercase tracking-wide truncate max-w-[56px]">
              {item.label}
            </span>
            {isActive && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
            )}
          </button>
        );
      })}

      {isAdmin && (
        <button
          onClick={() => onNavigate('admin')}
          aria-label="Admin"
          className={`
            relative flex flex-col items-center justify-center gap-0.5 min-w-[52px] py-2 px-2 rounded-xl transition-all duration-200
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
            ${currentView === 'admin' 
              ? 'text-accent bg-accent/10' 
              : 'text-text-muted active:bg-surface-2'}
          `}
        >
          <Shield className="w-5 h-5" strokeWidth={currentView === 'admin' ? 2 : 1.5} />
          <span className="text-[8px] font-medium uppercase tracking-wide">Admin</span>
          {currentView === 'admin' && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
          )}
        </button>
      )}
    </nav>
  );
});

export default MobileNav;
