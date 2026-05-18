/**
 * NotificationsTab — Přehled odeslaných notifikací
 *
 * Reálná data z tabulky `notifications_log`:
 *   • notification_type (typ notifikace)
 *   • room_id, room_name (odkaz na sál)
 *   • recipient_count (počet příjemců)
 *   • custom_reason (vlastní důvod)
 *   • created_at (čas odeslání)
 */
'use client';

import React, { useMemo, memo } from 'react';
import {
  Bell, AlertTriangle, Clock, Users, Mail, TrendingUp, Calendar,
  Activity, MessageSquare, Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, AreaChart, Area, CartesianGrid,
} from 'recharts';
import {
  C, Card, KPIBlock, MetricTile, ProgressRing, CategoryBarList, EventFeed,
  formatNumber, formatTime, type EventFeedItem,
} from './shared';
import type { NotificationLogRow } from '../../lib/db';
import type { OperatingRoom } from '../../types';

interface NotificationsTabProps {
  notifications: NotificationLogRow[] | null;
  rooms: OperatingRoom[];
  periodLabel: string;
}

const NOTIFICATION_COLORS: Record<string, string> = {
  emergency: '#EF4444',
  late_surgeon: '#F97316',
  late_anesthesiologist: '#FBBF24',
  late_arrival: '#A78BFA',
  patient_not_ready: '#EC4899',
  daily_report: '#06B6D4',
  statistics: '#10B981',
  other: '#6B7280',
};

const NOTIFICATION_LABELS: Record<string, string> = {
  emergency: 'Nouzová',
  late_surgeon: 'Zpoždění chirurga',
  late_anesthesiologist: 'Zpoždění anesteziologa',
  late_arrival: 'Pozdní příjezd',
  patient_not_ready: 'Pacient nepřipraven',
  daily_report: 'Denní report',
  statistics: 'Statistiky',
  other: 'Ostatní',
};

function getNotificationColor(type: string): string {
  return NOTIFICATION_COLORS[type.toLowerCase()] ?? C.muted;
}

function getNotificationLabel(type: string): string {
  return NOTIFICATION_LABELS[type.toLowerCase()] ?? type;
}

export const NotificationsTab: React.FC<NotificationsTabProps> = memo(({
  notifications, rooms, periodLabel,
}) => {
  const stats = useMemo(() => {
    if (!notifications || notifications.length === 0) return null;

    const total = notifications.length;
    const totalRecipients = notifications.reduce((sum, n) => sum + (n.recipient_count || 0), 0);
    const avgRecipients = total > 0 ? totalRecipients / total : 0;

    // By type
    const typeCounts = new Map<string, { count: number; recipients: number }>();
    for (const n of notifications) {
      const t = n.notification_type?.toLowerCase() ?? 'other';
      const cur = typeCounts.get(t) ?? { count: 0, recipients: 0 };
      cur.count++;
      cur.recipients += n.recipient_count || 0;
      typeCounts.set(t, cur);
    }
    const byType = Array.from(typeCounts.entries())
      .map(([type, c]) => ({
        type,
        label: getNotificationLabel(type),
        count: c.count,
        recipients: c.recipients,
        color: getNotificationColor(type),
        pct: total > 0 ? (c.count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Emergency count (kritické)
    const emergencyCount = notifications.filter(
      n => n.notification_type?.toLowerCase() === 'emergency'
    ).length;
    const emergencyPct = total > 0 ? (emergencyCount / total) * 100 : 0;

    // By room
    const roomMap = new Map(rooms.map(r => [r.id, r.name]));
    const roomCounts = new Map<string, number>();
    for (const n of notifications) {
      if (n.room_id) {
        const name = roomMap.get(n.room_id) ?? n.room_name ?? n.room_id;
        roomCounts.set(name, (roomCounts.get(name) ?? 0) + 1);
      }
    }
    const byRoom = Array.from(roomCounts.entries())
      .map(([room, count]) => ({ room, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // By hour of day
    const hourCounts: number[] = new Array(24).fill(0);
    for (const n of notifications) {
      const hour = new Date(n.created_at).getHours();
      hourCounts[hour]++;
    }
    const byHour = hourCounts.map((count, hour) => ({
      hour: `${hour}:00`,
      count,
      isWorkHour: hour >= 7 && hour < 19,
    }));

    // By day of week
    const dayCounts: number[] = new Array(7).fill(0);
    const dayLabels = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
    for (const n of notifications) {
      const day = new Date(n.created_at).getDay();
      dayCounts[day]++;
    }
    const byDay = dayCounts.map((count, day) => ({
      day: dayLabels[day],
      count,
      isWeekend: day === 0 || day === 6,
    }));

    // Trend over time (last 14 days)
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const dailyCounts: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * dayMs);
      const dateStr = d.toISOString().split('T')[0];
      const count = notifications.filter(n => n.created_at.startsWith(dateStr)).length;
      dailyCounts.push({
        date: `${d.getDate()}.${d.getMonth() + 1}`,
        count,
      });
    }

    return {
      total,
      totalRecipients,
      avgRecipients,
      emergencyCount,
      emergencyPct,
      byType,
      byRoom,
      byHour,
      byDay,
      dailyCounts,
    };
  }, [notifications, rooms]);

  const recentEvents = useMemo<EventFeedItem[]>(() => {
    if (!notifications) return [];
    return notifications.slice(0, 10).map(n => ({
      id: n.id,
      timestamp: n.created_at,
      title: getNotificationLabel(n.notification_type ?? 'other'),
      description: [n.room_name, n.custom_reason].filter(Boolean).join(' • ') || undefined,
      severity: n.notification_type?.toLowerCase() === 'emergency' ? 'critical' as const :
                n.notification_type?.toLowerCase().includes('late') ? 'warning' as const : 'info' as const,
      source: `${n.recipient_count} příjemců`,
    }));
  }, [notifications]);

  if (!notifications) {
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
              Načítá se z tabulky <code>notifications_log</code>.
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
              Žádné notifikace za zvolené období
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>
              Tabulka <code>notifications_log</code> neobsahuje záznamy v rozsahu „{periodLabel}".
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Hero KPIs */}
      <Card elevated icon={Bell} accent={C.accent}
        title="Přehled notifikací"
        subtitle={`Z databáze \`notifications_log\`. Období: ${periodLabel}`}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricTile
            label="Celkem odesláno"
            value={formatNumber(stats.total)}
            icon={Mail}
            color={C.accent}
          />
          <MetricTile
            label="Příjemců celkem"
            value={formatNumber(stats.totalRecipients)}
            icon={Users}
            color={C.green}
          />
          <MetricTile
            label="Ø příjemců/notif."
            value={stats.avgRecipients.toFixed(1)}
            icon={TrendingUp}
            color={C.yellow}
          />
          <MetricTile
            label="Nouzových"
            value={formatNumber(stats.emergencyCount)}
            sublabel={`${stats.emergencyPct.toFixed(1)}%`}
            icon={AlertTriangle}
            color={C.red}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart - by type */}
        <Card icon={Activity} title="Podle typu">
          <div style={{ height: 220, width: '100%' }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.byType}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
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
                  formatter={(value: number, name: string) => [`${value}×`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {stats.byType.slice(0, 6).map((t, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                <span style={{ color: C.muted }}>{t.label}</span>
                <span className="font-medium" style={{ color: C.text }}>{t.count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Bar chart - by room */}
        <Card icon={Calendar} title="Podle operačního sálu">
          <div style={{ height: 220, width: '100%' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.byRoom} layout="vertical">
                <XAxis type="number" stroke={C.muted} fontSize={10} />
                <YAxis type="category" dataKey="room" stroke={C.muted} fontSize={10} width={80} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0,0,0,0.85)',
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="count" fill={C.accent} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Area chart - trend */}
        <Card icon={TrendingUp} title="Trend (posledních 14 dní)">
          <div style={{ height: 180, width: '100%' }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={stats.dailyCounts}>
                <defs>
                  <linearGradient id="notifGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.accent} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke={C.muted} fontSize={10} />
                <YAxis stroke={C.muted} fontSize={10} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0,0,0,0.85)',
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Area type="monotone" dataKey="count" stroke={C.accent} fill="url(#notifGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* By hour */}
        <Card icon={Clock} title="Distribuce podle hodiny">
          <div style={{ height: 180, width: '100%' }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.byHour}>
                <XAxis dataKey="hour" stroke={C.muted} fontSize={9} interval={2} />
                <YAxis stroke={C.muted} fontSize={10} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0,0,0,0.85)',
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {stats.byHour.map((entry, i) => (
                    <Cell key={i} fill={entry.isWorkHour ? C.accent : C.muted} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <Card icon={MessageSquare} title="Poslední notifikace">
        <EventFeed items={recentEvents} maxItems={10} />
      </Card>
    </div>
  );
});

NotificationsTab.displayName = 'NotificationsTab';
