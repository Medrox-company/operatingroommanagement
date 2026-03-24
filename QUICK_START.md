# 🚀 Jak začít s Resend Email Integrací

## Krok 1: Instalace Závislostí

```bash
npm install
# nebo
pnpm install
# nebo
yarn install
```

Balíček `resend` (v3.0.0) byl již přidán do `package.json`.

## Krok 2: Nastavení Environment Proměnných

Vytvořte soubor `.env.local` v kořenovém adresáři projektu:

```bash
# .env.local
VITE_RESEND_API_KEY=re_3aebCfba_Azk2YvFozZhXZC7VK2CYWh4R
VITE_SUPABASE_URL=your_supabase_url (volitelné)
VITE_SUPABASE_ANON_KEY=your_supabase_key (volitelné)
```

Nebo zkopírujte a upravte template:
```bash
cp .env.local.example .env.local
```

## Krok 3: Spuštění Vývojového Serveru

```bash
npm run dev
# nebo
pnpm dev
# nebo
yarn dev
```

Server se spustí na `http://localhost:5173` (nebo jiném dostupném portu).

## Krok 4: Test Email Notifikace

1. Otevřete aplikaci: http://localhost:5173
2. Přihlaste se (demo přihlášení):
   - Email: `admin@nemocnice.cz` nebo `user@nemocnice.cz`
   - Heslo: `admin123` nebo `user123`

3. Navigujte do: **Nastavení** → **Notifikace**
4. Klikněte na **"Testovat email"** tlačítko
5. Zadejte vaši email adresu
6. Klikněte **"Poslat test"**
7. Zkontrolujte si email (včetně spam složky)

## Krok 5: Ověření Odesílání

Email by měl dorazit během pár sekund. Pokud se vám nedostaví:

1. **Zkontrolujte spam složku** - Resend emaily se někdy klasifikují jako spam
2. **Zkontrolujte konzoli (F12)** - Budou tam logované chyby
3. **Ověřte API klíč** - `VITE_RESEND_API_KEY` musí být správně nastaven
4. **Ověřte email** - Zkontrolujte, že je email adresa validní

## Struktura Projektu

```
.
├── src/
│   ├── components/
│   │   └── NotificationsManager.tsx (aktualizováno)
│   ├── hooks/
│   │   ├── useEmergencyAlert.ts
│   │   └── useEmailNotifications.ts (nový)
│   ├── lib/
│   │   ├── email.ts (nový)
│   │   ├── db.ts
│   │   └── supabase.ts
│   ├── App.tsx
│   └── main.tsx
├── .env.local (vytvořte sami)
├── .env.local.example
├── package.json (aktualizováno)
├── RESEND_SETUP.md
├── RESEND_EXAMPLES.md
└── RESEND_INTEGRATION_SUMMARY.md
```

## Ověření Instalace

Po spuštění vývojového serveru byste měli vidět v konzoli:

```
[Email] Resend API key configured
```

Pokud vidíte:
```
[Email] Resend API key not configured
```

Pak zkontrolujte `.env.local` soubor.

## Build pro Produkci

```bash
npm run build
# nebo
pnpm build
# nebo
yarn build
```

Zkompilovanou verzi pak spustíte s:
```bash
npm run preview
```

## Příslušné Soubory k Seznámení Se

### Pro Začátečníky
1. `RESEND_INTEGRATION_SUMMARY.md` - Přehled
2. `RESEND_SETUP.md` - Setup guide
3. `RESEND_EXAMPLES.md` - Příklady kódu

### Pro Vývojáře
1. `lib/email.ts` - Email utility API
2. `hooks/useEmailNotifications.ts` - Automatické notifikace
3. `components/NotificationsManager.tsx` - UI komponenta

### Pro DevOps
1. `.env.local.example` - Template env
2. `package.json` - Dependencies

## Běžné Problémy a Řešení

### "VITE_RESEND_API_KEY is not defined"
- Ujistěte se, že máte `.env.local` soubor
- Zkontrolujte, že proměnná je pojmenována přesně `VITE_RESEND_API_KEY`
- Restartujte dev server po vytvoření `.env.local`

### Email se neposílá
- Zkontrolujte F12 konzoli pro chyby
- Ověřte validitu email adresy
- Zkontrolujte, že API klíč je správný

### "Resend API error: Invalid API key"
- Klíč musí začínat s `re_`
- Zkontrolujte na https://resend.com/api-keys
- Zkopírujte správný klíč z Resend dashboardu

### Port 5173 je již obsazený
- Vite automaticky použije další dostupný port
- Nebo definujte vlastní port: `npm run dev -- --port 3000`

## Next Steps

1. ✅ Instalace a test hotov
2. 📧 Integrujte automatické notifikace pomocí `useEmailNotifications` hook
3. 🔧 Přidejte vlastní email šablony dle potřeby
4. 🛡️ Pro produkci: vytvořte backend endpoint
5. 📊 Monitorujte odesílání v Resend dashboardu

## Support

- 📖 Resend Dokumentace: https://resend.com/docs
- 🐛 Nahlášení problému: Zkontrolujte konzoli (F12) pro chyby
- 💬 TypeScript help: Kód je plně typizován

---

**Tip**: Nejprve otestujte s vlastním emailem, než nasadíte do produkce!
