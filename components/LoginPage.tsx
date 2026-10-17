import React, { useEffect, useState } from 'react';
import './login-orbit.css';
import * as HospitalMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '../contexts/AuthContext';
import NativeGoogleAuthOverlay from './NativeGoogleAuthOverlay';
import {
  hasPendingNativeGoogleCallback,
  isNativeGoogleAuthPlatform,
  NATIVE_GOOGLE_CALLBACK_EVENT,
  resolveNativeGoogleHospitalId,
} from '../lib/auth/native-google-client';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  Check,
  ClipboardList,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Shield,
  Stethoscope,
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
 * Kliknutí na roli proto určí přihlašovací účet a vyžádá heslo.
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
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<LoginHospital[]>([]);
  // The server and the browser must start with the same value. Reading
  // localStorage here leaves the server-rendered role buttons disabled while
  // the first browser render expects them to be enabled, so React cannot
  // safely hydrate their `disabled` attribute. The hospital-loading effect
  // below restores the persisted value after mount.
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [hospitalsLoading, setHospitalsLoading] = useState(true);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [nativeGoogleOpen, setNativeGoogleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<QuickRoleId | null>(null);

  /** Údaje právě vybrané role — používá je rozbalený řádek s heslem. */
  const activeRole = QUICK_ROLES.find(role => role.id === selectedRole) ?? null;

  useEffect(() => {

    // A system-browser callback can cold-start the WebView. In that case the
    // callback was persisted by mobile/main.tsx before React mounted.
    if (!isNativeGoogleAuthPlatform()) return;

    const resumeNativeGoogle = () => setNativeGoogleOpen(true);
    window.addEventListener(NATIVE_GOOGLE_CALLBACK_EVENT, resumeNativeGoogle);
    // Subscribe before checking storage so a callback arriving between these
    // two operations cannot be missed during an iOS cold start.
    if (hasPendingNativeGoogleCallback()) resumeNativeGoogle();
    return () => window.removeEventListener(NATIVE_GOOGLE_CALLBACK_EVENT, resumeNativeGoogle);
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
   * dořeší návratová stránka /prihlaseni/spravce.
   */
  const handleGoogleLogin = async () => {
    setError(null);
    if (!selectedHospitalId) {
      setError('Vyberte zdravotnické zařízení');
      return;
    }

    // Keep the existing web redirect flow exactly as-is. Only Capacitor iOS
    // opens the provider in the system browser and finishes in the overlay.
    if (isNativeGoogleAuthPlatform()) {
      setNativeGoogleOpen(true);
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
        // Storage access can be blocked by browser privacy settings. The
        // resolver handles that case and keeps the successfully loaded
        // hospital list usable instead of turning it into a login error.
        const stored = resolveNativeGoogleHospitalId('');
        const primaryHospital = next.find(item =>
          item.hospital_short_name?.trim().toLocaleLowerCase('cs-CZ') === 'knl'
          || item.hospital_name.toLocaleLowerCase('cs-CZ').includes('krajská nemocnice liberec')
        );
        setSelectedHospitalId(
          (next.some(item => item.id === stored) ? stored! : '')
          || primaryHospital?.id
          || next[0]?.id
          || ''
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
    if (!activeRole || !password || isLoading) return;
    void submitCredentials(activeRole.email, password);
  };

  /** Návrat k výběru role — z tlačítka, z klávesy Escape i opětovným klikem na dlaždici. */
  const resetQuickRole = () => {
    setSelectedRole(null);
    setPassword('');
    setShowPassword(false);
    setError(null);
  };

  /**
   * Výběr role určí přihlašovací účet a zpřístupní pouze pole hesla.
   * Heslo se liší podle zvoleného zařízení, takže ho nelze předvyplnit.
   */
  const handleRoleSelect = (roleId: QuickRoleId) => {
    const role = QUICK_ROLES.find(item => item.id === roleId);
    if (!role) return;

    setError(null);
    setPassword('');
    setSelectedRole(roleId);

    window.setTimeout(() => {
      const field = document.getElementById('mobile-role-password')
        ?? document.getElementById('desktop-role-password');
      (field as HTMLInputElement | null)?.focus();
    }, 60);
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

  const renderHospitalPicker = (id: string, className: string) => {
    const selectedHospital = hospitals.find(hospital => hospital.id === selectedHospitalId);
    return (
      <HospitalMenu.Root>
        <HospitalMenu.Trigger asChild>
          <button id={id} type="button" disabled={hospitalsLoading || hospitals.length === 0}
            className={`login-hospital-trigger ${className}`}>
            <Building2 aria-hidden="true" className="login-hospital-leading" strokeWidth={1.6} />
            <span>{hospitalsLoading ? 'Načítání zařízení…' : selectedHospital?.hospital_name || 'Žádné zařízení není dostupné'}</span>
            {hospitalsLoading ? <Loader2 aria-hidden="true" className="animate-spin" /> : <ChevronDown aria-hidden="true" />}
          </button>
        </HospitalMenu.Trigger>
        <HospitalMenu.Portal>
          <HospitalMenu.Content className="login-hospital-menu" align="start" sideOffset={8} collisionPadding={16} aria-label="Zdravotnické zařízení">
            <HospitalMenu.Label className="login-hospital-menu-title">Vyberte zdravotnické zařízení</HospitalMenu.Label>
            <HospitalMenu.RadioGroup value={selectedHospitalId} onValueChange={value => { setSelectedHospitalId(value); setError(null); }} data-picker-id={id}>
              {hospitals.map(hospital => (
                <HospitalMenu.RadioItem key={hospital.id} value={hospital.id} className="login-hospital-option" textValue={hospital.hospital_name}>
                  <Building2 aria-hidden="true" size={20} strokeWidth={1.5} />
                  <span>{hospital.hospital_name}{hospital.hospital_short_name && <small>{hospital.hospital_short_name}</small>}</span>
                  <HospitalMenu.ItemIndicator><Check size={18} aria-hidden="true" /></HospitalMenu.ItemIndicator>
                </HospitalMenu.RadioItem>
              ))}
            </HospitalMenu.RadioGroup>
          </HospitalMenu.Content>
        </HospitalMenu.Portal>
      </HospitalMenu.Root>
    );
  };

  return (
    <>
    <NativeGoogleAuthOverlay
      open={nativeGoogleOpen}
      hospitalId={selectedHospitalId}
      onClose={() => setNativeGoogleOpen(false)}
      onAuthenticated={() => {
        setGoogleLoading(true);
        // /api/auth/google issued the HttpOnly application cookie. Reloading
        // lets AuthProvider bootstrap from /api/auth/me without exposing it.
        window.location.reload();
      }}
    />
    <div className="login-orbit mobile-login-page relative min-h-[100dvh] w-full overflow-x-hidden md:hidden">
      <div aria-hidden className="login-aurora-flow mobile-login-aurora pointer-events-none fixed" />
      <div aria-hidden className="login-aurora-vignette mobile-login-vignette pointer-events-none fixed inset-0" />

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

      <main className="mobile-login-main relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[460px] flex-col">
        <header className="mobile-login-header">
          <h1 className="mobile-login-brand">
            <img src="/images/mobile-login-logo.webp" width="440" height="740"
              alt="Operating Room manager application" fetchPriority="high" decoding="async" />
          </h1>
        </header>

        <section className="mobile-login-content">
          {error && (
            <div role="alert" className="mobile-login-error mb-5 flex items-start gap-2.5 rounded-2xl px-4 py-3.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="text-[12px] font-semibold leading-snug">{error}</span>
            </div>
          )}

          {selectedRole && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="mobile-login-selected-role">
                <span className="login-role-icon" aria-hidden="true">
                  {activeRole && <activeRole.icon className="h-6 w-6" strokeWidth={2} />}
                </span>
                <div className="min-w-0">
                  <p className="mobile-login-label">Přihlášení jako</p>
                  <p className="mobile-login-selected-title">{activeRole?.label}</p>
                  <p className="mobile-login-selected-hospital">{hospitals.find(hospital => hospital.id === selectedHospitalId)?.hospital_name}</p>
                </div>
              </div>
              <div>
                <label htmlFor="mobile-role-password" className="mobile-login-label mb-2.5 block">Heslo</label>
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
                    className="mobile-login-field h-[58px] w-full rounded-[17px] pl-12 pr-12 text-[15px] font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(value => !value)}
                    className="mobile-login-field-icon mobile-login-password-toggle absolute right-1.5 top-1/2 -translate-y-1/2"
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

          {!selectedRole && <div className="space-y-5">
            <div>
              <label htmlFor="login-hospital" className="sr-only">Zdravotnické zařízení</label>
              {renderHospitalPicker('login-hospital', 'mobile-login-field w-full disabled:opacity-50')}
            </div>

          </div>}

          {!selectedRole && (
            <div className="mobile-login-roles-section">
              <div className="mobile-login-role-grid">
                {QUICK_ROLES.map(role => {
                  const Icon = role.icon;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleRoleSelect(role.id)}
                      disabled={isLoading || !selectedHospitalId}
                      className="mobile-login-role disabled:opacity-40"
                      style={{ '--login-role-tone': role.tone } as React.CSSProperties}
                    >
                      <span className="login-role-icon" aria-hidden="true">
                        <Icon className="h-6 w-6" strokeWidth={2} />
                      </span>
                      <span className="mobile-login-role-label">{role.label}</span>
                    </button>
                  );
                })}
              </div>

            </div>
          )}

          {googleEnabled && !selectedRole && (
            <div className="mobile-login-system">
              <div className="mb-4 flex items-center gap-3">
                <span className="mobile-login-divider h-px flex-1" />
                <span className="mobile-login-label">Správa systému</span>
                <span className="mobile-login-divider h-px flex-1" />
              </div>
              {renderGoogleButton('mobile')}
            </div>
          )}
        </section>

        <footer className="mt-auto pt-10 text-center">
          <p className="mobile-login-footer"><strong>MEDROX</strong><span>Czech Republic and Canada</span></p>
        </footer>
      </main>
    </div>

    {/* Pevná výška okna místo min-h-screen: stránka se nesmí rolovat.
        Rozměry uvnitř proto počítají i s výškou okna, ne jen se šířkou —
        na širokém, ale nízkém okně by jinak nadpis zůstal obrovský. */}
    {/* Rozměry uvnitř počítají i s výškou okna, takže se obsah vejde bez
        rolování. `overflow-y: auto` je jen pojistka pro extrémně nízké okno —
        tam je lepší nechat odrolovat než tlačítko oříznout a znepřístupnit. */}
    <div className="login-desktop-page app-module-background relative hidden h-[100dvh] w-full overflow-x-hidden overflow-y-auto text-white md:flex md:flex-col">
      {/* Dekorace v ořezávající vrstvě.
          Aurora má záporný inset, aby při pohybu nikde neodhalila okraj —
          tím ale přesahovala pod spodní hranu okna o stovky pixelů a dělala
          ze stránky rolovatelnou plochu. Rolovalo se tedy kvůli pozadí,
          ne kvůli obsahu. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="app-module-background absolute inset-0" />
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
              <label htmlFor="desktop-role-hospital" className="sr-only">Zdravotnické zařízení</label>
              {renderHospitalPicker('desktop-role-hospital', 'login-glass-field w-full disabled:opacity-50')}
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
