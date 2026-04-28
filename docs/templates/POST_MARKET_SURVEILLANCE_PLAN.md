# Post-Market Surveillance Plan (PMS Plan)

## Operating Room Management System (ORMS)

**Dokument:** PMS-001
**Verze:** 0.1 (šablona)
**Soulad:** MDR (EU) 2017/745 čl. 83–86 + Příloha III; zákon č. 375/2022 Sb.
**Vlastník:** \_\_\_ (PRRC / Quality Manager)

> Pro třídu IIa platí povinnost vést PMS systém a zpracovávat **PSUR (Periodic Safety Update Report) minimálně 1× ročně** a aktualizovat technickou dokumentaci.

---

## 1. Účel

PMS Plan popisuje, jak výrobce systematicky a aktivně sbírá, analyzuje a využívá informace o ORMS po jeho uvedení na trh, aby:
- monitoroval bezpečnost a výkonnost,
- udržoval aktuálnost analýzy přínos/riziko,
- spouštěl preventivní/nápravná opatření (CAPA),
- splnil povinnosti vigilance vůči SÚKL a EU.

## 2. Rozsah

- Všechny verze ORMS uvedené na trh v EU/EHP, primárně ČR.
- Doba: po celou dobu životního cyklu, minimálně dokud je v provozu poslední instance.

## 3. Role

| Role | Odpovědnost |
|---|---|
| PRRC | Soulad s MDR, schvalování PSUR, hlášení incidentů |
| Quality Manager | Provoz PMS procesu, CAPA |
| Vývojový tým | Telemetrie, root-cause analysis |
| Customer Success / Support | Sběr stížností, kategorizace |
| Klinický expert | Hodnocení klinického dopadu |
| DPO | Soulad sběru dat s GDPR |

## 4. Zdroje informací

### 4.1 Proaktivní
- **Telemetrie a logy** ORMS (anonymizované):
  - latence realtime kanálu,
  - úspěšnost notifikací,
  - chybové stavy (5xx, abort, retry),
  - audit log (přihlášení, změny stavů sálů).
- **Uživatelské průzkumy** (kvartálně, NPS + cílené otázky o bezpečnosti).
- **PMCF** aktivity (viz CEP).
- Sledování literatury a registrů (FDA MAUDE, BfArM, EUDAMED, SÚKL).
- Sledování dodavatelů (Supabase, Vercel) – výpadky, security advisory.

### 4.2 Reaktivní
- **Stížnosti** uživatelů (helpdesk, e-mail, telefon).
- Hlášení incidentů od poskytovatelů zdravotních služeb.
- Bug reporty v issue trackeru.
- Bezpečnostní hlášení (CVE, dependency alert).

## 5. Klíčové ukazatele (KPI)

| KPI | Práh / cíl | Frekvence |
|---|---|---|
| Dostupnost služby | ≥ 99.5 % měsíčně | měsíčně |
| Medián latence realtime updatu | < 1.5 s | týdně |
| 95p latence realtime updatu | < 3 s | týdně |
| Doručení nouzového alarmu < 5 s | ≥ 99 % | týdně |
| Počet závažných incidentů | 0 | průběžně |
| Počet stížností / 1000 hodin provozu | ≤ \_\_\_ | měsíčně |
| Otevřená kritická zranitelnost (CVSS ≥ 9) | 0 trvale | denně |

Trendy se hodnotí, prahy se přezkoumávají v PSUR.

## 6. Vigilance – povinné hlášení

Termíny dle MDR čl. 87:

| Událost | Lhůta hlášení SÚKL |
|---|---|
| Závažné nebezpečí pro veřejné zdraví | **bez zbytečného odkladu, nejpozději 2 dny** |
| Smrt nebo nepředvídané závažné poškození zdraví | **nejpozději 10 dní** |
| Ostatní závažné incidenty | **nejpozději 15 dní** |
| Trend reporting (statistický nárůst neincidentů) | dle vyhodnocení, definovat prahy |

Procesní kroky:
1. Příjem hlášení.
2. Klasifikace (závažný / nezávažný / FSCA).
3. Záznam v incident logu.
4. Notifikace SÚKL (a dalších kompetentních autorit přes EUDAMED).
5. Vyšetřování root-cause + CAPA.
6. **Field Safety Notice (FSN)** a **Field Safety Corrective Action (FSCA)** – pokud relevantní.
7. Uzavření a poučení.

## 7. CAPA (Corrective and Preventive Actions)

- Trigger: incident, překročení KPI prahu, audit, stížnost, externí signál.
- Workflow: Open → Investigate → Plan → Execute → Verify Effectiveness → Close.
- Vlastník: Quality Manager.
- Vstup do dalšího PSUR.

## 8. Reporty

| Report | Pro koho | Frekvence | Třída IIa |
|---|---|---|---|
| Interní PMS report | Top management | měsíčně | povinné |
| **PSUR** (Periodic Safety Update Report) | dostupné kompetentním autoritám přes EUDAMED | **min. 1× ročně** | povinné |
| FSN | uživatelé | ad hoc | dle potřeby |
| Aktualizace CER | tech. dokumentace | min. 1× ročně | povinné |

## 9. Ochrana osobních údajů a sběr telemetrie

- Telemetrie a logy musí být anonymizovány nebo pseudonymizovány.
- DPIA dle GDPR čl. 35.
- Smluvní zpracování s nemocnicí (DPA).
- Lokalizace dat: \_\_\_ (preferovaně EU).
- Doba uchování: \_\_\_ (typicky 10–15 let pro záznamy MDR + GDPR retence).

## 10. Schválení a revize

- Plán se reviduje **min. 1× ročně** a při každém major release.
- Schvaluje PRRC a top management.

## 11. Přílohy

- `docs/templates/RISK_MANAGEMENT_PLAN.md`
- `docs/templates/CLINICAL_EVALUATION_PLAN.md`
- `docs/templates/CYBERSECURITY_SBOM.md`
- (vytvořit) `docs/pms/INCIDENT_LOG.xlsx`
- (vytvořit) `docs/pms/CAPA_LOG.xlsx`
