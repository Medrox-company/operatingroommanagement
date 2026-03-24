# 📋 Index - Resend Email Integration

## 📚 Dokumentace (Vyberte si svou cestu)

### 🟢 Začínáte s projektem?
**Start zde:** [`QUICK_START.md`](./QUICK_START.md)
- Jak nainstalovat a spustit
- Test email notifikace
- Troubleshooting

### 🟡 Chcete pochopit celý systém?
**Pak čtěte:** [`RESEND_INTEGRATION_SUMMARY.md`](./RESEND_INTEGRATION_SUMMARY.md)
- Přehled všech změn
- Co bylo přidáno
- Features a možnosti

### 🟠 Detailní nastavení a konfiguraci?
**Pak čtěte:** [`RESEND_SETUP.md`](./RESEND_SETUP.md)
- Kompletní setup guide
- Komponenty a hooks
- Bezpečnost a best practices

### 🔴 Příklady kódu a use cases?
**Pak čtěte:** [`RESEND_EXAMPLES.md`](./RESEND_EXAMPLES.md)
- 6+ příkladů kódu
- Všechny typy notifikací
- Best practices a troubleshooting

## 📂 Přidané/Upravené Soubory

### ✨ Nové Soubory
```
lib/
├── email.ts                          # Email utility pro Resend
hooks/
├── useEmailNotifications.ts          # Hook pro automatické notifikace

Dokumentace:
├── RESEND_SETUP.md                  # Setup guide
├── RESEND_EXAMPLES.md               # Příklady a best practices
├── RESEND_INTEGRATION_SUMMARY.md    # Souhrn všech změn
├── QUICK_START.md                   # Rychlý start
├── .env.local.example               # Template pro env proměnné
└── INDEX.md                          # Tento soubor
```

### 🔄 Upravené Soubory
```
components/
├── NotificationsManager.tsx          # +Test rozhraní pro emaily
package.json                          # +resend@^3.0.0
```

## 🚀 Rychlý Start

```bash
# 1. Instalace
npm install

# 2. Nastavení env
cp .env.local.example .env.local

# 3. Spuštění
npm run dev

# 4. Test
# Nastavení → Notifikace → Testovat email
```

## 🏗️ Architektura

```
┌─────────────────────────────────────────┐
│    React Komponenty & Hooks             │
├─────────────────────────────────────────┤
│ • NotificationsManager (UI)             │
│ • useEmailNotifications (Hook)          │
│ • useEmergencyAlert (Existující)        │
├─────────────────────────────────────────┤
│    Email Utility Layer                  │
├─────────────────────────────────────────┤
│ • lib/email.ts                          │
│   - sendEmailNotification()             │
│   - generateEmailTemplate()             │
│   - sendBatchEmailNotifications()       │
├─────────────────────────────────────────┤
│    Resend API Client                    │
├─────────────────────────────────────────┤
│ • Resend Service (Cloud)                │
└─────────────────────────────────────────┘
```

## 📧 Email Šablony

| Typ | Ikona | Použití |
|-----|-------|--------|
| emergency_alert | 🚨 | Nouzové situace |
| status_change | 📊 | Změna stavu sálu |
| queue_update | 📋 | Aktualizace fronty |
| maintenance | 🔧 | Údržba systému |
| custom | 📢 | Vlastní zprávy |

## 💾 Data Flow

```
1. Uživatel klikne "Testovat email"
   ↓
2. handleSendTestEmail() se zavolá
   ↓
3. generateEmailTemplate() vytvoří HTML
   ↓
4. sendEmailNotification() odešle přes Resend
   ↓
5. Resend API odesílá email příjemci
   ↓
6. Uživatel vidí feedback UI (úspěch/chyba)
```

## 🔐 Bezpečnost

- ⚠️ API klíč je v VITE_* (veřejný klient)
- 🛡️ Pro produkci: vytvořte backend endpoint
- 🔒 Bezpečně uložte klíč na serveru

## 📊 Monitoring

- 📈 Sledujte v Resend dashboardu: https://resend.com/emails
- 📝 Logujte emaily (volitelné do Supabase)
- 🔔 Nastavte upozornění na chyby

## 🛠️ Nápověda

### Kde najít?
- **API Reference**: `lib/email.ts`
- **Příklady**: `RESEND_EXAMPLES.md`
- **Setup**: `RESEND_SETUP.md`
- **Troubleshooting**: `QUICK_START.md`

### Běžné Otázky
1. "Kde nastavím API klíč?" → `.env.local` soubor
2. "Jak otestuji email?" → Nastavení → Notifikace → Test
3. "Email nejde?" → Zkontrolujte spam, API klíč a konzoli
4. "Jak přidám vlastní email?" → Viz `RESEND_EXAMPLES.md`

## 📈 Next Steps

- [ ] Otestujte email notifikace
- [ ] Integrujte `useEmailNotifications` hook
- [ ] Přidejte custom email šablony
- [ ] Vytvořte backend endpoint (produkce)
- [ ] Nastavte monitoring a logging

## 📞 Kontakt a Podpora

- **Resend Docs**: https://resend.com/docs
- **Resend Support**: https://resend.com/support
- **Project Issues**: Zkontrolujte konzoli (F12)

---

## 🎉 Shrnutí

Vaš Operating Room Management systém je nyní plně integrován s Resend pro emailové notifikace! 🎊

**Hotovo a připraveno k použití** ✅

Vyberte si dokumentaci podle vaší potřeby a začněte!
