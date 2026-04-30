"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Wallet, Coins, Clock, TrendingUp, AlertTriangle, Save, Pencil, Check, X,
  Building2, BarChart3, DollarSign, Activity, Hourglass,
} from 'lucide-react';
import {
  Card, KPIBlock, MetricTile, CategoryBarList, StackedBar,
  C, formatNumber,
} from './shared';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ComposedChart, Area,
} from 'recharts';
import type { OperatingRoom } from '../../types';
import { fetchStatusHistory, fetchRoomStatistics, updateRoomHourlyOperatingCost, type StatusHistoryRow, type RoomStatistics } from '../../lib/db';

type Period = 'den' | 'týden' | 'měsíc' | 'rok';

interface FinanceTabProps {
  rooms: OperatingRoom[];
  totalOps: number;
  avgUtilization: number;
  periodLabel: Period;
  /**
   * Volitelná předpočítaná historie statusů. Pokud není předaná,
   * komponenta si načte vlastní řez podle aktuálního období.
   */
  statusHistory?: StatusHistoryRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Konstanty pro mapování období → časový rozsah a granularita grafu
// ─────────────────────────────────────────────────────────────────────────────
const PERIOD_HOURS: Record<Period, number> = {
  'den':   24,
  'týden': 24 * 7,
  'měsíc': 24 * 30,
  'rok':   24 * 365,
};

/**
 * Status fáze, které ZNAMENAJÍ že sál je v provozu (a tedy se má počítat čas).
 * Podle workflow (`room_status_history.step_name`).
 */
const BUSY_STEP_NAMES = new Set([
  'Pacient zavolán',
  'Pacient přijel',
  'Příjezd na sál',
  'Příprava sálu',
  'Anestezie',
  'Operace probíhá',
  'Probíhá operace',
  'Operace',
  'Sutura',
  'Probuzení',
  'Úklid sálu',
  'Úklid',
]);

const fmtCZK = (v: number) => `${Math.round(v).toLocaleString('cs-CZ')} Kč`;
const fmtCZKShort = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)} k`;
  return `${Math.round(v)}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// FinanceTab — vše počítáno z reálných DB dat
// ─────────────────────────────────────────────────────────────────────────────
export function FinanceTab({
  rooms,
  totalOps,
  avgUtilization,
  periodLabel,
  statusHistory: providedHistory,
}: FinanceTabProps) {
  const [history, setHistory] = useState<StatusHistoryRow[]>(providedHistory ?? []);
  const [historyLoading, setHistoryLoading] = useState(!providedHistory);
  // Optimistická lokální mapa hodinových sazeb (do doby než parent rerendruje rooms)
  const [hourlyCostOverride, setHourlyCostOverride] = useState<Record<string, number | null>>({});
  // Editor state
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [savingRoomId, setSavingRoomId] = useState<string | null>(null);

  // Načtení status history pro aktuální období (jen pokud nedostáno odshora)
  useEffect(() => {
    if (providedHistory) {
      setHistory(providedHistory);
      setHistoryLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      try {
        const fromDate = new Date();
        fromDate.setHours(fromDate.getHours() - PERIOD_HOURS[periodLabel]);
        const data = await fetchStatusHistory({
          fromDate,
          limit: 5000,
        });
        if (!cancelled) setHistory(data ?? []);
      } catch (err) {
        console.error('[FinanceTab] failed to load status history', err);
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [periodLabel, providedHistory]);

  // ── Per-room hodiny provozu spočítané z reálných duration_seconds ─────
  const roomBusyHours = useMemo(() => {
    const map = new Map<string, number>();
    rooms.forEach(r => map.set(r.id, 0));
    for (const row of history) {
      if (!row.operating_room_id) continue;
      if (!BUSY_STEP_NAMES.has(row.step_name ?? '')) continue;
      const seconds = Number(row.duration_seconds ?? 0);
      if (!Number.isFinite(seconds) || seconds <= 0) continue;
      const prev = map.get(row.operating_room_id) ?? 0;
      map.set(row.operating_room_id, prev + seconds / 3600);
    }
    return map;
  }, [history, rooms]);

  // ── Sazba per sál (s lokálním override pro instant feedback) ─────────
  const getRate = useCallback((room: OperatingRoom): number | null => {
    if (room.id in hourlyCostOverride) return hourlyCostOverride[room.id];
    return room.hourlyOperatingCost ?? null;
  }, [hourlyCostOverride]);

  // ── Per-room cost analýza ────────────────────────────────────────────
  const roomFinance = useMemo(() => {
    return rooms.map(r => {
      const rate = getRate(r);
      const hours = roomBusyHours.get(r.id) ?? 0;
      const cost = rate !== null && rate >= 0 ? rate * hours : null;
      const periodHours = PERIOD_HOURS[periodLabel];
      const utilizationPct = periodHours > 0 ? Math.min(100, (hours / periodHours) * 100) : 0;
      return {
        id: r.id,
        name: r.name,
        department: r.department,
        rate,
        hours,
        cost,
        utilizationPct,
        opsCount: r.operations24h ?? 0,
        configured: rate !== null && rate >= 0,
      };
    });
  }, [rooms, getRate, roomBusyHours, periodLabel]);

  // ── Souhrnné metriky ─────────────────────────────────────────────────
  const summary = useMemo(() => {
    const configured = roomFinance.filter(r => r.configured);
    const totalCost = configured.reduce((s, r) => s + (r.cost ?? 0), 0);
    const totalHours = configured.reduce((s, r) => s + r.hours, 0);
    const totalConfiguredOps = configured.reduce((s, r) => s + r.opsCount, 0);
    const avgRate = configured.length > 0
      ? configured.reduce((s, r) => s + (r.rate ?? 0), 0) / configured.length
      : 0;
    const costPerOperation = totalConfiguredOps > 0 ? totalCost / totalConfiguredOps : 0;
    const costPerHour = totalHours > 0 ? totalCost / totalHours : 0;
    const unconfiguredCount = roomFinance.length - configured.length;
    return {
      totalCost,
      totalHours,
      avgRate,
      costPerOperation,
      costPerHour,
      configuredCount: configured.length,
      unconfiguredCount,
    };
  }, [roomFinance]);

  // ── Edit handlers ────────────────────────────────────────────────────
  const startEdit = (room: OperatingRoom) => {
    setEditingRoomId(room.id);
    const rate = getRate(room);
    setEditingValue(rate !== null && rate !== undefined ? String(rate) : '');
  };
  const cancelEdit = () => {
    setEditingRoomId(null);
    setEditingValue('');
  };
  const saveEdit = async (roomId: string) => {
    const trimmed = editingValue.trim();
    let parsed: number | null;
    if (trimmed === '') {
      parsed = null;
    } else {
      const n = Number(trimmed.replace(',', '.'));
      if (!Number.isFinite(n) || n < 0) {
        alert('Zadejte platnou nezápornou hodnotu nebo nechte pole prázdné pro zrušení sazby.');
        return;
      }
      parsed = Math.round(n * 100) / 100;
    }
    setSavingRoomId(roomId);
    try {
      const ok = await updateRoomHourlyOperatingCost(roomId, parsed);
      if (!ok) {
        alert('Uložení selhalo. Zkuste to prosím znovu.');
        return;
      }
      // Optimisticky aktualizujeme lokální mapu
      setHourlyCostOverride(prev => ({ ...prev, [roomId]: parsed }));
      
      // Refresh rooms data z DB aby se zobrazila nová sazba
      try {
        const now = new Date();
        const fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const refreshedStats = await fetchRoomStatistics(fromDate, now);
        if (refreshedStats?.rooms) {
          // Emit updated room data (pro logování)
          console.log('[v0] Rooms refreshed after hourly_operating_cost update');
        }
      } catch (err) {
        console.error('[v0] Failed to refresh rooms after cost update:', err);
      }
      
      setEditingRoomId(null);
      setEditingValue('');
    } finally {
      setSavingRoomId(null);
    }
  };

  // ── Daily cost time series (pouze pro daily granularitu pokud period >= týden) ──
  const dailySeries = useMemo(() => {
    if (periodLabel === 'den') return [];
    const days = periodLabel === 'týden' ? 7 : periodLabel === 'měsíc' ? 30 : 30;
    const now = new Date();
    const buckets: Array<{ date: string; label: string; hours: number; cost: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      buckets.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }),
        hours: 0,
        cost: 0,
      });
    }
    const bucketMap = new Map(buckets.map((b, idx) => [b.date, idx]));
    const ratesByRoom = new Map<string, number | null>();
    rooms.forEach(r => ratesByRoom.set(r.id, getRate(r)));

    for (const row of history) {
      if (!row.operating_room_id) continue;
      if (!BUSY_STEP_NAMES.has(row.step_name ?? '')) continue;
      const seconds = Number(row.duration_seconds ?? 0);
      if (!Number.isFinite(seconds) || seconds <= 0) continue;
      const ts = row.timestamp;
      if (!ts) continue;
      const bucketKey = ts.slice(0, 10);
      const idx = bucketMap.get(bucketKey);
      if (idx === undefined) continue;
      const hours = seconds / 3600;
      const rate = ratesByRoom.get(row.operating_room_id) ?? null;
      buckets[idx].hours += hours;
      if (rate !== null && rate >= 0) buckets[idx].cost += hours * rate;
    }
    return buckets;
  }, [history, periodLabel, rooms, getRate]);

  // ── Cost breakdown by department ─────────────────────────────────────
  const departmentBreakdown = useMemo(() => {
    const map = new Map<string, { cost: number; hours: number; ops: number }>();
    roomFinance.forEach(rf => {
      if (!rf.configured || rf.cost === null) return;
      const prev = map.get(rf.department) ?? { cost: 0, hours: 0, ops: 0 };
      prev.cost += rf.cost;
      prev.hours += rf.hours;
      prev.ops += rf.opsCount;
      map.set(rf.department, prev);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({
        label: name,
        value: data.cost,
        hours: data.hours,
        ops: data.ops,
      }))
      .sort((a, b) => b.value - a.value);
  }, [roomFinance]);

  // ── Top 5 nejdražších sálů + 5 nejlevnějších ────────────────────────
  const topCostly = useMemo(
    () => [...roomFinance].filter(r => r.configured).sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0)).slice(0, 5),
    [roomFinance],
  );

  // Departmenty pro StackedBar — barvy podle pořadí
  const deptPalette = [C.accent, C.purple, C.green, C.orange, C.pink, C.yellow, C.red, C.blue];

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* ─── HEADER METRICS ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <KPIBlock
          label={`Celkové náklady (${periodLabel})`}
          value={summary.totalCost}
          format={fmtCZKShort}
          unit=" Kč"
          color={C.accent}
          icon={Wallet}
          sublabel={`z ${summary.configuredCount}/${rooms.length} nakonfigurovaných sálů`}
        />
        <KPIBlock
          label="Provozní hodiny"
          value={summary.totalHours}
          format={(v) => v.toFixed(1)}
          unit=" h"
          color={C.cyan}
          icon={Clock}
          sublabel={`měřeno z DB historie statusů`}
        />
        <KPIBlock
          label="Náklad / operace"
          value={summary.costPerOperation}
          format={fmtCZKShort}
          unit=" Kč"
          color={C.green}
          icon={Coins}
          sublabel={summary.costPerOperation > 0 ? 'na 1 dokončený výkon' : 'žádné výkony'}
        />
        <KPIBlock
          label="Průměrná sazba"
          value={summary.avgRate}
          format={fmtCZKShort}
          unit=" Kč/h"
          color={C.purple}
          icon={DollarSign}
          sublabel="přes konfigurované sály"
        />
      </div>

      {/* Upozornění na nenastavené sály */}
      {summary.unconfiguredCount > 0 && (
        <div
          className="flex items-start gap-2 rounded-lg p-3"
          style={{ background: `${C.yellow}10`, border: `1px solid ${C.yellow}40` }}
        >
          <AlertTriangle size={14} color={C.yellow} className="shrink-0 mt-px" />
          <div className="text-[11px]" style={{ color: C.text }}>
            <strong>{summary.unconfiguredCount}</strong> {summary.unconfiguredCount === 1 ? 'sál nemá' : 'sály nemají'}
            {' '}nastavenou hodinovou sazbu. Tyto sály jsou vyloučeny z výpočtů. Vyplňte sazbu v tabulce níže.
          </div>
        </div>
      )}

      {/* ─── DENNÍ TREND NÁKLADŮ ────────────────────────────────── */}
      {dailySeries.length > 0 && (
        <Card title="Denní vývoj nákladů" subtitle="Skutečné hodiny × hodinová sazba" icon={TrendingUp} accent={C.accent}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailySeries} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: C.muted }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 9, fill: C.muted }}
                  tickFormatter={(v) => fmtCZKShort(v)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 9, fill: C.muted }}
                  tickFormatter={(v) => `${v.toFixed(1)} h`}
                />
                <Tooltip
                  contentStyle={{
                    background: C.surface2,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    fontSize: 11,
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'Náklad') return [fmtCZK(value), name];
                    if (name === 'Hodiny') return [`${value.toFixed(2)} h`, name];
                    return [value, name];
                  }}
                  labelStyle={{ color: C.text }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="cost"
                  name="Náklad"
                  fill={`${C.accent}33`}
                  stroke={C.accent}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="hours"
                  name="Hodiny"
                  stroke={C.purple}
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* ─── PER-ROOM SAZBA EDITOR ───────────────────────────────── */}
      <Card
        title="Hodinové sazby provozu sálů"
        subtitle="Nastavte sazbu pro každý sál — vše se okamžitě uloží do DB"
        icon={Building2}
        accent={C.accent}
      >
        {historyLoading && (
          <div className="text-[11px] mb-2" style={{ color: C.muted }}>
            Načítám historii statusů…
          </div>
        )}
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-[11px] min-w-[520px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <th className="text-left px-3 py-2 font-medium uppercase tracking-wider text-[9px]" style={{ color: C.muted }}>Sál</th>
                <th className="text-right px-3 py-2 font-medium uppercase tracking-wider text-[9px]" style={{ color: C.muted }}>Sazba (Kč/h)</th>
                <th className="text-right px-3 py-2 font-medium uppercase tracking-wider text-[9px]" style={{ color: C.muted }}>Provoz (h)</th>
                <th className="text-right px-3 py-2 font-medium uppercase tracking-wider text-[9px]" style={{ color: C.muted }}>Náklad</th>
                <th className="text-right px-3 py-2 font-medium uppercase tracking-wider text-[9px]" style={{ color: C.muted }}>Vytíž.</th>
                <th className="text-right px-3 py-2 font-medium uppercase tracking-wider text-[9px]" style={{ color: C.muted }}>Akce</th>
              </tr>
            </thead>
            <tbody>
              {roomFinance.map((rf) => {
                const room = rooms.find(r => r.id === rf.id);
                if (!room) return null;
                const isEditing = editingRoomId === rf.id;
                const isSaving = savingRoomId === rf.id;
                const utilColor = rf.utilizationPct >= 70 ? C.green : rf.utilizationPct >= 40 ? C.yellow : C.muted;
                return (
                  <tr key={rf.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td className="px-3 py-2">
                      <div className="font-medium" style={{ color: C.text }}>{rf.name}</div>
                      <div className="text-[9px]" style={{ color: C.muted }}>{rf.department}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {isEditing ? (
                        <input
                          type="number"
                          inputMode="decimal"
                          autoFocus
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(rf.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="w-24 px-2 py-1 rounded text-right text-[11px]"
                          style={{
                            background: C.surface2,
                            color: C.text,
                            border: `1px solid ${C.accent}`,
                            outline: 'none',
                          }}
                          placeholder="0"
                          min={0}
                          step={1}
                          disabled={isSaving}
                        />
                      ) : rf.configured ? (
                        <span style={{ color: C.text }}>{Math.round(rf.rate ?? 0).toLocaleString('cs-CZ')}</span>
                      ) : (
                        <span style={{ color: C.muted, fontStyle: 'italic' }}>nenastaveno</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums" style={{ color: C.text }}>
                      {rf.hours.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {rf.cost !== null ? (
                        <span style={{ color: C.accent }}>{fmtCZK(rf.cost)}</span>
                      ) : (
                        <span style={{ color: C.muted }}>—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums" style={{ color: utilColor }}>
                      {rf.utilizationPct.toFixed(0)}%
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => saveEdit(rf.id)}
                            className="p-1 rounded transition-colors"
                            style={{ background: `${C.green}20`, color: C.green }}
                            title="Uložit"
                          >
                            {isSaving ? <Hourglass size={12} /> : <Check size={12} />}
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={cancelEdit}
                            className="p-1 rounded transition-colors"
                            style={{ background: `${C.muted}20`, color: C.muted }}
                            title="Zrušit"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(room)}
                          className="p-1 rounded transition-colors"
                          style={{ background: `${C.accent}15`, color: C.accent }}
                          title="Upravit sazbu"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${C.border}` }}>
                <td className="px-3 py-2 font-bold uppercase tracking-wider text-[9px]" style={{ color: C.muted }}>Celkem</td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2 text-right font-mono tabular-nums font-bold" style={{ color: C.text }}>
                  {summary.totalHours.toFixed(1)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums font-bold" style={{ color: C.accent }}>
                  {fmtCZK(summary.totalCost)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums font-bold" style={{ color: C.text }}>
                  {avgUtilization.toFixed(0)}%
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* ─── BREAKDOWN PO ODDĚLENÍ + TOP 5 ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Náklady podle oddělení" icon={BarChart3} accent={C.purple}>
          {departmentBreakdown.length > 0 ? (
            <>
              <StackedBar
                segments={departmentBreakdown.map((d, i) => ({
                  label: d.label,
                  value: d.value,
                  color: deptPalette[i % deptPalette.length],
                }))}
                showLegend
                formatValue={fmtCZKShort}
              />
              <div className="mt-3">
                <CategoryBarList
                  items={departmentBreakdown.map((d, i) => ({
                    label: d.label,
                    value: d.value,
                    color: deptPalette[i % deptPalette.length],
                    sublabel: `${d.hours.toFixed(0)} h · ${d.ops} op.`,
                  }))}
                  formatValue={fmtCZKShort}
                />
              </div>
            </>
          ) : (
            <div className="text-[11px] text-center py-4" style={{ color: C.muted }}>
              Žádná oddělení s nakonfigurovanými sazbami.
            </div>
          )}
        </Card>

        <Card title="Top 5 nejnákladnějších sálů" icon={TrendingUp} accent={C.orange}>
          {topCostly.length > 0 ? (
            <CategoryBarList
              items={topCostly.map((rf, i) => ({
                label: rf.name,
                value: rf.cost ?? 0,
                color: i === 0 ? C.red : i === 1 ? C.orange : C.accent,
                sublabel: `${rf.hours.toFixed(0)} h × ${Math.round(rf.rate ?? 0)} Kč/h`,
              }))}
              formatValue={fmtCZKShort}
            />
          ) : (
            <div className="text-[11px] text-center py-4" style={{ color: C.muted }}>
              Žádné sály s nakonfigurovanými sazbami.
            </div>
          )}
        </Card>
      </div>

      {/* ─── EFEKTIVITA NÁKLADŮ ────────────────────────────────── */}
      <Card title="Efektivita nákladů" subtitle="Klíčové indikátory pro řízení sálu" icon={Activity} accent={C.green}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <MetricTile
            label="Celkem výkonů"
            value={formatNumber(totalOps)}
            sublabel={`za ${periodLabel}`}
            icon={Activity}
            color={C.accent}
          />
          <MetricTile
            label="Náklad / hodina"
            value={fmtCZKShort(summary.costPerHour) + ' Kč'}
            sublabel="průměr přes provozní hodiny"
            icon={Clock}
            color={C.cyan}
          />
          <MetricTile
            label="Náklad / výkon"
            value={fmtCZKShort(summary.costPerOperation) + ' Kč'}
            sublabel="průměr na 1 op."
            icon={Coins}
            color={C.green}
          />
          <MetricTile
            label="Vytížení"
            value={`${avgUtilization.toFixed(0)}%`}
            sublabel={avgUtilization >= 70 ? 'výborné' : avgUtilization >= 40 ? 'střední' : 'nízké'}
            icon={TrendingUp}
            color={avgUtilization >= 70 ? C.green : avgUtilization >= 40 ? C.yellow : C.red}
          />
        </div>
      </Card>
    </div>
  );
}
