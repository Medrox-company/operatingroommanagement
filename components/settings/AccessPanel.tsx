'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Building2, AlertTriangle, Loader2, UserCog, LogOut, UserRoundCheck, UserRoundX, KeyRound, Eye, EyeOff } from 'lucide-react';
import { UserRole, ROLE_LABELS } from '../../contexts/AuthContext';
import { InfoRow } from './SettingsPrimitives';
// ============================================================================
// Panel: Access / Login
// ============================================================================

export interface AccessPanelProps {
  user: { email: string; name: string; role: string } | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  onLogout: () => void;
  hospitalName?: string | null;
  hospitalId: string | null;
}

export interface HospitalAccessUser {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  has_access: boolean;
  access_is_global: boolean;
  /** Má role v tomto zařízení nastavené heslo? Bez něj se nepřihlásí. */
  has_password: boolean;
}

export const AccessPanel: React.FC<AccessPanelProps> = ({ user, isAdmin, isSuperAdmin, onLogout, hospitalName, hospitalId }) => {
  const [accessUsers, setAccessUsers] = useState<HospitalAccessUser[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessSaving, setAccessSaving] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

  // Změna hesla — otevřeno vždy nejvýš u jednoho účtu.
  const [passwordFor, setPasswordFor] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordDone, setPasswordDone] = useState<string | null>(null);

  const closePasswordForm = useCallback(() => {
    setPasswordFor(null);
    setPasswordValue('');
    setPasswordRepeat('');
    setPasswordVisible(false);
    setPasswordError(null);
  }, []);

  const openPasswordForm = useCallback((userId: string) => {
    setPasswordFor(userId);
    setPasswordValue('');
    setPasswordRepeat('');
    setPasswordVisible(false);
    setPasswordError(null);
    setPasswordDone(null);
  }, []);

  /** Superadministrátorovo heslo smí měnit jen superadministrátor. */
  const canChangePasswordOf = useCallback(
    (targetRole: string) => (targetRole === 'superadmin' ? isSuperAdmin : isAdmin),
    [isAdmin, isSuperAdmin],
  );

  const submitPassword = useCallback(async (targetUser: HospitalAccessUser) => {
    if (!hospitalId) {
      setPasswordError('Není vybráno zdravotnické zařízení.');
      return;
    }
    if (passwordValue !== passwordRepeat) {
      setPasswordError('Hesla se neshodují.');
      return;
    }
    if (passwordValue.length < 10) {
      setPasswordError('Heslo musí mít alespoň 10 znaků.');
      return;
    }

    setPasswordSaving(true);
    setPasswordError(null);
    try {
      const response = await fetch('/api/admin/user-password', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUser.id, password: passwordValue, hospitalId }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || 'Heslo se nepodařilo změnit');

      closePasswordForm();
      setPasswordDone(targetUser.id);
      // Ať zmizí varování "heslo není nastavené" bez nutnosti znovu načítat.
      setAccessUsers(previous => previous.map(item =>
        item.id === targetUser.id ? { ...item, has_password: true } : item,
      ));
      window.setTimeout(() => setPasswordDone(null), 4000);
    } catch (cause) {
      setPasswordError(cause instanceof Error ? cause.message : 'Heslo se nepodařilo změnit');
    } finally {
      setPasswordSaving(false);
    }
  }, [closePasswordForm, hospitalId, passwordRepeat, passwordValue]);

  const loadAccess = useCallback(async () => {
    if (!isAdmin || !hospitalId) return;
    setAccessLoading(true);
    setAccessError(null);
    try {
      const response = await fetch(`/api/admin/hospital-memberships?hospitalId=${encodeURIComponent(hospitalId)}`, { cache: 'no-store' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || 'Přístupy nelze načíst');
      setAccessUsers(Array.isArray(json.users) ? json.users : []);
    } catch (cause) {
      setAccessError(cause instanceof Error ? cause.message : 'Přístupy nelze načíst');
    } finally {
      setAccessLoading(false);
    }
  }, [hospitalId, isAdmin]);

  useEffect(() => { void loadAccess(); }, [loadAccess]);

  const toggleAccess = useCallback(async (accessUser: HospitalAccessUser) => {
    if (!hospitalId || accessUser.access_is_global) return;
    setAccessSaving(accessUser.id);
    setAccessError(null);
    try {
      const response = await fetch('/api/admin/hospital-memberships', {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId, userId: accessUser.id, enabled: !accessUser.has_access }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || 'Přístup nelze změnit');
      setAccessUsers(previous => previous.map(item => item.id === accessUser.id ? { ...item, has_access: !item.has_access } : item));
    } catch (cause) {
      setAccessError(cause instanceof Error ? cause.message : 'Přístup nelze změnit');
    } finally {
      setAccessSaving(null);
    }
  }, [hospitalId]);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/38">Přístup</p>
        <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-white">Přihlášení a přístup</h2>
        <p className="text-sm text-white/50 leading-relaxed max-w-3xl">
          Informace o aktuálně přihlášeném uživateli a o instanci aplikace. Přihlášení určuje, ke kterému zdravotnickému
          zařízení se připojujete a jaká oprávnění máte.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current session */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/20 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-[#10B981]" />
            </div>
            <h3 className="text-[15px] font-bold leading-tight text-white/90">Aktuální relace</h3>
          </div>

          <dl className="space-y-3 text-sm">
            <InfoRow label="Jméno" value={user?.name ?? '—'} />
            <InfoRow label="E-mail" value={user?.email ?? '—'} />
            <InfoRow
              label="Role"
              value={
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isSuperAdmin
                      ? 'bg-[#E0574F]/20 text-[#E0574F]'
                      : isAdmin
                        ? 'bg-[#FBBF24]/20 text-[#FBBF24]'
                        : 'bg-white/10 text-white/60'
                  }`}
                >
                  {ROLE_LABELS[user?.role as UserRole] ?? user?.role ?? '—'}
                </span>
              }
            />
          </dl>

          <button
            onClick={onLogout}
            className="mt-5 w-full flex items-center justify-center gap-2 h-10 rounded-lg text-[9px] font-semibold uppercase tracking-[0.08em] text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Odhlásit se
          </button>
        </div>

        {/* Hospital context */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: '#0EA5E988' }} />
                <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg border" style={{ borderColor: '#0EA5E958', backgroundColor: '#0EA5E91f', color: '#0EA5E9' }}>
              <Building2 className="w-5 h-5 text-[#0EA5E9]" />
            </span>
            <h3 className="text-[15px] font-bold leading-tight text-white/90">Kontext zařízení</h3>
          </div>

          <dl className="space-y-3 text-sm">
            <InfoRow label="Připojeno k" value={hospitalName || 'Nenakonfigurováno'} />
            <InfoRow label="Režim" value="Oddělený multi-hospital" />
          </dl>

          <p className="mt-5 text-xs text-white/40 leading-relaxed">
            Aktivní nemocnice určuje databázový kontext celé relace. Její data jsou oddělena pomocí hospital_id a RLS pravidel.
          </p>
        </div>
      </div>

      {isAdmin && (
        <section className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-[15px] font-bold leading-tight text-white/90">Uživatelé nemocnice</h3>
              <p className="text-xs text-white/40 mt-1">
                Povolte rolím přihlášení do {hospitalName || 'vybrané nemocnice'} a nastavte jim zdejší heslo.
                Každé zařízení má vlastní hesla — kromě superadministrátora, který se přihlašuje přes Google.
              </p>
            </div>
            {accessLoading && <Loader2 className="w-5 h-5 animate-spin text-white/40" />}
          </div>

          {accessError && (
            <div className="mb-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {accessError}
            </div>
          )}

          <div className="divide-y divide-white/[0.06]">
            {accessUsers.map(accessUser => {
              const passwordAllowed = canChangePasswordOf(accessUser.role);
              const formOpen = passwordFor === accessUser.id;

              return (
                <div key={accessUser.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accessUser.has_access ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-white/25'}`}>
                      {accessUser.has_access ? <UserRoundCheck className="w-4 h-4" /> : <UserRoundX className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{accessUser.name}</p>
                      <p className="truncate text-xs text-white/35">
                        {accessUser.email} · {ROLE_LABELS[accessUser.role as UserRole] ?? accessUser.role}
                      </p>
                      {accessUser.has_access && !accessUser.has_password && (
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-amber-300/85">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          Heslo pro toto zařízení není nastavené — role se zatím nepřihlásí.
                        </p>
                      )}
                    </div>

                    {passwordDone === accessUser.id && (
                      <span className="hidden sm:inline text-xs font-semibold text-emerald-300">Heslo změněno</span>
                    )}

                    <button
                      type="button"
                      onClick={() => (formOpen ? closePasswordForm() : openPasswordForm(accessUser.id))}
                      disabled={!passwordAllowed}
                      title={passwordAllowed ? 'Nastavit nové heslo' : 'Heslo superadministrátora může měnit pouze superadministrátor'}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${formOpen ? 'border-[#0EA5E9]/35 bg-[#0EA5E9]/12 text-[#7DD3FC]' : 'border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]'}`}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Heslo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void toggleAccess(accessUser)}
                      disabled={accessUser.access_is_global || accessSaving === accessUser.id || !accessUser.is_active}
                      className={`min-w-[96px] rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${accessUser.has_access ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/[0.03] text-white/45'}`}
                    >
                      {accessSaving === accessUser.id ? <Loader2 className="mx-auto w-4 h-4 animate-spin" /> : accessUser.access_is_global ? 'Všechny' : accessUser.has_access ? 'Povoleno' : 'Zakázáno'}
                    </button>
                  </div>

                  {formOpen && (
                    <form
                      onSubmit={event => { event.preventDefault(); void submitPassword(accessUser); }}
                      className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-4"
                    >
                      <p className="mb-3 text-xs text-white/45">
                        Nové heslo pro <span className="font-semibold text-white/75">{accessUser.name}</span>
                        {' '}v zařízení <span className="font-semibold text-white/75">{hospitalName || 'vybraném'}</span>.
                        V ostatních zařízeních zůstane heslo této role beze změny.
                        Uživateli ho předejte bezpečnou cestou — zpětně už ho nikde nepřečtete.
                      </p>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="relative">
                          <input
                            type={passwordVisible ? 'text' : 'password'}
                            value={passwordValue}
                            onChange={event => { setPasswordValue(event.target.value); setPasswordError(null); }}
                            placeholder="Nové heslo"
                            autoComplete="new-password"
                            className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 pr-11 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#0EA5E9]/45"
                          />
                          <button
                            type="button"
                            onClick={() => setPasswordVisible(value => !value)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/70"
                            aria-label={passwordVisible ? 'Skrýt heslo' : 'Zobrazit heslo'}
                          >
                            {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        <input
                          type={passwordVisible ? 'text' : 'password'}
                          value={passwordRepeat}
                          onChange={event => { setPasswordRepeat(event.target.value); setPasswordError(null); }}
                          placeholder="Heslo znovu"
                          autoComplete="new-password"
                          className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#0EA5E9]/45"
                        />
                      </div>

                      {passwordError && (
                        <p className="mt-3 text-xs font-semibold text-red-300">{passwordError}</p>
                      )}

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={passwordSaving || passwordValue.length === 0}
                          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0EA5E9]/15 border border-[#0EA5E9]/30 px-4 text-xs font-bold text-[#7DD3FC] transition-colors hover:bg-[#0EA5E9]/25 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                          Nastavit heslo
                        </button>
                        <button
                          type="button"
                          onClick={closePasswordForm}
                          className="h-10 rounded-xl border border-white/10 bg-white/[0.02] px-4 text-xs font-bold text-white/50 transition-colors hover:bg-white/[0.06]"
                        >
                          Zrušit
                        </button>
                        <span className="ml-auto text-[11px] text-white/30">Nejméně 10 znaků</span>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
            {!accessLoading && accessUsers.length === 0 && (
              <p className="py-6 text-center text-sm text-white/35">Nebyli nalezeni žádní uživatelé.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
