'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Database,
  Gauge,
  Loader2,
  RefreshCw,
  Server,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import { COLORS } from './settings/settings-theme';

type TestStage = 'idle' | 'application' | 'database' | 'download' | 'evaluation' | 'done' | 'error';

interface ProbeResponse {
  ok: boolean;
  databaseMs: number;
  serverMs: number;
  measuredAt: string;
  error?: string;
}

interface SpeedResult {
  appMs: number;
  databaseMs: number;
  serverMs: number;
  downloadMbps: number;
  jitterMs: number;
  score: number;
  measuredAt: string;
  appSamples: number[];
  databaseSamples: number[];
}

interface SpeedDiagnosticsPanelProps {
  hospitalName?: string | null;
  hospitalId?: string | null;
}

const STAGE_META: Record<TestStage, { label: string; detail: string }> = {
  idle: { label: 'Připraveno k měření', detail: 'Test zatím nebyl spuštěn' },
  application: { label: 'Měřím odezvu aplikace', detail: 'Komunikace prohlížeče se serverem' },
  database: { label: 'Měřím databázi', detail: 'Bezpečný dotaz pro aktivní zařízení' },
  download: { label: 'Měřím datový přenos', detail: 'Kontrolní přenos 2 × 256 kB' },
  evaluation: { label: 'Vyhodnocuji výsledky', detail: 'Počítám stabilitu a celkové skóre' },
  done: { label: 'Diagnostika dokončena', detail: 'Výsledky odpovídají právě tomuto zařízení' },
  error: { label: 'Test nebyl dokončen', detail: 'Zkontrolujte připojení a spusťte jej znovu' },
};

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

const standardDeviation = (values: number[]) => {
  const mean = average(values);
  return Math.sqrt(average(values.map(value => (value - mean) ** 2)));
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function calculateScore(appMs: number, databaseMs: number, downloadMbps: number, jitterMs: number) {
  const appScore = clamp(108 - appMs * 0.16, 0, 100);
  const databaseScore = clamp(110 - databaseMs * 0.28, 0, 100);
  const downloadScore = clamp(25 + downloadMbps * 3.2, 0, 100);
  const stabilityScore = clamp(105 - jitterMs * 1.7, 0, 100);
  return Math.round(appScore * 0.35 + databaseScore * 0.35 + downloadScore * 0.2 + stabilityScore * 0.1);
}

function getQuality(score: number) {
  if (score >= 90) return { label: 'VÝBORNÉ', color: COLORS.green };
  if (score >= 75) return { label: 'VELMI DOBRÉ', color: COLORS.cyan };
  if (score >= 55) return { label: 'POUŽITELNÉ', color: COLORS.amber };
  return { label: 'POMALÉ', color: COLORS.red };
}

async function fetchWithTimeout(url: string, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

const SpeedDiagnosticsPanel: React.FC<SpeedDiagnosticsPanelProps> = ({ hospitalName, hospitalId }) => {
  const [stage, setStage] = useState<TestStage>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SpeedResult | null>(null);
  const [liveAppMs, setLiveAppMs] = useState<number | null>(null);
  const [liveDatabaseMs, setLiveDatabaseMs] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const running = !['idle', 'done', 'error'].includes(stage);
  const quality = useMemo(() => getQuality(result?.score ?? 0), [result?.score]);
  const stageMeta = STAGE_META[stage];

  const runTest = useCallback(async () => {
    if (running || !hospitalId) return;

    setResult(null);
    setErrorMessage(null);
    setLiveAppMs(null);
    setLiveDatabaseMs(null);
    setProgress(4);
    setStage('application');

    try {
      const appSamples: number[] = [];
      const databaseSamples: number[] = [];
      const serverSamples: number[] = [];

      for (let index = 0; index < 4; index += 1) {
        const startedAt = performance.now();
        const response = await fetchWithTimeout(`/api/diagnostics/speed?mode=probe&sample=${index}&t=${Date.now()}`);
        const duration = performance.now() - startedAt;
        const payload = (await response.json().catch(() => ({}))) as Partial<ProbeResponse>;

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || `Diagnostický server neodpověděl (${response.status}).`);
        }

        appSamples.push(duration);
        databaseSamples.push(Number(payload.databaseMs));
        serverSamples.push(Number(payload.serverMs));
        setLiveAppMs(duration);
        setLiveDatabaseMs(Number(payload.databaseMs));
        setProgress(12 + (index + 1) * 10);
      }

      setStage('database');
      setProgress(58);
      await new Promise(resolve => window.setTimeout(resolve, 260));

      setStage('download');
      const transferSamples: number[] = [];
      for (let index = 0; index < 2; index += 1) {
        const startedAt = performance.now();
        const response = await fetchWithTimeout(`/api/diagnostics/speed?mode=download&sample=${index}&t=${Date.now()}`);
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error || `Test přenosu selhal (${response.status}).`);
        }
        const body = await response.arrayBuffer();
        const durationMs = Math.max(1, performance.now() - startedAt);
        transferSamples.push((body.byteLength * 8) / (durationMs / 1000) / 1_000_000);
        setProgress(65 + (index + 1) * 12);
      }

      setStage('evaluation');
      setProgress(94);
      const appMs = average(appSamples);
      const databaseMs = average(databaseSamples);
      const serverMs = average(serverSamples);
      const downloadMbps = average(transferSamples);
      const jitterMs = standardDeviation(appSamples);
      const score = calculateScore(appMs, databaseMs, downloadMbps, jitterMs);

      await new Promise(resolve => window.setTimeout(resolve, 420));
      setResult({
        appMs,
        databaseMs,
        serverMs,
        downloadMbps,
        jitterMs,
        score,
        measuredAt: new Date().toISOString(),
        appSamples,
        databaseSamples,
      });
      setProgress(100);
      setStage('done');
    } catch (error) {
      setErrorMessage(
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Server neodpověděl do 12 sekund. Pravděpodobnou příčinou je síť, proxy nebo firewall nemocnice.'
          : error instanceof Error
            ? error.message
            : 'Diagnostiku se nepodařilo dokončit.',
      );
      setProgress(0);
      setStage('error');
    }
  }, [hospitalId, running]);

  const recommendation = useMemo(() => {
    if (!result) return null;
    if (result.databaseMs > 350) {
      return 'Databáze odpovídá pomaleji. Prověřte trasu k Supabase, nemocniční proxy a region databáze.';
    }
    if (result.appMs > 800) {
      return 'Server aplikace má vysokou odezvu. Prověřte internetovou trasu, firewall a případné filtrování domény operatingroom.eu.';
    }
    if (result.downloadMbps < 5) {
      return 'Přenosová rychlost je nízká. Pro stabilní provoz doporučujeme kabelové připojení nebo kvalitnější nemocniční Wi‑Fi.';
    }
    if (result.jitterMs > 80) {
      return 'Připojení je nestabilní. Odezva kolísá; prověřte Wi‑Fi signál, proxy server nebo vytížení linky.';
    }
    return 'Připojení je stabilní a připravené pro běžný provoz aplikace v reálném čase.';
  }, [result]);

  return (
    <div className="speed-diagnostics space-y-6">
      <div>
        <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/38">Živá diagnostika</p>
        <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-white">Rychlost aplikace a databáze</h2>
        <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-white/60">
          Měření probíhá mezi tímto zařízením, serverem aplikace a databází. Nečte ani nepřenáší údaje pacientů.
        </p>
      </div>

      <section className="speed-diagnostics-surface space-y-5" aria-label="Stav diagnostiky">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="system-settings-nav-icon" aria-hidden="true">
              {running ? <Activity size={18} /> : result ? <CheckCircle2 size={18} /> : <Gauge size={18} />}
            </span>
            <div role="status" aria-live="polite">
              <p className="text-sm font-medium text-white/95">{stageMeta.label}</p>
              <p className="speed-diagnostics-muted mt-1 text-xs leading-relaxed">{stageMeta.detail}</p>
            </div>
          </div>
          <span className="system-settings-badge max-w-full break-words">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {hospitalName || 'Aktivní zařízení'}
          </span>
        </div>

        {running && (
          <div>
            <div className="speed-diagnostics-muted mb-2 flex items-center justify-between text-xs">
              <span>Průběh měření</span><span className="tabular-nums text-white/90">{progress} %</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
              role="progressbar"
              aria-label="Průběh diagnostiky"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div className="h-full rounded-full" style={{ width: `${progress}%`, background: COLORS.blue }} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] pt-4">
          {result ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div>
                <p className="speed-diagnostics-muted text-[11px]">Celkové skóre</p>
                <p className="mt-1 text-2xl font-normal tabular-nums text-white/95">{result.score}<span className="speed-diagnostics-muted ml-1 text-xs">/ 100</span></p>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-semibold tracking-wide" style={{ color: quality.color }}>{quality.label}</span>
            </div>
          ) : (
            <p className="speed-diagnostics-muted max-w-sm text-xs leading-relaxed">
              {running
                ? 'Výsledky se zobrazí po dokončení měření.'
                : hospitalId
                  ? 'Test můžete spustit pro aktuálně vybrané zařízení.'
                  : 'Pro spuštění testu nejprve vyberte zdravotnické zařízení.'}
            </p>
          )}
          <button
            type="button"
            onClick={runTest}
            disabled={running || !hospitalId}
            className="system-settings-primary flex items-center gap-2 px-5 py-2.5 text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : result ? <RefreshCw className="h-4 w-4" aria-hidden="true" /> : <Gauge className="h-4 w-4" aria-hidden="true" />}
            {running ? 'Probíhá měření' : result ? 'Změřit znovu' : 'Spustit test'}
          </button>
        </div>
      </section>

      <div className="speed-diagnostics-grid">
        <MetricCard icon={Server} label="Odezva aplikace" value={result?.appMs ?? liveAppMs} suffix="ms" detail="zařízení → aplikace" />
        <MetricCard icon={Database} label="Odezva databáze" value={result?.databaseMs ?? liveDatabaseMs} suffix="ms" detail="server → Supabase" />
        <MetricCard icon={Wifi} label="Rychlost přenosu" value={result?.downloadMbps ?? null} suffix="Mb/s" detail="kontrolní data" />
      </div>

      <section className="speed-diagnostics-surface" aria-label="Stabilita jednotlivých měření">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-white/90">Stabilita jednotlivých měření</h3>
            <p className="speed-diagnostics-muted mt-1 text-xs">
              {result ? `Kolísání odezvy ${result.jitterMs.toFixed(0)} ms` : 'Zobrazí se po dokončení testu'}
            </p>
          </div>
          <Activity className="h-4 w-4 shrink-0 text-white/50" aria-hidden="true" />
        </div>
        <SampleBars samples={result?.appSamples ?? []} />
      </section>

      {result && recommendation && (
        <div className="speed-diagnostics-surface flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: quality.color }} aria-hidden="true" />
            <div>
              <h3 className="text-sm font-medium text-white/90">Doporučení diagnostiky</h3>
              <p className="speed-diagnostics-muted mt-1 text-xs leading-relaxed">{recommendation}</p>
            </div>
          </div>
          <div className="speed-diagnostics-muted text-xs">
            <p>Poslední test</p>
            <p className="mt-1 tabular-nums">{new Date(result.measuredAt).toLocaleString('cs-CZ')}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-400/[0.04] p-4 text-sm text-rose-100/90">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
          <div>
            <p className="font-bold text-rose-200">Test se nepodařilo dokončit</p>
            <p className="mt-1 text-xs leading-relaxed text-rose-100/80">{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="speed-diagnostics-grid border-t border-white/[0.08] pt-5">
        {[
          { icon: Cloud, title: 'Aplikační server', text: 'Celková odezva včetně nemocniční sítě a proxy.' },
          { icon: Database, title: 'Databázové spojení', text: 'Bezpečný dotaz omezený na právě zvolené zařízení.' },
          { icon: ShieldCheck, title: 'Bez klinických dat', text: 'Test nepřenáší pacienty, výkony ani personální údaje.' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex min-w-0 gap-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white/50" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium text-white/85">{title}</p>
              <p className="speed-diagnostics-muted mt-1 text-[11px] leading-relaxed">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: number | null;
  suffix: string;
  detail: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, label, value, suffix, detail }) => (
  <div className="speed-diagnostics-surface">
    <div className="mb-4 flex items-center gap-2 text-white/65">
      <Icon className="h-4 w-4 shrink-0" />
      <h3 className="text-xs font-medium">{label}</h3>
    </div>
    <div className="flex flex-wrap items-baseline gap-1.5">
      <span className="text-3xl font-normal tabular-nums tracking-tight text-white/95">
        {value === null ? '—' : value < 10 ? value.toFixed(1) : Math.round(value)}
      </span>
      <span className="speed-diagnostics-muted text-xs">{suffix}</span>
    </div>
    <p className="speed-diagnostics-muted mt-2 text-[11px]">{detail}</p>
  </div>
);

const SampleBars: React.FC<{ samples: number[] }> = ({ samples }) => {
  if (!samples.length) {
    return <p className="speed-diagnostics-muted rounded-xl border border-dashed border-white/[0.10] px-4 py-5 text-center text-xs">Čeká na data</p>;
  }
  const max = Math.max(...samples, 1);

  return (
    <div className="flex items-end gap-3" role="list" aria-label="Naměřené odezvy aplikace">
      {samples.map((sample, index) => (
        <div key={index} role="listitem" className="min-w-0 flex-1" aria-label={`Měření ${index + 1}: ${Math.round(sample)} ms`}>
          <div className="flex h-12 items-end" aria-hidden="true">
            <div className="w-full rounded-t-md bg-white/20" style={{ height: clamp((sample / max) * 48, 4, 48) }} />
          </div>
          <p className="speed-diagnostics-muted mt-2 text-center text-[10px] tabular-nums">{Math.round(sample)} ms</p>
        </div>
      ))}
    </div>
  );
};

export default SpeedDiagnosticsPanel;
