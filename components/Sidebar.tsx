import React, { memo, useMemo } from 'react';
import { SIDEBAR_ITEMS } from '../constants';
import { LogOut, Megaphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
  onSendMessage?: () => void;
}

const Sidebar: React.FC<SidebarProps> = memo(({ currentView, onNavigate, onSendMessage }) => {
  const { isAdmin, logout, hasModuleAccess } = useAuth();

  // Filter sidebar items based on role + module access.
  // Dashboard is always accessible for everyone.
  const enabledItems = useMemo(() => SIDEBAR_ITEMS.filter(item => {
    if (item.id === 'dashboard' || item.id === 'flow') return true;
    if (isAdmin) return true;
    return hasModuleAccess(item.id);
  }), [isAdmin, hasModuleAccess]);

  return (
    <aside className="pointer-events-none fixed inset-y-0 left-0 z-[100] hidden w-24 flex-col items-center py-[clamp(0.5rem,2.2vh,1.5rem)] md:flex">
      
      <div className="mb-[clamp(0.5rem,2vh,3rem)] h-[clamp(1rem,4vh,3.5rem)] w-14 flex-shrink-0" />

      <nav className="pointer-events-auto flex min-h-0 w-full flex-1 flex-col justify-between gap-[clamp(0.2rem,1vh,1rem)] px-4">
        {enabledItems.map((item, index) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={index}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={`
                group relative flex h-[clamp(2.5rem,7vh,4rem)] w-full flex-shrink items-center justify-center rounded-[clamp(0.75rem,1.8vh,1rem)] transition-colors duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black
                ${isActive ? 'bg-white/[0.15] text-white shadow-xl' : 'text-white/40 hover:bg-white/5 hover:text-white'}
              `}
            >
              <item.icon 
                className="h-[clamp(1.1rem,2.7vh,1.5rem)] w-[clamp(1.1rem,2.7vh,1.5rem)] transition-colors duration-200"
                strokeWidth={isActive ? 2.5 : 2}
              />

              <span className="absolute left-full ml-4 px-3 py-1.5 bg-white/10 backdrop-blur-xl text-white text-[9px] font-bold uppercase tracking-widest rounded-lg opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-[100] shadow-2xl font-mono">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="pointer-events-auto mt-[clamp(0.35rem,1.2vh,1rem)] flex w-full flex-shrink-0 flex-col items-center gap-[clamp(0.25rem,1vh,1rem)] px-4">
        {/* Zpráva na sál — pouze administrátor */}
        {isAdmin && onSendMessage && (
          <button
            onClick={onSendMessage}
            aria-label="Zpráva na sál"
            className="group relative flex h-[clamp(2.5rem,7vh,4rem)] w-full items-center justify-center rounded-[clamp(0.75rem,1.8vh,1rem)] bg-white/5 text-white/40 transition-colors duration-200 hover:bg-white/10 hover:text-[#22D3EE]"
          >
            <Megaphone className="h-[clamp(1.1rem,2.7vh,1.5rem)] w-[clamp(1.1rem,2.7vh,1.5rem)]" />
            <span className="absolute left-full ml-4 px-3 py-1.5 bg-white/10 backdrop-blur-xl text-white text-[9px] font-bold uppercase tracking-widest rounded-lg opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-[100] shadow-2xl font-mono">
              Zpráva na sál
            </span>
          </button>
        )}
        {/* Logout Button */}
        <button 
          onClick={logout}
          aria-label="Odhlásit"
          className="group relative flex h-[clamp(2.5rem,7vh,4rem)] w-full items-center justify-center rounded-[clamp(0.75rem,1.8vh,1rem)] bg-white/5 text-white/30 transition-colors duration-200 hover:bg-white/10 hover:text-red-400"
        >
          <LogOut className="h-[clamp(1.1rem,2.7vh,1.5rem)] w-[clamp(1.1rem,2.7vh,1.5rem)]" />
          <span className="absolute left-full ml-4 px-3 py-1.5 bg-white/10 backdrop-blur-xl text-white text-[9px] font-bold uppercase tracking-widest rounded-lg opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-[100] shadow-2xl font-mono">
            Odhlásit
          </span>
        </button>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
