'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Database,
  Gauge,
  Loader2,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Wifi,
  Zap,
} from 'lucide-react';

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
  if (score >= 90) return { label: 'VÝBORNÉ', color: '#34D399', glow: 'rgba(52,211,153,0.32)' };
  if (score >= 75) return { label: 'VELMI DOBRÉ', color: '#36D9EC', glow: 'rgba(54,217,236,0.3)' };
  if (score >= 55) return { label: 'POUŽITELNÉ', color: '#FBBF24', glow: 'rgba(251,191,36,0.28)' };
  return { label: 'POMALÉ', color: '#FB7185', glow: 'rgba(251,113,133,0.3)' };
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
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300/75">
            <Radio className="h-3.5 w-3.5" />
            Živá diagnostika
          </div>
          <h2 className="text-xl font-bold text-white sm:text-2xl">Rychlost aplikace a databáze</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/45">
            Měření probíhá mezi tímto zařízením, serverem aplikace a databází. Nečte ani nepřenáší údaje pacientů.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          {hospitalName || 'Aktivní zařízení'}
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-[30px] border border-cyan-300/15 p-4 sm:p-6"
        style={{
          background: 'radial-gradient(circle at 15% 0%, rgba(54,217,236,0.12), transparent 34%), radial-gradient(circle at 85% 100%, rgba(167,139,250,0.12), transparent 36%), rgba(6,13,24,0.86)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 24px 70px rgba(0,0,0,0.28)',
        }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(54,217,236,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(54,217,236,.2) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative grid gap-6 lg:grid-cols-[280px_1fr] lg:items-center">
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative grid h-52 w-52 place-items-center">
              {running && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'conic-gradient(from 90deg, transparent 0 58%, rgba(54,217,236,.55) 74%, transparent 86%)', filter: 'blur(1px)' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2.6, ease: 'linear', repeat: Infinity }}
                />
              )}
              <div
                className="absolute inset-3 rounded-full p-[1px]"
                style={{ background: `conic-gradient(${result ? quality.color : '#36D9EC'} ${progress * 3.6}deg, rgba(255,255,255,.07) 0deg)` }}
              >
                <div className="h-full w-full rounded-full bg-[#07101c]/95" />
              </div>
              <motion.div
                key={`${stage}-${result?.score ?? 0}`}
                initial={{ opacity: 0.35, scale: 0.93 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 flex flex-col items-center"
              >
                {running ? (
                  <Activity className="mb-2 h-9 w-9 text-cyan-300" />
                ) : result ? (
                  <Sparkles className="mb-1 h-8 w-8" style={{ color: quality.color }} />
                ) : (
                  <Gauge className="mb-2 h-9 w-9 text-cyan-300" />
                )}
                <span className="text-5xl font-semibold tabular-nums tracking-[-0.06em] text-white">
                  {result?.score ?? progress}
                </span>
                <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: result ? quality.color : 'rgba(255,255,255,.42)' }}>
                  {result ? quality.label : running ? 'PRŮBĚH %' : 'PŘIPRAVENO'}
                </span>
              </motion.div>
            </div>

            <div className="mt-1 text-center">
              <AnimatePresence mode="wait">
                <motion.p key={stageMeta.label} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-sm font-bold text-white">
                  {stageMeta.label}
                </motion.p>
              </AnimatePresence>
              <p className="mt-1 text-[11px] text-white/35">{stageMeta.detail}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MetricCard
                icon={Server}
                label="Odezva aplikace"
                value={result?.appMs ?? liveAppMs}
                suffix="ms"
                color="#36D9EC"
                detail="zařízení → aplikace"
              />
              <MetricCard
                icon={Database}
                label="Odezva databáze"
                value={result?.databaseMs ?? liveDatabaseMs}
                suffix="ms"
                color="#A78BFA"
                detail="server → Supabase"
              />
              <MetricCard
                icon={Wifi}
                label="Rychlost přenosu"
                value={result?.downloadMbps ?? null}
                suffix="Mb/s"
                color="#34D399"
                detail="kontrolní data"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-stretch">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">Stabilita jednotlivých měření</p>
                    <p className="mt-1 text-xs text-white/55">
                      {result ? `Kolísání odezvy ${result.jitterMs.toFixed(0)} ms` : 'Zobrazí se po dokončení testu'}
                    </p>
                  </div>
                  <Zap className="h-4 w-4 text-amber-300" />
                </div>
                <SampleBars samples={result?.appSamples ?? []} color="#36D9EC" />
              </div>

              <button
                type="button"
                onClick={runTest}
                disabled={running || !hospitalId}
                className="group flex min-h-[86px] items-center justify-center gap-3 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.09] px-6 text-sm font-bold text-cyan-100 transition-all hover:border-cyan-200/45 hover:bg-cyan-300/[0.14] disabled:cursor-not-allowed disabled:opacity-45"
                style={{ boxShadow: running ? '0 0 35px rgba(54,217,236,.12)' : undefined }}
              >
                {running ? <Loader2 className="h-5 w-5 animate-spin" /> : result ? <RefreshCw className="h-5 w-5 transition-transform group-hover:rotate-90" /> : <Gauge className="h-5 w-5" />}
                {running ? 'Probíhá měření' : result ? 'Změřit znovu' : 'Spustit test'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {result && recommendation && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center rounded-2xl border p-4"
            style={{ borderColor: `${quality.color}35`, background: `${quality.color}0C`, boxShadow: `0 12px 38px ${quality.glow}` }}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${quality.color}18` }}>
                <CheckCircle2 className="h-5 w-5" style={{ color: quality.color }} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: quality.color }}>Doporučení diagnostiky</p>
                <p className="mt-1 text-sm leading-relaxed text-white/65">{recommendation}</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">Poslední test</p>
              <p className="mt-1 text-xs tabular-nums text-white/55">{new Date(result.measuredAt).toLocaleString('cs-CZ')}</p>
            </div>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-400/[0.07] p-4 text-sm text-rose-100/80">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
            <div>
              <p className="font-bold text-rose-200">Test se nepodařilo dokončit</p>
              <p className="mt-1 leading-relaxed text-rose-100/60">{errorMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Cloud, title: 'Aplikační server', text: 'Celková odezva včetně nemocniční sítě a proxy.' },
          { icon: Database, title: 'Databázové spojení', text: 'Bezpečný dotaz omezený na právě zvolené zařízení.' },
          { icon: ShieldCheck, title: 'Bez klinických dat', text: 'Test nepřenáší pacienty, výkony ani personální údaje.' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <Icon className="h-4 w-4 shrink-0 text-cyan-300/75" />
            <div>
              <p className="text-xs font-bold text-white/70">{title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/30">{text}</p>
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
  color: string;
  detail: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, label, value, suffix, color, detail }) => (
  <motion.div layout className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
    <div aria-hidden className="absolute -right-7 -top-8 h-24 w-24 rounded-full blur-2xl" style={{ background: `${color}1F` }} />
    <div className="relative flex items-start justify-between gap-2">
      <div>
        <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/35">{label}</p>
        <div className="mt-3 flex items-baseline gap-1.5">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={value === null ? 'empty' : Math.round(value)} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-3xl font-semibold tabular-nums tracking-tight text-white">
              {value === null ? '—' : value < 10 ? value.toFixed(1) : Math.round(value)}
            </motion.span>
          </AnimatePresence>
          <span className="text-[10px] font-bold" style={{ color }}>{suffix}</span>
        </div>
        <p className="mt-1 text-[9px] text-white/25">{detail}</p>
      </div>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border" style={{ color, background: `${color}11`, borderColor: `${color}28` }}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
  </motion.div>
);

const SampleBars: React.FC<{ samples: number[]; color: string }> = ({ samples, color }) => {
  const max = Math.max(...samples, 1);

  return (
    <div className="flex h-8 items-end gap-1.5" aria-label={samples.length ? 'Graf stability odezvy' : 'Čeká na data'}>
      {Array.from({ length: 12 }, (_, index) => {
        const sample = samples[index % Math.max(1, samples.length)];
        const height = sample === undefined ? 13 + (index % 4) * 5 : clamp((sample / max) * 28, 8, 28);
        return (
          <motion.span
            key={index}
            className="min-w-0 flex-1 rounded-full"
            initial={{ height: 4, opacity: 0.16 }}
            animate={{ height, opacity: sample === undefined ? 0.14 : 0.72 }}
            transition={{ delay: index * 0.025 }}
            style={{ background: color }}
          />
        );
      })}
    </div>
  );
};

export default SpeedDiagnosticsPanel;
