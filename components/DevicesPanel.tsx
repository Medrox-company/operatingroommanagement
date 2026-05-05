'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Monitor,
  Tablet,
  Loader2,
  Check,
  X,
  Trash2,
  RefreshCw,
  Power,
  PowerOff,
  Edit2,
  Save,
  AlertTriangle,
} from 'lucide-react';

interface Device {
  id: string;
  device_id: string;
  device_name: string;
  device_type: string;
  platform: string;
  browser: string;
  is_active: boolean;
  is_pwa_installed: boolean;
  last_seen_at: string;
  installed_at: string | null;
  created_at: string;
}

interface DevicesPanelProps {
  currentDeviceId?: string;
}

export const DevicesPanel: React.FC<DevicesPanelProps> = ({ currentDeviceId }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNotExists, setTableNotExists] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/devices');
      const data = await response.json();
      
      if (data.tableNotExists) {
        setTableNotExists(true);
        setDevices([]);
      } else {
        setDevices(data.devices || []);
        setTableNotExists(false);
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const toggleDevice = async (device: Device) => {
    setActionLoading(device.id);
    try {
      const response = await fetch('/api/devices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: device.id,
          is_active: !device.is_active,
        }),
      });

      if (response.ok) {
        setDevices(prev =>
          prev.map(d =>
            d.id === device.id ? { ...d, is_active: !d.is_active } : d
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle device:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteDevice = async (device: Device) => {
    if (!confirm(`Opravdu chcete odstranit zařízení "${device.device_name}"?`)) {
      return;
    }

    setActionLoading(device.id);
    try {
      const response = await fetch(`/api/devices?id=${device.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDevices(prev => prev.filter(d => d.id !== device.id));
      }
    } catch (error) {
      console.error('Failed to delete device:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const startEdit = (device: Device) => {
    setEditingId(device.id);
    setEditName(device.device_name);
  };

  const saveEdit = async (device: Device) => {
    if (!editName.trim()) return;

    setActionLoading(device.id);
    try {
      const response = await fetch('/api/devices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: device.id,
          device_name: editName.trim(),
        }),
      });

      if (response.ok) {
        setDevices(prev =>
          prev.map(d =>
            d.id === device.id ? { ...d, device_name: editName.trim() } : d
          )
        );
        setEditingId(null);
      }
    } catch (error) {
      console.error('Failed to rename device:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return Smartphone;
      case 'tablet':
        return Tablet;
      default:
        return Monitor;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('cs-CZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOnline = (lastSeen: string) => {
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 5 * 60 * 1000; // 5 minutes
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        <span className="ml-3 text-white/60">Načítám zařízení...</span>
      </div>
    );
  }

  if (tableNotExists) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-amber-300 mb-2">
              Tabulka zařízení není vytvořena
            </h3>
            <p className="text-sm text-amber-300/70 mb-4">
              Pro správu zařízení je potřeba vytvořit databázovou tabulku. Spusťte následující SQL v Supabase SQL editoru:
            </p>
            <pre className="text-xs bg-black/30 rounded-xl p-4 overflow-auto text-green-400 font-mono">
{`CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,
  device_name TEXT,
  device_type TEXT,
  platform TEXT,
  browser TEXT,
  is_active BOOLEAN DEFAULT true,
  is_pwa_installed BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  installed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY devices_read ON public.devices 
  FOR SELECT USING (true);
CREATE POLICY devices_write ON public.devices 
  FOR INSERT WITH CHECK (true);
CREATE POLICY devices_update ON public.devices 
  FOR UPDATE USING (true);
CREATE POLICY devices_delete ON public.devices 
  FOR DELETE USING (true);`}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Registrovaná zařízení</h3>
          <p className="text-xs text-white/50 mt-1">
            {devices.length} zařízení • {devices.filter(d => d.is_active).length} aktivních
          </p>
        </div>
        <button
          onClick={fetchDevices}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          title="Obnovit seznam"
        >
          <RefreshCw className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* Devices List */}
      {devices.length === 0 ? (
        <div className="text-center py-8 text-white/40">
          <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Zatím nejsou registrována žádná zařízení</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {devices.map((device) => {
              const Icon = getDeviceIcon(device.device_type);
              const online = isOnline(device.last_seen_at);
              const isCurrent = device.device_id === currentDeviceId;

              return (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`rounded-xl border p-4 transition-colors ${
                    isCurrent
                      ? 'border-blue-500/40 bg-blue-500/[0.08]'
                      : device.is_active
                      ? 'border-white/10 bg-white/[0.02]'
                      : 'border-red-500/20 bg-red-500/[0.04] opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        device.is_active
                          ? device.is_pwa_installed
                            ? 'bg-green-500/20'
                            : 'bg-blue-500/20'
                          : 'bg-red-500/20'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          device.is_active
                            ? device.is_pwa_installed
                              ? 'text-green-400'
                              : 'text-blue-400'
                            : 'text-red-400'
                        }`}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {editingId === device.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(device);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="flex-1 px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-blue-500"
                            autoFocus
                          />
                        ) : (
                          <span className="font-semibold text-white truncate">
                            {device.device_name}
                          </span>
                        )}

                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase">
                            Toto zařízení
                          </span>
                        )}

                        {device.is_pwa_installed && (
                          <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-[10px] font-bold uppercase">
                            PWA
                          </span>
                        )}

                        {/* Online indicator */}
                        <span
                          className={`w-2 h-2 rounded-full ${
                            online ? 'bg-green-500' : 'bg-white/20'
                          }`}
                          title={online ? 'Online' : 'Offline'}
                        />
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                        <span>{device.platform}</span>
                        <span>•</span>
                        <span>{device.browser}</span>
                        <span>•</span>
                        <span>Naposledy: {formatDate(device.last_seen_at)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {actionLoading === device.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                      ) : (
                        <>
                          {editingId === device.id ? (
                            <>
                              <button
                                onClick={() => saveEdit(device)}
                                className="p-2 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors"
                                title="Uložit"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-2 rounded-lg hover:bg-white/10 text-white/40 transition-colors"
                                title="Zrušit"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(device)}
                                className="p-2 rounded-lg hover:bg-white/10 text-white/40 transition-colors"
                                title="Přejmenovat"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => toggleDevice(device)}
                                className={`p-2 rounded-lg transition-colors ${
                                  device.is_active
                                    ? 'hover:bg-amber-500/20 text-amber-400'
                                    : 'hover:bg-green-500/20 text-green-400'
                                }`}
                                title={device.is_active ? 'Deaktivovat' : 'Aktivovat'}
                              >
                                {device.is_active ? (
                                  <PowerOff className="w-4 h-4" />
                                ) : (
                                  <Power className="w-4 h-4" />
                                )}
                              </button>
                              {!isCurrent && (
                                <button
                                  onClick={() => deleteDevice(device)}
                                  className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                  title="Odstranit"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-4 text-xs text-white/30">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>Online</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 text-[9px] font-bold">
            PWA
          </span>
          <span>Nainstalováno</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] font-bold">
            Toto zařízení
          </span>
          <span>Aktuální</span>
        </div>
      </div>
    </div>
  );
};

export default DevicesPanel;
