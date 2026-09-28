'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ModulePageHeading from './ModulePageHeading';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, Building2, Database, Lock, UserCog, LayoutGrid, SlidersHorizontal, Smartphone, ShieldOff, Gauge } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useHospital } from '../contexts/HospitalContext';
import { logger } from '../lib/logger';
import { usePWAInstall } from './PWAInstaller';
import SpeedDiagnosticsPanel from './SpeedDiagnosticsPanel';
import { COLORS } from './settings/settings-theme';
import { HospitalInfo } from './settings/settings-types';
import { HospitalPanel } from './settings/HospitalPanel';
import { DatabasePanel } from './settings/DatabasePanel';
import { AccessPanel } from './settings/AccessPanel';
import { ModulesPanel } from './settings/ModulesPanel';
import { ResetConfirmModal } from './settings/ResetConfirmModal';
import { ImportConfirmModal } from './settings/ImportConfirmModal';
import { TabId, SETTINGS_TAB_SUBMODULE } from './settings/settings-tabs';

const SETTINGS_TABS = [
  { id: 'hospital' as const, label: 'Zdravotnické zařízení', icon: Building2, sub: 'settings.hospital' },
  { id: 'modules' as const, label: 'Správa modulů', icon: SlidersHorizontal, sub: 'settings.modules' },
  { id: 'diagnostics' as const, label: 'Rychlost a připojení', icon: Gauge, sub: 'settings.diagnostics' },
  { id: 'database' as const, label: 'Administrace databáze', icon: Database, sub: 'settings.database' },
  { id: 'access' as const, label: 'Přihlášení a přístup', icon: UserCog, sub: 'settings.access' },
];

const SystemSettingsModule: React.FC = () => {
  const { user, isAdmin, isSuperAdmin, canManageModuleRoles, logout, modules, submodules, toggleModule, toggleModuleRole, toggleSubmodule, toggleSubmoduleRole, hasSubmoduleAccess } = useAuth();
  const { hospitals, activeHospital, activeHospitalId, selectHospital, refreshHospitals, loading: hospitalsLoading } = useHospital();
  // Otevřený panel přežije i případné přemontování komponenty (např. když
  // uložení nastavení vyvolá načtení modulů). Bez toho by uživatele po každé
  // změně vrátilo zpět na „Zdravotnické zařízení".
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const defaultTab: TabId = isSuperAdmin ? 'hospital' : 'modules';
    if (typeof window === 'undefined') return defaultTab;
    const saved = window.sessionStorage.getItem('orm-settings-tab');
    const requested = saved && saved in SETTINGS_TAB_SUBMODULE ? (saved as TabId) : defaultTab;
    return requested === 'hospital' && !isSuperAdmin ? defaultTab : requested;
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem('orm-settings-tab', activeTab);
    } catch {
      // Bez sessionStorage se panel jen nezapamatuje, nic dalšího se neděje.
    }
  }, [activeTab]);

  const availableTabs = useMemo(
    () => SETTINGS_TABS.filter(tab => (tab.id !== 'hospital' || isSuperAdmin) && hasSubmoduleAccess(tab.sub)),
    [hasSubmoduleAccess, isSuperAdmin],
  );
  const availableTabsKey = availableTabs.map(tab => tab.id).join(',');
  const activeTabIsAvailable = availableTabs.some(tab => tab.id === activeTab);

  useEffect(() => {
    if (activeTabIsAvailable || availableTabs.length === 0) return;
    setActiveTab(availableTabs[0].id);
  }, [activeTabIsAvailable, availableTabs, availableTabsKey]);

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
    <div className="statistics-module min-h-full w-full pb-10 font-sans">
      <header className="mb-7">
        <ModulePageHeading icon={SettingsIcon} kicker="SYSTEM CONTROL" title="NASTAVENÍ" mutedTitle="SYSTÉMU" />
      </header>

      <section className="hide-scrollbar mb-4 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
        <div className="flex min-w-max items-center gap-2.5">
          {[
            ...(isSuperAdmin
              ? [{ label: 'Zařízení', value: systemStats.hospital, suffix: 'konfigurace', color: systemStats.hospital ? COLORS.green : COLORS.amber, icon: Building2 }]
              : []),
            { label: 'Aktivní moduly', value: systemStats.enabledModules, suffix: 'modulů', color: COLORS.cyan, icon: LayoutGrid },
            { label: 'Vypnuté moduly', value: systemStats.disabledModules, suffix: 'modulů', color: systemStats.disabledModules ? COLORS.amber : COLORS.green, icon: ShieldOff },
            { label: 'Nastavené role', value: systemStats.configuredRoles, suffix: 'rolí', color: COLORS.blue, icon: UserCog },
            { label: 'Instalace PWA', value: systemStats.pwa, suffix: systemStats.pwa ? 'aktivní' : 'prohlížeč', color: COLORS.violet, icon: Smartphone },
          ].map(({ label, value, suffix, color, icon: Icon }) => (
            <div
              key={label}
              className="relative flex h-[68px] w-[112px] shrink-0 items-center overflow-hidden rounded-lg border border-white/[0.05] bg-black/10 px-3 py-2.5 2xl:w-[128px]"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[8px] font-semibold uppercase tracking-[0.08em] text-white/38" title={label}>{label}</p>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="text-[22px] font-light leading-none tabular-nums text-white/95">{value}</span>
                    <span className="text-[8px] font-medium text-white/28">{suffix}</span>
                  </div>
                </div>
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} style={{ color }} />
              </div>
            </div>
          ))}
          <div className="ml-1 h-10 w-px shrink-0 bg-white/[0.07]" aria-hidden="true" />
          <nav className="flex items-center gap-1 rounded-lg border border-white/[0.05] bg-black/10 p-1" aria-label="Sekce nastavení systému">
{/* Panely Nastavení jsou podmoduly — superadministrátor u nich řídí, které
    role je uvidí. Zakázaný panel se v liště vůbec nezobrazí. */}
{availableTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex h-8 items-center gap-2 whitespace-nowrap rounded-md px-3 text-[9px] font-bold uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${isActive ? 'bg-white/[0.09] text-cyan-300' : 'text-white/40 hover:bg-white/[0.045] hover:text-white/70'}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
          </nav>
        </div>
      </section>

      <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025] p-4 sm:p-6">

        <AnimatePresence mode="wait">
          {activeTab === 'hospital' && isSuperAdmin && activeTabIsAvailable && (
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
          isAdmin={isSuperAdmin}
          isInstallable={isInstallable}
          isInstalled={isInstalled}
          onPWAInstall={handlePWAInstall}
          pwInstallLoading={installLoading}
        />
            </motion.div>
          )}

          {activeTab === 'modules' && activeTabIsAvailable && (
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
                onToggleSubmodule={toggleSubmodule}
                onToggleSubmoduleRole={toggleSubmoduleRole}
              />
            </motion.div>
          )}

          {activeTab === 'diagnostics' && activeTabIsAvailable && (
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

          {activeTab === 'database' && activeTabIsAvailable && (
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
  
  {activeTab === 'access' && activeTabIsAvailable && (
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
        {availableTabs.length === 0 && (
          <div className="flex min-h-48 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-6 text-center">
            <div>
              <Lock className="mx-auto h-6 w-6 text-amber-300/70" />
              <p className="mt-3 text-sm font-semibold text-white/80">Nemáte přidělenou žádnou část nastavení systému.</p>
              <p className="mt-1 text-xs text-white/40">Přístup k jednotlivým podmodulům nastavuje superadministrátor.</p>
            </div>
          </div>
        )}
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

export default SystemSettingsModule;
