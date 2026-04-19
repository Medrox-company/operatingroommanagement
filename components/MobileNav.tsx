"use client"

import React, { memo, useMemo } from 'react'
import { SIDEBAR_ITEMS } from '../constants'
import { useAuth } from '../contexts/AuthContext'
import { Shield } from 'lucide-react'

interface MobileNavProps {
  currentView: string
  onNavigate: (viewId: string) => void
}

/**
 * iOS-style bottom tab bar for mobile devices.
 * - Floating pill at bottom with blur background.
 * - Respects safe-area-inset-bottom for iPhone home indicator.
 * - Adapts number of shown items based on admin status (max 5).
 */
const MobileNav: React.FC<MobileNavProps> = memo(({ currentView, onNavigate }) => {
  const { isAdmin, modules } = useAuth()

  const enabledItems = useMemo(
    () =>
      SIDEBAR_ITEMS.filter((item) => {
        if (item.id === 'dashboard') return true
        if (isAdmin) return true
        const module = modules.find((m) => m.id === item.id)
        return module?.is_enabled !== false
      }).slice(0, isAdmin ? 4 : 5),
    [isAdmin, modules]
  )

  return (
    <nav
      className="
        md:hidden fixed
        bottom-2 left-2 right-2
        z-[100]
        flex items-center justify-around
        gap-1 px-2 py-2
        rounded-[2rem]
        backdrop-blur-2xl
        border
        shadow-2xl
      "
      style={{
        background: 'rgba(10,10,18,0.75)',
        borderColor: 'rgba(255,255,255,0.08)',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
      }}
      aria-label="Hlavní navigace"
    >
      {enabledItems.map((item) => {
        const isActive = currentView === item.id
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            className={`
              relative flex-1 flex flex-col items-center justify-center gap-1
              min-w-0 py-1.5 px-1 rounded-2xl
              transition-all duration-200
              ios-tap
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D8C1]/60
              ${
                isActive
                  ? 'text-white'
                  : 'text-white/50 active:bg-white/[0.06]'
              }
            `}
            style={
              isActive
                ? {
                    background: 'rgba(0,216,193,0.14)',
                    border: '1px solid rgba(0,216,193,0.3)',
                  }
                : undefined
            }
          >
            <item.icon
              className="w-5 h-5 shrink-0"
              strokeWidth={isActive ? 2.4 : 1.8}
              style={isActive ? { color: '#00D8C1' } : undefined}
              aria-hidden
            />
            <span
              className="text-[9px] font-bold uppercase tracking-wider truncate w-full text-center leading-none"
              style={isActive ? { color: '#00D8C1' } : undefined}
            >
              {item.label}
            </span>
          </button>
        )
      })}

      {isAdmin && (
        <button
          onClick={() => onNavigate('admin')}
          aria-label="Admin"
          className={`
            relative flex-1 flex flex-col items-center justify-center gap-1
            min-w-0 py-1.5 px-1 rounded-2xl
            transition-all duration-200 ios-tap
            ${
              currentView === 'admin'
                ? 'text-[#00D8C1]'
                : 'text-white/50 active:bg-white/[0.06]'
            }
          `}
          style={
            currentView === 'admin'
              ? {
                  background: 'rgba(0,216,193,0.14)',
                  border: '1px solid rgba(0,216,193,0.3)',
                }
              : undefined
          }
        >
          <Shield
            className="w-5 h-5 shrink-0"
            strokeWidth={currentView === 'admin' ? 2.4 : 1.8}
          />
          <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
            Admin
          </span>
        </button>
      )}
    </nav>
  )
})

MobileNav.displayName = 'MobileNav'

export default MobileNav
