"use client";

import {
  DocSection,
  DocSubsection,
  DocCard,
  DocCode,
  DocCodeBlock,
  DocTable,
  DocNotice,
} from "../DocPrimitives";
import { ArchitectureDiagram } from "../diagrams/ArchitectureDiagram";

export function Section02Architecture() {
  return (
    <DocSection
      id="architektura"
      number="02"
      title="Architektura aplikace"
      subtitle="Třívrstvý model: klient (React) → server (Next.js Route Handlers) → databáze (Supabase Postgres)."
    >
      <DocCard>
        <ArchitectureDiagram />
      </DocCard>

      <DocSubsection number="2.1" title="Adresářová struktura">
        <DocCodeBlock language="filesystem">
          {`/
├── app/                            # Next.js App Router
│   ├── api/                        # Route Handlers (server)
│   │   ├── auth/{login,logout,me}/
│   │   ├── operating-rooms/{,reorder}/
│   │   ├── staff/[id]/
│   │   ├── statistics/
│   │   ├── notifications/
│   │   ├── workflow-statuses/
│   │   └── ...
│   ├── docs/                       # Dokumentační stránka (in-app PDF)
│   ├── globals.css                 # Tailwind + design tokens
│   └── layout.tsx                  # Root layout (fonts, metadata)
├── components/
│   ├── docs/                       # Komponenty této dokumentace
│   ├── mobile/                     # Mobilní specifické (MobileStaffView)
│   ├── LoginPage.tsx               # Přihlašovací stránka (žlutý accent)
│   ├── App.tsx                     # Hlavní shell aplikace
│   ├── Sidebar.tsx, TopBar.tsx     # Navigace
│   ├── RoomDetail.tsx              # Detail operačního sálu
│   ├── StatisticsModule.tsx
│   ├── StaffManager.tsx
│   └── ...
├── contexts/
│   ├── AuthContext.tsx             # Aktuální uživatel + role + modul access
│   └── WorkflowStatusesContext.tsx # Globální stavy workflow
├── hooks/
│   ├── useRealtimeSubscription.ts  # Supabase realtime
│   ├── useEmergencyAlert.ts        # Audio alert (AudioContext)
│   └── useWorkflowStatuses.ts
├── lib/
│   ├── db.ts                       # Supabase queries (transformRoom, ...)
│   ├── auth.ts                     # bcrypt + session cookie
│   └── supabase/{client,server}.ts # Klientské + serverové instance
├── types.ts                        # TypeScript typy doménových modelů
├── constants.ts                    # SIDEBAR_ITEMS, DEPT_COLORS, ...
└── middleware.ts                   # Edge middleware (route protection)`}
        </DocCodeBlock>
      </DocSubsection>

      <DocSubsection number="2.2" title="Datový tok (request lifecycle)">
        <DocCard>
          <ol
            className="space-y-2.5 text-sm leading-relaxed list-decimal list-outside ml-5"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            <li>
              <strong>Browser</strong> načte hlavní bundle z Vercel Edge
              CDN (RSC + client komponenty).
            </li>
            <li>
              <strong>Edge middleware</strong> (<DocCode>middleware.ts</DocCode>)
              ověří session cookie <DocCode>orm_session</DocCode> a
              přesměruje neautentizované požadavky na{" "}
              <DocCode>/login</DocCode>.
            </li>
            <li>
              <strong>React komponenty</strong> volají Route Handlery (např.
              <DocCode>fetch(&apos;/api/operating-rooms&apos;)</DocCode>) — buď
              přes SWR, nebo přímý <DocCode>fetch</DocCode>.
            </li>
            <li>
              <strong>Route Handler</strong> verifikuje session, sestaví
              Supabase klienta s service-role klíčem (server-side) a
              spustí dotaz/mutaci.
            </li>
            <li>
              <strong>Supabase</strong> vykoná SQL dotaz, vrátí JSON.
              Realtime kanály push přes WebSocket do{" "}
              <DocCode>useRealtimeSubscription</DocCode>.
            </li>
            <li>
              <strong>Klient</strong> aktualizuje stav (Context, lokální
              state) → React re-render.
            </li>
          </ol>
        </DocCard>
      </DocSubsection>

      <DocSubsection number="2.3" title="Designový systém (LoginPage style)">
        <DocTable
          headers={["Token", "Hodnota", "Použití"]}
          rows={[
            [<DocCode key="1">accent</DocCode>, "#FBBF24 (žlutá)", "Brand barva, primary tlačítka, aktivní stav nav."],
            [<DocCode key="2">cyan</DocCode>, "#06B6D4", "Sekundární akcent, info tone, ARO role."],
            [<DocCode key="3">green</DocCode>, "#10B981", "Status OK, online indikátor."],
            [<DocCode key="4">red</DocCode>, "#EF4444", "Errors, akutní zákroky, destructive."],
            [<DocCode key="5">surface</DocCode>, "rgba(255,255,255,0.025)", "Pozadí karet."],
            [<DocCode key="6">glass</DocCode>, "rgba(255,255,255,0.04)", "Glassmorph elementy."],
            [<DocCode key="7">border</DocCode>, "rgba(255,255,255,0.07)", "Subtilní hrany."],
          ]}
        />
        <DocNotice type="tip" title="Typografie">
          Nadpisy modulů používají <DocCode>font-bold tracking-tight</DocCode>{" "}
          (sjednoceno s LoginPage). Mono font (<DocCode>JetBrains Mono</DocCode>)
          je vyhrazen pro datové štítky, kód, časy a status indikátory.
        </DocNotice>
      </DocSubsection>
    </DocSection>
  );
}
