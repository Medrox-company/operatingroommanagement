'use client';

import React from 'react';
import { Home, DollarSign, BadgeDollarSign, Building2, Layers, Bell, Monitor } from 'lucide-react';

export const STATISTICS_TABS = [
  { id: 'prehled', label: 'Přehled', icon: Home },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'sazby', label: 'Sazby', icon: BadgeDollarSign },
  { id: 'saly', label: 'Sály', icon: Building2 },
  { id: 'faze', label: 'Fáze', icon: Layers },
  { id: 'notifikace', label: 'Notifikace', icon: Bell },
  { id: 'zarizeni', label: 'Zařízení', icon: Monitor },
] as const;

export type StatisticsTab = (typeof STATISTICS_TABS)[number]['id'];

/** Reveal a tab without scrolling the page or any ancestor of the navigation. */
function revealTab(navigation: HTMLElement, tab: HTMLElement) {
  if (navigation.clientWidth === 0) return;
  const left = navigation.getBoundingClientRect().left + navigation.clientLeft;
  const right = left + navigation.clientWidth;
  const bounds = tab.getBoundingClientRect();
  const delta = bounds.left < left ? bounds.left - left
    : bounds.right > right ? bounds.right - right
      : 0;
  if (delta !== 0) navigation.scrollLeft += delta;
}

/** The same quiet segmented navigation as the Settings modules. */
export function StatisticsNavigation({ value, onChange, compact = false }: {
  value: StatisticsTab;
  onChange: (tab: StatisticsTab) => void;
  compact?: boolean;
}) {
  const navigationRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;
    const revealSelectedTab = () => {
      const selectedTab = navigation.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (selectedTab) revealTab(navigation, selectedTab);
    };
    revealSelectedTab();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(revealSelectedTab);
    observer.observe(navigation);
    if (navigation.firstElementChild) observer.observe(navigation.firstElementChild);
    return () => observer.disconnect();
  }, [value, compact]);

  return (
    <nav ref={navigationRef} className={`stats-section-nav${compact ? ' stats-section-nav--mobile' : ''}`} aria-label="Sekce statistik">
      <div className="stats-section-tabs" role="tablist" aria-label="Záložky modulu Statistiky">
        {STATISTICS_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`statistics-tab-${id}`}
            type="button"
            role="tab"
            aria-controls={`statistics-panel-${id}`}
            aria-selected={value === id}
            tabIndex={value === id ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const buttons = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
              const index = buttons.indexOf(event.currentTarget);
              if (index < 0 || buttons.length === 0) return;
              const next = event.key === 'Home' ? 0
                : event.key === 'End' ? buttons.length - 1
                  : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
              const tab = STATISTICS_TABS[next];
              if (!tab) return;
              onChange(tab.id);
              buttons[next]?.focus({ preventScroll: true });
              if (navigationRef.current && buttons[next]) revealTab(navigationRef.current, buttons[next]);
            }}
          >
            <Icon aria-hidden="true" strokeWidth={1.7} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
