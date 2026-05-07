'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Smartphone, 
  Monitor, 
  Tablet,
  Shield, 
  ShieldOff, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  RotateCcw,
  Activity,
  Download,
  Info,
  AlertTriangle,
  Loader2,
  Globe,
  ChevronLeft
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface DeviceInfo {
  id: string;
  device_id: string;
  device_name: string | null;
  device_type: string;
  platform: string;
  browser: string;
  is_active: boolean;
  is_pwa_installed: boolean;
  last_seen_at: string;
  installed_at: string | null;
  created_at: string;
  ip_address: string | null;
}

interface DevicesManagerProps {
  onBack?: () => void;
}

// Helper functions
function getCurrentDeviceId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('orm_device_id') || '';
}

function isDeviceOnline(lastSeenAt: string): boolean {
  const lastSeen = new Date(lastSeenAt).getTime();
  const now = Date.now();
  return now - lastSeen < 5 * 60 * 1000;
}

function formatLastSeen(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Právě teď';
  if (diffMins < 60) return `Před ${diffMins} min`;
  if (diffHours < 24) return `Před ${diffHours} hod`;
  if (diffDays < 7) return `Před ${diffDays} dny`;
  return date.toLocaleDateString('cs-CZ');
}

function getDeviceTypeIcon(deviceType: string) {
  if (deviceType === 'mobile') return Smartphone;
  if (deviceType === 'tablet') return Tablet;
  return Monitor;
}

const DevicesManager: React.FC<DevicesManagerProps> = ({ onBack }) => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fetchDevices = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/devices');
      if (!response.ok) throw new Error('Failed to fetch devices');
      const data = await response.json();
      setDevices(data.devices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při načítání zařízení');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCurrentDeviceId(getCurrentDeviceId());
    fetchDevices();
    
    // Subscribe to Supabase Realtime for devices table changes
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const channel = supabase
        .channel('devices-manager-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setDevices((prev) => [payload.new as DeviceInfo, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setDevices((prev) => prev.map((d) => d.id === (payload.new as DeviceInfo).id ? payload.new as DeviceInfo : d));
          } else if (payload.eventType === 'DELETE') {
            setDevices((prev) => prev.filter((d) => d.id !== (payload.old as { id: string }).id));
          }
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchDevices]);

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const response = await fetch('/api/devices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: active }),
      });
      if (!response.ok) throw new Error('Failed to update device');
      setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, is_active: active } : d)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při aktualizaci');
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const response = await fetch('/api/devices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, device_name: editName.trim() }),
      });
      if (!response.ok) throw new Error('Failed to rename device');
      setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, device_name: editName.trim() } : d)));
      setEditingId(null);
      setEditName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při přejmenování');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu chcete toto zařízení smazat?')) return;
    try {
      const response = await fetch(`/api/devices?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete device');
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při mazání');
    }
  };

  // Stats
  const stats = {
    total: devices.length,
    active: devices.filter((d) => d.is_active).length,
    online: devices.filter((d) => isDeviceOnline(d.last_seen_at)).length,
    pwa: devices.filter((d) => d.is_pwa_installed).length,
  };

  return (
    <div className="w-full">
      {/* Header */}
      <motion.header 
        className="flex items-center justify-between gap-6 mb-12 flex-shrink-0"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 opacity-60">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <p className="text-[10px] font-bold text-blue-400 tracking-[0.4em] uppercase">SPRÁVA ZAŘÍZENÍ</p>
            </div>
            <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-bold tracking-tight uppercase leading-none">
              REGISTROVANÁ <span className="text-white/20">ZAŘÍZENÍ</span>
            </h1>
          </div>
        </div>
        <button
          onClick={fetchDevices}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Obnovit
        </button>
      </motion.header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-white/50 uppercase tracking-wider font-medium mt-1">Celkem</p>
            </div>
            <Smartphone className="w-6 h-6 text-white/20" />
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
              <p className="text-xs text-emerald-400/60 uppercase tracking-wider font-medium mt-1">Aktivní</p>
            </div>
            <Shield className="w-6 h-6 text-emerald-500/30" />
          </div>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-cyan-400">{stats.online}</p>
              <p className="text-xs text-cyan-400/60 uppercase tracking-wider font-medium mt-1">Online</p>
            </div>
            <Activity className="w-6 h-6 text-cyan-500/30" />
          </div>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-purple-400">{stats.pwa}</p>
              <p className="text-xs text-purple-400/60 uppercase tracking-wider font-medium mt-1">PWA</p>
            </div>
            <Download className="w-6 h-6 text-purple-500/30" />
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-4 flex gap-3 mb-6">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-white/70 leading-relaxed">
          <strong className="text-white">Jak to funguje:</strong> Každé zařízení se automaticky zaregistruje při prvním přístupu do aplikace. 
          Zařízení s <span className="text-purple-400">nainstalovanou PWA</span> jsou označena fialovou ikonou.
          <span className="text-cyan-400"> Online</span> zařízení byla aktivní v posledních 5 minutách.
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm mb-6">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      )}

      {/* Empty state */}
      {!loading && devices.length === 0 && (
        <div className="text-center py-12">
          <Smartphone className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">Zatím nebyla registrována žádná zařízení</p>
        </div>
      )}

      {/* Devices list */}
      {!loading && devices.length > 0 && (
        <div className="space-y-3">
          {devices.map((device) => {
            const isCurrentDevice = device.device_id === currentDeviceId;
            const online = isDeviceOnline(device.last_seen_at);
            const DeviceIcon = getDeviceTypeIcon(device.device_type);

            return (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative rounded-2xl border p-4 transition-all ${
                  !device.is_active
                    ? 'border-red-500/20 bg-red-500/[0.02] opacity-60'
                    : isCurrentDevice
                    ? 'border-blue-500/40 bg-blue-500/[0.06]'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                {/* Current Device Badge */}
                {isCurrentDevice && (
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-blue-500 text-[10px] font-bold uppercase tracking-wider text-white">
                    Toto zařízení
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    device.is_pwa_installed ? 'bg-purple-500/20' : device.is_active ? 'bg-blue-500/20' : 'bg-red-500/20'
                  }`}>
                    <DeviceIcon className={`w-6 h-6 ${
                      device.is_pwa_installed ? 'text-purple-400' : device.is_active ? 'text-blue-400' : 'text-red-400'
                    }`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {editingId === device.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-blue-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(device.id);
                            if (e.key === 'Escape') { setEditingId(null); setEditName(''); }
                          }}
                        />
                        <button
                          onClick={() => handleRename(device.id)}
                          className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditName(''); }}
                          className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white truncate text-lg">
                          {device.device_name || 'Neznámé zařízení'}
                        </h3>
                        {online && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" title="Online" />
                        )}
                        {device.is_pwa_installed && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300">PWA</span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-white/40">
                      <span>{device.platform}</span>
                      <span>•</span>
                      <span>{device.browser}</span>
                      <span>•</span>
                      <span>{formatLastSeen(device.last_seen_at)}</span>
                    </div>
                    
                    {/* Detailed info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 pt-2 border-t border-white/5 text-xs text-white/30">
                      {device.ip_address && (
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span>{device.ip_address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span>ID: {device.device_id.slice(0, 12)}...</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Registrace: {new Date(device.created_at).toLocaleDateString('cs-CZ')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setEditingId(device.id); setEditName(device.device_name || ''); }}
                      className="p-2 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                      title="Přejmenovat"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(device.id, !device.is_active)}
                      className={`p-2 rounded-lg transition-colors ${
                        device.is_active
                          ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                      title={device.is_active ? 'Deaktivovat' : 'Aktivovat'}
                    >
                      {device.is_active ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </button>
                    {!isCurrentDevice && (
                      <button
                        onClick={() => handleDelete(device.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Smazat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DevicesManager;
