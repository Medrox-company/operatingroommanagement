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
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-4xl text-center relative"
            >
              {/* ═══════════════════════════════════════════════════════════════
                  NOISE TEXTURE OVERLAY — adds depth and premium feel
                  ═══════════════════════════════════════════════════════════════ */}
              <div
                aria-hidden
                className="fixed inset-0 pointer-events-none opacity-[0.015] mix-blend-overlay"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
              />

              {/* ═══════════════════════════════════════════════════════════════
                  MORPHING ORGANIC BLOB — cinematic background element
                  ═══════════════════════════════════════════════════════════════ */}
              <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none">
                <svg className="absolute w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
                  <defs>
                    <linearGradient id="blobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={C.cyan} stopOpacity="0.08" />
                      <stop offset="50%" stopColor={C.purple} stopOpacity="0.05" />
                      <stop offset="100%" stopColor={C.yellow} stopOpacity="0.03" />
                    </linearGradient>
                    <filter id="blobBlur">
                      <feGaussianBlur stdDeviation="50" />
                    </filter>
                  </defs>
                  <motion.path
                    fill="url(#blobGradient)"
                    filter="url(#blobBlur)"
                    animate={{
                      d: [
                        'M 500 200 C 700 200 850 350 850 500 C 850 650 700 800 500 800 C 300 800 150 650 150 500 C 150 350 300 200 500 200',
                        'M 500 180 C 720 220 880 380 860 520 C 840 680 680 820 480 820 C 280 820 140 680 160 480 C 180 320 320 180 500 180',
                        'M 520 200 C 680 180 840 340 820 520 C 800 700 660 840 460 820 C 260 800 120 640 160 460 C 200 280 360 220 520 200',
                        'M 500 200 C 700 200 850 350 850 500 C 850 650 700 800 500 800 C 300 800 150 650 150 500 C 150 350 300 200 500 200',
                      ],
                    }}
                    transition={{
                      duration: 25,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                </svg>
              </div>

              {/* ═══════════════════════════════════════════════════════════════
                  ULTRA-PREMIUM AURORA BACKGROUND — enhanced
                  ═══════════════════════════════════════════════════════════════ */}
              <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Aurora layer 1 — cyan flowing wave */}
                <motion.div
                  className="absolute w-[150%] h-[60%] -top-[20%] -left-[25%]"
                  style={{
                    background: `radial-gradient(ellipse 80% 50% at 50% 50%, ${C.cyan}12 0%, transparent 70%)`,
                    filter: 'blur(80px)',
                  }}
                  animate={{
                    x: ['-5%', '5%', '-5%'],
                    y: ['-3%', '3%', '-3%'],
                    scale: [1, 1.08, 1],
                    rotate: [0, 3, 0],
                  }}
                  transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* Aurora layer 2 — gold accent */}
                <motion.div
                  className="absolute w-[80%] h-[40%] top-[10%] left-[10%]"
                  style={{
                    background: `radial-gradient(ellipse 60% 40% at 30% 50%, ${C.yellow}06 0%, transparent 60%)`,
                    filter: 'blur(100px)',
                  }}
                  animate={{
                    x: ['0%', '15%', '0%'],
                    y: ['0%', '-8%', '0%'],
                    opacity: [0.5, 0.9, 0.5],
                  }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
                />
                {/* Aurora layer 3 — deep purple undertone */}
                <motion.div
                  className="absolute w-[120%] h-[50%] -bottom-[10%] -left-[10%]"
                  style={{
                    background: `radial-gradient(ellipse 70% 50% at 70% 80%, ${C.purple}06 0%, transparent 60%)`,
                    filter: 'blur(120px)',
                  }}
                  animate={{
                    x: ['5%', '-8%', '5%'],
                    opacity: [0.3, 0.7, 0.3],
                  }}
                  transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
                />
                {/* NEW: Subtle green accent for medical feel */}
                <motion.div
                  className="absolute w-[60%] h-[30%] top-[30%] right-[5%]"
                  style={{
                    background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${C.green}04 0%, transparent 70%)`,
                    filter: 'blur(80px)',
                  }}
                  animate={{
                    x: ['-5%', '5%', '-5%'],
                    y: ['5%', '-5%', '5%'],
                    opacity: [0.4, 0.7, 0.4],
                  }}
                  transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
                />
              </div>

              {/* ═══════════════════════════════════════════════════════════════
                  CONSTELLATION NETWORK — connecting nodes
                  ═══════════════════════════════════════════════════════════════ */}
              <svg
                aria-hidden
                className="fixed inset-0 w-full h-full pointer-events-none"
                style={{ opacity: 0.4 }}
              >
                <defs>
                  <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={C.cyan} stopOpacity="0" />
                    <stop offset="50%" stopColor={C.cyan} stopOpacity="0.6" />
                    <stop offset="100%" stopColor={C.cyan} stopOpacity="0" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* Animated constellation lines */}
                {[
                  { x1: '10%', y1: '20%', x2: '25%', y2: '35%', delay: 0 },
                  { x1: '25%', y1: '35%', x2: '45%', y2: '25%', delay: 0.5 },
                  { x1: '45%', y1: '25%', x2: '70%', y2: '40%', delay: 1 },
                  { x1: '70%', y1: '40%', x2: '85%', y2: '30%', delay: 1.5 },
                  { x1: '15%', y1: '70%', x2: '35%', y2: '60%', delay: 2 },
                  { x1: '35%', y1: '60%', x2: '55%', y2: '75%', delay: 2.5 },
                  { x1: '55%', y1: '75%', x2: '80%', y2: '65%', delay: 3 },
                  { x1: '25%', y1: '35%', x2: '35%', y2: '60%', delay: 3.5 },
                  { x1: '45%', y1: '25%', x2: '55%', y2: '75%', delay: 4 },
                ].map((line, i) => (
                  <motion.line
                    key={`line-${i}`}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke="url(#lineGrad)"
                    strokeWidth="1"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 2, delay: line.delay, ease: 'easeOut' }}
                  />
                ))}
                {/* Constellation nodes */}
                {[
                  { cx: '10%', cy: '20%', r: 3, delay: 0 },
                  { cx: '25%', cy: '35%', r: 4, delay: 0.3 },
                  { cx: '45%', cy: '25%', r: 5, delay: 0.6 },
                  { cx: '70%', cy: '40%', r: 4, delay: 0.9 },
                  { cx: '85%', cy: '30%', r: 3, delay: 1.2 },
                  { cx: '15%', cy: '70%', r: 3, delay: 1.5 },
                  { cx: '35%', cy: '60%', r: 4, delay: 1.8 },
                  { cx: '55%', cy: '75%', r: 5, delay: 2.1 },
                  { cx: '80%', cy: '65%', r: 3, delay: 2.4 },
                ].map((node, i) => (
                  <motion.circle
                    key={`node-${i}`}
                    cx={node.cx}
                    cy={node.cy}
                    r={node.r}
                    fill={i % 2 === 0 ? C.cyan : C.yellow}
                    filter="url(#glow)"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.6, 1, 0.6],
                    }}
                    transition={{
                      scale: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: node.delay },
                      opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: node.delay },
                    }}
                  />
                ))}
              </svg>

              {/* ═══════════════════════════════════════════════════════════════
                  FLOATING ETHEREAL ORBS — enhanced with glow halos
                  ═══════════════════════════════════════════════════════════════ */}
              <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none">
                {[...Array(8)].map((_, i) => {
                  const colors = [C.cyan, C.yellow, C.purple, C.green, C.cyan, C.yellow, C.purple, C.green];
                  const sizes = [80, 120, 60, 100, 90, 140, 70, 110];
                  const positions = [
                    { left: '8%', top: '15%' },
                    { left: '85%', top: '20%' },
                    { left: '20%', top: '70%' },
                    { left: '75%', top: '75%' },
                    { left: '45%', top: '10%' },
                    { left: '60%', top: '85%' },
                    { left: '10%', top: '45%' },
                    { left: '90%', top: '50%' },
                  ];
                  return (
                    <motion.div
                      key={`orb-${i}`}
                      className="absolute rounded-full"
                      style={{
                        width: sizes[i],
                        height: sizes[i],
                        ...positions[i],
                        background: `radial-gradient(circle, ${colors[i]}15 0%, ${colors[i]}05 40%, transparent 70%)`,
                        filter: 'blur(30px)',
                        boxShadow: `0 0 60px ${colors[i]}10`,
                      }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: [0.2, 0.5, 0.2],
                        scale: [1, 1.15, 1],
                        y: [0, -15 - (i % 3) * 8, 0],
                        x: [0, (i % 2 === 0 ? 1 : -1) * (8 + (i % 4) * 3), 0],
                      }}
                      transition={{
                        opacity: { duration: 6 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 },
                        scale: { duration: 8 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 },
                        y: { duration: 10 + i * 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 },
                        x: { duration: 12 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 },
                      }}
                    />
                  );
                })}
              </div>

              {/* ═══════════════════════════════════════════════════════════════
                  SUBTLE GRID PATTERN — adds structure
                  ═══════════════════════════════════════════════════════════════ */}
              <div
                aria-hidden
                className="fixed inset-0 pointer-events-none opacity-[0.02]"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
                  `,
                  backgroundSize: '60px 60px',
                }}
              />

              {/* ═══════════════════════════════════════════════════════════════
                  GHOST WATERMARK — ultra subtle breathing
                  ═══════════════════════════════════════════════════════════════ */}
              <motion.div
                aria-hidden
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 2, ease: 'easeOut' }}
              >
                <motion.span
                  className="font-black tracking-tighter leading-none"
                  style={{
                    fontSize: 'clamp(14rem, 38vw, 28rem)',
                    background: `linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  ORM
                </motion.span>
              </motion.div>

              {/* ═══════════════════════════════════════════════════════════════
                  MAIN CONTENT
                  ═══════════════════════════════════════════════════════════════ */}
              <div className="relative z-10">
                {/* Elegant top accent line */}
                <motion.div
                  className="mx-auto mb-12 h-px"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, ${C.cyan}60 50%, transparent 100%)`,
                    maxWidth: '120px',
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                />

                {/* Title with ultra-sophisticated reveal */}
                <motion.h1
                  className="relative font-bold tracking-tight leading-[0.90]"
                  style={{ fontSize: 'clamp(2.2rem, 9vw, 6rem)' }}
                >
                  {/* OPERATINGROOM — cinematic letter reveal with stagger */}
                  <span className="block overflow-hidden">
                    <motion.span
                      className="inline-block"
                      initial={{ y: '120%' }}
                      animate={{ y: '0%' }}
                      transition={{
                        duration: 1.2,
                        delay: 0.3,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      {'OPERATINGROOM'.split('').map((letter, i) => (
                        <motion.span
                          key={`l1-${i}`}
                          className="inline-block"
                          style={{
                            textShadow: '0 0 40px rgba(255,255,255,0.1)',
                          }}
                          initial={{ opacity: 0, y: 20, filter: 'blur(10px)', scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
                          transition={{
                            duration: 0.8,
                            delay: 0.4 + i * 0.035,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                        >
                          {letter}
                        </motion.span>
                      ))}
                    </motion.span>
                  </span>

                  {/* MANAGEMENT SYSTEM — premium gold with enhanced glow */}
                  <span className="block overflow-hidden mt-2">
                    <motion.span
                      className="inline-block relative"
                      style={{
                        fontSize: 'clamp(1.6rem, 5.5vw, 4rem)',
                        background: `linear-gradient(135deg, #ffc107 0%, #ffdb4d 25%, #ffd700 50%, #ffdb4d 75%, #ffc107 100%)`,
                        backgroundSize: '200% 100%',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        filter: 'drop-shadow(0 0 40px rgba(255,184,0,0.35))',
                      }}
                      initial={{ y: '120%', opacity: 0 }}
                      animate={{ 
                        y: '0%', 
                        opacity: 1,
                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                      }}
                      transition={{
                        y: { duration: 1.2, delay: 0.7, ease: [0.16, 1, 0.3, 1] },
                        opacity: { duration: 1.2, delay: 0.7, ease: [0.16, 1, 0.3, 1] },
                        backgroundPosition: { duration: 8, repeat: Infinity, ease: 'linear', delay: 2 },
                      }}
                    >
                      MANAGEMENT SYSTEM
                      {/* Traveling light shimmer */}
                      <motion.span
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                          WebkitBackgroundClip: 'text',
                          mixBlendMode: 'overlay',
                        }}
                        animate={{ x: ['-150%', '150%'] }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          repeatDelay: 5,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      />
                    </motion.span>
                  </span>
                </motion.h1>

                {/* Subtle underline accent */}
                <motion.div
                  className="mx-auto mt-6 h-[2px] rounded-full"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, ${C.yellow}60 50%, transparent 100%)`,
                    maxWidth: '180px',
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 1, delay: 1.4, ease: [0.16, 1, 0.3, 1] }}
                />

                {/* Subtitle with fade-in */}
                <motion.p
                  className="mt-8 text-base md:text-lg text-white/40 max-w-lg mx-auto leading-relaxed tracking-wide"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.2, ease: 'easeOut' }}
                >
                  Systém pro správu a monitoring operačních sálů
                </motion.p>

                {/* Elegant separator */}
                <motion.div
                  className="mx-auto my-10 flex items-center gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1.4 }}
                >
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${C.border})` }} />
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{ background: C.cyan, boxShadow: `0 0 12px ${C.cyan}` }}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${C.border}, transparent)` }} />
                </motion.div>

                {/* CTA buttons with ultra-premium styling */}
                <motion.div
                  className="flex items-center justify-center gap-5 flex-wrap"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 1.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Primary — Přihlášení — with magnetic hover effect */}
                  <motion.button
                    onClick={() => goToScreen('form')}
                    className="group relative inline-flex items-center gap-3.5 px-10 py-5 rounded-2xl font-semibold text-[11px] tracking-[0.22em] uppercase overflow-hidden"
                    style={{ background: '#ffb800', color: '#0a0f1a' }}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    {/* Multi-layer animated gradient overlay */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                      }}
                      animate={{ x: ['-150%', '150%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4, ease: [0.16, 1, 0.3, 1] }}
                    />
                    {/* Breathing glow effect */}
                    <motion.div
                      className="absolute inset-0 -z-10 rounded-2xl"
                      animate={{
                        boxShadow: [
                          '0 8px 32px -8px rgba(255,184,0,0.4), 0 0 0 0 rgba(255,184,0,0)',
                          '0 16px 48px -12px rgba(255,184,0,0.6), 0 0 80px -20px rgba(255,184,0,0.3)',
                          '0 8px 32px -8px rgba(255,184,0,0.4), 0 0 0 0 rgba(255,184,0,0)',
                        ],
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    {/* Inner highlight */}
                    <div 
                      className="absolute inset-[1px] rounded-[15px] pointer-events-none"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
                      }}
                    />
                    <LogIn className="w-4 h-4 relative z-10" strokeWidth={2.5} />
                    <span className="relative z-10 font-bold">Přihlášení</span>
                    <motion.span
                      className="relative z-10"
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                    </motion.span>
                  </motion.button>

                  {/* Secondary — Demo — with glassmorphism */}
                  <motion.button
                    onClick={() => goToScreen('demo')}
                    className="group relative inline-flex items-center gap-3.5 px-10 py-5 rounded-2xl font-semibold text-[11px] tracking-[0.22em] uppercase text-white/50 hover:text-white transition-all duration-500"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      backdropFilter: 'blur(20px)',
                    }}
                    whileHover={{
                      scale: 1.04,
                      y: -2,
                      borderColor: 'rgba(6,182,212,0.3)',
                      boxShadow: '0 8px 32px -8px rgba(6,182,212,0.2), inset 0 0 20px rgba(6,182,212,0.05)',
                    }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    {/* Subtle inner glow on hover */}
                    <div 
                      className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{
                        background: `radial-gradient(ellipse at center, ${C.cyan}08 0%, transparent 70%)`,
                      }}
                    />
                    <motion.span
                      animate={{ 
                        rotate: [0, 15, -15, 0], 
                        scale: [1, 1.15, 1],
                      }}
                      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Sparkles className="w-4 h-4" strokeWidth={2} />
                    </motion.span>
                    <span className="font-bold">Demo</span>
                  </motion.button>
                </motion.div>

                {/* Bottom decorative element — enhanced */}
                <motion.div
                  className="mt-20 flex flex-col items-center gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 2.2 }}
                >
                  {/* Floating dots */}
                  <div className="flex items-center gap-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={`dot-${i}`}
                        className="rounded-full"
                        style={{ 
                          width: i === 2 ? 6 : 4,
                          height: i === 2 ? 6 : 4,
                          background: i === 2 ? C.cyan : 'rgba(255,255,255,0.15)',
                          boxShadow: i === 2 ? `0 0 12px ${C.cyan}` : 'none',
                        }}
                        animate={i === 2 ? { 
                          scale: [1, 1.4, 1], 
                          opacity: [0.6, 1, 0.6],
                          boxShadow: [`0 0 12px ${C.cyan}`, `0 0 24px ${C.cyan}`, `0 0 12px ${C.cyan}`],
                        } : {
                          opacity: [0.15, 0.3, 0.15],
                        }}
                        transition={{ 
                          duration: i === 2 ? 3 : 4, 
                          repeat: Infinity, 
                          ease: 'easeInOut',
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </div>

                  {/* Scroll indicator hint */}
                  <motion.div
                    className="flex flex-col items-center gap-2 text-white/20"
                    animate={{ y: [0, 5, 0], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="w-px h-8" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)' }} />
                  </motion.div>
                </motion.div>
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
