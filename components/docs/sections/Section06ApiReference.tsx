"use client";

import {
  DocSection,
  DocSubsection,
  DocCard,
  DocCode,
  DocCodeBlock,
  DocBadge,
  DocTable,
} from "../DocPrimitives";

function ApiEndpoint({
  method,
  path,
  desc,
  body,
  response,
  auth = true,
}: {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  desc: string;
  body?: string;
  response?: string;
  auth?: boolean;
}) {
  const tone =
    method === "GET"
      ? "info"
      : method === "POST"
        ? "ok"
        : method === "DELETE"
          ? "err"
          : "accent";
  return (
    <DocCard>
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <DocBadge tone={tone as never}>{method}</DocBadge>
        <DocCode>{path}</DocCode>
        {auth ? (
          <DocBadge tone="purple">AUTH</DocBadge>
        ) : (
          <DocBadge>PUBLIC</DocBadge>
        )}
      </div>
      <p
        className="text-sm leading-relaxed mb-3"
        style={{ color: "rgba(255,255,255,0.8)" }}
      >
        {desc}
      </p>
      {body && (
        <div className="mb-3">
          <div
            className="text-[10px] font-mono uppercase tracking-wider mb-1.5"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Request body
          </div>
          <DocCodeBlock language="json">{body}</DocCodeBlock>
        </div>
      )}
      {response && (
        <div>
          <div
            className="text-[10px] font-mono uppercase tracking-wider mb-1.5"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Response
          </div>
          <DocCodeBlock language="json">{response}</DocCodeBlock>
        </div>
      )}
    </DocCard>
  );
}

export function Section06ApiReference() {
  return (
    <DocSection
      id="api-reference"
      number="06"
      title="API Reference"
      subtitle="Kompletní seznam Route Handlerů Next.js, jejich parametry a odpovědi."
    >
      <DocSubsection number="6.1" title="Autentizace">
        <ApiEndpoint
          method="POST"
          path="/api/auth/login"
          desc="Přihlášení uživatele. Verifikuje email + heslo, vytvoří session cookie."
          body={`{
  "email": "admin@nemocnice.cz",
  "password": "admin123"
}`}
          response={`{
  "user": {
    "id": "uuid",
    "email": "admin@nemocnice.cz",
    "name": "Administrátor",
    "role": "admin"
  }
}`}
          auth={false}
        />
        <ApiEndpoint
          method="POST"
          path="/api/auth/logout"
          desc="Odhlášení — invalidate session cookie."
          response={`{ "ok": true }`}
        />
        <ApiEndpoint
          method="GET"
          path="/api/auth/me"
          desc="Vrátí aktuálního přihlášeného uživatele včetně modul access."
          response={`{
  "user": { "id", "email", "name", "role" },
  "modules": [{ "id", "is_enabled", "accent_color" }]
}`}
        />
      </DocSubsection>

      <DocSubsection number="6.2" title="Operační sály">
        <ApiEndpoint
          method="GET"
          path="/api/operating-rooms"
          desc="Seznam všech sálů seřazených podle sort_order, name."
          response={`[
  {
    "id": "uuid",
    "name": "Sál 1",
    "department": "TRA",
    "status": "FREE",
    "sort_order": 0,
    "current_operation": null
  }
]`}
        />
        <ApiEndpoint
          method="POST"
          path="/api/operating-rooms"
          desc="Vytvoření nového sálu (admin only)."
          body={`{
  "name": "Sál X",
  "department": "TRA"
}`}
        />
        <ApiEndpoint
          method="PATCH"
          path="/api/operating-rooms/[id]"
          desc="Update sálu (status, current_operation, weekly_schedule)."
          body={`{
  "status": "IN_OPERATION",
  "current_operation": { "type": "Apendektomie", ... }
}`}
        />
        <ApiEndpoint
          method="POST"
          path="/api/operating-rooms/reorder"
          desc="Hromadný update sort_order pro všechny sály."
          body={`[
  { "id": "uuid-1", "sort_order": 0 },
  { "id": "uuid-2", "sort_order": 1 }
]`}
        />
      </DocSubsection>

      <DocSubsection number="6.3" title="Personál">
        <ApiEndpoint
          method="GET"
          path="/api/staff"
          desc="Seznam zaměstnanců s filtry ?role=&department=."
        />
        <ApiEndpoint
          method="POST"
          path="/api/staff"
          desc="Přidání nového zaměstnance."
          body={`{
  "name": "MUDr. Nováková",
  "role": "lekar",
  "department": "ARO"
}`}
        />
        <ApiEndpoint
          method="PATCH"
          path="/api/staff/[id]"
          desc="Update existujícího zaměstnance."
        />
        <ApiEndpoint
          method="DELETE"
          path="/api/staff/[id]"
          desc="Soft-delete — nastaví is_active = false."
        />
      </DocSubsection>

      <DocSubsection number="6.4" title="Workflow statusy">
        <ApiEndpoint
          method="GET"
          path="/api/workflow-statuses"
          desc="Vrátí všechny stavy workflow seřazené podle sort_order."
        />
        <ApiEndpoint
          method="POST"
          path="/api/workflow-statuses"
          desc="Přidání nového stavu (jméno, barva, ikona)."
        />
      </DocSubsection>

      <DocSubsection number="6.5" title="Statistiky">
        <ApiEndpoint
          method="GET"
          path="/api/statistics"
          desc="Agregované metriky — query params: ?from=&to=&department="
          response={`{
  "totalOperations": 142,
  "avgDuration": 87,
  "byDepartment": [{ "code": "TRA", "count": 42 }],
  "topRooms": [{ "id": "uuid", "name": "Sál 1", "utilization": 0.78 }]
}`}
        />
      </DocSubsection>

      <DocSubsection number="6.6" title="Notifikace">
        <ApiEndpoint
          method="GET"
          path="/api/notifications"
          desc="Notifikace přihlášeného uživatele (default: posledních 50)."
        />
        <ApiEndpoint
          method="POST"
          path="/api/send-notification"
          desc="Odeslat e-mail notifikaci přes SMTP (admin only)."
          body={`{
  "to": "user@nemocnice.cz",
  "subject": "...",
  "html": "<p>...</p>"
}`}
        />
      </DocSubsection>

      <DocSubsection number="6.7" title="Status kódy">
        <DocTable
          headers={["Kód", "Význam"]}
          rows={[
            ["200", "OK — request úspěšný."],
            ["201", "Created — entita vytvořena."],
            ["400", "Bad Request — neplatné tělo nebo parametry."],
            ["401", "Unauthorized — chybí nebo neplatná session."],
            ["403", "Forbidden — role nemá oprávnění."],
            ["404", "Not Found — entita neexistuje."],
            ["500", "Internal Server Error — neočekávaná DB chyba."],
          ]}
        />
      </DocSubsection>
    </DocSection>
  );
}
