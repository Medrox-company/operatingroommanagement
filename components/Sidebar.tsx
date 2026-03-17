import React from 'react';
import { SIDEBAR_ITEMS } from '../constants';
import { Zap, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { isAdmin, user, logout, modules } = useAuth();

  // Filter sidebar items based on enabled modules (admins see all, users see only enabled)
  const enabledItems = SIDEBAR_ITEMS.filter(item => {
    if (isAdmin) return true; // Admin má vždy přístup ke všem modulům
    const module = modules.find(m => m.id === item.id);
    return module?.is_enabled !== false;
  });

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-24 flex-col items-center py-6 z-[100] pointer-events-none">
      
      <div className="mb-12 w-14 h-14 flex-shrink-0" />

      <nav className="flex-1 flex flex-col gap-4 w-full px-4 pointer-events-auto min-h-0">
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
                focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black
                ${isActive ? 'bg-white/[0.15] text-white shadow-xl' : 'text-white/40 hover:bg-white/5 hover:text-white'}
              `}
            >
              <item.icon 
                className={`w-6 h-6 transition-all duration-300 group-hover:-translate-y-0.5`} 
                strokeWidth={isActive ? 2.5 : 2}
              />

              <span className="absolute left-full ml-4 px-3 py-1.5 bg-white/10 backdrop-blur-xl text-white text-[9px] font-bold uppercase tracking-widest rounded-lg opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-[100] shadow-2xl font-mono">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-4 pb-4 w-full px-4 pointer-events-auto flex-shrink-0">
        {/* Admin Button - only for admins */}
        {isAdmin && (
          <button 
            onClick={() => onNavigate('admin')}
            className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-300 group relative
              ${currentView === 'admin' ? 'bg-[#00D8C1]/20 text-[#00D8C1]' : 'bg-white/5 text-white/30 hover:text-[#00D8C1] hover:bg-white/10'}
            `}
          >
            <Shield className="w-6 h-6 transition-transform group-hover:scale-110" />
            <span className="absolute left-full ml-4 px-3 py-1.5 bg-white/10 backdrop-blur-xl text-white text-[9px] font-bold uppercase tracking-widest rounded-lg opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-[100] shadow-2xl font-mono">
              Admin
            </span>
          </button>
        )}

        {/* Logout Button */}
        <button 
          onClick={logout}
          className="w-full aspect-square rounded-2xl bg-white/5 flex flex-col items-center justify-center text-white/30 hover:text-red-400 hover:bg-white/10 transition-all duration-300 group relative"
        >
          <LogOut className="w-6 h-6 transition-transform group-hover:scale-110" />
          <span className="absolute left-full ml-4 px-3 py-1.5 bg-white/10 backdrop-blur-xl text-white text-[9px] font-bold uppercase tracking-widest rounded-lg opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-[100] shadow-2xl font-mono">
            Odhlásit
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
