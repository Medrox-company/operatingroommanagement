'use client';
/**
 * ComplianceTab — auditní a regulační compliance metriky
 * ─────────────────────────────────────────────────────────
 * • Documentation completeness — % kompletních záznamů
 * • Antibiotic prophylaxis timing (60 min pre-incision)
 * • DVT prophylaxis compliance
 * • Informed consent — 100% target
 * • Time-out protocol — preventivní safety check
 * • Audit findings — recent audit issues feed
 * • Specimen labeling, count discrepancies
 *
 * Všechna data jsou deterministicky generovaná z roomId/period — stabilní mezi rendery.
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, FileCheck, Pill, Activity, ClipboardCheck, Eye,
  AlertOctagon, FileWarning, Tag, CheckSquare, ScrollText, TrendingUp,
} from 'lucide-react';
import {
  C, hashStr, formatNumber, Card, ComplianceMeter, MetricTile, EventFeed,
  CategoryBarList, KPIBlock, ProgressRing, type EventFeedItem, type CategoryBarItem,
} from './shared';
import type { OperatingRoom } from '@/types';

interface ComplianceTabProps {
  rooms: OperatingRoom[];
  totalOps: number;
  periodLabel: string;
}

// Kompozitní compliance score z více metrik
function calculateComplianceScore(metrics: { value: number; weight: number; target: number; inverted?: boolean }[]): number {
  let totalScore = 0;
  let totalWeight = 0;
  for (const m of metrics) {
    const ratio = m.inverted
      ? Math.max(0, 1 - (m.value / (m.target * 2)))
      : Math.min(1, m.value / m.target);
    totalScore += ratio * m.weight;
    totalWeight += m.weight;
  }
  return totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
}

export const ComplianceTab: React.FC<ComplianceTabProps> = ({ rooms, totalOps, periodLabel }) => {
  const seed = useMemo(() => `compliance-${periodLabel}-${rooms.length}`, [rooms.length, periodLabel]);

  // ── Core compliance metriky ──
  const documentationCompleteness = 92 + hashStr(seed + '-doc') * 7; // 92-99%
  const antibioticTiming = 88 + hashStr(seed + '-abx') * 10; // 88-98%
  const dvtProphylaxis = 90 + hashStr(seed + '-dvt') * 8; // 90-98%
  const consentRate = 96 + hashStr(seed + '-consent') * 4; // 96-100%
  const timeOutProtocol = 91 + hashStr(seed + '-timeout') * 8; // 91-99%
  const specimenLabeling = 94 + hashStr(seed + '-spec') * 5; // 94-99%

  // ── Composite compliance score ──
  const composite = useMemo(() => calculateComplianceScore([
    { value: documentationCompleteness, weight: 1.5, target: 95 },
    { value: antibioticTiming,         weight: 1.5, target: 95 },
    { value: dvtProphylaxis,           weight: 1.2, target: 95 },
    { value: consentRate,              weight: 1.5, target: 100 },
    { value: timeOutProtocol,          weight: 1.3, target: 95 },
    { value: specimenLabeling,         weight: 1.0, target: 98 },
  ]), [documentationCompleteness, antibioticTiming, dvtProphylaxis, consentRate, timeOutProtocol, specimenLabeling]);

  // ── Audit findings (typovaný feed) ──
  const auditFindings: EventFeedItem[] = useMemo(() => {
    const now = Date.now();
    const items: EventFeedItem[] = [];
    const templates: Array<Omit<EventFeedItem, 'id' | 'timestamp'>> = [
      { title: 'Chybějící podpis na anamnéze', description: 'Pacient ID 247 — formulář bez podpisu lékaře', severity: 'warning', source: 'DOC' },
      { title: 'ATB profylaxe podána > 60 min před incisí', description: 'Sál 3, Op. 142 — Cefazolin 90 min', severity: 'warning', source: 'ABX' },
      { title: 'Time-out protokol nezdokumentován', description: 'Sál 1, ranní směna', severity: 'critical', source: 'SAFETY' },
      { title: 'Kompletní pre-op briefing dokončen', description: 'Všech 12 výkonů dnes splnilo standard', severity: 'success', source: 'AUDIT' },
      { title: 'Specimen mislabeling identified', description: 'Histologický vzorek bez čísla pacienta', severity: 'critical', source: 'LAB' },
      { title: 'Sčítání nástrojů — diskrepance', description: 'Pre/post count rozdíl 1 (vyřešeno na sále)', severity: 'warning', source: 'COUNT' },
      { title: 'WHO Surgical Safety Checklist 100%', description: 'Plná shoda za posledních 24 h', severity: 'success', source: 'WHO' },
      { title: 'Informovaný souhlas s riziky', description: 'Aktualizovaná verze formuláře schválena', severity: 'info', source: 'CONSENT' },
      { title: 'DVT profylaxe vynechána', description: 'Pacient ASA 3, riziko TEN — high priority', severity: 'critical', source: 'DVT' },
      { title: 'Audit dekontaminace OS', description: 'Měsíční audit dokončen, drobná zjištění', severity: 'info', source: 'STER' },
    ];
    for (let i = 0; i < 8; i++) {
      const t = templates[Math.floor(hashStr(seed + '-audit-' + i) * templates.length)];
      items.push({
        id: `audit-${i}`,
        timestamp: new Date(now - i * 1000 * 60 * Math.floor(15 + hashStr(seed + '-audit-t' + i) * 240)).toISOString(),
        ...t,
      });
    }
    return items;
  }, [seed]);

  // ── Documentation breakdown by type ──
  const docCategories: CategoryBarItem[] = useMemo(() => [
    { label: 'Operační protokol', value: 98 + hashStr(seed + '-c1') * 2, color: C.green, sublabel: '%' },
    { label: 'Anesteziolog. záznam', value: 95 + hashStr(seed + '-c2') * 4, color: C.green, sublabel: '%' },
    { label: 'Předoperační vyšetření', value: 91 + hashStr(seed + '-c3') * 7, color: C.yellow, sublabel: '%' },
    { label: 'Informovaný souhlas', value: 97 + hashStr(seed + '-c4') * 3, color: C.green, sublabel: '%' },
    { label: 'Pooperační dekurz', value: 88 + hashStr(seed + '-c5') * 9, color: C.yellow, sublabel: '%' },
    { label: 'Histologie / patologie', value: 84 + hashStr(seed + '-c6') * 12, color: C.orange, sublabel: '%' },
  ].sort((a, b) => b.value - a.value), [seed]);

  // ── Counts breakdown ──
  const totalAudits = Math.round(totalOps * 0.15);
  const findingsCritical = Math.round(totalAudits * 0.05);
  const findingsMajor = Math.round(totalAudits * 0.15);
  const findingsMinor = Math.round(totalAudits * 0.35);
  const findingsResolved = totalAudits - findingsCritical - findingsMajor - findingsMinor;

  return (
    <div className="flex flex-col gap-5">
      {/* ── HERO: Composite compliance score + 4 mega tily ── */}
      <Card
        accent={composite >= 95 ? C.green : composite >= 85 ? C.yellow : C.red}
        className="relative overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
          {/* Composite ring */}
          <div className="flex flex-col items-center justify-center text-center gap-2 py-2">
            <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: C.muted }}>
              Compliance Score
            </span>
            <ProgressRing
              value={composite}
              max={100}
              size={140}
              strokeWidth={11}
              color={composite >= 95 ? C.green : composite >= 85 ? C.yellow : C.red}
              backgroundColor={C.surface}
              label={`${composite.toFixed(1)}%`}
              sublabel={composite >= 95 ? 'Excellent' : composite >= 85 ? 'Good' : 'Needs review'}
            />
            <div className="flex items-center gap-1.5 text-[10px]" style={{ color: C.muted }}>
              <ShieldCheck size={12} color={C.green} />
              <span>{periodLabel} · {totalAudits} auditů</span>
            </div>
          </div>

          {/* Mega tily */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <MetricTile
              label="Dokumentace"
              value={`${documentationCompleteness.toFixed(1)}%`}
              sublabel="Kompletních záznamů"
              color={documentationCompleteness >= 95 ? C.green : C.yellow}
              icon={FileCheck}
              delta={1.8}
            />
            <MetricTile
              label="ATB profylaxe"
              value={`${antibioticTiming.toFixed(1)}%`}
              sublabel="< 60 min před incizí"
              color={antibioticTiming >= 95 ? C.green : C.yellow}
              icon={Pill}
              delta={2.4}
            />
            <MetricTile
              label="DVT profylaxe"
              value={`${dvtProphylaxis.toFixed(1)}%`}
              sublabel="Adherence k protokolu"
              color={dvtProphylaxis >= 95 ? C.green : C.yellow}
              icon={Activity}
              delta={0.6}
            />
            <MetricTile
              label="Time-out"
              value={`${timeOutProtocol.toFixed(1)}%`}
              sublabel="Safety pause execution"
              color={timeOutProtocol >= 95 ? C.green : C.yellow}
              icon={CheckSquare}
              delta={3.1}
            />
          </div>
        </div>
      </Card>

      {/* ── Compliance metrs grid (6 metrik) ── */}
      <Card title="Klíčové compliance ukazatele" subtitle="Per-metric performance vs. target">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">
          <ComplianceMeter
            label="Dokumentace kompletní"
            value={documentationCompleteness}
            target={95}
          />
          <ComplianceMeter
            label="ATB profylaxe (timing)"
            value={antibioticTiming}
            target={95}
          />
          <ComplianceMeter
            label="DVT profylaxe"
            value={dvtProphylaxis}
            target={95}
          />
          <ComplianceMeter
            label="Informovaný souhlas"
            value={consentRate}
            target={100}
          />
          <ComplianceMeter
            label="Time-out protokol"
            value={timeOutProtocol}
            target={95}
          />
          <ComplianceMeter
            label="Specimen labeling"
            value={specimenLabeling}
            target={98}
          />
        </div>
      </Card>

      {/* ── Documentation breakdown + Findings summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card
          className="lg:col-span-2"
          title="Kompletnost dokumentace"
          subtitle="Per typ záznamu — completion rate"
          icon={ScrollText}
        >
          <CategoryBarList
            items={docCategories}
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
        </Card>

        <Card
          title="Audit findings"
          subtitle={`${totalAudits} auditů provedeno`}
          icon={ClipboardCheck}
          accent={C.purple}
        >
          <div className="flex flex-col gap-2.5">
            {[
              { label: 'Kritická', value: findingsCritical, color: C.red, icon: AlertOctagon },
              { label: 'Major',    value: findingsMajor,    color: C.orange, icon: FileWarning },
              { label: 'Minor',    value: findingsMinor,    color: C.yellow, icon: Eye },
              { label: 'Vyřešeno', value: findingsResolved, color: C.green, icon: CheckSquare },
            ].map((f, i) => {
              const Icon = f.icon;
              const total = findingsCritical + findingsMajor + findingsMinor + findingsResolved || 1;
              const pct = (f.value / total) * 100;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.05 }}
                  className="flex items-center gap-2.5 p-2 rounded-lg"
                  style={{ background: `${f.color}10`, border: `1px solid ${f.color}33` }}
                >
                  <div className="rounded-md p-1.5 shrink-0" style={{ background: `${f.color}25` }}>
                    <Icon size={14} color={f.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: C.muted }}>
                      {f.label}
                    </div>
                    <div className="text-base font-bold font-mono tabular-nums" style={{ color: f.color }}>
                      {formatNumber(f.value)}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono tabular-nums shrink-0" style={{ color: C.muted }}>
                    {pct.toFixed(0)}%
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPIBlock
          label="Specimen labeling"
          value={`${specimenLabeling.toFixed(1)}%`}
          color={specimenLabeling >= 98 ? C.green : C.yellow}
          icon={Tag}
          targetValue={98}
          progressValue={specimenLabeling}
        />
        <KPIBlock
          label="Count discrepancies"
          value={Math.round(totalOps * 0.012)}
          color={C.orange}
          icon={AlertOctagon}
          sublabel={`/ ${totalOps} výkonů`}
        />
        <KPIBlock
          label="Audit cycle time"
          value={`${(2.4 + hashStr(seed + '-cycle') * 1.2).toFixed(1)} h`}
          color={C.cyan}
          icon={TrendingUp}
          sublabel="Avg. resolution time"
        />
        <KPIBlock
          label="Re-training events"
          value={Math.round(totalOps * 0.008)}
          color={C.purple}
          icon={CheckSquare}
          sublabel="Personnel retraining"
        />
      </div>

      {/* ── Recent audit feed ── */}
      <Card
        title="Aktuální audit findings"
        subtitle="Posledních 8 zjištění z interních auditů"
        icon={ClipboardCheck}
        accent={C.cyan}
      >
        <EventFeed items={auditFindings} maxItems={8} />
      </Card>
    </div>
  );
};

ComplianceTab.displayName = 'ComplianceTab';
