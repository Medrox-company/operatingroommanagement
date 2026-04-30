/**
 * Equipment & Supply Tab — zařízení, sterilizace a sklady.
 *
 * Zobrazuje:
 *   • Sterilizace cycle stats (úspěšné/neúspěšné, BowieDick, Helix test)
 *   • Instrument set turnover (kolikrát denně se otáčí)
 *   • Equipment uptime / breakdowns
 *   • Robot / laparoscopic věž využití
 *   • Implant inventory (TEP-H, TEP-K, sítě, šrouby)
 *   • Disposables consumption
 *   • Low-stock alerts
 *   • Maintenance schedule
 *
 * Data jsou deterministicky generovaná z hashů.
 */

'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, ComposedChart, Line,
} from 'recharts';
import {
  Wrench, ShieldAlert, FlaskConical, Boxes, AlertTriangle, CheckCircle2,
  Battery, Cpu, Package, RotateCw, PackageX, Calendar,
} from 'lucide-react';
import type { OperatingRoom } from '../../types';
import {
  C, Card, MetricTile, ComplianceMeter, CategoryBarList, EventFeed,
  hashStr, formatNumber, generateSeededTrend,
} from './shared';

interface EquipmentTabProps {
  rooms: OperatingRoom[];
  totalOps: number;
  periodLabel: string;
}

export const EquipmentTab: React.FC<EquipmentTabProps> = ({ rooms, totalOps, periodLabel }) => {
  const data = useMemo(() => {
    const seed = `equip-${rooms.length}-${periodLabel}-${totalOps}`;
    const h = (k: string) => hashStr(`${seed}-${k}`);

    // Sterilizace
    const sterileCyclesTotal     = Math.round(totalOps * 1.4 + h('cyc-tot') * 20);
    const sterileSuccessRate     = 98 + h('sterile-success') * 1.8;     // 98-99.8 %
    const sterileFailures        = Math.round(sterileCyclesTotal * (100 - sterileSuccessRate) / 100);
    const bowieDickSuccess       = 99 + h('bowie') * 1;                  // 99-100 %
    const helixSuccess           = 97 + h('helix') * 2.5;                // 97-99.5 %
    const turnaroundTimeMin      = 92 + h('turnaround') * 28;            // 92-120 min sterilization cycle

    // Equipment uptime (laparoskopické věže, robot, anestezie, monitorování)
    const laparoscopicUptime     = 96 + h('lap-up') * 3.5;
    const robotUptime            = 92 + h('rob-up') * 6;
    const anesthesiaUptime       = 99 + h('anest-up') * 1;
    const monitoringUptime       = 99.5 + h('mon-up') * 0.5;
    const xrayUptime             = 95 + h('xray-up') * 4;
    const overallUptime          = (laparoscopicUptime + robotUptime + anesthesiaUptime + monitoringUptime + xrayUptime) / 5;

    // Breakdown events
    const breakdownEvents        = Math.round(2 + h('break-evt') * 6);   // 2-8 incidentů
    const totalDowntimeH         = breakdownEvents * (1.5 + h('downtime') * 4);

    // Instrument set turnover (kolikrát denně se set otočí)
    const instrumentSets = [
      { name: 'Laparoskopický základní',   count: 12, used: 38 + Math.round(h('lap-bas') * 12) },
      { name: 'Ortopedický TEP set',       count: 6,  used: 14 + Math.round(h('ort-tep') * 6) },
      { name: 'Cévní chirurgie',           count: 4,  used: 8 + Math.round(h('vasc') * 4) },
      { name: 'Apendektomie set',          count: 8,  used: 22 + Math.round(h('app-set') * 6) },
      { name: 'Cholecystektomie set',      count: 8,  used: 24 + Math.round(h('chol-set') * 8) },
      { name: 'Urologický endoskopický',   count: 5,  used: 12 + Math.round(h('uro') * 5) },
      { name: 'Neurochirurgický set',      count: 3,  used: 5 + Math.round(h('neuro') * 3) },
      { name: 'Hrudní chirurgie',          count: 3,  used: 4 + Math.round(h('thor') * 3) },
    ];
    instrumentSets.forEach(s => s.used = Math.min(s.count * 7, s.used));

    // Implant inventory
    const implants = [
      { name: 'TEP kyčle (Cementovaná)',   stock: 12 + Math.round(h('tep-h-c') * 5),  used: 6 + Math.round(h('tep-h-c-u') * 4),  alert: 'low' },
      { name: 'TEP kyčle (Bezcement.)',     stock: 18 + Math.round(h('tep-h-nc') * 6), used: 9 + Math.round(h('tep-h-nc-u') * 4) },
      { name: 'TEP kolene (Cementovaná)',   stock: 14 + Math.round(h('tep-k-c') * 5),  used: 8 + Math.round(h('tep-k-c-u') * 4) },
      { name: 'TEP kolene (Bezcement.)',    stock: 9 + Math.round(h('tep-k-nc') * 4),  used: 5 + Math.round(h('tep-k-nc-u') * 3) },
      { name: 'Hernie síťka (Tříslo)',      stock: 42 + Math.round(h('hernia-i') * 15),used: 26 + Math.round(h('hernia-i-u') * 8) },
      { name: 'Hernie síťka (Břišní)',      stock: 16 + Math.round(h('hernia-a') * 8), used: 9 + Math.round(h('hernia-a-u') * 5) },
      { name: 'Šrouby (titanové)',          stock: 88 + Math.round(h('screws') * 25),  used: 52 + Math.round(h('screws-u') * 18) },
      { name: 'Pacemaker',                  stock: 4 + Math.round(h('pace') * 2),      used: 1 + Math.round(h('pace-u') * 2),    alert: 'low' },
      { name: 'Stenty (cévní)',             stock: 22 + Math.round(h('stent') * 10),   used: 11 + Math.round(h('stent-u') * 6) },
      { name: 'Cévní protézy (Dacron)',     stock: 8 + Math.round(h('graft') * 3),     used: 3 + Math.round(h('graft-u') * 2) },
    ];

    // Disposables (jednorázové) — výrazná spotřeba
    const disposables = [
      { name: 'Sterilní pláště',           used: Math.round(totalOps * 4.5 + h('gowns') * 50),     budget: 250000 },
      { name: 'Rukavice sterilní (páry)',  used: Math.round(totalOps * 8 + h('gloves') * 80),     budget: 180000 },
      { name: 'Stapler náboje',            used: Math.round(totalOps * 1.2 + h('stapler') * 12),  budget: 420000 },
      { name: 'Energetické nástroje (hrot)', used: Math.round(totalOps * 0.8 + h('energy') * 10), budget: 380000 },
      { name: 'Šicí materiál (vlákna)',     used: Math.round(totalOps * 6 + h('suture') * 60),     budget: 95000 },
      { name: 'Krycí materiál & roušky',    used: Math.round(totalOps * 2.4 + h('drapes') * 30),  budget: 65000 },
    ];

    // Stock alerts
    const lowStockItems = implants.filter(i => i.alert === 'low').length
                        + (disposables.some(d => d.used > d.budget * 0.92) ? 1 : 0);
    const reorderPending = 2 + Math.round(h('reorder') * 3);

    // Sterilizace trend (denní úspěšnost)
    const sterileTrend = generateSeededTrend(`${seed}-sterile-trend`, 14, sterileSuccessRate, 0.012);

    // Maintenance schedule
    const maintenanceItems = [
      { name: 'Laparoskopická věž 1',       due: 'Dnes',         priority: 'high'    as const },
      { name: 'Anesteziologický stroj 3',    due: 'Zítra',        priority: 'medium'  as const },
      { name: 'Robot da Vinci',              due: 'Za 3 dny',     priority: 'medium'  as const },
      { name: 'C-rameno',                    due: 'Za 5 dní',    priority: 'low'     as const },
      { name: 'Sterilizační autokláv 2',     due: 'Za 7 dní',    priority: 'low'     as const },
      { name: 'Defibrilátor (sál 4)',        due: 'Za 12 dní',   priority: 'low'     as const },
    ];

    return {
      sterileCyclesTotal, sterileSuccessRate, sterileFailures,
      bowieDickSuccess, helixSuccess, turnaroundTimeMin,
      laparoscopicUptime, robotUptime, anesthesiaUptime, monitoringUptime, xrayUptime, overallUptime,
      breakdownEvents, totalDowntimeH,
      instrumentSets, implants, disposables, lowStockItems, reorderPending,
      sterileTrend, maintenanceItems,
    };
  }, [rooms.length, totalOps, periodLabel]);

  // Maintenance events feed
  const maintenanceEvents = useMemo(() => {
    const now = Date.now();
    return data.maintenanceItems.map((item, i) => ({
      id: `m-${i}`,
      timestamp: new Date(now + (i + 1) * 1000 * 60 * 60 * 12).toISOString(),
      title: item.name,
      description: `Plánovaná údržba — ${item.due}`,
      severity: item.priority === 'high' ? 'critical' as const : item.priority === 'medium' ? 'warning' as const : 'info' as const,
      source: 'Maintenance',
    }));
  }, [data.maintenanceItems]);

  return (
    <div className="space-y-4">
      {/* ── Hero KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <MetricTile
          label="Equipment uptime"
          value={`${data.overallUptime.toFixed(1)}%`}
          color={data.overallUptime >= 97 ? C.green : C.yellow}
          icon={Battery}
          sublabel={`${data.breakdownEvents} výpadků / period`}
        />
        <MetricTile
          label="Sterilizace úspěšnost"
          value={`${data.sterileSuccessRate.toFixed(2)}%`}
          color={C.green}
          icon={FlaskConical}
          sublabel={`${data.sterileFailures} fail / ${data.sterileCyclesTotal} cyklů`}
        />
        <MetricTile
          label="Cyklů celkem"
          value={formatNumber(data.sterileCyclesTotal)}
          color={C.accent}
          icon={RotateCw}
          sublabel="Sterilizace v období"
        />
        <MetricTile
          label="Avg turnaround"
          value={`${Math.round(data.turnaroundTimeMin)} min`}
          color={C.purple}
          icon={Wrench}
          sublabel="Cyklus sterilizace"
          invertedDelta
        />
        <MetricTile
          label="Low stock"
          value={data.lowStockItems}
          color={data.lowStockItems > 0 ? C.red : C.green}
          icon={PackageX}
          sublabel={`${data.reorderPending} reorder pending`}
        />
        <MetricTile
          label="Total downtime"
          value={`${data.totalDowntimeH.toFixed(1)} h`}
          color={data.totalDowntimeH < 8 ? C.green : C.red}
          icon={ShieldAlert}
          invertedDelta
          sublabel="Nedostupnost zařízení"
        />
      </div>

      {/* ── Equipment uptime + Sterilization ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card title="Uptime jednotlivých zařízení" subtitle="Dostupnost % v období" accent={C.green}>
          <div className="space-y-3 mt-2">
            <ComplianceMeter label="Laparoskopické věže (3 ks)"      value={data.laparoscopicUptime} target={97} />
            <ComplianceMeter label="Robot da Vinci"                  value={data.robotUptime}        target={94} />
            <ComplianceMeter label="Anesteziologické stroje (8 ks)"  value={data.anesthesiaUptime}   target={99} />
            <ComplianceMeter label="Monitorovací zařízení (12 ks)"   value={data.monitoringUptime}   target={99.5} />
            <ComplianceMeter label="C-rameno / RTG"                  value={data.xrayUptime}         target={95} />
          </div>
          <div className="mt-3 pt-3 text-[10px]" style={{ borderTop: `1px solid ${C.border}`, color: C.muted }}>
            Robot dostupnost = nejnižší — naplánovat preventivní údržbu mimo špičku.
          </div>
        </Card>

        <Card title="Sterilizace — quality control" subtitle="Standardní testy a cykly" accent={C.accent}>
          <div className="space-y-3 mt-2">
            <ComplianceMeter label="Bowie-Dick test (denní vakuum)"  value={data.bowieDickSuccess}   target={100} size="md" />
            <ComplianceMeter label="Helix test (PCD)"                value={data.helixSuccess}       target={99} size="md" />
            <ComplianceMeter label="Cycle success rate (overall)"    value={data.sterileSuccessRate} target={99} size="md" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="p-2 rounded-md text-center" style={{ background: C.surface }}>
              <div className="text-[9px] uppercase" style={{ color: C.muted }}>Úspěšné cykly</div>
              <div className="text-lg font-bold font-mono tabular-nums mt-0.5" style={{ color: C.green }}>
                {formatNumber(data.sterileCyclesTotal - data.sterileFailures)}
              </div>
            </div>
            <div className="p-2 rounded-md text-center" style={{ background: C.surface }}>
              <div className="text-[9px] uppercase" style={{ color: C.muted }}>Neúspěšné</div>
              <div className="text-lg font-bold font-mono tabular-nums mt-0.5" style={{ color: C.red }}>
                {formatNumber(data.sterileFailures)}
              </div>
            </div>
          </div>
          <div className="text-[10px] mt-3" style={{ color: C.muted }}>
            Selhání jsou recyklována, žádný kontaminovaný nástroj nedoručen na sál.
          </div>
        </Card>

        <Card title="Sterilizace trend (14 dní)" subtitle="Denní úspěšnost cyklů" accent={C.purple}>
          <div className="h-[200px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.sterileTrend.map((v, i) => ({ d: `D${i + 1}`, value: v }))}>
                <defs>
                  <linearGradient id="strGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.purple} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={C.purple} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="d" stroke={C.muted} fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke={C.muted} fontSize={9} tickLine={false} axisLine={false}
                  domain={[95, 100]} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                <Tooltip
                  contentStyle={{ background: '#0a0a0a', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => [`${v.toFixed(2)} %`, 'Úspěšnost']}
                />
                <Bar dataKey="value" fill="url(#strGrad)" radius={[2, 2, 0, 0]} />
                <Line type="monotone" dataKey="value" stroke={C.purple} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── Instrument turnover + Implants ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card title="Instrument set turnover" subtitle="Kolikrát byl set v období použit / kolik je celkem k dispozici" accent={C.accent}>
          <div className="space-y-2 mt-2">
            {data.instrumentSets.map((set, i) => {
              const utilization = (set.used / (set.count * 7)) * 100; // /period (max 7× za týden)
              const c = utilization > 80 ? C.red : utilization > 60 ? C.yellow : C.green;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1 text-[11px]">
                    <span style={{ color: C.text }} className="truncate flex-1">{set.name}</span>
                    <span className="font-mono tabular-nums shrink-0 ml-2" style={{ color: C.muted }}>
                      <span className="font-bold" style={{ color: c }}>{set.used}</span>/{set.count * 7}
                    </span>
                  </div>
                  <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: C.surface }}>
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(100, utilization)}%`,
                      background: `linear-gradient(90deg, ${c}66, ${c})`,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 grid grid-cols-3 gap-2 text-[10px]" style={{ borderTop: `1px solid ${C.border}` }}>
            <div>
              <div style={{ color: C.muted }}>Sety celkem</div>
              <div className="font-bold mt-0.5 font-mono tabular-nums" style={{ color: C.text }}>
                {data.instrumentSets.reduce((s, x) => s + x.count, 0)} ks
              </div>
            </div>
            <div>
              <div style={{ color: C.muted }}>Použití celkem</div>
              <div className="font-bold mt-0.5 font-mono tabular-nums" style={{ color: C.accent }}>
                {data.instrumentSets.reduce((s, x) => s + x.used, 0)}×
              </div>
            </div>
            <div>
              <div style={{ color: C.muted }}>Avg / set / period</div>
              <div className="font-bold mt-0.5 font-mono tabular-nums" style={{ color: C.green }}>
                {(data.instrumentSets.reduce((s, x) => s + x.used / x.count, 0) / data.instrumentSets.length).toFixed(1)}×
              </div>
            </div>
          </div>
        </Card>

        <Card title="Implant inventory" subtitle="Stav skladu × spotřeba v období" accent={C.purple}>
          <div className="space-y-2 mt-2">
            {data.implants.map((imp, i) => {
              const remaining = imp.stock - imp.used;
              const lowStock = remaining <= imp.stock * 0.2;
              return (
                <div key={i} className="flex items-center gap-2 text-[11px] py-1"
                  style={{ borderBottom: i < data.implants.length - 1 ? `1px dashed ${C.border}` : 'none' }}>
                  <div className="flex-1 truncate" style={{ color: C.text }}>{imp.name}</div>
                  <div className="font-mono tabular-nums shrink-0" style={{ color: C.muted }}>
                    {imp.used}/{imp.stock}
                  </div>
                  <div className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider`}
                    style={{
                      background: lowStock ? `${C.red}15` : `${C.green}15`,
                      color: lowStock ? C.red : C.green,
                    }}>
                    {lowStock ? `Low: ${remaining}` : `OK: ${remaining}`}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Disposables consumption + Maintenance schedule ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card title="Disposables — spotřeba v období" subtitle="Jednorázový materiál" accent={C.orange}>
          <CategoryBarList
            items={data.disposables.map((d) => {
              const pctBudget = (d.used / d.budget) * 100;
              const c = pctBudget > 92 ? C.red : pctBudget > 75 ? C.yellow : C.green;
              return {
                label: d.name,
                value: d.used,
                color: c,
                sublabel: `${pctBudget.toFixed(0)}%`,
              };
            })}
            formatValue={(v) => formatNumber(v) + ' ks'}
          />
          <div className="mt-3 pt-3 text-[10px]" style={{ borderTop: `1px solid ${C.border}`, color: C.muted }}>
            Spotřeba se odvíjí od počtu a typu výkonů. Procento ukazuje vyčerpání period budgetu.
          </div>
        </Card>

        <Card title="Plán údržby" subtitle="Nadcházející servisy a kontroly" accent={C.yellow}
          action={<Calendar size={14} color={C.yellow} />}>
          <EventFeed items={maintenanceEvents} maxItems={6} />
        </Card>
      </div>

      {/* ── Robot + Lap utilization charts ── */}
      <Card title="Specializovaná zařízení — denní využití" subtitle="Robot, laparoskopická věž, C-rameno" accent={C.purple}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
          {[
            {
              name: 'Robot da Vinci',
              icon: Cpu,
              utilization: 62 + hashStr(`${rooms.length}-rob-util`) * 25,
              cases: 8 + Math.round(hashStr(`${rooms.length}-rob-cases`) * 8),
              color: C.purple,
              status: 'Operativní',
            },
            {
              name: 'Laparoskopické věže',
              icon: Boxes,
              utilization: 78 + hashStr(`${rooms.length}-lap-util`) * 18,
              cases: 32 + Math.round(hashStr(`${rooms.length}-lap-cases`) * 18),
              color: C.accent,
              status: '3/3 aktivní',
            },
            {
              name: 'C-rameno (RTG)',
              icon: Cpu,
              utilization: 42 + hashStr(`${rooms.length}-xray-util`) * 22,
              cases: 12 + Math.round(hashStr(`${rooms.length}-xray-cases`) * 8),
              color: C.yellow,
              status: 'Přesunutelné',
            },
          ].map((eq, i) => {
            const Icon = eq.icon;
            return (
              <div key={i} className="rounded-lg p-3" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-md p-1.5" style={{ background: `${eq.color}18` }}>
                      <Icon size={14} color={eq.color} strokeWidth={2.2} />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold" style={{ color: C.text }}>{eq.name}</div>
                      <div className="text-[9px]" style={{ color: C.muted }}>{eq.status}</div>
                    </div>
                  </div>
                </div>
                <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: C.muted }}>
                  Využití kapacity
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums" style={{ color: eq.color }}>
                  {eq.utilization.toFixed(0)}%
                </div>
                <div className="w-full rounded-full h-1.5 mt-2 overflow-hidden" style={{ background: C.surface2 }}>
                  <div className="h-full rounded-full" style={{
                    width: `${eq.utilization}%`,
                    background: `linear-gradient(90deg, ${eq.color}66, ${eq.color})`,
                  }} />
                </div>
                <div className="text-[10px] mt-2" style={{ color: C.muted }}>
                  Výkonů v období: <span className="font-mono tabular-nums font-bold" style={{ color: C.text }}>{eq.cases}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Stock alerts ── */}
      {data.lowStockItems > 0 && (
        <Card title="Stock alerty" subtitle={`${data.lowStockItems} položek pod prahovou hodnotou`} accent={C.red}
          action={<AlertTriangle size={14} color={C.red} />}>
          <div className="space-y-2">
            {data.implants.filter(i => i.alert === 'low').map((item, i) => {
              const remaining = item.stock - item.used;
              return (
                <div key={i} className="flex items-center gap-3 p-2 rounded-md"
                  style={{ background: `${C.red}0d`, border: `1px solid ${C.red}30` }}>
                  <PackageX size={14} color={C.red} />
                  <div className="flex-1">
                    <div className="text-[11px] font-bold" style={{ color: C.text }}>{item.name}</div>
                    <div className="text-[10px]" style={{ color: C.muted }}>
                      Zbývá <span className="font-mono tabular-nums" style={{ color: C.red }}>{remaining}</span> ks
                      {' • '}Doporučeno objednat <span className="font-mono tabular-nums" style={{ color: C.text }}>{item.stock}</span> ks
                    </div>
                  </div>
                  <button className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider"
                    style={{ background: C.red, color: C.textHi }}>
                    Reorder
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
