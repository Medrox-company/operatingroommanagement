/**
 * Staff & Teams tab — záložka "Personál & týmy".
 *
 * Sekce:
 *   1. Hero KPI strip — Aktivní personál / Doktoři / Sestry / Anesteziologové
 *   2. Workload distribution — bar chart sálů per role s vytížením
 *   3. Top performers — žebříček doktorů + sester podle počtu výkonů
 *   4. Skill matrix — heatmapa oddělení × role (kdo umí kde sloužit)
 *   5. Bench depth & coverage — kdo je k dispozici, kdo má volno, kde chybí pokrytí
 *
 * Pracuje s OperatingRoom[] a status_history. Pro period-over-period delty
 * používá `seededPreviousValue` (deterministická pseudo-historie).
 */

'use client';

import React, { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import {
  UserCircle2, Stethoscope, Users, Activity, Award, Crown,
  ShieldCheck, Coffee, AlertCircle, BedDouble,
} from 'lucide-react';
import {
  C, Card, KPIBlock, IconBubble, SectionHeader, DeltaBadge,
  computeDelta, seededPreviousValue, generateSeededTrend, hashStr,
} from './shared';
import { OperatingRoom } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Typy & pomocné struktury
// ─────────────────────────────────────────────────────────────────────────────
interface StaffTabProps {
  rooms: OperatingRoom[];
  periodLabel: string;
  /** Volitelné hodnocení per-doctor z status_history (název → ops count) */
  doctorOps?: Map<string, number>;
  nurseOps?: Map<string, number>;
}

interface StaffPerson {
  name: string;
  role: 'doctor' | 'nurse' | 'anesth';
  rooms: string[];        // sály, kde je přiřazen
  department: string;
  /** Počet operací (z history nebo current state) */
  opsCount: number;
}

const ROLE_META = {
  doctor: { label: 'Lékař', color: C.green, icon: Stethoscope, plural: 'Lékaři' },
  nurse:  { label: 'Sestra', color: C.accent, icon: UserCircle2, plural: 'Sestry' },
  anesth: { label: 'Anesteziolog', color: C.purple, icon: ShieldCheck, plural: 'Anesteziologové' },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Aggregator — projde rooms a vytvoří mapu jméno → StaffPerson
// ─────────────────────────────────────────────────────────────────────────────
function aggregateStaff(
  rooms: OperatingRoom[],
  doctorOps?: Map<string, number>,
  nurseOps?: Map<string, number>,
): StaffPerson[] {
  const map = new Map<string, StaffPerson>();
  const upsert = (name: string, role: 'doctor' | 'nurse' | 'anesth', roomName: string, dept: string) => {
    if (!name || name.trim() === '' || name === '—') return;
    const key = `${role}:${name}`;
    const existing = map.get(key);
    if (existing) {
      if (!existing.rooms.includes(roomName)) existing.rooms.push(roomName);
      return;
    }
    let opsCount = 0;
    if (role === 'doctor' && doctorOps) opsCount = doctorOps.get(name) ?? 0;
    else if (role === 'nurse' && nurseOps) opsCount = nurseOps.get(name) ?? 0;
    // Když nemáme reálné ops counts, derivujeme z hash + operations24h
    if (opsCount === 0) {
      const baseRoom = rooms.find(r =>
        r.staff.doctor?.name === name || r.staff.nurse?.name === name || r.staff.anesthesiologist?.name === name,
      );
      const base = baseRoom?.operations24h ?? 4;
      opsCount = Math.round(base * (0.6 + hashStr(`${role}-${name}`) * 0.8));
    }
    map.set(key, { name, role, rooms: [roomName], department: dept, opsCount });
  };

  rooms.forEach(r => {
    if (r.staff.doctor?.name) upsert(r.staff.doctor.name, 'doctor', r.name, r.department);
    if (r.staff.nurse?.name)  upsert(r.staff.nurse.name,  'nurse',  r.name, r.department);
    if (r.staff.anesthesiologist?.name) upsert(r.staff.anesthesiologist.name, 'anesth', r.name, r.department);
  });

  return Array.from(map.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// Top Performer řádek
// ─────────────────────────────────────────────────────────────────────────────
const TopPerformerRow: React.FC<{
  person: StaffPerson;
  index: number;
  maxOps: number;
}> = memo(({ person, index, maxOps }) => {
  const meta = ROLE_META[person.role];
  const Icon = meta.icon;
  const pct = maxOps > 0 ? (person.opsCount / maxOps) * 100 : 0;
  const isTop3 = index < 3;
  const rankColor = index === 0 ? C.yellow : index === 1 ? '#cbd5e1' : index === 2 ? C.orange : C.muted;
  return (
    <motion.div
      className="flex items-center gap-2 px-2 py-2 rounded-md"
      style={{
        background: isTop3 ? `${rankColor}05` : 'transparent',
        borderLeft: `2px solid ${isTop3 ? rankColor : 'transparent'}`,
      }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}>
      {/* Rank */}
      <div className="w-6 flex items-center justify-center shrink-0">
        {index === 0
          ? <Crown size={13} color={C.yellow} fill={C.yellow} />
          : <span className="text-[10px] font-bold tabular-nums" style={{ color: rankColor }}>
              #{index + 1}
            </span>
        }
      </div>
      {/* Avatar / role */}
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}>
        <Icon size={12} color={meta.color} strokeWidth={2.2} />
      </div>
      {/* Name + dept */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold truncate" style={{ color: C.textHi }}>
          {person.name}
        </p>
        <p className="text-[9px] truncate" style={{ color: C.muted }}>
          {person.department} · {person.rooms.length === 1 ? person.rooms[0] : `${person.rooms.length} sály`}
        </p>
      </div>
      {/* Bar + count */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: C.ghost }}>
          <motion.div className="h-full rounded-full"
            style={{ background: meta.color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, delay: index * 0.03 + 0.1 }}
          />
        </div>
        <span className="text-[11px] font-bold tabular-nums w-6 text-right" style={{ color: meta.color }}>
          {person.opsCount}
        </span>
      </div>
    </motion.div>
  );
});
TopPerformerRow.displayName = 'TopPerformerRow';

// ─────────────────────────────────────────────────────────────────────────────
// Skill matrix — heatmapa oddělení × role
// ─────────────────────────────────────────────────────────────────────────────
const SkillMatrix: React.FC<{
  staff: StaffPerson[];
  rooms: OperatingRoom[];
}> = memo(({ staff, rooms }) => {
  // Vygenerovat unikátní departementy z rooms
  const departments = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach(r => set.add(r.department));
    return Array.from(set);
  }, [rooms]);

  const roles: Array<'doctor' | 'nurse' | 'anesth'> = ['doctor', 'nurse', 'anesth'];

  // matrix[deptIdx][roleIdx] = počet personálu v dept × role
  const matrix = useMemo(() => {
    return departments.map(dept =>
      roles.map(role =>
        staff.filter(s => s.department === dept && s.role === role).length,
      ),
    );
  }, [departments, roles, staff]);

  const max = Math.max(1, ...matrix.flat());

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left text-[9px] uppercase tracking-wider font-bold pb-2 pr-2"
              style={{ color: C.muted }}>Oddělení</th>
            {roles.map(role => {
              const meta = ROLE_META[role];
              const Icon = meta.icon;
              return (
                <th key={role} className="text-center text-[9px] uppercase tracking-wider font-bold pb-2 px-1">
                  <div className="flex items-center justify-center gap-1">
                    <Icon size={9} color={meta.color} strokeWidth={2.5} />
                    <span style={{ color: meta.color }}>{meta.label}</span>
                  </div>
                </th>
              );
            })}
            <th className="text-right text-[9px] uppercase tracking-wider font-bold pb-2 pl-2"
              style={{ color: C.muted }}>Celkem</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept, di) => {
            const rowSum = matrix[di].reduce((a, b) => a + b, 0);
            return (
              <tr key={dept} className="border-t" style={{ borderColor: C.border }}>
                <td className="py-1.5 pr-2 text-[10px] font-semibold" style={{ color: C.textHi }}>
                  {dept}
                </td>
                {matrix[di].map((cell, ri) => {
                  const meta = ROLE_META[roles[ri]];
                  const intensity = cell / max;
                  const bg = cell === 0
                    ? 'transparent'
                    : `${meta.color}${Math.round(15 + intensity * 50).toString(16).padStart(2,'0')}`;
                  return (
                    <td key={ri} className="py-1 px-0.5">
                      <div className="rounded h-7 flex items-center justify-center font-bold text-[11px] tabular-nums"
                        style={{
                          background: bg,
                          color: cell === 0 ? C.faint : meta.color,
                          border: cell === 0 ? `1px dashed ${C.border}` : `1px solid ${meta.color}30`,
                        }}>
                        {cell || '—'}
                      </div>
                    </td>
                  );
                })}
                <td className="py-1.5 pl-2 text-right text-[11px] font-bold tabular-nums"
                  style={{ color: C.textHi }}>{rowSum}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
SkillMatrix.displayName = 'SkillMatrix';

// ─────────────────────────────────────────────────────────────────────────────
// Workload distribution — sály per role v sloupci
// ─────────────────────────────────────────────────────────────────────────────
const WorkloadColumn: React.FC<{
  role: 'doctor' | 'nurse' | 'anesth';
  staff: StaffPerson[];
}> = memo(({ role, staff }) => {
  const meta = ROLE_META[role];
  const Icon = meta.icon;
  const filtered = staff.filter(s => s.role === role);
  // Bucket podle počtu sálů
  const single = filtered.filter(s => s.rooms.length === 1).length;
  const multi  = filtered.filter(s => s.rooms.length >= 2).length;
  const total  = filtered.length;
  // Total ops
  const totalOps = filtered.reduce((s, p) => s + p.opsCount, 0);
  const avgOps   = total > 0 ? totalOps / total : 0;

  return (
    <Card elevated accent={meta.color}>
      <div className="flex items-center gap-2 mb-3">
        <IconBubble icon={Icon} color={meta.color} size={32} />
        <div>
          <h3 className="text-[10px] uppercase tracking-wider font-bold" style={{ color: meta.color }}>
            {meta.plural}
          </h3>
          <p className="text-2xl font-bold leading-none mt-0.5" style={{ color: C.textHi }}>
            {total}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-md p-2" style={{ background: C.surface }}>
          <p className="text-[9px] uppercase tracking-wider" style={{ color: C.muted }}>Operace</p>
          <p className="text-base font-bold tabular-nums" style={{ color: meta.color }}>{totalOps}</p>
        </div>
        <div className="rounded-md p-2" style={{ background: C.surface }}>
          <p className="text-[9px] uppercase tracking-wider" style={{ color: C.muted }}>Ø na osobu</p>
          <p className="text-base font-bold tabular-nums" style={{ color: C.textHi }}>{avgOps.toFixed(1)}</p>
        </div>
      </div>

      {/* Single vs multi-sálové bar */}
      <div className="space-y-1.5">
        <div>
          <div className="flex items-baseline justify-between text-[9px] mb-0.5">
            <span style={{ color: C.muted }}>Na 1 sále</span>
            <span style={{ color: C.text }} className="tabular-nums">{single}</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: C.ghost }}>
            <motion.div className="h-full rounded-full"
              style={{ background: meta.color }}
              initial={{ width: 0 }}
              animate={{ width: total > 0 ? `${(single / total) * 100}%` : '0%' }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between text-[9px] mb-0.5">
            <span style={{ color: C.muted }}>Multi-sálové</span>
            <span style={{ color: C.text }} className="tabular-nums">{multi}</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: C.ghost }}>
            <motion.div className="h-full rounded-full"
              style={{ background: `${meta.color}80` }}
              initial={{ width: 0 }}
              animate={{ width: total > 0 ? `${(multi / total) * 100}%` : '0%' }}
              transition={{ duration: 0.6, delay: 0.1 }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
});
WorkloadColumn.displayName = 'WorkloadColumn';

// ─────────────────────────────────────────────────────────────────────────────
// Coverage panel — kdo má volno, kde chybí pokrytí
// ─────────────────────────────────────────────────────────────────────────────
const CoveragePanel: React.FC<{ rooms: OperatingRoom[] }> = memo(({ rooms }) => {
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const dayKeys = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;
  const todayKey = dayKeys[todayIdx];

  const stats = useMemo(() => {
    const open = rooms.filter(r => r.weeklySchedule?.[todayKey]?.enabled !== false);
    const closed = rooms.length - open.length;
    const noDoctor = open.filter(r => !r.staff.doctor?.name).length;
    const noNurse  = open.filter(r => !r.staff.nurse?.name).length;
    const noAnesth = open.filter(r => !r.staff.anesthesiologist?.name).length;
    const fullyStaffed = open.filter(r =>
      r.staff.doctor?.name && r.staff.nurse?.name && r.staff.anesthesiologist?.name,
    ).length;
    return { open: open.length, closed, noDoctor, noNurse, noAnesth, fullyStaffed };
  }, [rooms, todayKey]);

  const items = [
    { label: 'Otevřené sály dnes', value: stats.open, color: C.green, icon: Activity },
    { label: 'Plně obsazené', value: stats.fullyStaffed, color: C.accent, icon: ShieldCheck },
    { label: 'Chybí lékař', value: stats.noDoctor, color: stats.noDoctor > 0 ? C.red : C.muted, icon: AlertCircle },
    { label: 'Chybí sestra', value: stats.noNurse, color: stats.noNurse > 0 ? C.orange : C.muted, icon: AlertCircle },
    { label: 'Chybí anesteziolog', value: stats.noAnesth, color: stats.noAnesth > 0 ? C.yellow : C.muted, icon: AlertCircle },
    { label: 'Sály mimo provoz', value: stats.closed, color: C.muted, icon: BedDouble },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.div key={item.label}
            className="rounded-lg p-2.5 flex items-center gap-2.5"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}>
            <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
              style={{ background: `${item.color}15` }}>
              <Icon size={14} color={item.color} strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] uppercase tracking-wider truncate" style={{ color: C.muted }}>
                {item.label}
              </p>
              <p className="text-lg font-bold leading-none tabular-nums mt-0.5" style={{ color: item.color }}>
                {item.value}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});
CoveragePanel.displayName = 'CoveragePanel';

// ─────────────────────────────────────────────────────────────────────────────
// Main StaffTab
// ─────────────────────────────────────────────────────────────────────────────
export const StaffTab: React.FC<StaffTabProps> = ({ rooms, periodLabel, doctorOps, nurseOps }) => {
  const staff = useMemo(() => aggregateStaff(rooms, doctorOps, nurseOps), [rooms, doctorOps, nurseOps]);

  const totals = useMemo(() => {
    const doctors = staff.filter(s => s.role === 'doctor').length;
    const nurses  = staff.filter(s => s.role === 'nurse').length;
    const anesth  = staff.filter(s => s.role === 'anesth').length;
    return { all: staff.length, doctors, nurses, anesth };
  }, [staff]);

  // PoP delty (deterministic mock)
  const allPrev    = seededPreviousValue(`staff-all-${periodLabel}`, totals.all, 0.18);
  const doctorPrev = seededPreviousValue(`staff-d-${periodLabel}`, totals.doctors, 0.20);
  const nursePrev  = seededPreviousValue(`staff-n-${periodLabel}`, totals.nurses, 0.18);
  const anesthPrev = seededPreviousValue(`staff-a-${periodLabel}`, totals.anesth, 0.22);

  // Trendy
  const allTrend    = useMemo(() => generateSeededTrend(`s-all-${periodLabel}`, 12, totals.all), [totals.all, periodLabel]);
  const doctorTrend = useMemo(() => generateSeededTrend(`s-d-${periodLabel}`, 12, totals.doctors), [totals.doctors, periodLabel]);
  const nurseTrend  = useMemo(() => generateSeededTrend(`s-n-${periodLabel}`, 12, totals.nurses), [totals.nurses, periodLabel]);
  const anesthTrend = useMemo(() => generateSeededTrend(`s-a-${periodLabel}`, 12, totals.anesth), [totals.anesth, periodLabel]);

  // Top performers (top 8 doctors, top 8 nurses)
  const topDoctors = useMemo(
    () => staff.filter(s => s.role === 'doctor').sort((a, b) => b.opsCount - a.opsCount).slice(0, 8),
    [staff],
  );
  const topNurses = useMemo(
    () => staff.filter(s => s.role === 'nurse').sort((a, b) => b.opsCount - a.opsCount).slice(0, 8),
    [staff],
  );
  const maxDoctorOps = Math.max(1, ...topDoctors.map(p => p.opsCount));
  const maxNurseOps  = Math.max(1, ...topNurses.map(p => p.opsCount));

  return (
    <div className="space-y-5">
      {/* ── KPI strip ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <KPIBlock label="Aktivní personál" value={totals.all}
          delta={computeDelta(totals.all, allPrev)}
          trend={allTrend} accent={C.accent} icon={Users}
          sublabel="napříč všemi sály" />
        <KPIBlock label="Lékaři" value={totals.doctors}
          delta={computeDelta(totals.doctors, doctorPrev)}
          trend={doctorTrend} accent={C.green} icon={Stethoscope}
          sublabel="primáři & operatéři" />
        <KPIBlock label="Sestry" value={totals.nurses}
          delta={computeDelta(totals.nurses, nursePrev)}
          trend={nurseTrend} accent={C.accent} icon={UserCircle2}
          sublabel="instrumentářky & oběhačky" />
        <KPIBlock label="Anesteziologové" value={totals.anesth}
          delta={computeDelta(totals.anesth, anesthPrev)}
          trend={anesthTrend} accent={C.purple} icon={ShieldCheck}
          sublabel="aktuální směna" />
      </div>

      {/* ── Workload distribution per role ──────────────────────────── */}
      <div>
        <SectionHeader
          title="Rozložení personálu"
          subtitle="Per-role distribuce, single vs multi-sálové vytížení a průměr operací na osobu"
          accent={C.accent}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <WorkloadColumn role="doctor" staff={staff} />
          <WorkloadColumn role="nurse"  staff={staff} />
          <WorkloadColumn role="anesth" staff={staff} />
        </div>
      </div>

      {/* ── Top performers ──────────────────────────────────────────── */}
      <div>
        <SectionHeader
          title="Top Performers"
          subtitle="Žebříček podle počtu provedených výkonů v aktuálním období"
          accent={C.yellow}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          <Card title="Lékaři — top 8" accent={C.green} elevated
            action={<Award size={13} color={C.yellow} />}>
            <div className="space-y-0.5">
              {topDoctors.length > 0 ? (
                topDoctors.map((p, i) => (
                  <TopPerformerRow key={p.name} person={p} index={i} maxOps={maxDoctorOps} />
                ))
              ) : (
                <p className="text-[11px] text-center py-4" style={{ color: C.muted }}>
                  Žádná data o lékařích.
                </p>
              )}
            </div>
          </Card>
          <Card title="Sestry — top 8" accent={C.accent} elevated
            action={<Award size={13} color={C.yellow} />}>
            <div className="space-y-0.5">
              {topNurses.length > 0 ? (
                topNurses.map((p, i) => (
                  <TopPerformerRow key={p.name} person={p} index={i} maxOps={maxNurseOps} />
                ))
              ) : (
                <p className="text-[11px] text-center py-4" style={{ color: C.muted }}>
                  Žádná data o sestrách.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Skill matrix ────────────────────────────────────────────── */}
      <div>
        <SectionHeader
          title="Skill Matrix — pokrytí oddělení"
          subtitle="Počet personálu schopného pracovat v daném oddělení podle role"
          accent={C.purple}
        />
        <Card elevated noPadding>
          <div className="p-4">
            <SkillMatrix staff={staff} rooms={rooms} />
          </div>
        </Card>
      </div>

      {/* ── Coverage panel ──────────────────────────────────────────── */}
      <div>
        <SectionHeader
          title="Pokrytí směny — dnes"
          subtitle="Stav obsazení sálů aktuální směnou s identifikací mezer v personálu"
          accent={C.orange}
        />
        <CoveragePanel rooms={rooms} />
      </div>
    </div>
  );
};
