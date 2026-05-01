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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-full max-w-3xl text-center relative"
            >
              {/* ═══════════════════════════════════════════════════════════════
                  LIQUID AURORA GRADIENT — ultra-smooth flowing colors
                  ═══════════════════════════════════════════════════════════════ */}
              <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Primary aurora layer */}
                <motion.div
                  className="absolute w-[800px] h-[800px] rounded-full"
                  style={{
                    left: '20%',
                    top: '-20%',
                    background: `radial-gradient(circle, ${C.cyan}12 0%, transparent 70%)`,
                    filter: 'blur(80px)',
                  }}
                  animate={{
                    x: [0, 100, -50, 0],
                    y: [0, 50, -30, 0],
                    scale: [1, 1.1, 0.95, 1],
                  }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* Secondary aurora layer */}
                <motion.div
                  className="absolute w-[600px] h-[600px] rounded-full"
                  style={{
                    right: '10%',
                    top: '30%',
                    background: `radial-gradient(circle, ${C.yellow}08 0%, transparent 70%)`,
                    filter: 'blur(100px)',
                  }}
                  animate={{
                    x: [0, -80, 40, 0],
                    y: [0, -60, 80, 0],
                    scale: [1, 0.9, 1.15, 1],
                  }}
                  transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                />
                {/* Tertiary accent */}
                <motion.div
                  className="absolute w-[400px] h-[400px] rounded-full"
                  style={{
                    left: '60%',
                    bottom: '10%',
                    background: `radial-gradient(circle, ${C.purple}06 0%, transparent 70%)`,
                    filter: 'blur(60px)',
                  }}
                  animate={{
                    x: [0, 60, -40, 0],
                    y: [0, -40, 60, 0],
                  }}
                  transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
                />
              </div>

              {/* ═══════════════════════════════════════════════════════════════
                  ETHEREAL FLOATING ORBS — glass morphism spheres
                  ═══════════════════════════════════════════════════════════════ */}
              <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none">
                {[
                  { size: 120, x: '15%', y: '25%', color: C.cyan, delay: 0 },
                  { size: 80, x: '80%', y: '20%', color: C.yellow, delay: 1 },
                  { size: 60, x: '25%', y: '70%', color: C.purple, delay: 2 },
                  { size: 100, x: '75%', y: '65%', color: C.green, delay: 3 },
                  { size: 40, x: '50%', y: '15%', color: C.cyan, delay: 4 },
                  { size: 50, x: '10%', y: '50%', color: C.yellow, delay: 5 },
                ].map((orb, i) => (
                  <motion.div
                    key={`orb-${i}`}
                    className="absolute rounded-full"
                    style={{
                      width: orb.size,
                      height: orb.size,
                      left: orb.x,
                      top: orb.y,
                      background: `radial-gradient(circle at 30% 30%, ${orb.color}15 0%, ${orb.color}05 50%, transparent 70%)`,
                      boxShadow: `inset 0 0 ${orb.size / 3}px ${orb.color}10, 0 0 ${orb.size}px ${orb.color}05`,
                      backdropFilter: 'blur(1px)',
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 0.6, 0.4, 0.6],
                      scale: [0, 1, 1.05, 1],
                      y: [0, -20, 10, 0],
                      x: [0, 10, -10, 0],
                    }}
                    transition={{
                      opacity: { duration: 8, repeat: Infinity, ease: 'easeInOut', delay: orb.delay },
                      scale: { duration: 10, repeat: Infinity, ease: 'easeInOut', delay: orb.delay },
                      y: { duration: 12, repeat: Infinity, ease: 'easeInOut', delay: orb.delay },
                      x: { duration: 14, repeat: Infinity, ease: 'easeInOut', delay: orb.delay },
                    }}
                  />
                ))}
              </div>

              {/* ═══════════════════════════════════════════════════════════════
                  CONSTELLATION NETWORK — connected stars
                  ═══════════════════════════════════════════════════════════════ */}
              <div aria-hidden className="fixed inset-0 pointer-events-none">
                <svg className="w-full h-full opacity-30">
                  <defs>
                    <radialGradient id="starGlow">
                      <stop offset="0%" stopColor={C.cyan} stopOpacity="1" />
                      <stop offset="100%" stopColor={C.cyan} stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  {/* Constellation lines */}
                  {[
                    { x1: '20%', y1: '30%', x2: '35%', y2: '25%' },
                    { x1: '35%', y1: '25%', x2: '45%', y2: '35%' },
                    { x1: '45%', y1: '35%', x2: '60%', y2: '28%' },
                    { x1: '60%', y1: '28%', x2: '75%', y2: '35%' },
                    { x1: '75%', y1: '35%', x2: '80%', y2: '50%' },
                    { x1: '25%', y1: '65%', x2: '40%', y2: '70%' },
                    { x1: '40%', y1: '70%', x2: '55%', y2: '65%' },
                    { x1: '55%', y1: '65%', x2: '70%', y2: '72%' },
                  ].map((line, i) => (
                    <motion.line
                      key={`line-${i}`}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke={C.cyan}
                      strokeWidth="0.5"
                      strokeOpacity="0.15"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.3 }}
                      transition={{ duration: 2, delay: 0.5 + i * 0.2, ease: 'easeOut' }}
                    />
                  ))}
                  {/* Constellation stars */}
                  {[
                    { cx: '20%', cy: '30%' }, { cx: '35%', cy: '25%' }, { cx: '45%', cy: '35%' },
                    { cx: '60%', cy: '28%' }, { cx: '75%', cy: '35%' }, { cx: '80%', cy: '50%' },
                    { cx: '25%', cy: '65%' }, { cx: '40%', cy: '70%' }, { cx: '55%', cy: '65%' },
                    { cx: '70%', cy: '72%' }, { cx: '15%', cy: '45%' }, { cx: '85%', cy: '25%' },
                  ].map((star, i) => (
                    <motion.circle
                      key={`star-${i}`}
                      cx={star.cx}
                      cy={star.cy}
                      r="2"
                      fill={C.cyan}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: [0.3, 0.8, 0.3],
                        scale: [1, 1.5, 1],
                      }}
                      transition={{
                        duration: 3 + (i % 3),
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </svg>
              </div>

              {/* ═══════════════════════════════════════════════════════════════
                  GHOST WATERMARK — ultra subtle, breathes gently
                  ═══════════════════════════════════════════════════════════════ */}
              <motion.div
                aria-hidden
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
              >
                <motion.span
                  className="font-black tracking-tighter leading-none"
                  style={{
                    fontSize: 'clamp(14rem, 40vw, 26rem)',
                    background: `linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.008) 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  ORM
                </motion.span>
              </motion.div>

              {/* ═══════════════════════════════════════════════════════════════
                  MAIN CONTENT
                  ═══════════════════════════════════════════════════════════════ */}
              <div className="relative z-10">
                {/* Elegant line above title */}
                <motion.div
                  className="w-16 h-px mx-auto mb-10"
                  style={{ background: `linear-gradient(90deg, transparent, ${C.cyan}, transparent)` }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 0.5 }}
                  transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                />

                {/* ═══════════ CINEMATIC TITLE ═══════════ */}
                <motion.h1
                  className="relative font-bold tracking-tight leading-[0.92]"
                  style={{ fontSize: 'clamp(2.25rem, 8vw, 5rem)' }}
                >
                  {/* OPERATINGROOM — blur-to-sharp reveal */}
                  <motion.span
                    className="block text-white"
                    initial={{ opacity: 0, filter: 'blur(20px)', y: 30 }}
                    animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                    transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    OPERATINGROOM
                  </motion.span>
                  
                  {/* MANAGEMENT SYSTEM — gold gradient text */}
                  <motion.span
                    className="block mt-2"
                    style={{
                      fontSize: 'clamp(1.5rem, 5vw, 3.5rem)',
                      background: `linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)`,
                      backgroundSize: '200% 200%',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                    initial={{ opacity: 0, filter: 'blur(15px)', y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      filter: 'blur(0px)', 
                      y: 0,
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    }}
                    transition={{ 
                      opacity: { duration: 1, delay: 0.6 },
                      filter: { duration: 1, delay: 0.6 },
                      y: { duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] },
                      backgroundPosition: { duration: 8, repeat: Infinity, ease: 'linear', delay: 1.5 },
                    }}
                  >
                    MANAGEMENT SYSTEM
                  </motion.span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  className="mt-8 text-base md:text-lg text-white/40 max-w-lg mx-auto font-light tracking-wide"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 1, ease: 'easeOut' }}
                >
                  Systém pro správu a monitoring operačních sálů
                </motion.p>

                {/* ═══════════ ELEGANT CTA BUTTONS ═══════════ */}
                <motion.div
                  className="mt-12 flex items-center justify-center gap-4 flex-wrap"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.3, ease: 'easeOut' }}
                >
                  {/* Primary button — glass morphism with glow */}
                  <motion.button
                    onClick={() => goToScreen('form')}
                    className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full font-medium text-sm tracking-wide overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(251,191,36,0.9) 0%, rgba(245,158,11,0.9) 100%)',
                      color: '#0a0f1a',
                    }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Animated shine */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      initial={{ x: '-100%' }}
                      animate={{ x: '200%' }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
                    />
                    {/* Glow */}
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      animate={{
                        boxShadow: [
                          '0 0 20px rgba(251,191,36,0.3), 0 0 40px rgba(251,191,36,0.1)',
                          '0 0 30px rgba(251,191,36,0.5), 0 0 60px rgba(251,191,36,0.2)',
                          '0 0 20px rgba(251,191,36,0.3), 0 0 40px rgba(251,191,36,0.1)',
                        ],
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <LogIn className="w-4 h-4 relative z-10" strokeWidth={2} />
                    <span className="relative z-10">Přihlášení</span>
                    <ChevronRight className="w-4 h-4 relative z-10 transition-transform group-hover:translate-x-1" strokeWidth={2} />
                  </motion.button>

                  {/* Secondary button — subtle glass */}
                  <motion.button
                    onClick={() => goToScreen('demo')}
                    className="group inline-flex items-center gap-3 px-8 py-4 rounded-full font-medium text-sm tracking-wide text-white/60 hover:text-white transition-colors duration-300"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(10px)',
                    }}
                    whileHover={{ 
                      scale: 1.03,
                      borderColor: 'rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.05)',
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Sparkles className="w-4 h-4" strokeWidth={2} />
                    <span>Demo přístup</span>
                  </motion.button>
                </motion.div>

                {/* Bottom elegant line */}
                <motion.div
                  className="mt-16 w-24 h-px mx-auto"
                  style={{ background: `linear-gradient(90deg, transparent, ${C.cyan}30, transparent)` }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 1.5, delay: 1.8, ease: 'easeOut' }}
                />
              </div>
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
