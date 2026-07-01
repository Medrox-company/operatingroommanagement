'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  Mail,
  MessageSquare,
  MessageSquareText,
  Plus,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  UserRoundX,
  Volume2,
  X,
} from 'lucide-react';
import { generateEmailTemplate, sendEmailNotification } from '../lib/email';

type NotificationType = 'email' | 'sms' | 'push' | 'sound';
type NotificationFilter = 'all' | 'active' | 'inactive';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  enabled: boolean;
  recipientEmail?: string;
}

interface EmailTestState {
  isLoading: boolean;
  message: string;
  isError: boolean;
}

interface NotificationsManagerProps {
  onNotificationsChange?: (notifications: Notification[]) => void;
}

interface NotificationDraft {
  type: NotificationType;
  title: string;
  description: string;
  recipientEmail: string;
}

const COLORS = {
  cyan: '#36D9EC',
  green: '#34D399',
  amber: '#FBBF24',
  red: '#FB7185',
  blue: '#38BDF8',
  violet: '#A78BFA',
};

const TYPE_META: Record<NotificationType, {
  label: string;
  shortLabel: string;
  color: string;
  icon: typeof Mail;
}> = {
  email: { label: 'E-mail', shortLabel: 'MAIL', color: COLORS.blue, icon: Mail },
  sms: { label: 'SMS zpráva', shortLabel: 'SMS', color: COLORS.cyan, icon: MessageSquare },
  push: { label: 'Push oznámení', shortLabel: 'PUSH', color: '#EC4899', icon: Bell },
  sound: { label: 'Zvukový signál', shortLabel: 'ZVUK', color: COLORS.amber, icon: Volume2 },
};

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'email',
    title: 'E-mail notifikace',
    description: 'Přijímejte upozornění e-mailem',
    enabled: true,
    recipientEmail: '',
  },
  {
    id: '2',
    type: 'sms',
    title: 'SMS notifikace',
    description: 'Přijímejte upozornění jako SMS',
    enabled: false,
  },
  {
    id: '3',
    type: 'push',
    title: 'Push notifikace',
    description: 'Přijímejte upozornění v aplikaci',
    enabled: true,
  },
  {
    id: '4',
    type: 'sound',
    title: 'Zvuková upozornění',
    description: 'Slyšte zvuk při důležitých událostech',
    enabled: true,
  },
];

const EMPTY_DRAFT: NotificationDraft = {
  type: 'email',
  title: '',
  description: '',
  recipientEmail: '',
};

const fieldClass =
  'h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-3.5 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-cyan-300/40';

const ModalShell: React.FC<{
  eyebrow: string;
  title: string;
  icon: typeof Bell;
  iconColor: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ eyebrow, title, icon: Icon, iconColor, onClose, children }) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="notification-modal-title"
    className="w-full max-w-2xl rounded-[26px] p-4 font-sans sm:p-6"
    style={{
      background: 'linear-gradient(145deg, rgba(8,20,30,0.985), rgba(5,12,20,0.985))',
      border: '1px solid rgba(125,165,185,0.22)',
      boxShadow: '0 30px 90px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.04)',
    }}
  >
    <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/[0.07] pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ color: iconColor, background: `${iconColor}14`, border: `1px solid ${iconColor}25` }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: iconColor }}>{eyebrow}</p>
          <h2 id="notification-modal-title" className="mt-1 truncate text-lg font-bold text-white">{title}</h2>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Zavřít"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/40 transition-colors hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
    {children}
  </div>
);

const ToggleSwitch: React.FC<{
  enabled: boolean;
  label: string;
  onToggle: () => void;
}> = ({ enabled, label, onToggle }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label={label}
    onClick={onToggle}
    className="relative h-6 w-11 rounded-full border transition-colors"
    style={{
      background: enabled ? `${COLORS.green}32` : 'rgba(255,255,255,0.045)',
      borderColor: enabled ? `${COLORS.green}55` : 'rgba(255,255,255,0.12)',
    }}
  >
    <span
      className="absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-[left]"
      style={{ left: enabled ? 23 : 3 }}
    />
  </button>
);

const NotificationCard: React.FC<{
  notification: Notification;
  isDeleting: boolean;
  onToggle: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}> = ({
  notification,
  isDeleting,
  onToggle,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}) => {
  const meta = TYPE_META[notification.type];
  const TypeIcon = meta.icon;
  const accent = notification.enabled ? meta.color : 'rgba(148,163,184,0.7)';

  return (
    <article
      className="relative min-h-[188px] overflow-hidden rounded-[22px] p-3 font-sans"
      style={{
        background: notification.enabled
          ? `linear-gradient(125deg, ${meta.color}0A, rgba(255,255,255,0.018) 52%, rgba(251,191,36,0.012))`
          : 'rgba(255,255,255,0.016)',
        border: `1px solid ${notification.enabled ? 'rgba(125,165,185,0.16)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)',
      }}
    >
      <div
        aria-hidden
        className="absolute inset-x-10 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      {isDeleting ? (
        <div className="flex h-full min-h-[162px] flex-col items-center justify-center rounded-2xl border border-rose-300/15 bg-rose-300/[0.045] p-4 text-center">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-300/[0.1] text-rose-300">
            <AlertCircle className="h-4 w-4" />
          </span>
          <p className="text-sm font-bold text-white">Odstranit „{notification.title}“?</p>
          <p className="mt-1 text-[11px] text-white/35">Tuto notifikační cestu nebude možné obnovit.</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onCancelDelete}
              className="h-9 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-xs font-semibold text-white/55"
            >
              Zrušit
            </button>
            <button
              type="button"
              onClick={onConfirmDelete}
              className="h-9 rounded-xl border border-rose-300/20 bg-rose-300/[0.1] px-4 text-xs font-bold text-rose-200"
            >
              Odstranit
            </button>
          </div>
        </div>
      ) : (
        <div className="grid h-full grid-cols-[112px_minmax(0,1fr)] gap-3 sm:grid-cols-[132px_minmax(0,1fr)]">
          <div
            className="flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl px-3 py-3"
            style={{
              background: notification.enabled
                ? `linear-gradient(145deg, ${meta.color}2E, ${meta.color}12)`
                : 'linear-gradient(145deg, rgba(148,163,184,0.11), rgba(148,163,184,0.04))',
              border: `1px solid ${notification.enabled ? `${meta.color}55` : 'rgba(148,163,184,0.15)'}`,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Kanál</span>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: notification.enabled ? COLORS.green : 'rgba(255,255,255,0.22)' }}
              />
            </div>
            <div className="my-2">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ color: accent, background: `${meta.color}16`, border: `1px solid ${meta.color}25` }}
              >
                <TypeIcon className="h-4 w-4" />
              </span>
              <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
                {meta.shortLabel}
              </p>
              <p className="mt-1 text-xs font-semibold leading-tight text-white/58">{meta.label}</p>
            </div>
            <span className={`text-[9px] font-semibold ${notification.enabled ? 'text-emerald-300/75' : 'text-white/28'}`}>
              {notification.enabled ? 'Aktivní' : 'Neaktivní'}
            </span>
          </div>

          <div className="flex min-w-0 flex-col py-0.5">
            <div className="flex-1 rounded-2xl border border-white/[0.065] bg-white/[0.018] p-3">
              <p className="text-[9px] font-medium text-white/30">Notifikační pravidlo</p>
              <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-tight text-white">
                {notification.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-white/42">
                {notification.description}
              </p>
            </div>

            <div className="mt-2 flex min-h-10 items-center justify-between gap-2 rounded-xl border border-white/[0.055] bg-black/10 px-3">
              <div className="min-w-0">
                <p className="text-[8px] font-medium uppercase tracking-[0.12em] text-white/25">
                  {notification.type === 'email' ? 'Příjemce' : 'Doručení'}
                </p>
                <p className="truncate text-[10px] font-semibold text-white/48">
                  {notification.type === 'email'
                    ? notification.recipientEmail || 'Výchozí distribuční seznam'
                    : notification.enabled ? 'Povoleno v systému' : 'Doručování vypnuto'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ToggleSwitch
                  enabled={notification.enabled}
                  label={`${notification.enabled ? 'Vypnout' : 'Zapnout'} ${notification.title}`}
                  onToggle={onToggle}
                />
                <button
                  type="button"
                  onClick={onRequestDelete}
                  aria-label={`Odstranit ${notification.title}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-white/30 transition-colors hover:border-rose-300/20 hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};

const NotificationsManager: React.FC<NotificationsManagerProps> = ({ onNotificationsChange }) => {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showEmailTest, setShowEmailTest] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [newNotification, setNewNotification] = useState<NotificationDraft>(EMPTY_DRAFT);
  const [testRecipientEmail, setTestRecipientEmail] = useState('');
  const [emailTestState, setEmailTestState] = useState<EmailTestState>({
    isLoading: false,
    message: '',
    isError: false,
  });

  const updateNotifications = (nextNotifications: Notification[]) => {
    setNotifications(nextNotifications);
    onNotificationsChange?.(nextNotifications);
  };

  const handleToggle = (id: string) => {
    updateNotifications(
      notifications.map(notification =>
        notification.id === id ? { ...notification, enabled: !notification.enabled } : notification),
    );
  };

  const handleAddNotification = () => {
    if (!newNotification.title.trim() || !newNotification.description.trim()) return;

    updateNotifications([
      ...notifications,
      {
        id: Date.now().toString(),
        type: newNotification.type,
        title: newNotification.title.trim(),
        description: newNotification.description.trim(),
        enabled: true,
        recipientEmail: newNotification.recipientEmail.trim() || undefined,
      },
    ]);
    setNewNotification(EMPTY_DRAFT);
    setIsAddingNew(false);
  };

  const handleDeleteNotification = (id: string) => {
    updateNotifications(notifications.filter(notification => notification.id !== id));
    setDeleteConfirm(null);
  };

  const handleSendTestEmail = async () => {
    if (!testRecipientEmail.trim()) {
      setEmailTestState({ isLoading: false, message: 'Zadejte e-mailovou adresu příjemce.', isError: true });
      return;
    }

    setEmailTestState({ isLoading: true, message: '', isError: false });

    try {
      const html = generateEmailTemplate({
        type: 'custom',
        roomName: 'Test Operační Sál',
        message: 'Toto je testovací zpráva z Operating Room Management Systému',
        details: {
          'Čas odeslání': new Date().toLocaleString('cs-CZ'),
          'Test typ': 'E-mail notifikace',
          'Stav systému': 'Aktivní',
        },
      });

      const result = await sendEmailNotification({
        to: testRecipientEmail.trim(),
        subject: 'Test: Operating Room Management System – E-mail notifikace',
        html,
      });

      setEmailTestState(result.success
        ? { isLoading: false, message: 'Testovací e-mail byl úspěšně odeslán.', isError: false }
        : { isLoading: false, message: result.error || 'Testovací e-mail se nepodařilo odeslat.', isError: true });
    } catch (error) {
      setEmailTestState({
        isLoading: false,
        message: error instanceof Error ? error.message : 'Testovací e-mail se nepodařilo odeslat.',
        isError: true,
      });
    }
  };

  const stats = useMemo(() => {
    const active = notifications.filter(notification => notification.enabled);
    return {
      total: notifications.length,
      active: active.length,
      inactive: notifications.length - active.length,
      digital: active.filter(notification => notification.type === 'email' || notification.type === 'sms').length,
      realtime: active.filter(notification => notification.type === 'push' || notification.type === 'sound').length,
    };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('cs');
    return notifications.filter(notification => {
      const matchesFilter =
        filter === 'all'
        || (filter === 'active' && notification.enabled)
        || (filter === 'inactive' && !notification.enabled);
      const haystack = [
        notification.title,
        notification.description,
        notification.recipientEmail,
        TYPE_META[notification.type].label,
      ].filter(Boolean).join(' ').toLocaleLowerCase('cs');
      return matchesFilter && (!query || haystack.includes(query));
    });
  }, [filter, notifications, searchQuery]);

  const closeAddModal = () => {
    setIsAddingNew(false);
    setNewNotification(EMPTY_DRAFT);
  };

  const closeTestModal = () => {
    setShowEmailTest(false);
    setEmailTestState({ isLoading: false, message: '', isError: false });
  };

  return (
    <div className="w-full min-h-full pb-8 font-sans">
      <header className="mb-7 space-y-3">
        <div className="flex items-center gap-3">
          <BellRing className="h-4 w-4 text-[#FBBF24]" />
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#FBBF24]">NOTIFICATION CONTROL</p>
        </div>
        <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-bold uppercase leading-none tracking-tight">
          Notifikační <span className="text-white/20">CENTRUM</span>
        </h1>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <p className="text-sm font-medium text-white/40">
            Komunikační kanály, systémová upozornění a kontrola doručování
          </p>
          <div className="inline-flex items-center gap-2 text-[9px] font-bold tracking-[0.16em] text-emerald-300/75">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            NOTIFIKAČNÍ SLUŽBY AKTIVNÍ
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
            { label: 'Celkem kanálů', value: stats.total, suffix: 'pravidel', color: COLORS.cyan, icon: Bell },
            { label: 'Aktivní', value: stats.active, suffix: 'kanálů', color: COLORS.green, icon: UserRoundCheck },
            { label: 'Neaktivní', value: stats.inactive, suffix: 'kanálů', color: stats.inactive ? COLORS.amber : COLORS.green, icon: UserRoundX },
            { label: 'E-mail a SMS', value: stats.digital, suffix: 'aktivní', color: COLORS.blue, icon: Mail },
            { label: 'Okamžitá odezva', value: stats.realtime, suffix: 'aktivní', color: '#EC4899', icon: Radio },
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
            ['all', 'Všechny kanály', Bell],
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
            aria-label="Hledat v notifikacích"
            placeholder="Hledat název, popis, kanál nebo příjemce…"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="h-9 w-full rounded-xl border border-white/[0.07] bg-black/10 pl-9 pr-3 text-xs text-white outline-none transition-colors placeholder:text-white/25 focus:border-cyan-300/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setShowEmailTest(true)}
            className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] px-3 text-xs font-bold text-cyan-200 transition-colors hover:bg-cyan-300/[0.11]"
          >
            <Send className="h-3.5 w-3.5" />
            Test e-mailu
          </button>
          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-xs font-bold text-[#071019] transition-colors hover:bg-amber-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Přidat kanál
          </button>
        </div>
      </section>

      {filteredNotifications.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-[22px] py-16 text-center"
          style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(125,165,185,0.12)' }}
        >
          <MessageSquareText className="mb-3 h-9 w-9 text-white/16" />
          <p className="text-sm font-semibold text-white/45">
            {notifications.length === 0 ? 'Zatím nejsou vytvořené žádné notifikace' : 'Filtru neodpovídá žádný kanál'}
          </p>
          <p className="mt-1 text-xs text-white/25">Upravte filtr nebo přidejte nový notifikační kanál.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filteredNotifications.map(notification => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              isDeleting={deleteConfirm === notification.id}
              onToggle={() => handleToggle(notification.id)}
              onRequestDelete={() => setDeleteConfirm(notification.id)}
              onCancelDelete={() => setDeleteConfirm(null)}
              onConfirmDelete={() => handleDeleteNotification(notification.id)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {isAddingNew && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#02060a]/88 p-3 backdrop-blur-md sm:p-5"
            onMouseDown={event => {
              if (event.target === event.currentTarget) closeAddModal();
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="my-auto w-full max-w-2xl"
            >
              <ModalShell
                eyebrow="Nové pravidlo"
                title="Přidat notifikační kanál"
                icon={BellRing}
                iconColor={COLORS.cyan}
                onClose={closeAddModal}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/38">Typ kanálu</span>
                    <select
                      value={newNotification.type}
                      onChange={event => setNewNotification(current => ({ ...current, type: event.target.value as NotificationType }))}
                      className={`${fieldClass} mt-1.5 [color-scheme:dark]`}
                    >
                      {(Object.entries(TYPE_META) as Array<[NotificationType, typeof TYPE_META[NotificationType]]>).map(([type, meta]) => (
                        <option key={type} value={type} className="bg-[#08141e]">{meta.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/38">Název *</span>
                    <input
                      type="text"
                      value={newNotification.title}
                      onChange={event => setNewNotification(current => ({ ...current, title: event.target.value }))}
                      className={`${fieldClass} mt-1.5`}
                      placeholder="Např. Upozornění na zpoždění"
                    />
                  </label>
                </div>

                <label className="mt-3 block">
                  <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/38">Popis *</span>
                  <textarea
                    value={newNotification.description}
                    onChange={event => setNewNotification(current => ({ ...current, description: event.target.value }))}
                    className="mt-1.5 w-full resize-none rounded-xl border border-white/[0.09] bg-white/[0.025] px-3.5 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-cyan-300/40"
                    placeholder="Popište účel notifikačního pravidla…"
                    rows={3}
                  />
                </label>

                {newNotification.type === 'email' && (
                  <label className="mt-3 block">
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/38">E-mail příjemce</span>
                    <input
                      type="email"
                      value={newNotification.recipientEmail}
                      onChange={event => setNewNotification(current => ({ ...current, recipientEmail: event.target.value }))}
                      className={`${fieldClass} mt-1.5`}
                      placeholder="Volitelné – jinak výchozí distribuční seznam"
                    />
                  </label>
                )}

                <div className="mt-5 flex gap-2 border-t border-white/[0.07] pt-4">
                  <button
                    type="button"
                    onClick={handleAddNotification}
                    disabled={!newNotification.title.trim() || !newNotification.description.trim()}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-xs font-bold text-[#071019] transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Check className="h-4 w-4" />
                    Přidat kanál
                  </button>
                  <button
                    type="button"
                    onClick={closeAddModal}
                    className="flex h-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-xs font-semibold text-white/50"
                  >
                    Zrušit
                  </button>
                </div>
              </ModalShell>
            </motion.div>
          </motion.div>
        )}

        {showEmailTest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#02060a]/88 p-3 backdrop-blur-md sm:p-5"
            onMouseDown={event => {
              if (event.target === event.currentTarget && !emailTestState.isLoading) closeTestModal();
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="my-auto w-full max-w-2xl"
            >
              <ModalShell
                eyebrow="Kontrola doručení"
                title="Test e-mailové notifikace"
                icon={Mail}
                iconColor={COLORS.blue}
                onClose={closeTestModal}
              >
                <p className="mb-4 text-xs leading-relaxed text-white/38">
                  Odešlete bezpečnou testovací zprávu a ověřte konfiguraci e-mailové služby i dostupnost příjemce.
                </p>
                <label className="block">
                  <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/38">E-mail příjemce</span>
                  <input
                    type="email"
                    value={testRecipientEmail}
                    onChange={event => setTestRecipientEmail(event.target.value)}
                    className={`${fieldClass} mt-1.5`}
                    placeholder="vas.email@nemocnice.cz"
                    disabled={emailTestState.isLoading}
                  />
                </label>

                {emailTestState.message && (
                  <div
                    role="status"
                    className="mt-3 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs"
                    style={{
                      color: emailTestState.isError ? COLORS.red : COLORS.green,
                      background: `${emailTestState.isError ? COLORS.red : COLORS.green}0D`,
                      borderColor: `${emailTestState.isError ? COLORS.red : COLORS.green}28`,
                    }}
                  >
                    {emailTestState.isError
                      ? <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      : <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                    {emailTestState.message}
                  </div>
                )}

                <div className="mt-5 flex gap-2 border-t border-white/[0.07] pt-4">
                  <button
                    type="button"
                    onClick={() => void handleSendTestEmail()}
                    disabled={emailTestState.isLoading}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-bold text-[#071019] transition-colors hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {emailTestState.isLoading
                      ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/25 border-t-black/80" />
                      : <Send className="h-4 w-4" />}
                    {emailTestState.isLoading ? 'Odesílání…' : 'Odeslat test'}
                  </button>
                  <button
                    type="button"
                    onClick={closeTestModal}
                    disabled={emailTestState.isLoading}
                    className="flex h-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-xs font-semibold text-white/50 disabled:opacity-40"
                  >
                    Zavřít
                  </button>
                </div>
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsManager;
