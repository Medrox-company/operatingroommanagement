import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  ChevronDown,
  ClipboardList,
  Eye,
  EyeOff,
  Loader2,
  Lock,
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

  /** Údaje právě vybrané role — používá je rozbalený řádek s heslem. */
  const activeRole = QUICK_ROLES.find(role => role.id === selectedRole) ?? null;

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

  /** Návrat k výběru role — z tlačítka, z klávesy Escape i opětovným klikem na dlaždici. */
  const resetQuickRole = () => {
    setSelectedRole(null);
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setError(null);
  };

  /**
   * Výběr role předvyplní přihlašovací jméno a zpřístupní pouze pole hesla.
   * Heslo se liší podle zvoleného zařízení, takže ho nelze předvyplnit.
   */
  const handleRoleSelect = (roleId: QuickRoleId) => {
    const role = QUICK_ROLES.find(item => item.id === roleId);
    if (!role) return;

    setError(null);
    setEmail(role.email);
    setPassword('');
    setSelectedRole(roleId);

    window.setTimeout(() => {
      const field = document.getElementById('mobile-role-password')
        ?? document.getElementById('desktop-role-password')
        ?? document.getElementById('login-password');
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
      : 'login-glass-action flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl text-[12px] font-bold text-white/85 transition-colors';

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

      {selectedRole && (
        <button
          type="button"
          onClick={resetQuickRole}
          className="mobile-login-theme-toggle fixed left-5 z-30 inline-flex h-11 items-center gap-2 rounded-2xl px-3.5 text-[10px] font-extrabold uppercase tracking-[0.16em]"
          style={{ top: 'max(18px, env(safe-area-inset-top))' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Zpět
        </button>
      )}

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

          {selectedRole && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="mobile-role-password" className="mobile-login-label mb-2.5 block text-[10px] font-extrabold uppercase tracking-[0.2em]">Heslo</label>
                <div className="relative">
                  <Lock className="mobile-login-field-icon pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" strokeWidth={1.8} />
                  <input
                    id="mobile-role-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    placeholder="Zadejte heslo"
                    required
                    className="mobile-login-field h-[58px] w-full rounded-[17px] pl-12 pr-12 text-[15px] font-semibold outline-none"
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
                disabled={isLoading || !password || !selectedHospitalId}
                className="mobile-login-submit flex h-[58px] w-full items-center justify-center gap-2 rounded-full text-[16px] font-extrabold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? <><Loader2 className="h-5 w-5 animate-spin" /> Přihlašování…</> : 'Přihlásit se'}
              </button>
            </form>
          )}

          {!selectedRole && <form onSubmit={handleSubmit} className="space-y-5">
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
          </form>}

          {googleEnabled && !selectedRole && (
            <>
              <div className="my-6 flex items-center gap-3">
                <span className="mobile-login-divider h-px flex-1" />
                <span className="mobile-login-label text-[8px] font-extrabold uppercase tracking-[0.22em]">Správa systému</span>
                <span className="mobile-login-divider h-px flex-1" />
              </div>
              {renderGoogleButton('mobile')}
            </>
          )}

          {!selectedRole && (
            <>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {QUICK_ROLES.map(role => {
                  const Icon = role.icon;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleRoleSelect(role.id)}
                      disabled={isLoading || !selectedHospitalId}
                      className="mobile-login-role flex aspect-square min-w-0 flex-col items-center justify-center gap-2 rounded-[24px] px-2 disabled:opacity-40"
                      style={{ '--login-role-tone': role.tone } as React.CSSProperties}
                    >
                      <span className="grid h-11 w-11 place-items-center rounded-[15px]" style={{ color: role.tone, backgroundColor: `${role.tone}18` }}>
                        <Icon className="h-5 w-5" strokeWidth={1.8} />
                      </span>
                      <span className="block w-full truncate text-center text-[10px] font-extrabold">{role.label}</span>
                    </button>
                  );
                })}
              </div>

            </>
          )}
        </section>

        <footer className="mt-auto pt-10 text-center">
          <p className="mobile-login-footer text-[8px] font-extrabold uppercase tracking-[0.25em]">MEDROX Czech Republic and Canada</p>
        </footer>
      </main>
    </div>

    <div className="relative hidden min-h-screen w-full overflow-x-hidden bg-[#06101D] text-white md:flex md:flex-col">
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
          {selectedRole && (
            <button
              type="button"
              onClick={resetQuickRole}
              className="inline-flex items-center gap-2 px-1 py-2 text-[9px] font-bold uppercase tracking-[0.24em] text-white/42 transition-colors hover:text-white/80"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Zpět
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-8 pb-16 pt-4">
        <section className="w-full max-w-[1040px] pb-8 text-center">
            <div className="mx-auto max-w-[960px]">
              <h1 className="login-wordmark text-[clamp(3.45rem,6.8vw,6.8rem)] font-black leading-[0.84] tracking-[-0.075em] text-white">
                OPERATINGROOM
              </h1>
              <p className="mt-5 text-[clamp(0.72rem,1.25vw,1.05rem)] font-bold uppercase tracking-[0.52em] text-white/72">
                Management system
              </p>
            </div>

            {error && (
              <div className="mx-auto mt-6 flex max-w-[760px] items-start gap-2.5 rounded-xl bg-red-400/[0.08] px-3.5 py-3 text-left text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-[12px] font-semibold leading-snug">{error}</span>
              </div>
            )}

            {/* Zařízení zůstává vidět i po výběru role, jen ustoupí do pozadí —
                jinak by uživatel při zadávání hesla ztratil kontext, kam se hlásí. */}
            <div
              className="mx-auto mt-8 max-w-[760px] transition-opacity duration-300"
              style={{ opacity: selectedRole ? 0.4 : 1 }}
            >
              <label htmlFor="desktop-role-hospital" className="mb-2.5 block text-[8px] font-semibold uppercase tracking-[0.34em] text-white/24">Zdravotnické zařízení</label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64B9CD]" />
                <select
                  id="desktop-role-hospital"
                  value={selectedHospitalId}
                  onChange={event => { setSelectedHospitalId(event.target.value); setError(null); }}
                  disabled={hospitalsLoading || hospitals.length === 0}
                  className="login-glass-field h-[58px] w-full appearance-none rounded-[20px] pl-14 pr-12 text-[14px] font-semibold text-white/86 outline-none transition-colors disabled:opacity-50"
                >
                  {hospitalOptions}
                </select>
                {hospitalsLoading
                  ? <Loader2 className="absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/30" />
                  : <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/32" />}
              </div>
            </div>

            <div className="mx-auto mt-8 max-w-[930px]">
              <div className="grid grid-cols-5 gap-4">
                {QUICK_ROLES.map(role => {
                  const Icon = role.icon;
                  const active = selectedRole === role.id;
                  const dimmed = selectedRole !== null && !active;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => (active ? resetQuickRole() : handleRoleSelect(role.id))}
                      disabled={isLoading || !selectedHospitalId}
                      aria-pressed={active}
                      data-dimmed={dimmed ? 'true' : undefined}
                      className="login-role-tile flex aspect-square flex-col items-center justify-center gap-3 rounded-[28px] px-3 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ '--login-role-tone': role.tone } as React.CSSProperties}
                    >
                      <span
                        className="grid h-14 w-14 place-items-center rounded-[20px] transition-colors duration-300"
                        style={{ color: role.tone, backgroundColor: `${role.tone}${active ? '26' : '14'}` }}
                      >
                        <Icon className="h-7 w-7" strokeWidth={1.6} />
                      </span>
                      <span className="block whitespace-nowrap text-[12.5px] font-semibold text-white/88">{role.label}</span>
                      <span
                        className="-mt-2 block whitespace-nowrap text-[9px] transition-colors duration-300"
                        style={{ color: active ? role.tone : 'rgba(255,255,255,0.28)' }}
                      >
                        {active ? 'Vybráno' : role.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Heslo se rozbalí pod dlaždicemi, aniž by se odcházelo na jinou
                stránku. Prvek je v DOM pořád — jinak by nebylo co animovat. */}
            <div
              className="login-password-reveal mx-auto max-w-[930px]"
              data-open={selectedRole ? 'true' : undefined}
              aria-hidden={selectedRole ? undefined : true}
            >
              <div>
                <form onSubmit={handleSubmit} className="login-glass-field mt-4 flex items-center gap-3.5 rounded-[22px] p-4">
                  <div className="flex items-center gap-3 pr-4">
                    <span
                      className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[13px]"
                      style={activeRole ? { color: activeRole.tone, backgroundColor: `${activeRole.tone}26` } : undefined}
                    >
                      {activeRole ? <activeRole.icon className="h-[19px] w-[19px]" strokeWidth={1.7} /> : null}
                    </span>
                    <div className="text-left">
                      <p className="whitespace-nowrap text-[12.5px] font-semibold text-white/88">{activeRole?.label}</p>
                      <p className="whitespace-nowrap text-[9px] text-white/28">{activeRole?.email}</p>
                    </div>
                  </div>

                  <label htmlFor="desktop-role-password" className="sr-only">
                    Heslo pro roli {activeRole?.label}
                  </label>
                  <div className="relative min-w-0 flex-1">
                    <Lock className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
                    <input
                      id="desktop-role-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      onKeyDown={event => { if (event.key === 'Escape') resetQuickRole(); }}
                      placeholder="Zadejte heslo"
                      required={Boolean(selectedRole)}
                      tabIndex={selectedRole ? undefined : -1}
                      className="login-glass-field h-[50px] w-full rounded-[16px] pl-12 pr-12 text-[13px] font-medium text-white outline-none placeholder:text-white/24"
                    />
                    <button
                      type="button"
                      tabIndex={selectedRole ? undefined : -1}
                      onClick={() => setShowPassword(value => !value)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/26 transition-colors hover:text-white/70"
                      aria-label={showPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !password || !selectedHospitalId}
                    tabIndex={selectedRole ? undefined : -1}
                    className="login-glass-action flex h-[50px] min-w-[158px] items-center justify-center gap-2 rounded-[16px] px-6 text-[12px] font-bold text-white/90 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4 text-[#64B9CD]" />}
                    {isLoading ? 'Přihlašování…' : 'Přihlásit se'}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={resetQuickRole}
                  tabIndex={selectedRole ? undefined : -1}
                  className="mx-auto mt-3.5 inline-flex items-center gap-2 text-[10.5px] font-medium text-white/30 transition-colors hover:text-white/70"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Zvolit jinou roli
                </button>
              </div>
            </div>

            {googleEnabled && !selectedRole && (
              <>
                <div className="mx-auto mb-4 mt-8 flex max-w-[760px] items-center gap-5">
                  <span className="h-px flex-1 bg-white/[0.085]" />
                  <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/28">Správa systému</span>
                  <span className="h-px flex-1 bg-white/[0.085]" />
                </div>
                <div className="mx-auto max-w-[370px]">
                  {renderGoogleButton('desktop')}
                </div>
                <p className="mt-2.5 text-[10px] text-white/25">
                  Superadministrátor — vyžaduje dvoufázové ověření
                </p>
              </>
            )}

        </section>
      </main>

      <footer className="relative z-10 px-8 pb-7 text-center">
        <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/16">MEDROX Czech Republic and Canada</p>
      </footer>
    </div>
    </>
  );
};

export default LoginPage;
