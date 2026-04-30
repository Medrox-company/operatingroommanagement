/**
 * EquipmentTab — Vybavení a údržba
 *
 * Reálná data z tabulky `equipment`:
 *   • is_available
 *   • last_maintenance / next_maintenance
 *   • type (kategorizace)
 *   • operating_room_id (přiřazení k sálu)
 *
 * Žádné fiktivní spotřební normy / cykly sterilizace — schéma to neobsahuje.
 */
'use client';

import React, { useMemo, memo } from 'react';
import {
  Wrench, AlertTriangle, CheckCircle2, Calendar, Package, MapPin, XCircle, Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  C, Card, KPIBlock, MetricTile, ProgressRing, CategoryBarList, EventFeed,
  ComplianceMeter, formatNumber, type EventFeedItem,
} from './shared';
import type { EquipmentRow } from '../../lib/db';
import type { OperatingRoom } from '../../types';

interface EquipmentTabProps {
  equipment: EquipmentRow[] | null;
  rooms: OperatingRoom[];
  periodLabel: string;
}

const DAY = 24 * 60 * 60 * 1000;

export const EquipmentTab: React.FC<EquipmentTabProps> = memo(({ equipment, rooms, periodLabel }) => {
  const stats = useMemo(() => {
    if (!equipment || equipment.length === 0) return null;

    const total = equipment.length;
    const available = equipment.filter(e => e.is_available).length;
    const unavailable = total - available;
    const availPct = total > 0 ? (available / total) * 100 : 0;

    const now = Date.now();
    let overdue = 0;
    let dueSoon = 0;
    let scheduled = 0;
    let neverServiced = 0;
    let recentlyServiced = 0;

    for (const e of equipment) {
      if (!e.last_maintenance) neverServiced++;
      else {
        const last = new Date(e.last_maintenance).getTime();
        if (now - last < 30 * DAY) recentlyServiced++;
      }
      if (e.next_maintenance) {
        const next = new Date(e.next_maintenance).getTime();
        if (next < now) overdue++;
        else {
          scheduled++;
          if (next - now < 14 * DAY) dueSoon++;
        }
      }
    }

    // Type breakdown
    const typeCounts = new Map<string, { total: number; available: number }>();
    for (const e of equipment) {
      const t = e.type?.trim() || 'Neuvedeno';
      const cur = typeCounts.get(t) ?? { total: 0, available: 0 };
      cur.total++;
      if (e.is_available) cur.available++;
      typeCounts.set(t, cur);
    }
    const byType = Array.from(typeCounts.entries())
      .map(([type, c]) => ({
        type,
        total: c.total,
        available: c.available,
        availPct: c.total > 0 ? (c.available / c.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Per-room equipment count
    const roomMap = new Map(rooms.map(r => [r.id, r.name]));
    const perRoom = new Map<string, { total: number; unavail: number }>();
    for (const e of equipment) {
      const rid = e.operating_room_id ?? '__unassigned__';
      const cur = perRoom.get(rid) ?? { total: 0, unavail: 0 };
      cur.total++;
      if (!e.is_available) cur.unavail++;
      perRoom.set(rid, cur);
    }
    const perRoomList = Array.from(perRoom.entries())
      .map(([rid, c]) => ({
        roomId: rid,
        roomName: rid === '__unassigned__' ? 'Nepřiřazeno' : (roomMap.get(rid) ?? rid),
        total: c.total,
        unavail: c.unavail,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    // Overdue list
    const overdueList = equipment
      .filter(e => e.next_maintenance && new Date(e.next_maintenance).getTime() < now)
      .map(e => ({
        ...e,
        daysOverdue: Math.floor((now - new Date(e.next_maintenance!).getTime()) / DAY),
        roomName: e.operating_room_id ? (roomMap.get(e.operating_room_id) ?? '—') : '—',
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 8);

    // Due soon list
    const dueSoonList = equipment
      .filter(e => {
        if (!e.next_maintenance) return false;
        const next = new Date(e.next_maintenance).getTime();
        return next >= now && next - now < 14 * DAY;
      })
      .map(e => ({
        ...e,
        daysUntil: Math.ceil((new Date(e.next_maintenance!).getTime() - now) / DAY),
        roomName: e.operating_room_id ? (roomMap.get(e.operating_room_id) ?? '—') : '—',
      }))
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 6);

    return {
      total, available, unavailable, availPct,
      overdue, dueSoon, scheduled, neverServiced, recentlyServiced,
      byType, perRoomList, overdueList, dueSoonList,
    };
  }, [equipment, rooms]);

  const maintenanceEvents = useMemo<EventFeedItem[]>(() => {
    if (!equipment) return [];
    return equipment
      .filter(e => e.last_maintenance)
      .sort((a, b) => new Date(b.last_maintenance!).getTime() - new Date(a.last_maintenance!).getTime())
      .slice(0, 8)
      .map(e => ({
        id: e.id,
        timestamp: e.last_maintenance!,
        title: e.name,
        description: [e.type, e.is_available ? 'Dostupné' : 'Mimo provoz'].filter(Boolean).join(' • '),
        severity: e.is_available ? 'success' : 'warning',
        source: e.type ?? undefined,
      }));
  }, [equipment]);

  if (!equipment) {
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
              Načítá se z tabulky <code>equipment</code>.
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
              Žádné záznamy o vybavení
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>
              Tabulka <code>equipment</code> neobsahuje žádné položky.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <Card elevated icon={Wrench} accent={C.accent}
        title="Vybavení & údržba"
        subtitle={`Z databáze \`equipment\`. Období: ${periodLabel}`}
      >
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-center">
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <ProgressRing
              value={stats.availPct}
              size={120}
              strokeWidth={10}
              gradient
              centerLabel={
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold tabular-nums leading-none"
                    style={{ color: stats.availPct >= 90 ? C.green : stats.availPct >= 70 ? C.yellow : C.red }}>
                    {stats.availPct.toFixed(0)}%
                  </span>
                  <span className="text-[8px] uppercase tracking-wider mt-1" style={{ color: C.muted }}>
                    Dostupnost
                  </span>
                </div>
              }
            />
            <div className="flex flex-col gap-0.5">
              <div className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>
                Celkem položek
              </div>
              <div className="text-3xl font-bold leading-none" style={{ color: C.textHi }}>
                {formatNumber(stats.total)}
              </div>
              <div className="text-[10px] mt-1" style={{ color: C.muted }}>
                <span style={{ color: C.green }} className="font-bold">{stats.available}</span> dostupných
                {' / '}
                <span style={{ color: C.red }} className="font-bold">{stats.unavailable}</span> mimo provoz
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <ComplianceMeter
              label="Servisováno za posledních 30 dní"
              value={stats.total > 0 ? (stats.recentlyServiced / stats.total) * 100 : 0}
              target={70}
            />
            <ComplianceMeter
              label="Plán údržby do 14 dnů"
              value={stats.total > 0 ? (stats.dueSoon / stats.total) * 100 : 0}
              target={20}
              inverted
            />
            <ComplianceMeter
              label="Po termínu (overdue)"
              value={stats.total > 0 ? (stats.overdue / stats.total) * 100 : 0}
              target={5}
              inverted
            />
          </div>
        </div>
      </Card>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPIBlock label="Dostupné" value={stats.available} icon={CheckCircle2} color={C.green}
          sublabel={`${stats.availPct.toFixed(0)}% z celku`} />
        <KPIBlock label="Mimo provoz" value={stats.unavailable} icon={XCircle} color={C.red}
          sublabel="is_available = false" />
        <KPIBlock label="Po termínu" value={stats.overdue} icon={AlertTriangle} color={C.orange}
          sublabel="next_maintenance < dnes" />
        <KPIBlock label="Údržba do 14 dnů" value={stats.dueSoon} icon={Calendar} color={C.yellow}
          sublabel="plánováno blízce" />
      </div>

      {/* ── Type & Per-room breakdown ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card icon={Package} accent={C.purple}
          title="Po typu vybavení"
          subtitle="Dostupnost podle kategorie">
          {stats.byType.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {stats.byType.map((t, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between text-[11px]">
                    <span style={{ color: C.text }} className="font-medium truncate flex-1 mr-2">
                      {t.type}
                    </span>
                    <span className="font-mono tabular-nums" style={{ color: C.muted }}>
                      {t.available}/{t.total}
                    </span>
                    <span className="font-mono tabular-nums font-bold ml-2 w-12 text-right"
                      style={{ color: t.availPct >= 90 ? C.green : t.availPct >= 70 ? C.yellow : C.red }}>
                      {t.availPct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.surface }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${t.availPct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.04 }}
                      style={{
                        height: '100%',
                        background: t.availPct >= 90 ? C.green : t.availPct >= 70 ? C.yellow : C.red,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-center py-4" style={{ color: C.muted }}>Žádné typy vybavení</div>
          )}
        </Card>

        <Card icon={MapPin} accent={C.cyan}
          title="Po sálech"
          subtitle="Vybavení přiřazené k sálu">
          {stats.perRoomList.length > 0 ? (
            <CategoryBarList
              items={stats.perRoomList.map(r => ({
                label: r.roomName,
                value: r.total,
                color: r.unavail === 0 ? C.green : r.unavail >= 3 ? C.red : C.yellow,
                sublabel: r.unavail > 0 ? `${r.unavail}× mimo` : '',
              }))}
              formatValue={(v) => `${v}×`}
            />
          ) : (
            <div className="text-xs text-center py-4" style={{ color: C.muted }}>
              Žádné položky přiřazené k sálu
            </div>
          )}
        </Card>
      </div>

      {/* ── Overdue & Due Soon ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card icon={AlertTriangle} accent={C.red}
          title="Po termínu údržby"
          subtitle="next_maintenance < dnes"
          action={
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono tabular-nums"
              style={{ background: `${C.red}1a`, color: C.red }}>
              {stats.overdueList.length}
            </span>
          }>
          {stats.overdueList.length > 0 ? (
            <div className="flex flex-col">
              {stats.overdueList.map((e, i) => (
                <motion.div key={e.id}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="flex items-center justify-between gap-2 py-2"
                  style={{ borderBottom: i < stats.overdueList.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium truncate" style={{ color: C.text }}>
                      {e.name}
                    </div>
                    <div className="text-[9px]" style={{ color: C.muted }}>
                      {e.type ?? '—'} • Sál: {e.roomName}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[12px] font-mono font-bold tabular-nums"
                      style={{ color: e.daysOverdue > 30 ? C.red : C.orange }}>
                      −{e.daysOverdue}d
                    </div>
                    <div className="text-[8px]" style={{ color: C.muted }}>po termínu</div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-3 text-[11px]" style={{ color: C.green }}>
              <CheckCircle2 size={14} />
              Žádné vybavení po termínu údržby
            </div>
          )}
        </Card>

        <Card icon={Calendar} accent={C.yellow}
          title="Plánováno do 14 dnů"
          subtitle="Nadcházející servisní intervaly"
          action={
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono tabular-nums"
              style={{ background: `${C.yellow}1a`, color: C.yellow }}>
              {stats.dueSoonList.length}
            </span>
          }>
          {stats.dueSoonList.length > 0 ? (
            <div className="flex flex-col">
              {stats.dueSoonList.map((e, i) => (
                <motion.div key={e.id}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="flex items-center justify-between gap-2 py-2"
                  style={{ borderBottom: i < stats.dueSoonList.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium truncate" style={{ color: C.text }}>
                      {e.name}
                    </div>
                    <div className="text-[9px]" style={{ color: C.muted }}>
                      {e.type ?? '—'} • Sál: {e.roomName}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[12px] font-mono font-bold tabular-nums"
                      style={{ color: e.daysUntil <= 3 ? C.orange : C.yellow }}>
                      {e.daysUntil}d
                    </div>
                    <div className="text-[8px]" style={{ color: C.muted }}>do servisu</div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-3 text-[11px]" style={{ color: C.muted }}>
              <Clock size={14} />
              Žádný servis v nejbližších 14 dnech
            </div>
          )}
        </Card>
      </div>

      {/* ── Detail metrics + recent log ─────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricTile
          label="Nikdy neservisováno"
          value={stats.neverServiced}
          sublabel="last_maintenance NULL"
          icon={AlertTriangle}
          color={stats.neverServiced > 0 ? C.orange : C.muted}
        />
        <MetricTile
          label="Servis < 30 dní"
          value={stats.recentlyServiced}
          sublabel="recently maintained"
          icon={CheckCircle2}
          color={C.green}
        />
        <MetricTile
          label="Plán existuje"
          value={stats.scheduled}
          sublabel="má next_maintenance"
          icon={Calendar}
          color={C.cyan}
        />
        <MetricTile
          label="Bez plánu údržby"
          value={Math.max(0, stats.total - stats.scheduled - stats.overdue)}
          sublabel="next_maintenance NULL"
          icon={Clock}
          color={C.muted}
        />
      </div>

      <Card icon={Wrench} accent={C.accent}
        title="Posledních 8 servisních záznamů"
        subtitle="Dle last_maintenance">
        <EventFeed items={maintenanceEvents} maxItems={8} />
      </Card>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="text-[10px] text-center" style={{ color: C.faint }}>
        Veškeré metriky odvozeny z tabulky <code style={{ color: C.muted }}>public.equipment</code> v Supabase DB.
        Sterilizační cykly, inventář spotřebního materiálu a implant tracking nejsou v aktuálním schématu.
      </motion.div>
    </div>
  );
});
EquipmentTab.displayName = 'EquipmentTab';
