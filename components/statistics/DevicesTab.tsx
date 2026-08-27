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
import { C, Card, formatNumber } from './shared';
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

const DEVICE_CARD_CLASS = '!rounded-xl [background:var(--stats-surface)!important] [box-shadow:none!important]';

const DeviceMetric: React.FC<{
  label: string;
  value: string;
  note: string;
  icon: React.ElementType;
  color: string;
}> = ({ label, value, note, icon: Icon, color }) => (
  <div className="group relative min-h-[112px] overflow-hidden rounded-xl p-4 text-left" style={{ background: 'var(--stats-surface-2)', border: `1px solid ${C.border}` }}>
    <span className="absolute inset-x-4 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
    <div className="flex min-h-[44px] items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium" style={{ color: C.textHi }}>{label}</p>
        <p className="mt-1 truncate text-[10px]" style={{ color: C.muted }}>{note}</p>
      </div>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-105" style={{ color, background: `${color}14`, border: `1px solid ${color}28` }}>
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </span>
    </div>
    <p className="mt-3 whitespace-nowrap text-[26px] font-light leading-none tabular-nums tracking-tight" style={{ color: C.textHi }}>{value}</p>
  </div>
);

const RankingList: React.FC<{
  items: Array<{ key: string; label: string; count: number; pct: number; color: string }>;
}> = ({ items }) => (
  <div className="mt-4 space-y-3">
    {items.slice(0, 6).map(item => (
      <div key={item.key}>
        <div className="mb-1.5 flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: item.color }} />
          <span className="min-w-0 flex-1 truncate text-[10px] font-medium capitalize" style={{ color: C.text }}>{item.label}</span>
          <span className="text-[10px] font-semibold tabular-nums" style={{ color: C.textHi }}>{item.count}</span>
          <span className="w-9 text-right text-[9px] tabular-nums" style={{ color: C.faint }}>{item.pct.toFixed(0)} %</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full" style={{ background: C.ghost }}>
          <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.color }} />
        </div>
      </div>
    ))}
  </div>
);

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
      <Card className={DEVICE_CARD_CLASS}>
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
      <Card className={DEVICE_CARD_CLASS}>
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
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[310px_minmax(0,1fr)]">
        <main className="flex flex-col gap-4 xl:order-2">
          <Card className={`relative overflow-hidden p-5 ${DEVICE_CARD_CLASS}`}>
            <span className="absolute inset-x-8 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)` }} />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium" style={{ color: C.muted }}>Zařízení</p>
                <h2 className="mt-1.5 text-2xl font-semibold tracking-tight" style={{ color: C.textHi }}>Přehled připojených zařízení</h2>
                <p className="mt-1 text-[11px]" style={{ color: C.muted }}>Aktuální stav registrací a přístupů · {periodLabel}</p>
              </div>
              <span className="rounded-md px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.accent, background: `${C.accent}12`, border: `1px solid ${C.accent}28` }}>Živá data</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <DeviceMetric label="Celkem zařízení" value={formatNumber(stats.total)} note="Registrovaná zařízení" icon={Cpu} color={C.accent} />
              <DeviceMetric label="Online nyní" value={formatNumber(stats.online)} note={`${stats.onlinePct.toFixed(0)} % ze všech zařízení`} icon={Wifi} color={C.green} />
              <DeviceMetric label="Instalace PWA" value={formatNumber(stats.pwaInstalled)} note={`${stats.pwaPct.toFixed(0)} % pokrytí`} icon={Download} color={C.yellow} />
              <DeviceMetric label="Aktivní účty" value={formatNumber(stats.active)} note="Povolený přístup" icon={CheckCircle2} color={C.cyan} />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className={`p-5 ${DEVICE_CARD_CLASS}`} icon={Smartphone} title="Typ zařízení" subtitle="Rozložení přístupů" accent={C.accent}>
              <RankingList items={stats.byType.map(item => ({ key: item.type, label: item.label, count: item.count, pct: item.pct, color: item.color }))} />
            </Card>
            <Card className={`p-5 ${DEVICE_CARD_CLASS}`} icon={Globe} title="Platforma" subtitle="Používané operační systémy" accent={C.purple}>
              <RankingList items={stats.byPlatform.map(item => ({ key: item.platform, label: item.platform, count: item.count, pct: item.pct, color: item.color }))} />
            </Card>
            <Card className={`p-5 ${DEVICE_CARD_CLASS}`} icon={Globe} title="Prohlížeč" subtitle="Používané webové klienty" accent={C.cyan}>
              <RankingList items={stats.byBrowser.map(item => ({ key: item.browser, label: item.browser, count: item.count, pct: item.pct, color: item.color }))} />
            </Card>
          </div>
        </main>

        <aside className="flex flex-col gap-4 xl:order-1">
          <Card className={`relative overflow-hidden p-5 ${DEVICE_CARD_CLASS}`}>
            <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full opacity-20 blur-3xl" style={{ background: C.accent }} />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ color: C.accent, background: `${C.accent}0f`, border: `1px solid ${C.accent}2f` }}><Cpu className="h-5 w-5" /></span>
                <span className="rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.13em]" style={{ color: C.accent, border: `1px solid ${C.accent}35` }}>reálná data</span>
              </div>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.muted }}>Registrovaná zařízení</p>
              <p className="mt-1 text-[52px] font-light leading-none tracking-[-0.05em] tabular-nums" style={{ color: C.textHi }}>{formatNumber(stats.total)}</p>
              <p className="mt-2 text-[11px]" style={{ color: C.muted }}>evidovaných zařízení · {periodLabel}</p>
              <div className="mt-5 flex h-2 overflow-hidden rounded-full" style={{ background: C.ghost }}>
                {stats.byType.map(item => <span key={item.type} style={{ width: `${item.pct}%`, background: item.color }} title={`${item.label}: ${item.pct.toFixed(1)} %`} />)}
              </div>
              <div className="mt-4 space-y-2.5">
                {stats.byType.slice(0, 3).map(item => (
                  <div key={item.type} className="flex items-center gap-2.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                    <span className="min-w-0 flex-1 truncate text-[10px]" style={{ color: C.muted }}>{item.label}</span>
                    <span className="text-[11px] font-semibold tabular-nums" style={{ color: C.textHi }}>{item.count}×</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative mt-5 flex flex-col gap-2.5 border-t pt-4" style={{ borderColor: C.border }}>
              {[
                ['Online nyní', String(stats.online)],
                ['Instalace PWA', `${stats.pwaInstalled}×`],
                ['Aktivní zařízení', String(stats.active)],
                ['Počet platforem', String(stats.byPlatform.length)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-[11px]" style={{ color: C.muted }}>{label}</span>
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: C.textHi }}>{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className={`p-5 ${DEVICE_CARD_CLASS}`} icon={Wifi} title="Stav připojení" subtitle="Posledních pět minut" accent={C.green}>
            <div className="mt-4 space-y-2">
              {[{ label: 'Online', value: stats.online, color: C.green }, { label: 'Offline', value: stats.total - stats.online, color: C.muted }, { label: 'Aktivní', value: stats.active, color: C.cyan }].map(row => (
                <div key={row.label} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: 'var(--stats-surface-2)', border: `1px solid ${C.border}` }}>
                  <span className="text-[10px]" style={{ color: C.muted }}>{row.label}</span>
                  <span className="text-[12px] font-semibold tabular-nums" style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>

      <Card className={`p-5 ${DEVICE_CARD_CLASS}`} icon={Cpu} title="Evidence zařízení" subtitle="Naposledy aktivní registrovaná zařízení" accent={C.accent}>
        <div className="mt-4 overflow-x-auto rounded-xl" style={{ background: 'var(--stats-surface-2)', border: `1px solid ${C.border}` }}>
          <table className="w-full min-w-[760px] text-[11px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.ghost }}>
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
              {stats.recentDevices.map(d => {
                const online = isOnline(d.last_seen_at);
                return (
                  <tr key={d.id} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${C.ghost}` }}>
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
