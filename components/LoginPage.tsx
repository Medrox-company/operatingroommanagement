import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  Lock, Mail, Eye, EyeOff, AlertCircle, ArrowLeft,
  Shield, User, Stethoscope, Activity, Briefcase, ClipboardList,
  LogIn, Sparkles, KeyRound, Zap, Globe, HeartPulse, ChevronRight,
  Server, Database, Wifi, TrendingUp, Users, CheckCircle2,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

type QuickRoleId = 'admin' | 'user' | 'aro' | 'cos' | 'management' | 'primar';
type Screen = 'intro' | 'form' | 'demo';

const ACCENT = '#FBBF24';
const CYAN = '#00d4ff';

const QUICK_ROLES: Array<{
  id: QuickRoleId;
  label: string;
  email: string;
  password: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Akcentová barva pro tuto roli (hover/glow). */
  color: string;
  /** Krátký popis */
  description: string;
  /** Označení nejdoporučenější role */
  featured?: boolean;
}> = [
  { id: 'admin',      label: 'Administrátor', email: 'admin@nemocnice.cz',      password: 'admin123',  icon: Shield,         color: '#FBBF24', description: 'Plný přístup ke všem funkcím', featured: true },
  { id: 'aro',        label: 'ARO',           email: 'aro@nemocnice.cz',        password: 'aro123',    icon: Activity,       color: '#00d4ff', description: 'Anesteziologicko-resuscitační oddělení' },
  { id: 'cos',        label: 'COS',           email: 'cos@nemocnice.cz',        password: 'cos123',    icon: Stethoscope,    color: '#34d399', description: 'Centrální operační sály' },
  { id: 'management', label: 'Management',    email: 'management@nemocnice.cz', password: 'mgmt123',   icon: Briefcase,      color: '#a78bfa', description: 'Vedení nemocnice' },
  { id: 'primar',     label: 'Primariát',     email: 'primar@nemocnice.cz',     password: 'primar123', icon: ClipboardList,  color: '#f472b6', description: 'Vedoucí lékař oddělení' },
  { id: 'user',       label: 'Uživatel',      email: 'user@nemocnice.cz',       password: 'user123',   icon: User,           color: '#94a3b8', description: 'Standardní uživatelský účet' },
];

const FEATURES: Array<{
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  color: string;
}> = [
  { icon: HeartPulse, title: 'Real-time monitoring', description: 'Živý přehled stavu každého sálu', color: CYAN },
  { icon: Shield,     title: 'Bezpečnost dat',       description: 'Šifrované spojení a auditní log',  color: ACCENT },
  { icon: Zap,        title: 'Rychlé rozhodování',   description: 'Statistiky a analýza výkonu',      color: '#34d399' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATED EKG WAVE — subtle medical motif behind hero
   ═══════════════════════════════════════════════════════════════════════════ */
const EkgWave: React.FC = () => (
  <svg
    aria-hidden
    className="absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full h-32 md:h-40 pointer-events-none opacity-[0.35]"
    viewBox="0 0 1200 120"
    preserveAspectRatio="none"
    style={{ filter: 'blur(0.5px)' }}
  >
    <defs>
      <linearGradient id="ekgFade" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={CYAN} stopOpacity="0" />
        <stop offset="20%" stopColor={CYAN} stopOpacity="0.6" />
        <stop offset="50%" stopColor={CYAN} stopOpacity="1" />
        <stop offset="80%" stopColor={CYAN} stopOpacity="0.6" />
        <stop offset="100%" stopColor={CYAN} stopOpacity="0" />
      </linearGradient>
    </defs>
    <motion.path
      d="M0,60 L200,60 L240,60 L260,30 L280,90 L300,15 L320,105 L340,60 L500,60 L540,60 L560,40 L580,80 L600,60 L900,60 L940,60 L960,30 L980,90 L1000,15 L1020,105 L1040,60 L1200,60"
      fill="none"
      stroke="url(#ekgFade)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 2.5, ease: 'easeInOut' }}
    />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════════
   FLOATING PARTICLES — ambient cyan dots drifting up
   ═══════════════════════════════════════════════════════════════════════════ */
const PARTICLES = [
  { left: '8%',  delay: 0,   size: 3,   dur: 14 },
  { left: '22%', delay: 4,   size: 2,   dur: 18 },
  { left: '40%', delay: 8,   size: 4,   dur: 16 },
  { left: '58%', delay: 2,   size: 2,   dur: 20 },
  { left: '76%', delay: 6,   size: 3,   dur: 15 },
  { left: '92%', delay: 10,  size: 2,   dur: 17 },
];

const FloatingParticles: React.FC = () => (
  <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
    {PARTICLES.map((p, i) => (
      <motion.span
        key={i}
        className="absolute rounded-full"
        style={{
          left: p.left,
          bottom: '-20px',
          width: p.size,
          height: p.size,
          background: i % 3 === 0 ? ACCENT : CYAN,
          boxShadow: `0 0 12px ${i % 3 === 0 ? ACCENT : CYAN}80`,
        }}
        animate={{ y: ['-10vh', '-110vh'], opacity: [0, 0.7, 0.7, 0] }}
        transition={{
          duration: p.dur,
          delay: p.delay,
          repeat: Infinity,
          ease: 'linear',
          times: [0, 0.05, 0.95, 1],
        }}
      />
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE METRICS TICKER — fake-but-believable medical dashboard stats
   ═══════════════════════════════════════════════════════════════════════════ */
const LiveMetrics: React.FC = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 4000);
    return () => clearInterval(t);
  }, []);

  // Slight live jitter so values feel alive
  const operations = 142 + (tick % 5);
  const occupancy = 78 + ((tick * 3) % 9);
  const staff = 24 + (tick % 3);

  const items = [
    { icon: Activity,    label: 'Operací dnes',   value: operations.toString(),    color: CYAN,     suffix: '' },
    { icon: TrendingUp,  label: 'Vytížení sálů',  value: occupancy.toString(),     color: ACCENT,   suffix: '%' },
    { icon: Users,       label: 'Personál na dir.',value: staff.toString(),         color: '#34d399',suffix: '' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.4 }}
      className="relative flex items-center justify-center gap-3 sm:gap-4 flex-wrap mt-12"
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: `${item.color}12`,
              border: `1px solid ${item.color}25`,
            }}
          >
            <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col items-start leading-tight">
            <AnimatePresence mode="wait">
              <motion.span
                key={item.value}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.18 }}
                className="text-base font-bold tabular-nums"
                style={{ color: item.color }}
              >
                {item.value}{item.suffix}
              </motion.span>
            </AnimatePresence>
            <span className="text-[9px] font-semibold tracking-[0.18em] uppercase text-white/40">
              {item.label}
            </span>
          </div>
          {i < items.length - 1 && (
            <span className="hidden sm:block w-px h-6 bg-white/[0.06] ml-1" aria-hidden />
          )}
        </div>
      ))}
    </motion.div>
  );
};

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
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [hoveredRole, setHoveredRole] = useState<QuickRoleId | null>(null);

  // Live time chip — gives the page a real-time feel
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Pointer-follow spotlight on hero
  const heroRef = useRef<HTMLElement | null>(null);
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(null);

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

  const handleKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleHeroPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setSpot({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const formattedTime = now.toLocaleTimeString('cs-CZ', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="min-h-screen w-full text-white relative overflow-hidden flex flex-col font-sans">
      {/* ═════════════════════════ BACKGROUND LAYERS ═════════════════════════ */}
      {/* Deep navy radial */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background:
            'radial-gradient(120% 80% at 50% 0%, #0f1f3a 0%, #0a1528 45%, #050d18 100%)',
        }}
      />

      {/* Aurora drifting blobs */}
      <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <motion.div
          className="absolute -top-60 left-1/2 -translate-x-1/2 w-[820px] h-[820px] rounded-full opacity-25"
          style={{ background: `radial-gradient(circle, ${CYAN} 0%, transparent 65%)` }}
          animate={{ y: [0, 20, 0], x: ['-50%', '-48%', '-50%'] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 -left-60 w-[640px] h-[640px] rounded-full opacity-[0.18]"
          style={{ background: `radial-gradient(circle, ${ACCENT} 0%, transparent 70%)` }}
          animate={{ y: [-10, 30, -10] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-60 -right-40 w-[680px] h-[680px] rounded-full opacity-[0.14]"
          style={{ background: `radial-gradient(circle, #a78bfa 0%, transparent 70%)` }}
          animate={{ y: [0, -25, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Floating particles */}
      <FloatingParticles />

      {/* Subtle grid */}
      <div
        aria-hidden
        className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{
          zIndex: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Top noise highlight */}
      <div
        aria-hidden
        className="fixed top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          zIndex: 0,
          background: `linear-gradient(90deg, transparent 0%, ${CYAN}40 50%, transparent 100%)`,
        }}
      />

      {/* ═════════════════════════ HEADER ═════════════════════════ */}
      <header className="relative z-10 px-6 md:px-10 py-5 flex items-center justify-between gap-4">
        {/* Left: back button (only when not on intro) */}
        <div className="min-w-[110px]">
          <AnimatePresence>
            {screen !== 'intro' && (
              <motion.button
                key="back"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                onClick={() => goToScreen('intro')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Zpět</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Right: live status chip */}
        <div
          className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: '#34d399' }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ background: '#34d399' }}
            />
          </span>
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/70">
            Systém online
          </span>
          <span className="text-[10px] font-mono text-white/40 tabular-nums">{formattedTime}</span>
        </div>
      </header>

      {/* ═════════════════════════ MAIN ═════════════════════════ */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 md:px-10 py-6">
        <AnimatePresence mode="wait">
          {/* ════════════════════════════ INTRO ════════════════════════════ */}
          {screen === 'intro' && (
            <motion.section
              key="intro"
              ref={heroRef}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              onPointerMove={handleHeroPointerMove}
              onPointerLeave={() => setSpot(null)}
              className="w-full max-w-3xl text-center relative"
            >
              {/* Cursor-follow spotlight (subtle) */}
              {spot && (
                <div
                  aria-hidden
                  className="absolute pointer-events-none rounded-full transition-opacity duration-300"
                  style={{
                    left: spot.x - 200,
                    top: spot.y - 200,
                    width: 400,
                    height: 400,
                    background: `radial-gradient(circle, ${CYAN}18 0%, transparent 60%)`,
                    filter: 'blur(20px)',
                  }}
                />
              )}

              {/* EKG wave behind title */}
              <EkgWave />

              {/* Ghost watermark "ORM" with conic ring */}
              <div
                aria-hidden
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
              >
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: 'clamp(380px, 50vw, 680px)',
                    height: 'clamp(380px, 50vw, 680px)',
                    background: `conic-gradient(from 0deg, transparent 0%, ${CYAN}1a 25%, transparent 50%, ${ACCENT}14 75%, transparent 100%)`,
                    filter: 'blur(40px)',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                />
                <span
                  className="font-black tracking-tighter leading-none"
                  style={{
                    fontSize: 'clamp(14rem, 36vw, 26rem)',
                    color: 'rgba(255,255,255,0.025)',
                    textShadow: '0 0 80px rgba(0,212,255,0.05)',
                  }}
                >
                  ORM
                </span>
              </div>

              {/* Brand mark — pill above title */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full mb-6"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${CYAN}30 0%, ${ACCENT}20 100%)`,
                    border: `1px solid ${CYAN}30`,
                  }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <HeartPulse className="w-3.5 h-3.5" style={{ color: CYAN }} strokeWidth={2.5} />
                  </motion.div>
                </div>
                <span className="text-[10px] font-semibold tracking-[0.32em] uppercase text-white/70">
                  Operating Room Manager
                </span>
                <span className="w-px h-3 bg-white/10" aria-hidden />
                <span
                  className="text-[10px] font-semibold tracking-[0.2em] uppercase"
                  style={{ color: '#34d399' }}
                >
                  v1.0
                </span>
              </motion.div>

              {/* Title — outline + fill stacked */}
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.4 }}
                className="relative font-bold tracking-tighter leading-[0.88] uppercase"
                style={{ fontSize: 'clamp(3rem, 9vw, 5.5rem)' }}
              >
                <span className="block text-white text-balance drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
                  Operating
                  <span className="text-white/85"> room</span>
                </span>
                <span
                  className="block text-balance relative"
                  style={{
                    color: ACCENT,
                    textShadow: `0 4px 32px ${ACCENT}40`,
                  }}
                >
                  Manager
                  {/* shimmer overlay */}
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)`,
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mixBlendMode: 'screen',
                    }}
                    animate={{ backgroundPositionX: ['-200%', '200%'] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
                  >
                    Manager
                  </motion.span>
                </span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.3 }}
                className="relative mt-7 text-base md:text-lg text-white/60 max-w-xl mx-auto leading-relaxed"
              >
                Inteligentní řízení operačních sálů, plánování personálu a živé statistiky v jednom přehledném systému.
              </motion.p>

              {/* CTA buttons */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
                className="relative mt-10 flex items-center justify-center gap-3 flex-wrap"
              >
                <button
                  onClick={() => goToScreen('form')}
                  className="group relative overflow-hidden inline-flex items-center gap-2.5 px-7 md:px-9 py-3.5 rounded-2xl font-semibold text-[13px] tracking-[0.18em] uppercase transition-all duration-200 active:scale-[0.98] hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT}e0 100%)`,
                    color: '#0a0f1a',
                    boxShadow: `0 14px 40px -10px ${ACCENT}80, 0 0 0 1px ${ACCENT}40 inset`,
                  }}
                >
                  {/* Sweep sheen */}
                  <span
                    aria-hidden
                    className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none"
                    style={{
                      background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)',
                    }}
                  />
                  <LogIn className="relative w-4 h-4" strokeWidth={2.5} />
                  <span className="relative">Přihlášení</span>
                  <ChevronRight className="relative w-4 h-4 -ml-1 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
                </button>

                <button
                  onClick={() => goToScreen('demo')}
                  className="group inline-flex items-center gap-2.5 px-7 md:px-9 py-3.5 rounded-2xl font-semibold text-[13px] tracking-[0.18em] uppercase text-white transition-all duration-200 active:scale-[0.98] hover:scale-[1.02]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  <Sparkles className="w-4 h-4 transition-colors group-hover:text-[#00d4ff]" strokeWidth={2.25} />
                  <span>Vyzkoušet demo</span>
                </button>
              </motion.div>

              {/* Live metrics ticker */}
              <LiveMetrics />

              {/* Trust chips — under metrics */}
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.4 }}
                className="relative mt-7 flex items-center justify-center gap-2 flex-wrap"
              >
                {[
                  { icon: Shield, label: '256-bit šifrování' },
                  { icon: Globe,  label: 'GDPR compliant' },
                  { icon: KeyRound, label: 'Bcrypt hash' },
                ].map(item => (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium tracking-[0.12em] uppercase text-white/45"
                    style={{
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <item.icon className="w-3 h-3" strokeWidth={2.25} />
                    <span>{item.label}</span>
                  </span>
                ))}
              </motion.div>
            </motion.section>
          )}

          {/* ════════════════════════════ FORM ════════════════════════════ */}
          {screen === 'form' && (
            <motion.section
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full max-w-5xl"
            >
              <div className="grid lg:grid-cols-[1.05fr_1fr] gap-6 lg:gap-8 items-stretch">
                {/* ═══════ Left: feature panel (hidden on mobile) ═══════ */}
                <div
                  className="hidden lg:flex flex-col justify-between rounded-3xl p-10 relative overflow-hidden"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  {/* corner glow */}
                  <div
                    aria-hidden
                    className="absolute -top-32 -left-32 w-72 h-72 rounded-full opacity-[0.18] pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${CYAN} 0%, transparent 65%)` }}
                  />

                  {/* Decorative ORM watermark */}
                  <span
                    aria-hidden
                    className="absolute -bottom-10 -right-6 font-black tracking-tighter leading-none pointer-events-none select-none"
                    style={{
                      fontSize: '12rem',
                      color: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    ORM
                  </span>

                  <div className="relative">
                    <div
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-7"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <HeartPulse className="w-3.5 h-3.5" style={{ color: CYAN }} strokeWidth={2.5} />
                      <span className="text-[10px] font-semibold tracking-[0.28em] uppercase text-white/70">
                        ORM Platform
                      </span>
                    </div>
                    <h3 className="text-3xl font-bold text-white tracking-tight mb-3 leading-tight">
                      Vítejte zpět
                      <span className="block" style={{ color: ACCENT }}>v ordinaci.</span>
                    </h3>
                    <p className="text-sm text-white/55 leading-relaxed max-w-sm">
                      Přihlaste se a získejte okamžitý přehled o stavu sálů, personálu i statistikách výkonu vaší kliniky.
                    </p>
                  </div>

                  {/* Feature list */}
                  <ul className="relative space-y-4 mt-10">
                    {FEATURES.map((f, i) => (
                      <motion.li
                        key={f.title}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}
                        className="flex items-start gap-3.5"
                      >
                        <div
                          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{
                            background: `${f.color}10`,
                            border: `1px solid ${f.color}25`,
                          }}
                        >
                          <f.icon className="w-[18px] h-[18px]" style={{ color: f.color }} strokeWidth={2.25} />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-white leading-tight">{f.title}</p>
                          <p className="text-[12px] text-white/45 mt-0.5 leading-relaxed">{f.description}</p>
                        </div>
                      </motion.li>
                    ))}
                  </ul>

                  {/* Bottom signature row */}
                  <div className="relative mt-10 pt-6 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/40">
                      Nasazeno · Stable
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-white/35">
                      <CheckCircle2 className="w-3 h-3" style={{ color: '#34d399' }} strokeWidth={2.5} />
                      <span>Verze 1.0.0</span>
                    </span>
                  </div>
                </div>

                {/* ═══════ Right: form ═══════ */}
                <div
                  className="rounded-3xl p-8 md:p-10 relative overflow-hidden"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,212,255,0.03) 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 20px 60px -16px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
                  }}
                >
                  {/* glow accent */}
                  <div
                    aria-hidden
                    className="absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-[0.1] pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${ACCENT} 0%, transparent 65%)` }}
                  />

                  <div className="relative">
                    {/* Header */}
                    <div className="mb-8">
                      <div
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                        style={{
                          background: `${CYAN}10`,
                          border: `1px solid ${CYAN}25`,
                        }}
                      >
                        <Lock className="w-3 h-3" style={{ color: CYAN }} strokeWidth={2.5} />
                        <span
                          className="text-[10px] font-semibold uppercase tracking-[0.3em]"
                          style={{ color: CYAN }}
                        >
                          Přihlášení
                        </span>
                      </div>
                      <h2 className="text-3xl font-bold text-white tracking-tight">
                        Pokračovat
                      </h2>
                      <p className="text-sm text-white/50 mt-2">
                        Zadejte své přihlašovací údaje
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      {/* Email */}
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50 mb-2"
                        >
                          E-mail
                        </label>
                        <div
                          className="relative rounded-2xl transition-all"
                          style={{
                            background: emailFocused ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${emailFocused ? `${CYAN}50` : 'rgba(255,255,255,0.08)'}`,
                            boxShadow: emailFocused ? `0 0 0 4px ${CYAN}10` : 'none',
                          }}
                        >
                          <Mail
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors"
                            style={{ color: emailFocused ? CYAN : 'rgba(255,255,255,0.3)' }}
                            aria-hidden
                          />
                          <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onFocus={() => setEmailFocused(true)}
                            onBlur={() => setEmailFocused(false)}
                            required
                            autoComplete="email"
                            placeholder="vas@email.cz"
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-transparent text-[15px] text-white placeholder:text-white/25 outline-none"
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <label
                          htmlFor="password"
                          className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50 mb-2"
                        >
                          Heslo
                        </label>
                        <div
                          className="relative rounded-2xl transition-all"
                          style={{
                            background: passwordFocused ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${passwordFocused ? `${CYAN}50` : 'rgba(255,255,255,0.08)'}`,
                            boxShadow: passwordFocused ? `0 0 0 4px ${CYAN}10` : 'none',
                          }}
                        >
                          <KeyRound
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors"
                            style={{ color: passwordFocused ? CYAN : 'rgba(255,255,255,0.3)' }}
                            aria-hidden
                          />
                          <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={handleKeyEvent}
                            onKeyUp={handleKeyEvent}
                            onFocus={() => setPasswordFocused(true)}
                            onBlur={() => setPasswordFocused(false)}
                            required
                            autoComplete="current-password"
                            placeholder="••••••••"
                            className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-transparent text-[15px] text-white placeholder:text-white/25 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(s => !s)}
                            aria-label={showPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Caps lock warning */}
                        <AnimatePresence>
                          {capsLockOn && passwordFocused && (
                            <motion.p
                              initial={{ opacity: 0, y: -2 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -2 }}
                              className="mt-2 text-[11px] flex items-center gap-1.5 text-amber-300"
                            >
                              <AlertCircle className="w-3 h-3" />
                              <span>Caps Lock je zapnutý</span>
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Error */}
                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            role="alert"
                            className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-[13px]"
                            style={{
                              background: 'rgba(239,68,68,0.08)',
                              border: '1px solid rgba(239,68,68,0.25)',
                            }}
                          >
                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                            <span className="text-red-200/90">{error}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Submit with sweep sheen */}
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="group relative overflow-hidden w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-semibold text-[13px] tracking-[0.2em] uppercase transition-all duration-200 active:scale-[0.99] hover:scale-[1.01] disabled:opacity-60 disabled:cursor-wait disabled:hover:scale-100"
                        style={{
                          background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT}dd 100%)`,
                          color: '#0a0f1a',
                          boxShadow: `0 12px 32px -12px ${ACCENT}80, 0 0 0 1px ${ACCENT}40 inset`,
                        }}
                      >
                        <span
                          aria-hidden
                          className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none"
                          style={{
                            background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)',
                          }}
                        />
                        {isLoading ? (
                          <>
                            <span
                              className="relative w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"
                              aria-hidden
                            />
                            <span className="relative">Přihlašuji…</span>
                          </>
                        ) : (
                          <>
                            <LogIn className="relative w-4 h-4" strokeWidth={2.5} />
                            <span className="relative">Přihlásit se</span>
                          </>
                        )}
                      </button>
                    </form>

                    {/* Demo link */}
                    <div className="mt-7 pt-6 border-t border-white/[0.06] flex items-center justify-between">
                      <span className="text-[11px] text-white/40">Bez účtu?</span>
                      <button
                        type="button"
                        onClick={() => goToScreen('demo')}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase text-white/70 hover:text-white transition-colors group"
                      >
                        <Sparkles className="w-3 h-3 transition-colors group-hover:text-[#00d4ff]" strokeWidth={2.5} />
                        <span>Vyzkoušet demo</span>
                        <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* ════════════════════════════ DEMO ════════════════════════════ */}
          {screen === 'demo' && (
            <motion.section
              key="demo"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full max-w-4xl"
            >
              {/* Header */}
              <div className="text-center mb-10">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                  style={{
                    background: `${CYAN}10`,
                    border: `1px solid ${CYAN}25`,
                  }}
                >
                  <Sparkles className="w-3 h-3" style={{ color: CYAN }} strokeWidth={2.5} />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-[0.3em]"
                    style={{ color: CYAN }}
                  >
                    Demo přístup
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
                  Vyberte roli pro vyzkoušení
                </h2>
                <p className="text-sm text-white/50 mt-3 max-w-md mx-auto">
                  Každá role má jiné oprávnění. Klikněte na kartu pro automatické přihlášení.
                </p>
              </div>

              {/* Roles grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {QUICK_ROLES.map((role, i) => {
                  const Icon = role.icon;
                  const isHovered = hoveredRole === role.id;
                  return (
                    <motion.button
                      key={role.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.25 }}
                      onClick={() => handleQuickLogin(role.id)}
                      onMouseEnter={() => setHoveredRole(role.id)}
                      onMouseLeave={() => setHoveredRole(null)}
                      disabled={isLoading}
                      className="group relative text-left rounded-2xl p-5 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait active:scale-[0.99] hover:-translate-y-0.5 overflow-hidden"
                      style={{
                        background: isHovered
                          ? `linear-gradient(135deg, ${role.color}10 0%, rgba(255,255,255,0.02) 100%)`
                          : 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                        border: `1px solid ${isHovered ? `${role.color}50` : 'rgba(255,255,255,0.08)'}`,
                        backdropFilter: 'blur(16px)',
                        boxShadow: isHovered ? `0 16px 40px -16px ${role.color}40` : 'none',
                      }}
                    >
                      {/* "Doporučeno" badge for featured role */}
                      {role.featured && (
                        <span
                          className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-bold tracking-[0.18em] uppercase z-10"
                          style={{
                            background: `${role.color}1a`,
                            border: `1px solid ${role.color}45`,
                            color: role.color,
                          }}
                        >
                          <Sparkles className="w-2.5 h-2.5" strokeWidth={2.5} />
                          Top
                        </span>
                      )}

                      {/* Watermark icon — large faded role icon in background */}
                      <Icon
                        aria-hidden
                        className="absolute -bottom-3 -right-3 w-24 h-24 pointer-events-none transition-opacity duration-300"
                        style={{
                          color: role.color,
                          opacity: isHovered ? 0.08 : 0.03,
                        }}
                        strokeWidth={1.25}
                      />

                      {/* glow corner — role-tinted */}
                      <div
                        aria-hidden
                        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none"
                        style={{ background: `radial-gradient(circle, ${role.color} 0%, transparent 65%)` }}
                      />

                      <div className="relative flex items-start gap-3">
                        <div
                          className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-105"
                          style={{
                            background: `${role.color}10`,
                            border: `1px solid ${role.color}25`,
                          }}
                        >
                          <Icon
                            className="w-5 h-5 transition-colors"
                            style={{ color: role.color }}
                            strokeWidth={2.25}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45 leading-none mb-1.5">
                            Role
                          </p>
                          <h3 className="text-[15px] font-semibold text-white leading-tight">
                            {role.label}
                          </h3>
                          <p className="text-[11px] text-white/45 mt-1.5 leading-relaxed">
                            {role.description}
                          </p>
                        </div>
                      </div>

                      <div className="relative mt-4 pt-3 flex items-center justify-between border-t border-white/[0.06]">
                        <span className="text-[10px] font-mono text-white/35 truncate">
                          {role.email}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.2em] uppercase transition-all"
                          style={{ color: role.color }}
                        >
                          <span>Přihlásit</span>
                          <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    role="alert"
                    className="mt-6 max-w-md mx-auto flex items-start gap-2.5 px-4 py-3 rounded-xl text-[13px]"
                    style={{
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.25)',
                    }}
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <span className="text-red-200/90">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Manual login link */}
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => goToScreen('form')}
                  className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] uppercase text-white/55 hover:text-white transition-colors group"
                >
                  <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" />
                  <span>Mám vlastní účet</span>
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* ═════════════════════════ FOOTER ═════════════════════════ */}
      <footer className="relative z-10 px-6 md:px-10 py-5 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-[10px] text-white/25 font-medium tracking-[0.18em] uppercase">
          © {new Date().getFullYear()} OperatingRoom Manager
        </p>

        {/* Status micro-indicators */}
        <div className="flex items-center gap-3">
          {[
            { icon: Server,   label: 'API',  ok: true },
            { icon: Database, label: 'DB',   ok: true },
            { icon: Wifi,     label: 'Auth', ok: true },
          ].map(s => (
            <span key={s.label} className="inline-flex items-center gap-1.5 text-[9.5px] text-white/30 font-mono tracking-[0.2em] uppercase">
              <s.icon className="w-3 h-3" strokeWidth={2.25} />
              <span>{s.label}</span>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: s.ok ? '#34d399' : '#ef4444',
                  boxShadow: `0 0 6px ${s.ok ? '#34d39980' : '#ef444480'}`,
                }}
              />
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
