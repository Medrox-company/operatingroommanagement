# Nastavení přihlášení přes Google (superadministrátor)

Postup pro založení OAuth klienta v Google Cloud a jeho propojení se Supabase.
Kroky 1–3 musíš udělat ty (vyžadují přihlášení do konzolí), krok 4 a dál je na mně.

Všechny hodnoty níže jsou už doplněné pro tenhle projekt — stačí je kopírovat.

---

## Ověřené údaje projektu

| Co | Hodnota |
|---|---|
| Supabase projekt | `krljrxescufmdtfvlaqm` |
| Supabase URL | `https://krljrxescufmdtfvlaqm.supabase.co` |
| Návratová adresa (callback) | `https://krljrxescufmdtfvlaqm.supabase.co/auth/v1/callback` |
| Produkce | `https://operatingroom.eu` a `https://www.operatingroom.eu` (obě odpovídají přímo, žádná nepřesměrovává) |
| Vývoj | `http://localhost:3000` |

---

## 1. Google Cloud — projekt a souhlasná obrazovka

1. Otevři <https://console.cloud.google.com/>
2. Nahoře v přepínači projektů → **Nový projekt**
   - Název: `Operating Room Management`
3. V levém menu **APIs & Services → OAuth consent screen**
4. Typ uživatele:
   - **Internal** — pokud máš Google Workspace na doméně nemocnice. Lepší volba: přihlásit se může jen někdo z domény.
   - **External** — pokud používáš běžný Gmail účet. Aplikace zůstane v režimu *Testing*, což je v pořádku; jen musíš svůj e‑mail přidat mezi *Test users*, jinak tě Google nepustí.
5. Vyplň:
   - App name: `Operating Room Management`
   - User support email: tvůj e‑mail
   - Developer contact: tvůj e‑mail
6. Rozsahy (scopes) neměň — výchozí `email`, `profile`, `openid` stačí.

> Pokud zvolíš **External**, na obrazovce *Test users* přidej e‑mailové adresy
> všech budoucích superadministrátorů. Bez toho skončí přihlášení chybou 403.

---

## 2. Google Cloud — OAuth klient

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. Name: `operatingroom-web`
4. **Authorized JavaScript origins** — přidej všechny tři:

```
https://operatingroom.eu
https://www.operatingroom.eu
http://localhost:3000
```

5. **Authorized redirect URIs** — přesně jedna adresa, míří na Supabase, ne na aplikaci:

```
https://krljrxescufmdtfvlaqm.supabase.co/auth/v1/callback
```

6. **Create**. Google zobrazí **Client ID** a **Client secret**.

> Client secret si nikam neposílej ani mi ho nediktuj do chatu. Vkládá se
> přímo v Supabase v kroku 3 a nikde jinde ho není potřeba mít.
> Kdyby ses o něj omylem podělil, zruš ho tlačítkem *Reset secret* na téže
> stránce a vygeneruj nový.

---

## 3. Supabase — zapnutí poskytovatele

1. Otevři <https://supabase.com/dashboard/project/krljrxescufmdtfvlaqm/auth/providers>
2. Najdi **Google** → přepni na **Enabled**
3. Vlož **Client ID** a **Client Secret** z kroku 2 → **Save**
4. Přejdi na **Authentication → URL Configuration** a nastav:

   **Site URL:**
   ```
   https://operatingroom.eu
   ```

   **Redirect URLs** (tlačítko *Add URL*, jedna po druhé):
   ```
   https://operatingroom.eu/**
   https://www.operatingroom.eu/**
   http://localhost:3000/**
   ```

---

## 4. Hotovo — jak to funguje

Kroky 1–3 jsou dokončené, Google poskytovatel je v Supabase zapnutý
a aplikace umí:

- tlačítko **Přihlásit se přes Google** na přihlašovací stránce
- kontrolu povolené adresy podle `SUPERADMIN_GOOGLE_EMAILS`
- povinné dvoufázové ověření (TOTP) — bez něj se dovnitř nedostane ani
  správně přihlášený Google účet
- napojení identity na účet superadministrátora v `app_users`

### Aby přihlášení prošlo, musí platit současně

1. token z Googlu je platný (ověřuje se u Supabase, ne jen dekódováním)
2. adresa je v `SUPERADMIN_GOOGLE_EMAILS` — konfigurace nasazení
3. adresa sedí na řádek v `app_users` s rolí `superadmin` — databáze
4. relace má dokončené dvoufázové ověření (`aal2`)

Body 2 a 3 jsou schválně dvě nezávislá místa. Kdyby se někdo dostal k zápisu
do databáze, superadmin přístup si tím sám neotevře — musel by navíc změnit
konfiguraci nasazení.

### Proměnná prostředí

Lokálně je už v `.env.local`. **Ve Vercelu ji musíš přidat ručně**, jinak se
tlačítko v produkci nezobrazí:

*Project Settings → Environment Variables*

```
SUPERADMIN_GOOGLE_EMAILS = jedlicka.jaroslav@gmail.com
```

Prostředí: Production, Preview i Development. Po uložení je potřeba nasadit
znovu, aby se proměnná načetla.

> Prázdná nebo chybějící proměnná znamená **nikdo**, ne „kdokoli". Ověřeno
> testem — chybějící konfigurace nikdy neotevře přístup.

---

## 5. První přihlášení

1. Na přihlašovací stránce vyber zdravotnické zařízení
2. **Přihlásit se přes Google** → vyber svůj účet
3. Objeví se průvodce s QR kódem — naskenuj ho v Google Authenticator,
   1Password nebo podobné aplikaci
4. Opiš šestimístné číslo → hotovo

Při každém dalším přihlášení už stačí Google + šestimístný kód.

---

## 6. Bezpečnostní klíč místo opisování kódu

Druhý krok ověření může místo šestimístného čísla obsloužit **bezpečnostní klíč**
(passkey). Na počítači s Touch ID stačí přiložit prst, jinak prohlížeč ukáže QR
kód, který vyfotíte mobilem a potvrdíte obličejem. QR kreslí sám prohlížeč —
aplikace do toho nevstupuje.

Aplikace to už umí, ale **v Supabase je to zatím vypnuté**. Ověřeno voláním
rozhraní, které vrátilo `mfa_webauthn_enroll_not_enabled`.

### Zapnutí

1. Otevři <https://supabase.com/dashboard/project/krljrxescufmdtfvlaqm/auth/providers>
2. V sekci **Multi-Factor Authentication** zapni **WebAuthn / Security keys**
3. Vyplň údaje relying party:

   **Display name:**
   ```
   Operatingroom Management
   ```

   **Relying Party ID** — pozor, bez `www`, bez `https://`:
   ```
   operatingroom.eu
   ```

   **Relying Party Origins:**
   ```
   https://operatingroom.eu,https://www.operatingroom.eu,http://localhost:3000
   ```

> **Relying Party ID se pak už nesmí měnit.** Klíče jsou k němu kryptograficky
> vázané — po změně přestanou všechny fungovat a musí se registrovat znovu.
> Proto je tam `operatingroom.eu` bez `www`: klíč pak platí na obou adresách.

### Jak to poběží

- Po přihlášení kódem aplikace nabídne uložení klíče. Souhlas není povinný.
- Kdo klíč má, uvidí při dalším přihlášení rovnou tlačítko **Potvrdit** —
  a pod ním odkaz na zadání kódu, kdyby klíč neměl po ruce.
- Kód z autentizační aplikace zůstává funkční jako záloha.
- Dokud je funkce v Supabase vypnutá, aplikace nabídku tiše přeskočí
  a pokračuje kódem. Nic se nerozbije.

Supabase označuje klíče jako **experimentální** a upozorňuje, že se rozhraní
může změnit bez varování. Proto zůstává kód z aplikace zachovaný — kdyby se
s klíči něco stalo, přihlášení dál funguje.

---

## 7. Ztráta telefonu

Záložní kódy zatím nejsou — místo nich platí, že dvoufázové ověření se
resetuje přímo v databázi. Reset zvládne jen ten, kdo má přístup k Supabase,
což je bezpečnější než druhá přihlašovací cesta, která 2FA obchází.

```sql
DELETE FROM auth.mfa_factors
 WHERE user_id = (SELECT id FROM auth.users
                   WHERE email = 'jedlicka.jaroslav@gmail.com');

UPDATE public.app_users SET mfa_enrolled_at = NULL WHERE role = 'superadmin';
```

Při dalším přihlášení se znovu spustí průvodce s QR kódem.

**Praktičtější pojistka:** naskenuj QR kód rovnou do dvou zařízení (třeba
telefon a 1Password na počítači). Pak ztráta jednoho z nich nic neřeší.

Pokud bys chtěl klasické záložní kódy k vytištění, dá se to doplnit —
znamená to tabulku s jejich otisky a jednorázové použití.

---

## Poznámka k mobilní aplikaci

Aplikace má i nativní obal (Capacitor, `com.operatingroom.app`). Google
záměrně blokuje přihlašování uvnitř vestavěného webview, takže v mobilu bude
potřeba otevřít systémový prohlížeč a vrátit se zpět přes deep link — to je
samostatná práce navíc.

Pokud se superadmin přihlašuje jen z počítače, není to potřeba řešit vůbec.
Provozních rolí se to netýká, ty zůstávají na heslech.
