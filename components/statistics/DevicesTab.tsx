/**
 * DevicesTab — Přehled připojených zařízení
 *
 * Reálná data z tabulky `devices`:
 *   • device_type, platform, browser
 *   • is_pwa_installed
 *   • last_seen_at
 */
'use client';

import React, { useMemo, memo } from 'react';
import {
  Smartphone, Monitor, Tablet, AlertTriangle, Clock, CheckCircle2,
  Wifi, WifiOff, Download, Globe, Cpu,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie,
} from 'recharts';
import {
  C, Card, KPIBlock, MetricTile, ProgressRing, EventFeed,
  formatNumber, formatTime, type EventFeedItem,
} from './shared';
import type { DeviceRow } from '../../lib/db';

interface DevicesTabProps {
  devices: DeviceRow[] | null;
  periodLabel: string;
}

const DEVICE_COLORS: Record<string, string> = {
  mobile: '#06B6D4',
  desktop: '#F97316',
  tablet: '#A78BFA',
  unknown: '#6B7280',
};

const PLATFORM_COLORS: Record<string, string> = {
  ios: '#3B82F6',
  android: '#10B981',
  windows: '#06B6D4',
  macos: '#F97316',
  linux: '#FBBF24',
  unknown: '#6B7280',
};

const BROWSER_COLORS: Record<string, string> = {
  chrome: '#FBBF24',
  safari: '#3B82F6',
  firefox: '#F97316',
  edge: '#06B6D4',
  opera: '#EF4444',
  unknown: '#6B7280',
};

function getDeviceIcon(type: string) {
  switch (type?.toLowerCase()) {
    case 'mobile': return <Smartphone size={14} />;
    case 'tablet': return <Tablet size={14} />;
    case 'desktop': return <Monitor size={14} />;
    default: return <Cpu size={14} />;
  }
}

function getDeviceColor(type: string): string {
  return DEVICE_COLORS[type?.toLowerCase()] ?? C.muted;
}

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 5 * 60 * 1000; // 5 minutes
}

function formatLastSeen(lastSeen: string | null): string {
  if (!lastSeen) return 'Nikdy';
  const diff = Date.now() - new Date(lastSeen).getTime();
  if (diff < 60000) return 'Právě teď';
  if (diff < 3600000) return `před ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `před ${Math.floor(diff / 3600000)} hod`;
  return `před ${Math.floor(diff / 86400000)} dny`;
}

export const DevicesTab: React.FC<DevicesTabProps> = memo(({
  devices, periodLabel,
}) => {
  const stats = useMemo(() => {
    if (!devices || devices.length === 0) return null;

    const total = devices.length;
    const active = devices.filter(d => d.is_active).length;
    const pwaInstalled = devices.filter(d => d.is_pwa_installed).length;
    const online = devices.filter(d => isOnline(d.last_seen_at)).length;
    const pwaPct = total > 0 ? (pwaInstalled / total) * 100 : 0;
    const onlinePct = total > 0 ? (online / total) * 100 : 0;

    // By device type
    const typeCounts = new Map<string, number>();
    for (const d of devices) {
      const t = d.device_type?.toLowerCase() ?? 'unknown';
      typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    }
    const byType = Array.from(typeCounts.entries())
      .map(([type, count]) => ({
        type,
        label: type === 'mobile' ? 'Mobil' : type === 'desktop' ? 'Desktop' : type === 'tablet' ? 'Tablet' : 'Neznámé',
        count,
        color: getDeviceColor(type),
        pct: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // By platform
    const platformCounts = new Map<string, number>();
    for (const d of devices) {
      const p = d.platform?.toLowerCase() ?? 'unknown';
      platformCounts.set(p, (platformCounts.get(p) ?? 0) + 1);
    }
    const byPlatform = Array.from(platformCounts.entries())
      .map(([platform, count]) => ({
        platform,
        count,
        color: PLATFORM_COLORS[platform] ?? C.muted,
        pct: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // By browser
    const browserCounts = new Map<string, number>();
    for (const d of devices) {
      const b = d.browser?.toLowerCase()?.split(' ')[0] ?? 'unknown';
      browserCounts.set(b, (browserCounts.get(b) ?? 0) + 1);
    }
    const byBrowser = Array.from(browserCounts.entries())
      .map(([browser, count]) => ({
        browser,
        count,
        color: BROWSER_COLORS[browser] ?? C.muted,
        pct: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Recent devices
    const recentDevices = [...devices]
      .sort((a, b) => {
        const aTime = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
        const bTime = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 10);

    return {
      total,
      active,
      pwaInstalled,
      pwaPct,
      online,
      onlinePct,
      byType,
      byPlatform,
      byBrowser,
      recentDevices,
    };
  }, [devices]);

  if (!devices) {
    return (
      <Card>
        <div className="flex items-center gap-3 py-6 px-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `${C.muted}1a` }}>
            <Clock size={16} color={C.muted} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: C.text }}>Načítání dat…</p>
            <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>
              Načítá se z tabulky <code>devices</code>.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <Card>
        <div className="flex items-center gap-3 py-6 px-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `${C.yellow}1a` }}>
            <AlertTriangle size={16} color={C.yellow} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: C.text }}>
              Žádná registrovaná zařízení
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>
              Tabulka <code>devices</code> neobsahuje záznamy.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Hero KPIs */}
      <Card elevated icon={Cpu} accent={C.accent}
        title="Připojená zařízení"
        subtitle={`Z databáze \`devices\`. Období: ${periodLabel}`}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricTile
            label="Celkem zařízení"
            value={formatNumber(stats.total)}
            icon={Cpu}
            color={C.accent}
          />
          <MetricTile
            label="Online nyní"
            value={formatNumber(stats.online)}
            sublabel={`${stats.onlinePct.toFixed(0)}%`}
            icon={Wifi}
            color={C.green}
          />
          <MetricTile
            label="S PWA"
            value={formatNumber(stats.pwaInstalled)}
            sublabel={`${stats.pwaPct.toFixed(0)}%`}
            icon={Download}
            color={C.yellow}
          />
          <MetricTile
            label="Aktivních"
            value={formatNumber(stats.active)}
            icon={CheckCircle2}
            color={C.cyan}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* By device type pie */}
        <Card icon={Smartphone} title="Typ zařízení">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={stats.byType}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {stats.byType.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0,0,0,0.85)',
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {stats.byType.map((t, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                <span style={{ color: C.muted }}>{t.label}</span>
                <span className="font-medium" style={{ color: C.text }}>{t.count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* By platform */}
        <Card icon={Globe} title="Platforma">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={stats.byPlatform.slice(0, 5)}>
                <XAxis dataKey="platform" stroke={C.muted} fontSize={10} />
                <YAxis stroke={C.muted} fontSize={10} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0,0,0,0.85)',
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.byPlatform.slice(0, 5).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* By browser */}
        <Card icon={Globe} title="Prohlížeč">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={stats.byBrowser.slice(0, 5)}>
                <XAxis dataKey="browser" stroke={C.muted} fontSize={10} />
                <YAxis stroke={C.muted} fontSize={10} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0,0,0,0.85)',
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.byBrowser.slice(0, 5).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Device list */}
      <Card icon={Cpu} title="Poslední aktivní zařízení">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <th className="text-left py-2 px-2 font-medium" style={{ color: C.muted }}>Stav</th>
                <th className="text-left py-2 px-2 font-medium" style={{ color: C.muted }}>Název</th>
                <th className="text-left py-2 px-2 font-medium" style={{ color: C.muted }}>Typ</th>
                <th className="text-left py-2 px-2 font-medium" style={{ color: C.muted }}>Platforma</th>
                <th className="text-left py-2 px-2 font-medium" style={{ color: C.muted }}>Prohlížeč</th>
                <th className="text-center py-2 px-2 font-medium" style={{ color: C.muted }}>PWA</th>
                <th className="text-right py-2 px-2 font-medium" style={{ color: C.muted }}>Naposledy viděno</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentDevices.map((d, i) => {
                const online = isOnline(d.last_seen_at);
                return (
                  <tr key={d.id} style={{ borderBottom: `1px solid ${C.ghost}` }}>
                    <td className="py-2 px-2">
                      {online ? (
                        <span className="flex items-center gap-1" style={{ color: C.green }}>
                          <Wifi size={12} />
                          <span>Online</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1" style={{ color: C.muted }}>
                          <WifiOff size={12} />
                          <span>Offline</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2" style={{ color: C.text }}>
                      {d.device_name || d.device_id?.slice(0, 8) || '—'}
                    </td>
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center gap-1"
                        style={{ color: getDeviceColor(d.device_type ?? '') }}>
                        {getDeviceIcon(d.device_type ?? '')}
                        {d.device_type || '—'}
                      </span>
                    </td>
                    <td className="py-2 px-2" style={{ color: C.muted }}>{d.platform || '—'}</td>
                    <td className="py-2 px-2" style={{ color: C.muted }}>{d.browser || '—'}</td>
                    <td className="py-2 px-2 text-center">
                      {d.is_pwa_installed ? (
                        <CheckCircle2 size={14} color={C.green} />
                      ) : (
                        <span style={{ color: C.muted }}>—</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right" style={{ color: C.muted }}>
                      {formatLastSeen(d.last_seen_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
});

DevicesTab.displayName = 'DevicesTab';
