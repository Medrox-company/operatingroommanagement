'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Building2,
  Database,
  Shield,
  AlertTriangle,
  Check,
  Loader2,
  Trash2,
  Save,
  Lock,
  UserCog,
  Mail,
  Phone,
  MapPin,
  Hash,
  Info,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface FacilityInfo {
  facility_name?: string | null;
  facility_short_name?: string | null;
  facility_address?: string | null;
  facility_city?: string | null;
  facility_zip?: string | null;
  facility_country?: string | null;
  facility_ico?: string | null;
  facility_contact_phone?: string | null;
  facility_contact_email?: string | null;
  facility_notes?: string | null;
}

type TabId = 'facility' | 'database' | 'access';

const SystemSettingsModule: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('facility');

  // Facility state
  const [facility, setFacility] = useState<FacilityInfo>({});
  const [facilityLoading, setFacilityLoading] = useState(true);
  const [facilitySaving, setFacilitySaving] = useState(false);
  const [facilityMessage, setFacilityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Database reset state
  const [resetMode, setResetMode] = useState<'operational' | 'full' | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{ success: boolean; message: string; details?: Record<string, unknown> } | null>(null);

  // Load facility info
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/facility');
        const data = await res.json();
        if (!cancelled && res.ok) {
          setFacility(data.facility || {});
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setFacilityLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFacilityChange = useCallback((key: keyof FacilityInfo, value: string) => {
    setFacility(prev => ({ ...prev, [key]: value }));
    setFacilityMessage(null);
  }, []);

  const handleFacilitySave = useCallback(async () => {
    setFacilitySaving(true);
    setFacilityMessage(null);
    try {
      const res = await fetch('/api/admin/facility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facility),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFacilityMessage({ type: 'success', text: 'Informace o zařízení byly uloženy.' });
      } else {
        setFacilityMessage({ type: 'error', text: data.error || 'Uložení se nezdařilo.' });
      }
    } catch (e: unknown) {
      setFacilityMessage({ type: 'error', text: e instanceof Error ? e.message : 'Síťová chyba při ukládání.' });
    } finally {
      setFacilitySaving(false);
    }
  }, [facility]);

  const handleResetConfirm = useCallback(async () => {
    if (!resetMode) return;
    if (resetConfirmText !== 'SMAZAT DATA') return;

    setResetLoading(true);
    setResetResult(null);
    try {
      const res = await fetch('/api/admin/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: resetMode,
          confirmation: resetConfirmText,
          userEmail: user?.email,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetResult({
          success: true,
          message:
            resetMode === 'operational'
              ? 'Provozní data byla smazána. Konfigurace zůstává zachována.'
              : 'Všechna data byla smazána. Aplikace je nyní prázdná, připravena pro nové zařízení.',
          details: data.deleted,
        });
        // Zavřít modal a vyčistit
        setTimeout(() => {
          setResetMode(null);
          setResetConfirmText('');
        }, 1200);
      } else {
        setResetResult({ success: false, message: data.error || 'Operace selhala.' });
      }
    } catch (e: unknown) {
      setResetResult({ success: false, message: e instanceof Error ? e.message : 'Síťová chyba.' });
    } finally {
      setResetLoading(false);
    }
  }, [resetMode, resetConfirmText, user?.email]);

  const closeResetDialog = () => {
    if (resetLoading) return;
    setResetMode(null);
    setResetConfirmText('');
    setResetResult(null);
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="w-full">
      {/* Header — stejný styl jako ostatní moduly */}
      <header className="flex flex-col items-center lg:items-start justify-between gap-4 md:gap-6 mb-8 md:mb-12 lg:mb-16 flex-shrink-0">
        <div className="text-center lg:text-left min-w-0 w-full lg:w-auto">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <SettingsIcon className="w-4 h-4 text-[#64748B]" />
            <p className="text-[10px] font-black text-[#64748B] tracking-[0.4em] uppercase">SYSTEM CONFIGURATION</p>
          </div>
          <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-black tracking-tighter uppercase leading-none">
            NASTAVENÍ <span className="text-white/20">SYSTÉMU</span>
          </h1>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="mb-8 flex flex-wrap gap-2 sm:gap-3">
        {([
          { id: 'facility' as const, label: 'Zdravotnické zařízení', icon: Building2, color: '#0EA5E9' },
          { id: 'database' as const, label: 'Administrace databáze', icon: Database, color: '#EC4899' },
          { id: 'access' as const, label: 'Přihlášení a přístup', icon: UserCog, color: '#10B981' },
        ]).map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${
                isActive
                  ? 'bg-white/[0.06] text-white'
                  : 'bg-white/[0.02] text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
              }`}
              style={{
                borderColor: isActive ? `${tab.color}60` : 'rgba(255,255,255,0.08)',
                boxShadow: isActive ? `0 0 30px ${tab.color}20, inset 0 0 20px ${tab.color}10` : undefined,
              }}
            >
              <Icon className="w-4 h-4" style={{ color: isActive ? tab.color : undefined }} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Panel container */}
      <div className="relative rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 sm:p-6 md:p-8 overflow-hidden">
        {/* decorative glow */}
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none opacity-20"
          style={{ background: activeTab === 'facility' ? '#0EA5E9' : activeTab === 'database' ? '#EC4899' : '#10B981' }}
        />

        <AnimatePresence mode="wait">
          {activeTab === 'facility' && (
            <motion.div
              key="facility"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <FacilityPanel
                facility={facility}
                loading={facilityLoading}
                saving={facilitySaving}
                message={facilityMessage}
                onChange={handleFacilityChange}
                onSave={handleFacilitySave}
                isAdmin={isAdmin}
              />
            </motion.div>
          )}

          {activeTab === 'database' && (
            <motion.div
              key="database"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <DatabasePanel
                isAdmin={isAdmin}
                onRequestReset={(m) => {
                  setResetMode(m);
                  setResetResult(null);
                  setResetConfirmText('');
                }}
                lastResult={resetResult}
              />
            </motion.div>
          )}

          {activeTab === 'access' && (
            <motion.div
              key="access"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <AccessPanel user={user} isAdmin={isAdmin} onLogout={logout} facilityName={facility.facility_name} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reset confirmation modal */}
      <AnimatePresence>
        {resetMode && (
          <ResetConfirmModal
            mode={resetMode}
            confirmText={resetConfirmText}
            onConfirmTextChange={setResetConfirmText}
            loading={resetLoading}
            result={resetResult}
            onConfirm={handleResetConfirm}
            onClose={closeResetDialog}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// Panel: Facility
// ============================================================================

interface FacilityPanelProps {
  facility: FacilityInfo;
  loading: boolean;
  saving: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
  onChange: (key: keyof FacilityInfo, value: string) => void;
  onSave: () => void;
  isAdmin: boolean;
}

const FacilityPanel: React.FC<FacilityPanelProps> = ({ facility, loading, saving, message, onChange, onSave, isAdmin }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Informace o zdravotnickém zařízení</h2>
        <p className="text-sm text-white/50 leading-relaxed">
          Tyto údaje identifikují instanci aplikace a zobrazují se v reportech a notifikacích. Aplikace bude nasazována
          v různých nemocničních zařízeních — tato sekce slouží ke konfiguraci konkrétní instance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Název nemocnice"
          icon={Building2}
          placeholder="Např. Nemocnice Jihlava, p.o."
          value={facility.facility_name ?? ''}
          onChange={v => onChange('facility_name', v)}
          disabled={!isAdmin}
          fullWidth
        />
        <Field
          label="Zkrácený název"
          icon={Hash}
          placeholder="Např. NJ"
          value={facility.facility_short_name ?? ''}
          onChange={v => onChange('facility_short_name', v)}
          disabled={!isAdmin}
        />
        <Field
          label="IČO"
          icon={Hash}
          placeholder="00000000"
          value={facility.facility_ico ?? ''}
          onChange={v => onChange('facility_ico', v)}
          disabled={!isAdmin}
        />
        <Field
          label="Adresa"
          icon={MapPin}
          placeholder="Ulice a číslo popisné"
          value={facility.facility_address ?? ''}
          onChange={v => onChange('facility_address', v)}
          disabled={!isAdmin}
          fullWidth
        />
        <Field
          label="Město"
          icon={MapPin}
          placeholder="Jihlava"
          value={facility.facility_city ?? ''}
          onChange={v => onChange('facility_city', v)}
          disabled={!isAdmin}
        />
        <Field
          label="PSČ"
          icon={MapPin}
          placeholder="586 01"
          value={facility.facility_zip ?? ''}
          onChange={v => onChange('facility_zip', v)}
          disabled={!isAdmin}
        />
        <Field
          label="Kontaktní telefon"
          icon={Phone}
          placeholder="+420 ..."
          value={facility.facility_contact_phone ?? ''}
          onChange={v => onChange('facility_contact_phone', v)}
          disabled={!isAdmin}
          type="tel"
        />
        <Field
          label="Kontaktní e-mail"
          icon={Mail}
          placeholder="info@nemocnice.cz"
          value={facility.facility_contact_email ?? ''}
          onChange={v => onChange('facility_contact_email', v)}
          disabled={!isAdmin}
          type="email"
        />
        <div className="md:col-span-2">
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">
            Poznámky
          </label>
          <textarea
            value={facility.facility_notes ?? ''}
            onChange={e => onChange('facility_notes', e.target.value)}
            rows={3}
            disabled={!isAdmin}
            placeholder="Interní poznámky ke konfiguraci zařízení..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#0EA5E9]/50 focus:ring-1 focus:ring-[#0EA5E9]/30 transition-all resize-none disabled:opacity-50"
          />
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl border text-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={onSave}
          disabled={!isAdmin || saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
            boxShadow: '0 0 30px rgba(14,165,233,0.3)',
          }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Uložit informace</span>
        </button>
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
          <Lock className="w-4 h-4" />
          <span>Úpravy může provádět pouze administrátor.</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Panel: Database
// ============================================================================

interface DatabasePanelProps {
  isAdmin: boolean;
  onRequestReset: (mode: 'operational' | 'full') => void;
  lastResult: { success: boolean; message: string; details?: Record<string, unknown> } | null;
}

const DatabasePanel: React.FC<DatabasePanelProps> = ({ isAdmin, onRequestReset, lastResult }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Administrace databáze</h2>
        <p className="text-sm text-white/50 leading-relaxed max-w-3xl">
          Aplikace nyní funguje v testovacím režimu. Než začne produkční sběr dat v konkrétním zařízení, doporučujeme
          smazat aktuální provozní data. Data sbíraná v produkci zůstanou uložena — reset můžete kdykoliv provést znovu.
        </p>
      </div>

      {!isAdmin ? (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
          <Lock className="w-5 h-5" />
          <span>Administrace databáze je dostupná pouze pro administrátora.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Operational reset */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Smazat provozní data</h3>
                <p className="text-xs text-amber-300/70 uppercase tracking-wider font-bold">Doporučeno</p>
              </div>
            </div>

            <p className="text-sm text-white/60 leading-relaxed mb-4 flex-1">
              Smaže historická data a resetuje stav sálů. Zachová konfiguraci — personál, oddělení, workflow statusy,
              operační sály a kontakty managementu.
            </p>

            <ul className="text-xs text-white/50 space-y-1.5 mb-5">
              <li className="flex items-center gap-2">
                <Trash2 className="w-3 h-3 text-amber-400" />
                Historie změn stavů sálů
              </li>
              <li className="flex items-center gap-2">
                <Trash2 className="w-3 h-3 text-amber-400" />
                Rozpisy operací a směn
              </li>
              <li className="flex items-center gap-2">
                <Trash2 className="w-3 h-3 text-amber-400" />
                Log notifikací
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 text-emerald-400" />
                Operační sály — zachovány, runtime stav resetován
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 text-emerald-400" />
                Personál, oddělení, workflow statusy — zachovány
              </li>
            </ul>

            <button
              onClick={() => onRequestReset('operational')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm bg-amber-500 hover:bg-amber-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Smazat provozní data
            </button>
          </div>

          {/* Full reset */}
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Kompletní reset</h3>
                <p className="text-xs text-red-300/70 uppercase tracking-wider font-bold">Příprava pro jiné zařízení</p>
              </div>
            </div>

            <p className="text-sm text-white/60 leading-relaxed mb-4 flex-1">
              Smaže <strong className="text-white/80">veškerá data</strong> kromě uživatelských účtů a aplikačních
              nastavení. Použijte při nasazení aplikace do zcela nové nemocnice.
            </p>

            <ul className="text-xs text-white/50 space-y-1.5 mb-5">
              <li className="flex items-center gap-2">
                <Trash2 className="w-3 h-3 text-red-400" />
                Všechna provozní data (jako výše)
              </li>
              <li className="flex items-center gap-2">
                <Trash2 className="w-3 h-3 text-red-400" />
                Všechny operační sály
              </li>
              <li className="flex items-center gap-2">
                <Trash2 className="w-3 h-3 text-red-400" />
                Personál, oddělení a jejich sub-oddělení
              </li>
              <li className="flex items-center gap-2">
                <Trash2 className="w-3 h-3 text-red-400" />
                Workflow statusy, kontakty managementu
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 text-emerald-400" />
                Uživatelské účty a moduly — zachovány
              </li>
            </ul>

            <button
              onClick={() => onRequestReset('full')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm bg-red-600 hover:bg-red-700 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              Kompletní reset databáze
            </button>
          </div>
        </div>
      )}

      {lastResult?.success && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-start gap-3">
          <Check className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <p className="text-emerald-300 font-semibold mb-1">Operace dokončena</p>
            <p className="text-emerald-200/70">{lastResult.message}</p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-sm">
        <Info className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
        <p className="text-white/50 leading-relaxed">
          Mazání probíhá přes bezpečnou server-side API s service role klíčem. Akce je zaznamenána s identitou přihlášeného
          administrátora. Pro potvrzení budete muset přesně zadat text{' '}
          <code className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono text-xs">SMAZAT DATA</code>.
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// Panel: Access / Login
// ============================================================================

interface AccessPanelProps {
  user: { email: string; name: string; role: string } | null;
  isAdmin: boolean;
  onLogout: () => void;
  facilityName?: string | null;
}

const AccessPanel: React.FC<AccessPanelProps> = ({ user, isAdmin, onLogout, facilityName }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Přihlášení a přístup</h2>
        <p className="text-sm text-white/50 leading-relaxed max-w-3xl">
          Informace o aktuálně přihlášeném uživateli a o instanci aplikace. Přihlášení určuje, ke kterému zdravotnickému
          zařízení se připojujete a jaká oprávnění máte.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current session */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/20 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-[#10B981]" />
            </div>
            <h3 className="text-base font-bold text-white">Aktuální relace</h3>
          </div>

          <dl className="space-y-3 text-sm">
            <InfoRow label="Jméno" value={user?.name ?? '—'} />
            <InfoRow label="E-mail" value={user?.email ?? '—'} />
            <InfoRow
              label="Role"
              value={
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isAdmin ? 'bg-[#00D8C1]/20 text-[#00D8C1]' : 'bg-white/10 text-white/60'
                  }`}
                >
                  {isAdmin ? 'Administrátor' : 'Uživatel'}
                </span>
              }
            />
          </dl>

          <button
            onClick={onLogout}
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Odhlásit se
          </button>
        </div>

        {/* Facility context */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#0EA5E9]/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#0EA5E9]" />
            </div>
            <h3 className="text-base font-bold text-white">Kontext zařízení</h3>
          </div>

          <dl className="space-y-3 text-sm">
            <InfoRow label="Připojeno k" value={facilityName || 'Nenakonfigurováno'} />
            <InfoRow label="Instance" value="Produkční (single-tenant)" />
          </dl>

          <p className="mt-5 text-xs text-white/40 leading-relaxed">
            Jedna nasazená instance odpovídá jedné nemocnici. Pro více zařízení se aplikace nasazuje vícekrát s oddělenými
            databázemi. Název zařízení nastavíte v záložce <strong className="text-white/60">Zdravotnické zařízení</strong>.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 p-4 rounded-xl bg-[#00D8C1]/5 border border-[#00D8C1]/20 text-sm">
        <Shield className="w-4 h-4 text-[#00D8C1] mt-0.5 flex-shrink-0" />
        <p className="text-white/60 leading-relaxed">
          Chystaná funkce: <strong className="text-white/80">multi-tenant přihlášení</strong> — jedna instance aplikace
          umožní výběr nemocnice přímo při přihlášení, s oddělenými daty pro každé zařízení.
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// Reusable bits
// ============================================================================

interface FieldProps {
  label: string;
  icon: React.FC<{ className?: string }>;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  type?: string;
}

const Field: React.FC<FieldProps> = ({ label, icon: Icon, placeholder, value, onChange, disabled, fullWidth, type }) => (
  <div className={fullWidth ? 'md:col-span-2' : ''}>
    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">{label}</label>
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
      <input
        type={type ?? 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#0EA5E9]/50 focus:ring-1 focus:ring-[#0EA5E9]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  </div>
);

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4">
    <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{label}</dt>
    <dd className="text-white font-medium text-right truncate">{value}</dd>
  </div>
);

// ============================================================================
// Reset confirmation modal
// ============================================================================

interface ResetConfirmModalProps {
  mode: 'operational' | 'full';
  confirmText: string;
  onConfirmTextChange: (v: string) => void;
  loading: boolean;
  result: { success: boolean; message: string } | null;
  onConfirm: () => void;
  onClose: () => void;
}

const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  mode,
  confirmText,
  onConfirmTextChange,
  loading,
  result,
  onConfirm,
  onClose,
}) => {
  const isFull = mode === 'full';
  const accent = isFull ? '#EF4444' : '#F59E0B';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border bg-[#0f0f14] p-6"
        style={{ borderColor: `${accent}40` }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: `${accent}20` }}
          >
            <AlertTriangle className="w-6 h-6" style={{ color: accent }} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {isFull ? 'Kompletní reset databáze' : 'Smazání provozních dat'}
            </h3>
            <p className="text-xs text-white/40">Tuto akci nelze vrátit</p>
          </div>
        </div>

        <p className="text-sm text-white/60 leading-relaxed mb-4">
          {isFull
            ? 'Smažete veškerá data kromě uživatelských účtů. Opravdu pokračovat?'
            : 'Smažete historii, rozpisy a notifikace. Konfigurace zůstane zachována. Opravdu pokračovat?'}
        </p>

        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">
          Pro potvrzení zadejte přesně: <span className="text-white">SMAZAT DATA</span>
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={e => onConfirmTextChange(e.target.value)}
          disabled={loading || !!result?.success}
          placeholder="SMAZAT DATA"
          className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none transition-all disabled:opacity-50 font-mono tracking-widest"
          style={{ borderColor: confirmText === 'SMAZAT DATA' ? accent : undefined }}
        />

        {result && !result.success && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>{result.message}</span>
          </div>
        )}

        {result?.success && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
            <Check className="w-4 h-4" />
            <span>{result.message}</span>
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {result?.success ? 'Zavřít' : 'Zrušit'}
          </button>
          {!result?.success && (
            <button
              onClick={onConfirm}
              disabled={loading || confirmText !== 'SMAZAT DATA'}
              className="flex-1 py-3 rounded-xl text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: accent }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>Smazat nyní</span>
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SystemSettingsModule;
