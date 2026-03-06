import React from 'react';
import { SIDEBAR_ITEMS } from '../constants';

interface MobileNavProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ currentView, onNavigate }) => {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around py-2 px-2 pb-[env(safe-area-inset-bottom)] bg-black/80 backdrop-blur-xl border-t border-white/10 safe-area-pb"
      aria-label="Hlavní navigace"
    >
      {SIDEBAR_ITEMS.slice(0, 5).map((item) => {
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
    </nav>
  );
};

export default MobileNav;
