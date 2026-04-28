# Clinical Evaluation Plan (CEP)

## Operating Room Management System (ORMS)

**Dokument:** CEP-001
**Verze:** 0.1 (šablona)
**Soulad:** MDR (EU) 2017/745, čl. 61 a Příloha XIV; MDCG 2020-1, MDCG 2020-6, MEDDEV 2.7/1 rev. 4
**Vlastník:** \_\_\_ (Klinický expert / Medical Officer)
**Schválil:** \_\_\_

> Šablona Clinical Evaluation Plan. Doplňte všechna `___` před prvním schválením.

---

## 1. Identifikace prostředku

| Pole | Hodnota |
|---|---|
| Název | Operating Room Management System (ORMS) |
| Model / verze | \_\_\_ |
| Basic UDI-DI | \_\_\_ |
| UDI-DI | \_\_\_ |
| Klasifikace | Třída \_\_\_ (předpoklad IIa, pravidlo 11) |
| Zamýšlený účel | \_\_\_ |
| Cílové stavy / populace | \_\_\_ |
| Kontraindikace | \_\_\_ |
| Klinický přínos (claim) | \_\_\_ (např. zkrácení doby přípravy sálu, snížení chyb v koordinaci) |

## 2. Rozsah klinického hodnocení

- Hodnocení celého životního cyklu produktu (čl. 61 MDR).
- Vstup do technické dokumentace (Příloha II.6).
- Aktualizace minimálně **1× ročně** pro IIa (v rámci PSUR).

## 3. Klinické tvrzení (Clinical Claims)

| ID | Klinický claim | Endpoint | Akceptační kritérium |
|---|---|---|---|
| C1 | ORMS poskytuje aktuální informaci o stavu sálu s latencí < 3 s | latence realtime updatu | 95. percentil < 3 s |
| C2 | ORMS snižuje chyby v koordinaci personálu | počet chybných přiřazení / měsíc | snížení o ≥ 30 % vs. baseline |
| C3 | Nouzový alarm je doručen příjemcům do 5 s | čas od triggeru po notifikaci | medián < 5 s |
| C4 | … | … | … |

## 4. State of the Art (SOTA)

- Definice srovnávacích produktů a klinických alternativ:
  - whiteboard / papírový rozpis,
  - HIS moduly (např. \_\_\_),
  - konkurenční SaMD pro OR management (\_\_\_),
- Identifikace klinických norem péče.
- Identifikace přijatelné rizikově-přínosové úrovně oboru.

## 5. Strategie hodnocení (PICO)

| Prvek | Hodnota |
|---|---|
| **P**opulace | personál a pacienti operačních sálů v ČR |
| **I**ntervence | použití ORMS pro koordinaci |
| **C**omparator | stávající praxe (whiteboard / HIS) |
| **O**utcome | doba obratu sálu, počet koordinačních chyb, doba odezvy na alarm, spokojenost personálu |

## 6. Datové zdroje

### 6.1 Vlastní data
- Pre-clinical: simulační testy, usability testy.
- Bench testing: latence realtime, výkon DB, spolehlivost notifikací.
- PMS data po uvedení na trh.
- Případná **klinická studie / pilotní nasazení** (\_\_\_).

### 6.2 Literatura
- Databáze: PubMed, Embase, Cochrane, Google Scholar.
- Klíčová slova: "operating room management software", "OR coordination digital", "surgical workflow management", "OR turnover time digital tool".
- Časový rozsah: posledních 10 let, plus klíčové starší práce.

### 6.3 Ekvivalence
- **Pokud výrobce uplatňuje ekvivalenci** dle MDCG 2020-5: doložit klinickou, technickou a biologickou ekvivalenci. (Pro čistě SW prostředek odpadá biologická.)
- ORMS je nový/proprietární SaMD → ekvivalence pravděpodobně **nelze uplatnit**, klinická data je nutné generovat vlastní.

## 7. Metodika literární rešerše

- Strukturovaný protokol (PRISMA-light).
- Search string: \_\_\_
- Kritéria zahrnutí / vyloučení: \_\_\_
- Hodnocení kvality (např. Oxford CEBM levels).
- Příloha: tabulka článků s extrakcí dat.

## 8. Klinický průzkum / pilotní studie

Pokud literatura a PMS nestačí na doložení claimů (typicky ano pro nový SaMD):

| Parametr | Hodnota |
|---|---|
| Typ studie | observační, prospektivní, multicentrická |
| Pracoviště | \_\_\_ (např. 2 fakultní nemocnice v ČR) |
| Doba sběru | \_\_\_ měsíců |
| Velikost vzorku | \_\_\_ (statisticky odůvodnit) |
| Etická komise | nutný souhlas dle zák. 375/2022 Sb. |
| Souhlas účastníků | nutný (i pro personál sledovaný v rámci studie) |
| Endpoints | C1–C4 výše |

## 9. Analýza poměru přínos/riziko

- Vstupy z RMR (`docs/templates/RISK_MANAGEMENT_PLAN.md`).
- Pro každý hlavní claim porovnat klinický přínos vs. zbytková rizika.
- Závěr: \_\_\_

## 10. Post-Market Clinical Follow-up (PMCF)

- PMCF Plan jako samostatný dokument PMCF-001.
- Aktivity: dotazníky uživatelů, sledování KPI, registrace incidentů.
- Aktualizace CEP / CER po každém PMCF cyklu.

## 11. Výstupy CEP

- Clinical Evaluation Report (CER-001) – samostatný dokument.
- Vstup do PMS Plan a PSUR.
- Vstup do IFU (claims, kontraindikace, varování).

## 12. Schválení

| Role | Jméno | Podpis | Datum |
|---|---|---|---|
| Klinický expert | | | |
| Regulatory Affairs / PRRC | | | |
| Top management | | | |
