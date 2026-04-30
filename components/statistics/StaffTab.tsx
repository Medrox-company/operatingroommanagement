/**
 * StaffTab — Personál
 *
 * Reálná data z tabulky `staff` v Supabase:
 *   • role (doctor | nurse | anesth | …)
 *   • skill_level (junior | mid | senior | expert)
 *   • availability (0-100 %)
 *   • is_external, is_recommended, is_active
 *   • vacation_days, sick_leave_days
 *
 * Doplňkově se použije aktuální stav `OperatingRoom[]` k odvození toho, kdo
 * je právě přiřazený k živému sálu (jména staff přes doctor_id/nurse_id/anesthesiologist_id).
 *
 * Žádné fiktivní KPI — schéma neobsahuje productivity, hours, training, atd.
 */
'use client';

import React, { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import {
  UserCircle2, Stethoscope, Users, Award, ShieldCheck, Coffee,
  AlertCircle, Briefcase, GraduationCap, UserX, UserCheck, Activity,
} from 'lucide-react';
import {
  C, Card, KPIBlock, MetricTile, ProgressRing, CategoryBarList,
  formatNumber,
} from './shared';
import type { OperatingRoom } from '../../types';
import type { StaffRow } from '../../lib/db';

interface StaffTabProps {
  staff: StaffRow[] | null;
  rooms: OperatingRoom[];
  periodLabel: string;
}

// Mapování role → metadata pro UI (musí pokrývat hodnoty, které máte v DB)
const ROLE_META: Record<string, { label: string; plural: string; color: string; icon: typeof Stethoscope }> = {
  doctor:      { label: 'Lékař',          plural: 'Lékaři',          color: C.green,  icon: Stethoscope },
  surgeon:     { label: 'Lékař',          plural: 'Lékaři',          color: C.green,  icon: Stethoscope },
  nurse:       { label: 'Sestra',         plural: 'Sestry',          color: C.cyan,   icon: UserCircle2 },
  anesth:      { label: 'Anesteziolog',   plural: 'Anesteziologové', color: C.purple, icon: Activity },
  anesthesiologist: { label: 'Anesteziolog', plural: 'Anesteziologové', color: C.purple, icon: Activity },
};

const SKILL_LEVELS = [
  { key: 'expert', label: 'Expert',  color: C.green },
  { key: 'senior', label: 'Senior',  color: C.cyan },
  { key: 'mid',    label: 'Mid',     color: C.yellow },
  { key: 'junior', label: 'Junior',  color: C.orange },
];

function getRoleMeta(role: string) {
  const key = role?.toLowerCase().trim();
  return ROLE_META[key] ?? { label: role || 'Ostatní', plural: role || 'Ostatní', color: C.muted, icon: Users };
}

export const StaffTab: React.FC<StaffTabProps> = memo(({ staff, rooms, periodLabel }) => {
  const stats = useMemo(() => {
    if (!staff || staff.length === 0) return null;

    const total = staff.length;
    const active = staff.filter(s => s.is_active).length;
    const inactive = total - active;
    const external = staff.filter(s => s.is_external).length;
    const recommended = staff.filter(s => s.is_recommended).length;

    // Per role
    const roleCounts = new Map<string, { active: number; total: number; avgAvail: number; avails: number[] }>();
    for (const s of staff) {
      const r = (s.role || 'other').toLowerCase();
      const cur = roleCounts.get(r) ?? { active: 0, total: 0, avgAvail: 0, avails: [] };
      cur.total++;
      if (s.is_active) cur.active++;
      if (typeof s.availability === 'number') cur.avails.push(s.availability);
      roleCounts.set(r, cur);
    }
    const byRole = Array.from(roleCounts.entries())
      .map(([role, c]) => ({
        role,
        meta: getRoleMeta(role),
        active: c.active,
        total: c.total,
        avgAvail: c.avails.length > 0 ? c.avails.reduce((a, b) => a + b, 0) / c.avails.length : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Per skill level
    const skillCounts = new Map<string, number>();
    for (const s of staff) {
      const k = (s.skill_level || 'unknown').toLowerCase();
      skillCounts.set(k, (skillCounts.get(k) ?? 0) + 1);
    }
    const bySkill = SKILL_LEVELS.map(sl => ({
      ...sl,
      count: skillCounts.get(sl.key) ?? 0,
      pct: total > 0 ? ((skillCounts.get(sl.key) ?? 0) / total) * 100 : 0,
    }));
    const skillUnknown = skillCounts.get('unknown') ?? 0;

    // Vacation & sick leave
    const totalVacation = staff.reduce((sum, s) => sum + (s.vacation_days ?? 0), 0);
    const totalSick = staff.reduce((sum, s) => sum + (s.sick_leave_days ?? 0), 0);
    const onVacation = staff.filter(s => (s.vacation_days ?? 0) > 0).length;
    const onSick = staff.filter(s => (s.sick_leave_days ?? 0) > 0).length;

    // Availability distribution
    const avails = staff.map(s => s.availability ?? 100);
    const avgAvail = avails.length > 0 ? avails.reduce((a, b) => a + b, 0) / avails.length : 0;

    // Top by availability (kdo nejvíce reálně k dispozici)
    const topAvailable = [...staff]
      .filter(s => s.is_active && (s.availability ?? 0) > 0)
      .sort((a, b) => (b.availability ?? 0) - (a.availability ?? 0))
      .slice(0, 8);

    // Currently assigned to live rooms
    const assignedIds = new Set<string>();
    for (const r of rooms) {
      if (r.doctor?.id) assignedIds.add(r.doctor.id);
      if (r.nurse?.id) assignedIds.add(r.nurse.id);
      if (r.anesthesiologist?.id) assignedIds.add(r.anesthesiologist.id);
    }
    const currentlyAssigned = staff.filter(s => assignedIds.has(s.id)).length;

    // Most absent (highest vacation+sick)
    const topAbsent = [...staff]
      .map(s => ({
        ...s,
        absentDays: (s.vacation_days ?? 0) + (s.sick_leave_days ?? 0),
      }))
      .filter(s => s.absentDays > 0)
      .sort((a, b) => b.absentDays - a.absentDays)
      .slice(0, 6);

    return {
      total, active, inactive, external, recommended,
      byRole, bySkill, skillUnknown,
      totalVacation, totalSick, onVacation, onSick,
      avgAvail, topAvailable, topAbsent, currentlyAssigned,
    };
  }, [staff, rooms]);

  if (!staff) {
    return (
      <Card>
        <div className="flex items-center gap-3 py-6 px-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `${C.muted}1a` }}>
            <Users size={16} color={C.muted} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: C.text }}>Načítání dat…</p>
            <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>
              Načítá se z tabulky <code>staff</code>.
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
            <AlertCircle size={16} color={C.yellow} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: C.text }}>Žádný personál v databázi</p>
            <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>
              Tabulka <code>staff</code> je prázdná.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const activePct = stats.total > 0 ? (stats.active / stats.total) * 100 : 0;
  const externalPct = stats.total > 0 ? (stats.external / stats.total) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <Card elevated icon={Users} accent={C.accent}
        title="Personál"
        subtitle={`Z databáze \`staff\`. Období zobrazení: ${periodLabel}`}
      >
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-center">
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <ProgressRing
              value={activePct}
              size={120}
              strokeWidth={10}
              gradient
              centerLabel={
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold tabular-nums leading-none"
                    style={{ color: activePct >= 80 ? C.green : activePct >= 60 ? C.yellow : C.red }}>
                    {activePct.toFixed(0)}%
                  </span>
                  <span className="text-[8px] uppercase tracking-wider mt-1" style={{ color: C.muted }}>
                    Aktivní
                  </span>
                </div>
              }
            />
            <div className="flex flex-col gap-0.5">
              <div className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>
                Celkem zaměstnanců
              </div>
              <div className="text-3xl font-bold leading-none" style={{ color: C.textHi }}>
                {formatNumber(stats.total)}
              </div>
              <div className="text-[10px] mt-1" style={{ color: C.muted }}>
                <span style={{ color: C.green }} className="font-bold">{stats.active}</span> aktivních •
                {' '}<span style={{ color: C.muted }} className="font-bold">{stats.inactive}</span> neaktivních
              </div>
              {stats.currentlyAssigned > 0 && (
                <div className="text-[10px] mt-1">
                  <span style={{ color: C.cyan }} className="font-bold">{stats.currentlyAssigned}</span>
                  <span style={{ color: C.muted }}> právě přiřazených k živému sálu</span>
                </div>
              )}
            </div>
          </div>

          {/* Role breakdown */}
          <div className="flex flex-col gap-2">
            {stats.byRole.slice(0, 4).map(({ role, meta, active, total }, i) => {
              const Icon = meta.icon;
              const pct = total > 0 ? (active / total) * 100 : 0;
              return (
                <motion.div
                  key={role}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${meta.color}1a` }}>
                    <Icon size={14} color={meta.color} strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between text-[11px]">
                      <span style={{ color: C.text }} className="font-medium">{meta.plural}</span>
                      <span className="font-mono tabular-nums" style={{ color: C.muted }}>
                        <span className="font-bold" style={{ color: meta.color }}>{active}</span>/{total}
                      </span>
                    </div>
                    <div className="h-1 mt-1 rounded-full overflow-hidden" style={{ background: C.surface }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 + 0.1 }}
                        style={{ height: '100%', background: meta.color }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPIBlock label="Aktivní" value={stats.active} icon={UserCheck} color={C.green}
          sublabel={`${activePct.toFixed(0)}% z celkového počtu`} />
        <KPIBlock label="Externisté" value={stats.external} icon={Briefcase} color={C.orange}
          sublabel={`${externalPct.toFixed(0)}% z celku`} />
        <KPIBlock label="Doporučení" value={stats.recommended} icon={Award} color={C.purple}
          sublabel="is_recommended = true" />
        <KPIBlock label="Průměrná dostupnost" value={stats.avgAvail}
          format={(v) => v.toFixed(0)} unit="%"
          icon={ShieldCheck} color={C.cyan}
          sublabel="z pole `availability`" />
      </div>

      {/* ── Skill matrix + Role distribution ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card icon={GraduationCap} accent={C.purple}
          title="Skill level distribuce"
          subtitle="Z pole `skill_level`">
          <div className="flex flex-col gap-2.5 mt-1">
            {stats.bySkill.map((sl, i) => (
              <div key={sl.key} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between text-[11px]">
                  <span style={{ color: C.text }} className="font-medium">{sl.label}</span>
                  <span className="font-mono tabular-nums" style={{ color: C.muted }}>
                    <span className="font-bold" style={{ color: sl.color }}>{sl.count}</span>
                    <span className="ml-1.5 text-[10px]">({sl.pct.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.surface }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${sl.pct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05 }}
                    style={{ height: '100%', background: sl.color }}
                  />
                </div>
              </div>
            ))}
            {stats.skillUnknown > 0 && (
              <div className="text-[10px] mt-1 pt-2" style={{ color: C.muted, borderTop: `1px solid ${C.border}` }}>
                {stats.skillUnknown}× bez vyplněného skill_level
              </div>
            )}
          </div>
        </Card>

        <Card icon={Users} accent={C.cyan}
          title="Po roli"
          subtitle="Aktivní zaměstnanci podle role">
          {stats.byRole.length > 0 ? (
            <CategoryBarList
              items={stats.byRole.map(r => ({
                label: r.meta.plural,
                value: r.active,
                color: r.meta.color,
                sublabel: `z ${r.total} • avail ${r.avgAvail.toFixed(0)}%`,
              }))}
              formatValue={(v) => `${v}×`}
            />
          ) : (
            <div className="text-xs text-center py-4" style={{ color: C.muted }}>Žádné role</div>
          )}
        </Card>
      </div>

      {/* ── Vacation & sick leave ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricTile
          label="Aktuálně na dovolené"
          value={stats.onVacation}
          sublabel={`${stats.totalVacation} dní celkem`}
          icon={Coffee}
          color={C.cyan}
        />
        <MetricTile
          label="Pracovní neschopnost"
          value={stats.onSick}
          sublabel={`${stats.totalSick} dní celkem`}
          icon={UserX}
          color={C.orange}
        />
        <MetricTile
          label="Externí pracovníci"
          value={stats.external}
          sublabel="is_external = true"
          icon={Briefcase}
          color={C.yellow}
        />
        <MetricTile
          label="Doporučovaní"
          value={stats.recommended}
          sublabel="is_recommended = true"
          icon={Award}
          color={C.purple}
        />
      </div>

      {/* ── Top dostupní + Top absentující ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card icon={UserCheck} accent={C.green}
          title="Top dostupní (aktivní)"
          subtitle="Dle pole `availability` (z aktivních zaměstnanců)">
          {stats.topAvailable.length > 0 ? (
            <div className="flex flex-col">
              {stats.topAvailable.map((s, i) => {
                const meta = getRoleMeta(s.role);
                const Icon = meta.icon;
                return (
                  <motion.div key={s.id}
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="flex items-center gap-3 py-2"
                    style={{ borderBottom: i < stats.topAvailable.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: `${meta.color}1a` }}>
                      <Icon size={12} color={meta.color} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium truncate" style={{ color: C.text }}>
                        {s.name}
                      </div>
                      <div className="text-[9px]" style={{ color: C.muted }}>
                        {meta.label}
                        {s.skill_level && ` • ${s.skill_level}`}
                        {s.is_external && ' • externí'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[12px] font-mono font-bold tabular-nums"
                        style={{ color: (s.availability ?? 0) >= 80 ? C.green : C.yellow }}>
                        {s.availability ?? 0}%
                      </div>
                      <div className="text-[8px]" style={{ color: C.muted }}>availability</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-center py-4" style={{ color: C.muted }}>
              Žádné záznamy s availability
            </div>
          )}
        </Card>

        <Card icon={Coffee} accent={C.orange}
          title="Top absencí"
          subtitle="Součet vacation_days + sick_leave_days">
          {stats.topAbsent.length > 0 ? (
            <div className="flex flex-col">
              {stats.topAbsent.map((s, i) => {
                const meta = getRoleMeta(s.role);
                const Icon = meta.icon;
                return (
                  <motion.div key={s.id}
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="flex items-center gap-3 py-2"
                    style={{ borderBottom: i < stats.topAbsent.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: `${meta.color}1a` }}>
                      <Icon size={12} color={meta.color} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium truncate" style={{ color: C.text }}>
                        {s.name}
                      </div>
                      <div className="text-[9px]" style={{ color: C.muted }}>
                        {meta.label}
                        {(s.vacation_days ?? 0) > 0 && ` • ${s.vacation_days}d dovolená`}
                        {(s.sick_leave_days ?? 0) > 0 && ` • ${s.sick_leave_days}d nemocenská`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[12px] font-mono font-bold tabular-nums"
                        style={{ color: s.absentDays > 14 ? C.red : C.orange }}>
                        {s.absentDays}d
                      </div>
                      <div className="text-[8px]" style={{ color: C.muted }}>celkem</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-3 text-[11px]" style={{ color: C.green }}>
              <UserCheck size={14} />
              Nikdo aktuálně neeviduje absence
            </div>
          )}
        </Card>
      </div>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="text-[10px] text-center" style={{ color: C.faint }}>
        Veškeré metriky odvozeny z tabulky <code style={{ color: C.muted }}>public.staff</code> v Supabase DB.
        Údaje o produktivitě, odpracovaných hodinách a tréninku nejsou v aktuálním schématu k dispozici.
      </motion.div>
    </div>
  );
});
StaffTab.displayName = 'StaffTab';
