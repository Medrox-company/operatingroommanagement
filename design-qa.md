## 2026-10-08 — Oprava hlášeného selhání startu akutního cyklu

- Skutečná tabulka workflow_statuses obsahuje accent_color, nikoli color. Nová start RPC nesprávně vybírala coalesce(accent_color,color), takže se před klinickým UPDATE vracela PostgreSQL chyba 42703 skrytá bezpečnou API zprávou. Předchozí syntetické testovací schéma mělo vymyšlený sloupec color a tuto chybu neodhalilo; nyní odstraněn.
- Opravná CLI migrace 20261008195723_fix_acute_cycle_workflow_color.sql nahrazuje výhradně tento lookup existujícím accent_color. Statický test potvrzuje shodu veškeré ostatní start transakce a grantů. Izolovaný PostgreSQL nejprve reprodukuje původní selhání bez změny verze/fáze/vazeb a následně ověřuje opravený skutečný start, barvu z nastavení, idempotenci, souběh, izolaci a dokončení. API a obrazovky se nemění.
- Oprava nainstalována do skutečně nakonfigurovaného projektu. Read-only dotazy potvrdily nový lookup, SECURITY INVOKER, execute pouze pro service_role a existující nastavenou barvu Příjezd na sál. Sál č. 7 zůstal připraven a vazby před klinickým použitím prázdné; žádné skutečné potvrzení příjezdu ani jiná klinická změna nebyla testována.
- Nezávislá kontrola ověřila ostatní odkazované sloupce, práva a pořadí triggerů bez dalšího zjištěného blokátoru. Poradce neuvádí nový problém opravené funkce; předchozí nesouvisející upozornění se v tomto úzkém fixu nemění. Pro server-only tabulky je absence klientských RLS policies záměrná při odebraných grantech.

---

## 2026-10-08 — Trvalé přiřazení akutního požadavku ke skutečnému cyklu

- Otevření požadavku zůstává navigační; až výslovně potvrzený přechod připraven → příjezd volá atomickou serverovou RPC se skutečným sálem a očekávanou revizí. Start, autentizační a tenantové kontroly i neměnná vazba jsou jedna transakce. Chyba nevytvoří náhradní běžný cyklus, dvojí potvrzení nevytvoří dva. Změna zařízení/účtu nedovolí promítnout pozdě vrácený výsledek do nového rozsahu. Detail ověřuje výsledek před resetem časovače a pomocnými zápisy.
- Dokončení doplní interní trigger podle skutečného operation_end při standardním návratu do připravené fáze, včetně úklidu na jiné stanici. V běžném dokončeném bloku Timeline malý neutrální glass popisek #N · Akutní · výkon s bodem urgence. Text v úzkém bloku se zkrátí, délka/phase colors/click celého cyklu se nemění. Mobil zachovává všechny sály, kompaktní označení a úplný přístupný popis. Již přiřazený požadavek se neopakuje jako odhad. Pořadník se automaticky neuzavírá. Dosavadní nouzový/uzamčený overlay zůstává beze změny.
- Použity zásady 21st: existující tokeny, schválený průsvitný room ribbon, žádná nová závislost nebo animace. React kontrola: úplné memo dependencies, stabilní refresh callback, oddělené SWR klíče podle tenant/user/role/okna, cleanup a debouncing realtime. Samostatná neměnná DB vazba není odvozena z názvu, odhadu, nejbližšího času ani omezeného queue snapshotu.
- 155/155 automatických regresí prošlo (celý akutní modul, mobilní layout a standardní Timeline řádek), TypeScript a whitespace check čisté. Skutečný izolovaný PostgreSQL ověřuje CAS, souběh, idempotenci, tenant/role/membership/module checks, skutečný start/konec, rollback při chybějícím záznamu, neměnné snapshoty, obě nepřípustné půlky konce a načtení 205 dokončených cyklů. Následná kontrola 8/8 backend testů reprodukuje zděděné Supabase granty a ověřuje jejich zúžení. Kontrola 21st nového hooku/popisku/CSS/ribbonu bez nálezů; starší globální review zjištění se plošně nepřepisují.
- Obě additive migrace instalovány do projektu odpovídajícího lokální konfiguraci. Read-only SQL potvrzuje RLS, nulové vazby před klinickým použitím, klientům nepřístupné tabulky/RPC, service SELECT/INSERT bez UPDATE/DELETE a správné pořadí triggerů. Reset s existujícími vazbami je před zápisem zablokovaný. QA nevytvořilo žádný skutečný klinický požadavek, nepostoupilo fázi a neuzavřelo cyklus.
- Browser 1543 × 1109: existující PŘEVAZ VAC otevře skutečný SÁL Č. 4 a při již rozběhnutém chirurgickém výkonu poctivě ukazuje „Vybráno pro další cyklus“ / „Přiřazení při dalším příjezdu pacienta“. Zavření vrací stejnou Timeline a fokus na původní odhad. Evidence `output/acute-qa/acute-cycle-next-selection.jpg`. Vizuální důkaz dokončeného skutečného akutního cyklu v živé DB se zde netvrdí: nebyl klinicky proveden při QA a starší cykly se zpětně nevymýšlejí. Dokončení a render označení jsou ověřené izolovanými DB a skutečnými komponentovými testy. Žádný commit nebo nasazení aplikace.

---

## 2026-10-08 — Sjednocení akutní lišty s grafikou detailu sálu

- Na výslovnou korekci uživatele odstraněn odmítnutý samostatný modrý panel, jeho obrys/blur/stín i vnitřní barevná plocha vybraného požadavku. Lišta je nyní přímo na původním fázovém plátně. Podle pravidel 21st znovu použity skutečné vizuální parametry okolních akcí detailu: neutrální přibližně 5% bílá průsvitná plocha, jemný 10% obrys a 16px rohy. Vybraný nadpis má lehčí 20–26px sazbu; další názvy 15px, podpůrné texty 11–12px. Barvy urgence zůstávají v textu/bodech, bez dekorativní záře. Mezi sousedními ovládacími prvky pouze jemná linka.
- Změněn jen lokální CSS module a regresní design test; komponenta, data, pořadí, názvy sálů, focus, navigace, fáze i klinické handlery beze změny. Mobil používá skutečné m-card/m-border tokeny, názvy i footer se mohou zalomit a horizontální seznam zůstává přístupný. Reuse místních prvků bez generování, nové závislosti nebo exportu projektového kontextu do katalogu.
- TypeScript, whitespace check a 53/53 cílených testů kontextu/ribbonu/navigace/Timeline/integrace/mobilního layoutu prošly. Lokální 21st review ribbonu a CSS: 2 soubory, 0 nálezů. Nový kontrakt hlídá transparentní borderless shell, neutrální glass ovládání shodné s detailem, větší text a wrap footeru; všechny dosavadní kontrakty kontextu/navigace zůstávají. Nezávislá read-only kontrola potvrdila scope, equal-height flex položky, wrap footer a viditelný focus bez požadavku další opravy.
- Skutečná přihlášená aplikace 1543 × 1109: lišta x=128, y=160–290.3, středový kruh začíná y=373.0 (82.7px odstup). Vnější background rgba(0,0,0,0), border 0px; oba viditelné ovládací prvky 256 × 90.3px, bílá výplň alpha .04745, nadpisy 15px a žádný textový overflow. Evidence `output/acute-qa/acute-room-queue-style-aligned.jpg`. QA otevřelo pouze existující APPE; žádné klinické tlačítko, submit nebo změna skutečných dat. Menší viewport se zde vizuálně netvrdí; mobile/short-layout fallback zůstává z předchozí implementace.

---

## 2026-10-08 — Akutní požadavek otevírá detail sálu s přehledem fronty

- Barevný požadavek v desktopové i mobilní Timeline otevírá stávající RoomDetail při zachování namountované časové osy a jejího časového okna. Kontext používá stejný tenant-scoped SWR zdroj; filtruje aktivní požadavky a následující řadí dle aktuálního provozního pořadí. Guard hlídá zařízení, účet, zapnutý modul i obě oprávnění; ukončený, přeřazený nebo nedostupný požadavek se nezobrazuje jako stále platný.
- 21st: pod názvem sálu jemný glass ribbon, vybraný výkon vlevo a horizontální dráha dalších požadavků s aktuálním pořadím, urgencí, skutečným názvem sálu a odhadem. Původní číslo zápisu je od provozního pořadí výslovně odlišené. Žádné vymyšlené začátky, nová animace či závislost. Normální detail z dashboardu má původní rozložení; jen akutní vstup rezervuje místo nad kruhy. Mobilní kontext je ve svislém toku s přístupným overflow fallbackem.
- React kontrola vedla k zachování SWR, immutable řazení, úplným memo závislostem a aktualizaci memo comparatoru detailu. Podklad je při otevřeném detailu inert; fokus míří na neklinické zavření, nikoli na fázi, a vrací se na skutečný opener. Doplněn focus-visible obrys středového tlačítka. Samotné otevření/přepnutí nezapisuje stav, nezačíná operaci a nepředstírá trvalé DB propojení požadavku s cyklem.
- TypeScript prošel; 42/42 kontextových, ribbon, Timeline, integračních a mobilních layout testů, navíc 10/10 kontraktů navigace. Lokální 21st review nového ribbonu a CSS: 0 nálezů. Širší review převážně uvádí dosavadní lokální barvy/motion; nalezený chybějící focus středového tlačítka byl opraven. Žádné plošné automatické přepisování okolního UI.
- Skutečná přihlášená aplikace, 1543 × 1109: otevření existujícího APPE ukazuje jeho kontext a následující PŘEVAZ VAC v SÁL Č. 4, přepnutí funguje a již existující fáze Příjezd na sál zůstává beze změny. Později přidaný uživatelův URS se promítl do fronty; kliknutí otevřelo skutečný SÁL Č. 7 ve stávající fázi Sál připraven bez posunu cyklu. Heading končí y=111.5; ribbon y=160–272.6; středový kruh y=373–835.9; časové ovládání y=843.9–921.5; rail y=1051.5–1077: bez překryvu. Zavření vrací stejnou Timeline a původní požadavek. Evidence `output/acute-qa/acute-room-queue-detail.jpg` nyní obsahuje oba následující požadavky. Browser nereflektoval dočasný menší viewport (override resetován), proto se zde netvrdí nové mobilní/tabletové vizuální ověření.
- QA pouze navigovalo již existující uživatelovy požadavky, pořadí a záznamy nebyly měněné ani vracené. Žádný vlastní klinický submit, migrace, commit nebo nasazení.

---

## 2026-10-08 — Pořadí zápisu akutního požadavku v Timeline

- Zachován schválený vzhled dle 21st: 28px drobný štítek `#N` v levém podbarveném popisku, stejné číslo uvnitř odhadového bloku, čitelný popis Pořadí při zápisu v tooltipu/aria-label. Úzký 30min blok ponechá číslo i délku; šířka odhadu a 44px řádek se nemění. Mobilní štítek je kompaktní a používá současné textové tokeny pro dark/light.
- Číslo je původní pozice z neměnného create auditu, nikdy aktuální ručně změněný queuePosition ani index viditelných řádků. Server používá nedávný audit bez dalšího dotazu; chybějící starší create načte tenant-scoped a indexovaným request_id filtrem po 100 ID. Neověřený údaj zůstává null/—. Volitelná chyba čtení neoznačí již potvrzené uložení za neúspěch. Supabase/postgres skill vedl k minimálnímu výběru sloupců, dávkám a zachování serverového ověření zařízení; bez migrace, zápisu do DB nebo nového oprávnění.
- TypeScript, whitespace a 21st review (2 soubory, 0 nálezů) prošly. Cílené testy zahrnují původní číslo po přeřazení, GET/POST, doplnění staršího auditu, 100/100/5 dávky, scope, invalid/missing data, chybu optional read, desktop/mobile SSR, ořez bez přečíslování a všechny předchozí UI/layout/mobilní regresní kontrakty.
- Skutečný localhost zobrazuje původní čísla #1/#2/#3. Všechny tři popisky i názvy bez overflow, bloky 43px v 44px řádcích; šířky 61.94/123.88/30.97 px a čísla uvnitř krátkého i dlouhého bloku bez overflow. Evidence `output/acute-qa/timeline-entry-order.jpg`. Pouze čtení již existujících dat přes aplikaci; žádný vlastní klinický submit, změna pořadí, commit či nasazení.

---

## 2026-10-08 — Barevný popisek a plná výška akutního odhadu v Timeline

- Levý popisek má jemný přechod 13 → 5 % v barvě urgence, tenkou boční linku a neutrální světlé písmo místo drobného barevného textu. Emergentní rose, urgentní zelená, časný sky-blue odpovídají schváleným kartám. Odhadový blok má čistý solid obrys a jemný přechod bez šrafování; track se natahuje přes celý původní 44px řádek, blok má 43px po odečtení spodního oddělovače. Změna pouze vzhledu a vysvětlujícího textu, ne časů nebo klinických záznamů.
- Container queries zachovávají reálnou šířku odhadu: krátký blok ukáže číslo, delší odhad + minuty a dostatečně široký i název. Úplné informace zůstávají v levém sloupci, tooltipu a aria-label. Zachován focus, oddělené překrývající se požadavky, mobilní tmavé/světlé textové tokeny a všechny skutečné sály.
- 68/68 cílených akutních a mobilních regresních testů, TypeScript a 21st review (2 soubory, 0 nálezů). Nové kontrakty palety, čitelného textu, plné výšky, absence šrafování a nezvětšování délky. Použity současné komponenty/tokeny dle 21st, bez závislostí či odesílání kontextu do katalogu.
- V přihlášené skutečné aplikaci na localhost ověřeny všechny tři urgence: výška bloků 43px ve 44px řádcích, šířky 60/120/30 minut = 61.94/123.88/30.97 px, neutrální text rgba(255,255,255,.95), jemný barevný label a solid obrys. Screenshot `output/acute-qa/timeline-request-styling.jpg`. Pouze čtení DOM a screenshot již existujících uživatelových požadavků; žádné uložení, migrace, commit nebo nasazení.

---

## 2026-10-08 — Akutní požadavek na ose v čase zadání

- Čárkované aktivní požadavky v desktopové i mobilní Timeline jsou od serverového `receivedAt`, ne od nepovinného `proposedStartAt`. Odhad končí po uloženém počtu minut (nová volba nad 60 = 120 min). Editace, změna pořadí a současný čas nemění okamžik zadání. Žádná změna záznamů, migrace či automatické rezervace. Akutní modul používá tutéž bázi v záložce Časová osa; ruční začátek již neskrývá nový požadavek. Souhrn nepřiřazených počítá chybějící sál, ne chybějící navržený čas.
- Reuse 21st: současné čárkované průhledné řádky s 44px targetem, stávající tokeny, ovládání a text zadání/odhadu. React Best Practices: bez nového fetch/effect, zachované SWR a memo dependencies, immutable filtered sorting, stabilní request keys, nezanořená klávesnicově přístupná tlačítka. 21st review: 34 nálezů, 33 informačních barev a jeden stávající warning hover-scale v nesouvisejícím filtru Timeline; bez automatického přepisování okolního UI.
- 47/47 cílených UI/layout/palette/integration/timeline testů a dalších 19/19 mobilních layout/accessibility regresí, TypeScript i diff whitespace check prošly. Null navržený čas se správně zobrazí; legacy plánovaný začátek ignorován pro pozici bloku; přesné sekundy/ms/timezone, změna pořadí/updatedAt, ořez okna, 120min projekce, mobilní zobrazení všech 15 sálů a module/error gating. Žádný zásah do skutečných cyklů, capacity inputs či statistik.
- Skutečný localhost obsahoval uživatelem zadané APPE požadavky 17:18/60 min pro PCHO SÁL Č.2 a 17:32/120 min pro SÁL Č.4. Oba viditelné v Timeline ve správném časovém sloupci (desktop block widths 61.94/123.88 px, poměr 1:2) a v časovém seznamu akutního modulu. QA pouze navigace a DOM/screenshot; žádný vlastní POST nebo změna těchto požadavků. Evidence `output/acute-qa/timeline-request-receipt.jpg`.

---

## 2026-10-08 — Volba nad 60 minut používá odhad 120 minut

- Na výslovnou korekci uživatele odstraněno pole přesného času. Více než 60 min při výběru nastavuje 120 minut; formulář transparentně uvádí plánovací odhad, nikoli skutečně naměřený čas. Do 30/60 min a vzhled dle 21st zůstávají stejné. Bez nových komponent nebo závislostí. Starší záznamy se hromadně nemění; editace bez změny volby zachovává evidovaný odhad. Nové formuláře používají 120 i při obnově vývoje s rozpracovanou starší volbou.
- 46 cílených testů: nový integrační kontrakt vede volbu přes skutečný převod intake do skutečné projekce Timeline a potvrzuje dvě hodiny / 50 % čtyřhodinového okna. Zůstává označení Návrh — nepotvrzeno, korektní ořez okna, bez vymyšleného začátku a bez zásahu do skutečných operačních cyklů. TypeScript a whitespace check; 21st review jen 75 informačních poznámek stávajících barev.
- Skutečný localhost: přepnutí Do 30 min → Více než 60 min ukazuje 30 → 120 min, dialog má nula spinbutton/číselných vstupů. Evidence `output/acute-qa/duration-over60-120.jpg`. QA bez uložení klinického požadavku, bez migrace, commitu nebo nasazení. Toto rozhodnutí nahrazuje níže popsané zadávání přesného odhadu nad 60 min.

---

## 2026-10-08 — Široký a zjednodušený formulář akutního výkonu

- Create/edit má vlastní `acute-dialog-intake` šířku max. 1320px a dva sloupce. Vlevo název + odhad, skutečný seznam sálů a popis; vpravo plně popsané ikonové priority a případné emergentní upozornění. Editace řadí popis a důvod vedle sebe, zrušení návrhu sálu sdílí řádek s vysvětlením. Ostatní detail/reorder popupy zůstaly ve stávajícím Timeline shellu a původních rozměrech.
- Na žádost uživatele odstraněny ovládací prvky interní reference, klinického rozhodnutí i celého termínu/návrhu času. Nové požadavky mají tyto údaje prázdné/null; editace drží přesné původní hodnoty včetně sekund, milisekund a timezone. Zrušení sálu odstraní i jeho navržený čas stejně jako dříve. Zachované role, required priority, privacy upozornění a audit reason; žádná migrace nebo vlastní testovací submit.
- Browser na skutečném localhost:3000 s 15 nastavenými sály: create v 1280 × 720 včetně emergentního upozornění nemá vertikální ani horizontální overflow; editace včetně důvodu a emergentního upozornění v 1024 × 720 má body clientHeight = scrollHeight = 582px a panel 976 × 666px. Edit v 1920 × 1080 rovněž bez overflow. Finální create v 1543 × 1109 má body clientHeight = scrollHeight = 572px a všech 15 voleb. Tlačítka jsou v každém těchto stavů uvnitř viewportu. Dočasný viewport resetován. Extrémně malá obrazovka/zoom/velké počty sálů mají přístupný scroll fallback, ne skryté informace.
- Evidence: `output/acute-qa/landscape-intake-final.jpg`, `landscape-intake-1280.jpg`, `landscape-edit-1024.jpg`. Testování používalo otevření a změnu lokálního draftu, ne vlastní uložení; uživatel současně pracoval se skutečnou frontou, jeho změny nebyly vraceny.
- 43/43 cílených UI/layout/integration/palette/timeline testů, TypeScript a diff whitespace check prošly. Přidány kontrakty odstranění polí, prázdných nových hodnot, přesného zachování starších hodnot a vlastního landscape layoutu. `21st review`: 75 informačních poznámek stávající palety, bez warning/error. Reuse Radix, Lucide a skutečného Timeline stylu; bez externího exportu projektového kontextu, závislostí, commitu nebo nasazení.

---

## 2026-10-08 — Korekce: pouze nastavené sály ze skutečné aplikace

- Na výslovnou opravu uživatele odstraněny všechny vlastní převody názvů na zkratky a rozlišovací čísla. Boxy zobrazují přesný `room.name`; radio hodnotou je nezměněné ID. `App` předává tentýž hospital-scoped seznam do Akutních výkonů a přes SettingsPage do OperatingRoomsManager. Výběr kopíruje jeho uložené pořadí `sort_order`, bez mutace seznamu nebo konfigurace.
- Full labels se zalamují v kompaktních 136px širokých boxech, bez truncation. Zůstává nativní radio, required, disabled, focus outline, fajfka a stávající Timeline paleta. Žádný nový fetch, efekt, závislost nebo změna oprávnění.
- Odstraněn vymyšlený seznam 13 sálů z izolovaného QA na portu 4189. Offline náhled bez zdroje nepředstírá konfiguraci zařízení; nabízí odkaz na skutečnou aplikaci. Syntetické požadavky zůstávají pouze v tomto jasně označeném offline QA, ne v databázi.
- Browser ověření proběhlo ve skutečné přihlášené aplikaci na localhost:3000: všech 15 aktuálně nastavených sálů, včetně jediného sdíleného ORL - ÚČOCH - OČNÍ. Výběr PCHO SÁL Č.2 ukázal jeho skutečné ID `room-11` a nastavený popis CÉVNÍ, DĚTSKÉ, MAMMO; žádná konverze na CHIR 2. Žádný požadavek se neuložil. Evidence: `output/acute-qa/configured-room-options.jpg`.
- 41/41 cílených UI/design/integration/timeline testů a TypeScript prošly. Nový kontrakt hlídá společný zdroj, uložené pořadí, přesné dlouhé/duplicitní názvy a absenci fiktivních preview sálů. `21st review`: pouze 75 informačních připomínek stávající lokální palety. Žádná změna klinických dat, commit nebo nasazení.

---

## 2026-10-08 — Kompaktní výběr operačního sálu (historie, odvozené zkratky níže nahrazeny korekcí výše)

- Volný text „Operační obor“ a druhý select navrženého sálu nahrazené jednou přehlednou, zalamující se řadou letter-icon boxů. Zkratky se odvozují pouze z předaných aktuálních sálů; full name je v aria-label, tooltipu a v popisu zvoleného sálu. Sdílené sály (např. ORL / ÚČOCH / OČNÍ) jsou jedna skutečná volba, nikoli tři fiktivní místnosti; duplicitní zkratky se rozliší číslem. Žádná změna konfigurace ani identity sálů.
- Explicitní výběr atomicky doplní skutečný `proposedRoomId` a nastavený department (při chybějícím departmentu plný název sálu). Nový požadavek vyžaduje sál; starý požadavek bez návrhu není automaticky přiřazen podle oboru. Edit zachovává původní údaje a dovoluje zrušit návrh včetně navrženého času. Chybějící sál a prázdná konfigurace mají vysvětlení; nová tvorba bez sálů je disabled. Výběr je stále návrh, nikoli rezervace.
- Browser: skutečné produkční komponenty s izolovaným lokálním controllerem. Kliknutí TRA 1, ArrowRight → TRA 3, jediná checked hodnota, focus outline, aktualizovaný plný název a zpřístupněný návrh času. Uložení syntetického testu URO/45 min/urgent → karta Urologie + SÁL Č. 7 → editace zachovává URO. Bez sítě a databáze; reload odstraní jen lokální fixture změnu. Produkční klinická data zůstávají beze změny.
- Vizuální evidence: `output/acute-qa/room-icon-options.jpg`, viewport 1395 × 1109, malé volby 68–90 × 60 px ve dvou řádcích, bez vodorovného přetečení. Desktop, responsive wrap a 8px Timeline-style surfaces; žádné nové animace nebo dependency. Mobilní CSS wrap zůstává přístupný, nové mobilní vizuální ověření se netvrdí.
- 40/40 cílených UI/design/integration/timeline testů a TypeScript prošly; čtyři nové testy pokrývají reálné IDs, zkratky, zachování departmentu, edit/empty/missing stavy, required/focus a geometrii. `21st review`: pouze 75 informačních připomínek lokálních barev; zachované tokeny a nativní radio primitives. React kontrola: bez nového efektu, fetch nebo hook větvení; aktualizace draftu je funkcionální. Žádný commit nebo nasazení.

---

## 2026-10-08 — Velké ikony klinické naléhavosti

- Výběr naléhavosti v produkčním formuláři create/edit nyní používá tři velké grafické volby s existujícími Lucide ikonami Siren / Timer / CalendarClock. Zachovaná schválená červenorůžová / zelená / modrá paleta a Timeline popup. Název, klinický popis a fajfka doplňují barvu; žádné klinické termíny ani automatické priority nepřibyly.
- Nativní povinné radio inputs nejsou odstraněné z accessibility tree: nový formulář nemá předvolenou hodnotu, editace zachovává enum a busy/read-only fieldset je disabled. Browser ověřil kliknutí emergent → upozornění, ArrowRight → urgent → upozornění zmizí, jedinou checked hodnotu, required validity a viditelný focus outline. Testování bez uložení a bez databáze.
- Evidence: `output/acute-qa/urgency-icon-options.jpg`, skutečný formulář s izolovaným controllerem, viewport 1395 × 1109, volby 235 × 172 px, bez horizontálního přetečení těla. Mobilní CSS skládá volby pod sebe s 96px minimálním cílem a světlými semantic colors; nové vizuální ověření mobilního viewportu se v tomto průchodu netvrdí.
- 29/29 cílených UI/integration/design testů a `npx tsc --noEmit` prošly. Dva nové SSR testy pokrývají tři explicitní enumy, prázdnou výchozí volbu, popisy, edit checked, disabled a focus/mobile CSS. `21st review` bez error/warning, pouze 75 informativních připomínek lokálních barev. Nový katalogový komponent není třeba; opakovaný export kontextu do 21st se po dřívějším bezpečnostním zamítnutí neprováděl. Žádná nová závislost, commit nebo nasazení.

---

## 2026-10-08 — Kruhová akce v prázdném přehledu akutních výkonů

- Prázdná záložka Požadavky používá menší statický protějšek soustředných kruhů detailu sálu: 180–240 px podle šířky, jemný modrý obrys/záře a transparentní střed s textem „Nový požadavek“. Původní neutrální empty card a nesouvisející popisek ručního pořadí jsou v tomto stavu nahrazené otevřeným plátnem; hlavička ani ostatní stavy se nemění.
- Kruh používá společné otevření stávajícího formuláře a skutečný opener pro návrat fokusu. Browser ověřil Enter → formulář → Escape → fokus na kruhu. Žádný požadavek se při této kontrole neuložil. Read-only větev má neinteraktivní grafiku „Bez požadavků“, busy větev disabled button; loading/error ani neprázdná fronta kruh nevykreslují.
- Evidence: `output/acute-qa/empty-orb-desktop.jpg`, skutečné komponenty s izolovaným prázdným controllerem, 1395 × 1109 px; kruh 240 × 240 px, bez vodorovného přetečení. V tomto průchodu browser nereflektoval požadovaný mobilní viewport override a dál hlásil 1395 × 1109 px, proto se netvrdí nové vizuální ověření telefonu. Override byl resetován; CSS dál používá fluidní 180–240px velikost.
- 27/27 cílených testů a TypeScript prošly. Dva nové SSR testy pokrývají empty/readonly/busy/loading/error/populated stavy. `21st review` pouze informativní připomínky lokální palety. Klinická data, oprávnění, priorita i společné popupy jsou beze změny.

---

## 2026-10-08 — Popupy Timeline a zarovnání Akutních výkonů

- Formulář nového požadavku / editace, detail a úprava pořadí nyní sdílejí skutečné `timeline-popup-overlay`, `timeline-popup-panel`, `timeline-popup-header`, `timeline-popup-close` a detailové `timeline-popup-metric`, nikoli jejich vlastní podobný motiv. Vnější roh 12 px, jemný blue-violet podklad a rozostřené pozadí odpovídají Timeline; form controls mají 8px rohy. Radix a všechny klinické/data handlery zůstaly zachované.
- Odstraněný vnitřní limit 1600 px opravuje přesun nadpisu na širokých monitorech. Akutní výkony přebírají existující `app-module-content` a `app-module-page-header`; při 2880 × 1200 mají sdílený content, modul i heading x = 284 px, šířku 2400 px a top = 40 px. Žádné přepisování globálního pozadí ani menu; priority zůstávají červenorůžová / zelená / světlemodrá.
- Prohlížeč: skutečné produkční komponenty v izolovaném QA bez databázových volání. Ověřeno vytvoření (pouze otevření), detail, přechod detail → edit → detail a změna pořadí (pouze otevření). Escape vrací fokus na skutečný opener; Shift+Tab z close cyklí na submit uvnitř dialogu. Nic se neukládalo ani neposílalo.
- Rozměry popupů: 1024 × 768 → 780 × 720 px; 390 × 844 → 366 × 820 px; 320 × 568 → 296 × 544 px; 640 × 360 → 608 × 336 px. Všechny zůstávají ve viewportu bez vodorovného přetečení, tělo roluje a hlavička s close zůstává viditelná. Světlý mobilní popup má pozadí #edf3fc a tmavé texty; nevztahuje se na barevnost celého QA canvasu. Dočasný viewport byl resetován.
- Evidence: `output/acute-qa/timeline-aligned-page.jpg`, `timeline-form-desktop.jpg`, `timeline-detail-desktop.jpg`, `timeline-reorder-desktop.jpg`, `timeline-form-mobile-dark.jpg` a `timeline-form-mobile-light.jpg`.
- 25/25 cílených UI/integration/CSS testů, TypeScript bez chyb. Pět nových kontraktů hlídá použití sdílených popup tříd, oddělené posouvání, společnou hlavičku, přístupné form controls a světlou mobilní větev. `21st review`: žádné error/warning, 67 informativních připomínek k lokálním barvám; React kontrola nenašla změny hooků, asynchronních toků ani novou závislost. Finální QA konzole bez warning/error. Commit, nasazení ani zapnutí modulu nebyly požadovány.

---

## 2026-10-08 — Barevné přechody akutních karet podle naléhavosti

- Následná korekce uživatele: urgentní mění jantarovou na zelenou (tmavý smaragdový přechod, světlý mint podklad; označení a obrys rovněž zelené). Emergentní i časný zůstávají beze změny. Aktualizovaný kontrakt palety a všech 20 cílených testů prošly; render ověřen na aktuální desktopové šířce 1167 px bez horizontálního přetečení. Evidence: `output/acute-qa/priority-green-desktop.jpg`. Níže je historie původního průchodu s jantarovou variantou.
- Uživatelem vyžádaná úprava původního schváleného návrhu: emergentní červenorůžový, urgentní jantarový a časný světlemodrý přechod. Pouze `.acute-card` a její části; globální podklad, geometrie, klinické výpočty, dialogy a data se nemění.
- Dva jemné gradienty přecházejí do průsvitného podkladu společného s patičkou. Konkávní výřez zůstává transparentní; obrys a kruhová šipka přebírají barvu skutečné naléhavosti, nikoli ručního pořadí či čekání.
- Browser evidence: `output/acute-qa/priority-gradients-desktop.jpg` (1586 × 992), `priority-gradients-mobile-dark.jpg` a `priority-gradients-mobile-light.jpg` (390 × 844). Skutečné produkční komponenty s lokálními syntetickými daty na `http://127.0.0.1:4189/`; žádná databázová volání.
- Drobné popisky byly po kontrole gradientu zesvětleny. Kontrola sousedních podkladových pixelů a vypočtených textových barev na desktopu: nejnižší z 10 zaznamenaných vzorků 4,97:1. Světlé karty: ověřené reference 4,66–4,68:1 a emergentní označení po ztmavení 5,38:1. Jde o lokální vzorky, ne tvrzení o kompletním WCAG auditu celé aplikace.
- Rozvržení ověřeno při 1586 × 992, 1024 × 768 a 390 × 844; při 320 × 568 s dlouhými texty žádný prvek modulu nepřekročil vodorovné hranice. Izolovaný QA canvas je stále navy i při `theme=light`; ověřena světlá větev karet, nikoli správnost mobilního motivu celé aplikace. Stávající kontrast hlavičky na takovém QA podkladu je mimo tuto scoped úpravu.
- 20/20 cílených UI/integration/CSS testů prošlo. Šest nových kontraktů pokrývá prioritu, gradienty, průsvitnost, transparentní kapsu, světlý motiv, reduced motion a scoped selektory. `21st review`: bez error/warning, pouze informativní návrhy převodu lokální palety na společné tokeny; `git diff --check` čistý. Nová závislost, commit, produkční nasazení ani zapnutí modulu nebyly provedeny.

---

## 2026-10-08 — Akutní výkony, implementace schváleného návrhu

### Podklady a rozsah

- Source visual truth: `/Users/jaroslavjedlicka/.codex/generated_images/01a020bb-6261-7152-8eaa-49ba81b1cac8/exec-6fd2b21e-96a3-46ed-b4ad-45b2bed42dde.png`, 1586 × 992 px; poslední uživatelem schválený návrh.
- Browser-rendered implementation: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/output/acute-qa/desktop-final.jpg`, 1586 × 992 px, CSS viewport 1586 × 992, DPR 1. Oba obrazy byly otevřeny společně v jednom porovnání v původním rozlišení; bez změny poměru stran nebo hustoty.
- Vizuální kontrola: `http://127.0.0.1:4189/?mode=default`, skutečné produkční komponenty s odděleným lokálním controllerem. Čtyři syntetické požadavky, pevný čas 7. 10. 2026 14:50, tmavý motiv, záložka Požadavky. Spodní QA lišta a ukázková navigace nejsou produkční funkcionalita.
- Reálná aplikace na `http://localhost:3000/` byla otevřena a zobrazuje dashboard i Nastavení. V cestě postranní Nastavení → karta Nastavení → Správa modulů je skutečná karta Akutní výkony, vypnutý přepínač a výslovná informace o vypnutí i pro superadministrátora. Ve všech třech propojených zařízeních modul zůstává vypnutý; nebylo provedeno skutečné přijetí požadavku ani změna klinického programu.

### Findings a historie oprav

- [P2, vyřešeno] Patičky první implementace měly proti předloze příliš drobné údaje a podstatně méně čitelný důvod změny pořadí. Evidence: `output/acute-qa/desktop-first.jpg`. Oprava: hlavní text 14 px, doplňující text 12 px, zalamování bez ořezu. Finální společné porovnání potvrzuje čitelnou dvojici údajů o sálu a auditu.
- [P2, vyřešeno] První pravý spodní roh karty tvořil vypouklou kapsu namísto konkávního výřezu. Oprava skutečných CSS povrchů zachovává volné místo pro kruhovou šipku a návaznost horního i spodního obrysu. Evidence: `output/acute-qa/desktop-final.jpg`; žádné nové rastrové nebo SVG ilustrace.
- [P2, vyřešeno] Řízený Radix dialog bez Trigger po Escape ztrácel původní klávesový fokus. Oprava ukládá skutečný spouštěcí button, vrací fokus při zavření a použije aktivní záložku, pokud karta zmizela. Přechod detail → edit → detail nepřetahuje fokus do pozadí. Ověřeno v prohlížeči i regresním testem.
- Po opravách nezůstává akční P0/P1/P2 v rozsahu schváleného vzhledu a ověřených stavů modulu.

### Pět povinných ploch fidelity

- **Fonts/typography:** zachována rodina a sdílený `ModulePageHeading` aplikace (`Segoe UI`, Inter, Helvetica Neue, Arial fallback). Nadpis 51 px, názvy karet 26 px, tabulární čísla 42 px; patičky 14/12 px. Předloha nemá fontový zdroj, proto se netvrdí pixelová identita řezu. Větší optická váha existující aplikace je přijatá integrace, ne nově zavedený font. Dlouhé názvy, reference i obory se zalamují bez skrytí.
- **Spacing/layout rhythm:** dva sloupce, 18px mezera, oblý obrys s výřezem a samostatnou šipkou. Finální desktopové karty mají šířku 700 px a výšku 340/330 px; x = 128/846, y = 262/620. Zdrojové x ≈ 147/835 je záměrně přizpůsobeno stávajícímu odsazení aplikace 128 px a jejímu menu. Sousední patičky drží společnou spodní hranu i při delších údajích.
- **Colors/tokens:** původní globální tmavomodrý podklad nebyl přepisován. Modré průsvitné karty, tenké světlé hrany a tlumené děliče; priorita používá růžovou, jantarovou a světlemodrou tečku i text, takže informace není pouze barevná. Na malých displejích se respektuje existující světlý/tmavý motiv aplikace.
- **Image quality/assets:** obrazový návrh neobsahuje vlastní ilustraci ani produktový obrázek k implementaci. Žádné náhradní dekorativní obrázky nebyly vloženy. Ovládání používá existující Lucide ikony a skutečné CSS karty. Kruhová šipka zůstává ostrá a její prostor nezasahuje do textů.
- **Copy/content:** zachované názvy záložek, ruční pořadí, časy, naléhavost a viditelná změna pořadí. Doplněn skutečný autor auditu a explicitní „Návrh — nepotvrzeno“. Nepodložené tvrzení „čeká na tým“ není automaticky odvozované z převzetí; skutečný popis je v detailu. Uzavření požadavku není označeno jako dokončená operace.

Full-view porovnání ověřilo kompozici, hustotu a všechny čtyři karty. Zaměřená kontrola ze stejného společného vstupu v původním rozlišení ověřila patičku Repozice (staré/nové pořadí, čas, důvod, autor), výřez a šipku i hranice metrik. Texty jsou při této hustotě přímo čitelné; další ořez nebyl potřebný. Samostatný formulář/detail byly zachyceny v `output/acute-qa/detail.jpg` a `output/acute-qa/mobile-form.jpg`; předloha tyto stavy nespecifikuje, byly posouzeny jako navazující funkční UI.

### Responsivita, interakce a ověření

- 1586 × 992: dvě karty 700 px, scrollWidth = 1586. 1024 × 768: dvě karty 419 px, patička přechází na svislé řádky, scrollWidth = 1024 (`output/acute-qa/tablet-1024.jpg`).
- 390 × 844: jeden sloupec 358 px, scrollWidth = 390 (`output/acute-qa/mobile-390.jpg`). Formulář 366 × 820 px je uvnitř viewportu, obsah roluje, pole a tlačítka mají alespoň 44 px.
- 320 × 568 s dlouhými názvy, referencemi a oborem: karty 288 px, scrollWidth = 320, žádný prvek modulu nepřekračuje vodorovné hranice (`output/acute-qa/narrow-long-320.jpg`). Všechny karty zůstávají dostupné svislým posouváním.
- Prohlížeč: syntetické zadání, převzetí, úprava odhadu s důvodem, přeuspořádání s auditem, uzavření, zrušení, historie a návrh zařazení. Ověřeny prázdný/chybový stav, režim pouze čtení bez mutačních tlačítek, šipkové ovládání záložek, Escape, návrat na opener i fallback po zmizení karty. Klinická naléhavost se posunutím pořadí nezměnila.
- Konzole izolovaného náhledu: 0 error/warn záznamů při finální kontrole. Tato věta není tvrzením o veškeré historické konzoli celé aplikace.
- Automatické ověření: **92/92 testů**, 0 selhání a 0 přeskočených; včetně izolovaného skutečného PostgreSQL, souběhu, auditu, tenantů, SWR při přepnutí zařízení, klinických cyklů timeline a mobilní navigace. TypeScript a `git diff --check` bez chyb.
- Databázová instalace je ověřená samostatně v `docs/acute-requests.md`. Vzdálené nemocniční záznamy nebyly použity k zápisovým UI testům; zapnutí modulu, živý klinický pracovní postup a produkční nasazení nejsou touto kontrolou prohlášeny za otestované. Mobilní světlý motiv a jiné než uvedené viewporty nebyly v tomto průchodu vizuálně ověřeny.

### Implementation checklist a follow-up

- [x] Funkční vzhled a čitelné priority podle schváleného návrhu; původní navigace/podklad zachovány.
- [x] Požadavky, pořadí, historie a nepotvrzené timeline návrhy připojeny k ověřenému API; žádné úpravy skutečných cyklů/statistik.
- [x] Databázové schéma instalované, všechny konfigurace zařízení vypnuté.
- [x] Desktop/tablet/telefon, dlouhé texty a klávesové ovládání ověřeny.
- [ ] Provozní správce zvolí zařízení/role a explicitně modul zapne. Produkční nasazení nebylo požadováno.
- [P3] Případné další ladění přesného řezu fontu může navázat na skutečný fontový zdroj předlohy; stávající aplikace je záměrně nepřefontována.

final result: passed

---

> Úklid 2026-09-14: obrazové výstupy kontrol nejsou součástí verzovaného projektu ani nasazení. Starší snímky byly odstraněny z pracovní kopie; posledních sedm snímků zarovnání a fidelity zůstává pouze lokálně jako ignorované soubory. Všechny historické obrazové podklady z tohoto protokolu lze obnovit z Git commitu `a37d0c662dab7147b6fbc6d0fa9662824bffd461`.

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

---

## 2026-09-15 — mobilní aplikace podle `apka.jpg`

### Podklad a rozsah

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/apka.jpg`.
- Implementovány skutečné komponenty `DashboardModule`, `MobileRoomOverview`, `SpatialDashboardView`, `RoomDetail` a `MobileNav`, nikoli statická maketa.
- Rozsah: telefonní přehled sálů, 3D/půdorys, vybraný sál, detail a navigace ve světlém a tmavém režimu. Desktopový dashboard a desktopová větev detailu zachovány.
- Izolovaný lokální náhled: `/private/tmp/orm-mobile-qa-4EjNBg`, port 4174. Autentizace a data nahrazeny explicitními ukázkovými záznamy; žádné zápisy do provozní databáze. Fixture není součástí aplikace.

### Vizuální porovnání

- Šest snímků implementace v 390 × 844 px: `/private/tmp/orm-mobile-final-qa/{dashboard,spatial,detail}-{light,dark}.png`.
- Společný obraz předlohy a všech šesti implementovaných obrazovek: `/private/tmp/orm-mobile-final-qa/source-comparison.png`. Porovnáno jako jeden obraz, se zachováním poměrů stran a čitelnými popisy zdroje/implementace.
- Trvalý náhled mimo Git: `/Users/jaroslavjedlicka/.codex/visualizations/2026/08/20/01a020bb-6261-7152-8eaa-49ba81b1cac8/mobile-implemented-preview.png`.
- Typografie: kompaktní nadpisy, jemné pomocné texty, výrazné číselné hodnoty; velké desktopové prvky se do telefonu nepřenášejí.
- Rozestupy: jednotné boční odsazení, jemné 12–16px zaoblení, 2 sloupce časů a akcí, pevná spodní navigace. Na nízkém telefonu je obsah detailu vnitřně posuvný a primární akce zůstává viditelná.
- Barvy: světlé ledově modré plochy / tmavé námořnické plochy, jemné hranice, žluté primární akce, skutečné konfigurované barvy fází bez log na kartách.
- 3D asset fidelity: stávající GLB, geometrie, materiály, osvětlení a prostorové vazby nebyly kvůli mobilnímu návrhu změněny; pouze ovládací vrstva, rozměry panelů a kompaktní štítky.
- Záměrné rozdíly: žádný falešný rámeček telefonu ani systémový status bar; názvy a počty odpovídají skutečným datům, nikoli číslům v maketě. Skutečný workflow může mít více než pět fází a lze jím vodorovně posouvat. Aktuální fáze se při změně dostane do zorného pole. Požadované Volat, Příjezd a ±15 min jsou nad rámec původního obrázku. Rozměry skutečné dispozice zůstávají zachovány, proto model nemá v každé nemocnici stejný poměr stran jako kresba.

### Opravy během kontroly

- Odstraněn průnik tmavého pozadí do světlého 3D pohledu.
- Doplněna mobilní hlavička a stav načítání pro uložený 3D pohled, zatímco se načítají sály.
- Zmenšeny 3D štítky a skryty nevybrané popisky nepropojených pomocných místností, aby nepřekrývaly sály.
- Odstraněno dvojité spodní odsazení; mobilní kořen používá dynamickou výšku viewportu.
- Více zachovává autorizované položky i odhlášení; nativní Back zavírá otevřený navigační panel.
- Počáteční chyby GLB blob textur a dvojího React kořene pocházely z CSP/HMR izolované fixture. Opraveny jen ve fixture; po úplném načtení nebyly nové chyby ani varování v konzoli.

### Funkční a regresní ověření

- Prohlížeč: 390 × 844 světlý/tmavý, 360 × 640 detail s dostupnými akcemi bez vodorovného přetékání, 430 × 932 3D bez vodorovného přetékání, 1440 × 900 zachovaný desktop.
- Vyzkoušeno hledání + filtr připravených sálů; otevření detailu; výběr místnosti v 3D i půdorysu; přechod z panelu do detailu.
- Vyzkoušeno +15/−15 minut se správnou změnou času; pauza/pokračování; hygienický režim; Volat a následné potvrzení příjezdu; potvrzovací dialog další fáze; výběr ARO lékaře. Ověřeny callbacky a události na ukázkových datech.
- `node --test tests/*/*.test.js`: 194/194 úspěšně.
- `npx tsc --noEmit --pretty false`, `npm run mobile:build`, `npm run build` a `git diff --check`: úspěšně. Vite pouze upozorňuje na existující velikost chunků.
- Nativní zařízení a produkční databázové zápisy nebyly součástí testu; žádné nasazení ani push.

final result: passed — mobile UI and local interactions verified; actual-device/backend verification remains outside this isolated visual test

---

## 2026-09-17 — iOS refinement of the mobile application

### Reference and scope

- User reference: https://developer.apple.com/design/resources/#ios-apps and Apple HIG segmented controls, tab bars, materials, and layout.
- The supplied Figma document `o3xpkURlzTA80GnSDBpDsf`, node `0:1`, returned an empty Page 1 canvas. No pixel-exact Figma match is claimed.
- Applied the 21st UI-build workflow with the existing project design tokens/components. The 21st CLI was unavailable, so no catalog package or new dependency was introduced. SwiftUI translation was not applicable to this React/Capacitor visual refinement.
- Retained the approved light ice-blue / dark navy palette, yellow primary actions, configured phase colors, existing clinical handlers, permissions, and actual 3D assets. No native SwiftUI conversion, backend change, deployment, or push.

### Visual implementation

- Mobile system typography, large sentence-case page headings, inset grouped room/personnel lists, hairline separators and restrained surfaces.
- Neutral raised segmented controls, 16px search input, minimum 44px estimate controls, translucent tab bar, and grouped More sheet with a separate logout action.
- Detail has compact vertical spacing so all four clinical actions are visible on the tested 390 × 844 viewport; smaller screens retain an internal scroll region and a fixed primary CTA.
- Six actual UI screenshots with synthetic data: `/private/tmp/orm-ios-qa.crqWqJ/{dashboard,spatial,detail}-{light,dark}.png`.
- Reviewed combined preview: `/Users/jaroslavjedlicka/.codex/visualizations/2026/08/20/01a020bb-6261-7152-8eaa-49ba81b1cac8/mobile-ios-preview.png`. QA badges and hospital names belong only to the isolated fixture.

### Verification

- Browser checked light/dark dashboard, room detail, 3D panel and More sheet at 390 × 844. Search + prepared filter returned the expected single matching room. Selected 3D room opened the real detail component.
- At 320 × 640, document width stayed 320px, the inner detail scrolled (559px content / 385px visible), and estimate buttons measured 59 × 44px. Call action remained reachable and enabled Arrival after invocation on synthetic data.
- At 1440 × 900, the mobile detail was hidden and the existing desktop branch rendered; no horizontal page overflow. Phone-specific CSS has media-query regression coverage. Browser console had no errors or warnings at final inspection; viewport override reset.
- Independent React/source review found no new regression, desktop style leakage, or permission/handler change. Shared segmented indicators use per-instance IDs and respect reduced motion.
- 31/31 focused mobile tests passed, including 7 new iOS shell/navigation checks. Next production build (including TypeScript), mobile Vite production build, and `git diff --check` passed. Vite retains its existing large-chunk advisory.
- Full suite: 200/201 passed. The existing statistics fixture `notification impacts keep zero distinct from unavailable and label overlapping sums` is date-dependent: fixed 14 September/Monday data is compared to the real rolling last-24-hour window. Independently verified that the unchanged test passes when its clock is frozen in memory to 14 September. No unrelated statistics code/test was modified for this UI task.
- Physical iPhone safe areas, Safari rendering and native/backend integration remain outside this local browser check.

final result: passed for scoped iOS visual refinement; one unrelated date-dependent statistics test remains failing in the full suite

---

## 2026-09-17 — Unified mobile cards and blue dark theme

### Scope and design contract

- Continued the mobile/iOS refinement, using the existing application components and shared design tokens through the 21st UI-build workflow. The CLI was unavailable; no dependency was added.
- Unified mobile content cards: 20px radius, 16px padding, 17px/600 headings placed first at the top-left. Shared page headings use 28px text, a 44px utility row and 20px page gutters.
- Applied to room overview/detail, patient flow, timeline, selected 3D room, statistics sections, personnel and Settings landing cards. The dark palette now uses Alerts-family navy/blue surfaces instead of greenish navy. Yellow actions and configured clinical status colors remain distinct.
- Desktop and print styling, permissions, clinical handlers, actual 3D geometry/materials and backend data were not changed. Internal statistic tiles remain subordinate to card headings, rather than receiving oversized page typography.
- Updated `.21st/design.json` to record the shared mobile contract. This supersedes the earlier mobile card geometry in this log.

### Browser QA and fixes

- Used actual application components with synthetic data in the isolated fixture `/private/tmp/orm-mobile-qa-4EjNBg` on port 4174. External/API writes were blocked; no production data was modified.
- Inspected dark/light overview, detail, 3D selected-room panel and statistics at 390 × 844; also inspected flow, timeline, Settings carousel/grid and personnel.
- Computed-style checks confirmed 17px/600 card headings and matching 17px outer-edge-to-text offsets (16px padding plus 1px border). Shared page headings aligned at x=20, y=74 on the tested mobile viewport.
- Opened all seven statistics sections. Found and fixed the mobile dynamic-import adapter's handling of direct React.memo/forwardRef exports; it now provides the module-shaped result required by React.lazy. Added actual lazy-render regression tests.
- At 320 × 640, detail and statistics had no horizontal page overflow. Detail content remained internally scrollable (710px content / 330px visible); estimate controls measured 51 × 44px. On shorter screens clinical action rows remain available by scrolling, while the primary action stays fixed.
- Synthetic interaction checks: +15 minutes updated the estimate; Call invoked the handler and enabled Arrival. Existing clinical behavior was retained.
- At 1440 × 900, mobile headers/styles were inactive and desktop statistics retained their prior geometry. Viewport override reset after QA.
- Reviewed preview: `/Users/jaroslavjedlicka/.codex/visualizations/2026/08/20/01a020bb-6261-7152-8eaa-49ba81b1cac8/mobile-jednotne-karty.png`. The hospital/data and QA badge in these images are fixture-only.

### Verification

- Next production build, TypeScript check and final mobile Vite production build passed. Vite retains the existing large-chunk advisory.
- Added 23 passing regression tests covering shared mobile card styles, statistics, Settings and the dynamic adapter.
- Full suite: 223/224 passed. The sole failure is the unchanged date-dependent statistics fixture documented above (`notification impacts keep zero distinct from unavailable and label overlapping sums`); fixed 14 September data falls outside the current rolling time window.
- Physical iPhone/Safari and real backend integration were not tested. No deployment or push was performed.

final result: scoped mobile visual unification verified; unrelated date-dependent statistics test remains failing

---

## 2026-09-17 — Two-column iOS-style room tiles

- User-selected direction: replace full-width mobile operating-room rows with two equal-width cards side by side. Reused shared mobile typography, blue/light surfaces, 20px radius and 16px insets under the 21st UI-build workflow; no dependency or external component was added. This is a React/Capacitor visual adjustment, not a SwiftUI conversion.
- `MobileRoomOverview` now places the full room name and live phase first, two labelled times beneath, and separate Detail/context-menu controls in a footer. Czech hyphenation and balanced wrapping retain complete long names. Semantic phase colors, room actions, search/filter behavior and desktop layout are unchanged.
- Browser verified the real component with synthetic fixture data at 390 × 844 (light/dark) and 320 × 640 (dark). Equal card widths were 169px and 135px respectively; no horizontal page/card overflow. Footer touch targets measured at least 44 × 44px. Card heights align within each grid row.
- Verified prepared-room filtering, empty search result and reset, independent context menu opening/dismissal, and opening the correct room detail. No clinical action was sent to the real backend.
- At 1440 × 900 the mobile overview was hidden and the existing desktop room grid remained visible without horizontal overflow. Temporary viewport override reset.
- 27 focused regression tests passed, including six new grid/render-tree tests. TypeScript and mobile production build passed; only the existing Vite chunk-size advisory remains. No production deployment or push. Physical iOS hardware was not part of this browser check.
- Visual evidence outside Git: `/Users/jaroslavjedlicka/.codex/visualizations/2026/08/20/01a020bb-6261-7152-8eaa-49ba81b1cac8/room-grid-dark.png` and `room-grid-light.png` (synthetic data).

final result: passed for the scoped two-column mobile room grid

---

## 2026-09-17 — Viewport-fitted mobile Rozpis timeline

- Replaced the mobile list/axis switch and long room cards with one iOS-inspired timeline. Reused the shared 20px card surface, 17px heading, 20px page gutters, navy/light palette and segmented controls through the 21st UI-build workflow. No new dependency was added.
- Time navigation offers 2 hours, 4 hours, an operational day (07:00 to next-day 07:00), previous/next windows and Now. Available vertical space determines the number of room rows; the remaining rooms are paged with 44px controls, with no page or chart scrolling. Smaller screens hide supplementary summary/header content before reducing readability.
- The timeline distinguishes recorded history/current phases, dashed future estimates, striped pauses and the current-time marker. Missing data explicitly says no record; ready rooms do not invent current activity. Phase lookup uses the enabled workflow array position. Accessible row names retain current state and specialty; descriptions include actual interval times. Room clicks retain the existing detail callback.
- Parent App already reserves 80px for the fixed tab bar; the timeline adds only its small inner/safe-area inset. Desktop, permissions, clinical handlers and database access remain unchanged.
- Browser QA used actual components with synthetic data in `/private/tmp/orm-mobile-qa-4EjNBg`, with real API writes blocked. Verified 390 × 844 light/dark (4 rooms/page), 320 × 568 (2 rooms/page) and 667 × 375 landscape (1 room/page). Document dimensions exactly matched each viewport with no overflow; paging stayed above the bottom navigation. Row heights were at least 80px in these views.
- Verified next/previous room groups, next time window, full operational day, Now reset, absence of a misleading current-time line outside the displayed window, and opening the correct room. Browser console had no errors/warnings. Temporary viewport override was reset.
- Reviewed screenshots outside Git: `/Users/jaroslavjedlicka/.codex/visualizations/2026/08/20/01a020bb-6261-7152-8eaa-49ba81b1cac8/mobile-timeline-dark.png` and `mobile-timeline-light.png`.
- Next production build including TypeScript and mobile Vite production build passed; Vite retains the existing large-chunk advisory. All 34 focused regression tests passed. Data/layout coverage includes history clipping, completed cycles, pauses, estimates, missing timestamps, midnight/DST boundaries, measured pagination, resizing, empty states and screen-reader descriptions. Emergency/lock overlays retain measured workflow history without fabricating a completion time or a future forecast.
- Physical iPhone/Safari and live backend integration were not tested. Existing app breakpoint still switches to desktop at widths of 768px and above, including wide landscape phones. No deployment or push.

final result: passed for the scoped mobile timeline

---

## 2026-09-18 — Mobile title hierarchy and vivid current phase

- Removed introductory mobile header kickers (such as Operační blok / Živý operační program). The actual screen title now occupies the top-left toolbar beside existing actions; optional facility/date metadata remains below. Shared administration kicker rows are hidden only below 768px. Removed the obsolete floating short-screen Rozpis heading rule.
- Reused the existing shared mobile components/tokens through the 21st UI-build workflow. The room detail's active phase is a deliberate semantic exception to neutral cards: configured status-color gradient, outline/glow, colored elapsed-time accent and workflow markers. The top row contains Aktuální fáze and the actual workflow position/count. Dark mode has a deeper navy center; light mode uses a tinted surface and dark text. Ready stays neutral; pause/emergency/lock preserve existing priority colors.
- Actual clinical handlers, confirmations, permissions, +/− timing, personnel actions and desktop presentation were preserved. No hardcoded surgery pink or six-step sequence; the screenshot is a style reference, not data.
- Browser QA used actual components with synthetic data in `/private/tmp/orm-mobile-qa-4EjNBg` on port 4174, with external/API writes blocked. Inspected overview, flow, Settings, Rozpis, statistics and room detail at 320 × 640 / 390 × 844. Settings title and all three actions fit at 320px. No horizontal document overflow; Rozpis document remains exactly 320 × 640. Ready and paused states were inspected, and the live pause color was cyan with phase advancement disabled.
- Visually inspected the active phase in light and dark themes. At 1440 × 900 the mobile detail is hidden, the desktop kicker retains display:flex, and the document has no horizontal overflow. Browser console reported no warnings/errors. Temporary viewport override reset.
- 95 focused mobile regression tests pass; TypeScript, Next production build and mobile Vite production build pass. Vite retains the existing large-chunk advisory. Independent source review found no blocking regressions. `git diff --check` passes.
- Visual evidence outside Git: `/Users/jaroslavjedlicka/.codex/visualizations/2026/08/20/01a020bb-6261-7152-8eaa-49ba81b1cac8/mobile-current-phase-dark.png` and `mobile-current-phase-light.png` (synthetic QA data). Physical iPhone/Safari and live backend integration were not tested. No deployment or push.

final result: passed for scoped mobile headers and current-phase styling

## 2026-09-18 — Responsive mobile room detail

- Reused existing 21st design contracts and components; compacted header, timing cards, personnel and four actions without changing clinical handlers. Estimate buttons and primary controls retain 44px targets. Landscape places the phase beside timing/personnel and keeps the next-phase button in normal layout flow.
- Actual components verified with isolated synthetic data: 320 × 568, 348 × 614, 390 × 712, 430 × 932 and 568 × 320. Additional long-title/eight-phase/paused/hygiene/emergency/locked stress checks at heights 614, 712, 780, 844, 900 and 932 showed no body overflow. Light and dark screenshots reviewed; no browser errors. Viewport override reset.
- 98 mobile regression tests, TypeScript, mobile production build and diff whitespace checks passed. Existing Vite chunk-size advisory remains. No backend data changed, deployment or push performed. Physical iOS Safari was not tested. Widths from 768px retain existing desktop behavior. Exceptional content/accessibility enlargement retains a scrolling fallback rather than clipping controls.

final result: passed for scoped mobile detail viewport fit

## 2026-10-08 — Acute selection outside queue order and dashboard labels

- Reused the accepted borderless RoomDetail ribbon and existing neutral glass/timeline urgency tokens under the 21st UI-build contract. A non-head unbound selection shows `Není dodrženo pořadí výkonů`, identifies the actual first waiting request, and retains the full waiting queue including the selected highlighted node. The current manual rank is not confused with urgency or immutable submission number. The local queue scroll reveals only the selected node, not the page; navigation never reorders or starts a clinical cycle. Bound cycles do not invent a historical order violation.
- Dashboard desktop and actual mobile overview receive one shared authorized SWR projection. A passive label distinguishes assigned pending requests (procedure, urgency, current rank, additional count) from an exactly bound current acute cycle. Server-only tenant-scoped binding reads also include completed bindings for still-active requests outside the displayed Timeline interval, with 500-row pagination and monotonic completion merging. No migration, broader grants, clinical write or automatic queue closure.
- Acute cards reserve a uniform 360px minimum for the whole desktop grid. The SVG indicator retains an 84px minimum (approximately 60px visible circle) rather than shrinking to a tiny number. Existing transparent centers, phase colors, asymmetric action pockets, specialties, staff, keyboard/clinical callbacks and mobile themes remain intact.
- Live localhost read-only QA: Timeline request PŘEVAZ VAC opens its actual Sál č. 4 detail as selected for the next cycle while its unrelated running clinical cycle stays unchanged. Dashboard shows that pending request and the precisely bound APPE running cycle on Sál č. 5; the user's previously completed URS on Sál č. 7 is not labelled as waiting. No request was created, reordered, cancelled, started or completed during this QA. The currently remaining live waiting queue has only one unbound request, so out-of-order behavior is covered by synthetic render/context/start regression cases, not a fabricated live clinical example.
- Actual viewports confirmed through DOM measurements: 1543×1109 and 1024×768 desktop/tablet have no horizontal page overflow, uniform 360px cards and contained acute labels. Tablet indicator is 84px with about 2.5px clearance between its caption and badge. At 390×844 all 15 actual mobile room cards remain in the DOM; both new labels wrap within their cards without horizontal overflow. This is scoped badge/layout verification, not a claim of a new exhaustive mobile-header audit. Temporary viewport override reset and the original 1543×1109 view confirmed.
- 267/267 focused acute/dashboard/mobile/timeline regression tests pass, including isolated synthetic PostgreSQL transaction/grant tests run with shared-memory permission. TypeScript noEmit and `git diff --check` pass. Updated two stale mobile test fixtures to the pre-existing full-card quick-action/Cliniq behavior without production changes. `21st review` of the four new ribbon/badge TSX/CSS files reports zero findings; broader integration review has only pre-existing informational palette notes. Shared data, memoized maps, primitive effect keys, no per-card fetch and passive markup checked against React best practices.
- Evidence outside Git: `output/acute-qa/acute-dashboard-assigned.png`. No production deployment, commit or push. Physical mobile hardware was not tested.

final result: passed for scoped acute queue warnings and real room-card labels
## 2026-10-08 — Odhad výkonu ve třech výběrových boxech

- Číselný ovladač odhadu v akutním create/edit popupu nahrazen nativními required radio boxy Do 30 min / Do 60 min / Více než 60 min. Nové uzavřené rozsahy explicitně používají horní odhad 30/60 minut; otevřený rozsah vyžaduje vlastní celé číslo 61–1440, bez fiktivního defaultu. Přesný starší odhad zůstává zachován při editaci i opakovaném výběru téhož rozsahu.
- Reuse dle 21st: stávající Timeline tokens, 8px vnitřní geometrie, 44px boxy, cyan selected/check/focus, disabled a klávesnicové šipky; bez nové knihovny, externího exportu projektového kontextu či změny klinického backendu. Durace a rozsah jsou validované před odesláním.
- 45/45 cílených UI/layout/palette/integration/timeline testů, TypeScript a whitespace check prošly. `21st review`: 75 informačních poznámek stávající palety, bez warning/error. Kontrakty pokrývají hranice 30/60/61, prázdné/neplatné hodnoty, uchování 20/45/200 minut, required otevřený rozsah a native disabled/focus.
- Skutečný localhost: kliknutí Do 30 → 30 min, ArrowRight → Do 60 / 60 min; Více než 60 otevře prázdný required input, 60 je rangeUnderflow, 90 lze zadat do lokálního draftu. Na skutečném viewportu 1543×1109 má popup se všemi 15 sály i emergentním upozorněním body clientHeight=scrollHeight (645 px s přesným odhadem, 617 px s volbou Do 30). Resize override v této relaci nepřešel do skutečného viewportu; nové ověření 1024×720 se proto netvrdí. Reset override proveden. Evidence: `output/acute-qa/duration-band-options.jpg`. Žádný skutečný požadavek se při QA neuložil, žádná databázová migrace, commit nebo nasazení.

---

## 2026-10-09 — Provedené akutní výkony v modulu

- Přehled rozlišuje čekající požadavky, zahájené cykly a skutečně provedené výkony. `Provedeno` vyžaduje uložené události začátku a konce celého cyklu včetně úklidu; ruční uzavření požadavku není důkaz provedení. Skutečně navázané cykly se již nepočítají jako čekající. Automatické uzavírání ani změna pořadí požadavků se neprovádí.
- Provedené řádky a readonly detail zobrazují původní výkon, naléhavost a číslo zápisu, skutečný sál, začátek, konec a zaokrouhlenou délku celého cyklu. Detail funguje i bez původního požadavku v omezeném seznamu historie. Čekání se zastaví při začátku cyklu. Historie používá 30/90/365 kalendářních dní a explicitně přidává starší doložené cykly stále aktivních požadavků, aby se nezobrazily znovu jako čekající.
- Dle 21st byly znovu použity stávající skleněné řádky, rozložení nadpisu, barvy naléhavosti a Timeline/Radix popup. Bez nové knihovny, exportu projektových dat, migrace nebo změny autorizace API. Živé načítání používá existující tenant-scoped SWR a realtime; při chybě důkazu cyklů se nezobrazují zavádějící počty.
- 167/167 akutních regresních testů prošlo včetně izolovaného syntetického PostgreSQL workflow/grants; 16 nových kontraktů ověřuje partition, důkaz dokončení a oba detaily. TypeScript noEmit a whitespace check prošly. Nezávislý audit ověřil 5 481 časových oken Europe/Prague včetně DST. Cílené `21st review` má v TSX nula nálezů; CSS pouze 76 informačních poznámek palety bez warning/error.
- Read-only localhost QA: APPE na skutečném sále 5 je `Provedeno` (8. 10. 22:02 až 9. 10. 04:22, 380 min); URS na sále 7 je `Provedeno` (8. 10. 22:01, 0 min po zaokrouhlení krátkého skutečného cyklu). PŘEVAZ VAC na sále 4 zůstává pouze `Cyklus zahájen`. Nový uživatelův požadavek REPOZICE PŘEDLOKTÍ je odděleně čekající, nebyl vytvořen během QA. Ověřeny detail URS, Historie i načtení 365 dní. Na 1543×1109 byly řádky obsažené; závěrečný samostatný náhled 1280×720 nemá horizontální overflow, select je vysoký 44px, konzole bez error/warn. Nové mobilní viewporty ani fyzická zařízení se v této relaci netvrdí.
- Pomocný skrytý tab byl uzavřen; uživatelův souběžně otevřený formulář zůstal nedotčený. Žádný skutečný požadavek nebyl vytvořen, potvrzen, přeuspořádán, zrušen, zahájen ani dokončen. Evidence mimo Git: `output/acute-qa/acute-completed-module.png`. Bez commitu, push nebo nasazení.

final result: passed for scoped actual acute-cycle completion visibility

## 2026-10-09 — Kruhová časová osa akutních výkonů

- Záložka Časová osa v akutním modulu používá propojené průhledné kruhy v existujících barvách naléhavosti. Čekající požadavky mají uvnitř živé celé minuty, zahájené cykly hodiny a doložené provedené cykly značku dokončení. Pod kruhy zůstávají úplné názvy výkonů a skutečných sálů, původní číslo zápisu, aktuální pořadí čekajících, datum a čas. Rozestupy jsou explicitně schematické, nikoli časové měřítko nebo procentuální pokrok.
- Čekání běží od uloženého přijetí požadavku do doloženého začátku cyklu. Historie používá neměnnou identitu a skutečný sál uloženého cyklu; odhady se nepovažují za skutečnou délku. Krátký dokončený cyklus může mít po zaokrouhlení 0 min, což rozhraní vysvětluje. Chybějící čas se nevymýšlí a neumístitelné požadavky zůstávají s explicitní poznámkou dostupné v Požadavcích. Filtry období, zahájené a starší doplňující cykly zůstávají zachované.
- Reuse dle 21st: existující SVG kruhy, neutrální transparentní středy, barvy naléhavosti, hlavní rozložení a Timeline popup. Veřejné hledání komponent vyžadovalo přihlášení, proto žádná externí komponenta ani závislost nebyla přidána; projektová data nebyla exportována. Kliknutí na kruh otevírá stávající detail a vrací fokus, bez klinické změny. Hlavní scheduler, databázové schéma a autorizace API zůstávají nedotčené.
- 188/188 akutních testů prošlo včetně 21 nových datových/render kontraktů a izolovaných syntetických PostgreSQL regresí. TypeScript noEmit, whitespace check a cílené 21st review tří TSX/CSS souborů prošly; review má nula nálezů. Memoizovaná projekce používá existující sdílený čas, SWR a realtime, bez vlastního časovače nebo načítání pro jednotlivé kruhy.
- Read-only localhost QA ověřilo provedené URS/APPE, zahájený PŘEVAZ VAC a průběžně narůstající čekání REPOZICE PŘEDLOKTÍ. Další uživatelem zadané GYN KRVÁCENÍ a PERITONSILÁRNÍ ABSCES se objevily automaticky. Detail čekajícího i provedeného výkonu a návrat fokusu byly ověřeny bez změny klinického stavu. Konzole bez error/warn.
- Skutečné viewporty 1280×720 a 1024×768 mají posouvání delší osy pouze uvnitř přehledu, nikoli horizontální přetečení stránky. Na 390×844 a 320×568 jsou všechny uzly v přehledném svislém toku, kruhy 124px a dokument bez horizontálního přetečení. Viewport override resetován a původní uživatelovo okno 1543×1109 zůstalo nezměněné. Fyzická mobilní zařízení nebyla testována; light theme pokrývají tokenové testy, nikoli nový live screenshot.
- Evidence mimo Git: `output/acute-qa/acute-circular-timeline.png`. Pomocný QA tab uzavřen, původní uživatelův tab nedotčený. Žádný skutečný požadavek nebyl vytvořen, přeuspořádán, zrušen, zahájen nebo dokončen. Bez commitu, push nebo nasazení.

final result: passed for scoped circular acute timeline

## 2026-10-09 — Menší spodní lišta provedených akutních výkonů

- Provedené cykly jsou oddělené od hlavních čekajících/zahájených kruhů do spodního pásu. Používají stejné průhledné SVG obrysy a barvy naléhavosti, ale pouze 76px kruhy se značkou dokončení a kompaktní text vedle nich. Zachované jsou úplné názvy, skutečný sál, původní zápis, čas dokončení a zaznamenané délky. Časové pořadí každé skupiny zůstává stabilní; pouze prezentace se dělí do dvou úrovní.
- Prázdný spodní pás se neukazuje a historie bez aktivních výkonů má krátkou pravdivou informaci místo velkého prázdného prostoru. Hlavní kruhy zůstávají 184px na počítači a 124px na telefonu. Spodní pás je vodorovný i na telefonu a posouvá se lokálně; názvy se nezkracují v datech a všechny uzly zůstávají dostupné. Detailové callbacky, fokus, období historie, evidence dokončení a celý klinický backend jsou beze změny.
- Dle 21st znovu použity existující kruhy, typografie a neutrální oddělovací linka; veřejný katalog vyžadoval přihlášení. Bez externí závislosti, exportu projektových dat nebo klinických zápisů. 191/191 akutních regresních testů prošlo, včetně 14 render kontraktů pro obě skupiny, prázdné stavy, neměnná metadata a obnovení fokusu. TypeScript noEmit, whitespace check a 21st review obou změněných UI souborů prošly bez nálezů.
- Read-only localhost QA ověřilo velké PŘEVAZ VAC / PERITONSILÁRNÍ ABSCES a čtyři skutečně dokončené cykly ve spodním pásu. Uživatel souběžně dokončil GYN KRVÁCENÍ a REPOZICI PŘEDLOKTÍ; QA žádný cyklus nezahájilo ani nedokončilo. Malý kruh URS otevřel správný doložený detail a po zavření obdržel fokus zpět. Konzole bez error/warn.
- Skutečné viewporty 1280×720, 1024×768, 390×844 a 320×568 nemají horizontální přetečení dokumentu; provedené kruhy mají ve všech 76px. Na telefonech zůstává aktivní osa svislá a historie vodorovná. Viewport override resetován. Pomocný tab uzavřen, uživatelův tab nebyl přesměrován. Evidence mimo Git: `output/acute-qa/acute-completed-bottom-strip.png`. Fyzická zařízení nebyla testována. Bez commitu, push nebo nasazení.

final result: passed for scoped completed bottom strip

## 2026-10-09 — Čekající požadavky jako první v Požadavcích

- Změněné je pouze pořadí sekcí v `AcuteRequestsModule.tsx`: čekající karty / pravdivý prázdný pořadník, zahájené cykly, provedené výkony. Stávající vzhled, ruční pořadí, detailové callbacky, časová osa, historie a klinická data zůstávají beze změny. Dle 21st znovu použité existující komponenty, bez nové závislosti.
- 34/34 cílených module-cycles/UI testů prošlo včetně dvou nových regresí pořadí a stavů bez čekajících požadavků. TypeScript noEmit, whitespace check a 21st review změněného komponentu prošly; review bez nálezů.
- Read-only localhost kontrola záložky Požadavky v běžném 1280×720 náhledu potvrdila čekající PERITONSILÁRNÍ ABSCES před zahájeným PŘEVAZ VAC a čtyřmi doloženými provedenými cykly níže. Konzole bez error/warn. Žádný požadavek ani klinický cyklus nebyl změněn. Pomocný tab uzavřen a uživatelův náhled ponechán nedotčený.
- Důkazy mimo Git: `output/acute-qa/acute-requests-waiting-first.png` a `output/acute-qa/acute-requests-performed-below.png`. Bez commitu, push nebo nasazení.

final result: passed for scoped waiting-first requests order

## 2026-10-09 — Provedené výkony v akutní časové ose pod sebou

- Spodní vodorovný pás nahrazen jedním sloupcem plnošířkových kompaktních boxů. Každý zachovává 76px průhledný kruh, barvu naléhavosti, skutečnou identitu a sál, původní číslo zápisu, zaznamenané dokončení a délky. Na široké obrazovce jsou údaje uvnitř boxu v řádku, na užší se zalamují do dvou sloupců. Pořadí provedených podle času, velká aktivní osa, filtry, native detailové callbacky a klinická data zůstávají beze změny.
- Dle 21st použity stávající acute card/border/urgency tokeny, 12px geometrie a SVG obrys. Katalogové hledání nebylo dostupné (`fetch failed`); žádná externí komponenta či závislost nebyla přidána. 35/35 cílených UI, projekčních a module-cycles testů prošlo včetně nové kontroly svislých boxů bez vodorovného scrollu v každém breakpointu. TypeScript noEmit, whitespace check a 21st review obou změněných UI souborů prošly bez nálezů.
- Read-only localhost QA potvrdilo šest skutečně dokončených cyklů v boxech pod sebou na 1280×720, 1024×768, 390×844 a 320×568. Ve všech šířkách má seznam stejnou scrollWidth/clientWidth, každý box vlastní shodnou scrollWidth/clientWidth a dokument nepřetéká do stran. Kruhy mají 76px a názvy se zalamují bez překryvů. Konzole bez error/warn. Fyzická zařízení ani nový světlý náhled nebyly testovány.
- Evidence mimo Git: `output/acute-qa/acute-timeline-completed-vertical-boxes.png`. Viewport resetován a pomocný tab uzavřen; uživatelův náhled ponechán nedotčený. Žádný klinický požadavek či cyklus nebyl změněn. Bez commitu, push nebo nasazení.

final result: passed for scoped vertical completed timeline boxes

## 2026-10-09 — Box akutních požadavků vedle ARO statusu

- Samostatný desktopový textový řádek s počtem, Otevřít a vysvětlením odhadu nahrazen nativním navigačním boxem Akutní požadavky hned za ARO. Obě větve ARO i nový box mají společnou výšku 48px a rovné sloupce; při 768–1180px se dvojice přesune do druhého řádku lišty. Zachovaný je aktuální sdílený počet čekajících, přístupný počet nepřiřazených, poctivé loading/error stavy a dosavadní modulová/rolová brána. Mobilní souhrn, projekce bloků a klinické funkce jsou nedotčené.
- Reuse dle 21st: existující commandbar, neutral glass surface a theme tokeny; stávající Lucide ikony, žádná nová závislost nebo export projektu. Katalogové hledání selhalo při spojení. React review ověřilo top-level čistou komponentu bez nových hooků, efektů nebo fetch, nativní button/type a existující navigační callback bez klinických mutací.
- 39/39 cílených timeline integration, projection, navigation a cycle-link testů prošlo; pokrývají obě ARO větve, stejné rozměry a narrow CSS, češtinu počtů, loading/error, přístupné údaje, modulové brány a skutečné napojení callbacku. TypeScript noEmit a whitespace check prošly. 21st review má v novém komponentu/CSS nula nálezů; v původním TimelineModule zůstává 33 informačních poznámek palety a jeden původní ARO hover-scale warning mimo rozsah této změny.
- Read-only localhost QA na skutečných 1280×720 potvrdilo oba boxy 192×48px, odstraněný původní řádek, pravdivých 0 čekajících a otevření skutečného akutního modulu klávesou Enter. Konzole bez error/warn. Narrow pravidla jsou ověřena testy, nikoli novým live viewportem: resize capability v této relaci nezměnila skutečnou šířku, proto se další živé šířky netvrdí. Oba dočasné viewport overrides resetovány.
- Evidence mimo Git: `output/acute-qa/timeline-acute-toolbar-tile.png`. Pomocný tab uzavřen a uživatelův náhled ponechán nedotčený. Žádný požadavek, pořadí ani operační cyklus nebyl změněn. Bez commitu, push nebo nasazení.

final result: passed for scoped desktop acute toolbar tile

## 2026-10-09 — Denní přehled akutních požadavků a kalendář

- Stránka navazuje na Management/Notifikace: společný nadpis, kompaktní 68px souhrnné boxy, jedna neutrální lišta záložek a akcí, jemné 12px plochy. Existující gradienty priorit a popupy Timeline zůstávají. Kalendář a denní navigace jsou přímo sdílené komponenty ze Statistik; kalendář vpravo má na velké obrazovce 280px a na užší se skládá pod obsah. Sdílené kalendářové dny a nativní datum mají úplné přístupné názvy; u kalendáře se animuje pouze barva.
- Požadavky a akutní časová osa se filtrují podle neměnného přijetí v kalendářním dni Europe/Prague. Historie zachovává ostatní čekající a zahájené položky, doložené provedené cykly, archiv a audit; počet čekajících mimo den má přímý odkaz. Úplný pořadník a vazby se filtrací nemění. Chybějící historické zadání má výslovně označený skutečný den zahájení, bez vymyšlených počtů či aktivity kalendáře. Vybraný den rozšiřuje společný query rozsah vedle období historie; 365denní výběr je bezpečně omezen i při přechodu přes půlnoc. Nový požadavek není zpětně datován.
- Reuse dle 21st a React best practices: stávající shell, paleta, SWR/realtime a čistá memoizovaná projekce, bez dotazu či časovače na každé kartě. Katalogové hledání skončilo fetch failed, proto žádná externí komponenta, závislost či export projektu. Nezávislý závěrečný audit potvrdil opravu midnight/fallback hranic bez zbývajícího závažného nálezu v rozsahu změny. Původní omezení 200 ukončených požadavků zůstává poctivě uvedené.
- 226/226 akutních regresních testů bez databáze prošlo, včetně nových datových a hook/render případů pro výběr data, chyby/načítání, úplný reorder, různé klientské zóny a půlnoc. Závěrečných 28/28 day-view/day-page testů, TypeScript noEmit a whitespace kontrola prošly. Databázové syntetické transakční testy nebyly v tomto kroku spouštěny; backend se nemění. Cílené 21st review tří souborů má 82 poznámek: 78 informačních poznámek palety a čtyři stávající transition-all warningy v ostatních grafech AppCharts mimo tuto úpravu, bez error. Netvrdí se nulový nález celého souboru.
- Read-only localhost: 9. října tři skutečně zadané a provedené výkony; 8. října tři provedené cykly z daného dne zadání včetně cyklu dokončeného následující den. Historie zachovává všech šest. Volba 1. září přímo kalendářem vyvolala načtení mimo výchozích 30 dní a zobrazila pravdivý prázdný den bez chyby, návrat Dnes obnovil tři dnešní výkony. Nativní callback je pokryt testy; programové browser fill nebylo v této relaci spolehlivým důkazem React změny. Konzole bez error/warn.
- Skutečné DOM rozměry 1280×720, 1024×768, 390×844 a 320×568: dokument, denní řádky i karty nepřetékají do stran; na užších šířkách se kalendář a ovladače skládají, všechny záznamy zůstávají dostupné svislým posouváním. Narrow QA je geometrická kontrola, nikoli tvrzení o fyzickém telefonu či novém živém světlém náhledu. Viewport override resetován. Pomocný tab uzavřen, původní uživatelův tab nedotčený.
- Evidence mimo Git: `output/acute-qa/acute-day-layout.png`. Žádný skutečný požadavek ani klinický cyklus nebyl při QA vytvořen, přeuspořádán, zahájen, dokončen či jinak změněn. Bez migrace, commitu, push nebo nasazení.

final result: passed for scoped daily acute workspace and shared calendar

## 2026-10-09 — Nabídka Statistik ve stylu akutního modulu

- Pouze horní desktopová nabídka: stávající neutrální 12px lišta, 8px vnitřní segment, 2px inset, 6px tlačítka, 44px ovladače, 11px/500 popisky bez verzálek a cyan token aktivní záložky. Ikony, všechny názvy záložek, nadpis, pozadí a postranní navigace zůstávají. Období a exporty mají sladěné rozměry; pevný 224×50px slot je stejný pro běžná období i popisek dvanácti měsíců Výkonnosti.
- Dle 21st znovu použity skutečné acute/management povrchy a tokeny, nikoli nová externí komponenta. Katalogové hledání nebylo dostupné (fetch failed). Malý CSS adapter je scoped výhradně na statistics-desktop; StatisticsModule pouze importuje stylesheet. Nezměněné jsou výpočty, databázové dotazy, filtry, tisk/PDF/CSV a samotný navigační React komponent. Bez nového balíčku, klinických zápisů nebo exportu projektových dat.
- 31/31 cílených toolbar-style, navigation, mobile-statistics-style a print-integration testů prošlo, stejně jako TypeScript noEmit a whitespace kontrola. Nezávislý audit potvrdil wrapping a zachování period slotu. 21st review nového CSS má nula nálezů; StatisticsModule má jeden původní transition-all warning mimo rozsah této úpravy. Před změnou byl navíc v širším tab-reports.test.js nalezen nesouvisející již existující neúspěch notification-impact očekávání (test na řádku 178); v tomto grafickém kroku nebyl měněn ani vydáván za opravený.
- Živý read-only localhost na 1280×720: všech osm záložek je dostupných, mají 44px výšku a správnou typografii; stránka nepřetéká vodorovně. Fáze i Výkonnost mají totožný toolbar 1112×138px a stejný period slot, bez posunu. End otevřelo Zařízení a Home vrátilo fokus i aktivní tab na Přehled. Na užším desktopu se mají dvě části skládat podle explicitního CSS breakpointu; resize capability v této relaci nezměnila skutečný viewport, takže další živé rozměry se netvrdí. Override resetován. Mobilní chování je zachováno scopingem a regresními testy.
- Při přepínání záložek byly zachyceny dva Recharts warningy o nulové velikosti grafu při měření kontejneru, bez console error. Tento krok nemění grafy ani jejich kontejnery a neprohlašuje tyto warningy za opravené.
- Evidence mimo Git: `output/statistics-toolbar.png`. Pomocný QA tab uzavřen, uživatelův původní tab nedotčený. Žádná databázová či klinická mutace, commit, push nebo nasazení.

final result: passed for scoped Statistics toolbar styling

## 2026-10-09 — Kruhový procentuální preloader Výkonnosti

- Nový čistý SVG preloader má průhledný střed, jemný cyan obvod, celé procento uvnitř a skutečný počet načtených záznamů pod kruhem. První neznámý počet má indeterminate kruh a výslovné Zjišťuji počet záznamů, bez vymyšleného procenta. Výpočet používá pouze stávající progress observer historie: floor počtu/total, maximálně 99 před potvrzeným koncem, 100 až při complete. Pokud ještě čeká konfigurace workflow, zůstává tento samostatný zdroj čekání výslovně označen. Po načtení preloader hned zmizí, bez umělého zdržení.
- Initial loading nepředává částečné hodnoty do boxů nebo exportu; při obnově zůstává pět posledních boxů a menší 44px kruh v záhlaví. Chyby mají stále přednost před loaderem a tlačítko opakování funguje původní cestou. Výpočty, stránkování, SWR, izolace nemocnic, sdílený toolbar i klinická data jsou beze změny. Přístupný progressbar má název, min/max a skutečný valuenow/valuetext; unknown valuenow chybí a SVG je dekorativní. Reduced motion ruší rotaci i přechod. Kompaktní popisky se zalamují navzdory nowrap původního parentu.
- Dle 21st znovu použity skutečné statistické tokeny, povrchy a kruhový SVG vzor, bez externí komponenty či nové závislosti; katalogové hledání selhalo (fetch failed), projektová data nebyla exportována. React best practices review potvrdilo čistou top-level komponentu bez hooků, timerů a fetch, bez opakovaného výpočtu modelu při pouhé změně procent. Nezávislý závěrečný audit nenašel material issue v daném rozsahu.
- 94/94 cílených performance-history, performance-preloader, performance-report, performance-model/select, print-integration a toolbar testů prošlo; zahrnují 9 nových loader případů, neznámé a změněné počty, hranici plné stránky, chyby, retry, tab re-entry a scope izolaci. Původní stale closed-month test byl opraven pouze v selektorech na již dříve commitnuté overview markup; zaokrouhlovací assertions zůstaly. TypeScript noEmit a whitespace kontrola prošly. 21st review všech tří změněných UI souborů má nula nálezů.
- Read-only localhost 1280×720: zachycen neznámý počet a poté reálné 3 % (1 000 z 26 902 událostí); po dokončení se zobrazilo pět boxů bez loaderu a bez horizontálního overflow. Obnova ukázala compact 44×44px kruh se stejným reálným průběhem, všech pět hodnot zůstalo a po dokončení bylo tlačítko obnovy znovu dostupné. Žádný simulovaný browser progress, umělý throttle nebo klinický zápis. V konzoli byly opět zachyceny stávající Recharts warningy width/height0 při měření grafů; nejsou tímto krokem vydávány za opravené. Mobilní light/dark a wrapping jsou ověřeny zděděnými tokeny a CSS kontrakty, nikoli novým fyzickým/živým mobilním testem.
- Evidence mimo Git: `output/performance-preloader.png` a `output/performance-refresh-preloader.png`. Pomocný QA tab uzavřen, uživatelův tab nepřesměrován. Bez backendové změny, migrace, commitu, push nebo nasazení. Tento krok informuje o průběhu; neprohlašuje zrychlení databáze.

final result: passed for scoped Performance circular progress UI

## 2026-10-10 — 3D dispozice ve společném designu administračních modulů

- Upraven je pouze Settings editor: společná hlavička s mb-7, samostatná jemná 12px lišta, textově označené 44px akce, 8px ovladače, cyan tokeny a viditelná skutečná informace o uložení, změnách nebo chybě. Panely a formuláře používají neutrální transparentní plochy, sdílené textové barvy a focus; odlišné žluté akce a hover posun mizí. Nový CSS adapter je scoped na spatial-settings-module. Dashboardová 3D vizualizace, geometrie, místnosti, jejich propojení, ukládání, revize, potvrzení mazání a klinické callbacky nebyly měněny.
- Reuse dle 21st: aktuální ModulePageHeading, Management/Notifications povrchy a aplikací definované tokeny. Hledání katalogu selhalo při spojení; žádná závislost ani externí komponenta nebyla přidána a projektová data nebyla exportována. Cílené 21st review dvou produkčních UI souborů má pět informačních poznámek o záměrně převzatých neutrálních/border/tint hodnotách, bez warning/error. 44/44 testů spatial a desktop-header prošlo, včetně deseti nových SSR/CSS bezpečných presentation kontraktů. TypeScript noEmit a whitespace check prošly. Nezávislý audit odhalil a ověřil opravu hraniční auto-height podmínky a reduced-motion specificity.
- Živý read-only localhost na 1280×720 a 1024×768 potvrdil sdílenou hlavičku, lištu, 44px hlavní tlačítka, model 17 místností/150 objektů a původní přepínání Shora/3D pohled bez označení neuložené změny. Tab z Shora přešel na Nízké stěny s viditelným 2px cyan focusem. Resize původního auto-sized canvasu vyvolal dvě ResizeObserver loop zprávy; scéna byla následně ohraničena výškou v CSS a opakované resize už nové zprávy nepřidalo. Neprohlašuje se celá historická konzole za bezchybnou.
- Skutečné DOM šířky 1169/1170/1171 ověřují obě strany přepnutí panelů: při stacked režimu rám zahrnuje celý inspector, při desktop režimu tři sloupce. 390×844 a 320×568 ukazují scénu před všemi editačními panely v přístupném svislém toku. Ve všech ověřených rozměrech scrollWidth dokumentu odpovídá viewportu a scrollWidth panelů jejich clientWidth; žádné vodorovné přetékání. Fyzická zařízení a nový live light theme nebyly testovány. Prázdný/loading/error stav byl ověřen SSR bez DB či WebGL.
- Evidence mimo Git: output/spatial-settings-design.png. Viewport override resetován, dočasná volba mřížky nastavení vrácena na původní karusel a pomocný tab uzavřen. Uživatelův původní tab zůstal nedotčený. Žádné uložení, vytvoření/mazání projektu, změna parametrů modelu či klinický zápis během QA. Bez commitu, push, migrace nebo nasazení.

final result: passed for scoped Settings spatial-editor design alignment

## 2026-10-10 — Jemné sjednocení dashboardových boxů

- Pouze desktopové boxy: lehčí jednotná transparentní plocha, jemné ohraničení, měkčí písmo názvu/počtu, čitelnější sekundární údaje a klidný společný AM/PM panel s průhlednými vnitřními poli. Neutrální personální ikona je zřetelnější, ale vylučuje červené/jantarové/cyan sémantické stavy. Žádný nový status, text, data nebo dekorativní gradient. Původní vykrojení, průhledné středy kruhů, barvy nemocnice, schválené neonové akce a všechny klinické callbacky zůstávají.
- Dle 21st znovu použity skutečné projektové plochy/paleta a RoomCard, bez externí komponenty, závislosti či exportu projektu. Katalogové hledání nebylo dostupné (fetch failed). Malý CSS adapter je scoped nad 768px; DashboardModule pouze importuje stylesheet. Mobile a opt-in Cliniq nedostávají žádné nové pravidlo. 21st review má 20 informačních poznámek o záměrně převzatých barevných hodnotách, nula warning/error.
- 102/102 cílených testů card-polish, action-geometry, room-card, grid-layout, desktop-header, mobile-card-consistency, mobile-room-grid a akutních dashboardových kontraktů prošlo; zahrnují šest nových testů izolace adaptéru, průhledných kruhů a nezměněné geometrie. TypeScript noEmit prošel. Nezávislý audit nemá v rozsahu změny regresní nález.
- Širší sada před přidáním nových testů vykázala 190/206 úspěchů. Šestnáct neúspěchů je v nedotčených mobilních testech: 14 v mobile-room-detail (zejména chybějící mock dříve přidaného AcuteRoomQueueRibbon a starší CSS očekávání), jeden v mobile-ios-shell (očekávání font-size vyhledávání) a jeden v mobile-overview (starší očekávání isSuperAdmin filtru). Tyto testy nejsou závislé na DashboardModule ani na novém adaptéru; jejich oprava není součástí grafického kroku. Netvrdí se, že celý repozitář má zelené testy.
- Read-only localhost na skutečných 1280×720, 1024×768 a 768×1024: všechny sály dostupné, názvy bez horizontálního ořezu, všechny tři SVG kruhy fill:none, dvojice akcí minimálně44px a bez překryvu. Na 1024px mají akce50,63px a13,10px rozestup; na768px62,40px a16,13px rozestup. Dokument scrollWidth odpovídá viewportu také při390×844, kde jsou desktopové karty skryté. Úzké QA je geometrická kontrola, nikoli tvrzení o fyzickém telefonu či novém light-theme náhledu. Tab/Shift+Tab ověřily viditelný focus karty, bez aktivace akcí. Konzole QA tabu bez error/warn.
- Evidence mimo Git: output/dashboard-card-polish.png. Viewport resetován, pomocný tab po kontrole uzavřen; původní uživatelův tab neměněn. Žádný skutečný stav sálu, akutní požadavek, personální přiřazení nebo databázový záznam nebyl během QA změněn. Bez commitu, push či nasazení.

final result: passed for scoped desktop dashboard card polish

## 2026-10-10 — Jemné zpřehlednění živé časové osy

- Upraven pouze existující desktopový Timeline: transparentní otevřená plocha, jednotná jemná 12px ovládací lišta, nejméně 44px hlavní tlačítka, plné popisky Aktivní / Volné / Pozor, přístupná skupina filtrů, čitelnější hodiny a sekundární názvy. Spojitý sticky sloupec sálů má klidný povrch a názvy s lehčím písmem. Hotové fáze i pravé stavové štítky jsou jemnější; namísto diagonálního lesku a brightness filtrů jsou statická zvýraznění. Focus je viditelný, nové přechody respektují reduced motion. Zachován sdílený app canvas, bez nového nadpisu, dat či dekorativních gradientů.
- CSS adapter je scoped výhradně na timeline-desktop-workspace. Jmenný sloupec má stále320px, hodinová plocha58px a řádky stále řídí původní density model. Left/width všech výkonů, barvy aktivních statusů z konfigurace, klinické callbacky, aktuální čas, acute lanes/labels, mobilní kompaktní osa a canonical popups se nemění. Lišta má vyvážené pružné sloupce s kompaktním hodinovým polem; pod880px skutečné šířky modulu se dvojice ARO/akutní požadavky přesune spolu do druhé řady. Původní klinické ARO upozorňování zůstává, odstraněn jen hover-scale utility.
- Reuse dle21st: skutečné projektové tokeny a stávající Timeline komponenty; katalogové hledání nedostupné (fetch failed), bez externí komponenty, závislosti či exportu projektu. Závěrečné 21st review pěti UI souborů:0errors/0warnings/145 informačních token suggestions převážně původního markup. React best-practices review: žádný nový hook, timer, fetch, efekt nebo render-model; malé čisté presentation hooks. Nezávislý audit ověřil scoping a opravu precedence původního acute status media rule.
- 154/154 cílených Timeline, acute timeline/cycle client/API, shared-header a mobile-timeline kontraktů prošlo, včetně6nových design testů. TypeScript noEmit prošel. Jeden dodatečně vybraný lokální PostgreSQL integration test nedokázal vytvořit shared-memory segment v sandboxu; nejde o ověření databáze ani tvrzení o kompletně zeleném repozitáři. Žádná produkční databázová mutace při QA.
- Živý read-only localhost:1280×720,1440×900,1920×1080,1180×768,1024×768,768×1024 a1280×640; všechny15skutečné sály dostupné, hlavní ovladače44px, jmenný rail320px, document scrollWidth bez přetékání a žádná kolize toolbar/clock/status. Tři hotové bloky si zachovaly přesné původní procentní šířky; živý blok se přirozeně prodlužoval se skutečným časem. Filtr Aktivní zobrazil skutečnou externí anestezii, Souhrn/Živě se přepínal a blok sálu4otevřel správný celý dokončený cyklus. Nejnovější drobné vyvážení hodin a širších chybových statusů je po této resize sérii prověřeno source/testy a live1920; není vydáváno za opakovanou plnou resize sérii.
- Při pozdější kontrole čtení akutních dat dočasně ukázalo Nelze načíst, následně se nenačetly sály a po obnovení pomocného tabu se zobrazilo přihlášení. Nebyly zadány přihlašovací údaje. Závěrečný autentizovaný screenshot, opětovné otevření celodenního souhrnu po zániku dat a živý mobilní náhled nebyly dokončeny; mobilní izolace je ověřena6CSS/SSRkontrakty a existujícími mobile tests. Původní snapshot před úpravou je jen QA evidence/private/tmp/timeline-before-20261010.png, nikoli výsledný náhled. Konzole zachyceného QA tabu při kontrole neměla error/warn; to není tvrzení o dostupnosti backendu.
- Viewport override resetován a pomocný tab uzavřen. Bez změny stavu sálu, požadavků, oprávnění, schématu, přihlášení, commitu, push nebo nasazení. Není tvrzeno zrychlení databáze.

final result: passed for scoped desktop Timeline presentation; final authenticated screenshot blocked by login state

## 2026-10-10 — Přehlednější tabulka provozních metrik sálů

- Na žádost podle snímku upraven výhradně osmisloupcový denní přehled ve Statistiky → Přehled. `RoomMetricsTable` je čistá prezentační komponenta: jedno sémantické záhlaví, úplné názvy jako `th scope=row`, klidná souvislá plocha s horizontálními oddělovači, zarovnaná tabulární čísla, procento vedle krátké lišty využití, textový stav s barevným bodem a jednotky `min`. Titulek výslovně odlišuje aktuální stav od metrik vybraného provozního dne. Původní opakované štítky a vertikální mřížka byly odstraněny, včetně nevyužitého globálního CSS.
- Všech osm hodnot i jejich význam a barevná škála zůstávají. Adapter používá původní `dayRooms`, `dayHistory`, `metricsDay` a stejné kalkulátory. Využití není nově odvozeno z aktivních minut/kapacity: první údaj je uvnitř pracovní doby, druhý může zahrnovat přesah. Nulová/missing kapacita zůstává neznámá, nikoli falešné nulové využití; skutečná nulová naměřená hodnota se zachovává. Aktuální emergency/septic příznaky, pořadí sálů, kalendář, reporty, exporty, oddělený mobilní Přehled a všechny klinické callbacky jsou nedotčené. Řádky nejsou nové interaktivní akce.
- Použity existující statistické tokeny a stejný management-table pattern; 21st katalogové hledání skončilo `fetch failed`, bez přebírání externí komponenty, nové knihovny či exportu projektu. Závěrečné `21st review` tří UI souborů: žádný nález. React review: žádné nové hooks, timers, fetches, effects, nested components nebo mutable inputs.
- TypeScript `noEmit` prošel. 52 cílených kontraktů tabulky, denního/hospital rozsahu, detailu, exportů, toolbaru a mobilní izolace prošlo (9 nových). Širší Statistics + mobile-style sada: 192/193 prošlo; samostatně reprodukovaný test `notification impacts keep zero distinct from unavailable` používá pondělní kapacitu a zářijové fixture proti aktuálnímu sobotnímu hodinovému rozsahu a selhává nezávisle na nové tabulce. Mimo rozsah úkolu nebyl opraven ani změněn.
- Vizuální QA skutečné React komponenty a jejího CSS modulu proběhlo v dočasném lokálním SSR harnessu bez backendu, s ukázkovými hodnotami dodaného snímku. 1920×1050, 1440×1050, 1280×1050, 1024×1050 a 768×1050: osm hlaviček, všech 12 ukázkových řádků, žádné přetékání dokumentu ani buněk; na tabletu scrollWidth1040 zůstává uvnitř regionu a názvy jsou sticky. Šipka doprava posunula tabulku o40px, jmenná buňka zůstala na stejném X. Tiskové kontrakty zachovávají opakování záhlaví a nerozdělení řádků. Toto není tvrzení o živých datech, celé aplikaci nebo zařízení v produkci.
- Živý `localhost:3000` zůstal na přihlašovací obrazovce. Nebyly načteny ani zadány přihlašovací údaje; autentizovaný pohled na novou tabulku proto zbývá. Obraz `/private/tmp/room-metrics-qa.0bISud/room-metrics-desktop.png` je výslovně označená izolovaná kontrola komponenty s ukázkovými hodnotami, nikoli screenshot přihlášené aplikace.
- Žádné databázové změny, klinické akce, oprávnění, commit, push nebo nasazení. Předchozí rozpracované změny uživatele zůstaly zachovány.

final result: passed for scoped room-table presentation; authenticated full-app verification blocked by login state

## 2026-10-10 — Třetí dashboard: Carousel

- Přidána skutečná třetí volba Karty / 3D dispozice / Carousel. Karty zůstávají výchozí; volba se ukládá pod stávajícím hospital-scoped klíčem. 3D respektuje původní oprávnění, Carousel nevyžaduje oprávnění ke 3D. Původní grid, mobilní přehled a volitelný Cliniq nejsou přestylovány.
- Samostatná komponenta a CSS modul používají skutečné sloučené cykly provozního dne, enabled workflow, konfigurované barvy, rozpis oborů a pasivní akutní badge. Průhledný střed ukazuje skutečný počet cyklů; emergency/lock/pause zachovávají původní prioritu. Doba fáze a cyklu vychází ze zaznamenaných timestampů v celých minutách, nepoužitelný údaj a připravený sál mají pomlčku. Historický fallback fáze musí patřit aktuálnímu kroku. Žádná ukázková data ani předpokládané klinické hodnoty.
- Jemné portrait glass karty mají klidný statusový kruh, středové zvýraznění, fade na krajích a native scroll-snap. Bez autoplay, vlastního periodického časovače, nové knihovny nebo databázových dotazů. Šipky a Home/End mají hranice, všechny skutečné sály jsou také v zalamovaném rychlém výběru. Focus přivede kartu do středu; reduced motion používá okamžitý přesun a vypíná transitions. Programový smooth přesun neoznamuje všechny mezilehlé sály. Akční tlačítka mají54px základ, tedy nejméně45px i na zmenšených sousedních kartách.
- Živá autentizovaná QA localhost: všech15 sálů, přepnutí na původní Karty, návrat na Carousel, zachování volby po reloadu, End na poslední sál se zakázanou další šipkou, výběr středového sálu a otevření správného standardního detailu externí anestezie. Žádný status, uzamčení, nouze ani akutní požadavek nebyl aktivován. Na závěr zůstal Carousel otevřený; viewport override resetován. Konzole v kontrolovaném tabu bez error/warn.
- Resize768×1024,1024×768,1280×720 a1920×1080: document overflow0, všech15 karet, vybraný střed odchýlen nejvýše1px, nejmenší transformované akční tlačítko45.36px. Telefon390×844 zachoval15 skutečných mobilních karet a nepřetékal; Carousel byl správně skrytý. Nejde o test fyzických zařízení nebo všech výjimečných obsahových stavů. Nouze/uzamčení, chybějící timestampy, změna pořadí/odebrání sálu a neznámý workflow ověřeny pouze bounded testy, nikoli klinickou změnou v živé aplikaci.
- 84 cílených testů Carousel/RoomCard/polish/grid/action geometry prošlo, TypeScript noEmit a diff whitespace kontrola prošly. Celá dashboard sada204/220;16 nezávislých selhání ve stávajících mobile-ios-shell/mobile-overview/mobile-room-detail testech (mj. chybějící mock již existujícího AcuteRoomQueueRibbon a starší CSS očekávání) nebylo v tomto úkolu měněno. Původní sandboxed Turbopack produkční build uvízl bez dalšího výstupu a byl zastaven výhradně jeho vlastní proces. Kontrolní npm run build -- --webpack mimo sandbox následně kompletně prošel: kompilace, TypeScript a všech26 statických stránek. Běžící dev server nebyl zastaven. Žádný deploy, commit, push nebo změna oprávnění.
- Projektově ukotvený postup21st použil aktuální designové tokeny, původní callbacky a AcuteDashboardBadge. Katalogové hledání vrátilo401, bez exportu projektu nebo instalace komponenty. Lokální21st review uvedlo36 informativních hardcoded-color nálezů v zavedené navy/semantic paletě, bez automatických oprav. React kontrola zachovala jediné sdílené minutové hodiny, oddělenou ring komponentu a effect závislý na skutečných ID, nikoli klinických realtime změnách.
- Skutečný screenshot výsledné aplikace: /private/tmp/dashboard-carousel-1791668802392.jpg.

final result: passed for third desktop/tablet dashboard view; existing mobile-test failures and stalled default Turbopack build recorded separately

## 2026-10-11 — Carousel dokola v prostorovém kruhu

- Na explicitní upřesnění uživatele změněn pouze nový Carousel: skutečný CSS3D prstenec (`rotateY` + `translateZ`) se ručně otáčí dokola. Logická otáčka není omezena na indexy; poslední/první sál navazuje jedním krokem v obou směrech a přímý výběr používá nejkratší cestu. Polygonový radius vychází z šířky karty, nikoli pevné šířky stránky. Nula/jeden sál nemá pohyb ani dělení nulou, pro dva sály je konečný radius. Původní Karty, 3D dispozice, mobilní přehled, Cliniq, data a preference nebyly změněny.
- Každý skutečný sál má právě jednu kartu. Zadní/boční karty mají inert a disabled ovládání; jejich celoplošný překryv pouze vybírá sál. Přední karta má původní skutečný název, barvu statusu, průhledný kruh, cykly, doby, personál, rozpis a akutní badge. Po dobu otáčení je její ovládání také inert/disabled, uvolní jej skutečný transform transitionend. Media změna na reduced motion nebo skrytý mobil ukončuje čekání, takže okamžitý režim nečeká na neexistující animaci. Focus opouští kartu před zneaktivněním a rychlé výběry zůstávají dostupné.
- Šipky fungují bez koncové hranice, Home/End stále vybírají první/poslední sál. Horizontální trackpad otáčí, vertikální posouvání/zoom se nepřebírá. Horizontální tah přes hlavní plochu/boční kartu mění výběr a zruší navazující click. Tah začínající na klinickém tlačítku pouze ruší click, nikdy nespustí nouzi či zámek; pointercancel/lostcapture neprovádí výběr. Žádný autoplay, vlastní periodický timer, nová závislost, fetch nebo DB změna.
- Bounded testy pokrývají záporné/kladné otáčky několika celých oběhů, obě hrany, nejkratší cestu včetně dvou-sálové shody, identitu při přeskládání/odebrání, inert/disabled boční ovladače, výběrový překryv bez klinických callbacků, swipy/cancel a gating během transformu versus reduced motion. Testy nejsou vydávány za fyzický touch/trackpad test. Původní klinické callbacky na stojící přední kartě předávají skutečný roomId. React kontrola: transient gesture v refs, sdílené hodiny, žádné další dotazy; nepotřebný scroll RAF a ResizeObserver byly odstraněny.
- Živá autentizovaná QA `localhost:3000`: všech15 skutečných sálů bez duplikace, End→Next→první, Home→Left→poslední→Right→první. Kliknutí na boční PCHO kartu pouze vybralo sál a nechalo dashboard otevřený s focusem na carouselu. Rychlý výběr neurochirurgie fungoval. Zachyceno dočasně zablokované ovládání za pohybu a jeho uvolnění po dokončení. Všechny nevybrané klinické ovladače jsou disabled/inert. Přepnutí na Karty zobrazilo15 původních boxů, návrat obnovil kruhovou variantu. Nouze, uzamčení, statusy ani jiné klinické změny nebyly aktivovány.
- Resize768×1024,1024×768,1280×720,1920×1080: document overflow0, všech15 karet, přední střed odchylka0px, akce54×54px a po ustálení aktivní. Původní mobil390×844 ukázal15 z15 skutečných sálů, bez overflow; Carousel skryt a pohyb uvolněný. Viewport override resetován. Konzole v daném QA tabu bez zachyceného warn/error. Živé testy fyzického telefonu, trackpadu a OS preference reduced-motion nejsou tvrzeny; gesture/reduced-motion kontrakty ověřeny testy.
- Dle21st zachovány původní komponenty/tokeny/paleta; search vrací401 a review pouze34 informačních poznámek o již použitých barevných hodnotách, nula automatických oprav. Nebyla instalována knihovna ani exportován projekt. Typová kontrola, cílená sada a lokální Webpack produkční sestavení prošly. Historických16 selhání širší mobilní sady se tento krok nedotýká; celá sada nebyla znovu spuštěna. Žádný commit, push, deploy, migrace nebo změna oprávnění.
- Skutečný screenshot hotového dashboardu: `/private/tmp/dashboard-orbit-1791670295928.jpg`. Aplikace zůstává otevřená v Carousel variantě.

final result: passed for circular desktop/tablet dashboard Carousel; prior unrelated test/build limitations retained

## 2026-10-11 — Dashboard Carousel podle Nastavení

- Na další upřesnění uživatele nahrazen pouze válcový carousel skutečným vějířovým coverflow z `SettingsPage`: stejné perspektivy1500/1300px, normalizovaná vzdálenost, posuny9/118px, náklon11°, měřítko/útlum sousedů a700ms easing. Stejný24px obrys, navy boční plochy a jemný svislý gradient aktivní karty nyní používají skutečnou barvu statusu. Hlavička, postranní menu a aplikační pozadí zůstávají. Nastavení samotné nebylo upraveno.
- Klinická karta má kvůli obsahu minimálně260px šířky a440px výšky; na běžném PC mají karty stejné proporce jako Nastavení. Názvy jsou úplné, písmo lehké a průhledné statusové kruhy zachovávají skutečné cykly. Doby fáze/cyklu, obory, personál, akutní badge a upozornění pocházejí ze stejných zdrojů. Podrobné údaje sousedů se zobrazí až po výběru, titulky pod aktivní kartou mají fade. Schválené red/amber neonové akce, původní callbacks a případná potvrzení zůstávají; všechna aktivní tlačítka mají44px minimum.
- Šipky přesunuty po stranách doprostřed karet. Nekonečná navigace, Home/End, horizontální gesta a přímý výběr zůstávají, bez automatického otáčení. Malé tečky mají úplný přístupný název a44px cíl. Čítač a tečky jsou v jednom přirozeně zalamovaném sloupci, ne ve dvou překrývajících se absolute pásech. Během pohybu a při odebrání vybraného sálu jsou klinické ovladače inert/disabled; uvolní je pouze vlastní transform dokončené aktivní karty. Reduced motion nečeká na neexistující animaci.
- ResizeObserver měří skutečnou kartu, hlavičku i zalomený selector. Delší obsah nebo malá výška včas přepnou carousel do svisle dostupného toku. Výška fallbacku zahrnuje symetrický odstup od selectoru, nikoli pouze jeden jeho rozměr. Při automatickém klikání na překrytou boční kartu byl odhalen programový horizontální posun hidden stage; `overflow:clip` jej odstranil. Finální živý stage má scrollLeft0 a středovou odchylku0. Fyzické kliknutí na odkrytý kraj sousední karty není tímto krokem tvrzeno jako ověřené; jeho selection-only handler je pokryt bounded testem.
- Živá autentizovaná kontrola porovnala přímo Nastavení s novým dashboardem a použila15 skutečných sálů. End→Next první a Previous z prvního na poslední fungují; ovládání se po animaci uvolní. Rychlý výběr PCHO otevřel správný původní detail, který byl opět zavřen bez změny statusu. Přepnutí na Karty zachovalo původní grid. Na768×1024,1024×768,1280×720 a1920×1080: bez horizontálního přetékání, střed odchylka0, všechny klinické akce nejméně44px, hlavička/selector bez kolize. Čerstvě otevřený1280×600 fallback měl695px stage a23.8px odstup selectoru. Mobil390×844 ponechal Původní design a všech15 sálů, Carousel skrytý a document overflow0. Viewport override resetován; výsledný Carousel zůstává otevřený na1444×1109. Konzole bez zachycených warn/error.
- 23 Carousel testů a96 kombinovaných Carousel/RoomCard/polish/grid/action-geometry testů prošlo. Nové kontrakty kontrolují přesnou geometrii Nastavení, long-content fit, ResizeObserver cleanup/recovery, odebrání vybrané identity, bezpečné transition události a clip/focus. TypeScript noEmit a Webpack produkční sestavení prošly. 21st katalog vrátil401; kontrola dvou UI souborů měla pouze2 informační poznámky o již existujících loader barvách. Reuse skutečné projektové předlohy, bez externí komponenty, závislosti nebo exportu projektu. Historických16 selhání širších mobilních testů nebylo opravováno ani vydáváno za úspěšné. Delší obsah a reduced motion ověřeny modelovými/komponentovými testy, nikoli klinickými zápisy nebo změnou OS preference.
- Žádný status, nouze, zámek, personální přiřazení, akutní požadavek, oprávnění ani databáze nebyly během QA změněny. Bez commitu, push či deploymentu. Skutečný screenshot hotové aplikace je v dočasném souboru předaném uživateli, nikoli návrh s vymyšlenými daty.

final result: passed for Settings-matched desktop/tablet dashboard Carousel; prior unrelated limitations retained

## 2026-10-11 — Návrat na uložený dashboard bez probliknutí Karet

- Příčina: App při odchodu do jiného modulu nebo detailu sálu odmontuje DashboardModule. Původní pevná inicializace `cards` se proto při každém návratu vykreslila před pasivním načtením uložené volby.
- Uložený pohled se nyní načítá v lazy inicializaci stavu; změny nemocnice/oprávnění se synchronizují v layout efektu před malováním. Zachován stávající hospital-scoped klíč a prostorová oprávnění. Čtení/zápis blokovaného úložiště má bezpečný fallback. Client-only dynamic import v App zůstává stejný, bez SSR/hydration změny, časovače, nového loaderu nebo skrývání karet pomocí CSS.
- Žádná změna designu, carousel animací, mobilního/Cliniq zobrazení, klinických callbacků, dat nebo API. Reuse stávajícího rozhraní dle21st; katalogové hledání401, review pouze2 informační poznámky o původních loader barvách, bez warning/error. Nezávislý read-only audit potvrdil rozsah a opravu.
- Nových7 regresních testů vykonává skutečný DashboardModule s bounded hooks: první render a opakovaný remount, Cards/Carousel/Spatial výchozí volby, nemocniční izolaci, odebrání prostorového oprávnění před paint, ukládání ruční volby, blokované úložiště a non-browser fallback. Společně s Carousel/RoomCard/polish/grid/action-geometry prošlo103/103 testů; TypeScript noEmit prošel. Celá sada repozitáře ani nový produkční build v tomto malém lifecycle fixu nebyly spuštěny.
- Autentizovaný localhost: skutečné návraty z Nastavení, Timeline a otevřeného/zavřeného původního detailu TRAUMATOLOGIE1 zobrazily `Carousel` pressed, `Karty` unpressed, carousel wrapper přítomný a grid nepřítomný. První frame je ověřen regresním komponentovým testem, ne tvrzením o high-speed screen recording. Výsledný screenshot `/private/tmp/dashboard-carousel-restoration-1791711121968.png`. Žádná klinická akce, DB mutace, přihlášení, commit, push nebo nasazení.

final result: passed for saved dashboard view restoration without the default Cards first render

## 2026-10-11 — Rychlejší uložení akutního požadavku

- Rozsah pouze serverová cesta `/api/acute-requests`, společný helper oprávnění/DTO a regresní testy. Design formuláře, klinické stavy, oprávnění, klientská success cesta, pořadník a databázové funkce se nemění. Předchozí rozpracované změny jsou zachované.
- Read-only `pg_stat_statements` skutečného projektu operatingroom: `apply_acute_request_command` 38 volání, průměr 62,266 ms, maximum 233,450 ms; snapshot 8169 volání, průměr 16,106 ms, maximum 652,528 ms. Jde o historické časy samotného provedení v PostgreSQL, nikoli měření latence prohlížeče či benchmark nové verze. Samotný zápis nevykazoval dlouhou SQL exekuci; v kódu byly nalezené zbytečné sériové síťové fáze.
- Účet a modul se čtou souběžně; po členství, tab-scope a CSRF se POST validace sálu překrývá s těmito kontrolami. Zápis čeká na všechny souhlasy a zachovává autorizační precedence. Žádná cache oprávnění, odstranění guardu nebo rozšíření grantů. Doplňující audit je stále tenant-scoped, dávka100, souběh nejvýše3 a jeden společný AbortSignal rozpočet1500ms. Záznamy ani pořadí se nevymýšlejí; při timeoutu chybějící původní pozice zůstane null. Již potvrzený POST se kvůli pomocnému čtení nehlásí jako chyba.
- Klient již zveřejňuje autoritativní POST snapshot s `revalidate:false`; nebyl přepsán. Nové stateful testy potvrzují žádný optimistický úspěch před POST/JSON, bez následného GET, jednu cache publikaci, blokaci duplicity, verzi dalšího příkazu, selhání bez opakování zápisu a konflikt s jediným GET. Serverové testy řízenými promises ověřují skutečné překrytí čtení, čekání na všechny kontroly, chybovou precedence, dávkový limit a společný timeout/cleanup. Instalovaný skutečný Supabase/PostgREST builder byl testován se syntetickým fetch transportem bez sítě.
- Způsob práce dle Supabase best practices: měření skutečné SQL exekuce, odstranění sekvenčních dotazů bez oslabení čerstvých přístupových kontrol; žádná neodůvodněná migrace nebo index. Anonymní `Server-Timing` poskytuje fáze guard/db/response bez klinických či přihlašovacích údajů. Údaj1500ms není slibem maximální doby skutečného POST.
- TypeScript noEmit bez incremental cache a whitespace kontrola prošly. Všech23 nedatabázových akutních testových souborů bylo ověřeno (241 testů); serverové scénáře22/22 a klientské9/9. Databázové integrační soubory ani celý repozitář/build v této optimalizaci nebyly spouštěny; SQL není změněno. Živý autentizovaný modul na localhost zůstává bez zobrazené chyby a filtrovaná konzole nemá zachycené acute warn/error. Skutečný nový požadavek nebyl při QA zadán, takže end-to-end čas produkčního uložení není tvrzen jako změřený.
- Bez klinických zápisů, změny schématu, commitu, push či deploymentu.

final result: passed for bounded server concurrency and confirmed-save client regressions; live clinical POST timing deliberately not measured
