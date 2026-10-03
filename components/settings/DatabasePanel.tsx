'use client';

import React from 'react';
import { Database, Shield, AlertTriangle, Check, X, Loader2, Trash2, Lock, Info, Download, Upload, FileJson, HardDriveDownload, HardDriveUpload, RotateCcw } from 'lucide-react';
// ============================================================================
// Panel: Database
// ============================================================================

export interface ImportPreview {
  version?: string;
  exportedAt?: string;
  exportedBy?: string;
  hospital?: { name?: string | null; ico?: string | null };
  totalRows: number;
  tableCount: number;
}

export interface DatabasePanelProps {
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

export const DatabasePanel: React.FC<DatabasePanelProps> = ({
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
        <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/38">Databáze</p>
        <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-white">Administrace databáze</h2>
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
          <div className="relative flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025] py-3.5 pl-5 pr-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: '#F59E0B88' }} />
                <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg border" style={{ borderColor: '#F59E0B58', backgroundColor: '#F59E0B1f', color: '#F59E0B' }}>
                <Database className="w-5 h-5 text-amber-400" />
              </span>
              <div>
                <h3 className="text-[15px] font-bold leading-tight text-white/90">Smazat provozní data</h3>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-300/70">Doporučeno</p>
              </div>
            </div>

            <p className="mt-3 flex-1 text-[11.5px] leading-[16px] text-white/45">
              Smaže historická data a resetuje stav sálů. Zachová konfiguraci — personál, oddělení, workflow statusy,
              operační sály a kontakty managementu.
            </p>

            <ul className="mt-3 space-y-1 border-t border-white/[0.055] pt-2.5 text-[11px] text-white/45">
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
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border px-4 text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors disabled:opacity-50" style={{ borderColor: '#F59E0B35', background: '#F59E0B14', color: '#F59E0B' }}
            >
              <Trash2 className="w-4 h-4" />
              Smazat provozní data
            </button>
          </div>

          {/* Full reset */}
          <div className="relative flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025] py-3.5 pl-5 pr-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: '#EF444488' }} />
                <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg border" style={{ borderColor: '#EF444458', backgroundColor: '#EF44441f', color: '#EF4444' }}>
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </span>
              <div>
                <h3 className="text-[15px] font-bold leading-tight text-white/90">Kompletní reset</h3>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-red-300/70">Příprava pro jiné zařízení</p>
              </div>
            </div>

            <p className="mt-3 flex-1 text-[11.5px] leading-[16px] text-white/45">
              Smaže <strong className="text-white/80">veškerá data</strong> kromě uživatelských účtů a aplikačních
              nastavení. Použijte při nasazení aplikace do zcela nové nemocnice.
            </p>

            <ul className="mt-3 space-y-1 border-t border-white/[0.055] pt-2.5 text-[11px] text-white/45">
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
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border px-4 text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors disabled:opacity-50" style={{ borderColor: '#EF444435', background: '#EF444414', color: '#EF4444' }}
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
            <div className="relative flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025] py-3.5 pl-5 pr-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: '#34D39988' }} />
                <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg border" style={{ borderColor: '#34D39958', backgroundColor: '#34D3991f', color: '#34D399' }}>
                  <HardDriveDownload className="w-5 h-5 text-emerald-400" />
                </span>
                <div>
                  <h3 className="text-[15px] font-bold leading-tight text-white/90">Exportovat databázi</h3>
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-300/70">
                    Stáhnout zálohu
                  </p>
                </div>
              </div>

              <p className="mt-3 flex-1 text-[11.5px] leading-[16px] text-white/45">
                Stáhne kompletní zálohu databáze jako JSON soubor. Obsahuje veškerou konfiguraci i provozní data — s
                výjimkou hesel uživatelů. Záloha je připravena pro pozdější obnovu.
              </p>

              <ul className="mt-3 space-y-1 border-t border-white/[0.055] pt-2.5 text-[11px] text-white/45">
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
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border px-4 text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors disabled:opacity-50" style={{ borderColor: '#34D39935', background: '#34D39914', color: '#34D399' }}
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
            <div className="relative flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025] py-3.5 pl-5 pr-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: '#0EA5E988' }} />
                <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg border" style={{ borderColor: '#0EA5E958', backgroundColor: '#0EA5E91f', color: '#0EA5E9' }}>
                  <HardDriveUpload className="w-5 h-5 text-[#0EA5E9]" />
                </span>
                <div>
                  <h3 className="text-[15px] font-bold leading-tight text-white/90">Obnovit ze zálohy</h3>
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#0EA5E9]/70">
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
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border px-4 text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors disabled:cursor-not-allowed disabled:opacity-50" style={{ borderColor: '#0EA5E935', background: '#0EA5E914', color: '#38BDF8' }}
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
