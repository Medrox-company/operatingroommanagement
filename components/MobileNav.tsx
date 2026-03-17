import React from 'react';
import { SIDEBAR_ITEMS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { Shield, LogOut } from 'lucide-react';

interface MobileNavProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ currentView, onNavigate }) => {
  const { isAdmin, logout, modules } = useAuth();

  // Filter sidebar items based on enabled modules (admins see all, users see only enabled)
  const enabledItems = SIDEBAR_ITEMS.filter(item => {
    if (isAdmin) return true; // Admin má vždy přístup ke všem modulům
    const module = modules.find(m => m.id === item.id);
    return module?.is_enabled !== false;
  }).slice(0, isAdmin ? 4 : 5); // Leave room for admin button if admin

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

      {/* Admin Button - only for admins */}
      {isAdmin && (
        <button
          onClick={() => onNavigate('admin')}
          aria-label="Admin"
          className={`
            relative flex flex-col items-center justify-center gap-1 min-w-[56px] py-2 px-3 rounded-xl transition-all duration-200
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black
            ${currentView === 'admin' ? 'text-[#00D8C1] bg-[#00D8C1]/15' : 'text-white/50 active:bg-white/10'}
          `}
        >
          <Shield className="w-6 h-6" strokeWidth={currentView === 'admin' ? 2.5 : 2} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Admin</span>
        </button>
      )}
    </nav>
  );
};

export default MobileNav;
