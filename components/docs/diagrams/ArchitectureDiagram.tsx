"use client";

import React from "react";

/**
 * Třívrstvá architektura aplikace OperatingRoom Manager.
 * - Client (React/Next.js)
 * - Server (Next.js Route Handlers + Edge Middleware)
 * - Database (Supabase / Postgres)
 */
export function ArchitectureDiagram() {
  const C = {
    accent: "#FBBF24",
    accentSoft: "rgba(251,191,36,0.08)",
    accentLine: "rgba(251,191,36,0.35)",
    border: "rgba(255,255,255,0.12)",
    surface: "rgba(255,255,255,0.04)",
    text: "rgba(255,255,255,0.85)",
    muted: "rgba(255,255,255,0.45)",
    line: "rgba(255,255,255,0.2)",
  };

  return (
    <svg
      viewBox="0 0 900 560"
      role="img"
      aria-label="Třívrstvá architektura aplikace"
      className="w-full h-auto"
    >
      <defs>
        <marker
          id="arch-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={C.accent} />
        </marker>
      </defs>

      {/* Layer titles */}
      {[
        { y: 50, label: "CLIENT", note: "Browser / React" },
        { y: 240, label: "SERVER", note: "Next.js Route Handlers" },
        { y: 430, label: "DATA", note: "Supabase Postgres" },
      ].map((layer) => (
        <g key={layer.label}>
          <text
            x={32}
            y={layer.y - 6}
            fill={C.muted}
            fontSize="10"
            fontFamily="monospace"
            letterSpacing="3"
          >
            {layer.label}
          </text>
          <text
            x={32}
            y={layer.y + 8}
            fill={C.text}
            fontSize="11"
            fontFamily="sans-serif"
          >
            {layer.note}
          </text>
        </g>
      ))}

      {/* CLIENT layer boxes */}
      {[
        { x: 200, label: "LoginPage" },
        { x: 350, label: "Dashboard" },
        { x: 500, label: "RoomDetail" },
        { x: 650, label: "Statistics" },
        { x: 800, label: "Admin moduly" },
      ].map((b) => (
        <g key={b.label} transform={`translate(${b.x - 60}, 30)`}>
          <rect
            width="120"
            height="50"
            rx="10"
            fill={C.surface}
            stroke={C.border}
          />
          <text
            x="60"
            y="30"
            textAnchor="middle"
            fill={C.text}
            fontSize="11"
            fontFamily="sans-serif"
          >
            {b.label}
          </text>
        </g>
      ))}

      {/* React contexts band */}
      <g transform="translate(140, 110)">
        <rect
          width="720"
          height="60"
          rx="12"
          fill={C.accentSoft}
          stroke={C.accentLine}
          strokeDasharray="4 4"
        />
        <text
          x="360"
          y="28"
          textAnchor="middle"
          fill={C.accent}
          fontSize="10"
          fontFamily="monospace"
          letterSpacing="2"
        >
          REACT CONTEXTS
        </text>
        <text
          x="360"
          y="48"
          textAnchor="middle"
          fill={C.text}
          fontSize="11"
          fontFamily="sans-serif"
        >
          AuthContext · WorkflowStatusesContext · ToastProvider
        </text>
      </g>

      {/* SERVER layer boxes */}
      {[
        { x: 200, label: "/api/auth/*" },
        { x: 350, label: "/api/operating-rooms" },
        { x: 500, label: "/api/staff/*" },
        { x: 650, label: "/api/statistics/*" },
        { x: 800, label: "/api/notifications" },
      ].map((b) => (
        <g key={b.label} transform={`translate(${b.x - 70}, 220)`}>
          <rect
            width="140"
            height="50"
            rx="10"
            fill={C.surface}
            stroke={C.border}
          />
          <text
            x="70"
            y="30"
            textAnchor="middle"
            fill={C.text}
            fontSize="11"
            fontFamily="monospace"
          >
            {b.label}
          </text>
        </g>
      ))}

      {/* Middleware band */}
      <g transform="translate(140, 300)">
        <rect
          width="720"
          height="44"
          rx="10"
          fill={C.surface}
          stroke={C.border}
        />
        <text
          x="360"
          y="20"
          textAnchor="middle"
          fill={C.muted}
          fontSize="10"
          fontFamily="monospace"
          letterSpacing="2"
        >
          EDGE MIDDLEWARE
        </text>
        <text
          x="360"
          y="36"
          textAnchor="middle"
          fill={C.text}
          fontSize="11"
          fontFamily="sans-serif"
        >
          Session cookie verification · Route protection · CSRF
        </text>
      </g>

      {/* Database tables */}
      {[
        { x: 160, label: "app_users" },
        { x: 290, label: "operating_rooms" },
        { x: 430, label: "staff" },
        { x: 550, label: "shift_schedules" },
        { x: 680, label: "workflow_statuses" },
        { x: 820, label: "operations_log" },
      ].map((t) => (
        <g key={t.label} transform={`translate(${t.x - 60}, 410)`}>
          <rect
            width="120"
            height="42"
            rx="8"
            fill={C.surface}
            stroke={C.accentLine}
          />
          <text
            x="60"
            y="26"
            textAnchor="middle"
            fill={C.text}
            fontSize="10.5"
            fontFamily="monospace"
          >
            {t.label}
          </text>
        </g>
      ))}

      {/* Connecting lines: client → server */}
      {[200, 350, 500, 650, 800].map((x) => (
        <line
          key={`cs-${x}`}
          x1={x}
          y1={170}
          x2={x}
          y2={220}
          stroke={C.line}
          strokeWidth="1.2"
          markerEnd="url(#arch-arrow)"
        />
      ))}

      {/* Connecting lines: server → middleware */}
      {[200, 350, 500, 650, 800].map((x) => (
        <line
          key={`sm-${x}`}
          x1={x}
          y1={270}
          x2={x}
          y2={300}
          stroke={C.line}
          strokeWidth="1"
        />
      ))}

      {/* Middleware → DB */}
      <line
        x1={500}
        y1={344}
        x2={500}
        y2={410}
        stroke={C.accent}
        strokeWidth="1.4"
        markerEnd="url(#arch-arrow)"
      />

      {/* External services */}
      <g transform="translate(40, 410)">
        <rect
          width="80"
          height="42"
          rx="8"
          fill={C.surface}
          stroke={C.border}
          strokeDasharray="3 3"
        />
        <text
          x="40"
          y="26"
          textAnchor="middle"
          fill={C.muted}
          fontSize="10"
          fontFamily="monospace"
        >
          SMTP
        </text>
      </g>

      {/* Footer note */}
      <text
        x="450"
        y="530"
        textAnchor="middle"
        fill={C.muted}
        fontSize="10"
        fontFamily="sans-serif"
      >
        Datový tok: prohlížeč → Route Handler → Edge middleware → Supabase RPC/SELECT
      </text>
    </svg>
  );
}
