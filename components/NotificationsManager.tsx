import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, X, Check, AlertCircle, Bell, Volume2, Mail, MessageSquare, Send, Loader, Eye } from 'lucide-react';
import { sendEmailNotification, generateEmailTemplate } from '../lib/email';
import { 
  LateArrivalEmailTemplate, 
  ScheduleChangeEmailTemplate, 
  WelcomeEmailTemplate,
  EmailTemplate 
} from './EmailTemplate';

interface Notification {
  id: string;
  type: 'email' | 'sms' | 'push' | 'sound';
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

interface EmailTemplateOption {
  id: string;
  name: string;
  description: string;
  component: React.ReactNode;
  testData?: {
    operatorName?: string;
    roomName?: string;
    scheduledTime?: string;
    changeDescription?: string;
    recipientName?: string;
  };
}

interface NotificationsManagerProps {
  onNotificationsChange?: (notifications: Notification[]) => void;
}

const NotificationsManager: React.FC<NotificationsManagerProps> = ({
  onNotificationsChange,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'email',
      title: 'Email notifikace',
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
  ]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [emailTestState, setEmailTestState] = useState<EmailTestState>({
    isLoading: false,
    message: '',
    isError: false,
  });
  const [testRecipientEmail, setTestRecipientEmail] = useState('');
  const [showEmailTest, setShowEmailTest] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('late-arrival');
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [newNotification, setNewNotification] = useState({
    type: 'email' as const,
    title: '',
    description: '',
    recipientEmail: '',
  });

  const emailTemplateOptions: EmailTemplateOption[] = [
    {
      id: 'late-arrival',
      name: 'Pozdní příchod operatéra',
      description: 'Notifikace o zpoždění operatéra v operačním sále',
      component: <LateArrivalEmailTemplate 
        operatorName="Jan Novák"
        roomName="Sál 1"
        scheduledTime="10:30"
      />,
      testData: {
        operatorName: 'Jan Novák',
        roomName: 'Sál 1',
        scheduledTime: '10:30',
      },
    },
    {
      id: 'schedule-change',
      name: 'Změna v rozvrhu',
      description: 'Upozornění na změnu v rozvrhu operačních sálů',
      component: <ScheduleChangeEmailTemplate 
        recipientName="Koordinátore"
        changeDescription="Operační sál č. 1 byl přesunut z 14:00 na 15:00. Prosím proveďte potřebné úpravy."
      />,
      testData: {
        changeDescription: 'Operační sál č. 1 byl přesunut z 14:00 na 15:00.',
      },
    },
    {
      id: 'welcome',
      name: 'Vítací email',
      description: 'Email pro nové uživatele po vytvoření účtu',
      component: <WelcomeEmailTemplate 
        recipientName="Petr"
      />,
      testData: {
        recipientName: 'Petr',
      },
    },
  ];

  const notificationColors: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
    email: { bg: '#3B82F6', color: '#DBEAFE', icon: <Mail className="w-5 h-5" /> },
    sms: { bg: '#06B6D4', color: '#CFFAFE', icon: <MessageSquare className="w-5 h-5" /> },
    push: { bg: '#EC4899', color: '#FCE7F3', icon: <Bell className="w-5 h-5" /> },
    sound: { bg: '#F59E0B', color: '#FEF3C7', icon: <Volume2 className="w-5 h-5" /> },
  };

  const handleToggle = (id: string) => {
    const updated = notifications.map(n =>
      n.id === id ? { ...n, enabled: !n.enabled } : n
    );
    setNotifications(updated);
    onNotificationsChange?.(updated);
  };

  const handleAddNotification = () => {
    if (newNotification.title && newNotification.description) {
      const notification: Notification = {
        id: Date.now().toString(),
        type: newNotification.type,
        title: newNotification.title,
        description: newNotification.description,
        enabled: true,
        recipientEmail: newNotification.recipientEmail || undefined,
      };
      const updated = [...notifications, notification];
      setNotifications(updated);
      onNotificationsChange?.(updated);
      setNewNotification({ type: 'email', title: '', description: '', recipientEmail: '' });
      setIsAddingNew(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testRecipientEmail) {
      setEmailTestState({
        isLoading: false,
        message: 'Prosím zadejte email adresu',
        isError: true,
      });
      return;
    }

    setEmailTestState({ isLoading: true, message: '', isError: false });

    try {
      const selectedTemplate = emailTemplateOptions.find(t => t.id === selectedTemplateId);
      let html: string;

      if (selectedTemplateId === 'late-arrival') {
        html = generateEmailTemplate({
          type: 'custom',
          roomName: 'Sál 1',
          message: 'Operatér Jan Novák má zpoždění. Plánovaný čas příchodu byl 10:30.',
          details: {
            'Operatér': 'Jan Novák',
            'Sál': 'Sál 1',
            'Plánovaný čas': '10:30',
            'Čas odeslání': new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' }),
          },
        });
      } else if (selectedTemplateId === 'schedule-change') {
        html = generateEmailTemplate({
          type: 'custom',
          roomName: 'Sál 1',
          message: 'Operační sál č. 1 byl přesunut z 14:00 na 15:00. Prosím proveďte potřebné úpravy.',
          details: {
            'Změna': 'Přesunutí na 15:00',
            'Sál': 'Sál 1',
            'Čas odeslání': new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' }),
          },
        });
      } else {
        html = generateEmailTemplate({
          type: 'custom',
          roomName: 'Test Operační Sál',
          message: 'Toto je testovací zpráva z Operating Room Management Systému',
          details: {
            'Čas odeslání': new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' }),
            'Test typ': 'Email notifikace',
            'Stav systému': 'Aktivní',
          },
        });
      }

      const result = await sendEmailNotification({
        to: testRecipientEmail,
        subject: `Test: ${selectedTemplate?.name || 'Operating Room Management System'} - Email Notifikace`,
        html,
      });

      if (result.success) {
        setEmailTestState({
          isLoading: false,
          message: '✅ Testovací email byl úspěšně odeslán!',
          isError: false,
        });
        setTimeout(() => {
          setEmailTestState({ isLoading: false, message: '', isError: false });
          setShowEmailTest(false);
        }, 3000);
      } else {
        setEmailTestState({
          isLoading: false,
          message: `❌ Chyba: ${result.error || 'Neznámá chyba'}`,
          isError: true,
        });
      }
    } catch (error) {
      setEmailTestState({
        isLoading: false,
        message: `❌ Chyba: ${error instanceof Error ? error.message : 'Neznámá chyba'}`,
        isError: true,
      });
    }
  };

  const handleDeleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    onNotificationsChange?.(updated);
    setDeleteConfirm(null);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <header className="flex flex-col items-center lg:items-start justify-between gap-6 mb-16 flex-shrink-0">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <Bell className="w-4 h-4 text-[#EC4899]" />
            <p className="text-[10px] font-black text-[#EC4899] tracking-[0.4em] uppercase">NOTIFICATION MANAGEMENT</p>
          </div>
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
            NOTIFIKACE <span className="text-white/20">SYSTEM</span>
          </h1>
        </div>
      </header>

      {/* Add New Notification Form */}
      <AnimatePresence>
        {isAddingNew && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 p-6 rounded-[2.5rem] border border-white/5 bg-white/[0.03] backdrop-blur-[60px]"
            style={{
              boxShadow: `0 15px 35px -10px rgba(0,0,0,0.5)`,
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <select
                value={newNotification.type}
                onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value as any })}
                className="px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white focus:outline-none focus:border-white/20"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Push</option>
                <option value="sound">Sound</option>
              </select>
              <input
                type="text"
                placeholder="Název notifikace"
                value={newNotification.title}
                onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                className="px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              />
              <input
                type="text"
                placeholder="Popis notifikace"
                value={newNotification.description}
                onChange={(e) => setNewNotification({ ...newNotification, description: e.target.value })}
                className="px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-white/20 md:col-span-2"
              />
              {newNotification.type === 'email' && (
                <input
                  type="email"
                  placeholder="Email adresa příjemce (volitelné)"
                  value={newNotification.recipientEmail}
                  onChange={(e) => setNewNotification({ ...newNotification, recipientEmail: e.target.value })}
                  className="px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-white/20 md:col-span-2"
                />
              )}
            </div>
            <div className="flex gap-2">
              <motion.button
                onClick={handleAddNotification}
                className="px-6 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-300 font-semibold hover:bg-blue-500/30 transition-all"
                whileHover={{ scale: 1.05 }}
              >
                <Check className="w-4 h-4 inline mr-2" />
                Přidat
              </motion.button>
              <motion.button
                onClick={() => {
                  setIsAddingNew(false);
                  setNewNotification({ type: 'email', title: '', description: '', recipientEmail: '' });
                }}
                className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/[0.08] transition-all"
                whileHover={{ scale: 1.05 }}
              >
                Zrušit
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Button */}
      {!isAddingNew && (
        <div className="mb-8 flex gap-4">
          <motion.button
            onClick={() => setIsAddingNew(true)}
            className="px-6 py-3 rounded-lg bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.08] hover:border-white/15 transition-all flex items-center gap-2 font-semibold"
            whileHover={{ scale: 1.02 }}
          >
            <Plus className="w-5 h-5" />
            Přidat novou notifikaci
          </motion.button>

          {/* Email Test Button */}
          <motion.button
            onClick={() => setShowEmailTest(!showEmailTest)}
            className="px-6 py-3 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 transition-all flex items-center gap-2 font-semibold"
            whileHover={{ scale: 1.02 }}
          >
            <Mail className="w-5 h-5" />
            Testovat email
          </motion.button>
        </div>
      )}

      {/* Email Test Section */}
      <AnimatePresence>
        {showEmailTest && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 p-6 rounded-[2.5rem] border border-blue-500/20 bg-blue-500/[0.03] backdrop-blur-[60px]"
            style={{
              boxShadow: `0 15px 35px -10px rgba(59, 130, 246, 0.3)`,
            }}
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400" />
              Test Email Notifikace
            </h3>

            {/* Template Selection */}
            <div className="mb-6 p-4 rounded-lg border border-blue-500/30 bg-blue-500/[0.05]">
              <label className="text-sm font-semibold text-blue-200 mb-3 block">
                Vyberte emailovou šablonu:
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {emailTemplateOptions.map((template) => (
                  <motion.button
                    key={template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={`p-3 rounded-lg border transition-all text-left ${
                      selectedTemplateId === template.id
                        ? 'border-blue-500/80 bg-blue-500/20'
                        : 'border-blue-500/20 bg-blue-500/[0.05] hover:border-blue-500/40'
                    }`}
                    whileHover={{ scale: 1.02 }}
                  >
                    <p className="font-semibold text-sm text-white">{template.name}</p>
                    <p className="text-xs text-white/50 mt-1">{template.description}</p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Template Preview Button */}
            <div className="mb-6 flex gap-2">
              <motion.button
                onClick={() => setShowTemplatePreview(!showTemplatePreview)}
                className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/50 text-purple-300 font-semibold hover:bg-purple-500/30 transition-all flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
              >
                <Eye className="w-4 h-4" />
                {showTemplatePreview ? 'Skrýt náhled' : 'Zobrazit náhled'}
              </motion.button>
            </div>

            {/* Template Preview */}
            <AnimatePresence>
              {showTemplatePreview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-4 rounded-lg border border-purple-500/30 bg-purple-500/[0.03] overflow-hidden"
                >
                  <p className="text-sm font-semibold text-purple-200 mb-3">Náhled emailové šablony:</p>
                  <div className="bg-[#EAEEF3] rounded-lg p-4 overflow-auto max-h-96">
                    {emailTemplateOptions.find(t => t.id === selectedTemplateId)?.component}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Input and Send Button */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                type="email"
                placeholder="Email adresa pro test"
                value={testRecipientEmail}
                onChange={(e) => setTestRecipientEmail(e.target.value)}
                className="px-4 py-3 rounded-lg border border-blue-500/30 bg-blue-500/[0.05] text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 md:col-span-2"
              />
              <motion.button
                onClick={handleSendTestEmail}
                disabled={emailTestState.isLoading}
                className="px-6 py-3 rounded-lg bg-blue-500/30 border border-blue-500/50 text-blue-100 font-semibold hover:bg-blue-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
              >
                {emailTestState.isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Odesílání...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Poslat test
                  </>
                )}
              </motion.button>
            </div>

            {emailTestState.message && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`p-4 rounded-lg ${
                  emailTestState.isError
                    ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                    : 'bg-green-500/10 border border-green-500/30 text-green-300'
                }`}
              >
                {emailTestState.message}
              </motion.div>
            )}

            <div className="text-xs text-white/40 mt-4 p-3 bg-white/[0.02] rounded-lg border border-white/5">
              💡 Tip: Vyberte šablonu, zobrazit si můžete náhled, a poté zadejte svou email adresu. Testovací zpráva bude odeslána přes Resend email service.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {notifications.map((notification, index) => {
            const colors = notificationColors[notification.type];
            const isDeleting = deleteConfirm === notification.id;

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="group relative p-6 rounded-[2rem] border border-white/5 bg-white/[0.03] backdrop-blur-[60px] hover:bg-white/[0.06] hover:border-white/10 transition-all"
                style={{
                  boxShadow: `0 15px 35px -10px rgba(0,0,0,0.5)`,
                }}
                whileHover={{
                  boxShadow: `0 15px 35px -10px ${colors.bg}40, inset 0 0 20px ${colors.bg}10`,
                }}
              >
                {isDeleting ? (
                  // Delete Confirmation
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span className="text-white/70">Opravdu chcete smazat <strong>{notification.title}</strong>?</span>
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/30 transition-all"
                        whileHover={{ scale: 1.05 }}
                      >
                        Smazat
                      </motion.button>
                      <motion.button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/[0.08] transition-all"
                        whileHover={{ scale: 1.05 }}
                      >
                        Zrušit
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <motion.div
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/10"
                        style={{
                          backgroundColor: `${colors.bg}20`,
                          borderColor: `${colors.bg}40`,
                        }}
                        whileHover={{ scale: 1.1 }}
                      >
                        <span style={{ color: colors.bg }}>{colors.icon}</span>
                      </motion.div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-white truncate">{notification.title}</h3>
                        <p className="text-xs text-white/40 truncate mt-1">{notification.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Toggle Switch */}
                      <motion.button
                        onClick={() => handleToggle(notification.id)}
                        className={`relative w-12 h-6 rounded-full border border-white/20 transition-all ${
                          notification.enabled ? 'bg-green-500/30' : 'bg-white/5'
                        }`}
                        whileHover={{ scale: 1.05 }}
                      >
                        <motion.div
                          className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white"
                          animate={{
                            x: notification.enabled ? 24 : 0,
                          }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </motion.button>

                      <motion.button
                        onClick={() => setDeleteConfirm(notification.id)}
                        className="p-2 rounded-lg border border-white/10 bg-white/[0.03] text-white/50 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all"
                        whileHover={{ scale: 1.1 }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {notifications.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-white/40 text-lg">Zatím nejsou žádné notifikace. Přidejte první kliknutím na tlačítko výše.</p>
        </motion.div>
      )}
    </div>
  );
};

export default NotificationsManager;
