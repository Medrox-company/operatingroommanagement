# Rozpis operativy — příprava integrace, 24. 10. 2026

Uživatel zvolil **přípravu integrace bez změn databáze**. Toto je místní plánovací návrh nad skutečnými čtenými podklady, nikoli zapnutá obousměrná synchronizace nebo publikace do provozu.

## Zdroj a umístění

- Zdroj: https://github.com/Medrox-company/rozpis-operativy
- Aktuální převzatá verze: **33**, commit `6806453ee5ba663a02dfa42d10fe5dbf9ea31492` z 24. 10. 2026.
- Ověřený upstream HTML blob: `9341a6191a8a4f2473eddb5fda15544240787df6` (869 750 bajtů); shodu souboru ověřuje test.
- Převzatý soubor je uložen jako neprováděný text `public/planning/operativity-source.txt`. Samotný veřejný soubor neobsahuje data této aplikace.
- Cesta v aplikaci: **Nastavení → Rozpis sálů → Rozpis operativy**. Původní editor zůstává na záložce **Společný rozpis sálů**.
- Hlavní aplikační menu zůstává vlevo, vzhledově sladěné s původním projektem. Jeho pořadí, oprávnění a handlery se nemění. Nemocniční workflow barvy zůstávají autoritativní.

## Datové napojení

### Aktualizace 28 → 33

Převzat přesný nový upstream, včetně světlého 3D vzhledu, více budov v editoru, tras sanitky, heliportů a spojovacích chodeb. Zachované nativní levé menu, kompaktní záhlaví, původní adresář podlaží a samostatná mapa **Areál Liberec**. Nová upstream mapa je dostupná přes **Model sálů a editor → Mapa Liberec · v33**; jde výslovně o orientační Liberec, nikoli automatickou mapu právě přihlášené nemocnice.

Místní návrhy zůstávají ve stejném klíči/formátu v2, včetně upraveného půdorysu. Nové `blds`, `amb`, `heli`, `links` a transportní parametry se zachovávají při obnově návrhu. Upstream migrace přidávající ukázkové G1/G2 je vypnutá i při importu/obnovení starší verze. Výchozí přidávání demonstračního pavilonu, lůžek a heliportu je vypnuté. Nové budovy a cesty lze vytvořit ručně pouze jako místní model.

Automatické přiřazování skutečných sálů k pavilonům pomocí regulárního výrazu nad zkratkou není ověřené, proto je zakázané. Upstream mapa neukazuje nulové/domnělé živé kapacity a čeká na půdorysy a explicitní mapování ID. Při skrytí rámce se zastaví oba renderery, včetně nové mapy, a obnoví se pouze právě viditelný. Bez změny databáze, oprávnění, runtime závislostí nebo síťových povolení rámce.

Oba renderery používají společný úplný veřejný adresář: 82 podlaží a 325 položek pracovišť. Zkrácené upstream seznamy a neověřené počty operačních sálů jsou při adaptaci nahrazené; orientační geometrie zůstává oddělená od skutečné kapacity.

Ověření aktualizace: 106 cílených testů plánování/navigace, typová kontrola a produkční Next sestavení prošly. Testy zahrnují přesný upstream blob, parsování adaptéru, zachování návrhů v33, úplnost společného adresáře, ochranu skutečné evidence a pozastavení/obnovu obou rendererů. 21st review: 0 nálezů; vyhledávání katalogu nebylo dostupné, použity stávající komponenty a originální zdroj. V autentizované aplikaci ověřen přehled s 15 skutečnými sály, zachovaná upravená mapa, původní nativní adresář a nový WebGL pohled Liberec ve světlém tématu. Bez klinických akcí či nasazení; fyzické mobilní zařízení nebylo testováno.

`OperativityPlanningWorkspace` používá stávající autentizovaný GET `/api/room-specialty-allocations` pro dva zvolené kalendářní roky. GET byl rozšířen o stabilní stránkování `offset`/`nextOffset`, protože výchozí limit 1000 řádků není úplný roční rozpis. PUT/PATCH se nezměnily.

`lib/operativity-planning.ts` převádí skutečné sály, názvy a barvy oborů, AM/PM přiřazení, uzavření/servis a týdenní pracovní dobu. Identita nemocnice je aktuálně jedno pracoviště plánovače; skutečná další pracoviště se nevymýšlejí. Do vloženého rozhraní se neposílají pacienti, historie výkonů, zprávy, přihlašovací údaje ani jmenovité obsazení personálu. Oprávnění se přebírají z hostitelské aplikace; návrh upravuje administrátor, další oprávněné role jej čtou.

`lib/operativity-frame.ts` upravuje připnutou verzi HTML před spuštěním v iframe s neprůhledným původem. Bez `allow-same-origin`, bez přístupu k síti, API, cookies či rodičovskému DOM. Komunikace kontroluje okno rámce, protokol a náhodný identifikátor instance. Neexistuje zápisový most. Původní ukázkové rozpisy se nespouštějí; evidence sálů/oborů je pro čtení.

## Jednotné rozhraní

Na výslovné přání uživatele nemá plánovač druhé levé menu ani vnější okno. Hostitelská aplikace vykresluje horní navigaci **Provoz / Plánování / Přehledy / Správa** a pod ní příslušné podsekce. Nabídka vychází z povolených pohledů plánovače; samotné příkazy znovu kontrolují jeho oprávnění. Aktivní sekce se synchronizuje i při navigaci uvnitř obsahu.

Obsah používá celou pracovní šířku a průhledné pozadí společné aplikace. Přirozená výška se měří podle hlavního obsahu, takže svisle se posouvá pouze rodičovská stránka. Horní nabídka zůstává dostupná při posouvání; změna sekce vrátí obsah k jejímu začátku. Dialogy, datum a další překryvné prvky respektují viditelnou oblast pod horní nabídkou. Technická bezpečnostní izolace rámce zůstává zachovaná; nejde o nové samostatné okno aplikace.

Aktuální výslovná korekce uživatele zachovává původní světlou/tmavou paletu a typografii projektu Rozpis operativy. Nativní horní nabídka i hlavní levé menu ji přebírají, bez druhého levého menu. Volba vzhledu se ukládá odděleně jako `medrox-operativity-appearance:v1`; dočasný atribut `data-operativity-design` sladí pozadí a menu jen při otevřeném plánovači. Skutečné barvy oborů/statusů, klinické handlery ani režim místního pracovního návrhu se nemění.

## Obnovené původní 3D

Na žádost uživatele je opět dostupné **Provoz → Operační sály 3D**, včetně původního rendereru, editoru plánu, vzdáleností/transportu, podlaží, kamer, toku pacientů a režimů Emergency/Hygiena. Nejde o náhradu odděleného klinického prostorového modulu hostitelské aplikace.

Three.js r128 a původní postprocessing jsou lokálně připnuté v `public/planning/vendor/`; původ, MIT licence a kontrolní součty jsou v manifestu a README. Hostitel ověřuje SHA-256 souboru `three-r128-runtime.txt` před vložením. Skript se spouští až po ověřené inicializaci rámce. Nepovolují se externí CDN, síť, další oprávnění iframe ani databázové zápisy.

Pro nemocnici bez místní mapy se v původním rendereru vytvoří výslovně **modelové rozvržení** se skutečnými ID/názvy všech aktivních sálů. Uložené `D.map` se nepřepisuje. Jde o schematické rozmístění, nikoli skutečný půdorys. Příprava/výkon/úklid jsou simulace původního plánovače nad plánem a pracovní dobou, nikoli živý stav; transportní časy jsou modelové odhady. Toto upozornění je viditelné v modulu i při rozšířeném zobrazení. Simulace respektuje nepracovní dny a půldenní omezení. Výška scény a rozšířený režim jsou omezené viditelnou oblastí pod společnou navigací.

Ověření obnoveného 3D a vzhledu: 68 cílených testů, TypeScript a produkční Next sestavení prošly. Testy kontrolují také hash/licenci a skutečné konstruktory lokálního rendereru, původní paletu, neprůhledný bezpečnostní původ a escapování názvů oborů při zachování jejich ID. V autentizovaném prohlížeči s 15 sály byl ověřen skutečně vykreslený WebGL model, editor bez ukládání změn, transportní tabulka, kamery/celá budova, modelový hygienický pohled a rozšířené zobrazení s dostupným levým i horním menu. Světlý/tmavý motiv se synchronizuje včetně pozadí; explicitní `color-scheme` rámce brání bílému vnitřnímu oknu při světlém motivu. Mobilní Vite sestavení prošlo se stávajícími upozorněními na velikost balíků a smíšený statický/dynamický import přihlašovacího pomocníka. Fyzické iOS/Android zařízení nebylo znovu testováno. Bez klinických akcí, migrace, commitu či nasazení.

## Aktualizace zdroje na verzi 28

Převzata nová sekce **Plánování → Návrh obsazení**, požadavky oborů omezené na konkrétní sály nebo jejich počet, roční časová osa po týdnech, podrobné mapy obsazenosti a nové personální přehledy. Zdrojový repozitář nepřinesl nová skutečná nemocniční data; sály, obory a uložená přiřazení stále pocházejí z autentizované aplikace.

Formát návrhu zůstává `v:2`, klíč úložiště se nemění a staré místní úpravy se neruší. Nové vazby náhrad `links` a odložené návrhy `planSkip` se ukládají a obnovují s kontrolou sálů, oborů, data a půldne; osiřelé vazby zůstávají k ruční kontrole. Nové rozsahy požadavků zachovávají pouze skutečné ID sálů. Roční přehled a nové statistiky i návrhy náhrad respektují převzatou pracovní dobu a půldenní uzávěry.

Nové vyhledávání zůstává dostupné nahoře, vlastní výběrové nabídky se vejdou pod pevnou navigaci a přechod z ročního přehledu do týdne posouvá společnou stránku. Přepínání oprávnění a mutace evidence zůstávají zablokované. Původní 3D a bezpečné přepínání vzhledu byly následně obnoveny podle výslovné korekce výše. Databázové schéma ani zápisové API se touto aktualizací nemění.

Ověření aktualizace: 48 cílených testů, TypeScript, produkční Next sestavení i Vite mobilní sestavení do dočasné složky prošly. Vite nadále upozorňuje na velikost některých balíků a kombinovaný statický/dynamický import přihlašovacího pomocníka mimo plánovací modul. V autentizované aplikaci s 15 skutečnými sály byla zkontrolována nová sekce Návrh obsazení, roční přehled, otevření konkrétního týdne a vyhledávací výběr oboru včetně zavření klávesou Escape. Nebyly odeslány požadavky ani klinické změny. Mobilní rozhraní nebylo při této aktualizaci fyzicky testováno na zařízení.

## Místní návrhy a omezení

- Návrh má klíč `medrox-operativity-draft:v2:<nemocnice>:<uživatel>:<počáteční rok>` v localStorage. Nejde o sdílené ani zálohované úložiště.
- Nové načtení zachová uložený pracovní plán. Pro nový návrh ze současných podkladů slouží potvrzované **Zrušit místní úpravy**.
- **Stáhnout návrh** exportuje JSON kompatibilní s importem téhož plánovače. Import kontroluje nemocnici, období a ID sálů/oborů; autoritativní názvy a barvy obnovuje hostitel.
- Pojmenované verze, historie změn a nastavení pohledu uvnitř rámce trvají jen do jeho zavření. Je to uvedeno v rozhraní i přímo v sekci Verze a záloha.
- Zveřejnění uvnitř převzatého projektu je místní model, nikoli publikace do společného provozu. Žádné migrace ani databázové zápisy nebyly součástí integrace.
- CA/LA, personální normativy, čekací listiny a kvóty jsou místní modelové vstupy; aktuální aplikace je pro tento modul neposkytuje. Nuly personálu nejsou skutečné počty zaměstnanců.
- AM/PM se dělí v poledne, případně u krátké směny jejím středem. Přestávky nejsou v tomto půldenním modelu odečteny. Chybějící pracovní doba používá označený výchozí předpoklad.

## Ověření a další vývoj

- 2026-10-24, úplný adresář a procházení podlaží: `lib/liberec-campus-directory.ts` obsahuje všech 25 zveřejněných detailů oficiální mapy KNL. Z toho 23 budov/objektů má 82 podlaží a 325 položek pracovišť (včetně zdrojových opakování); parkování a stavba jsou dva informační odkazy. HTML seznam byl porovnán s veřejným JSON indexem stránky bez neshod. K existujícím 22 obrysům je připojeno 76 podlaží / 319 položek u 21 budov; PD podle oficiálního skriptu odkazuje na informace o parkování, nikoli na fiktivní patra. V a HELIPORT zůstávají dostupné v adresáři bez vymyšlené geometrie. Dřívější částečný výběr A/B/D/G je tímto nahrazen.
- Kliknutí na budovu otevírá rozložená podlaží, výběr patra jeho samostatný schematický plášť a úplný seznam pracovišť. Přesné názvy podlaží, prázdné položky a duplicity zdroje zůstávají zachované. Suterén R je v modelu pod přízemím i přes sestupné pořadí ve zdroji. Vyhledávání najde pracoviště napříč budovami, kamera se přizpůsobuje i portrétnímu poměru stran. Označení přímo v UI upozorňuje, že opakovaný obrys střechy a rozestupy podlaží nejsou zaměřený půdorys. Není zde klinická navigace, pacienti, aktuální kapacity ani automatické přiřazení skutečných sálů.
- **Podklady pro lůžka a sály čekají na uživatele:** uživatel výslovně zvolil „Dodám půdorysy a počty“. `lib/liberec-campus-equipment.ts` připravuje původní modrošedou grafiku lůžka, operačního stolu se světly/anesteziologickým a instrumentačním vybavením a neutrálního pracoviště. Tyto továrny nejsou do scény areálu zapojené a nepředstavují skutečné počty. Pro osazení je nutné dodat označení budovy a patra, půdorys (ideálně s měřítkem), počty a rozmístění lůžek/sálů; případné vazby na klinická ID se musí ověřit zvlášť. Původní **Model sálů a editor** je stále dostupný a jeho uložené rozvržení se nemění.
- Ověření adresáře/podlaží: 102 cílených plánovacích a navigačních testů, typová kontrola a produkční Next sestavení prošly. Jedno opakované sestavení se v sandboxu zastavilo bez diagnostiky; byl ukončen pouze tento ověřovací proces a opakování mimo sandbox úspěšně dokončeno, bez restartu aplikace. Testy zahrnují úplnost adresáře, původní obrysy, suterény R/B, kameru na šířku i na výšku, žádné vymyšlené interiéry a uvolnění prostředků. V autentizovaném prohlížeči ověřen přechod areál/budova/patro, centrální sály A, úplný dlouhý seznam B, hledání bez výsledků i napříč budovami, adresář V bez geometrie, pohled shora/3D a klávesnicový návrat fokusu. Nové ovládání vizuálně ověřeno ve světlém okolním tématu s tmavou scénou; fyzický mobil nebyl testován. 21st review: žádné chyby ani varování, 12 informací k původní pevné paletě. Bez databázových změn, nasazení nebo commitu.
- 2026-10-24, vizuální korekce areálu: na výslovné přání vrácen grafický jazyk původního `m3` — tmavé sklo, modré obrysy s jemným bloomem, tmavé základy, bodové pozadí a průsvitné štítky. Scéna zůstává tmavá i ve světlém tématu okolní aplikace. Vybraný pavilon má světlý obrys; tato barva není klinický status. Překrývající se štítky se při oddálení skryjí, všech 22 budov zůstává v seznamu. Geometrie, veřejná podlaží, původní editor a místní plán se nemění. Vykreslování zůstává pouze při změně, hustota pixelů je omezená na 1,5 a při odchodu se uvolní geometrie, materiály i postprocessing. Prošlo 81 testů, typová kontrola a produkční sestavení; v prohlížeči ověřeno 3D, pohled shora, hledání, výběr/podlaží, návrat do původního modelu a světlé/tmavé rozhraní. 21st bez chyb/varování, pouze informace k převzaté pevné paletě. Fyzické mobilní zařízení nebylo testováno.
- 2026-10-24: **Areál Liberec** je nový výchozí pohled sekce Operační sály 3D. Obsahuje 22 budov a terénní polygony odvozené z [oficiální mapy KNL](https://www.nemlib.cz/mapa/), SVG `map-lib-v21.svg`. Geometrie představuje obrysy střech orientační mapy, nikoli zaměřené půdorysy; výšky jsou ilustrační. U A/B/D/G je výběr veřejně uvedených podlaží a pracovišť. Mapa nabízí otáčení, zoom, pohled shora, hledání a alternativní seznam bez WebGL. Není navigací pro klinické přesuny, aktuálním adresářem ani živým stavem sálů. Skutečné sály se k pavilonům automaticky nepřiřazují; další propojení potřebuje ověřené půdorysy a výslovné mapování ID. Zdroj a omezení jsou i přímo v UI a `lib/liberec-campus.ts`.
- Původní 3D zůstává pod **Model sálů a editor**, včetně místního plánu. Při zobrazení areálu se původní animace pozastaví přes ověřený prezentační most a při návratu obnoví. Nová mapa nemá API, síťové požadavky ani zápis do databáze; vykresluje se pouze při změně kamery/velikosti/výběru a při opuštění uvolní WebGL prostředky. Ověřeno 76 plánovacími a navigačními testy, typovou kontrolou, produkčním Next sestavením a v prohlížeči výběrem budovy/podlaží, hledáním podle oddělení, pohledem shora a návratem do původního 3D modelu. Zkontrolován světlý i tmavý vzhled. Fyzické mobilní zařízení nebylo testováno.

- 2026-10-24: Kompaktní záhlaví – přepínač rozpisu, období a načtení podkladů sdílejí horní lištu; export, reset a živý přehled jsou pod „Více“. Lokální/modelový charakter zůstává viditelný. Název podmodulu, roky a původní akce jsou v jedné responzivní řádce; na úzkých displejích se zalomí. Původní snapshot zůstává nedotčený, úprava je v adaptéru. Ověřena typová kontrola, 58 testů a zobrazení přehledu i 3D sálů.

Aktuální korekce navigace podle snímků uživatele (24. 10. 2026, 8:40–8:41): mimo rozpis jsou hlavní ikony opět rovnoměrně rozložené po výšce transparentního panelu. Aktivní plánovač nahradí hlavní nabídku vlastním menu: rozbalené 300 px / ikonové 96 px, značka RO, nemocnice, hledání, oprávněními omezené rychlé akce, původní pořadí sekcí a skutečné počty upozornění. Pevný návrat do nastavení je dostupný i uživateli bez přístupu k dashboardu. Rozšíření odsazení obsahu je omezené na desktop a aktivní rozbalené menu. Bridge dovoluje pouze cmd/bulk/newReq, ověřuje kanál i oprávnění původního projektu; nevytváří nové databázové operace. Typová kontrola a 57 cílených testů prošly.

Aktualizace navigace 24. 10. 2026: na přání uživatele je hlavní levý panel transparentní bez oddělovacích linek. Na desktopu se nabídka rozpisu vykresluje React portálem přímo do tohoto panelu, pod hlavními moduly. Obsahuje všechny povolené sekce ve čtyřech skupinách a samostatně se posouvá; při opuštění rozpisu se odstraní. Pod 768 px zůstává horní navigace. Výpočet viditelného prostoru 3D rámce levý panel nepovažuje za horní překážku. Ověřeno typovou kontrolou, 56 cílenými testy a v prohlížeči přechodem do 3D a odchodem z modulu.

Testy `tests/planning/` pokrývají přenos dat, stránkování, oddělení nemocnic, filtraci klinických dat, import, půldenní uzávěry a nepracovní dny. Dále se kontroluje typování, Next sestavení a Vite sestavení do dočasné složky. V prohlížeči byl ověřen skutečný rozpis, editace místního návrhu, jeho opětovné načtení a dostupnost původního editoru.

Po sjednocení rozhraní prošlo 41 plánovacích a souvisejících testů, typová kontrola a produkční Next sestavení. V autentizované aplikaci se skutečnými 15 sály byla ověřena horní navigace, časová osa, plánovací podsekce, přehledy, společné posouvání a boční editor otevřený z odrolované stránky bez uložení změn. Dialog i jeho zavírání zůstaly pod pevnou navigací. Testy navíc ověřují povolené pohledy, cizí zprávy/kanály a bezpečné rozměry rámce.

Pro zapnutí společného plánování je nutné samostatně navrhnout a schválit datový model pro návrhy/verze, serverová oprávnění, řešení souběžných změn a explicitní publikování do existujících přiřazení. Do té doby nepřidávat do rámce síťová oprávnění ani odesílání klinických akcí.
