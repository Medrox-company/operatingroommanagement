"use client";

import React from "react";

/**
 * Mapa závislostí mezi React komponenty / contexty / hooks / API.
 * Zjednodušený directed graph hlavních modulů.
 */
export function ModuleDependencyDiagram() {
  const C = {
    accent: "#FBBF24",
    accentSoft: "rgba(251,191,36,0.12)",
    accentLine: "rgba(251,191,36,0.45)",
    border: "rgba(255,255,255,0.14)",
    surface: "rgba(255,255,255,0.04)",
    text: "rgba(255,255,255,0.85)",
    muted: "rgba(255,255,255,0.5)",
    line: "rgba(255,255,255,0.2)",
    ctx: "#A78BFA",
    api: "#06B6D4",
    db: "#10B981",
  };

  type Node = {
    id: string;
    label: string;
    x: number;
    y: number;
    kind: "page" | "ctx" | "hook" | "api" | "db" | "comp";
  };

  const nodes: Node[] = [
    { id: "app", label: "App.tsx", x: 480, y: 60, kind: "page" },
    { id: "login", label: "LoginPage", x: 100, y: 60, kind: "page" },
    { id: "auth", label: "AuthContext", x: 220, y: 160, kind: "ctx" },
    { id: "ws", label: "WorkflowStatusesContext", x: 440, y: 160, kind: "ctx" },
    { id: "toast", label: "ToastProvider", x: 690, y: 160, kind: "ctx" },
    { id: "sidebar", label: "Sidebar", x: 90, y: 270, kind: "comp" },
    { id: "topbar", label: "TopBar", x: 230, y: 270, kind: "comp" },
    { id: "dash", label: "Dashboard", x: 380, y: 270, kind: "comp" },
    { id: "rd", label: "RoomDetail", x: 510, y: 270, kind: "comp" },
    { id: "tl", label: "TimelineModule", x: 640, y: 270, kind: "comp" },
    { id: "stat", label: "StatisticsModule", x: 780, y: 270, kind: "comp" },
    { id: "staff", label: "StaffManager", x: 90, y: 380, kind: "comp" },
    { id: "shift", label: "ShiftScheduleManager", x: 240, y: 380, kind: "comp" },
    { id: "rooms", label: "OperatingRoomsManager", x: 410, y: 380, kind: "comp" },
    { id: "depts", label: "DepartmentsManager", x: 580, y: 380, kind: "comp" },
    { id: "sysset", label: "SystemSettingsModule", x: 730, y: 380, kind: "comp" },
    { id: "mgmt", label: "ManagementManager", x: 870, y: 380, kind: "comp" },

    // Hooks
    { id: "rt", label: "useRealtimeSubscription", x: 90, y: 500, kind: "hook" },
    { id: "ea", label: "useEmergencyAlert", x: 280, y: 500, kind: "hook" },
    { id: "wfh", label: "useWorkflowStatuses", x: 470, y: 500, kind: "hook" },

    // API/lib
    { id: "db", label: "lib/db.ts", x: 670, y: 500, kind: "api" },
    { id: "api-auth", label: "/api/auth/*", x: 90, y: 600, kind: "api" },
    { id: "api-rooms", label: "/api/operating-rooms", x: 270, y: 600, kind: "api" },
    { id: "api-staff", label: "/api/staff/*", x: 460, y: 600, kind: "api" },
    { id: "api-stat", label: "/api/statistics/*", x: 620, y: 600, kind: "api" },
    { id: "api-notif", label: "/api/notifications", x: 800, y: 600, kind: "api" },

    // DB
    { id: "supabase", label: "Supabase Postgres", x: 480, y: 700, kind: "db" },
  ];

  const idx = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const edges: Array<[string, string]> = [
    ["login", "auth"],
    ["login", "api-auth"],
    ["app", "auth"],
    ["app", "ws"],
    ["app", "toast"],
    ["app", "sidebar"],
    ["app", "topbar"],
    ["app", "dash"],
    ["app", "rd"],
    ["app", "tl"],
    ["app", "stat"],
    ["app", "staff"],
    ["app", "shift"],
    ["app", "rooms"],
    ["app", "depts"],
    ["app", "sysset"],
    ["app", "mgmt"],
    ["dash", "rt"],
    ["dash", "ea"],
    ["rd", "wfh"],
    ["tl", "wfh"],
    ["stat", "db"],
    ["staff", "db"],
    ["shift", "db"],
    ["rooms", "db"],
    ["depts", "db"],
    ["sysset", "db"],
    ["mgmt", "db"],
    ["rd", "api-rooms"],
    ["tl", "api-rooms"],
    ["dash", "api-rooms"],
    ["staff", "api-staff"],
    ["shift", "api-staff"],
    ["stat", "api-stat"],
    ["topbar", "api-notif"],
    ["api-auth", "supabase"],
    ["api-rooms", "supabase"],
    ["api-staff", "supabase"],
    ["api-stat", "supabase"],
    ["api-notif", "supabase"],
    ["db", "supabase"],
  ];

  const colorOf = (k: Node["kind"]) =>
    k === "page"
      ? C.accent
      : k === "ctx"
        ? C.ctx
        : k === "hook"
          ? C.text
          : k === "api"
            ? C.api
            : k === "db"
              ? C.db
              : C.text;

  const sizeOf = (label: string) => Math.max(110, label.length * 6.5 + 18);

  return (
    <svg
      viewBox="0 0 980 760"
      role="img"
      aria-label="Mapa závislostí komponent"
      className="w-full h-auto"
    >
      <defs>
        <marker
          id="md-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={C.line} />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map(([from, to], i) => {
        const a = idx[from];
        const b = idx[to];
        if (!a || !b) return null;
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={C.line}
            strokeWidth="1"
            opacity="0.6"
            markerEnd="url(#md-arrow)"
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((n) => {
        const w = sizeOf(n.label);
        const h = 26;
        const color = colorOf(n.kind);
        return (
          <g key={n.id} transform={`translate(${n.x - w / 2}, ${n.y - h / 2})`}>
            <rect
              width={w}
              height={h}
              rx={8}
              fill={C.surface}
              stroke={color}
              opacity="0.95"
            />
            <text
              x={w / 2}
              y={h / 2 + 4}
              textAnchor="middle"
              fill={color}
              fontSize="9.5"
              fontFamily="monospace"
            >
              {n.label}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <g transform="translate(20, 720)">
        {[
          { c: C.accent, l: "Pages" },
          { c: C.ctx, l: "Contexts" },
          { c: C.text, l: "Hooks / Components" },
          { c: C.api, l: "API routes / DB lib" },
          { c: C.db, l: "Database" },
        ].map((item, i) => (
          <g key={item.l} transform={`translate(${i * 170}, 0)`}>
            <rect
              width={14}
              height={14}
              rx={3}
              fill={C.surface}
              stroke={item.c}
            />
            <text
              x={22}
              y={11}
              fill={C.muted}
              fontSize="10"
              fontFamily="monospace"
            >
              {item.l}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
