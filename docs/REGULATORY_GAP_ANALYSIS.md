# Regulatorní gap-analýza

## Operating Room Management System (ORMS)

**Dokument:** REG-GAP-001
**Verze:** 1.0
**Datum:** 2026-04-28
**Status:** Pracovní (draft)
**Zpracoval:** \_\_\_ (doplnit – regulatorní zástupce / PRRC)
**Schválil:** \_\_\_

> Tento dokument hodnotí současný stav aplikace ORMS (větev `medical-device-compliance`) vůči požadavkům na zdravotnický prostředek (ZP) v České republice a Evropské unii. Slouží jako vstup pro rozhodnutí "go / no-go" a pro plán implementace.

---

## 1. Shrnutí pro management

| Otázka | Odpověď |
|---|---|
| Splňuje ORMS dnes požadavky na ZP v ČR? | **Ne.** |
| Je rozhodnuto, že ORMS je ZP? | **Ne** – kvalifikace nebyla formálně provedena. |
| Existuje formální QMS dle ISO 13485? | Ne. |
| Existuje CE značení? | Ne. |
| Existuje registrace u SÚKL / v EUDAMED? | Ne. |
| Existuje notifikovaná osoba? | Ne. |
| Odhadovaný objem práce do CE (třída IIa) | 6–12 měsíců, ~45–90 tis. EUR (interní odhad). |

**Doporučení:** Před zahájením certifikační cesty provést **kvalifikační rozhodnutí (MDCG 2019-11)** s regulatorním konzultantem a získat stanovisko SÚKL podle § 5 zákona č. 375/2022 Sb. Pokud výsledek bude "není ZP", projekt přestat marketingově prezentovat jako medicínský produkt a vystačit s GDPR, NIS2 a smlouvou s nemocnicí.

---

## 2. Rozsah, předmět a referenční předpisy

### 2.1 Předmět posouzení

- **Produkt:** Operating Room Management System (ORMS)
- **Verze kódu:** větev `medical-device-compliance`, package `0.0.1`
- **Architektura:** Next.js 15 (App Router), Supabase (Postgres + RLS), realtime kanály, autentizace přes vlastní `AuthContext`
- **Zamýšlený účel (dle interního MDR_COMPLIANCE.md):** monitoring stavu operačních sálů, koordinace 8 fází operačního workflow, plánování personálu, statistiky, nouzový alarm.

### 2.2 Referenční předpisy

| Oblast | Předpis |
|---|---|
| EU MDR | Nařízení (EU) 2017/745 |
| ČR – dozor a registrace | Zákon č. 375/2022 Sb., o zdravotnických prostředcích a diagnostických zdravotnických prostředcích in vitro |
| ČR – prováděcí | Vyhláška č. 343/2021 Sb. |
| Kvalifikace SW | MDCG 2019-11 |
| Klasifikace SW | MDR Příloha VIII, pravidlo 11 |
| QMS | ISO 13485:2016 |
| Řízení rizik | ISO 14971:2019, ISO/TR 24971 |
| Životní cyklus SW | IEC 62304:2006/A1:2015 |
| Použitelnost | IEC 62366-1:2015 |
| Kybernetická bezpečnost | IEC 81001-5-1, MDCG 2019-16 |
| Klinické hodnocení | MDR čl. 61, MDCG 2020-1, MDCG 2020-6 |
| Označení | MDR Příloha I (kap. III), MDCG 2019-11 |
| Ochrana osobních údajů | GDPR (EU 2016/679), zákon č. 110/2019 Sb. |
| Kybernetická bezpečnost provozu | NIS2 / zákon o kybernetické bezpečnosti (ČR) |

---

## 3. Kvalifikace ORMS jako zdravotnického prostředku

Postupováno dle rozhodovacího stromu MDCG 2019-11.

| Krok | Otázka | Závěr ORMS |
|---|---|---|
| 1 | Je software MDSW (řídí, ovlivňuje, zpracovává klinická data za účelem diagnózy / léčby / monitoringu nemoci)? | **Hraniční.** ORMS data jen prezentuje a koordinuje, neprovádí výpočty na klinických datech. |
| 2 | Slouží pouze k uchování/přenosu/jednoduché vizualizaci? | Z velké části **ano**. |
| 3 | Slouží pouze k administrativě, plánování, fakturaci, koordinaci zdrojů? | **Ano** – hlavní funkce. |
| 4 | Je-li MDSW, do které třídy patří dle pravidla 11? | Pokud bude klasifikováno jako MDSW, lze argumentovat třídou IIa (informace pro klinické rozhodování s nepřímým dopadem). |

**Pracovní závěr:**
- **Primární scénář (doporučený):** ORMS = administrativní/koordinační software, **NENÍ ZP**. Postačí GDPR, NIS2, ISO 27001 / dobrá praxe, smluvní vztah s nemocnicí.
- **Záložní scénář:** Pokud výrobce trvá na klinickém určení (např. funkce "klinické rozhodování o pořadí pacientů"), pak **ZP třídy IIa** s povinností notifikované osoby.

> Toto rozhodnutí MUSÍ být potvrzeno písemně před další prací. Doporučujeme získat **písemné stanovisko SÚKL** (§ 5 zák. 375/2022 Sb.).

---

## 4. Gap-analýza vůči požadavkům MDR (scénář ZP třídy IIa)

Stupnice: 0 = chybí, 1 = částečně / ad-hoc, 2 = formálně připraveno, 3 = auditovatelné a schválené.

### 4.1 Systém managementu kvality – ISO 13485

| Požadavek | Stav | Důkaz / poznámka |
|---|---|---|
| QM Manual | 0 | – |
| Řízení dokumentů a záznamů | 0 | Pouze `docs/`, bez verzování a schvalování |
| Řízení návrhu a vývoje | 0 | Žádný design history file (DHF) |
| Řízení dodavatelů | 0 | Supabase, Vercel = SaaS dodavatelé bez QAA |
| CAPA | 0 | – |
| Interní audity | 0 | – |
| Management review | 0 | – |
| Školení personálu | 0 | – |

**Gap:** kompletní – zavést QMS a certifikovat notifikovanou osobou.

### 4.2 Technická dokumentace – Příloha II a III MDR

| Sekce TF | Stav | Poznámka |
|---|---|---|
| Popis a specifikace produktu | 1 | Existuje neformálně v `MDR_COMPLIANCE.md` |
| Návod k použití (IFU) | 0 | Šablona dodána (`docs/templates/INSTRUCTIONS_FOR_USE.md`) |
| Označení (labelling) | 0 | – |
| Informace pro výrobce / UDI | 0 | UDI-DI nepřiděleno |
| Verifikace a validace | 0 | Neexistují testy (žádný test runner v `package.json`) |
| Předklinické a klinické hodnocení | 0 | Šablona CEP dodána |
| Řízení rizik | 1 | Mini-FMEA v `MDR_COMPLIANCE.md`; chybí RMP/RMR |
| PMS systém | 0 | Šablona dodána |

### 4.3 Životní cyklus softwaru – IEC 62304 (předpoklad třída B)

| Proces | Stav | Poznámka |
|---|---|---|
| Plán vývoje SW | 0 | – |
| Analýza požadavků | 1 | Implicitně v kódu a README |
| Architektonický návrh | 1 | Implicitně z Next.js struktury |
| Detailní návrh | 0 | – |
| Implementace + code review | 1 | Git, ale bez formálního CR procesu |
| Verifikace (unit/integ/system) | **0** | **Žádné testy** v projektu |
| Validace | 0 | – |
| Konfigurační management | 1 | Git ano, formální CCB ne |
| Řízení problémů (bug tracking) | 1 | Neformální |
| Údržba SW | 0 | Bez SOP |

### 4.4 Řízení rizik – ISO 14971

| Položka | Stav |
|---|---|
| Risk Management Plan | 0 (šablona dodána) |
| Identifikace nebezpečí | 1 (mini tabulka) |
| Odhad a hodnocení rizik | 1 |
| Opatření a verifikace opatření | 1 (popsáno textem, neoveřeno) |
| Hodnocení zbytkových rizik | 1 |
| Risk Management Report | 0 |
| Production / post-production loop | 0 |

### 4.5 Použitelnost – IEC 62366-1

| Položka | Stav |
|---|---|
| Specifikace use case | 0 |
| Identifikace nebezpečných situací z UI | 0 |
| Formativní testy s reálnými uživateli | 0 |
| Sumativní validační test | 0 |
| Usability Engineering File | 0 |

### 4.6 Kybernetická bezpečnost – IEC 81001-5-1, MDCG 2019-16

| Položka | Stav | Důkaz |
|---|---|---|
| Threat model | 0 | – |
| SBOM | 0 (šablona dodána) | – |
| Řízení zranitelností a patchů | 0 | Bez procesu |
| Autentizace | **0/1** | Demo přihlášení `admin/admin123`, `user/user123`, session jen v `localStorage` |
| Autorizace a RLS | **0** | RLS politiky na klíčových tabulkách jsou `USING (true)` – fakticky vypnuté |
| Šifrování v přenosu | 2 | TLS přes Vercel/Supabase |
| Šifrování v klidu | 1 | Defaultní Supabase |
| Audit log | 0 | Není |
| MFA | 0 | Není |
| Penetrační test | 0 | Není |
| Plán reakce na incident | 0 | Není |

### 4.7 Klinické hodnocení – MDR čl. 61

| Položka | Stav |
|---|---|
| Clinical Evaluation Plan | 0 (šablona dodána) |
| Literární rešerše | 0 |
| Analýza ekvivalence | 0 |
| Clinical Evaluation Report | 0 |
| PMCF Plan | 0 |

### 4.8 Označení, UDI, EUDAMED

| Položka | Stav |
|---|---|
| Basic UDI-DI | 0 |
| UDI-DI | 0 |
| Issuing entity (GS1 / HIBCC / ICCBBA) | 0 |
| Registrace výrobce v EUDAMED | 0 |
| Registrace prostředku v EUDAMED | 0 |
| CE prohlášení o shodě | 0 |
| Certifikát notifikované osoby | 0 |

### 4.9 Post-Market Surveillance a Vigilance

| Položka | Stav |
|---|---|
| PMS Plan | 0 (šablona dodána) |
| PMS Report / PSUR (IIa: ročně) | 0 |
| Vigilance procedura | 0 |
| Trend reporting | 0 |
| Hlášení závažných incidentů SÚKL (lhůty 2 / 10 / 15 dní) | 0 |

### 4.10 Specifické požadavky ČR

| Položka | Stav |
|---|---|
| PRRC dle čl. 15 MDR | 0 |
| Smluvní zástupce v EU (pokud výrobce mimo EU) | n/a (výrobce v ČR) |
| Registrace osoby zacházející se ZP v RZPRO (SÚKL) | 0 |
| Notifikace prostředku v ČR | 0 |
| Návod a UI v češtině | 1 (UI ano, IFU chybí) |
| GDPR / DPIA | 0 |
| Smlouva o zpracování osobních údajů s nemocnicí | 0 |
| NIS2 zařazení a opatření | 0 |

---

## 5. Konkrétní technické nedostatky v kódu

| ID | Soubor / oblast | Nález | Závažnost |
|---|---|---|---|
| T-01 | `components/login-page.tsx` (a podobné) | Demo hesla `admin123` / `user123`, session v `localStorage` | Kritická |
| T-02 | Supabase RLS politiky | `USING (true)` na čtení i zápis | Kritická |
| T-03 | `package.json` | Chybí test runner (vitest / jest / playwright) | Vysoká |
| T-04 | Datový model | Chybí audit log (kdo, kdy, co) | Vysoká |
| T-05 | Verze | `0.0.1`, bez release tagů | Střední |
| T-06 | Závislosti | Chybí SBOM, žádné `npm audit` v CI | Střední |
| T-07 | Realtime sync | Chybí dokumentace a testy chybových stavů (ztráta WS) | Střední |
| T-08 | Nouzový alarm | Spoléhá na unlock audio uživatelem; chybí fallback (vibrace, push) | Střední |
| T-09 | Logování | Console-only, bez perzistence a bez korelace requestů | Střední |
| T-10 | Backup/restore | Bez plánu obnovy a RTO/RPO | Střední |

---

## 6. Plán nápravných opatření (high-level roadmap)

Fáze odpovídají typické cestě ke CE pro SaMD třídy IIa.

### Fáze 1 – Rozhodnutí (1 měsíc)
1. Kvalifikace MDCG 2019-11 + stanovisko SÚKL.
2. Pokud ZP → výběr notifikované osoby (např. EZÚ, ITC Zlín).
3. Jmenování PRRC.

### Fáze 2 – Základ QMS (2 měsíce)
1. Implementace ISO 13485 (procedury, formuláře, školení).
2. Plán vývoje SW dle IEC 62304.
3. Risk Management Plan (viz šablona) + první RMR.

### Fáze 3 – Technická a klinická dokumentace (3 měsíce)
1. Doplnění technické dokumentace dle Přílohy II a III MDR.
2. Clinical Evaluation Plan a Report (šablona dodána).
3. Usability Engineering File.

### Fáze 4 – Kvalita kódu a kybernetika (paralelně, 3 měsíce)
1. Skutečná autentizace (Supabase Auth nebo OIDC), MFA, secure session cookies.
2. Reálné RLS politiky vázané na `auth.uid()` a roli.
3. Audit log tabulka + triggery / app logika.
4. Test framework (Vitest + Playwright), pokrytí klíčových rizikových toků.
5. SBOM (CycloneDX), dependency scanning v CI, threat model, penetrační test.

### Fáze 5 – Audit a CE (2 měsíce)
1. Audit QMS notifikovanou osobou.
2. Audit technické dokumentace.
3. Vystavení CE prohlášení o shodě.
4. Registrace v EUDAMED a u SÚKL (RZPRO + notifikace).

### Fáze 6 – Post-market (kontinuálně)
1. PMS Plan v provozu.
2. PSUR ročně.
3. Vigilance reporty.
4. PMCF (post-market clinical follow-up).

---

## 7. Závěr

ORMS je zajímavý a funkční koordinační nástroj, ale **dnes nesplňuje ani technické, ani procesní požadavky** na zdravotnický prostředek dle MDR a zákona č. 375/2022 Sb. Doporučujeme nejdřív **rozhodnout otázku kvalifikace** (zda vůbec má jít o ZP); teprve poté zahajovat certifikační projekt podle kapitoly 6.

---

## 8. Přílohy / související dokumenty

- `docs/MDR_COMPLIANCE.md` – původní interní compliance přehled
- `docs/templates/RISK_MANAGEMENT_PLAN.md`
- `docs/templates/CLINICAL_EVALUATION_PLAN.md`
- `docs/templates/POST_MARKET_SURVEILLANCE_PLAN.md`
- `docs/templates/INSTRUCTIONS_FOR_USE.md`
- `docs/templates/CYBERSECURITY_SBOM.md`
