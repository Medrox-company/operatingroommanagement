/**
 * SafetyTab — Bezpečnost & WHO Surgical Safety Checklist
 *
 * Používá VÝHRADNĚ reálná data z tabulky `safety_checklists` v Supabase databázi.
 * Žádné mock hodnoty, žádné odhady. Pokud data nejsou k dispozici, zobrazí
 * empty-state s vysvětlením.
 *
 * Zobrazované metriky:
 *   • Počet checklistů (celkem za zvolené období)
 *   • Compliance: Sign-In, Time-Out, Sign-Out (počet completed / celkem)
 *   • Plně dokončené checklisty (všechny 3 fáze)
 *   • Time-to-complete: čas od created_at do sign_out_completed_at
 *   • Top operatéři podle počtu checklistů
 *   • Recent log: posledních 8 checklistů s detailem
 */
import React, { useMemo, memo } from 'react';
import {
  ShieldCheck, ListChecks, ClipboardCheck, AlertTriangle, Clock, User, FileText,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  C, Card, KPIBlock, ComplianceMeter, EventFeed, CategoryBarList, MetricTile,
  ProgressRing, formatTime, formatNumber, type EventFeedItem,
} from './shared';
import type { SafetyChecklistRow } from '../../lib/db';

interface SafetyTabProps {
  checklists: SafetyChecklistRow[] | null;  // null = načítá se / DB nedostupná
  periodLabel: string;
}

export const SafetyTab: React.FC<SafetyTabProps> = memo(({ checklists, periodLabel }) => {
  // ─── Derivace metrik z reálných dat ──────────────────────────────
  const stats = useMemo(() => {
    if (!checklists || checklists.length === 0) {
      return null;
    }

    const total = checklists.length;
    const signInDone = checklists.filter(c => c.sign_in_completed).length;
    const timeOutDone = checklists.filter(c => c.time_out_completed).length;
    const signOutDone = checklists.filter(c => c.sign_out_completed).length;
    const fullyDone = checklists.filter(
      c => c.sign_in_completed && c.time_out_completed && c.sign_out_completed
    ).length;

    const signInPct = total > 0 ? (signInDone / total) * 100 : 0;
    const timeOutPct = total > 0 ? (timeOutDone / total) * 100 : 0;
    const signOutPct = total > 0 ? (signOutDone / total) * 100 : 0;
    const fullPct = total > 0 ? (fullyDone / total) * 100 : 0;

    // Time-to-complete (sign_out - created)
    const completionTimes: number[] = [];
    for (const c of checklists) {
      if (c.sign_out_completed && c.sign_out_completed_at && c.created_at) {
        const diffMs = new Date(c.sign_out_completed_at).getTime() - new Date(c.created_at).getTime();
        if (diffMs > 0) completionTimes.push(diffMs / 60000); // minutes
      }
    }
    const avgCompletionMin = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

    // Surgeon ranking
    const surgeonCounts = new Map<string, number>();
    for (const c of checklists) {
      const s = c.surgeon_name?.trim();
      if (s) surgeonCounts.set(s, (surgeonCounts.get(s) ?? 0) + 1);
    }
    const topSurgeons = Array.from(surgeonCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Top procedures
    const procCounts = new Map<string, number>();
    for (const c of checklists) {
      const p = c.procedure_name?.trim();
      if (p) procCounts.set(p, (procCounts.get(p) ?? 0) + 1);
    }
    const topProcedures = Array.from(procCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Composite safety score (0-100): průměr 3 fází
    const compositeScore = (signInPct + timeOutPct + signOutPct) / 3;

    return {
      total,
      signInDone, timeOutDone, signOutDone, fullyDone,
      signInPct, timeOutPct, signOutPct, fullPct,
      avgCompletionMin,
      topSurgeons,
      topProcedures,
      compositeScore,
    };
  }, [checklists]);

  // ─── Recent activity feed (posledních 8 checklistů) ──────────────
  const recentEvents = useMemo<EventFeedItem[]>(() => {
    if (!checklists) return [];
    return checklists.slice(0, 8).map(c => {
      const completed = [c.sign_in_completed, c.time_out_completed, c.sign_out_completed]
        .filter(Boolean).length;
      const severity: EventFeedItem['severity'] =
        completed === 3 ? 'success' :
        completed >= 1   ? 'info' :
                           'warning';
      const phaseLabel = completed === 3 ? 'Kompletní'
                       : completed === 2 ? 'Sign-Out chybí'
                       : completed === 1 ? 'Pouze Sign-In'
                       :                   'Nezahájeno';
      return {
        id: c.id,
        timestamp: c.created_at,
        title: c.procedure_name ?? 'Neznámý výkon',
        description: [c.patient_name, c.surgeon_name].filter(Boolean).join(' • ') || undefined,
        severity,
        source: phaseLabel,
      };
    });
  }, [checklists]);

  // ─── Empty state, když DB neposkytla data ───────────────────────
  if (!checklists) {
    return (
      <Card>
        <div className="flex items-center gap-3 py-6 px-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `${C.muted}1a` }}>
            <Clock size={16} color={C.muted} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: C.text }}>
              Načítání dat z databáze…
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>
              Bezpečnostní checklisty se načítají ze Supabase tabulky <code>safety_checklists</code>.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <div className="flex items-center gap-3 py-6 px-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `${C.yellow}1a` }}>
            <AlertTriangle size={16} color={C.yellow} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: C.text }}>
              Žádné bezpečnostní checklisty za zvolené období
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>
              Tabulka <code>safety_checklists</code> neobsahuje záznamy v rozsahu „{periodLabel}".
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Hero: Composite Safety Score + 3 fáze ───────────────── */}
      <Card elevated icon={ShieldCheck} accent={C.green}
        title="WHO Surgical Safety Checklist"
        subtitle={`Z databáze \`safety_checklists\` za období: ${periodLabel}`}
      >
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-center">
          {/* Composite gauge */}
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <ProgressRing
              value={stats.compositeScore}
              size={120}
              strokeWidth={10}
              gradient
              centerLabel={
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold tabular-nums leading-none"
                    style={{ color: stats.compositeScore >= 80 ? C.green : stats.compositeScore >= 60 ? C.yellow : C.red }}>
                    {stats.compositeScore.toFixed(0)}%
                  </span>
                  <span className="text-[8px] uppercase tracking-wider mt-1" style={{ color: C.muted }}>
                    Compliance
                  </span>
                </div>
              }
            />
            <div className="flex flex-col gap-0.5">
              <div className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>
                Celkem checklistů
              </div>
              <div className="text-3xl font-bold leading-none" style={{ color: C.textHi }}>
                {formatNumber(stats.total)}
              </div>
              <div className="text-[10px] mt-1" style={{ color: C.muted }}>
                z toho <span style={{ color: C.green }} className="font-bold">{stats.fullyDone}</span> plně kompletních
                <span className="ml-1 font-mono">({stats.fullPct.toFixed(1)}%)</span>
              </div>
            </div>
          </div>

          {/* Per-phase compliance meters */}
          <div className="flex flex-col gap-3">
            <ComplianceMeter
              label={`Sign-In (${stats.signInDone}/${stats.total})`}
              value={stats.signInPct}
              target={95}
            />
            <ComplianceMeter
              label={`Time-Out (${stats.timeOutDone}/${stats.total})`}
              value={stats.timeOutPct}
              target={95}
            />
            <ComplianceMeter
              label={`Sign-Out (${stats.signOutDone}/${stats.total})`}
              value={stats.signOutPct}
              target={95}
            />
          </div>
        </div>
      </Card>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPIBlock
          label="Sign-In completion"
          value={stats.signInPct}
          format={(v) => v.toFixed(1)}
          unit="%"
          icon={ClipboardCheck}
          color={C.cyan}
          target={95}
          sublabel={`${stats.signInDone} z ${stats.total}`}
        />
        <KPIBlock
          label="Time-Out completion"
          value={stats.timeOutPct}
          format={(v) => v.toFixed(1)}
          unit="%"
          icon={ListChecks}
          color={C.orange}
          target={95}
          sublabel={`${stats.timeOutDone} z ${stats.total}`}
        />
        <KPIBlock
          label="Sign-Out completion"
          value={stats.signOutPct}
          format={(v) => v.toFixed(1)}
          unit="%"
          icon={ShieldCheck}
          color={C.green}
          target={95}
          sublabel={`${stats.signOutDone} z ${stats.total}`}
        />
        <KPIBlock
          label="Plně dokončené"
          value={stats.fullPct}
          format={(v) => v.toFixed(1)}
          unit="%"
          icon={FileText}
          color={C.purple}
          target={90}
          sublabel={`${stats.fullyDone} z ${stats.total}`}
        />
      </div>

      {/* ── Detailní rozbor ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top operatéři */}
        <Card icon={User} accent={C.accent}
          title="Top operatéři"
          subtitle="Dle počtu vyplněných checklistů">
          {stats.topSurgeons.length > 0 ? (
            <CategoryBarList
              items={stats.topSurgeons.map((s, i) => ({
                label: s.name,
                value: s.count,
                color: i === 0 ? C.accent : i < 3 ? C.cyan : C.muted,
              }))}
              formatValue={(v) => `${v}×`}
            />
          ) : (
            <div className="text-xs text-center py-4" style={{ color: C.muted }}>
              Žádná jména operatérů v záznamech
            </div>
          )}
        </Card>

        {/* Top procedury */}
        <Card icon={FileText} accent={C.purple}
          title="Top výkony"
          subtitle="Dle počtu výskytů v checklistech">
          {stats.topProcedures.length > 0 ? (
            <CategoryBarList
              items={stats.topProcedures.map((p, i) => ({
                label: p.name,
                value: p.count,
                color: i === 0 ? C.purple : i < 3 ? C.pink : C.muted,
              }))}
              formatValue={(v) => `${v}×`}
            />
          ) : (
            <div className="text-xs text-center py-4" style={{ color: C.muted }}>
              Žádné názvy výkonů v záznamech
            </div>
          )}
        </Card>
      </div>

      {/* ── Time-to-complete + Recent log ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Time-to-complete metric */}
        <MetricTile
          label="Průměrný čas dokončení"
          value={stats.avgCompletionMin > 0 ? `${stats.avgCompletionMin.toFixed(0)} min` : '—'}
          sublabel="od založení do Sign-Out"
          icon={Clock}
          color={C.blue}
        />
        <MetricTile
          label="Aktivní checklisty"
          value={checklists.filter(c => c.is_active).length}
          sublabel="právě otevřené (is_active=true)"
          icon={ListChecks}
          color={C.orange}
        />
        <MetricTile
          label="Bez Time-Out"
          value={stats.signInDone - stats.timeOutDone}
          sublabel="Sign-In bez Time-Out"
          icon={AlertTriangle}
          color={C.red}
        />
      </div>

      {/* Recent activity feed */}
      <Card icon={Clock} accent={C.cyan}
        title="Posledních 8 checklistů"
        subtitle="Chronologický přehled z databáze">
        <EventFeed items={recentEvents} maxItems={8} />
      </Card>

      {/* Footer disclaimer — transparentnost dat */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="text-[10px] text-center" style={{ color: C.faint }}
      >
        Veškeré metriky odvozeny z tabulky <code style={{ color: C.muted }}>public.safety_checklists</code> v Supabase DB.
        Doplňková klinická data (SSI, mortalita, Clavien-Dindo) nejsou v aktuálním schématu k dispozici.
      </motion.div>
    </div>
  );
});
SafetyTab.displayName = 'SafetyTab';
