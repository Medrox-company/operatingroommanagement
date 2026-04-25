"use client";

import {
  DocSection,
  DocSubsection,
  DocCard,
  DocCode,
  DocCodeBlock,
  DocTable,
  DocBadge,
  DocNotice,
} from "../DocPrimitives";

export function Section08Dependencies() {
  return (
    <DocSection
      id="zavislosti"
      number="08"
      title="Závislosti aplikace (npm + DB + ENV)"
      subtitle="Externí balíčky, environment proměnné, integrace třetích stran."
    >
      <DocSubsection number="8.1" title="NPM balíčky — runtime">
        <DocTable
          headers={["Balíček", "Účel", "Použito v"]}
          rows={[
            [
              <DocCode key="1">next</DocCode>,
              "App Router framework, Edge runtime, Image optim.",
              "celá aplikace",
            ],
            [
              <DocCode key="2">react / react-dom</DocCode>,
              "UI knihovna, Server Components.",
              "všechny komponenty",
            ],
            [
              <DocCode key="3">@supabase/supabase-js</DocCode>,
              "Postgres client, Realtime.",
              "lib/supabase/*",
            ],
            [
              <DocCode key="4">@supabase/ssr</DocCode>,
              "Server-side cookie helpers pro Next.js.",
              "lib/supabase/server.ts",
            ],
            [
              <DocCode key="5">bcryptjs</DocCode>,
              "Hashování hesel (12 rounds).",
              "lib/auth.ts",
            ],
            [
              <DocCode key="6">jose</DocCode>,
              "JWT signing/verifying pro session token.",
              "lib/auth.ts",
            ],
            [
              <DocCode key="7">framer-motion</DocCode>,
              "Animace tlačítek, modálů, stránek.",
              "většina UI komponent",
            ],
            [
              <DocCode key="8">lucide-react</DocCode>,
              "Sada vektorových ikon.",
              "celá aplikace",
            ],
            [
              <DocCode key="9">@dnd-kit/*</DocCode>,
              "Drag-n-drop pro reorder sálů a směn.",
              "OperatingRoomsManager, ShiftScheduleManager",
            ],
            [
              <DocCode key="10">date-fns</DocCode>,
              "Práce s daty/časy v lokalizaci cs.",
              "Timeline, Statistics",
            ],
            [
              <DocCode key="11">tailwindcss</DocCode>,
              "Utility-first CSS, design tokens.",
              "globals.css, všechna UI",
            ],
            [
              <DocCode key="12">jspdf + html2canvas</DocCode>,
              "Client-side PDF export této dokumentace.",
              "components/docs/DocsPage",
            ],
          ]}
        />
      </DocSubsection>

      <DocSubsection number="8.2" title="Environment proměnné">
        <DocTable
          headers={["Klíč", "Strana", "Popis"]}
          rows={[
            [
              <DocCode key="1">NEXT_PUBLIC_SUPABASE_URL</DocCode>,
              <DocBadge tone="info" key="2">CLIENT</DocBadge>,
              "URL Supabase projektu.",
            ],
            [
              <DocCode key="3">NEXT_PUBLIC_SUPABASE_ANON_KEY</DocCode>,
              <DocBadge tone="info" key="4">CLIENT</DocBadge>,
              "Anon klíč pro klientské realtime subscription.",
            ],
            [
              <DocCode key="5">SUPABASE_SERVICE_ROLE_KEY</DocCode>,
              <DocBadge tone="err" key="6">SERVER</DocBadge>,
              "Service-role klíč. NIKDY nesmí být na klientovi!",
            ],
            [
              <DocCode key="7">SESSION_SECRET</DocCode>,
              <DocBadge tone="err" key="8">SERVER</DocBadge>,
              "Tajný klíč pro JWT podpis (>= 32 bytes).",
            ],
            [
              <DocCode key="9">SMTP_HOST / SMTP_USER / SMTP_PASS</DocCode>,
              <DocBadge tone="err" key="10">SERVER</DocBadge>,
              "Volitelné — pro odesílání e-mail notifikací.",
            ],
            [
              <DocCode key="11">SUPABASE_URL</DocCode>,
              <DocBadge tone="err" key="12">SERVER</DocBadge>,
              "Stejné jako NEXT_PUBLIC_SUPABASE_URL, ale pro server (auto-set Vercel integration).",
            ],
          ]}
        />
        <DocNotice type="err" title="Service role klíč nikdy do klienta">
          Klíč <DocCode>SUPABASE_SERVICE_ROLE_KEY</DocCode> obchází RLS a
          dovoluje libovolnou operaci. <strong>MUSÍ</strong> zůstat výhradně
          v Route Handlerech a serverových funkcích — nikdy v souborech
          komponent ani v klientském JS.
        </DocNotice>
      </DocSubsection>

      <DocSubsection number="8.3" title="Externí služby">
        <DocTable
          headers={["Služba", "Použití", "Konfigurace"]}
          rows={[
            [
              "Supabase",
              "Postgres DB, Realtime, Auth helpers.",
              "Vercel integration → ENV proměnné se setnou automaticky.",
            ],
            [
              "Vercel",
              "Hosting, Edge Network, Build CI.",
              "Auto-deploy z GitHub branch main.",
            ],
            [
              "SMTP poskytovatel",
              "Odesílání akutních notifikací.",
              "Volitelné — pokud SMTP_* env nejsou nastavené, notifikace zůstávají jen in-app.",
            ],
          ]}
        />
      </DocSubsection>

      <DocSubsection number="8.4" title="package.json (výňatek)">
        <DocCodeBlock language="json">
          {`{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "bcryptjs": "^2.4.3",
    "jose": "^5.9.0",
    "framer-motion": "^12.0.0",
    "lucide-react": "^0.460.0",
    "date-fns": "^3.6.0",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "tailwindcss": "^4.0.0"
  }
}`}
        </DocCodeBlock>
      </DocSubsection>
    </DocSection>
  );
}
