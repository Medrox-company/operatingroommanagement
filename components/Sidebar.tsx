import React, { memo, useMemo } from 'react';
import { SIDEBAR_ITEMS } from '../constants';
import { ArrowLeft, LogOut, Megaphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './sidebar-project.css';

interface SidebarProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
  onSendMessage?: () => void;
}

const Sidebar: React.FC<SidebarProps> = memo(({ currentView, onNavigate, onSendMessage }) => {
  const { isAdmin, logout, hasModuleAccess } = useAuth();

  // Superadministrátor řídí dostupnost všech modulů. Žádný provozní pohled
  // proto nesmí mít klientskou výjimku mimo centrální hasModuleAccess().
  const enabledItems = useMemo(() => SIDEBAR_ITEMS.filter(item => {
    return hasModuleAccess(item.id);
  }), [hasModuleAccess]);

  return (
    <aside className="sidebar-project" aria-label="Hlavní navigace aplikace">
      <nav className="sidebar-project__links" aria-label="Moduly aplikace">
        {enabledItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className="sidebar-project__button"
            >
              <item.icon aria-hidden="true" className="sidebar-project__icon" strokeWidth={1.75} />

              <span className="sidebar-project__tooltip" aria-hidden="true">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div id="operativity-sidebar-navigation" className="sidebar-project__module" />
      {currentView === 'settings' && hasModuleAccess('settings') && <button type="button" className="sidebar-project__return" aria-label="Zpět do nastavení" title="Zpět do nastavení" onClick={() => onNavigate('settings')}><ArrowLeft aria-hidden="true" /><span>Zpět do nastavení</span></button>}

      <div className="sidebar-project__actions">
        {/* Zpráva na sál — pouze administrátor s povoleným modulem upozornění */}
        {isAdmin && hasModuleAccess('alerts') && onSendMessage && (
          <button
            type="button"
            onClick={onSendMessage}
            aria-label="Zpráva na sál"
            className="sidebar-project__button"
          >
            <Megaphone aria-hidden="true" className="sidebar-project__icon" strokeWidth={1.75} />
            <span className="sidebar-project__tooltip" aria-hidden="true">
              Zpráva na sál
            </span>
          </button>
        )}
        {/* Logout Button */}
        <button
          type="button"
          onClick={logout}
          aria-label="Odhlásit"
          className="sidebar-project__button sidebar-project__button--logout"
        >
          <LogOut aria-hidden="true" className="sidebar-project__icon" strokeWidth={1.75} />
          <span className="sidebar-project__tooltip" aria-hidden="true">
            Odhlásit
          </span>
        </button>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
