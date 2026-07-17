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
  Shield,
  Stethoscope,
  User,
  type LucideIcon,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

type QuickRoleId = 'admin' | 'user' | 'aro' | 'cos' | 'management' | 'primar';
type DesktopScreen = 'intro' | 'roles' | 'form';

interface LoginHospital {
  id: string;
  hospital_name: string;
  hospital_short_name: string | null;
}

const QUICK_ROLES: Array<{
  id: QuickRoleId;
  label: string;
  email: string;
  password: string;
  icon: LucideIcon;
  tone: string;
  description: string;
}> = [
  { id: 'admin', label: 'Administrátor', email: 'admin@nemocnice.cz', password: 'admin123', icon: Shield, tone: '#D99C35', description: 'Plný přístup' },
  { id: 'aro', label: 'ARO', email: 'aro@nemocnice.cz', password: 'aro123', icon: Activity, tone: '#24A8C8', description: 'Anestezie' },
  { id: 'cos', label: 'COS', email: 'cos@nemocnice.cz', password: 'cos123', icon: Stethoscope, tone: '#2AAE82', description: 'Operační sály' },
  { id: 'management', label: 'Management', email: 'management@nemocnice.cz', password: 'mgmt123', icon: Briefcase, tone: '#8B7AD8', description: 'Vedení' },
  { id: 'primar', label: 'Primariát', email: 'primar@nemocnice.cz', password: 'primar123', icon: ClipboardList, tone: '#C76F9B', description: 'Primář' },
  { id: 'user', label: 'Uživatel', email: 'user@nemocnice.cz', password: 'user123', icon: User, tone: '#70839F', description: 'Standardní' },
];

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
        setSelectedHospitalId(next.some(item => item.id === stored) ? stored! : (next[0]?.id || ''));
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

  const handleQuickLogin = async (roleId: QuickRoleId) => {
    const role = QUICK_ROLES.find(item => item.id === roleId);
    if (!role) return;

    setEmail(role.email);
    setPassword(role.password);
    await submitCredentials(role.email, role.password);
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
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-[#F3F6FC] text-[#102D5C] md:hidden">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 hidden md:block"
        style={{
          background: 'radial-gradient(circle at 18% 12%, rgba(31,85,137,0.22), transparent 34%), radial-gradient(circle at 82% 82%, rgba(18,119,132,0.12), transparent 30%), linear-gradient(145deg, #091524 0%, #07111F 48%, #050B14 100%)',
        }}
      />

      <main className="relative z-10 mx-auto grid w-full max-w-[1240px] items-center gap-10 px-5 pb-10 pt-10 sm:px-8 md:min-h-[calc(100dvh-158px)] md:grid-cols-[minmax(0,1fr)_470px] md:px-10 md:pb-14 md:pt-2 lg:gap-20">
        <section className="mx-auto w-full max-w-[560px] text-center md:mx-0 md:text-left">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8293AC] md:text-[#71BBD1]">Živý operační program</p>
          <h1 className="mt-4 text-[40px] font-extrabold leading-[0.98] tracking-[-0.045em] text-[#102D5C] sm:text-[48px] md:text-[58px] md:text-white lg:text-[66px]">
            Operační sály<br />pod kontrolou.
          </h1>
          <p className="mx-auto mt-5 max-w-[470px] text-[15px] leading-7 text-[#71819A] md:mx-0 md:text-[16px] md:text-white/48">
            Bezpečný přístup k aktuálnímu provozu, týmům a harmonogramu vašeho zdravotnického zařízení.
          </p>

          <div className="mt-7 hidden grid-cols-3 gap-3 md:grid">
            {[
              ['01', 'Vyberte zařízení'],
              ['02', 'Přihlaste se'],
              ['03', 'Sledujte provoz'],
            ].map(([number, label]) => (
              <div key={number} className="rounded-2xl border border-white/[0.065] bg-white/[0.025] px-4 py-3.5">
                <span className="text-[10px] font-bold text-[#55BED0]">{number}</span>
                <p className="mt-1.5 text-[11px] font-medium text-white/48">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[470px] rounded-[28px] border border-[#DCE5F1] bg-white p-5 shadow-[0_24px_70px_rgba(34,60,98,0.13)] sm:p-7 md:border-white/[0.08] md:bg-[#0D1929]/95 md:p-8 md:shadow-[0_28px_80px_rgba(0,0,0,0.34)]">
          <div className="mb-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#8798B2] md:text-white/35">Vstup do systému</p>
            <h2 className="mt-2 text-[25px] font-extrabold tracking-[-0.025em] text-[#102D5C] md:text-white">Přihlášení</h2>
            <p className="mt-1 text-[12px] text-[#8291A8] md:text-white/38">Zadejte své přihlašovací údaje</p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#F0C8CC] bg-[#FFF2F3] px-3.5 py-3 text-[#B53D49] md:border-red-400/20 md:bg-red-400/[0.08] md:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="text-[12px] font-semibold leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-hospital" className="mb-2 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#8A9AB3] md:text-white/38">
                Zdravotnické zařízení
              </label>
              <div className="group relative">
                <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7086A5] transition-colors group-focus-within:text-[#1D6799] md:text-white/30 md:group-focus-within:text-[#55BED0]" />
                <select
                  id="login-hospital"
                  value={selectedHospitalId}
                  onChange={event => { setSelectedHospitalId(event.target.value); setError(null); }}
                  disabled={hospitalsLoading || hospitals.length === 0}
                  required
                  className="h-[52px] w-full appearance-none rounded-xl border border-[#D8E2EF] bg-[#F8FAFD] pl-11 pr-11 text-[13px] font-semibold text-[#173764] outline-none transition-colors focus:border-[#83ACC9] disabled:opacity-50 md:border-white/[0.08] md:bg-white/[0.035] md:text-white md:focus:border-[#55BED0]/50"
                >
                  {hospitalOptions}
                </select>
                {hospitalsLoading
                  ? <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#8A9AB3] md:text-white/30" />
                  : <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A9AB3] md:text-white/30" />}
              </div>
            </div>

            <div>
              <label htmlFor="login-email" className="mb-2 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#8A9AB3] md:text-white/38">
                Uživatelské jméno
              </label>
              <div className="group relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7086A5] transition-colors group-focus-within:text-[#1D6799] md:text-white/30 md:group-focus-within:text-[#55BED0]" />
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
                  className="h-[52px] w-full rounded-xl border border-[#D8E2EF] bg-[#F8FAFD] pl-11 pr-4 text-[13px] font-semibold text-[#173764] outline-none transition-colors placeholder:font-medium placeholder:text-[#9DABC0] focus:border-[#83ACC9] md:border-white/[0.08] md:bg-white/[0.035] md:text-white md:placeholder:text-white/22 md:focus:border-[#55BED0]/50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-2 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#8A9AB3] md:text-white/38">
                Heslo
              </label>
              <div className="group relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7086A5] transition-colors group-focus-within:text-[#1D6799] md:text-white/30 md:group-focus-within:text-[#55BED0]" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-[52px] w-full rounded-xl border border-[#D8E2EF] bg-[#F8FAFD] pl-11 pr-12 text-[13px] font-semibold text-[#173764] outline-none transition-colors placeholder:text-[#9DABC0] focus:border-[#83ACC9] md:border-white/[0.08] md:bg-white/[0.035] md:text-white md:placeholder:text-white/22 md:focus:border-[#55BED0]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8090A8] transition-colors hover:text-[#173764] md:text-white/30 md:hover:text-white/65"
                  aria-label={showPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !selectedHospitalId}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#174A7E] text-[13px] font-extrabold text-white shadow-[0_12px_26px_rgba(23,74,126,0.18)] transition-[transform,background-color] hover:bg-[#1C568F] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 md:bg-[#E8F2F7] md:text-[#0A2742] md:shadow-none md:hover:bg-white"
            >
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Přihlašování…</> : 'Přihlásit se'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#E2E9F2] md:bg-white/[0.07]" />
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#A0AEC1] md:text-white/25">Rychlý vstup</span>
            <span className="h-px flex-1 bg-[#E2E9F2] md:bg-white/[0.07]" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {QUICK_ROLES.map(role => {
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => void handleQuickLogin(role.id)}
                  disabled={isLoading || !selectedHospitalId}
                  className="group flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-[#E0E8F1] bg-[#FAFBFD] px-1.5 py-2.5 transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-[#C6D5E5] hover:bg-white active:translate-y-0 disabled:opacity-40 md:border-white/[0.065] md:bg-white/[0.025] md:hover:border-white/[0.13] md:hover:bg-white/[0.05]"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ color: role.tone, backgroundColor: `${role.tone}14` }}>
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
                  </span>
                  <span className="block w-full truncate text-center text-[8px] font-extrabold text-[#536780] md:text-white/58">{role.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="relative z-10 px-5 pb-6 text-center md:px-10 md:pb-7">
        <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-[#A8B4C6] md:text-white/20">
          MEDROX Czech Republic and Canada
        </p>
      </footer>
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
                    onClick={() => void handleQuickLogin(role.id)}
                    disabled={isLoading || !selectedHospitalId}
                    className="group flex min-h-[104px] flex-col items-center justify-center rounded-2xl border border-white/[0.065] bg-white/[0.03] px-5 text-center transition-[transform,background-color,border-color] hover:-translate-y-0.5 hover:border-white/[0.13] hover:bg-white/[0.055] disabled:opacity-40"
                  >
                    <span className="block max-w-full truncate text-[15px] font-bold text-white/90">{role.label}</span>
                    <span className="mt-2 block text-[10px] text-white/30">{role.description}</span>
                  </button>
                ))}
            </div>

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
          <section className="w-full max-w-[440px] rounded-[26px] border border-white/[0.08] bg-[#0C1828]/95 p-8 shadow-[0_28px_80px_rgba(0,0,0,0.32)]">
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
                  <select id="desktop-form-hospital" value={selectedHospitalId} onChange={event => { setSelectedHospitalId(event.target.value); setError(null); }} disabled={hospitalsLoading || hospitals.length === 0} className="h-[50px] w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.035] pl-11 pr-11 text-[12px] font-semibold text-white/82 outline-none focus:border-[#64B9CD]/45 disabled:opacity-50">{hospitalOptions}</select>
                  {hospitalsLoading ? <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/28" /> : <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />}
                </div>
              </div>

              <div>
                <label htmlFor="desktop-form-email" className="mb-2 block text-[8px] font-bold uppercase tracking-[0.2em] text-white/32">Uživatelské jméno</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
                  <input id="desktop-form-email" type="text" inputMode="email" autoCapitalize="none" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="jmeno.prijmeni" required className="h-[50px] w-full rounded-xl border border-white/[0.08] bg-white/[0.035] pl-11 pr-4 text-[12px] font-semibold text-white outline-none placeholder:text-white/20 focus:border-[#64B9CD]/45" />
                </div>
              </div>

              <div>
                <label htmlFor="desktop-form-password" className="mb-2 block text-[8px] font-bold uppercase tracking-[0.2em] text-white/32">Heslo</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
                  <input id="desktop-form-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" required className="h-[50px] w-full rounded-xl border border-white/[0.08] bg-white/[0.035] pl-11 pr-12 text-[12px] font-semibold text-white outline-none placeholder:text-white/20 focus:border-[#64B9CD]/45" />
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
