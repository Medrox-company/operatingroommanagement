import React, { memo, useMemo } from 'react';
import { SIDEBAR_ITEMS } from '../constants';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
}

/**
 * INDUSTRIAL SIDEBAR — Siemens SaaS aesthetic.
 *
 * Sharp panel s hairline borderem napravo, mono modul kódy (M01, M02...) pod
 * každou ikonou, accent strip vlevo u aktivního modulu. Žádné rounded blobs,
 * žádný glassmorph — pure black panel s 1px hairlines.
 */
const Sidebar: React.FC<SidebarProps> = memo(({ currentView, onNavigate }) => {
  const { isAdmin, logout, hasModuleAccess } = useAuth();

  const enabledItems = useMemo(() => SIDEBAR_ITEMS.filter(item => {
    if (item.id === 'dashboard') return true;
    if (isAdmin) return true;
    return hasModuleAccess(item.id);
  }), [isAdmin, hasModuleAccess]);

  return (
    <aside
      className="hidden md:flex fixed left-0 top-0 bottom-0 w-24 flex-col items-stretch z-[100] bg-background border-r border-hairline-strong"
      aria-label="Hlavní navigace"
    >
      {/* System brand block — UNIT.ID + version */}
      <div className="flex flex-col items-center justify-center py-4 border-b border-hairline-strong">
        <div className="font-mono text-[10px] font-semibold tracking-[0.18em] text-accent">OR</div>
        <div className="font-mono text-[8px] tracking-[0.15em] text-foreground-dim mt-0.5">CTRL</div>
      </div>

      {/* Module navigation */}
      <nav className="flex-1 flex flex-col py-3 min-h-0 overflow-y-auto hide-scrollbar">
        {enabledItems.map((item, index) => {
          const isActive = currentView === item.id;
          const moduleCode = `M${String(index + 1).padStart(2, '0')}`;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={`
                relative w-full py-3 flex flex-col items-center justify-center gap-1 transition-colors group
                focus:outline-none focus-visible:bg-panel-hi
                ${isActive ? 'text-accent bg-panel-hi' : 'text-foreground-muted hover:text-foreground hover:bg-panel'}
              `}
            >
              {/* Active accent strip — sharp 2px vertical line */}
              {isActive && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-accent"
                  aria-hidden
                />
              )}

              <item.icon
                className="w-5 h-5 transition-transform"
                strokeWidth={isActive ? 1.75 : 1.5}
              />

              <span className="font-mono text-[8.5px] tracking-[0.15em] uppercase leading-none">
                {moduleCode}
              </span>

              {/* Hover tooltip — module label */}
              <span className="absolute left-full ml-2 px-2 py-1 bg-panel-hi border border-hairline-strong text-foreground text-[10px] font-medium tracking-[0.12em] uppercase opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-[100] font-sans">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Logout footer */}
      <div className="border-t border-hairline-strong">
        <button
          onClick={logout}
          aria-label="Odhlásit"
          className="w-full py-3 flex flex-col items-center justify-center gap-1 text-foreground-dim hover:text-critical hover:bg-panel-hi transition-colors group focus:outline-none focus-visible:bg-panel-hi"
        >
          <LogOut className="w-5 h-5" strokeWidth={1.5} />
          <span className="font-mono text-[8.5px] tracking-[0.15em] uppercase leading-none">
            EXIT
          </span>
          <span className="absolute left-full ml-2 px-2 py-1 bg-panel-hi border border-hairline-strong text-foreground text-[10px] font-medium tracking-[0.12em] uppercase opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-[100] font-sans">
            Odhlásit
          </span>
        </button>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
