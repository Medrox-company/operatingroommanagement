'use client';

import React, { useEffect, useMemo, useState } from 'react';
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

const ContactCard: React.FC<{
  contact: ManagementContact;
  onEdit: () => void;
}> = ({ contact, onEdit }) => {
  const notificationCount = enabledNotificationCount(contact);
  const accent = contact.is_active ? COLORS.cyan : 'rgba(148,163,184,0.7)';

  return (
    <article
      className="relative min-h-[188px] overflow-hidden rounded-[22px] p-3 font-sans"
      style={{
        background: contact.is_active
          ? 'linear-gradient(125deg, rgba(54,217,236,0.04), rgba(255,255,255,0.018) 52%, rgba(251,191,36,0.018))'
          : 'rgba(255,255,255,0.016)',
        border: `1px solid ${contact.is_active ? 'rgba(125,165,185,0.16)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)',
      }}
    >
      <div
        aria-hidden
        className="absolute inset-x-10 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      <div className="grid h-full grid-cols-[112px_minmax(0,1fr)] gap-3 sm:grid-cols-[132px_minmax(0,1fr)]">
        <div
          className="flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl px-3 py-3"
          style={{
            background: contact.is_active
              ? 'linear-gradient(145deg, rgba(54,217,236,0.18), rgba(54,217,236,0.075))'
              : 'linear-gradient(145deg, rgba(148,163,184,0.11), rgba(148,163,184,0.04))',
            border: `1px solid ${contact.is_active ? 'rgba(54,217,236,0.32)' : 'rgba(148,163,184,0.15)'}`,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Management</span>
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: contact.is_active ? COLORS.green : 'rgba(255,255,255,0.22)' }}
            />
          </div>
          <div className="my-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold"
              style={{ color: accent, background: `${accent}16`, border: `1px solid ${accent}25` }}
            >
              {initials(contact)}
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-bold leading-tight text-white">
              {contact.name || contact.position}
            </p>
            <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-white/42">{contact.position}</p>
          </div>
          <span className={`text-[9px] font-semibold ${contact.is_active ? 'text-emerald-300/75' : 'text-white/28'}`}>
            {contact.is_active ? 'Aktivní' : 'Neaktivní'}
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-2 py-0.5">
          <a
            href={`mailto:${contact.email}`}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.035] px-3 transition-colors hover:border-cyan-300/25"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-300/[0.09] text-cyan-300">
              <Mail className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-medium text-white/32">E-mail</p>
              <p className="truncate text-xs font-semibold text-white/72">{contact.email}</p>
            </div>
          </a>

          {contact.phone ? (
            <a
              href={`tel:${contact.phone}`}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-amber-300/10 bg-amber-300/[0.03] px-3 transition-colors hover:border-amber-300/25"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-300/[0.08] text-amber-300">
                <Phone className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-medium text-white/32">Telefon</p>
                <p className="truncate text-xs font-semibold text-white/72">{contact.phone}</p>
              </div>
            </a>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-white/[0.055] bg-white/[0.018] px-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.035] text-white/22">
                <Phone className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[9px] font-medium text-white/28">Telefon</p>
                <p className="text-xs font-semibold text-white/28">Neuveden</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
            <div className="flex items-center gap-1.5 text-[9px] font-semibold text-white/38">
              <Bell className="h-3 w-3 text-violet-300/70" />
              {notificationCount} {notificationCount === 1 ? 'odběr' : notificationCount < 5 ? 'odběry' : 'odběrů'}
            </div>
            <button
              type="button"
              onClick={onEdit}
              className="flex h-7 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.025] px-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white/48 transition-colors hover:border-cyan-300/25 hover:text-cyan-200"
            >
              <SlidersHorizontal className="h-3 w-3" />
              Upravit
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default function ManagementManager() {
  const [contacts, setContacts] = useState<ManagementContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ContactFilter>('all');
  const [selectedContact, setSelectedContact] = useState<ManagementContact | null>(null);

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/management-contacts');
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
  }, []);

  const handleSave = async (updated: ManagementContact) => {
    setSaving(true);
    try {
      const isNew = updated.id.startsWith('new-');
      const response = await fetch('/api/management-contacts', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isNew ? { ...updated, id: undefined } : updated),
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
      const response = await fetch(`/api/management-contacts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
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
    <div className="w-full min-h-full pb-8 font-sans">
      <header className="mb-7 space-y-3">
        <div className="flex items-center gap-3">
          <BriefcaseBusiness className="h-4 w-4 text-[#FBBF24]" />
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#FBBF24]">MANAGEMENT DIRECTORY</p>
        </div>
        <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-bold uppercase leading-none tracking-tight">
          Management <span className="text-white/20">KONTAKTY</span>
        </h1>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <p className="text-sm font-medium text-white/40">
            Kontaktní síť vedení, distribuční pravidla a krizová komunikace
          </p>
          <div className="inline-flex items-center gap-2 text-[9px] font-bold tracking-[0.16em] text-emerald-300/75">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            KOMUNIKAČNÍ CENTRUM AKTIVNÍ
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
            { label: 'Celkem kontaktů', value: stats.total, suffix: 'osob', color: COLORS.cyan, icon: Users },
            { label: 'Aktivní', value: stats.active, suffix: 'osob', color: COLORS.green, icon: UserRoundCheck },
            { label: 'Krizová linka', value: stats.emergencyRecipients, suffix: 'příjemců', color: COLORS.red, icon: ShieldCheck },
            { label: 'Reporty', value: stats.reportRecipients, suffix: 'příjemců', color: COLORS.blue, icon: FileText },
            { label: 'Aktivní odběry', value: stats.configuredChannels, suffix: 'pravidel', color: COLORS.violet, icon: Bell },
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
        className="mb-5 flex flex-col gap-2 rounded-[22px] p-2 xl:flex-row xl:items-center"
        style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(125,165,185,0.14)' }}
      >
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
          {([
            ['all', 'Všechny kontakty', Users],
            ['active', 'Aktivní', UserRoundCheck],
            ['inactive', 'Neaktivní', UserRoundX],
          ] as const).map(([id, label, Icon]) => {
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className="flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-xs font-semibold transition-colors"
                style={active
                  ? { background: 'rgba(54,217,236,0.12)', color: COLORS.cyan, border: '1px solid rgba(54,217,236,0.22)' }
                  : { color: 'rgba(255,255,255,0.42)', border: '1px solid transparent' }}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                <span className="text-[9px] tabular-nums opacity-60">
                  {id === 'all' ? stats.total : id === 'active' ? stats.active : stats.inactive}
                </span>
              </button>
            );
          })}
        </div>

        <div className="hidden h-7 w-px bg-white/[0.07] xl:block" />

        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/28" />
          <input
            type="search"
            aria-label="Hledat v management kontaktech"
            placeholder="Hledat jméno, pozici, e-mail nebo telefon…"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="h-9 w-full rounded-xl border border-white/[0.07] bg-black/10 pl-9 pr-3 text-xs text-white outline-none transition-colors placeholder:text-white/25 focus:border-cyan-300/30"
          />
        </div>

        <button
          type="button"
          onClick={() => setSelectedContact(createContact(contacts.length))}
          className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-xs font-bold text-[#071019] transition-colors hover:bg-amber-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Přidat kontakt
        </button>
      </section>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300/70" />
          <p className="text-xs text-white/35">Načítám management kontakty…</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-[22px] py-16 text-center"
          style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(125,165,185,0.12)' }}
        >
          <MessageSquareText className="mb-3 h-9 w-9 text-white/16" />
          <p className="text-sm font-semibold text-white/45">
            {contacts.length === 0 ? 'Zatím nejsou uložené žádné kontakty' : 'Filtru neodpovídá žádný kontakt'}
          </p>
          <p className="mt-1 text-xs text-white/25">Upravte filtr nebo přidejte nový kontakt managementu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filteredContacts.map(contact => (
            <ContactCard key={contact.id} contact={contact} onEdit={() => setSelectedContact(contact)} />
          ))}
        </div>
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
