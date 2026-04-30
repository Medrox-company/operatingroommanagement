/**
 * ForecastTab — Plán & Predikce
 *
 * Reálná data:
 *   • `schedules` — plánované výkony (scheduled_date, scheduled_time, duration_minutes,
 *     priority, status, operating_room_id)
 *   • `room_status_history` — historie eventů pro odhad průměrné délky operace
 *
 * Bez fiktivních ML-predikcí — místo toho ukazujeme reálný plán + jednoduchý
 * statistický odhad odvozený z reálné historie.
 */
'use client';

import React, { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays, Clock, AlertTriangle, CheckCircle2, ListTodo, Timer,
  TrendingUp, Activity, MapPin, Flame,
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  CartesianGrid, BarChart, Bar, Cell,
} from 'recharts';
import {
  C, Card, KPIBlock, MetricTile, formatNumber,
} from './shared';
import type { OperatingRoom } from '../../types';
import type { ScheduleRow, StatusHistoryRow } from '../../lib/db';

interface ForecastTabProps {
  schedules: ScheduleRow[] | null;
  history: StatusHistoryRow[] | null;
  rooms: OperatingRoom[];
  periodLabel: string;
}

const HOUR = 60 * 60 * 1000;

function priorityColor(p: string | null): string {
  switch ((p || '').toLowerCase()) {
    case 'urgent': case 'high': case 'emergency': return C.red;
    case 'medium':                                 return C.yellow;
    case 'low':                                    return C.cyan;
    default:                                       return C.muted;
  }
}

function statusColor(s: string | null): string {
  switch ((s || '').toLowerCase()) {
    case 'completed': case 'done':                return C.green;
    case 'in_progress': case 'active':            return C.cyan;
    case 'scheduled': case 'planned': case 'pending': return C.accent;
    case 'cancelled': case 'canceled':            return C.red;
    case 'delayed':                               return C.orange;
    default:                                      return C.muted;
  }
}

function fmtTime(t: string | null): string {
  if (!t) return '—';
  const m = t.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : t;
}

export const ForecastTab: React.FC<ForecastTabProps> = memo(({
  schedules, history, rooms, periodLabel,
}) => {
  const stats = useMemo(() => {
    if (!schedules) return null;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * HOUR);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const next7 = new Date(now.getTime() + 7 * 24 * HOUR);
    const next7Str = next7.toISOString().split('T')[0];

    const today = schedules.filter(s => s.scheduled_date === todayStr);
    const tomorrowList = schedules.filter(s => s.scheduled_date === tomorrowStr);
    const next7Days = schedules.filter(
      s => s.scheduled_date >= todayStr && s.scheduled_date <= next7Str
    );
    const future = schedules.filter(s => s.scheduled_date >= todayStr);

    // Plánovaná délka výkonů (součet duration_minutes pro dnešek)
    const todayTotalMin = today.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);
    const tomorrowTotalMin = tomorrowList.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);

    // Per priority count v budoucnosti
    const priCounts = new Map<string, number>();
    for (const s of future) {
      const p = (s.priority || 'normal').toLowerCase();
      priCounts.set(p, (priCounts.get(p) ?? 0) + 1);
    }
    const byPriority = Array.from(priCounts.entries())
      .map(([priority, count]) => ({ priority, count, color: priorityColor(priority) }))
      .sort((a, b) => b.count - a.count);

    // Per status
    const stCounts = new Map<string, number>();
    for (const s of future) {
      const v = (s.status || 'unknown').toLowerCase();
      stCounts.set(v, (stCounts.get(v) ?? 0) + 1);
    }
    const byStatus = Array.from(stCounts.entries())
      .map(([status, count]) => ({ status, count, color: statusColor(status) }))
      .sort((a, b) => b.count - a.count);

    // Per room (next 7 days)
    const roomMap = new Map(rooms.map(r => [r.id, r.name]));
    const roomCounts = new Map<string, { count: number; minutes: number }>();
    for (const s of next7Days) {
      const rid = s.operating_room_id ?? '__unassigned__';
      const cur = roomCounts.get(rid) ?? { count: 0, minutes: 0 };
      cur.count++;
      cur.minutes += s.duration_minutes ?? 0;
      roomCounts.set(rid, cur);
    }
    const perRoom = Array.from(roomCounts.entries())
      .map(([rid, c]) => ({
        roomId: rid,
        roomName: rid === '__unassigned__' ? 'Nepřiřazeno' : (roomMap.get(rid) ?? rid),
        count: c.count,
        minutes: c.minutes,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 7-denní rozložení (počet výkonů per den)
    const dayBreakdown: { date: string; label: string; count: number; minutes: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() + i * 24 * HOUR);
      const dStr = d.toISOString().split('T')[0];
      const items = schedules.filter(s => s.scheduled_date === dStr);
      const labels = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
      const dayLabel = i === 0 ? 'Dnes' : i === 1 ? 'Zítra' : labels[d.getDay() === 0 ? 6 : d.getDay() - 1];
      dayBreakdown.push({
        date: dStr,
        label: dayLabel,
        count: items.length,
        minutes: items.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0),
      });
    }

    // Nejbližších 6 výkonů
    const upcoming = future
      .filter(s => {
        if (!s.scheduled_time) return s.scheduled_date >= todayStr;
        const dt = new Date(`${s.scheduled_date}T${s.scheduled_time}`);
        return dt.getTime() >= now.getTime();
      })
      .sort((a, b) => {
        const da = a.scheduled_date.localeCompare(b.scheduled_date);
        if (da !== 0) return da;
        return (a.scheduled_time ?? '').localeCompare(b.scheduled_time ?? '');
      })
      .slice(0, 6)
      .map(s => ({
        ...s,
        roomName: s.operating_room_id ? (roomMap.get(s.operating_room_id) ?? '—') : '—',
      }));

    return {
      todayCount: today.length,
      tomorrowCount: tomorrowList.length,
      next7Count: next7Days.length,
      futureCount: future.length,
      todayTotalMin,
      tomorrowTotalMin,
      byPriority,
      byStatus,
      perRoom,
      dayBreakdown,
      upcoming,
    };
  }, [schedules, rooms]);

  // Z historie odvodíme avg délku operace (pro kontext odhadu)
  const historyStats = useMemo(() => {
    if (!history || history.length === 0) return null;

    // Najdeme všechny operation_completed eventy a jejich duration_seconds
    const completed = history.filter(h => h.event_type === 'operation_completed' && h.duration_seconds);
    if (completed.length === 0) return null;

    const durations = completed.map(h => h.duration_seconds!);
    const avgSec = durations.reduce((a, b) => a + b, 0) / durations.length;
    const sortedDur = [...durations].sort((a, b) => a - b);
    const medianSec = sortedDur[Math.floor(sortedDur.length / 2)];

    return {
      sample: completed.length,
      avgMin: avgSec / 60,
      medianMin: medianSec / 60,
    };
  }, [history]);

  if (!schedules) {
    return (
      <Card>
        <div className="flex items-center gap-3 py-6 px-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `${C.muted}1a` }}>
            <Clock size={16} color={C.muted} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: C.text }}>Načítání plánu…</p>
            <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>
              Načítá se z tabulky <code>schedules</code>.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!stats || stats.futureCount === 0) {
    return (
      <Card>
        <div className="flex items-center gap-3 py-6 px-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `${C.yellow}1a` }}>
            <AlertTriangle size={16} color={C.yellow} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: C.text }}>
              Žádné plánované výkony do budoucnosti
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>
              Tabulka <code>schedules</code> neobsahuje záznamy s budoucím datem.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Hero: KPI ─────────────────────────────────────────── */}
      <Card elevated icon={CalendarDays} accent={C.accent}
        title="Plán výkonů"
        subtitle={`Z databáze \`schedules\`. Zobrazení: ${periodLabel}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPIBlock label="Dnes" value={stats.todayCount} icon={Activity} color={C.green}
            sublabel={`~${Math.round(stats.todayTotalMin / 60)}h celkem`} />
          <KPIBlock label="Zítra" value={stats.tomorrowCount} icon={CalendarDays} color={C.cyan}
            sublabel={`~${Math.round(stats.tomorrowTotalMin / 60)}h celkem`} />
          <KPIBlock label="Příštích 7 dní" value={stats.next7Count} icon={ListTodo} color={C.purple}
            sublabel="naplánováno" />
          <KPIBlock label="Vše do budoucna" value={stats.futureCount} icon={TrendingUp} color={C.orange}
            sublabel="future schedules" />
        </div>
      </Card>

      {/* ── 7-day breakdown chart + Per priority ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card icon={CalendarDays} accent={C.accent}
          title="Příštích 7 dní"
          subtitle="Počet plánovaných výkonů per den"
          className="md:col-span-2">
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={stats.dayBreakdown}>
                <defs>
                  <linearGradient id="day-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor={C.accent} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={C.accent} stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false} />
                <XAxis dataKey="label" stroke={C.muted} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={C.muted} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: C.surface2, border: `1px solid ${C.border}`,
                    borderRadius: 8, fontSize: 11,
                  }}
                  labelStyle={{ color: C.text }}
                  formatter={(v: number, name: string, p: any) => [
                    `${v} výkonů • ~${Math.round((p.payload.minutes ?? 0) / 60)}h`,
                    'Plán',
                  ]}
                />
                <Bar dataKey="count" fill="url(#day-gradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card icon={Flame} accent={C.red}
          title="Po prioritě"
          subtitle="Budoucí výkony">
          {stats.byPriority.length > 0 ? (
            <div className="flex flex-col gap-2.5 mt-1">
              {stats.byPriority.map((p, i) => {
                const pct = stats.futureCount > 0 ? (p.count / stats.futureCount) * 100 : 0;
                return (
                  <div key={p.priority} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between text-[11px]">
                      <span style={{ color: C.text }} className="font-medium capitalize">{p.priority}</span>
                      <span className="font-mono tabular-nums" style={{ color: C.muted }}>
                        <span className="font-bold" style={{ color: p.color }}>{p.count}</span>
                        <span className="ml-1.5 text-[10px]">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.surface }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        style={{ height: '100%', background: p.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-center py-4" style={{ color: C.muted }}>
              Žádné priority
            </div>
          )}
        </Card>
      </div>

      {/* ── Per room + Per status ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card icon={MapPin} accent={C.cyan}
          title="Po sálech (příštích 7 dní)"
          subtitle="Počet a součet plánované délky">
          {stats.perRoom.length > 0 ? (
            <div className="flex flex-col gap-1">
              {stats.perRoom.map((r, i) => (
                <motion.div key={r.roomId}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="flex items-center justify-between gap-2 py-1.5"
                  style={{ borderBottom: i < stats.perRoom.length - 1 ? `1px dashed ${C.border}` : 'none' }}>
                  <div className="min-w-0 flex-1 text-[11px] truncate" style={{ color: C.text }}>
                    {r.roomName}
                  </div>
                  <div className="text-right shrink-0 flex items-baseline gap-2">
                    <span className="text-[12px] font-mono font-bold tabular-nums" style={{ color: C.cyan }}>
                      {r.count}×
                    </span>
                    <span className="text-[10px] font-mono tabular-nums" style={{ color: C.muted }}>
                      ~{Math.round(r.minutes / 60)}h
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-center py-4" style={{ color: C.muted }}>
              Žádné výkony nepřiřazené k sálu
            </div>
          )}
        </Card>

        <Card icon={CheckCircle2} accent={C.green}
          title="Po stavu"
          subtitle="Stav plánovaných výkonů">
          {stats.byStatus.length > 0 ? (
            <div className="flex flex-col gap-2.5 mt-1">
              {stats.byStatus.map((s, i) => {
                const pct = stats.futureCount > 0 ? (s.count / stats.futureCount) * 100 : 0;
                return (
                  <div key={s.status} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between text-[11px]">
                      <span style={{ color: C.text }} className="font-medium capitalize">{s.status}</span>
                      <span className="font-mono tabular-nums" style={{ color: C.muted }}>
                        <span className="font-bold" style={{ color: s.color }}>{s.count}</span>
                        <span className="ml-1.5 text-[10px]">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.surface }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        style={{ height: '100%', background: s.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-center py-4" style={{ color: C.muted }}>
              Žádné statusy
            </div>
          )}
        </Card>
      </div>

      {/* ── Upcoming list + Historical context ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card icon={Clock} accent={C.purple}
          title="Nejbližších 6 výkonů"
          subtitle="Chronologicky seřazeno">
          {stats.upcoming.length > 0 ? (
            <div className="flex flex-col">
              {stats.upcoming.map((s, i) => (
                <motion.div key={s.id}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  className="flex items-center gap-3 py-2"
                  style={{ borderBottom: i < stats.upcoming.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div className="w-1 self-stretch rounded-full shrink-0"
                    style={{ background: priorityColor(s.priority) }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium truncate" style={{ color: C.text }}>
                      {s.roomName}
                      {s.priority && (
                        <span className="ml-2 text-[9px] uppercase tracking-wider"
                          style={{ color: priorityColor(s.priority) }}>
                          {s.priority}
                        </span>
                      )}
                    </div>
                    <div className="text-[9px]" style={{ color: C.muted }}>
                      {s.scheduled_date} • {fmtTime(s.scheduled_time)}
                      {s.duration_minutes && ` • ${s.duration_minutes} min`}
                      {s.status && ` • ${s.status}`}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-center py-4" style={{ color: C.muted }}>
              Žádné nadcházející výkony
            </div>
          )}
        </Card>

        <Card icon={Timer} accent={C.cyan}
          title="Historický kontext"
          subtitle="Z reálné `room_status_history`">
          {historyStats ? (
            <div className="flex flex-col gap-3">
              <MetricTile
                label="Průměrná délka operace"
                value={`${historyStats.avgMin.toFixed(0)} min`}
                sublabel={`Z ${historyStats.sample} dokončených operací`}
                icon={Activity}
                color={C.cyan}
              />
              <MetricTile
                label="Mediánová délka operace"
                value={`${historyStats.medianMin.toFixed(0)} min`}
                sublabel="50. percentil"
                icon={Timer}
                color={C.purple}
              />
              <div className="text-[10px] mt-1 pt-2" style={{ color: C.muted, borderTop: `1px solid ${C.border}` }}>
                Tyto hodnoty pocházejí z reálných `operation_completed` eventů a slouží jako
                statistický odhad pro plánování. Nejedná se o ML predikci.
              </div>
            </div>
          ) : (
            <div className="text-xs text-center py-4" style={{ color: C.muted }}>
              V historii zatím nejsou dokončené operace s duration_seconds.
            </div>
          )}
        </Card>
      </div>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="text-[10px] text-center" style={{ color: C.faint }}>
        Plán pochází z tabulky <code style={{ color: C.muted }}>public.schedules</code>,
        statistický kontext z <code style={{ color: C.muted }}>public.room_status_history</code>.
      </motion.div>
    </div>
  );
});
ForecastTab.displayName = 'ForecastTab';
