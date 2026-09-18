'use client';

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Home, LogOut, MoreHorizontal, X } from 'lucide-react';
import { SIDEBAR_ITEMS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { Drawer } from './ui/Drawer';
import './mobile/mobile-navigation.css';

interface MobileNavProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
}

const PRIMARY_IDS = new Set(['dashboard', 'flow', 'timeline', 'statistics']);
const MOBILE_LABELS: Record<string, string> = { dashboard: 'Přehled', flow: 'Tok', timeline: 'Rozpis', statistics: 'Statistiky' };

const MobileNav: React.FC<MobileNavProps> = memo(({ currentView, onNavigate }) => {
  const { isSuperAdmin, hasModuleAccess, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const moreRef = useRef<HTMLButtonElement>(null);
  const enabledItems = useMemo(() => SIDEBAR_ITEMS.filter(item => isSuperAdmin || hasModuleAccess(item.id)), [isSuperAdmin, hasModuleAccess]);
  const primaryItems = enabledItems.filter(item => PRIMARY_IDS.has(item.id));
  const moreItems = enabledItems.filter(item => !PRIMARY_IDS.has(item.id));
  const moreActive = moreItems.some(item => item.id === currentView);
  const closeMore = useCallback(() => { setMoreOpen(false); moreRef.current?.focus(); }, []);
  useEffect(() => {
    if (!moreOpen) return;
    const onNativeBack = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeMore();
    };
    window.addEventListener('nativeBackButton', onNativeBack, { capture: true });
    return () => window.removeEventListener('nativeBackButton', onNativeBack, { capture: true });
  }, [moreOpen, closeMore]);

  return (
    <>
      <nav className="mobile-reference-nav md:hidden" aria-label="Hlavní navigace">
        {primaryItems.map(item => {
          const Icon = item.id === 'dashboard' ? Home : item.icon;
          const active = currentView === item.id;
          return <button key={item.id} type="button" onClick={() => onNavigate(item.id)} aria-label={item.label} aria-current={active ? 'page' : undefined}>
            <span className="mobile-nav-icon"><Icon size={22} strokeWidth={active ? 1.9 : 1.65} aria-hidden /></span>
            <span>{MOBILE_LABELS[item.id] || item.label}</span>
          </button>;
        })}
        <button ref={moreRef} type="button" onClick={() => setMoreOpen(true)} aria-label="Více možností" aria-expanded={moreOpen} aria-haspopup="dialog" data-active={moreActive || undefined}>
          <span className="mobile-nav-icon"><MoreHorizontal size={22} strokeWidth={1.8} aria-hidden /></span><span>Více</span>
        </button>
      </nav>
      <Drawer open={moreOpen} onOpenChange={open => open ? setMoreOpen(true) : closeMore()} title="Další možnosti" className="mobile-nav-more-sheet">
        <button type="button" className="mobile-more-close" onClick={closeMore} aria-label="Zavřít nabídku"><X size={18} strokeWidth={2} aria-hidden /></button>
        <div className="mobile-more-links">
          {moreItems.length > 0 && <div className="mobile-more-group" role="group" aria-label="Další moduly">
            {moreItems.map(item => <button key={item.id} type="button" onClick={() => { closeMore(); onNavigate(item.id); }} aria-current={currentView === item.id ? 'page' : undefined}>
              <item.icon className="mobile-more-icon" size={21} strokeWidth={1.7} aria-hidden /><span>{item.label}</span><ChevronRight className="mobile-more-chevron" size={16} strokeWidth={1.8} aria-hidden />
            </button>)}
          </div>}
          <button className="mobile-more-logout" type="button" disabled={loggingOut} onClick={async () => {
            setLoggingOut(true); setLogoutError('');
            try { await logout(); closeMore(); }
            catch { setLogoutError('Odhlášení se nezdařilo. Zkuste to znovu.'); }
            finally { setLoggingOut(false); }
          }}><LogOut className="mobile-more-icon" size={21} strokeWidth={1.7} aria-hidden /><span>{loggingOut ? 'Odhlašuji…' : 'Odhlásit se'}</span></button>
          {logoutError && <p role="alert">{logoutError}</p>}
        </div>
      </Drawer>
    </>
  );
});

export default MobileNav;
