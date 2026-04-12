import React, { memo, useMemo } from 'react';
import { SIDEBAR_ITEMS } from '../constants';
import { Shield, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = memo(({ currentView, onNavigate }) => {
  const { isAdmin, logout, modules } = useAuth();

  const enabledItems = useMemo(() => SIDEBAR_ITEMS.filter(item => {
    if (item.id === 'dashboard') return true;
    if (isAdmin) return true;
    const module = modules.find(m => m.id === item.id);
    return module?.is_enabled !== false;
  }), [isAdmin, modules]);

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 flex-col items-center py-6 z-[100] pointer-events-none">
      {/* Logo */}
      <div className="mb-8 w-11 h-11 flex-shrink-0 pointer-events-auto">
        <div className="w-full h-full rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <span className="text-accent font-bold text-sm">OR</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1.5 w-full px-3 pointer-events-auto min-h-0">
        {enabledItems.map((item, index) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={index}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={`
                relative w-full aspect-square flex flex-col items-center justify-center rounded-xl transition-all duration-200 group
                focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black
                ${isActive 
                  ? 'bg-surface-2 text-white border border-border-strong shadow-lg' 
                  : 'text-text-tertiary hover:bg-surface-1 hover:text-text-secondary border border-transparent'}
              `}
            >
              <item.icon 
                className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" 
                strokeWidth={isActive ? 2 : 1.5}
              />

              {/* Tooltip */}
              <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-surface-3 text-text-primary text-[10px] font-medium rounded-lg opacity-0 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-[100] border border-border-default shadow-xl">
                {item.label}
              </span>
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto flex flex-col items-center gap-1.5 pb-4 w-full px-3 pointer-events-auto flex-shrink-0">
        {isAdmin && (
          <button 
            onClick={() => onNavigate('admin')}
            aria-label="Admin"
            className={`
              w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-200 group relative border
              ${currentView === 'admin' 
                ? 'bg-accent/10 text-accent border-accent/30' 
                : 'bg-transparent text-text-tertiary hover:text-accent hover:bg-accent/5 border-transparent hover:border-accent/20'}
            `}
          >
            <Shield className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" />
            <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-surface-3 text-text-primary text-[10px] font-medium rounded-lg opacity-0 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-[100] border border-border-default shadow-xl">
              Admin
            </span>
          </button>
        )}

        <button 
          onClick={logout}
          aria-label="Odhlásit se"
          className="w-full aspect-square rounded-xl bg-transparent flex flex-col items-center justify-center text-text-tertiary hover:text-danger hover:bg-danger/5 transition-all duration-200 group relative border border-transparent hover:border-danger/20"
        >
          <LogOut className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" />
          <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-surface-3 text-text-primary text-[10px] font-medium rounded-lg opacity-0 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-[100] border border-border-default shadow-xl">
            Odhlásit
          </span>
        </button>
      </div>
    </aside>
  );
});

export default Sidebar;
