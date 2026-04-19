"use client"

import React, { memo, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LucideIcon, Shield } from 'lucide-react'

interface PageLayoutProps {
  /** Zobrazený nadpis modulu (např. "STATISTIKY", "PERSONÁL") */
  title: string
  /** Podnázev zobrazený nad nadpisem (např. "OPERATINGROOM CONTROL") */
  eyebrow?: string
  /** Ikona modulu (lucide-react) */
  icon?: LucideIcon
  /** Barva akcentu ikony */
  accentColor?: string
  /** Popis modulu pod nadpisem */
  description?: string
  /** Volitelné akce v pravé části hlavičky (tlačítka, filtry, přepínače) */
  actions?: React.ReactNode
  /** Volitelný podtitulek pod hlavičkou (např. tabs + period switcher) */
  toolbar?: React.ReactNode
  /** Obsah stránky */
  children: React.ReactNode
  /** Zda modul je ve vnořeném zobrazení (zobrazí tlačítko zpět) */
  onBack?: () => void
  /** Přizpůsobit horní padding (např. pro full-screen moduly) */
  compact?: boolean
}

/**
 * Jednotný layout pro všechny stránky aplikace.
 * Poskytuje konzistentní pozici nadpisu, responsivní chování
 * a iOS-style vzhled (blur, rounded corners, safe area).
 */
const PageLayout: React.FC<PageLayoutProps> = memo(({
  title,
  eyebrow = 'OPERATINGROOM CONTROL',
  icon: Icon = Shield,
  accentColor = '#00D8C1',
  description,
  actions,
  toolbar,
  children,
  onBack,
  compact = false,
}) => {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const timer = setInterval(() => setTime(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="w-full h-full overflow-y-auto hide-scrollbar">
      <div
        className={`
          w-full mx-auto
          px-4 sm:px-6 md:pl-32 md:pr-8 lg:pr-10
          ${compact ? 'py-4 sm:py-6' : 'py-6 sm:py-8 md:py-10'}
          pb-24 md:pb-10
        `}
        style={{
          maxWidth: '2400px',
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
        }}
      >
        {/* ── Unified iOS-style page header ── */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 sm:mb-8 md:mb-10"
        >
          <div
            className="
              flex flex-col lg:flex-row lg:items-center lg:justify-between
              gap-4 lg:gap-8
              p-4 sm:p-5 md:p-6
              rounded-3xl
              backdrop-blur-2xl
              border
            "
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.08)',
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
            }}
          >
            {/* Left: Icon + Title */}
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
              {/* Back button (mobile nested view) */}
              {onBack && (
                <button
                  onClick={onBack}
                  className="
                    shrink-0 w-10 h-10 rounded-2xl
                    flex items-center justify-center
                    bg-white/5 border border-white/10
                    text-white/60 hover:text-white hover:bg-white/10
                    transition-all active:scale-95
                  "
                  aria-label="Zpět"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
              )}

              {/* Icon */}
              <div
                className="
                  shrink-0
                  w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14
                  rounded-2xl
                  flex items-center justify-center
                  border
                  backdrop-blur-md
                "
                style={{
                  background: `${accentColor}14`,
                  borderColor: `${accentColor}30`,
                  boxShadow: `0 0 30px -10px ${accentColor}40`,
                }}
              >
                <Icon
                  className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6"
                  style={{ color: accentColor }}
                  strokeWidth={2}
                />
              </div>

              {/* Title block */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 opacity-60">
                  <p
                    className="text-[9px] sm:text-[10px] font-black tracking-[0.3em] sm:tracking-[0.4em] uppercase truncate"
                    style={{ color: accentColor }}
                  >
                    {eyebrow}
                  </p>
                </div>
                <h1
                  className="
                    font-black tracking-tighter uppercase leading-[0.95]
                    text-balance
                  "
                  style={{
                    fontSize: 'clamp(1.75rem, 4vw + 0.5rem, 3.75rem)',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {title}
                </h1>
                {description && (
                  <p className="mt-2 text-xs sm:text-sm text-white/50 leading-relaxed max-w-2xl">
                    {description}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Actions + Time */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0 flex-wrap lg:flex-nowrap">
              {actions}

              {/* Time pill */}
              {time && (
                <div
                  className="
                    hidden md:flex items-center gap-2
                    px-4 py-2 rounded-2xl
                    border
                  "
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: accentColor }}
                  />
                  <span className="font-mono text-sm font-bold text-white/80 tabular-nums">
                    {time.toLocaleTimeString('cs-CZ', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Toolbar (tabs, filters) below header if provided */}
          {toolbar && <div className="mt-4 sm:mt-5">{toolbar}</div>}
        </motion.header>

        {/* ── Page content ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
})

PageLayout.displayName = 'PageLayout'

export default PageLayout
