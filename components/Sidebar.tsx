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
      <div className="absolute inset-0 glass-base pointer-events-none" />
      
      {/* Accent border right */}
      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/50 via-cyan-500/10 to-transparent" />
      
      <div className="mb-12 w-14 h-14 flex-shrink-0" />

      <nav className="flex-1 flex flex-col gap-3 w-full px-3 pointer-events-auto min-h-0">
        {enabledItems.map((item, index) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={index}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={`
                relative w-full aspect-square flex flex-col items-center justify-center transition-all duration-300 group rounded-2xl
                focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black/20
                glass-interactive
                ${isActive 
                  ? 'bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 text-cyan-300 shadow-lg glow-accent' 
                  : 'text-white/50 hover:text-white/80'
                }
              `}
            >
              <item.icon 
                className={`w-5 h-5 transition-all duration-300 group-hover:-translate-y-1`} 
                strokeWidth={isActive ? 2.5 : 2}
              />

              <span className="absolute left-full ml-3 px-3 py-2 bg-gradient-to-br from-slate-900 to-slate-950 text-white text-[8px] font-bold uppercase tracking-widest rounded-xl opacity-0 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-1 transition-all pointer-events-none whitespace-nowrap z-[100] shadow-2xl font-mono border border-white/10">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-3 pb-4 w-full px-3 pointer-events-auto flex-shrink-0">
        {/* Logout Button */}
        <button 
          onClick={logout}
          className="w-full aspect-square rounded-2xl glass-interactive bg-gradient-to-br from-red-500/10 to-transparent text-white/40 hover:text-red-300 relative"
        >
          <LogOut className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="absolute left-full ml-3 px-3 py-2 bg-gradient-to-br from-slate-900 to-slate-950 text-white text-[8px] font-bold uppercase tracking-widest rounded-xl opacity-0 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-1 transition-all pointer-events-none whitespace-nowrap z-[100] shadow-2xl font-mono border border-white/10">
            Odhlásit
          </span>
        </button>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
