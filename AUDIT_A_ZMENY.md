# Audit a provedená vylepšení — Operating Room Management

Datum: 10. 6. 2026 · Rozsah: bezpečnostní a kvalitativní audit + opravy nejzávažnějších nálezů

## ⚠️ Co musíš udělat ručně (důležité!)

1. **Zneplatnit uniklý Resend API klíč.** V repu byl v souboru `.env.local.example` commitnutý skutečný klíč (`re_3aebCfba_…`). Je v historii gitu, takže ho považuj za kompromitovaný — na https://resend.com/api-keys ho smaž a vygeneruj nový. Ze souboru jsem ho odstranil.
2. **Spustit `scripts/12-harden-rls.sql`** v Supabase SQL editoru (viz nález č. 2).
3. **Nastavit `SESSION_SECRET`** v env proměnných (pokud ještě není) — viz nový `.env.local.example`.

## Nálezy a co jsem opravil

### 1. Neautentizované API endpointy se service-role klíčem (kritické) — ✅ opraveno
`/api/devices` (GET/POST/PATCH/DELETE), `/api/workflow-statuses` (PUT/POST/DELETE), `/api/rooms` a `/api/rooms/toggle` neměly žádnou kontrolu přihlášení, přitom zapisovaly do DB přes service-role klíč, který obchází RLS. Kdokoli na internetu mohl např. přepínat stav nouze na sálech, mazat zařízení nebo měnit workflow statusy.

Opraveno: čtení vyžaduje přihlášení (`requireSession`), správa zařízení a statusů admina (`requireAdmin`). Přidána validace vstupů (allowlist polí u PUT, typová kontrola hodnot) a rate-limit na registraci zařízení. Komponenta `DeviceRegistration` nově registruje zařízení až po přihlášení a načítání sálů v `App.tsx` čeká na login.

### 2. RLS politiky „povolit všem“ včetně tabulky pacientů (kritické) — ✅ skript připraven
Schéma (`01-create-schema.sql`) zapíná RLS, ale všechny politiky jsou `USING (true)` — anonymní klíč (veřejně dostupný v JS bundle) tak má plný přístup ke čtení, zápisu i mazání všech tabulek včetně `patients` a `app_users`. U nemocniční aplikace zásadní problém (GDPR/MDR).

Připraven `scripts/12-harden-rls.sql`: úplně uzavírá `app_users`, `patients` a `devices` (přístup jen přes server), `notifications_log` a `management_contacts` nechává jen pro čtení. Ostatní tabulky zatím zůstávají otevřené, protože klient do nich zapisuje přímo (viz „Další doporučení“).

### 3. CSRF zranitelnost session cookie — ✅ opraveno
Cookie používala `SameSite=None`, takže ji prohlížeč posílal i z cizích stránek — útočná stránka mohla volat mutující endpointy jménem přihlášeného uživatele. Nově je výchozí `SameSite=Lax` (pro iframe náhled lze zapnout `COOKIE_SAMESITE_NONE=1`) a mutující endpointy navíc ověřují hlavičku Origin (nový helper `lib/auth/csrf.ts`).

### 4. Správa kontaktů obcházela zabezpečené API — ✅ opraveno
`ManagementManager.tsx` četl a zapisoval `management_contacts` přímo přes anon klíč, přestože existovalo zabezpečené API `/api/management-contacts` (admin-only, validace). Komponenta nyní používá API — díky tomu lze tabulku v RLS zamknout.

### 5. Mrtvé závislosti (~500 MB) — ✅ odstraněno
`package.json` obsahoval celý Expo/React Native stack (`expo`, `expo-router`, `react-native`, `nativewind`, `lucide-react-native`, …), který nikde v kódu není importovaný (iOS verze běží přes Capacitor). Odstraněno 8 balíčků — výrazně rychlejší instalace i CI. Typecheck po odstranění prošel bez chyb.

### 6. Drobnosti — ✅ opraveno
`.env.local.example` přepsán na skutečné proměnné aplikace (předtím obsahoval zastaralé `VITE_*` názvy a uniklý klíč). `tsconfig.tsbuildinfo` (build cache) odstraněn z repa a přidán do `.gitignore`.

## Ověření
`tsc --noEmit` přes celý projekt: **0 chyb**. Produkční `next build` nebylo možné v sandboxu dokončit (limit prostředí, ne chyba kódu) — doporučuji spustit `npm run build` lokálně.

## Další doporučení (neopravováno, k diskusi)

1. **Přesunout zbývající přímé klientské zápisy do API** — `StaffManager`, `StaffOverviewModule`, `StaffPickerModal` a `TimelineModule` stále zapisují přes anon klíč do `staff`, `operating_rooms` ad. Dokud se to nepřesune, nelze tyto tabulky v RLS zamknout. Největší zbývající bezpečnostní dluh.
2. **Demo přihlašovací údaje na login obrazovce** (`admin@nemocnice.cz / admin123` atd.) — pro produkční nasazení odstranit z `LoginPage.tsx` a změnit hesla v DB.
3. **Rate-limit do Redis** — současný in-memory limiter nefunguje globálně na serverless platformě (každá instance počítá zvlášť); pro Vercel použít Upstash.
4. **Rozdělit obří komponenty** — např. `SystemSettingsModule.tsx` má přes 1 800 řádků; rozdělení zlepší údržbu i výkon.

## Jak změny dostat do GitHubu
Tato složka neobsahuje `.git`. Nejjednodušší postup: do svého lokálního klonu repa zkopíruj obsah této složky (přepiš soubory), smaž `tsconfig.tsbuildinfo`, pak `git add -A && git commit && git push`.

## Změněné soubory
`lib/auth/csrf.ts` (nový) · `lib/auth/session.ts` · `app/api/devices/route.ts` · `app/api/workflow-statuses/route.ts` · `app/api/rooms/route.ts` · `app/api/rooms/toggle/route.ts` · `components/DeviceRegistration.tsx` · `components/ManagementManager.tsx` · `App.tsx` · `scripts/12-harden-rls.sql` (nový) · `.env.local.example` · `package.json` · `.gitignore`
