# Resend Email Integration Guide

## Přehled

Projekt je nyní integrován s **Resend** email service pro odesílání emailových notifikací z Operating Room Management systému. Resend poskytuje spolehlivé a bezpečné odesílání emailů.

## Nastavení

### 1. API Klíč

Váš Resend API klíč je již nastavený v prostředí:
```
RESEND_API_KEY=re_3aebCfba_Azk2YvFozZhXZC7VK2CYWh4R
```

### 2. Konfigurační proměnné

Ujistěte se, že je vaše `.env.local` nebo projektu vite nastaveno:

```bash
VITE_RESEND_API_KEY=re_3aebCfba_Azk2YvFozZhXZC7VK2CYWh4R
```

## Použití

### Email Notifikace v Nastavení

1. Přejděte na **Nastavení → Notifikace**
2. Klikněte na tlačítko **"Testovat email"**
3. Zadejte svou email adresu
4. Klikněte **"Poslat test"**

### Programové odesílání emailů

```typescript
import { sendEmailNotification, generateEmailTemplate } from './lib/email';

// Odesílání jednoho emailu
const result = await sendEmailNotification({
  to: 'user@example.com',
  subject: 'Emergency Alert - Room 1',
  html: '<h1>Emergency!</h1><p>Room 1 requires immediate attention.</p>'
});

// Generování emailu ze šablony
const html = generateEmailTemplate({
  type: 'emergency_alert',
  roomName: 'Operating Room 1',
  message: 'Emergency alert has been activated',
  details: {
    'Čas': new Date().toLocaleString('cs-CZ'),
    'Status': 'Aktivní'
  }
});

// Hromadné odesílání
const result = await sendBatchEmailNotifications(
  ['user1@example.com', 'user2@example.com'],
  {
    type: 'status_change',
    roomName: 'Room 1',
    message: 'Room status has changed to FREE'
  }
);
```

## Dostupné Šablony

Systém podporuje následující typy emailových šablon:

1. **emergency_alert** - Upozornění na nouzovou situaci
2. **status_change** - Změna stavu sálu
3. **queue_update** - Aktualizace fronty operací
4. **maintenance** - Oznámení údržby
5. **custom** - Vlastní zpráva

## Vlastnosti

- ✅ **HTML šablony** - Profesionálně navržené emailové šablony
- ✅ **Hromadné odesílání** - Podpora pro odesílání více emailů
- ✅ **Rate limiting** - Automatické zpomalení mezi odesláními
- ✅ **Chybové hlášky** - Detailní feedback při chybách
- ✅ **Testovací rozhraní** - Vestavěný test v nastavení

## Komponenty

### `lib/email.ts`

Hlavní soubor s email funkcionalitou:
- `sendEmailNotification()` - Odesílá jednotlivý email
- `generateEmailTemplate()` - Generuje HTML šablonu
- `sendBatchEmailNotifications()` - Odesílá více emailů

### `components/NotificationsManager.tsx`

UI pro správu notifikací s testovacím rozhraním.

## Řešení Problémů

### Email se neodesílá

1. Zkontrolujte, zda je `RESEND_API_KEY` správně nastavený
2. Ověřte, že je email adresa validní
3. Zkontrolujte konzoli pro detailní chybu

### Resend API klíč není rozpoznán

Ujistěte se, že je proměnná nastavená jako:
```
VITE_RESEND_API_KEY=your_key_here
```

**Poznámka:** Pro Vite projekty se používá prefix `VITE_` pro přístup z klientu.

## Bezpečnost

- API klíč je bezpečně uložený v env proměnných
- Emailová doména je nastavena na default Resend doménu (`onboarding@resend.dev`)
- Pro produkci byste měli nastavit vlastní doménu v Resend

## Další Nastavení

Pro produkční použití s vlastní doménou:

1. Přihlaste se na [Resend.com](https://resend.com)
2. Nakonfigurujte vlastní doménu
3. Aktualizujte `from` adresu v `lib/email.ts`:

```typescript
from: 'noreply@yourcompany.com', // Vaše doména
```

## Dokumentace

- [Resend Dokumentace](https://resend.com/docs)
- [Resend TypeScript SDK](https://github.com/resend/resend-node)
