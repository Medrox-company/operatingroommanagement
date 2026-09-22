'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Browser } from '@capacitor/browser';
import {
  AlertCircle,
  KeyRound,
  Loader2,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { clearGoogleAuthSession, getGoogleAuthClient } from '../lib/auth/google-client';
import {
  closeNativeGoogleBrowser,
  clearPendingNativeGoogleCallback,
  consumePendingNativeGoogleCallback,
  NATIVE_GOOGLE_CALLBACK_EVENT,
  openNativeGoogleLogin,
  rememberNativeGoogleHospitalId,
  resolveNativeGoogleHospitalId,
} from '../lib/auth/native-google-client';

type Stage =
  | 'opening'
  | 'waiting'
  | 'exchanging'
  | 'enroll'
  | 'challenge'
  | 'finishing'
  | 'error';

const CODE_LENGTH = 6;

interface NativeGoogleAuthOverlayProps {
  open: boolean;
  hospitalId: string;
  onClose: () => void;
  onAuthenticated: () => void;
}

function getOAuthCallbackError(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    return parsed.searchParams.get('error_description')
      || hash.get('error_description')
      || parsed.searchParams.get('error')
      || hash.get('error');
  } catch {
    return 'Neplatná návratová adresa přihlášení.';
  }
}

function getOAuthCode(url: string): string | null {
  try {
    return new URL(url).searchParams.get('code');
  } catch {
    return null;
  }
}

/**
 * Native-only continuation of the existing Google superadmin login.
 * The provider page stays in iOS' system browser; only MFA and application
 * session completion are rendered here after the deep link returns.
 */
export default function NativeGoogleAuthOverlay({
  open,
  hospitalId,
  onClose,
  onAuthenticated,
}: NativeGoogleAuthOverlayProps) {
  const [stage, setStage] = useState<Stage>('opening');
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const startedRef = useRef(false);
  const callbackStartedRef = useRef(false);
  const stageRef = useRef<Stage>(stage);
  stageRef.current = stage;

  const showFailure = useCallback((message: string) => {
    setError(message);
    setStage('error');
  }, []);

  const finishOnServer = useCallback(async () => {
    setStage('finishing');
    const resolvedHospitalId = resolveNativeGoogleHospitalId(hospitalId);
    if (!resolvedHospitalId) {
      showFailure('Vyberte zdravotnické zařízení.');
      return;
    }

    const supabase = getGoogleAuthClient();
    if (!supabase) {
      showFailure('Přihlášení přes Google není dostupné.');
      return;
    }

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      showFailure('Přihlašovací relace vypršela. Zkuste to prosím znovu.');
      return;
    }

    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, hospitalId: resolvedHospitalId }),
      });
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        showFailure(
          (typeof json?.error === 'string' && json.error) || 'Přihlášení se nezdařilo.',
        );
        return;
      }

      // The Supabase session was only an identity/MFA bridge. The application
      // now uses its own HttpOnly or_session cookie issued by the API above.
      await clearGoogleAuthSession();
      onAuthenticated();
    } catch {
      showFailure('Server neodpovídá. Zkuste to prosím znovu.');
    }
  }, [hospitalId, onAuthenticated, showFailure]);

  const startEnrollment = useCallback(async () => {
    const supabase = getGoogleAuthClient();
    if (!supabase) {
      showFailure('Přihlášení přes Google není dostupné.');
      return;
    }

    // Remove abandoned unverified factors so a restarted setup does not
    // collide with the friendly name or leave unusable factors behind.
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const stale = (factors?.all ?? []).filter(item => item.status === 'unverified');
      for (const item of stale) {
        await supabase.auth.mfa.unenroll({ factorId: item.id });
      }
    } catch {
      // enroll() below returns a concrete error if cleanup was required.
    }

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Operatingroom iOS ${new Date().toLocaleDateString('cs-CZ')}`,
    });

    if (enrollError || !data) {
      showFailure('Nastavení dvoufázového ověření se nezdařilo. Zkuste to prosím znovu.');
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setCode('');
    setStage('enroll');
  }, [showFailure]);

  const routeByAssuranceLevel = useCallback(async () => {
    const supabase = getGoogleAuthClient();
    if (!supabase) {
      showFailure('Přihlášení přes Google není dostupné.');
      return;
    }

    const { data, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) {
      showFailure('Ověření se nezdařilo. Zkuste to prosím znovu.');
      return;
    }

    if (data?.currentLevel === 'aal2') {
      await finishOnServer();
      return;
    }

    if (data?.nextLevel === 'aal2') {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) {
        showFailure('Dvoufázové ověření se nepodařilo načíst.');
        return;
      }
      const verified = (factors?.totp ?? []).find(item => item.status === 'verified');
      if (verified) {
        setFactorId(verified.id);
        setCode('');
        setStage('challenge');
        return;
      }
    }

    await startEnrollment();
  }, [finishOnServer, showFailure, startEnrollment]);

  const processCallback = useCallback(async (url: string) => {
    if (callbackStartedRef.current) return;
    callbackStartedRef.current = true;
    // The authorization code is single-use. Remove its persisted copy before
    // any async work so a reload cannot try to exchange it a second time.
    clearPendingNativeGoogleCallback();
    setStage('exchanging');
    setError(null);
    await closeNativeGoogleBrowser();

    const callbackError = getOAuthCallbackError(url);
    if (callbackError) {
      showFailure(`Google přihlášení se nedokončilo: ${callbackError}`);
      return;
    }

    const codeFromUrl = getOAuthCode(url);
    if (!codeFromUrl) {
      showFailure('Google nevrátil platný přihlašovací kód.');
      return;
    }

    const supabase = getGoogleAuthClient();
    if (!supabase) {
      showFailure('Přihlášení přes Google není dostupné.');
      return;
    }

    // The verifier was generated and persisted by this same client before
    // SFSafariViewController opened, which is required for a valid PKCE exchange.
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(codeFromUrl);
    if (exchangeError) {
      showFailure('Přihlašovací kód nelze ověřit. Začněte prosím znovu.');
      return;
    }

    await routeByAssuranceLevel();
  }, [routeByAssuranceLevel, showFailure]);

  const startFlow = useCallback(async () => {
    if (!hospitalId) {
      showFailure('Vyberte zdravotnické zařízení.');
      return;
    }

    callbackStartedRef.current = false;
    setError(null);
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setCode('');
    setStage('opening');

    try {
      rememberNativeGoogleHospitalId(hospitalId);
      await openNativeGoogleLogin();
      // A very fast callback can already have advanced the stage.
      if (!callbackStartedRef.current) setStage('waiting');
    } catch (cause) {
      showFailure(cause instanceof Error ? cause.message : 'Přihlášení přes Google nelze otevřít.');
    }
  }, [hospitalId, showFailure]);

  useEffect(() => {
    if (!open) {
      startedRef.current = false;
      callbackStartedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    const pending = consumePendingNativeGoogleCallback();
    if (pending) void processCallback(pending);
    else void startFlow();
  }, [open, processCallback, startFlow]);

  useEffect(() => {
    if (!open) return;

    const onCallback = (event: Event) => {
      const url = (event as CustomEvent<string>).detail;
      if (typeof url === 'string') void processCallback(url);
    };
    window.addEventListener(NATIVE_GOOGLE_CALLBACK_EVENT, onCallback);

    let removed = false;
    let finishedHandle: { remove: () => Promise<void> } | null = null;
    void Browser.addListener('browserFinished', () => {
      // Programmatic close after a deep link also emits this event. The flag
      // distinguishes a completed callback from a user cancellation.
      if (!callbackStartedRef.current && stageRef.current === 'waiting') {
        showFailure('Přihlášení v prohlížeči bylo zrušeno.');
      }
    }).then(handle => {
      if (removed) void handle.remove();
      else finishedHandle = handle;
    });

    return () => {
      removed = true;
      window.removeEventListener(NATIVE_GOOGLE_CALLBACK_EVENT, onCallback);
      if (finishedHandle) void finishedHandle.remove();
    };
  }, [open, processCallback, showFailure]);

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
      setError('Kód nesouhlasí. Opište aktuální šestimístné číslo.');
      return;
    }

    await finishOnServer();
  };

  const closeFlow = async () => {
    await closeNativeGoogleBrowser();
    clearPendingNativeGoogleCallback();
    await clearGoogleAuthSession();
    onClose();
  };

  const retry = async () => {
    await clearGoogleAuthSession();
    callbackStartedRef.current = false;
    await startFlow();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Přihlášení superadministrátora"
      className="fixed inset-0 z-[200] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-[#06101D] px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))] text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(145deg, #07162B 0%, #0A1029 48%, #08091A 100%)' }}
      />
      <div aria-hidden className="login-aurora-flow pointer-events-none absolute" />
      <div aria-hidden className="login-aurora-vignette pointer-events-none absolute inset-0" />

      <main className="login-glass relative z-10 w-full max-w-[430px] rounded-[26px] p-7">
        <button
          type="button"
          onClick={() => void closeFlow()}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-white/45 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Zavřít přihlášení"
        >
          <X className="h-4 w-4" />
        </button>

        {(stage === 'opening' || stage === 'waiting' || stage === 'exchanging' || stage === 'finishing') && (
          <div className="flex flex-col items-center px-2 py-8 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#64C2D2]" />
            <h1 className="mt-5 text-[20px] font-extrabold tracking-[-0.03em]">
              {stage === 'opening' && 'Otevíráme Google'}
              {stage === 'waiting' && 'Dokončete přihlášení'}
              {stage === 'exchanging' && 'Ověřujeme Google účet'}
              {stage === 'finishing' && 'Dokončujeme přihlášení'}
            </h1>
            <p className="mt-2 max-w-[290px] text-[12px] leading-relaxed text-white/45">
              {stage === 'waiting'
                ? 'Pokračujte v bezpečném systémovém prohlížeči. Po ověření se automaticky vrátíte do aplikace.'
                : 'Chvíli prosím počkejte…'}
            </p>
          </div>
        )}

        {stage === 'enroll' && (
          <>
            <AuthHeading
              icon={ShieldCheck}
              title="Nastavení dvoufázového ověření"
              description="Superadministrátorský přístup vyžaduje druhý krok ověření. Nastavuje se pouze jednou."
            />

            <ol className="mb-5 space-y-2.5 text-[12px] text-white/55">
              <li className="flex gap-2.5">
                <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#64C2D2]" />
                <span>Otevřete Google Authenticator, 1Password nebo podobnou aplikaci.</span>
              </li>
              <li className="flex gap-2.5">
                <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#64C2D2]" />
                <span>Naskenujte QR kód a opište zobrazené šestimístné číslo.</span>
              </li>
            </ol>

            {qrCode && (
              <div className="mx-auto mb-4 w-[188px] rounded-2xl bg-white p-3">
                {/* Supabase returns the QR code as a self-contained data URI. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="QR kód pro dvoufázové ověření" className="h-full w-full" />
              </div>
            )}

            {secret && (
              <details className="mb-5">
                <summary className="cursor-pointer text-center text-[11px] font-semibold text-white/35">
                  QR kód nejde naskenovat?
                </summary>
                <p className="mt-2 text-center text-[11px] text-white/40">Zadejte tento klíč ručně:</p>
                <p className="login-glass-field mt-1.5 break-all rounded-xl px-3 py-2.5 text-center font-mono text-[12px] tracking-wider text-white/75">
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
          </>
        )}

        {stage === 'challenge' && (
          <>
            <AuthHeading
              icon={KeyRound}
              title="Ověřovací kód"
              description="Opište šestimístné číslo z autentizační aplikace."
            />
            <CodeForm
              code={code}
              setCode={setCode}
              busy={busy}
              error={error}
              onSubmit={submitCode}
              label="Přihlásit se"
            />
          </>
        )}

        {stage === 'error' && (
          <div className="px-1 py-3 text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-red-400/12 text-red-300">
              <AlertCircle className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-[20px] font-extrabold tracking-[-0.03em]">Přihlášení se nezdařilo</h1>
            <p className="mt-2.5 text-[12px] leading-relaxed text-white/45">{error}</p>
            <button
              type="button"
              onClick={() => void retry()}
              className="mt-6 h-[48px] w-full rounded-xl bg-[#E7F2F6] text-[12px] font-extrabold text-[#09243D] transition-colors active:scale-[0.99]"
            >
              Zkusit znovu
            </button>
            <button
              type="button"
              onClick={() => void closeFlow()}
              className="mt-3 h-10 w-full text-[11px] font-bold text-white/40"
            >
              Zpět na přihlášení
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

interface AuthHeadingProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function AuthHeading({ icon: Icon, title, description }: AuthHeadingProps) {
  return (
    <div className="mb-6 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#64C2D2]/12 text-[#64C2D2]">
        <Icon className="h-5 w-5" />
      </span>
      <h1 className="mt-4 text-[21px] font-extrabold tracking-[-0.03em]">{title}</h1>
      <p className="mt-2 text-[12px] leading-relaxed text-white/40">{description}</p>
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
        className="mt-4 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#E7F2F6] text-[12px] font-extrabold text-[#09243D] transition-colors disabled:opacity-40"
      >
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Ověřujeme…</> : label}
      </button>
    </form>
  );
}
