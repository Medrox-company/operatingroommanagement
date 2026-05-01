import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  Lock, Mail, Eye, EyeOff, AlertCircle, ArrowLeft,
  Shield, User, Stethoscope, Activity, Briefcase, ClipboardList,
  LogIn, Sparkles, ChevronRight,
  type LucideIcon,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

type QuickRoleId = 'admin' | 'user' | 'aro' | 'cos' | 'management' | 'primar';
type Screen = 'intro' | 'form' | 'demo';

/* ═══════════════════════════════════════════════════════════════════════════
   DESIGN TOKENS — matching the rest of the app
   ═══════════════════════════════════════════════════════════════════════════ */
const C = {
  accent: '#FBBF24',
  cyan: '#06B6D4',
  yellow: '#FBBF24',
  green: '#10B981',
  orange: '#F97316',
  red: '#EF4444',
  purple: '#A78BFA',
  pink: '#EC4899',
  border: 'rgba(255,255,255,0.07)',
  surface: 'rgba(255,255,255,0.025)',
  glass: 'rgba(255,255,255,0.04)',
  muted: 'rgba(255,255,255,0.35)',
  text: 'rgba(255,255,255,0.85)',
};

const QUICK_ROLES: Array<{
  id: QuickRoleId;
  label: string;
  email: string;
  password: string;
  icon: LucideIcon;
  color: string;
  description: string;
}> = [
  { id: 'admin',      label: 'Administrátor', email: 'admin@nemocnice.cz',      password: 'admin123',  icon: Shield,         color: C.yellow, description: 'Plný přístup' },
  { id: 'aro',        label: 'ARO',           email: 'aro@nemocnice.cz',        password: 'aro123',    icon: Activity,       color: C.cyan, description: 'Anestezie' },
  { id: 'cos',        label: 'COS',           email: 'cos@nemocnice.cz',        password: 'cos123',    icon: Stethoscope,    color: C.green,  description: 'Operační sály' },
  { id: 'management', label: 'Management',    email: 'management@nemocnice.cz', password: 'mgmt123',   icon: Briefcase,      color: C.purple, description: 'Vedení' },
  { id: 'primar',     label: 'Primariát',     email: 'primar@nemocnice.cz',     password: 'primar123', icon: ClipboardList,  color: C.pink,   description: 'Primář' },
  { id: 'user',       label: 'Uživatel',      email: 'user@nemocnice.cz',       password: 'user123',   icon: User,           color: C.muted,  description: 'Standardní' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [screen, setScreen] = useState<Screen>('intro');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCredentials = async (mail: string, pwd: string) => {
    setError(null);
    setIsLoading(true);
    const result = await login(mail, pwd);
    setIsLoading(false);
    if (result.success) {
      onLoginSuccess?.();
    } else {
      setError(result.error || 'Přihlášení se nezdařilo');
    }
    return result.success;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitCredentials(email, password);
  };

  const handleQuickLogin = async (roleId: QuickRoleId) => {
    const role = QUICK_ROLES.find(r => r.id === roleId);
    if (!role) return;
    setEmail(role.email);
    setPassword(role.password);
    await submitCredentials(role.email, role.password);
  };

  const goToScreen = (next: Screen) => {
    setError(null);
    setScreen(next);
  };

  return (
    <div className="min-h-screen w-full text-white relative overflow-hidden flex flex-col font-sans bg-[#050d18]">
      {/* ═════════════════════════ BACKGROUND ═════════════════════════ */}
      {/* Radial gradient — same as app */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 120% 80% at 50% 0%, #0f1f3a 0%, #0a1528 45%, #050d18 100%)',
        }}
      />

      {/* Ambient cyan glow top */}
      <div
        aria-hidden
        className="fixed -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full pointer-events-none opacity-20"
        style={{
          background: `radial-gradient(circle, ${C.accent} 0%, transparent 60%)`,
          filter: 'blur(80px)',
        }}
      />

      {/* Top highlight line */}
      <div
        aria-hidden
        className="fixed top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${C.accent}30 50%, transparent 100%)`,
        }}
      />

      {/* ═════════════════════════ HEADER ═════════════════════════ */}
      <header className="relative z-10 px-6 md:px-10 py-5 flex items-center justify-between">
        <div className="min-w-[100px]">
          <AnimatePresence>
            {screen !== 'intro' && (
              <motion.button
                key="back"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                onClick={() => goToScreen('intro')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-[10px] font-semibold tracking-[0.2em] uppercase text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Zpět</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="min-w-[100px]" />
      </header>

      {/* ═════════════════════════ MAIN ═════════════════════════ */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 md:px-10 py-8">
        <AnimatePresence mode="wait">
          {/* ════════════════════════════ INTRO ════════════════════════════ */}
          {screen === 'intro' && (
            <motion.section
              key="intro"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full max-w-2xl text-center"
            >
              {/* ═══════════ ANIMATED BACKGROUND ELEMENTS ═══════════ */}
              
              {/* Floating particles */}
              <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={`particle-${i}`}
                    className="absolute rounded-full"
                    style={{
                      width: Math.random() * 4 + 2,
                      height: Math.random() * 4 + 2,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      background: i % 3 === 0 ? C.cyan : i % 3 === 1 ? C.yellow : 'rgba(255,255,255,0.3)',
                      filter: 'blur(0.5px)',
                    }}
                    animate={{
                      y: [0, -30, 0],
                      x: [0, Math.random() * 20 - 10, 0],
                      opacity: [0.2, 0.6, 0.2],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 4 + Math.random() * 4,
                      repeat: Infinity,
                      delay: Math.random() * 3,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>

              {/* Animated pulse rings */}
              <div aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={`ring-${i}`}
                    className="absolute rounded-full"
                    style={{
                      width: 300 + i * 150,
                      height: 300 + i * 150,
                      border: `1px solid ${C.cyan}`,
                      opacity: 0,
                    }}
                    animate={{
                      scale: [0.8, 1.5],
                      opacity: [0.3, 0],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      delay: i * 1.3,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </div>

              {/* Ghost watermark with glow animation */}
              <motion.div
                aria-hidden
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                animate={{
                  opacity: [0.015, 0.03, 0.015],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <span
                  className="font-black tracking-tighter leading-none"
                  style={{
                    fontSize: 'clamp(12rem, 32vw, 22rem)',
                    color: 'rgba(255,255,255,1)',
                  }}
                >
                  ORM
                </span>
              </motion.div>

              {/* ═══════════ ANIMATED EKG/PULSE LINE ═══════════ */}
              <div className="relative mb-8">
                <svg
                  viewBox="0 0 400 60"
                  className="w-full max-w-md mx-auto h-12 overflow-visible"
                  style={{ filter: `drop-shadow(0 0 8px ${C.cyan}80)` }}
                >
                  <defs>
                    <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={C.cyan} stopOpacity="0" />
                      <stop offset="50%" stopColor={C.cyan} stopOpacity="1" />
                      <stop offset="100%" stopColor={C.cyan} stopOpacity="0" />
                    </linearGradient>
                    <clipPath id="pulseClip">
                      <motion.rect
                        x="-100"
                        y="0"
                        width="200"
                        height="60"
                        animate={{ x: [-100, 500] }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                      />
                    </clipPath>
                  </defs>
                  {/* Background line */}
                  <path
                    d="M 0 30 L 80 30 L 100 30 L 120 10 L 140 50 L 160 20 L 180 40 L 200 30 L 220 30 L 240 30 L 260 5 L 280 55 L 300 30 L 320 30 L 400 30"
                    fill="none"
                    stroke="rgba(6, 182, 212, 0.15)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Animated pulse */}
                  <motion.path
                    d="M 0 30 L 80 30 L 100 30 L 120 10 L 140 50 L 160 20 L 180 40 L 200 30 L 220 30 L 240 30 L 260 5 L 280 55 L 300 30 L 320 30 L 400 30"
                    fill="none"
                    stroke="url(#pulseGradient)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    clipPath="url(#pulseClip)"
                  />
                  {/* Glowing dot */}
                  <motion.circle
                    r="4"
                    fill={C.cyan}
                    style={{ filter: `drop-shadow(0 0 6px ${C.cyan})` }}
                    animate={{
                      cx: [0, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 400],
                      cy: [30, 30, 30, 10, 50, 20, 40, 30, 30, 30, 5, 55, 30, 30, 30],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                </svg>
              </div>

              {/* ═══════════ ANIMATED TITLE ═══════════ */}
              <motion.h1
                className="relative font-bold tracking-tight leading-[0.95] text-balance"
                style={{ fontSize: 'clamp(1.875rem, 7vw, 4.5rem)' }}
              >
                {/* OPERATINGROOM — staggered letter animation */}
                <span className="block text-white break-words overflow-hidden">
                  {'OPERATINGROOM'.split('').map((letter, i) => (
                    <motion.span
                      key={`letter-${i}`}
                      className="inline-block"
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.05 + i * 0.04,
                        duration: 0.5,
                        ease: [0.215, 0.61, 0.355, 1],
                      }}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </span>
                {/* MANAGEMENT SYSTEM — with shimmer effect */}
                <motion.span
                  className="block break-words relative"
                  style={{ color: '#ffb800', fontSize: '56px' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <span className="relative">
                    MANAGEMENT SYSTEM
                    {/* Shimmer overlay */}
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      style={{ mixBlendMode: 'overlay' }}
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3,
                        ease: 'easeInOut',
                      }}
                    />
                  </span>
                </motion.span>
              </motion.h1>

              {/* Subtitle with typewriter effect */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                className="relative mt-6 text-sm md:text-base text-white/50 max-w-md mx-auto leading-relaxed"
              >
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 1, duration: 1, ease: 'easeOut' }}
                  className="inline-block overflow-hidden whitespace-nowrap"
                >
                  Systém pro správu a monitoring operačních sálů
                </motion.span>
              </motion.p>

              {/* CTA buttons with breathing glow */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.4 }}
                className="relative mt-10 flex items-center justify-center gap-3 flex-wrap"
              >
                {/* Primary button with animated glow */}
                <motion.button
                  onClick={() => goToScreen('form')}
                  className="group relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-semibold text-[12px] tracking-[0.15em] uppercase transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: C.yellow,
                    color: '#0a0f1a',
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Breathing glow */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ background: C.yellow }}
                    animate={{
                      boxShadow: [
                        `0 8px 24px -6px ${C.yellow}50`,
                        `0 16px 40px -8px ${C.yellow}70`,
                        `0 8px 24px -6px ${C.yellow}50`,
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                  <LogIn className="w-4 h-4 relative z-10" strokeWidth={2.5} />
                  <span className="relative z-10">Přihlášení</span>
                  <ChevronRight className="w-4 h-4 -ml-1 relative z-10 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
                </motion.button>

                {/* Secondary button with subtle pulse */}
                <motion.button
                  onClick={() => goToScreen('demo')}
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-semibold text-[12px] tracking-[0.15em] uppercase text-white/70 hover:text-white transition-all duration-200"
                  style={{
                    background: C.glass,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  whileHover={{ 
                    scale: 1.02,
                    borderColor: 'rgba(255,255,255,0.2)',
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.span
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Sparkles className="w-4 h-4" strokeWidth={2.25} />
                  </motion.span>
                  <span>Demo</span>
                </motion.button>
              </motion.div>

              {/* Bottom decorative line */}
              <motion.div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-48"
                style={{
                  background: `linear-gradient(90deg, transparent, ${C.cyan}40, transparent)`,
                }}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.8 }}
              />
            </motion.section>
          )}

          {/* ════════════════════════════ FORM ════════════════════════════ */}
          {screen === 'form' && (
            <motion.section
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full max-w-md"
            >
              <div
                className="rounded-3xl p-8 md:p-10"
                style={{
                  background: C.glass,
                  border: `1px solid ${C.border}`,
                  backdropFilter: 'blur(20px)',
                }}
              >
                {/* Header */}
                <div className="text-center mb-8">
                  <div
                    className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 overflow-hidden"
                    style={{
                      background: `${C.accent}15`,
                      border: `1px solid ${C.accent}25`,
                    }}
                  >
                    <img
                      src="/images/logo.png"
                      alt="Logo"
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Přihlášení
                  </h2>
                  <p className="text-sm text-white/40 mt-1">
                    Zadejte přihlašovací údaje
                  </p>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6 px-4 py-3 rounded-xl flex items-center gap-3"
                      style={{
                        background: `${C.red}15`,
                        border: `1px solid ${C.red}30`,
                      }}
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" style={{ color: C.red }} />
                      <span className="text-sm" style={{ color: C.red }}>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email */}
                  <div>
                    <label className="block text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="vas@email.cz"
                        required
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-white/25 transition-all focus:outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-2">
                      Heslo
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-11 pr-12 py-3.5 rounded-xl text-sm text-white placeholder-white/25 transition-all focus:outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl font-semibold text-[12px] tracking-[0.15em] uppercase transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: C.accent,
                      color: '#0a0f1a',
                      boxShadow: `0 8px 24px -6px ${C.accent}50`,
                    }}
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Přihlašování...
                      </span>
                    ) : (
                      'Přihlásit se'
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[10px] text-white/25 uppercase tracking-widest">nebo</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                {/* Demo link */}
                <button
                  onClick={() => goToScreen('demo')}
                  className="w-full py-3 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/[0.04] transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Vyzkoušet demo účet</span>
                </button>
              </div>
            </motion.section>
          )}

          {/* ════════════════════════════ DEMO ════════════════════════════ */}
          {screen === 'demo' && (
            <motion.section
              key="demo"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full max-w-3xl"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Demo přístup
                </h2>
                <p className="text-sm text-white/40 mt-2">
                  Vyberte roli pro rychlé přihlášení
                </p>
              </div>

              {/* Roles grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {QUICK_ROLES.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleQuickLogin(role.id)}
                    disabled={isLoading}
                    className="group relative p-5 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    style={{
                      background: C.glass,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    {/* Hover glow */}
                    <div
                      aria-hidden
                      className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at 50% 0%, ${role.color}15 0%, transparent 70%)`,
                      }}
                    />

                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                      style={{
                        background: `${role.color}15`,
                        border: `1px solid ${role.color}25`,
                      }}
                    >
                      <role.icon className="w-5 h-5" style={{ color: role.color }} strokeWidth={2} />
                    </div>

                    {/* Text */}
                    <h3 className="text-sm font-semibold text-white mb-0.5">
                      {role.label}
                    </h3>
                    <p className="text-[11px] text-white/35">
                      {role.description}
                    </p>

                    {/* Arrow */}
                    <ChevronRight
                      className="absolute top-5 right-4 w-4 h-4 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all"
                    />
                  </button>
                ))}
              </div>

              {/* Back to form */}
              <div className="text-center mt-8">
                <button
                  onClick={() => goToScreen('form')}
                  className="text-sm text-white/40 hover:text-white transition-colors inline-flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Přihlásit se vlastním účtem</span>
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* ═════════════════════════ FOOTER ═════════════════════════ */}
      <footer className="relative z-10 px-6 md:px-10 py-4 text-center">
        <p className="text-[10px] text-white/20 font-medium tracking-[0.15em] uppercase">
          © {new Date().getFullYear()} OperatingRoom Manager
        </p>
      </footer>
    </div>
  );
};

export default LoginPage;
