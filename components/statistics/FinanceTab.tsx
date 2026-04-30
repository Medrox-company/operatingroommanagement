/**
 * Finance & Costs Tab — finanční výkonnost OR oddělení.
 *
 * Zobrazuje:
 *   • Total Revenue / Cost / Margin za period
 *   • Revenue per case + Cost per case
 *   • Payer mix (VZP, ZPMV, OZP, ČPZP, samoplátci, zahraniční)
 *   • Cost breakdown (personnel, materials, implants, energy, overhead)
 *   • Top 10 revenue výkony
 *   • Daily revenue trend
 *   • Idle time cost (nevyužité kapacity)
 *   • Overtime cost tracking
 *
 * Hodnoty v CZK, deterministicky generované z hashů pro stability mezi rendery.
 */

'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, ComposedChart, Line, Cell, PieChart, Pie,
} from 'recharts';
import {
  Wallet, TrendingUp, Banknote, Receipt, Clock4, Coins,
  PiggyBank, AlertCircle, BadgePercent, CreditCard, Sparkles,
} from 'lucide-react';
import type { OperatingRoom } from '../../types';
import {
  C, Card, MetricTile, StackedBar, CategoryBarList, ComplianceMeter,
  ProgressRing, hashStr, computeDelta, seededPreviousValue, generateSeededTrend,
  formatNumber,
} from './shared';

interface FinanceTabProps {
  rooms: OperatingRoom[];
  totalOps: number;
  avgUtilization: number;
  periodLabel: string;
}

// CZK formatter — kompaktní (1.2M/450k) + plný
const fmtCZK = (n: number, compact = true): string => {
  if (!Number.isFinite(n)) return '—';
  if (compact) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M Kč`;
    if (n >= 10_000)    return `${Math.round(n / 1000)} k Kč`;
    if (n >= 1_000)     return `${(n / 1000).toFixed(1)} k Kč`;
    return `${Math.round(n)} Kč`;
  }
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(n);
};

export const FinanceTab: React.FC<FinanceTabProps> = ({ rooms, totalOps, avgUtilization, periodLabel }) => {
  // ── Finanční metriky (deterministické z hashe + reálných opCounts) ─────────
  const fin = useMemo(() => {
    const seed = `finance-${rooms.length}-${periodLabel}-${totalOps}`;
    const h = (k: string) => hashStr(`${seed}-${k}`);

    // Průměrná revenue per case — záleží na typu výkonu (lap chol = 28k, totální endoprotéza = 180k)
    const avgRevenuePerCase = 42_000 + h('rev-per-case') * 28_000;     // 42-70 k Kč
    const totalRevenue = avgRevenuePerCase * Math.max(totalOps, 1);

    // Cost components (jako % z revenue)
    // Personnel ~38 %, Materials ~22 %, Implants ~18 %, Equipment dep ~6 %, Energy ~4 %, Overhead ~12 % = 100 %
    const personnelPct = 36 + h('cost-staff') * 4;          // 36-40 %
    const materialPct  = 20 + h('cost-mat') * 4;            // 20-24 %
    const implantPct   = 16 + h('cost-impl') * 4;           // 16-20 %
    const equipDepPct  = 5 + h('cost-eq') * 2;              // 5-7 %
    const energyPct    = 3 + h('cost-energy') * 2;          // 3-5 %
    const overheadPct  = 10 + h('cost-over') * 4;           // 10-14 %
    const totalCostPct = personnelPct + materialPct + implantPct + equipDepPct + energyPct + overheadPct;

    const personnelCost = (totalRevenue * personnelPct) / 100;
    const materialCost  = (totalRevenue * materialPct) / 100;
    const implantCost   = (totalRevenue * implantPct) / 100;
    const equipDepCost  = (totalRevenue * equipDepPct) / 100;
    const energyCost    = (totalRevenue * energyPct) / 100;
    const overheadCost  = (totalRevenue * overheadPct) / 100;
    const totalCost     = personnelCost + materialCost + implantCost + equipDepCost + energyCost + overheadCost;

    const contributionMargin = totalRevenue - totalCost;
    const marginPct = (contributionMargin / Math.max(totalRevenue, 1)) * 100;
    const costPerCase = totalCost / Math.max(totalOps, 1);

    // Payer mix — ČR realistické (VZP ~62 %, ostatní pojišťovny celkem ~33 %, samoplátci ~3 %, zahraniční ~2 %)
    const vzpPct        = 60 + h('payer-vzp') * 6;    // 60-66 %
    const zpmvPct       = 9 + h('payer-zpmv') * 2;    // 9-11 %
    const ozpPct        = 7 + h('payer-ozp') * 1.5;   // 7-8.5 %
    const cpzpPct       = 5.5 + h('payer-cpzp') * 1.5;// 5.5-7 %
    const rbpPct        = 4.5 + h('payer-rbp') * 1;   // 4.5-5.5 %
    const vozpPct       = 4 + h('payer-vozp') * 1;    // 4-5 %
    const samoplatciPct = 1.5 + h('payer-self') * 1.5;// 1.5-3 %
    const zahranicniPct = 1 + h('payer-int') * 1;     // 1-2 %
    const payerSum = vzpPct + zpmvPct + ozpPct + cpzpPct + rbpPct + vozpPct + samoplatciPct + zahranicniPct;
    const norm = (p: number) => (p / payerSum) * 100;

    // Idle time cost (nevyužitý sál stojí ~3500-5000 Kč/h fixní náklady)
    const fixedIdleCostPerHour = 3800 + h('idle-cost') * 1200; // 3800-5000 Kč/h
    const totalCapacityH = rooms.length * 8;                    // 8 hodin den
    const idleH = totalCapacityH * (1 - avgUtilization / 100);
    const idleCost = idleH * fixedIdleCostPerHour;

    // Overtime cost (přesčas ~50 % příplatek)
    const overtimeHours = rooms.length * (1 + h('ot-h') * 4);   // 1-5 h/sál
    const overtimeRate  = 850 + h('ot-rate') * 250;             // 850-1100 Kč/h
    const overtimeCost  = overtimeHours * overtimeRate * 1.5;

    // Top revenue procedures (s realistickými cenami)
    const procedures: { name: string; count: number; price: number; sublabel?: string }[] = [
      { name: 'Totální endoprotéza kyčle (TEP-H)',    count: Math.round(totalOps * 0.05 + h('tep-h-cnt') * 12),  price: 165_000, sublabel: 'TEP-H' },
      { name: 'Totální endoprotéza kolene (TEP-K)',   count: Math.round(totalOps * 0.04 + h('tep-k-cnt') * 10),  price: 152_000, sublabel: 'TEP-K' },
      { name: 'Laparoskopická cholecystektomie',      count: Math.round(totalOps * 0.08 + h('lap-chol') * 14),   price: 32_000,  sublabel: 'LCh' },
      { name: 'Appendektomie',                        count: Math.round(totalOps * 0.06 + h('app') * 12),        price: 24_000,  sublabel: 'AE' },
      { name: 'Resekce střeva',                       count: Math.round(totalOps * 0.03 + h('colectomy') * 6),   price: 95_000,  sublabel: 'CR' },
      { name: 'Hernioplastika',                       count: Math.round(totalOps * 0.05 + h('hernia') * 10),     price: 28_000,  sublabel: 'HP' },
      { name: 'Mastektomie',                          count: Math.round(totalOps * 0.03 + h('mast') * 6),        price: 78_000,  sublabel: 'ME' },
      { name: 'Strumektomie',                         count: Math.round(totalOps * 0.02 + h('thyr') * 5),        price: 62_000,  sublabel: 'ST' },
      { name: 'Cholecystektomie otevřená',            count: Math.round(totalOps * 0.015 + h('open-chol') * 4),  price: 38_000,  sublabel: 'OCh' },
      { name: 'Pylorus-myotomie',                     count: Math.round(totalOps * 0.01 + h('pyl') * 3),         price: 42_000,  sublabel: 'PM' },
    ];
    procedures.forEach(p => p.count = Math.max(1, p.count));
    procedures.sort((a, b) => (b.count * b.price) - (a.count * a.price));

    // 30-day revenue trend
    const revenueTrend = generateSeededTrend(`${seed}-rev-trend`, 30, totalRevenue / 30, 0.22);
    const costTrend    = generateSeededTrend(`${seed}-cost-trend`, 30, totalCost / 30, 0.20);

    // DRG case mix index (CMI) — průměrná složitost
    const cmi = 1.2 + h('cmi') * 0.8; // 1.2-2.0

    return {
      avgRevenuePerCase, totalRevenue, totalCost, contributionMargin, marginPct, costPerCase,
      personnelCost, materialCost, implantCost, equipDepCost, energyCost, overheadCost,
      personnelPct, materialPct, implantPct, equipDepPct, energyPct, overheadPct, totalCostPct,
      payers: [
        { label: 'VZP ČR (111)',         pct: norm(vzpPct),        color: '#3B82F6' },
        { label: 'ZPMV ČR (211)',         pct: norm(zpmvPct),       color: '#06B6D4' },
        { label: 'OZP (207)',             pct: norm(ozpPct),        color: '#10B981' },
        { label: 'ČPZP (205)',            pct: norm(cpzpPct),       color: '#FBBF24' },
        { label: 'RBP (213)',             pct: norm(rbpPct),        color: '#F97316' },
        { label: 'VoZP (201)',            pct: norm(vozpPct),       color: '#A78BFA' },
        { label: 'Samoplátci',           pct: norm(samoplatciPct), color: '#EC4899' },
        { label: 'Zahraniční',           pct: norm(zahranicniPct), color: '#EF4444' },
      ],
      idleCost, idleH, fixedIdleCostPerHour,
      overtimeCost, overtimeHours, overtimeRate,
      procedures: procedures.slice(0, 10),
      revenueTrend, costTrend,
      cmi,
    };
  }, [rooms.length, totalOps, avgUtilization, periodLabel]);

  // Cost breakdown segments
  const costSegments = [
    { label: 'Personál',     value: fin.personnelCost, color: '#3B82F6' },
    { label: 'Materiál',     value: fin.materialCost,  color: '#10B981' },
    { label: 'Implantáty',  value: fin.implantCost,   color: '#A78BFA' },
    { label: 'Equipment',    value: fin.equipDepCost,  color: '#FBBF24' },
    { label: 'Energie',      value: fin.energyCost,    color: '#F97316' },
    { label: 'Overhead',     value: fin.overheadCost,  color: '#EC4899' },
  ];

  return (
    <div className="space-y-4">
      {/* ── Hero: Revenue / Cost / Margin ── */}
      <Card accent={fin.marginPct > 15 ? C.green : C.yellow}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          {/* Margin progress ring */}
          <div className="flex items-center gap-4">
            <ProgressRing
              value={Math.max(0, fin.marginPct)}
              max={30}
              size={110}
              strokeWidth={9}
              color={fin.marginPct > 15 ? C.green : fin.marginPct > 8 ? C.yellow : C.red}
              trackColor={C.surface}
              centerLabel={
                <div className="text-center">
                  <div className="text-2xl font-bold tabular-nums leading-none"
                    style={{ color: fin.marginPct > 15 ? C.green : C.yellow }}>
                    {fin.marginPct.toFixed(1)}%
                  </div>
                  <div className="text-[9px] uppercase mt-1" style={{ color: C.muted }}>Margin</div>
                </div>
              }
            />
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: C.muted }}>
                Contribution margin
              </div>
              <div className="text-base font-bold" style={{ color: C.textHi }}>
                {fmtCZK(fin.contributionMargin)}
              </div>
              <div className="text-[10px] mt-1" style={{ color: C.muted }}>
                Revenue − Total cost (osobní + materiál + implantáty + overhead)
              </div>
            </div>
          </div>

          {/* Stack of 3 mega-KPIs */}
          <MetricTile
            label="Total Revenue"
            value={fmtCZK(fin.totalRevenue)}
            color={C.green}
            icon={Banknote}
            delta={computeDelta(fin.totalRevenue, seededPreviousValue('rev', fin.totalRevenue, 0.18))}
            sublabel={`${formatNumber(totalOps)} výkonů × ${fmtCZK(fin.avgRevenuePerCase)} avg`}
          />
          <MetricTile
            label="Total Cost"
            value={fmtCZK(fin.totalCost)}
            color={C.orange}
            icon={Receipt}
            delta={computeDelta(fin.totalCost, seededPreviousValue('cost', fin.totalCost, 0.16))}
            invertedDelta
            sublabel={`Cost per case: ${fmtCZK(fin.costPerCase)}`}
          />
          <MetricTile
            label="Case Mix Index (DRG)"
            value={fin.cmi.toFixed(2)}
            color={fin.cmi > 1.5 ? C.purple : C.accent}
            icon={Sparkles}
            delta={computeDelta(fin.cmi, seededPreviousValue('cmi', fin.cmi, 0.08))}
            sublabel="Průměrná složitost výkonů"
          />
        </div>
      </Card>

      {/* ── Cost breakdown + Payer mix ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card title="Struktura nákladů" subtitle={`Celkem: ${fmtCZK(fin.totalCost)} (${fin.totalCostPct.toFixed(1)} % revenue)`} accent={C.orange}>
          <div className="mt-3">
            <StackedBar
              segments={costSegments}
              height={20}
              showLegend
              formatValue={(v) => fmtCZK(v)}
            />
          </div>
          <div className="mt-4 space-y-2">
            {[
              { l: 'Osobní náklady (lékaři, sestry, anest.)', v: fin.personnelCost, p: fin.personnelPct, c: '#3B82F6' },
              { l: 'Materiál (jednorázovky, léky, krev)',     v: fin.materialCost,  p: fin.materialPct,  c: '#10B981' },
              { l: 'Implantáty (TEP, sítě, šrouby)',          v: fin.implantCost,   p: fin.implantPct,   c: '#A78BFA' },
              { l: 'Odpisy zařízení (laparoskop, robot)',     v: fin.equipDepCost,  p: fin.equipDepPct,  c: '#FBBF24' },
              { l: 'Energie (klimatizace, sterilizace)',      v: fin.energyCost,    p: fin.energyPct,    c: '#F97316' },
              { l: 'Overhead (admin, údržba, IT)',            v: fin.overheadCost,  p: fin.overheadPct,  c: '#EC4899' },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: row.c }} />
                <div className="flex-1 truncate" style={{ color: C.text }}>{row.l}</div>
                <div className="font-mono tabular-nums shrink-0 w-16 text-right" style={{ color: C.muted }}>
                  {row.p.toFixed(1)}%
                </div>
                <div className="font-mono tabular-nums shrink-0 w-24 text-right font-bold" style={{ color: row.c }}>
                  {fmtCZK(row.v)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Payer mix" subtitle="Rozdělení tržeb dle plátce" accent={C.accent}>
          <div className="grid grid-cols-2 gap-4 mt-2 items-center">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={fin.payers} dataKey="pct" nameKey="label"
                    innerRadius={50} outerRadius={80} paddingAngle={1}>
                    {fin.payers.map((p, i) => <Cell key={i} fill={p.color} stroke="#0a0a0a" strokeWidth={1} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0a0a0a', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number) => [`${v.toFixed(1)} %`, 'Podíl']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {fin.payers.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: p.color }} />
                  <div className="flex-1 truncate" style={{ color: C.text }}>{p.label}</div>
                  <div className="font-mono tabular-nums w-12 text-right font-bold" style={{ color: p.color }}>
                    {p.pct.toFixed(1)}%
                  </div>
                  <div className="font-mono tabular-nums w-16 text-right" style={{ color: C.muted }}>
                    {fmtCZK(fin.totalRevenue * p.pct / 100)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Top revenue procedures + Idle time + Overtime ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card title="Top 10 výkonů dle revenue" subtitle="Žebříček výnosnosti" accent={C.purple}>
          <CategoryBarList
            items={fin.procedures.map((p, i) => ({
              label: p.name,
              value: p.count * p.price,
              color: i === 0 ? C.purple : i === 1 ? C.accent : i === 2 ? C.green : C.text,
              sublabel: `× ${p.count}`,
            }))}
            formatValue={(v) => fmtCZK(v)}
          />
          <div className="mt-3 pt-3 text-[10px]" style={{ borderTop: `1px solid ${C.border}`, color: C.muted }}>
            Top 3 generují <strong style={{ color: C.text }}>
              {Math.round((fin.procedures.slice(0, 3).reduce((s, p) => s + p.count * p.price, 0)
                / fin.procedures.reduce((s, p) => s + p.count * p.price, 0)) * 100)}%
            </strong> celkového revenue
          </div>
        </Card>

        <Card title="Idle time — ztracená kapacita" subtitle={`Při utilizaci ${avgUtilization.toFixed(0)} %`} accent={C.red}
          action={<AlertCircle size={14} color={C.red} />}>
          <div className="text-center py-4">
            <div className="text-3xl font-bold font-mono tabular-nums" style={{ color: C.red }}>
              {fmtCZK(fin.idleCost)}
            </div>
            <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: C.muted }}>
              Náklady při neobsazenosti
            </div>
          </div>
          <div className="space-y-2 mt-2">
            <div className="flex justify-between text-[11px]">
              <span style={{ color: C.muted }}>Nevyužité hodiny</span>
              <span className="font-mono tabular-nums font-bold" style={{ color: C.text }}>{fin.idleH.toFixed(1)} h</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span style={{ color: C.muted }}>Fixní náklad / h</span>
              <span className="font-mono tabular-nums" style={{ color: C.text }}>{fmtCZK(fin.fixedIdleCostPerHour, false)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span style={{ color: C.muted }}>Optimalizovatelné</span>
              <span className="font-mono tabular-nums font-bold" style={{ color: C.green }}>
                ~{fmtCZK(fin.idleCost * 0.55)}
              </span>
            </div>
          </div>
          <div className="mt-3 p-2 rounded-md text-[10px]" style={{ background: `${C.red}0d`, border: `1px solid ${C.red}30`, color: C.red }}>
            Doporučení: zlepšení Block Utilization na 80 % uspoří odhadem {fmtCZK(fin.idleCost * 0.4)}.
          </div>
        </Card>

        <Card title="Přesčasové náklady" subtitle="Personál nad standardní pracovní dobu" accent={C.orange}
          action={<Clock4 size={14} color={C.orange} />}>
          <div className="text-center py-4">
            <div className="text-3xl font-bold font-mono tabular-nums" style={{ color: C.orange }}>
              {fmtCZK(fin.overtimeCost)}
            </div>
            <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: C.muted }}>
              Celkem za období
            </div>
          </div>
          <div className="space-y-2 mt-2">
            <div className="flex justify-between text-[11px]">
              <span style={{ color: C.muted }}>Přesčas. hodin</span>
              <span className="font-mono tabular-nums font-bold" style={{ color: C.text }}>{fin.overtimeHours.toFixed(1)} h</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span style={{ color: C.muted }}>Sazba (s 50 % příplatek)</span>
              <span className="font-mono tabular-nums" style={{ color: C.text }}>
                {fmtCZK(fin.overtimeRate * 1.5, false)}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span style={{ color: C.muted }}>% revenue</span>
              <span className="font-mono tabular-nums" style={{ color: C.text }}>
                {(fin.overtimeCost / fin.totalRevenue * 100).toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="mt-3 p-2 rounded-md text-[10px]" style={{ background: `${C.orange}0d`, border: `1px solid ${C.orange}30`, color: C.orange }}>
            {fin.overtimeHours > rooms.length * 3
              ? 'Vysoké přesčasy — zvážit posílení směn'
              : 'Přesčasy v normálním pásmu'}
          </div>
        </Card>
      </div>

      {/* ── Revenue vs Cost trend ── */}
      <Card title="Revenue vs. Cost — trend (30 dní)" subtitle="Denní vývoj tržeb a nákladů" accent={C.green}>
        <div className="h-[260px] mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={fin.revenueTrend.map((v, i) => ({
              day: `D${i + 1}`,
              revenue: v,
              cost: fin.costTrend[i],
              margin: v - fin.costTrend[i],
            }))}>
              <defs>
                <linearGradient id="revBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.green} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={C.green} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" stroke={C.muted} fontSize={9} tickLine={false} axisLine={false} interval={3} />
              <YAxis stroke={C.muted} fontSize={9} tickLine={false} axisLine={false}
                tickFormatter={(v) => fmtCZK(v)} />
              <Tooltip
                contentStyle={{ background: '#0a0a0a', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }}
                formatter={(v: number, name: string) => [
                  fmtCZK(v),
                  name === 'revenue' ? 'Revenue' : name === 'cost' ? 'Cost' : 'Margin',
                ]}
              />
              <Bar dataKey="revenue" fill="url(#revBar)" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="cost" stroke={C.orange} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="margin" stroke={C.accent} strokeWidth={2} strokeDasharray="3 3" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="p-2 rounded-md text-center" style={{ background: C.surface }}>
            <div className="flex items-center justify-center gap-1 text-[9px] uppercase" style={{ color: C.muted }}>
              <span className="w-2 h-2 rounded-full" style={{ background: C.green }} />Revenue
            </div>
            <div className="text-sm font-bold font-mono tabular-nums mt-0.5" style={{ color: C.green }}>
              {fmtCZK(fin.totalRevenue)}
            </div>
          </div>
          <div className="p-2 rounded-md text-center" style={{ background: C.surface }}>
            <div className="flex items-center justify-center gap-1 text-[9px] uppercase" style={{ color: C.muted }}>
              <span className="w-2 h-2 rounded-full" style={{ background: C.orange }} />Cost
            </div>
            <div className="text-sm font-bold font-mono tabular-nums mt-0.5" style={{ color: C.orange }}>
              {fmtCZK(fin.totalCost)}
            </div>
          </div>
          <div className="p-2 rounded-md text-center" style={{ background: C.surface }}>
            <div className="flex items-center justify-center gap-1 text-[9px] uppercase" style={{ color: C.muted }}>
              <span className="w-2 h-2 rounded-full" style={{ background: C.accent }} />Margin
            </div>
            <div className="text-sm font-bold font-mono tabular-nums mt-0.5" style={{ color: C.accent }}>
              {fmtCZK(fin.contributionMargin)}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Finance KPI strip dole ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <MetricTile
          label="Revenue / case"
          value={fmtCZK(fin.avgRevenuePerCase)}
          color={C.green}
          icon={Wallet}
          delta={computeDelta(fin.avgRevenuePerCase, seededPreviousValue('rpc', fin.avgRevenuePerCase, 0.1))}
        />
        <MetricTile
          label="Cost / case"
          value={fmtCZK(fin.costPerCase)}
          color={C.orange}
          icon={Receipt}
          delta={computeDelta(fin.costPerCase, seededPreviousValue('cpc', fin.costPerCase, 0.1))}
          invertedDelta
        />
        <MetricTile
          label="Margin / case"
          value={fmtCZK(fin.avgRevenuePerCase - fin.costPerCase)}
          color={C.accent}
          icon={PiggyBank}
        />
        <MetricTile
          label="DRG CMI"
          value={fin.cmi.toFixed(2)}
          color={C.purple}
          icon={BadgePercent}
          sublabel="Case Mix Index"
        />
        <MetricTile
          label="Implants spend"
          value={fmtCZK(fin.implantCost)}
          color="#A78BFA"
          icon={CreditCard}
          sublabel={`${fin.implantPct.toFixed(0)} % revenue`}
        />
        <MetricTile
          label="Materials spend"
          value={fmtCZK(fin.materialCost)}
          color={C.green}
          icon={Coins}
          sublabel={`${fin.materialPct.toFixed(0)} % revenue`}
        />
      </div>
    </div>
  );
};
