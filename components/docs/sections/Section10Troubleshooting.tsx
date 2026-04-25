"use client";

import {
  DocSection,
  DocSubsection,
  DocCard,
  DocCode,
  DocBadge,
  DocTable,
  DocNotice,
} from "../DocPrimitives";

export function Section10Troubleshooting() {
  return (
    <DocSection
      id="troubleshooting"
      number="10"
      title="Troubleshooting & FAQ"
      subtitle="Časté problémy, jejich příčiny a postup řešení."
    >
      <DocSubsection number="10.1" title="Nejde přihlášení">
        <DocTable
          headers={["Symptom", "Příčina", "Řešení"]}
          rows={[
            [
              <span key="1">
                <DocBadge tone="err">401</DocBadge> Neplatné přihlašovací údaje
              </span>,
              "Špatný email nebo heslo, případně is_active = false.",
              "Zkontrolujte v DB tabulce app_users, obnovte heslo přes Admin.",
            ],
            [
              <span key="2">Po přihlášení redirect na /login</span>,
              "Cookie SESSION_SECRET se nevygeneroval — chybí ENV var.",
              "Doplňte SESSION_SECRET v Vercel Project → Environment Variables.",
            ],
            [
              <span key="3">Chyba „Failed to fetch“</span>,
              "NEXT_PUBLIC_SUPABASE_URL nebo ANON_KEY nejsou nastaveny.",
              "Settings → Vars: ověřte přítomnost obou klíčů.",
            ],
          ]}
        />
      </DocSubsection>

      <DocSubsection number="10.2" title="Realtime updaty nefungují">
        <DocCard>
          <p
            className="text-sm leading-relaxed mb-3"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            Pokud změna stavu na jednom zařízení neviděna na druhém:
          </p>
          <ul
            className="space-y-1.5 text-sm list-disc list-outside ml-5"
            style={{ color: "rgba(255,255,255,0.8)" }}
          >
            <li>
              Ověřte, že tabulka má povolený realtime v Supabase{" "}
              <DocCode>Database → Replication</DocCode>.
            </li>
            <li>
              V DevTools <DocCode>Network → WS</DocCode> by měl být otevřený
              kanál <DocCode>realtime/v1/websocket</DocCode>.
            </li>
            <li>
              Pokud je za firewallem, povolte WebSocket port 443 (wss://).
            </li>
          </ul>
        </DocCard>
      </DocSubsection>

      <DocSubsection number="10.3" title="Pořadí sálů se neukládá">
        <DocNotice type="ok" title="Vyřešeno v poslední aktualizaci">
          Bug, kdy klient ukládal nové <DocCode>sort_order</DocCode>, ale{" "}
          <DocCode>fetchOperatingRooms()</DocCode> řadil podle{" "}
          <DocCode>name</DocCode>, je opravený. <DocCode>lib/db.ts</DocCode>{" "}
          nyní používá <DocCode>.order(&apos;sort_order&apos;)</DocCode> a{" "}
          <DocCode>transformRoom</DocCode> mapuje sloupec do typu{" "}
          <DocCode>OperatingRoom</DocCode>.
        </DocNotice>
      </DocSubsection>

      <DocSubsection number="10.4" title="Audio alert nehraje">
        <DocCard>
          <p
            className="text-sm leading-relaxed mb-3"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            Browsery (Chrome, Safari) blokují přehrávání zvuku bez user
            interaction. Aplikace musí získat „autoplay povolení“:
          </p>
          <ol
            className="space-y-1.5 text-sm list-decimal list-outside ml-5"
            style={{ color: "rgba(255,255,255,0.8)" }}
          >
            <li>
              První kliknutí kdekoli na stránce vytvoří{" "}
              <DocCode>AudioContext</DocCode> v hooku{" "}
              <DocCode>useEmergencyAlert</DocCode>.
            </li>
            <li>
              Pokud uživatel kartu nikdy neaktivoval, alert nebude slyšet
              — zobrazí se pouze vizuální notifikace.
            </li>
            <li>
              Doporučujeme ihned po přihlášení vyzvat uživatele jednorázovým
              kliknutím (např. „Povolit zvuková upozornění“).
            </li>
          </ol>
        </DocCard>
      </DocSubsection>

      <DocSubsection number="10.5" title="Vysoká spotřeba paměti">
        <DocTable
          headers={["Symptom", "Příčina", "Řešení"]}
          rows={[
            [
              "Karta po hodinách spotřebovává >1 GB",
              "Realtime kanály se duplicitně subscribují při re-renderu.",
              <span key="1">
                Použijte <DocCode>useRealtimeSubscription</DocCode> s
                stabilní dependency array.
              </span>,
            ],
            [
              "Safari blokuje další AudioContext",
              "Limit 6 AudioContextů. Hook nezavírá kontext při unmount.",
              <span key="2">
                Volat <DocCode>audioCtx.close()</DocCode> v cleanup{" "}
                <DocCode>useEffect</DocCode>.
              </span>,
            ],
            [
              "RoomDetail po unmount log warning „setState on unmounted“",
              "Nezalovaný setTimeout v handleru.",
              <span key="3">
                Ukládat ID timeru do <DocCode>useRef</DocCode> a clear v
                cleanup.
              </span>,
            ],
          ]}
        />
      </DocSubsection>

      <DocSubsection number="10.6" title="Časté otázky">
        <DocCard>
          <details
            className="text-sm leading-relaxed py-2 border-b"
            style={{
              color: "rgba(255,255,255,0.85)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <summary
              className="cursor-pointer font-semibold"
              style={{ color: "#FBBF24" }}
            >
              Mohu mít více adminů?
            </summary>
            <p className="mt-2">
              Ano. Role <DocCode>admin</DocCode> není unikátní — počet
              adminů není omezený. Doporučujeme však minimálně 2 (kvůli
              ztracenému heslu) a maximálně 5 (audit).
            </p>
          </details>

          <details
            className="text-sm leading-relaxed py-2 border-b"
            style={{
              color: "rgba(255,255,255,0.85)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <summary
              className="cursor-pointer font-semibold"
              style={{ color: "#FBBF24" }}
            >
              Jak změnit logo a barvy aplikace?
            </summary>
            <p className="mt-2">
              Logo + brand barvu spravuje admin v modulu{" "}
              <DocBadge tone="accent">Admin → Vzhled</DocBadge>. Změna se
              propaguje přes <DocCode>background_settings</DocCode> a globální{" "}
              <DocCode>system_settings</DocCode> klíč <DocCode>brand</DocCode>.
            </p>
          </details>

          <details
            className="text-sm leading-relaxed py-2"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            <summary
              className="cursor-pointer font-semibold"
              style={{ color: "#FBBF24" }}
            >
              Jak často probíhá záloha DB?
            </summary>
            <p className="mt-2">
              Supabase managed instance má automatické denní zálohy s
              retencí 7 dní (free tier) až 30 dní (Pro). Pro kritická
              produkční nasazení doporučujeme nastavit i Point-in-Time
              Recovery v Supabase dashboardu.
            </p>
          </details>
        </DocCard>
      </DocSubsection>
    </DocSection>
  );
}
