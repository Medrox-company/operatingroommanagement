# Předání kontextu: design aplikace a časové osy

Datum: 21. října 2026, Europe/Prague.
Větev pro pokračování: `medrox/timeline-design-continuation`.
Výchozí větev: `zlepseni/rychle-vyhry`.
Výchozí commit: `7d68096489ce43db4cae3eb374b6da0442e7ca3b`.

## Co uživatel požaduje

Tato větev uchovává zadání a vizuální podklady pro další vývoj. Dosavadní práce v této konverzaci byla **pouze návrh designu**, nikoli implementace redesignu. Poslední požadavek před založením větve byl zachovat barvy statusů a levého menu z reálné aplikace a navrhnout několik dalších variant. Žádná z posledních tří variant dosud nebyla vybrána. Založení větve není souhlas s implementací některého návrhu.

## Závazné preference a opravy

- Navazovat na reálnou aplikaci Operatingroom Management, její navigaci, data a klinické workflow.
- Zachovat přesné barvy a významy statusů z konfigurace nemocnice. Nenahrazovat je novou paletou ani pevnými barvami odhadnutými z mockupů.
- Zachovat reálné levé menu: tmavě modrý podklad, šedé neaktivní ikony, bílá aktivní ikona kalendáře na tlumeném šedofialovém zaobleném podkladu, stávající pořadí a funkce. Nepřidávat nové položky nebo barevně svítící aktivní stav.
- Vzhled má připomínat iOS/iPadOS a využít větší rozlišení: čitelná systémová typografie, pohodlné dotykové cíle, jasná hierarchie a účelné využití prostoru.
- Modré až fialové ladění a jemné světlo jsou uživateli bližší než příliš plochá, silně zjednodušená varianta. Minimalismus nesmí odstranit identitu produktu.
- Primární reference časové osy je iPad Pro 13, 2752 × 2064, poměr 4:3. Nezaměňovat fyzické rozlišení obrázku za logické rozměry ovládacích prvků. Generované obrázky mohou mít jiné skutečné rozlišení.
- Zachovat oprávnění, autentizaci, skutečné klinické handlery, fázovou logiku, prioritu nouze, zámek, pauzu a existující detail sálu.
- Pravidla pro volitelný mobilní Cliniq a původní výchozí design z kořenového AGENTS.md nadále platí.

## Hlavní cíl časové osy

Usnadnit orientaci v průběhu sálů, listování po dnech a čtení historie. Současný snímek ukazuje velký 24hodinový rozsah s mnoha prázdnými místy, drobnými úseky a přechodem přes půlnoc. Jde o časovou osu klinických fází, nikoli o nový rezervační kalendář pacientů.

K návrhu byly navrženy tyto možnosti; jejich přesné provedení zatím není odsouhlasené:

- Viditelné předchozí/následující datum, kalendář a týdenní pás dnů.
- Oddělit `Dnes` (návrat na datum) a `Teď` (vycentrování aktuálního času).
- Přepínat viditelný rozsah, například 2/4/8/24 hodin; nepřeplnit lištu všemi nástroji najednou.
- Připnout názvy sálů a časové pravítko při posouvání.
- Rozlišit skutečný průběh a odhad plnou výplní / přerušovanou hranou, s legendou. Odhad nesmí vypadat jako jistý budoucí stav.
- Jedna linka aktuálního času pro dnešek; v historickém dni nepředstírat živý stav.
- Zřetelně uvést datum při přechodu přes půlnoc. Při implementaci ověřit místní čas, letní čas a intervaly přes více dnů.
- Zachovat filtry Vše / Aktivní / Volné / Pozor a význam stávajících indikátorů. Neodstraňovat upozornění jen kvůli vzhledu.
- Detail úseku může být v malém popoveru nebo bočním panelu: fáze, sál, začátek, konec, délka a cesta do standardního detailu.
- Zámek, pauza a nouze mají mít text i ikonu; červená nesmí být jen dekorace.

## Poslední sada návrhů: přesné číslování

Čísla níže odpovídají pořadí zobrazení posledních tří obrázků v chatu, nikoli starším sadám. Všechny tři jsou **nevybrané**.

| Varianta | Soubor | Směr |
| --- | --- | --- |
| 1 | [latest-1-daily.png](assets/latest-1-daily.png) | Denní osa, datum se šipkami, rozsah 8 hodin, původní menu a kompaktní stavové štítky. |
| 2 | [latest-2-week-strip.png](assets/latest-2-week-strip.png) | Týdenní pás pro rychlý přechod mezi dny, klidnější a užší úseky. |
| 3 | [latest-3-context-detail.png](assets/latest-3-context-detail.png) | Čtyřhodinový výřez a malý detail vybraného úseku přímo v kontextu osy. |

Při pokračování nejdřív určit, zda uživatel vybírá konkrétní obrázek, žádá kombinaci, další návrhy, nebo implementaci. Číslo ze starší sady není číslem z této sady.

## Autoritativní reference

- [Reálná časová osa](assets/reference-real-ipad-timeline.png): zdroj barevného a navigačního vzhledu pro toto zadání. Původní soubor byl `Simulator Screenshot - iPad Pro 13-inch (M5) - 2026-10-19 at 01.50.38.png`.
- [Uživatelem preferovaný dashboard](assets/reference-preferred-dashboard.png): uživatel jej znovu přiložil slovy „tato verze byla lepší, více udělej ios design ale pro větší rozlišení obrazovky“. Odkazuje na styl, nikoli na schválení všech údajů a barev v mockupu.

Skutečná aplikace a její nakonfigurované statusy mají přednost před generovanými obrázky. V mockupech se objevují odchylky ve významu barev, návaznosti fází, časech, kalendáři i textu. Nesmějí být převzaty jako klinická specifikace nebo skutečná data. Vygenerované názvy a údaje jsou ilustrační.

## Vývoj návrhů a starší alternativy

Uživatel dodal skutečné screenshoty iPadu/iPhonu, přihlašovací obrazovky a video. Návrhy se postupně vrátily od obecného redesignu k identitě reálné aplikace. Tyto starší návrhy jsou uloženy pro kontext, ne jako vybrané zadání:

| Soubor | Kontext |
| --- | --- |
| [earlier-dashboard.png](assets/earlier-dashboard.png) | Modrý dashboard s šesti kartami; totožný obsah s později znovu přiloženou preferovanou referencí. |
| [earlier-timeline.png](assets/earlier-timeline.png) | Starší návrh osy s rezervacemi; nepřebírat jeho pacientský obsah ani klinické významy. |
| [earlier-room-detail.png](assets/earlier-room-detail.png) | Kruhový detail sálu; ilustrační a s nepřesnostmi v pořadí fází. |
| [earlier-calendar.png](assets/earlier-calendar.png) | Starší plánovací kalendář; ilustrační data a význam barev nejsou specifikací. |
| [earlier-minimal-dashboard.png](assets/earlier-minimal-dashboard.png) | Ještě minimalističtější dashboard; uživatel následně označil předchozí modrou verzi za lepší. |
| [earlier-ipados-dashboard.png](assets/earlier-ipados-dashboard.png) | Široký dashboard s textovým sidebar menu; požadavek zachovat reálné levé menu tento směr pro časovou osu přebíjí. |
| [previous-1-daily.png](assets/previous-1-daily.png) | První explorace denní osy před opravou navigace/barvení. |
| [previous-2-calendar.png](assets/previous-2-calendar.png) | Explorace historie a kalendáře před opravou. |
| [previous-3-inspector.png](assets/previous-3-inspector.png) | Explorace osy s trvalým bočním panelem před opravou. |

## Kde pokračovat v kódu

Pouze orientační mapa ověřená při založení větve; nejde o audit nebo schválení stávajících rozpracovaných změn:

- `components/TimelineModule.tsx`: hlavní modul, živá data, zobrazení, minimapa a integrace historie.
- `components/timeline/TimelineCommandBar.tsx`: existuje tlačítko Historie s popisem listování po dnech; nenavrhovat paralelní implementaci bez kontroly současného chování.
- `components/timeline/TimelineHistory.tsx`: historie.
- `components/timeline/TimelineAxisHeader.tsx`, `TimelineRoomRow.tsx`, `RoomDetailPopup.tsx`: pravítko, řádky a detail.
- `components/timeline/constants.ts`, `timeline-refinement.css`: současné vizuální tokeny a styling; tokeny UI nejsou autoritou pro nemocniční workflow barvy.
- `contexts/WorkflowStatusesContext.tsx`: `getStatusColor(index)` používá `getStatusByIndex(index)` a `status.accent_color || status.color || '#6B7280'`. Indexy vycházejí z aktivní sekvence; zachovat tuto logiku.
- `components/Sidebar.tsx`: skutečné levé menu. Zachovat jeho oprávnění, pořadí a navigační handlery.
- `components/mobile/MobileTimelineView.tsx`, `MobileTimelineRoomDetail.tsx`: stávající mobilní větev.
- `lib/timeline-*`, `tests/timeline/`, `tests/dashboard/mobile-timeline-*`: související výpočty a ověření.

Před psaním kódu dodržet kořenový AGENTS.md včetně relevantních lokálních Next.js příruček. Při implementaci zkontrolovat stávající funkce historie, realtime, oprávnění, nemocniční izolaci a výkon posouvání; teprve potom rozhodovat, co doplnit.

## Stav repozitáře při založení větve

Zdrojová větev byla o jeden commit před svým upstreamem. Pracovní adresář obsahoval mnoho starších necommitovaných změn: App, přihlášení, dashboard, timeline, mobilní CSS, správu, statistiky, testy, ikony a iOS release podklady. Větev vznikla ze současného HEAD ve stejném pracovním adresáři; žádný reset, stash nebo přepis se neprováděl.

**Tyto původní změny zůstávají necommitované v pracovním adresáři; samotné založení větve je nezálohuje do Git historie.** Commit tohoto předání obsahuje jen dokumentaci, odkaz v AGENTS.md a vizuální reference. Nezahrnovat cizí rozpracované soubory automaticky do implementačního commitu. Ignorované soubory, lokální konfigurace, závislosti a klinická data se tímto předáním nearchivují.

Větev i commit jsou lokální, dokud není výslovně provedeno odeslání na remote. Tento dokument uchovává strukturovaný kontext a dohledatelné obrázky; není úplným doslovným exportem chatu.

## Další původní zdroje

Tyto reference z uživatelských příloh zůstávají na původních místních cestách; nejsou všechny zkopírované do Git:

- `/Users/jaroslavjedlicka/Desktop/Screeny/`: původní iPad/iPhone screenshoty z 19. října 2026, `1.png`, `BA4651A8-7795-472C-B290-38D73279D015.PNG`, `Prémiové rozhraní FORM se správou systému.png`, snímky ze 17.–18. října.
- `/Users/jaroslavjedlicka/Desktop/Screeny/ScreenRecording_10-18-2026 08-31-22_1.mov`: původní video.
- `/Users/jaroslavjedlicka/Desktop/MOCKUP/`: dřívější externí inspirační obrázky a screenshot přihlášení.
- Originály generovaných návrhů jsou v `/Users/jaroslavjedlicka/.codex/generated_images/01a020bb-6261-7152-8eaa-49ba81b1cac8/`. Kopie obrázků z navazující série této konverzace jsou zde v `assets/` a nejsou závislé na dočasné schránce ani mezipaměti Codexu.

## Doporučený začátek dalšího chatu

„Pokračuj ve větvi medrox/timeline-design-continuation. Nejdřív přečti AGENTS.md a docs/design/timeline-2026-10-21/README.md, otevři poslední tři návrhy a reálnou referenci. Zachovej skutečné barvy statusů a původní levé menu. Zatím pokračujeme návrhem designu; implementaci zahaj až na můj požadavek.“
