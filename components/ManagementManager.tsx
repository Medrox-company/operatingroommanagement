'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Mail, AlertCircle } from 'lucide-react';
import useSWR from 'swr';

interface ManagementContact {
  id: string;
  position: string;
  email: string;
  name?: string;
  notify_status_changes: boolean;
  notify_errors: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  id?: string;
  position: string;
  email: string;
  name: string;
  notify_status_changes: boolean;
  notify_errors: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ManagementManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    position: '',
    email: '',
    name: '',
    notify_status_changes: true,
    notify_errors: true,
  });

  const { data: contacts, mutate } = useSWR<ManagementContact[]>(
    '/api/management-contacts',
    fetcher,
    { revalidateOnFocus: false }
  );

  const resetForm = () => {
    setFormData({
      position: '',
      email: '',
      name: '',
      notify_status_changes: true,
      notify_errors: true,
    });
    setEditingId(null);
  };

  const handleEdit = (contact: ManagementContact) => {
    setFormData({
      id: contact.id,
      position: contact.position,
      email: contact.email,
      name: contact.name || '',
      notify_status_changes: contact.notify_status_changes,
      notify_errors: contact.notify_errors,
    });
    setEditingId(contact.id);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { ...formData, id: editingId } : formData;

      const response = await fetch('/api/management-contacts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save contact');
      }

      await mutate();
      resetForm();
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu chcete smazat tento kontakt?')) return;

    try {
      const response = await fetch(`/api/management-contacts?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete contact');
      }

      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contact');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Správa managementu
          </h3>
          <p className="text-sm text-white/50 mt-1">
            Spravujte kontakty na management pro notifikace
          </p>
        </div>
        <motion.button
          onClick={() => {
            resetForm();
            setIsOpen(true);
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 hover:border-emerald-500/50 transition-all text-emerald-400 hover:text-emerald-300 font-medium"
        >
          <Plus className="w-4 h-4" />
          Přidat kontakt
        </motion.button>
      </div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </motion.div>
      )}

      {/* Contacts List */}
      <div className="space-y-3">
        {!contacts ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-white/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/50">Žádné kontakty. Přidejte první kontakt.</p>
          </div>
        ) : (
          <AnimatePresence>
            {contacts.map((contact) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                        <p className="text-xs sm:text-sm font-semibold text-emerald-400">
                          {contact.position}
                        </p>
                      </div>
                      {contact.name && (
                        <p className="text-sm text-white/70 font-medium">{contact.name}</p>
                      )}
                    </div>
                    <p className="text-sm text-white/60 truncate">{contact.email}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {contact.notify_status_changes && (
                        <span className="inline-flex items-center gap-1 text-xs text-white/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Změny statusu
                        </span>
                      )}
                      {contact.notify_errors && (
                        <span className="inline-flex items-center gap-1 text-xs text-white/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Chyby
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.button
                      onClick={() => handleEdit(contact)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                      title="Upravit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      onClick={() => handleDelete(contact.id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-white/50 hover:text-red-400"
                      title="Smazat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gradient-to-br from-slate-900/95 to-slate-950 border border-white/10 rounded-2xl p-6 shadow-2xl"
            >
              <h2 className="text-xl font-bold text-white mb-6">
                {editingId ? 'Upravit kontakt' : 'Přidat nový kontakt'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Position */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Pozice *
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="např. Vedoucí operací"
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 focus:border-emerald-500/50 outline-none text-white placeholder:text-white/30 transition-colors"
                    required
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Jméno
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="např. Jan Novák"
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 focus:border-emerald-500/50 outline-none text-white placeholder:text-white/30 transition-colors"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="example@company.com"
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 focus:border-emerald-500/50 outline-none text-white placeholder:text-white/30 transition-colors"
                    required
                  />
                </div>

                {/* Notifications */}
                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.notify_status_changes}
                      onChange={(e) =>
                        setFormData({ ...formData, notify_status_changes: e.target.checked })
                      }
                      className="w-4 h-4 rounded bg-white/10 border border-white/20 checked:bg-emerald-500 checked:border-emerald-500 cursor-pointer"
                    />
                    <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                      Notifikovat o změnách statusu
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.notify_errors}
                      onChange={(e) =>
                        setFormData({ ...formData, notify_errors: e.target.checked })
                      }
                      className="w-4 h-4 rounded bg-white/10 border border-white/20 checked:bg-red-500 checked:border-red-500 cursor-pointer"
                    />
                    <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                      Notifikovat o chybách
                    </span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <motion.button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-colors"
                  >
                    Zrušit
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-br from-emerald-500/80 to-emerald-600/80 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-500/30 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Ukládání...' : editingId ? 'Upravit' : 'Přidat'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
