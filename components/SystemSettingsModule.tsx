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
} from 'lucide-react';
import { useAuth, UserRole, AppModule } from '../contexts/AuthContext';

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

type TabId = 'facility' | 'modules' | 'database' | 'access';

const SystemSettingsModule: React.FC = () => {
  const { user, isAdmin, logout, modules, toggleModule, toggleModuleRole } = useAuth();
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

  // Export / Import state
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{
    version?: string;
    exportedAt?: string;
    exportedBy?: string;
    facility?: { name?: string | null; ico?: string | null };
    totalRows: number;
    tableCount: number;
  } | null>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importConfirmText, setImportConfirmText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

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

  // ---- Export ---------------------------------------------------------------
  const handleExport = useCallback(async () => {
    setExportLoading(true);
    setExportMessage(null);
    try {
      const url = `/api/admin/export-data${user?.email ? `?userEmail=${encodeURIComponent(user.email)}` : ''}`;
      const res = await fetch(url);
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
        facility?: { name?: string | null; ico?: string | null };
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
        facility: parsed.facility,
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation: importConfirmText,
          userEmail: user?.email,
          backup,
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
          { id: 'modules' as const,  label: 'Správa modulů',         icon: SlidersHorizontal, color: '#A855F7' },
          { id: 'database' as const, label: 'Administrace databáze', icon: Database, color: '#EC4899' },
          { id: 'access' as const,   label: 'Přihlášení a přístup',  icon: UserCog, color: '#10B981' },
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
          style={{
            background:
              activeTab === 'facility' ? '#0EA5E9'
              : activeTab === 'modules' ? '#A855F7'
              : activeTab === 'database' ? '#EC4899'
              : '#10B981',
          }}
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
                modules={modules}
                onToggleModule={toggleModule}
                onToggleRole={toggleModuleRole}
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

interface ImportPreview {
  version?: string;
  exportedAt?: string;
  exportedBy?: string;
  facility?: { name?: string | null; ico?: string | null };
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

      {/* ---------- Backup & Restore ---------- */}
      {isAdmin && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
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
                        {importPreview.facility?.name && (
                          <>
                            <dt className="text-white/40">Zařízení:</dt>
                            <dd className="text-white text-right truncate">{importPreview.facility.name}</dd>
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

// ============================================================================
// Panel: Modules (per-role access matrix)
// ============================================================================

interface ModulesPanelProps {
  isAdmin: boolean;
  modules: AppModule[];
  onToggleModule: (moduleId: string, enabled: boolean) => Promise<boolean>;
  onToggleRole: (moduleId: string, role: UserRole, enabled: boolean) => Promise<boolean>;
}

const ROLE_DEFS: Array<{ id: UserRole; label: string; icon: React.FC<{ className?: string }>; color: string }> = [
  { id: 'aro',        label: 'ARO',        icon: Activity,      color: '#EF4444' },
  { id: 'cos',        label: 'COS',        icon: Stethoscope,   color: '#06B6D4' },
  { id: 'management', label: 'Management', icon: Briefcase,     color: '#F59E0B' },
  { id: 'primar',     label: 'Primariát',  icon: ClipboardList, color: '#A855F7' },
  { id: 'user',       label: 'Uživatel',   icon: UserIcon,      color: '#64748B' },
];

const MODULE_ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  LayoutGrid,
  Calendar: SlidersHorizontal, // fallback
  BarChart3: SlidersHorizontal,
  Users: UserCog,
  Bell: AlertTriangle,
  Settings: SettingsIcon,
  Shield,
};

const ModulesPanel: React.FC<ModulesPanelProps> = ({ isAdmin, modules, onToggleModule, onToggleRole }) => {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

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
    if (moduleId === 'settings') return; // settings je admin-only
    const key = `${moduleId}:${role}`;
    setPendingKey(key);
    await onToggleRole(moduleId, role, !currentEnabled);
    setPendingKey(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Správa modulů a rolí</h2>
        <p className="text-sm text-white/50 leading-relaxed max-w-3xl">
          Pro každý modul nastavte zapnutí globálně a přístup pro jednotlivé role. Administrátor má vždy přístup ke všem
          modulům bez ohledu na nastavení. Modul <span className="text-white/80 font-semibold">Nastavení</span> je vyhrazen
          pouze pro administrátory a nelze jej vypnout.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-white/50">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-500/20 text-emerald-400">
            <Check className="w-3 h-3" />
          </span>
          <span>Povoleno</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-white/5 text-white/30">
            <X className="w-3 h-3" />
          </span>
          <span>Zakázáno</span>
        </div>
      </div>

      {/* Matrix */}
      <div className="space-y-3">
        {sortedModules.map((mod) => {
          const Icon = MODULE_ICON_MAP[mod.icon || 'Settings'] || SettingsIcon;
          const accent = mod.accent_color || '#64748B';
          const isSettingsModule = mod.id === 'settings';
          const globalPending = pendingKey === `g:${mod.id}`;

          return (
            <div
              key={mod.id}
              className={`rounded-2xl border transition-all ${
                mod.is_enabled ? 'bg-white/[0.02] border-white/10' : 'bg-white/[0.01] border-white/5 opacity-60'
              }`}
            >
              {/* Module header row */}
              <div className="flex items-center justify-between gap-4 p-4 border-b border-white/5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: mod.is_enabled ? `${accent}20` : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: mod.is_enabled ? accent : 'rgba(255,255,255,0.3)' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{mod.name}</p>
                    <p className="text-white/40 text-xs truncate">{mod.description || '—'}</p>
                  </div>
                </div>

                {/* Global toggle */}
                <div className="flex items-center gap-3 shrink-0">
                  {isSettingsModule ? (
                    <span className="text-white/30 text-xs uppercase tracking-wider font-bold">Vždy aktivní</span>
                  ) : (
                    <>
                      <span className="hidden sm:inline text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                        Globálně
                      </span>
                      <button
                        type="button"
                        onClick={() => handleGlobalToggle(mod.id, mod.is_enabled)}
                        disabled={globalPending}
                        aria-label={`Globální přepínač modulu ${mod.name}`}
                        className={`relative w-12 h-6 rounded-full transition-all ${
                          mod.is_enabled ? 'bg-emerald-500' : 'bg-white/10'
                        } disabled:opacity-50`}
                      >
                        <motion.div
                          animate={{ x: mod.is_enabled ? 24 : 2 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center"
                        >
                          {globalPending ? (
                            <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />
                          ) : mod.is_enabled ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <X className="w-3 h-3 text-white/40" />
                          )}
                        </motion.div>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Per-role row */}
              <div className="p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">
                  Přístup pro role
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {ROLE_DEFS.map(role => {
                    const RoleIcon = role.icon;
                    const allowed = !!mod.allowed_roles?.includes(role.id);
                    const pending = pendingKey === `${mod.id}:${role.id}`;
                    const disabled = isSettingsModule || !mod.is_enabled;

                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleRoleToggle(mod.id, role.id, allowed)}
                        disabled={disabled || pending}
                        aria-pressed={allowed}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40"
                        style={{
                          background: allowed ? `${role.color}22` : 'rgba(255,255,255,0.02)',
                          borderColor: allowed ? `${role.color}60` : 'rgba(255,255,255,0.08)',
                          color: allowed ? role.color : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        <RoleIcon className="w-4 h-4 shrink-0" />
                        <span className="flex-1 text-left truncate">{role.label}</span>
                        {pending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : allowed ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <X className="w-3.5 h-3.5 opacity-50" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {isSettingsModule && (
                  <p className="mt-3 text-[11px] text-white/30 flex items-center gap-1.5">
                    <Info className="w-3 h-3" />
                    Modul Nastavení je dostupný pouze pro administrátora.
                  </p>
                )}
                {!mod.is_enabled && !isSettingsModule && (
                  <p className="mt-3 text-[11px] text-amber-400/70 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    Modul je globálně vypnutý — role nelze nastavovat.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/50">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-white/40" />
        <span>
          Změny se projeví okamžitě. Administrátor má vždy plný přístup bez ohledu na nastavení rolí. Dashboard je vždy
          přístupný všem přihlášeným uživatelům.
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
          {preview.facility?.name && (
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Zdroj:</span>
              <span className="text-white truncate">{preview.facility.name}</span>
            </div>
          )}
        </div>

        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">
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

export default SystemSettingsModule;
