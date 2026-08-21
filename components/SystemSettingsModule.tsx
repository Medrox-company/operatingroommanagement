'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Building2,
  Database,
  Shield,
  ShieldCheck,
  Layers,
  Crown,
  AlertTriangle,
  Check,
  X,
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
  LayoutGrid,
  Activity,
  Stethoscope,
  Briefcase,
  ClipboardList,
  User as UserIcon,
  SlidersHorizontal,
  Download,
  Upload,
  FileJson,
  HardDriveDownload,
  HardDriveUpload,
  RotateCcw,
  Smartphone,
  Edit3,
  ShieldOff,
  Globe,
  Monitor,
  Tablet,
  ChevronDown,
  UserRoundCheck,
  UserRoundX,
  Gauge,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth, UserRole, AppModule, AppSubmodule, ROLE_LABELS } from '../contexts/AuthContext';
import { useHospital, type Hospital } from '../contexts/HospitalContext';
import { logger } from '../lib/logger';
import { usePWAInstall } from './PWAInstaller';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import SpeedDiagnosticsPanel from './SpeedDiagnosticsPanel';
import { useHospitalRealtime } from '../contexts/RealtimeContext';

interface HospitalInfo {
  id?: string;
  hospital_name?: string | null;
  hospital_short_name?: string | null;
  hospital_address?: string | null;
  hospital_city?: string | null;
  hospital_zip?: string | null;
  hospital_country?: string | null;
  hospital_ico?: string | null;
  hospital_contact_phone?: string | null;
  hospital_contact_email?: string | null;
  hospital_notes?: string | null;
}

type TabId = 'hospital' | 'modules' | 'diagnostics' | 'database' | 'access';

const COLORS = {
  cyan: '#36D9EC',
  green: '#34D399',
  amber: '#FBBF24',
  red: '#FB7185',
  blue: '#38BDF8',
  violet: '#A78BFA',
};

/**
 * Materiál povrchů — shodný se zbytkem Nastavení: chladný nádech okraje,
 * jemné vnitřní světlo shora. Barvu nesou pouze ikony, plochy zůstávají
 * neutrální, aby matice oprávnění nebyla pestrá.
 */
const SURFACE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.024)',
  border: '1px solid rgba(125,165,185,0.18)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)',
};
const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.018)',
  border: '1px solid rgba(125,165,185,0.14)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)',
};
const CARD_OFF: React.CSSProperties = {
  background: 'rgba(255,255,255,0.008)',
  border: '1px solid rgba(125,165,185,0.07)',
};
const TILE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.022)',
  border: '1px solid rgba(125,165,185,0.13)',
};
const TILE_ACTIVE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.055)',
  border: '1px solid rgba(125,165,185,0.28)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
};

const TIER_COLOR = { superadmin: '#E0574F', admin: '#D99C35', roles: '#38BDF8' } as const;

/** Panel Nastavení ↔ podmodul, kterým se řídí jeho viditelnost. */
const SETTINGS_TAB_SUBMODULE: Record<TabId, string> = {
  hospital: 'settings.hospital',
  modules: 'settings.modules',
  diagnostics: 'settings.diagnostics',
  database: 'settings.database',
  access: 'settings.access',
};

const SystemSettingsModule: React.FC = () => {
  const { user, isAdmin, isSuperAdmin, canManageModuleRoles, logout, modules, submodules, toggleModule, toggleModuleRole, toggleSubmoduleRole, hasSubmoduleAccess } = useAuth();
  const { hospitals, activeHospital, activeHospitalId, selectHospital, refreshHospitals, loading: hospitalsLoading } = useHospital();
  // Otevřený panel přežije i případné přemontování komponenty (např. když
  // uložení nastavení vyvolá načtení modulů). Bez toho by uživatele po každé
  // změně vrátilo zpět na „Zdravotnické zařízení".
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window === 'undefined') return 'hospital';
    const saved = window.sessionStorage.getItem('orm-settings-tab');
    return saved && saved in SETTINGS_TAB_SUBMODULE ? (saved as TabId) : 'hospital';
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem('orm-settings-tab', activeTab);
    } catch {
      // Bez sessionStorage se panel jen nezapamatuje, nic dalšího se neděje.
    }
  }, [activeTab]);

  // Kdyby role ztratila přístup k právě otevřenému panelu, přepneme na první
  // dostupný — jinak by zůstala prázdná obrazovka.
  //
  // Pozor na závislosti: `hasSubmoduleAccess` z kontextu mění identitu při
  // každé úpravě modulů, takže po každém přepnutí role by se efekt spustil
  // znovu a uživatele to vyhodilo zpět na první panel. Proto se tu vyhodnocuje
  // jen konkrétní seznam rolí aktivního panelu a efekt reaguje výhradně na
  // jeho skutečnou změnu.
  const activeTabSubmoduleId = SETTINGS_TAB_SUBMODULE[activeTab];
  const activeTabRolesKey = (
    submodules.find(s => s.id === activeTabSubmoduleId)?.allowed_roles ?? []
  ).join(',');

  useEffect(() => {
    // Superadministrátor má přístup ke všemu, není co hlídat.
    if (user?.role === 'superadmin') return;
    // Dokud se podmoduly nenačetly, nic nepřepínáme.
    if (submodules.length === 0) return;

    const activeSub = submodules.find(s => s.id === activeTabSubmoduleId);
    if (!activeSub) return; // neznámý panel = bez omezení
    if (activeSub.allowed_roles?.includes(user?.role ?? '')) return;

    const fallback = (Object.keys(SETTINGS_TAB_SUBMODULE) as TabId[]).find(id => {
      const sub = submodules.find(s => s.id === SETTINGS_TAB_SUBMODULE[id]);
      return sub?.allowed_roles?.includes(user?.role ?? '');
    });
    if (fallback && fallback !== activeTab) setActiveTab(fallback);
    // Reagujeme jen na změnu panelu nebo jeho vlastních oprávnění.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeTabRolesKey, user?.role, submodules.length]);

  const { isInstallable, isInstalled, handleInstall } = usePWAInstall();
  const [installLoading, setInstallLoading] = useState(false);

  // Hospital state
  const [hospital, setHospital] = useState<HospitalInfo>({});
  const [hospitalLoading, setHospitalLoading] = useState(true);
  const [hospitalSaving, setHospitalSaving] = useState(false);
  const [hospitalMessage, setHospitalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Database reset state
  const [resetMode, setResetMode] = useState<'operational' | 'full' | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{ success: boolean; message: string; details?: Record<string, unknown> } | null>(null);

  // Export / Import state
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{
    version?: string;
    exportedAt?: string;
    exportedBy?: string;
    hospital?: { name?: string | null; ico?: string | null };
    totalRows: number;
    tableCount: number;
  } | null>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importConfirmText, setImportConfirmText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  // Aktivní zařízení spravuje globální kontext, aby se současně přepnuly i sály.
  useEffect(() => {
    if (activeHospital) setHospital(activeHospital);
    setHospitalLoading(hospitalsLoading);
  }, [activeHospital, hospitalsLoading]);

  const handleNewHospital = useCallback(() => {
    setHospital({ hospital_country: 'Česká republika' });
    setHospitalMessage(null);
  }, []);

  const handleHospitalChange = useCallback((key: keyof HospitalInfo, value: string) => {
    setHospital(prev => ({ ...prev, [key]: value }));
    setHospitalMessage(null);
  }, []);

  const handleHospitalSave = useCallback(async () => {
    setHospitalSaving(true);
    setHospitalMessage(null);
    try {
      const res = await fetch('/api/admin/hospital', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hospital),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refreshHospitals();
        if (data.hospital?.id) selectHospital(data.hospital.id);
        setHospital(data.hospital || hospital);
        setHospitalMessage({ type: 'success', text: hospital.id ? 'Informace o zařízení byly uloženy.' : 'Nové zařízení bylo přidáno.' });
      } else {
        setHospitalMessage({ type: 'error', text: data.error || 'Uložení se nezdařilo.' });
      }
    } catch (e: unknown) {
      setHospitalMessage({ type: 'error', text: e instanceof Error ? e.message : 'Síťová chyba při ukládání.' });
    } finally {
      setHospitalSaving(false);
    }
  }, [hospital, refreshHospitals, selectHospital]);

  const handlePWAInstall = useCallback(async () => {
    setInstallLoading(true);
    try {
      const success = await handleInstall();
      if (success) {
        logger.info('[v0] PWA installation completed');
      }
    } catch (error) {
      console.error('[v0] PWA installation error:', error);
    } finally {
      setInstallLoading(false);
    }
  }, [handleInstall]);

  const handleResetConfirm = useCallback(async () => {
    if (!resetMode) return;
    if (resetConfirmText !== 'SMAZAT DATA') return;

    setResetLoading(true);
    setResetResult(null);
    try {
      const res = await fetch('/api/admin/reset-data', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: resetMode,
          confirmation: resetConfirmText,
          hospitalId: activeHospitalId,
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

  // ---- Export ---------------------------------------------------------------
  const handleExport = useCallback(async () => {
    setExportLoading(true);
    setExportMessage(null);
    try {
      const res = await fetch(`/api/admin/export-data?hospitalId=${encodeURIComponent(activeHospitalId || '')}`, { credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Export selhal (${res.status})`);
      }
      const blob = await res.blob();

      // Vytáhni filename z Content-Disposition, s fallbackem
      const cd = res.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || `or-backup_${new Date().toISOString().slice(0, 10)}.json`;

      // Stáhni
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);

      setExportMessage({ type: 'success', text: `Záloha stažena: ${filename}` });
    } catch (e: unknown) {
      setExportMessage({ type: 'error', text: e instanceof Error ? e.message : 'Chyba při exportu.' });
    } finally {
      setExportLoading(false);
    }
  }, [user?.email]);

  // ---- Import: načti soubor, ukaž náhled -----------------------------------
  const handleImportFile = useCallback(async (file: File | null) => {
    setImportFile(file);
    setImportPreview(null);
    setImportResult(null);
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        version?: string;
        exportedAt?: string;
        exportedBy?: string;
        hospital?: { name?: string | null; ico?: string | null };
        tables?: Record<string, unknown[]>;
      };

      if (!parsed.tables || typeof parsed.tables !== 'object') {
        throw new Error('Soubor neobsahuje platnou strukturu zálohy (chybí "tables").');
      }

      const tableCount = Object.keys(parsed.tables).length;
      const totalRows = Object.values(parsed.tables).reduce(
        (sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0),
        0
      );

      setImportPreview({
        version: parsed.version,
        exportedAt: parsed.exportedAt,
        exportedBy: parsed.exportedBy,
        hospital: parsed.hospital,
        totalRows,
        tableCount,
      });
    } catch (e: unknown) {
      setImportFile(null);
      setImportPreview(null);
      setImportResult({
        success: false,
        message: e instanceof Error ? e.message : 'Soubor nelze přečíst.',
      });
    }
  }, []);

  // ---- Import: potvrď a odešli na server -----------------------------------
  const handleImportConfirm = useCallback(async () => {
    if (!importFile) return;
    if (importConfirmText !== 'OBNOVIT DATA') return;

    setImportLoading(true);
    setImportResult(null);

    try {
      const text = await importFile.text();
      const backup = JSON.parse(text);

      const res = await fetch('/api/admin/import-data', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation: importConfirmText,
          backup,
          hospitalId: activeHospitalId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setImportResult({
          success: true,
          message: 'Data byla úspěšně obnovena ze zálohy. Obnovte stránku pro načtení nových dat.',
        });
        setTimeout(() => {
          setImportConfirmOpen(false);
          setImportConfirmText('');
        }, 1500);
      } else {
        setImportResult({ success: false, message: data.error || 'Obnova selhala.' });
      }
    } catch (e: unknown) {
      setImportResult({
        success: false,
        message: e instanceof Error ? e.message : 'Chyba při obnově.',
      });
    } finally {
      setImportLoading(false);
    }
  }, [importFile, importConfirmText, user?.email]);

  const closeImportDialog = () => {
    if (importLoading) return;
    setImportConfirmOpen(false);
    setImportConfirmText('');
    setImportResult(null);
  };

  const systemStats = useMemo(() => {
    const enabledModules = modules.filter(module => module.is_enabled).length;
    const disabledModules = modules.length - enabledModules;
    const configuredRoles = new Set(
      modules.flatMap(module => module.allowed_roles || []),
    ).size;

    return {
      hospital: hospital.hospital_name?.trim() ? 1 : 0,
      enabledModules,
      disabledModules,
      configuredRoles,
      pwa: isInstalled ? 1 : 0,
    };
  }, [hospital.hospital_name, isInstalled, modules]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="min-h-full w-full pb-8 font-sans">
      <header className="mb-7 space-y-3">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-4 w-4 text-[#FBBF24]" />
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#FBBF24]">SYSTEM CONTROL</p>
        </div>
        <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-bold uppercase leading-none tracking-tight">
          Nastavení <span className="text-white/20">SYSTÉMU</span>
        </h1>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <p className="text-sm font-medium text-white/40">
            Identita zařízení, dostupné moduly, zabezpečení a správa dat
          </p>
          <div className="inline-flex items-center gap-2 text-[9px] font-bold tracking-[0.16em] text-emerald-300/75">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            SYSTÉMOVÁ KONFIGURACE AKTIVNÍ
          </div>
        </div>
      </header>

      <section
        className="relative mb-4 overflow-hidden rounded-[26px] p-2.5"
        style={{
          background: 'rgba(255,255,255,0.024)',
          border: '1px solid rgba(125,165,185,0.18)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)',
        }}
      >
        <div
          aria-hidden
          className="absolute inset-x-24 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(54,217,236,0.45), transparent)' }}
        />
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-5">
          {[
            { label: 'Zařízení', value: systemStats.hospital, suffix: 'konfigurace', color: systemStats.hospital ? COLORS.green : COLORS.amber, icon: Building2 },
            { label: 'Aktivní moduly', value: systemStats.enabledModules, suffix: 'modulů', color: COLORS.cyan, icon: LayoutGrid },
            { label: 'Vypnuté moduly', value: systemStats.disabledModules, suffix: 'modulů', color: systemStats.disabledModules ? COLORS.amber : COLORS.green, icon: ShieldOff },
            { label: 'Nastavené role', value: systemStats.configuredRoles, suffix: 'rolí', color: COLORS.blue, icon: UserCog },
            { label: 'Instalace PWA', value: systemStats.pwa, suffix: systemStats.pwa ? 'aktivní' : 'prohlížeč', color: COLORS.violet, icon: Smartphone },
          ].map(({ label, value, suffix, color, icon: Icon }, index) => (
            <div
              key={label}
              className={`relative flex min-h-[78px] flex-col justify-between rounded-2xl px-3.5 py-3 ${index === 4 ? 'col-span-2 md:col-span-1' : ''}`}
              style={{ background: `${color}08`, border: `1px solid ${color}17` }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/38">{label}</p>
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tabular-nums tracking-tight" style={{ color }}>{value}</span>
                <span className="text-[9px] text-white/25">{suffix}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="mb-5 flex items-center gap-1 overflow-x-auto rounded-[22px] p-2 hide-scrollbar"
        style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(125,165,185,0.14)' }}
      >
{/* Panely Nastavení jsou podmoduly — superadministrátor u nich řídí, které
    role je uvidí. Zakázaný panel se v liště vůbec nezobrazí. */}
{([
  { id: 'hospital' as const, label: 'Zdravotnické zařízení', icon: Building2, sub: 'settings.hospital' },
  { id: 'modules' as const,  label: 'Správa modulů',         icon: SlidersHorizontal, sub: 'settings.modules' },
  { id: 'diagnostics' as const, label: 'Rychlost a připojení', icon: Gauge, sub: 'settings.diagnostics' },
  { id: 'database' as const, label: 'Administrace databáze', icon: Database, sub: 'settings.database' },
  { id: 'access' as const,   label: 'Přihlášení a přístup',  icon: UserCog, sub: 'settings.access' },
  ]).filter(tab => hasSubmoduleAccess(tab.sub)).map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-xs font-semibold transition-colors"
              style={isActive
                ? { background: 'rgba(54,217,236,0.12)', color: COLORS.cyan, border: '1px solid rgba(54,217,236,0.22)' }
                : { color: 'rgba(255,255,255,0.42)', border: '1px solid transparent' }}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </section>

      <div
        className="relative overflow-hidden rounded-[22px] p-4 sm:p-6"
        style={{
          background: 'rgba(255,255,255,0.018)',
          border: '1px solid rgba(125,165,185,0.14)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)',
        }}
      >

        <AnimatePresence mode="wait">
          {activeTab === 'hospital' && (
            <motion.div
              key="hospital"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
            <HospitalPanel
              hospital={hospital}
              hospitals={hospitals}
              activeHospitalId={activeHospitalId}
              onSelectHospital={selectHospital}
              onNewHospital={handleNewHospital}
          loading={hospitalLoading}
          saving={hospitalSaving}
          message={hospitalMessage}
          onChange={handleHospitalChange}
          onSave={handleHospitalSave}
          isAdmin={isAdmin}
          isInstallable={isInstallable}
          isInstalled={isInstalled}
          onPWAInstall={handlePWAInstall}
          pwInstallLoading={installLoading}
        />
            </motion.div>
          )}

          {activeTab === 'modules' && (
            <motion.div
              key="modules"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <ModulesPanel
                isAdmin={isAdmin}
                canManageRoles={canManageModuleRoles}
                modules={modules}
                submodules={submodules}
                onToggleModule={toggleModule}
                onToggleRole={toggleModuleRole}
                onToggleSubmoduleRole={toggleSubmoduleRole}
              />
            </motion.div>
          )}

          {activeTab === 'diagnostics' && (
            <motion.div
              key="diagnostics"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <SpeedDiagnosticsPanel
                hospitalId={activeHospitalId}
                hospitalName={hospital.hospital_name}
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
                exportLoading={exportLoading}
                exportMessage={exportMessage}
                onExport={handleExport}
                importFile={importFile}
                importPreview={importPreview}
                onImportFile={handleImportFile}
                onRequestImport={() => {
                  setImportConfirmOpen(true);
                  setImportConfirmText('');
                  setImportResult(null);
                }}
                onClearImport={() => {
                  setImportFile(null);
                  setImportPreview(null);
                  setImportResult(null);
                }}
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
              <AccessPanel user={user} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} onLogout={logout} hospitalName={hospital.hospital_name} hospitalId={activeHospitalId} />
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

      {/* Import confirmation modal */}
      <AnimatePresence>
        {importConfirmOpen && importPreview && (
          <ImportConfirmModal
            preview={importPreview}
            confirmText={importConfirmText}
            onConfirmTextChange={setImportConfirmText}
            loading={importLoading}
            result={importResult}
            onConfirm={handleImportConfirm}
            onClose={closeImportDialog}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// Panel: Hospital
// ============================================================================

interface HospitalPanelProps {
  hospital: HospitalInfo;
  hospitals: Hospital[];
  activeHospitalId: string | null;
  onSelectHospital: (id: string) => void;
  onNewHospital: () => void;
  loading: boolean;
  saving: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
  onChange: (key: keyof HospitalInfo, value: string) => void;
  onSave: () => void;
  isAdmin: boolean;
  isInstallable?: boolean;
  isInstalled?: boolean;
  onPWAInstall?: () => void;
  pwInstallLoading?: boolean;
}

const HospitalPanel: React.FC<HospitalPanelProps> = ({ hospital, hospitals, activeHospitalId, onSelectHospital, onNewHospital, loading, saving, message, onChange, onSave, isAdmin, isInstallable, isInstalled, onPWAInstall, pwInstallLoading }) => {
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

      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.05] p-4">
        <div className="flex-1">
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/60 mb-2">
            Aktivní nemocniční zařízení
          </label>
          <select
            value={hospital.id || activeHospitalId || ''}
            onChange={e => onSelectHospital(e.target.value)}
            disabled={!hospital.id}
            className="w-full bg-[#10151d] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
          >
            {!hospital.id && <option value="">Nové zařízení</option>}
            {hospitals.map(item => (
              <option key={item.id} value={item.id}>{item.hospital_name}</option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={onNewHospital}
            className="self-end flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-200 hover:bg-cyan-400/15"
          >
            <Building2 className="w-4 h-4" />
            Přidat zařízení
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Název nemocnice"
          icon={Building2}
          placeholder="Např. Nemocnice Jihlava, p.o."
          value={hospital.hospital_name ?? ''}
          onChange={v => onChange('hospital_name', v)}
          disabled={!isAdmin}
          fullWidth
        />
        <Field
          label="Zkrácený název"
          icon={Hash}
          placeholder="Např. NJ"
          value={hospital.hospital_short_name ?? ''}
          onChange={v => onChange('hospital_short_name', v)}
          disabled={!isAdmin}
        />
        <Field
          label="IČO"
          icon={Hash}
          placeholder="00000000"
          value={hospital.hospital_ico ?? ''}
          onChange={v => onChange('hospital_ico', v)}
          disabled={!isAdmin}
        />
        <Field
          label="Adresa"
          icon={MapPin}
          placeholder="Ulice a číslo popisné"
          value={hospital.hospital_address ?? ''}
          onChange={v => onChange('hospital_address', v)}
          disabled={!isAdmin}
          fullWidth
        />
        <Field
          label="Město"
          icon={MapPin}
          placeholder="Jihlava"
          value={hospital.hospital_city ?? ''}
          onChange={v => onChange('hospital_city', v)}
          disabled={!isAdmin}
        />
        <Field
          label="PSČ"
          icon={MapPin}
          placeholder="586 01"
          value={hospital.hospital_zip ?? ''}
          onChange={v => onChange('hospital_zip', v)}
          disabled={!isAdmin}
        />
        <Field
          label="Kontaktní telefon"
          icon={Phone}
          placeholder="+420 ..."
          value={hospital.hospital_contact_phone ?? ''}
          onChange={v => onChange('hospital_contact_phone', v)}
          disabled={!isAdmin}
          type="tel"
        />
        <Field
          label="Kontaktní e-mail"
          icon={Mail}
          placeholder="info@nemocnice.cz"
          value={hospital.hospital_contact_email ?? ''}
          onChange={v => onChange('hospital_contact_email', v)}
          disabled={!isAdmin}
          type="email"
        />
        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">
            Poznámky
          </label>
          <textarea
            value={hospital.hospital_notes ?? ''}
            onChange={e => onChange('hospital_notes', e.target.value)}
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
          <span>{hospital.id ? 'Uložit informace' : 'Vytvořit zařízení'}</span>
        </button>
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
          <Lock className="w-4 h-4" />
          <span>Úpravy může provádět pouze administrátor.</span>
        </div>
      )}

      {/* PWA Install Section */}
      {(isInstallable || isInstalled) && (
        <>
          <div className="flex items-center gap-3 pt-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
              Mobilní aplikace
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* PWA Install Card - show when installable */}
          {isInstallable && !isInstalled && (
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Nainstalovat jako aplikaci</h3>
                  <p className="text-xs text-blue-300/70 uppercase tracking-wider font-bold">Android, iOS, Mac</p>
                </div>
              </div>

              <p className="text-sm text-white/60 leading-relaxed mb-4">
                Nainstalujte aplikaci přímo na domovskou obrazovku vašeho zařízení. Aplikace bude fungovat bez prohlížeče a podpoří offline režim.
              </p>

              <button
                onClick={onPWAInstall}
                disabled={pwInstallLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pwInstallLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Smartphone className="w-4 h-4" />
                )}
                Nainstalovat aplikaci
              </button>
            </div>
          )}

          {/* PWA Already Installed */}
          {isInstalled && (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/[0.04] p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-300">Aplikace je již nainstalována</p>
                  <p className="text-xs text-green-300/60">Najdete ji na domovské obrazovce vašeho zařízení</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ============================================================================
// Panel: Database
// ============================================================================

interface ImportPreview {
  version?: string;
  exportedAt?: string;
  exportedBy?: string;
  hospital?: { name?: string | null; ico?: string | null };
  totalRows: number;
  tableCount: number;
}

interface DatabasePanelProps {
  isAdmin: boolean;
  onRequestReset: (mode: 'operational' | 'full') => void;
  lastResult: { success: boolean; message: string; details?: Record<string, unknown> } | null;
  exportLoading: boolean;
  exportMessage: { type: 'success' | 'error'; text: string } | null;
  onExport: () => void;
  importFile: File | null;
  importPreview: ImportPreview | null;
  onImportFile: (file: File | null) => void;
  onRequestImport: () => void;
  onClearImport: () => void;
}

const DatabasePanel: React.FC<DatabasePanelProps> = ({
  isAdmin,
  onRequestReset,
  lastResult,
  exportLoading,
  exportMessage,
  onExport,
  importFile,
  importPreview,
  onImportFile,
  onRequestImport,
  onClearImport,
}) => {
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
              Smaže <strong className="text-white/80">veškerá data</strong> kromě u��ivatelských účtů a aplikačních
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

      {/* ---------- Backup & Restore ---------- */}
      {isAdmin && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
              Záloha a obnova
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Export */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <HardDriveDownload className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Exportovat databázi</h3>
                  <p className="text-xs text-emerald-300/70 uppercase tracking-wider font-bold">
                    Stáhnout zálohu
                  </p>
                </div>
              </div>

              <p className="text-sm text-white/60 leading-relaxed mb-4 flex-1">
                Stáhne kompletní zálohu databáze jako JSON soubor. Obsahuje veškerou konfiguraci i provozní data — s
                výjimkou hesel uživatelů. Záloha je připravena pro pozdější obnovu.
              </p>

              <ul className="text-xs text-white/50 space-y-1.5 mb-5">
                <li className="flex items-center gap-2">
                  <FileJson className="w-3 h-3 text-emerald-400" />
                  Všechny tabulky v jednom JSON souboru
                </li>
                <li className="flex items-center gap-2">
                  <Download className="w-3 h-3 text-emerald-400" />
                  Automatické stažení do prohlížeče
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  Hesla uživatelů jsou vyloučena
                </li>
              </ul>

              <button
                onClick={onExport}
                disabled={exportLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {exportLoading ? 'Exportuji…' : 'Exportovat databázi'}
              </button>

              {exportMessage && (
                <div
                  className={`mt-3 flex items-start gap-2 p-3 rounded-xl text-xs ${
                    exportMessage.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border border-red-500/30 text-red-300'
                  }`}
                >
                  {exportMessage.type === 'success' ? (
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{exportMessage.text}</span>
                </div>
              )}
            </div>

            {/* Import */}
            <div className="rounded-2xl border border-[#0EA5E9]/20 bg-[#0EA5E9]/[0.04] p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#0EA5E9]/20 flex items-center justify-center">
                  <HardDriveUpload className="w-5 h-5 text-[#0EA5E9]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Obnovit ze zálohy</h3>
                  <p className="text-xs text-[#0EA5E9]/70 uppercase tracking-wider font-bold">
                    Nahrát JSON soubor
                  </p>
                </div>
              </div>

              <p className="text-sm text-white/60 leading-relaxed mb-4">
                Nahrajte dříve vyexportovaný JSON soubor. Stávající data budou{' '}
                <strong className="text-white/80">přepsána</strong> obsahem zálohy. Uživatelské účty zůstanou zachovány.
              </p>

              {/* File picker / preview */}
              {!importFile ? (
                <label className="mb-5 flex-1 flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-xl border-2 border-dashed border-white/15 hover:border-[#0EA5E9]/50 hover:bg-white/[0.02] cursor-pointer transition-all">
                  <Upload className="w-6 h-6 text-white/30" />
                  <span className="text-sm text-white/60 font-medium">Vyberte JSON soubor se zálohou</span>
                  <span className="text-[11px] text-white/30">Klikněte pro výběr nebo přetáhněte soubor sem</span>
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={e => onImportFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              ) : (
                <div className="mb-5 flex-1">
                  <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileJson className="w-5 h-5 text-[#0EA5E9] flex-shrink-0" />
                        <span className="text-sm text-white font-medium truncate">{importFile.name}</span>
                      </div>
                      <button
                        onClick={onClearImport}
                        aria-label="Odebrat soubor"
                        className="text-white/40 hover:text-white/80 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {importPreview && (
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-white/5 text-xs">
                        <dt className="text-white/40">Tabulek:</dt>
                        <dd className="text-white text-right font-mono">{importPreview.tableCount}</dd>
                        <dt className="text-white/40">Záznamů:</dt>
                        <dd className="text-white text-right font-mono">{importPreview.totalRows.toLocaleString('cs-CZ')}</dd>
                        {importPreview.hospital?.name && (
                          <>
                            <dt className="text-white/40">Zařízení:</dt>
                            <dd className="text-white text-right truncate">{importPreview.hospital.name}</dd>
                          </>
                        )}
                        {importPreview.exportedAt && (
                          <>
                            <dt className="text-white/40">Vytvořeno:</dt>
                            <dd className="text-white text-right font-mono text-[11px]">
                              {new Date(importPreview.exportedAt).toLocaleString('cs-CZ')}
                            </dd>
                          </>
                        )}
                        {importPreview.exportedBy && (
                          <>
                            <dt className="text-white/40">Autor:</dt>
                            <dd className="text-white text-right truncate">{importPreview.exportedBy}</dd>
                          </>
                        )}
                      </dl>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={onRequestImport}
                disabled={!importFile || !importPreview}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm bg-[#0EA5E9] hover:bg-[#0284C7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                Obnovit data ze zálohy
              </button>
            </div>
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
          Mazání i obnova probíhají přes bezpečnou server-side API s service role klíčem. Akce je zaznamenána s identitou
          přihlášeného administrátora. Pro potvrzení budete muset přesně zadat text{' '}
          <code className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono text-xs">SMAZAT DATA</code> nebo{' '}
          <code className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono text-xs">OBNOVIT DATA</code>.
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
  isSuperAdmin: boolean;
  onLogout: () => void;
  hospitalName?: string | null;
  hospitalId: string | null;
}

interface HospitalAccessUser {
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

const AccessPanel: React.FC<AccessPanelProps> = ({ user, isAdmin, isSuperAdmin, onLogout, hospitalName, hospitalId }) => {
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
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Odhlásit se
          </button>
        </div>

        {/* Hospital context */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#0EA5E9]/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#0EA5E9]" />
            </div>
            <h3 className="text-base font-bold text-white">Kontext zařízení</h3>
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
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Uživatelé nemocnice</h3>
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

// ============================================================================
// Reusable bits
// ============================================================================

interface FieldProps {
  label: string;
  icon: LucideIcon;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  type?: string;
}

const Field: React.FC<FieldProps> = ({ label, icon: Icon, placeholder, value, onChange, disabled, fullWidth, type }) => (
  <div className={fullWidth ? 'md:col-span-2' : ''}>
    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">{label}</label>
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
    <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{label}</dt>
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
            ? 'Sma��ete veškerá data kromě uživatelských účtů. Opravdu pokračovat?'
            : 'Smažete historii, rozpisy a notifikace. Konfigurace zůstane zachována. Opravdu pokračovat?'}
        </p>

        <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">
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

// ============================================================================
// Panel: Modules (per-role access matrix)
// ============================================================================

interface ModulesPanelProps {
  isAdmin: boolean;
  /** Přepínat přístup rolí k modulům smí výhradně superadministrátor. */
  canManageRoles: boolean;
  modules: AppModule[];
  submodules: AppSubmodule[];
  onToggleModule: (moduleId: string, enabled: boolean) => Promise<boolean>;
  onToggleRole: (moduleId: string, role: UserRole, enabled: boolean) => Promise<boolean>;
  onToggleSubmoduleRole: (submoduleId: string, role: UserRole, enabled: boolean) => Promise<boolean>;
}

/**
 * Role, kterým se přístup k modulům nastavuje. Superadministrátor ani
 * administrátor tu nejsou — mají přístup ke všemu z principu a nedá se jim
 * odebrat, jinak by si mohli zamknout cestu zpět do nastavení.
 */
type RoleDef = { id: UserRole; label: string; icon: LucideIcon; color: string };

/** Administrátorská úroveň — stojí zvlášť nad provozními rolemi. */
const ADMIN_ROLE: RoleDef = { id: 'admin', label: 'Administrátor', icon: ShieldCheck, color: '#D99C35' };

/** Provozní role — vykreslují se ve dvojicích pod administrátorem. */
const OPERATIONAL_ROLES: RoleDef[] = [
  { id: 'aro',        label: 'ARO',        icon: Activity,      color: '#EF4444' },
  { id: 'cos',        label: 'COS',        icon: Stethoscope,   color: '#06B6D4' },
  { id: 'management', label: 'Management', icon: Briefcase,     color: '#F59E0B' },
  { id: 'primar',     label: 'Primariát',  icon: ClipboardList, color: '#A855F7' },
];

/** Všechny nastavitelné role dohromady (pro počítadla). */
const ROLE_DEFS: RoleDef[] = [ADMIN_ROLE, ...OPERATIONAL_ROLES];

/**
 * Úrovně přístupu vysvětlené v záhlaví panelu. Slouží k tomu, aby bylo na první
 * pohled zřejmé, že superadministrátor stojí nad administrátorem a že provozní
 * role se nastavují níže v matici.
 */
const ACCESS_TIERS: Array<{
  id: 'superadmin' | 'admin' | 'roles';
  label: string;
  level: string;
  description: string;
  icon: LucideIcon;
  color: string;
}> = [
  {
    id: 'superadmin',
    label: 'Superadministrátor',
    level: 'Bez omezení',
    description: 'Všechny moduly a funkce včetně administrátorského rozhraní. Jako jediný nastavuje přístup ostatních rolí.',
    icon: Crown,
    color: '#E0574F',
  },
  {
    id: 'admin',
    label: 'Administrátor',
    level: 'Správa systému',
    description: 'Všechny moduly a správa nemocnice. Nastavení přístupu rolí vidí, ale nemění.',
    icon: ShieldCheck,
    color: '#D99C35',
  },
  {
    id: 'roles',
    label: 'Provozní role',
    level: 'Dle nastavení',
    description: 'ARO, COS, Management a Primariát vidí jen moduly povolené v matici níže.',
    icon: UserCog,
    color: '#60A5FA',
  },
];

const MODULE_ICON_MAP: Record<string, LucideIcon> = {
  LayoutGrid,
  Calendar: SlidersHorizontal, // fallback
  BarChart3: SlidersHorizontal,
  Users: UserCog,
  Bell: AlertTriangle,
  Settings: SettingsIcon,
  Shield,
};

const ModulesPanel: React.FC<ModulesPanelProps> = ({ isAdmin, canManageRoles, modules, submodules, onToggleModule, onToggleRole, onToggleSubmoduleRole }) => {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
        <Lock className="w-5 h-5" />
        <span>Správa modulů je dostupná pouze pro administrátora.</span>
      </div>
    );
  }

  const sortedModules = [...modules].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const handleGlobalToggle = async (moduleId: string, currentEnabled: boolean) => {
    if (moduleId === 'settings') return; // cannot disable settings
    const key = `g:${moduleId}`;
    setPendingKey(key);
    await onToggleModule(moduleId, !currentEnabled);
    setPendingKey(null);
  };

  const handleRoleToggle = async (moduleId: string, role: UserRole, currentEnabled: boolean) => {
    if (!canManageRoles) return; // měnit smí jen superadministrátor
    const key = `${moduleId}:${role}`;
    setPendingKey(key);
    await onToggleRole(moduleId, role, !currentEnabled);
    setPendingKey(null);
  };

  /** Jedna přepínatelná dlaždice role u modulu. */
  const renderRoleTile = (mod: AppModule, role: RoleDef) => {
    const RoleIcon = role.icon;
    const allowed = !!mod.allowed_roles?.includes(role.id);
    const pending = pendingKey === `${mod.id}:${role.id}`;
    const disabled = !mod.is_enabled || !canManageRoles;

    return (
      <button
        key={role.id}
        type="button"
        onClick={() => handleRoleToggle(mod.id, role.id, allowed)}
        disabled={disabled || pending}
        aria-pressed={allowed}
        title={
          disabled
            ? (!canManageRoles ? 'Měnit smí pouze superadministrátor' : 'Modul je vypnutý')
            : allowed ? `Odebrat přístup roli ${role.label}` : `Povolit přístup roli ${role.label}`
        }
        className="flex w-full items-center gap-2 rounded-2xl px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45"
        style={allowed ? { ...TILE_ACTIVE, color: '#FFFFFF' } : { ...TILE, color: 'rgba(255,255,255,0.42)' }}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
          <RoleIcon className="h-3.5 w-3.5" style={{ color: allowed ? role.color : 'rgba(255,255,255,0.22)' }} />
        </span>
        <span className="min-w-0 flex-1 truncate text-left">{role.label}</span>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.05]">
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin text-white/60" />
          ) : allowed ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <X className="h-3 w-3 text-white/25" />
          )}
        </span>
      </button>
    );
  };

  const handleSubmoduleRoleToggle = async (submoduleId: string, role: UserRole, currentEnabled: boolean) => {
    if (!canManageRoles) return;
    const key = `sub:${submoduleId}:${role}`;
    setPendingKey(key);
    await onToggleSubmoduleRole(submoduleId, role, !currentEnabled);
    setPendingKey(null);
  };

  /** Dlaždice role u podmodulu — stejná logika, jen menší měřítko. */
  const renderSubmoduleRoleTile = (mod: AppModule, sub: AppSubmodule, role: RoleDef) => {
    const RoleIcon = role.icon;
    const allowed = !!sub.allowed_roles?.includes(role.id);
    const pending = pendingKey === `sub:${sub.id}:${role.id}`;

    return (
      <button
        key={role.id}
        type="button"
        onClick={() => handleSubmoduleRoleToggle(sub.id, role.id, allowed)}
        disabled={!canManageRoles || !mod.is_enabled || pending}
        aria-pressed={allowed}
        className="flex w-full items-center gap-1.5 rounded-[11px] px-2 py-1.5 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45"
        style={allowed ? { ...TILE_ACTIVE, color: '#FFFFFF' } : { ...TILE, color: 'rgba(255,255,255,0.38)' }}
      >
        <RoleIcon
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: allowed ? role.color : 'rgba(255,255,255,0.2)' }}
        />
        <span className="flex-1 truncate text-left">{role.label}</span>
        {pending ? (
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-white/60" />
        ) : allowed ? (
          <Check className="h-3 w-3 shrink-0 text-emerald-400" />
        ) : (
          <X className="h-3 w-3 shrink-0 text-white/20" />
        )}
      </button>
    );
  };

  const enabledCount = sortedModules.filter(m => m.is_enabled).length;

  return (
    <div className="space-y-4">
      {/* ── Záhlaví: kdo jsem + hierarchie + čísla ─────────────────────────
          Materiál (rádius, nádech okraje, vnitřní světlo) odpovídá ostatním
          sekcím Nastavení, aby panel nevypadal jako cizí prvek. */}
      <section className="relative overflow-hidden rounded-[26px] p-5" style={SURFACE}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/38">Oprávnění</p>
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-white">Správa modulů a rolí</h2>
            <p className="mt-1 text-[12px] text-white/38">Kdo uvidí který modul. Změny se ukládají okamžitě.</p>
          </div>
          <div className="flex items-center gap-3 rounded-[18px] px-4 py-2.5" style={TILE}>
            <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/[0.05]">
              {canManageRoles
                ? <Crown className="h-[18px] w-[18px]" style={{ color: TIER_COLOR.superadmin }} />
                : <ShieldCheck className="h-[18px] w-[18px]" style={{ color: TIER_COLOR.admin }} />}
            </span>
            <div className="leading-tight">
              <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/38">Přihlášen jako</p>
              <p className="mt-0.5 text-[13px] font-semibold text-white">
                {canManageRoles ? 'Superadministrátor' : 'Administrátor'}
              </p>
            </div>
          </div>
        </div>

        {/* Úrovně přístupu */}
        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {ACCESS_TIERS.map((tier, tierIndex) => {
            const TierIcon = tier.icon;
            const isMine = canManageRoles ? tier.id === 'superadmin' : tier.id === 'admin';
            return (
              <div
                key={tier.id}
                className="relative overflow-hidden rounded-[18px] p-3.5"
                style={isMine ? TILE_ACTIVE : TILE}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-white/[0.05]">
                    <TierIcon className="h-4 w-4" style={{ color: tier.color }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-white">{tier.label}</p>
                    <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/38">{tier.level}</p>
                  </div>
                  <span className="text-[22px] font-semibold leading-none tabular-nums text-white/12">
                    {tierIndex + 1}
                  </span>
                </div>
                <p className="mt-2.5 text-[10.5px] leading-relaxed text-white/32">{tier.description}</p>
              </div>
            );
          })}
        </div>

        {/* Čísla — stejný formát jako přehled nahoře v Nastavení */}
        <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { label: 'Modulů celkem', value: sortedModules.length, suffix: 'modulů', color: COLORS.cyan, icon: LayoutGrid },
            { label: 'Zapnuto', value: enabledCount, suffix: 'aktivních', color: COLORS.green, icon: Check },
            { label: 'Vypnuto', value: sortedModules.length - enabledCount, suffix: 'skrytých', color: COLORS.amber, icon: ShieldOff },
            { label: 'Podmodulů', value: submodules.length, suffix: 'částí', color: COLORS.violet, icon: Layers },
          ].map(({ label, value, suffix, color, icon: StatIcon }) => (
            <div key={label} className="flex min-h-[74px] flex-col justify-between rounded-[18px] px-3.5 py-3" style={TILE}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/38">{label}</p>
                <StatIcon className="h-3.5 w-3.5" style={{ color }} />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-white">{value}</span>
                <span className="text-[9px] text-white/25">{suffix}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Moduly ──────────────────────────────────────────────────────── */}
      <div className="grid gap-3.5 md:grid-cols-2 2xl:grid-cols-3">
        {sortedModules.map((mod) => {
          const accent = mod.accent_color || '#64748B';
          const isSettingsModule = mod.id === 'settings';
          const globalPending = pendingKey === `g:${mod.id}`;
          const moduleSubmodules = submodules
            .filter(sub => sub.module_id === mod.id)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

          return (
            <article
              key={mod.id}
              className="relative flex flex-col overflow-hidden rounded-[22px] p-3 font-sans transition-colors"
              style={{
                // Barevné odlišení kartou v odstínu modulu — stejný zápis jako
                // v notifikačním centru: velmi jemný diagonální přechod, ne
                // plocha v plné barvě.
                background: mod.is_enabled
                  ? `linear-gradient(125deg, ${accent}0A, rgba(255,255,255,0.018) 52%, rgba(251,191,36,0.012))`
                  : 'rgba(255,255,255,0.016)',
                border: `1px solid ${mod.is_enabled ? 'rgba(125,165,185,0.16)' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)',
              }}
            >
              {/* Vlásková linka nahoře v barvě modulu — stejný podpis jako mají
                  karty kontaktů v Managementu. */}
              <div
                aria-hidden
                className="absolute inset-x-10 top-0 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${
                    mod.is_enabled ? accent : 'rgba(148,163,184,0.5)'
                  }, transparent)`,
                }}
              />

              {/* Identita vlevo, oprávnění vpravo */}
              <div className="grid gap-3 sm:grid-cols-[136px_minmax(0,1fr)]">
                {/* ── Identita modulu ── */}
                <div
                  className="flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl px-3 py-3"
                  style={{
                    // Sloupec identity nese barvu modulu, stejně jako dlaždice
                    // kanálu v notifikačním centru.
                    background: mod.is_enabled
                      ? `linear-gradient(145deg, ${accent}2E, ${accent}12)`
                      : 'linear-gradient(145deg, rgba(148,163,184,0.11), rgba(148,163,184,0.04))',
                    border: `1px solid ${mod.is_enabled ? `${accent}55` : 'rgba(148,163,184,0.15)'}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Modul</span>
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: mod.is_enabled ? COLORS.green : 'rgba(255,255,255,0.22)' }}
                    />
                  </div>

                  <div className="my-2">
                    <p className="line-clamp-2 text-sm font-bold leading-tight text-white">{mod.name}</p>
                    <p className="mt-1 line-clamp-3 text-[10px] leading-tight text-white/42">
                      {mod.description || '—'}
                    </p>
                  </div>

                  {/* Stav modulu + přepínač na jednom řádku */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[9px] font-semibold ${
                        mod.is_enabled ? 'text-emerald-300/75' : 'text-white/28'
                      }`}
                    >
                      {isSettingsModule ? 'Vždy aktivní' : mod.is_enabled ? 'Zapnuto' : 'Vypnuto'}
                    </span>
                    {!isSettingsModule && (
                      <button
                        type="button"
                        onClick={() => handleGlobalToggle(mod.id, mod.is_enabled)}
                        disabled={globalPending}
                        aria-label={`Globální přepínač modulu ${mod.name}`}
                        className={`relative h-5 w-10 shrink-0 rounded-full transition-colors ${
                          mod.is_enabled ? 'bg-emerald-500' : 'bg-white/12'
                        } disabled:opacity-50`}
                      >
                        <motion.div
                          animate={{ x: mod.is_enabled ? 21 : 2 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="absolute top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow"
                        >
                          {globalPending && <Loader2 className="h-2.5 w-2.5 animate-spin text-emerald-500" />}
                        </motion.div>
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Oprávnění vpravo ── */}
                <div className="flex min-w-0 flex-col gap-1.5 py-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
                      Přístup rolí
                    </span>
                    <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-white/50">
                      {ROLE_DEFS.filter(r => mod.allowed_roles?.includes(r.id)).length}/{ROLE_DEFS.length}
                    </span>
                  </div>

                  {/* Superadmin — jediná role, které přístup odebrat nejde */}
                  <div
                    className="flex items-center gap-2 rounded-2xl px-2.5 py-1.5 text-[11px] font-semibold text-white/85"
                    style={TILE}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                      <Crown className="h-3.5 w-3.5" style={{ color: TIER_COLOR.superadmin }} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">Superadministrátor</span>
                    <Lock className="h-3.5 w-3.5 shrink-0 text-white/25" />
                  </div>

                  {renderRoleTile(mod, ADMIN_ROLE)}

                  <div className="grid grid-cols-2 gap-1.5">
                    {OPERATIONAL_ROLES.map(role => renderRoleTile(mod, role))}
                  </div>

                  {!canManageRoles && (
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-amber-300/60">
                      <Lock className="h-2.5 w-2.5" />
                      Přepínat smí pouze superadministrátor
                    </span>
                  )}
                </div>
              </div>

              {/* Poznámky a podmoduly přes celou šířku karty */}
              <div className="mt-3">
                {isSettingsModule && (
                  <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2 text-[11px] text-white/35">
                    <Info className="h-3 w-3 shrink-0" />
                    Odebráním administrátora ztratí přístup ke správě systému.
                  </p>
                )}
                {!mod.is_enabled && !isSettingsModule && (
                  <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.07] px-2.5 py-2 text-[11px] text-amber-300/80">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    Modul je vypnutý — role nelze nastavovat.
                  </p>
                )}

                {/* ── Podmoduly ───────────────────────────────────────────
                    Části uvnitř modulu s vlastním oprávněním. Rozbalují se,
                    aby karta zůstala přehledná i u modulů bez podmodulů. */}
                {moduleSubmodules.length > 0 && (
                  <div className="mt-4 border-t border-[rgba(125,165,185,0.12)] pt-3">
                    <button
                      type="button"
                      onClick={() => setExpandedModule(expandedModule === `sub:${mod.id}` ? null : `sub:${mod.id}`)}
                      className="flex w-full items-center gap-2 rounded-[13px] px-2.5 py-2 text-[11px] font-semibold text-white/70 transition-colors hover:text-white" style={TILE}
                    >
                      <Layers className="h-4 w-4 shrink-0 text-white/40" />
                      <span className="flex-1 text-left">Podmoduly</span>
                      <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] tabular-nums text-white/55">
                        {moduleSubmodules.length}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${
                          expandedModule === `sub:${mod.id}` ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {expandedModule === `sub:${mod.id}` && (
                      <div className="mt-2 space-y-2">
                        {moduleSubmodules.map(sub => (
                          <div key={sub.id} className="rounded-[15px] p-2.5" style={TILE}>
                            <div className="mb-2 flex items-center gap-2">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/25" />
                              <p className="min-w-0 flex-1 truncate text-[11px] font-bold text-white/80">{sub.name}</p>
                              <span className="shrink-0 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white/50">
                                {ROLE_DEFS.filter(r => sub.allowed_roles?.includes(r.id)).length}/{ROLE_DEFS.length}
                              </span>
                            </div>
                            <div className="mb-1.5">{renderSubmoduleRoleTile(mod, sub, ADMIN_ROLE)}</div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {OPERATIONAL_ROLES.map(role => renderSubmoduleRoleTile(mod, sub, role))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Devices module - expandable management section */}
                {mod.id === 'devices' && mod.is_enabled && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <button
                      onClick={() => setExpandedModule(expandedModule === 'devices' ? null : 'devices')}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-bold transition-all w-full justify-center"
                    >
                      <Smartphone className="w-4 h-4" />
                      {expandedModule === 'devices' ? 'Skrýt správu zařízení' : 'Spravovat zařízení'}
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedModule === 'devices' ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {expandedModule === 'devices' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-4"
                      >
                        <DevicesSettingsPanel />
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex items-start gap-2.5 rounded-[18px] p-3.5 text-[11.5px] leading-relaxed text-white/38" style={CARD}>
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
        <span>
          Změny se ukládají okamžitě. Superadministrátor a administrátor mají přístup ke všem modulům bez ohledu na
          nastavení — proto se u nich přepínač nezobrazuje. Vypnutý modul zmizí všem provozním rolím bez ohledu na
          jejich nastavení.
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// Import confirmation modal
// ============================================================================

interface ImportConfirmModalProps {
  preview: ImportPreview;
  confirmText: string;
  onConfirmTextChange: (v: string) => void;
  loading: boolean;
  result: { success: boolean; message: string } | null;
  onConfirm: () => void;
  onClose: () => void;
}

const ImportConfirmModal: React.FC<ImportConfirmModalProps> = ({
  preview,
  confirmText,
  onConfirmTextChange,
  loading,
  result,
  onConfirm,
  onClose,
}) => {
  const accent = '#0EA5E9';

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
            <HardDriveUpload className="w-6 h-6" style={{ color: accent }} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Obnovit data ze zálohy</h3>
            <p className="text-xs text-white/40">Tuto akci nelze vrátit</p>
          </div>
        </div>

        <p className="text-sm text-white/60 leading-relaxed mb-4">
          Stávající obsah databáze bude <strong className="text-white/80">smazán</strong> a nahrazen daty ze zálohy.
          Uživatelské účty zůstanou zachovány.
        </p>

        {/* Preview summary */}
        <div className="mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Tabulek v záloze:</span>
            <span className="text-white font-mono">{preview.tableCount}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Celkem záznamů:</span>
            <span className="text-white font-mono">{preview.totalRows.toLocaleString('cs-CZ')}</span>
          </div>
          {preview.hospital?.name && (
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Zdroj:</span>
              <span className="text-white truncate">{preview.hospital.name}</span>
            </div>
          )}
        </div>

        <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">
          Pro potvrzení zadejte přesně: <span className="text-white">OBNOVIT DATA</span>
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={e => onConfirmTextChange(e.target.value)}
          disabled={loading || !!result?.success}
          placeholder="OBNOVIT DATA"
          className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none transition-all disabled:opacity-50 font-mono tracking-widest"
          style={{ borderColor: confirmText === 'OBNOVIT DATA' ? accent : undefined }}
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
              disabled={loading || confirmText !== 'OBNOVIT DATA'}
              className="flex-1 py-3 rounded-xl text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: accent }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span>Obnovit nyní</span>
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// Panel: Devices Settings
// ============================================================================

interface DeviceInfo {
  id: string;
  device_id: string;
  device_name: string | null;
  device_type: string;
  platform: string;
  browser: string;
  is_active: boolean;
  is_pwa_installed: boolean;
  last_seen_at: string;
  installed_at: string | null;
  created_at: string;
  ip_address: string | null;
}

// Helper functions for device panel
function getCurrentDeviceIdLocal(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('orm_device_id') || '';
}

function isDeviceOnline(lastSeenAt: string): boolean {
  const lastSeen = new Date(lastSeenAt).getTime();
  const now = Date.now();
  return now - lastSeen < 5 * 60 * 1000;
}

function formatLastSeen(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Právě teď';
  if (diffMins < 60) return `Před ${diffMins} min`;
  if (diffHours < 24) return `Před ${diffHours} hod`;
  if (diffDays < 7) return `Před ${diffDays} dny`;
  return date.toLocaleDateString('cs-CZ');
}

function getDeviceTypeIcon(deviceType: string) {
  if (deviceType === 'mobile') return Smartphone;
  if (deviceType === 'tablet') return Tablet;
  return Monitor;
}

const DevicesSettingsPanel: React.FC = () => {
  const confirm = useConfirm();
  const [devices, setDevices] = React.useState<DeviceInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');

  useHospitalRealtime('devices', (payload) => {
    if (payload.eventType === 'INSERT' && payload.new) {
      const device = payload.new as unknown as DeviceInfo;
      setDevices((prev) => prev.some((item) => item.id === device.id) ? prev : [device, ...prev]);
    } else if (payload.eventType === 'UPDATE' && payload.new) {
      const device = payload.new as unknown as DeviceInfo;
      setDevices((prev) => prev.map((item) => item.id === device.id ? { ...item, ...device } : item));
    } else if (payload.eventType === 'DELETE' && payload.old) {
      const id = payload.old.id;
      setDevices((prev) => prev.filter((item) => item.id !== id));
    }
  });

  const fetchDevices = React.useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/devices');
      if (!response.ok) throw new Error('Failed to fetch devices');
      const data = await response.json();
      setDevices(data.devices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při načítání zařízení');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setCurrentDeviceId(getCurrentDeviceIdLocal());
    void fetchDevices();
  }, [fetchDevices]);

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const response = await fetch('/api/devices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: active }),
      });
      if (!response.ok) throw new Error('Failed to update device');
      setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, is_active: active } : d)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při aktualizaci');
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const response = await fetch('/api/devices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, device_name: editName.trim() }),
      });
      if (!response.ok) throw new Error('Failed to rename device');
      setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, device_name: editName.trim() } : d)));
      setEditingId(null);
      setEditName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při přejmenování');
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({
      title: 'Smazat zařízení?',
      description: 'Tato akce je nevratná.',
      confirmLabel: 'Smazat',
      danger: true,
    }))) return;
    try {
      const response = await fetch(`/api/devices?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete device');
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při mazání');
    }
  };

  // Stats
  const stats = {
    total: devices.length,
    active: devices.filter((d) => d.is_active).length,
    online: devices.filter((d) => isDeviceOnline(d.last_seen_at)).length,
    pwa: devices.filter((d) => d.is_pwa_installed).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Správa zařízení</h2>
          <p className="text-sm text-white/50 leading-relaxed max-w-2xl">
            Přehled všech zařízení, která přistupují k aplikaci. Můžete jednotlivá zařízení aktivovat, deaktivovat nebo odstranit.
          </p>
        </div>
        <button
          onClick={fetchDevices}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Obnovit
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-white/50 uppercase tracking-wider font-medium mt-1">Celkem</p>
            </div>
            <Smartphone className="w-6 h-6 text-white/20" />
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
              <p className="text-xs text-emerald-400/60 uppercase tracking-wider font-medium mt-1">Aktivní</p>
            </div>
            <Shield className="w-6 h-6 text-emerald-500/30" />
          </div>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-cyan-400">{stats.online}</p>
              <p className="text-xs text-cyan-400/60 uppercase tracking-wider font-medium mt-1">Online</p>
            </div>
            <Activity className="w-6 h-6 text-cyan-500/30" />
          </div>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-purple-400">{stats.pwa}</p>
              <p className="text-xs text-purple-400/60 uppercase tracking-wider font-medium mt-1">PWA</p>
            </div>
            <Download className="w-6 h-6 text-purple-500/30" />
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-white/70 leading-relaxed">
          <strong className="text-white">Jak to funguje:</strong> Každé zařízení se automaticky zaregistruje při prvním přístupu do aplikace. 
          Zařízení s <span className="text-purple-400">nainstalovanou PWA</span> jsou označena fialovou ikonou.
          <span className="text-cyan-400"> Online</span> zařízení byla aktivní v posledních 5 minutách.
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      )}

      {/* Empty state */}
      {!loading && devices.length === 0 && (
        <div className="text-center py-12">
          <Smartphone className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">Zatím nebyla registrována žádná zařízení</p>
        </div>
      )}

      {/* Devices list */}
      {!loading && devices.length > 0 && (
        <div className="space-y-3">
          {devices.map((device) => {
            const isCurrentDevice = device.device_id === currentDeviceId;
            const online = isDeviceOnline(device.last_seen_at);
            const DeviceIcon = getDeviceTypeIcon(device.device_type);

            return (
              <div
                key={device.id}
                className={`relative rounded-2xl border p-4 transition-all ${
                  !device.is_active
                    ? 'border-red-500/20 bg-red-500/[0.02] opacity-60'
                    : isCurrentDevice
                    ? 'border-blue-500/40 bg-blue-500/[0.06]'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                {/* Current Device Badge */}
                {isCurrentDevice && (
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-blue-500 text-[10px] font-bold uppercase tracking-wider text-white">
                    Toto zařízení
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    device.is_pwa_installed ? 'bg-purple-500/20' : device.is_active ? 'bg-blue-500/20' : 'bg-red-500/20'
                  }`}>
                    <DeviceIcon className={`w-5 h-5 ${
                      device.is_pwa_installed ? 'text-purple-400' : device.is_active ? 'text-blue-400' : 'text-red-400'
                    }`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {editingId === device.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-blue-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(device.id);
                            if (e.key === 'Escape') { setEditingId(null); setEditName(''); }
                          }}
                        />
                        <button
                          onClick={() => handleRename(device.id)}
                          className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditName(''); }}
                          className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white truncate">
                          {device.device_name || 'Neznámé zařízení'}
                        </h3>
                        {online && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400" title="Online" />
                        )}
                        {device.is_pwa_installed && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300">PWA</span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-white/40">
                      <span>{device.platform}</span>
                      <span>•</span>
                      <span>{device.browser}</span>
                      <span>•</span>
                      <span>{formatLastSeen(device.last_seen_at)}</span>
                    </div>
                    
                    {/* Detailed info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 pt-2 border-t border-white/5 text-xs text-white/30">
                      {device.ip_address && (
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span>{device.ip_address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span>ID: {device.device_id.slice(0, 12)}...</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Registrace: {new Date(device.created_at).toLocaleDateString('cs-CZ')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setEditingId(device.id); setEditName(device.device_name || ''); }}
                      className="p-2 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                      title="Přejmenovat"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(device.id, !device.is_active)}
                      className={`p-2 rounded-lg transition-colors ${
                        device.is_active
                          ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                      title={device.is_active ? 'Deaktivovat' : 'Aktivovat'}
                    >
                      {device.is_active ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                    </button>
                    {!isCurrentDevice && (
                      <button
                        onClick={() => handleDelete(device.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Smazat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SystemSettingsModule;
