/**
 * ShiftsTab — Analýza směn a personálního pokrytí
 *
 * Reálná data z tabulek:
 *   • `shift_schedules` — plánované směny
 *   • `staff` — zaměstnanci
 */
'use client';

import React, { useMemo, memo } from 'react';
import {
  Calendar, Clock, Users, AlertTriangle, CheckCircle2, TrendingUp,
  Sun, Moon, Sunrise, UserCheck, UserX,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, AreaChart, Area, CartesianGrid, LineChart, Line,
} from 'recharts';
import {
  C, Card, KPIBlock, MetricTile, ProgressRing, CategoryBarList, EventFeed,
  formatNumber, type EventFeedItem,
} from './shared';
import type { ShiftScheduleRow, StaffRow } from '../../lib/db';
import type { OperatingRoom } from '../../types';

interface ShiftsTabProps {
  shifts: ShiftScheduleRow[] | null;
  staff: StaffRow[] | null;
  rooms: OperatingRoom[];
  periodLabel: string;
}

const SHIFT_COLORS: Record<string, string> = {
  morning: '#FBBF24',
  afternoon: '#F97316',
  night: '#6366F1',
  full: '#10B981',
  on_call: '#EC4899',
};

const SHIFT_LABELS: Record<string, string> = {
  morning: 'Ranní',
  afternoon: 'Odpolední',
  night: 'Noční',
  full: 'Celodenní',
  on_call: 'Pohotovost',
};

function getShiftColor(type: string): string {
  return SHIFT_COLORS[type.toLowerCase()] ?? C.muted;
}

function getShiftLabel(type: string): string {
  return SHIFT_LABELS[type.toLowerCase()] ?? type;
}

function getShiftIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'morning': return <Sunrise size={14} />;
    case 'afternoon': return <Sun size={14} />;
    case 'night': return <Moon size={14} />;
    default: return <Clock size={14} />;
  }
}

export const ShiftsTab: React.FC<ShiftsTabProps> = memo(({
  shifts, staff, rooms, periodLabel,
}) => {
  const stats = useMemo(() => {
    if (!shifts || shifts.length === 0) return null;

    const total = shifts.length;
    const available = shifts.filter(s => s.is_available).length;
    const unavailable = total - available;
    const availPct = total > 0 ? (available / total) * 100 : 0;

    // Staff map
    const staffMap = new Map(staff?.map(s => [s.id, s]) ?? []);
    const roomMap = new Map(rooms.map(r => [r.id, r.name]));

    // By shift type
    const typeCounts = new Map<string, { count: number; available: number }>();
    for (const s of shifts) {
      const t = s.shift_type?.toLowerCase() ?? 'other';
      const cur = typeCounts.get(t) ?? { count: 0, available: 0 };
      cur.count++;
      if (s.is_available) cur.available++;
      typeCounts.set(t, cur);
    }
    const byType = Array.from(typeCounts.entries())
      .map(([type, c]) => ({
        type,
        label: getShiftLabel(type),
        count: c.count,
        available: c.available,
        color: getShiftColor(type),
        pct: total > 0 ? (c.count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // By day of week
    const dayCounts: { count: number; available: number }[] = new Array(7).fill(null).map(() => ({ count: 0, available: 0 }));
    const dayLabels = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
    for (const s of shifts) {
      const day = new Date(s.shift_date).getDay();
      dayCounts[day].count++;
      if (s.is_available) dayCounts[day].available++;
    }
    const byDay = dayCounts.map((c, day) => ({
      day: dayLabels[day],
      count: c.count,
      available: c.available,
      isWeekend: day === 0 || day === 6,
    }));

    // By staff role
    const roleCounts = new Map<string, { count: number; available: number }>();
    for (const s of shifts) {
      const staffMember = staffMap.get(s.staff_id);
      const role = staffMember?.role ?? 'Neznámá';
      const cur = roleCounts.get(role) ?? { count: 0, available: 0 };
      cur.count++;
      if (s.is_available) cur.available++;
      roleCounts.set(role, cur);
    }
    const byRole = Array.from(roleCounts.entries())
      .map(([role, c]) => ({
        role,
        count: c.count,
        available: c.available,
        availPct: c.count > 0 ? (c.available / c.count) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // By room
    const roomCounts = new Map<string, number>();
    for (const s of shifts) {
      if (s.operating_room_id) {
        const name = roomMap.get(s.operating_room_id) ?? s.operating_room_id;
        roomCounts.set(name, (roomCounts.get(name) ?? 0) + 1);
      }
    }
    const byRoom = Array.from(roomCounts.entries())
      .map(([room, count]) => ({ room, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Staff with most shifts
    const staffShiftCounts = new Map<string, number>();
    for (const s of shifts) {
      const staffMember = staffMap.get(s.staff_id);
      const name = staffMember?.name ?? s.staff_id;
      staffShiftCounts.set(name, (staffShiftCounts.get(name) ?? 0) + 1);
    }
    const topStaff = Array.from(staffShiftCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Trend over time (next 14 days or past 14 days)
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const dailyCounts: { date: string; count: number; available: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(now + i * dayMs);
      const dateStr = d.toISOString().split('T')[0];
      const dayShifts = shifts.filter(s => s.shift_date === dateStr);
      dailyCounts.push({
        date: `${d.getDate()}.${d.getMonth() + 1}`,
        count: dayShifts.length,
        available: dayShifts.filter(s => s.is_available).length,
      });
    }

    // Upcoming shifts
    const todayStr = new Date().toISOString().split('T')[0];
    const upcoming = shifts
      .filter(s => s.shift_date >= todayStr)
      .sort((a, b) => a.shift_date.localeCompare(b.shift_date) || (a.start_time ?? '').localeCompare(b.start_time ?? ''))
      .slice(0, 8)
      .map(s => {
        const staffMember = staffMap.get(s.staff_id);
        return {
          ...s,
          staffName: staffMember?.name ?? '—',
          staffRole: staffMember?.role ?? '—',
          roomName: s.operating_room_id ? (roomMap.get(s.operating_room_id) ?? '—') : '—',
        };
      });

    return {
      total,
      available,
      unavailable,
      availPct,
      byType,
      byDay,
      byRole,
      byRoom,
      topStaff,
      dailyCounts,
      upcoming,
    };
  }, [shifts, staff, rooms]);

  if (!shifts) {
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
              Načítá se z tabulky <code>shift_schedules</code>.
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
              Žádné směny za zvolené období
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>
              Tabulka <code>shift_schedules</code> neobsahuje záznamy.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Hero KPIs */}
      <Card elevated icon={Calendar} accent={C.accent}
        title="Přehled směn"
        subtitle={`Z databáze \`shift_schedules\`. Období: ${periodLabel}`}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricTile
            label="Celkem směn"
            value={formatNumber(stats.total)}
            icon={Calendar}
            color={C.accent}
          />
          <MetricTile
            label="Dostupných"
            value={formatNumber(stats.available)}
            sublabel={`${stats.availPct.toFixed(0)}%`}
            icon={UserCheck}
            color={C.green}
          />
          <MetricTile
            label="Nedostupných"
            value={formatNumber(stats.unavailable)}
            icon={UserX}
            color={C.red}
          />
          <MetricTile
            label="Typů směn"
            value={formatNumber(stats.byType.length)}
            icon={Clock}
            color={C.yellow}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart - by type */}
        <Card icon={Clock} title="Podle typu směny">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.byType}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
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
            {stats.byType.map((t, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                <span style={{ color: C.muted }}>{t.label}</span>
                <span className="font-medium" style={{ color: C.text }}>{t.count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* By day */}
        <Card icon={Calendar} title="Podle dne v týdnu">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byDay}>
                <XAxis dataKey="day" stroke={C.muted} fontSize={10} />
                <YAxis stroke={C.muted} fontSize={10} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0,0,0,0.85)',
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="count" name="Celkem" fill={C.accent} radius={[4, 4, 0, 0]} />
                <Bar dataKey="available" name="Dostupné" fill={C.green} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* By role */}
        <Card icon={Users} title="Podle role">
          <div className="space-y-2">
            {stats.byRole.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-20 text-[11px] truncate" style={{ color: C.text }}>{r.role}</div>
                <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: C.ghost }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${r.availPct}%`,
                      background: r.availPct >= 80 ? C.green : r.availPct >= 50 ? C.yellow : C.red,
                    }}
                  />
                </div>
                <div className="w-16 text-right">
                  <span className="text-[11px] font-medium" style={{ color: C.text }}>
                    {r.available}/{r.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top staff */}
        <Card icon={Users} title="Nejvíce směn (zaměstnanci)">
          <div className="space-y-1.5">
            {stats.topStaff.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1 px-2 rounded-lg"
                style={{ background: i % 2 === 0 ? 'transparent' : C.ghost }}>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: `${C.accent}20`, color: C.accent }}>
                    {i + 1}
                  </span>
                  <span className="text-[11px]" style={{ color: C.text }}>{s.name}</span>
                </div>
                <span className="text-[11px] font-medium tabular-nums" style={{ color: C.accent }}>
                  {s.count} směn
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Trend */}
        <Card icon={TrendingUp} title="Plán na příštích 14 dní" className="lg:col-span-2">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailyCounts}>
                <defs>
                  <linearGradient id="shiftGrad" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="count" name="Celkem" stroke={C.accent} fill="url(#shiftGrad)" />
                <Line type="monotone" dataKey="available" name="Dostupné" stroke={C.green} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Upcoming shifts table */}
      <Card icon={Calendar} title="Nadcházející směny">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <th className="text-left py-2 px-2 font-medium" style={{ color: C.muted }}>Datum</th>
                <th className="text-left py-2 px-2 font-medium" style={{ color: C.muted }}>Čas</th>
                <th className="text-left py-2 px-2 font-medium" style={{ color: C.muted }}>Typ</th>
                <th className="text-left py-2 px-2 font-medium" style={{ color: C.muted }}>Zaměstnanec</th>
                <th className="text-left py-2 px-2 font-medium" style={{ color: C.muted }}>Role</th>
                <th className="text-left py-2 px-2 font-medium" style={{ color: C.muted }}>Sál</th>
                <th className="text-center py-2 px-2 font-medium" style={{ color: C.muted }}>Stav</th>
              </tr>
            </thead>
            <tbody>
              {stats.upcoming.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${C.ghost}` }}>
                  <td className="py-2 px-2" style={{ color: C.text }}>{s.shift_date}</td>
                  <td className="py-2 px-2" style={{ color: C.muted }}>
                    {s.start_time?.slice(0, 5) ?? '—'} - {s.end_time?.slice(0, 5) ?? '—'}
                  </td>
                  <td className="py-2 px-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
                      style={{ background: `${getShiftColor(s.shift_type)}20`, color: getShiftColor(s.shift_type) }}>
                      {getShiftIcon(s.shift_type)}
                      {getShiftLabel(s.shift_type)}
                    </span>
                  </td>
                  <td className="py-2 px-2" style={{ color: C.text }}>{s.staffName}</td>
                  <td className="py-2 px-2" style={{ color: C.muted }}>{s.staffRole}</td>
                  <td className="py-2 px-2" style={{ color: C.muted }}>{s.roomName}</td>
                  <td className="py-2 px-2 text-center">
                    {s.is_available ? (
                      <CheckCircle2 size={14} color={C.green} />
                    ) : (
                      <AlertTriangle size={14} color={C.red} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
});

ShiftsTab.displayName = 'ShiftsTab';
