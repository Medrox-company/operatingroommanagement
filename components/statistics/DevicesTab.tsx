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
import { C, Card, DistributionHeader, DistributionRing, formatNumber } from './shared';
import { useStatisticsReport, type StatisticsReport } from './StatisticsReportContext';
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

const DeviceMetric: React.FC<{
  label: string;
  value: string;
  note: string;
  icon: React.ElementType;
  color: string;
}> = ({ label, value, note, icon: Icon, color }) => (
  <div className="flex min-w-[156px] flex-1 items-start gap-2.5 border-r px-3 py-3 last:border-r-0" style={{ borderColor: C.border }}>
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ color, background: C.surface2, border: `1px solid ${C.border}` }}>
      <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
    </span>
    <div className="min-w-0">
      <p className="truncate text-[8px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.muted }} title={label}>{label}</p>
      <p className="mt-1 whitespace-nowrap text-[22px] font-semibold leading-none tabular-nums tracking-tight" style={{ color: C.textHi }}>{value}</p>
      <p className="mt-1.5 truncate text-[10px]" style={{ color: C.muted }} title={note}>{note}</p>
    </div>
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

  const report = useMemo<StatisticsReport | null>(() => {
    if (!devices) return null;
    const allDevices = [...devices].sort((a, b) => {
      const aTime = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
      const bTime = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
      return bTime - aTime;
    });
    return {
      context: `Aktuální evidence registrovaných zařízení bez časového omezení. Vybrané období „${periodLabel}“ tuto evidenci nefiltruje. Online znamená aktivitu v posledních pěti minutách.`,
      metrics: [
        { label: 'Registrovaná zařízení', value: formatNumber(stats?.total ?? 0) },
        { label: 'Online nyní', value: formatNumber(stats?.online ?? 0), detail: `${formatNumber(stats?.onlinePct ?? 0, 1)} % ze všech zařízení` },
        { label: 'Instalace PWA', value: formatNumber(stats?.pwaInstalled ?? 0), detail: `${formatNumber(stats?.pwaPct ?? 0, 1)} % pokrytí` },
        { label: 'Aktivní zařízení', value: formatNumber(stats?.active ?? 0), detail: 'Povolený přístup' },
      ],
      sections: [
        {
          title: 'Typy zařízení',
          columns: [{ label: 'Typ' }, { label: 'Počet', align: 'right' }, { label: 'Podíl', align: 'right' }],
          rows: (stats?.byType ?? []).map(item => [item.label, formatNumber(item.count), `${formatNumber(item.pct, 1)} %`]),
          emptyMessage: 'Žádná registrovaná zařízení.',
        },
        {
          title: 'Platformy',
          columns: [{ label: 'Platforma' }, { label: 'Počet', align: 'right' }, { label: 'Podíl', align: 'right' }],
          rows: (stats?.byPlatform ?? []).map(item => [item.platform === 'unknown' ? 'Neznámá' : item.platform, formatNumber(item.count), `${formatNumber(item.pct, 1)} %`]),
          emptyMessage: 'Žádné údaje o platformách.',
        },
        {
          title: 'Prohlížeče',
          columns: [{ label: 'Prohlížeč' }, { label: 'Počet', align: 'right' }, { label: 'Podíl', align: 'right' }],
          rows: (stats?.byBrowser ?? []).map(item => [item.browser === 'unknown' ? 'Neznámý' : item.browser, formatNumber(item.count), `${formatNumber(item.pct, 1)} %`]),
          emptyMessage: 'Žádné údaje o prohlížečích.',
        },
        {
          title: 'Evidence zařízení',
          description: 'Všechna načtená zařízení, seřazená podle poslední aktivity. PWA označuje instalaci aplikace do zařízení.',
          columns: [{ label: 'Stav' }, { label: 'Název' }, { label: 'Typ' }, { label: 'Platforma' }, { label: 'Prohlížeč' }, { label: 'PWA' }, { label: 'Poslední aktivita' }],
          rows: allDevices.map(device => [
            isOnline(device.last_seen_at) ? 'Online' : 'Offline',
            device.device_name || device.device_id?.slice(0, 8) || '—',
            stats?.byType.find(item => item.type === (device.device_type?.toLowerCase() ?? 'unknown'))?.label ?? 'Neznámé',
            device.platform || '—',
            device.browser || '—',
            device.is_pwa_installed ? 'Ano' : 'Ne',
            device.last_seen_at ? new Date(device.last_seen_at).toLocaleString('cs-CZ') : 'Nikdy',
          ]),
          emptyMessage: 'Žádná registrovaná zařízení.',
        },
      ],
    };
  }, [devices, periodLabel, stats]);
  useStatisticsReport('zarizeni', report);

  if (!devices) {
    return (
      <Card>
        <div className="flex items-center gap-3 py-6 px-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: C.surface2 }}>
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
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[310px_minmax(0,1fr)]">
        <main className="flex flex-col gap-4 xl:order-2">
          <Card>
            <DistributionHeader
              eyebrow="Zařízení"
              title="Přehled připojených zařízení"
              subtitle={`Aktuální stav registrací a přístupů · ${periodLabel}`}
              badge="Živá data"
            />
            <div className="mt-4 flex overflow-x-auto rounded-lg border" style={{ background: C.surface2, borderColor: C.border }}>
              <DeviceMetric label="Celkem zařízení" value={formatNumber(stats.total)} note="Registrovaná zařízení" icon={Cpu} color={C.accent} />
              <DeviceMetric label="Online nyní" value={formatNumber(stats.online)} note={`${stats.onlinePct.toFixed(0)} % ze všech zařízení`} icon={Wifi} color={C.green} />
              <DeviceMetric label="Instalace PWA" value={formatNumber(stats.pwaInstalled)} note={`${stats.pwaPct.toFixed(0)} % pokrytí`} icon={Download} color={C.yellow} />
              <DeviceMetric label="Aktivní účty" value={formatNumber(stats.active)} note="Povolený přístup" icon={CheckCircle2} color={C.cyan} />
            </div>
          </Card>

          <Card>
            <DistributionHeader
              eyebrow="Zařízení"
              title="Podíl podle typu zařízení"
              subtitle="Rozložení registrovaných zařízení podle používaného typu"
              badge={`${stats.byType.length} typy`}
            />
            <div className="mt-4 grid gap-x-5 gap-y-6 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
              {stats.byType.map(item => (
                <div key={item.type} className="flex min-w-0 flex-col items-center gap-2.5">
                  <DistributionRing
                    segments={[{ name: item.label, cost: item.pct, color: item.color }]}
                    totalValue={100}
                    centerValue={`${Math.round(item.pct)}%`}
                    centerUnit={`${item.count}×`}
                  />
                  <p className="max-w-full truncate text-center text-[12px] font-semibold" style={{ color: C.text }} title={item.label}>{item.label}</p>
                  <div className="w-full max-w-[170px] space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.color }} />
                      <span className="min-w-0 flex-1 truncate text-[10px]" style={{ color: C.muted }}>Registrováno</span>
                      <span className="shrink-0 text-[10px] font-semibold tabular-nums" style={{ color: C.text }}>{item.count}×</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: C.cyan }} />
                      <span className="min-w-0 flex-1 truncate text-[10px]" style={{ color: C.muted }}>Podíl zařízení</span>
                      <span className="shrink-0 text-[10px] font-semibold tabular-nums" style={{ color: C.text }}>{item.pct.toFixed(1)} %</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card icon={Globe} title="Platforma" subtitle="Používané operační systémy" accent={C.purple}>
              <RankingList items={stats.byPlatform.map(item => ({ key: item.platform, label: item.platform, count: item.count, pct: item.pct, color: item.color }))} />
            </Card>
            <Card icon={Globe} title="Prohlížeč" subtitle="Používané webové klienty" accent={C.cyan}>
              <RankingList items={stats.byBrowser.map(item => ({ key: item.browser, label: item.browser, count: item.count, pct: item.pct, color: item.color }))} />
            </Card>
          </div>
        </main>

        <aside className="flex flex-col gap-4 xl:order-1">
          <Card>
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ color: C.accent, background: C.surface2, border: `1px solid ${C.border}` }}><Cpu className="h-4 w-4" /></span>
                <span className="rounded-lg px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.muted, background: C.surface2, border: `1px solid ${C.border}` }}>reálná data</span>
              </div>
              <p className="mt-4 text-[8px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.muted }}>Registrovaná zařízení</p>
              <p className="mt-1 text-[36px] font-semibold leading-none tracking-tight tabular-nums" style={{ color: C.textHi }}>{formatNumber(stats.total)}</p>
              <p className="mt-2 text-[11px]" style={{ color: C.muted }}>evidovaných zařízení · {periodLabel}</p>
              <div className="mt-4 flex h-2 overflow-hidden rounded-full" style={{ background: C.ghost }}>
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

          <Card icon={Wifi} title="Stav připojení" subtitle="Posledních pět minut" accent={C.green}>
            <div className="mt-4 overflow-hidden rounded-lg border" style={{ background: C.surface2, borderColor: C.border }}>
              {[{ label: 'Online', value: stats.online, color: C.green }, { label: 'Offline', value: stats.total - stats.online, color: C.muted }, { label: 'Aktivní', value: stats.active, color: C.cyan }].map(row => (
                <div key={row.label} className="flex items-center justify-between border-b px-3 py-2.5 last:border-b-0" style={{ borderColor: C.border }}>
                  <span className="text-[10px]" style={{ color: C.muted }}>{row.label}</span>
                  <span className="text-[12px] font-semibold tabular-nums" style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>

      <Card icon={Cpu} title="Evidence zařízení" subtitle="Naposledy aktivní registrovaná zařízení" accent={C.accent}>
        <div className="mt-4 overflow-x-auto rounded-lg" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
          <table className="w-full min-w-[760px] text-[11px]">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.1em]" style={{ borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
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
                  <tr key={d.id} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${C.border}` }}>
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
