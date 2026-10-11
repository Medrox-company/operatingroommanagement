# Akutní operační požadavky

Modul je implementován v hlavní aplikaci, nikoli jako samostatný klinický systém. Schválený vzhled používá dva sloupce jemných modrých karet; telefon zobrazuje jeden sloupec. Podklad a navigace aplikace se nemění.

## Zapnutí a oprávnění

V postranním menu Nastavení → karta Nastavení → Správa modulů zapne superadministrátor **Akutní výkony** pro vybrané zařízení a přidělí přístup rolím. Výchozí nastavení je vypnuté, i pro superadministrátora. Nová zařízení nikdy nezdědí zapnutý akutní příjem. Při vypnutí se zobrazí upozornění na předání čekajících požadavků; data a audit zůstávají uložené.

Role `superadmin`, `admin`, `aro`, `cos`, `primar` mohou při přiděleném přístupu zadávat a měnit požadavky. Ostatní přidělené role mají pouze čtení. Počáteční povolené provozní role jsou průnikem klinických rolí s dosavadním přístupem zařízení k časové ose; migrace sama nikomu nerozšíří provozní přístup.

## Význam informací

- Ve formuláři nového požadavku se sál vybírá z kompaktních boxů s přesným názvem ze stejného seznamu a ve stejném uloženém pořadí jako Nastavení → Operační sály. Žádné názvy, zkratky ani místnosti se neodvozují nebo nevymýšlejí; hodnotou volby je skutečné ID sálu aktuálního zařízení. Výběr doplní nastavený obor a navržený sál; samotný výběr není rezervace ani potvrzení dostupnosti. Starší požadavek bez navrženého sálu si při editaci ponechá původní obor, dokud uživatel výslovně nezvolí sál. Návrh lze při editaci také zrušit. Izolovaný offline QA náhled bez napojení na seznam sálů nenabízí fiktivní náhrady.
- Formulář create/edit je široký dvousloupcový popup: výkon, odhad, sály a popis vlevo; grafické priority s úplnými klinickými popisy vpravo. Interní reference, čas klinického rozhodnutí a celá sekce termínu/návrhu zařazení byly na žádost uživatele odstraněny. Nový požadavek je neposílá vyplněné; editace zachovává přesné starší hodnoty, aniž by přepisovala jejich čas nebo mazala historii. Na běžných počítačových obrazovkách se všech 15 aktuálních sálů a ovládání vejde bez rolování; malý telefon či zvětšení textu zachovává přístupné posouvání.
- Naléhavost volí lékař: emergentní/neodkladný, urgentní, časný/odložitelný. Nejde o automatickou triáž. Univerzální časové limity nejsou předvyplněné; starší evidované termíny zůstávají v detailu a historii.
- Provozní pořadí je oddělené od naléhavosti. Každý posunutý požadavek má původní a nové pořadí, autora, čas a důvod; i automatické uzavření mezery po zrušení či uzavření je auditované.
- Čekání od přijetí do aplikace používá serverový čas, běží nepřetržitě včetně víkendů a zobrazuje celé minuty. Pokud starší záznam obsahuje čas klinického rozhodnutí, zůstává oddělené měření v detailu.
- Odhad je pouze chirurgická část výkonu. Nezahrnuje nedoloženou anestezii, odjezd ani úklid. Formulář nabízí tři boxy: **Do 30 min**, **Do 60 min**, **Více než 60 min**. První dvě nové volby ukládají horní odhad 30/60 minut; třetí na výslovnou žádost uživatele používá předpokládaných **120 minut**, bez zadávání přesného času. Hodnota je označena jako odhad pro časovou osu, nikoli naměřená délka. Blok při volbě nad 60 minut trvá dvě hodiny od zadání požadavku a na okraji zobrazeného okna se korektně ořízne. Při editaci zůstává starší odhad zachován, dokud uživatel nezmění volbu; žádné hromadné přepisování historie. Nový formulář nemá předvolenou délku.
- Timeline u požadavku zobrazuje **pořadí při zápisu** jako štítek `#N` vlevo a v odhadovém bloku. Číslo čerpá z neměnného auditního záznamu `create.new_position`: jde o původní pozici při vložení do pořadníku, ne dnešní ručně změněné pořadí, klinickou prioritu nebo globálně unikátní identifikátor. Pozdější přeřazení, uzavření jiného požadavku ani ořez časového okna číslo nepřepíše. Server použije dostupný audit a případný chybějící starší zápis načte v dávkách po 100 ID jen pro autorizované zařízení; chybějící údaj poctivě označí pomlčkou, nikdy ho nevymyslí z aktuálního pořadí. Bez migrace nebo změny klinických záznamů.
- Časová osa počítače, telefonu i akutního modulu zobrazuje aktivní požadavek u vybraného sálu od skutečného serverového času zadání `receivedAt`. Ruční `proposedStartAt` již není podmínkou zobrazení ani neposouvá tento blok; starší hodnota zůstává uložená v detailu. Konec odhadu je `receivedAt + estimatedDurationMinutes`. Změna pořadí, editace ani živý čas neposouvají okamžik zadání. Samostatný řádek má jemně podbarvený popisek podle urgence (emergentní růžovočervená, urgentní zelená, časný modrá), světlý čitelný text a odhadový blok přes celou výšku řádku bez šrafování. Blok uvádí odhad a minuty; v nejkratším zobrazení zůstane jen číslo, zatímco celý údaj je v levém popisku a přístupném popisu. Šířka vždy odpovídá uloženému odhadu. Jde o **Návrh — nepotvrzeno**, ne skutečný začátek operace či rezervaci. Skutečné fáze, kapacita a statistiky se nemění. Požadavky bez vybraného sálu zůstávají viditelné v seznamu nepřiřazených; neumisťují se do vymyšlené místnosti. Uzavřené/zrušené požadavky jsou nadále v historii, ne mezi aktivními požadavky.
- Převzetí koordinace není potvrzení dostupnosti sálu ani zahájení operace. Uzavření požadavku samo nevytváří dokončený výkon ve statistikách.
- Emergentní péče vyžaduje také přímé předání dle místního postupu. Formulář nesmí zdržet péči. Do textových polí nevkládejte přímé identifikátory pacienta.

## Box akutních požadavků v Timeline

V horní liště běžné počítačové Timeline je vedle **ARO statusu** stejně velký box **Akutní požadavky** s aktuálním počtem čekajících požadavků. Nahrazuje původní samostatný textový řádek. Kliknutí nebo Enter otevře akutní modul bez změny pořadí či klinického stavu. Na užším počítačovém zobrazení se oba boxy přesunou společně do druhého řádku lišty. Při načítání nebo chybě se nezobrazuje falešná nula; nepřiřazené požadavky jsou zahrnuté a jejich počet má přístupný popis. Box respektuje zapnutí modulu a oprávnění, mobilní přehled zůstává nezměněný. Odhadové bloky nadále nejsou rezervací sálu.

## Detail sálu z akutního požadavku

Výběr jiného než prvního dosud nepřiřazeného čekajícího požadavku zobrazí **Není dodrženo pořadí výkonů**. Kontrola vychází z aktuálního ručně spravovaného provozního pořadí, nikoli z naléhavosti nebo čísla při zápisu. V následujících požadavcích zůstane celý čekající seznam včetně přeskočených položek a vybraného výkonu označeného „Vybráno · mimo pořadí“. Vybraný uzel se odhalí pouze posunutím této lišty; stránka ani pořadník se neposunují. Již přiřazený cyklus není bez historických důkazů označován jako porušení pořadí.

Kliknutí na barevný požadavek v desktopové nebo mobilní Timeline otevře běžný detail skutečně přiřazeného sálu. Pod jeho názvem je jemný průsvitný přehled: vybraný výkon s naléhavostí, odhadem a původním číslem zápisu, vedle něj následující aktivní požadavky napříč sály podle aktuálního provozního pořadí. Každá položka uvádí přesný nastavený název sálu; dostupný přiřazený sál lze otevřít přímo. Časy zahájení se nevymýšlejí a nepřiřazený nebo odstraněný sál není navigačním tlačítkem.

Standardní ovládání fází, personálu, pauzy, hygienického režimu a notifikací se nemění. **Pouhé otevření či přepnutí požadavku nezahajuje operaci ani nemění klinický záznam nebo pořadník.** Popisek „Vybraný akutní výkon“ je zatím pouze kontext obrazovky. Při výslovném potvrzení přechodu **Sál připraven → Příjezd na sál** se jedním databázovým zápisem zahájí skutečný cyklus a uloží neměnná vazba vybraného požadavku na tento cyklus a objednaný sál. Zůstává uložený název výkonu, urgence a původní číslo zápisu. Souběžná nebo neplatná změna nezahájí náhradní neoznačený cyklus.

Již rozběhnutý jiný cyklus se zpětně nepřiřazuje: detail výslovně uvádí „Vybráno pro další cyklus“. Dokončení je doloženo standardním záznamem konce cyklu při návratu do **Sál připraven**, tedy po celém cyklu včetně úklidu, i když přechod provede jiná stanice. V běžném skutečném řádku Timeline se poté zobrazí `#N · Akutní · název výkonu`, s drobným bodem urgence. Zůstávají původní barvy fází, skutečné délky a souhrn statistik celého cyklu. Mobil používá kompaktní číslo a bod s úplným přístupným popisem. Vazba přetrvá obnovení aplikace; časový dotaz zahrnuje všechny relevantní cykly, ne pouze posledních 200 požadavků. Pokud běžné rozhraní překryje řádek režimem nouze či uzamčení, zachovává se dosavadní chování tohoto překryvu, uložené označení se nemaže.

Po přiřazení se požadavek na Timeline neopakuje jako odhadový návrh a není nabízen mezi následujícími neprovedenými cykly. Samotné dokončení cyklu **automaticky neuzavírá ani nepřeřazuje pořadník**; jeho uzavření zůstává samostatnou auditovanou akcí. Zavření detailu vrací stejnou časovou osu a fokus na původní položku. Změna zařízení, účtu nebo oprávnění otevřený kontext zruší.

## Označení v dashboardu

Karta skutečně přiřazeného sálu na počítači i telefonu uvádí čekající akutní požadavek: naléhavost, název výkonu, aktuální pořadí a počet dalších požadavků pro stejný sál. Probíhající akutní cyklus má samostatné označení pouze při přesné shodě uložené vazby a skutečného začátku aktuálního cyklu; běžný výkon se za akutní neprohlašuje. Dokončená vazba vyřadí požadavek z čekajícího označení i mimo aktuální časové okno Timeline, aniž by automaticky uzavírala pořadník. Data jsou společně načtená pouze pro ověřené zařízení, zapnutý modul a odpovídající oprávnění; každá karta nemá vlastní databázový dotaz. Při neověřených datech se nevymýšlí čekající ani probíhající stav. Označení je pasivní a nemění standardní otevření detailu sálu ani klinické ovládání.

## Provedené výkony v akutním modulu

Přehled **Akutní výkony** rozlišuje čekající požadavky, zahájené cykly a **Provedené výkony**. Označení **Provedeno** vyžaduje skutečný koncový čas a koncovou událost neměnné vazby na celý cyklus sálu. Nestačí ukončení chirurgické části, odjezd pacienta ani ruční uzavření požadavku. Dokončený cyklus proto nezůstává mezi čekajícími ani ve výpisu odhadových návrhů, i když jeho požadavek nebyl ručně uzavřen.

V záložce **Požadavky** jsou pro vybraný den nejprve čekající požadavky v ručně nastaveném pořadí, pod nimi zahájené cykly a nakonec provedené výkony. Pokud v daném dni nic nečeká, zobrazí se nejprve informace o prázdném denním pořadníku; zahájené a provedené cykly zůstávají dostupné níže. Čekající a zahájené požadavky z ostatních dnů jsou dostupné v **Historii** a nejsou automaticky uzavírány.

Provedená karta a detail uvádějí skutečný sál, uložený název výkonu, naléhavost a číslo při zápisu, čas zahájení a dokončení včetně úklidu a délku **celého cyklu** v celých minutách. Názvy a urgence při provedení se nepřepisují pozdější editací návrhu. Čekání navázaného požadavku končí skutečným zahájením, nikoli aktuálním časem.

Historie cyklů má samostatný výběr posledních 30, 90 nebo 365 dnů. Výchozích 30 dnů není dvoudenní okno Timeline; skutečné cykly se načítají přímo z uložených vazeb i tehdy, když původní požadavek není v omezeném 200záznamovém snapshotu. Navíc se zachovají vazby dosud ručně neuzavřených požadavků mimo vybrané období, aby již provedený výkon nikdy znovu nevypadal jako čekající. Starší data se nemažou. Zahájení bez doloženého konce se označuje jen **Cyklus zahájen**, ne jako provedení.

Obnovení při změně sálu či koncové události používá existující ověřený odběr událostí a společný dotaz, ne dotaz na každé kartě. Při chybě ověření cyklů přehled upozorní na nedostupná data místo falešného čekajícího nebo dokončeného stavu. Ruční uzavření, ručně spravované pořadí a jeho audit se automaticky nemění; změna pořadí stále pracuje s úplným aktivním pořadníkem.

## Denní přehled a kalendář

Stránka používá stejné umístění nadpisu a kompaktní souhrnnou lištu jako Management a Notifikace. Zachovává původní pozadí, navigaci, barevné karty naléhavosti a popupy Timeline. Vpravo je společný kalendář ze Statistik; na užší obrazovce se přesune pod obsah bez vodorovného přetečení stránky.

**Požadavky** a **Časová osa** se zobrazují jen pro vybraný den, výchozí je dnešek. Den určuje skutečný neměnný čas zadání `receivedAt`, mezi 00:00 a 24:00 v `Europe/Prague`; nejde o provozní den od 07:00 ani datum poslední editace či dokončení. Kalendář, šipky, přímý výběr data a Dnes/Včera sdílejí stejný výběr. Lze volit posledních 365 kalendářních dnů, nikoli budoucnost; výběr zůstává platný i při přechodu přes půlnoc. Zvýraznění dnů a denní souhrny čerpají jen ze skutečně načtených požadavků a při chybě či načítání neuvádějí falešnou nulu.

**Historie** zachovává ostatní dny: stále čekající požadavky, dosud zahájené cykly, doložené provedené výkony, uzavřené/zrušené požadavky a audit změn. Čekající položky z ostatních dnů mají také upozornění s počtem a přímým otevřením Historie. Celé provozní pořadí, jeho verze a editace zůstávají nezávislé na denním filtru; nic se automaticky nepřeřazuje, neuzavírá ani nemaže. Výběr 30/90/365 dní pro historii cyklů zůstává zachovaný. Společný dotaz zahrnuje vybrané období historie i zvolený den a zachovává všechny aktivní vazby potřebné k ověření skutečného stavu.

U starších cyklů, jejichž původní požadavek není v dostupném snapshotu, se může použít skutečný den zahájení. Řádek i přehled toto výslovně označují; nejde o vymyšlený čas zadání a takový cyklus nevytváří domnělý počet požadavků ani aktivitu kalendáře. Omezení načteného archivu na posledních 200 ukončených požadavků a dostupný audit zůstává viditelně vysvětlené; prázdný den není tvrzením o úplnosti staršího archivu.

Zadání nového požadavku z historického dne vždy používá skutečný aktuální serverový čas a po úspěšném uložení přepne přehled na dnešek. Nedochází ke zpětnému datování. Editace existujícího požadavku zachovává jeho původní den zadání. Výběr dne je oddělený od živého měření čekání a při přepnutí zdravotnického zařízení se nepřenáší do jiného zařízení.

## Kruhová časová osa akutního modulu

Záložka **Časová osa** uvnitř akutního modulu nově používá propojené průhledné kruhy s jemným obrysem v barvě naléhavosti. Čekající kruh uvádí celé minuty od skutečného přijetí požadavku. Zahájený cyklus je označen hodinami a textem **Cyklus zahájen**, provedený značkou a textem **Provedeno**. Kruhy nejsou procentuálním grafem ani automatickým posouzením klinické naléhavosti; čekání se nepoměřuje vůči odhadu chirurgické doby. Čekání končí doloženým začátkem celého cyklu sálu, nikoli nedoloženým začátkem chirurgické části.

Každý uzel uvádí skutečný název výkonu a sálu, naléhavost, původní číslo zápisu a příslušný zaznamenaný čas: zadání u čekajícího, zahájení u rozběhlého a dokončení u provedeného. Chronologie vychází z tohoto zobrazeného času; rozestupy jsou výslovně schematické, ne časovým měřítkem ani ručně spravovaným pořadím. Odhad zůstává u čekajícího označený jako nepotvrzený. U provedeného je samostatně skutečná délka celého cyklu; doložené historické čekání se přidá pouze s dostupným platným časem přijetí. Chybějící čas přijetí historického požadavku se nevymýšlí.

Čekající požadavky a zahájené cykly jsou v hlavní ose s velkými kruhy. **Provedené výkony** jsou pod nimi v kompaktních boxech pod sebou, vždy jeden na řádek. Box obsahuje kruh o průměru 76 px, značku dokončení, úplné názvy a skutečné časy. Každá skupina zachovává vlastní časové pořadí. Prázdný spodní přehled se nezobrazuje; pokud jsou pouze provedené cykly, hlavní část stručně oznámí, že žádné výkony nečekají ani nejsou zahájené.

Toto nahrazuje původní textový seznam návrhů pouze v akutním modulu; běžná desktopová a mobilní Timeline se nemění. Na počítači je hlavní osa vodorovná s přístupným vnitřním posouváním, na telefonu svislá posloupnost. Boxy provedených se na počítači i telefonu zobrazují pod sebou bez posouvání do stran; na užších obrazovkách se jejich údaje zalamují uvnitř boxu. Nepřiřazený požadavek má vlastní kruh s označením **Bez přiřazeného sálu**. Historie skutečných cyklů používá stávající výběr 30/90/365 dní a zahrnuje i cykly bez původního požadavku v omezeném archivu. Kliknutí na kruh otevře dosavadní detail nebo readonly detail doloženého cyklu; nikdy samo nezahájí výkon ani nezmění pořadí nebo klinická data.

## Ukládání a bezpečnost

`/api/acute-requests` používá ověřenou relaci, členství v zařízení, čerstvý aktivní účet a aktuální role/modul. `X-Acute-Hospital-Id` musí odpovídat autoritativně ověřenému zařízení cookie; nesoulad odmítá před čtením či zápisem. Přepnutí zařízení odpojí otevřené formuláře. POST má same-origin ochranu a validaci vstupů.

Serverové databázové funkce pracují v transakci s uzamčenou verzí pořadníku. Souběžná změna vyvolá konflikt místo přepsání cizí práce. Tři nové tabulky mají RLS a odebraná přímá klientská práva; RPC jsou `SECURITY INVOKER`, pouze pro `service_role`. Audit nemá provozní UPDATE/DELETE a změnám brání i trigger.

Vazby cyklů mají oddělenou server-only tabulku s RLS. Start RPC ověřuje aktuální účet, členství, oba zapnuté moduly/oprávnění, objednaný sál, připravený stav a verzi sálu; opakovaný stejný start je idempotentní. Dokončovací interní trigger může doplnit pouze přesný skutečný koncový záznam, nikoli přepisovat vazbu. API `/api/acute-requests/cycles` kontroluje relaci, zařízení, role a same-origin při zápisu. Reset provozních dat zařízení s evidovanými akutními cykly je před zápisy odmítnut, aby nezničil tuto historii.

Přehled obsahuje všechny otevřené požadavky, posledních 200 uzavřených a 1000 nejnovějších auditních událostí. Poslední změna pořadí každého aktivního požadavku je zahrnuta i mimo tento limit. Omezená historie je v UI výslovně označená; starší data se nemažou. V tomto rozsahu zatím není stránkování starší historie.

### Rychlost zadání požadavku

Čerstvé kontroly účtu a zapnutí/oprávnění modulu běží souběžně. U POST se po ověření relace, zařízení a same-origin ochrany souběžně ověřuje také platný vstup a skutečný sál zařízení. Transakční zápis se zavolá až po úspěšném dokončení všech kontrol; chyby oprávnění mají přednost před podrobnostmi o vstupu či sálu. Oprávnění se necachují a databázová transakce své dosavadní kontroly opakuje.

Chybějící původní pořadová čísla se doplňují v dávkách po 100 ID, nejvýše třemi souběžnými dotazy. Všechny dávky sdílejí jeden časový rozpočet 1,5 sekundy; jde pouze o pomocné čtení staršího auditu, nikoli limit či záruku celkové doby uložení. Překročení rozpočtu nebo chyba tohoto čtení nezmění již potvrzený zápis na selhání. Dostupné doložené pozice se zachovají, nedostupné zůstanou neznámé. Nový zápis se svým `create` auditem v transakční odpovědi další čtení svého pořadí nepotřebuje. Žádný audit se nemaže nebo neodvozuje z aktuálního pořadí.

Klient používá potvrzený přehled přímo z odpovědi POST (`mutate(snapshot, { revalidate: false })`), bez čekání na další GET. Před potvrzením nevytváří optimistický klinický záznam; dvojí odeslání je blokované a konflikt pouze obnoví přehled, nikdy automaticky neopakuje zápis. Úspěšné API odpovědi mají anonymní hlavičku `Server-Timing` s dobou kontrol, databázové operace a přípravy odpovědi, bez identifikace zařízení, účtu či výkonu.

## Databázová instalace a ověření

Migrace `supabase/migrations/20261007213448_acute_surgery_requests.sql` byla 8. 10. 2026 aplikována do propojeného projektu operatingroom pod názvem `acute_surgery_requests`. Ověřeny tři konfigurace zařízení, všechny vypnuté, nulové skutečné požadavky, RLS a nepřístupnost RPC/tabulek pro `anon` i `authenticated`. Zdravotnické záznamy nebyly měněné ani doplňované ukázkami.

Migrace `supabase/migrations/20261008193311_acute_request_cycle_links.sql` byla 8. 10. 2026 aplikována do téhož nakonfigurovaného projektu pod názvem `acute_request_cycle_links`. Jde o přidanou tabulku, dvě serverové RPC a interní dokončovací trigger; žádné stávající výkony nejsou zpětně doplňované či přiřazované. Start i dokončení, souběh, idempotence, neměnná metadata, odmítnutí neúplného konce a přístupová práva byly před instalací ověřeny ve vlastním izolovaném PostgreSQL. Žádný skutečný operační cyklus nebyl při QA zahájen nebo dokončen.

Navazující migrace `20261008194515_restrict_acute_cycle_link_grants.sql` výslovně odebírá zděděná výchozí tabulková práva Supabase pro `service_role` a ponechává pouze SELECT/INSERT. Ověření skutečné instalace potvrdilo RLS, nepřístupnost pro klientské role, zákaz UPDATE/DELETE pro serverovou roli a správné pořadí klinického a dokončovacího triggeru. Testovací cluster nyní reprodukuje i tyto výchozí granty.

Po nahlášené chybě při zahájení na sále 7 byla instalována migrace `20261008195723_fix_acute_cycle_workflow_color.sql`. Původní start RPC používala neexistující `workflow_statuses.color`; skutečný zdroj barvy je pouze `accent_color`. Oprava mění jediný výběr barvy v celé transakci, bez změny oprávnění, potvrzování či časů cyklu. Testovací schéma již nemá vymyšlený sloupec `color`; test nejprve reprodukuje PostgreSQL chybu 42703 a nulovou změnu sálu/vazeb, poté ověří start i dokončení s opravou. Read-only ověření skutečné databáze potvrzuje upravenou funkci, nastavenou barvu příjezdu, původní omezená práva a nezahájený sál 7. Klinický start během ověřování nebyl proveden.

Automatické testy: `node --test tests/acute/*.test.js`. Databázový test vytváří nový syntetický lokální PostgreSQL cluster, testuje transakce, souběh, přístup, neměnný audit a dlouhou historii, poté odstraní pouze tento vlastní dočasný cluster. V omezeném sandboxu může vyžadovat povolení sdílené paměti. TypeScript: `npx tsc --noEmit --incremental false`.

Izolovaný vizuální fixture v `scripts/acute-preview` načítá skutečné UI s lokálním testovacím controllerem, bez environment souborů, autentizace či databáze. Ukázkové požadavky nejsou součástí produkce. Vizuální porovnání je v `design-qa.md`.

Databázový bezpečnostní poradce u nových tabulek uvádí informační „RLS enabled no policy“: záměrný server-only přístup s odebranými klientskými granty. U stávajících funkcí a nastavení Auth zůstávají dřívější nesouvisející upozornění; tato implementace je nemění a není penetračním auditem celé aplikace.
