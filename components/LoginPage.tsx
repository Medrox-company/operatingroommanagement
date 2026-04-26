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
              {/* Ghost watermark */}
              <div
                aria-hidden
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
              >
                <span
                  className="font-black tracking-tighter leading-none"
                  style={{
                    fontSize: 'clamp(12rem, 32vw, 22rem)',
                    color: 'rgba(255,255,255,0.015)',
                  }}
                >
                  ORM
                </span>
              </div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.35 }}
                className="relative font-bold tracking-tight leading-[0.95] text-balance"
                style={{ fontSize: 'clamp(1.875rem, 7vw, 4.5rem)' }}
              >
                <span className="block text-white break-words">
                  OPERATINGROOM
                </span>
                <span
                  className="block break-words"
                  style={{ color: C.yellow }}
                >
                  MANAGEMENT
                </span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.3 }}
                className="relative mt-6 text-sm md:text-base text-white/50 max-w-md mx-auto leading-relaxed"
              >
                Systém pro správu a monitoring operačních sálů
              </motion.p>

              {/* CTA buttons */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="relative mt-10 flex items-center justify-center gap-3 flex-wrap"
              >
                <button
                  onClick={() => goToScreen('form')}
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-semibold text-[12px] tracking-[0.15em] uppercase transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: C.yellow,
                    color: '#0a0f1a',
                    boxShadow: `0 12px 32px -8px ${C.yellow}60`,
                  }}
                >
                  <LogIn className="w-4 h-4" strokeWidth={2.5} />
                  <span>Přihlášení</span>
                  <ChevronRight className="w-4 h-4 -ml-1 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
                </button>

                <button
                  onClick={() => goToScreen('demo')}
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-semibold text-[12px] tracking-[0.15em] uppercase text-white/70 hover:text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: C.glass,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <Sparkles className="w-4 h-4" strokeWidth={2.25} />
                  <span>Demo</span>
                </button>
              </motion.div>
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
