'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, Mail, Phone, Search, Plus, Trash2, X, Check,
  Shield, Users, Loader2, Bell, AlertTriangle, BarChart3, FileText
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ManagementContact {
  id: string;
  name: string;
  position: string;
  email: string;
  phone?: string;
  notes?: string;
  notify_emergencies: boolean;
  notify_daily_reports: boolean;
  notify_statistics: boolean;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

// Detail Edit Modal Component
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

  return (
    <div 
      className="w-full max-w-lg rounded-2xl p-6 space-y-5"
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
            <p className="text-xs text-white/40">Upravte údaje a uložte změny</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Position Field */}
      <div>
        <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Pozice *</label>
        <input
          type="text"
          value={formData.position}
          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          className="w-full mt-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#00D8C1]/50 transition-all"
          placeholder="např. Vedoucí operací"
        />
      </div>

      {/* Name Field */}
      <div>
        <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Jméno</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full mt-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#00D8C1]/50 transition-all"
          placeholder="Zadejte jméno..."
        />
      </div>

      {/* Email Field */}
      <div>
        <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Email *</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full mt-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#00D8C1]/50 transition-all"
          placeholder="example@company.com"
        />
      </div>

      {/* Phone Field */}
      <div>
        <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Telefon</label>
        <input
          type="tel"
          value={formData.phone || ''}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full mt-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#00D8C1]/50 transition-all"
          placeholder="+420 123 456 789"
        />
      </div>

      {/* Notification Toggles */}
      <div>
        <label className="text-xs text-white/40 font-bold uppercase tracking-wider mb-3 block">Notifikace</label>
        <div className="grid grid-cols-1 gap-3">
          {/* Emergency Notifications */}
          <button
            onClick={() => setFormData({ ...formData, notify_emergencies: !formData.notify_emergencies })}
            className={`p-4 rounded-xl border transition-all text-left ${
              formData.notify_emergencies
                ? 'bg-red-500/15 border-red-500/30'
                : 'bg-white/[0.03] border-white/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${formData.notify_emergencies ? 'text-red-400' : 'text-white/40'}`} />
              <span className={`text-sm font-semibold ${formData.notify_emergencies ? 'text-red-300' : 'text-white/60'}`}>
                Urgentní notifikace
              </span>
            </div>
            <p className="text-[10px] text-white/30 mt-1">Okamžité upozornění při problémech</p>
          </button>

          {/* Daily Reports */}
          <button
            onClick={() => setFormData({ ...formData, notify_daily_reports: !formData.notify_daily_reports })}
            className={`p-4 rounded-xl border transition-all text-left ${
              formData.notify_daily_reports
                ? 'bg-blue-500/15 border-blue-500/30'
                : 'bg-white/[0.03] border-white/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className={`w-4 h-4 ${formData.notify_daily_reports ? 'text-blue-400' : 'text-white/40'}`} />
              <span className={`text-sm font-semibold ${formData.notify_daily_reports ? 'text-blue-300' : 'text-white/60'}`}>
                Denní reporty
              </span>
            </div>
            <p className="text-[10px] text-white/30 mt-1">Shrnutí operací každý den</p>
          </button>

          {/* Statistics */}
          <button
            onClick={() => setFormData({ ...formData, notify_statistics: !formData.notify_statistics })}
            className={`p-4 rounded-xl border transition-all text-left ${
              formData.notify_statistics
                ? 'bg-purple-500/15 border-purple-500/30'
                : 'bg-white/[0.03] border-white/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className={`w-4 h-4 ${formData.notify_statistics ? 'text-purple-400' : 'text-white/40'}`} />
              <span className={`text-sm font-semibold ${formData.notify_statistics ? 'text-purple-300' : 'text-white/60'}`}>
                Statistiky
              </span>
            </div>
            <p className="text-[10px] text-white/30 mt-1">Týdenní a měsíční přehledy</p>
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Poznámky</label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full mt-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#00D8C1]/50 transition-all resize-none"
          placeholder="Zadejte dodatečné poznámky..."
          rows={3}
        />
      </div>

      {/* Active Status */}
      <button
        onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
        className={`w-full p-4 rounded-xl border transition-all flex items-center justify-between ${
          formData.is_active
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${formData.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className={`font-semibold ${formData.is_active ? 'text-emerald-300' : 'text-red-300'}`}>
            {formData.is_active ? 'Aktivní' : 'Neaktivní'}
          </span>
        </div>
        <span className="text-xs text-white/30">Kliknutím změníte</span>
      </button>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onDelete}
          className="px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold transition-all flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Smazat
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !formData.position.trim() || !formData.email.trim()}
          className="flex-1 py-3 rounded-xl bg-[#00D8C1]/20 hover:bg-[#00D8C1]/30 text-[#00D8C1] font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Uložit změny
        </button>
      </div>
    </div>
  );
}

export default function ManagementManager() {
  const [contacts, setContacts] = useState<ManagementContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPosition, setNewPosition] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch contacts from database
  useEffect(() => {
    let mounted = true;
    
    async function fetchContacts() {
      if (!isSupabaseConfigured || !supabase) {
        if (mounted) setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('management_contacts')
          .select('*')
          .order('sort_order');
        
        if (error) throw error;
        if (mounted) setContacts(data || []);
      } catch (err) {
        console.error('[ManagementManager] fetch error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    
    fetchContacts();
    return () => { mounted = false; };
  }, []);

  // Filter by search
  const filteredContacts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter(c => 
      c.position.toLowerCase().includes(q) || 
      c.email.toLowerCase().includes(q) ||
      (c.name && c.name.toLowerCase().includes(q))
    );
  }, [contacts, searchQuery]);

  // Counts
  const counts = useMemo(() => ({
    total: contacts.length,
    active: contacts.filter(c => c.is_active).length,
    emergencies: contacts.filter(c => c.notify_emergencies).length,
  }), [contacts]);

  const selectedContact = selectedContactId ? contacts.find(c => c.id === selectedContactId) : null;

  // Add new contact
  const handleAddContact = async () => {
    if (!newPosition.trim() || !newEmail.trim() || !supabase) return;
    
    setSaving(true);
    try {
      const newContact = {
        id: `mgmt-${Date.now()}`,
        position: newPosition.trim(),
        email: newEmail.trim(),
        name: '',
        notify_emergencies: true,
        notify_daily_reports: false,
        notify_statistics: false,
        is_active: true,
        sort_order: contacts.length,
      };
      
      const { error } = await supabase.from('management_contacts').insert(newContact);
      if (error) throw error;
      
      setContacts(prev => [...prev, newContact as ManagementContact]);
      setNewPosition('');
      setNewEmail('');
      setIsAddingNew(false);
    } catch (err) {
      console.error('[ManagementManager] add error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Delete contact
  const handleDeleteContact = async (id: string) => {
    if (!supabase || !confirm('Opravdu chcete smazat tento kontakt?')) return;
    
    try {
      const { error } = await supabase.from('management_contacts').delete().eq('id', id);
      if (error) throw error;
      
      setContacts(prev => prev.filter(c => c.id !== id));
      setSelectedContactId(null);
    } catch (err) {
      console.error('[ManagementManager] delete error:', err);
    }
  };

  // Save contact detail
  const handleSaveContactDetail = async (updated: ManagementContact) => {
    if (!supabase) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('management_contacts')
        .update({
          name: updated.name,
          position: updated.position,
          email: updated.email,
          phone: updated.phone,
          notes: updated.notes,
          notify_emergencies: updated.notify_emergencies,
          notify_daily_reports: updated.notify_daily_reports,
          notify_statistics: updated.notify_statistics,
          is_active: updated.is_active,
          sort_order: updated.sort_order,
        })
        .eq('id', updated.id);
      
      if (error) throw error;
      
      setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
      setSelectedContactId(null);
    } catch (err) {
      console.error('[ManagementManager] save detail error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <header className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-[#00D8C1]" />
            <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">MANAGEMENT CONTROL</p>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">
            MANAGEMENT <span className="text-white/20">KONTAKTY</span>
          </h1>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-2 p-2 bg-white/[0.04] border border-white/10 backdrop-blur-3xl rounded-[2rem] shadow-2xl overflow-x-auto">
          {[
            { label: 'CELKEM', value: counts.total, icon: Users, color: 'text-cyan-400' },
            { label: 'AKTIVNÍ', value: counts.active, icon: Check, color: 'text-emerald-400' },
            { label: 'URGENTNÍ', value: counts.emergencies, icon: Bell, color: 'text-red-400' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center justify-center px-6 md:px-10 py-4 rounded-2xl hover:bg-white/5 transition-all min-w-[100px]">
              <div className="flex items-center gap-2 mb-2 opacity-50">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <p className="text-[9px] font-black uppercase tracking-[0.15em]">{stat.label}</p>
              </div>
              <p className="text-2xl font-black text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Search + Add Button */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hledat kontakt..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#00D8C1]/50 transition-all placeholder:text-white/30"
          />
        </div>
        <motion.button
          onClick={() => setIsAddingNew(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#00D8C1]/20 hover:bg-[#00D8C1]/30 text-[#00D8C1] font-semibold transition-all border border-[#00D8C1]/30"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Přidat kontakt</span>
        </motion.button>
      </div>

      {/* Add New Form */}
      <AnimatePresence>
        {isAddingNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-white/[0.03] border border-[#00D8C1]/30 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  placeholder="Pozice (např. Vedoucí operací)"
                  className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#00D8C1]/50 transition-all placeholder:text-white/30"
                  autoFocus
                />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Email"
                  className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#00D8C1]/50 transition-all placeholder:text-white/30"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setIsAddingNew(false); setNewPosition(''); setNewEmail(''); }}
                  className="px-4 py-2 rounded-lg text-white/50 hover:text-white transition-colors"
                >
                  Zrušit
                </button>
                <button
                  onClick={handleAddContact}
                  disabled={saving || !newPosition.trim() || !newEmail.trim()}
                  className="px-6 py-2 rounded-lg bg-[#00D8C1]/20 hover:bg-[#00D8C1]/30 text-[#00D8C1] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Přidat
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contacts List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-white/20 border-t-[#00D8C1] rounded-full animate-spin" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-20">
            <Mail className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <p className="text-white/50 text-lg">{searchQuery ? 'Žádné výsledky' : 'Žádné kontakty'}</p>
            <p className="text-white/30 text-sm mt-1">
              {searchQuery ? 'Zkuste jiný vyhledávací dotaz' : 'Přidejte první management kontakt'}
            </p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <motion.div
              key={contact.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedContactId(contact.id)}
              className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border ${
                contact.is_active 
                  ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20' 
                  : 'bg-white/[0.01] border-white/5 opacity-50'
              }`}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-cyan-500/15 flex-shrink-0">
                <Briefcase className="w-5 h-5 text-cyan-400" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-white truncate">{contact.position}</h3>
                  {contact.name && (
                    <span className="text-sm text-white/50">({contact.name})</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-white/40">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    {contact.email}
                  </span>
                  {contact.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {contact.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Notification badges */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {contact.notify_emergencies && (
                  <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center" title="Urgentní notifikace">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </div>
                )}
                {contact.notify_daily_reports && (
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center" title="Denní reporty">
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                )}
                {contact.notify_statistics && (
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center" title="Statistiky">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                  </div>
                )}
              </div>

              {/* Status indicator */}
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${contact.is_active ? 'bg-emerald-400' : 'bg-white/20'}`} />
            </motion.div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setSelectedContactId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <DetailEditModal
                contact={selectedContact}
                onClose={() => setSelectedContactId(null)}
                onSave={handleSaveContactDetail}
                onDelete={() => handleDeleteContact(selectedContact.id)}
                saving={saving}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
