import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  Lock, Mail, Eye, EyeOff, AlertCircle, ArrowLeft,
  Shield, User, Stethoscope, Activity, Briefcase, ClipboardList,
  LogIn, Sparkles,
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
  { id: 'admin',      label: 'Administrátor', email: 'admin@nemocnice.cz',      password: 'admin123',  icon: Shield },
  { id: 'aro',        label: 'ARO',           email: 'aro@nemocnice.cz',        password: 'aro123',    icon: Activity },
  { id: 'cos',        label: 'COS',           email: 'cos@nemocnice.cz',        password: 'cos123',    icon: Stethoscope },
  { id: 'management', label: 'Management',    email: 'management@nemocnice.cz', password: 'mgmt123',   icon: Briefcase },
  { id: 'primar',     label: 'Primariát',     email: 'primar@nemocnice.cz',     password: 'primar123', icon: ClipboardList },
  { id: 'user',       label: 'Uživatel',      email: 'user@nemocnice.cz',       password: 'user123',   icon: User },
];

const ACCENT = '#FBBF24';
const CYAN = '#00d4ff';

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
    <div className="min-h-screen w-full text-white relative overflow-hidden flex flex-col font-sans">
      {/* App-wide deep navy radial background */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background:
            'radial-gradient(120% 80% at 50% 0%, #0f1f3a 0%, #0a1528 45%, #050d18 100%)',
        }}
      />

      {/* Cyan ambient glow — top */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <div
          className="absolute -top-60 left-1/2 -translate-x-1/2 w-[820px] h-[820px] rounded-full opacity-25"
          style={{ background: `radial-gradient(circle, ${CYAN} 0%, transparent 65%)` }}
        />
        {/* Yellow ambient glow — bottom corner, very subtle */}
        <div
          className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.08]"
          style={{ background: `radial-gradient(circle, ${ACCENT} 0%, transparent 70%)` }}
        />
      </div>

      {/* Subtle grid pattern overlay */}
      <div
        aria-hidden
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          zIndex: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Header strip — branding */}
      <header className="relative z-10 px-6 md:px-10 py-6 flex items-center justify-between">
        <AnimatePresence>
          {screen !== 'intro' && (
            <motion.button
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
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
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 md:px-10 py-6">
        <AnimatePresence mode="wait">
          {/* ====================== INTRO ====================== */}
          {screen === 'intro' && (
            <motion.section
              key="intro"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="w-full max-w-3xl text-center relative"
            >
              {/* Ghost watermark "ORM" behind hero */}
              <div
                aria-hidden
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
              >
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



              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.35 }}
                className="relative font-bold tracking-tighter leading-[0.85] uppercase"
                style={{ fontSize: '80px' }}
              >
                <span className="block text-white text-balance drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
                  Operating
                  <span className="text-white/85"> room</span>
                </span>
                <span
                  className="block text-balance"
                  style={{
                    color: ACCENT,
                    textShadow: `0 4px 32px ${ACCENT}33`,
                    fontSize: '80px',
                  }}
                >
                  Manager
                </span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.3 }}
                className="relative mt-8 text-sm md:text-base text-white/55 tracking-wide"
              >
                Aplikace pro řízení operačních sálů
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
                  className="group inline-flex items-center gap-2.5 px-7 md:px-9 py-3.5 rounded-2xl font-semibold text-[13px] tracking-[0.18em] uppercase transition-all duration-200 active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT}e6 100%)`,
                    color: '#0a0f1a',
                    boxShadow: `0 12px 40px -12px ${ACCENT}80, 0 0 0 1px ${ACCENT}40 inset`,
                  }}
                >
                  <LogIn className="w-4 h-4" strokeWidth={2.5} />
                  <span>Přihlášení</span>
                </button>

                <button
                  onClick={() => goToScreen('demo')}
                  className="group inline-flex items-center gap-2.5 px-7 md:px-9 py-3.5 rounded-2xl font-semibold text-[13px] tracking-[0.18em] uppercase text-white transition-all duration-200 active:scale-[0.98]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  <Sparkles className="w-4 h-4 text-white/70" strokeWidth={2.25} />
                  <span>Demo</span>
                </button>
              </motion.div>

              {/* Footer hint */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="relative mt-14 text-[10px] font-medium tracking-[0.28em] uppercase text-white/30"
              >
                v1.0 · Secure auth · Encrypted session
              </motion.p>
            </motion.section>
          )}

          {/* ====================== FORM ====================== */}
          {screen === 'form' && (
            <motion.section
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full max-w-md"
            >
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
                {/* Card glow accent */}
                <div
                  aria-hidden
                  className="absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-[0.08] pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${CYAN} 0%, transparent 65%)` }}
                />

                <div className="relative">
                  {/* Header */}
                  <div className="mb-8">
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.3em] mb-2"
                      style={{ color: CYAN }}
                    >
                      Přihlášení
                    </p>
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                      Vítejte zpět
                    </h2>
                    <p className="text-sm text-white/50 mt-2">
                      Zadejte své přihlašovací údaje pro pokračování
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
                      <div className="relative">
                        <Mail
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
                          aria-hidden
                        />
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                          autoComplete="email"
                          placeholder="vas@email.cz"
                          className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-[15px] text-white placeholder:text-white/25 outline-none transition-all"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                          onFocus={e => {
                            e.currentTarget.style.borderColor = `${CYAN}50`;
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                          }}
                          onBlur={e => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          }}
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
                      <div className="relative">
                        <Lock
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
                          aria-hidden
                        />
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className="w-full pl-11 pr-11 py-3.5 rounded-2xl text-[15px] text-white placeholder:text-white/25 outline-none transition-all"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                          onFocus={e => {
                            e.currentTarget.style.borderColor = `${CYAN}50`;
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                          }}
                          onBlur={e => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          }}
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

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-semibold text-[13px] tracking-[0.2em] uppercase transition-all duration-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-wait"
                      style={{
                        background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT}dd 100%)`,
                        color: '#0a0f1a',
                        boxShadow: `0 12px 32px -12px ${ACCENT}80, 0 0 0 1px ${ACCENT}40 inset`,
                      }}
                    >
                      {isLoading ? (
                        <>
                          <span
                            className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"
                            aria-hidden
                          />
                          <span>Přihlašuji…</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" strokeWidth={2.5} />
                          <span>Přihlásit se</span>
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
                      className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/70 hover:text-white transition-colors"
                    >
                      Vyzkoušet demo →
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* ====================== DEMO ====================== */}
          {screen === 'demo' && (
            <motion.section
              key="demo"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full max-w-3xl"
            >
              {/* Header */}
              <div className="text-center mb-10">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.4em] mb-3"
                  style={{ color: CYAN }}
                >
                  Demo přístup
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
                  Vyberte roli pro vyzkoušení
                </h2>
                <p className="text-sm text-white/50 mt-3 max-w-md mx-auto">
                  Každá role má jiné oprávnění. Klikněte na kartu pro automatické přihlášení.
                </p>
              </div>

              {/* Roles grid — glass cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {QUICK_ROLES.map((role, i) => {
                  const Icon = role.icon;
                  return (
                    <motion.button
                      key={role.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.25 }}
                      onClick={() => handleQuickLogin(role.id)}
                      disabled={isLoading}
                      className="group relative text-left rounded-2xl p-5 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait active:scale-[0.99]"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(16px)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = `${ACCENT}40`;
                        e.currentTarget.style.background =
                          `linear-gradient(135deg, ${ACCENT}0a 0%, rgba(255,255,255,0.02) 100%)`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.background =
                          'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)';
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <Icon className="w-[18px] h-[18px] text-white/80 group-hover:text-[#FBBF24] transition-colors" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45 leading-none mb-1.5"
                          >
                            Role
                          </p>
                          <h3 className="text-[15px] font-semibold text-white leading-tight">
                            {role.label}
                          </h3>
                          <p className="text-[11px] text-white/35 font-mono mt-2 truncate">
                            {role.email}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 flex items-center justify-between border-t border-white/[0.05]">
                        <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/35">
                          Demo účet
                        </span>
                        <span
                          className="text-[10px] font-semibold tracking-[0.2em] uppercase transition-colors"
                          style={{ color: ACCENT }}
                        >
                          Přihlásit →
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
                  className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/55 hover:text-white transition-colors"
                >
                  ← Mám vlastní účet
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 md:px-10 py-5">
        <p className="text-[10px] text-white/25 font-medium tracking-[0.18em] uppercase text-center">
          © {new Date().getFullYear()} OperatingRoom Manager
        </p>
      </footer>
    </div>
  );
};

export default LoginPage;
