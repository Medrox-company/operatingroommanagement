# Risk Management Plan (RMP)

## Operating Room Management System (ORMS)

**Dokument:** RMP-001
**Verze:** 0.1 (šablona)
**Soulad s normou:** ISO 14971:2019, ISO/TR 24971:2020
**Vlastník:** \_\_\_ (Quality Manager / PRRC)
**Schválil:** \_\_\_
**Datum:** \_\_\_

> Šablona pro Risk Management Plan dle ISO 14971. Místa označená `___` je nutné doplnit konkrétními informacemi výrobce a produktu.

---

## 1. Úvod a účel

Tento Risk Management Plan definuje, jak výrobce ORMS systematicky identifikuje, hodnotí, řídí a monitoruje rizika spojená s používáním produktu po celou dobu jeho životního cyklu, v souladu s **ISO 14971:2019**.

## 2. Rozsah

- **Produkt:** Operating Room Management System (ORMS)
- **Verze:** \_\_\_
- **Zamýšlený účel:** \_\_\_ (převzít z technické dokumentace)
- **Zamýšlení uživatelé:** \_\_\_
- **Prostředí použití:** \_\_\_
- **Tento plán pokrývá:** návrh, vývoj, výrobu (build/release), distribuci, použití, údržbu, vyřazení.

## 3. Role a odpovědnosti

| Role | Jméno | Odpovědnost |
|---|---|---|
| Risk Manager | \_\_\_ | Vlastní RMP, RMR, koordinuje analýzy |
| PRRC (čl. 15 MDR) | \_\_\_ | Schvaluje RMR, dohlíží nad souladem |
| Vývojový tým (lead) | \_\_\_ | Implementuje a verifikuje opatření |
| Klinický expert | \_\_\_ | Posuzuje klinické dopady |
| Cybersecurity Officer | \_\_\_ | Bezpečnostní rizika |
| Top management | \_\_\_ | Schvaluje politiku a kritéria |

## 4. Politika přijatelnosti rizik

- Princip: **ALARP** (As Low As Reasonably Practicable).
- Riziko se snižuje pořadím opatření dle ISO 14971:
  1. Inherently safe design.
  2. Ochranná opatření v produktu.
  3. Informace pro bezpečnost (návod, varování, školení) – pouze jako doplněk.
- Žádné individuální riziko nesmí zůstat v zóně "nepřijatelné".
- Celkové zbytkové riziko musí být převáženo klinickým přínosem.

### 4.1 Stupnice pravděpodobnosti

| Úroveň | Popis | Frekvence |
|---|---|---|
| 1 | Velmi nepravděpodobné | < 1× za 10 let provozu |
| 2 | Nepravděpodobné | 1× za 1–10 let |
| 3 | Příležitostně | 1× za 1–12 měsíců |
| 4 | Pravděpodobné | 1× za měsíc |
| 5 | Velmi pravděpodobné | týdně a častěji |

### 4.2 Stupnice závažnosti

| Úroveň | Popis |
|---|---|
| 1 | Zanedbatelná (drobné nepohodlí) |
| 2 | Malá (krátké zpoždění bez dopadu na pacienta) |
| 3 | Střední (zpoždění péče, žádná trvalá újma) |
| 4 | Velká (dočasné poškození zdraví) |
| 5 | Katastrofická (trvalé poškození / smrt) |

### 4.3 Matice přijatelnosti

```
              Závažnost →
              1     2     3     4     5
Pravd. ↓    ┌─────┬─────┬─────┬─────┬─────┐
        5   │ ALA │ ALA │ NEP │ NEP │ NEP │
            ├─────┼─────┼─────┼─────┼─────┤
        4   │ PŘI │ ALA │ ALA │ NEP │ NEP │
            ├─────┼─────┼─────┼─────┼─────┤
        3   │ PŘI │ ALA │ ALA │ ALA │ NEP │
            ├─────┼─────┼─────┼─────┼─────┤
        2   │ PŘI │ PŘI │ ALA │ ALA │ NEP │
            ├─────┼─────┼─────┼─────┼─────┤
        1   │ PŘI │ PŘI │ PŘI │ ALA │ ALA │
            └─────┴─────┴─────┴─────┴─────┘
```

PŘI = Přijatelné · ALA = ALARP (nutno snižovat) · NEP = Nepřijatelné

## 5. Proces řízení rizik

```
┌────────────────┐  ┌──────────────┐  ┌─────────────┐  ┌────────────┐
│ Identifikace   │→ │ Analýza      │→ │ Hodnocení   │→ │ Řízení     │
│ nebezpečí      │  │ (P × S)      │  │ vůči matici │  │ (opatření) │
└────────────────┘  └──────────────┘  └─────────────┘  └─────┬──────┘
                                                              │
              ┌──────────────────────┐  ┌──────────────┐      │
              │ Production / Post-   │← │ Verifikace   │←─────┘
              │ Production loop      │  │ a validace   │
              └──────────────────────┘  └──────────────┘
```

### 5.1 Vstupy
- Specifikace zamýšleného účelu.
- Use case a uživatelské scénáře (IEC 62366-1).
- Architektura SW (IEC 62304).
- Hlášení z PMS, vigilance, externí databáze (FDA MAUDE, BfArM, EUDAMED).

### 5.2 Techniky
- FMEA pro funkční rizika.
- STRIDE / threat modeling pro kybernetická rizika (provazba na IEC 81001-5-1).
- Use error analysis dle IEC 62366-1.

### 5.3 Výstupy
- Risk Matrix (Hazard Log).
- Risk Management Report (RMR).
- Vstupy do IFU a labellingu (varování, kontraindikace).

## 6. Kategorie nebezpečí specifické pro ORMS

| ID | Kategorie | Příklady |
|---|---|---|
| H1 | Informační | Nesprávné/zpožděné zobrazení stavu sálu, fáze pacienta |
| H2 | Dostupnost | Výpadek serveru, ztráta realtime kanálu |
| H3 | Datová integrita | Ztráta nebo poškození dat, kolize verzí |
| H4 | Bezpečnost / kybernetika | Neoprávněný přístup, manipulace s daty, ransomware |
| H5 | Použitelnost | Use error, špatně navržené UI, jazyková bariéra |
| H6 | Závislost na třetí straně | Výpadek Supabase/Vercel, změna API |
| H7 | Notifikace / alarmy | Zpožděný/nedoručený nouzový alarm |

## 7. Hazard Log – šablona záznamu

| Pole | Popis |
|---|---|
| ID | např. R-042 |
| Datum | YYYY-MM-DD |
| Nebezpečí | krátký popis |
| Předvídatelná sekvence událostí | … |
| Nebezpečná situace | … |
| Možná škoda | … |
| P (1–5) | … |
| S (1–5) | … |
| Iniciální RPN / zóna | … |
| Opatření (typ 1/2/3 dle ISO 14971) | … |
| Verifikace opatření | odkaz na test/CR |
| Reziduální P | … |
| Reziduální S | … |
| Reziduální zóna | PŘI / ALA / NEP |
| Vlastník | … |
| Status | open / closed |

> Plný hazard log je vedený v souboru `docs/risk/HAZARD_LOG.xlsx` (založit při zahájení projektu).

## 8. Verifikace opatření

Každé opatření musí mít definovanou verifikaci:

- Testovací případ (unit / integration / system / usability).
- Akceptační kritérium.
- Záznam výsledku (build ID, datum, tester).

## 9. Production a Post-Production činnosti

- Sběr dat z provozu (incidenty, helpdesk, logy, telemetrie – v souladu s GDPR).
- Pravidelné hodnocení přijatelnosti zbytkových rizik (min. 1× ročně + při major release).
- Vstup do **PMS Plan** (`docs/templates/POST_MARKET_SURVEILLANCE_PLAN.md`).
- Trigger pro **CAPA** při překročení trendových prahů.

## 10. Kritéria pro reevaluaci RMR

RMR se aktualizuje při:
- každém major release (změna verze X v X.Y.Z),
- novém významném nebezpečí z PMS / vigilance,
- změně regulatorních požadavků,
- změně zamýšleného účelu,
- závažném incidentu nebo CAPA.

## 11. Schválení

| Role | Jméno | Podpis | Datum |
|---|---|---|---|
| Risk Manager | | | |
| PRRC | | | |
| Top management | | | |
