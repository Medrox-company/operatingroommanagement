import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
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
 * Navíc má od scripts/22 každá role v každé nemocnici vlastní heslo, takže
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
  { id: 'management', label: 'Management', email: 'management@nemocnice.cz', icon: BriefcaseBusiness, tone: '#8B7AD8', description: 'Vedení' },
  { id: 'primar', label: 'Primariát', email: 'primar@nemocnice.cz', icon: ClipboardList, tone: '#C76F9B', description: 'Primář' },
];

const GoogleMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
    <path fill="currentColor" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="currentColor" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="currentColor" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="currentColor" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
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
        Přihlášení superadministrátora
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

      <main className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[460px] flex-col px-[clamp(18px,7vw,42px)] pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(68px,calc(env(safe-area-inset-top)+54px))]">
        <header className="flex flex-col items-center text-center">
          <h1 className="mobile-login-title mt-5 max-w-[380px] text-balance text-[clamp(1.85rem,8.5vw,2.8rem)] font-semibold leading-[0.98] tracking-[-0.055em]">
            Operatingroom management system
          </h1>
          <p className="mobile-login-subtitle mt-4 max-w-[370px] text-[11.5px] font-medium leading-[1.55]">
            Systém pro správu a monitoring operačních sálů v reálném čase. Propojuje živý přehled, tok pacienta, časovou osu, personál, upozornění a provozní statistiky.
          </p>
        </header>

        <section className="mt-8 sm:mt-10">
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
                  className="login-hospital-select mobile-login-field h-[58px] w-full appearance-none rounded-[17px] pl-12 pr-12 text-[15px] font-bold outline-none disabled:opacity-50"
                  style={{ colorScheme: 'dark' }}
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
              <div className="mt-6 grid grid-cols-2 gap-[clamp(10px,3vw,14px)] min-[390px]:grid-cols-3">
                {QUICK_ROLES.map(role => {
                  const Icon = role.icon;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleRoleSelect(role.id)}
                      disabled={isLoading || !selectedHospitalId}
                      className="mobile-login-role flex aspect-square min-w-0 flex-col items-center justify-center gap-2 rounded-[clamp(18px,5vw,24px)] px-2 disabled:opacity-40"
                      style={{ '--login-role-tone': role.tone } as React.CSSProperties}
                    >
                      <span className="login-role-icon grid h-12 w-12 place-items-center">
                        <Icon className="h-[30px] w-[30px]" strokeWidth={2.05} />
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

    {/* Pevná výška okna místo min-h-screen: stránka se nesmí rolovat.
        Rozměry uvnitř proto počítají i s výškou okna, ne jen se šířkou —
        na širokém, ale nízkém okně by jinak nadpis zůstal obrovský. */}
    {/* Rozměry uvnitř počítají i s výškou okna, takže se obsah vejde bez
        rolování. `overflow-y: auto` je jen pojistka pro extrémně nízké okno —
        tam je lepší nechat odrolovat než tlačítko oříznout a znepřístupnit. */}
    <div className="relative hidden h-[100dvh] w-full overflow-x-hidden overflow-y-auto bg-[#06101D] text-white md:flex md:flex-col">
      {/* Dekorace v ořezávající vrstvě.
          Aurora má záporný inset, aby při pohybu nikde neodhalila okraj —
          tím ale přesahovala pod spodní hranu okna o stovky pixelů a dělala
          ze stránky rolovatelnou plochu. Rolovalo se tedy kvůli pozadí,
          ne kvůli obsahu. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(145deg, #07162B 0%, #0A1029 48%, #08091A 100%)',
          }}
        />
        <div className="login-aurora-flow absolute" />
        <div className="login-aurora-vignette absolute inset-0" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            background: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
            maskImage: 'linear-gradient(to bottom, transparent, black 24%, black 68%, transparent)',
          }}
        />
      </div>

      <header className="relative z-10 flex h-[clamp(48px,7vh,84px)] shrink-0 items-center px-9 lg:px-12">
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

      <main className="login-desktop-main relative z-10 flex min-h-0 flex-1 items-center justify-center px-[clamp(18px,4vw,32px)] pb-[clamp(10px,2.6vh,64px)] pt-[clamp(4px,1vh,16px)]">
        <section className="w-full max-w-[1040px] text-center">
            <div className="mx-auto max-w-[960px]">
              {/* min(vw, vh) drží nadpis v rozumné velikosti i na širokém,
                  ale nízkém okně — dřív se řídil jen šířkou. */}
              <h1 className="login-wordmark text-[clamp(2.2rem,min(6.8vw,10vh),6.8rem)] font-semibold leading-[0.88] tracking-[-0.06em] text-white">
                OPERATINGROOM
              </h1>
              <p className="mt-[clamp(5px,1.4vh,20px)] text-[clamp(0.6rem,min(1.25vw,1.55vh),1.05rem)] font-bold uppercase tracking-[0.52em] text-white/72">
                Management system
              </p>
              <p className="mx-auto mt-[clamp(4px,1.1vh,16px)] max-w-[680px] text-[clamp(0.6rem,min(0.78vw,1.05vh),0.78rem)] font-medium leading-[1.55] text-white/46">
                Systém pro správu a monitoring operačních sálů v reálném čase. Propojuje živý přehled, tok pacienta, časovou osu, personál, upozornění a provozní statistiky.
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
              className="mx-auto mt-[clamp(10px,2.2vh,28px)] max-w-[760px] transition-opacity duration-300"
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
                  className="login-hospital-select login-glass-field h-[58px] w-full appearance-none rounded-[20px] pl-14 pr-12 text-[14px] font-semibold text-white/86 outline-none transition-colors disabled:opacity-50"
                  style={{ colorScheme: 'dark' }}
                >
                  {hospitalOptions}
                </select>
                {hospitalsLoading
                  ? <Loader2 className="absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/30" />
                  : <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/32" />}
              </div>
            </div>

            <div className="mx-auto mt-[clamp(12px,2.6vh,34px)] w-full max-w-[930px]">
              <div className="grid grid-cols-5 gap-[clamp(8px,1.5vw,16px)]">
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
                      className="login-role-tile flex aspect-square min-w-0 flex-col items-center justify-center gap-[clamp(7px,1.5vh,12px)] rounded-[clamp(18px,2.3vw,28px)] px-[clamp(6px,1.2vw,12px)] disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ '--login-role-tone': role.tone } as React.CSSProperties}
                    >
                      <span className="login-role-icon grid h-[clamp(38px,5vw,64px)] w-[clamp(38px,5vw,64px)] place-items-center">
                        <Icon className="h-[clamp(25px,3vw,38px)] w-[clamp(25px,3vw,38px)]" strokeWidth={2.1} />
                      </span>
                      <span className="block max-w-full truncate whitespace-nowrap text-[clamp(10px,1vw,12.5px)] font-semibold text-white/88">{role.label}</span>
                      <span
                        className="-mt-1.5 block max-w-full truncate whitespace-nowrap text-[clamp(7.5px,0.72vw,9px)] transition-colors duration-300"
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
              className="login-password-reveal mx-auto w-full max-w-[942px]"
              data-open={selectedRole ? 'true' : undefined}
              aria-hidden={selectedRole ? undefined : true}
            >
              <div>
                <form onSubmit={handleSubmit} className="login-glass-row mt-4 flex items-center gap-[clamp(8px,1.4vw,14px)] rounded-[22px] p-[clamp(10px,1.6vw,16px)]">
                  <div className="flex min-w-0 items-center gap-3 pr-[clamp(4px,1vw,16px)]">
                    <span className="login-role-badge grid h-[38px] w-[38px] shrink-0 place-items-center">
                      {activeRole ? <activeRole.icon className="h-[26px] w-[26px]" strokeWidth={2} /> : null}
                    </span>
                    <div className="min-w-0 text-left">
                      <p className="truncate whitespace-nowrap text-[12.5px] font-semibold text-white/88">{activeRole?.label}</p>
                      <p className="truncate whitespace-nowrap text-[9px] text-white/28">{activeRole?.email}</p>
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
                    className="login-glass-action flex h-[50px] min-w-[clamp(126px,15vw,158px)] items-center justify-center gap-2 whitespace-nowrap rounded-[16px] px-[clamp(14px,2vw,24px)] text-[clamp(10.5px,1vw,12px)] font-bold text-white/90 disabled:cursor-not-allowed disabled:opacity-45"
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
                <div className="mx-auto mb-[clamp(8px,1.6vh,16px)] mt-[clamp(12px,2.6vh,34px)] flex max-w-[760px] items-center gap-5">
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
