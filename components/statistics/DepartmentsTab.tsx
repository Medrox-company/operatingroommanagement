/**
 * DepartmentsTab — Přehled oddělení a sub-oddělení
 *
 * Reálná data z tabulek:
 *   • `departments` — hlavní oddělení
 *   • `sub_departments` — pod-oddělení
 *   • `operating_rooms` — vazba sálů na oddělení
 */
'use client';

import React, { useMemo, memo } from 'react';
import {
  Building2, AlertTriangle, Clock, Users, Activity, Layers,
  CheckCircle2, XCircle, TrendingUp, BarChart3,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  C, Card, KPIBlock, MetricTile, ProgressRing, CategoryBarList,
  formatNumber,
} from './shared';
import type { DepartmentRow, SubDepartmentRow } from '../../lib/db';
import type { OperatingRoom } from '../../types';

interface DepartmentsTabProps {
  departments: DepartmentRow[] | null;
  subDepartments: SubDepartmentRow[] | null;
  rooms: OperatingRoom[];
  periodLabel: string;
}

const DEPT_COLORS = [
  '#06B6D4', '#F97316', '#A78BFA', '#EC4899', '#3B82F6',
  '#14B8A6', '#FBBF24', '#10B981', '#818CF8', '#EF4444',
];

export const DepartmentsTab: React.FC<DepartmentsTabProps> = memo(({
  departments, subDepartments, rooms, periodLabel,
}) => {
  const stats = useMemo(() => {
    if (!departments || departments.length === 0) return null;

    const total = departments.length;
    const active = departments.filter(d => d.is_active).length;
    const inactive = total - active;
    const activePct = total > 0 ? (active / total) * 100 : 0;

    // Sub-departments per department
    const subDeptMap = new Map<string, SubDepartmentRow[]>();
    for (const sub of (subDepartments ?? [])) {
      const list = subDeptMap.get(sub.department_id) ?? [];
      list.push(sub);
      subDeptMap.set(sub.department_id, list);
    }

    const totalSubDepts = subDepartments?.length ?? 0;
    const activeSubDepts = subDepartments?.filter(s => s.is_active).length ?? 0;

    // Rooms per department
    const roomsByDept = new Map<string, OperatingRoom[]>();
    for (const room of rooms) {
      const dept = room.department ?? 'Nepřiřazeno';
      const list = roomsByDept.get(dept) ?? [];
      list.push(room);
      roomsByDept.set(dept, list);
    }

    // Build department stats
    const deptStats = departments.map((d, i) => {
      const subs = subDeptMap.get(d.id) ?? [];
      const deptRooms = roomsByDept.get(d.name) ?? [];
      const activeSubs = subs.filter(s => s.is_active).length;
      
      // Calculate room utilization (operations today)
      const totalOps = deptRooms.reduce((sum, r) => sum + (r.operations24h ?? 0), 0);
      
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        color: d.accent_color ?? DEPT_COLORS[i % DEPT_COLORS.length],
        isActive: d.is_active,
        subCount: subs.length,
        activeSubCount: activeSubs,
        roomCount: deptRooms.length,
        totalOps,
        subs,
        rooms: deptRooms,
      };
    }).sort((a, b) => b.roomCount - a.roomCount);

    // For radar chart
    const radarData = deptStats.slice(0, 6).map(d => ({
      name: d.name.length > 10 ? d.name.slice(0, 10) + '…' : d.name,
      rooms: d.roomCount,
      subDepts: d.subCount,
      operations: Math.min(d.totalOps, 20), // cap for visualization
    }));

    // Room distribution pie
    const roomDistribution = deptStats
      .filter(d => d.roomCount > 0)
      .map(d => ({
        name: d.name,
        value: d.roomCount,
        color: d.color,
      }));

    // Operations by department
    const opsByDept = deptStats
      .filter(d => d.totalOps > 0)
      .map(d => ({
        name: d.name.length > 12 ? d.name.slice(0, 12) + '…' : d.name,
        value: d.totalOps,
        color: d.color,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return {
      total,
      active,
      inactive,
      activePct,
      totalSubDepts,
      activeSubDepts,
      totalRooms: rooms.length,
      deptStats,
      radarData,
      roomDistribution,
      opsByDept,
    };
  }, [departments, subDepartments, rooms]);

  if (!departments) {
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
              Načítá se z tabulky <code>departments</code>.
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
              Žádná oddělení
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>
              Tabulka <code>departments</code> neobsahuje záznamy.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Hero KPIs */}
      <Card elevated icon={Building2} accent={C.accent}
        title="Přehled oddělení"
        subtitle={`Z databáze \`departments\` a \`sub_departments\`. Období: ${periodLabel}`}
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricTile
            label="Oddělení"
            value={formatNumber(stats.total)}
            icon={Building2}
            color={C.accent}
          />
          <MetricTile
            label="Aktivních"
            value={formatNumber(stats.active)}
            sublabel={`${stats.activePct.toFixed(0)}%`}
            icon={CheckCircle2}
            color={C.green}
          />
          <MetricTile
            label="Sub-oddělení"
            value={formatNumber(stats.totalSubDepts)}
            sublabel={`${stats.activeSubDepts} aktivních`}
            icon={Layers}
            color={C.yellow}
          />
          <MetricTile
            label="Operačních sálů"
            value={formatNumber(stats.totalRooms)}
            icon={Activity}
            color={C.cyan}
          />
          <MetricTile
            label="Neaktivních"
            value={formatNumber(stats.inactive)}
            icon={XCircle}
            color={C.red}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar chart */}
        <Card icon={BarChart3} title="Porovnání oddělení">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <RadarChart data={stats.radarData}>
                <PolarGrid stroke={C.border} />
                <PolarAngleAxis dataKey="name" stroke={C.muted} fontSize={10} />
                <PolarRadiusAxis stroke={C.muted} fontSize={9} />
                <Radar name="Sály" dataKey="rooms" stroke={C.accent} fill={C.accent} fillOpacity={0.3} />
                <Radar name="Sub-odd." dataKey="subDepts" stroke={C.yellow} fill={C.yellow} fillOpacity={0.2} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0,0,0,0.85)',
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Room distribution pie */}
        <Card icon={Activity} title="Distribuce sálů">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={stats.roomDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {stats.roomDistribution.map((entry, i) => (
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
                  formatter={(value: number, name: string) => [`${value} sálů`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {stats.roomDistribution.slice(0, 6).map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                <span style={{ color: C.muted }}>{d.name}</span>
                <span className="font-medium" style={{ color: C.text }}>{d.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Operations by department */}
        {stats.opsByDept.length > 0 && (
          <Card icon={TrendingUp} title="Operace za 24h podle oddělení">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={stats.opsByDept} layout="vertical">
                  <XAxis type="number" stroke={C.muted} fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke={C.muted} fontSize={10} width={90} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(0,0,0,0.85)',
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="value" name="Operace" radius={[0, 4, 4, 0]}>
                    {stats.opsByDept.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Department list with subs */}
        <Card icon={Layers} title="Oddělení a sub-oddělení" className={stats.opsByDept.length > 0 ? '' : 'lg:col-span-2'}>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {stats.deptStats.map((d, i) => (
              <div key={d.id} className="p-3 rounded-lg" style={{ background: C.ghost }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                    <span className="text-[12px] font-medium" style={{ color: C.text }}>{d.name}</span>
                    {!d.isActive && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${C.red}20`, color: C.red }}>
                        Neaktivní
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span style={{ color: C.muted }}>
                      <Activity size={12} className="inline mr-1" />
                      {d.roomCount} sálů
                    </span>
                    <span style={{ color: C.muted }}>
                      <Layers size={12} className="inline mr-1" />
                      {d.subCount} sub
                    </span>
                  </div>
                </div>
                {d.description && (
                  <p className="text-[10px] mb-2" style={{ color: C.muted }}>{d.description}</p>
                )}
                {d.subs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {d.subs.map(sub => (
                      <span
                        key={sub.id}
                        className="text-[9px] px-2 py-0.5 rounded-full"
                        style={{
                          background: sub.is_active ? `${d.color}20` : `${C.muted}20`,
                          color: sub.is_active ? d.color : C.muted,
                        }}
                      >
                        {sub.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
});

DepartmentsTab.displayName = 'DepartmentsTab';
