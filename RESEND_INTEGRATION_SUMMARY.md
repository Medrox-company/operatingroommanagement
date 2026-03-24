# Operating Room Management System - Resend Email Integration

## 🎯 Co bylo přidáno

Plná integrace **Resend email service** pro odesílání emailových notifikací z Operating Room Management systému.

## 📦 Nové Soubory a Komponenty

### Core Integrace
- **`lib/email.ts`** - Hlavní email utility pro odesílání přes Resend API
  - `sendEmailNotification()` - Odesílá jednotlivé emaily
  - `generateEmailTemplate()` - Generuje profesionální HTML šablony
  - `sendBatchEmailNotifications()` - Odesílá více emailů s rate limitingem

### React Komponenty & Hooks
- **`components/NotificationsManager.tsx`** (aktualizováno)
  - Vestavěný test rozhraní pro odesílání test emailů
  - Správa email notifikací v Nastavení
  - Input pole pro email příjemce u emailových notifikací

- **`hooks/useEmailNotifications.ts`** (nový)
  - Automatické odesílání notifikací při změnách sálů
  - Throttling pro emergency upozornění
  - Podpora pro emergency, status change, a queue update notifikace

### Dokumentace
- **`RESEND_SETUP.md`** - Kompletní setup guide
- **`RESEND_EXAMPLES.md`** - Příklady a best practices
- **`.env.local.example`** - Template pro environment proměnné

### Aktualizované Soubory
- **`package.json`** - Přidána `resend` knihovna (v3.0.0)

## 🚀 Rychlý Start

### 1. API Klíč
Váš Resend API klíč je nastavený:
```
RESEND_API_KEY=re_3aebCfba_Azk2YvFozZhXZC7VK2CYWh4R
```

### 2. Ujistěte se, že je v .env.local
```bash
VITE_RESEND_API_KEY=re_3aebCfba_Azk2YvFozZhXZC7VK2CYWh4R
```

### 3. Test Email
1. Přejděte na **Nastavení → Notifikace**
2. Klikněte **"Testovat email"**
3. Zadejte vaši email adresu
4. Klikněte **"Poslat test"**

## 📧 Email Šablony

Systém obsahuje 5 typů emailových šablon:

1. **🚨 Emergency Alert** - Upozornění na nouzové situace
2. **📊 Status Change** - Změna stavu operačních sálů
3. **📋 Queue Update** - Aktualizace fronty pacientů
4. **🔧 Maintenance** - Oznámení o údržbě
5. **📢 Custom** - Vlastní zprávy

Každá šablona má profesionální design s tmavým motivem a ikonami.

## 💻 Programové Použití

### Jednoduchý Email
```typescript
import { sendEmailNotification } from './lib/email';

const result = await sendEmailNotification({
  to: 'user@hospital.cz',
  subject: 'Test Email',
  html: '<h1>Hello!</h1>'
});
```

### S Šablonou
```typescript
import { generateEmailTemplate, sendEmailNotification } from './lib/email';

const html = generateEmailTemplate({
  type: 'emergency_alert',
  roomName: 'OR 1',
  message: 'Emergency activated',
  details: {
    'Time': new Date().toLocaleString('cs-CZ'),
    'Status': 'Active'
  }
});

await sendEmailNotification({
  to: 'manager@hospital.cz',
  subject: 'Emergency Alert',
  html
});
```

### Automatické Notifikace
```typescript
import { useEmailNotifications } from './hooks/useEmailNotifications';

// V komponentě
useEmailNotifications(rooms, {
  emergencyEnabled: true,
  statusChangeEnabled: true,
  queueUpdateEnabled: true,
  recipientEmail: 'manager@hospital.cz'
});
```

## ✨ Features

✅ **Profesionální HTML Šablony** - Tmavý design s barevným kódováním dle typu  
✅ **Rate Limiting** - Automatické zpomalení mezi odesláními (100ms)  
✅ **Error Handling** - Detailní feedback při chybách  
✅ **Test Rozhraní** - Vestavěný test v nastavení  
✅ **Automatické Notifikace** - Hook pro automatické odesílání  
✅ **Batch Sending** - Hromadné odesílání více emailů  
✅ **Throttling** - Omezení odesílání (max 1 emergency za 5 minut na sál)  
✅ **TypeScript Support** - Plně typizováno  

## 🔧 Konfigurace

### Pro Vývoj
Používejte default Resend doménu: `onboarding@resend.dev`

### Pro Produkci
1. Přihlaste se na https://resend.com
2. Nakonfigurujte vlastní doménu
3. Aktualizujte `from` adresu v `lib/email.ts`

## 📊 Monitoring

Zkontrolujte odesílání v Resend dashboardu:
- https://resend.com/emails
- Vidíte zde status každého emailu
- Logy všech odeslaných zpráv

## 🛡️ Bezpečnost

⚠️ **DŮLEŽITÉ**: API klíč je v VITE_* proměnných, což znamená, že je veřejný!

Pro produkci:
1. Vytvořte backend endpoint
2. Uložte API klíč bezpečně na serveru
3. Volejte backend místo přímého volání Resend API

## 📚 Další Informace

- Viz `RESEND_SETUP.md` pro detailní setup
- Viz `RESEND_EXAMPLES.md` pro více příkladů
- Viz `lib/email.ts` pro API dokumentaci

## 🐛 Troubleshooting

### Email se neposílá
1. Zkontrolujte `VITE_RESEND_API_KEY`
2. Ověřte validitu email adresy
3. Zkontrolujte konzoli pro chyby

### Resend API Error
1. Ověřte klíč na https://resend.com/api-keys
2. Zkontrolujte, že má klíč správná práva
3. Ujistěte se, že klíč není vypršen

## 📝 Příští Kroky

### Volitelně: SMS Notifikace
Přidejte Twilio integraci pro SMS odesílání

### Volitelně: Push Notifikace
Integrujte Web Push API pro notifikace v prohlížeči

### Volitelně: Databázové Logování
Logujte odesílání emailů do Supabase pro audit trail

### Doporučeno: Backend Endpoint
Vytvořte API endpoint pro bezpečné odesílání emailů v produkci

## 📞 Podpora

- Resend Dokumentace: https://resend.com/docs
- Resend Support: https://resend.com/support

---

**Status**: ✅ Hotovo a připraveno k použití
**Verze**: 1.0.0
**Naposledy aktualizováno**: Březen 2024
