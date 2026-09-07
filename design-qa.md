**Design QA — tabulka rozpisu sálů**

- Source visual truth (výchozí tabulka): `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-07 v 1.08.35.png`
- Source visual truth (cílová buňka): `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-07 v 1.08.49.png`
- Source pixels: 3062 × 1618 a 1726 × 424; desktop; density neuvedena.
- Implementation: `http://localhost:3000/`, `components/RoomSpecialtyScheduleManager.tsx`.
- Browser viewport: 1280 × 720 CSS px, devicePixelRatio 2.
- Implementation screenshot: `/tmp/operatingroom-schedule-auth-blocked.png` (1280 × 720 px).
- State: přihlašovací stránka; autentizovaný rozpis sálů není v kontrolním browseru dostupný.

**Full-view comparison evidence**

- První zdrojový snímek ukazuje týdenní tabulku s barevnými buňkami, centrovanou zkratkou a DOP/ODP v pravém horním rohu.
- Druhý zdrojový snímek definuje cílovou hierarchii: zkratka vlevo nahoře, celý název pod ní, kruhový indikátor vpravo, souvislá barevná plocha a jemné tmavé oddělovače.
- Implementace nyní používá tuto hierarchii v týdenních i měsíčních buňkách, ale autentizovanou obrazovku nelze zachytit ve stejném stavu. Zobrazená login stránka proto není platný vizuální protějšek.

**Focused region comparison evidence**

- Zdrojová cílová oblast byla otevřena v původním rozlišení a její typografie, zarovnání, výplň, dělicí linka a kruhový indikátor byly posouzeny samostatně.
- Odpovídající vykreslenou oblast aplikace nelze bez přihlášení otevřít; přesné porovnání fontu, zalomení a hustoty je zablokované.

**Findings**

- [P2] Chybí autentizovaný post-fix snímek tabulky.
  Location: Rozpis sálů → týdenní a měsíční buňky.
  Evidence: cílové snímky jsou dostupné, kontrolní browser se zastaví na přihlášení.
  Impact: nelze spolehlivě potvrdit zalomení dlouhých názvů a proporce kruhu při skutečné šířce buněk.
  Fix: otevřít přihlášený rozpis a zachytit týdenní pohled s několika obsazenými buňkami.

**Required fidelity surfaces**

- Fonts and typography: kód používá kompaktní tučnou zkratku a menší celý název bez truncation; vykreslená optická shoda čeká na autentizovaný snímek.
- Spacing and layout rhythm: levé zarovnání, dvouřádková hierarchie a pravý indikátor odpovídají cíli; responsivní hustotu je nutné potvrdit v browseru.
- Colors and visual tokens: buňky používají stejnou uloženou barvu a alfa povrch jako popup; původní výrazný barevný obrys byl nahrazen jemnou světlou linkou.
- Image quality and asset fidelity: cílový návrh neobsahuje bitmapové assety ani nestandardní ikony; žádný asset nebyl nahrazen aproximací.
- Copy and content: zkratka, celý název oboru a DOP/ODP zůstávají datově napojené a čitelné v DOM.

**Implementation checks**

- Produkční Next.js build včetně TypeScript kontroly prošel.
- Samostatný `npx tsc --noEmit` po buildu prošel.
- `21st review` skončil bez chyb; eviduje pouze již existující upozornění na pevnou minimální šířku scrollovatelné plánovací tabulky a dynamické databázové barvy.
- `git diff --check` prošel.
- Kontrolní browser nehlásí konzolové chyby.

**Comparison history**

- Pass 1: Zdrojové snímky otevřeny a cílová buňka rozebrána. Implementace převedena na dvouřádkovou hierarchii s kruhovým indikátorem a shodným povrchem popupu.
- Pass 2: Produkční build a statické kontroly prošly. Vizuální post-fix porovnání zůstává zablokované přihlášením.

**Implementation checklist**

- Zachytit autentizovaný týdenní rozpis při stejné datové situaci.
- Ověřit celý název u nejužší obsazené buňky.
- Ověřit hover a otevření přiřazovacího popupu.
- Zopakovat kontrolu v měsíčním pohledu.

final result: blocked
