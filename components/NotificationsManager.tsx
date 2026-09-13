'use client';

import React, { useMemo, useState } from 'react';
import ModulePageHeading from './ModulePageHeading';
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

/** Karta kanálu ve stejném jazyce jako karty v modulu Operační obory:
    barevný pruh na levé hraně, pevná dlaždice, název, řádek metadat,
    ikonové akce vpravo a popis dole. */
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
  const color = meta.color;

  if (isDeleting) {
    return (
      <article
        className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-xl border border-rose-300/20 bg-rose-300/[0.05] px-4 py-6 text-center font-sans"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)' }}
      >
        <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-rose-300/[0.1] text-rose-300">
          <AlertCircle className="h-4 w-4" />
        </span>
        <p className="text-sm font-bold text-white">Odstranit „{notification.title}“?</p>
        <p className="mt-1 text-[11px] text-white/35">Tuto notifikační cestu nebude možné obnovit.</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancelDelete}
            className="h-9 rounded-lg border border-white/[0.08] bg-white/[0.025] px-4 text-xs font-semibold text-white/55 hover:text-white/80"
          >
            Zrušit
          </button>
          <button
            type="button"
            onClick={onConfirmDelete}
            className="h-9 rounded-lg border border-rose-300/20 bg-rose-300/[0.1] px-4 text-xs font-bold text-rose-200 hover:bg-rose-300/[0.16]"
          >
            Odstranit
          </button>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025] py-3.5 pl-5 pr-4 transition-colors ${notification.enabled ? 'hover:bg-white/[0.04]' : 'opacity-55 hover:opacity-80'}`}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)' }}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: `${color}88` }} />

      <div className="flex items-center gap-3.5">
        {/* Pevná velikost dlaždice — všechny typy kanálů zabírají stejné místo. */}
        <span
          className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg border"
          style={{ borderColor: `${color}58`, backgroundColor: `${color}1f`, color }}
        >
          <TypeIcon className="h-5 w-5" strokeWidth={1.6} />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-bold leading-tight text-white/90">{notification.title}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: notification.enabled ? COLORS.green : 'rgba(255,255,255,0.22)' }}
            />
            {notification.enabled ? 'Aktivní' : 'Neaktivní'}
            <span className="text-white/16">·</span>
            <span className="truncate" style={{ color: `${color}B0` }}>{meta.label}</span>
          </p>
        </div>

        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onToggle}
            aria-label={`${notification.enabled ? 'Vypnout' : 'Zapnout'} ${notification.title}`}
            title={notification.enabled ? 'Vypnout kanál' : 'Zapnout kanál'}
            className={`grid h-8 w-8 place-items-center rounded-lg border transition-colors ${notification.enabled ? 'border-emerald-200/[0.14] text-emerald-200/70 hover:bg-emerald-300/[0.08] hover:text-emerald-200' : 'border-white/[0.065] text-white/34 hover:bg-white/[0.06] hover:text-white/75'}`}
          >
            {notification.enabled ? <UserRoundCheck className="h-3.5 w-3.5" /> : <UserRoundX className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onRequestDelete}
            aria-label={`Odstranit ${notification.title}`}
            title="Odstranit kanál"
            className="grid h-8 w-8 place-items-center rounded-lg border border-red-200/[0.08] text-red-200/40 transition-colors hover:bg-red-300/[0.06] hover:text-red-200/75"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <p className="mt-3 min-h-[30px] text-[11.5px] leading-[15px] text-white/42 line-clamp-2">
        {notification.description}
      </p>

      <div className="mt-auto flex items-center gap-2 border-t border-white/[0.055] pt-2.5">
        <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/26">
          {notification.type === 'email' ? 'Příjemce' : 'Doručení'}
        </span>
        <span className="ml-auto min-w-0 truncate text-[10px] text-white/45">
          {notification.type === 'email'
            ? notification.recipientEmail || 'Výchozí distribuční seznam'
            : notification.enabled ? 'Povoleno v systému' : 'Doručování vypnuto'}
        </span>
      </div>
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
    <div className="statistics-module min-h-full w-full pb-10 font-sans">
      <header className="mb-7">
        <ModulePageHeading icon={BellRing} kicker="NOTIFICATION CONTROL" title="NOTIFIKAČNÍ" mutedTitle="CENTRUM" />
      </header>

      {/* Stejná lišta jako v Rozpisu sálů a Operačních oborech. */}
      <section className="hide-scrollbar mb-4 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
        <div className="flex min-w-max items-center gap-2.5">
          {([
            { label: 'Celkem kanálů', value: stats.total, suffix: 'pravidel', icon: Bell, color: COLORS.cyan },
            { label: 'Aktivní', value: stats.active, suffix: 'kanálů', icon: UserRoundCheck, color: COLORS.green },
            { label: 'Neaktivní', value: stats.inactive, suffix: 'kanálů', icon: UserRoundX, color: stats.inactive ? COLORS.amber : COLORS.green },
            { label: 'E-mail a SMS', value: stats.digital, suffix: 'aktivní', icon: Mail, color: COLORS.blue },
            { label: 'Okamžitá odezva', value: stats.realtime, suffix: 'aktivní', icon: Radio, color: '#EC4899' },
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
            <h2 className="text-[11px] font-semibold leading-tight text-white/92">Notifikační kanály</h2>
            <p className="mt-1 text-[8px] leading-tight text-white/38">Doručování zpráv</p>
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
              placeholder="Hledat kanál"
              aria-label="Hledat v notifikacích"
              className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold text-white/88 outline-none placeholder:font-normal placeholder:text-white/28"
            />
          </label>

          <button
            type="button"
            onClick={() => setShowEmailTest(true)}
            className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.025] px-4 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/52 hover:text-white"
          >
            <Send className="h-4 w-4" />
            Test e-mailu
          </button>

          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-cyan-200/[0.20] bg-cyan-300/[0.10] px-4 text-[9px] font-semibold uppercase tracking-[0.08em] text-cyan-100 hover:bg-cyan-300/[0.16]"
          >
            <Plus className="h-4 w-4" />
            Přidat kanál
          </button>
        </div>
      </section>

      {filteredNotifications.length === 0 ? (
        <section className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] px-6 text-center">
          <MessageSquareText className="mb-3 h-9 w-9 text-white/16" />
          <p className="text-sm font-semibold text-white/45">
            {notifications.length === 0 ? 'Zatím nejsou vytvořené žádné notifikace' : 'Filtru neodpovídá žádný kanál'}
          </p>
          <p className="mt-1 text-xs text-white/25">Upravte filtr nebo přidejte nový notifikační kanál.</p>
        </section>
      ) : (
        <section className="grid gap-2.5 xl:grid-cols-2">
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
        </section>
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
