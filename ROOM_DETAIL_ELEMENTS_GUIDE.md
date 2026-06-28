# DETAILNÍ POPIS PRVKŮ V DETAILU SÁLU
## Operating Room Management System (ORMS)

---

## PŘEHLED
Detailní pohled sálu je klíčová část aplikace ORMS. Zobrazuje se po kliknutí na jednotlivý sál z hlavního dashboardu. Zahrnuje řadu interaktivních prvků a tlačítek, která umožňují management operačního procesu v reálném čase.

---

## 1. HLAVIČKA (Header)

### 1.1 Tlačítko "Zpět" / Zavření Detailu
**Kdy se zobrazuje:** Vždy v levém horním rohu
**Co se stane po kliknutí:**
- Zavře se detail sálu
- Vrátí se na hlavní dashboard s přehledem všech sálů
- Všechny změny jsou uloženy v reálném čase, proto se změny nepřepadou

**Vizuální prvek:** Šedé zaoblené tlačítko se šipkou doleva (<)

---

### 1.2 Nadpis Sálu
**Zobrazeno:** Název sálu (např. "Sál č. 5", "TRAUMATOLOGIE - 1")
**Co se stane po kliknutí:** Žádná akce - pouze informační prvek
**Obsah:**
- Označení typu (Operační sál)
- Jméno sálu
- ID sálu (v systému)

**Viz:** Centrální část horní lišty

---

### 1.3 Tlačítko Notifikací
**Kdy se zobrazuje:** Vždy v pravém horním rohu
**Co se stane po kliknutí:**
- Otevře se panel "Notifikace a Alarmy"
- Zobrazí se všechny nové zprávy, varování a alarmy pro tento sál
- Uživatel může si přečíst detaily, označit jako přečtené, atd.

**Vizuální prvek:** Šedé zaoblené tlačítko se zvonem (🔔)

---

## 2. HLAVNÍ HERNÍ KARTA - AKTUÁLNÍ FÁZE

### 2.1 Řádek "Aktuální Fáze" + Počítadlo Fází
**Zobrazeno:** 
- Text "Aktuální fáze" (horní část)
- Indikátor: "X/Y" (např. "3/8" = 3. fáze z 8 celkem)
- Barevný bod indikující stav

**Co se stane po kliknutí:** Žádná akce - pouze informační prvek

**Funkcionalita:**
- Pomocí těchto číslic vidíte, kde se v operaci nacházíte
- Počítadlo se automaticky aktualizuje při přechodu na novou fázi

---

### 2.2 Název Aktuální Fáze (Velký Text)
**Zobrazeno:** Velký text (cca 32px) s názvem fáze
Příklady:
- "Příprava"
- "Anestezie"
- "Operační zákrok"
- "Sešívání"
- "Probuzení"
- "Předám pacienta"

**Co se stane po kliknutí:** Žádná akce - pouze informační prvek

**Speciální Stavy:**
- Pokud je sál v **nouzovém stavu** → zobrazuje "Stav nouze" v červené barvě
- Pokud je sál **uzamčen** → zobrazuje "Uzamčen" v žluté barvě
- Normální stav → zobrazuje název fáze v barvě přiřazené té fázi

---

### 2.3 Ukazatel Času - "Uplynulo: HH:MM"
**Zobrazeno:** Čas, který uplynul od začátku aktuální fáze (formát: minuty:sekundy)
Příklad: "Uplynulo: 00:45" = 45 sekund v aktuální fázi

**Co se stane po kliknutí:** Žádná akce - pouze informační prvek

**Funkčnost:**
- Čítač se zvyšuje každou sekundu
- Při pozastavení (pause) se čítač zastaví
- Při obnovení se čítač pokračuje v počítání

---

### 2.4 Tlačítko PLAY (Velké Kruhové Tlačítko)
**Kdy se zobrazuje:** Vždy v pravé části karty, pokud není interakce blokovaná

**Co se stane po kliknutí:**
1. Zobrazí se potvrzovací dialog: "Chcete přejít na další fázi?"
2. Po potvrzení:
   - Aplikace se přesune na DALŠÍ FÁZI
   - Ukazatel času se resetuje na 00:00
   - Barevný indikátor se změní na barvu nové fáze
   - Čítač fází se zvýší (např. 3/8 → 4/8)
   - Všechny změny se okamžitě odešlou do databáze

**Přehled Fází:**
Pokud máte sál se všemi 8 fázemi, bude pořadí:
1. Příprava
2. Anestezie
3. Operační zákrok
4. Sešívání
5. Probuzení
6. Předání pacienta
7. Úklid
8. Uzamčení

**Omezení:**
- Nelze přeskakovat fáze - musíte projít všechny postupně
- Pokud je sál uzamčen, nelze se vrátit zpět (forward-only)
- Pokud je sál v pozastavení, nelze přejít na další fázi
- V poslední fázi vás tlačítko vrátí na fázi 1

**Vizuální prvek:** Velké kruhové tlačítko s ikonou play (▶) v barvě aktuální fáze, s luminárium efektem

---

### 2.5 Indikátor Pokroku - Pruh na Spodku
**Zobrazeno:** Tenký horizontální pruh v dolní části karty
**Funkcionalita:**
- Graficky znázorňuje postupování operací
- Pruh se zaplňuje zleva doprava podle počtu dosažených fází
- Příklad: pokud jste v 4. fázi z 8, bude pruh zaplněn na 50%
- Barva pruhu odpovídá barvě aktuální fáze

**Co se stane po kliknutí:** Žádná akce - pouze vizuální indikátor

---

## 3. SEKCE OKAMŽITÉ AKCE - Pause/Resume

### 3.1 Tlačítko PAUSE
**Kdy se zobrazuje:** V mobilní verzi pod hlavní kartou, pokud operace právě probíhá

**Co se stane po kliknutí:**
1. Operace se zastaví
2. Ukazatel "Uplynulo: HH:MM" se zastaví na aktuální hodnotě
3. Nový ukazatel "Pozastaveno: HH:MM" se spustí a počítá, jak dlouho je operace pozastavena
4. Barevný indikátor se změní na tyrkysové (cyan)
5. Tlačítko PLAY se změní na RESUME (Obnovit)
6. Nelze měnit fáze, pokud je operace pozastavena

**Vizuální prvek:** Tlačítko se symbolem ⏸ (pauza)

---

### 3.2 Tlačítko RESUME / Obnovit
**Kdy se zobrazuje:** Pokud je operace pozastavena

**Co se stane po kliknutí:**
1. Operace se obnoví
2. Ukazatel "Pozastaveno: HH:MM" zmizí
3. Ukazatel "Uplynulo: HH:MM" se pokračuje v počítání
4. Barevný indikátor se vrátí na barvu aktuální fáze
5. Nelze vrátit se na předchozí fázi, pokud je sál uzamčen

**Vizuální prvek:** Tlačítko se symbolem ▶ (play) - stejné jako NEXT STEP tlačítko

---

## 4. SEKCE ČASU OPERACE - Odhadovaný Čas Konce

### 4.1 Zobrazení Odhadovaného Času
**Kde se zobrazuje:** Pod hlavní kartou fáze

**Co se ukazuje:**
- Přibližný čas, kdy by měla operace skončit
- Formát: "Odhad konce: 14:30" nebo "Odhad konce: ~15 minut"
- Pokud není nastaven, zobrazuje se "Není nastaveno"

**Co se stane po kliknutí:** Zobrazí se minimální panel s tlačítky + a -

---

### 4.2 Tlačítko "+" (Zvýšení Času)
**Co se stane po kliknutí:**
1. Přidá se 15 minut k odhadovanému času konce
2. Pokud nebyl čas nastaven, nastaví se na aktuální čas + 15 minut
3. Pokud by nový čas byl v minulosti, resetuje se na aktuální čas + 15 minut
4. Panel s časem se na 2 sekundy zobrazí, pak zmizí
5. Změna se okamžitě pošle do databáze

**Příklady:**
- Operace měla skončit v 14:30, ale třeba bude déle → kliknutí "+": 14:45
- Znovu "+": 15:00
- A tak dále...

**Vizuální prvek:** Kruhové tlačítko se znakem "+"

---

### 4.3 Tlačítko "-" (Snížení Času)
**Co se stane po kliknutí:**
1. Odebere se 15 minut z odhadovaného času konce
2. Není možné snížit čas pod čas začátku aktuální fáze (ochrana proti chybám)
3. Panel s časem se na 2 sekundy zobrazí, pak zmizí
4. Změna se okamžitě pošle do databáze

**Příklady:**
- Operace měla skončit v 15:30, ale skončit by měla dřív → kliknutí "-": 15:15
- Znovu "-": 15:00

**Vizuální prvek:** Kruhové tlačítko se znakem "-"

---

## 5. SEKCE PACIENTA - Zavolání a Příjezd

### 5.1 Tlačítko "Zavolat Pacienta"
**Kdy se zobrazuje:** V sekci spravování pacienta

**Co se stane po kliknutí:**
1. Zaznamená se čas zavolání pacienta
2. Zobrazí se nový ukazatel: "Čeká: HH:MM" (čas od zavolání do příjezdu)
3. Tlačítko se změní na "Zrušit zavolání" (pokud si chcete rozmyslet)
4. Zobrazí se nové tlačítko "Pacient Přijel"

**Vizuální prvek:** Tlačítko s textem "📞 Zavolat pacienta"

---

### 5.2 Tlačítko "Pacient Přijel"
**Kdy se zobrazuje:** Pokud byl pacient zavolán, ale ještě nepřijel

**Co se stane po kliknutí:**
1. Zaznamená se čas příjezdu pacienta
2. Ukazatel "Čeká: HH:MM" zmizí (operace už čeká)
3. Zaznamená se, jak dlouho pacient čekal
4. Tato informace se uloží pro statistiku (analytics)

**Vizuální prvek:** Tlačítko s textem "✓ Pacient Přijel"

---

### 5.3 Ukazatel Čekání "Čeká: HH:MM"
**Zobrazeno:** Čas od zavolání pacienta do jeho příjezdu
Příklad: "Čeká: 00:12" = pacient byl zavolán před 12 sekundami

**Co se stane po kliknutí:** Žádná akce - pouze informační prvek

---

## 6. SEKCE PERSONÁLU - Přiřazení Doktorů, Sester, Anesteziologů

### 6.1 Kartička Doktora
**Zobrazeno:** 
- Jméno doktora
- Ikona 👨‍⚕️
- Stav dostupnosti
- Kvalifikace (L3, L2, L1, atd.)

**Co se stane po kliknutí:**
1. Otevře se modal pro výběr jiného doktora
2. Seznamem všech dostupných doktorů
3. Můžete si vybrat jiného doktora
4. Po výběru se změní přiřazený doktor
5. Stará přiřazení se zaznamená v historii

**Pokud není doktor přiřazen:** Zobrazuje se "Není přiřazen" a tlačítko "Vybrat doktora"

---

### 6.2 Kartička Sestry
**Zobrazeno:** 
- Jméno sestry
- Ikona 👩‍⚕️
- Stav dostupnosti
- Kvalifikace

**Co se stane po kliknutí:**
1. Stejný proces jako u doktora
2. Otevře se seznam dostupných sester
3. Můžete si vybrat jinou sestru

---

### 6.3 Kartička Anesteziologu (pokud je relevantní)
**Zobrazeno:** 
- Jméno anesteziologu
- Ikona s kyslíkovou maskou 🫁
- Stav dostupnosti
- Kvalifikace

**Co se stane po kliknutí:**
1. Stejný proces jako u ostatních
2. Otevře se seznam dostupných anesteziologů

---

### 6.4 Stavy Dostupnosti Personálu
**Možné stavy:**
- 🟢 Dostupný (100%) - personál je volný a může být přiřazen
- 🟡 Částečně dostupný (50%) - personál je zaměstnaný jinde
- 🔴 Nedostupný (0%) - personál je zaneprázdnění
- 🟣 Na dovolené - v pracovní nabídce se neobjevuje
- ⚫ Na nemocenské - v pracovní nabídce se neobjevuje

---

## 7. SEKCE SPECIÁLNÍCH STAVŮ

### 7.1 Indikátor "Septic" (Septická Operace)
**Kdy se zobrazuje:** Pokud je operace označena jako septická

**Co se stane po kliknutí:** Žádná akce - pouze informační prvek

**Vizuální prvek:** Žlutá/oranžová ikona s varováním ⚠️

**Důležitost:** Septic operace vyžadují zvýšené hygienické standardy a speciální desinfekcí po skončení

---

### 7.2 Indikátor "Nouzový Stav" (Emergency)
**Kdy se zobrazuje:** Pokud je sál v nouzovém stavu

**Co se stane po kliknutí:** Žádná akce - pouze informační prvek

**Vizuální prvek:** Červená ikona s vykřičníkem 🚨

**Důležitost:** Sál v nouzovém stavu má nejvyšší prioritu, ostatní operace se odkládají

---

### 7.3 Indikátor "Uzamčen" (Locked)
**Kdy se zobrazuje:** Pokud je sál uzamčen (obvykle v poslední fázi)

**Co se stane po kliknutí:** Žádná akce - pouze informační prvek

**Vizuální prvek:** Žlutá ikona s zámkem 🔒

**Důležitost:** 
- Pokud je sál uzamčen, můžete se pohybovat pouze dopředu (forward)
- Nelze se vrátit na předchozí fázi
- Po dosažení poslední fáze je sál automaticky uzamčen

---

### 7.4 Indikátor "Zvýšená Hygiena" (Enhanced Hygiene)
**Kdy se zobrazuje:** Pokud je zapnutý zvýšený hygienický režim

**Co se stane po kliknutí:** Lze vypnout/zapnout zvýšenou hygienu
- Po kliknutí se otevře potvrzovací dialog
- Po potvrzení se zvýšená hygiena zapne/vypne
- Zvýšená hygiena prodlužuje dobu úklidu o 15-20 minut

**Vizuální prvek:** Ikona s umyvadlem/mýdlem 🧼

---

## 8. SEKCE STATISTIKY A DETAILŮ

### 8.1 Tlačítko "Podrobnosti" / "Statistics"
**Kdy se zobrazuje:** V nižší části detailu sálu

**Co se stane po kliknutí:**
1. Otevře se modal se statistikou sálu
2. Zobrazí se:
   - Počet operací za posledních 24 hodin
   - Průměrná doba operace
   - Utilization % (vytížení sálu)
   - Septic operace %
   - Peak hour (nejzatíženější hodina)
   - Náklady operování
   - Trend za poslední 7 hodin
3. Naimportují se grafy s vývojem

---

## 9. DOLNÍ LIŠTA - PEVNÉ TLAČÍTKA

### 9.1 Tlačítko "Zamknout Sál"
**Kdy se zobrazuje:** V mobilní dolní liště

**Co se stane po kliknutí:**
1. Otevře se dialog s potvrzením
2. Po potvrzení se sál uzamkne
3. Změní se barevný indikátor na žlutou
4. Nelze se vrátit na předchozí fáze
5. Sál je nyní jen forward-only

---

### 9.2 Tlačítko "Noha Operace"
**Kdy se zobrazuje:** V mobilní dolní liště

**Co se stane po kliknutí:**
1. Otevře se seznam všech operací v tomto sálu
2. Zobrazí se jejich trvání, typ, datum
3. Můžete si je prohlédnout (read-only)

---

### 9.3 Tlačítko "Nastavení Sálu"
**Kdy se zobrazuje:** V mobilní dolní liště

**Co se stane po kliknutí:**
1. Otevře se stránka s nastavením sálu
2. Lze změnit:
   - Název sálu
   - Oddělení, kterému sál patří
   - Pracovní dobu
   - Kapacitu
   - Speciální režimy (septic, emergency)
3. Po uložení se změní v aplikaci a v databázi

---

## 10. SPECIÁLNÍ SITUACE

### 10.1 Pokud Je Sál V Pozastavení (Pause)
**Co vidíte:**
- Barevný indikátor se změní na tyrkysovou
- Ukazatel "Pozastaveno: HH:MM" počítá
- Tlačítko PLAY se změní na RESUME
- Nelze měnit fáze
- Nelze volat pacienta (jestliže nebyl už zavolán)

**Co můžete dělat:**
- Obnovit operaci (RESUME)
- Zaznamenaný čas je stále vidět
- Personál můžete stále měnit

---

### 10.2 Pokud Je Sál V Nouzovém Stavu (Emergency)
**Co vidíte:**
- Velký červený indikátor
- Text "Stav nouze" místo názvu fáze
- Zvukový alarm (pokud je zapnutý)
- Ostatní sály na dashboardu se přesunout do pozadí

**Co musíte udělat:**
1. Okamžitě respondere na nouzový stav
2. Přivolat nezbytný personál
3. Zvýšit prioritu operace
4. Po zvládnutí situace zrušit nouzový stav

---

### 10.3 Pokud Uplynul Odhadovaný Čas
**Co se stane:**
- Pole s časem se změní na oranžově/červeně
- Zobrazí se varování: "Operace překročila odhadovaný čas o +XX minut"
- Můžete upravit nový odhadovaný čas

**Co můžete udělat:**
- Přidat další čas (tlačítko +)
- Nebo ignorovat varování a pokračovat

---

## 11. DESKTOP VERZE - DETAILY

V desktop verzi jsou všechny prvky stejné jako v mobilní, ale:
- Jsou zobrazeny vedle sebe (sidebar s detailem na jedné straně, seznam sálů na druhé)
- Lze mít otevřené více detailů najednou
- Jsou rozšířené možnosti přehlédů (více grafů, tabulek)
- Lze sálu přiřadit více informací najednou

---

## 12. KLÁVESOVÉ ZKRATKY (pokud jsou dostupné)

| Zkratka | Funkce |
|---------|--------|
| ESC | Zavření detailu sálu |
| SPACE | Pause/Resume operace |
| ARROW RIGHT | Přechod na další fázi |
| ARROW LEFT | (Pokud není uzamčen) Návrat na předchozí fázi |
| P | Zavolat pacienta |
| A | Pacient přijel |
| + | Zvýšení odhadovaného času |
| - | Snížení odhadovaného času |

---

## 13. REALTIME AKTUALIZACE

**Co se automaticky aktualizuje bez vašeho zásahu:**
- Ukazatel času "Uplynulo: HH:MM" - aktualizuje se každou sekundu
- Dostupnost personálu - pokud se změní na jiném zařízení
- Stav sálu - pokud ho změní jiný uživatel
- Alarmy a notifikace - přichází v reálném čase
- Změny v databázi - jsou vidět ve všech otevřených instancích

---

## 14. OCHRANA DAT A BEZPEČNOST

**Automatické uložení:**
- Každá změna se automaticky uloží do databáze
- Nemusíte nic manuálně ukládat

**Oprávnění:**
- Pouze autorizovaní uživatelé mohou měnit data
- Změny jsou zaznamenány s informací, kdo je provedl a kdy

**Historické záznamy:**
- Všechny změny jsou zaznamenány (audit log)
- Lze se vrátit k předchozím stavům sálu (jestliže to máte oprávnění)

---

## SHRNUTÍ

Detail sálu je komplexní rozhraní s mnoha interaktivními prvky. Klíčové funkce:

1. **Navigace fází** - Play tlačítko pro posun na další fázi
2. **Správa času** - Zvýšení/snížení odhadovaného konce operace
3. **Pacient** - Zavolání a zaznamenání příjezdu
4. **Personál** - Přiřazení doktorů, sester, anesteziologů
5. **Specialní stavy** - Nouzový stav, uzamčení, zvýšená hygiena
6. **Pause/Resume** - Pozastavení a obnovení operace
7. **Statistika** - Zobrazení metriky a analýzy sálu

Všechny změny jsou **okamžitě uloženy** a **synchronizovány** s ostatními zařízeními v reálném čase.
