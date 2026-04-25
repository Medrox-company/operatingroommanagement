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
import { ModuleDependencyDiagram } from "../diagrams/ModuleDependencyDiagram";

export function Section04Modules() {
  return (
    <DocSection
      id="moduly"
      number="04"
      title="Moduly aplikace"
      subtitle="Funkční přehled jednotlivých modulů — co dělají, jaká data zobrazují, jak na sebe navazují."
    >
      <DocCard>
        <ModuleDependencyDiagram />
      </DocCard>

      <DocSubsection number="4.1" title="Dashboard">
        <DocTable
          headers={["Atribut", "Hodnota"]}
          rows={[
            ["Modul", <DocCode key="1">SIDEBAR_ITEMS.dashboard</DocCode>],
            ["Komponenta", <DocCode key="2">App.tsx</DocCode>],
            ["Přístup", <DocBadge tone="ok" key="3">všechny role</DocBadge>],
            [
              "Endpointy",
              <DocCode key="4">GET /api/operating-rooms</DocCode>,
            ],
          ]}
        />
        <p
          className="text-sm leading-relaxed mt-2"
          style={{ color: "rgba(255,255,255,0.8)" }}
        >
          Hlavní obrazovka zobrazuje grid všech operačních sálů s živým
          stavem (status, oddělení, aktuální operace, čas zahájení).
          Karty sálů jsou interaktivní — klik otevře <DocCode>RoomDetail</DocCode>.
          Realtime updaty z Supabase přicházejí přes{" "}
          <DocCode>useRealtimeSubscription</DocCode>, takže změny stavu
          se propagují do UI bez refreshe.
        </p>
      </DocSubsection>

      <DocSubsection number="4.2" title="RoomDetail (detail sálu)">
        <DocTable
          headers={["Atribut", "Hodnota"]}
          rows={[
            ["Komponenta", <DocCode key="1">RoomDetail.tsx</DocCode>],
            ["Přístup", <DocBadge tone="ok" key="2">všechny role</DocBadge>],
            [
              "Edit práva",
              <span key="3">
                <DocBadge tone="accent">admin</DocBadge>{" "}
                <DocBadge tone="purple">cos</DocBadge>{" "}
                <DocBadge tone="info">aro</DocBadge>
              </span>,
            ],
          ]}
        />
        <p
          className="text-sm leading-relaxed mt-2"
          style={{ color: "rgba(255,255,255,0.8)" }}
        >
          Detail jednoho sálu — workflow steppy (PŘÍPRAVA → OPERACE →
          ÚKLID), informace o pacientovi, přiřazený personál, časomíra
          probíhající operace, deník akcí a tlačítka pro změnu stavu.
          Tlačítko <DocCode>EMERGENCY</DocCode> spustí audio alert přes
          <DocCode>useEmergencyAlert</DocCode>.
        </p>
      </DocSubsection>

      <DocSubsection number="4.3" title="Timeline">
        <p
          className="text-sm leading-relaxed"
          style={{ color: "rgba(255,255,255,0.8)" }}
        >
          Časová osa všech operací po hodinách / dnech / týdnech. Každý
          řádek je sál, sloupce jsou časové úseky. Probíhající operace
          jsou zvýrazněné podle status barvy. Filter podle oddělení a
          rozsahu data. Při kliknutí na operaci se otevře detail.
        </p>
      </DocSubsection>

      <DocSubsection number="4.4" title="Statistiky (StatisticsModule)">
        <p
          className="text-sm leading-relaxed mb-3"
          style={{ color: "rgba(255,255,255,0.8)" }}
        >
          Reporting dashboard s metrikami:
        </p>
        <ul
          className="space-y-1.5 text-sm list-disc list-outside ml-5"
          style={{ color: "rgba(255,255,255,0.8)" }}
        >
          <li>Počet operací za den / týden / měsíc</li>
          <li>Průměrná délka operací podle typu</li>
          <li>Vytíženost sálů (% času v provozu)</li>
          <li>Top 5 nejvytíženějších oddělení</li>
          <li>Anomálie (operace přes plánovaný čas)</li>
        </ul>
        <DocNotice type="info" title="Datový zdroj">
          Statistiky se počítají agregačními SQL dotazy v{" "}
          <DocCode>/api/statistics/route.ts</DocCode> z tabulky{" "}
          <DocCode>operations_log</DocCode>.
        </DocNotice>
      </DocSubsection>

      <DocSubsection number="4.5" title="Personál a směny">
        <DocTable
          headers={["Modul", "Účel"]}
          rows={[
            [
              <DocCode key="1">StaffManager</DocCode>,
              "CRUD seznam zaměstnanců, role, oddělení, kontaktní info.",
            ],
            [
              <DocCode key="2">ShiftScheduleManager</DocCode>,
              "Plánování směn — kalendář s drag-n-drop přiřazením.",
            ],
            [
              <DocCode key="3">StaffPickerModal</DocCode>,
              "Modal pro výběr personálu při přiřazení k operaci.",
            ],
          ]}
        />
      </DocSubsection>

      <DocSubsection number="4.6" title="Admin moduly">
        <DocTable
          headers={["Modul", "Tabulka", "Funkce"]}
          rows={[
            [
              <DocCode key="1">OperatingRoomsManager</DocCode>,
              <DocCode key="2">operating_rooms</DocCode>,
              "Přidání/edit sálů, drag-n-drop reorder.",
            ],
            [
              <DocCode key="3">DepartmentsManager</DocCode>,
              <DocCode key="4">departments</DocCode>,
              "Správa oddělení (kód, název, barva).",
            ],
            [
              <DocCode key="5">StatusesManager</DocCode>,
              <DocCode key="6">workflow_statuses</DocCode>,
              "Konfigurace stavů workflow.",
            ],
            [
              <DocCode key="7">SystemSettingsModule</DocCode>,
              <DocCode key="8">system_settings + module_access</DocCode>,
              "Globální nastavení a přístup k modulům.",
            ],
            [
              <DocCode key="9">BackgroundManager</DocCode>,
              <DocCode key="10">background_settings</DocCode>,
              "DB-konfigurovatelné pozadí aplikace.",
            ],
            [
              <DocCode key="11">NotificationsManager</DocCode>,
              <DocCode key="12">notifications</DocCode>,
              "Historie notifikací, configurace SMTP.",
            ],
          ]}
        />
      </DocSubsection>

      <DocSubsection number="4.7" title="Mobilní zobrazení">
        <p
          className="text-sm leading-relaxed"
          style={{ color: "rgba(255,255,255,0.8)" }}
        >
          Aplikace má spodní navigaci (<DocCode>MobileNav</DocCode>) pro
          mobilní zařízení a alternativní pohled na personál
          (<DocCode>MobileStaffView</DocCode>). Tlačítko{" "}
          <DocBadge>Odhlásit</DocBadge> nahrazuje Admin modul, který je
          v menu na desktopu.
        </p>
      </DocSubsection>
    </DocSection>
  );
}
