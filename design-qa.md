## 2026-09-14 — zarovnání pravého sloupce 3D dispozice

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-14 v 0.32.06.png` (794 × 2106 px). Jde o výřez chybného stavu; cílem je srovnat hrany a mezery, nikoli zkopírovat nesouosé rozložení.
- Browser implementation: `http://localhost:3000/`, 3D dispozice, vybraná `GYNEKOLOGIE HLAVNÍ`, připravený sál. Živé časy/počty se proti dodanému historickému snímku přirozeně liší.
- Full-view evidence: `design-qa-spatial-alignment-desktop.png` (1920 × 1080 px) a `design-qa-spatial-alignment-compact.png` (1280 × 720 px). Screenshoty odpovídají CSS viewportu; browser DPR 2.
- Focused comparison: `design-qa-spatial-alignment-comparison.png` (807 × 1085 px), vlevo zdroj normalizovaný z 2× na 397 × 1053 px, vpravo nezdeformovaný výřez pravého sloupce ze 1920px renderu. Výška historického viewportu není známa; porovnávají se hrany, šířky, text a mezery, nikoli absolutní výška panelu.

**Findings and fixes**

- [P1, vyřešeno] Toolbar měl šířku podle obsahu, detail samostatnou pevnou šířku a upozornění dva sloupce z dvanácti. Všechny tři řádky nyní používají společné CSS proměnné pro šířku detailu a mezeru. Horní ovládání se vejde dovnitř stejného sloupce.
- [P2, vyřešeno] Text upozornění se dotýkal tlačítka. Explicitní mezery, řádkování a nesmrštitelné tlačítko zachovávají oddělení prvků.
- [P2, vyřešeno] Dlouhý název měl příliš volné řádkování. Nadpis má řízené řádkování 1.2 a může bezpečně zalomit dlouhá slova; zavírací ikona má vlastní místo.

**Required fidelity surfaces**

- Fonts/typography: rodina, barvy, velikostní hierarchie a tabulární čísla zachované; zpřesněno pouze řádkování nadpisu a upozornění. Dvouřádkový název nezasahuje do zavíracího tlačítka.
- Spacing/layout: u 1920 × 1080 mají toolbar, detail i alert přesně x = 1542, šířku 338 px, pravou hranu 1880. U 1280 × 720 mají přesně x = 955, šířku 285 px. Spodní metriky a program zachovávají vzájemný poměr 1:1:1:2 v levé části.
- Colors/tokens: původní tmavomodré plochy, stavové barvy, žlutá akce a modré upozornění beze změny.
- Image quality/assets: tato oprava nemění modely, světla, textury ani používanou knihovnu ikon. Nové rastrové assety nejsou potřeba.
- Copy/content: názvy, živá data a texty akcí zachované; do backendu se nezapisovalo.

**Interaction and responsive checks**

- V prohlížeči ověřen výběr dlouhého názvu sálu. Detail i upozornění zobrazují stejný sál.
- U 1280 × 720 je celý detail vysoký 393 px, jeho scrollHeight = clientHeight = 391 px; tlačítko je celé uvnitř panelu. Mezera upozornění nad tlačítkem 12.1 px, na širokém monitoru 6.7 px.
- U 700 × 900 se části skládají do jednoho sloupce se shodnými hranami x = 36, pravá hrana 664, šířka 628 px. Bez horizontálního přetečení; mobilní stránka přirozeně roluje.
- TypeScript a `git diff --check` prošly. Browser konzole bez error záznamů; jeden dřívější warning Realtime heartbeat timeout není způsoben změnou rozložení a není zde označen za opravený.
- Předchozí chyby jsou na normalizovaném porovnání odstraněné. Nezbývá akční P0/P1/P2 v rozsahu zarovnání označeného sloupce. Rozložení na ostatních netestovaných rozměrech není prohlášeno za ověřené.

final result: passed

---

## 2026-09-14 — odstranění žlutých linek pod sály

- Požadavek: nezobrazovat žluté linky ve 3D projekci, které měnily viditelnost po kliknutí na sál. Teplé osvětlení aktivních sálů a živé barvy statusů mají zůstat zachované.
- Implementace: `vendor/orms-spatial-editor/src/dashboard-viewer.js`, `geometry.js`, `room-assets.js`.
- Provozní browser evidence: `design-qa-spatial-fidelity-dashboard.png` (1308 × 981 px), `http://localhost:3000/`, 3D dispozice po plném reloadu a výběru `Sál č. 7`.
- Aktivní stav bez zásahu do provozních dat: `design-qa-spatial-fidelity-fixture.png` (1448 × 1086 px), šest ukázkových sálů, PCHO 2 aktivní; `design-qa-spatial-fidelity-status.png` zachycuje další přepnutí statusu/výběru.
- Dashboard potlačuje dekorativní pásky před prvním vykreslením. Potlačení respektují změna aktivity, výběr a dokončení asynchronního načítání GLB. Editor tímto příznakem není změněn.
- Bodové světlo aktivního sálu je samostatná vrstva a zůstává zapnuté. Barvy statusů, modelové tablety a kontrolky nejsou odstraňovány.
- V prohlížeči ověřen reload, výběr sousedního sálu, změny ukázkových statusů a otočení scény. Konzole provozního dashboardu i ukázkové scény bez error/warn záznamů.
- Nezávislý smoke test se skutečným `DashboardViewer.setProject` a zpožděným GLB: 0 viditelných pásků před načtením, během výběru, po načtení i při přechodu aktivity na jiný sál; aktivní PointLight správně zůstává a přesouvá se.
- Automatické kontroly: 19/19 prostorových testů, TypeScript a `git diff --check` prošly. Produkční build `npm exec next build -- --webpack` prošel. Výchozí Turbopack build v tomto prostředí skončil na oprávnění sandboxu při bindování portu, nikoli na chybě aplikace.

final result: passed

---

## 2026-09-14 — detailnější živý 3D model a porovnání s předlohou

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/c9a87c58-31d8-42d8-891d-0218ecd44e69.png` (1448 × 1086 px).
- Full-view implementation: `design-qa-spatial-fidelity-fixture.png`, viewport 1448 × 1086, šest sálů, aktivní PCHO 2; pouze lokální ukázková data. Produkční půdorys s 15 sály se kvůli porovnání nepřepisoval.
- Focused comparison: `design-qa-spatial-fidelity-comparison.png` (2024 × 616 px), vlevo zdrojový výřez, vpravo skutečný browser render. Výřezy jsou normalizované na šířku 1000 px; odlišná kompozice a geometrie zůstávají viditelné, nejsou maskované.
- Asset: nový `public/spatial/models/pcho-3-detailed.glb`, odvozený z dodaného `pcho-3.glb`. Originál zůstává nezměněný. Nový model má 49 218 trojúhelníků, 5 563 460 bajtů, zachované rozměry/pivoty a bitově shodné původní UI textury.
- Hrany dostaly fyzické malé úkosy; kontaktní stíny jsou předpočítané do jedné sdílené 2048² AO textury. Povrchy dostaly jemný saténový detail a samostatnou drsnost/kovovost. Barevná korekce sdílených materiálů probíhá pouze jednou, nikoli opakovaně pro každý mesh.
- Studené modrofialové stěny, světlejší hrany, stříbřité vybavení a teplé aktivní světlo byly laděny podle přímého porovnání. Stíny používají měkkou VSM mapu 2048²; žádný nový fullscreen AO průchod při otáčení scény.
- Kamera zachovává ortografickou projekci, mírné natočení a skutečné poměry stran. Automatické orámování používá promítnuté rohy modelu. Opravena Eulerova rotace klonovaných místností/vybavení, která u některých 180° klonů vracela dveře na nesprávnou stranu.
- Fonts, copy, panel layout: provozní typografie, názvy a údaje se neměnily. Testovací ovládání slouží pouze pro opakovatelné porovnání světel a statusů; nejde o náhradu dashboardu.
- Interakce: ověřeny výběr, aktivita, různé statusy, půdorys a rotace. Testy chrání projekci, správnou rotaci klonů, nezávislé statusové materiály, načítání a strukturu optimalizovaného GLB.

**Zbývající rozdíly vůči požadavku na naprostou identitu**

- [P2, otevřeno] Dodaný GLB není původní scéna ze snímku: jiný tvar/rozmístění lamp, stolů a přístrojů, jiné členění stěn a přípraven. Materiálová a světelná úprava tyto rozdíly sama neodstraní. Úplná shoda vyžaduje původní referenční 3D scénu nebo další cílené přemodelování vybavení a prostor.
- [P2, otevřeno] Na některých velkých stěnách zůstává proti předloze plošší světelný přechod a neodpovídá přesně kontrast/rozložení lokálních odlesků. Výsledný render je blíže, ale není pixelově ani geometricky identický.
- Tato kontrola tedy nepotvrzuje doslovné splnění „naprosto identicky“. Funkční úprava odstranění linek je ověřena samostatně výše.

final result: blocked

---

## 2026-09-13 — referenční pozadí a stínování neaktivních sálů

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/c9a87c58-31d8-42d8-891d-0218ecd44e69.png` (1448 × 1086 px).
- Browser-rendered implementation: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-lighting-final.png` (955 × 1119 px).
- Normalizované zaměřené porovnání: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-lighting-comparison.png` (1420 × 544 px).
- Viewport: 955 × 1119 CSS px, devicePixelRatio 2; zachycený browser screenshot má 955 × 1119 obrazových bodů.
- State: provozní dashboard, `3D dispozice`, `Operační blok`, připravené/neaktivní sály a vybraný připravený `PCHO SÁL Č.2`. Zdrojový snímek má jiný půdorys a aktivní žlutě osvětlený sál; kontrola proto cíleně porovnává pozadí a všechny neaktivní modré plochy.

**Full-view and focused comparison evidence**

- Celý render používá shodný hluboký námořnický základ, modrofialový radiální přechod za dispozicí a tmavší spodní zakončení. Přechod nemá viditelný obdélníkový okraj.
- Neaktivní sály mají chladné modrofialové podlahy a stěny, tmavé spáry a sokly, světlejší konstrukční hrany a modroocelové vybavení. Materiály nepůsobí jako šedý nebo bílý model.
- Směrové světlo kreslí horní hrany a vybavení, zatímco svislé stěny zůstávají ve studeném stínu. Jemné obvodové světlo je součástí 3D scény, takže zůstává svázané s dispozicí při jejím pohybu.

**Required fidelity surfaces**

- Fonts and typography: typografie, štítky sálů a provozní panel zůstaly beze změny.
- Spacing and layout rhythm: layout a responsivní uspořádání nebyly touto úpravou měněny; užší kontrolní viewport záměrně zobrazuje jiný výřez scény než široká reference.
- Colors and visual tokens: vzorky pozadí po opravě odpovídají referenci v tmavém námořnickém rozsahu; horní střed `#0E1740` vs. `#11183E`, střed záře `#111C49` vs. `#131B4A`, spodní oblast `#111D47` vs. `#151D4C`.
- Image quality and asset fidelity: místnosti dál používají dodaný `pcho-3.glb`; barevná korekce probíhá na PBR materiálech a zachovává textury, odlesky, stíny i ostré detaily při zoomu.
- Copy and content: názvy sálů a živá provozní data zůstaly beze změny.

**Findings and iteration history**

- [P2, vyřešeno] Výchozí scéna byla příliš šedá a rovnoměrně osvětlená. Materiály stěn, podlah, hran, spár a vybavení dostaly samostatnou studenou barevnou korekci; ambientní a environmentální světlo bylo omezeno.
- [P2, vyřešeno] První kontrolní průchod byl proti referenci příliš tmavý. Finální průchod vyvážil směrové světlo a expozici tak, aby zůstaly čitelné stoly, lampy, dveře, futra a tablety, ale neaktivní stěny zůstaly ve stínu.
- [P2, vyřešeno] Spodní část globálního pozadí byla téměř černá. Finální gradient zachovává modrý odstín až k dolnímu okraji a současně směrem dolů jemně tmavne.
- Nezůstává žádný akční P0/P1/P2 rozdíl v požadovaném pozadí nebo stínování neaktivních sálů.

**Primary interactions and implementation checks**

- V prohlížeči otestován výběr `Sál č. 7` a návrat na `PCHO SÁL Č.2`; detail i štítek se změnily bez opětovného sestavení celé scény.
- Po plném obnovení proběhl loader 3D modelů a finální scéna se vykreslila bez error/warning záznamů v browser konzoli.
- `npm run build`, `npx tsc --noEmit` a `git diff --check` prošly bez chyb.

final result: passed

---

## 2026-09-13 — kompaktní 3D dashboard bez rolování

- Source visual truth: uživatelské výřezy `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-13 v 20.52.44.png` (528 × 116 px), `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-13 v 20.54.07.png` (3594 × 568 px) a `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-13 v 20.54.58.png` (722 × 1364 px).
- Implementation: `http://localhost:3000/`, desktopový dashboard v režimu `3D dispozice`, podlaží `Operační blok`, vybraný sál `PCHO SÁL Č.2`.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-responsive-layout.png` (1280 × 720 px).
- Browser viewport: 1280 × 720 CSS px, devicePixelRatio 1. Zdrojové výřezy zachycují samostatné oblasti ve vyšší hustotě; porovnání proto normalizuje jejich fyzické rozměry vůči odpovídajícím oblastem 1280px desktopového viewportu.

**Full-view and focused comparison evidence**

- Celý browser render potvrzuje, že dokument i hlavní modul mají shodnou výšku 720 px, `scrollY` je 0 a nevzniká stránkové přetečení.
- Výřez horního ovládání byl porovnán se zdrojem: samostatné boxy data a času jsou odstraněné a volba `Operační blok` je ve stejné skupině jako ikony Karty sálů, 3D pohled, Půdorys a Vycentrovat scénu.
- Výřez spodního souhrnu byl porovnán se zdrojem: jediný řádek karet zůstává zachovaný, ale při 720px výšce měří 119 px namísto původního téměř 200px minima.
- Výřez detailu sálu byl porovnán se zdrojem: všechny čtyři informační buňky i hlavní žluté tlačítko jsou viditelné zároveň. Panel měří 393 px, jeho `scrollHeight` se rovná `clientHeight` a `overflow-y` je `hidden`.

**Required fidelity surfaces**

- Fonts and typography: původní rodina, hierarchie, váhy a tabulární číslice zůstaly zachované; na nízkém desktopu se zmenšují jen fluidní velikosti a mezery, bez transformace nebo rozmazání textu.
- Spacing and layout rhythm: horní řádek má dvě jasné části, spodní pás je nižší a hlavní scéna dostává zbývající výšku. Detail je přesně vysoký jako 3D scéna.
- Colors and visual tokens: tmavomodré panely, transparentní hrany, žlutý aktivní stav i modrá výstražná karta zůstaly beze změny.
- Image quality and asset fidelity: živá Three.js dispozice, GLB modely, materiály a štítky nejsou škálovány přes CSS transformaci; přizpůsobuje se skutečný layout a viewport kamery.
- Copy and content: texty `Operační blok`, `Karty sálů`, `3D pohled`, provozní metriky a detail sálu zůstaly zachované.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči třem požadovaným úpravám.
- [P3] Na displejích užších než 700 px se dashboard záměrně vrací k vertikálnímu toku se scrollováním; bez něj by nebylo možné zachovat čitelnost mobilního zobrazení.

**Comparison history**

- Baseline P1: datum, čas a volba podlaží tvořily samostatný prostřední blok, zatímco požadovaná volba `Operační blok` měla být součástí skupiny ikon zobrazení.
- Baseline P2: spodní karty měly pevné minimum 198 px a odebíraly prostor 3D scéně.
- Baseline P1: pravý detail používal vlastní svislý posuvník a výšku `calc(100% - 40px)`, takže celý obsah nebyl viditelný bez rolování.
- Final fix: odstraněné datum a čas, přesunutý přepínač podlaží, výškově omezený souhrnný řádek a adaptivní grid detailu s výškovou variantou pro displeje do 900 px.
- Post-fix evidence: při 1280 × 720 má stránka `scrollHeight = clientHeight = 720`, panel `scrollHeight = clientHeight = 391` a celý souhrnný pás zůstává nad patičkou.

**Interaction and implementation checks**

- Ověřeno přepnutí `Karty sálů` → `3D dispozice` a návrat kompletní scény.
- Ověřeno zobrazení výběru podlaží přímo v pravé ovládací skupině.
- Browser console: 0 error-level položek.
- React kontrola: odstraněn již nepotřebný odvozený objekt data; nebyly přidány nové efekty, event listenery ani nákladné renderovací závislosti.
- `npm run build` a TypeScript kontrola prošly bez chyb.

final result: passed

---

## 2026-09-13 — detailní pevné stěny a parametrické ohraničení

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/c9a87c58-31d8-42d8-891d-0218ecd44e69.png` (1448 × 1086 px).
- Browser-rendered implementation: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-solid-walls-editor-final.jpg` (955 × 1119 px).
- Focused source evidence: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-solid-walls-reference-focus.png` (980 × 560 px).
- Focused implementation evidence: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-solid-walls-implementation-focus.jpg` (600 × 650 px).
- Viewport: 955 × 1119 CSS px, browser DPR 2; browser screenshot byl normalizován na 955 × 1119 obrazových bodů (efektivní hustota 1×).
- State: 3D prostorový editor, `1. patro · operační blok`, nízká přední řezová stěna, zapnutý obvod budovy, zapnuté KNL ohraničení, profil `Pevné nemocniční stěny`, automatický odstup 3 m podle šířky chodby.

**Full-view comparison evidence**

- Celek zachovává studenou modrošedou paletu, mírně natočenou 3D kameru a hmotný obvod operačního traktu. Nová pevná stěna tvoří souvislý uzavřený prstenec v editovatelném odstupu chodby.
- Přední strana se v režimu architektonického řezu sníží na 1,28 m, ostatní strany zachovávají nastavenou konstrukční výšku 3 m. Po vypnutí řezu mají všechny čtyři strany stejnou skutečnou výšku.
- Samostatný vnější prstenec je záměrná funkční vrstva nad rámec zdrojového renderu: uživatel jej může přepnout na prosklení nebo spojovací chodbu a jeho odstup se řídí editorem.

**Focused region comparison evidence**

- Pevná stěna má nosné jádro, pohledový kazetový obklad, svislé a vodorovné spáry, zesílený sokl, vnitřní ochranný sokl, ochranný pás, horní krycí hlavici a průběžné i rohové konstrukční pilíře.
- Moduly 1,18 m a členění do výškových pásů odpovídají vizuálnímu rytmu panelovaných stěn ve zdroji. Horní krytí a pilíře používají o něco světlejší, stále studený modrošedý materiál; spáry a sokl jsou tmavší.
- Obvod přímo navázaný na místnosti dále obsahuje dveřní otvory, dvoukřídlá posuvná křídla, obložky, překlady, prahy, senzory, čtečky a tablety. Tyto prvky zůstávají samostatné a reagují na úpravy místností.

**Required fidelity surfaces**

- Fonts and typography: typografický systém editoru se nezměnil; nový název profilu a popis používají existující velikosti, řádkování a kontrast postranního panelu bez přetečení.
- Spacing and layout rhythm: sekce `OHRANIČENÍ KNL` zachovává stejnou mřížku, radius a vertikální rytmus jako `OBVOD BUDOVY`; 3D model zůstává čitelný mezi oběma postranními panely.
- Colors and visual tokens: pevné vrstvy používají samostatné chladné PBR materiály s vysokou drsností; finální iterace ztmavila krytí a pilíře po přímém porovnání se zdrojem.
- Image quality and asset fidelity: místnosti v produkčním dashboardu nadále používají dodaný `pcho-3.glb`; nové pevné stěny jsou vektorová 3D geometrie, takže zůstávají ostré při zoomu, rotaci i změně rozměrů.
- Copy and content: volby `Pevné nemocniční stěny`, `Fasádní prosklení` a `Spojovací chodba` přesně popisují dostupné konstrukční profily; text uvádí vazbu na výšku, tloušťku a odstup chodby.

**Findings and iteration history**

- [P2, vyřešeno] První iterace měla 398 samostatných prvků a příliš světlý plášť. Oprava sloučila pohledové plochy, ponechala fyzické spáry a snížila scénu na 142 prvků; současně ztmavila albedo krytí, pilířů a panelů. Post-fix evidence: `design-qa-solid-walls-editor-final.jpg`.
- [P2, vyřešeno] Pevný vnější prstenec původně ignoroval režim nízkých stěn. Oprava snížila pouze přední stěnu v řezu a zachovala plnou výšku při exportu i režimu `Celé stěny`.
- Nezůstává žádný P0/P1/P2 problém v konstrukčním členění, přepínání profilů, editovatelnosti, odstupu ani řezovém zobrazení. Rozdílné rozmístění místností v kontrolním editorovém projektu je testovací stav, nikoli drift produkčního půdorysu.

**Primary interactions and implementation checks**

- V prohlížeči otestováno přepnutí `Pevné nemocniční stěny → Fasádní prosklení → Pevné nemocniční stěny`; popis i render se přepnuly bez chyby.
- Konzole kontrolního náhledu neobsahovala žádnou chybu, pouze zprávy vývojového hot-reloadu.
- Modelová validace přijímá nový profil `solid`; všechny prvky pevné stěny zůstávají samostatně editovatelné.
- Automatizovaný test ověřil 1,28/3/3/3 m v řezu a 3/3/3/3 m u plných stěn.

final result: passed

---

## 2026-09-10 — obnovený 3D úhel a oddělené stavové zvýraznění

- Source context: uživatelské upřesnění k nežádoucímu rovnému pohledu a k předchozímu celoplošnému barevnému zvýraznění; původní problematický snímek `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 13.27.29.png`.
- Implementation: `http://localhost:3000/`, dashboard v režimu `3D dispozice`, mírně pootočený ortografický pohled.
- Browser screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-perspective-status-final.jpg` (1600 × 1000 px).
- Browser viewport: 1600 × 1000 CSS px, devicePixelRatio 1.
- State: `TRAUMATOLOGIE - 1` aktivní ve fázi `Příjezd na sál`, následně ověřen připravený `PCHO SÁL Č.2`.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči upřesnění. 3D pohled je znovu mírně natočený a lze jej volně rotovat, ale kamera zůstává ortografická, takže přední ani zadní stěny nemění velikost podle vzdálenosti.
- Fázová barva je jemná a omezená pouze na materiály `wall` a `facade`. Podlaha, vybavení, dveře a ostatní konstrukce ji nepřebírají.
- Aktivní sály mají tenké žluté provozní světlo. Připravený sál nemá stavové tónování ani žlutou záři; při výběru používá pouze neutrální modrý štítek.

**Required fidelity surfaces**

- Fonts and typography: štítky a provozní panel zůstaly beze změny.
- Spacing and layout rhythm: původní prostorové měřítko, vycentrování a mírně diagonální kompozice jsou obnoveny.
- Colors and visual tokens: živá fáze používá 16% příměs barvy a emissive intenzitu 0,14 pouze na stěnách; aktivní provozní linka zůstává žlutá `#FFDA28`.
- Image quality and asset fidelity: jde o nativní Three.js materiály a světla reagující na rotaci a zoom.
- Copy and content: názvy místností i statusů zůstaly beze změny.

**Interaction and implementation checks**

- Pro aktivní sál geometrický test potvrdil fialový emissive odstín stěny `#8B5CF6`, neutrální podlahu a viditelné žluté linky.
- Pro připravený sál test potvrdil původní neutrální materiál stěny `#9AA6C0` a skryté žluté linky. Browser ověřil neutrální štítek připraveného sálu.
- Projekční test stejné stěny v přední a zadní části scény naměřil shodnou obrazovou šířku `0,099608611626`; rozdíl je přesně `0`.
- `node --check`, `npx tsc --noEmit`, `npm run build` a `git diff --check` prošly bez chyb.

final result: passed

---

## 2026-09-10 — barva vybraného sálu podle aktuálního statusu

- Implementation: `http://localhost:3000/`, dashboard v režimu `3D dispozice`, osově zarovnaný pohled.
- Browser screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-status-color-final.jpg` (1600 × 1000 px).
- Browser viewport: 1600 × 1000 CSS px, devicePixelRatio 1.
- State: vybraný sál `TRAUMATOLOGIE - 1`, aktuální fáze `Příjezd na sál`, barva statusu `#8B5CF6`.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči požadavku. Dřívější pevná žlutá byla odstraněna ze štítku, obvodových světel, stěn, podlahy, vstupního indikátoru i bodového světla vybraného sálu.
- Vybraný sál nyní přebírá `accent_color` konkrétního workflow statusu. Emergency a uzamčený stav dál používají své prioritní barvy; při chybějícím propojení se použije neutrální šedomodrá.

**Required fidelity surfaces**

- Fonts and typography: text, velikost, váha a zalamování štítku zůstaly beze změny.
- Spacing and layout rhythm: rozměry štítku, modelu a pravého detailu se nezměnily.
- Colors and visual tokens: štítek, 3D materiály a záře sdílejí jeden aktuální statusový token; pro `TRAUMATOLOGIE - 1` prohlížeč potvrdil `#8B5CF6` a po výběru `PCHO SÁL Č.2` potvrdil `#00FFEE`.
- Image quality and asset fidelity: zvýraznění zůstává součástí živých Three.js materiálů a osvětlení.
- Copy and content: názvy sálů i statusů zůstaly beze změny.

**Interaction and implementation checks**

- Ověřena změna výběru mezi dvěma sály s odlišnými statusy; barva štítku i 3D zvýraznění se přepnula bez obnovy celé scény.
- Deterministický test materiálů potvrdil fialovou `#8B5CF6` na obvodových světlech a emissive vrstvě stěn; po zrušení výběru se světla skryla a původní materiál stěny se obnovil.
- `node --check`, `npx tsc --noEmit`, `npm run build` a `git diff --check` prošly bez chyb.

final result: passed

---

## 2026-09-10 — osově zarovnaný 3D pohled bez zkosení

- Source visual truth — nežádoucí zkosený stav: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 13.27.29.png` (1852 × 888 px).
- Implementation: `http://localhost:3000/`, dashboard v režimu `3D dispozice`, podlaží `Operační blok`, vybraný sál `TRAUMATOLOGIE - 1`.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-no-skew-final.jpg` (1600 × 1000 px).
- Focused 3D region: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-no-skew-focus.jpg` (1076 × 489 px).
- Browser viewport: 1600 × 1000 CSS px, devicePixelRatio 1; dokument má shodných 1600 × 1000 px a nevzniká vodorovné ani svislé přetečení.

**Full-view and focused comparison evidence**

- Normalizované porovnání problémového snímku vlevo a finálního 3D výřezu vpravo: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-no-skew-comparison.jpg` (2860 × 650 px).
- Levý stav má bočně vyosený azimut: vodorovné a hloubkové osy se promítají diagonálně a jednotlivé řady působí zkoseně. Pravý stav zachovává 3D výšku stěn a pohled shora, ale kameru zarovnává přesně s osami budovy; řady jsou rovnoběžné a místnosti si zachovávají skutečné vzájemné proporce.

**Required fidelity surfaces**

- Fonts and typography: HTML štítky sálů, jejich velikost, váha a zalamování zůstaly beze změny.
- Spacing and layout rhythm: poloha hlavičky, detailu sálu, spodních souhrnů a ovládání se nezměnila; scéna je znovu automaticky vycentrovaná v dostupné ploše.
- Colors and visual tokens: materiály, modré pozadí, žlutý vybraný stav i stavové barvy zůstaly zachované.
- Image quality and asset fidelity: jde dál o živou Three.js scénu se skutečnou 3D geometrií, osvětlením a stíny, nikoli o rastrový nebo CSS překryv.
- Copy and content: názvy sálů a živá provozní data zůstaly beze změny.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči požadavku na reálné osové zobrazení bez zkosení.
- [P3] Pevné osové zarovnání je záměrně méně dramatické než volný izometrický pohled; volná rotace zůstává dostupná v 3D editoru, kde slouží k úpravám dispozice.

**Comparison history**

- Baseline P1: kamera byla umístěna mimo střed osy X a OrbitControls dovoloval volný azimut; po otočení vzniklo výrazné diagonální zkosení celé dispozice.
- Pass 1 P2: zarovnání os odstranilo zkosení, ale nižší úhel kamery příliš zplošťoval skutečnou hloubku místností.
- Final fix: kamera je osově zarovnaná na `[0, 42, 30]`, používá ortografickou projekci a vyšší náklon, který čitelně zachovává podlahy i výšku stěn. Rotace je v provozním dashboardu uzamčena, posun a přiblížení zůstávají funkční.

**Interaction and implementation checks**

- Ověřeno přepnutí `3D pohled` → `Půdorys` → `3D pohled`; oba ovladače po kliknutí hlásily aktivní stav a finální scéna se vrátila do rovného osového pohledu.
- Projekční test potvrdil nulový svislý rozdíl obou konců vodorovné hrany a nulový vodorovný rozdíl obou konců hloubkové hrany (`0`, `0`).
- Browser runtime nezaznamenal žádnou chybu; `node --check`, `npm run build` a `git diff --check` prošly bez chyb.

final result: passed

---

## 2026-09-10 — parametrické KNL ohraničení podle šířky chodby

- Source truth: `/Users/jaroslavjedlicka/Desktop/KNL_ohraniceni_pro_Codex.zip`, zejména `KNL_ohraniceni/KNL_ohraniceni.json`, `boundaries.mjs` a konstrukční profily `bridge` / `facade`. Balíček neobsahuje rastrovou referenci; shoda je proto ověřena proti jeho číselným geometrickým a materiálovým hodnotám.
- Implementation: `http://localhost:3000/`, dashboard v režimu `3D dispozice`, podlaží `Operační blok`, KNL profil `Fasádní prosklení`, automatické odsazení 3 m podle uložené šířky chodby.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-knl-boundary-final.jpg` (1600 × 1000 px).
- Focused 3D region: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-knl-boundary-focus.jpg` (1076 × 489 px).
- Browser viewport: 1600 × 1000 CSS px, devicePixelRatio 1; dokument přesně odpovídá viewportu a nemá vodorovné ani svislé přetečení.

**Full-view and focused comparison evidence**

- Celý provozní dashboard i zaměřený výřez ukazují transparentní modré prosklení s pravidelnými sloupky, souvislý pás pochozí plochy a stejnoměrný odstup po celém obvodu skutečné dispozice.
- Zdrojová specifikace nemá obrazový mockup, proto není účelné skládat falešné pixelové porovnání. Vizuální výsledek je porovnán se zdrojovými profily a zároveň ověřen numericky: výška, tloušťka, rozteč, opacity, roughness i metalness jsou převzaty z dodaného balíčku.
- Vnitřní sály, chodba, obvodový plášť, dveře, futra, tablety ani vybavení se přidáním KNL ohraničení neposouvají a nemění rozměry.

**Required fidelity surfaces**

- Fonts and typography: názvy sálů a provozní panely zůstaly beze změny; editorový blok používá stejnou typografii a hierarchii jako stávající nastavení patra.
- Spacing and layout rhythm: ohraničení používá jeden konzistentní odstup na všech čtyřech stranách; výchozí hodnota se počítá z aktuální šířky chodby a lze ji nahradit vlastní hodnotou 0,5–20 m.
- Colors and visual tokens: sklo, sloupky a podlaha používají přesné lineární RGB, průhlednost a materiálové parametry z KNL balíčku, přizpůsobené stávajícímu modrému prostorovému pozadí aplikace.
- Image quality and asset fidelity: ohraničení je nativní Three.js geometrie, nikoli statický obrázek; zůstává prostorové při rotaci, přiblížení i změně kamery.
- Copy and content: editor nabízí srozumitelné volby `Podle šířky chodby`, `Vlastní hodnota`, `Fasádní prosklení` a `Spojovací chodba`.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči dodané KNL konstrukční specifikaci a požadavku na odsazení podle šířky chodby nebo editace.
- [P3] Dodaný dokument je označen jako koncept, nikoli ověřená výrobní dokumentace; aplikace proto zachovává parametrickou editovatelnost místo uzamčení rozměrů.

**Interaction and implementation checks**

- Automatický režim vrací při 3m chodbě odstup 3 m; po změně její šířky na 4,25 m se hranice přepočítá na 4,25 m. Ruční režim zachová zadaných 5,5 m nezávisle na chodbě.
- Deterministický geometrický test potvrdil čtyři skleněné úseky, samostatné sloupky a čtyři pochozí pásy bez změny geometrie místností.
- `node --check`, `npm run build` a `git diff --check` prošly bez chyb.

final result: passed

---

## 2026-09-10 — skutečné proporce 3D dispozice

- Source visual truth — nežádoucí zkosený/snížený stav: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 11.30.28.png` (2054 × 1136 px) a `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 11.30.37.png` (2178 × 1030 px).
- Implementation: `http://localhost:3000/`, dashboard v režimu `3D dispozice`, podlaží `Operační blok`, vybraný sál `TRAUMATOLOGIE - 1`.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-real-walls-final.jpg` (1920 × 1200 px).
- Focused 3D region: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-real-walls-focus.png` (1396 × 687 px).
- Browser viewport: 1920 × 1200 CSS px, devicePixelRatio 1; stránka má shodnou šířku a výšku dokumentu s viewportem, bez vodorovného či svislého přetečení.

**Full-view and focused comparison evidence**

- Normalizované porovnání problémového stavu vlevo a opravené 3D geometrie vpravo: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-real-walls-comparison.png` (1944 × 614 px).
- Provozní 3D dashboard již nepoužívá pracovní `cutaway` režim. Přední stěny místností i automatický obvodový plášť proto mají skutečnou uloženou výšku a jejich horní hrana není proti ostatním stěnám snížena.
- Kamera zůstává ortografická; šířka, hloubka, pozice ani otočení žádné místnosti se opravou nemění. Prostorové uspořádání tak odpovídá uloženému projektu bez perspektivního zmenšování přední či zadní řady.

**Required fidelity surfaces**

- Fonts and typography: HTML štítky sálů, velikosti písma, zalamování a provozní panel zůstaly beze změny.
- Spacing and layout rhythm: ovládání, pravý detail a spodní souhrny se neposunuly; změna se týká pouze způsobu sestavení 3D stavebního objemu.
- Colors and visual tokens: materiály, vybraný žlutý stav, modré pozadí a pohyblivá záře zůstaly zachované.
- Image quality and asset fidelity: stěny jsou dál nativní Three.js geometrie se stíny, dveřmi, futry, tablety a materiály; nebyl přidán žádný rastrový překryv.
- Copy and content: názvy sálů a živá data zůstaly beze změny.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči požadavku na skutečnou výšku a zachování půdorysu.
- [P3] Plné přední stěny záměrně zakrývají větší část interiéru při velmi nízkém úhlu kamery; půdorysný pohled a rotace zůstávají k dispozici pro kontrolu vybavení.

**Comparison history**

- Baseline P1: pracovní `cutaway` režim snižoval přední stěnu místností na 1,32 m a exponované přední části obvodového pláště na 1,28 m; zadní a boční stěny zůstávaly vysoké, takže stavební objem působil zkoseně.
- Final fix: dashboard sestavuje projekt bez `cutaway` režimu. Editor si nadále zachovává volitelný pracovní pohled s nízkými stěnami, ale tento režim již neovlivňuje provozní 3D zobrazení.

**Interaction and implementation checks**

- Ověřen návrat z detailu sálu, režim `3D dispozice`, vycentrování scény, výběr sálu a finální render při 1920 × 1200.
- Deterministický geometrický test potvrdil: přední stěny 3,25 m stejně jako ostatní stěny testovací místnosti, všechny části obvodového pláště 3,00 m a beze změny pozice `[2, 0, -4]` i půdorysu `8,4 × 6,8 m`.
- `node --check`, `npm run build` a `git diff --check` prošly bez chyb.

final result: passed

---

## 2026-09-10 — obnovené pozadí detailu sálu

- Source visual truth — nežádoucí aktuální stav: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 9.28.46.png` (3840 × 2412 px).
- Source visual truth — požadované předchozí pozadí: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 9.29.26.png` (3840 × 2414 px).
- Implementation: `http://localhost:3000/`, detail sálu `TRAUMATOLOGIE - 1`, fáze `Chirurgický výkon`.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-room-detail-background-restored-trauma.jpg` (1920 × 1207 px).
- Browser viewport: 1920 × 1207 CSS px, devicePixelRatio 1.
- Density normalization: zdroj byl zmenšen z 3840 × 2414 na 1920 × 1207; implementační snímek byl kvůli internímu měřítku snímacího nástroje oříznut na 960 × 604 a normalizován na stejných 1920 × 1207 px.

**Full-view comparison evidence**

- Reference vlevo a obnovená implementace vpravo: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-room-detail-background-comparison-trauma-final.jpg`.
- Obě strany ukazují stejný sál, stejnou fázi, tmavý černý základ, vínové světlo aktivní fáze a plynulé zhasnutí do černé u okrajů.

**Focused region comparison evidence**

- Samostatný výřez nebyl nutný: požadovanou plochou je celé pozadí a normalizované full-view porovnání jej zobrazuje v plné výšce i šířce. Typografie a ovládací prvky nebyly předmětem změny.

**Required fidelity surfaces**

- Fonts and typography: rodina písma, velikosti, váhy, řádkování a zalamování názvů fází zůstaly beze změny.
- Spacing and layout rhythm: poloha kruhové grafiky, hlavičky, postranních akcí i spodní fáze zůstala stejná; při 1280 × 800 nevzniká vodorovné ani svislé přetečení.
- Colors and visual tokens: detail znovu používá černý základ, tmavý svislý přechod a 90% okrajovou vinětaci. Modré prostorové pozadí ostatních modulů se uvnitř detailu již nevykresluje.
- Image quality and asset fidelity: pozadí je tvořeno původními nativními vrstvami aplikace bez rastrového překryvu; fázové světlo zůstává dynamické podle barvy aktivního stavu.
- Copy and content: názvy sálu, fází a všech akcí zůstaly beze změny.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči požadovanému předchozímu pozadí.
- [P3] Intenzita vínové záře se může nepatrně měnit podle aktuálně uložené barvy aktivní fáze; jde o zamýšlené provozní chování.

**Comparison history**

- Baseline P1: globální 3D podklad pronikl také do detailu sálu a vytvořil širokou modrou plochu, která změnila původní černo-vínový charakter obrazovky.
- Pass 1 P2: detail dostal samostatný tmavý přechod, ale normalizované porovnání odhalilo přetrvávající modrofialový spodní tón a slabší vinětaci.
- Final fix: obnoven čistě černý kořen, původní přechod `from-black via-black/50 to-black/80` a radiální vinětace s 90% černou na okrajích. Následné porovnání se shodným sálem a stavem odstranění modrého závoje potvrzuje.

**Interaction and implementation checks**

- Ověřen přechod z 3D dashboardu do detailu sálu a zpět, výběr `TRAUMATOLOGIE - 1` a nové otevření detailu.
- V detailu není žádná vnořená vrstva `app-module-background` ani prostorový 3D podklad.
- Browser console po finálním testu: 0 error-level položek.
- `npm run build` a `git diff --check` prošly bez chyb.

final result: passed

---

**Design QA — automatický obvodový plášť dispozice**

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 9.05.32.png`.
- Source pixels: 2652 × 1350, vložený sRGB profil, 144 dpi.
- Rendered implementation: izolovaný browser render produkčního `mountEditor` modulu se skutečnou Three.js scénou a styly aplikace.
- Implementation screenshots: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-envelope-on.png` a `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-envelope-off.png` (oba 886 × 1119).
- Browser viewport: 886 × 1119 CSS px, devicePixelRatio 2; screenshot nástroj normalizoval výstup na rozměr CSS viewportu.
- State: desktop, první patro se šesti sály a centrální chodbou, nízká přední stěna, obvodový plášť zapnutý a následně vypnutý/znovu zapnutý.

**Full-view and focused comparison evidence**

- Full-view comparison: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-envelope-comparison.png` (2567 × 920, oba vstupy normalizované na výšku 920 px).
- Focused geometry comparison: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-envelope-focused.png` (2003 × 760, reference vlevo a výřez skutečné 3D scény vpravo).
- Implementace stejně jako reference vytváří jeden čitelný stavební objem: vysoké zadní a boční obvodové stěny, sníženou přední fasádu pro čitelný interiér, souvislou horní krycí hranu, sokl a modulové spáry.
- Společné hrany sousedních místností se do vnějšího pláště negenerují. Dveřní otvory na skutečně vnější hraně zůstávají průchozí.

**Required fidelity surfaces**

- Fonts and typography: nový ovladač používá stávající editorovou typografii, 10–11px pomocný text a jasnou hierarchii `OBVOD BUDOVY` → stav → rozměry.
- Spacing and layout rhythm: ovládání je součástí formuláře patra a nepřidává nový plovoucí panel; pole výšky a tloušťky jsou ve stejné dvousloupcové mřížce jako ostatní rozměry.
- Colors and visual tokens: plášť používá studené modrošedé materiály, světlejší krycí hrany a tmavý sokl; editorový ovladač navazuje na azurové linky stávající aplikace.
- Image quality and asset fidelity: obvod je nativní Three.js geometrie, nikoli statický obrázek či překryv; při rotaci a přiblížení si zachovává perspektivu, stíny i materiál.
- Copy and content: ovladač přesně popisuje automatický obvod, jeho stav a skutečnost, že se přepočítává po přesunu, otočení i změně velikosti prostoru.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl pro požadovaný jednotný vnější obvod dispozice.
- [P3] Referenční obraz obsahuje detailnější atypické vybavení a nepravidelnější půdorys; to není součástí tohoto požadavku na obvodové stěny a stávající editor dál používá vlastní datovou dispozici.

**Comparison history**

- Baseline P1: místnosti měly vlastní stěny, ale chyběl samostatný stavební plášť sledující obrys celého patra, takže celek mohl působit jako soustava samostatných boxů.
- Fix: přidán výpočet exponovaných hran sjednocené dispozice a generátor fasády se soklem, krycí hranou, panelovými spárami a rohovými pilíři.
- Post-fix evidence: finální a zaměřený kombinovaný snímek ukazují uzavřený souvislý vnější obvod; `off` snímek potvrzuje, že jej lze samostatně odebrat.

**Interaction and build checks**

- V editoru bylo kliknutím ověřeno vypnutí i opětovné přidání obvodových stěn; stavový text skončil na `Obvodové stěny přidány`.
- Runtime `error` a `unhandledrejection` události byly během načtení a dvojího přepnutí prázdné.
- Deterministický geometrický test dvou sousedních sálů potvrdil nula vnitřních obvodových segmentů a zachované vnější dveřní otvory.
- `node --check`, `npx tsc --noEmit`, `npm run build` a `git diff --check` prošly.

final result: passed

---

## 2026-09-10 — typografie 3D dashboardu

- Source visual truth — detail sálu: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 9.17.32.png` (778 × 1130 px).
- Source visual truth — spodní souhrny: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 9.19.06.png` (3556 × 434 px).
- Implementation: `http://localhost:3000/`, dashboard v režimu `3D dispozice`, vybraný sál `PCHO SÁL Č.2`.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-type-final.jpg` (1920 × 1200 px; nástroj prohlížeče zachytil aplikaci v levé polovině obrazu při interním měřítku 0,5).
- Browser viewport: 1920 × 1200 CSS px, devicePixelRatio 1.
- State: desktop, 3D perspektiva, otevřený detail sálu, živá provozní data.

**Full-view comparison evidence**

- Celý dashboard: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-type-final.jpg`.
- Rozvržení zůstalo beze změny: panel má 338 × 647 CSS px, spodní souhrn 1752 × 198 CSS px a stránka nemá vodorovný overflow.

**Focused region comparison evidence**

- Detail sálu, reference vlevo a implementace vpravo: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-type-panel-comparison-final.jpg`.
- Spodní karty, reference vlevo a implementace vpravo: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-type-summary-comparison-final.jpg`.
- Pro detail byl zdroj i implementace normalizován na šířku 169 px; pro spodní souhrny na 876 px. Porovnání proto hodnotí typografickou hierarchii při stejné hustotě obrazu.

**Required fidelity surfaces**

- Fonts and typography: zachována rodina písma; nadpis detailu 24 px, stav 16 px, názvy metrik 13,8 px, hodnoty 27 px, doplňkové řádky 13 px a CTA 16 px. Spodní titulky mají 13 px, hlavní hodnoty 36 px a názvy sálů v programu přibližně 10 px.
- Spacing and layout rhythm: původní mřížka 2 × 2, rozměry panelu, CTA i sloupce spodního souhrnu zůstaly zachované. Na nižších výškách je detail bezpečně svisle rolovatelný místo oříznutí obsahu.
- Colors and visual tokens: barvy, kontrast, žlutá CTA i živé provozní odstíny nebyly měněny.
- Image quality and asset fidelity: změna je čistě typografická v CSS; 3D model, materiály, nasvícení a ikony zůstaly beze změny.
- Copy and content: texty, názvy sálů a živá data nebyly upraveny. Rozdíly hodnot proti referenci odpovídají aktuálním provozním datům.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči požadované čitelnosti.
- [P3] Dlouhý doplňkový text může být v nejužší kartě zkrácen elipsou; hlavní informace a hodnota zůstávají vždy viditelné.

**Comparison history**

- Baseline: názvy metrik, stav sálu, doplňkové texty a typografie spodních karet byly proti referenci příliš malé.
- Pass 1: zvětšeny hlavní hodnoty, titulky a graf programu ve spodních kartách; dorovnána základní hierarchie pravého panelu.
- Pass 2: zesílen nadpis detailu, stav, popisky a metadata; názvy metrik byly uzamčeny na jeden řádek.
- Final: ověřeno při 1920 × 1200 a 1440 × 900; panel se na kratší obrazovce neztrácí a nabízí svislý posun, bez vodorovného přetečení.

**Interaction and implementation checks**

- Ověřen výběr sálu `PCHO SÁL Č.2`; obsah pravého panelu se správně aktualizoval.
- Všechny čtyři názvy metrik zůstaly na jednom řádku.
- Browser console po finálním testu: 0 error-level položek.
- `npm run build` a `git diff --check` prošly bez chyb.

final result: passed

---

**Design QA — zjednodušená horní část 3D editoru**

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 9.03.09.png` (původní stav) a `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 9.03.50.png` (cílový styl ikon).
- Source pixels: 3554 × 426 a 524 × 132.
- Rendered implementation: izolovaný browser render produkčních stylů a skutečného `mountEditor` modulu.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-editor-icons-final.png` (886 × 1119).
- Browser viewport: 886 × 1119 CSS px, devicePixelRatio 1.
- State: desktop, 3D editor načtený s výchozí dispozicí; uložený stav reprezentuje ikona se zaškrtnutím.

**Full-view and focused comparison evidence**

- Combined comparison: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-editor-icons-comparison.png` (původní horní blok a cílová ikonová reference vlevo, finální render vpravo).
- Původní souhrnný řádek `Patra / Prostory / Vybavení / Propojené sály`, textová stavová linka i duplicitní hlavička `OR MEDROX` byly odstraněny.
- Čtyři akce `Doplnit vazby`, `Nová dispozice`, `Načíst` a `Uložit` jsou vpravo nahoře jako stejně velké ikonové ovladače s tooltipy a přístupnými názvy.
- Focused comparison nebyl potřeba samostatně: kombinovaný snímek má pouze 280 px výšky a ikonová oblast je v něm čitelná v plné velikosti.

**Required fidelity surfaces**

- Fonts and typography: nadpis modulu a editoru používá stávající typografii aplikace; z odstraněných technických bloků nezůstaly žádné nadbytečné textové popisky.
- Spacing and layout rhythm: ikonový dock používá 46 × 46 px ovladače, 8px mezery a 11px rádius; editor začíná přímo pod titulkem a získal přibližně 85 px svislé pracovní plochy.
- Colors and visual tokens: klidový stav používá tmavě modrý povrch a jemnou linku podle 3D zobrazení, neuložený stav zvýrazní ikonu uložení žlutě a uložený stav používá tlumený mentolový akcent.
- Image quality and asset fidelity: všechny ovladače používají vektorové ikony z již používané knihovny Lucide; nebyly přidány rastrové náhrady ani vlastní kreslené ikony.
- Copy and content: texty zůstávají dostupné v `aria-label` a `title`, takže odstranění viditelných popisků nesnižuje srozumitelnost ani přístupnost.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči požadavku.
- [P3] Přihlášená hlavní browser session nemá oprávnění k modulu Nastavení; finální editor proto prošel izolovaným browser renderem se stejným produkčním CSS a skutečným editorem. Databázové handlery ikon byly ověřeny strukturálně a TypeScriptem.

**Comparison history**

- Baseline P1: dvě nad sebou umístěné informační/technické lišty zabíraly velkou část výšky a používaly textová tlačítka odlišná od 3D dashboardu.
- Fix: souhrny a interní hlavička byly odstraněny; čtyři hlavní akce se přesunuly do jednotného ikonového docku u titulku.
- Post-fix evidence: finální render v kombinovaném snímku ukazuje pouze jeden titulek, jeden ikonový dock a editor začínající bez mezilehlého pruhu.

**Interaction and build checks**

- DOM obsahuje přesně čtyři ikonové akce s názvy pro asistivní technologie.
- Načtení a uložení zůstávají připojené ke stávajícím databázovým handlerům; doplnění vazeb a vytvoření nové dispozice ke stávajícím editorovým funkcím.
- Klávesové `Ctrl/Cmd+Z` a `Ctrl/Cmd+Shift+Z` zůstaly zachované i po odstranění duplicitní hlavičky.
- `node --check`, strukturální test, `npx tsc --noEmit`, `npm run build` a `git diff --check` prošly.

final result: passed

---

**Design QA — dveřní portály, vstupní tablety a prostorové transformace**

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/c9a87c58-31d8-42d8-891d-0218ecd44e69.png`.
- Detail reference crop: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-ref-door-details.png`.
- Source pixels: 1448 × 1086.
- Implementation: `http://localhost:3000/`, dashboard v režimu `3D dispozice`.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-details-final.png` (1456 × 1092).
- Browser viewport: 1456 × 1092 CSS px, devicePixelRatio 1.
- State: desktop, 3D perspektiva, vybraný sál `PCHO SÁL Č.2`.

**Comparison evidence**

- Side-by-side focused comparison: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-details-comparison-final.png` (reference vlevo, implementace vpravo).
- Dveře mají zapuštěný tmavý dvoukřídlý portál, oddělené výplně, středovou spáru, práh, světlé boční obložky a horní překlad podle reference.
- Vedle dveří je samostatný vstupní terminál se čtečkou a stavovou diodou; tablet má stěnový držák, rámeček, modré sklo, stavovou hlavičku, řádky rozhraní, žlutou diodu a spodní senzor.
- Vnitřní řady si zachovávají plnou chodbovou stěnu, takže dveře, futra a tablety zůstávají viditelné; snížená stěna se používá jen v nejbližší řadě kvůli čitelnosti interiéru.

**Required fidelity surfaces**

- Fonts and typography: beze změny.
- Spacing and layout rhythm: původní rozvržení 3D dashboardu zůstalo zachované; nové díly jsou součástí geometrie místností.
- Colors and visual tokens: dveře používají studené modrošedé výplně, futra světlejší periwinkle odstín, obrazovky sytou modrou a stavové prvky žlutou v souladu se zdrojem.
- Image quality and asset fidelity: detaily jsou nativní Three.js geometrie a materiály, nikoli plošná překryvná grafika; reagují na výběr, kameru a rotaci celé místnosti.
- Copy and content: názvy sálů a provozní data beze změny.

**Spatial editor interaction checks**

- Místnosti včetně sálu, přípravny, skladu a dalších prostor lze otáčet v přesných 90° krocích; vybavení používá jemnější 15° krok.
- Režim `Rozměry` mění šířku a hloubku prostoru přímo v ploše; inspektor poskytuje i přesné krokové změny rozměrů.
- Přichycení pracuje s mřížkou i se středy a vnějšími hranami sousedních místností, počítá s jejich rotací a zobrazuje azurové zarovnávací vodicí linky.
- Transformace zapisují polohu, rotaci, šířku a hloubku do stávajícího projektového modelu, takže se ukládají stejnou cestou jako ostatní změny dispozice.
- Deterministický test ověřil otočení přípravny na 90°, rozměr 8,25 × 5,5 m, přichycení obou os, validitu projektu a přítomnost všech dveřních i tabletových částí.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl pro požadované dveřní, futrové, tabletové a transformační funkce.
- [P3] Aktuální přihlášená browser session nemá administrační položku Nastavení, proto byl samotný editor ověřen deterministickými testy transformačního enginu a validací geometrie; finální dashboard render byl ověřen v prohlížeči.

**Comparison history**

- Baseline: dveře byly příliš ploché, bez čitelných obložek, samostatného vstupního terminálu a detailního tabletu.
- Pass 1: přidán dvoukřídlý portál, futra, práh, terminál a detail tabletu; vysoké dveřní díly však u snížených stěn působily odděleně.
- Pass 2: výška portálu se navázala na profil stěny a plná chodbová stěna zůstala u vnitřních řad.
- Final: zvýšen lokální kontrast dveří a futer, ověřena viditelnost tabletů i vybraného sálu a porovnána finální scéna se zdrojem.

**Build and validation**

- `node --check` prošel pro model, geometrii, oba viewery i editor.
- `npx tsc --noEmit`, `npm run build` a `git diff --check` prošly.

final result: passed

---

**Design QA — odstín stěn 3D dispozice**

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/c9a87c58-31d8-42d8-891d-0218ecd44e69.png`.
- Source pixels: 1448 × 1086.
- Implementation: `http://localhost:3000/`, dashboard v režimu `3D dispozice`.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-wall-tone-final.png` (1456 × 1092).
- Browser viewport: 1456 × 1092 CSS px, devicePixelRatio 1.
- State: desktop, 3D perspektiva, vybraný sál `PCHO SÁL Č.2`.
- Density normalization: oba výřezy byly převedeny na shodných 955 × 525 px.

**Comparison evidence**

- Side-by-side focused comparison: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-wall-tone-comparison-final.png` (reference vlevo, implementace vpravo).
- Konstrukční stěny nyní používají světlý studený modrošedý odstín se samostatně světlejšími horními hranami. Výsledný odstín odpovídá periwinkle/slate charakteru reference a už nepůsobí tmavě námořnicky.
- Teplé žluté zvýraznění vybraného sálu zůstalo zachováno a nebylo přebarveno společně se stěnami.

**Required fidelity surfaces**

- Fonts and typography: beze změny.
- Spacing and layout rhythm: beze změny; rozměry sálů, stěn, vybavení i ovládacích prvků zůstaly stejné.
- Colors and visual tokens: stěny `#9aa6c0`, čelní stěny `#8492ae`, konstrukční hrany `#aebbd5`; materiály mají nízkou kovovost a měkkou difuzní odezvu, aby odstín zůstal čitelný i mimo přímé světlo.
- Image quality and asset fidelity: změna je provedena v nativních Three.js materiálech, bez překryvného filtru nebo rastrového zabarvení.
- Copy and content: názvy sálů i provozní data beze změny.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl pro požadovaný odstín stěn.
- [P3] Referenční vizualizace používá odlišnou geometrii a nasvícení; tyto části nebyly předmětem této barevné úpravy.

**Comparison history**

- Baseline: stěny byly výrazně tmavší a sytěji modré než reference.
- Pass 1: konstrukční hrany byly odděleny od materiálu vybavení, aby jejich zesvětlení neovlivnilo přístroje.
- Pass 2: stěny a fasády byly posunuty do neutrálnějšího modrošedého odstínu a zesvětleny v zastíněných částech.
- Final: jemně zvýšena světlost stěn a hran; porovnání potvrzuje shodný studený modrošedý charakter bez plošného barevného filtru.

**Interaction and implementation checks**

- Ověřen výběr sálu `PCHO SÁL Č.2`; detail i žluté zvýraznění reagují správně.
- DOM po finálním testu neobsahuje chybový překryv aplikace.
- `npx tsc --noEmit`, `npm run build` a `git diff --check` prošly.

final result: passed

---

**Předchozí Design QA — prostorová záře 3D dispozice**

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-09 v 23.55.17.png`, doplněný uživatelskou anotací, že velká statická záře a její obdélníkový konec jsou nežádoucí.
- Source pixels: 3840 × 2402 (`@2x`); pro porovnání normalizováno na 1920 × 1201.
- Implementation: `http://localhost:3000/`, přihlášený dashboard v režimu `3D dispozice`.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-halo-final.png` (1920 × 1201).
- Browser viewport: 1920 × 1201 CSS px, devicePixelRatio 1.
- State: desktop, 3D perspektiva, vybraný sál `TRAUMATOLOGIE - 3`.
- Density normalization: zdroj byl zmenšen přesně na 50 %; zdrojová i implementační strana porovnání mají shodných 1920 × 1201 px.

**Full-view comparison evidence**

- Side-by-side comparison: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-halo-comparison.png` (původní stav vlevo, opravený stav vpravo).
- Původní velký modrý závoj vyplňoval téměř celou obdélníkovou plochu jeviště a vizuálně končil před souhrnnými kartami. V opraveném stavu je tato statická DOM vrstva odstraněna; podklad zůstává souvislý a model má jen měkký nízko-kontrastní lem podél vlastního obvodu.

**Focused region comparison evidence**

- Focused model comparison: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-halo-focus.png`.
- Výřez potvrzuje, že halo končí plynulým přechodem do nuly kolem siluety budovy, nikoli hranou obdélníku. Záře nepřekrývá vybavení, popisky ani pravý detail sálu.
- Alternate-camera evidence: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-halo-plan-final.png` ukazuje stejný jemný obvod po přechodu do půdorysu; efekt je součástí 3D skupiny podlaží, takže se transformuje společně s ní.

**Required fidelity surfaces**

- Fonts and typography: rodina, optické váhy, velikosti, řádkování, proklady, zalamování a kontrast textu nebyly změněny.
- Spacing and layout rhythm: rozměry jeviště, modelu, detailního panelu, ovládání a spodních souhrnů zůstaly beze změny; odstranění statických pseudo-vrstev neovlivnilo layout.
- Colors and visual tokens: halo používá tlumenou modrou `#526bc7` s maximální opacitou `0.13`; nepřidává fialový ani bílý závoj a souzní s námořnickým pozadím aplikace.
- Image quality and asset fidelity: efekt je nativní průhledný WebGL shader pod modelem, nikoli rastrový obrázek nebo oříznutý CSS gradient. SDF přechod dosáhne plné transparentnosti ještě před hranicí geometrie, takže nemůže ukázat pravoúhlý okraj.
- Copy and content: názvy sálů, provozní data i ovládací texty zůstaly nezměněné.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči požadavku.
- [P3] Softwarový renderer bez WebGL halo záměrně vynechá, aby jeho jednodušší rasterizace nevykreslila neprůhlednou plochu. Model i ovládání v tomto nouzovém režimu zůstávají funkční.

**Comparison history**

- Původní P1: dvě absolutně umístěné CSS radiální vrstvy vytvářely velkou statickou plochu, nereagovaly na kameru a jejich rozsah četl jako obdélníkový box.
- Oprava: obě pseudo-vrstvy byly odstraněny. Do skupiny podlaží byl přidán zaoblený obvodový shader s průhledností, nulovým zápisem do hloubky a úplným vyhasnutím před hranicí vlastní roviny.
- Post-fix evidence: full-view i focused comparison výše; žádná obdélníková hrana ani velký statický závoj nezůstává. Další P0/P1/P2 iterace nebyla nutná.

**Interaction and implementation checks**

- Ověřen výběr sálu `TRAUMATOLOGIE - 3`.
- Ověřen přechod `3D pohled` → `Půdorys` → `3D pohled`; halo změnilo perspektivu společně s modelem.
- Browser console po finálním testu neobsahovala error-level položky.
- `node --check`, `git diff --check` a validace `.21st/design.json` prošly.
- Produkční `npm run build` prošel včetně TypeScriptu a generování stránek.
- `21st review` pro oba změněné moduly prostorového rendereru: 0 findings.

final result: passed

---

## 2026-09-10 — barevné sjednocení carouselových karet

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 18.16.19.png` a `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 18.16.35.png`.
- Implementation: `http://localhost:3000/`, modul `Nastavení systému`, carousel modulů.
- Viewport: ověření bylo spuštěno v in-app prohlížeči; chráněný stav carouselu nebyl bez administrátorské relace dostupný.
- State: přihlašovací obrazovka bez dostupného zdravotnického zařízení.

**Findings**

- Zdrojové snímky potvrzují příliš černý spodní tón aktivních i vzdálených karet.
- Implementace nahrazuje černé výplně transparentní námořnickou modří, zachovává fialový akcent aktivního modulu a používá modře tónovaný stín.
- Vizuální post-fix snímek chráněného carouselu nelze bez aktivní administrátorské relace bezpečně pořídit.

**Required fidelity surfaces**

- Fonts and typography: beze změny.
- Spacing and layout rhythm: rozměry, perspektiva, pozice a animace karet jsou beze změny.
- Colors and visual tokens: upraveny pouze výplně a stíny carouselových karet.
- Image quality and asset fidelity: carousel neobsahuje rastrové obrazové prvky; ikony zůstaly beze změny.
- Copy and content: beze změny.

**Implementation checks**

- `git diff --check` a produkční `npm run build` včetně TypeScriptu prošly.
- Browser console chráněného carouselu nebylo možné zkontrolovat, protože test skončil na přihlášení.

final result: blocked

---

## 2026-09-10 — věrnost 3D operačních sálů referenčnímu renderu

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/c9a87c58-31d8-42d8-891d-0218ecd44e69.png`.
- Source comparison crop: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-reference-crop.png` (1280 × 720 px).
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-final-preview.png` (1280 × 720 px).
- Implementation: izolovaný náhled stejného `DashboardViewer`, stejného modelového stromu, materiálů a světel jako produkční 3D dispozice.
- State: šest operačních sálů, mírně natočená ortografická kamera, architektonický řez, aktivní `PCHO 2`, načtené GLB vybavení.
- Density normalization: zdrojový výřez i implementace byly porovnány v přesně shodném rastru 1280 × 720 px.

**Full-view comparison evidence**

- Kamera má shodný izometrický charakter bez perspektivního sbíhání; mírně nižší elevace odpovídá referenci a ponechává čitelné dveře, čelní stěny i interiér.
- Studený modrošedý stavební plášť, tmavé spáry panelů, podlahová mřížka a měkké pozadí odpovídají charakteru zdroje.
- Aktivní sál používá samostatné teplé lokální světlo a netonemapované žluté světelné linky. Ostatní sály zůstávají studené a neutrální.

**Focused region comparison evidence**

- Vybavení již není pouze nízkopolygonová procedurální náhrada: renderer asynchronně načítá všech 12 dodaných GLB modelů (`table`, `light`, `anesthesia`, `monitor`, `cabinet`, `trolley`, `wallScreen`, `tablet`, `sink`, `bed`, `stool`, `pendant`).
- GLB materiály mají studený kovový tón, environmentální odraz, emisivní čočky operačních světel a emisivní obrazovky. Pod podlahovým vybavením je jemná eliptická kontaktní stínová vrstva.
- Dveřní portály, obložky, křídla, prahy, čtečky a tablety zůstávají samostatné geometrické prvky a vrhají/přijímají stíny.

**Required fidelity surfaces**

- Fonts and typography: popisky sálů zůstaly beze změny; aktivní popisek používá žlutou zdroje.
- Spacing and layout rhythm: půdorysné rozměry a pozice místností se nemění; architektonický řez ovlivňuje pouze viditelnost stěny směrem ke kameře.
- Colors and visual tokens: sníženo přepalování globálním světlem; teplé světlo je omezené na aktivní sál, neutrální stěny zůstávají studeně modrošedé.
- Image quality and asset fidelity: používají se binární modely z dodaného `orms-spatial-editor-v0.2.2.zip`, PBR prostředí, ACES tonemapping, sRGB výstup a 2048px PCF stíny.
- Copy and content: názvy, provozní stav ani datové vazby nebyly změněny.

**Findings and capability boundary**

- [P2] Zdrojový PNG je hotový prerender s jemnější autorskou geometrií a obrazovými materiálovými mapami. Dodané GLB soubory tuto úroveň detailu ani bitmapové textury/normal mapy neobsahují; přesná pixelová shoda proto vyžaduje původní 3D scénu nebo kvalitnější texturované modely. Implementace nyní používá nejdetailnější dostupné zdrojové assety namísto aproximací.
- Nezůstává regresní P0/P1 rozdíl v načítání, barevném řízení stavu, ovládání kamery ani výběru sálu.

**Interaction and implementation checks**

- Loader čeká na skutečné GLB požadavky a hlásí jejich průběh místo předčasného skrytí.
- Při chybě jednoho souboru zůstává pro daný kus bezpečný procedurální fallback.
- Stejná GLB hydratační vrstva je zapojena v dashboardu i prostorovém editoru.
- Produkční `npm run build` včetně TypeScriptu a generování všech 29 stránek prošel.

final result: passed within supplied-asset fidelity; source-asset boundary documented

---

## 2026-09-13 — referenční sál `pcho-3.glb`

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/pcho-3.glb`.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-pcho3-reference-model.png` (1440 × 900 px).
- Implementation: stejný `DashboardViewer` a šest sálů demo dispozice, přičemž každý operační sál používá sdílenou instanci nového referenčního modelu.
- State: prostorový pohled, aktivní `PCHO 2`, červená živá fáze, zapnuté teplé provozní světlo.

**Asset inspection**

- Rozměry zdroje: 7,030 × 6,825 × 3,090 m; souřadný systém Y-up a počátek ve středu podlahy odpovídají internímu modelu aplikace.
- Model obsahuje 71 samostatných meshů a členění Architecture, VideoManagement, Table, Anaesthesia, SurgicalLights, CeilingBooms, Furniture, FloorDetails, MedicalServices a MedicalAccessories.
- Tři vložené PNG textury jsou zachovány jako sRGB base-color a emissive mapy displejů.

**Required fidelity surfaces**

- Geometry: procedurální obálka a samostatné jednoduché vybavení jsou po načtení nahrazeny kompletním referenčním sálem; model se škáluje pouze podle uložené šířky, hloubky a výšky místnosti.
- Materials: autorské PBR barvy, metalness, roughness, průhlednost a obrazové textury zůstávají zachovány. Stěnové materiály mají samostatný klon pro živé stavové zabarvení.
- Lighting: globální studené světlo, aktivní teplé světlo a žlutá obvodová linka zůstávají funkční; všechny části modelu vrhají i přijímají stíny.
- Interaction: výběr sálu funguje přes celý vložený model, protože referenční scéna zůstává potomkem původní interaktivní skupiny místnosti.
- Performance: geometrie a neměnné materiály se mezi sály sdílejí; jeden 2MB GLB nahrazuje dvanáct samostatných požadavků na vybavení. Procedurální scéna zůstává fallbackem při chybě souboru.

**Findings**

- Předchozí [P2] omezení chybějící kvalitní zdrojové geometrie je tímto GLB odstraněno.
- Nezůstává P0/P1/P2 odchylka v geometrii nebo texturách vůči dodanému modelu; stavové zabarvení je záměrná funkční vrstva aplikace.

**Implementation checks**

- `node --check` prošel pro loader referenčního sálu, geometrii a dashboard viewer.
- `git diff --check` prošel.
- Produkční `npm run build` včetně TypeScriptu a všech 29 stránek prošel.

final result: passed
