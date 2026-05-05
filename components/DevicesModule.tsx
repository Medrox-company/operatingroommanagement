'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Monitor,
  Tablet,
  Laptop,
  Check,
  X,
  Loader2,
  Trash2,
  Edit3,
  Power,
  PowerOff,
  RefreshCw,
  Shield,
  ShieldOff,
  Clock,
  Calendar,
  Globe,
  Download,
  AlertTriangle,
  Info,
  Search,
  Filter,
  MoreVertical,
  ChevronDown,
  Activity,
} from 'lucide-react';

// Types
interface Device {
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
  updated_at: string;
}

// Get current device ID from localStorage
function getCurrentDeviceId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('orm_device_id') || '';
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
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

// Format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Get device icon
function getDeviceIcon(deviceType: string, platform: string) {
  if (deviceType === 'mobile' || platform === 'Android' || platform === 'iOS') {
    return Smartphone;
  }
  if (deviceType === 'tablet' || platform === 'iPad') {
    return Tablet;
  }
  if (platform === 'macOS' || platform === 'Windows' || platform === 'Linux') {
    return platform === 'macOS' ? Laptop : Monitor;
  }
  return Monitor;
}

// Check if device is online (seen in last 5 minutes)
function isOnline(lastSeenAt: string): boolean {
  const lastSeen = new Date(lastSeenAt).getTime();
  const now = Date.now();
  return now - lastSeen < 5 * 60 * 1000;
}

// Device Card Component
interface DeviceCardProps {
  device: Device;
  isCurrentDevice: boolean;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  isCurrentDevice,
  onToggleActive,
  onRename,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(device.device_name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const DeviceIcon = getDeviceIcon(device.device_type, device.platform);
  const online = isOnline(device.last_seen_at);

  const handleSaveRename = async () => {
    if (!editName.trim()) return;
    setIsLoading(true);
    await onRename(device.id, editName.trim());
    setIsLoading(false);
    setIsEditing(false);
  };

  const handleToggle = async () => {
    setIsLoading(true);
    await onToggleActive(device.id, !device.is_active);
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Opravdu chcete toto zařízení smazat?')) return;
    setIsLoading(true);
    await onDelete(device.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative rounded-2xl border p-5 transition-all ${
        !device.is_active
          ? 'border-red-500/20 bg-red-500/[0.02] opacity-60'
          : isCurrentDevice
          ? 'border-blue-500/40 bg-blue-500/[0.06]'
          : 'border-white/10 bg-white/[0.02] hover:border-white/20'
      }`}
    >
      {/* Current Device Badge */}
      {isCurrentDevice && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-blue-500 text-[10px] font-bold uppercase tracking-wider text-white">
          Toto zařízení
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          device.is_active ? 'bg-blue-500/20' : 'bg-red-500/20'
        }`}>
          <DeviceIcon className={`w-6 h-6 ${device.is_active ? 'text-blue-400' : 'text-red-400'}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/20 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="Název zařízení"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
              />
              <button
                onClick={handleSaveRename}
                disabled={isLoading}
                className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <h3 className="text-base font-bold text-white truncate">
              {device.device_name || `${device.platform} ${device.browser}`}
            </h3>
          )}

          <div className="flex items-center gap-3 mt-1">
            {/* Online Status */}
            <div className={`flex items-center gap-1.5 text-xs ${online ? 'text-green-400' : 'text-white/40'}`}>
              <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400 animate-pulse' : 'bg-white/30'}`} />
              {online ? 'Online' : 'Offline'}
            </div>

            {/* PWA Badge */}
            {device.is_pwa_installed && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase">
                <Download className="w-3 h-3" />
                PWA
              </div>
            )}

            {/* Active Status */}
            {!device.is_active && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold uppercase">
                <ShieldOff className="w-3 h-3" />
                Deaktivováno
              </div>
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/60"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border border-white/10 bg-[#0a0f1e] shadow-xl overflow-hidden"
                >
                  <button
                    onClick={() => { setIsEditing(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5"
                  >
                    <Edit3 className="w-4 h-4" />
                    Přejmenovat
                  </button>
                  <button
                    onClick={() => { handleToggle(); setShowMenu(false); }}
                    disabled={isLoading || isCurrentDevice}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 disabled:opacity-50 ${
                      device.is_active ? 'text-amber-400' : 'text-green-400'
                    }`}
                  >
                    {device.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    {device.is_active ? 'Deaktivovat' : 'Aktivovat'}
                  </button>
                  <div className="h-px bg-white/10" />
                  <button
                    onClick={() => { handleDelete(); setShowMenu(false); }}
                    disabled={isLoading || isCurrentDevice}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Smazat
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Details */}
      <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 text-white/40">
          <Globe className="w-3.5 h-3.5" />
          <span>{device.platform} / {device.browser}</span>
        </div>
        <div className="flex items-center gap-2 text-white/40">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatRelativeTime(device.last_seen_at)}</span>
        </div>
        <div className="flex items-center gap-2 text-white/40">
          <Calendar className="w-3.5 h-3.5" />
          <span>Registrace: {formatDate(device.created_at)}</span>
        </div>
        {device.installed_at && (
          <div className="flex items-center gap-2 text-purple-300/60">
            <Download className="w-3.5 h-3.5" />
            <span>PWA: {formatDate(device.installed_at)}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Stats Card Component
interface StatsCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon: Icon, color }) => (
  <div className={`rounded-xl border p-4 ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-white/60 uppercase tracking-wider font-medium mt-1">{label}</p>
      </div>
      <Icon className="w-8 h-8 text-white/20" />
    </div>
  </div>
);

// Main Module Component
const DevicesModule: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'pwa'>('all');
  const [currentDeviceId, setCurrentDeviceId] = useState('');

  // Fetch devices
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
  }, [fetchDevices]);

  // Toggle device active status
  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const response = await fetch('/api/devices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: active }),
      });
      if (!response.ok) throw new Error('Failed to update device');
      setDevices((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_active: active } : d))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při aktualizaci');
    }
  };

  // Rename device
  const handleRename = async (id: string, name: string) => {
    try {
      const response = await fetch('/api/devices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, device_name: name }),
      });
      if (!response.ok) throw new Error('Failed to rename device');
      setDevices((prev) =>
        prev.map((d) => (d.id === id ? { ...d, device_name: name } : d))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při přejmenování');
    }
  };

  // Delete device
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/devices?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete device');
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při mazání');
    }
  };

  // Filter devices
  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      !searchQuery ||
      device.device_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.browser.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'active' && device.is_active) ||
      (filterStatus === 'inactive' && !device.is_active) ||
      (filterStatus === 'pwa' && device.is_pwa_installed);

    return matchesSearch && matchesFilter;
  });

  // Stats
  const stats = {
    total: devices.length,
    active: devices.filter((d) => d.is_active).length,
    online: devices.filter((d) => isOnline(d.last_seen_at)).length,
    pwa: devices.filter((d) => d.is_pwa_installed).length,
  };

  return (
    <div className="min-h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Správa zařízení</h1>
          <p className="text-sm text-white/50 mt-1">
            Přehled a správa všech registrovaných zařízení s přístupem do aplikace
          </p>
        </div>
        <button
          onClick={fetchDevices}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Obnovit
        </button>
      </div>

      {/* Info Banner */}
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white mb-1">Jak to funguje</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Každé zařízení, které přistoupí do aplikace, se automaticky zaregistruje. Pokud uživatel 
              nainstaluje aplikaci jako PWA (Progressive Web App) na domovskou obrazovku, zařízení získá 
              označení PWA. Deaktivovaná zařízení mohou aplikaci stále prohlížet, ale nemohou provádět změny.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          label="Celkem zařízení"
          value={stats.total}
          icon={Smartphone}
          color="border-white/10 bg-white/[0.02]"
        />
        <StatsCard
          label="Aktivní"
          value={stats.active}
          icon={Shield}
          color="border-green-500/20 bg-green-500/[0.04]"
        />
        <StatsCard
          label="Online"
          value={stats.online}
          icon={Activity}
          color="border-blue-500/20 bg-blue-500/[0.04]"
        />
        <StatsCard
          label="PWA nainstalováno"
          value={stats.pwa}
          icon={Download}
          color="border-purple-500/20 bg-purple-500/[0.04]"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hledat zařízení..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white appearance-none focus:outline-none focus:border-blue-500/50 cursor-pointer"
          >
            <option value="all">Všechna zařízení</option>
            <option value="active">Pouze aktivní</option>
            <option value="inactive">Pouze deaktivovaná</option>
            <option value="pwa">S PWA instalací</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Devices Grid */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredDevices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                isCurrentDevice={device.device_id === currentDeviceId}
                onToggleActive={handleToggleActive}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredDevices.length === 0 && (
        <div className="text-center py-12">
          <Smartphone className="w-12 h-12 mx-auto text-white/20 mb-4" />
          <h3 className="text-lg font-bold text-white/60">Žádná zařízení</h3>
          <p className="text-sm text-white/40 mt-1">
            {searchQuery || filterStatus !== 'all'
              ? 'Žádná zařízení neodpovídají vašemu filtru'
              : 'Zatím nebyla zaregistrována žádná zařízení'}
          </p>
        </div>
      )}
    </div>
  );
};

export default DevicesModule;
