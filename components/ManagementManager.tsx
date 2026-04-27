'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, Mail, Phone, Search, Plus, Trash2, X, Check,
  Shield, Users, Loader2, Bell, AlertTriangle, BarChart3, FileText,
  Clock, AlertCircle, CheckCircle2, Zap
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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

const NOTIFICATION_TYPES = [
  { key: 'notify_late_surgeon', label: 'Pozdní příchod operatéra', icon: AlertTriangle, color: 'red' },
  { key: 'notify_late_anesthesiologist', label: 'Pozdní příchod anesteziologa', icon: AlertTriangle, color: 'orange' },
  { key: 'notify_patient_not_ready', label: 'Nepřipravený pacient', icon: AlertCircle, color: 'yellow' },
  { key: 'notify_late_arrival', label: 'Pozdní příjezd', icon: Clock, color: 'blue' },
  { key: 'notify_other', label: 'Jiný důvod', icon: Zap, color: 'purple' },
  { key: 'notify_emergencies', label: 'Urgentní notifikace', icon: AlertTriangle, color: 'red' },
  { key: 'notify_daily_reports', label: 'Denní reporty', icon: FileText, color: 'blue' },
  { key: 'notify_statistics', label: 'Statistiky', icon: BarChart3, color: 'purple' },
];

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
  const [formData, setFormData] = React.useState<ManagementContact>({ ...contact });

  const handleSave = () => {
    if (!formData.position.trim() || !formData.email.trim()) return;
    onSave(formData);
  };

  const toggleNotification = (key: string) => {
    setFormData({ ...formData, [key]: !formData[key as keyof ManagementContact] });
  };

  return (
    <div 
      className="w-full max-w-2xl rounded-2xl p-6 space-y-5"
      style={{
        background: 'rgba(10,10,18,0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-cyan-500/15">
            <Briefcase className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Upravit kontakt</h3>
            <p className="text-xs text-white/40">Upravte údaje a konfigurujte notifikace</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Fields Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Position Field */}
        <div>
          <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Pozice *</label>
          <input
            type="text"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            className="w-full mt-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#FBBF24]/50 transition-all"
            placeholder="Vedoucí operací"
          />
        </div>

        {/* Name Field */}
        <div>
          <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Jméno</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full mt-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#FBBF24]/50 transition-all"
            placeholder="Jméno a příjmení"
          />
        </div>

        {/* Email Field */}
        <div>
          <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Email *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full mt-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#FBBF24]/50 transition-all"
            placeholder="email@company.com"
          />
        </div>

        {/* Phone Field */}
        <div>
          <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Telefon</label>
          <input
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full mt-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#FBBF24]/50 transition-all"
            placeholder="+420 123 456 789"
          />
        </div>
      </div>

      {/* Notifications Section */}
      <div>
        <label className="text-xs text-white/40 font-bold uppercase tracking-wider mb-4 block">Konfigurace notifikací</label>
        <div className="grid grid-cols-2 gap-3">
          {NOTIFICATION_TYPES.map(({ key, label, icon: Icon, color }) => {
            const isEnabled = formData[key as keyof ManagementContact] as boolean;
            const bgColor = {
              red: 'red-500/15',
              orange: 'orange-500/15',
              yellow: 'yellow-500/15',
              blue: 'blue-500/15',
              purple: 'purple-500/15',
            }[color];
            const borderColor = {
              red: 'red-500/30',
              orange: 'orange-500/30',
              yellow: 'yellow-500/30',
              blue: 'blue-500/30',
              purple: 'purple-500/30',
            }[color];
            const textColor = {
              red: 'red-300',
              orange: 'orange-300',
              yellow: 'yellow-300',
              blue: 'blue-300',
              purple: 'purple-300',
            }[color];
            const iconColor = {
              red: 'red-400',
              orange: 'orange-400',
              yellow: 'yellow-400',
              blue: 'blue-400',
              purple: 'purple-400',
            }[color];

            return (
              <button
                key={key}
                onClick={() => toggleNotification(key)}
                className={`p-4 rounded-xl border transition-all text-left flex items-start gap-3 ${
                  isEnabled
                    ? `bg-${bgColor} border-${borderColor}`
                    : 'bg-white/[0.03] border-white/10'
                }`}
              >
                <Icon className={`w-4 h-4 mt-1 flex-shrink-0 ${isEnabled ? `text-${iconColor}` : 'text-white/40'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-tight ${isEnabled ? `text-${textColor}` : 'text-white/60'}`}>
                    {label}
                  </p>
                  {isEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-1"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-white/50">
                        <CheckCircle2 className="w-3 h-3" />
                        Aktivní
                      </div>
                    </motion.div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Poznámky</label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full mt-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#FBBF24]/50 transition-all resize-none"
          placeholder="Zadejte dodatečné poznámky..."
          rows={2}
        />
      </div>

      {/* Active Status */}
      <button
        onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
        className={`w-full p-4 rounded-xl border transition-all flex items-center justify-between ${
          formData.is_active
            ? 'bg-green-500/15 border-green-500/30'
            : 'bg-white/[0.03] border-white/10'
        }`}
      >
        <span className={`text-sm font-semibold ${formData.is_active ? 'text-green-300' : 'text-white/60'}`}>
          {formData.is_active ? 'Aktivní' : 'Neaktivní'}
        </span>
        {formData.is_active ? (
          <Check className="w-5 h-5 text-green-400" />
        ) : (
          <X className="w-5 h-5 text-white/40" />
        )}
      </button>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-white/10">
        <button
          onClick={handleSave}
          disabled={saving || !formData.position.trim() || !formData.email.trim()}
          className="flex-1 px-4 py-3 bg-[#FBBF24] text-black font-bold rounded-xl hover:bg-[#FBBF24]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Ukládání...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Uložit
            </>
          )}
        </button>
        <button
          onClick={onDelete}
          disabled={saving}
          className="px-4 py-3 bg-red-500/20 text-red-300 border border-red-500/30 font-bold rounded-xl hover:bg-red-500/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function ManagementManager() {
  const [contacts, setContacts] = useState<ManagementContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<ManagementContact | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchContacts();
    }
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('management_contacts')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('[v0] Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updated: ManagementContact) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('management_contacts')
        .upsert({ ...updated, updated_at: new Date().toISOString() });

      if (error) throw error;
      await fetchContacts();
      setSelectedContact(null);
      setShowNewForm(false);
    } catch (error) {
      console.error('[v0] Error saving contact:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('management_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchContacts();
      setSelectedContact(null);
    } catch (error) {
      console.error('[v0] Error deleting contact:', error);
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeContacts = contacts.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-cyan-400" />
            <p className="text-[10px] font-bold text-cyan-400 tracking-[0.4em] uppercase">MANAGEMENT CONTROL</p>
          </div>
          <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-bold tracking-tight uppercase leading-none">
            MANAGEMENT <span className="text-white/20">KONTAKTY</span>
          </h1>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          className="p-4 rounded-xl border backdrop-blur-sm"
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderColor: 'rgba(255,255,255,0.1)',
          }}
          whileHover={{ scale: 1.02 }}
        >
          <p className="text-xs text-white/40 font-bold uppercase">Celkem</p>
          <p className="text-3xl font-bold text-white mt-1">{contacts.length}</p>
        </motion.div>
        <motion.div
          className="p-4 rounded-xl border backdrop-blur-sm"
          style={{
            background: 'rgba(16,185,129,0.1)',
            borderColor: 'rgba(16,185,129,0.3)',
          }}
          whileHover={{ scale: 1.02 }}
        >
          <p className="text-xs text-white/40 font-bold uppercase">Aktivní</p>
          <p className="text-3xl font-bold text-emerald-400 mt-1">{activeContacts}</p>
        </motion.div>
        <motion.div
          className="p-4 rounded-xl border backdrop-blur-sm"
          style={{
            background: 'rgba(249,115,22,0.1)',
            borderColor: 'rgba(249,115,22,0.3)',
          }}
          whileHover={{ scale: 1.02 }}
        >
          <p className="text-xs text-white/40 font-bold uppercase">Neaktivní</p>
          <p className="text-3xl font-bold text-orange-400 mt-1">{contacts.length - activeContacts}</p>
        </motion.div>
      </div>

      {/* Search and Add */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            placeholder="Hledat jméno, pozici, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#FBBF24]/50 transition-all"
          />
        </div>
        <motion.button
          onClick={() => {
            setShowNewForm(true);
            setSelectedContact({
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
              sort_order: contacts.length,
            });
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 bg-[#FBBF24] text-black font-bold rounded-xl hover:bg-[#FBBF24]/90 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Přidat
        </motion.button>
      </div>

      {/* Contacts List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-white/40" />
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">Žádné kontakty k dispozici</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredContacts.map((contact) => (
            <motion.button
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className="w-full p-4 rounded-xl text-left transition-all"
              style={{
                background: contact.is_active ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${contact.is_active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
              }}
              whileHover={{ scale: 1.01, background: 'rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#FBBF24]/20 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-[#FBBF24]" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{contact.name || contact.position}</p>
                      <p className="text-xs text-white/40">{contact.position}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <p className="text-xs text-white/40 mb-1">Email</p>
                    <p className="text-sm text-white">{contact.email}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    {contact.is_active ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <X className="w-4 h-4 text-white/40" />
                    )}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedContact(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] overflow-y-auto"
            >
              <DetailEditModal
                contact={selectedContact}
                onClose={() => setSelectedContact(null)}
                onSave={handleSave}
                onDelete={() => {
                  if (selectedContact.id.startsWith('new-')) {
                    setSelectedContact(null);
                  } else {
                    handleDelete(selectedContact.id);
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
