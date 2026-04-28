# Cybersecurity Plan & SBOM

## Operating Room Management System (ORMS)

**Dokument:** SEC-001
**Verze:** 0.1 (šablona)
**Soulad:** IEC 81001-5-1, MDCG 2019-16 rev.1, NIS2 / zákon č. 264/2025 Sb. (kybernetická bezpečnost), GDPR
**Vlastník:** \_\_\_ (Cybersecurity Officer / Security Lead)

> Tento dokument kombinuje **Cybersecurity Management Plan** (procesy) a **SBOM** (seznam komponent). SBOM má být udržován strojově čitelně ve formátu **CycloneDX** nebo **SPDX** a generován v CI při každém buildu. Tento markdown slouží jako lidsky čitelný popis a šablona.

---

## 1. Cíle

- Zajistit důvěrnost, integritu a dostupnost dat ORMS.
- Splnit požadavky MDR čl. 17 přílohy I kap. II bod 17 (cybersecurity).
- Zajistit prokazatelný a opakovatelný proces (Secure SDLC).
- Plnit povinnosti vůči poskytovatelům zdravotních služeb (NIS2 regulovaná entita).

## 2. Rozsah

- Webová aplikace ORMS (Next.js).
- Backend Supabase (PostgreSQL + Auth + Realtime).
- Hosting na Vercel.
- Klientská zařízení uživatelů (out of scope pro vlastní hardening, in scope pro doporučení v IFU).

## 3. Role

| Role | Odpovědnost |
|---|---|
| Cybersecurity Officer | Vlastník tohoto plánu, threat model, vulnerability management |
| DevOps / Platform Lead | Provoz, monitoring, IR |
| Vývojový tým | Secure coding, code review, fix |
| PRRC | Vazba bezpečnosti na regulatoriku |
| DPO | Soulad s GDPR |
| Top management | Schvalování risk acceptance |

## 4. Secure SDLC

1. **Plán:** požadavky na bezpečnost v ticketu, threat model pro každý významný feature.
2. **Návrh:** STRIDE analýza, principy least privilege, zero trust mezi službami.
3. **Implementace:**
   - Code review s checklistem (auth, authZ, input, output, crypto, logging).
   - Statická analýza (ESLint security plugin, Semgrep).
   - Skenování secrets v repu (gitleaks).
4. **Testy:**
   - SAST v CI.
   - Dependency scanning (`npm audit`, Snyk / GitHub Dependabot).
   - DAST (OWASP ZAP) ve staging před release.
   - Penetrační test min. **1× ročně** a před major release.
5. **Release:** signed builds, immutable artefakty, verzování dle SemVer + UDI.
6. **Provoz:** monitoring, alerting, IR.
7. **Údržba:** patching SLA (viz §10).

## 5. Threat model (vstupy pro plnou STRIDE analýzu)

### 5.1 Aktiva
- Osobní údaje pacientů (jméno, identifikace operace, fáze).
- Pracovní data personálu (rozpisy).
- Audit log.
- Zálohy.

### 5.2 Hranice důvěry
- Klient ↔ Vercel (TLS).
- Vercel server functions ↔ Supabase (TLS, service key).
- Supabase ↔ realtime klient (JWT, RLS).
- Administrátor ↔ Supabase Studio.

### 5.3 Hlavní hrozby (STRIDE)

| Kategorie | Hrozba | Aktuální stav | Plánované opatření |
|---|---|---|---|
| Spoofing | Sdílené demo účty `admin/admin123` | **Kritické** | Zrušit demo účty, nasadit SSO + MFA, password policy |
| Tampering | RLS politiky `USING (true)` umožňují zápis komukoli ověřenému | **Kritické** | Přepsat RLS na `auth.uid()` + role, audit triggery |
| Repudiation | Žádný audit log | Vysoké | Tabulka `audit_log` + DB triggery + immutable storage |
| Information Disclosure | Lokální `localStorage` se session | Vysoké | HTTP-only cookie, krátká expirace, refresh token rotace |
| DoS | Realtime kanály bez rate limit | Střední | Rate limit na úrovni Supabase + WAF |
| Elevation of Privilege | Stejná role pro běžné i kritické operace | Střední | RBAC matrix, separace admin / klinický koordinátor / běžný uživatel |

## 6. Hlavní bezpečnostní kontroly

| Doména | Kontrola | Stav |
|---|---|---|
| Identifikace | Per-user účty, žádné sdílené | TODO |
| Autentizace | SSO (OIDC) nebo Supabase Auth + povinné MFA pro admin/klinické role | TODO |
| Autorizace | RBAC + RLS vázané na `auth.uid()` a `role` claim | TODO |
| Session | HTTP-only, Secure, SameSite=Lax, max-age 8 h, idle timeout 30 min | TODO |
| Šifrování | TLS 1.2+, HSTS, modern cipher suites | OK |
| Šifrování v klidu | Supabase managed; klíče rotovány min. 1× rok | OK |
| Logging | Strukturované logy, korelační ID, anonymizace PII | TODO |
| Audit log | Tabulka, append-only, retence \_\_\_ let | TODO |
| Backup | Denní inkrementální, týdenní plný, RPO 24 h, RTO 4 h, geo-redundance | TODO |
| Vulnerability mgmt | Dependabot + měsíční review + SLA viz §10 | TODO |
| Secrets | Vercel/Supabase env vars, žádné secrets v repu, rotace 90 dní | TODO |
| Hardening DB | Pouze service role z server side, žádný anon write | TODO |

## 7. Vulnerability disclosure

- E-mail: `security@___`
- PGP klíč: \_\_\_
- SLA pro odpověď: 5 pracovních dní.
- Coordinated disclosure okno: 90 dní.
- Veřejná stránka `https://___/security`.

## 8. Incident Response

1. Detekce (alert / hlášení).
2. Triage (severita SEV-1 až SEV-4).
3. Containment.
4. Eradication.
5. Recovery.
6. Post-mortem (blameless) do 10 dní.
7. Notifikace:
   - **DPO + DPA dotčené nemocnici** dle GDPR (až 72 h).
   - **NÚKIB** dle NIS2/zákona 264/2025 Sb. v rozsahu povinnosti.
   - **SÚKL** přes vigilance, pokud incident má dopad na bezpečnost prostředku (lhůty 2/10/15 dní).
8. Aktualizace SBOM, threat modelu, RMR.

## 9. Klasifikace závažnosti CVE

| Severity | CVSS | Reakce |
|---|---|---|
| Critical | ≥ 9.0 | Patch do 24 h, FSN pokud nelze patch |
| High | 7.0–8.9 | Patch do 7 dní |
| Medium | 4.0–6.9 | Patch do 30 dní |
| Low | < 4.0 | V dalším release |

## 10. Patch management SLA

- Aktualizace ORMS pro zákazníka jsou nasazovány centrálně (SaaS), zákazníkovi se účtuje pouze případný downtime.
- Kritické patche: oznámení do 24 h, nasazení do 24 h od dostupnosti opravy.
- Měsíční bezpečnostní review balíku závislostí.

## 11. SBOM – formát a frekvence

- **Formát:** CycloneDX 1.5 (JSON), uložení v `sbom/orms-<version>.cdx.json`.
- **Generování:** v CI z `package-lock.json` / `pnpm-lock.yaml` nástrojem např. `@cyclonedx/cdxgen`.
- **Distribuce:** SBOM přiložen ke každému release v EUDAMED (až bude vyžadováno) a poskytován zákazníkovi na vyžádání (povinnost dle MDCG 2019-16).
- **Aktualizace:** při každém release; mimořádně při zařazení/odstranění komponenty.

## 12. SBOM – lidsky čitelný přehled (pracovní)

> Tato tabulka je orientační, autoritativní je strojový SBOM. Doplnit z `package.json` / `pnpm-lock.yaml`.

### 12.1 Runtime aplikace (frontend + Next.js server)

| Komponenta | Verze | Licence | Účel | Riziko |
|---|---|---|---|---|
| Next.js | \_\_\_ | MIT | Web framework | sledovat CVE |
| React | \_\_\_ | MIT | UI knihovna | nízké |
| @supabase/supabase-js | \_\_\_ | MIT | DB / Auth / Realtime klient | sledovat CVE |
| Tailwind CSS | \_\_\_ | MIT | Styling | nízké |
| Radix UI / shadcn-ui | \_\_\_ | MIT | UI primitiva | nízké |
| Lucide-react | \_\_\_ | ISC | Ikony | nízké |
| (doplnit z lockfile) | | | | |

### 12.2 Backendové služby (SaaS dodavatelé)

| Služba | Role | Datacentrum | Smlouva | Compliance |
|---|---|---|---|---|
| Supabase | DB, Auth, Realtime, Storage | EU (\_\_\_) | DPA | SOC 2, ISO 27001 (ověřit aktuální stav) |
| Vercel | Hosting, edge | EU/Global | DPA | SOC 2 |
| (případně) Sentry / log provider | Monitoring | \_\_\_ | DPA | \_\_\_ |

### 12.3 Build / dev závislosti

(Ne-runtime, ale pro úplnost SBOM povinné.)

| Komponenta | Verze | Účel |
|---|---|---|
| TypeScript | \_\_\_ | Type-checking |
| ESLint | \_\_\_ | Lint |
| (doplnit) | | |

## 13. Monitoring a metriky

- Uptime / latence: \_\_\_ (např. Better Stack, Grafana Cloud).
- Chybový rate v Sentry / equivalent.
- Bezpečnostní upozornění (Dependabot, GitHub Security).
- Alerty na anomálie v audit logu (neúspěšné loginy, masové změny stavu).

## 14. Doporučení pro provozovatele (input do IFU)

- Provozujte v izolovaném segmentu sítě nemocnice.
- Vynucujte MFA pro všechny účty.
- Definujte rolovou matici uživatelů.
- Pravidelně revidujte audit log.
- Mějte záložní offline postup pro koordinaci sálů.
- V rámci NIS2 zařaďte ORMS do svého katalogu aktiv a do IR plánu.

## 15. Schválení

| Role | Jméno | Podpis | Datum |
|---|---|---|---|
| Cybersecurity Officer | | | |
| PRRC | | | |
| DPO | | | |
| Top management | | | |
