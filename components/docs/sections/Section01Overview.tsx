"use client";

import {
  DocSection,
  DocSubsection,
  DocCard,
  DocBadge,
  DocCode,
  DocDefinition,
  DocTable,
  DocNotice,
} from "../DocPrimitives";

export function Section01Overview() {
  return (
    <DocSection
      id="prehled"
      number="01"
      title="Přehled aplikace"
      subtitle="OperatingRoom Manager — komplexní systém řízení operačních sálů, personálu a zdravotnické dokumentace v reálném čase."
    >
      <DocCard accent>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          OperatingRoom Manager (zkratka <DocCode>ORM</DocCode>) je
          full-stack webová aplikace navržená pro nemocniční prostředí.
          Centralizuje informace o všech operačních sálech, plánuje
          směny zdravotnického personálu, sleduje workflow probíhajících
          operací a poskytuje management informace pro vedení
          oddělení v reálném čase.
        </p>
      </DocCard>

      <DocSubsection number="1.1" title="Hlavní cíle systému">
        <ul
          className="space-y-2 text-sm leading-relaxed list-disc list-outside ml-5"
          style={{ color: "rgba(255,255,255,0.8)" }}
        >
          <li>
            <strong>Centrální dashboard</strong> všech sálů s živým
            zobrazením stavu (volný / příprava / operace / úklid).
          </li>
          <li>
            <strong>Plánování směn</strong> zdravotnického personálu
            podle rolí (lékaři, sestry, anesteziologové).
          </li>
          <li>
            <strong>Statistiky a reporting</strong> využití sálů,
            průměrné délky operací, zatížení oddělení.
          </li>
          <li>
            <strong>Notifikační systém</strong> pro akutní zákroky
            (Emergency mode) s audio alertem.
          </li>
          <li>
            <strong>Konfigurovatelné role a moduly</strong> — administrátor
            určuje, kdo má přístup k jakým funkcím.
          </li>
        </ul>
      </DocSubsection>

      <DocSubsection number="1.2" title="Technologický stack">
        <DocTable
          headers={["Vrstva", "Technologie", "Verze / Poznámka"]}
          rows={[
            ["Framework", "Next.js (App Router)", "15.x"],
            ["Jazyk", "TypeScript", "strict mode"],
            ["UI", "React + Tailwind CSS", "19 / 4"],
            ["Animace", "framer-motion", "12.x"],
            ["Ikony", "lucide-react", "latest"],
            ["Database", "Supabase (Postgres)", "managed"],
            ["Autentizace", "Custom (bcrypt + HttpOnly cookie)", "lib/auth.ts"],
            ["Hosting", "Vercel", "Edge + Serverless"],
          ]}
        />
      </DocSubsection>

      <DocSubsection number="1.3" title="Hlavní pojmy">
        <DocDefinition term="Operační sál">
          Fyzický sál identifikovaný názvem, oddělením a stavem. Reprezentuje
          ho záznam v tabulce <DocCode>operating_rooms</DocCode>. Sál má
          uložený týdenní rozvrh, aktuálně probíhající operaci a historii
          dokončených zákroků.
        </DocDefinition>
        <DocDefinition term="Workflow status">
          Konfigurovatelný stav sálu (FREE, PREPARATION, IN OPERATION,
          CLEANING, EMERGENCY...). Statusy lze přidávat a měnit v Admin
          modulu, jejich barvy a ikony jsou součástí designového systému.
        </DocDefinition>
        <DocDefinition term="Personál (staff)">
          Zaměstnanec nemocnice s rolí (lékař, sestra, anesteziolog atd.)
          a přiřazeným oddělením. Personál se používá při plánování směn
          a přiřazení k operacím.
        </DocDefinition>
        <DocDefinition term="Modul">
          Logická část aplikace dostupná z Sidebaru — Dashboard, Timeline,
          Statistiky, Personál, Operační sály, Oddělení, Rozvrh, Management,
          Notifikace, Nastavení systému, Vzhled, Statusy. Přístup k modulům
          řídí role uživatele a tabulka <DocCode>module_access</DocCode>.
        </DocDefinition>
      </DocSubsection>

      <DocSubsection number="1.4" title="Role a oprávnění">
        <DocTable
          headers={["Role", "Email", "Přístup k modulům"]}
          rows={[
            [
              <DocBadge tone="accent" key="1">
                admin
              </DocBadge>,
              <DocCode key="2">admin@nemocnice.cz</DocCode>,
              "Plný přístup ke všem modulům + Admin (správa uživatelů, modulů, nastavení).",
            ],
            [
              <DocBadge tone="info" key="3">
                aro
              </DocBadge>,
              <DocCode key="4">aro@nemocnice.cz</DocCode>,
              "Dashboard, Timeline, Statistiky, Personál, Notifikace.",
            ],
            [
              <DocBadge tone="purple" key="5">
                cos
              </DocBadge>,
              <DocCode key="6">cos@nemocnice.cz</DocCode>,
              "Centrální operační sály — plný operativní přístup k sálům.",
            ],
            [
              <DocBadge tone="ok" key="7">
                management
              </DocBadge>,
              <DocCode key="8">management@nemocnice.cz</DocCode>,
              "Statistiky, Reporting, Personál (read-only), Management.",
            ],
            [
              <DocBadge tone="default" key="9">
                primar
              </DocBadge>,
              <DocCode key="10">primar@nemocnice.cz</DocCode>,
              "Primariát — schvalování a editace operací svého oddělení.",
            ],
            [
              <DocBadge key="11">user</DocBadge>,
              <DocCode key="12">user@nemocnice.cz</DocCode>,
              "Read-only Dashboard a Timeline.",
            ],
          ]}
        />
        <DocNotice type="warn" title="Změňte výchozí hesla v produkci">
          Výše uvedené účty mají výchozí demo hesla (např. <DocCode>admin123</DocCode>).
          Před nasazením do produkce je <strong>nezbytné</strong> tato hesla
          změnit v modulu <DocCode>Admin → Správa uživatelů</DocCode>.
        </DocNotice>
      </DocSubsection>
    </DocSection>
  );
}
