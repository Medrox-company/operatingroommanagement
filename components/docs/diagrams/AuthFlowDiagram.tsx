"use client";

import React from "react";

/**
 * Sekvenční diagram průběhu autentizace.
 */
export function AuthFlowDiagram() {
  const C = {
    accent: "#FBBF24",
    border: "rgba(255,255,255,0.14)",
    surface: "rgba(255,255,255,0.04)",
    text: "rgba(255,255,255,0.85)",
    muted: "rgba(255,255,255,0.5)",
    line: "rgba(255,255,255,0.25)",
    ok: "#10B981",
    err: "#EF4444",
  };

  const lanes = [
    { x: 80, label: "USER" },
    { x: 260, label: "LoginPage" },
    { x: 440, label: "/api/auth/login" },
    { x: 620, label: "Supabase" },
    { x: 800, label: "Cookie store" },
  ];

  const messages: Array<{
    fromIdx: number;
    toIdx: number;
    y: number;
    label: string;
    style?: "ok" | "err" | "default";
    dashed?: boolean;
  }> = [
    { fromIdx: 0, toIdx: 1, y: 110, label: "Vyplnit email + heslo" },
    {
      fromIdx: 1,
      toIdx: 2,
      y: 145,
      label: "POST { email, password }",
    },
    {
      fromIdx: 2,
      toIdx: 3,
      y: 180,
      label: "SELECT app_users WHERE email = ?",
    },
    {
      fromIdx: 3,
      toIdx: 2,
      y: 215,
      label: "row { password_hash, role, is_active }",
      dashed: true,
    },
    {
      fromIdx: 2,
      toIdx: 2,
      y: 250,
      label: "bcrypt.compare(password, hash)",
    },
    {
      fromIdx: 2,
      toIdx: 4,
      y: 290,
      label: "Set-Cookie: orm_session (HttpOnly)",
      style: "ok",
    },
    {
      fromIdx: 2,
      toIdx: 1,
      y: 325,
      label: "200 { user, role, modules }",
      style: "ok",
      dashed: true,
    },
    { fromIdx: 1, toIdx: 0, y: 360, label: "Redirect → /", style: "ok" },
    {
      fromIdx: 2,
      toIdx: 1,
      y: 410,
      label: "401 (špatné heslo)",
      style: "err",
      dashed: true,
    },
  ];

  return (
    <svg
      viewBox="0 0 880 480"
      role="img"
      aria-label="Sekvenční diagram autentizace"
      className="w-full h-auto"
    >
      <defs>
        <marker
          id="auth-arrow-default"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={C.text} />
        </marker>
        <marker
          id="auth-arrow-ok"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={C.ok} />
        </marker>
        <marker
          id="auth-arrow-err"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={C.err} />
        </marker>
      </defs>

      {/* Lanes */}
      {lanes.map((l) => (
        <g key={l.label}>
          <rect
            x={l.x - 60}
            y={30}
            width={120}
            height={32}
            rx={8}
            fill={C.surface}
            stroke={C.border}
          />
          <text
            x={l.x}
            y={51}
            textAnchor="middle"
            fill={C.text}
            fontSize="11"
            fontFamily="monospace"
          >
            {l.label}
          </text>
          <line
            x1={l.x}
            y1={62}
            x2={l.x}
            y2={460}
            stroke={C.line}
            strokeDasharray="4 4"
          />
        </g>
      ))}

      {/* Messages */}
      {messages.map((m, i) => {
        const fromX = lanes[m.fromIdx].x;
        const toX = lanes[m.toIdx].x;
        const color =
          m.style === "ok" ? C.ok : m.style === "err" ? C.err : C.text;
        const marker =
          m.style === "ok"
            ? "url(#auth-arrow-ok)"
            : m.style === "err"
              ? "url(#auth-arrow-err)"
              : "url(#auth-arrow-default)";

        if (m.fromIdx === m.toIdx) {
          // self-call
          const x = fromX + 8;
          return (
            <g key={i}>
              <path
                d={`M ${x} ${m.y - 8} L ${x + 40} ${m.y - 8} L ${x + 40} ${m.y + 8} L ${x} ${m.y + 8}`}
                stroke={color}
                fill="none"
                strokeDasharray={m.dashed ? "4 3" : undefined}
                markerEnd={marker}
              />
              <text
                x={x + 50}
                y={m.y + 4}
                fill={C.text}
                fontSize="10"
                fontFamily="monospace"
              >
                {m.label}
              </text>
            </g>
          );
        }

        return (
          <g key={i}>
            <line
              x1={fromX}
              y1={m.y}
              x2={toX}
              y2={m.y}
              stroke={color}
              strokeWidth="1.4"
              strokeDasharray={m.dashed ? "5 4" : undefined}
              markerEnd={marker}
            />
            <text
              x={(fromX + toX) / 2}
              y={m.y - 6}
              textAnchor="middle"
              fill={C.text}
              fontSize="10"
              fontFamily="monospace"
            >
              {m.label}
            </text>
          </g>
        );
      })}

      {/* Section dividers */}
      <text
        x={20}
        y={100}
        fill={C.accent}
        fontSize="9"
        fontFamily="monospace"
        letterSpacing="2"
      >
        HAPPY PATH
      </text>
      <text
        x={20}
        y={400}
        fill={C.err}
        fontSize="9"
        fontFamily="monospace"
        letterSpacing="2"
      >
        ERROR PATH
      </text>
    </svg>
  );
}
