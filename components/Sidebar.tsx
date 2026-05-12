import React, { memo, useMemo } from 'react';
import { SIDEBAR_ITEMS } from '../constants';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = memo(({ currentView, onNavigate }) => {
  const { isAdmin, logout, hasModuleAccess } = useAuth();

  // Filter sidebar items based on role + module access.
  // Dashboard is always accessible for everyone.
  const enabledItems = useMemo(() => SIDEBAR_ITEMS.filter(item => {
    if (item.id === 'dashboard') return true;
    if (isAdmin) return true;
    return hasModuleAccess(item.id);
  }), [isAdmin, hasModuleAccess]);

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-24 flex-col items-center py-6 z-[100] pointer-events-none">
      {/* Glass background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-white/[0.02] to-white/[0.01] backdrop-blur-2xl border-r border-white/[0.05]" />
      
      {/* Top accent gradient */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#FBBF24]/5 to-transparent pointer-events-none" />
      
      {/* Logo spacer */}
      <div className="mb-10 w-14 h-14 flex-shrink-0 relative z-10" />

      <nav className="flex-1 flex flex-col gap-2 w-full px-3 pointer-events-auto min-h-0 relative z-10">
        {enabledItems.map((item, index) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={index}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={`
                relative w-full aspect-square flex flex-col items-center justify-center transition-all duration-300 group rounded-xl
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50
                ${isActive 
                  ? 'bg-gradient-to-br from-[#FBBF24]/20 to-[#FBBF24]/5 text-[#FBBF24] shadow-lg' 
                  : 'text-white/35 hover:bg-white/[0.04] hover:text-white/70'}
              `}
            >
              {/* Active indicator line */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full bg-[#FBBF24] shadow-[0_0_12px_rgba(251,191,36,0.5)]" />
              )}
              
              <item.icon 
                className={`w-5 h-5 transition-all duration-300 ${isActive ? '' : 'group-hover:-translate-y-0.5'}`} 
                strokeWidth={isActive ? 2.5 : 2}
              />

              {/* Tooltip */}
              <span className="absolute left-full ml-3 px-3 py-2 bg-gradient-to-br from-black/90 to-black/80 backdrop-blur-xl text-white text-[9px] font-bold uppercase tracking-widest rounded-lg opacity-0 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-[100] shadow-2xl font-mono border border-white/10">
                {item.label}
                {/* Arrow */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-black/90 border-l border-b border-white/10 rotate-45" />
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-3 pb-4 w-full px-3 pointer-events-auto flex-shrink-0 relative z-10">
        {/* Logout Button */}
        <button 
          onClick={logout}
          className="w-full aspect-square rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.05] flex flex-col items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all duration-300 group relative"
        >
          <LogOut className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="absolute left-full ml-3 px-3 py-2 bg-gradient-to-br from-black/90 to-black/80 backdrop-blur-xl text-white text-[9px] font-bold uppercase tracking-widest rounded-lg opacity-0 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-[100] shadow-2xl font-mono border border-white/10">
            Odhlasit
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-black/90 border-l border-b border-white/10 rotate-45" />
          </span>
        </button>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
