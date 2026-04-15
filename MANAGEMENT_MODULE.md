# Management Module - Dokumentace

## Přehled

Management modul je nový systém pro správu kontaktů na management a jejich preferenci týkajících se notifikací. Umožňuje definovat různé pozice v managementu (např. Vedoucí operací, Vrchní lékař, atd.) s přiřazenými emaily a konfigurací notifikací.

## Struktura

### Databáze
- **Tabulka:** `management_contacts`
- **Sloupce:**
  - `id` (UUID, PRIMARY KEY)
  - `position` (TEXT) - Pozice managementu (povinné)
  - `email` (TEXT) - Email pro notifikace (povinné)
  - `name` (TEXT) - Jméno kontaktu (volitelné)
  - `notify_status_changes` (BOOLEAN) - Notifikovat o změnách statusu
  - `notify_errors` (BOOLEAN) - Notifikovat o chybách
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)

### API Endpoints

#### GET `/api/management-contacts`
Vrátí seznam všech management kontaktů seřazených podle pozice.

```bash
curl -X GET http://localhost:3000/api/management-contacts
```

**Odpověď:**
```json
[
  {
    "id": "uuid-1",
    "position": "Vedoucí operací",
    "email": "vedouci@hospital.cz",
    "name": "Jan Novák",
    "notify_status_changes": true,
    "notify_errors": true,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
]
```

#### POST `/api/management-contacts`
Vytvoří nový management kontakt.

```bash
curl -X POST http://localhost:3000/api/management-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "position": "Vedoucí operací",
    "email": "vedouci@hospital.cz",
    "name": "Jan Novák",
    "notify_status_changes": true,
    "notify_errors": true
  }'
```

#### PUT `/api/management-contacts`
Aktualizuje existující management kontakt.

```bash
curl -X PUT http://localhost:3000/api/management-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "id": "uuid-1",
    "position": "Vedoucí operací",
    "email": "vedouci@hospital.cz",
    "name": "Jan Novák",
    "notify_status_changes": true,
    "notify_errors": false
  }'
```

#### DELETE `/api/management-contacts`
Smaže management kontakt.

```bash
curl -X DELETE "http://localhost:3000/api/management-contacts?id=uuid-1"
```

### Komponenty

#### ManagementManager
Hlavní komponenta pro správu management kontaktů.

**Funkce:**
- Zobrazení seznamu všech management kontaktů
- Přidání nového kontaktu
- Úprava existujícího kontaktu
- Smazání kontaktu
- Konfigurace notifikací (změny statusu, chyby)
- Real-time aktualizace pomocí SWR

**Props:** Žádné

**Příklad:**
```tsx
import ManagementManager from '@/components/ManagementManager';

export default function SettingsPage() {
  return <ManagementManager />;
}
```

## Integrační Body

### Notifikační systém
Management kontakty jsou určeny pro odesílání notifikací v následujících situacích:

1. **Změny statusu operace**
   - Když se změní status operace v operačním sálu
   - Odesílá se všem kontaktům s `notify_status_changes = true`

2. **Chyby v systému**
   - Když dojde k chybě v operačním toku
   - Odesílá se všem kontaktům s `notify_errors = true`

### Implementace notifikací
Notifikace se odesílají pomocí integrované služby (např. Resend). Příklad:

```typescript
// app/api/send-notification/route.ts
import { resend } from '@/lib/resend';

export async function sendManagementNotification(
  eventType: 'status_change' | 'error',
  data: any
) {
  const { data: contacts } = await supabase
    .from('management_contacts')
    .select('*')
    .eq(
      eventType === 'status_change' 
        ? 'notify_status_changes' 
        : 'notify_errors',
      true
    );

  for (const contact of contacts) {
    await resend.emails.send({
      from: 'system@hospital.cz',
      to: contact.email,
      subject: `Notifikace: ${eventType}`,
      html: `...`,
    });
  }
}
```

## Bezpečnost

- Všechny endpoints vyžadují autentifikaci (Service Role Key)
- Validace email adresy na frontend i backend
- Row Level Security (RLS) na databázové tabulce
- Sanitizace vstupů

## Příklady Pozic

Doporučené pozice v managementu:
- Vedoucí operací
- Vrchní lékař
- Vedoucí zdravotnické péče
- Projektový manažer
- IT administrátor
- Compliance officer

## Budoucí Rozšíření

1. Odesílání notifikací prostřednictvím SMS
2. Webhook notifikace
3. Custom šablony pro emaily
4. Časové řezy pro notifikace (DND - do not disturb)
5. Logování odeslaných notifikací
