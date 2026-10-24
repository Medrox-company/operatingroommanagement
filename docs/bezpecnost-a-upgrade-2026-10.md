# Bezpečnost a upgrade — audit 2026-10

Revize zdrojového kódu, závislostí, databázových skriptů a nasazení.
Stav k 24. 10. 2026, větev `claude/intelligent-planck-4luiic`.

Závažnost: **K** kritická · **V** vysoká · **S** střední · **N** nízká.

---

## Provedeno v této větvi

| Změna | Proč |
|---|---|
| Next.js 16.3.8 → **16.4.3** | Odstraňuje tři zranitelnosti: dvě neautentizované RCE (GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr) a DoS přes Server Actions (GHSA-p3m5-59mp-jv5r). `npm audit` po změně nehlásí nic kritického. |
| Aktualizace v rámci povolených verzí (`npm update`, 65 balíčků) | React 19.3.1, supabase-js 2.118, Capacitor 8.5.3, framer-motion 14.6, lucide-react 1.61 a další opravné verze. `package.json` se kromě Next nemění, posun drží `package-lock.json`. |
| Bezpečnostní HTTP hlavičky (`next.config.ts`) | HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, zákaz vložení do cizího iframe (`X-Frame-Options` + `frame-ancestors`). Vypnutá hlavička `X-Powered-By`. Ověřeno na produkčním buildu (`next start`). |
| Skripty `npm run typecheck` a `npm test` | Nefunkční `npm run lint` odstraněn (`next lint` v Next 16 neexistuje). |
| `scripts/check-security-grants.sql` | **Pouze čtení.** Vypíše skutečná práva a RLS politiky v živé databázi. Nespuštěno. |

Ověření: `tsc` bez chyb; testy 1169/1178 (stejných 6 dlouhodobých selhání
jako před změnou); `next build` úspěšný.

---

## Nálezy a návrhy

### K1 — Produkce běží se zranitelným Next.js
Produkční nasazení na Vercelu (18. 10. 2026, commit `94d7bfc`) používá
Next.js 16.3.8. Oprava výše zabere až po nasazení.
**Návrh:** po kontrole sloučit tuto větev a nasadit co nejdříve.

### V1 — Relaci nelze odvolat a role se bere z tokenu
`lib/auth/session.ts` vydává podepsaný token platný 7 dní. Role, e-mail i
zařízení jsou uložené v tokenu a server je při dalších požadavcích znovu
neověřuje vůči databázi (`requireAdmin` čte roli jen z tokenu).
Odhlášení pouze smaže cookie. Důsledky:
- deaktivovaný nebo degradovaný uživatel (např. správce → sestra) má až
  7 dní původní práva,
- odcizený token nejde zneplatnit,
- `/api/auth/me` vrací vždy `is_active: true`.

U běžných rolí částečně chrání kontrola členství v zařízení
(`requireHospitalIdAccess`), u globálních rolí (superadmin) ne.

**Návrh:** tabulka relací (`id`, `user_id`, `revoked_at`, `expires_at`)
s kontrolou při každém požadavku, nebo krátká platnost (např. 12 h) s
obnovou, která znovu načte roli a aktivitu z `app_users`. Minimálně
ověřovat roli z databáze v `requireAdmin` a při vydání `hospital-token`.

### V2 — Klíč relací se může sdílet s klíčem databáze
`getSecret()` při chybějícím `SESSION_SECRET` použije `SUPABASE_JWT_SECRET`
nebo dokonce `POSTGRES_PASSWORD`. Jeden klíč pak podepisuje relace aplikace
i databázové JWT a heslo databáze slouží jako podpisový klíč. Dnes to
prakticky zmírňuje odlišný tvar tokenů, ale jde o zásadní porušení
oddělení klíčů.
**Návrh:** vyžadovat samostatný `SESSION_SECRET` (min. 32 znaků) a fallback
odstranit. Předtím ověřit, že je proměnná nastavená ve Vercelu — audit k
proměnným prostředí přístup neměl. Změna klíče odhlásí všechny uživatele.

### V3 — Uniklý API klíč Resend v historii gitu
Skutečný klíč `re_3aeb…` byl commitnutý 24. 3. 2026 (`3d3f0b4`) v souborech
`.env.local.example`, `QUICK_START.md`, `RESEND_SETUP.md`,
`RESEND_INTEGRATION_SUMMARY.md`. Ze souborů je odstraněný, v historii zůstává.
`AUDIT_A_ZMENY.md` už rotaci doporučuje.
**Návrh:** ověřit na resend.com, že klíč je smazaný a v provozu je nový.
Ostatní nalezené tokeny v historii jsou jen veřejný `anon` klíč Supabase
(z dříve commitnuté složky `.next`), který je v prohlížeči tak jako tak.

### V4 — Přihlášený klient smí přímo měnit tabulky bez kontroly role
Prohlížeč pracuje se Supabase přímo s JWT zařízení. Podle skriptů v
repozitáři (`scripts/13-add-multi-hospital.sql`) má role `authenticated`
plné `SELECT/INSERT/UPDATE/DELETE` v rámci svého zařízení mimo jiné na:
`room_status_history`, `patients`, `workflow_statuses`, `app_settings`,
`schedules`, `shift_schedules`, `notifications_log`, `procedures`,
`equipment`, `safety_checklists`, `operating_procedures`
a `management_contacts` (skript 12 zápis zakázal, skript 13 ho znovu povolil).
Pozdější migrace už zamkly `staff`, strukturu `operating_rooms`,
`app_modules`, `app_submodules` a `departments`.

Kterýkoli přihlášený uživatel (i s nejnižší rolí) tak může přes PostgREST
obejít serverové kontroly — např. smazat historii stavů sálů (statistiky,
dohledatelnost), změnit workflow statusy nebo nastavení. U
`operating_rooms` může měnit i `hourly_operating_cost` (finanční údaj).

**Návrh:**
1. Spustit `scripts/check-security-grants.sql` (pouze čtení) a poslat výstup —
   repozitář neříká, které skripty na produkci proběhly.
2. Podle výsledku připravit zpřísnění: `room_status_history` jen `INSERT`
   (bez `UPDATE/DELETE`), `patients` bez přímého přístupu, konfigurační
   tabulky jen `SELECT` a zápis přes API, `hourly_operating_cost` vyjmout ze
   sloupců zapisovatelných klientem.

### S1 — Omezení počtu pokusů o přihlášení je jen v paměti instance
`lib/auth/rate-limit.ts` počítá pokusy v paměti jedné serverless instance;
na Vercelu jich běží víc, takže limit není globální.
**Návrh:** počítadlo v databázi nebo Upstash Redis a zámek účtu po
opakovaných neúspěších v `verify_membership_password`.

### S2 — Chybí Content Security Policy
Nastaveno je jen `frame-ancestors`. Plná CSP (zdroje skriptů, spojení na
Supabase, Google OAuth) by výrazně omezila dopad případného XSS.
**Návrh:** zavést nejdřív jako `Content-Security-Policy-Report-Only` s nonce
pro inline skript v `app/layout.tsx`, otestovat přihlášení přes Google,
Realtime a mobilní obal, poté vynutit.

### S3 — Build na Vercelu není reprodukovatelný
`vercel.json` instaluje přes `npm install --legacy-peer-deps`, takže si může
vybrat jiné verze, než jsou v `package-lock.json`.
**Návrh:** `"installCommand": "npm ci"` (`legacy-peer-deps` už je v `.npmrc`).

### S4 — Chybí automatická kontrola (CI)
Jediný workflow kontroluje e-mailové zabezpečení. Typy, testy ani `npm audit`
se při pushi nekontrolují.
**Návrh:** workflow s `npm ci`, `npm run typecheck`, `npm test`,
`npm audit --omit=dev --audit-level=high`. Předtím opravit 6 zastaralých testů
(ověřují záměrně změněné rozvržení), jinak by kontrola byla trvale červená.

### S5 — TypeScript běží bez `strict`
Po zapnutí `strict` vznikne jen 30 chyb (5 z nich v nepoužívaném kódu) —
převážně neošetřené `null`. Zapnutí odhalí třídu chyb, které dnes projdou.
**Návrh:** opravit 30 míst a `strict` zapnout.

### S6 — Zbývající zranitelnost ve vývojových nástrojích
`uuid` přes `@capacitor/cli` → `xcode` (3× středně závažné). Týká se jen
nástroje pro sestavení mobilní aplikace, ne běžícího kódu.
**Návrh:** počkat na opravu v Capacitor CLI; `npm audit fix --force` by
Capacitor CLI vrátil na starší verzi.

### N1 — Odhlášení bez kontroly původu
`/api/auth/logout` nekontroluje `Origin`; cizí stránka může uživatele
odhlásit. Nízký dopad. **Návrh:** přidat `assertSameOrigin`.

### N2 — Nepoužívané závislosti a mrtvý kód
- Závislosti bez použití: `resend` a `@react-email/render` (e-maily se
  posílají přímo přes `fetch`), `@radix-ui/react-tooltip` (jen v
  nepoužívaném `components/ui/Tooltip.tsx`).
- 14 souborů, které nikdo neimportuje: 11 ze seznamu mrtvého kódu v `CLAUDE.md`
  (`hooks/useEmailNotifications.ts` už neexistuje) a `components/ui/DropdownMenu.tsx`,
  `components/ui/Tooltip.tsx`, `components/ui/index.ts`.
- 100 nepoužitých proměnných a importů (`noUnusedLocals`), nejvíc v
  `RoomDetail.tsx`, `FlowMonitorModule.tsx`, `StatisticsModule.tsx`.
- V gitu jsou generované nebo velké soubory: `output/pdf/…` (2,6 MB, přestože
  je `output/` v `.gitignore`), `supabase/.temp/cli-latest`, `design-qa.md`
  (316 kB), `docs/app-store/screenshots-preview/*.zip` (6 MB).

**Návrh:** odstranit po potvrzení — část mrtvého kódu může být rozdělaná
funkcionalita (viz `CLAUDE.md`).

---

## Upgrade — hlavní verze (zatím neprovedeno)

| Balíček | Nyní | Nejnovější | Doporučení |
|---|---|---|---|
| typescript | 5.8 | 7.0 | Počkat; TS 7 je nový kompilátor. Nejdřív zapnout `strict` na 5.x. |
| three / @types/three | 0.180 | 0.186 | Upgradovat s vizuální kontrolou 3D dispozice (verze 0.x mění API). |
| @types/node | 22 | 26 | Držet 22, odpovídá běhovému Node 22 (`.nvmrc`). |
| Node.js | 22.13 | — | Podpora Node 22 končí v dubnu 2027; přechod na Node 24 naplánovat. |

## Co je v pořádku

- Všechny API endpointy kromě veřejných (přihlášení, seznam zařízení,
  konfigurace Google) vyžadují přihlášení; mutace kontrolují `Origin`.
- Serverové operace s plnými právy vždy znovu ověřují přístup k zařízení i
  oprávnění k podmodulu (`requireHospitalAccess`, `requireSubmoduleAccess`).
- Session cookie je `HttpOnly`, `Secure`, `SameSite=Lax`.
- Hesla se ověřují v databázi (bcrypt), chyby přihlášení nerozlišují důvod.
- Přihlášení superadministrátora přes Google vyžaduje dvoufázové ověření a
  dvojí povolení (proměnná prostředí + databáze).
- Service worker neukládá odpovědi `/api/`.
- E-maily mají databázovou rezervaci a limity; tajné klíče nejsou v klientu.
- Mobilní obal: ladění WebView jen ve vývoji, žádný smíšený obsah.
