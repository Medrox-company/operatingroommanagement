'use client';

import React from 'react';
import { Building2, AlertTriangle, Check, Loader2, Save, Lock, Mail, Phone, MapPin, Hash, Smartphone } from 'lucide-react';
import { type Hospital } from '../../contexts/HospitalContext';
import { HospitalInfo } from './settings-types';
import { Field } from './SettingsPrimitives';

// ============================================================================
// Panel: Hospital
// ============================================================================

export interface HospitalPanelProps {
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

export const HospitalPanel: React.FC<HospitalPanelProps> = ({ hospital, hospitals, activeHospitalId, onSelectHospital, onNewHospital, loading, saving, message, onChange, onSave, isAdmin, isInstallable, isInstalled, onPWAInstall, pwInstallLoading }) => {
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
        <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/38">Zdravotnické zařízení</p>
        <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-white">Informace o zdravotnickém zařízení</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-white/38">
          Tyto údaje identifikují instanci aplikace a zobrazují se v reportech a notifikacích. Aplikace bude nasazována
          v různých nemocničních zařízeních — tato sekce slouží ke konfiguraci konkrétní instance.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
        <div className="flex-1">
          <label className="mb-2 block text-[8px] font-bold uppercase tracking-[0.16em] text-cyan-200/60">
            Aktivní nemocniční zařízení
          </label>
          <select
            value={hospital.id || activeHospitalId || ''}
            onChange={e => onSelectHospital(e.target.value)}
            disabled={!hospital.id}
            className="h-10 w-full rounded-lg border border-white/[0.08] bg-[#10182a] px-3 text-sm text-white outline-none transition-colors focus:border-cyan-200/30 disabled:opacity-50"
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
            className="flex h-10 shrink-0 items-center gap-2 self-end rounded-lg border border-cyan-200/[0.20] bg-cyan-300/[0.10] px-4 text-[9px] font-semibold uppercase tracking-[0.08em] text-cyan-100 hover:bg-cyan-300/[0.16]"
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
          <label className="mb-2 block text-[8px] font-bold uppercase tracking-[0.16em] text-white/38">
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
          className="flex h-10 items-center gap-2 rounded-lg px-5 text-[9px] font-semibold uppercase tracking-[0.08em] text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold leading-tight text-white/90">Nainstalovat jako aplikaci</h3>
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-blue-300/70">Android, iOS, Mac</p>
                </div>
              </div>

              <p className="mt-3 text-[11.5px] leading-[16px] text-white/45">
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
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-emerald-300/85">Aplikace je již nainstalována</p>
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
