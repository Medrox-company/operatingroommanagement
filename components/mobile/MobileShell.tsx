'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/* =============================================================================
   Mobile Shell — sdílené primitivy pro mobilní redesign modulů
   Používá se POUZE v `md:hidden` blocích. Desktop zůstává beze změny.
   Vizuální jazyk je sjednocený s RoomDetail a NotificationOverlay:
   rounded-3xl karty, bílé glass okraje, text-balance/pretty, mild tracking.
   ========================================================================== */

/**
 * MobileScreen
 * Stránkový kontejner: padding, vertikální scroll, respektuje spodní MobileNav
 * a iOS safe-area. Hlavní App.tsx už má radial background, takže zde jen
 * layout a scrollování.
 */
export const MobileScreen: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`md:hidden h-full w-full overflow-y-auto hide-scrollbar ${className}`}
    style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
  >
    <div
      className="flex flex-col gap-5 px-5"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 18px)' }}
    >
      {children}
    </div>
  </div>
);

/**
 * MobileHeader
 * Levá dvojřádková typografie (kicker + title) v duchu detailu sálu.
 * Napravo volitelný akční slot (např. filtr, refresh).
 */
export const MobileHeader: React.FC<{
  kicker: string;
  title: string;
  right?: React.ReactNode;
}> = ({ kicker, title, right }) => (
  <header className="flex items-end justify-between gap-4">
    <div className="min-w-0">
      <p className="text-[11px] font-semibold leading-none" style={{ color: '#7C8AA5' }}>
        {kicker}
      </p>
      <h1 className="text-2xl font-extrabold mt-2 leading-tight text-balance" style={{ color: '#17233F' }}>
        {title}
      </h1>
    </div>
    {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
  </header>
);

/**
 * MobileCard
 * Základní rounded-3xl "glass" karta. accent (hex) přidá jemné barevné tónování.
 */
export const MobileCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  accent?: string;
  onClick?: () => void;
  as?: 'div' | 'button';
}> = ({ children, className = '', accent, onClick, as = 'div' }) => {
  const style: React.CSSProperties = {
    // Světlý medicínský styl — bílá karta, jemný stín, volitelný barevný tint
    background: accent
      ? `linear-gradient(135deg, ${accent}14 0%, #FFFFFF 55%)`
      : '#FFFFFF',
    border: `1px solid ${accent ? `${accent}33` : 'transparent'}`,
    boxShadow: '0 8px 20px rgba(23,43,99,0.06)',
  };

  if (as === 'button' || onClick) {
    return (
      <button
        onClick={onClick}
        className={`w-full text-left rounded-3xl p-5 outline-none select-none active:scale-[0.99] transition-transform ${className}`}
        style={style}
      >
        {children}
      </button>
    );
  }
  return (
    <div className={`rounded-3xl p-5 ${className}`} style={style}>
      {children}
    </div>
  );
};

/**
 * MobilePillTabs
 * Segmentovaný přepínač ve stylu iOS. Škáluje se počtem položek (1-n).
 */
export interface PillTab<T extends string> {
  id: T;
  label: string;
}

export function MobilePillTabs<T extends string>({
  tabs,
  value,
  onChange,
  className = '',
}: {
  tabs: PillTab<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={`grid rounded-2xl p-1 gap-1 ${className}`}
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
        background: '#E3E9F4',
      }}
    >
      {tabs.map(tab => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="relative rounded-xl text-xs font-semibold py-2.5 px-1.5 transition-colors outline-none truncate"
            style={{ color: active ? '#2952C8' : '#7C8AA5' }}
          >
            {active && (
              <motion.span
                layoutId="mobile-pill-active"
                className="absolute inset-0 rounded-xl"
                style={{
                  background: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(23,43,99,0.10)',
                }}
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              />
            )}
            <span className="relative truncate text-[11px]">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * MobileSectionLabel
 * Nenápadný „kapitálkový" label pro odstup sekcí.
 */
export const MobileSectionLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <p
    className={`text-[13px] font-bold px-1 ${className}`}
    style={{ color: '#2952C8' }}
  >
    {children}
  </p>
);

/**
 * MobileSheet
 * Bottom sheet s backdropem. Slouží pro detail zaměstnance a další modály.
 * Při open=true uzamkne scroll pozadí.
 */
export const MobileSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, children }) => {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sheet-root"
          className="md:hidden fixed inset-0 z-[300] flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            className="relative w-full max-h-[90vh] rounded-t-[28px] overflow-hidden flex flex-col"
            style={{
              background: '#F7F9FD',
              boxShadow: '0 -20px 60px rgba(23,43,99,0.25)',
            }}
          >
            {/* Drag handle */}
            <div className="pt-2.5 pb-1 flex items-center justify-center shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: '#C9D5E8' }} />
            </div>

            {/* Header */}
            {(title || subtitle) && (
              <div className="flex items-start justify-between gap-4 px-6 pt-3 pb-4 shrink-0">
                <div className="min-w-0">
                  {subtitle && (
                    <p className="text-[11px] font-semibold leading-none" style={{ color: '#7C8AA5' }}>
                      {subtitle}
                    </p>
                  )}
                  {title && (
                    <h2 className="text-xl font-extrabold mt-1.5 leading-tight text-balance" style={{ color: '#17233F' }}>
                      {title}
                    </h2>
                  )}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Zavřít"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0"
                  style={{ background: '#FFFFFF', boxShadow: '0 4px 12px rgba(23,43,99,0.08)', color: '#17233F' }}
                >
                  <X className="w-4 h-4" strokeWidth={2.25} />
                </button>
              </div>
            )}

            {/* Content */}
            <div
              className="overflow-y-auto px-6 pb-6 hide-scrollbar"
              style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * MobileSearchInput
 * Unifikovaný input pro vyhledávací pole v mobilních modulech.
 */
export const MobileSearchInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}> = ({ value, onChange, placeholder, icon }) => (
  <div
    className="flex items-center gap-3 rounded-2xl px-4 py-3"
    style={{
      background: '#FFFFFF',
      border: '1px solid #E1E8F3',
      boxShadow: '0 4px 12px rgba(23,43,99,0.05)',
    }}
  >
    {icon && <div className="shrink-0" style={{ color: '#9AA7BF' }}>{icon}</div>}
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#9AA7BF]"
      style={{ color: '#17233F' }}
    />
    {value && (
      <button
        onClick={() => onChange('')}
        aria-label="Smazat"
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
        style={{ background: '#EDF1F8', color: '#7C8AA5' }}
      >
        <X className="w-3 h-3" strokeWidth={2.5} />
      </button>
    )}
  </div>
);
