# Operatingroom Manager — podklady pro App Store Connect

Stav: pracovní návrh pro první vydání `1.0`  
Lokalizace: čeština (`cs-CZ`)  
Bundle ID (iOS / App Store Connect): `operatingroom.eu`  
Minimální systém: iOS/iPadOS 15  

Poznámka k identitě: nativní iOS binární soubor používá historický App Store
Bundle ID `operatingroom.eu`. Hodnota `com.operatingroom.app` zůstává zachována
pro Android balíček a vlastní OAuth callback schéma
`com.operatingroom.app://auth/callback`; vlastní URL schéma nemusí být shodné s
iOS Bundle ID.

Tento dokument je podkladem pro vyplnění App Store Connect. Nic z něj se nemá
publikovat, dokud nejsou uzavřeny položky označené **ROZHODNUTÍ VLASTNÍKA**.

## 1. Produktová stránka

| Pole | Návrh | Limit / stav |
|---|---|---|
| Název | **Operatingroom Manager** | 21 / 30 znaků |
| Podnázev | **Řízení operačních sálů** | 22 / 30 znaků |
| Propagační text | **Živý přehled operačních sálů, časová osa, personál a provozní statistiky v jedné bezpečně řízené aplikaci pro oprávněné nemocniční týmy.** | 136 / 170 znaků |
| Klíčová slova | `operacni,saly,nemocnice,workflow,rozpis,personal,koordinace,statistiky,provoz,kapacita` | 86 / 100 bajtů |
| URL podpory | `https://www.operatingroom.eu/support` | před odesláním musí vracet HTTP 200 |
| URL zásad soukromí | `https://www.operatingroom.eu/privacy` | povinná; před odesláním musí vracet HTTP 200 |
| Marketingová URL | `https://www.operatingroom.eu/` | volitelná |
| Primární kategorie | **Medical** | návrh; potvrdit spolu s regulatorním statusem |
| Sekundární kategorie | **Business** | návrh |
| Cena | **Free** | návrh: stažení zdarma, používání jen s účtem zařízení |
| Autorská práva | `[POTVRDIT DRŽITELE PRÁV]` | App Store účet je nyní veden jako Individual; nepoužívat `Medrox s.r.o.` bez potvrzení právního oprávnění |

### Úplný popis

Operatingroom Manager soustřeďuje provozní řízení operačních sálů do jednoho přehledného místa. Oprávnění pracovníci zdravotnického zařízení vidí aktuální stav sálů, průběh pracovního cyklu a navazující provozní informace bez nutnosti ručního obnovování obrazovky.

Živý přehled sálů
• stav jednotlivých operačních sálů v reálném čase
• barevné rozlišení aktuální fáze a provozních režimů
• informace o uplynulém čase, odhadu konce a obsazení sálu
• rychlý přechod do detailu a posun do další nastavené fáze

Koordinace provozu
• denní časová osa napříč operačními sály
• přehled toku pacienta a plánovaného programu
• přiřazení oprávněného personálu k sálu
• provozní zprávy, upozornění a záznam důležitých změn
• 3D a půdorysné zobrazení operačního bloku podle konfigurace zařízení

Přehledy a vyhodnocení
• statistiky využití sálů a délek jednotlivých fází
• porovnání provozu za zvolené období
• provozní a finanční pohledy podle nastavení zařízení
• tisk a export vybraných přehledů do PDF

Přístup podle role
Každý uživatel vidí jen moduly a zdravotnické zařízení, ke kterým mu byl udělen přístup. Podporovány jsou provozní, anesteziologické, manažerské a administrátorské role. Aplikace nabízí světlý i tmavý režim a je přizpůsobena iPhonu i iPadu.

Aplikace je určena pouze oprávněným pracovníkům zapojených zdravotnických zařízení. Přístupové údaje poskytuje správce příslušného zařízení. V naléhavé situaci je nutné vždy postupovat podle interních klinických a krizových pravidel pracoviště; aplikace nenahrazuje urgentní komunikaci.

## 2. Poznámky pro App Review

Následující text vložit anglicky, aby byl pro review tým jednoznačný. Hranaté
závorky musí být před odesláním nahrazeny skutečnými údaji.

> Operatingroom Manager is a login-only hospital operations application used by authorized staff to view and coordinate operating-room status, workflow phases, schedules, staffing and operational analytics.
>
> Review environment: `[SYNTHETIC REVIEW HOSPITAL]`. All records in this environment are synthetic and contain no real patient or employee data.
>
> To sign in: launch the app, select `[REVIEW HOSPITAL]`, choose `[REVIEW ROLE]`, enter username `[REVIEW USERNAME]` and password `[REVIEW PASSWORD]`, then tap Sign In. The account must remain active for the entire review period and must not require an expiring code.
>
> Suggested review path: Rooms overview → open a room → review the current workflow phase and timing → return to overview → open Timeline → open Statistics → switch between light and dark appearance. Do not advance a live workflow unless the supplied review notes explicitly permit it.
>
> The app does not use HealthKit and does not request camera, microphone, contacts, location or App Tracking Transparency permissions. It contains no advertising and does not track users across apps or websites.
>
> Support contact during review: `[REVIEW CONTACT NAME]`, `[REVIEW CONTACT EMAIL]`, `[REVIEW CONTACT PHONE WITH COUNTRY CODE]`.
>
> Regulatory status: `[INSERT ONLY AFTER THE OWNER'S DOCUMENTED REGULATORY DECISION; include authority, registration/certificate details and jurisdictions if the app is a regulated medical device]`.

### Účty pro review

Minimálně jeden stabilní účet musí zpřístupnit funkce zobrazené v metadatech a
screenshotech. Pokud má Apple zkontrolovat i administraci, dodat druhý účet.

| Účel | Zařízení | Role / uživatel | Heslo | Stav |
|---|---|---|---|---|
| Provozní části | `[REVIEW HOSPITAL]` | `[COS/MANAGEMENT REVIEW USER]` | `[NON-EXPIRING PASSWORD]` | **DOPLNIT** |
| Administrace (pokud je součástí review) | `[REVIEW HOSPITAL]` | `[ADMIN REVIEW USER]` | `[NON-EXPIRING PASSWORD]` | **DOPLNIT / NEPOUŽIJE SE** |

Nepoužívat osobní Google účet superadministrátora ani účet vyžadující MFA.

## 3. App Privacy — pracovní odpovědi

Výchozí odpověď je **Yes, data is collected from this app**. Odpovědi musí
zahrnovat i serverové zpracování a integrované poskytovatele. Pro všechny níže
uvedené typy je pracovní nastavení:

- **Linked to the user:** Yes
- **Used for tracking:** No
- **Purpose:** App Functionality
- **Advertising / third-party advertising / developer advertising:** No

| Kategorie Apple | Datový typ | Důvod v aplikaci |
|---|---|---|
| Contact Info | Name | uživatelský účet, personál, kontaktní osoby |
| Contact Info | Email Address | přihlášení, správa účtu, příjemci upozornění a podpora |
| Contact Info | Phone Number | kontaktní osoby a správa zařízení |
| Health & Fitness | Health | údaje vztahující se k operačnímu programu; rozsah určuje zdravotnické zařízení |
| Identifiers | User ID | identita účtu, role a oddělení přístupů |
| Identifiers | Device ID | evidence připojených zařízení a provozní zabezpečení |
| User Content | Other User Content | provozní zprávy, poznámky a obsah vložený zařízením |
| Usage Data | Other Usage Data | provozní události, změny stavů a časové záznamy workflow |

### Co se podle aktuální implementace nepoužívá

- reklama, reklamní identifikátor nebo datoví brokeři,
- sledování napříč aplikacemi a weby,
- přesná nebo hrubá poloha,
- kontakty z adresáře telefonu,
- fotografie, kamera nebo mikrofon,
- HealthKit,
- platební údaje a nákupy v aplikaci.

Před publikováním privacy labelu musí vlastník údajů a pověřenec pro ochranu
osobních údajů ověřit skutečnou produkční konfiguraci, zejména rozsah údajů o
pacientech, personálu, zařízeních, diagnostických záznamech a dobu uchování.

## 4. Další odpovědi v App Store Connect

| Oblast | Pracovní odpověď |
|---|---|
| Tracking / ATT | No |
| Reklama | No |
| In-App Purchases | No |
| HealthKit | No |
| Přihlašování třetí stranou | Google slouží jen superadministrátorům; běžný review účet používá přihlášení zařízení |
| Export compliance | Pouze systémové HTTPS/TLS; `ITSAppUsesNonExemptEncryption = NO` |
| Obsah třetích stran | No, podle aktuálně kontrolovaného obsahu; znovu ověřit licence všech budoucích médií |
| Uživatelsky generovaný obsah | Interní provozní obsah dostupný pouze oprávněným uživatelům zařízení |
| Věk / násilí / hazard / sexualita / návykové látky | None podle aktuálního obsahu |
| Medical or Treatment Information | Provozní koordinace, nikoli léčebné pokyny; odpověď dotazníku musí potvrdit regulatorní vlastník |
| Release mode | Manual release after approval — doporučeno pro první verzi |

## 5. Screenshoty

Protože binární soubor podporuje iPhone i iPad, připravit obě povinné sady. Apple
přijímá 1–10 obrázků bez alfa kanálu. Při shodném rozhraní stačí nejvyšší
požadovaná velikost, kterou App Store Connect zmenší pro menší zařízení.

### Rozměry

- Aktuální záznam aplikace v App Store Connect požaduje iPhone 6,5″, portrét:
  **1242 × 2688 px** nebo **1284 × 2778 px**. Pro finální snímky použít
  čistý simulátor iPhone 11 Pro Max v nativním rozměru **1242 × 2688 px**.
- iPad 13″, portrét: **2064 × 2752 px** nebo **2048 × 2732 px**.
- Formát: PNG nebo JPEG, bez průhlednosti.

### Doporučená sada (6 snímků pro každý typ zařízení)

| Pořadí | Obrazovka | Krátký titulek | Kontrola |
|---|---|---|---|
| 1 | Přehled sálů | **Provoz sálů v jednom přehledu** | syntetické názvy a data |
| 2 | Detail sálu | **Aktuální fáze a čas výkonu** | žádná reálná jména pacientů/personálu |
| 3 | 3D dispozice | **Prostorový přehled operačního bloku** | model odpovídá dodané aplikaci |
| 4 | Timeline | **Celý operační den na časové ose** | čitelné popisky bez ořezu |
| 5 | Statistiky | **Provozní data pro vyhodnocení** | jen sály, které byly v provozu |
| 6 | Světlý režim / rozpis | **Přehledné ovládání na každé směně** | ukázat skutečné UI, ne koncept |

Pro každou sadu zkontrolovat safe-area, status bar, českou diakritiku, žádný
loader či chybovou hlášku a nulový výskyt skutečných osobních údajů. Marketingové
rámečky a titulky smějí pouze popisovat skutečně viditelné funkce.

Lokální režim `VITE_APP_STORE_PREVIEW=1` slouží jen k vizuální a responzivní QA.
Finální screenshoty pro Apple musí vzniknout ze skutečného nahraného rozhraní
aplikace po přihlášení do izolovaného syntetického review zařízení; preview režim
se nesmí vydávat za funkční produkční obrazovku ani přibalit do release buildu.

## 6. Povinná rozhodnutí vlastníka před odesláním

1. **Regulatorní status.** Interní dokumentace obsahuje návrh klasifikace MDR
   třídy IIa, ale nejde o dokončené právní rozhodnutí. Vlastník musí písemně
   potvrdit buď status regulovaného zdravotnického prostředku a dodat příslušné
   registrace/certifikáty, nebo doložený závěr, proč aplikace regulovaným
   prostředkem není. Bez toho nevyplňovat prohlášení Applu a neodesílat review.
2. **Držitel účtu.** Aktuálně ověřené členství Apple Developer je vedeno jako
   **Individual**. Vlastník musí potvrdit vydání pod tímto prodejcem, nebo před
   publikací zajistit převod/konverzi na oprávněnou organizaci.
3. **Způsob distribuce.** Vybrat jednu možnost: Public App Store, Unlisted App,
   nebo Custom App přes Apple Business Manager. Pro nemocniční B2B provoz je
   vhodné posoudit Unlisted nebo Custom distribuci.
4. **Review prostředí.** Schválit anonymizované zařízení a nejméně jeden
   neexpirující účet s dostatečnými oprávněními.
5. **Dostupnost.** Potvrdit země/regiony, cenu Free a ruční vydání po schválení.
6. **Kontakty.** Doplnit osobu, e-mail a telefon dostupný týmu App Review.

## 7. Release checklist

### Obsah a právní stav

- [ ] Uzavřen regulatorní status a připravené podklady pro Apple.
- [ ] Potvrzen právní držitel, copyright, distribuční model a regiony.
- [ ] Privacy odpovědi ověřil vlastník údajů / DPO.
- [ ] `https://www.operatingroom.eu/privacy` a `/support` jsou veřejné a vrací 200.
- [ ] Podmínky podpory a kontaktní e-mail jsou monitorované.

### Review prostředí

- [ ] Samostatná nemocnice používá výhradně syntetická data.
- [ ] Review účty neexpirují, nejsou blokované MFA a fungují mimo interní síť.
- [ ] Účet otevře všechny funkce uvedené v popisu a na screenshotech.
- [ ] Review Notes obsahují přesný postup přihlášení a kontakt s telefonem.

### Build a test

- [x] Placený Apple Developer tým je připojen v Xcode; účet je aktuálně typu Individual.
- [x] Apple Distribution certifikát a App Store provisioning jsou platné (ověřeno 22. 9. 2026).
- [x] Bundle ID `operatingroom.eu`, verze `1.0` a build `1` souhlasí s App Store Connect.
- [ ] Release build prošel na reálném iPhonu a iPadu.
- [ ] Ověřeno přihlášení, návrat z Google přihlášení, relace po restartu a odhlášení.
- [ ] Ověřeny hlavní moduly, světlý/tmavý režim, síťová chyba a obnova spojení.
- [ ] V archivu nejsou development URL, testovací tajemství ani source mapy.
- [x] Build `1` byl 22. 9. 2026 úspěšně nahrán do App Store Connect a Apple zahájil jeho zpracování.
- [x] Build `1` dokončil zpracování, je v TestFlight označen **Ready to Submit**
  a App Store Connect jej nabízí k výběru (ověřeno 22. 9. 2026).
- [ ] Zpracovaný build prošel interním smoke testem na reálném zařízení.

### App Store Connect

- [x] Existující app record pro `operatingroom.eu` ověřen (Apple ID `6768817906`, interní SKU `2J4JJ3SYPV`).
- [ ] Vyplněna česká metadata, kategorie, věkové hodnocení a copyright.
- [ ] Nahrány iPhone i iPad screenshoty bez reálných osobních údajů.
- [ ] Publikován přesný privacy label a připojena URL zásad soukromí.
- [ ] Vyplněno export compliance, content rights a případné regulatorní prohlášení.
- [ ] Vybrán správný build a ruční způsob vydání.
- [ ] Všechny placeholdery `[TAKTO]` byly odstraněny.
- [ ] Vlastník dal bezprostřední výslovný souhlas s akcí **Submit for Review**.

## 8. Ověřené zdroje Apple

- [App information — limity názvu a podnázvu](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information)
- [Platform version information — texty, klíčová slova a URL](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information)
- [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
- [Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)
- [Declare regulated medical device status](https://developer.apple.com/help/app-store-connect/manage-app-information/declare-regulated-medical-device-status/)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
