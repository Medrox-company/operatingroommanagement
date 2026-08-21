'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Fingerprint, KeyRound, Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { getGoogleAuthClient, clearGoogleAuthSession } from '../../../lib/auth/google-client';
import {
  areKeysKnownUnavailable,
  browserSupportsSecurityKey,
  describeSecurityKeyError,
  getRelyingParty,
  isKeyFeatureDisabled,
  rememberKeysUnavailable,
} from '../../../lib/auth/webauthn';

/**
 * Návratová stránka po přihlášení přes Google.
 *
 * Google sám o sobě do aplikace nepustí — superadministrátor musí projít
 * i dvoufázovým ověřením. Tahle stránka proto podle stavu účtu buď rovnou
 * dokončí přihlášení, nebo nejdřív provede nastavení či zadání kódu.
 *
 * Teprve po dosažení úrovně aal2 pošle token na server, který vystaví
 * or_session cookie používanou zbytkem aplikace.
 */

type Stage =
  | 'loading'        // čekáme na relaci z Googlu
  | 'enroll'         // účet ještě nemá dvoufázové ověření — ukaž QR kód
  | 'key'            // účet má bezpečnostní klíč — stačí potvrdit
  | 'challenge'      // účet má jen aplikaci — chce šestimístné číslo
  | 'offer-key'      // ověřeno kódem, nabídneme pohodlnější klíč
  | 'finishing'      // hotovo, dokončujeme na serveru
  | 'error';

const CODE_LENGTH = 6;

export default function GoogleLoginCallbackPage() {
  const [stage, setStage] = useState<Stage>('loading');
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [keyFactorId, setKeyFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [keySupported, setKeySupported] = useState(true);

  // Zabrání dvojímu spuštění v Reactu ve vývojovém strict režimu.
  const startedRef = useRef(false);

  const failTo = useCallback(async (message: string) => {
    setError(message);
    setStage('error');
    await clearGoogleAuthSession();
  }, []);

  /** Poslední krok: token na server, ten vystaví vlastní session cookie. */
  const finishOnServer = useCallback(async () => {
    setStage('finishing');
    const supabase = getGoogleAuthClient();
    if (!supabase) {
      await failTo('Přihlášení přes Google není dostupné.');
      return;
    }

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      await failTo('Přihlašovací relace vypršela. Zkuste to prosím znovu.');
      return;
    }

    let hospitalId = '';
    try {
      hospitalId = window.localStorage.getItem('orm-active-hospital') ?? '';
    } catch {
      hospitalId = '';
    }
    if (!hospitalId) {
      await failTo('Není vybráno zdravotnické zařízení. Začněte prosím znovu na přihlašovací stránce.');
      return;
    }

    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, hospitalId }),
      });
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        await failTo(
          (typeof json?.error === 'string' && json.error) || 'Přihlášení se nezdařilo.',
        );
        return;
      }

      // Google relace posloužila svému účelu, dál pracuje jen or_session.
      await clearGoogleAuthSession();
      window.location.replace('/');
    } catch {
      await failTo('Server neodpovídá. Zkuste to prosím znovu.');
    }
  }, [failTo]);

  /** Založí nový TOTP faktor a zobrazí QR kód. */
  const startEnrollment = useCallback(async () => {
    const supabase = getGoogleAuthClient();
    if (!supabase) return;

    // Nedokončené pokusy z minula by jinak zabraly jméno faktoru.
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const stale = (factors?.all ?? []).filter(item => item.status === 'unverified');
      for (const item of stale) {
        await supabase.auth.mfa.unenroll({ factorId: item.id });
      }
    } catch {
      // Když se úklid nepovede, enroll níž stejně ohlásí konkrétní chybu.
    }

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Operatingroom ${new Date().toLocaleDateString('cs-CZ')}`,
    });

    if (enrollError || !data) {
      await failTo('Nastavení dvoufázového ověření se nezdařilo. Zkuste to prosím znovu.');
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStage('enroll');
  }, [failTo]);

  /** Zjistí, v jakém stavu je dvoufázové ověření, a rozhodne o dalším kroku. */
  const routeByAssuranceLevel = useCallback(async () => {
    const supabase = getGoogleAuthClient();
    if (!supabase) {
      await failTo('Přihlášení přes Google není dostupné.');
      return;
    }

    const { data, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) {
      await failTo('Ověření se nezdařilo. Zkuste to prosím znovu.');
      return;
    }

    if (data?.currentLevel === 'aal2') {
      await finishOnServer();
      return;
    }

    if (data?.nextLevel === 'aal2') {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const allFactors = factors?.all ?? [];

      const key = allFactors.find(
        item => item.factor_type === 'webauthn' && item.status === 'verified',
      );
      const totp = (factors?.totp ?? []).find(item => item.status === 'verified');

      if (totp) setFactorId(totp.id);

      // Klíč má přednost — je pohodlnější i odolnější proti podvrženým stránkám.
      if (key && browserSupportsSecurityKey()) {
        setKeyFactorId(key.id);
        setStage('key');
        return;
      }

      if (totp) {
        setStage('challenge');
        return;
      }

      // Faktor sice existuje, ale tenhle prohlížeč ho neobslouží.
      if (key) {
        await failTo('Tento prohlížeč neumí bezpečnostní klíče. Přihlaste se prosím z jiného zařízení.');
        return;
      }

      await startEnrollment();
      return;
    }

    await startEnrollment();
  }, [failTo, finishOnServer, startEnrollment]);

  useEffect(() => {
    setKeySupported(browserSupportsSecurityKey() && !areKeysKnownUnavailable());
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      const supabase = getGoogleAuthClient();
      if (!supabase) {
        await failTo('Přihlášení přes Google není dostupné.');
        return;
      }

      // Klient sám vymění návratový kód za relaci; chvíli to trvá.
      const deadline = Date.now() + 8000;
      let hasSession = false;
      while (Date.now() < deadline) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          hasSession = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (!hasSession) {
        await failTo('Přihlášení přes Google se nedokončilo. Zkuste to prosím znovu.');
        return;
      }

      // Adresu s návratovým kódem není důvod nechávat v historii prohlížeče.
      window.history.replaceState({}, '', '/prihlaseni/google');

      await routeByAssuranceLevel();
    })();
  }, [failTo, routeByAssuranceLevel]);

  /**
   * Potvrzení bezpečnostním klíčem.
   *
   * Celou výměnu obslouží prohlížeč: na počítači s Touch ID se objeví systémový
   * dialog, jinak nabídne QR kód pro telefon. Aplikace jen předá výzvu a vrátí
   * podepsanou odpověď — soukromý klíč zařízení nikdy neopustí.
   */
  const confirmWithKey = useCallback(async () => {
    if (!keyFactorId || busy) return;

    const supabase = getGoogleAuthClient();
    if (!supabase) return;

    setBusy(true);
    setError(null);

    try {
      const { error: keyError } = await supabase.auth.mfa.webauthn.authenticate({
        factorId: keyFactorId,
        webauthn: getRelyingParty(),
      });

      if (keyError) {
        setError(describeSecurityKeyError(keyError));
        setBusy(false);
        return;
      }

      await finishOnServer();
    } catch (cause) {
      setError(describeSecurityKeyError(cause));
      setBusy(false);
    }
  }, [busy, finishOnServer, keyFactorId]);

  /**
   * Registrace klíče. Spouští se až po úspěšném ověření kódem, kdy relace
   * dosáhla aal2 — Supabase dřív nový faktor přidat nedovolí.
   */
  const registerKey = useCallback(async () => {
    if (busy) return;

    const supabase = getGoogleAuthClient();
    if (!supabase) return;

    setBusy(true);
    setError(null);

    try {
      const { error: keyError } = await supabase.auth.mfa.webauthn.register({
        friendlyName: `Operatingroom ${new Date().toLocaleDateString('cs-CZ')}`,
        webauthn: getRelyingParty(),
      });

      if (keyError) {
        // Klíče nejsou v projektu zapnuté (Supabase → Authentication → MFA).
        // Není to chyba uživatele — pustíme ho dál a nabídku už neopakujeme.
        if (isKeyFeatureDisabled(keyError)) {
          rememberKeysUnavailable();
          await finishOnServer();
          return;
        }
        setError(describeSecurityKeyError(keyError));
        setBusy(false);
        return;
      }

      await finishOnServer();
    } catch (cause) {
      setError(describeSecurityKeyError(cause));
      setBusy(false);
    }
  }, [busy, finishOnServer]);

  /** Ověří kód z autentizační aplikace. */
  const submitCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || code.length !== CODE_LENGTH || !factorId) return;

    const supabase = getGoogleAuthClient();
    if (!supabase) return;

    setBusy(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    setBusy(false);

    if (verifyError) {
      setCode('');
      setError('Kód nesouhlasí. Zkontrolujte, že opisujete aktuální šestimístné číslo.');
      return;
    }

    // Relace je teď na aal2 — jediná chvíle, kdy jde přidat další faktor.
    // Nabídneme klíč, aby se příště nemuselo nic opisovat.
    if (keySupported && !keyFactorId) {
      setCode('');
      setStage('offer-key');
      return;
    }

    await finishOnServer();
  };

  const backToLogin = async () => {
    await clearGoogleAuthSession();
    window.location.replace('/');
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#06101D] px-5 py-10 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(145deg, #07162B 0%, #0A1029 48%, #08091A 100%)' }}
      />
      {/* Stejné pozadí jako na přihlašovací stránce — sklo potřebuje čím prosvítat. */}
      <div aria-hidden className="login-aurora-flow pointer-events-none absolute" />
      <div aria-hidden className="login-aurora-vignette pointer-events-none absolute inset-0" />

      <main className="login-glass relative z-10 w-full max-w-[430px] rounded-[26px] p-8">
        {stage === 'loading' && (
          <div className="flex flex-col items-center py-6 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#64C2D2]" />
            <p className="mt-5 text-[13px] font-semibold text-white/70">Ověřujeme přihlášení…</p>
          </div>
        )}

        {stage === 'finishing' && (
          <div className="flex flex-col items-center py-6 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#64C2D2]" />
            <p className="mt-5 text-[13px] font-semibold text-white/70">Dokončujeme přihlášení…</p>
          </div>
        )}

        {stage === 'enroll' && (
          <>
            <div className="mb-6 text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#64C2D2]/12 text-[#64C2D2]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <h1 className="mt-4 text-[22px] font-extrabold tracking-[-0.03em]">Nastavení dvoufázového ověření</h1>
              <p className="mt-2 text-[12px] leading-relaxed text-white/40">
                Superadministrátorský přístup vyžaduje druhý krok ověření. Stačí nastavit jednou.
              </p>
            </div>

            <ol className="mb-5 space-y-2.5 text-[12px] text-white/55">
              <li className="flex gap-2.5">
                <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#64C2D2]" />
                <span>V telefonu otevřete Google Authenticator, 1Password nebo podobnou aplikaci.</span>
              </li>
              <li className="flex gap-2.5">
                <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#64C2D2]" />
                <span>Naskenujte kód níže a opište šestimístné číslo, které se zobrazí.</span>
              </li>
            </ol>

            {qrCode && (
              <div className="mx-auto mb-4 w-[188px] rounded-2xl bg-white p-3">
                {/* QR kód přichází ze Supabase jako hotový obrázek (data URI). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="QR kód pro nastavení dvoufázového ověření" className="h-full w-full" />
              </div>
            )}

            {secret && (
              <details className="mb-5">
                <summary className="cursor-pointer text-center text-[11px] font-semibold text-white/32 transition-colors hover:text-white/60">
                  QR kód nejde naskenovat?
                </summary>
                <p className="mt-2.5 text-center text-[11px] text-white/40">
                  Zadejte do aplikace tento klíč ručně:
                </p>
                <p className="mt-1.5 break-all login-glass-field rounded-xl px-3 py-2.5 text-center font-mono text-[12px] tracking-wider text-white/75">
                  {secret}
                </p>
              </details>
            )}

            <CodeForm
              code={code}
              setCode={setCode}
              busy={busy}
              error={error}
              onSubmit={submitCode}
              label="Dokončit nastavení"
            />

            <p className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3.5 py-3 text-[11px] leading-relaxed text-amber-200/75">
              Uschovejte si přístup k telefonu. Při jeho ztrátě je potřeba dvoufázové ověření
              resetovat v databázi — postup je v dokumentaci projektu.
            </p>

            {keySupported && (
              <p className="mt-3 text-center text-[11px] leading-relaxed text-white/28">
                Po dokončení vám nabídneme bezpečnostní klíč — pak už nebude potřeba
                nic opisovat.
              </p>
            )}
          </>
        )}

        {stage === 'key' && (
          <div className="text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#64C2D2]/12 text-[#64C2D2]">
              <Fingerprint className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-[22px] font-extrabold tracking-[-0.03em]">Potvrďte bezpečnostním klíčem</h1>
            <p className="mt-2.5 text-[12px] leading-relaxed text-white/40">
              Prohlížeč nabídne otisk prstu, obličej nebo QR kód pro telefon.
            </p>

            {error && (
              <p className="mt-5 flex items-start gap-2 text-left text-[11.5px] font-semibold leading-snug text-red-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => void confirmWithKey()}
              disabled={busy}
              className="mt-6 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#E7F2F6] text-[12px] font-extrabold text-[#09243D] transition-colors hover:bg-white disabled:opacity-40"
            >
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Čekáme na potvrzení…</> : 'Potvrdit'}
            </button>

            {factorId && (
              <button
                type="button"
                onClick={() => { setError(null); setStage('challenge'); }}
                className="mt-4 text-[11px] font-semibold text-white/34 transition-colors hover:text-white/75"
              >
                Klíč nemám po ruce — zadat kód z aplikace
              </button>
            )}
          </div>
        )}

        {stage === 'challenge' && (
          <>
            <div className="mb-6 text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#64C2D2]/12 text-[#64C2D2]">
                <KeyRound className="h-5 w-5" />
              </span>
              <h1 className="mt-4 text-[22px] font-extrabold tracking-[-0.03em]">Ověřovací kód</h1>
              <p className="mt-2 text-[12px] leading-relaxed text-white/40">
                Opište šestimístné číslo z autentizační aplikace.
              </p>
            </div>

            <CodeForm
              code={code}
              setCode={setCode}
              busy={busy}
              error={error}
              onSubmit={submitCode}
              label="Přihlásit se"
            />

            {keyFactorId && (
              <button
                type="button"
                onClick={() => { setError(null); setStage('key'); }}
                className="mx-auto mt-4 block text-[11px] font-semibold text-white/34 transition-colors hover:text-white/75"
              >
                Raději potvrdit bezpečnostním klíčem
              </button>
            )}
          </>
        )}

        {stage === 'offer-key' && (
          <div className="text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#64C2D2]/12 text-[#64C2D2]">
              <Fingerprint className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-[22px] font-extrabold tracking-[-0.03em]">Příště bez opisování</h1>
            <p className="mt-2.5 text-[12px] leading-relaxed text-white/40">
              Můžete si uložit bezpečnostní klíč a místo šestimístného čísla pak jen
              přiložit prst, ukázat obličej nebo naskenovat QR kód telefonem.
            </p>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-white/28">
              Kód z aplikace zůstane funkční jako záloha.
            </p>

            {error && (
              <p className="mt-5 flex items-start gap-2 text-left text-[11.5px] font-semibold leading-snug text-red-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => void registerKey()}
              disabled={busy}
              className="mt-6 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#E7F2F6] text-[12px] font-extrabold text-[#09243D] transition-colors hover:bg-white disabled:opacity-40"
            >
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Ukládáme klíč…</> : 'Uložit bezpečnostní klíč'}
            </button>

            <button
              type="button"
              onClick={() => void finishOnServer()}
              disabled={busy}
              className="mt-4 text-[11px] font-semibold text-white/34 transition-colors hover:text-white/75 disabled:opacity-40"
            >
              Teď ne, pokračovat do aplikace
            </button>
          </div>
        )}

        {stage === 'error' && (
          <div className="text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-red-400/12 text-red-300">
              <AlertCircle className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-[20px] font-extrabold tracking-[-0.03em]">Přihlášení se nezdařilo</h1>
            <p className="mt-2.5 text-[12px] leading-relaxed text-white/45">{error}</p>
            <button
              type="button"
              onClick={() => void backToLogin()}
              className="mt-6 h-[46px] w-full rounded-xl bg-[#E7F2F6] text-[12px] font-extrabold text-[#09243D] transition-colors hover:bg-white"
            >
              Zpět na přihlášení
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

interface CodeFormProps {
  code: string;
  setCode: (value: string) => void;
  busy: boolean;
  error: string | null;
  onSubmit: (event: React.FormEvent) => void;
  label: string;
}

function CodeForm({ code, setCode, busy, error, onSubmit, label }: CodeFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={CODE_LENGTH}
        value={code}
        onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
        placeholder="000000"
        className="login-glass-field h-[56px] w-full rounded-xl text-center font-mono text-[24px] font-bold tracking-[0.4em] text-white outline-none placeholder:text-white/15 focus:border-[#64B9CD]/45"
      />

      {error && (
        <p className="mt-3 flex items-start gap-2 text-[11.5px] font-semibold leading-snug text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || code.length !== CODE_LENGTH}
        className="mt-4 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#E7F2F6] text-[12px] font-extrabold text-[#09243D] transition-colors hover:bg-white disabled:opacity-40"
      >
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Ověřujeme…</> : label}
      </button>
    </form>
  );
}
