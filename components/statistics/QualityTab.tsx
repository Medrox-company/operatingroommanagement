/**
 * Quality & Safety Tab — klinická kvalita a bezpečnost.
 *
 * Zobrazuje:
 *   • WHO Surgical Safety Checklist compliance (Sign-In, Time-Out, Sign-Out)
 *   • Surgical Site Infection (SSI) rate per 1000 výkonů
 *   • Mortality rate (intraoperativní + 30-day postoperativní)
 *   • Clavien-Dindo distribuce komplikací (I, II, III, IV, V)
 *   • Sentinel events / near-miss feed
 *   • Wrong-site / wrong-patient (zero-target) tracker
 *   • Hand hygiene compliance
 *   • Patient consent rate
 *
 * Data jsou generována deterministicky z hashů (seededPreviousValue, hashStr)
 * pro každého sála — pro stejný setup vždy stejné hodnoty.
 */

'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  ShieldCheck, AlertTriangle, HeartPulse, Stethoscope, FileCheck2,
  Activity, Skull, ClipboardCheck, Hand, Microscope,
} from 'lucide-react';
import type { OperatingRoom } from '../../types';
import {
  C, Card, ProgressRing, ComplianceMeter, MetricTile, EventFeed,
  CategoryBarList, StackedBar, SectionHeader, Sparkline, DeltaBadge,
  hashStr, seededPreviousValue, computeDelta, formatNumber, generateSeededTrend,
} from './shared';

interface QualityTabProps {
  rooms: OperatingRoom[];
  totalOps: number;
  periodLabel: string;
}

export const QualityTab: React.FC<QualityTabProps> = ({ rooms, totalOps, periodLabel }) => {
  // ── Compliance metriky (deterministic z hashů + reálných dat) ─────────────
  const data = useMemo(() => {
    const seed = `quality-${rooms.length}-${periodLabel}-${totalOps}`;
    const h = (k: string) => hashStr(`${seed}-${k}`);

    // WHO Safety Checklist — typicky 92-99% v dobré nemocnici
    const signIn      = 94 + h('sign-in') * 5;       // 94-99 %
    const timeOut     = 91 + h('time-out') * 7;      // 91-98 %
    const signOut     = 88 + h('sign-out') * 9;      // 88-97 %
    const checklistOverall = (signIn + timeOut + signOut) / 3;

    // SSI rate — typicky 1-3% globálně, varies podle wound class
    const cleanSSI       = 0.8 + h('clean-ssi') * 1.2;       // 0.8-2 %
    const cleanContSSI   = 2 + h('cc-ssi') * 2;              // 2-4 %
    const contaminatedSSI= 4 + h('cont-ssi') * 4;            // 4-8 %
    const dirtySSI       = 8 + h('dirty-ssi') * 8;           // 8-16 %
    const ssiOverall     = 1.2 + h('ssi-overall') * 1.5;     // overall ~1.2-2.7 %

    // Mortality — intraop velmi nízké (<0.1%), 30-day cca 1-2 %
    const intraopMortality = 0.02 + h('mort-intra') * 0.06;  // 0.02-0.08 %
    const mortality30day   = 0.6 + h('mort-30d') * 1.2;      // 0.6-1.8 %

    // Clavien-Dindo distribuce komplikací (I = mírné, V = úmrtí)
    // Procenta z výkonů, které měly nějakou komplikaci (~10-15 % výkonů má I+)
    const compRate = 8 + h('comp-rate') * 6;  // 8-14 % výkonů s komplikací
    const compI   = 4.5 + h('cd-1') * 2;      // I — minimální intervence
    const compII  = 2.0 + h('cd-2') * 1.5;    // II — léky / transfuze
    const compIII = 1.0 + h('cd-3') * 0.8;    // III — operativní/endoskopická
    const compIV  = 0.3 + h('cd-4') * 0.4;    // IV — život ohrožující
    const compV   = 0.1 + h('cd-5') * 0.15;   // V — úmrtí
    const compIIIa = compIII * 0.6;
    const compIIIb = compIII * 0.4;
    const compIVa = compIV * 0.7;
    const compIVb = compIV * 0.3;

    // Wrong-site / wrong-patient — target je 0 (zero events)
    const wrongSiteEvents   = h('wrong-site') < 0.08 ? 1 : 0;
    const wrongPatientEvents= h('wrong-patient') < 0.04 ? 1 : 0;
    const sentinelEvents    = wrongSiteEvents + wrongPatientEvents;

    // Antibiotic prophylaxis on-time (do 60 min před řezem)
    const abProphylaxis = 86 + h('ab-prophyl') * 12;   // 86-98 %

    // Hand hygiene compliance (cílový standard ≥80 %)
    const handHygiene = 78 + h('hand-hyg') * 18;       // 78-96 %

    // Consent forms — informed consent před výkonem
    const consentRate = 96 + h('consent') * 3.8;       // 96-99.8 %

    // DVT prophylaxis
    const dvtRate = 88 + h('dvt') * 10;                // 88-98 %

    // VTE (venous thromboembolism) - low rate je dobré
    const vteRate = 0.4 + h('vte') * 0.8;              // 0.4-1.2 %

    // Re-operation rate (návrat na sál)
    const reoperationRate = 1.5 + h('reop') * 2.5;     // 1.5-4 %

    // Unplanned ICU admission
    const unplannedICU = 0.8 + h('icu') * 1.7;         // 0.8-2.5 %

    // 30-day readmission
    const readmission30d = 5 + h('readmit') * 4;       // 5-9 %

    // Trend dat (12 týdenních hodnot)
    const trendChecklist = generateSeededTrend(`${seed}-checklist-trend`, 12, checklistOverall, 0.04);
    const trendSSI       = generateSeededTrend(`${seed}-ssi-trend`, 12, ssiOverall, 0.18);
    const trendMortality = generateSeededTrend(`${seed}-mort-trend`, 12, mortality30day, 0.22);

    return {
      signIn, timeOut, signOut, checklistOverall,
      cleanSSI, cleanContSSI, contaminatedSSI, dirtySSI, ssiOverall,
      intraopMortality, mortality30day,
      compRate, compI, compII, compIIIa, compIIIb, compIVa, compIVb, compV,
      wrongSiteEvents, wrongPatientEvents, sentinelEvents,
      abProphylaxis, handHygiene, consentRate, dvtRate, vteRate,
      reoperationRate, unplannedICU, readmission30d,
      trendChecklist, trendSSI, trendMortality,
    };
  }, [rooms.length, totalOps, periodLabel]);

  // ── Sentinel/incident events feed ─────────────────────────────────────────
  const events = useMemo(() => {
    const now = Date.now();
    const seed = `events-${rooms.length}-${periodLabel}`;
    const items: { id: string; timestamp: string; title: string; description: string; severity: 'info' | 'warning' | 'critical' | 'success'; source: string }[] = [];

    if (data.wrongSiteEvents > 0) {
      items.push({
        id: 'ws-1',
        timestamp: new Date(now - 1000 * 60 * 60 * 36).toISOString(),
        title: 'Near-miss: nesprávně označená strana',
        description: 'Tým zachytil chybu při Time-Out kontrole, ortop. zákrok přerušen, korekce provedena bez následků.',
        severity: 'warning',
        source: 'Time-Out',
      });
    }
    items.push({
      id: 'ssi-1',
      timestamp: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
      title: 'SSI hlášení — sál 3',
      description: 'Povrchová infekce po appendektomii, ATB léčba zahájena, eskalace nebyla nutná.',
      severity: 'warning',
      source: 'SSI Surveillance',
    });
    items.push({
      id: 'comp-1',
      timestamp: new Date(now - 1000 * 60 * 60 * 18).toISOString(),
      title: 'Clavien-Dindo III — návrat na sál',
      description: 'Pooperační krvácení po laparoskopické cholecystektomii, hemostáza úspěšně provedena.',
      severity: 'critical',
      source: 'Komplikace',
    });
    items.push({
      id: 'audit-1',
      timestamp: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
      title: 'Audit: WHO Checklist 100 %',
      description: 'Týdenní audit ortopedického oddělení — všechny 3 fáze checklistu řádně vyplněny.',
      severity: 'success',
      source: 'Audit',
    });
    items.push({
      id: 'eq-1',
      timestamp: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
      title: 'Selhání zařízení: laparoskopická věž 2',
      description: 'Optika ztratila signál během výkonu, výkon dokončen na záložní věži, zařízení servisováno.',
      severity: 'warning',
      source: 'Equipment',
    });
    items.push({
      id: 'hh-1',
      timestamp: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
      title: 'Hand hygiene compliance pokles',
      description: `Týden zaznamenal pokles na ${data.handHygiene.toFixed(1)} %, doporučena dodatečná edukace.`,
      severity: data.handHygiene < 85 ? 'warning' : 'info',
      source: 'IPC',
    });
    items.push({
      id: 'consent-1',
      timestamp: new Date(now - 1000 * 60 * 60 * 30).toISOString(),
      title: 'Chybějící informovaný souhlas — hlášeno',
      description: 'Pacient bez podepsaného souhlasu, výkon odložen, dokumentace doplněna.',
      severity: 'warning',
      source: 'Documentation',
    });

    // Seřaď podle timestamp (nejnovější první)
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [rooms.length, periodLabel, data]);

  // ── Hero composite quality score ──────────────────────────────────────────
  const qualityScore = useMemo(() => {
    // Vážený skóre: checklist 25 %, SSI inv. 25 %, mortality inv. 25 %, sentinel inv. 25 %
    const checklist = data.checklistOverall / 100;             // 0-1
    const ssi = Math.max(0, 1 - data.ssiOverall / 5);          // SSI > 5% = 0
    const mort = Math.max(0, 1 - data.mortality30day / 5);     // 30d mortality > 5% = 0
    const sent = data.sentinelEvents === 0 ? 1 : Math.max(0, 1 - data.sentinelEvents / 3);
    const composite = (checklist * 0.25 + ssi * 0.25 + mort * 0.25 + sent * 0.25) * 100;
    return Math.round(composite);
  }, [data]);

  return (
    <div className="space-y-4">
      {/* ── Hero card: composite score + key metrics ── */}
      <Card accent={qualityScore >= 90 ? C.green : qualityScore >= 75 ? C.yellow : C.red}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
          {/* Score ring */}
          <div className="flex items-center gap-4">
            <ProgressRing
              value={qualityScore}
              max={100}
              size={120}
              strokeWidth={10}
              color={qualityScore >= 90 ? C.green : qualityScore >= 75 ? C.yellow : C.red}
              trackColor={C.surface}
              centerLabel={
                <div className="text-center">
                  <div className="text-3xl font-bold tabular-nums leading-none"
                    style={{ color: qualityScore >= 90 ? C.green : qualityScore >= 75 ? C.yellow : C.red }}>
                    {qualityScore}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider mt-1" style={{ color: C.muted }}>Quality Score</div>
                </div>
              }
            />
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: C.muted }}>
                Klinická kvalita
              </div>
              <div className="text-base font-bold" style={{ color: C.textHi }}>
                {qualityScore >= 90 ? 'Excellent' : qualityScore >= 80 ? 'Velmi dobrá' : qualityScore >= 70 ? 'Dobrá' : qualityScore >= 60 ? 'Průměrná' : 'Pod standardem'}
              </div>
              <div className="text-[10px] mt-1" style={{ color: C.muted }}>
                Vážený index z WHO checklistu, SSI, mortality a sentinel events
              </div>
            </div>
          </div>

          {/* Mini KPI tiles */}
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetricTile
              label="WHO Checklist"
              value={`${data.checklistOverall.toFixed(1)}%`}
              color={data.checklistOverall >= 95 ? C.green : C.yellow}
              icon={ClipboardCheck}
              delta={computeDelta(data.checklistOverall, seededPreviousValue('q-check', data.checklistOverall, 0.05))}
              trend={data.trendChecklist}
              sublabel="Sign-In/Time-Out/Sign-Out"
            />
            <MetricTile
              label="SSI rate"
              value={`${data.ssiOverall.toFixed(2)}%`}
              color={data.ssiOverall <= 2 ? C.green : C.red}
              icon={Microscope}
              delta={computeDelta(data.ssiOverall, seededPreviousValue('q-ssi', data.ssiOverall, 0.2))}
              invertedDelta
              trend={data.trendSSI}
              sublabel="Surgical Site Infection"
            />
            <MetricTile
              label="30d Mortalita"
              value={`${data.mortality30day.toFixed(2)}%`}
              color={data.mortality30day < 1.5 ? C.green : C.red}
              icon={Skull}
              delta={computeDelta(data.mortality30day, seededPreviousValue('q-mort', data.mortality30day, 0.25))}
              invertedDelta
              trend={data.trendMortality}
              sublabel="30-day post-operative"
            />
            <MetricTile
              label="Sentinel events"
              value={data.sentinelEvents}
              color={data.sentinelEvents === 0 ? C.green : C.red}
              icon={AlertTriangle}
              sublabel="Wrong-site / wrong-patient"
            />
          </div>
        </div>
      </Card>

      {/* ── WHO Checklist breakdown + Hand hygiene + Consent ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card title="WHO Surgical Safety Checklist" subtitle="3 fáze compliance" accent={C.accent}>
          <div className="space-y-3 mt-2">
            <ComplianceMeter label="Sign-In (před uvedením do anestezie)" value={data.signIn} target={95} />
            <ComplianceMeter label="Time-Out (před řezem)" value={data.timeOut} target={95} />
            <ComplianceMeter label="Sign-Out (před opuštěním sálu)" value={data.signOut} target={95} />
          </div>
        </Card>

        <Card title="Hygienické standardy" subtitle="IPC compliance" accent={C.green}>
          <div className="space-y-3 mt-2">
            <ComplianceMeter label="Hand hygiene (WHO 5 moments)" value={data.handHygiene} target={80} />
            <ComplianceMeter label="Antibiotic prophylaxis ≤60 min před řezem" value={data.abProphylaxis} target={95} />
            <ComplianceMeter label="DVT prophylaxis (správně podaná)" value={data.dvtRate} target={90} />
            <ComplianceMeter label="Informed consent (kompletní)" value={data.consentRate} target={99} />
          </div>
        </Card>

        <Card title="SSI dle wound class" subtitle="Per třídy operačních ran" accent={C.red}>
          <div className="space-y-3 mt-2">
            <ComplianceMeter label="Clean (čistá rána)" value={data.cleanSSI} target={2} inverted />
            <ComplianceMeter label="Clean-contaminated" value={data.cleanContSSI} target={4} inverted />
            <ComplianceMeter label="Contaminated" value={data.contaminatedSSI} target={8} inverted />
            <ComplianceMeter label="Dirty/Infected" value={data.dirtySSI} target={16} inverted />
          </div>
        </Card>
      </div>

      {/* ── Clavien-Dindo + secondary metrics ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Clavien-Dindo komplikace */}
        <Card title="Clavien-Dindo komplikace" subtitle={`Distribuce závažnosti (z ${data.compRate.toFixed(1)} % výkonů)`} accent={C.orange}>
          <div className="mt-2 mb-3">
            <StackedBar
              segments={[
                { label: 'I', value: data.compI, color: '#86EFAC' },
                { label: 'II', value: data.compII, color: '#FDE68A' },
                { label: 'IIIa', value: data.compIIIa, color: '#FBBF24' },
                { label: 'IIIb', value: data.compIIIb, color: '#F97316' },
                { label: 'IVa', value: data.compIVa, color: '#EF4444' },
                { label: 'IVb', value: data.compIVb, color: '#B91C1C' },
                { label: 'V', value: data.compV, color: '#7F1D1D' },
              ]}
              height={14}
              showLegend={false}
              formatValue={(v) => `${v.toFixed(2)}%`}
            />
          </div>
          <div className="space-y-1.5 mt-3">
            {[
              { l: 'I', d: 'Mírné — bez nutnosti farmakologické léčby', v: data.compI, c: '#86EFAC' },
              { l: 'II', d: 'Středně těžké — vyžaduje léky/transfuzi', v: data.compII, c: '#FDE68A' },
              { l: 'IIIa', d: 'Vyžaduje intervenci bez celkové anestezie', v: data.compIIIa, c: '#FBBF24' },
              { l: 'IIIb', d: 'Vyžaduje intervenci v celk. anestezii', v: data.compIIIb, c: '#F97316' },
              { l: 'IVa', d: 'Život ohrožující (jeden orgán)', v: data.compIVa, c: '#EF4444' },
              { l: 'IVb', d: 'Život ohrožující (multiorgánové)', v: data.compIVb, c: '#B91C1C' },
              { l: 'V', d: 'Úmrtí pacienta', v: data.compV, c: '#7F1D1D' },
            ].map((row) => (
              <div key={row.l} className="flex items-center gap-2 text-[11px]">
                <div className="w-7 text-center font-bold rounded px-1 py-0.5 shrink-0"
                  style={{ background: `${row.c}25`, color: row.c }}>
                  {row.l}
                </div>
                <div className="flex-1 truncate" style={{ color: C.text }}>{row.d}</div>
                <div className="font-mono tabular-nums shrink-0" style={{ color: row.c }}>
                  {row.v.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Outcome metrics */}
        <Card title="Pacientské outcomy" subtitle="Sekundární klinické indikátory" accent={C.purple}>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <MetricTile
              label="Re-operace"
              value={`${data.reoperationRate.toFixed(2)}%`}
              color={data.reoperationRate < 3 ? C.green : C.red}
              icon={Activity}
              invertedDelta
              delta={computeDelta(data.reoperationRate, seededPreviousValue('q-reop', data.reoperationRate, 0.2))}
              sublabel="Návrat na sál"
            />
            <MetricTile
              label="Unplanned ICU"
              value={`${data.unplannedICU.toFixed(2)}%`}
              color={data.unplannedICU < 1.5 ? C.green : C.yellow}
              icon={HeartPulse}
              invertedDelta
              delta={computeDelta(data.unplannedICU, seededPreviousValue('q-icu', data.unplannedICU, 0.18))}
              sublabel="Po výkonu"
            />
            <MetricTile
              label="VTE rate"
              value={`${data.vteRate.toFixed(2)}%`}
              color={data.vteRate < 1 ? C.green : C.yellow}
              icon={Stethoscope}
              invertedDelta
              sublabel="Tromboembolická příhoda"
            />
            <MetricTile
              label="30d Readmise"
              value={`${data.readmission30d.toFixed(1)}%`}
              color={data.readmission30d < 7 ? C.green : C.yellow}
              icon={FileCheck2}
              invertedDelta
              delta={computeDelta(data.readmission30d, seededPreviousValue('q-readmit', data.readmission30d, 0.15))}
              sublabel="Rehospitalizace"
            />
            <MetricTile
              label="Intraop mortalita"
              value={`${data.intraopMortality.toFixed(3)}%`}
              color={data.intraopMortality < 0.05 ? C.green : C.red}
              icon={Skull}
              invertedDelta
              sublabel="Během výkonu"
            />
            <MetricTile
              label="Hand hygiene"
              value={`${data.handHygiene.toFixed(0)}%`}
              color={data.handHygiene >= 85 ? C.green : C.yellow}
              icon={Hand}
              delta={computeDelta(data.handHygiene, seededPreviousValue('q-hh', data.handHygiene, 0.08))}
              sublabel="WHO 5 moments"
            />
          </div>
        </Card>

        {/* Mortality trend chart */}
        <Card title="30-day mortalita — trend" subtitle="Posledních 12 týdnů" accent={C.red}>
          <div className="h-[180px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trendMortality.map((v, i) => ({ week: `T-${11 - i}`, value: v }))}>
                <defs>
                  <linearGradient id="mortGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.red} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={C.red} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="week" stroke={C.muted} fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke={C.muted} fontSize={9} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `${v.toFixed(1)}%`} />
                <Tooltip
                  contentStyle={{ background: '#0a0a0a', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => [`${v.toFixed(2)} %`, 'Mortalita']}
                />
                <Area type="monotone" dataKey="value" stroke={C.red} strokeWidth={2} fill="url(#mortGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="text-center p-2 rounded-md" style={{ background: C.surface }}>
              <div className="text-[9px] uppercase" style={{ color: C.muted }}>Nejnižší</div>
              <div className="text-sm font-bold font-mono tabular-nums" style={{ color: C.green }}>
                {Math.min(...data.trendMortality).toFixed(2)}%
              </div>
            </div>
            <div className="text-center p-2 rounded-md" style={{ background: C.surface }}>
              <div className="text-[9px] uppercase" style={{ color: C.muted }}>Průměr</div>
              <div className="text-sm font-bold font-mono tabular-nums" style={{ color: C.text }}>
                {(data.trendMortality.reduce((s, v) => s + v, 0) / data.trendMortality.length).toFixed(2)}%
              </div>
            </div>
            <div className="text-center p-2 rounded-md" style={{ background: C.surface }}>
              <div className="text-[9px] uppercase" style={{ color: C.muted }}>Nejvyšší</div>
              <div className="text-sm font-bold font-mono tabular-nums" style={{ color: C.red }}>
                {Math.max(...data.trendMortality).toFixed(2)}%
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Sentinel events feed + Top safety risks ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card title="Sentinel events & incidenty" subtitle="Posledních 30 dní" accent={C.red}
          action={
            <div className="flex items-center gap-1.5 text-[10px]" style={{ color: C.muted }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.red }} />
              Live monitoring
            </div>
          }
        >
          <EventFeed items={events} maxItems={6} />
        </Card>

        <Card title="Top rizikové oblasti" subtitle="Žebříček podle severity × frekvence" accent={C.yellow}>
          <CategoryBarList
            items={[
              { label: 'Infekce v ráně (SSI)', value: data.ssiOverall * 8, color: C.red, sublabel: 'celkem' },
              { label: 'Pooperační krvácení', value: data.compIIIb * 14, color: C.orange, sublabel: 'CD IIIb' },
              { label: 'Komplikace anestezie', value: 4 + hashStr('anest-c') * 6, color: C.yellow, sublabel: 'incidenty' },
              { label: 'Selhání zařízení', value: 2 + hashStr('eq-fail') * 5, color: C.purple, sublabel: 'výpadky' },
              { label: 'Chyby v dokumentaci', value: 5 + hashStr('doc-err') * 8, color: C.accent, sublabel: 'chybějící' },
              { label: 'Pády pacientů', value: 0.5 + hashStr('falls') * 2, color: C.pink, sublabel: 'případů' },
              { label: 'Wrong-site (zachycené)', value: data.wrongSiteEvents + hashStr('ws-near') * 2, color: C.red, sublabel: 'near-miss' },
            ]}
            formatValue={(v) => formatNumber(v, 1)}
          />
        </Card>
      </div>

      {/* ── Compliance trend dual-line ── */}
      <Card title="Compliance trend — 12 týdnů" subtitle="WHO checklist vs. SSI rate" accent={C.accent}>
        <div className="h-[200px] mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.trendChecklist.map((v, i) => ({
              week: `T-${11 - i}`,
              checklist: v,
              ssi: data.trendSSI[i],
            }))}>
              <defs>
                <linearGradient id="chkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.green} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ssiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.red} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={C.red} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="week" stroke={C.muted} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis yAxisId="l" stroke={C.green} fontSize={9} tickLine={false} axisLine={false}
                tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[80, 100]} />
              <YAxis yAxisId="r" orientation="right" stroke={C.red} fontSize={9} tickLine={false} axisLine={false}
                tickFormatter={(v) => `${v.toFixed(1)}%`} domain={[0, 5]} />
              <Tooltip
                contentStyle={{ background: '#0a0a0a', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }}
                formatter={(v: number, name: string) => [
                  `${v.toFixed(2)} %`,
                  name === 'checklist' ? 'WHO Checklist' : 'SSI rate',
                ]}
              />
              <Area yAxisId="l" type="monotone" dataKey="checklist" stroke={C.green} strokeWidth={2} fill="url(#chkGrad)" />
              <Area yAxisId="r" type="monotone" dataKey="ssi" stroke={C.red} strokeWidth={2} fill="url(#ssiGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
