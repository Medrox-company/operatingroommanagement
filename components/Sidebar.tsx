"use client"

import React, { memo, useMemo } from 'react'
import { SIDEBAR_ITEMS } from '../constants'
import { Shield, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface SidebarProps {
  currentView: string
  onNavigate: (viewId: string) => void
}

/**
 * iOS-inspired vertical sidebar.
 * - Fixed left position on tablet/desktop (hidden on mobile — see MobileNav).
 * - Translucent rounded-pill container that floats above the main content.
 * - Each navigation item uses a squircle with iOS haptic-tap feedback.
 */
const Sidebar: React.FC<SidebarProps> = memo(({ currentView, onNavigate }) => {
  const { isAdmin, logout, modules } = useAuth()

  const enabledItems = useMemo(
    () =>
      SIDEBAR_ITEMS.filter((item) => {
        if (item.id === 'dashboard') return true
        if (isAdmin) return true
        const module = modules.find((m) => m.id === item.id)
        return module?.is_enabled !== false
      }),
    [isAdmin, modules]
  )

  return (
    <aside
      className="
        hidden md:flex
        fixed left-3 top-3 bottom-3
        w-20 lg:w-[5.5rem]
        flex-col items-center
        rounded-[2rem]
        backdrop-blur-2xl
        border
        z-[100]
        shadow-2xl
      "
      style={{
        background: 'rgba(10,10,18,0.6)',
        borderColor: 'rgba(255,255,255,0.08)',
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: '1rem',
      }}
      aria-label="Hlavní navigace"
    >
      {/* Logo / brand mark */}
      <div className="mb-6 flex items-center justify-center">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center border backdrop-blur-md"
          style={{
            background: 'rgba(0,216,193,0.12)',
            borderColor: 'rgba(0,216,193,0.25)',
            boxShadow: '0 0 24px -6px rgba(0,216,193,0.5)',
          }}
        >
          <Shield className="w-5 h-5 text-[#00D8C1]" strokeWidth={2.2} />
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-2 w-full px-3 min-h-0 overflow-y-auto hide-scrollbar">
        {enabledItems.map((item) => {
          const isActive = currentView === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={`
                relative w-full aspect-square
                rounded-2xl
                flex flex-col items-center justify-center
                transition-all duration-200
                group
                ios-tap
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D8C1]/60
                ${
                  isActive
                    ? 'text-white shadow-xl'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                }
              `}
              style={
                isActive
                  ? {
                      background: 'rgba(0,216,193,0.14)',
                      border: '1px solid rgba(0,216,193,0.3)',
                      boxShadow: '0 0 20px -5px rgba(0,216,193,0.35)',
                    }
                  : undefined
              }
            >
              <item.icon
                className="w-5 h-5 lg:w-6 lg:h-6 transition-transform group-hover:-translate-y-0.5"
                strokeWidth={isActive ? 2.4 : 1.8}
                style={isActive ? { color: '#00D8C1' } : undefined}
              />

              {/* Tooltip */}
              <span
                className="
                  absolute left-full ml-3 px-3 py-1.5
                  rounded-xl
                  text-[10px] font-bold uppercase tracking-widest
                  opacity-0 translate-x-[-8px]
                  group-hover:opacity-100 group-hover:translate-x-0
                  transition-all duration-200
                  pointer-events-none whitespace-nowrap
                  z-[110] shadow-2xl
                "
                style={{
                  background: 'rgba(10,10,18,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(16px)',
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Footer: admin + logout */}
      <div className="mt-auto pt-3 flex flex-col items-center gap-2 w-full px-3 border-t border-white/[0.06]">
        {isAdmin && (
          <button
            onClick={() => onNavigate('admin')}
            aria-label="Admin"
            className={`
              relative w-full aspect-square rounded-2xl
              flex items-center justify-center
              transition-all duration-200 group ios-tap
              ${
                currentView === 'admin'
                  ? 'text-[#00D8C1]'
                  : 'text-white/40 hover:text-[#00D8C1] hover:bg-white/[0.06]'
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
            <Shield className="w-5 h-5 transition-transform group-hover:scale-110" strokeWidth={2} />
            <span
              className="
                absolute left-full ml-3 px-3 py-1.5 rounded-xl
                text-[10px] font-bold uppercase tracking-widest
                opacity-0 translate-x-[-8px]
                group-hover:opacity-100 group-hover:translate-x-0
                transition-all pointer-events-none whitespace-nowrap
                z-[110] shadow-2xl
              "
              style={{
                background: 'rgba(10,10,18,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(16px)',
                color: 'rgba(255,255,255,0.9)',
              }}
            >
              Admin
            </span>
          </button>
        )}

        <button
          onClick={logout}
          aria-label="Odhlásit"
          className="
            relative w-full aspect-square rounded-2xl
            flex items-center justify-center
            text-white/40 hover:text-red-400 hover:bg-white/[0.06]
            transition-all duration-200 group ios-tap
          "
        >
          <LogOut className="w-5 h-5 transition-transform group-hover:scale-110" strokeWidth={2} />
          <span
            className="
              absolute left-full ml-3 px-3 py-1.5 rounded-xl
              text-[10px] font-bold uppercase tracking-widest
              opacity-0 translate-x-[-8px]
              group-hover:opacity-100 group-hover:translate-x-0
              transition-all pointer-events-none whitespace-nowrap
              z-[110] shadow-2xl
            "
            style={{
              background: 'rgba(10,10,18,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(16px)',
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            Odhlásit
          </span>
        </button>
      </div>
    </aside>
  )
})

Sidebar.displayName = 'Sidebar'

export default Sidebar
