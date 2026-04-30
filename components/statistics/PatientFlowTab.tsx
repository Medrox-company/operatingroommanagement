/**
 * Patient Flow Tab — průtok a demografie pacientů.
 *
 * Zobrazuje:
 *   • Funnel: Admit → Pre-op → OR → PACU → Discharge
 *   • Demografie: věkové skupiny, pohlaví, BMI distribuce
 *   • ASA classification (I-V) — fyzický stav před výkonem
 *   • Length of Stay distribuce
 *   • Same-day discharge rate
 *   • Pre-op holding time, PACU dwell time
 *   • Patient origin (akutní, plánovaní, překlady)
 *   • Top diagnózy (ICD-10)
 *
 * Hodnoty deterministické z hashe pro stable mezi rendery.
 */

'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import {
  Users, Stethoscope, Clock, BedDouble, ArrowRightLeft, BabyIcon,
  Activity, ClipboardList, FileBarChart, Heart, UserCheck,
} from 'lucide-react';
import type { OperatingRoom } from '../../types';
import {
  C, Card, MetricTile, FunnelChart, StackedBar, CategoryBarList,
  ComplianceMeter, hashStr, formatNumber,
} from './shared';

interface PatientFlowTabProps {
  rooms: OperatingRoom[];
  totalOps: number;
  periodLabel: string;
}

export const PatientFlowTab: React.FC<PatientFlowTabProps> = ({ rooms, totalOps, periodLabel }) => {
  // ── Pacientská data (deterministicky generovaná) ──────────────────────────
  const data = useMemo(() => {
    const seed = `pflow-${rooms.length}-${periodLabel}-${totalOps}`;
    const h = (k: string) => hashStr(`${seed}-${k}`);

    // Funnel — drop-off mezi fázemi
    const admitted   = totalOps + Math.round(h('admit-extra') * 8);  // pacienti přijatí
    const preOp      = Math.round(admitted * (0.96 + h('preop') * 0.03));      // 96-99 % se dostane do pre-op
    const inOR       = Math.round(preOp * (0.97 + h('or') * 0.025));           // 97-99.5 % do OR
    const pacu       = Math.round(inOR * (0.99 + h('pacu') * 0.009));          // 99-99.9 % do PACU
    const discharged = Math.round(pacu * (0.94 + h('disch') * 0.05));          // 94-99 % discharged
    const transferred= pacu - discharged;

    // Časy
    const avgPreOpHolding = 28 + h('preop-time') * 24;     // 28-52 min
    const avgORtime       = 95 + h('or-time') * 50;        // 95-145 min
    const avgPACU         = 72 + h('pacu-time') * 38;      // 72-110 min
    const totalThroughput = avgPreOpHolding + avgORtime + avgPACU; // total OR pathway

    // ASA Physical Status Classification
    const asaTotal = 100;
    const asaI    = 18 + h('asa1') * 6;   // 18-24 % (zdravý)
    const asaII   = 38 + h('asa2') * 8;   // 38-46 % (mírná systémová)
    const asaIII  = 26 + h('asa3') * 6;   // 26-32 % (závažná systémová)
    const asaIV   = 6 + h('asa4') * 3;    // 6-9 % (život ohrožující)
    const asaV    = 0.5 + h('asa5') * 1.5;// 0.5-2 % (moribund)
    const asaE    = 1 + h('asaE') * 2;    // emergency suffix
    const asaSum  = asaI + asaII + asaIII + asaIV + asaV + asaE;
    const norm = (p: number) => (p / asaSum) * 100;

    // Pohlaví
    const malePct = 46 + h('gender') * 8;
    const femalePct = 100 - malePct;

    // Věkové skupiny (decade bins)
    const ageGroups = [
      { label: '0-9',   value: Math.round(totalOps * (0.04 + h('age-0') * 0.02)) },
      { label: '10-19', value: Math.round(totalOps * (0.05 + h('age-1') * 0.02)) },
      { label: '20-29', value: Math.round(totalOps * (0.07 + h('age-2') * 0.02)) },
      { label: '30-39', value: Math.round(totalOps * (0.10 + h('age-3') * 0.03)) },
      { label: '40-49', value: Math.round(totalOps * (0.13 + h('age-4') * 0.03)) },
      { label: '50-59', value: Math.round(totalOps * (0.18 + h('age-5') * 0.04)) },
      { label: '60-69', value: Math.round(totalOps * (0.21 + h('age-6') * 0.04)) },
      { label: '70-79', value: Math.round(totalOps * (0.16 + h('age-7') * 0.04)) },
      { label: '80+',   value: Math.round(totalOps * (0.06 + h('age-8') * 0.02)) },
    ];

    // BMI distribuce
    const bmiUnder    = 4 + h('bmi-u') * 3;     // <18.5 (4-7 %)
    const bmiNormal   = 38 + h('bmi-n') * 7;    // 18.5-24.9 (38-45 %)
    const bmiOver     = 28 + h('bmi-o') * 6;    // 25-29.9 (28-34 %)
    const bmiObese    = 18 + h('bmi-ob') * 5;   // 30-39.9 (18-23 %)
    const bmiMorbid   = 4 + h('bmi-m') * 3;     // ≥40 (4-7 %)

    // Length of Stay
    const losDay      = 22 + h('los-d') * 8;    // <1 day (22-30 % same-day)
    const los1to3     = 35 + h('los1-3') * 8;
    const los4to7     = 26 + h('los4-7') * 6;
    const los8to14    = 12 + h('los8-14') * 4;
    const los15plus   = 4 + h('los15') * 2;
    const losSum      = losDay + los1to3 + los4to7 + los8to14 + los15plus;
    const avgLOS      = (losDay * 0.5 + los1to3 * 2 + los4to7 * 5.5 + los8to14 * 11 + los15plus * 20) / losSum;

    // Patient origin
    const elective    = 64 + h('elective') * 8;   // plánovaní
    const ups         = 20 + h('ups') * 6;        // ÚPS akutní
    const transfer    = 8 + h('xfer') * 4;        // překlady z jiných oddělení
    const dayCase     = 6 + h('day') * 3;         // jednodenní chirurgie
    const originSum   = elective + ups + transfer + dayCase;
    const normO = (p: number) => (p / originSum) * 100;

    // Same-day surgery rate (z výkonů kde to lze udělat)
    const sameDayRate = 28 + h('sds') * 12;

    // 30d readmission
    const readmission30d = 5 + h('readmit') * 4;

    // Top ICD-10 diagnoses
    const topDiagnoses = [
      { code: 'K35.8', name: 'Akutní apendicitida',                 count: Math.round(totalOps * 0.07 + h('k358') * 4) },
      { code: 'K80',   name: 'Cholelitiáza',                       count: Math.round(totalOps * 0.10 + h('k80') * 6) },
      { code: 'M17',   name: 'Gonartróza',                        count: Math.round(totalOps * 0.06 + h('m17') * 4) },
      { code: 'M16',   name: 'Koxartróza',                        count: Math.round(totalOps * 0.07 + h('m16') * 4) },
      { code: 'K40',   name: 'Tříselná kýla',                     count: Math.round(totalOps * 0.06 + h('k40') * 4) },
      { code: 'C18',   name: 'Karcinom tlustého střeva',          count: Math.round(totalOps * 0.04 + h('c18') * 3) },
      { code: 'N20',   name: 'Močové konkrementy',                count: Math.round(totalOps * 0.04 + h('n20') * 3) },
      { code: 'I65',   name: 'Karotidní stenóza',                 count: Math.round(totalOps * 0.03 + h('i65') * 2) },
      { code: 'C50',   name: 'Karcinom prsu',                     count: Math.round(totalOps * 0.03 + h('c50') * 3) },
      { code: 'S82',   name: 'Zlomenina lýtkové kosti',           count: Math.round(totalOps * 0.05 + h('s82') * 4) },
    ].sort((a, b) => b.count - a.count);

    return {
      admitted, preOp, inOR, pacu, discharged, transferred,
      avgPreOpHolding, avgORtime, avgPACU, totalThroughput,
      asaI: norm(asaI), asaII: norm(asaII), asaIII: norm(asaIII),
      asaIV: norm(asaIV), asaV: norm(asaV), asaE: norm(asaE),
      malePct, femalePct,
      ageGroups,
      bmiUnder, bmiNormal, bmiOver, bmiObese, bmiMorbid,
      losDay: (losDay / losSum) * 100,
      los1to3: (los1to3 / losSum) * 100,
      los4to7: (los4to7 / losSum) * 100,
      los8to14: (los8to14 / losSum) * 100,
      los15plus: (los15plus / losSum) * 100,
      avgLOS,
      elective: normO(elective), ups: normO(ups), transfer: normO(transfer), dayCase: normO(dayCase),
      sameDayRate, readmission30d,
      topDiagnoses,
    };
  }, [rooms.length, totalOps, periodLabel]);

  return (
    <div className="space-y-4">
      {/* ── Hero KPI strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <MetricTile
          label="Pacienti / period"
          value={formatNumber(data.admitted)}
          color={C.accent}
          icon={Users}
        />
        <MetricTile
          label="Same-day rate"
          value={`${data.sameDayRate.toFixed(0)}%`}
          color={data.sameDayRate > 35 ? C.green : C.yellow}
          icon={UserCheck}
          sublabel="Jednodenní chirurgie"
        />
        <MetricTile
          label="Avg LOS"
          value={`${data.avgLOS.toFixed(1)}d`}
          color={C.purple}
          icon={BedDouble}
          sublabel="Length of Stay"
        />
        <MetricTile
          label="Pre-op holding"
          value={`${Math.round(data.avgPreOpHolding)} min`}
          color={C.yellow}
          icon={Clock}
          sublabel="Před výkonem"
          invertedDelta
        />
        <MetricTile
          label="PACU dwell"
          value={`${Math.round(data.avgPACU)} min`}
          color={C.orange}
          icon={Activity}
          sublabel="Dospávací oddělení"
          invertedDelta
        />
        <MetricTile
          label="30d readmise"
          value={`${data.readmission30d.toFixed(1)}%`}
          color={data.readmission30d < 7 ? C.green : C.yellow}
          icon={ArrowRightLeft}
          invertedDelta
          sublabel="Rehospitalizace"
        />
      </div>

      {/* ── Patient Flow Funnel + Patient Origin ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card title="Patient flow funnel" subtitle="Průchod systémem (Admit → Discharge)" accent={C.accent} className="lg:col-span-2">
          <div className="mt-3">
            <FunnelChart
              stages={[
                { label: 'Admitted',   value: data.admitted,    color: C.accent,  sublabel: 'Příjem na oddělení' },
                { label: 'Pre-op',     value: data.preOp,       color: C.blue,    sublabel: `Avg ${Math.round(data.avgPreOpHolding)} min holding` },
                { label: 'In OR',      value: data.inOR,        color: C.purple,  sublabel: `Avg ${Math.round(data.avgORtime)} min na sále` },
                { label: 'PACU',       value: data.pacu,        color: C.orange,  sublabel: `Avg ${Math.round(data.avgPACU)} min` },
                { label: 'Discharged', value: data.discharged,  color: C.green,   sublabel: 'Pacient propuštěn' },
              ]}
            />
          </div>
          <div className="mt-3 pt-3 grid grid-cols-3 gap-2 text-[10px]" style={{ borderTop: `1px solid ${C.border}` }}>
            <div>
              <div style={{ color: C.muted }}>Total throughput time</div>
              <div className="font-bold mt-0.5" style={{ color: C.text }}>
                <span className="font-mono tabular-nums">{Math.round(data.totalThroughput)}</span> min
              </div>
            </div>
            <div>
              <div style={{ color: C.muted }}>Conversion (Admit → Discharge)</div>
              <div className="font-bold mt-0.5" style={{ color: C.green }}>
                <span className="font-mono tabular-nums">{((data.discharged / data.admitted) * 100).toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <div style={{ color: C.muted }}>Překlady na ICU</div>
              <div className="font-bold mt-0.5" style={{ color: C.yellow }}>
                <span className="font-mono tabular-nums">{data.transferred}</span> pacientů
              </div>
            </div>
          </div>
        </Card>

        <Card title="Původ pacientů" subtitle="Typ příjmu" accent={C.purple}>
          <div className="space-y-3 mt-2">
            <ComplianceMeter label="Plánovaní (elektivní)" value={data.elective} target={70} />
            <ComplianceMeter label="Akutní (ÚPS)"          value={data.ups}      target={20} inverted />
            <ComplianceMeter label="Překlady (transfer)"   value={data.transfer} target={10} inverted />
            <ComplianceMeter label="Jednodenní chirurgie"  value={data.dayCase}  target={15} />
          </div>
          <div className="mt-3 pt-3 text-[10px]" style={{ borderTop: `1px solid ${C.border}`, color: C.muted }}>
            Vyšší podíl elektivních = lepší plánovatelnost. Akutní výkony nad 25 % vyžadují flexibilní rezervu kapacity.
          </div>
        </Card>
      </div>

      {/* ── Demographics: ASA + Gender + Age + BMI ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* ASA Classification */}
        <Card title="ASA Physical Status" subtitle="Fyzický stav před výkonem" accent={C.red}>
          <div className="space-y-2 mt-2">
            {[
              { l: 'I',   d: 'Zdravý pacient',                       v: data.asaI,   c: '#10B981' },
              { l: 'II',  d: 'Mírná systémová nemoc',                v: data.asaII,  c: '#FBBF24' },
              { l: 'III', d: 'Závažná systémová nemoc',              v: data.asaIII, c: '#F97316' },
              { l: 'IV',  d: 'Život ohrožující systémová nemoc',     v: data.asaIV,  c: '#EF4444' },
              { l: 'V',   d: 'Moribund (nepřežije bez operace)',     v: data.asaV,   c: '#7F1D1D' },
              { l: 'E',   d: 'Emergency suffix',                     v: data.asaE,   c: '#A78BFA' },
            ].map((row) => (
              <div key={row.l}>
                <div className="flex items-center gap-2 text-[11px] mb-1">
                  <div className="w-7 text-center font-bold rounded px-1 py-0.5 shrink-0"
                    style={{ background: `${row.c}25`, color: row.c }}>
                    {row.l}
                  </div>
                  <div className="flex-1 truncate" style={{ color: C.text }}>{row.d}</div>
                  <div className="font-mono tabular-nums shrink-0 font-bold" style={{ color: row.c }}>
                    {row.v.toFixed(1)}%
                  </div>
                </div>
                <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: C.surface }}>
                  <div className="h-full rounded-full" style={{ width: `${row.v}%`, background: row.c }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 text-[10px]" style={{ borderTop: `1px solid ${C.border}`, color: C.muted }}>
            ASA III+ vyžaduje vyšší peri-operativní monitoring a delší ICU readiness.
          </div>
        </Card>

        {/* Gender + BMI */}
        <Card title="Demografie" subtitle="Pohlaví a BMI distribuce" accent={C.pink}>
          {/* Gender pie */}
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: C.muted }}>Pohlaví</div>
            <div className="flex items-center gap-3">
              <div className="w-20 h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[
                      { name: 'Muži',  value: data.malePct },
                      { name: 'Ženy', value: data.femalePct },
                    ]} dataKey="value" innerRadius={26} outerRadius={38} paddingAngle={2}>
                      <Cell fill={C.blue} stroke="#0a0a0a" strokeWidth={1} />
                      <Cell fill={C.pink} stroke="#0a0a0a" strokeWidth={1} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ background: C.blue }} />
                    <span style={{ color: C.text }}>Muži</span>
                  </div>
                  <span className="font-mono tabular-nums font-bold" style={{ color: C.blue }}>
                    {data.malePct.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ background: C.pink }} />
                    <span style={{ color: C.text }}>Ženy</span>
                  </div>
                  <span className="font-mono tabular-nums font-bold" style={{ color: C.pink }}>
                    {data.femalePct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BMI distribuce */}
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: C.muted }}>BMI distribuce</div>
            <StackedBar
              segments={[
                { label: 'Podváha (<18.5)', value: data.bmiUnder, color: '#06B6D4' },
                { label: 'Norma (18.5-24.9)', value: data.bmiNormal, color: '#10B981' },
                { label: 'Nadváha (25-29.9)', value: data.bmiOver, color: '#FBBF24' },
                { label: 'Obezita (30-39.9)', value: data.bmiObese, color: '#F97316' },
                { label: 'Morbid (≥40)', value: data.bmiMorbid, color: '#EF4444' },
              ]}
              height={12}
              showLegend={false}
              formatValue={(v) => `${v.toFixed(1)}%`}
            />
            <div className="mt-2 grid grid-cols-5 gap-1 text-[9px]" style={{ color: C.muted }}>
              {[
                { l: 'Podv.', c: '#06B6D4', v: data.bmiUnder },
                { l: 'Norma', c: '#10B981', v: data.bmiNormal },
                { l: 'Nadv.', c: '#FBBF24', v: data.bmiOver },
                { l: 'Obéz.', c: '#F97316', v: data.bmiObese },
                { l: 'Morb.', c: '#EF4444', v: data.bmiMorbid },
              ].map((b, i) => (
                <div key={i} className="text-center">
                  <div className="font-bold font-mono tabular-nums" style={{ color: b.c }}>{b.v.toFixed(1)}%</div>
                  <div>{b.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-3 text-[10px]" style={{ borderTop: `1px solid ${C.border}`, color: C.muted }}>
            Avg BMI: <strong style={{ color: C.text }}>
              {(18.5 * data.bmiUnder / 100 + 22 * data.bmiNormal / 100 + 27.5 * data.bmiOver / 100 + 35 * data.bmiObese / 100 + 42 * data.bmiMorbid / 100).toFixed(1)}
            </strong>
            {' • '}Obezita zvyšuje riziko komplikací — dlouhodobé sledování.
          </div>
        </Card>

        {/* Age distribution */}
        <Card title="Věková distribuce" subtitle="Pacientské skupiny" accent={C.accent}>
          <div className="h-[200px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ageGroups} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                <defs>
                  <linearGradient id="ageBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.accent} stopOpacity={1} />
                    <stop offset="100%" stopColor={C.accent} stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="label" stroke={C.muted} fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke={C.muted} fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0a0a0a', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="value" fill="url(#ageBar)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 pt-2 grid grid-cols-3 gap-2 text-[10px]" style={{ borderTop: `1px solid ${C.border}` }}>
            <div>
              <div style={{ color: C.muted }}>Senior (≥60)</div>
              <div className="font-bold mt-0.5 font-mono tabular-nums" style={{ color: C.purple }}>
                {((data.ageGroups[6].value + data.ageGroups[7].value + data.ageGroups[8].value) / data.admitted * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <div style={{ color: C.muted }}>Pediatričtí</div>
              <div className="font-bold mt-0.5 font-mono tabular-nums" style={{ color: C.pink }}>
                {((data.ageGroups[0].value + data.ageGroups[1].value) / data.admitted * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <div style={{ color: C.muted }}>Produkt.</div>
              <div className="font-bold mt-0.5 font-mono tabular-nums" style={{ color: C.green }}>
                {((data.ageGroups[3].value + data.ageGroups[4].value + data.ageGroups[5].value) / data.admitted * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── LOS distribuce + Top diagnózy ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card title="Length of Stay distribuce" subtitle={`Avg ${data.avgLOS.toFixed(1)} dní`} accent={C.purple}>
          <div className="space-y-2.5 mt-2">
            {[
              { l: 'Same day (<24h)',  v: data.losDay,    c: C.green,   d: 'Jednodenní chirurgie' },
              { l: '1-3 dny',          v: data.los1to3,   c: C.accent,  d: 'Krátkodobá hospitalizace' },
              { l: '4-7 dní',          v: data.los4to7,   c: C.yellow,  d: 'Standard' },
              { l: '8-14 dní',         v: data.los8to14,  c: C.orange,  d: 'Komplikované' },
              { l: '15+ dní',          v: data.los15plus, c: C.red,     d: 'Long-term / komplikace' },
            ].map((row, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm" style={{ background: row.c }} />
                    <span style={{ color: C.text }} className="font-medium">{row.l}</span>
                    <span style={{ color: C.muted }} className="text-[9px]">{row.d}</span>
                  </div>
                  <span className="font-mono tabular-nums text-[11px] font-bold" style={{ color: row.c }}>
                    {row.v.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: C.surface }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${row.v}%`, background: `linear-gradient(90deg, ${row.c}99, ${row.c})` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Top 10 diagnóz (ICD-10)" subtitle="Nejčastější důvod výkonu" accent={C.accent}>
          <CategoryBarList
            items={data.topDiagnoses.map((d, i) => ({
              label: d.name,
              value: d.count,
              color: i === 0 ? C.accent : i === 1 ? C.purple : i === 2 ? C.green : C.text,
              sublabel: d.code,
            }))}
            formatValue={(v) => formatNumber(v)}
          />
        </Card>
      </div>

      {/* ── Časy fáze flow ── */}
      <Card title="Časová analýza pacientského flow" subtitle="Průměry jednotlivých fází (min)" accent={C.yellow}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-2">
          {[
            { label: 'Pre-op holding', value: data.avgPreOpHolding, target: 30, color: C.yellow, icon: Clock,
              desc: 'Příprava před výkonem (převzetí, kontroly, příprava lékaře)' },
            { label: 'Operační čas',   value: data.avgORtime,        target: 120, color: C.purple, icon: Stethoscope,
              desc: 'Čas na sále od řezu po sutury' },
            { label: 'PACU dwell',     value: data.avgPACU,          target: 90, color: C.orange, icon: Activity,
              desc: 'Dospávací oddělení (recovery)' },
            { label: 'Total throughput', value: data.totalThroughput,target: 240, color: C.accent, icon: ClipboardList,
              desc: 'Pre-op + OR + PACU dohromady' },
          ].map((m, i) => {
            const Icon = m.icon;
            const onTarget = m.value <= m.target;
            return (
              <div key={i} className="rounded-lg p-3" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="rounded-md p-1.5" style={{ background: `${m.color}15` }}>
                    <Icon size={14} color={m.color} strokeWidth={2.2} />
                  </div>
                  <div className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                    style={{ background: `${onTarget ? C.green : C.red}15`, color: onTarget ? C.green : C.red }}>
                    {onTarget ? 'Na cíli' : 'Nad cílem'}
                  </div>
                </div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>{m.label}</div>
                <div className="text-2xl font-bold font-mono tabular-nums my-1" style={{ color: m.color }}>
                  {Math.round(m.value)}<span className="text-sm" style={{ color: C.muted }}>min</span>
                </div>
                <div className="text-[9px]" style={{ color: C.muted }}>
                  Cíl: <span className="font-mono tabular-nums">{m.target} min</span>
                </div>
                <div className="text-[9px] mt-1" style={{ color: C.muted }}>{m.desc}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
