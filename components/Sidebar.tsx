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
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-24 flex-col items-center py-6 z-[100] pointer-events-none glass border-r border-blue-500/20">
      
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
                relative w-full aspect-square flex flex-col items-center justify-center transition-all duration-300 group rounded-xl
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background
                ${isActive ? 'glass border-primary/50 text-primary glow-blue' : 'text-muted-foreground hover:glass hover:border-blue-500/30 hover:text-foreground'}
              `}
            >
              <item.icon 
                className={`w-6 h-6 transition-all duration-300 group-hover:-translate-y-0.5`} 
                strokeWidth={isActive ? 2.5 : 2}
              />

              <span className="absolute left-full ml-3 px-3 py-2 glass border-blue-500/30 text-foreground text-[9px] font-bold uppercase tracking-widest rounded-lg opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-[100] glow-blue font-mono">
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
          className="w-full aspect-square rounded-xl glass border-destructive/30 flex flex-col items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-all duration-300 group relative"
        >
          <LogOut className="w-6 h-6 transition-transform group-hover:scale-110" />
          <span className="absolute left-full ml-3 px-3 py-2 glass border-destructive/30 text-foreground text-[9px] font-bold uppercase tracking-widest rounded-lg opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-[100] font-mono">
            Odhlásit
          </span>
        </button>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
