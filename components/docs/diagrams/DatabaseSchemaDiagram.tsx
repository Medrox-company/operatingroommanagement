"use client";

import React from "react";

type Col = { name: string; type: string; pk?: boolean; fk?: boolean };
type Tbl = { x: number; y: number; w: number; name: string; cols: Col[] };

/**
 * Zjednodušené ER schéma hlavních tabulek aplikace.
 * Vychází z Supabase project krljrxescufmdtfvlaqm.
 */
export function DatabaseSchemaDiagram() {
  const C = {
    accent: "#FBBF24",
    accentSoft: "rgba(251,191,36,0.12)",
    accentLine: "rgba(251,191,36,0.45)",
    border: "rgba(255,255,255,0.14)",
    surface: "rgba(255,255,255,0.04)",
    text: "rgba(255,255,255,0.85)",
    muted: "rgba(255,255,255,0.5)",
    fk: "#06B6D4",
    pk: "#FBBF24",
  };

  const tables: Tbl[] = [
    {
      x: 30,
      y: 40,
      w: 200,
      name: "app_users",
      cols: [
        { name: "id", type: "uuid", pk: true },
        { name: "email", type: "text" },
        { name: "name", type: "text" },
        { name: "role", type: "text" },
        { name: "password_hash", type: "text" },
        { name: "is_active", type: "bool" },
      ],
    },
    {
      x: 270,
      y: 40,
      w: 220,
      name: "operating_rooms",
      cols: [
        { name: "id", type: "uuid", pk: true },
        { name: "name", type: "text" },
        { name: "department", type: "text" },
        { name: "status", type: "text" },
        { name: "sort_order", type: "int" },
        { name: "weekly_schedule", type: "jsonb" },
        { name: "current_operation", type: "jsonb" },
      ],
    },
    {
      x: 530,
      y: 40,
      w: 200,
      name: "staff",
      cols: [
        { name: "id", type: "uuid", pk: true },
        { name: "name", type: "text" },
        { name: "role", type: "text" },
        { name: "department", type: "text" },
        { name: "phone", type: "text" },
        { name: "email", type: "text" },
      ],
    },
    {
      x: 770,
      y: 40,
      w: 200,
      name: "departments",
      cols: [
        { name: "id", type: "uuid", pk: true },
        { name: "code", type: "text" },
        { name: "name", type: "text" },
        { name: "color", type: "text" },
        { name: "sort_order", type: "int" },
      ],
    },
    {
      x: 30,
      y: 280,
      w: 220,
      name: "shift_schedules",
      cols: [
        { name: "id", type: "uuid", pk: true },
        { name: "staff_id", type: "uuid", fk: true },
        { name: "date", type: "date" },
        { name: "shift_type", type: "text" },
        { name: "department", type: "text" },
      ],
    },
    {
      x: 290,
      y: 280,
      w: 220,
      name: "workflow_statuses",
      cols: [
        { name: "id", type: "uuid", pk: true },
        { name: "name", type: "text" },
        { name: "color", type: "text" },
        { name: "icon", type: "text" },
        { name: "sort_order", type: "int" },
      ],
    },
    {
      x: 550,
      y: 280,
      w: 220,
      name: "operations_log",
      cols: [
        { name: "id", type: "uuid", pk: true },
        { name: "room_id", type: "uuid", fk: true },
        { name: "patient_id", type: "text" },
        { name: "operation_type", type: "text" },
        { name: "department", type: "text" },
        { name: "started_at", type: "timestamptz" },
        { name: "completed_at", type: "timestamptz" },
      ],
    },
    {
      x: 810,
      y: 280,
      w: 200,
      name: "notifications",
      cols: [
        { name: "id", type: "uuid", pk: true },
        { name: "user_id", type: "uuid", fk: true },
        { name: "type", type: "text" },
        { name: "payload", type: "jsonb" },
        { name: "read_at", type: "timestamptz" },
      ],
    },
    {
      x: 30,
      y: 540,
      w: 220,
      name: "system_settings",
      cols: [
        { name: "id", type: "uuid", pk: true },
        { name: "key", type: "text" },
        { name: "value", type: "jsonb" },
        { name: "updated_at", type: "timestamptz" },
      ],
    },
    {
      x: 290,
      y: 540,
      w: 220,
      name: "module_access",
      cols: [
        { name: "id", type: "uuid", pk: true },
        { name: "module_id", type: "text" },
        { name: "role", type: "text" },
        { name: "is_enabled", type: "bool" },
      ],
    },
    {
      x: 550,
      y: 540,
      w: 220,
      name: "background_settings",
      cols: [
        { name: "id", type: "uuid", pk: true },
        { name: "type", type: "text" },
        { name: "config", type: "jsonb" },
        { name: "is_active", type: "bool" },
      ],
    },
    {
      x: 810,
      y: 540,
      w: 200,
      name: "management_contacts",
      cols: [
        { name: "id", type: "uuid", pk: true },
        { name: "name", type: "text" },
        { name: "role", type: "text" },
        { name: "phone", type: "text" },
        { name: "email", type: "text" },
      ],
    },
  ];

  const headerH = 26;
  const rowH = 18;

  const rowY = (t: Tbl, idx: number) => t.y + headerH + idx * rowH + rowH / 2;
  const colCenterY = (t: Tbl, colName: string) => {
    const idx = t.cols.findIndex((c) => c.name === colName);
    return rowY(t, idx);
  };

  const findTbl = (name: string) => tables.find((t) => t.name === name)!;

  // FK relationships
  const rels = [
    { from: ["shift_schedules", "staff_id"], to: ["staff", "id"] },
    { from: ["operations_log", "room_id"], to: ["operating_rooms", "id"] },
    { from: ["notifications", "user_id"], to: ["app_users", "id"] },
  ];

  return (
    <svg
      viewBox="0 0 1040 760"
      role="img"
      aria-label="ER schéma databáze"
      className="w-full h-auto"
    >
      <defs>
        <marker
          id="db-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={C.fk} />
        </marker>
      </defs>

      {/* FK lines */}
      {rels.map((r, i) => {
        const a = findTbl(r.from[0]);
        const b = findTbl(r.to[0]);
        const ay = colCenterY(a, r.from[1]);
        const by = colCenterY(b, r.to[1]);
        const ax = a.x + a.w; // right edge of source
        const bx = b.x; // left edge of target
        const midX = (ax + bx) / 2;
        const path = `M ${ax} ${ay} C ${midX} ${ay}, ${midX} ${by}, ${bx} ${by}`;
        return (
          <path
            key={i}
            d={path}
            stroke={C.fk}
            strokeWidth="1.4"
            fill="none"
            markerEnd="url(#db-arrow)"
            opacity="0.85"
          />
        );
      })}

      {/* Tables */}
      {tables.map((t) => {
        const h = headerH + t.cols.length * rowH + 8;
        return (
          <g key={t.name} transform={`translate(${t.x}, ${t.y})`}>
            <rect
              width={t.w}
              height={h}
              rx="8"
              fill={C.surface}
              stroke={C.border}
            />
            {/* Header */}
            <rect width={t.w} height={headerH} rx="8" fill={C.accentSoft} />
            <rect
              y={headerH - 8}
              width={t.w}
              height={8}
              fill={C.accentSoft}
            />
            <line
              x1={0}
              y1={headerH}
              x2={t.w}
              y2={headerH}
              stroke={C.accentLine}
            />
            <text
              x={12}
              y={17}
              fill={C.accent}
              fontSize="11.5"
              fontFamily="monospace"
              fontWeight="700"
            >
              {t.name}
            </text>

            {/* Columns */}
            {t.cols.map((col, idx) => {
              const y = headerH + idx * rowH + rowH - 5;
              return (
                <g key={col.name}>
                  {/* Key icon */}
                  {col.pk && (
                    <circle cx={12} cy={y - 4} r="3" fill={C.pk} />
                  )}
                  {col.fk && (
                    <circle
                      cx={12}
                      cy={y - 4}
                      r="3"
                      fill="none"
                      stroke={C.fk}
                      strokeWidth="1.4"
                    />
                  )}
                  <text
                    x={24}
                    y={y}
                    fill={col.pk ? C.accent : col.fk ? C.fk : C.text}
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {col.name}
                  </text>
                  <text
                    x={t.w - 10}
                    y={y}
                    textAnchor="end"
                    fill={C.muted}
                    fontSize="9.5"
                    fontFamily="monospace"
                  >
                    {col.type}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Legend */}
      <g transform="translate(30, 720)">
        <circle cx={6} cy={4} r="3" fill={C.pk} />
        <text x={16} y={8} fill={C.muted} fontSize="9.5" fontFamily="monospace">
          PRIMARY KEY
        </text>
        <circle
          cx={130}
          cy={4}
          r="3"
          fill="none"
          stroke={C.fk}
          strokeWidth="1.4"
        />
        <text
          x={140}
          y={8}
          fill={C.muted}
          fontSize="9.5"
          fontFamily="monospace"
        >
          FOREIGN KEY
        </text>
        <line
          x1={250}
          y1={4}
          x2={290}
          y2={4}
          stroke={C.fk}
          strokeWidth="1.4"
        />
        <text
          x={296}
          y={8}
          fill={C.muted}
          fontSize="9.5"
          fontFamily="monospace"
        >
          REFERENCES
        </text>
      </g>
    </svg>
  );
}
