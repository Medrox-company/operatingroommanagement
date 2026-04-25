"use client";

import React from "react";

/* Designové konstanty inspirované LoginPage */
export const DocColors = {
  accent: "#FBBF24",
  cyan: "#06B6D4",
  green: "#10B981",
  red: "#EF4444",
  purple: "#A78BFA",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  surface: "rgba(255,255,255,0.025)",
  glass: "rgba(255,255,255,0.04)",
  muted: "rgba(255,255,255,0.5)",
  text: "rgba(255,255,255,0.85)",
};

/** Sekce dokumentace s číselným prefixem a kotvou */
export function DocSection({
  id,
  number,
  title,
  subtitle,
  children,
}: {
  id: string;
  number: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 break-before-page first:break-before-auto">
      <div className="mb-8 flex items-baseline gap-4">
        <span
          className="text-xs font-mono tracking-[0.3em] uppercase"
          style={{ color: DocColors.accent }}
        >
          §{number}
        </span>
        <div className="flex-1">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight uppercase text-white">
            {title}
          </h2>
          {subtitle && (
            <p
              className="mt-1 text-sm leading-relaxed"
              style={{ color: DocColors.muted }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

/** Subsection (číslovaná pod-sekce) */
export function DocSubsection({
  id,
  number,
  title,
  children,
}: {
  id?: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24">
      <div className="mb-4 flex items-baseline gap-3">
        <span
          className="text-[10px] font-mono tracking-[0.25em] uppercase"
          style={{ color: DocColors.accent, opacity: 0.85 }}
        >
          {number}
        </span>
        <h3 className="text-xl md:text-2xl font-semibold text-white">
          {title}
        </h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/** Glassmorph karta */
export function DocCard({
  children,
  className = "",
  accent = false,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 md:p-6 ${className}`}
      style={{
        background: accent ? "rgba(251,191,36,0.04)" : DocColors.glass,
        border: `1px solid ${accent ? "rgba(251,191,36,0.2)" : DocColors.borderStrong}`,
      }}
    >
      {children}
    </div>
  );
}

/** Štítek */
export function DocBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "accent" | "ok" | "err" | "info" | "purple";
}) {
  const tones: Record<string, { bg: string; fg: string; bd: string }> = {
    default: {
      bg: "rgba(255,255,255,0.04)",
      fg: DocColors.text,
      bd: DocColors.borderStrong,
    },
    accent: {
      bg: "rgba(251,191,36,0.1)",
      fg: DocColors.accent,
      bd: "rgba(251,191,36,0.3)",
    },
    ok: {
      bg: "rgba(16,185,129,0.1)",
      fg: DocColors.green,
      bd: "rgba(16,185,129,0.3)",
    },
    err: {
      bg: "rgba(239,68,68,0.1)",
      fg: DocColors.red,
      bd: "rgba(239,68,68,0.3)",
    },
    info: {
      bg: "rgba(6,182,212,0.1)",
      fg: DocColors.cyan,
      bd: "rgba(6,182,212,0.3)",
    },
    purple: {
      bg: "rgba(167,139,250,0.1)",
      fg: DocColors.purple,
      bd: "rgba(167,139,250,0.3)",
    },
  };
  const t = tones[tone];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider"
      style={{ background: t.bg, color: t.fg, border: `1px solid ${t.bd}` }}
    >
      {children}
    </span>
  );
}

/** Inline kód */
export function DocCode({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="px-1.5 py-0.5 rounded text-[12.5px] font-mono"
      style={{
        background: "rgba(255,255,255,0.06)",
        color: DocColors.accent,
        border: `1px solid ${DocColors.border}`,
      }}
    >
      {children}
    </code>
  );
}

/** Blok kódu */
export function DocCodeBlock({
  language,
  children,
}: {
  language?: string;
  children: string;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(0,0,0,0.35)",
        border: `1px solid ${DocColors.borderStrong}`,
      }}
    >
      {language && (
        <div
          className="px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em]"
          style={{
            color: DocColors.muted,
            borderBottom: `1px solid ${DocColors.border}`,
            background: "rgba(255,255,255,0.025)",
          }}
        >
          {language}
        </div>
      )}
      <pre
        className="px-4 py-3 text-[12px] leading-relaxed overflow-x-auto font-mono whitespace-pre-wrap break-words"
        style={{ color: DocColors.text }}
      >
        {children}
      </pre>
    </div>
  );
}

/** Definovaný pojem (term + definice) */
export function DocDefinition({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-4 grid gap-2 md:grid-cols-[180px_1fr] md:gap-6"
      style={{
        background: DocColors.glass,
        border: `1px solid ${DocColors.border}`,
      }}
    >
      <div
        className="text-[11px] font-mono uppercase tracking-wider"
        style={{ color: DocColors.accent }}
      >
        {term}
      </div>
      <div
        className="text-sm leading-relaxed"
        style={{ color: DocColors.text }}
      >
        {children}
      </div>
    </div>
  );
}

/** Tabulka */
export function DocTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: DocColors.glass,
        border: `1px solid ${DocColors.borderStrong}`,
      }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "rgba(251,191,36,0.06)" }}>
            {headers.map((h) => (
              <th
                key={h}
                className="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.18em]"
                style={{
                  color: DocColors.accent,
                  borderBottom: `1px solid rgba(251,191,36,0.2)`,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              style={{
                borderTop:
                  i > 0 ? `1px solid ${DocColors.border}` : "none",
              }}
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-2.5 align-top"
                  style={{ color: DocColors.text }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Notice / callout */
export function DocNotice({
  type = "info",
  title,
  children,
}: {
  type?: "info" | "warn" | "err" | "ok" | "tip";
  title: string;
  children: React.ReactNode;
}) {
  const palette: Record<string, { bg: string; bd: string; fg: string; tag: string }> = {
    info: {
      bg: "rgba(6,182,212,0.06)",
      bd: "rgba(6,182,212,0.3)",
      fg: DocColors.cyan,
      tag: "INFO",
    },
    warn: {
      bg: "rgba(251,191,36,0.06)",
      bd: "rgba(251,191,36,0.3)",
      fg: DocColors.accent,
      tag: "VAROVÁNÍ",
    },
    err: {
      bg: "rgba(239,68,68,0.06)",
      bd: "rgba(239,68,68,0.3)",
      fg: DocColors.red,
      tag: "POZOR",
    },
    ok: {
      bg: "rgba(16,185,129,0.06)",
      bd: "rgba(16,185,129,0.3)",
      fg: DocColors.green,
      tag: "DOPORUČENO",
    },
    tip: {
      bg: "rgba(167,139,250,0.06)",
      bd: "rgba(167,139,250,0.3)",
      fg: DocColors.purple,
      tag: "TIP",
    },
  };
  const p = palette[type];
  return (
    <div
      className="rounded-xl p-4 md:p-5"
      style={{ background: p.bg, border: `1px solid ${p.bd}` }}
    >
      <div className="flex items-baseline gap-3 mb-2">
        <span
          className="text-[10px] font-mono uppercase tracking-[0.25em]"
          style={{ color: p.fg }}
        >
          {p.tag}
        </span>
        <span
          className="text-sm font-semibold"
          style={{ color: DocColors.text }}
        >
          {title}
        </span>
      </div>
      <div
        className="text-sm leading-relaxed"
        style={{ color: DocColors.text }}
      >
        {children}
      </div>
    </div>
  );
}
