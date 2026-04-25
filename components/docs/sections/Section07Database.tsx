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
import { DatabaseSchemaDiagram } from "../diagrams/DatabaseSchemaDiagram";

export function Section07Database() {
  return (
    <DocSection
      id="databaze"
      number="07"
      title="Databáze a schéma"
      subtitle="Supabase Postgres. Hlavní tabulky, vztahy, indexy a Row Level Security."
    >
      <DocCard>
        <DatabaseSchemaDiagram />
      </DocCard>

      <DocSubsection number="7.1" title="Tabulka app_users">
        <p
          className="text-sm leading-relaxed mb-3"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          Reálné uživatelské účty s bcrypt hash hesla. Sloupec{" "}
          <DocCode>role</DocCode> řídí navigaci a oprávnění.
        </p>
        <DocCodeBlock language="sql">
          {`CREATE TABLE app_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  name          text NOT NULL,
  role          text NOT NULL CHECK (role IN
                  ('admin','aro','cos','management','primar','user')),
  password_hash text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_users_email ON app_users (email);`}
        </DocCodeBlock>
      </DocSubsection>

      <DocSubsection number="7.2" title="Tabulka operating_rooms">
        <DocCodeBlock language="sql">
          {`CREATE TABLE operating_rooms (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  department          text,
  status              text NOT NULL DEFAULT 'FREE',
  sort_order          integer,
  weekly_schedule     jsonb,
  current_operation   jsonb,
  completed_operations jsonb DEFAULT '[]'::jsonb,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_rooms_sort ON operating_rooms (sort_order, name);`}
        </DocCodeBlock>
        <DocNotice type="warn" title="sort_order musí být indexovaný">
          Aplikace načítá sály vždy seřazené podle{" "}
          <DocCode>sort_order ASC, name ASC</DocCode>. Bez indexu by každý
          dashboard refresh dělal full sequential scan.
        </DocNotice>
      </DocSubsection>

      <DocSubsection number="7.3" title="Tabulka staff">
        <DocCodeBlock language="sql">
          {`CREATE TABLE staff (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  role        text NOT NULL,
  department  text,
  phone       text,
  email       text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);`}
        </DocCodeBlock>
      </DocSubsection>

      <DocSubsection number="7.4" title="Tabulka shift_schedules">
        <DocCodeBlock language="sql">
          {`CREATE TABLE shift_schedules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    uuid REFERENCES staff(id) ON DELETE CASCADE,
  date        date NOT NULL,
  shift_type  text NOT NULL,    -- ranni / odpoledni / nocni
  department  text,
  notes       text,
  UNIQUE (staff_id, date, shift_type)
);

CREATE INDEX idx_shift_date ON shift_schedules (date);
CREATE INDEX idx_shift_staff ON shift_schedules (staff_id);`}
        </DocCodeBlock>
      </DocSubsection>

      <DocSubsection number="7.5" title="Tabulka operations_log">
        <DocCodeBlock language="sql">
          {`CREATE TABLE operations_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid REFERENCES operating_rooms(id),
  patient_id      text,
  operation_type  text,
  department      text,
  team            jsonb,        -- pole staff IDs s rolemi
  started_at      timestamptz NOT NULL,
  completed_at    timestamptz,
  duration_min    integer GENERATED ALWAYS AS
    (EXTRACT(EPOCH FROM (completed_at - started_at))/60) STORED
);

CREATE INDEX idx_ops_started ON operations_log (started_at DESC);
CREATE INDEX idx_ops_dept ON operations_log (department, started_at);`}
        </DocCodeBlock>
      </DocSubsection>

      <DocSubsection number="7.6" title="Konfigurační tabulky">
        <DocTable
          headers={["Tabulka", "Účel"]}
          rows={[
            [
              <DocCode key="1">workflow_statuses</DocCode>,
              "Definice stavů sálů (FREE, PREPARATION, ...) s barvou a ikonou.",
            ],
            [
              <DocCode key="2">departments</DocCode>,
              "Číselník oddělení s kódem, názvem a brandovou barvou.",
            ],
            [
              <DocCode key="3">module_access</DocCode>,
              "Mapping (role → module_id → is_enabled) pro řízení viditelnosti.",
            ],
            [
              <DocCode key="4">system_settings</DocCode>,
              "Klíč/hodnota globálního nastavení (timezone, locale, ...).",
            ],
            [
              <DocCode key="5">background_settings</DocCode>,
              "Konfigurace pozadí aplikace (gradient/image/video).",
            ],
            [
              <DocCode key="6">notifications</DocCode>,
              "Per-user fronta in-app notifikací.",
            ],
            [
              <DocCode key="7">management_contacts</DocCode>,
              "Kontakty managementu pro Management modul.",
            ],
          ]}
        />
      </DocSubsection>

      <DocSubsection number="7.7" title="Row Level Security (RLS)">
        <DocCard>
          <p
            className="text-sm leading-relaxed mb-3"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            Aplikace komunikuje se Supabase přes <strong>service-role klíč</strong>{" "}
            výhradně z Route Handlerů (server-side). Klient nikdy nemá
            přímý přístup k tabulkám. Pokud bychom v budoucnu chtěli
            otevřít přímý přístup z klienta (např. přes anon key), je
            nezbytné nakonfigurovat RLS politiky:
          </p>
          <DocCodeBlock language="sql">
            {`-- Příklad RLS pro app_users (uživatel vidí jen sebe)
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_self_select ON app_users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY admin_all ON app_users
  USING (
    EXISTS (SELECT 1 FROM app_users u
            WHERE u.id = auth.uid() AND u.role = 'admin')
  );`}
          </DocCodeBlock>
        </DocCard>
      </DocSubsection>

      <DocSubsection number="7.8" title="Realtime kanály">
        <DocCodeBlock language="typescript">
          {`// hooks/useRealtimeSubscription.ts
const channel = supabase
  .channel(\`room:\${roomId}\`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'operating_rooms',
    filter: \`id=eq.\${roomId}\`,
  }, (payload) => {
    setRoom(payload.new);
  })
  .subscribe();

return () => supabase.removeChannel(channel);`}
        </DocCodeBlock>
      </DocSubsection>
    </DocSection>
  );
}
