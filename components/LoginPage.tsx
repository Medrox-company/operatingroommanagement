import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  Lock, Mail, Eye, EyeOff, AlertCircle, ArrowLeft,
  Shield, User, Stethoscope, Activity, Briefcase, ClipboardList,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

type QuickRoleId = 'admin' | 'user' | 'aro' | 'cos' | 'management' | 'primar';
type Screen = 'intro' | 'form' | 'demo';

/**
 * DEMO účty — přihlašování probíhá server-side (rate-limited /api/auth/login)
 * proti bcrypt hashím v DB. V PRODUKCI: deaktivovat tyto účty nebo odstranit
 * QUICK_ROLES, aby se demo hesla nevystavovala v UI.
 */
const QUICK_ROLES: Array<{
  id: QuickRoleId;
  label: string;
  email: string;
  password: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'admin',      label: 'ADMINISTRÁTOR', email: 'admin@nemocnice.cz',      password: 'admin123',  icon: Shield },
  { id: 'aro',        label: 'ARO',           email: 'aro@nemocnice.cz',        password: 'aro123',    icon: Activity },
  { id: 'cos',        label: 'COS',           email: 'cos@nemocnice.cz',        password: 'cos123',    icon: Stethoscope },
  { id: 'management', label: 'MANAGEMENT',    email: 'management@nemocnice.cz', password: 'mgmt123',   icon: Briefcase },
  { id: 'primar',     label: 'PRIMARIÁT',     email: 'primar@nemocnice.cz',     password: 'primar123', icon: ClipboardList },
  { id: 'user',       label: 'UŽIVATEL',      email: 'user@nemocnice.cz',       password: 'user123',   icon: User },
];

const ACCENT = '#FBBF24'; // brutalist yellow

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

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-hidden flex flex-col font-sans">
      {/* Subtle grid pattern */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6">
        <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono uppercase tracking-[0.4em] text-white/40">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }}
          />
          <span>OPERATINGROOM / V1</span>
        </div>
        <AnimatePresence>
          {screen !== 'intro' && (
            <motion.button
              key="back"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              onClick={() => {
                setScreen('intro');
                setError(null);
              }}
              className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.3em] text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
              ZPĚT
            </motion.button>
          )}
        </AnimatePresence>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 sm:px-10 py-8">
        <AnimatePresence mode="wait">
          {screen === 'intro' && (
            <IntroScreen
              key="intro"
              onLogin={() => setScreen('form')}
              onDemo={() => setScreen('demo')}
            />
          )}
          {screen === 'form' && (
            <FormScreen
              key="form"
              email={email}
              password={password}
              showPassword={showPassword}
              isLoading={isLoading}
              error={error}
              onEmail={setEmail}
              onPassword={setPassword}
              onTogglePassword={() => setShowPassword(p => !p)}
              onSubmit={handleSubmit}
            />
          )}
          {screen === 'demo' && (
            <DemoScreen
              key="demo"
              isLoading={isLoading}
              error={error}
              onQuickLogin={handleQuickLogin}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 sm:px-10 py-5 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.3em] text-white/25">
        <span>© {new Date().getFullYear()} OPERATINGROOM MANAGER</span>
        <span className="hidden sm:inline">SECURE LOGIN · BCRYPT · RATE LIMITED</span>
      </footer>
    </div>
  );
};

/* ─── Intro screen ──────────────────────────────────────────────────────── */

const IntroScreen: React.FC<{ onLogin: () => void; onDemo: () => void }> = ({
  onLogin,
  onDemo,
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.35 }}
    className="relative w-full max-w-5xl flex flex-col items-center text-center"
  >
    {/* Ghost watermark "ORM" */}
    <span
      aria-hidden
      className="pointer-events-none select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-black tracking-tighter text-white/[0.035] leading-[0.85]"
      style={{
        fontSize: 'clamp(18rem, 42vw, 36rem)',
        letterSpacing: '-0.06em',
      }}
    >
      ORM
    </span>

    {/* Headline */}
    <motion.h1
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1, duration: 0.5 }}
      className="relative font-black tracking-tighter uppercase leading-[0.88]"
      style={{ fontSize: 'clamp(3rem, 11vw, 9rem)' }}
    >
      <span className="block text-white text-balance">OPERATINGROOM</span>
      <span
        className="block text-balance"
        style={{ color: ACCENT, textShadow: `0 0 60px ${ACCENT}30` }}
      >
        MANAGER
      </span>
    </motion.h1>

    {/* Subtitle */}
    <motion.p
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.25, duration: 0.4 }}
      className="relative mt-8 sm:mt-10 text-[11px] sm:text-xs font-mono uppercase tracking-[0.4em] text-white/55"
    >
      Aplikace pro řízení operačních sálů
    </motion.p>

    {/* CTAs */}
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="relative mt-10 sm:mt-12 flex items-center gap-4"
    >
      <button
        type="button"
        onClick={onLogin}
        className="group relative px-8 sm:px-10 py-4 font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-black transition-transform duration-150 hover:translate-y-[-1px] active:translate-y-[1px]"
        style={{ background: ACCENT, boxShadow: `0 0 0 0 ${ACCENT}` }}
      >
        PŘIHLÁŠENÍ
      </button>

      <button
        type="button"
        onClick={onDemo}
        className="px-8 sm:px-10 py-4 font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-white border-2 border-white/90 hover:bg-white hover:text-black transition-colors duration-150"
      >
        DEMO
      </button>
    </motion.div>
  </motion.div>
);

/* ─── Form screen ───────────────────────────────────────────────────────── */

const FormScreen: React.FC<{
  email: string;
  password: string;
  showPassword: boolean;
  isLoading: boolean;
  error: string | null;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
}> = ({
  email, password, showPassword, isLoading, error,
  onEmail, onPassword, onTogglePassword, onSubmit,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.3 }}
    className="w-full max-w-md"
  >
    {/* Section label */}
    <div className="mb-8">
      <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/40 mb-3">
        / 01 · AUTHENTICATION
      </p>
      <h2
        className="font-black uppercase tracking-tighter leading-none"
        style={{ fontSize: 'clamp(2.5rem, 7vw, 4rem)' }}
      >
        <span className="block text-white">PŘIHLÁŠENÍ</span>
      </h2>
      <div
        className="mt-4 h-[3px] w-16"
        style={{ background: ACCENT }}
      />
    </div>

    <form onSubmit={onSubmit} className="space-y-5">
      {/* Email */}
      <div>
        <label className="block text-[10px] font-mono uppercase tracking-[0.4em] text-white/50 mb-2">
          E-MAIL
        </label>
        <div className="relative">
          <Mail
            className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
            strokeWidth={2}
          />
          <input
            type="email"
            value={email}
            onChange={e => onEmail(e.target.value)}
            placeholder="vas@email.cz"
            autoComplete="email"
            required
            className="w-full bg-transparent border-0 border-b border-white/20 pl-7 pr-2 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#FBBF24] transition-colors font-mono text-sm"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-[10px] font-mono uppercase tracking-[0.4em] text-white/50 mb-2">
          HESLO
        </label>
        <div className="relative">
          <Lock
            className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
            strokeWidth={2}
          />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => onPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            className="w-full bg-transparent border-0 border-b border-white/20 pl-7 pr-9 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#FBBF24] transition-colors font-mono text-sm"
          />
          <button
            type="button"
            onClick={onTogglePassword}
            aria-label={showPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-start gap-2 px-3 py-2.5 border border-red-500/40 bg-red-500/5 text-red-300 text-xs font-mono"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px" />
            <span className="leading-relaxed">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || !email || !password}
        className="w-full mt-2 py-4 font-mono text-xs font-bold uppercase tracking-[0.3em] text-black transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:translate-y-[-1px] enabled:active:translate-y-[1px]"
        style={{ background: ACCENT }}
      >
        {isLoading ? (
          <span className="inline-flex items-center justify-center gap-2.5">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full"
            />
            PŘIHLAŠUJI
          </span>
        ) : (
          'PŘIHLÁSIT SE'
        )}
      </button>
    </form>
  </motion.div>
);

/* ─── Demo screen ───────────────────────────────────────────────────────── */

const DemoScreen: React.FC<{
  isLoading: boolean;
  error: string | null;
  onQuickLogin: (id: QuickRoleId) => void;
}> = ({ isLoading, error, onQuickLogin }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.3 }}
    className="w-full max-w-3xl"
  >
    <div className="mb-8 text-center">
      <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/40 mb-3">
        / 02 · DEMO ACCESS
      </p>
      <h2
        className="font-black uppercase tracking-tighter leading-none"
        style={{ fontSize: 'clamp(2.5rem, 7vw, 4rem)' }}
      >
        <span className="block text-white">VYBERTE</span>
        <span className="block" style={{ color: ACCENT }}>ROLI</span>
      </h2>
      <p className="mt-5 text-[11px] font-mono uppercase tracking-[0.3em] text-white/40">
        Klikněte pro přímé přihlášení
      </p>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {QUICK_ROLES.map(role => {
        const Icon = role.icon;
        return (
          <button
            key={role.id}
            type="button"
            onClick={() => onQuickLogin(role.id)}
            disabled={isLoading}
            className="group relative p-5 sm:p-6 border-2 border-white/15 hover:border-[#FBBF24] bg-white/[0.02] hover:bg-[#FBBF24] transition-colors duration-150 text-left disabled:opacity-50 disabled:cursor-wait"
          >
            <Icon
              className="w-5 h-5 text-white/60 group-hover:text-black transition-colors mb-4"
              strokeWidth={2}
            />
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white group-hover:text-black transition-colors leading-tight">
              {role.label}
            </p>
            <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-white/35 group-hover:text-black/60 transition-colors truncate">
              {role.email.split('@')[0]}
            </p>
          </button>
        );
      })}
    </div>

    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="mt-6 flex items-start gap-2 px-3 py-2.5 border border-red-500/40 bg-red-500/5 text-red-300 text-xs font-mono"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px" />
          <span className="leading-relaxed">{error}</span>
        </motion.div>
      )}
    </AnimatePresence>

    <p className="mt-8 text-center text-[10px] font-mono uppercase tracking-[0.3em] text-white/25">
      Hesla: role123 · mgmt123 pro management
    </p>
  </motion.div>
);

export default LoginPage;
