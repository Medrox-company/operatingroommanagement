import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Moon,
  Shield,
  Stethoscope,
  Sun,
  type LucideIcon,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

type QuickRoleId = 'admin' | 'aro' | 'cos' | 'management' | 'primar';
type DesktopScreen = 'intro' | 'roles' | 'form';

interface LoginHospital {
  id: string;
  hospital_name: string;
  hospital_short_name: string | null;
}

/**
 * Role nabízené na přihlašovací stránce.
 *
 * Hesla tu schválně nejsou. Dřív se odsud přihlašovalo jedním kliknutím
 * s heslem zapsaným v kódu, jenže ten kód si stáhne každý návštěvník stránky.
 * Navíc má od scripts/17 každá role v každé nemocnici vlastní heslo, takže
 * jedna zapsaná hodnota už ani nemůže platit.
 *
 * Kliknutí na roli proto jen předvyplní přihlašovací jméno a vyžádá heslo.
 *
 * Superadministrátor tu není vůbec — přihlašuje se přes Google
 * s dvoufázovým ověřením.
 */
const QUICK_ROLES: Array<{
  id: QuickRoleId;
  label: string;
  email: string;
  icon: LucideIcon;
  tone: string;
  description: string;
}> = [
  { id: 'admin', label: 'Administrátor', email: 'admin@nemocnice.cz', icon: Shield, tone: '#D99C35', description: 'Plný přístup' },
  { id: 'aro', label: 'ARO', email: 'aro@nemocnice.cz', icon: Activity, tone: '#24A8C8', description: 'Anestezie' },
  { id: 'cos', label: 'COS', email: 'cos@nemocnice.cz', icon: Stethoscope, tone: '#2AAE82', description: 'Operační sály' },
  { id: 'management', label: 'Management', email: 'management@nemocnice.cz', icon: Briefcase, tone: '#8B7AD8', description: 'Vedení' },
  { id: 'primar', label: 'Primariát', email: 'primar@nemocnice.cz', icon: ClipboardList, tone: '#C76F9B', description: 'Primář' },
];

const GoogleMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [desktopScreen, setDesktopScreen] = useState<DesktopScreen>('intro');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<LoginHospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [hospitalsLoading, setHospitalsLoading] = useState(true);
  const [mobileDarkMode, setMobileDarkMode] = useState(true);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<QuickRoleId | null>(null);

  useEffect(() => {
    setMobileDarkMode(document.documentElement.classList.contains('m-dark'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/auth/google/config', { cache: 'no-store' });
        const json = await response.json().catch(() => ({}));
        if (!cancelled) setGoogleEnabled(json?.enabled === true);
      } catch {
        // Když se konfigurace nenačte, tlačítko se prostě nenabídne.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /**
   * Přesměruje na Google. Zbytek (dvoufázové ověření, vystavení session)
   * dořeší návratová stránka /prihlaseni/google.
   */
  const handleGoogleLogin = async () => {
    setError(null);
    if (!selectedHospitalId) {
      setError('Vyberte zdravotnické zařízení');
      return;
    }

    setGoogleLoading(true);
    try {
      const { getGoogleAuthClient, getGoogleRedirectUrl } = await import('../lib/auth/google-client');
      const supabase = getGoogleAuthClient();
      if (!supabase) {
        setError('Přihlášení přes Google není dostupné.');
        setGoogleLoading(false);
        return;
      }

      // Návratová stránka běží mimo tento komponent, zařízení jí předáme takhle.
      localStorage.setItem('orm-active-hospital', selectedHospitalId);

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getGoogleRedirectUrl(),
          queryParams: { prompt: 'select_account' },
        },
      });

      if (oauthError) {
        setError('Přesměrování na Google se nezdařilo.');
        setGoogleLoading(false);
      }
      // Při úspěchu prohlížeč odchází na Google, stav už se nemění.
    } catch {
      setError('Přihlášení přes Google není dostupné.');
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch('/api/hospitals', { cache: 'no-store' });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error || 'Nemocnice nelze načíst');

        const next = Array.isArray(json.hospitals) ? json.hospitals as LoginHospital[] : [];
        if (cancelled) return;

        setHospitals(next);
        const stored = localStorage.getItem('orm-active-hospital');
        const primaryHospital = next.find(item =>
          item.hospital_short_name?.trim().toLocaleLowerCase('cs-CZ') === 'knl'
          || item.hospital_name.toLocaleLowerCase('cs-CZ').includes('krajská nemocnice liberec')
        );
        setSelectedHospitalId(
          primaryHospital?.id
          || (next.some(item => item.id === stored) ? stored! : (next[0]?.id || ''))
        );
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Nemocnice nelze načíst');
      } finally {
        if (!cancelled) setHospitalsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const submitCredentials = async (mail: string, pwd: string) => {
    setError(null);
    if (!selectedHospitalId) {
      setError('Vyberte zdravotnické zařízení');
      return false;
    }

    setIsLoading(true);
    const result = await login(mail, pwd, selectedHospitalId);
    setIsLoading(false);

    if (result.success) {
      onLoginSuccess?.();
    } else {
      setError(result.error || 'Přihlášení se nezdařilo');
    }

    return result.success;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submitCredentials(email, password);
  };

  /**
   * Výběr role jen předvyplní přihlašovací jméno a přesune uživatele
   * k zadání hesla. Heslo se liší podle zvoleného zařízení, takže ho
   * nelze nikam předvyplnit.
   */
  const handleRoleSelect = (roleId: QuickRoleId) => {
    const role = QUICK_ROLES.find(item => item.id === roleId);
    if (!role) return;

    setError(null);
    setEmail(role.email);
    setPassword('');
    setSelectedRole(roleId);
    setDesktopScreen('form');

    // Na mobilu se jen posuneme do pole s heslem, obrazovky se nepřepínají.
    window.setTimeout(() => {
      const field = document.getElementById('login-password')
        ?? document.getElementById('desktop-form-password');
      (field as HTMLInputElement | null)?.focus();
    }, 60);
  };

  const toggleMobileTheme = () => {
    const nextDarkMode = !mobileDarkMode;
    setMobileDarkMode(nextDarkMode);
    document.documentElement.classList.toggle('m-dark', nextDarkMode);
    try {
      localStorage.setItem('or-mobile-theme', nextDarkMode ? 'dark' : 'light');
    } catch {
      // Motiv zůstane přepnutý i v prohlížeči, který blokuje lokální úložiště.
    }
  };

  const renderGoogleButton = (variant: 'mobile' | 'desktop') => {
    if (!googleEnabled) return null;

    const base = variant === 'mobile'
      ? 'mobile-login-google flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full text-[14px] font-extrabold'
      : 'flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.12] bg-white/[0.05] text-[12px] font-bold text-white/85 transition-colors hover:border-white/20 hover:bg-white/[0.09]';

    return (
      <button
        type="button"
        onClick={() => void handleGoogleLogin()}
        disabled={googleLoading || isLoading || !selectedHospitalId}
        className={`${base} disabled:cursor-not-allowed disabled:opacity-45`}
      >
        {googleLoading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <GoogleMark className="h-[18px] w-[18px]" />}
        Přihlásit se přes Google
      </button>
    );
  };

  const hospitalOptions = hospitals.length === 0
    ? <option value="">Žádné zařízení není dostupné</option>
    : hospitals.map(hospital => (
        <option key={hospital.id} value={hospital.id}>
          {hospital.hospital_name}{hospital.hospital_short_name ? ` (${hospital.hospital_short_name})` : ''}
        </option>
      ));

  return (
    <>
    <div className="mobile-login-page relative min-h-[100dvh] w-full overflow-x-hidden md:hidden">
      <div aria-hidden className="login-aurora-flow mobile-login-aurora pointer-events-none fixed" />
      <div aria-hidden className="login-aurora-vignette mobile-login-vignette pointer-events-none fixed inset-0" />

      <button
        type="button"
        onClick={toggleMobileTheme}
        className="mobile-login-theme-toggle fixed right-5 z-30 grid h-11 w-11 place-items-center rounded-2xl"
        style={{ top: 'max(18px, env(safe-area-inset-top))' }}
        aria-label={mobileDarkMode ? 'Přepnout do světlého režimu' : 'Přepnout do tmavého režimu'}
      >
        {mobileDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <main className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[460px] flex-col px-[clamp(24px,8vw,42px)] pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(68px,calc(env(safe-area-inset-top)+54px))]">
        <header className="flex flex-col items-center text-center">
          <h1 className="mobile-login-title mt-5 text-[clamp(2.15rem,10vw,3rem)] font-extrabold leading-none tracking-[-0.045em]">Operatingroom manager</h1>
          <p className="mobile-login-subtitle mt-3 text-[15px] font-medium">Zadejte přihlašovací údaje</p>
        </header>

        <section className="mt-10 sm:mt-12">
          {error && (
            <div className="mobile-login-error mb-5 flex items-start gap-2.5 rounded-2xl px-4 py-3.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="text-[12px] font-semibold leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-hospital" className="mobile-login-label mb-2.5 block text-[10px] font-extrabold uppercase tracking-[0.2em]">Nemocniční zařízení</label>
              <div className="relative">
                <Building2 className="mobile-login-field-icon absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" strokeWidth={1.8} />
                <select
                  id="login-hospital"
                  value={selectedHospitalId}
                  onChange={event => { setSelectedHospitalId(event.target.value); setError(null); }}
                  disabled={hospitalsLoading || hospitals.length === 0}
                  required
                  className="mobile-login-field h-[58px] w-full appearance-none rounded-[17px] pl-12 pr-12 text-[15px] font-bold outline-none disabled:opacity-50"
                >
                  {hospitalOptions}
                </select>
                {hospitalsLoading
                  ? <Loader2 className="mobile-login-field-icon absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin" />
                  : <ChevronDown className="mobile-login-field-icon pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2" />}
              </div>
            </div>

            <div>
              <label htmlFor="login-email" className="mobile-login-label mb-2.5 block text-[10px] font-extrabold uppercase tracking-[0.2em]">Uživatelské jméno</label>
              <input
                id="login-email"
                type="text"
                inputMode="email"
                autoCapitalize="none"
                autoComplete="username"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="jmeno.prijmeni"
                required
                className="mobile-login-field h-[58px] w-full rounded-[17px] px-4 text-[15px] font-semibold outline-none"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mobile-login-label mb-2.5 block text-[10px] font-extrabold uppercase tracking-[0.2em]">Heslo</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                  className="mobile-login-field h-[58px] w-full rounded-[17px] px-4 pr-12 text-[15px] font-semibold outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  className="mobile-login-field-icon absolute right-4 top-1/2 -translate-y-1/2"
                  aria-label={showPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !selectedHospitalId}
              className="mobile-login-submit mt-1 flex h-[58px] w-full items-center justify-center gap-2 rounded-full text-[16px] font-extrabold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? <><Loader2 className="h-5 w-5 animate-spin" /> Přihlašování…</> : 'Přihlásit se'}
            </button>
          </form>

          {googleEnabled && (
            <>
              <div className="my-6 flex items-center gap-3">
                <span className="mobile-login-divider h-px flex-1" />
                <span className="mobile-login-label text-[8px] font-extrabold uppercase tracking-[0.22em]">Správa systému</span>
                <span className="mobile-login-divider h-px flex-1" />
              </div>
              {renderGoogleButton('mobile')}
            </>
          )}

          <div className="my-6 flex items-center gap-3">
            <span className="mobile-login-divider h-px flex-1" />
            <span className="mobile-login-label text-[8px] font-extrabold uppercase tracking-[0.22em]">Vyberte roli</span>
            <span className="mobile-login-divider h-px flex-1" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {QUICK_ROLES.map(role => {
              const Icon = role.icon;
              const active = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleRoleSelect(role.id)}
                  disabled={isLoading || !selectedHospitalId}
                  aria-pressed={active}
                  className="mobile-login-role flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-1.5 py-3 disabled:opacity-40"
                  style={active ? { borderColor: role.tone, boxShadow: `0 0 0 1px ${role.tone}55` } : undefined}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-[11px]" style={{ color: role.tone, backgroundColor: `${role.tone}18` }}>
                    <Icon className="h-4 w-4" strokeWidth={1.9} />
                  </span>
                  <span className="block w-full truncate text-center text-[9px] font-extrabold">{role.label}</span>
                </button>
              );
            })}
          </div>

          <p className="mobile-login-label mt-3 text-center text-[10px] font-semibold">
            Role předvyplní přihlašovací jméno. Heslo zadejte výše.
          </p>
        </section>

        <footer className="mt-auto pt-10 text-center">
          <p className="mobile-login-footer text-[8px] font-extrabold uppercase tracking-[0.25em]">MEDROX Czech Republic and Canada</p>
        </footer>
      </main>
    </div>

    <div className="relative hidden min-h-screen w-full overflow-hidden bg-[#06101D] text-white md:flex md:flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(145deg, #07162B 0%, #0A1029 48%, #08091A 100%)',
        }}
      />
      <div aria-hidden className="login-aurora-flow pointer-events-none absolute" />
      <div aria-hidden className="login-aurora-vignette pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          background: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage: 'linear-gradient(to bottom, transparent, black 24%, black 68%, transparent)',
        }}
      />

      <header className="relative z-10 flex h-[84px] items-center px-9 lg:px-12">
        <div className="flex min-w-[180px] items-center">
          {desktopScreen !== 'intro' && (
            <button
              type="button"
              onClick={() => { setError(null); setDesktopScreen(desktopScreen === 'form' ? 'roles' : 'intro'); }}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-4 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Zpět
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-8 pb-[84px] pt-4">
        {desktopScreen === 'intro' && (
          <section className="w-full max-w-[940px] text-center">
            <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.34em] text-[#64B9CD]">Řízení operačních sálů v reálném čase</p>
            <div className="mx-auto inline-block">
              <h1 className="text-[clamp(3.5rem,7.2vw,7rem)] font-black leading-[0.82] tracking-[-0.065em] text-white">OPERATINGROOM</h1>
              <p className="mt-5 flex w-full justify-between text-[clamp(1rem,2.25vw,2rem)] font-bold uppercase leading-none text-white/72">
                {'MANAGEMENT SYSTEM'.split('').map((character, index) => character === ' '
                  ? <span key={index} aria-hidden className="w-[0.55em]" />
                  : <span key={index} aria-hidden>{character}</span>)}
              </p>
            </div>
            <p className="mx-auto mt-9 max-w-[560px] text-[14px] leading-7 text-white/38">Bezpečný systém pro správu, koordinaci a monitoring operačních sálů vašeho zdravotnického zařízení.</p>
            <button
              type="button"
              onClick={() => { setError(null); setDesktopScreen('roles'); }}
              className="group mx-auto mt-9 inline-flex h-[50px] items-center gap-3 rounded-xl border border-white/[0.13] bg-white/[0.06] px-7 text-[12px] font-bold text-white/88 shadow-[0_16px_40px_rgba(0,0,0,0.18)] transition-[transform,background-color,border-color] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.09]"
            >
              <LogIn className="h-4 w-4 text-[#64C2D2]" />
              Přihlášení
              <ChevronRight className="h-4 w-4 text-white/35 transition-transform group-hover:translate-x-0.5" />
            </button>
          </section>
        )}

        {desktopScreen === 'roles' && (
          <section className="w-full max-w-[760px] text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#64B9CD]">Vstup do systému</p>
            <h2 className="mt-3 text-[34px] font-extrabold tracking-[-0.035em] text-white">Přihlášení do aplikace</h2>
            <p className="mt-2 text-[13px] text-white/35">Vyberte zdravotnické zařízení a svou roli</p>

            {error && (
              <div className="mx-auto mt-6 flex max-w-[430px] items-start gap-2.5 rounded-xl border border-red-400/20 bg-red-400/[0.08] px-3.5 py-3 text-left text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-[12px] font-semibold leading-snug">{error}</span>
              </div>
            )}

            <div className="mx-auto mt-7 max-w-[430px] text-left">
              <label htmlFor="desktop-role-hospital" className="mb-2 block text-[8px] font-bold uppercase tracking-[0.22em] text-white/32">Zdravotnické zařízení</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64B9CD]" />
                <select
                  id="desktop-role-hospital"
                  value={selectedHospitalId}
                  onChange={event => { setSelectedHospitalId(event.target.value); setError(null); }}
                  disabled={hospitalsLoading || hospitals.length === 0}
                  className="h-[52px] w-full appearance-none rounded-xl border border-white/[0.08] bg-[#0C1828] pl-11 pr-11 text-[12px] font-semibold text-white/82 outline-none transition-colors focus:border-[#64B9CD]/45 disabled:opacity-50"
                >
                  {hospitalOptions}
                </select>
                {hospitalsLoading
                  ? <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/30" />
                  : <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {QUICK_ROLES.map(role => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleSelect(role.id)}
                    disabled={isLoading || !selectedHospitalId}
                    className="group flex min-h-[104px] flex-col items-center justify-center rounded-2xl border border-white/[0.065] bg-white/[0.03] px-5 text-center transition-[transform,background-color,border-color] hover:-translate-y-0.5 hover:border-white/[0.13] hover:bg-white/[0.055] disabled:opacity-40"
                  >
                    <span className="block max-w-full truncate text-[15px] font-bold text-white/90">{role.label}</span>
                    <span className="mt-2 block text-[10px] text-white/30">{role.description}</span>
                  </button>
                ))}
            </div>

            <p className="mt-4 text-[11px] text-white/28">
              Po výběru role zadáte heslo. Každé zdravotnické zařízení má vlastní hesla.
            </p>

            {googleEnabled && (
              <div className="mx-auto mt-7 max-w-[430px]">
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-white/[0.07]" />
                  <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/28">Správa systému</span>
                  <span className="h-px flex-1 bg-white/[0.07]" />
                </div>
                {renderGoogleButton('desktop')}
                <p className="mt-2.5 text-center text-[10px] text-white/25">
                  Superadministrátor — vyžaduje dvoufázové ověření
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setError(null); setDesktopScreen('form'); }}
              className="mx-auto mt-7 inline-flex items-center gap-2 text-[11px] font-semibold text-white/34 transition-colors hover:text-white/75"
            >
              <Lock className="h-3.5 w-3.5" />
              Přihlásit se vlastním účtem
            </button>
          </section>
        )}

        {desktopScreen === 'form' && (
          <section className="login-glass w-full max-w-[440px] rounded-[26px] p-8">
            <div className="mb-7 text-center">
              <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-[#64B9CD]">Vlastní účet</p>
              <h2 className="mt-3 text-[28px] font-extrabold tracking-[-0.03em]">Přihlášení</h2>
              <p className="mt-1.5 text-[12px] text-white/34">Zadejte své přihlašovací údaje</p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-400/20 bg-red-400/[0.08] px-3.5 py-3 text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-[12px] font-semibold leading-snug">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="desktop-form-hospital" className="mb-2 block text-[8px] font-bold uppercase tracking-[0.2em] text-white/32">Zdravotnické zařízení</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
                  <select id="desktop-form-hospital" value={selectedHospitalId} onChange={event => { setSelectedHospitalId(event.target.value); setError(null); }} disabled={hospitalsLoading || hospitals.length === 0} className="login-glass-field h-[50px] w-full appearance-none rounded-xl pl-11 pr-11 text-[12px] font-semibold text-white/82 outline-none focus:border-[#64B9CD]/45 disabled:opacity-50">{hospitalOptions}</select>
                  {hospitalsLoading ? <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/28" /> : <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />}
                </div>
              </div>

              <div>
                <label htmlFor="desktop-form-email" className="mb-2 block text-[8px] font-bold uppercase tracking-[0.2em] text-white/32">Uživatelské jméno</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
                  <input id="desktop-form-email" type="text" inputMode="email" autoCapitalize="none" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="jmeno.prijmeni" required className="login-glass-field h-[50px] w-full rounded-xl pl-11 pr-4 text-[12px] font-semibold text-white outline-none placeholder:text-white/20 focus:border-[#64B9CD]/45" />
                </div>
              </div>

              <div>
                <label htmlFor="desktop-form-password" className="mb-2 block text-[8px] font-bold uppercase tracking-[0.2em] text-white/32">Heslo</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
                  <input id="desktop-form-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" required className="login-glass-field h-[50px] w-full rounded-xl pl-11 pr-12 text-[12px] font-semibold text-white outline-none placeholder:text-white/20 focus:border-[#64B9CD]/45" />
                  <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/28 transition-colors hover:text-white/70" aria-label={showPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading || !selectedHospitalId} className="flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#E7F2F6] text-[12px] font-extrabold text-[#09243D] transition-colors hover:bg-white disabled:opacity-50">
                {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Přihlašování…</> : 'Přihlásit se'}
              </button>
            </form>
          </section>
        )}
      </main>

      <footer className="relative z-10 px-8 pb-7 text-center">
        <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/16">MEDROX Czech Republic and Canada</p>
      </footer>
    </div>
    </>
  );
};

export default LoginPage;
