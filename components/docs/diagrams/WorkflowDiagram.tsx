"use client";

import React from "react";

/**
 * Stavový diagram operačního sálu — workflow statusy.
 */
export function WorkflowDiagram() {
  const C = {
    accent: "#FBBF24",
    border: "rgba(255,255,255,0.14)",
    surface: "rgba(255,255,255,0.04)",
    text: "rgba(255,255,255,0.85)",
    muted: "rgba(255,255,255,0.5)",
    line: "rgba(255,255,255,0.25)",
    free: "#10B981",
    prep: "#06B6D4",
    op: "#FBBF24",
    clean: "#A78BFA",
    err: "#EF4444",
  };

  const states = [
    { id: "free", x: 100, y: 200, label: "FREE", desc: "Sál volný", color: C.free },
    {
      id: "prep",
      x: 300,
      y: 200,
      label: "PREPARATION",
      desc: "Příprava pacienta",
      color: C.prep,
    },
    {
      id: "op",
      x: 500,
      y: 200,
      label: "IN OPERATION",
      desc: "Probíhá operace",
      color: C.op,
    },
    {
      id: "clean",
      x: 700,
      y: 200,
      label: "CLEANING",
      desc: "Úklid sálu",
      color: C.clean,
    },
    {
      id: "emerg",
      x: 500,
      y: 380,
      label: "EMERGENCY",
      desc: "Akutní zákrok",
      color: C.err,
    },
  ];

  type Edge = {
    from: string;
    to: string;
    label: string;
    curve?: number;
  };

  const edges: Edge[] = [
    { from: "free", to: "prep", label: "Naplánovat" },
    { from: "prep", to: "op", label: "Začít operaci" },
    { from: "op", to: "clean", label: "Dokončit" },
    { from: "clean", to: "free", label: "Hotovo", curve: -100 },
    { from: "free", to: "emerg", label: "Akut" },
    { from: "prep", to: "emerg", label: "Akut" },
    { from: "emerg", to: "op", label: "Stabilizováno" },
  ];

  const idx = Object.fromEntries(states.map((s) => [s.id, s]));

  return (
    <svg
      viewBox="0 0 800 480"
      role="img"
      aria-label="Workflow stavů operačního sálu"
      className="w-full h-auto"
    >
      <defs>
        <marker
          id="wf-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={C.text} />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((e, i) => {
        const a = idx[e.from];
        const b = idx[e.to];
        if (!a || !b) return null;
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2 + (e.curve || 0);
        const path = `M ${a.x} ${a.y} Q ${midX} ${midY}, ${b.x} ${b.y}`;
        return (
          <g key={i}>
            <path
              d={path}
              fill="none"
              stroke={C.line}
              strokeWidth="1.4"
              markerEnd="url(#wf-arrow)"
            />
            <text
              x={midX}
              y={midY - 8}
              textAnchor="middle"
              fill={C.muted}
              fontSize="10"
              fontFamily="monospace"
            >
              {e.label}
            </text>
          </g>
        );
      })}

      {/* States */}
      {states.map((s) => (
        <g key={s.id} transform={`translate(${s.x - 70}, ${s.y - 30})`}>
          <rect
            width={140}
            height={60}
            rx={14}
            fill={C.surface}
            stroke={s.color}
            strokeWidth="1.5"
          />
          <circle cx={14} cy={20} r="5" fill={s.color} />
          <text
            x={28}
            y={24}
            fill={s.color}
            fontSize="10.5"
            fontFamily="monospace"
            fontWeight="700"
          >
            {s.label}
          </text>
          <text
            x={14}
            y={46}
            fill={C.text}
            fontSize="9.5"
            fontFamily="sans-serif"
          >
            {s.desc}
          </text>
        </g>
      ))}

      {/* Title */}
      <text
        x={400}
        y={40}
        textAnchor="middle"
        fill={C.accent}
        fontSize="11"
        fontFamily="monospace"
        letterSpacing="3"
      >
        ROOM STATUS LIFECYCLE
      </text>
      <text
        x={400}
        y={60}
        textAnchor="middle"
        fill={C.muted}
        fontSize="10"
        fontFamily="sans-serif"
      >
        Stavy konfigurovatelné v Admin → Statusy
      </text>

      {/* Footer note */}
      <text
        x={400}
        y={460}
        textAnchor="middle"
        fill={C.muted}
        fontSize="9.5"
        fontFamily="sans-serif"
      >
        Změna stavu spustí WorkflowStatusesContext.update() → /api/operating-rooms PATCH
      </text>
    </svg>
  );
}
