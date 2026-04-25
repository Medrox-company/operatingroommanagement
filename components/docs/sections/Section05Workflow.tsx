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
import { WorkflowDiagram } from "../diagrams/WorkflowDiagram";

export function Section05Workflow() {
  return (
    <DocSection
      id="workflow"
      number="05"
      title="Workflow operací a stavy sálu"
      subtitle="Životní cyklus operačního sálu od volného stavu přes přípravu, operaci, úklid až po dokumentaci."
    >
      <DocCard>
        <WorkflowDiagram />
      </DocCard>

      <DocSubsection number="5.1" title="Standardní workflow">
        <ol
          className="space-y-3 text-sm list-decimal list-outside ml-5 leading-relaxed"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          <li>
            <strong>FREE</strong> — výchozí stav, sál je k dispozici.
            Týdenní rozvrh ukazuje plánované operace.
          </li>
          <li>
            <strong>PREPARATION</strong> — sestra/personál sále se
            připravuje (pacient přivezený, instrumentář vyložený).
            Spustí se časomíra přípravy.
          </li>
          <li>
            <strong>IN OPERATION</strong> — operace probíhá. UI ukazuje
            uplynulý čas, jméno operátora, typ zákroku. Stav viditelný
            v reálném čase na Dashboardu i Timeline.
          </li>
          <li>
            <strong>CLEANING</strong> — operace dokončena, probíhá
            sterilizace. Zápis se ukládá do <DocCode>operations_log</DocCode>.
          </li>
          <li>
            <strong>FREE</strong> — sál připraven na další zákrok.
          </li>
        </ol>
      </DocSubsection>

      <DocSubsection number="5.2" title="Emergency mode">
        <DocNotice type="err" title="Akutní zákrok přerušuje plán">
          Tlačítko <DocBadge tone="err">EMERGENCY</DocBadge> v{" "}
          <DocCode>RoomDetail</DocCode> okamžitě:
          <ul className="list-disc list-outside ml-5 mt-2 space-y-1">
            <li>
              změní stav sálu na <DocCode>EMERGENCY</DocCode> (červené
              zvýraznění),
            </li>
            <li>
              přehraje audio alert přes <DocCode>useEmergencyAlert</DocCode>,
            </li>
            <li>
              vytvoří záznam v <DocCode>notifications</DocCode> pro všechny
              uživatele s rolí <DocBadge tone="info">aro</DocBadge>{" "}
              <DocBadge tone="purple">cos</DocBadge>,
            </li>
            <li>
              odešle e-mail (pokud je nakonfigurován SMTP).
            </li>
          </ul>
        </DocNotice>
      </DocSubsection>

      <DocSubsection number="5.3" title="Reorder sálů (drag-n-drop)">
        <DocCard>
          <p
            className="text-sm leading-relaxed mb-3"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            V <DocCode>OperatingRoomsManager</DocCode> může admin změnit
            pořadí sálů přetažením. Mechanizmus persistence:
          </p>
          <ol
            className="space-y-1.5 text-sm list-decimal list-outside ml-5"
            style={{ color: "rgba(255,255,255,0.8)" }}
          >
            <li>Klient vypočítá nové pořadí (dnd-kit + arrayMove).</li>
            <li>
              Volá <DocCode>POST /api/operating-rooms/reorder</DocCode> s
              tělem <DocCode>{`[{ id, sort_order }, ...]`}</DocCode>.
            </li>
            <li>
              Server provede batch UPDATE sloupce <DocCode>sort_order</DocCode>{" "}
              v Supabase.
            </li>
            <li>
              Při dalším <DocCode>fetchOperatingRooms()</DocCode> se data
              načtou s <DocCode>.order(&apos;sort_order&apos;)</DocCode> →
              klient zobrazí v uloženém pořadí.
            </li>
          </ol>
        </DocCard>
      </DocSubsection>

      <DocSubsection number="5.4" title="Realtime synchronizace">
        <DocTable
          headers={["Hook", "Tabulka", "Trigger"]}
          rows={[
            [
              <DocCode key="1">useRealtimeSubscription(&apos;operating_rooms&apos;)</DocCode>,
              <DocCode key="2">operating_rooms</DocCode>,
              "INSERT, UPDATE, DELETE",
            ],
            [
              <DocCode key="3">useRealtimeSubscription(&apos;notifications&apos;)</DocCode>,
              <DocCode key="4">notifications</DocCode>,
              "INSERT (push do TopBar)",
            ],
            [
              <DocCode key="5">useWorkflowStatuses</DocCode>,
              <DocCode key="6">workflow_statuses</DocCode>,
              "Reload při změně statusu adminem",
            ],
          ]}
        />
        <DocNotice type="tip" title="Throttling">
          Realtime subscription throttluje pakety na klientovi přes{" "}
          <DocCode>setTimeout</DocCode>, aby velký burst změn
          (např. hromadná migrace) nezahltil React re-rendery.
        </DocNotice>
      </DocSubsection>
    </DocSection>
  );
}
