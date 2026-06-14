import React, { useState } from 'react';
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
  { id: 'admin',      label: 'Administrátor', email: 'admin@nemocnice.cz',      password: 'admin123',  icon: Shield,        color: C.yellow, description: 'Plný přístup' },
  { id: 'aro',        label: 'ARO',           email: 'aro@nemocnice.cz',        password: 'aro123',    icon: Activity,      color: C.cyan,   description: 'Anestezie' },
  { id: 'cos',        label: 'COS',           email: 'cos@nemocnice.cz',        password: 'cos123',    icon: Stethoscope,   color: C.green,  description: 'Operační sály' },
  { id: 'management', label: 'Management',    email: 'management@nemocnice.cz', password: 'mgmt123',   icon: Briefcase,     color: C.purple, description: 'Vedení' },
  { id: 'primar',     label: 'Primariát',     email: 'primar@nemocnice.cz',     password: 'primar123', icon: ClipboardList, color: C.pink,   description: 'Primář' },
  { id: 'user',       label: 'Uživatel',      email: 'user@nemocnice.cz',       password: 'user123',   icon: User,          color: C.muted,  description: 'Standardní' },
];

/* Realistická EKG křivka (PQRST) — 4 údery přes šířku 1200, baseline y=100.
   P = malá zaoblená vlna, QRS = ostrý komplex (Q důlek, R vysoký hrot, S
   propad pod izolinii), T = zaoblená vlna; mezi nimi izoelektrické úseky. */
const ECG_PATH = (() => {
  const yb = 100;
  let d = `M0,${yb}`;
  for (let i = 0; i < 4; i++) {
    const x = i * 300;
    d +=
      ` H${x + 30}` +                                   // izoelektrická linie
      ` Q${x + 45},${yb - 20} ${x + 60},${yb}` +        // P vlna
      ` H${x + 95}` +                                    // PR segment
      ` L${x + 104},${yb + 10}` +                        // Q
      ` L${x + 113},${yb - 72}` +                        // R (ostrý hrot)
      ` L${x + 122},${yb + 28}` +                        // S
      ` L${x + 131},${yb}` +                             // návrat na izolinii
      ` H${x + 168}` +                                   // ST segment
      ` Q${x + 200},${yb - 26} ${x + 232},${yb}` +       // T vlna
      ` H${x + 300}`;                                    // doběh do dalšího úderu
  }
  return d;
})();

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
      {/* Static radial background */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, #0f1f3a 0%, #0a1528 50%, #050d18 100%)',
        }}
      />

      {/* Fotografie v pozadí — jemně v závoji, součást aplikace (public/images/background.jpg).
          Nahrazuje původní vodoznak „ORM". */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none bg-center bg-cover"
        style={{
          backgroundImage: "url('/images/background.jpg')",
          opacity: 0.92,
          filter: 'saturate(0.95)',
        }}
      />
      {/* Lineární modročerný závoj — tmavší směrem dolů */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(12,32,72,0.75) 0%, rgba(10,24,52,0.60) 40%, rgba(5,12,24,0.85) 78%, rgba(2,5,9,1) 100%)',
        }}
      />

      {/* EKG monitor — realistická křivka PQRST se svítícím blipem */}
      <div
        aria-hidden
        className="ecg-layer fixed inset-x-0 bottom-[5%] z-[2] pointer-events-none"
        style={{ height: 150 }}
      >
        <svg className="w-full h-full" viewBox="0 0 1200 160" preserveAspectRatio="xMidYMid slice">
          <path className="ecg-trace-faint" d={ECG_PATH} />
          <path className="ecg-trace" pathLength={1000} d={ECG_PATH} />
          <circle className="ecg-dot" r={4.5}>
            {/* lineární tempo + stejná délková parametrizace jako stopa →
                tečka jede přesně na čele křivky a smyčka je hladká */}
            <animateMotion
              dur="6s"
              repeatCount="indefinite"
              calcMode="linear"
              keyPoints="0;1"
              keyTimes="0;1"
              path={ECG_PATH}
            />
          </circle>
        </svg>
      </div>

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
          {screen !== 'intro' && (
            <button
              onClick={() => goToScreen('intro')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-[10px] font-semibold tracking-[0.2em] uppercase text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Zpět</span>
            </button>
          )}
        </div>
        <div className="min-w-[100px]" />
      </header>

      {/* ═════════════════════════ MAIN ═════════════════════════ */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 md:px-10 py-8">

        {/* ════════════════════════════ INTRO ════════════════════════════ */}
        {screen === 'intro' && (
          <section className="w-full max-w-4xl text-center relative">
            <div className="relative z-10 flex flex-col items-center translate-y-24 md:translate-y-36">
              {/* Title — OPERATINGROOM nahoře, MANAGEMENT SYSTEM menší a
                  roztažený přesně na šířku slova OPERATINGROOM (zarovnaný okraj k okraji) */}
              <div className="inline-block" style={{ textShadow: '0 2px 30px rgba(0,0,0,0.5)' }}>
                <span
                  className="block text-white font-bold tracking-tight leading-[0.95]"
                  style={{ fontSize: 'clamp(2.5rem, 8.5vw, 5.5rem)' }}
                >
                  OPERATINGROOM
                </span>
                <span
                  aria-label="MANAGEMENT SYSTEM"
                  className="flex justify-between w-full text-white font-bold leading-none mt-1"
                  style={{ fontSize: 'clamp(1.45rem, 5vw, 3.15rem)' }}
                >
                  {'MANAGEMENT SYSTEM'.split('').map((ch, i) => (
                    ch === ' '
                      ? <span key={i} aria-hidden style={{ width: '0.55em' }} />
                      : <span key={i} aria-hidden>{ch}</span>
                  ))}
                </span>
              </div>

              {/* Subtitle */}
              <p className="mt-10 text-base md:text-lg text-white/55 max-w-lg mx-auto font-light tracking-wide">
                Systém pro správu a monitoring operačních sálů
              </p>

              {/* CTA buttons */}
              <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={() => goToScreen('demo')}
                  className="group relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: 'transparent',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.4)',
                  }}
                >
                  <LogIn className="w-4 h-4" strokeWidth={2.2} />
                  <span>Přihlášení</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2.2} />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════ FORM ════════════════════════════ */}
        {screen === 'form' && (
          <section className="w-full max-w-md">
            <div
              className="rounded-3xl p-8 md:p-10"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              }}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">Přihlášení</h2>
                <p className="text-sm text-white/40 mt-2">Zadejte přihlašovací údaje</p>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="mb-6 px-4 py-3 rounded-xl flex items-center gap-3"
                  style={{ background: `${C.red}15`, border: `1px solid ${C.red}30` }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" style={{ color: C.red }} />
                  <span className="text-sm" style={{ color: C.red }}>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-2">
                    Email
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vas@email.cz"
                      required
                      className="w-full pl-11 pr-4 py-4 rounded-xl text-sm text-white placeholder-white/25 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
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
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="********"
                      required
                      className="w-full pl-11 pr-12 py-4 rounded-xl text-sm text-white placeholder-white/25 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
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
                  className="relative w-full py-4 rounded-xl font-semibold text-sm tracking-wide overflow-hidden transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, rgba(251,191,36,0.95) 0%, rgba(245,158,11,0.95) 100%)',
                    color: '#0a0f1a',
                    boxShadow: '0 0 20px rgba(251,191,36,0.25)',
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

            </div>
          </section>
        )}

        {/* ════════════════════════════ DEMO ════════════════════════════ */}
        {screen === 'demo' && (
          <section className="w-full max-w-3xl self-end pb-2 md:pb-6">
            {/* Header */}
            <div className="text-center mb-10">
              <div
                className="w-12 h-px mx-auto mb-8"
                style={{ background: `linear-gradient(90deg, transparent, ${C.purple}80, transparent)` }}
              />
              <h2 className="text-3xl font-bold text-white tracking-tight">Přihlášení do aplikace</h2>
              <p className="text-base text-white/40 mt-3">Vyberte roli pro rychlé přihlášení</p>
            </div>

            {/* Roles grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {QUICK_ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => (role.id === 'user' ? goToScreen('form') : handleQuickLogin(role.id))}
                  disabled={isLoading}
                  className="group relative p-6 rounded-2xl text-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(20px)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${role.color}40`;
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
                  }}
                >
                  {/* Hover glow */}
                  <div
                    aria-hidden
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 50% 0%, ${role.color}15 0%, transparent 70%)`,
                    }}
                  />

                  {/* Text */}
                  <h3 className="text-lg md:text-xl font-semibold text-white mb-1">{role.label}</h3>
                  <p className="text-[11px] text-white/35 group-hover:text-white/50 transition-colors">
                    {role.description}
                  </p>
                </button>
              ))}
            </div>

            {/* Back to form */}
            <div className="text-center mt-10">
              <button
                onClick={() => goToScreen('form')}
                className="text-sm text-white/40 hover:text-white transition-colors inline-flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Přihlásit se vlastním účtem</span>
              </button>
            </div>
          </section>
        )}

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
