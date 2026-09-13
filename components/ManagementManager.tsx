'use client';

import React, { useEffect, useMemo, useState } from 'react';
import ModulePageHeading from './ModulePageHeading';
import { useHospital } from '../contexts/HospitalContext';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  MessageSquareText,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserRoundCheck,
  UserRoundX,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

interface ManagementContact {
  id: string;
  name: string;
  position: string;
  email: string;
  phone?: string;
  notes?: string;
  notify_late_surgeon: boolean;
  notify_late_anesthesiologist: boolean;
  notify_patient_not_ready: boolean;
  notify_late_arrival: boolean;
  notify_other: boolean;
  notify_emergencies: boolean;
  notify_daily_reports: boolean;
  notify_statistics: boolean;
  is_active: boolean;
  sort_order: number;
}

type ContactFilter = 'all' | 'active' | 'inactive';
type NotificationKey =
  | 'notify_late_surgeon'
  | 'notify_late_anesthesiologist'
  | 'notify_patient_not_ready'
  | 'notify_late_arrival'
  | 'notify_other'
  | 'notify_emergencies'
  | 'notify_daily_reports'
  | 'notify_statistics';

const COLORS = {
  cyan: '#36D9EC',
  green: '#34D399',
  amber: '#FBBF24',
  red: '#FB7185',
  blue: '#38BDF8',
  violet: '#A78BFA',
};

const NOTIFICATION_TYPES: Array<{
  key: NotificationKey;
  label: string;
  icon: typeof AlertTriangle;
  color: string;
}> = [
  { key: 'notify_late_surgeon', label: 'Pozdní příchod operatéra', icon: AlertTriangle, color: COLORS.red },
  { key: 'notify_late_anesthesiologist', label: 'Pozdní příchod anesteziologa', icon: AlertTriangle, color: COLORS.amber },
  { key: 'notify_patient_not_ready', label: 'Nepřipravený pacient', icon: AlertCircle, color: COLORS.amber },
  { key: 'notify_late_arrival', label: 'Pozdní příjezd', icon: Clock, color: COLORS.blue },
  { key: 'notify_other', label: 'Jiný důvod', icon: Zap, color: COLORS.violet },
  { key: 'notify_emergencies', label: 'Urgentní notifikace', icon: AlertTriangle, color: COLORS.red },
  { key: 'notify_daily_reports', label: 'Denní reporty', icon: FileText, color: COLORS.blue },
  { key: 'notify_statistics', label: 'Statistiky', icon: BarChart3, color: COLORS.violet },
];

const createContact = (sortOrder: number): ManagementContact => ({
  id: `new-${Date.now()}`,
  name: '',
  position: '',
  email: '',
  phone: '',
  notes: '',
  notify_late_surgeon: false,
  notify_late_anesthesiologist: false,
  notify_patient_not_ready: false,
  notify_late_arrival: false,
  notify_other: false,
  notify_emergencies: false,
  notify_daily_reports: false,
  notify_statistics: false,
  is_active: true,
  sort_order: sortOrder,
});

const initials = (contact: ManagementContact) => {
  const source = contact.name.trim() || contact.position.trim() || 'M';
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
};

const enabledNotificationCount = (contact: ManagementContact) =>
  NOTIFICATION_TYPES.reduce((count, notification) => count + (contact[notification.key] ? 1 : 0), 0);

function DetailEditModal({
  contact,
  onClose,
  onSave,
  onDelete,
  saving,
}: {
  contact: ManagementContact;
  onClose: () => void;
  onSave: (updated: ManagementContact) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState<ManagementContact>({ ...contact });
  const isNew = contact.id.startsWith('new-');

  const updateField = <K extends keyof ManagementContact>(key: K, value: ManagementContact[K]) => {
    setFormData(current => ({ ...current, [key]: value }));
  };

  const handleSave = () => {
    if (!formData.position.trim() || !formData.email.trim()) return;
    onSave(formData);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="management-contact-title"
      className="w-full max-w-3xl rounded-[26px] p-4 font-sans sm:p-6"
      style={{
        background: 'linear-gradient(145deg, rgba(8,20,30,0.985), rgba(5,12,20,0.985))',
        border: '1px solid rgba(125,165,185,0.22)',
        boxShadow: '0 30px 90px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/[0.07] pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ color: COLORS.cyan, background: `${COLORS.cyan}14`, border: `1px solid ${COLORS.cyan}25` }}
          >
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-300/70">
              {isNew ? 'Nový kontakt' : 'Detail kontaktu'}
            </p>
            <h3 id="management-contact-title" className="mt-1 truncate text-lg font-bold text-white">
              {isNew ? 'Přidat člena managementu' : formData.name || formData.position}
            </h3>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zavřít detail kontaktu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/40 transition-colors hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {([
          ['position', 'Pozice *', 'Vedoucí operací', 'text'],
          ['name', 'Jméno', 'Jméno a příjmení', 'text'],
          ['email', 'E-mail *', 'email@nemocnice.cz', 'email'],
          ['phone', 'Telefon', '+420 123 456 789', 'tel'],
        ] as const).map(([key, label, placeholder, type]) => (
          <label key={key} className="block">
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/38">{label}</span>
            <input
              type={type}
              value={formData[key] || ''}
              onChange={event => updateField(key, event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-3.5 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-cyan-300/40"
              placeholder={placeholder}
            />
          </label>
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-2.5 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">Odběr notifikací</p>
            <p className="mt-0.5 text-[11px] text-white/28">Vyberte události doručované tomuto kontaktu</p>
          </div>
          <span className="text-xs font-semibold tabular-nums text-cyan-300/75">
            {enabledNotificationCount(formData)}/{NOTIFICATION_TYPES.length}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {NOTIFICATION_TYPES.map(({ key, label, icon: Icon, color }) => {
            const enabled = formData[key];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={enabled}
                onClick={() => updateField(key, !enabled)}
                className="flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors"
                style={{
                  color: enabled ? color : 'rgba(255,255,255,0.38)',
                  background: enabled ? `${color}0D` : 'rgba(255,255,255,0.018)',
                  borderColor: enabled ? `${color}2E` : 'rgba(255,255,255,0.065)',
                }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: enabled ? `${color}16` : 'rgba(255,255,255,0.035)' }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 text-xs font-semibold leading-tight">{label}</span>
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
                  style={{ borderColor: enabled ? color : 'rgba(255,255,255,0.16)', background: enabled ? color : 'transparent' }}
                >
                  {enabled && <Check className="h-2.5 w-2.5 text-[#071019]" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="mt-5 block">
        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/38">Poznámky</span>
        <textarea
          value={formData.notes || ''}
          onChange={event => updateField('notes', event.target.value)}
          className="mt-1.5 w-full resize-none rounded-xl border border-white/[0.09] bg-white/[0.025] px-3.5 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-cyan-300/40"
          placeholder="Doplňující informace ke kontaktu…"
          rows={2}
        />
      </label>

      <button
        type="button"
        aria-pressed={formData.is_active}
        onClick={() => updateField('is_active', !formData.is_active)}
        className="mt-3 flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-colors"
        style={{
          background: formData.is_active ? `${COLORS.green}0D` : 'rgba(255,255,255,0.02)',
          borderColor: formData.is_active ? `${COLORS.green}2B` : 'rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex items-center gap-2.5">
          {formData.is_active
            ? <UserRoundCheck className="h-4 w-4 text-emerald-300" />
            : <UserRoundX className="h-4 w-4 text-white/35" />}
          <div>
            <p className={`text-xs font-bold ${formData.is_active ? 'text-emerald-200' : 'text-white/45'}`}>
              {formData.is_active ? 'Aktivní kontakt' : 'Neaktivní kontakt'}
            </p>
            <p className="mt-0.5 text-[10px] text-white/28">
              {formData.is_active ? 'Je zahrnutý do komunikačních scénářů' : 'Notifikace se tomuto kontaktu neposílají'}
            </p>
          </div>
        </div>
        <CheckCircle2 className={`h-4 w-4 ${formData.is_active ? 'text-emerald-300' : 'text-white/15'}`} />
      </button>

      <div className="mt-5 flex gap-2 border-t border-white/[0.07] pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !formData.position.trim() || !formData.email.trim()}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-xs font-bold text-[#071019] transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/25 border-t-black/80" /> : <Check className="h-4 w-4" />}
          {saving ? 'Ukládání…' : 'Uložit kontakt'}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={saving}
          aria-label={isNew ? 'Zrušit nový kontakt' : 'Odstranit kontakt'}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-300/20 bg-rose-300/[0.07] text-rose-300 transition-colors hover:bg-rose-300/[0.12] disabled:opacity-40"
        >
          {isNew ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/** Karta kontaktu ve stejném jazyce jako karty v modulu Operační obory:
    barevný pruh na levé hraně, pevná dlaždice s iniciálami, jméno, řádek
    metadat, ikonové akce vpravo a kontaktní údaje dole. */
const ContactCard: React.FC<{
  contact: ManagementContact;
  onEdit: () => void;
}> = ({ contact, onEdit }) => {
  const notificationCount = enabledNotificationCount(contact);
  const accent = contact.is_active ? COLORS.cyan : 'rgba(148,163,184,0.7)';

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025] py-3.5 pl-5 pr-4 transition-colors ${contact.is_active ? 'hover:bg-white/[0.04]' : 'opacity-55 hover:opacity-80'}`}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)' }}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: `${accent}88` }} />

      <div className="flex items-center gap-3.5">
        {/* Pevná velikost dlaždice — iniciály zabírají vždy stejné místo. */}
        <span
          className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border px-1 text-[12px] font-black leading-none tracking-[0.02em]"
          style={{ borderColor: `${accent}58`, backgroundColor: `${accent}1f`, color: accent }}
        >
          <span className="truncate">{initials(contact)}</span>
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-bold leading-tight text-white/90">
            {contact.name || contact.position}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: contact.is_active ? COLORS.green : 'rgba(255,255,255,0.22)' }}
            />
            {contact.is_active ? 'Aktivní' : 'Neaktivní'}
            <span className="text-white/16">·</span>
            <span className="tabular-nums text-white/44">{notificationCount}</span>
            {notificationCount === 1 ? 'odběr' : notificationCount < 5 ? 'odběry' : 'odběrů'}
          </p>
        </div>

        <div className="flex shrink-0 gap-1.5">
          <a
            href={`mailto:${contact.email}`}
            aria-label={`Napsat na ${contact.email}`}
            title={contact.email}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.065] text-white/42 transition-colors hover:bg-white/[0.06] hover:text-cyan-200"
          >
            <Mail className="h-3.5 w-3.5" />
          </a>
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              aria-label={`Zavolat na ${contact.phone}`}
              title={contact.phone}
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.065] text-white/42 transition-colors hover:bg-white/[0.06] hover:text-amber-200"
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Upravit ${contact.name || contact.position}`}
            title="Upravit kontakt"
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.065] text-white/42 transition-colors hover:bg-white/[0.06] hover:text-white/80"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <p className="mt-3 min-h-[30px] text-[11.5px] leading-[15px] text-white/42 line-clamp-2">
        {contact.position || 'Bez uvedené pozice'}
      </p>

      {/* Kontaktní údaje na místě patičky karty oboru. */}
      <div className="mt-auto grid grid-cols-2 gap-x-3 border-t border-white/[0.055] pt-2.5">
        <div className="min-w-0">
          <p className="truncate text-[8px] font-bold uppercase tracking-[0.16em] text-cyan-300/60">E-mail</p>
          <p className="mt-0.5 truncate text-[11.5px] font-semibold leading-[15px] text-white/82" title={contact.email}>
            {contact.email || '—'}
          </p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[8px] font-bold uppercase tracking-[0.16em] text-amber-300/60">Telefon</p>
          <p
            className={`mt-0.5 truncate text-[11.5px] font-semibold leading-[15px] ${contact.phone ? 'text-white/82' : 'text-white/28'}`}
            title={contact.phone || 'Neuveden'}
          >
            {contact.phone || 'Neuveden'}
          </p>
        </div>
      </div>
    </article>
  );
};

export default function ManagementManager() {
  const { activeHospitalId } = useHospital();
  const [contacts, setContacts] = useState<ManagementContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ContactFilter>('all');
  const [selectedContact, setSelectedContact] = useState<ManagementContact | null>(null);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`/api/management-contacts?hospitalId=${encodeURIComponent(activeHospitalId || '')}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[ManagementContacts] Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSupabaseConfigured) {
      void fetchContacts();
    } else {
      setLoading(false);
    }
  }, [activeHospitalId]);

  const handleSave = async (updated: ManagementContact) => {
    setSaving(true);
    try {
      const isNew = updated.id.startsWith('new-');
      const response = await fetch('/api/management-contacts', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(isNew ? { ...updated, id: undefined } : updated), hospitalId: activeHospitalId }),
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || `HTTP ${response.status}`);
      }
      await fetchContacts();
      setSelectedContact(null);
    } catch (error) {
      console.error('[ManagementContacts] Error saving contact:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/management-contacts?id=${encodeURIComponent(id)}&hospitalId=${encodeURIComponent(activeHospitalId || '')}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await fetchContacts();
      setSelectedContact(null);
    } catch (error) {
      console.error('[ManagementContacts] Error deleting contact:', error);
    }
  };

  const stats = useMemo(() => {
    const active = contacts.filter(contact => contact.is_active);
    const emergencyRecipients = active.filter(contact => contact.notify_emergencies).length;
    const reportRecipients = active.filter(contact => contact.notify_daily_reports || contact.notify_statistics).length;
    const configuredChannels = active.reduce((total, contact) => total + enabledNotificationCount(contact), 0);

    return {
      total: contacts.length,
      active: active.length,
      inactive: contacts.length - active.length,
      emergencyRecipients,
      reportRecipients,
      configuredChannels,
    };
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('cs');
    return contacts
      .filter(contact =>
        (filter === 'all' || (filter === 'active' && contact.is_active) || (filter === 'inactive' && !contact.is_active))
        && (!query || [contact.name, contact.position, contact.email, contact.phone]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('cs')
          .includes(query)))
      .sort((a, b) => a.sort_order - b.sort_order || a.position.localeCompare(b.position, 'cs'));
  }, [contacts, filter, searchQuery]);

  return (
    <div className="statistics-module min-h-full w-full pb-10 font-sans">
      <header className="mb-7">
        <ModulePageHeading icon={BriefcaseBusiness} kicker="MANAGEMENT DIRECTORY" title="MANAGEMENT" mutedTitle="KONTAKTY" />
      </header>

      {/* Stejná lišta jako v Rozpisu sálů a Operačních oborech. */}
      <section className="hide-scrollbar mb-4 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
        <div className="flex min-w-max items-center gap-2.5">
          {([
            { label: 'Celkem kontaktů', value: stats.total, suffix: 'osob', icon: Users, color: COLORS.cyan },
            { label: 'Aktivní', value: stats.active, suffix: 'osob', icon: UserRoundCheck, color: COLORS.green },
            { label: 'Krizová linka', value: stats.emergencyRecipients, suffix: 'příjemců', icon: ShieldCheck, color: COLORS.red },
            { label: 'Reporty', value: stats.reportRecipients, suffix: 'příjemců', icon: FileText, color: COLORS.blue },
            { label: 'Aktivní odběry', value: stats.configuredChannels, suffix: 'pravidel', icon: Bell, color: COLORS.violet },
          ] as const).map(({ label, value, suffix, icon: Icon, color }) => (
            <div key={label} className="relative flex h-[68px] w-[112px] shrink-0 items-center overflow-hidden rounded-lg border border-white/[0.05] bg-black/10 px-3 py-2.5 2xl:w-[128px]">
              <div className="flex w-full items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[8px] font-semibold uppercase tracking-[0.08em] text-white/38" title={label}>{label}</p>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="text-[22px] font-light leading-none tabular-nums text-white/95">{value}</span>
                    <span className="text-[8px] font-medium text-white/28">{suffix}</span>
                  </div>
                </div>
                <Icon className="h-4 w-4 shrink-0" style={{ color }} strokeWidth={1.5} />
              </div>
            </div>
          ))}

          <div className="ml-1 h-10 w-px shrink-0 bg-white/[0.07]" aria-hidden="true" />

          <div className="w-[104px] shrink-0">
            <h2 className="text-[11px] font-semibold leading-tight text-white/92">Kontakty vedení</h2>
            <p className="mt-1 text-[8px] leading-tight text-white/38">Distribuce zpráv</p>
          </div>

          <div className="grid shrink-0 grid-cols-3 rounded-lg border border-white/[0.055] bg-white/[0.025] p-0.5">
            {([['all', 'Všechny'], ['active', 'Aktivní'], ['inactive', 'Neaktivní']] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                aria-pressed={filter === id}
                className={`h-8 rounded-md px-3 text-[8px] font-semibold uppercase tracking-[0.08em] ${filter === id ? 'bg-white/[0.09] text-cyan-200' : 'text-white/38 hover:text-white/70'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="flex h-10 w-[190px] shrink-0 items-center gap-2 rounded-lg border border-white/[0.055] bg-black/10 px-3">
            <Search className="h-4 w-4 shrink-0 text-white/30" />
            <input
              type="search"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Hledat kontakt"
              aria-label="Hledat v management kontaktech"
              className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold text-white/88 outline-none placeholder:font-normal placeholder:text-white/28"
            />
          </label>

          <button
            type="button"
            onClick={() => setSelectedContact(createContact(contacts.length))}
            className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-cyan-200/[0.20] bg-cyan-300/[0.10] px-4 text-[9px] font-semibold uppercase tracking-[0.08em] text-cyan-100 hover:bg-cyan-300/[0.16]"
          >
            <Plus className="h-4 w-4" />
            Přidat kontakt
          </button>
        </div>
      </section>

      {loading ? (
        <section className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025]">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300/70" />
          <p className="text-xs text-white/35">Načítám management kontakty…</p>
        </section>
      ) : filteredContacts.length === 0 ? (
        <section className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] px-6 text-center">
          <MessageSquareText className="mb-3 h-9 w-9 text-white/16" />
          <p className="text-sm font-semibold text-white/45">
            {contacts.length === 0 ? 'Zatím nejsou uložené žádné kontakty' : 'Filtru neodpovídá žádný kontakt'}
          </p>
          <p className="mt-1 text-xs text-white/25">Upravte filtr nebo přidejte nový kontakt managementu.</p>
        </section>
      ) : (
        <section className="grid gap-2.5 xl:grid-cols-2">
          {filteredContacts.map(contact => (
            <ContactCard key={contact.id} contact={contact} onEdit={() => setSelectedContact(contact)} />
          ))}
        </section>
      )}

      <AnimatePresence>
        {selectedContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#02060a]/88 p-3 backdrop-blur-md sm:p-5"
            onMouseDown={event => {
              if (event.target === event.currentTarget) setSelectedContact(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="my-auto w-full max-w-3xl"
            >
              <DetailEditModal
                contact={selectedContact}
                onClose={() => setSelectedContact(null)}
                onSave={handleSave}
                onDelete={() => {
                  if (selectedContact.id.startsWith('new-')) {
                    setSelectedContact(null);
                  } else {
                    void handleDelete(selectedContact.id);
                  }
                }}
                saving={saving}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
